#!/usr/bin/env node

/**
 * Multi-Claude Worker Process
 * Individual worker that executes tasks with coordination
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const WorkerCore = require('../src/worker-core');
const ConfigManager = require('../src/config-manager');

const program = new Command();

program
  .name('claude-worker')
  .description('Multi-Claude Worker Process')
  .version('1.0.0')
  .requiredOption('--id <id>', 'Worker ID (e.g., claude_a)')
  .option('--group <group>', 'Work group ID (e.g., TYPESCRIPT)')
  .option('--standby', 'Start in standby mode - wait for group assignment')
  .option('--project-root <path>', 'Project root directory', process.cwd())
  .option('--verbose', 'Verbose logging')
  .option('--dry-run', 'Dry run mode (no actual changes)')
  .option('--memory <mb>', 'Memory limit in MB', '256')
  .parse();

const options = program.opts();

/**
 * Setup interactive standby mode commands
 */
function setupStandbyCommands(worker, projectConfig) {
  console.log(chalk.blue('\n📝 Interactive Commands:'));
  console.log(chalk.gray('  join <group>     - Join a work group'));
  console.log(chalk.gray('  list             - List available groups'));
  console.log(chalk.gray('  status           - Show current status'));
  console.log(chalk.gray('  quit             - Exit worker'));
  console.log(chalk.gray('  Type commands below:'));
  
  // Setup readline for interactive input
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.blue('claude> ')
  });
  
  rl.prompt();
  
  rl.on('line', async (line) => {
    const [command, ...args] = line.trim().split(' ');
    
    try {
      switch (command) {
        case 'join':
          const groupId = args[0];
          if (!groupId) {
            console.log(chalk.red('Usage: join <group>'));
            break;
          }
          
          if (!projectConfig.groups[groupId]) {
            console.log(chalk.red(`❌ Group '${groupId}' not found`));
            console.log(chalk.yellow('Available groups:'));
            Object.keys(projectConfig.groups).forEach(id => {
              console.log(`  - ${id}: ${projectConfig.groups[id].name}`);
            });
            break;
          }
          
          console.log(chalk.green(`🚀 Joining group: ${groupId}`));
          await worker.assignToGroup(groupId);
          break;
          
        case 'list':
          console.log(chalk.blue('📋 Available groups:'));
          Object.entries(projectConfig.groups).forEach(([id, group]) => {
            console.log(`  - ${chalk.green(id)}: ${group.name}`);
          });
          break;
          
        case 'status':
          const stats = worker.getMemoryStats();
          console.log(chalk.blue(`📊 Worker Status:`));
          console.log(`  ID: ${worker.workerId}`);
          console.log(`  Group: ${worker.groupId}`);
          console.log(`  Memory: ${stats.current}MB / ${stats.limit}MB (${stats.usage}%)`);
          console.log(`  Status: ${worker.isRunning ? 'Running' : 'Stopped'}`);
          break;
          
        case 'quit':
        case 'exit':
          console.log(chalk.yellow('👋 Shutting down worker...'));
          await worker.shutdown();
          rl.close();
          process.exit(0);
          break;
          
        case 'help':
          console.log(chalk.blue('\n📝 Available Commands:'));
          console.log(chalk.gray('  join <group>     - Join a work group'));
          console.log(chalk.gray('  list             - List available groups'));
          console.log(chalk.gray('  status           - Show current status'));
          console.log(chalk.gray('  quit             - Exit worker'));
          break;
          
        default:
          if (command) {
            console.log(chalk.red(`Unknown command: ${command}`));
            console.log(chalk.gray('Type "help" for available commands'));
          }
          break;
      }
    } catch (error) {
      console.error(chalk.red(`❌ Command failed: ${error.message}`));
    }
    
    rl.prompt();
  });
  
  rl.on('close', async () => {
    console.log(chalk.yellow('\n👋 Goodbye!'));
    await worker.shutdown();
    process.exit(0);
  });
}

async function main() {
  try {
    console.log(chalk.blue(`🤖 Starting Claude Worker: ${options.id}`));
    console.log(chalk.gray(`📁 Project: ${path.basename(options.projectRoot)}`));
    console.log(chalk.gray(`🧠 Memory limit: ${options.memory}MB`));
    
    // Validate configuration
    const configManager = new ConfigManager();
    const projectConfig = await configManager.loadProjectConfig(options.projectRoot);
    
    // Standby mode check
    if (options.standby) {
      console.log(chalk.yellow(`⏸️  Starting in STANDBY mode`));
      console.log(chalk.gray(`   Waiting for group assignment...`));
      console.log(chalk.blue(`   Available groups:`));
      Object.keys(projectConfig.groups).forEach(groupId => {
        console.log(`     - ${groupId}: ${projectConfig.groups[groupId].name}`);
      });
      
      // Initialize in standby mode
      const worker = new WorkerCore(options.id, 'STANDBY', options.projectRoot, {
        verbose: options.verbose,
        dryRun: options.dryRun,
        maxMemoryMB: parseInt(options.memory),
        standbyMode: true
      });
      
      setupStandbyCommands(worker, projectConfig);
      await worker.start();
      return;
    }
    
    // Regular group validation
    if (!options.group) {
      console.error(chalk.red(`❌ Either --group or --standby is required`));
      console.log(chalk.yellow('Available groups:'));
      Object.keys(projectConfig.groups).forEach(groupId => {
        console.log(`  - ${groupId}: ${projectConfig.groups[groupId].name}`);
      });
      process.exit(1);
    }
    
    console.log(chalk.gray(`🏷️  Group: ${options.group}`));
    
    if (!projectConfig.groups[options.group]) {
      console.error(chalk.red(`❌ Work group '${options.group}' not found`));
      console.log(chalk.yellow('Available groups:'));
      Object.keys(projectConfig.groups).forEach(groupId => {
        console.log(`  - ${groupId}: ${projectConfig.groups[groupId].name}`);
      });
      process.exit(1);
    }

    // Initialize worker
    const worker = new WorkerCore(options.id, options.group, options.projectRoot, {
      verbose: options.verbose,
      dryRun: options.dryRun,
      maxMemoryMB: parseInt(options.memory)
    });

    // Graceful shutdown handling
    let isShuttingDown = false;
    
    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.log(chalk.yellow(`\\n🛑 Received ${signal}, shutting down worker...`));
      
      try {
        await worker.shutdown();
        console.log(chalk.green('✅ Worker shutdown complete'));
        process.exit(0);
      } catch (error) {
        console.error(chalk.red('❌ Error during shutdown:'), error.message);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      console.error(chalk.red('❌ Uncaught exception:'), error);
      await worker.shutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error(chalk.red('❌ Unhandled rejection at:'), promise, 'reason:', reason);
      await worker.shutdown();
      process.exit(1);
    });

    // Start worker
    await worker.start();
    
    console.log(chalk.green(`🎉 Worker ${options.id} completed successfully`));
    
  } catch (error) {
    console.error(chalk.red('❌ Worker failed:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Additional CLI commands
program
  .command('list-groups')
  .description('List available work groups')
  .option('--project-root <path>', 'Project root directory', process.cwd())
  .action(async (cmdOptions) => {
    try {
      const configManager = new ConfigManager();
      const projectConfig = await configManager.loadProjectConfig(cmdOptions.projectRoot);
      
      console.log(chalk.blue('📋 Available Work Groups:'));
      console.log(chalk.gray('─'.repeat(60)));
      
      Object.entries(projectConfig.groups).forEach(([groupId, group]) => {
        const deps = group.dependencies?.length > 0 ? 
          chalk.gray(` (depends on: ${group.dependencies.join(', ')})`) : '';
        console.log(`${chalk.green(groupId)}: ${group.name}${deps}`);
        
        if (group.tasks) {
          group.tasks.forEach(task => {
            console.log(`  - ${chalk.gray(task)}`);
          });
        }
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to list groups:'), error.message);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate worker setup')
  .option('--project-root <path>', 'Project root directory', process.cwd())
  .action(async (cmdOptions) => {
    try {
      console.log(chalk.blue('🔍 Validating worker setup...'));
      
      const configManager = new ConfigManager();
      
      // Check project config
      const projectConfig = await configManager.loadProjectConfig(cmdOptions.projectRoot);
      console.log(chalk.green('✅ Project configuration valid'));
      
      // Check coordination directory
      const coordDir = path.join(cmdOptions.projectRoot, '.claude-coord');
      if (await require('fs-extra').pathExists(coordDir)) {
        console.log(chalk.green('✅ Coordination directory exists'));
      } else {
        console.log(chalk.yellow('⚠️  Coordination directory not found. Run: claude-coord init'));
      }
      
      // Check system state
      const stateFile = path.join(coordDir, 'system-state.json');
      if (await require('fs-extra').pathExists(stateFile)) {
        console.log(chalk.green('✅ System state file exists'));
      } else {
        console.log(chalk.yellow('⚠️  System state not initialized. Start coordinator first.'));
      }
      
      console.log(chalk.green('🎯 Worker setup validation complete'));
      
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error.message);
      process.exit(1);
    }
  });

// Only run main if this is the main module
if (require.main === module) {
  main();
}

module.exports = { main };