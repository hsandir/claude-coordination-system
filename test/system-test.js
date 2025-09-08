#!/usr/bin/env node

/**
 * Claude Coordination System - Basic System Tests
 * Ensures core functionality works correctly
 */

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SystemTest {
  constructor() {
    this.testDir = path.join(__dirname, 'temp');
    this.passed = 0;
    this.failed = 0;
  }

  async runAllTests() {
    console.log('🧪 Running Claude Coordination System Tests...');
    console.log('─'.repeat(50));

    try {
      await this.setupTestEnvironment();
      
      await this.testProjectDetection();
      await this.testConfigManager();
      await this.testCoordinatorCore();
      await this.testWorkerCore();
      await this.testCLIInterface();
      
      await this.cleanup();
      
      console.log('─'.repeat(50));
      console.log(`✅ Tests passed: ${this.passed}`);
      console.log(`❌ Tests failed: ${this.failed}`);
      
      if (this.failed > 0) {
        process.exit(1);
      }
      
      console.log('🎉 All tests passed!');
      
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    await fs.remove(this.testDir);
    await fs.ensureDir(this.testDir);
    
    // Create mock project structure
    const mockProject = {
      'package.json': {
        name: 'test-project',
        version: '1.0.0',
        dependencies: { 'next': '^14.0.0' }
      },
      'tsconfig.json': { compilerOptions: { target: 'es5' } },
      'src/app/page.tsx': 'export default function Page() { return <div>Test</div> }'
    };

    for (const [file, content] of Object.entries(mockProject)) {
      const filePath = path.join(this.testDir, file);
      await fs.ensureDir(path.dirname(filePath));
      
      if (typeof content === 'object') {
        await fs.writeJSON(filePath, content, { spaces: 2 });
      } else {
        await fs.writeFile(filePath, content);
      }
    }
  }

  async testProjectDetection() {
    console.log('🔍 Testing project detection...');
    
    try {
      const ProjectDetector = require('../src/project-detector');
      const detector = new ProjectDetector(this.testDir);
      
      const projectType = await detector.detectProjectType();
      this.assert(projectType === 'nextjs', `Expected 'nextjs', got '${projectType}'`);
      
      const complexity = await detector.analyzeComplexity();
      this.assert(complexity.complexity === 'simple', 'Expected simple complexity');
      
      console.log('  ✅ Project detection works correctly');
      this.passed++;
      
    } catch (error) {
      console.log(`  ❌ Project detection failed: ${error.message}`);
      this.failed++;
    }
  }

  async testConfigManager() {
    console.log('⚙️  Testing configuration management...');
    
    try {
      const ConfigManager = require('../src/config-manager');
      const configManager = new ConfigManager();
      
      // Test project config creation
      const config = await configManager.createProjectConfig(this.testDir, {
        projectType: 'nextjs',
        maxWorkers: 4
      });
      
      this.assert(config.project.type === 'nextjs', 'Project type not set correctly');
      this.assert(config.coordinator.max_workers === 4, 'Max workers not set correctly');
      
      // Test config loading
      const loadedConfig = await configManager.loadProjectConfig(this.testDir);
      this.assert(loadedConfig.project.name === 'temp', 'Config loading failed');
      
      console.log('  ✅ Configuration management works correctly');
      this.passed++;
      
    } catch (error) {
      console.log(`  ❌ Configuration management failed: ${error.message}`);
      this.failed++;
    }
  }

  async testCoordinatorCore() {
    console.log('🖥️  Testing coordinator core...');
    
    try {
      const CoordinatorCore = require('../src/coordinator-core');
      const coordinator = new CoordinatorCore(this.testDir, { 
        port: 7779,
        maxWorkers: 2 
      });
      
      // Test initialization
      await coordinator.start();
      this.assert(coordinator.isRunning, 'Coordinator should be running');
      
      // Test worker registration
      const worker = await coordinator.registerWorker('test_worker', 'TYPESCRIPT');
      this.assert(worker.id === 'test_worker', 'Worker registration failed');
      
      // Test file locking
      const lockResult = await coordinator.acquireFileLock('test_worker', 'test.ts');
      this.assert(lockResult.success, 'File locking failed');
      
      // Test system status
      const status = await coordinator.getSystemStatus();
      this.assert(status.healthy, 'System should be healthy');
      this.assert(status.activeWorkers === 1, 'Should have 1 active worker');
      
      await coordinator.stop();
      this.assert(!coordinator.isRunning, 'Coordinator should be stopped');
      
      console.log('  ✅ Coordinator core works correctly');
      this.passed++;
      
    } catch (error) {
      console.log(`  ❌ Coordinator core failed: ${error.message}`);
      this.failed++;
    }
  }

  async testWorkerCore() {
    console.log('🤖 Testing worker core...');
    
    try {
      // Create minimal coordination state
      const coordDir = path.join(this.testDir, '.claude-coord');
      await fs.ensureDir(coordDir);
      
      const initialState = {
        system_info: { initialized_at: new Date().toISOString() },
        active_workers: {},
        file_locks: {},
        dependencies: {
          TEST_GROUP: {
            name: 'Test Group',
            files: ['test.ts'],
            dependencies: []
          }
        },
        task_progress: { total_groups: 1, completed_groups: 0, active_groups: 0 }
      };
      
      await fs.writeJSON(path.join(coordDir, 'system-state.json'), initialState, { spaces: 2 });
      
      const WorkerCore = require('../src/worker-core');
      const worker = new WorkerCore('test_worker', 'TEST_GROUP', this.testDir, {
        dryRun: true,
        verbose: false
      });
      
      // Test worker initialization (don't actually start to avoid long-running process)
      this.assert(worker.workerId === 'test_worker', 'Worker ID not set correctly');
      this.assert(worker.groupId === 'TEST_GROUP', 'Group ID not set correctly');
      this.assert(worker.options.dryRun === true, 'Dry run option not set');
      
      console.log('  ✅ Worker core works correctly');
      this.passed++;
      
    } catch (error) {
      console.log(`  ❌ Worker core failed: ${error.message}`);
      this.failed++;
    }
  }

  async testCLIInterface() {
    console.log('💻 Testing CLI interface...');
    
    try {
      // Test CLI exists
      const fs = require('fs-extra');
      const cliPath = require('path').join(__dirname, '..', 'bin', 'cli.js');
      const cliExists = await fs.pathExists(cliPath);
      
      this.assert(cliExists, 'CLI file should exist');
      
      // Test CLI content
      const cliContent = await fs.readFile(cliPath, 'utf8');
      this.assert(cliContent.includes('Multi-Claude'), 'CLI should mention Multi-Claude');
      this.assert(cliContent.includes('init'), 'CLI should have init command');
      this.assert(cliContent.includes('start'), 'CLI should have start command');
      
      console.log('  ✅ CLI interface works correctly');
      this.passed++;
      
    } catch (error) {
      console.log(`  ❌ CLI interface failed: ${error.message}`);
      this.failed++;
    }
  }

  async cleanup() {
    await fs.remove(this.testDir);
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }
}

// Run tests if this is the main module
if (require.main === module) {
  const systemTest = new SystemTest();
  systemTest.runAllTests();
}

module.exports = SystemTest;