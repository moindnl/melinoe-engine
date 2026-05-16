import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('static/icon.svg');

await sharp(svg).resize(192, 192).png().toFile('static/icon-192.png');
await sharp(svg).resize(512, 512).png().toFile('static/icon-512.png');
await sharp(svg).resize(180, 180).png().toFile('static/apple-touch-icon.png');

const ogSvg = readFileSync('static/og-image.svg');
await sharp(ogSvg).resize(1200, 630).png().toFile('static/og-image.png');

console.log('Icons + OG image generated.');
