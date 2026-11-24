import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createCanvas } from 'canvas';

const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

const pdfPath = path.resolve('assets/img/product/lunore-lab-certificate.pdf');
const outPng = path.resolve('assets/img/badges/lab-cert-page1.png');
const outWebp = path.resolve('assets/img/badges/lab-cert-page1.webp');

const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
const page = await doc.getPage(1);
const viewport = page.getViewport({ scale: 2 });
const canvas = createCanvas(viewport.width, viewport.height);
const ctx = canvas.getContext('2d');
await page.render({ canvasContext: ctx, viewport }).promise;
fs.writeFileSync(outPng, canvas.toBuffer('image/png'));
console.log('wrote', outPng, canvas.width, 'x', canvas.height);
console.log('convert to webp with: ffmpeg -y -i', outPng, '-c:v libwebp -quality 82', outWebp);
