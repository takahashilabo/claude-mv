#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects');

function expandTilde(p) {
  return p.startsWith('~') ? p.replace('~', os.homedir()) : p;
}

function pathToFolderName(dirPath) {
  return path.resolve(expandTilde(dirPath)).replace(/[/_]/g, '-');
}

// Reconstruct actual directory path from session folder name and user input
// e.g. folderName="-Users-foo-Desktop-janken-rust", input="janken_rust"
// → "/Users/foo/Desktop/janken-rust"
function deriveActualSrcPath(folderName, srcInput) {
  if (srcInput.includes('/') || srcInput.startsWith('~')) {
    return path.resolve(expandTilde(srcInput));
  }
  const normalize = s => s.replace(/_/g, '-');
  const suffix = '-' + normalize(srcInput);
  const idx = normalize(folderName).lastIndexOf(suffix);
  if (idx === -1) return null;
  const actualDirName = folderName.slice(idx + 1);
  const parentPath = folderName.slice(0, idx).replace(/-/g, '/');

  // Try exact name first, then search parent dir for a normalized match
  const exactPath = path.join(parentPath, actualDirName);
  if (fs.existsSync(exactPath)) return exactPath;

  if (fs.existsSync(parentPath)) {
    const normalizedDirName = normalize(actualDirName);
    const found = fs.readdirSync(parentPath).find(entry =>
      normalize(entry) === normalizedDirName
    );
    if (found) return path.join(parentPath, found);
  }
  return exactPath; // return best guess even if not found
}

function findSourceFolders(srcInput, destFolderName) {
  if (!fs.existsSync(claudeProjectsDir)) return [];

  if (srcInput.includes('/') || srcInput.startsWith('~')) {
    const exact = path.join(claudeProjectsDir, pathToFolderName(srcInput));
    return fs.existsSync(exact) ? [path.basename(exact)] : [];
  }

  const normalize = s => s.replace(/_/g, '-');
  const suffix = '-' + normalize(srcInput);
  return fs.readdirSync(claudeProjectsDir).filter(f => {
    const full = path.join(claudeProjectsDir, f);
    return fs.statSync(full).isDirectory()
      && f !== destFolderName
      && normalize(f).endsWith(suffix);
  });
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: claude-mv <source-dir> <dest-dir>');
    process.exit(1);
  }

  const [srcInput, destInput] = args;
  const destFolderName = pathToFolderName(destInput);
  const destSessionPath = path.join(claudeProjectsDir, destFolderName);
  const destActualPath = path.resolve(expandTilde(destInput));

  const matches = findSourceFolders(srcInput, destFolderName);

  if (matches.length === 0) {
    // Check if already migrated
    if (fs.existsSync(destSessionPath)) {
      console.log(`Already migrated: sessions are already at ${destSessionPath}`);
      const sessionFiles = fs.readdirSync(destSessionPath).filter(f => f.endsWith('.jsonl'));
      if (sessionFiles.length > 0) {
        console.log('\nTo resume a session:');
        sessionFiles.forEach(f => console.log(`  claude --resume ${f.replace('.jsonl', '')}`));
      }
      process.exit(0);
    }
    console.error(`Error: No Claude sessions found for "${srcInput}"`);
    const all = fs.existsSync(claudeProjectsDir)
      ? fs.readdirSync(claudeProjectsDir).filter(f =>
          fs.statSync(path.join(claudeProjectsDir, f)).isDirectory())
      : [];
    if (all.length > 0) {
      console.error('\nAvailable project folders in ~/.claude/projects/:');
      all.forEach(f => console.error('  ' + f));
    }
    process.exit(1);
  }

  if (matches.length > 1) {
    console.error(`Error: Multiple matches for "${srcInput}" — specify the full path:`);
    matches.forEach(f => console.error('  ' + f));
    process.exit(1);
  }

  const srcFolderName = matches[0];
  const srcSessionPath = path.join(claudeProjectsDir, srcFolderName);
  const srcActualPath = deriveActualSrcPath(srcFolderName, srcInput);

  // Move actual project directory if it exists
  if (srcActualPath && fs.existsSync(srcActualPath)) {
    if (fs.existsSync(destActualPath)) {
      console.error(`Error: Destination directory already exists: ${destActualPath}`);
      process.exit(1);
    }
    const destParent = path.dirname(destActualPath);
    if (!fs.existsSync(destParent)) {
      fs.mkdirSync(destParent, { recursive: true });
    }
    fs.renameSync(srcActualPath, destActualPath);
    console.log(`Moved directory:`);
    console.log(`  ${srcActualPath}`);
    console.log(`→ ${destActualPath}`);
  }

  // Rename session folder
  if (fs.existsSync(destSessionPath)) {
    console.error(`Error: Session destination already exists: ${destSessionPath}`);
    process.exit(1);
  }
  fs.renameSync(srcSessionPath, destSessionPath);
  console.log(`Moved sessions:`);
  console.log(`  ${srcSessionPath}`);
  console.log(`→ ${destSessionPath}`);

  console.log(`\nTo resume: cd ${destActualPath} && claude, then /resume`)
}

main();
