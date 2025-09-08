/**
 * Multi-Claude Coordinator Core Engine
 * Central coordination system for managing multiple Claude workers
 */

const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');
const chalk = require('chalk');

class CoordinatorCore extends EventEmitter {
  constructor(projectRoot, options = {}) {
    super();
    
    this.projectRoot = projectRoot;
    this.coordinationDir = path.join(projectRoot, '.claude-coord');
    this.stateFile = path.join(this.coordinationDir, 'system-state.json');
    this.messagesFile = path.join(this.coordinationDir, 'messages.json');
    
    this.options = {
      port: 7777,
      mode: 'prod',
      maxWorkers: 6,
      heartbeatInterval: 15000,
      staleWorkerTimeout: 60000,
      ...options
    };

    this.isRunning = false;
    this.workers = new Map();
    this.fileLocks = new Map();
    this.messageQueue = [];
    
    console.log(`🤖 Coordinator initialized for: ${path.basename(projectRoot)}`);
  }

  /**
   * Initialize coordination system state
   */
  async initializeSystem() {
    await fs.ensureDir(this.coordinationDir);
    
    const initialState = {
      system_info: {
        initialized_at: new Date().toISOString(),
        version: '1.0.0',
        project_root: this.projectRoot,
        max_workers: this.options.maxWorkers,
        coordination_mode: 'file_based',
        coordinator_pid: process.pid
      },
      active_workers: {},
      file_locks: {},
      dependencies: await this.loadDependencies(),
      task_progress: {
        total_groups: 0,
        completed_groups: 0,
        active_groups: 0
      },
      messages: []
    };

    await this.saveSystemState(initialState);
    console.log(`✅ System state initialized at ${this.stateFile}`);
    
    return initialState;
  }

  /**
   * Load project dependencies configuration
   */
  async loadDependencies() {
    const configFile = path.join(this.projectRoot, 'claude-coord.json');
    
    try {
      if (await fs.pathExists(configFile)) {
        const config = await fs.readJson(configFile);
        return config.groups || {};
      }
    } catch (error) {
      console.warn(`⚠️  Could not load project config: ${error.message}`);
    }

    // Return default dependencies based on project type
    return this.getDefaultDependencies();
  }

  /**
   * Get default dependency structure for common project types
   */
  getDefaultDependencies() {
    // Basic Next.js project structure
    return {
      GRUP1_TYPESCRIPT: {
        name: 'TypeScript & Build System',
        priority: 1,
        blocks: ['GRUP2_ESLINT', 'GRUP6_UI'],
        blocked_by: [],
        files: [
          'tsconfig.json',
          'src/**/*.ts',
          'src/**/*.tsx'
        ]
      },
      GRUP2_ESLINT: {
        name: 'ESLint & Code Quality',
        priority: 2,
        blocks: ['GRUP6_UI'],
        blocked_by: ['GRUP1_TYPESCRIPT'],
        files: [
          'eslint.config.*',
          'src/**/*'
        ]
      },
      GRUP3_BUNDLE: {
        name: 'Bundle & Dependencies',
        priority: 2,
        blocks: [],
        blocked_by: [],
        files: [
          'package.json',
          'package-lock.json',
          'next.config.*'
        ]
      }
    };
  }

  /**
   * Start coordination server
   */
  async start() {
    if (this.isRunning) {
      throw new Error('Coordinator already running');
    }

    console.log(chalk.blue('🚀 Starting Multi-Claude Coordination System...'));
    
    // Initialize system state
    await this.initializeSystem();
    
    // Start background processes
    this.isRunning = true;
    this.startHeartbeatMonitor();
    this.startMessageProcessor();
    this.startFileWatcher();
    
    console.log(chalk.green('✅ Coordinator started successfully'));
    console.log(chalk.blue(`📊 Dashboard: http://localhost:${this.options.port}`));
    
    this.emit('started');
    return true;
  }

  /**
   * Stop coordination system
   */
  async stop() {
    if (!this.isRunning) return;

    console.log(chalk.yellow('🛑 Stopping coordination system...'));
    
    this.isRunning = false;
    
    // Clear all timers
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.messageTimer) clearInterval(this.messageTimer);
    if (this.fileWatcher) this.fileWatcher.close();
    
    // Stop all workers
    await this.stopAllWorkers();
    
    console.log(chalk.green('✅ Coordinator stopped'));
    this.emit('stopped');
  }

  /**
   * Register a new worker
   */
  async registerWorker(workerId, groupId, metadata = {}) {
    const state = await this.loadSystemState();
    
    if (state.active_workers[workerId]) {
      throw new Error(`Worker ${workerId} already registered`);
    }

    const workerInfo = {
      id: workerId,
      group: groupId,
      status: 'initializing',
      started_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      current_files: [],
      metadata,
      progress: {
        total_tasks: 0,
        completed_tasks: 0,
        current_task: null
      }
    };

    state.active_workers[workerId] = workerInfo;
    state.task_progress.active_groups++;
    
    await this.saveSystemState(state);
    
    console.log(chalk.green(`👥 Worker registered: ${workerId} (${groupId})`));
    this.emit('worker:registered', workerInfo);
    
    return workerInfo;
  }

  /**
   * Update worker status
   */
  async updateWorkerStatus(workerId, updates) {
    const state = await this.loadSystemState();
    
    if (!state.active_workers[workerId]) {
      throw new Error(`Worker ${workerId} not found`);
    }

    // Update worker info
    Object.assign(state.active_workers[workerId], {
      ...updates,
      last_heartbeat: new Date().toISOString()
    });

    await this.saveSystemState(state);
    this.emit('worker:updated', state.active_workers[workerId]);
  }

  /**
   * File locking system
   */
  async acquireFileLock(workerId, filePath) {
    const state = await this.loadSystemState();
    
    // Check if file is already locked
    if (state.file_locks[filePath] && state.file_locks[filePath] !== workerId) {
      return { success: false, lockedBy: state.file_locks[filePath] };
    }

    // Acquire lock
    state.file_locks[filePath] = workerId;
    await this.saveSystemState(state);
    
    console.log(`🔒 File locked: ${filePath} → ${workerId}`);
    this.emit('file:locked', { filePath, workerId });
    
    return { success: true };
  }

  /**
   * Release file lock
   */
  async releaseFileLock(workerId, filePath) {
    const state = await this.loadSystemState();
    
    if (state.file_locks[filePath] === workerId) {
      delete state.file_locks[filePath];
      await this.saveSystemState(state);
      
      console.log(`🔓 File unlocked: ${filePath} ← ${workerId}`);
      this.emit('file:unlocked', { filePath, workerId });
    }
  }

  /**
   * Check dependencies for a worker group
   */
  async checkDependencies(groupId) {
    const state = await this.loadSystemState();
    const groupConfig = state.dependencies[groupId];
    
    if (!groupConfig) return { canProceed: true, blockers: [] };
    
    const blockers = [];
    
    // Check blocked_by dependencies
    for (const blockingGroup of groupConfig.blocked_by || []) {
      const blockingWorker = Object.values(state.active_workers).find(
        w => w.group === blockingGroup
      );
      
      if (!blockingWorker || blockingWorker.status !== 'completed') {
        blockers.push(blockingGroup);
      }
    }
    
    return {
      canProceed: blockers.length === 0,
      blockers
    };
  }

  /**
   * Get system status
   */
  async getSystemStatus() {
    try {
      const state = await this.loadSystemState();
      
      return {
        healthy: true,
        activeWorkers: Object.keys(state.active_workers).length,
        completedTasks: state.task_progress.completed_groups,
        totalTasks: state.task_progress.total_groups,
        fileLocks: Object.keys(state.file_locks).length,
        workers: Object.values(state.active_workers),
        uptime: Date.now() - new Date(state.system_info.initialized_at).getTime()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * System state management
   */
  async loadSystemState() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('⚠️  Could not load system state, initializing...');
      return await this.initializeSystem();
    }
  }

  async saveSystemState(state) {
    try {
      await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('❌ Failed to save system state:', error.message);
      throw error;
    }
  }

  /**
   * Background monitoring processes
   */
  startHeartbeatMonitor() {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.checkWorkerHealth();
      } catch (error) {
        console.error('❌ Heartbeat check failed:', error.message);
      }
    }, this.options.heartbeatInterval);
    
    console.log('💓 Heartbeat monitor started');
  }

  async checkWorkerHealth() {
    const state = await this.loadSystemState();
    const now = Date.now();
    const staleWorkers = [];
    
    for (const [workerId, worker] of Object.entries(state.active_workers)) {
      const lastHeartbeat = new Date(worker.last_heartbeat).getTime();
      
      if (now - lastHeartbeat > this.options.staleWorkerTimeout) {
        staleWorkers.push(workerId);
      }
    }
    
    // Mark stale workers as failed
    for (const workerId of staleWorkers) {
      await this.updateWorkerStatus(workerId, { status: 'stale' });
      console.log(chalk.yellow(`⚠️  Worker ${workerId} marked as stale`));
    }
  }

  startMessageProcessor() {
    this.messageTimer = setInterval(async () => {
      try {
        await this.processMessageQueue();
      } catch (error) {
        console.error('❌ Message processing failed:', error.message);
      }
    }, 1000);
  }

  async processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    // Process messages and emit events
    for (const message of messages) {
      this.emit('message', message);
    }
  }

  startFileWatcher() {
    // File watching implementation would go here
    // For now, we'll use polling
    console.log('👁️  File watcher initialized');
  }

  async stopAllWorkers() {
    const state = await this.loadSystemState();
    
    // Send stop signals to all active workers
    for (const workerId of Object.keys(state.active_workers)) {
      await this.updateWorkerStatus(workerId, { status: 'stopping' });
    }
    
    // Clear all file locks
    state.file_locks = {};
    state.active_workers = {};
    await this.saveSystemState(state);
  }
}

module.exports = CoordinatorCore;