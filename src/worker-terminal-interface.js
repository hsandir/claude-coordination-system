/**
 * Worker Terminal Interface
 * Interactive status display for worker terminals
 */

const readline = require('readline');
const chalk = require('chalk');
const { logWorker } = require('./development-logger');

class WorkerTerminalInterface {
  constructor(workerCore) {
    this.workerCore = workerCore;
    this.isRunning = false;
    this.statusInterval = null;
    this.statusLine = '';
    this.lastCoordinatorCheck = Date.now();
    this.coordinatorMissedChecks = 0;
    this.maxMissedChecks = 3; // 3 failed checks = coordinator down
    
    // Status display configuration
    this.showStatusLine = process.stdout.isTTY;
    this.statusUpdateInterval = 5000; // 5 seconds
    this.coordinatorCheckInterval = 30000; // 30 seconds
  }

  /**
   * Start the terminal interface
   */
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    if (this.showStatusLine) {
      console.log(chalk.gray('📱 Worker terminal interface started'));
      this.startStatusDisplay();
    }
    
    this.startCoordinatorHealthCheck();
    this.setupGracefulShutdown();
  }

  /**
   * Stop the terminal interface
   */
  async stop() {
    this.isRunning = false;
    
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
    
    if (this.showStatusLine) {
      this.clearStatusLine();
      console.log(chalk.gray('📱 Worker terminal interface stopped'));
    }
  }

  /**
   * Start status display at bottom of terminal
   */
  startStatusDisplay() {
    this.statusInterval = setInterval(() => {
      if (this.isRunning) {
        this.updateStatusLine();
      }
    }, this.statusUpdateInterval);
    
    // Initial display
    this.updateStatusLine();
  }

  /**
   * Update the status line at bottom of terminal
   */
  updateStatusLine() {
    const workerStatus = this.getWorkerStatus();
    const timeString = new Date().toLocaleTimeString();
    
    let statusIcon = '🤖';
    let statusColor = chalk.gray;
    let statusText = 'UNKNOWN';
    
    switch (workerStatus.status) {
      case 'working':
        statusIcon = '🔧';
        statusColor = chalk.green;
        statusText = 'WORKING';
        break;
      case 'waiting':
        statusIcon = '⏳';
        statusColor = chalk.yellow;
        statusText = 'WAITING';
        break;
      case 'inactive':
        statusIcon = '⏸️ ';
        statusColor = chalk.cyan;
        statusText = 'INACTIVE';
        break;
      case 'standby':
        statusIcon = '🔄';
        statusColor = chalk.blue;
        statusText = 'STANDBY';
        break;
      case 'error':
        statusIcon = '❌';
        statusColor = chalk.red;
        statusText = 'ERROR';
        break;
      case 'disconnected':
        statusIcon = '📡';
        statusColor = chalk.red;
        statusText = 'NO COORDINATOR';
        break;
    }
    
    const memoryUsage = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const uptime = Math.floor(process.uptime());
    
    const newStatusLine = [
      statusColor(`${statusIcon} ${this.workerCore.workerId}`),
      statusColor(`[${statusText}]`),
      chalk.gray(`Group: ${this.workerCore.groupId}`),
      chalk.gray(`Memory: ${memoryUsage}MB`),
      chalk.gray(`Uptime: ${uptime}s`),
      chalk.gray(`${timeString}`)
    ].join(' | ');
    
    if (newStatusLine !== this.statusLine) {
      this.clearStatusLine();
      this.statusLine = newStatusLine;
      this.displayStatusLine();
    }
  }

  /**
   * Get current worker status
   */
  getWorkerStatus() {
    // Check if coordinator is responding
    if (Date.now() - this.lastCoordinatorCheck > this.coordinatorCheckInterval * 2) {
      return { status: 'disconnected' };
    }
    
    if (!this.workerCore.isRunning) {
      return { status: 'inactive' };
    }
    
    if (this.workerCore.currentTask) {
      return { 
        status: 'working',
        task: this.workerCore.currentTask
      };
    }
    
    if (this.workerCore.groupId === 'STANDBY') {
      return { status: 'standby' };
    }
    
    return { status: 'waiting' };
  }

  /**
   * Display status line at bottom of terminal
   */
  displayStatusLine() {
    if (!this.showStatusLine || !this.statusLine) return;
    
    // Save cursor position, move to bottom, display status, restore position
    process.stdout.write('\x1B[s'); // Save cursor position
    process.stdout.write('\x1B[999;1H'); // Move to bottom left
    process.stdout.write('\x1B[K'); // Clear line
    process.stdout.write(`\x1B[44m ${this.statusLine} \x1B[0m`); // Blue background
    process.stdout.write('\x1B[u'); // Restore cursor position
  }

  /**
   * Clear status line
   */
  clearStatusLine() {
    if (!this.showStatusLine) return;
    
    process.stdout.write('\x1B[s'); // Save cursor position
    process.stdout.write('\x1B[999;1H'); // Move to bottom
    process.stdout.write('\x1B[K'); // Clear line
    process.stdout.write('\x1B[u'); // Restore cursor position
  }

  /**
   * Start coordinator health checking
   */
  startCoordinatorHealthCheck() {
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        // Try to read coordinator state
        const fs = require('fs-extra');
        const path = require('path');
        const stateFile = path.join(this.workerCore.coordinationDir, 'system-state.json');
        
        if (await fs.pathExists(stateFile)) {
          const state = await fs.readJson(stateFile);
          const now = Date.now();
          
          // Check if coordinator heartbeat is recent (within 60 seconds)
          if (state.last_heartbeat && (now - state.last_heartbeat) < 60000) {
            this.coordinatorMissedChecks = 0;
            this.lastCoordinatorCheck = now;
          } else {
            this.coordinatorMissedChecks++;
          }
        } else {
          this.coordinatorMissedChecks++;
        }
        
        // If coordinator is down for too long, halt worker
        if (this.coordinatorMissedChecks >= this.maxMissedChecks) {
          await this.handleCoordinatorDisconnect();
        }
        
      } catch (error) {
        this.coordinatorMissedChecks++;
        if (this.coordinatorMissedChecks >= this.maxMissedChecks) {
          await this.handleCoordinatorDisconnect();
        }
      }
    }, this.coordinatorCheckInterval);
  }

  /**
   * Handle coordinator disconnection
   */
  async handleCoordinatorDisconnect() {
    if (!this.isRunning) return;
    
    console.log('\n' + chalk.red('🔌 Coordinator disconnected - Worker halting operations'));
    console.log(chalk.yellow('💡 Start coordinator again or press Ctrl+C to exit'));
    
    await logWorker(this.workerCore.workerId, 'Coordinator Disconnect', {
      description: 'Worker detected coordinator disconnect, halting operations',
      result: 'HALTED',
      notes: `Missed ${this.coordinatorMissedChecks} health checks`
    });
    
    // Stop worker operations but keep terminal interface running
    if (this.workerCore.isRunning) {
      await this.workerCore.pause();
    }
    
    // Wait for coordinator to come back
    this.waitForCoordinatorReconnect();
  }

  /**
   * Wait for coordinator reconnection
   */
  waitForCoordinatorReconnect() {
    console.log(chalk.cyan('🔄 Waiting for coordinator to reconnect...'));
    
    const reconnectCheck = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(reconnectCheck);
        return;
      }
      
      try {
        const fs = require('fs-extra');
        const path = require('path');
        const stateFile = path.join(this.workerCore.coordinationDir, 'system-state.json');
        
        if (await fs.pathExists(stateFile)) {
          const state = await fs.readJson(stateFile);
          const now = Date.now();
          
          if (state.last_heartbeat && (now - state.last_heartbeat) < 30000) {
            clearInterval(reconnectCheck);
            this.coordinatorMissedChecks = 0;
            this.lastCoordinatorCheck = now;
            
            console.log(chalk.green('✅ Coordinator reconnected - Resuming operations'));
            
            await logWorker(this.workerCore.workerId, 'Coordinator Reconnect', {
              description: 'Worker detected coordinator reconnection, resuming operations',
              result: 'RESUMED'
            });
            
            // Resume worker operations
            if (!this.workerCore.isRunning) {
              await this.workerCore.resume();
            }
          }
        }
      } catch (error) {
        // Continue waiting
      }
    }, 10000); // Check every 10 seconds for reconnect
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`\n${chalk.yellow(`📡 Received ${signal} - Worker shutting down gracefully...`)}`);
      
      await logWorker(this.workerCore.workerId, 'Graceful Shutdown', {
        description: `Worker received ${signal} signal, shutting down gracefully`,
        result: 'SHUTTING_DOWN'
      });
      
      await this.stop();
      
      if (this.workerCore.isRunning) {
        await this.workerCore.stop();
      }
      
      console.log(chalk.green('✅ Worker shut down complete'));
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // Handle uncaught errors gracefully
    process.on('uncaughtException', async (error) => {
      console.error(chalk.red('❌ Uncaught Exception:'), error.message);
      
      await logWorker(this.workerCore.workerId, 'Uncaught Exception', {
        description: 'Worker encountered uncaught exception',
        error: error.message,
        result: 'ERROR'
      });
      
      await this.stop();
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason) => {
      console.error(chalk.red('❌ Unhandled Rejection:'), reason);
      
      await logWorker(this.workerCore.workerId, 'Unhandled Rejection', {
        description: 'Worker encountered unhandled promise rejection',
        error: reason?.message || String(reason),
        result: 'ERROR'
      });
      
      await this.stop();
      process.exit(1);
    });
  }

  /**
   * Show worker help and commands
   */
  showHelp() {
    console.log('\n' + chalk.blue('🤖 Worker Commands:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`${chalk.cyan('[Ctrl+C]')} - Graceful shutdown`);
    console.log(`${chalk.cyan('[h]')} - Show this help`);
    console.log(`${chalk.cyan('[s]')} - Show worker status`);
    console.log(`${chalk.cyan('[m]')} - Show memory usage`);
    console.log('\n' + chalk.gray('Status bar shows: ID | Status | Group | Memory | Uptime | Time'));
  }

  /**
   * Display detailed worker status
   */
  showDetailedStatus() {
    const status = this.getWorkerStatus();
    const memoryUsage = process.memoryUsage();
    
    console.log('\n' + chalk.blue('📊 Worker Status:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`Worker ID: ${chalk.cyan(this.workerCore.workerId)}`);
    console.log(`Group: ${chalk.cyan(this.workerCore.groupId)}`);
    console.log(`Status: ${chalk.green(status.status)}`);
    console.log(`Running: ${this.workerCore.isRunning ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`Memory: ${chalk.cyan(Math.round(memoryUsage.rss / 1024 / 1024))}MB`);
    console.log(`Uptime: ${chalk.cyan(Math.floor(process.uptime()))}s`);
    console.log(`Coordinator: ${this.coordinatorMissedChecks === 0 ? chalk.green('Connected') : chalk.red('Disconnected')}`);
    
    if (status.task) {
      console.log(`Current Task: ${chalk.yellow(status.task)}`);
    }
  }
}

module.exports = WorkerTerminalInterface;