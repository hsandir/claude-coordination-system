#!/usr/bin/env node

/**
 * Multi-Claude Coordinator Installation Script
 * Sets up global installation and configuration
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const { execSync } = require('child_process');

class Installer {
  constructor() {
    this.globalDir = path.join(os.homedir(), '.claude-coord');
    this.binDir = path.join(this.globalDir, 'bin');
    this.srcDir = path.join(this.globalDir, 'src');
    this.packageRoot = __dirname;
  }

  async install() {
    console.log(chalk.blue('🚀 Installing Multi-Claude Coordinator...'));
    
    try {
      // Create global directories
      await this.createDirectories();
      
      // Copy files
      await this.copyFiles();
      
      // Setup binaries
      await this.setupBinaries();
      
      // Initialize global configuration
      await this.initializeGlobalConfig();
      
      // Create shell aliases (optional)
      await this.setupShellAliases();
      
      console.log(chalk.green('✅ Installation completed successfully!'));
      this.showUsageInstructions();
      
    } catch (error) {
      console.error(chalk.red('❌ Installation failed:'), error.message);
      process.exit(1);
    }
  }

  async createDirectories() {
    console.log(chalk.blue('📁 Creating directories...'));
    
    await fs.ensureDir(this.globalDir);
    await fs.ensureDir(this.binDir);
    await fs.ensureDir(this.srcDir);
    await fs.ensureDir(path.join(this.globalDir, 'templates'));
    await fs.ensureDir(path.join(this.globalDir, 'logs'));
  }

  async copyFiles() {
    console.log(chalk.blue('📦 Copying files...'));
    
    // Copy source files
    await fs.copy(path.join(this.packageRoot, 'src'), this.srcDir);
    
    // Copy binaries
    await fs.copy(path.join(this.packageRoot, 'bin'), this.binDir);
    
    // Copy package.json
    await fs.copy(
      path.join(this.packageRoot, 'package.json'), 
      path.join(this.globalDir, 'package.json')
    );
    
    // Create version file
    const version = require('./package.json').version;
    await fs.writeFile(
      path.join(this.globalDir, 'VERSION'), 
      version
    );
  }

  async setupBinaries() {
    console.log(chalk.blue('🔧 Setting up binaries...'));
    
    const binaries = [
      { src: 'cli.js', dest: 'claude-coord' },
      { src: 'worker.js', dest: 'claude-worker' },
      { src: 'monitor.js', dest: 'claude-monitor' }
    ];

    for (const binary of binaries) {
      const srcPath = path.join(this.binDir, binary.src);
      const destPath = path.join(this.binDir, binary.dest);
      
      // Make executable
      await fs.chmod(srcPath, '755');
      
      // Create symlink or copy for different platforms
      if (process.platform !== 'win32') {
        try {
          await fs.unlink(destPath);
        } catch (err) {
          // Ignore if file doesn't exist
        }
        await fs.symlink(srcPath, destPath);
      } else {
        await fs.copy(srcPath, destPath);
      }
    }
    
    // Add to PATH if needed
    await this.addToPath();
  }

  async addToPath() {
    const currentPath = process.env.PATH || '';
    
    if (!currentPath.includes(this.binDir)) {
      console.log(chalk.yellow('💡 Add to your shell profile:'));
      console.log(chalk.gray(`export PATH="${this.binDir}:$PATH"`));
      
      // Try to add automatically for common shells
      await this.updateShellProfile();
    }
  }

  async updateShellProfile() {
    const homeDir = os.homedir();
    const profiles = [
      '.bashrc',
      '.zshrc', 
      '.profile',
      '.bash_profile'
    ];

    const exportLine = `export PATH="${this.binDir}:$PATH" # Multi-Claude Coordinator`;
    
    for (const profile of profiles) {
      const profilePath = path.join(homeDir, profile);
      
      if (await fs.pathExists(profilePath)) {
        try {
          const content = await fs.readFile(profilePath, 'utf8');
          
          if (!content.includes('Multi-Claude Coordinator')) {
            await fs.appendFile(profilePath, `\\n${exportLine}\\n`);
            console.log(chalk.green(`✅ Added to ${profile}`));
          }
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Could not update ${profile}: ${error.message}`));
        }
      }
    }
  }

  async initializeGlobalConfig() {
    console.log(chalk.blue('⚙️  Initializing global configuration...'));
    
    const ConfigManager = require('./src/config-manager');
    const configManager = new ConfigManager();
    
    await configManager.initializeGlobalConfig();
  }

  async setupShellAliases() {
    console.log(chalk.blue('🔗 Setting up shell aliases...'));
    
    const aliases = {
      'cc': 'claude-coord',
      'cw': 'claude-worker', 
      'cm': 'claude-monitor'
    };

    const homeDir = os.homedir();
    const aliasFile = path.join(homeDir, '.claude-coord-aliases');
    
    let aliasContent = '# Multi-Claude Coordinator Aliases\\n';
    for (const [alias, command] of Object.entries(aliases)) {
      aliasContent += `alias ${alias}="${command}"\\n`;
    }
    
    await fs.writeFile(aliasFile, aliasContent);
    
    console.log(chalk.green('📝 Created aliases file: ~/.claude-coord-aliases'));
    console.log(chalk.yellow('💡 Add to your shell profile:'));
    console.log(chalk.gray(`source ~/.claude-coord-aliases`));
  }

  showUsageInstructions() {
    console.log(chalk.blue('\\n📖 Usage Instructions:'));
    console.log(chalk.gray('─'.repeat(50)));
    
    console.log(chalk.green('🏁 Quick Start:'));
    console.log('  cd your-project');
    console.log('  claude-coord init');
    console.log('  claude-coord start');
    console.log('');
    
    console.log(chalk.green('👥 Workers:'));
    console.log('  claude-worker --id=claude_a --group=TYPESCRIPT');
    console.log('  claude-worker --id=claude_b --group=ESLINT');
    console.log('');
    
    console.log(chalk.green('📊 Monitoring:'));
    console.log('  claude-monitor');
    console.log('  claude-monitor --web');
    console.log('');
    
    console.log(chalk.green('⚙️  Configuration:'));
    console.log('  claude-coord config --list');
    console.log('  claude-coord list-groups');
    console.log('');
    
    console.log(chalk.yellow('💡 Pro Tips:'));
    console.log('  - Use aliases: cc, cw, cm for faster access');
    console.log('  - Start with: claude-coord init --interactive');
    console.log('  - Monitor with: claude-monitor --web');
    console.log('');
    
    console.log(chalk.blue('📚 Documentation:'));
    console.log('  Global config: ~/.claude-coord/config.json');
    console.log('  Project config: ./claude-coord.json');
    console.log('  Logs: ~/.claude-coord/logs/');
    console.log('');
    
    if (process.platform !== 'win32') {
      console.log(chalk.yellow('🔄 Reload your shell or run:'));
      console.log(chalk.gray('source ~/.bashrc  # or ~/.zshrc'));
    }
  }

  async uninstall() {
    console.log(chalk.yellow('🗑️  Uninstalling Multi-Claude Coordinator...'));
    
    try {
      // Remove global directory
      await fs.remove(this.globalDir);
      
      // Remove shell profile entries
      await this.removeFromShellProfile();
      
      console.log(chalk.green('✅ Uninstallation completed'));
      
    } catch (error) {
      console.error(chalk.red('❌ Uninstallation failed:'), error.message);
    }
  }

  async removeFromShellProfile() {
    const homeDir = os.homedir();
    const profiles = ['.bashrc', '.zshrc', '.profile', '.bash_profile'];
    
    for (const profile of profiles) {
      const profilePath = path.join(homeDir, profile);
      
      if (await fs.pathExists(profilePath)) {
        try {
          let content = await fs.readFile(profilePath, 'utf8');
          
          // Remove Multi-Claude Coordinator entries
          content = content
            .split('\\n')
            .filter(line => !line.includes('Multi-Claude Coordinator'))
            .join('\\n');
          
          await fs.writeFile(profilePath, content);
          
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Could not update ${profile}`));
        }
      }
    }
    
    // Remove aliases file
    const aliasFile = path.join(homeDir, '.claude-coord-aliases');
    if (await fs.pathExists(aliasFile)) {
      await fs.unlink(aliasFile);
    }
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const installer = new Installer();
  
  if (command === 'uninstall') {
    installer.uninstall();
  } else {
    installer.install();
  }
}

module.exports = Installer;