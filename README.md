# claude-mv

Migrate [Claude Code](https://claude.ai/code) sessions from one directory to another.

## Why

When you move or rename a project directory, Claude Code loses track of the conversation history. `claude-mv` migrates the session files so you can resume where you left off.

## Installation

```bash
npm install -g github:takahashilabo/claude-mv
```

## Usage

```bash
claude-mv <source-dir> <dest-dir>
```

### Example

```bash
claude-mv ~/projects/old-name ~/projects/new-name
```

Output:

```
Moved directory:
  /Users/you/projects/old-name
→ /Users/you/projects/new-name
Moved sessions:
  /Users/you/.claude/projects/-Users-you-projects-old-name
→ /Users/you/.claude/projects/-Users-you-projects-new-name

To resume: cd /Users/you/projects/new-name && claude, then /resume
```

## How it works

Claude Code stores session history in `~/.claude/projects/`, using a folder name derived from the absolute project path (slashes replaced with hyphens). `claude-mv` finds the folder for the source path, creates the corresponding folder for the destination path, and copies all `.jsonl` session files into it.

## Requirements

- Node.js 14+
- Claude Code CLI
