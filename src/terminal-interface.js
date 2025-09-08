/**
 * Interactive Terminal Interface for Multi-Claude Coordination System
 * Provides real-time monitoring and command interface
 */

const readline = require('readline');
const chalk = require('chalk');
const { logUser } = require('./development-logger');

class TerminalInterface {
  constructor(coordinatorCore) {
    this.coordinatorCore = coordinatorCore;
    this.rl = null;
    this.isRunning = false;
    this.refreshInterval = null;
    this.lastStatus = null;
  }

  /**
   * Start the interactive terminal interface
   */
  async start() {
    this.isRunning = true;
    
    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Hide cursor and clear screen
    process.stdout.write('\x1B[?25l');
    this.clearScreen();
    
    await logUser('Start Terminal Interface', 'Interactive monitoring started', 'STARTED');

    // Show initial screen
    await this.showMainScreen();
    
    // Setup key handling
    this.setupKeyHandling();
    
    // Start auto-refresh
    this.refreshInterval = setInterval(() => {
      if (this.currentScreen === 'main') {
        this.showMainScreen();
      } else if (this.currentScreen === 'monitor') {
        this.showMonitorScreen();
      }
    }, 5000);

    this.currentScreen = 'main';
  }

  /**
   * Stop the terminal interface
   */
  async stop() {
    this.isRunning = false;
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    if (this.rl) {
      this.rl.close();
    }
    
    // Show cursor and clear screen
    process.stdout.write('\x1B[?25h');
    this.clearScreen();
    
    await logUser('Stop Terminal Interface', 'Interactive monitoring stopped', 'STOPPED');
  }

  /**
   * Setup keyboard event handling
   */
  setupKeyHandling() {
    try {
      // Check if stdin supports raw mode (not available in background processes)
      if (process.stdin.isTTY && process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
      } else {
        console.log(chalk.yellow('⚠️  Running in non-interactive mode - keyboard shortcuts disabled'));
        return;
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Interactive terminal not available in this environment'));
      return;
    }
    
    process.stdin.on('data', async (key) => {
      const char = key.toString();
      
      switch (char) {
        case '\x03': // Ctrl+C
          await this.stop();
          process.exit(0);
          break;
        case '\x1b': // ESC
          if (this.currentScreen !== 'main') {
            this.currentScreen = 'main';
            await this.showMainScreen();
          }
          break;
        case 'm':
        case 'M':
          this.currentScreen = 'monitor';
          await this.showMonitorScreen();
          break;
        case 'w':
        case 'W':
          this.currentScreen = 'workers';
          await this.showWorkersScreen();
          break;
        case 'h':
        case 'H':
          this.currentScreen = 'help';
          await this.showHelpScreen();
          break;
        case 'r':
        case 'R':
          await this.refreshCurrentScreen();
          break;
        case 'q':
        case 'Q':
          await this.stop();
          process.exit(0);
          break;
      }
    });
  }

  /**
   * Show main dashboard screen
   */
  async showMainScreen() {
    this.clearScreen();
    
    try {
      const status = await this.coordinatorCore.getSystemStatus();
      this.lastStatus = status;
      
      // Header
      console.log(chalk.blue.bold('🤖 Multi-Claude Coordination System Dashboard'));
      console.log(chalk.gray('═'.repeat(60)));
      console.log();
      
      // Status overview
      console.log(chalk.green('📊 System Status'));
      console.log(chalk.gray('─'.repeat(30)));
      console.log(`Active Workers: ${chalk.cyan(status.activeWorkers)}`);
      console.log(`Tasks Progress: ${chalk.cyan(status.completedTasks)}/${chalk.cyan(status.totalTasks)}`);
      console.log(`File Locks: ${chalk.cyan(status.fileLocks)}`);
      console.log(`System Health: ${status.healthy ? chalk.green('●') : chalk.red('●')} ${status.healthy ? 'Healthy' : 'Issues'}`);
      console.log();
      
      // Workers summary
      if (status.workers.length > 0) {
        console.log(chalk.green('👥 Active Workers Summary'));
        console.log(chalk.gray('─'.repeat(40)));
        status.workers.slice(0, 5).forEach(worker => {
          const statusIcon = this.getWorkerStatusIcon(worker.status);
          const statusColor = this.getWorkerStatusColor(worker.status);
          console.log(`${statusIcon} ${chalk.bold(worker.id || 'Unknown')} [${statusColor(worker.group)}] - ${statusColor(worker.status?.toUpperCase() || 'UNKNOWN')}`);
        });
        
        if (status.workers.length > 5) {
          console.log(chalk.gray(`... and ${status.workers.length - 5} more workers`));
        }
      } else {
        console.log(chalk.yellow('No active workers'));
      }
      
      console.log();
      
      // Commands panel
      this.showCommandsPanel();
      
    } catch (error) {
      console.log(chalk.red('❌ Error fetching system status:'), error.message);
    }
  }

  /**
   * Show detailed monitoring screen
   */
  async showMonitorScreen() {
    this.clearScreen();
    
    try {
      const status = await this.coordinatorCore.getSystemStatus();
      
      console.log(chalk.blue.bold('📊 Real-time Monitoring Dashboard'));
      console.log(chalk.gray('═'.repeat(60)));
      console.log();
      
      // System metrics
      console.log(chalk.green('🖥️  System Metrics'));
      console.log(chalk.gray('─'.repeat(30)));
      console.log(`Coordinator PID: ${chalk.cyan(process.pid)}`);
      console.log(`Memory Usage: ${chalk.cyan(Math.round(process.memoryUsage().rss / 1024 / 1024))}MB`);
      console.log(`Uptime: ${chalk.cyan(Math.round(process.uptime()))}s`);
      console.log(`Active Workers: ${chalk.cyan(status.activeWorkers)}`);
      console.log(`File Locks: ${chalk.cyan(status.fileLocks)}`);
      console.log();
      
      // Worker details
      if (status.workers.length > 0) {
        console.log(chalk.green('🔧 Worker Details'));
        console.log(chalk.gray('─'.repeat(50)));
        status.workers.forEach(worker => {
          const statusIcon = this.getWorkerStatusIcon(worker.status);
          const statusColor = this.getWorkerStatusColor(worker.status);
          console.log(`${statusIcon} ${chalk.bold(worker.id || 'Unknown')}`);
          console.log(`   Group: ${chalk.cyan(worker.group)}`);
          console.log(`   Status: ${statusColor(worker.status?.toUpperCase() || 'UNKNOWN')}`);
          console.log(`   Last Update: ${chalk.gray(new Date().toLocaleTimeString())}`);
          console.log();
        });
      }
      
      console.log(chalk.gray(`Last Updated: ${new Date().toLocaleTimeString()}`));
      console.log();
      
      // Commands
      console.log(chalk.yellow('📋 Commands: [ESC] Main | [R] Refresh | [Q] Quit'));
      
    } catch (error) {
      console.log(chalk.red('❌ Error in monitoring:'), error.message);
    }
  }

  /**
   * Show workers management screen
   */
  async showWorkersScreen() {
    this.clearScreen();
    
    try {
      const status = await this.coordinatorCore.getSystemStatus();
      
      console.log(chalk.blue.bold('👥 Workers Management'));
      console.log(chalk.gray('═'.repeat(50)));
      console.log();
      
      if (status.workers.length > 0) {
        status.workers.forEach((worker, index) => {
          const statusIcon = this.getWorkerStatusIcon(worker.status);
          const statusColor = this.getWorkerStatusColor(worker.status);
          console.log(`${chalk.cyan(`[${index + 1}]`)} ${statusIcon} ${chalk.bold(worker.id || 'Unknown')}`);
          console.log(`     Group: ${chalk.cyan(worker.group)}`);
          console.log(`     Status: ${statusColor(worker.status?.toUpperCase() || 'UNKNOWN')}`);
          console.log(`     Management Commands:`);
          console.log(`       Remove: claude-coord remove-worker --worker=${worker.id}`);
          console.log(`       Reassign: claude-coord reassign-worker --worker=${worker.id} --group=NEWGROUP`);
          console.log();
        });
      } else {
        console.log(chalk.yellow('No active workers found.'));
        console.log();
        console.log(chalk.cyan('To start a worker:'));
        console.log('  claude-worker --id=worker_1 --standby');
        console.log('  claude-worker --id=worker_2 --group=TYPESCRIPT');
      }
      
      console.log(chalk.yellow('📋 Commands: [ESC] Main | [M] Monitor | [R] Refresh | [Q] Quit'));
      
    } catch (error) {
      console.log(chalk.red('❌ Error loading workers:'), error.message);
    }
  }

  /**
   * Show help screen
   */
  async showHelpScreen() {
    this.clearScreen();
    
    console.log(chalk.blue.bold('❓ Multi-Claude Coordination - Help'));
    console.log(chalk.gray('═'.repeat(50)));
    console.log();
    
    console.log(chalk.green('🎮 Navigation Commands'));
    console.log(chalk.gray('─'.repeat(30)));
    console.log(`${chalk.cyan('[M]')} - Monitoring Dashboard`);
    console.log(`${chalk.cyan('[W]')} - Workers Management`);
    console.log(`${chalk.cyan('[H]')} - Help (this screen)`);
    console.log(`${chalk.cyan('[R]')} - Refresh current screen`);
    console.log(`${chalk.cyan('[ESC]')} - Return to main screen`);
    console.log(`${chalk.cyan('[Q]')} - Quit application`);
    console.log(`${chalk.cyan('[Ctrl+C]')} - Force quit`);
    console.log();
    
    console.log(chalk.green('🛠️  Terminal Commands'));
    console.log(chalk.gray('─'.repeat(30)));
    console.log(`${chalk.cyan('claude-coord status')} - Show system status`);
    console.log(`${chalk.cyan('claude-coord stop')} - Stop coordinator`);
    console.log(`${chalk.cyan('claude-worker --id=worker_1 --standby')} - Start worker`);
    console.log(`${chalk.cyan('claude-coord remove-worker --worker=ID')} - Remove worker`);
    console.log(`${chalk.cyan('claude-coord reassign-worker --worker=ID --group=GROUP')} - Reassign worker`);
    console.log();
    
    console.log(chalk.green('🌐 Web Dashboard'));
    console.log(chalk.gray('─'.repeat(30)));
    console.log(`Open ${chalk.cyan('http://localhost:7777')} in your browser`);
    console.log(`for web-based monitoring and management`);
    console.log();
    
    console.log(chalk.yellow('📋 Commands: [ESC] Main | [M] Monitor | [W] Workers | [Q] Quit'));
  }

  /**
   * Show commands panel
   */
  showCommandsPanel() {
    console.log(chalk.blue('🎮 Navigation'));
    console.log(chalk.gray('─'.repeat(20)));
    console.log(`${chalk.cyan('[M]')} Monitor | ${chalk.cyan('[W]')} Workers | ${chalk.cyan('[H]')} Help | ${chalk.cyan('[R]')} Refresh | ${chalk.cyan('[Q]')} Quit`);
    console.log();
    console.log(chalk.blue('🌐 Web Dashboard: ') + chalk.cyan('http://localhost:7777'));
  }

  /**
   * Get status icon for worker
   */
  getWorkerStatusIcon(status) {
    switch (status) {
      case 'working': return chalk.green('🔧');
      case 'inactive': return chalk.yellow('⏸️');
      case 'standby': return chalk.gray('⏳');
      case 'stale': return chalk.red('⚠️');
      case 'completed': return chalk.green('✅');
      case 'error': return chalk.red('❌');
      default: return chalk.gray('❓');
    }
  }

  /**
   * Get status color for worker
   */
  getWorkerStatusColor(status) {
    switch (status) {
      case 'working': return chalk.green;
      case 'inactive': return chalk.yellow;
      case 'standby': return chalk.gray;
      case 'stale': return chalk.red;
      case 'completed': return chalk.green;
      case 'error': return chalk.red;
      default: return chalk.gray;
    }
  }

  /**
   * Refresh current screen
   */
  async refreshCurrentScreen() {
    switch (this.currentScreen) {
      case 'main':
        await this.showMainScreen();
        break;
      case 'monitor':
        await this.showMonitorScreen();
        break;
      case 'workers':
        await this.showWorkersScreen();
        break;
      case 'help':
        await this.showHelpScreen();
        break;
      default:
        await this.showMainScreen();
    }
  }

  /**
   * Clear screen utility
   */
  clearScreen() {
    console.clear();
    // Alternative: process.stdout.write('\x1B[2J\x1B[0f');
  }
}

module.exports = TerminalInterface;