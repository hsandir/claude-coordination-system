/**
 * Development Logger
 * Automatically logs all system activities for debugging and development
 */

const fs = require('fs-extra');
const path = require('path');

class DevelopmentLogger {
  constructor() {
    this.logFile = path.join(__dirname, '..', 'DEVELOPMENT.log');
    this.sessionId = this.generateSessionId();
    this.maxLogSize = 5 * 1024 * 1024; // 5MB
    this.maxLogLines = 10000; // Keep last 10k lines
  }

  generateSessionId() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
  }

  async rotateLogIfNeeded() {
    try {
      if (!(await fs.pathExists(this.logFile))) {
        return;
      }

      const stats = await fs.stat(this.logFile);
      if (stats.size > this.maxLogSize) {
        const content = await fs.readFile(this.logFile, 'utf8');
        const lines = content.split('\n');
        
        if (lines.length > this.maxLogLines) {
          // Keep the header and last N lines
          const header = lines.slice(0, 10); // Keep first 10 lines (header)
          const recentLines = lines.slice(-this.maxLogLines);
          
          const rotatedContent = [
            ...header,
            '',
            `## ${new Date().toISOString()} [SYSTEM] LOG ROTATION`,
            '',
            '### Action: Automatic Log Rotation',
            `**Description**: Log file exceeded ${this.maxLogSize / (1024*1024)}MB, rotated to keep last ${this.maxLogLines} lines`,
            `**Result**: SUCCESS`,
            `**Notes**: Original size: ${(stats.size / (1024*1024)).toFixed(2)}MB, Lines kept: ${recentLines.length}`,
            '---',
            '',
            ...recentLines
          ].join('\n');
          
          await fs.writeFile(this.logFile, rotatedContent, 'utf8');
        }
      }
    } catch (error) {
      console.warn('Log rotation failed:', error.message);
    }
  }

  async log(category, action, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = `
## ${timestamp} [${this.sessionId}] ${category.toUpperCase()}

### Action: ${action}
${details.description ? `**Description**: ${details.description}\n` : ''}${details.command ? `**Command**: \`${details.command}\`\n` : ''}${details.files ? `**Files Modified**: ${details.files.join(', ')}\n` : ''}${details.error ? `**Error**: ${details.error}\n` : ''}${details.solution ? `**Solution**: ${details.solution}\n` : ''}${details.result ? `**Result**: ${details.result}\n` : ''}${details.memory ? `**Memory Usage**: ${details.memory}\n` : ''}${details.performance ? `**Performance**: ${details.performance}\n` : ''}${details.notes ? `**Notes**: ${details.notes}\n` : ''}
---
`;

    try {
      // Check if log rotation is needed before writing
      await this.rotateLogIfNeeded();
      
      await fs.appendFile(this.logFile, logEntry, 'utf8');
    } catch (error) {
      console.warn('Development logger failed:', error.message);
    }
  }

  async logCommand(command, result, error = null) {
    await this.log('command', `Executed: ${command}`, {
      result: error ? 'FAILED' : 'SUCCESS',
      error: error?.message,
      details: result
    });
  }

  async logError(context, error, solution = null) {
    await this.log('error', `Error in ${context}`, {
      error: error.message,
      solution,
      notes: error.stack?.split('\n').slice(0, 3).join(' | ')
    });
  }

  async logPerformance(operation, duration, memoryUsage = null) {
    await this.log('performance', operation, {
      performance: `${duration}ms`,
      memory: memoryUsage ? `${memoryUsage}MB` : null
    });
  }

  async logWorkerActivity(workerId, action, details = {}) {
    await this.log('worker', `${workerId}: ${action}`, details);
  }

  async logCoordinatorActivity(action, details = {}) {
    await this.log('coordinator', action, details);
  }

  async logSystemHealth(status) {
    await this.log('health', 'System Health Check', {
      result: status.healthy ? 'HEALTHY' : 'UNHEALTHY',
      memory: `${status.activeWorkers} workers, ${status.fileLocks} locks`,
      performance: `${status.completedTasks}/${status.totalTasks} tasks completed`
    });
  }

  async logUserAction(action, command, outcome) {
    await this.log('user', action, {
      command,
      result: outcome,
      notes: 'User-initiated action'
    });
  }

  async logDevelopmentNote(note, category = 'dev') {
    await this.log('development', 'Development Note', {
      description: note,
      notes: `Category: ${category}`
    });
  }

  async startSession(context = 'Unknown') {
    await this.log('session', 'Session Started', {
      description: `Development session started in context: ${context}`,
      notes: `Session ID: ${this.sessionId}`
    });
  }

  async endSession(summary = null) {
    await this.log('session', 'Session Ended', {
      description: summary || 'Development session ended',
      notes: `Session ID: ${this.sessionId}`
    });
  }
}

// Global instance
let logger = null;

function getLogger() {
  if (!logger) {
    logger = new DevelopmentLogger();
  }
  return logger;
}

module.exports = {
  DevelopmentLogger,
  getLogger,
  
  // Convenience functions
  log: (category, action, details) => getLogger().log(category, action, details),
  logCommand: (command, result, error) => getLogger().logCommand(command, result, error),
  logError: (context, error, solution) => getLogger().logError(context, error, solution),
  logPerformance: (operation, duration, memory) => getLogger().logPerformance(operation, duration, memory),
  logWorker: (workerId, action, details) => getLogger().logWorkerActivity(workerId, action, details),
  logCoordinator: (action, details) => getLogger().logCoordinatorActivity(action, details),
  logHealth: (status) => getLogger().logSystemHealth(status),
  logUser: (action, command, outcome) => getLogger().logUserAction(action, command, outcome),
  logDev: (note, category) => getLogger().logDevelopmentNote(note, category),
  startSession: (context) => getLogger().startSession(context),
  endSession: (summary) => getLogger().endSession(summary)
};