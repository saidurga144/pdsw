// remove_comments.js
const fs = require('fs');
const path = require('path');
const strip = require('strip-comments');

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const stripped = strip(content);
  if (stripped !== content) {
    fs.writeFileSync(filePath, stripped, 'utf8');
    console.log(`Stripped comments from ${filePath}`);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules, venv, .git, dist, .next, out, build
      const skip = ['node_modules', 'venv', '.git', 'dist', '.next', 'out', 'build'];
      if (skip.includes(entry.name)) continue;
      walk(fullPath);
    } else if (entry.isFile()) {
      if (fullPath.match(/\.(js|jsx|ts|tsx)$/i)) {
        processFile(fullPath);
      }
    }
  }
}

walk(process.cwd());
