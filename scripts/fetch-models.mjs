import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const MODELS_DIR = path.join(projectRoot, 'public', 'models');
const FFMPEG_DIR = path.join(projectRoot, 'public', 'ffmpeg');
const SAMPLES_DIR = path.join(projectRoot, 'public', 'samples');

// Ensure directories exist
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}
if (!fs.existsSync(FFMPEG_DIR)) {
  fs.mkdirSync(FFMPEG_DIR, { recursive: true });
}
if (!fs.existsSync(SAMPLES_DIR)) {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

const MODEL_FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'age_gender_model-weights_manifest.json',
  'age_gender_model.bin',
  // Landmark models optional but useful if loaded
  'face_landmark_68_tiny_model-weights_manifest.json',
  'face_landmark_68_tiny_model.bin',
];

const GITHUB_BASE = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
const NODE_MODULES_MODEL_DIR = path.join(projectRoot, 'node_modules', '@vladmandic', 'face-api', 'model');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function prepareModels() {
  console.log('[safe-face-zero] Syncing AI face-api models to public/models/ ...');
  for (const fileName of MODEL_FILES) {
    const destPath = path.join(MODELS_DIR, fileName);
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      continue;
    }

    const localSrc = path.join(NODE_MODULES_MODEL_DIR, fileName);
    if (fs.existsSync(localSrc)) {
      console.log(`  -> Copying from node_modules: ${fileName}`);
      fs.copyFileSync(localSrc, destPath);
    } else {
      console.log(`  -> Downloading from GitHub: ${fileName}`);
      try {
        await downloadFile(`${GITHUB_BASE}${fileName}`, destPath);
      } catch (err) {
        console.warn(`  [!] Could not fetch ${fileName}:`, err.message);
      }
    }
  }

  // Also create shard-compatible copies if any manifest references shards
  const tinyManifest = path.join(MODELS_DIR, 'tiny_face_detector_model-weights_manifest.json');
  if (fs.existsSync(tinyManifest)) {
    const content = fs.readFileSync(tinyManifest, 'utf8');
    if (content.includes('shard1') && fs.existsSync(path.join(MODELS_DIR, 'tiny_face_detector_model.bin'))) {
      fs.copyFileSync(path.join(MODELS_DIR, 'tiny_face_detector_model.bin'), path.join(MODELS_DIR, 'tiny_face_detector_model-shard1'));
    }
  }
}

async function prepareFFmpeg() {
  console.log('[safe-face-zero] Syncing FFmpeg wasm core assets to public/ffmpeg/ ...');
  // Copy multithreaded core assets
  const mtDist = path.join(projectRoot, 'node_modules', '@ffmpeg', 'core-mt', 'dist', 'esm');
  if (fs.existsSync(mtDist)) {
    for (const file of fs.readdirSync(mtDist)) {
      const src = path.join(mtDist, file);
      const dst = path.join(FFMPEG_DIR, file);
      if (!fs.existsSync(dst)) {
        fs.copyFileSync(src, dst);
      }
    }
  }

  // Copy single-threaded fallback core assets
  const stDist = path.join(projectRoot, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
  if (fs.existsSync(stDist)) {
    const stDir = path.join(FFMPEG_DIR, 'st');
    if (!fs.existsSync(stDir)) fs.mkdirSync(stDir, { recursive: true });
    for (const file of fs.readdirSync(stDist)) {
      const src = path.join(stDist, file);
      const dst = path.join(stDir, file);
      if (!fs.existsSync(dst)) {
        fs.copyFileSync(src, dst);
      }
    }
  }

  // Copy coi-serviceworker for GitHub Pages cross-origin isolation
  const coiSrc = path.join(projectRoot, 'node_modules', 'coi-serviceworker', 'coi-serviceworker.min.js');
  const coiDst = path.join(projectRoot, 'public', 'coi-serviceworker.min.js');
  if (fs.existsSync(coiSrc) && !fs.existsSync(coiDst)) {
    fs.copyFileSync(coiSrc, coiDst);
    console.log('[safe-face-zero] COOP/COEP Service Worker synced to public/coi-serviceworker.min.js');
  }
}

async function prepareSamples() {
  console.log('[safe-face-zero] Syncing test sample images & videos to public/samples/ ...');
  const demoDir = path.join(projectRoot, 'node_modules', '@vladmandic', 'face-api', 'demo');
  if (fs.existsSync(demoDir)) {
    const samples = [
      { src: 'sample1.jpg', dst: 'sample-portrait.jpg' },
      { src: 'sample2.jpg', dst: 'sample-teen.jpg' },
      { src: 'sample3.jpg', dst: 'sample-group.jpg' },
    ];
    for (const item of samples) {
      const srcPath = path.join(demoDir, item.src);
      const dstPath = path.join(SAMPLES_DIR, item.dst);
      if (fs.existsSync(srcPath) && !fs.existsSync(dstPath)) {
        fs.copyFileSync(srcPath, dstPath);
      }
    }
  }
}

async function main() {
  try {
    await prepareModels();
    await prepareFFmpeg();
    await prepareSamples();
    console.log('[safe-face-zero] Assets successfully synchronized.');
  } catch (error) {
    console.error('[safe-face-zero] Asset sync error:', error);
    process.exit(1);
  }
}

main();
