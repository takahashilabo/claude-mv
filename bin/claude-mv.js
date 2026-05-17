#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

function expandTilde(filePath) {
  if (filePath.startsWith('~/') || filePath === '~') {
    return filePath.replace('~', os.homedir());
  }
  return filePath;
}

function pathToProjectFolder(dirPath) {
  // /Users/foo/bar -> -Users-foo-bar
  const absPath = path.resolve(expandTilde(dirPath));
  return absPath.replace(/\//g, '-');
}

function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('Usage: claude-mv <source-dir> <dest-dir>');
    process.exit(1);
  }

  const [srcDir, destDir] = args;
  const claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects');

  const srcFolderName = pathToProjectFolder(srcDir);
  const destFolderName = pathToProjectFolder(destDir);

  const srcProjectPath = path.join(claudeProjectsDir, srcFolderName);
  const destProjectPath = path.join(claudeProjectsDir, destFolderName);

  // Check source exists
  if (!fs.existsSync(srcProjectPath)) {
    console.error(`Error: No Claude sessions found for "${srcDir}"`);
    console.error(`  Expected folder: ${srcProjectPath}`);
    process.exit(1);
  }

  // Find all .jsonl files in source
  const entries = fs.readdirSync(srcProjectPath);
  const jsonlFiles = entries.filter(f => f.endsWith('.jsonl'));

  if (jsonlFiles.length === 0) {
    console.error(`Error: No .jsonl session files found in ${srcProjectPath}`);
    process.exit(1);
  }

  // Create destination folder
  if (!fs.existsSync(destProjectPath)) {
    fs.mkdirSync(destProjectPath, { recursive: true });
  }

  // Copy all .jsonl files
  for (const file of jsonlFiles) {
    const src = path.join(srcProjectPath, file);
    const dest = path.join(destProjectPath, file);
    fs.copyFileSync(src, dest);
  }

  console.log(`Migrated ${jsonlFiles.length} session(s) from:`);
  console.log(`  ${srcProjectPath}`);
  console.log(`to:`);
  console.log(`  ${destProjectPath}`);
  console.log('');
  console.log('To resume a session, run one of the following:');
  for (const file of jsonlFiles) {
    const sessionId = file.replace('.jsonl', '');
    console.log(`  claude --resume ${sessionId}`);
  }
}

main();
