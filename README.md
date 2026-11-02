# SafeFace Zero 🛡️

> **Application web 100% statique et "Zero-Server" pour l'anonymisation locale et la protection de la vie privée des mineurs sur images, vidéos et archives ZIP.**

[![Conforme RGPD](https://img.shields.io/badge/RGPD-100%25%20Conforme%20Art.%2025%20%26%2032-emerald?style=flat-square)](https://github.com/bastien-fremondiere/safe-face-zero)
[![Zero-Server](https://img.shields.io/badge/Architecture-Zero--Server%20%2F%20Client--Side-blue?style=flat-square)](https://github.com/bastien-fremondiere/safe-face-zero)
[![WebAssembly](https://img.shields.io/badge/Moteur-FFmpeg.wasm%20%2B%20Face--API-indigo?style=flat-square)](https://github.com/bastien-fremondiere/safe-face-zero)
[![Licence MIT](https://img.shields.io/badge/License-MIT-slate?style=flat-square)](LICENSE)

---

## 🌟 Points Clés & Garanties de Confidentialité

- 🔒 **100% Zero-Server & Conforme RGPD** : Aucun pixel, image, métadonnée ou vidéo n'est envoyé à un serveur tiers. L'ensemble des calculs (réseaux de neurones pour l'estimation d'âge et transcodage vidéo) s'exécute exclusivement en local dans la mémoire vive de votre navigateur.
- 👶 **Protection intelligente des mineurs** : Détection automatique des visages avec classification d'âge (seuil ajustable de 3 à 25 ans, par défaut 16 ans).
- 🎬 **Support universel de tous les formats vidéo** : Traitement frame-par-frame avec réassemblage H.264 et préservation de la piste audio synchronisée via **FFmpeg.wasm (multithreadé / SharedArrayBuffer)**.
- 📦 **Support universel des archives ZIP** : Décompression locale, routage automatique vers les pipelines d'image et vidéo, et reconstitution d'une archive `.zip` anonymisée.
- 🎨 **3 Modes de masquage** :
  1. **Flou gaussien** (rayon réglable de 10 à 60 px).
  2. **Logo / Sticker personnalisé** (import PNG/SVG/JPG ou sticker bouclier par défaut).
  3. **Hybride** (Flou gaussien haute densité + sticker centré par-dessus).
- 🏷️ **Filigrane global (Watermark)** : Incrustation optionnelle de watermark avec choix de la position (4 coins ou centre), échelle et opacité.

---

## 🏗️ Stack Technique & Architecture

| Rôle | Technologie |
| :--- | :--- |
| **Framework UI** | React 18+ (Hooks modernes), TypeScript (strict mode) |
| **Build & Dev Server** | Vite 5+ avec middlewares d'isolation COOP/COEP |
| **Style & Design** | Tailwind CSS, Lucide React, primitives shadcn/ui |
| **Moteur IA Vision** | `@vladmandic/face-api` (TinyFaceDetector + AgeGenderNet via WebGL) |
| **Transcodage Vidéo** | `@ffmpeg/ffmpeg` (v0.12+) + `@ffmpeg/util` (WebAssembly multithreadé / SharedArrayBuffer) |
| **Gestion des archives** | `jszip`, `file-saver` |

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js (dernière version LTS, v20 ou v22 recommandée).
- npm, pnpm ou yarn.

### Installation
```bash
# Cloner le dépôt
git clone https://github.com/bastien-fremondiere/safe-face-zero.git
cd safe-face-zero

# Installer les dépendances
npm install
```

### Développement local
```bash
npm run dev
```
> Le script `predev` synchronise automatiquement les modèles neuronaux et binaires FFmpeg dans `public/`.
> Le serveur local démarre avec les en-têtes nécessaires :
> `Cross-Origin-Embedder-Policy: require-corp`
> `Cross-Origin-Opener-Policy: same-origin`

### Test d'audit Zero-Server
Un script automatisé valide l'absence totale de fuites ou de dépendances distantes :
```bash
npm run check:zero-server
```

### Build pour la production
```bash
npm run build
```
Les fichiers statiques optimisés sont générés dans le dossier `dist/`.

---

## 📁 Structure du Projet

```
safe-face-zero/
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD déploiement GitHub Pages
├── public/
│   ├── _headers                  # En-têtes COOP/COEP pour Cloudflare Pages
│   ├── ffmpeg/                   # Binaires WebAssembly FFmpeg (multithread & fallback)
│   ├── models/                   # Modèles IA TinyFaceDetector + AgeGenderNet
│   └── shield.svg                # Favicon applicatif
├── scripts/
│   ├── fetch-models.mjs          # Synchronisation des modèles IA & binaires WASM
│   └── verify-zero-server.mjs    # Audit de conformité Zero-Server
├── src/
│   ├── components/
│   │   ├── DropZone.tsx          # Zone Drag & Drop universelle
│   │   ├── MediaQueue.tsx        # File d'attente visuelle & export ZIP
│   │   ├── PreviewModal.tsx      # Comparateur interactif avant/après
│   │   ├── SettingsPanel.tsx     # Règles de masquage, seuils, logos
│   │   └── TrustBanner.tsx       # Indicateurs RGPD et statut des moteurs
│   ├── hooks/
│   │   ├── useFaceApi.ts         # Inférence IA WebGL
│   │   ├── useFFmpeg.ts          # Moteur FFmpeg.wasm
│   │   └── useMediaProcessor.ts  # Orchestrateur universel
│   ├── types/
│   │   └── index.ts              # Définitions TypeScript
│   ├── utils/
│   │   ├── canvasMasker.ts       # Moteur graphique pur & masquage
│   │   └── zipHandler.ts         # Gestionnaire d'archives ZIP
│   ├── App.tsx                   # Interface principale
│   ├── index.css                 # Configuration Tailwind CSS
│   └── main.tsx                  # Point d'entrée React
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vercel.json                   # En-têtes COOP/COEP pour Vercel
└── vite.config.ts                # Configuration Vite + Headers COOP/COEP
```

---

## 🌐 Déploiement Statique

SafeFace Zero est une application **100% statique**. Elle ne nécessite aucun serveur applicatif (Node, Python ou PHP).

### Déploiement sur Cloudflare Pages
Le fichier `public/_headers` est automatiquement pris en charge par Cloudflare Pages pour injecter les en-têtes d'isolation multithread.

### Déploiement sur Vercel
Le fichier `vercel.json` applique les en-têtes `Cross-Origin-Embedder-Policy` et `Cross-Origin-Opener-Policy` sur toutes les routes.

### Déploiement sur GitHub Pages
Le workflow prêt à l'emploi `.github/workflows/deploy.yml` compile automatiquement l'application et la déploie sur GitHub Pages lors de chaque push sur la branche `main`.

---

## ⚖️ Licence & Conformité

Distribué sous licence **MIT**.
Ce projet est conçu pour aider les associations, écoles, collectivités et particuliers à respecter le **Règlement Général sur la Protection des Données (RGPD - Articles 25 et 32)** lors de la diffusion de photos et vidéos scolaires ou sportives.
