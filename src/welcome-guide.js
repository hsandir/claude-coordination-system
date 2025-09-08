/**
 * Welcome Guide & First-Time Setup System
 * Provides comprehensive guidance for new users
 */

const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');

class WelcomeGuide {
  constructor() {
    this.version = '1.0.0';
  }

  /**
   * Show welcome message for first-time users
   */
  async showWelcome() {
    console.clear();
    
    console.log(chalk.blue('🚀 Welcome to Multi-Claude Coordination System!'));
    console.log(chalk.gray('═'.repeat(60)));
    console.log();
    
    console.log(chalk.cyan('🎯 What is this system?'));
    console.log('  A professional coordination system that allows multiple Claude');
    console.log('  instances to work together on the same project without conflicts.');
    console.log();
    
    console.log(chalk.cyan('🌟 Key Features:'));
    console.log('  • File-based coordination with automatic locking');
    console.log('  • Dependency management between work groups');
    console.log('  • Real-time monitoring and memory management');
    console.log('  • Standby mode for dynamic worker assignment');
    console.log('  • Professional Zero Protocol compliance');
    console.log();
    
    console.log(chalk.cyan('🏗️  How it works:'));
    console.log('  1. 🖥️  Coordinator manages the system state');
    console.log('  2. 👥 Workers execute tasks in assigned groups');
    console.log('  3. 🔒 File locks prevent conflicts');
    console.log('  4. 📊 Real-time monitoring tracks progress');
    console.log();
    
    console.log(chalk.yellow('Press Enter to continue...'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
  }

  /**
   * Interactive first-time setup
   */
  async firstTimeSetup() {
    console.clear();
    
    console.log(chalk.blue('🛠️  First-Time Setup'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log();
    
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'showQuickStart',
        message: 'Would you like to see a quick start guide?',
        default: true
      },
      {
        type: 'confirm',
        name: 'createSampleProject',
        message: 'Create a sample project for testing?',
        default: false
      },
      {
        type: 'list',
        name: 'experienceLevel',
        message: 'Your experience level with coordination systems:',
        choices: [
          { name: 'New to coordination systems', value: 'beginner' },
          { name: 'Some experience with automation', value: 'intermediate' },
          { name: 'Advanced user, show me the power', value: 'advanced' }
        ]
      }
    ]);

    if (answers.showQuickStart) {
      await this.showQuickStart(answers.experienceLevel);
    }

    if (answers.createSampleProject) {
      await this.createSampleProject();
    }

    await this.saveUserPreferences(answers);
  }

  /**
   * Show quick start guide based on experience level
   */
  async showQuickStart(level) {
    console.clear();
    
    console.log(chalk.blue('⚡ Quick Start Guide'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log();

    if (level === 'beginner') {
      await this.showBeginnerGuide();
    } else if (level === 'intermediate') {
      await this.showIntermediateGuide();
    } else {
      await this.showAdvancedGuide();
    }
  }

  async showBeginnerGuide() {
    console.log(chalk.cyan('👋 Beginner-Friendly Setup'));
    console.log();
    
    console.log(chalk.yellow('Step 1: Initialize your project'));
    console.log('  cd /path/to/your/project');
    console.log('  claude-coord init --interactive');
    console.log();
    
    console.log(chalk.yellow('Step 2: Start the coordinator'));
    console.log('  claude-coord start');
    console.log('  (Keep this terminal open)');
    console.log();
    
    console.log(chalk.yellow('Step 3: In new terminals, start workers'));
    console.log('  Terminal 2: claude-worker --id=claude_1 --standby');
    console.log('  Terminal 3: claude-worker --id=claude_2 --standby');
    console.log();
    
    console.log(chalk.yellow('Step 4: Assign work to Claude instances'));
    console.log('  In worker terminals, type: join TYPESCRIPT');
    console.log('  Or use: claude-coord reassign-worker --worker=claude_1 --group=ESLINT');
    console.log();
    
    console.log(chalk.green('💡 Pro Tips:'));
    console.log('  • Use claude-monitor to watch progress');
    console.log('  • Type "help" in worker terminals for commands');
    console.log('  • Use claude-coord help-detailed for all options');
    console.log();
    
    await this.waitForUser();
  }

  async showIntermediateGuide() {
    console.log(chalk.cyan('🔧 Intermediate Setup'));
    console.log();
    
    console.log(chalk.yellow('Quick Commands:'));
    console.log('  claude-coord init && claude-coord start  # Setup + start');
    console.log('  claude-worker --id=claude_a --group=TYPESCRIPT --verbose');
    console.log('  claude-worker --id=claude_b --standby   # Flexible assignment');
    console.log('  claude-monitor --compact                 # Real-time monitoring');
    console.log();
    
    console.log(chalk.yellow('Advanced Features:'));
    console.log('  claude-coord setup-rules --interactive  # Custom coordination rules');
    console.log('  claude-coord remove-worker --worker=claude_a  # Remove stuck workers');
    console.log('  claude-coord restart                     # Change coordinator terminal');
    console.log();
    
    console.log(chalk.green('💡 Workflow Tips:'));
    console.log('  • Create custom work groups in claude-coord.json');
    console.log('  • Use memory limits: --memory 512 for large projects');
    console.log('  • Monitor system: claude-coord status');
    console.log();
    
    await this.waitForUser();
  }

  async showAdvancedGuide() {
    console.log(chalk.cyan('🚀 Advanced Configuration'));
    console.log();
    
    console.log(chalk.yellow('Power User Commands:'));
    console.log('  # Multi-project coordination');
    console.log('  claude-coord config --set defaults.max_workers=10');
    console.log('  claude-coord config --set defaults.coordination_port=8888');
    console.log();
    
    console.log('  # Dynamic work group creation');
    console.log('  # Edit claude-coord.json for custom dependency chains');
    console.log('  # Use --dry-run for testing complex workflows');
    console.log();
    
    console.log(chalk.yellow('Enterprise Features:'));
    console.log('  • File-based state persistence');
    console.log('  • Automatic memory cleanup and monitoring');
    console.log('  • Heartbeat-based worker health checking');
    console.log('  • Custom rules engine with project-specific policies');
    console.log();
    
    console.log(chalk.green('💡 Advanced Tips:'));
    console.log('  • Use coordination across multiple machines (file sync)');
    console.log('  • Implement custom work groups for complex projects');
    console.log('  • Monitor performance with real-time dashboard');
    console.log('  • Use standby mode for elastic worker scaling');
    console.log();
    
    await this.waitForUser();
  }

  /**
   * Create a sample project for testing
   */
  async createSampleProject() {
    console.log(chalk.blue('📁 Creating Sample Project...'));
    
    const sampleDir = path.join(process.cwd(), 'claude-coord-sample');
    
    try {
      await fs.ensureDir(sampleDir);
      
      // Create sample files
      await fs.writeFile(
        path.join(sampleDir, 'package.json'),
        JSON.stringify({
          name: 'claude-coord-sample',
          version: '1.0.0',
          description: 'Sample project for testing Multi-Claude coordination',
          scripts: {
            'test': 'echo "Sample project created successfully!"'
          }
        }, null, 2)
      );
      
      await fs.writeFile(
        path.join(sampleDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'es2020',
            module: 'commonjs',
            strict: true
          }
        }, null, 2)
      );
      
      // Create sample coordination config
      await fs.writeFile(
        path.join(sampleDir, 'claude-coord.json'),
        JSON.stringify({
          project: {
            name: 'Sample Project',
            type: 'sample',
            version: '1.0.0'
          },
          groups: {
            GROUP_A: {
              name: 'Sample Work Group A',
              priority: 1,
              files: ['src/**/*.js'],
              dependencies: []
            },
            GROUP_B: {
              name: 'Sample Work Group B',
              priority: 2,
              files: ['tests/**/*.js'],
              dependencies: ['GROUP_A']
            }
          }
        }, null, 2)
      );
      
      console.log(chalk.green(`✅ Sample project created at: ${sampleDir}`));
      console.log(chalk.yellow('To test it:'));
      console.log(`  cd ${sampleDir}`);
      console.log('  claude-coord start');
      console.log();
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to create sample project:'), error.message);
    }
  }

  /**
   * Save user preferences for future sessions
   */
  async saveUserPreferences(preferences) {
    const configDir = path.join(require('os').homedir(), '.claude-coord');
    const prefFile = path.join(configDir, 'user-preferences.json');
    
    try {
      await fs.ensureDir(configDir);
      
      const userPrefs = {
        ...preferences,
        firstTime: false,
        setupCompleted: new Date().toISOString(),
        version: this.version
      };
      
      await fs.writeJson(prefFile, userPrefs, { spaces: 2 });
      
    } catch (error) {
      console.log(chalk.gray('Note: Could not save preferences'));
    }
  }

  /**
   * Check if this is a first-time user
   */
  async isFirstTime() {
    const configDir = path.join(require('os').homedir(), '.claude-coord');
    const prefFile = path.join(configDir, 'user-preferences.json');
    
    try {
      if (await fs.pathExists(prefFile)) {
        const prefs = await fs.readJson(prefFile);
        return prefs.firstTime !== false;
      }
    } catch (error) {
      // Ignore errors, assume first time
    }
    
    return true;
  }

  /**
   * Show contextual help based on current situation
   */
  async showContextualHelp(context = 'general') {
    console.log(chalk.blue('🆘 Contextual Help'));
    console.log(chalk.gray('─'.repeat(30)));
    
    switch (context) {
      case 'coordinator_failed':
        console.log(chalk.yellow('Coordinator failed to start:'));
        console.log('  • Check if port 7777 is available: lsof -i :7777');
        console.log('  • Try a different port: claude-coord start --port 8888');
        console.log('  • Ensure project is initialized: claude-coord init');
        break;
        
      case 'worker_stuck':
        console.log(chalk.yellow('Worker appears stuck:'));
        console.log('  • Check worker status: claude-coord status');
        console.log('  • Remove stuck worker: claude-coord remove-worker --worker=claude_1');
        console.log('  • Restart worker in standby: claude-worker --id=claude_1 --standby');
        break;
        
      case 'memory_issues':
        console.log(chalk.yellow('Memory issues detected:'));
        console.log('  • Monitor usage: claude-monitor');
        console.log('  • Set memory limits: claude-worker --memory 256');
        console.log('  • Setup custom rules: claude-coord setup-rules --interactive');
        break;
        
      default:
        console.log(chalk.yellow('General Help:'));
        console.log('  • Full help: claude-coord help-detailed');
        console.log('  • Status check: claude-coord status');
        console.log('  • List groups: claude-coord list-groups');
        console.log('  • Monitor system: claude-monitor');
    }
    console.log();
  }

  async waitForUser() {
    console.log(chalk.gray('Press Enter to continue...'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
  }
}

module.exports = WelcomeGuide;