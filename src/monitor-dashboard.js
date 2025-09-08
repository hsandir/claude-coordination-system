#!/usr/bin/env node

/**
 * Multi-Claude Coordination Monitor Dashboard
 * Real-time system monitoring and visualization
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class MonitorDashboard {
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot || process.cwd();
    this.options = options;
    this.refreshInterval = options.refreshInterval || 2000;
    this.isRunning = false;
    this.coordDir = path.join(this.projectRoot, '.claude-coord');
    this.stateFile = path.join(this.coordDir, 'system-state.json');
  }

  async start() {
    console.log(chalk.blue('📊 Starting Multi-Claude Monitor Dashboard...'));
    console.log(chalk.gray('Press Ctrl+C to exit'));
    console.log('─'.repeat(80));
    
    this.isRunning = true;
    
    // Clear screen and hide cursor
    process.stdout.write('\x1b[2J\x1b[0f');
    if (!this.options.compact) {
      process.stdout.write('\x1b[?25l');
    }
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
    });
    
    // Start monitoring loop
    this.monitorLoop();
  }

  async stop() {
    this.isRunning = false;
    process.stdout.write('\x1b[?25h'); // Show cursor
    console.log(chalk.yellow('\n🛑 Monitor stopped'));
    process.exit(0);
  }

  async monitorLoop() {
    while (this.isRunning) {
      try {
        await this.updateDisplay();
        await new Promise(resolve => setTimeout(resolve, this.refreshInterval));
      } catch (error) {
        console.error(chalk.red('Monitor error:'), error.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async updateDisplay() {
    // Clear screen
    if (!this.options.compact) {
      process.stdout.write('\x1b[2J\x1b[0f');
    }
    
    const systemState = await this.loadSystemState();
    const timestamp = new Date().toLocaleString();
    
    // Header
    console.log(chalk.blue('🤖 Multi-Claude Coordination Monitor'));
    console.log(chalk.gray(`Project: ${path.basename(this.projectRoot)} | ${timestamp}`));
    console.log('═'.repeat(80));
    
    // System Overview
    await this.displaySystemOverview(systemState);
    console.log();
    
    // Active Workers
    await this.displayActiveWorkers(systemState);
    console.log();
    
    // File Locks
    await this.displayFileLocks(systemState);
    console.log();
    
    // Task Progress
    await this.displayTaskProgress(systemState);
    console.log();
    
    // Recent Activity
    await this.displayRecentActivity(systemState);
    
    if (this.options.compact) {
      console.log('─'.repeat(80));
    }
  }

  async displaySystemOverview(systemState) {
    const activeWorkers = Object.keys(systemState.active_workers || {}).length;
    const fileLocks = Object.keys(systemState.file_locks || {}).length;
    const totalTasks = systemState.task_progress?.total_groups || 0;
    const completedTasks = systemState.task_progress?.completed_groups || 0;
    const healthy = systemState.system_info?.healthy !== false;
    
    console.log(chalk.cyan('📈 System Overview:'));
    console.log(`  Active Workers: ${activeWorkers > 0 ? chalk.green(activeWorkers) : chalk.gray(activeWorkers)}`);
    console.log(`  File Locks: ${fileLocks > 0 ? chalk.yellow(fileLocks) : chalk.gray(fileLocks)}`);
    console.log(`  Tasks: ${chalk.green(completedTasks)}/${totalTasks}`);
    console.log(`  Health: ${healthy ? chalk.green('Healthy') : chalk.red('Unhealthy')}`);
  }

  async displayActiveWorkers(systemState) {
    const workers = systemState.active_workers || {};
    
    console.log(chalk.cyan('👥 Active Workers:'));
    
    if (Object.keys(workers).length === 0) {
      console.log(chalk.gray('  No active workers'));
      return;
    }
    
    Object.entries(workers).forEach(([workerId, worker]) => {
      const statusIcon = this.getWorkerStatusIcon(worker.status);
      const lastSeen = worker.last_heartbeat ? 
        this.formatTimeAgo(new Date(worker.last_heartbeat)) : 'Unknown';
      
      console.log(`  ${statusIcon} ${chalk.bold(workerId)} (${worker.group})`);
      console.log(`    Status: ${this.formatWorkerStatus(worker.status)}`);
      console.log(`    Last seen: ${chalk.gray(lastSeen)}`);
      
      // Memory stats if available
      if (worker.memory) {
        const memColor = worker.memory.usage > 90 ? chalk.red : 
                        worker.memory.usage > 80 ? chalk.yellow : chalk.green;
        console.log(`    Memory: ${memColor(worker.memory.current + 'MB')} / ${worker.memory.limit}MB (${worker.memory.usage}%)`);
      }
      
      if (worker.current_task) {
        console.log(`    Task: ${chalk.yellow(worker.current_task)}`);
      }
    });
  }

  async displayFileLocks(systemState) {
    const locks = systemState.file_locks || {};
    
    console.log(chalk.cyan('🔒 File Locks:'));
    
    if (Object.keys(locks).length === 0) {
      console.log(chalk.gray('  No file locks'));
      return;
    }
    
    Object.entries(locks).forEach(([file, workerId]) => {
      console.log(`  ${chalk.yellow('🔒')} ${file} → ${chalk.bold(workerId)}`);
    });
  }

  async displayTaskProgress(systemState) {
    const progress = systemState.task_progress || {};
    const dependencies = systemState.dependencies || {};
    
    console.log(chalk.cyan('📋 Task Progress:'));
    
    if (Object.keys(dependencies).length === 0) {
      console.log(chalk.gray('  No tasks defined'));
      return;
    }
    
    Object.entries(dependencies).forEach(([groupId, group]) => {
      const status = this.getGroupStatus(groupId, systemState);
      const statusIcon = this.getGroupStatusIcon(status);
      
      console.log(`  ${statusIcon} ${chalk.bold(groupId)}: ${group.name}`);
      if (group.dependencies.length > 0) {
        console.log(`    Depends on: ${chalk.gray(group.dependencies.join(', '))}`);
      }
    });
  }

  async displayRecentActivity(systemState) {
    console.log(chalk.cyan('📝 Recent Activity:'));
    
    // This would typically come from a log file or activity tracking
    const recentLogs = await this.loadRecentLogs();
    
    if (recentLogs.length === 0) {
      console.log(chalk.gray('  No recent activity'));
      return;
    }
    
    recentLogs.slice(0, 5).forEach(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const levelColor = log.level === 'error' ? chalk.red : 
                        log.level === 'warn' ? chalk.yellow : chalk.gray;
      
      console.log(`  ${chalk.gray(timestamp)} ${levelColor(log.level.toUpperCase())} ${log.message}`);
    });
  }

  async loadSystemState() {
    try {
      if (await fs.pathExists(this.stateFile)) {
        return await fs.readJSON(this.stateFile);
      }
    } catch (error) {
      // Ignore read errors
    }
    
    return {
      system_info: { initialized_at: new Date().toISOString() },
      active_workers: {},
      file_locks: {},
      dependencies: {},
      task_progress: { total_groups: 0, completed_groups: 0, active_groups: 0 }
    };
  }

  async loadRecentLogs() {
    try {
      const logFile = path.join(this.coordDir, 'activity.log');
      if (await fs.pathExists(logFile)) {
        const content = await fs.readFile(logFile, 'utf8');
        return content.split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: line
              };
            }
          })
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
    } catch (error) {
      // Ignore log loading errors
    }
    
    return [];
  }

  getWorkerStatusIcon(status) {
    switch (status) {
      case 'working': return '🔧';
      case 'completed': return '✅';
      case 'error': return '❌';
      case 'waiting': return '⏳';
      default: return '❓';
    }
  }

  formatWorkerStatus(status) {
    switch (status) {
      case 'working': return chalk.yellow('Working');
      case 'completed': return chalk.green('Completed');
      case 'error': return chalk.red('Error');
      case 'waiting': return chalk.blue('Waiting');
      default: return chalk.gray('Unknown');
    }
  }

  getGroupStatus(groupId, systemState) {
    const activeWorkers = systemState.active_workers || {};
    const hasActiveWorker = Object.values(activeWorkers)
      .some(worker => worker.group === groupId);
    
    if (hasActiveWorker) {
      return 'active';
    }
    
    // Check if dependencies are met
    const group = systemState.dependencies[groupId];
    if (group && group.dependencies.length > 0) {
      const depsMet = group.dependencies.every(depId => 
        this.getGroupStatus(depId, systemState) === 'completed'
      );
      return depsMet ? 'ready' : 'waiting';
    }
    
    return 'ready';
  }

  getGroupStatusIcon(status) {
    switch (status) {
      case 'active': return '🔧';
      case 'completed': return '✅';
      case 'ready': return '📋';
      case 'waiting': return '⏳';
      default: return '❓';
    }
  }

  formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }
}

module.exports = MonitorDashboard;