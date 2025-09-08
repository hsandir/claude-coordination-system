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

program.parse();