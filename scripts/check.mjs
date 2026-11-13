import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const files = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (/\.(m?js)$/.test(entry)) {
      files.push(fullPath);
    }
  }
}

walk(root);
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
