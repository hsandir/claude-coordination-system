/**
 * Web Dashboard for Multi-Claude Coordination System
 * Provides HTTP interface for monitoring and management
 */

const http = require('http');
const path = require('path');
const chalk = require('chalk');
const { logCoordinator } = require('./development-logger');

class WebDashboard {
  constructor(coordinatorCore, port = 7777) {
    this.coordinatorCore = coordinatorCore;
    this.port = port;
    this.server = null;
  }

  /**
   * Start the web dashboard server
   */
  async start() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(chalk.green(`🌐 Web dashboard started on http://localhost:${this.port}`));
          logCoordinator('Web Dashboard Started', {
            description: 'HTTP dashboard server started successfully',
            result: 'SUCCESS',
            notes: `Listening on port ${this.port}`
          });
          resolve();
        }
      });
    });
  }

  /**
   * Stop the web dashboard server
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log(chalk.yellow('🌐 Web dashboard stopped'));
          resolve();
        });
      });
    }
  }

  /**
   * Handle incoming HTTP requests
   */
  async handleRequest(req, res) {
    const url = req.url;
    const method = req.method;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
      if (method === 'GET') {
        if (url === '/' || url === '/dashboard') {
          await this.serveDashboard(res);
        } else if (url === '/api/status') {
          await this.serveStatus(res);
        } else if (url === '/api/workers') {
          await this.serveWorkers(res);
        } else if (url === '/api/health') {
          await this.serveHealth(res);
        } else {
          this.serve404(res);
        }
      } else if (method === 'POST') {
        if (url.startsWith('/api/workers/')) {
          await this.handleWorkerAction(req, res);
        } else {
          this.serve404(res);
        }
      } else {
        this.serve404(res);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      this.serveError(res, error);
    }
  }

  /**
   * Serve main dashboard HTML
   */
  async serveDashboard(res) {
    const status = await this.coordinatorCore.getSystemStatus();
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Claude Coordination Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1a1a; color: #e0e0e0; line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #4a9eff; font-size: 2.5rem; margin-bottom: 10px; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .status-card { 
            background: #2a2a2a; border-radius: 10px; padding: 20px;
            border-left: 4px solid #4a9eff; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .status-card h3 { color: #4a9eff; margin-bottom: 10px; }
        .status-value { font-size: 2rem; font-weight: bold; color: #00ff88; }
        .workers-section { margin-top: 40px; }
        .worker-list { display: grid; gap: 15px; }
        .worker-item { 
            background: #2a2a2a; border-radius: 8px; padding: 15px;
            display: flex; justify-content: between; align-items: center;
        }
        .worker-status { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
        .status-working { background: #00ff88; color: #000; }
        .status-inactive { background: #ffa500; color: #000; }
        .status-stale { background: #ff4444; color: #fff; }
        .status-standby { background: #888; color: #fff; }
        .refresh-btn { 
            background: #4a9eff; color: white; border: none; padding: 10px 20px;
            border-radius: 5px; cursor: pointer; font-size: 1rem;
        }
        .refresh-btn:hover { background: #357abd; }
        .commands-panel {
            background: #2a2a2a; border-radius: 10px; padding: 20px; margin-top: 20px;
        }
        .command-btn {
            background: #333; color: #e0e0e0; border: none; padding: 8px 16px;
            border-radius: 4px; cursor: pointer; margin: 5px; font-size: 0.9rem;
        }
        .command-btn:hover { background: #555; }
        .timestamp { color: #888; font-size: 0.8rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Multi-Claude Coordination</h1>
            <p>System Dashboard & Monitor</p>
            <button class="refresh-btn" onclick="window.location.reload()">Refresh</button>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <h3>Active Workers</h3>
                <div class="status-value">${status.activeWorkers}</div>
            </div>
            <div class="status-card">
                <h3>Tasks Progress</h3>
                <div class="status-value">${status.completedTasks}/${status.totalTasks}</div>
            </div>
            <div class="status-card">
                <h3>File Locks</h3>
                <div class="status-value">${status.fileLocks}</div>
            </div>
            <div class="status-card">
                <h3>System Health</h3>
                <div class="status-value" style="color: ${status.healthy ? '#00ff88' : '#ff4444'}">
                    ${status.healthy ? 'Healthy' : 'Issues'}
                </div>
            </div>
        </div>

        <div class="workers-section">
            <h2>Active Workers</h2>
            <div class="worker-list">
                ${status.workers.map(worker => `
                    <div class="worker-item">
                        <div>
                            <strong>${worker.id || 'Unknown'}</strong> 
                            <span class="worker-status status-${worker.status}">
                                ${worker.status?.toUpperCase() || 'UNKNOWN'}
                            </span>
                            <div style="margin-top: 5px;">
                                Group: <strong>${worker.group}</strong>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div class="timestamp">Last update: ${new Date().toLocaleTimeString()}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="commands-panel">
            <h3>Quick Commands</h3>
            <p style="margin-bottom: 15px; color: #bbb;">Use these commands in your terminal:</p>
            <div>
                <code style="background: #1a1a1a; padding: 2px 6px; border-radius: 3px; margin-right: 10px;">claude-coord status</code>
                <button class="command-btn" onclick="copyToClipboard('claude-coord status')">Copy</button>
            </div>
            <div style="margin-top: 10px;">
                <code style="background: #1a1a1a; padding: 2px 6px; border-radius: 3px; margin-right: 10px;">claude-worker --id=worker_1 --standby</code>
                <button class="command-btn" onclick="copyToClipboard('claude-worker --id=worker_1 --standby')">Copy</button>
            </div>
            <div style="margin-top: 10px;">
                <code style="background: #1a1a1a; padding: 2px 6px; border-radius: 3px; margin-right: 10px;">claude-coord reassign-worker --worker=worker_1 --group=TYPESCRIPT</code>
                <button class="command-btn" onclick="copyToClipboard('claude-coord reassign-worker --worker=worker_1 --group=TYPESCRIPT')">Copy</button>
            </div>
        </div>
    </div>

    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Command copied to clipboard!');
            });
        }
        
        // Auto-refresh every 30 seconds
        setTimeout(() => window.location.reload(), 30000);
    </script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve system status as JSON
   */
  async serveStatus(res) {
    const status = await this.coordinatorCore.getSystemStatus();
    this.serveJSON(res, status);
  }

  /**
   * Serve workers information as JSON
   */
  async serveWorkers(res) {
    const status = await this.coordinatorCore.getSystemStatus();
    this.serveJSON(res, { workers: status.workers });
  }

  /**
   * Serve health check
   */
  async serveHealth(res) {
    const status = await this.coordinatorCore.getSystemStatus();
    this.serveJSON(res, { 
      healthy: status.healthy,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle worker management actions
   */
  async handleWorkerAction(req, res) {
    // Parse worker ID from URL
    const workerId = req.url.split('/')[3];
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const action = data.action;

        let result;
        switch (action) {
          case 'remove':
            result = await this.coordinatorCore.removeWorker(workerId);
            break;
          case 'reassign':
            result = await this.coordinatorCore.reassignWorker(workerId, data.group);
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        this.serveJSON(res, { success: true, result });
      } catch (error) {
        this.serveError(res, error);
      }
    });
  }

  /**
   * Serve JSON response
   */
  serveJSON(res, data) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Serve 404 error
   */
  serve404(res) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - Not Found</h1><p>The requested resource was not found.</p>');
  }

  /**
   * Serve error response
   */
  serveError(res, error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: true, 
      message: error.message,
      timestamp: new Date().toISOString()
    }, null, 2));
  }
}

module.exports = WebDashboard;