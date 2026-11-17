import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const targetReleaseDir = path.join(rootDir, 'target', 'release');
const desktopResourcesBin = path.join(rootDir, 'apps', 'desktop', 'resources', 'bin');

fs.mkdirSync(desktopResourcesBin, { recursive: true });

// Check platform exe name or check if an explicit binary name was passed via env
const exeName = process.env.INKPAGE_BIN_NAME || (process.platform === 'win32' ? 'inkpage-server.exe' : 'inkpage-server');
const sourceBin = process.env.INKPAGE_BIN_PATH || path.join(targetReleaseDir, exeName);
const targetBin = path.join(desktopResourcesBin, exeName);

if (fs.existsSync(targetBin) && !process.env.FORCE_PREPARE && !fs.existsSync(sourceBin)) {
  console.log(`Backend binary already present at ${targetBin}`);
  process.exit(0);
}

if (!fs.existsSync(sourceBin)) {
  console.log(`Backend binary not found at ${sourceBin}. Compiling with cargo...`);
  execSync('cargo build --release --bin inkpage-server', {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

if (fs.existsSync(sourceBin)) {
  fs.copyFileSync(sourceBin, targetBin);
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(targetBin, 0o755);
    } catch (e) {
      console.warn('Could not chmod target binary:', e.message);
    }
  }
  console.log(`Staged backend binary: ${sourceBin} -> ${targetBin} (${fs.statSync(targetBin).size} bytes)`);
} else {
  console.error(`Error: Backend binary could not be found or built at ${sourceBin}`);
  process.exit(1);
}
