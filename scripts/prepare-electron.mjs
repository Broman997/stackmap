import { cpSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const standaloneDir = join(root, '.next', 'standalone');

if (!existsSync(standaloneDir)) {
  console.error('Error: .next/standalone not found. Run "next build" first.');
  process.exit(1);
}

console.log('Copying static assets into standalone build...');
cpSync(join(root, '.next', 'static'), join(standaloneDir, '.next', 'static'), { recursive: true });
cpSync(join(root, 'public'), join(standaloneDir, 'public'), { recursive: true });
console.log('Assets ready for electron-builder.');
