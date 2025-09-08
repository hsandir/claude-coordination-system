# 🤖 Multi-Claude Coordinator
*Project-Independent Parallel Development Coordination System*

## 🚀 Quick Start

### Global Installation
```bash
npm install -g @hs/multi-claude-coordinator
```

### Initialize Project
```bash
cd your-project
claude-coord init
```

### Start Coordination
```bash
# Terminal 1 - Coordinator
claude-coord start

# Terminal 2-N - Workers  
claude-worker --id=claude_a --group=TYPESCRIPT
claude-worker --id=claude_b --group=ESLINT
```

### Monitor System
```bash
claude-monitor  # Real-time dashboard
```

---

## 🎯 Features

### ✅ Project-Independent
- **Universal Configuration**: Works with any project structure
- **Flexible Task Definitions**: Customizable for different tech stacks
- **Smart Detection**: Auto-detects project type (React, Vue, Node, etc.)

### ✅ Intelligent Coordination
- **File Locking**: Prevents conflicts between workers
- **Dependency Management**: Smart task ordering
- **Real-time Communication**: Workers coordinate automatically
- **Progress Tracking**: Visual progress monitoring

### ✅ Professional Quality
- **Zero Degradation**: Never breaks existing functionality
- **TypeScript Support**: Full type safety
- **ESLint Integration**: Code quality enforcement
- **Test Integration**: Automatic testing validation

---

## 📋 Supported Project Types

| Type | Auto-Detection | Default Groups |
|------|----------------|----------------|
| **Next.js** | `next.config.js` | TypeScript, ESLint, Bundle |
| **React** | `package.json` React deps | Components, Build, Tests |
| **Node.js** | `package.json` Node deps | Server, Database, API |
| **Vue** | `vue.config.js` | Components, Router, Vuex |
| **Custom** | Manual config | User-defined |

---

## ⚙️ Configuration

### Project Config: `claude-coord.json`
```json
{
  "project": {
    "name": "my-project",
    "type": "nextjs",
    "root": "."
  },
  "workers": {
    "max_workers": 6,
    "coordination_mode": "file_based",
    "heartbeat_interval": 15000
  },
  "groups": {
    "TYPESCRIPT": {
      "name": "TypeScript & Build",
      "priority": 1,
      "files": ["tsconfig.json", "src/**/*.ts"],
      "dependencies": []
    },
    "ESLINT": {
      "name": "ESLint & Quality", 
      "priority": 2,
      "files": ["eslint.config.js", "src/**/*"],
      "dependencies": ["TYPESCRIPT"]
    }
  }
}
```

### Global Config: `~/.claude-coord/config.json`
```json
{
  "user": {
    "machine_id": "auto-generated",
    "preferred_terminal": "iterm2"
  },
  "defaults": {
    "coordination_port": 7777,
    "log_level": "info",
    "auto_backup": true
  },
  "projects": [
    {
      "name": "agendaiq",
      "path": "/Users/hs/Project/agendaiq", 
      "last_used": "2025-09-08T16:30:00Z"
    }
  ]
}
```

---

## 🛠️ Commands

### Initialization
```bash
claude-coord init                    # Initialize project
claude-coord init --type=nextjs     # Initialize with specific type  
claude-coord init --interactive      # Interactive setup
```

### Coordination
```bash
claude-coord start                   # Start coordinator
claude-coord start --port=8888      # Custom port
claude-coord status                  # System status
claude-coord stop                    # Stop all workers
```

### Workers
```bash
claude-worker --id=claude_a --group=TYPESCRIPT
claude-worker --list-groups          # Show available groups
claude-worker --validate             # Validate worker setup
```

### Monitoring
```bash
claude-monitor                       # Full dashboard
claude-monitor --compact             # Compact view
claude-monitor --export              # Export metrics
```

---

## 🔧 Advanced Usage

### Custom Task Definitions
Create `claude-coord.tasks.js`:
```javascript
module.exports = {
  TYPESCRIPT: [
    {
      name: 'Fix syntax errors in components',
      files: ['src/components/**/*.tsx'],
      action: 'typescript_fix',
      validation: 'npx tsc --noEmit'
    }
  ],
  
  CUSTOM_GROUP: [
    {
      name: 'Custom processing',
      files: ['custom/**/*'],
      action: async (files, context) => {
        // Custom implementation
      }
    }
  ]
};
```

### Integration with Existing Tools
```bash
# Package.json scripts
"scripts": {
  "coord:start": "claude-coord start",
  "coord:typescript": "claude-worker --group=TYPESCRIPT",
  "coord:monitor": "claude-monitor --compact"
}
```

---

## 📊 Success Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **Coordination Overhead** | <5% | Time spent on coordination vs work |
| **File Conflicts** | <2/hour | Lock conflicts between workers |  
| **Worker Utilization** | >90% | Active work time percentage |
| **Task Success Rate** | >95% | Successfully completed tasks |

---

## 🚀 Installation Guide

### Method 1: NPM Global Install
```bash
npm install -g @hs/multi-claude-coordinator
```

### Method 2: Local Project Install
```bash
npm install --save-dev @hs/multi-claude-coordinator
npx claude-coord init
```

### Method 3: Direct Clone
```bash
git clone https://github.com/hs/multi-claude-coordinator.git
cd multi-claude-coordinator
npm install
npm link  # Global access
```

---

Bu sistem tüm projelerinizde kullanılabilir ve proje türünü otomatik algılayarak uygun koordinasyon stratejisi uygular!