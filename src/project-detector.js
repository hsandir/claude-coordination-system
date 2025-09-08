/**
 * Project Type Detection System
 * Automatically detects project type and suggests optimal coordination
 */

const fs = require('fs-extra');
const path = require('path');

class ProjectDetector {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }

  /**
   * Detect project type based on files and dependencies
   */
  async detectProjectType() {
    const indicators = {
      nextjs: [
        'next.config.js',
        'next.config.mjs', 
        'next.config.ts'
      ],
      react: [
        'src/App.jsx',
        'src/App.tsx',
        'public/index.html'
      ],
      vue: [
        'vue.config.js',
        'src/main.js',
        'src/App.vue'
      ],
      node: [
        'server.js',
        'app.js',
        'index.js'
      ],
      typescript: [
        'tsconfig.json'
      ],
      npm: [
        'package.json'
      ]
    };

    const detectedTypes = [];

    // Check file-based indicators
    for (const [type, files] of Object.entries(indicators)) {
      for (const file of files) {
        if (await fs.pathExists(path.join(this.projectRoot, file))) {
          detectedTypes.push(type);
          break;
        }
      }
    }

    // Check package.json dependencies
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageJson = await fs.readJson(packageJsonPath);
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        if (allDeps.next) detectedTypes.push('nextjs');
        if (allDeps.react && !allDeps.next) detectedTypes.push('react');
        if (allDeps.vue) detectedTypes.push('vue');
        if (allDeps.express) detectedTypes.push('node');
        if (allDeps.typescript || allDeps['@types/node']) detectedTypes.push('typescript');
      } catch (error) {
        console.warn('Warning: Could not read package.json');
      }
    }

    // Prioritize detection results
    if (detectedTypes.includes('nextjs')) return 'nextjs';
    if (detectedTypes.includes('react')) return 'react';
    if (detectedTypes.includes('vue')) return 'vue';
    if (detectedTypes.includes('node')) return 'node';
    if (detectedTypes.includes('typescript')) return 'typescript';
    
    return 'generic';
  }

  /**
   * Get suggested work groups for detected project type
   */
  getSuggestedGroups(projectType) {
    const groupTemplates = {
      nextjs: {
        TYPESCRIPT: {
          name: 'TypeScript & Build System',
          priority: 1,
          files: [
            'tsconfig.json',
            'next.config.*',
            'src/**/*.ts',
            'src/**/*.tsx'
          ],
          dependencies: [],
          tasks: [
            'Fix TypeScript syntax errors',
            'Update interface definitions',
            'Validate build process'
          ]
        },
        ESLINT: {
          name: 'ESLint & Code Quality',
          priority: 2,
          files: [
            'eslint.config.*',
            '.eslintrc.*',
            'src/**/*'
          ],
          dependencies: ['TYPESCRIPT'],
          tasks: [
            'Fix ESLint warnings',
            'Update code style',
            'Ensure quality standards'
          ]
        },
        BUNDLE: {
          name: 'Bundle & Dependencies',
          priority: 2,
          files: [
            'package.json',
            'package-lock.json',
            'next.config.*'
          ],
          dependencies: [],
          tasks: [
            'Analyze bundle size',
            'Clean unused dependencies',
            'Optimize imports'
          ]
        },
        UI: {
          name: 'UI Components & Pages',
          priority: 3,
          files: [
            'src/components/**/*',
            'src/app/**/*',
            'src/pages/**/*'
          ],
          dependencies: ['TYPESCRIPT', 'ESLINT'],
          tasks: [
            'Update components',
            'Fix styling issues',
            'Improve responsiveness'
          ]
        },
        API: {
          name: 'API Routes & Backend',
          priority: 3,
          files: [
            'src/app/api/**/*',
            'src/pages/api/**/*',
            'lib/**/*'
          ],
          dependencies: ['TYPESCRIPT'],
          tasks: [
            'Fix API route errors',
            'Update middleware',
            'Improve error handling'
          ]
        },
        DATABASE: {
          name: 'Database & Performance',
          priority: 2,
          files: [
            'prisma/**/*',
            'lib/db*',
            'lib/cache/**/*'
          ],
          dependencies: [],
          tasks: [
            'Optimize database queries',
            'Update schema',
            'Improve caching'
          ]
        }
      },

      react: {
        COMPONENTS: {
          name: 'React Components',
          priority: 1,
          files: ['src/components/**/*'],
          dependencies: [],
          tasks: ['Fix component errors', 'Update props', 'Improve performance']
        },
        BUILD: {
          name: 'Build & Bundle',
          priority: 2,
          files: ['webpack.config.js', 'package.json'],
          dependencies: ['COMPONENTS'],
          tasks: ['Optimize build', 'Fix dependencies']
        },
        TESTS: {
          name: 'Testing',
          priority: 3,
          files: ['src/**/*.test.*', '__tests__/**/*'],
          dependencies: ['COMPONENTS'],
          tasks: ['Fix failing tests', 'Add coverage']
        }
      },

      vue: {
        COMPONENTS: {
          name: 'Vue Components',
          priority: 1,
          files: ['src/components/**/*.vue'],
          dependencies: [],
          tasks: ['Fix component errors', 'Update templates']
        },
        ROUTER: {
          name: 'Router & Navigation',
          priority: 2,
          files: ['src/router/**/*'],
          dependencies: ['COMPONENTS'],
          tasks: ['Fix routing issues', 'Update navigation']
        },
        STORE: {
          name: 'Vuex/Pinia Store',
          priority: 2,
          files: ['src/store/**/*'],
          dependencies: [],
          tasks: ['Fix store logic', 'Update state management']
        }
      },

      node: {
        SERVER: {
          name: 'Server & Routes',
          priority: 1,
          files: ['server.js', 'app.js', 'routes/**/*'],
          dependencies: [],
          tasks: ['Fix server errors', 'Update routes']
        },
        DATABASE: {
          name: 'Database Integration',
          priority: 2,
          files: ['models/**/*', 'db/**/*'],
          dependencies: [],
          tasks: ['Fix database queries', 'Update models']
        },
        API: {
          name: 'API Endpoints',
          priority: 2,
          files: ['api/**/*', 'controllers/**/*'],
          dependencies: ['SERVER'],
          tasks: ['Fix API errors', 'Update endpoints']
        }
      },

      generic: {
        MAIN: {
          name: 'Main Tasks',
          priority: 1,
          files: ['**/*'],
          dependencies: [],
          tasks: ['Fix errors', 'Update code', 'Improve quality']
        }
      }
    };

    return groupTemplates[projectType] || groupTemplates.generic;
  }

  /**
   * Analyze project complexity and suggest coordination strategy
   */
  async analyzeComplexity() {
    const stats = {
      totalFiles: 0,
      codeFiles: 0,
      testFiles: 0,
      configFiles: 0,
      hasTypeScript: false,
      hasTests: false,
      hasBuildSystem: false
    };

    // Count files by type
    const extensions = {
      code: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.php', '.rb'],
      test: ['.test.js', '.test.ts', '.spec.js', '.spec.ts'],
      config: ['.json', '.yml', '.yaml', '.config.js', '.config.ts']
    };

    try {
      const allFiles = await this.getAllFiles(this.projectRoot);
      
      for (const file of allFiles) {
        const ext = path.extname(file);
        stats.totalFiles++;

        if (extensions.code.includes(ext)) stats.codeFiles++;
        if (extensions.test.some(testExt => file.includes(testExt))) stats.testFiles++;
        if (extensions.config.includes(ext)) stats.configFiles++;
        
        if (['.ts', '.tsx'].includes(ext)) stats.hasTypeScript = true;
      }

      stats.hasTests = stats.testFiles > 0;
      stats.hasBuildSystem = await fs.pathExists(path.join(this.projectRoot, 'package.json'));

    } catch (error) {
      console.warn('Warning: Could not analyze project complexity');
    }

    // Suggest coordination strategy based on complexity
    let suggestedWorkers = 2;
    if (stats.codeFiles > 100) suggestedWorkers = 4;
    if (stats.codeFiles > 300) suggestedWorkers = 6;
    if (stats.hasTypeScript && stats.codeFiles > 50) suggestedWorkers += 1;
    if (stats.hasTests && stats.testFiles > 20) suggestedWorkers += 1;

    return {
      stats,
      suggestedWorkers: Math.min(suggestedWorkers, 8), // Max 8 workers
      complexity: stats.codeFiles < 50 ? 'simple' : 
                  stats.codeFiles < 200 ? 'medium' : 'complex'
    };
  }

  /**
   * Recursively get all files in project (excluding node_modules, .git, etc.)
   */
  async getAllFiles(dir, exclude = ['node_modules', '.git', 'dist', 'build', '.next']) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        if (exclude.includes(item)) continue;
        
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...await this.getAllFiles(fullPath, exclude));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }

    return files;
  }
}

module.exports = ProjectDetector;