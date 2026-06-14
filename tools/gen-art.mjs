/**
 * gen-art.mjs — generate every game sprite/material via OpenAI gpt-image-2
 * at maximum quality, on a flat magenta chroma background (keyed out later).
 *
 * Shared art-direction template keeps the whole game visually coherent with the
 * world + story: a lone survivor drives a fortified scrap vehicle across a
 * sun-scorched zombie wasteland toward an evac helicopter.
 *
 * Usage:  node tools/gen-art.mjs            (skips assets already generated)
 *         node tools/gen-art.mjs --force    (regenerate everything)
 *
 * Output: tools/art-raw/<key>.png  + tools/art-raw/_progress.log
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'art-raw');
fs.mkdirSync(OUT, { recursive: true });
const FORCE = process.argv.includes('--force');

// --- API key (OpenClaw openai provider; same key the image-gen skill uses) ---
function readKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const j = JSON.parse(fs.readFileSync(path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw', 'openclaw.json'), 'utf8'));
  return j?.models?.providers?.openai?.apiKey;
}
const KEY = readKey();
if (!KEY) {
  console.error('No OpenAI API key found');
  process.exit(1);
}

const MODEL = 'gpt-image-2';

// Shared style template — prepended to every SPRITE prompt for consistency.
const STYLE =
  'Single video-game asset sprite for a 2D side-scrolling post-apocalyptic ' +
  'zombie survival driving game called "Earn to Die: Evac Run". ' +
  'Consistent art direction across all assets: gritty, semi-realistic, ' +
  'hand-painted AAA 2D game art; a sun-scorched dusty wasteland palette of ' +
  'rust orange, sun-bleached steel, bone, dried blood and grime; dramatic ' +
  'warm low-sun rim lighting from the upper-left; high detail, bold readable ' +
  'silhouette. Strict orthographic SIDE view. The subject is isolated on a ' +
  'perfectly flat uniform solid magenta background (pure #FF00FF) with no ' +
  'gradient, no scenery, no ground line, no cast shadow, no text and no ' +
  'watermark; subject fully inside frame and centered.';

// Shared style for opaque, tileable ground MATERIALS.
const MAT_STYLE =
  'Seamless perfectly tileable texture for a post-apocalyptic game, ' +
  'photographic top-down flat-lit detail, no objects, no text, no seams.';

const SPRITES = [
  // --- Vehicles: BODY ONLY (wheels are separate rotating sprites) ---
  ['veh-truck-body', '1536x1024',
    "the survivor's main rig: a battered four-door pickup truck, rust-red paint, " +
    'welded scrap-metal side plating, a roll cage, and a spiked steel front ram. ' +
    'Render the vehicle BODY ONLY with the WHEELS AND TYRES COMPLETELY REMOVED, ' +
    'leaving empty round wheel arches. Side profile facing right, whole body centered.'],
  ['veh-muscle-body', '1536x1024',
    'a menacing post-apocalyptic muscle car, matte steel-blue with rust streaks, ' +
    'aggressive hood scoop, side exhaust stacks, reinforced fenders and a small ' +
    'spoiler. Render the BODY ONLY, NO wheels and NO tyres, empty wheel wells. ' +
    'Side profile facing right, centered.'],
  ['veh-rig-body', '1536x1024',
    'a massive armored "war rig" heavy-truck cab plated in riveted steel armor ' +
    'with welded spikes and a heavy battering ram on the front. Render the BODY ' +
    'ONLY, NO wheels and NO tyres, empty wheel wells. Side profile facing right, centered.'],
  ['wheel', '1024x1024',
    'a single heavy off-road monster-truck tyre with a rusty steel rim and lug ' +
    'nuts, mud-caked aggressive chunky tread, viewed perfectly straight-on from ' +
    'the side as a circle, centered, filling most of the frame.'],

  // --- Zombies (NPCs) ---
  ['zombie-walker', '1024x1024',
    'a gaunt shambling zombie in torn filthy clothes, rotting grey-green skin, ' +
    'arms reaching forward, caught mid-stride walking toward the right, full body side view.'],
  ['zombie-brute', '1024x1024',
    'a huge hulking mutated zombie brute, massively muscular swollen grey-green ' +
    'torso, exposed bone and sinew, tiny head, lumbering toward the right, ' +
    'intimidating, full body side view.'],
  ['zombie-crawler', '1024x1024',
    'a legless crawling zombie dragging itself forward on rotten arms, low to the ' +
    'ground, torn flesh and exposed ribs, grey-green, side view facing right.'],

  // --- Pickups / objects ---
  ['fuelcan', '1024x1024',
    'a dented weathered red steel jerry can fuel canister with a yellow cap and a ' +
    'side handle, a little rust, centered.'],
  ['cashbag', '1024x1024',
    'a fat bundle of dirty banknotes bound with a leather strap beside a small ' +
    'burlap sack spilling cash, grimy, centered.'],
  ['rock', '1024x1024',
    'a large rugged grey granite boulder, cracked and weathered with dust, a road ' +
    'hazard, centered.'],
  ['wreck', '1536x1024',
    'a burnt-out gutted car wreck, collapsed rusted shell, blackened and stripped, ' +
    'sitting as a roadside obstacle, side profile, centered.'],
  ['ramp', '1536x1024',
    'a makeshift launch ramp built from rusty scrap-metal sheets and wooden planks ' +
    'painted with yellow-and-black hazard stripes, a solid wedge that is low on ' +
    'the LEFT and rises to a high lip on the RIGHT, side profile, centered.'],
  ['gun', '1024x1024',
    'a roof-mounted heavy machine-gun turret, gritty welded military hardware, ' +
    'ammo belt, the barrel pointing to the right, compact, side view, centered.'],
  ['armor', '1536x1024',
    'a bolt-on reinforced steel ram bar / armor plate with welded spikes and ' +
    'rivets, rusty battered metal, a horizontal vehicle attachment, side view, centered.'],
  ['evac', '1536x1024',
    'a weathered military rescue helicopter with camo paint, spinning rotor, tail ' +
    'rotor and landing skids — the survivor\'s escape — hovering, side view facing ' +
    'left, centered.'],
];

const MATERIALS = [
  ['mat-dirt', '1024x1024',
    'cracked dry desert dirt and gravel ground, muted dusty brown, gritty.'],
  ['mat-rock', '1024x1024',
    'cracked asphalt and broken concrete road surface, dark grey, oil stains and grime.'],
  ['mat-snow', '1024x1024',
    'dirty trampled snow over frozen rocky ground, off-white with grey slush and grit.'],
];

async function generate(key, size, prompt, opaque) {
  const body = {
    model: MODEL,
    prompt,
    size,
    quality: 'high',
    output_format: 'png',
    n: 1,
  };
  if (!opaque) {
    // gpt-image-2 has no transparent mode; magenta is keyed out in post.
  }
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new Error('no image data');
  return Buffer.from(b64, 'base64');
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(path.join(OUT, '_progress.log'), line);
  console.log(msg);
}

async function withRetry(fn, label, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const wait = 4000 * (i + 1);
      log(`RETRY ${label} (${i + 1}/${tries}) after error: ${String(e.message).slice(0, 120)} — waiting ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

async function pool(items, worker, concurrency) {
  const queue = [...items];
  const runners = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(runners);
}

(async () => {
  const jobs = [
    ...SPRITES.map(([key, size, p]) => ({ key, size, prompt: `${STYLE} SUBJECT: ${p}`, opaque: false })),
    ...MATERIALS.map(([key, size, p]) => ({ key, size, prompt: `${MAT_STYLE} ${p}`, opaque: true })),
  ];
  log(`Starting art generation: ${jobs.length} assets via ${MODEL} (quality:high)`);
  let done = 0;
  let failed = 0;
  await pool(
    jobs,
    async (job) => {
      const outPath = path.join(OUT, `${job.key}.png`);
      if (!FORCE && fs.existsSync(outPath)) {
        log(`SKIP ${job.key} (exists)`);
        done++;
        return;
      }
      try {
        const t0 = Date.now();
        const buf = await withRetry(() => generate(KEY, job.size, job.prompt, job.opaque), job.key);
        fs.writeFileSync(outPath, buf);
        done++;
        log(`OK   ${job.key}  ${buf.length} bytes  ${Date.now() - t0}ms  (${done}/${jobs.length})`);
      } catch (e) {
        failed++;
        log(`FAIL ${job.key}: ${String(e.message).slice(0, 160)}`);
      }
    },
    3,
  );
  log(`DONE. ok=${done} failed=${failed}`);
})();
