#!/usr/bin/env node
import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import figlet from 'figlet';

async function main() {
  let files;
  try {
    files = execSync(
      'git diff --cached --name-only --diff-filter=ACM -- src/assets/ascii/*.txt',
      { encoding: 'utf8', shell: true }
    )
      .split('\n')
      .filter((f) => f.trim());
  } catch (err) {
    console.error('No staged ascii files to process.');
    process.exit(0);
  }

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      if (content.includes('Placeholder for ascii art')) {
        const base = path.basename(file, '.txt');
        const text = base.replace(/_/g, ' ');
        const art = figlet.textSync(text);
        await fs.writeFile(file, art, 'utf8');
        execSync(`git add ${file}`, { shell: true });
        console.log(`Generated ascii art for ${file}`);
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }
}

main();