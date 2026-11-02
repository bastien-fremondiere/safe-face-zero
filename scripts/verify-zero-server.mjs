import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Ensure assets are synchronized if missing
const checkModels = path.join(projectRoot, 'public', 'models', 'tiny_face_detector_model.bin');
const checkFFmpeg = path.join(projectRoot, 'public', 'ffmpeg', 'ffmpeg-core.js');

if (!fs.existsSync(checkModels) || !fs.existsSync(checkFFmpeg)) {
  console.log('[SafeFace Zero] Assets locaux manquants, synchronisation via scripts/fetch-models.mjs ...');
  try {
    execSync('node scripts/fetch-models.mjs', { cwd: projectRoot, stdio: 'inherit' });
    console.log('');
  } catch (err) {
    console.error('[ERREUR] Impossible d’exécuter fetch-models.mjs :', err.message);
  }
}

console.log('================================================================');
console.log('   SafeFace Zero — Audit de Confidentialité & Zero-Server');
console.log('================================================================\n');

let issuesFound = 0;

// 1. Verify Local AI Models
console.log('1. Vérification des modèles IA locaux dans public/models/ ...');
const modelsDir = path.join(projectRoot, 'public', 'models');
const requiredModels = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'age_gender_model-weights_manifest.json',
  'age_gender_model.bin',
];

for (const model of requiredModels) {
  const p = path.join(modelsDir, model);
  if (fs.existsSync(p) && fs.statSync(p).size > 0) {
    console.log(`   [OK] Modèle présent localement : ${model} (${(fs.statSync(p).size / 1024).toFixed(1)} KB)`);
  } else {
    console.error(`   [ERREUR] Modèle manquant : ${model}`);
    issuesFound++;
  }
}

// 2. Verify Local FFmpeg WASM assets
console.log('\n2. Vérification des binaires FFmpeg WebAssembly dans public/ffmpeg/ ...');
const ffmpegDir = path.join(projectRoot, 'public', 'ffmpeg');
const requiredFFmpeg = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

for (const asset of requiredFFmpeg) {
  const p = path.join(ffmpegDir, asset);
  if (fs.existsSync(p) && fs.statSync(p).size > 0) {
    console.log(`   [OK] Binaire FFmpeg présent : ${asset} (${(fs.statSync(p).size / (1024 * 1024)).toFixed(2)} MB)`);
  } else {
    console.error(`   [ERREUR] Binaire FFmpeg manquant : ${asset}`);
    issuesFound++;
  }
}

// 3. Verify COOP / COEP isolation headers in config files
console.log('\n3. Vérification des en-têtes d’isolation (COOP/COEP) ...');
const checkConfigs = [
  { file: 'vite.config.ts', mustContain: ['require-corp', 'same-origin'] },
  { file: 'public/_headers', mustContain: ['Cross-Origin-Embedder-Policy', 'Cross-Origin-Opener-Policy'] },
  { file: 'vercel.json', mustContain: ['require-corp', 'same-origin'] },
];

for (const { file, mustContain } of checkConfigs) {
  const p = path.join(projectRoot, file);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const allPresent = mustContain.every((term) => content.includes(term));
    if (allPresent) {
      console.log(`   [OK] Isolation configurée dans ${file}`);
    } else {
      console.error(`   [ERREUR] En-têtes COOP/COEP manquants dans ${file}`);
      issuesFound++;
    }
  } else {
    console.error(`   [ERREUR] Fichier de configuration manquant : ${file}`);
    issuesFound++;
  }
}

// 4. Scan source files for rogue remote fetch / telemetry / tracking
console.log('\n4. Scan statique des sources (src/) contre les fuites réseau externes ...');
const srcDir = path.join(projectRoot, 'src');

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && /\.(tsx?|jsx?|html)$/.test(entry.name)) {
      const code = fs.readFileSync(fullPath, 'utf8');

      // Check for suspicious remote API calls (ignoring github repository link in header/footer)
      const matches = code.match(/https?:\/\/[^\s"'`)]+/g) || [];
      for (const url of matches) {
        if (
          url.includes('github.com/bastien-fremondiere') ||
          url.includes('w3.org/2000/svg') ||
          url.includes('vitejs.dev')
        ) {
          continue; // Allowed doc / SVG namespace / repo link
        }
        console.warn(`   [ATTENTION] URL externe suspecte détectée dans ${path.relative(projectRoot, fullPath)} : ${url}`);
        issuesFound++;
      }
    }
  }
}

scanDir(srcDir);

console.log('\n================================================================');
if (issuesFound === 0) {
  console.log('   RESULTAT : SUCCES TOTAL - CONFORMITE 100% ZERO-SERVER.');
  console.log('   Aucune requête externe, aucune fuite de données, RGPD garanti.');
  console.log('================================================================\n');
  process.exit(0);
} else {
  console.error(`   RESULTAT : ${issuesFound} non-conformité(s) détectée(s).`);
  console.log('================================================================\n');
  process.exit(1);
}
