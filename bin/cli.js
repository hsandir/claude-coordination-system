#!/usr/bin/env node

/**
 * Multi-Claude Coordinator CLI
 * Main command interface for project coordination
 */

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const { machineIdSync } = require('node-machine-id');
const CoordinatorCore = require('../src/coordinator-core');
const ProjectDetector = require('../src/project-detector');
const ConfigManager = require('../src/config-manager');
const WelcomeGuide = require('../src/welcome-guide');

const program = new Command();

program
  .name('claude-coord')
  .description('Multi-Claude Parallel Processing Coordinator')
  .version('1.0.0');

// Initialize project coordination
program
  .command('init')
  .description('Initialize coordination in current project')
  .option('-t, --type <type>', 'Project type (nextjs, react, node, vue)')
  .option('-i, --interactive', 'Interactive setup')
  .action(async (options) => {
    console.log(chalk.blue('🚀 Initializing Multi-Claude Coordination...'));
    
    try {
      const projectRoot = process.cwd();
      const detector = new ProjectDetector(projectRoot);
      const configManager = new ConfigManager();
      
      // Detect or ask for project type
      let projectType = options.type;
      if (!projectType) {
        projectType = await detector.detectProjectType();
        console.log(chalk.green(`📋 Detected project type: ${projectType}`));
      }
      
      // Interactive setup if requested
      if (options.interactive) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            default: path.basename(projectRoot)
          },
          {
            type: 'number',
            name: 'maxWorkers',
            message: 'Maximum number of workers:',
            default: 6
          },
          {
            type: 'confirm',
            name: 'autoBackup',
            message: 'Enable automatic backups?',
            default: true
          }
        ]);
        
        // Create custom config
        const config = await configManager.createProjectConfig(projectRoot, {
          ...answers,
          projectType
        });
      } else {
        // Create default config
        const config = await configManager.createProjectConfig(projectRoot, {
          projectType
        });
      }
      
      // Create coordination directory
      await fs.ensureDir(path.join(projectRoot, '.claude-coord'));
      
      console.log(chalk.green('✅ Coordination system initialized!'));
      console.log(chalk.yellow('💡 Next steps:'));
      console.log('   1. claude-coord start');
      console.log('   2. claude-worker --id=claude_a --group=TYPESCRIPT');
      console.log('   3. claude-monitor');
      
    } catch (error) {
      console.error(chalk.red('❌ Initialization failed:'), error.message);
      process.exit(1);
    }
  });

// Start coordinator
program
  .command('start')
  .description('Start coordination server')
  .option('-p, --port <port>', 'Server port', '7777')
  .option('-m, --mode <mode>', 'Mode (dev|prod)', 'prod')
  .action(async (options) => {
    console.log(chalk.blue('🖥️  Starting Multi-Claude Coordinator...'));
    
    try {
      const projectRoot = process.cwd();
      const coordinator = new CoordinatorCore(projectRoot, {
        port: parseInt(options.port),
        mode: options.mode
      });
      
      await coordinator.start();
      
      console.log(chalk.green(`✅ Coordinator running on port ${options.port}`));
      console.log(chalk.yellow('📊 Open http://localhost:' + options.port + ' for web dashboard'));
      
      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\\n🛑 Shutting down coordinator...'));
        await coordinator.stop();
        process.exit(0);
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Coordinator start failed:'), error.message);
      process.exit(1);
    }
  });

// Show system status
program
  .command('status')
  .description('Show coordination system status')
  .action(async () => {
    try {
      const projectRoot = process.cwd();
      const coordinator = new CoordinatorCore(projectRoot);
      
      const status = await coordinator.getSystemStatus();
      
      console.log(chalk.blue('📊 System Status'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`Active Workers: ${chalk.green(status.activeWorkers)}`);
      console.log(`Completed Tasks: ${chalk.green(status.completedTasks)}/${status.totalTasks}`);
      console.log(`File Locks: ${chalk.yellow(status.fileLocks)}`);
      console.log(`System Health: ${status.healthy ? chalk.green('Healthy') : chalk.red('Unhealthy')}`);
      
      if (status.workers.length > 0) {
        console.log(chalk.blue('\\n👥 Active Workers:'));
        status.workers.forEach(worker => {
          const icon = worker.status === 'working' ? '🔧' : 
                      worker.status === 'completed' ? '✅' : '⏳';
          console.log(`  ${icon} ${worker.id} (${worker.group}) - ${worker.status}`);
        });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Status check failed:'), error.message);
      process.exit(1);
    }
  });

// Stop all coordination
program
  .command('stop')
  .description('Stop all workers and coordinator')
  .action(async () => {
    try {
      const projectRoot = process.cwd();
      const coordinator = new CoordinatorCore(projectRoot);
      
      console.log(chalk.yellow('🛑 Stopping coordination system...'));
      await coordinator.stopAll();
      
      console.log(chalk.green('✅ All workers stopped'));
      
    } catch (error) {
      console.error(chalk.red('❌ Stop failed:'), error.message);
      process.exit(1);
    }
  });

// List available groups
program
  .command('list-groups')
  .description('List available work groups for current project')
  .action(async () => {
    try {
      const projectRoot = process.cwd();
      const configManager = new ConfigManager();
      const config = await configManager.loadProjectConfig(projectRoot);
      
      console.log(chalk.blue('📋 Available Work Groups:'));
      console.log(chalk.gray('─'.repeat(50)));
      
      Object.entries(config.groups).forEach(([id, group]) => {
        const deps = group.dependencies.length > 0 ? 
          chalk.gray(` (depends on: ${group.dependencies.join(', ')})`) : '';
        console.log(`${chalk.green(id)}: ${group.name}${deps}`);
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to list groups:'), error.message);
      process.exit(1);
    }
  });

// Global config management
program
  .command('config')
  .description('Manage global configuration')
  .option('--set <key=value>', 'Set configuration value')
  .option('--get <key>', 'Get configuration value')
  .option('--list', 'List all configuration')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      
      if (options.set) {
        const [key, value] = options.set.split('=');
        await configManager.setGlobalConfig(key, value);
        console.log(chalk.green(`✅ Set ${key} = ${value}`));
      } else if (options.get) {
        const value = await configManager.getGlobalConfig(options.get);
        console.log(`${options.get} = ${value}`);
      } else if (options.list) {
        const config = await configManager.getGlobalConfig();
        console.log(chalk.blue('🔧 Global Configuration:'));
        console.log(JSON.stringify(config, null, 2));
      } else {
        console.log(chalk.yellow('Use --set, --get, or --list'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Config operation failed:'), error.message);
      process.exit(1);
    }
  });

// Restart coordinator (stops current, starts new)
program
  .command('restart')
  .description('Restart coordination server')
  .option('-p, --port <port>', 'Server port', '7777')
  .option('-m, --mode <mode>', 'Mode (dev|prod)', 'prod')
  .action(async (options) => {
    try {
      console.log(chalk.yellow('🔄 Restarting coordinator...'));
      
      const projectRoot = process.cwd();
      const coordinator = new CoordinatorCore(projectRoot);
      
      // Stop existing coordinator if running
      try {
        await coordinator.stop();
        console.log(chalk.green('✅ Existing coordinator stopped'));
      } catch (error) {
        console.log(chalk.gray('ℹ️  No running coordinator found'));
      }
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start new coordinator
      const newCoordinator = new CoordinatorCore(projectRoot, {
        port: parseInt(options.port),
        mode: options.mode
      });
      
      await newCoordinator.start();
      
      console.log(chalk.green(`✅ Coordinator restarted on port ${options.port}`));
      console.log(chalk.yellow('📊 Open http://localhost:' + options.port + ' for web dashboard'));
      
      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n🛑 Shutting down coordinator...'));
        await newCoordinator.stop();
        process.exit(0);
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Coordinator restart failed:'), error.message);
      process.exit(1);
    }
  });

// Remove worker from system
program
  .command('remove-worker')
  .description('Remove a worker from the coordination system')
  .option('-w, --worker <workerId>', 'Worker ID to remove')
  .action(async (options) => {
    try {
      if (!options.worker) {
        console.error(chalk.red('❌ Worker ID is required. Use --worker <workerId>'));
        process.exit(1);
      }
      
      const projectRoot = process.cwd();
      const coordinator = new CoordinatorCore(projectRoot);
      
      console.log(chalk.yellow(`🗑️  Removing worker: ${options.worker}...`));
      
      const result = await coordinator.removeWorker(options.worker);
      
      if (result.success) {
        console.log(chalk.green(`✅ Worker ${options.worker} removed successfully`));
        if (result.releasedFiles && result.releasedFiles.length > 0) {
          console.log(chalk.blue(`🔓 Released file locks: ${result.releasedFiles.join(', ')}`));
        }
      } else {
        console.log(chalk.yellow(`⚠️  Worker ${options.worker} not found or already removed`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to remove worker:'), error.message);
      process.exit(1);
    }
  });

// Change worker group
program
  .command('reassign-worker')
  .description('Reassign a worker to a different group')
  .option('-w, --worker <workerId>', 'Worker ID to reassign')
  .option('-g, --group <groupId>', 'New group ID')
  .action(async (options) => {
    try {
      if (!options.worker || !options.group) {
        console.error(chalk.red('❌ Both --worker and --group are required'));
        process.exit(1);
      }
      
      const projectRoot = process.cwd();
      const coordinator = new CoordinatorCore(projectRoot);
      
      console.log(chalk.yellow(`🔄 Reassigning ${options.worker} to ${options.group}...`));
      
      const result = await coordinator.reassignWorker(options.worker, options.group);
      
      if (result.success) {
        console.log(chalk.green(`✅ Worker ${options.worker} reassigned to ${options.group}`));
      } else {
        console.log(chalk.red(`❌ ${result.error}`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to reassign worker:'), error.message);
      process.exit(1);
    }
  });

// Help command with detailed explanations
program
  .command('help-detailed')
  .description('Show detailed help and usage examples')
  .action(() => {
    console.log(chalk.blue('🤖 Multi-Claude Coordination System - Detailed Help\n'));
    
    console.log(chalk.cyan('📚 Basic Usage:'));
    console.log('  1. Initialize: claude-coord init');
    console.log('  2. Start coordinator: claude-coord start');
    console.log('  3. Start worker: claude-worker --id=claude_1 --group=TYPESCRIPT');
    console.log('  4. Monitor: claude-monitor\n');
    
    console.log(chalk.cyan('🔧 Coordinator Management:'));
    console.log('  claude-coord start          # Start coordinator');
    console.log('  claude-coord restart        # Restart coordinator');
    console.log('  claude-coord stop           # Stop coordinator');
    console.log('  claude-coord status         # Check system status\n');
    
    console.log(chalk.cyan('👥 Worker Management:'));
    console.log('  claude-coord remove-worker --worker=claude_1    # Remove worker');
    console.log('  claude-coord reassign-worker --worker=claude_1 --group=ESLINT # Change worker group');
    console.log('  claude-worker --id=claude_1 --standby          # Start in standby mode\n');
    
    console.log(chalk.cyan('📋 Project Configuration:'));
    console.log('  claude-coord list-groups    # Show available work groups');
    console.log('  claude-coord config --list  # Show global configuration');
    console.log('  claude-coord config --set key=value # Set configuration\n');
    
    console.log(chalk.cyan('🎯 Common Scenarios:'));
    console.log('  • Change coordinator terminal: claude-coord restart');
    console.log('  • Remove stuck worker: claude-coord remove-worker --worker=claude_1');
    console.log('  • Switch worker task: claude-coord reassign-worker --worker=claude_1 --group=UI');
    console.log('  • Add worker dynamically: claude-worker --id=claude_new --standby\n');
    
    console.log(chalk.cyan('🔍 Monitoring:'));
    console.log('  claude-monitor              # Real-time dashboard');
    console.log('  claude-monitor --compact     # Compact view');
    console.log('  claude-coord status         # Quick status check\n');
    
    console.log(chalk.yellow('💡 Pro Tips:'));
    console.log('  • Use standby mode for flexible worker assignment');
    console.log('  • Monitor memory usage with claude-monitor');
    console.log('  • Create custom work groups in claude-coord.json');
    console.log('  • Use multiple terminals for different coordinators');
  });

// Setup custom rules
program
  .command('setup-rules')
  .description('Setup custom coordination rules')
  .option('-i, --interactive', 'Interactive rule setup')
  .action(async (options) => {
    try {
      console.log(chalk.blue('📜 Setting up custom coordination rules...'));
      
      const projectRoot = process.cwd();
      const configManager = new ConfigManager();
      
      if (options.interactive) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'maxWorkers',
            message: 'Maximum workers allowed:',
            default: '6'
          },
          {
            type: 'input',
            name: 'memoryLimit',
            message: 'Memory limit per worker (MB):',
            default: '256'
          },
          {
            type: 'confirm',
            name: 'autoBackup',
            message: 'Enable automatic backups before changes?',
            default: true
          },
          {
            type: 'confirm',
            name: 'strictDependencies',
            message: 'Enforce strict dependency checking?',
            default: true
          },
          {
            type: 'number',
            name: 'heartbeatInterval',
            message: 'Worker heartbeat interval (seconds):',
            default: 15
          }
        ]);
        
        const rulesConfig = {
          maxWorkers: parseInt(answers.maxWorkers),
          memoryLimitMB: parseInt(answers.memoryLimit),
          autoBackup: answers.autoBackup,
          strictDependencies: answers.strictDependencies,
          heartbeatInterval: answers.heartbeatInterval * 1000,
          createdAt: new Date().toISOString()
        };
        
        await configManager.saveCustomRules(projectRoot, rulesConfig);
        
        console.log(chalk.green('✅ Custom rules configured successfully!'));
        console.log(chalk.blue('📄 Rules saved to: .claude-coord/custom-rules.json'));
      } else {
        console.log(chalk.yellow('Use --interactive for guided setup'));
        console.log(chalk.gray('Or manually edit .claude-coord/custom-rules.json'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Rules setup failed:'), error.message);
      process.exit(1);
    }
  });

// Welcome and first-time setup
program
  .command('welcome')
  .description('Show welcome guide and first-time setup')
  .action(async () => {
    try {
      const guide = new WelcomeGuide();
      
      if (await guide.isFirstTime()) {
        await guide.showWelcome();
        await guide.firstTimeSetup();
      } else {
        console.log(chalk.blue('🎉 Welcome back to Multi-Claude Coordination!'));
        console.log(chalk.yellow('Use claude-coord help-detailed for all commands'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Welcome guide failed:'), error.message);
      process.exit(1);
    }
  });

// Context-sensitive help
program
  .command('help-context')
  .description('Show contextual help based on situation')
  .option('--situation <type>', 'Specific situation (coordinator_failed, worker_stuck, memory_issues)')
  .action(async (options) => {
    try {
      const guide = new WelcomeGuide();
      await guide.showContextualHelp(options.situation);
      
    } catch (error) {
      console.error(chalk.red('❌ Help context failed:'), error.message);
      process.exit(1);
    }
  });

// Quick setup command
program
  .command('quick-setup')
  .description('Quick setup for experienced users')
  .option('--workers <count>', 'Number of workers to start', '2')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Quick Setup Mode'));
      console.log(chalk.gray('─'.repeat(30)));
      
      const workerCount = parseInt(options.workers);
      const projectRoot = process.cwd();
      
      // Check if initialized
      const configPath = path.join(projectRoot, 'claude-coord.json');
      if (!(await fs.pathExists(configPath))) {
        console.log(chalk.yellow('📋 Initializing project...'));
        
        const configManager = new ConfigManager();
        await configManager.createProjectConfig(projectRoot, {
          projectType: 'auto-detected',
          maxWorkers: workerCount + 1 // +1 for coordinator
        });
      }
      
      console.log(chalk.green('✅ Project ready'));
      console.log(chalk.blue('📋 Next Steps:'));
      console.log();
      console.log(chalk.yellow('Terminal 1 (Coordinator):'));
      console.log('  claude-coord start');
      console.log();
      
      for (let i = 1; i <= workerCount; i++) {
        console.log(chalk.yellow(`Terminal ${i + 1} (Worker ${i}):`));
        console.log(`  claude-worker --id=claude_${i} --standby --verbose`);
      }
      
      console.log();
      console.log(chalk.yellow('Monitor Terminal:'));
      console.log('  claude-monitor');
      console.log();
      console.log(chalk.green('💡 Tip: Start coordinator first, then workers will connect automatically'));
      
    } catch (error) {
      console.error(chalk.red('❌ Quick setup failed:'), error.message);
      process.exit(1);
    }
  });

program.parse();