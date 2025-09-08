#!/usr/bin/env node

/**
 * Multi-Claude Coordination System - Memory Management
 * Prevents memory leaks, manages cache, ensures system stability
 */

const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class MemoryManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxMemoryMB: options.maxMemoryMB || 512,        // 512MB per worker
      checkInterval: options.checkInterval || 30000,   // Check every 30s
      warningThreshold: options.warningThreshold || 0.8, // 80% warning
      criticalThreshold: options.criticalThreshold || 0.9, // 90% critical
      maxCacheSize: options.maxCacheSize || 100,      // 100 cached items
      maxLogFiles: options.maxLogFiles || 10,         // Keep 10 log files
      maxStateHistory: options.maxStateHistory || 50,  // 50 state snapshots
      cleanupInterval: options.cleanupInterval || 300000, // 5 min cleanup
      ...options
    };
    
    this.cacheStore = new Map();
    this.memoryStats = {
      peak: 0,
      current: 0,
      warnings: 0,
      cleanups: 0
    };
    
    this.monitoringActive = false;
    this.monitorTimer = null;
    this.cleanupTimer = null;
  }

  /**
   * Start memory monitoring
   */
  startMonitoring() {
    if (this.monitoringActive) return;
    
    console.log(chalk.blue('🧠 Starting memory monitoring...'));
    console.log(chalk.gray(`   Max memory: ${this.options.maxMemoryMB}MB`));
    console.log(chalk.gray(`   Check interval: ${this.options.checkInterval/1000}s`));
    
    this.monitoringActive = true;
    
    // Start memory monitoring
    this.monitorTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.options.checkInterval);
    
    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.performMaintenance();
    }, this.options.cleanupInterval);
    
    // Graceful shutdown handlers
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('uncaughtException', (error) => this.handleCriticalError(error));
    process.on('unhandledRejection', (error) => this.handleCriticalError(error));
  }

  /**
   * Check current memory usage
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const currentMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const maxMB = this.options.maxMemoryMB;
    const usage = currentMB / maxMB;
    
    this.memoryStats.current = currentMB;
    if (currentMB > this.memoryStats.peak) {
      this.memoryStats.peak = currentMB;
    }
    
    // Warning threshold
    if (usage > this.options.warningThreshold) {
      this.memoryStats.warnings++;
      console.log(chalk.yellow(`⚠️  Memory warning: ${currentMB}MB / ${maxMB}MB (${Math.round(usage*100)}%)`));
      this.emit('memoryWarning', { current: currentMB, max: maxMB, usage });
      
      // Trigger cleanup
      this.performEmergencyCleanup();
    }
    
    // Critical threshold
    if (usage > this.options.criticalThreshold) {
      console.log(chalk.red(`🚨 Critical memory usage: ${currentMB}MB / ${maxMB}MB`));
      this.emit('memoryCritical', { current: currentMB, max: maxMB, usage });
      
      // Force aggressive cleanup
      this.performAggressiveCleanup();
    }
    
    // Emit regular stats
    this.emit('memoryStats', {
      heap: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      usage: Math.round(usage * 100)
    });
  }

  /**
   * Cache management with size limits
   */
  setCache(key, value, ttl = 300000) { // 5 min default TTL
    // Check cache size limit
    if (this.cacheStore.size >= this.options.maxCacheSize) {
      this.cleanupExpiredCache();
      
      // If still over limit, remove oldest
      if (this.cacheStore.size >= this.options.maxCacheSize) {
        const oldestKey = this.cacheStore.keys().next().value;
        this.cacheStore.delete(oldestKey);
      }
    }
    
    this.cacheStore.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  getCache(key) {
    const cached = this.cacheStore.get(key);
    if (!cached) return null;
    
    // Check TTL
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cacheStore.delete(key);
      return null;
    }
    
    return cached.value;
  }

  /**
   * Clean expired cache entries
   */
  cleanupExpiredCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, cached] of this.cacheStore.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cacheStore.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(chalk.gray(`🧹 Cleaned ${cleaned} expired cache entries`));
    }
    
    return cleaned;
  }

  /**
   * Emergency cleanup when memory warning
   */
  async performEmergencyCleanup() {
    console.log(chalk.yellow('🚨 Performing emergency cleanup...'));
    
    // Clean expired cache
    this.cleanupExpiredCache();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clean temporary data
    await this.cleanupTempData();
    
    this.memoryStats.cleanups++;
  }

  /**
   * Aggressive cleanup when critical
   */
  async performAggressiveCleanup() {
    console.log(chalk.red('🔥 Performing aggressive cleanup...'));
    
    // Clear all cache
    this.cacheStore.clear();
    
    // Force multiple GC cycles
    if (global.gc) {
      global.gc();
      global.gc();
      global.gc();
    }
    
    // Clean all temporary data
    await this.cleanupTempData(true);
    
    // Warn about critical state
    console.log(chalk.red('⚠️  System in critical memory state - consider restarting workers'));
  }

  /**
   * Regular maintenance cleanup
   */
  async performMaintenance() {
    console.log(chalk.blue('🔧 Performing maintenance cleanup...'));
    
    // Clean expired cache
    const cleaned = this.cleanupExpiredCache();
    
    // Clean old log files
    await this.cleanupLogFiles();
    
    // Clean old state files
    await this.cleanupStateHistory();
    
    // Force GC
    if (global.gc) {
      global.gc();
    }
    
    console.log(chalk.green(`✅ Maintenance completed (${cleaned} items cleaned)`));
  }

  /**
   * Clean temporary data
   */
  async cleanupTempData(aggressive = false) {
    try {
      const tempDirs = ['.claude-coord/temp', '.claude-coord/cache', 'node_modules/.cache'];
      
      for (const dir of tempDirs) {
        if (await fs.pathExists(dir)) {
          if (aggressive) {
            await fs.remove(dir);
            console.log(chalk.gray(`🗑️  Removed temp directory: ${dir}`));
          } else {
            // Just clean old files
            const files = await fs.readdir(dir).catch(() => []);
            for (const file of files) {
              const filePath = path.join(dir, file);
              const stats = await fs.stat(filePath).catch(() => null);
              
              if (stats && Date.now() - stats.mtime.getTime() > 3600000) { // 1 hour old
                await fs.remove(filePath);
              }
            }
          }
        }
      }
    } catch (error) {
      console.log(chalk.gray(`Warning: Could not clean temp data: ${error.message}`));
    }
  }

  /**
   * Clean old log files
   */
  async cleanupLogFiles() {
    try {
      const logDir = '.claude-coord/logs';
      if (!(await fs.pathExists(logDir))) return;
      
      const files = await fs.readdir(logDir);
      const logFiles = files.filter(f => f.endsWith('.log')).sort();
      
      if (logFiles.length > this.options.maxLogFiles) {
        const toDelete = logFiles.slice(0, logFiles.length - this.options.maxLogFiles);
        
        for (const file of toDelete) {
          await fs.remove(path.join(logDir, file));
        }
        
        console.log(chalk.gray(`🗑️  Cleaned ${toDelete.length} old log files`));
      }
    } catch (error) {
      console.log(chalk.gray(`Warning: Could not clean log files: ${error.message}`));
    }
  }

  /**
   * Clean old state history
   */
  async cleanupStateHistory() {
    try {
      const stateDir = '.claude-coord/history';
      if (!(await fs.pathExists(stateDir))) return;
      
      const files = await fs.readdir(stateDir);
      const stateFiles = files.filter(f => f.includes('state-')).sort();
      
      if (stateFiles.length > this.options.maxStateHistory) {
        const toDelete = stateFiles.slice(0, stateFiles.length - this.options.maxStateHistory);
        
        for (const file of toDelete) {
          await fs.remove(path.join(stateDir, file));
        }
        
        console.log(chalk.gray(`🗑️  Cleaned ${toDelete.length} old state files`));
      }
    } catch (error) {
      console.log(chalk.gray(`Warning: Could not clean state files: ${error.message}`));
    }
  }

  /**
   * Handle critical errors
   */
  handleCriticalError(error) {
    console.error(chalk.red('💥 Critical error detected:'), error);
    
    // Perform emergency cleanup
    this.performAggressiveCleanup().then(() => {
      console.log(chalk.yellow('🚨 Emergency cleanup completed'));
    }).catch(cleanupError => {
      console.error(chalk.red('Failed emergency cleanup:'), cleanupError);
    });
    
    this.emit('criticalError', error);
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    console.log(chalk.blue('🛑 Graceful memory manager shutdown...'));
    
    this.monitoringActive = false;
    
    // Clear timers
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    // Final cleanup
    await this.performMaintenance();
    
    // Clear cache
    this.cacheStore.clear();
    
    console.log(chalk.green('✅ Memory manager shutdown complete'));
    this.emit('shutdown');
  }

  /**
   * Get memory statistics
   */
  getStats() {
    const memUsage = process.memoryUsage();
    
    return {
      current: Math.round(memUsage.heapUsed / 1024 / 1024),
      peak: this.memoryStats.peak,
      limit: this.options.maxMemoryMB,
      usage: Math.round((memUsage.heapUsed / 1024 / 1024) / this.options.maxMemoryMB * 100),
      heap: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024)
      },
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      cache: {
        size: this.cacheStore.size,
        limit: this.options.maxCacheSize
      },
      warnings: this.memoryStats.warnings,
      cleanups: this.memoryStats.cleanups
    };
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.gracefulShutdown();
  }
}

module.exports = MemoryManager;