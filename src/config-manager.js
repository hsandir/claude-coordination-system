/**
 * Configuration Management System
 * Handles project and global configuration for Multi-Claude Coordinator
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { machineIdSync } = require('node-machine-id');
const ProjectDetector = require('./project-detector');

class ConfigManager {
  constructor() {
    this.globalConfigDir = path.join(os.homedir(), '.claude-coord');
    this.globalConfigFile = path.join(this.globalConfigDir, 'config.json');
    this.projectConfigFile = 'claude-coord.json';
  }

  /**
   * Create project configuration
   */
  async createProjectConfig(projectRoot, options = {}) {
    const detector = new ProjectDetector(projectRoot);
    const projectType = options.projectType || await detector.detectProjectType();
    const complexity = await detector.analyzeComplexity();
    const suggestedGroups = detector.getSuggestedGroups(projectType);
    
    const config = {
      project: {
        name: options.projectName || path.basename(projectRoot),
        type: projectType,
        root: projectRoot,
        created_at: new Date().toISOString(),
        version: '1.0.0'
      },
      
      coordinator: {
        max_workers: options.maxWorkers || complexity.suggestedWorkers,
        coordination_mode: 'file_based',
        heartbeat_interval: 15000,
        stale_worker_timeout: 60000,
        port: 7777
      },
      
      features: {
        auto_backup: options.autoBackup !== false,
        file_watching: true,
        real_time_monitoring: true,
        web_dashboard: true
      },
      
      groups: suggestedGroups,
      
      paths: {
        coordination_dir: '.claude-coord',
        state_file: '.claude-coord/system-state.json',
        messages_file: '.claude-coord/messages.json',
        logs_dir: '.claude-coord/logs'
      },
      
      rules: {
        zero_protocol: {
          enabled: true,
          no_auto_fix: true,
          no_casting: true,
          root_cause_analysis: true
        },
        file_protection: {
          exclude_patterns: [
            'node_modules/**',
            '.git/**',
            'dist/**',
            'build/**',
            '.next/**'
          ],
          backup_before_modify: true
        }
      }
    };

    const configPath = path.join(projectRoot, this.projectConfigFile);
    await fs.writeJson(configPath, config, { spaces: 2 });
    
    // Update global project registry
    await this.registerProject(projectRoot, config.project);
    
    console.log(`✅ Project configuration created: ${configPath}`);
    return config;
  }

  /**
   * Load project configuration
   */
  async loadProjectConfig(projectRoot) {
    const configPath = path.join(projectRoot, this.projectConfigFile);
    
    if (!(await fs.pathExists(configPath))) {
      throw new Error(`Project not initialized. Run: claude-coord init`);
    }

    try {
      const config = await fs.readJson(configPath);
      
      // Validate and migrate config if needed
      return this.validateAndMigrateConfig(config);
      
    } catch (error) {
      throw new Error(`Invalid project configuration: ${error.message}`);
    }
  }

  /**
   * Update project configuration
   */
  async updateProjectConfig(projectRoot, updates) {
    const currentConfig = await this.loadProjectConfig(projectRoot);
    const updatedConfig = this.mergeDeep(currentConfig, updates);
    
    const configPath = path.join(projectRoot, this.projectConfigFile);
    await fs.writeJson(configPath, updatedConfig, { spaces: 2 });
    
    return updatedConfig;
  }

  /**
   * Global configuration management
   */
  async initializeGlobalConfig() {
    await fs.ensureDir(this.globalConfigDir);
    
    const defaultConfig = {
      user: {
        machine_id: machineIdSync(),
        created_at: new Date().toISOString(),
        preferred_terminal: this.detectTerminal()
      },
      
      defaults: {
        coordination_port: 7777,
        log_level: 'info',
        auto_backup: true,
        max_workers: 6,
        theme: 'dark'
      },
      
      projects: [],
      
      preferences: {
        notifications: true,
        auto_updates: true,
        telemetry: false
      },
      
      version: '1.0.0'
    };

    if (!(await fs.pathExists(this.globalConfigFile))) {
      await fs.writeJson(this.globalConfigFile, defaultConfig, { spaces: 2 });
    }

    return defaultConfig;
  }

  /**
   * Get global configuration
   */
  async getGlobalConfig(key = null) {
    await this.initializeGlobalConfig();
    
    const config = await fs.readJson(this.globalConfigFile);
    
    if (key) {
      return this.getNestedValue(config, key);
    }
    
    return config;
  }

  /**
   * Set global configuration
   */
  async setGlobalConfig(key, value) {
    const config = await this.getGlobalConfig();
    
    this.setNestedValue(config, key, value);
    
    await fs.writeJson(this.globalConfigFile, config, { spaces: 2 });
    return config;
  }

  /**
   * Register project in global registry
   */
  async registerProject(projectRoot, projectInfo) {
    const config = await this.getGlobalConfig();
    
    // Remove existing entry if it exists
    config.projects = config.projects.filter(p => p.path !== projectRoot);
    
    // Add updated entry
    config.projects.push({
      name: projectInfo.name,
      path: projectRoot,
      type: projectInfo.type,
      last_used: new Date().toISOString(),
      created_at: projectInfo.created_at
    });
    
    // Keep only last 20 projects
    config.projects = config.projects
      .sort((a, b) => new Date(b.last_used) - new Date(a.last_used))
      .slice(0, 20);
    
    await fs.writeJson(this.globalConfigFile, config, { spaces: 2 });
  }

  /**
   * Get list of registered projects
   */
  async getProjects() {
    const config = await this.getGlobalConfig();
    return config.projects || [];
  }

  /**
   * Configuration validation and migration
   */
  validateAndMigrateConfig(config) {
    // Basic validation
    if (!config.project || !config.groups) {
      throw new Error('Invalid configuration structure');
    }

    // Migration logic for different versions
    if (!config.version || config.version < '1.0.0') {
      config = this.migrateToV1(config);
    }

    return config;
  }

  migrateToV1(config) {
    // Migration logic for older configurations
    console.log('📦 Migrating configuration to v1.0.0');
    
    config.version = '1.0.0';
    
    // Add missing fields
    if (!config.rules) {
      config.rules = {
        zero_protocol: {
          enabled: true,
          no_auto_fix: true,
          no_casting: true
        }
      };
    }

    return config;
  }

  /**
   * Template system for different project types
   */
  getProjectTemplate(projectType) {
    const templates = {
      nextjs: {
        groups: {
          TYPESCRIPT: {
            name: 'TypeScript & Build System',
            priority: 1,
            files: ['tsconfig.json', 'src/**/*.ts', 'src/**/*.tsx'],
            dependencies: []
          },
          ESLINT: {
            name: 'ESLint & Code Quality',
            priority: 2,
            files: ['eslint.config.*', 'src/**/*'],
            dependencies: ['TYPESCRIPT']
          },
          BUNDLE: {
            name: 'Bundle & Dependencies',
            priority: 2,
            files: ['package.json', 'next.config.*'],
            dependencies: []
          },
          API: {
            name: 'API Routes & Backend',
            priority: 3,
            files: ['src/app/api/**/*', 'lib/**/*'],
            dependencies: ['TYPESCRIPT']
          },
          UI: {
            name: 'UI Components & Pages',
            priority: 4,
            files: ['src/components/**/*', 'src/app/**/*'],
            dependencies: ['TYPESCRIPT', 'ESLINT']
          }
        }
      },

      react: {
        groups: {
          COMPONENTS: {
            name: 'React Components',
            priority: 1,
            files: ['src/components/**/*'],
            dependencies: []
          },
          BUILD: {
            name: 'Build System',
            priority: 2,
            files: ['webpack.config.js', 'package.json'],
            dependencies: ['COMPONENTS']
          },
          TESTS: {
            name: 'Testing',
            priority: 3,
            files: ['src/**/*.test.*'],
            dependencies: ['COMPONENTS']
          }
        }
      }
    };

    return templates[projectType] || templates.nextjs;
  }

  /**
   * Utility functions
   */
  detectTerminal() {
    const termProgram = process.env.TERM_PROGRAM;
    
    if (termProgram) {
      return termProgram.toLowerCase();
    }
    
    if (process.platform === 'darwin') return 'terminal';
    if (process.platform === 'win32') return 'cmd';
    return 'bash';
  }

  mergeDeep(target, source) {
    const isObject = (obj) => obj && typeof obj === 'object';

    if (!isObject(target) || !isObject(source)) {
      return source;
    }

    Object.keys(source).forEach(key => {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
        target[key] = targetValue.concat(sourceValue);
      } else if (isObject(targetValue) && isObject(sourceValue)) {
        target[key] = this.mergeDeep(Object.assign({}, targetValue), sourceValue);
      } else {
        target[key] = sourceValue;
      }
    });

    return target;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  /**
   * Save custom coordination rules
   */
  async saveCustomRules(projectRoot, rulesConfig) {
    const rulesDir = path.join(projectRoot, '.claude-coord');
    const rulesFile = path.join(rulesDir, 'custom-rules.json');
    
    await fs.ensureDir(rulesDir);
    
    const fullRulesConfig = {
      ...rulesConfig,
      project_path: projectRoot,
      updated_at: new Date().toISOString()
    };
    
    await fs.writeJson(rulesFile, fullRulesConfig, { spaces: 2 });
    
    // Also update the main project config
    const projectConfig = await this.loadProjectConfig(projectRoot);
    projectConfig.custom_rules = rulesConfig;
    
    const configPath = path.join(projectRoot, this.projectConfigFile);
    await fs.writeJson(configPath, projectConfig, { spaces: 2 });
    
    return fullRulesConfig;
  }

  /**
   * Load custom coordination rules
   */
  async loadCustomRules(projectRoot) {
    const rulesFile = path.join(projectRoot, '.claude-coord', 'custom-rules.json');
    
    if (await fs.pathExists(rulesFile)) {
      return await fs.readJson(rulesFile);
    }
    
    // Return default rules if no custom rules exist
    return {
      maxWorkers: 6,
      memoryLimitMB: 256,
      autoBackup: true,
      strictDependencies: true,
      heartbeatInterval: 15000
    };
  }

  /**
   * Apply custom rules to coordinator options
   */
  async applyCustomRules(projectRoot, coordinatorOptions = {}) {
    const customRules = await this.loadCustomRules(projectRoot);
    
    return {
      ...coordinatorOptions,
      maxWorkers: customRules.maxWorkers || coordinatorOptions.maxWorkers || 6,
      heartbeatInterval: customRules.heartbeatInterval || coordinatorOptions.heartbeatInterval || 15000,
      staleWorkerTimeout: (customRules.heartbeatInterval || 15000) * 4, // 4x heartbeat
      autoBackup: customRules.autoBackup !== false,
      strictDependencies: customRules.strictDependencies !== false
    };
  }
}

module.exports = ConfigManager;