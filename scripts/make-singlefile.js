#!/usr/bin/env node
// Create a single-file, no service-worker version of dist/index.html
// Usage: node scripts/make-singlefile.js [distPath]
import fs from 'fs';
import path from 'path';

const distPath = process.argv[2] || 'dist';
const indexPath = path.join(distPath, 'index.html');
const iconPath = path.join(distPath, 'app-icon.svg');
const outPath = path.join(distPath, 'index-standalone.html');

if (!fs.existsSync(indexPath)) {
  console.error('No index.html found in', distPath);
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Remove vite-plugin-pwa registration script tags and manifest link
html = html.replace(/<link[^>]*rel="manifest"[^>]*>\s*/g, '');
html = html.replace(/<script[^>]*id="vite-plugin-pwa:register-sw"[^>]*><\/script>\s*/g, '');
// Remove any explicit script registration for ./registerSW.js
html = html.replace(/<script[^>]*src="\.\/registerSW.js"[^>]*><\/script>\s*/g, '');

// Inline app-icon.svg if exists
if (fs.existsSync(iconPath)) {
  const svg = fs.readFileSync(iconPath, 'utf8');
  const encoded = encodeURIComponent(svg.replace(/\n|\r/g, ''));
  // Replace icon links with data URI
  html = html.replace(
    /<link[^>]*rel="icon"[^>]*href="[^"]*app-icon.svg"[^>]*>/g,
    `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,${encoded}" />`
  );
  html = html.replace(
    /<link[^>]*rel="apple-touch-icon"[^>]*href="[^"]*app-icon.svg"[^>]*>/g,
    `<link rel="apple-touch-icon" href="data:image/svg+xml;utf8,${encoded}" />`
  );
}

// Remove any references to sw.js and registerSW.js in the HTML
html = html.replace(/\.?\/sw.js/g, '');
html = html.replace(/\.?\/registerSW.js/g, '');

// Save output
fs.writeFileSync(outPath, html, 'utf8');
console.log('Wrote', outPath);
