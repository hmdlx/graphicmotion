#!/usr/bin/env node
// Convert a WOFF/TTF font into a three.js typeface JSON (for TextGeometry),
// keeping only the given characters.
//
//   node scripts/make_typeface.mjs <font.woff> <out.json> "<characters>"
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
globalThis.opentype = require('opentype.js');
const { TTFLoader } = await import('three/examples/jsm/loaders/TTFLoader.js');

const [src, out, chars] = process.argv.slice(2);
const buf = fs.readFileSync(src);
const json = new TTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const keep = new Set([...chars, ' ']);
json.glyphs = Object.fromEntries(Object.entries(json.glyphs).filter(([c]) => keep.has(c)));
delete json.original_font_information;
fs.writeFileSync(out, JSON.stringify(json));
console.log(`${Object.keys(json.glyphs).length} glyphs -> ${out}`);
