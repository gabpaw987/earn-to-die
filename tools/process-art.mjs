/**
 * process-art.mjs — turn raw gpt-image-2 renders into game-ready sprites.
 *
 * For SPRITES (magenta chroma bg): edge flood-fill removes the background
 * magenta (so magenta-ish pixels INSIDE the subject survive), a light despill
 * removes the pink fringe, then the result is auto-cropped to the subject and
 * downscaled. For MATERIALS (mat-*): just downscale (kept opaque + tileable).
 *
 * raw:  tools/art-raw/<key>.png   ->   out: public/sprites/<key>.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jimp } from 'jimp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, 'art-raw');
const OUT = path.join(__dirname, '..', 'public', 'sprites');
fs.mkdirSync(OUT, { recursive: true });

const MAX_DIM = 512; // downscale cap for the longest side

// Magenta chroma test. This game's palette (rust/steel/bone/green) contains no
// real magenta, so global removal is safe and also clears magenta the model
// painted INTO enclosed areas (e.g. window glass), which a border flood-fill
// can't reach. Rust = high R / low B (fails b test); green zombie = low R.
function isMagenta(r, g, b) {
  return r > 120 && b > 120 && g < r - 38 && g < b - 38;
}

function keyOutBackground(img) {
  const { width: w, height: h, data } = img.bitmap;
  const isBg = new Uint8Array(w * h);

  // 1) Global magenta removal.
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (isMagenta(data[i], data[i + 1], data[i + 2])) {
      isBg[p] = 1;
      data[i + 3] = 0;
    }
  }

  // 2) Despill kept pixels that lean pink (magenta spill on edges).
  for (let p = 0; p < w * h; p++) {
    if (isBg[p]) continue;
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > g && b > g) {
      const cap = g + 16;
      if (r > cap) data[i] = Math.round((r + cap) / 2);
      if (b > cap) data[i + 2] = Math.round((b + cap) / 2);
    }
  }

  // 3) Feather: opaque pixels touching transparent get softened alpha.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (isBg[p]) continue;
      const i = p * 4;
      const edge =
        (x > 0 && isBg[p - 1]) || (x < w - 1 && isBg[p + 1]) ||
        (y > 0 && isBg[p - w]) || (y < h - 1 && isBg[p + w]);
      if (edge) data[i + 3] = Math.min(data[i + 3], 210);
    }
  }
}

function autoCrop(img, pad = 6) {
  const { width: w, height: h, data } = img.bitmap;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return; // fully transparent — leave as is
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
  img.crop({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
}

function downscale(img) {
  const { width: w, height: h } = img.bitmap;
  const longest = Math.max(w, h);
  if (longest <= MAX_DIM) return;
  const s = MAX_DIM / longest;
  img.resize({ w: Math.round(w * s), h: Math.round(h * s) });
}

const files = fs.readdirSync(RAW).filter((f) => f.endsWith('.png'));
if (!files.length) {
  console.error('No raw art in', RAW);
  process.exit(1);
}

let ok = 0;
for (const f of files) {
  const key = f.replace(/\.png$/, '');
  try {
    const img = await Jimp.read(path.join(RAW, f));
    if (!key.startsWith('mat-')) {
      keyOutBackground(img);
      autoCrop(img);
    }
    downscale(img);
    const outPath = path.join(OUT, `${key}.png`);
    await img.write(outPath);
    ok++;
    console.log(`processed ${key}  -> ${img.bitmap.width}x${img.bitmap.height}`);
  } catch (e) {
    console.log(`FAIL ${key}: ${String(e.message).slice(0, 160)}`);
  }
}
console.log(`done: ${ok}/${files.length}`);
