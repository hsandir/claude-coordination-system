#!/usr/bin/env node

/**
 * Multi-Claude Coordination Monitor
 * Real-time dashboard for monitoring coordination system
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const MonitorDashboard = require('../src/monitor-dashboard');

const program = new Command();

program
  .name('claude-monitor')
  .description('Multi-Claude Coordination Monitor Dashboard')
  .version('1.0.0')
  .option('--project-root <path>', 'Project root directory', process.cwd())
  .option('--refresh <ms>', 'Refresh interval in milliseconds', '2000')
  .option('--compact', 'Compact display mode')
  .option('--export [file]', 'Export metrics to file')
  .option('--no-color', 'Disable colored output')
  .option('--web', 'Start web dashboard instead of terminal UI')
  .option('--port <port>', 'Web dashboard port', '8888')
  .parse();

const options = program.opts();

async function main() {
  try {
    console.log(chalk.blue('🖥️  Starting Multi-Claude Monitor Dashboard...'));
    
    // Initialize monitor
    const monitor = new MonitorDashboard(options.projectRoot, {
      refreshInterval: parseInt(options.refresh),
      compact: options.compact,
      colorOutput: !options.noColor,
      webMode: options.web,
      webPort: parseInt(options.port)
    });

    // Handle export option
    if (options.export) {
      const exportFile = typeof options.export === 'string' 
        ? options.export 
        : `claude-metrics-${Date.now()}.json`;
      
      console.log(chalk.blue(`📊 Exporting metrics to: ${exportFile}`));
      await monitor.exportMetrics(exportFile);
      return;
    }

    // Start dashboard
    if (options.web) {
      console.log(chalk.green(`🌐 Web dashboard starting on port ${options.port}`));
      await monitor.startWebDashboard();
    } else {
      console.log(chalk.green('📱 Terminal dashboard starting...'));
      console.log(chalk.gray('💡 Press Ctrl+C to exit, R to refresh'));
      await monitor.start();
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Monitor failed to start:'), error.message);
    
    if (error.message.includes('system state')) {
      console.log(chalk.yellow('💡 Suggestions:'));
      console.log('   1. Make sure coordinator is initialized: claude-coord init');
      console.log('   2. Start coordinator first: claude-coord start');
    }
    
    process.exit(1);
  }
}

// Additional monitor commands
program
  .command('status')
  .description('Show quick system status')
  .option('--project-root <path>', 'Project root directory', process.cwd())
  .action(async (cmdOptions) => {
    try {
      const monitor = new MonitorDashboard(cmdOptions.projectRoot);
      const status = await monitor.getQuickStatus();
      
      console.log(chalk.blue('📊 Quick Status'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(`Coordinator: ${status.coordinatorRunning ? chalk.green('Running') : chalk.red('Stopped')}`);
      console.log(`Active Workers: ${chalk.yellow(status.activeWorkers)}`);
      console.log(`File Locks: ${chalk.yellow(status.fileLocks)}`);
      console.log(`System Health: ${status.healthy ? chalk.green('Healthy') : chalk.red('Issues Detected')}`);
      
      if (status.recentActivity.length > 0) {
        console.log(chalk.blue('\\n📝 Recent Activity:'));
        status.recentActivity.forEach(activity => {
          console.log(`  ${activity.icon} ${activity.message}`);
        });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Status check failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('workers')
  .description('List active workers')
  .option('--project-root <path>', 'Project root directory', process.cwd())
  .action(async (cmdOptions) => {
    try {
      const monitor = new MonitorDashboard(cmdOptions.projectRoot);
      const workers = await monitor.getWorkersList();
      
      if (workers.length === 0) {
        console.log(chalk.yellow('No active workers found'));
        return;
      }
      
      console.log(chalk.blue('👥 Active Workers'));
      console.log(chalk.gray('─'.repeat(60)));
      
      workers.forEach(worker => {
        const statusIcon = {
          'working': '🔧',
          'completed': '✅',
          'waiting': '⏳',
          'error': '❌',
          'idle': '😴'
        }[worker.status] || '❓';
        
        const runtime = monitor.formatDuration(worker.started_at);
        const progress = `${worker.progress.completed_tasks}/${worker.progress.total_tasks}`;
        
        console.log(`${statusIcon} ${chalk.green(worker.id)} (${worker.group})`);
        console.log(`   Status: ${worker.status} | Progress: ${progress} | Runtime: ${runtime}`);
        
        if (worker.progress.current_task) {
          console.log(`   Current: ${chalk.gray(worker.progress.current_task)}`);
        }
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Worker list failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('logs')
  .description('Show coordination system logs')
  .option('--project-root <path>', 'Project root directory', process.cwd())
  .option('--tail <lines>', 'Number of lines to show', '20')
  .option('--follow', 'Follow log output')
  .action(async (cmdOptions) => {
    try {
      const monitor = new MonitorDashboard(cmdOptions.projectRoot);
      
      if (cmdOptions.follow) {
        console.log(chalk.blue('📜 Following coordination logs (Ctrl+C to exit)'));
        await monitor.followLogs();
      } else {
        console.log(chalk.blue(`📜 Last ${cmdOptions.tail} log entries`));
        const logs = await monitor.getLogs(parseInt(cmdOptions.tail));
        
        logs.forEach(logEntry => {
          const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
          const level = logEntry.level.toUpperCase();
          const color = {
            'ERROR': chalk.red,
            'WARN': chalk.yellow,
            'INFO': chalk.blue,
            'DEBUG': chalk.gray
          }[level] || chalk.white;
          
          console.log(`${chalk.gray(timestamp)} ${color(level)} ${logEntry.message}`);
        });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Log access failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('metrics')
  .description('Show detailed system metrics')
  .option('--project-root <path>', 'Project root directory', process.cwd())
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(async (cmdOptions) => {
    try {
      const monitor = new MonitorDashboard(cmdOptions.projectRoot);
      const metrics = await monitor.getDetailedMetrics();
      
      if (cmdOptions.format === 'json') {
        console.log(JSON.stringify(metrics, null, 2));
      } else {
        console.log(chalk.blue('📈 System Metrics'));
        console.log(chalk.gray('─'.repeat(50)));
        
        // Performance metrics
        console.log(chalk.green('Performance:'));
        console.log(`  Avg Task Duration: ${metrics.performance.avgTaskDuration}ms`);
        console.log(`  Coordination Overhead: ${metrics.performance.coordinationOverhead}%`);
        console.log(`  Worker Utilization: ${metrics.performance.workerUtilization}%`);
        
        // System metrics
        console.log(chalk.green('\\nSystem:'));
        console.log(`  Total Tasks: ${metrics.system.totalTasks}`);
        console.log(`  Completed Tasks: ${metrics.system.completedTasks}`);
        console.log(`  Failed Tasks: ${metrics.system.failedTasks}`);
        console.log(`  File Conflicts: ${metrics.system.fileConflicts}`);
        
        // Resource metrics
        console.log(chalk.green('\\nResources:'));
        console.log(`  Memory Usage: ${metrics.resources.memoryUsage}MB`);
        console.log(`  CPU Usage: ${metrics.resources.cpuUsage}%`);
        console.log(`  Disk I/O: ${metrics.resources.diskIO} ops/sec`);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Metrics collection failed:'), error.message);
      process.exit(1);
    }
  });

// Only run main if this is the main module
if (require.main === module) {
  main();
}

module.exports = { main };