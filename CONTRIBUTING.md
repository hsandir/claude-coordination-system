# Contributing to Claude Coordination System

We love your input! We want to make contributing to the Claude Coordination System as easy and transparent as possible.

## 🤝 Development Process

We use GitHub to sync code, track issues and feature requests, as well as accept pull requests.

### Pull Requests Process

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a branch for your feature/fix
4. **Make** your changes
5. **Test** your changes thoroughly
6. **Commit** with clear, descriptive messages
7. **Push** to your fork and **submit** a pull request

### Development Setup

```bash
git clone https://github.com/[your-username]/claude-coordination-system.git
cd claude-coordination-system
npm install
npm test
```

## 🐛 Bug Reports

We use GitHub issues to track public bugs. Report a bug by opening a new issue.

### Great Bug Reports Include:

- **Summary**: Quick summary and/or background
- **Steps to reproduce**: Specific steps to reproduce the bug
- **Expected behavior**: What you expected would happen
- **Actual behavior**: What actually happens
- **Environment**: Your OS, Node.js version, npm version
- **Additional context**: Screenshots, logs, etc.

**Example Bug Report:**

```markdown
## Summary
Worker fails to acquire file lock on Windows 10

## Environment
- OS: Windows 10 (version 21H1)
- Node.js: v18.17.0
- npm: 9.6.7
- Package version: 1.0.0

## Steps to Reproduce
1. Initialize project: `claude-coord init`
2. Start coordinator: `claude-coord start`
3. Start worker: `claude-worker --id=test --group=TYPESCRIPT`
4. Worker attempts to lock file `src/types.ts`

## Expected Behavior
Worker should acquire file lock successfully

## Actual Behavior
Error: EACCES: permission denied, open 'C:\\Users\\...\\.claude-coord\\system-state.json'

## Additional Context
Works fine on macOS and Linux
```

## 💡 Feature Requests

We welcome feature requests! Open an issue and include:

- **Use case**: What problem does this solve?
- **Proposed solution**: How should it work?
- **Alternatives considered**: What other solutions did you consider?
- **Impact**: Who would benefit from this feature?

## 🔧 Code Style

### JavaScript Style Guide

We use ESLint with the following rules:

```json
{
  "extends": ["eslint:recommended"],
  "env": {
    "node": true,
    "es2021": true
  },
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "no-unused-vars": "error",
    "no-console": "warn"
  }
}
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix  
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(coordinator): add web dashboard support
fix(worker): resolve file locking issue on Windows
docs(readme): update installation instructions
test(coordinator): add integration tests for dependency checking
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test test/coordinator.test.js

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

### Writing Tests

We use Jest for testing. Test files should:

- Be placed in the `test/` directory
- Follow the naming pattern: `*.test.js`
- Include both unit and integration tests
- Have descriptive test names

**Example Test:**

```javascript
const { CoordinatorCore } = require('../src/coordinator-core');

describe('CoordinatorCore', () => {
  let coordinator;
  
  beforeEach(() => {
    coordinator = new CoordinatorCore('/tmp/test-project');
  });

  afterEach(async () => {
    if (coordinator.isRunning) {
      await coordinator.stop();
    }
  });

  describe('Worker Registration', () => {
    it('should register worker successfully', async () => {
      await coordinator.start();
      
      const worker = await coordinator.registerWorker('test_worker', 'TYPESCRIPT');
      
      expect(worker.id).toBe('test_worker');
      expect(worker.group).toBe('TYPESCRIPT');
      expect(worker.status).toBe('initializing');
    });

    it('should prevent duplicate worker registration', async () => {
      await coordinator.start();
      await coordinator.registerWorker('test_worker', 'TYPESCRIPT');
      
      await expect(
        coordinator.registerWorker('test_worker', 'ESLINT')
      ).rejects.toThrow('Worker test_worker already registered');
    });
  });
});
```

## 📚 Documentation

### Code Documentation

- Use **JSDoc** for all public methods
- Include **examples** for complex functions
- Document **parameters** and **return values**
- Explain **side effects** and **exceptions**

**Example:**

```javascript
/**
 * Acquires a file lock for the specified worker
 * 
 * @param {string} workerId - ID of the worker requesting the lock
 * @param {string} filePath - Path to the file to lock
 * @returns {Promise<{success: boolean, lockedBy?: string}>} Lock acquisition result
 * @throws {Error} When system state cannot be accessed
 * 
 * @example
 * const result = await coordinator.acquireFileLock('claude_a', 'src/types.ts');
 * if (result.success) {
 *   console.log('Lock acquired successfully');
 * } else {
 *   console.log(`File locked by: ${result.lockedBy}`);
 * }
 */
async acquireFileLock(workerId, filePath) {
  // Implementation...
}
```

### README Updates

When adding features:
1. Update the **Features** section
2. Add **usage examples**
3. Update the **API Reference** if needed
4. Add **troubleshooting** information

## 🏗️ Architecture Guidelines

### File Organization

```
claude-coordination-system/
├── bin/              # CLI executables
├── src/              # Core source code
│   ├── coordinator-core.js
│   ├── worker-core.js
│   ├── config-manager.js
│   └── project-detector.js
├── test/             # Test files
├── examples/         # Usage examples
├── templates/        # Project templates
└── docs/             # Documentation
```

### Design Principles

1. **Single Responsibility**: Each class/module has one clear purpose
2. **Dependency Injection**: Avoid hard dependencies, use configuration
3. **Error Handling**: Comprehensive error handling with meaningful messages
4. **Backwards Compatibility**: Don't break existing functionality
5. **Performance**: Optimize for large projects with many files
6. **Security**: Validate all inputs, sanitize file paths

### Adding New Features

1. **Design First**: Create an issue describing the feature
2. **API Design**: Plan the public API before implementation
3. **Tests**: Write tests before or alongside implementation
4. **Documentation**: Update docs with the implementation
5. **Examples**: Provide usage examples
6. **Backwards Compatibility**: Ensure existing functionality works

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] npm package published
- [ ] GitHub release created

## ❓ Questions?

Don't hesitate to ask questions! You can:

- **Open an issue** with the "question" label
- **Start a discussion** on GitHub Discussions
- **Email** the maintainers

## 🙏 Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **CHANGELOG.md** for each release
- **GitHub releases** notes

Thank you for contributing to the Claude Coordination System! 🎉