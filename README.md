# 🤖 Multi-Claude Coordinator
*Project-Independent Parallel Development Coordination System*

## 🚀 Quick Start

### Global Installation
```bash
npm install -g claude-coordination-system
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

## 🧠 Dynamic Group Creation

### Creating Custom Work Groups
```bash
# Interactive group creation
claude-coord create-groups --interactive

# Quick group from description  
claude-coord create-task --description "Build user authentication system with JWT"

# Split large work into multiple groups
claude-coord split-work --tasks=3 --description="E-commerce platform with payments"
```

### Example: Custom Feature Development
**User Request:** *"I want 3 Claude instances: one for authentication, one for payment integration, one for admin dashboard"*

**System Response:**
```bash
✅ Created 3 work groups:
   🔹 AUTH_SYSTEM: Authentication & user management  
   🔹 PAYMENT_INTEGRATION: Stripe/payment processing
   🔹 ADMIN_DASHBOARD: Admin panel & analytics

🚀 Ready to coordinate - run these in separate terminals:
   claude-worker --id=claude_auth --group=AUTH_SYSTEM
   claude-worker --id=claude_payment --group=PAYMENT_INTEGRATION  
   claude-worker --id=claude_admin --group=ADMIN_DASHBOARD
```

### Smart File Pattern Detection
The system automatically infers file patterns for common features:
```javascript
{
  "AUTH_SYSTEM": {
    "files": ["src/auth/**/*", "middleware.ts", "*/login/**/*", "*/register/**/*"]
  },
  "PAYMENT_INTEGRATION": {
    "files": ["src/payment/**/*", "*/checkout/**/*", "*/stripe/**/*"],
    "dependencies": ["AUTH_SYSTEM"]  // Payments need auth first
  }
}
```

---

## 👥 Integrating Active Claude Instances

### If You Already Have Claude Running
**Scenario:** You're currently working with Claude and want to add parallel workers.

**Step 1:** Initialize coordination in your current project
```bash
# In your current terminal with Claude
cd your-project
claude-coord init --type=nextjs  # Or your project type
```

**Step 2:** Start the coordinator 
```bash  
# New terminal - Terminal 1
claude-coord start
```

**Step 3:** Convert your current Claude to a worker
```bash
# In THIS terminal (where Claude is active)
claude-worker --id=claude_main --group=TYPESCRIPT --verbose

# This Claude becomes the TYPESCRIPT group worker
# It will receive TypeScript-related tasks automatically
```

**Step 4:** Add more Claude instances
```bash
# New terminal - Terminal 2  
claude-worker --id=claude_eslint --group=ESLINT --verbose

# New terminal - Terminal 3
claude-worker --id=claude_ui --group=UI --verbose
```

**Step 5:** Monitor all workers
```bash
# New terminal - Terminal 4
claude-monitor
```

### Practical Integration Example
**Current situation:** You have Claude Code open and working on a Next.js project.

**Integration steps:**
1. **Keep working** - don't close your current Claude
2. Run `claude-coord init` in your project 
3. Open **3 new terminals**:
   - Terminal 1: `claude-coord start` (coordinator)
   - Terminal 2: `claude-worker --id=claude_b --group=ESLINT`  
   - Terminal 3: `claude-monitor` (dashboard)
4. **In your current Claude terminal:** `claude-worker --id=claude_main --group=TYPESCRIPT`
5. **Now you have 2 Claude workers** coordinating automatically!

### System Architecture Visualization
```
┌─────────────────────┐
│   📊 COORDINATOR    │  ← Only manages & organizes
│   (Terminal 1)      │
│   - File locks      │
│   - Heartbeat       │
│   - Dependencies    │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼───┐    ┌───▼───┐    ┌───▼───┐
│WORKER │    │WORKER │    │WORKER │  ← Does actual work
│Claude │    │Claude │    │Claude │
│   A   │    │   B   │    │   C   │
└───────┘    └───────┘    └───────┘
```

**Coordinator Role:** Manager 👔
- 🧠 Central brain - organizes entire system
- 💓 Heartbeat monitoring (15s intervals)  
- 🔒 File lock management
- 📊 State management
- 🔄 Dependency chain control
- ⚠️ Dead worker cleanup

**Worker Role:** Developer 👩‍💻
- Executes actual coding tasks
- Follows coordinator instructions
- Reports progress via heartbeat
- Respects file locks and dependencies

### Worker Assignment Strategies

**Method 1: Direct Assignment**
```bash
# Assign workers based on expertise
claude-worker --id=claude_backend --group=API          # Backend specialist
claude-worker --id=claude_frontend --group=UI          # Frontend specialist  
claude-worker --id=claude_devops --group=DATABASE      # DevOps specialist
```

**Method 2: Standby Mode (Interactive Assignment)** 🆕
```bash
# Start worker in standby mode - no group assigned
claude-worker --id=claude_flex --standby

# Interactive session starts:
⏸️  Starting in STANDBY mode
   Waiting for group assignment...
   Available groups:
     - TYPESCRIPT: TypeScript & Build System
     - ESLINT: ESLint & Code Quality  
     - UI: UI Components & Pages
     - API: API Routes & Backend

📝 Interactive Commands:
  join <group>     - Join a work group
  list             - List available groups
  status           - Show current status
  quit             - Exit worker

claude> join TYPESCRIPT
🚀 Joining group: TYPESCRIPT
🔄 Switching from STANDBY to TYPESCRIPT
🎉 claude_flex completed all tasks for TYPESCRIPT
```

### Standby Mode Benefits
✅ **Dynamic Assignment**: Assign workers to groups on-demand  
✅ **Resource Flexibility**: Keep workers ready without fixed roles  
✅ **Interactive Control**: Real-time group switching  
✅ **Load Balancing**: Move workers where they're needed most

### Practical Standby Usage
```bash
# Terminal 1: Coordinator
claude-coord start

# Terminal 2-4: Flexible workers in standby  
claude-worker --id=claude_a --standby
claude-worker --id=claude_b --standby
claude-worker --id=claude_c --standby

# Assign workers as needed:
# claude_a: join TYPESCRIPT
# claude_b: join ESLINT  
# claude_c: join UI
```

---

## 🤖 User Interaction & Coordination Awareness

### Real-time Status Queries
When users ask about the coordination system, Claude instances can respond intelligently:

**User:** "What are you working on right now?"
**Claude Response:**
```
🤖 Current Status:
Worker ID: claude_main  
Group: TYPESCRIPT
Task: Fixing interface definitions in src/components/
Memory: 145MB / 256MB (57%)
Progress: 3/8 TypeScript errors resolved
Locked Files: src/types/user.ts, src/interfaces/api.ts

🔄 Coordination Status:
- claude_eslint (ESLINT): Waiting for TYPESCRIPT completion
- claude_ui (UI): Processing components (2 files locked)
System healthy ✅
```

**User:** "How many Claude instances are working on this project?"
**Claude Response:**
```
👥 Active Workers: 3/6
🔧 claude_main (TYPESCRIPT): Working - Memory 57%
⏸️  claude_eslint (ESLINT): Waiting - Depends on TYPESCRIPT  
🎨 claude_ui (UI): Working - Memory 71%
📊 System load: Optimal
```

### Status Command Integration
Each Claude can report system status on demand:
```bash
# In any worker terminal, Claude can respond to:
# "Show me the coordination status"
# "What's the current system state?"  
# "How are other Claude instances doing?"
```

### Automatic Coordination Awareness
✅ **Self-aware**: Each Claude knows its role and current task  
✅ **System-aware**: Can report on other workers' status  
✅ **Progress-aware**: Tracks completion percentage  
✅ **Resource-aware**: Memory, locks, dependencies

---

## 📊 Monitoring Dashboard Examples

### Terminal Monitor Output
```bash
claude-monitor
```

**Real-time Display:**
```
🤖 Multi-Claude Coordination Monitor
Project: agendaiq | 2025-09-08 16:45:23
═══════════════════════════════════════════════════════════════════════════

📈 System Overview:
  Active Workers: 3
  File Locks: 5
  Tasks: 2/6 completed  
  Health: Healthy ✅

👥 Active Workers:
  🔧 claude_main (TYPESCRIPT)
    Status: Working
    Memory: 145MB / 256MB (57%) ✅
    Last seen: 3s ago
    Task: Fixing interface definitions

  ⏳ claude_eslint (ESLINT)  
    Status: Waiting
    Memory: 89MB / 256MB (35%) ✅
    Last seen: 5s ago
    Task: Waiting for TYPESCRIPT completion

  🎨 claude_ui (UI)
    Status: Working  
    Memory: 182MB / 256MB (71%) ⚠️
    Last seen: 2s ago
    Task: Updating component interfaces

🔒 File Locks:
  🔒 src/types/user.ts → claude_main
  🔒 src/interfaces/api.ts → claude_main  
  🔒 src/components/Button.tsx → claude_ui
  🔒 src/components/Form.tsx → claude_ui
  🔒 src/hooks/useAuth.ts → claude_ui

📋 Task Progress:
  ✅ BUNDLE: Bundle & Dependencies - Completed
  🔧 TYPESCRIPT: TypeScript & Build System - In Progress (claude_main)
  ⏳ ESLINT: ESLint & Code Quality - Waiting (depends on TYPESCRIPT)  
  🔧 UI: UI Components & Pages - In Progress (claude_ui)
  ⏸️  API: API Routes & Backend - Ready
  ⏸️  DATABASE: Database & Performance - Ready

📝 Recent Activity:
  16:45:20 INFO  claude_main started TypeScript fixes
  16:45:18 INFO  claude_ui locked src/components/Button.tsx  
  16:45:15 INFO  System initialized with 3 workers
  16:45:12 INFO  Coordinator started on port 7777
```

### Compact Monitor Mode
```bash
claude-monitor --compact
```
```
🤖 Multi-Claude Monitor | agendaiq | 16:45:23
Workers: 3/6 | Locks: 5 | Tasks: 2/6 | Health: ✅
claude_main(TS): Working 57% | claude_eslint(ES): Waiting 35% | claude_ui(UI): Working 71%
```

### Web Dashboard
```bash
claude-monitor --web --port=8888
# Opens: http://localhost:8888
```

**Web Interface Features:**
- 📊 Real-time charts and graphs
- 🔄 Auto-refresh every 2 seconds
- 📱 Mobile-responsive design
- 📈 Memory usage trending
- 🔍 Detailed worker inspection
- 💾 Export system metrics

---

## 🧠 Memory Management & Performance

### Automatic Resource Management
The system includes comprehensive memory monitoring and cleanup to prevent resource exhaustion:

```javascript
// Each worker automatically monitors:
{
  "maxMemoryMB": 256,        // 256MB default per worker
  "checkInterval": 30000,    // Check every 30 seconds  
  "warningThreshold": 0.8,   // 80% warning threshold
  "criticalThreshold": 0.9   // 90% critical threshold
}
```

### Built-in Protections
✅ **Memory Leak Prevention**
- Automatic cache size limits (100 items default)
- TTL-based cache expiration (5 min default)
- Periodic garbage collection triggers

✅ **Resource Cleanup**  
- Old log file rotation (keep 10 files)
- State history cleanup (keep 50 snapshots)
- Temporary directory cleanup
- File lock auto-release on shutdown

✅ **Critical State Handling**
- Memory warnings at 80% usage
- Emergency cleanup at 90% usage  
- Automatic worker restart recommendations
- Graceful degradation under load

### Memory Monitoring in Action
```bash
# Real-time memory display in monitor
🤖 claude_main (TYPESCRIPT)
  Status: Working  
  Memory: 156MB / 256MB (61%) ✅
  Last seen: 12s ago
  Task: Fixing interface definitions

⚠️  claude_heavy (UI)  
  Status: Working
  Memory: 220MB / 256MB (86%) ⚠️  
  Last seen: 5s ago
  Task: Processing large components
```

### Custom Memory Limits
```bash
# Set custom memory limits per worker
claude-worker --id=claude_heavy --group=UI --memory=512  # 512MB limit
claude-worker --id=claude_light --group=TYPESCRIPT --memory=128  # 128MB limit
```

### Performance Guarantees
| Resource | Limit | Auto-Action |
|----------|--------|-------------|
| **Memory per worker** | 256MB default | Warning → Cleanup → Restart suggestion |
| **Cache size** | 100 items | LRU eviction + TTL cleanup |
| **Log files** | 10 files | Auto-rotation |
| **State history** | 50 snapshots | Auto-pruning |
| **Temp files** | 1 hour TTL | Auto-cleanup |

**Result: Your system stays stable even with 10+ parallel Claude workers!** 🚀

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
npm install -g claude-coordination-system
```

### Method 2: Local Project Install
```bash
npm install --save-dev claude-coordination-system
npx claude-coord init
```

### Method 3: Direct Clone
```bash
git clone https://github.com/hsandir/claude-coordination-system.git
cd claude-coordination-system
npm install
npm link  # Global access
```

---

Bu sistem tüm projelerinizde kullanılabilir ve proje türünü otomatik algılayarak uygun koordinasyon stratejisi uygular!