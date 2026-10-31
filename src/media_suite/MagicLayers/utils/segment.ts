import type { ImageLayer } from '../types';

/* =========================================================
   K-MEANS COLOUR SEGMENTATION

   Clustering runs on a bounded copy of the image in CIELAB space
   (perceptually uniform, so "similar looking" colours group together)
   and the final assignment is done at full working resolution with a
   soft alpha on cluster boundaries. That produces anti-aliased layer
   masks instead of the jagged edges you get from hard nearest-colour
   assignment.

   Everything is deterministic for a given image + cluster count so the
   same input always produces the same layers.
   ========================================================= */

export const MAX_WORK_EDGE = 900;
const MAX_SAMPLES = 14000;
const ITERATIONS = 14;
const ALPHA_GAIN = 2.2;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const toHex = (r: number, g: number, b: number) =>
  '#' +
  [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/* ---------- sRGB → CIELAB (D65) ---------- */

const pivotRgb = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const pivotXyz = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);

/** Writes L, a, b (0-100, ~-128..127) into `out` at `offset`. */
function rgbToLab(r: number, g: number, b: number, out: Float32Array, offset: number) {
  const rl = pivotRgb(r);
  const gl = pivotRgb(g);
  const bl = pivotRgb(b);

  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  const z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;

  const fx = pivotXyz(x);
  const fy = pivotXyz(y);
  const fz = pivotXyz(z);

  out[offset] = 116 * fy - 16;
  out[offset + 1] = 500 * (fx - fy);
  out[offset + 2] = 200 * (fy - fz);
}

/* ---------- colour naming ---------- */

function colorName(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const sat = max === min ? 0 : (max - min) / (max + min > 255 ? 510 - max - min : max + min);

  if (sat < 0.12) {
    if (l < 0.12) return 'Near Black';
    if (l < 0.32) return 'Charcoal';
    if (l < 0.55) return 'Slate Grey';
    if (l < 0.78) return 'Silver Grey';
    if (l < 0.93) return 'Light Grey';
    return 'Near White';
  }

  let hue: number;
  if (max === min) hue = 0;
  else if (max === r) hue = ((g - b) / (max - min) + 6) % 6;
  else if (max === g) hue = (b - r) / (max - min) + 2;
  else hue = (r - g) / (max - min) + 4;
  hue *= 60;

  const tone = l < 0.28 ? 'Deep' : l > 0.78 ? 'Pale' : '';
  const family =
    hue < 15 || hue >= 345
      ? 'Red'
      : hue < 40
      ? 'Orange'
      : hue < 65
      ? 'Amber'
      : hue < 95
      ? 'Lime'
      : hue < 150
      ? 'Green'
      : hue < 185
      ? 'Teal'
      : hue < 215
      ? 'Cyan'
      : hue < 255
      ? 'Blue'
      : hue < 285
      ? 'Indigo'
      : hue < 320
      ? 'Purple'
      : hue < 345
      ? 'Magenta'
      : 'Red';

  return tone ? `${tone} ${family}` : family;
}

/* ---------- k-means++ ---------- */

function initCentroids(
  samples: Float32Array,
  count: number,
  k: number,
  rng: () => number,
): Float64Array {
  const centroids = new Float64Array(k * 3);
  const first = Math.floor(rng() * count);
  centroids[0] = samples[first * 3];
  centroids[1] = samples[first * 3 + 1];
  centroids[2] = samples[first * 3 + 2];

  const dists = new Float64Array(count).fill(Infinity);

  for (let c = 1; c < k; c++) {
    let total = 0;
    for (let i = 0; i < count; i++) {
      const dl = samples[i * 3] - centroids[(c - 1) * 3];
      const da = samples[i * 3 + 1] - centroids[(c - 1) * 3 + 1];
      const db = samples[i * 3 + 2] - centroids[(c - 1) * 3 + 2];
      const d = dl * dl + da * da + db * db;
      if (d < dists[i]) dists[i] = d;
      total += dists[i];
    }
    if (total <= 0) {
      // Degenerate (flat image) — clone an existing centroid.
      centroids[c * 3] = centroids[0] + c * 0.5;
      centroids[c * 3 + 1] = centroids[1];
      centroids[c * 3 + 2] = centroids[2];
      continue;
    }
    let target = rng() * total;
    let picked = count - 1;
    for (let i = 0; i < count; i++) {
      target -= dists[i];
      if (target <= 0) {
        picked = i;
        break;
      }
    }
    centroids[c * 3] = samples[picked * 3];
    centroids[c * 3 + 1] = samples[picked * 3 + 1];
    centroids[c * 3 + 2] = samples[picked * 3 + 2];
  }

  return centroids;
}

function runKMeans(
  samples: Float32Array,
  count: number,
  k: number,
  onIteration: (done: number, totalIterations: number) => void,
): Float64Array {
  const rng = createRng(0x9e3779b9);
  const centroids = initCentroids(samples, count, k, rng);
  const sums = new Float64Array(k * 3);
  const counts = new Int32Array(k);

  for (let iter = 0; iter < ITERATIONS; iter++) {
    sums.fill(0);
    counts.fill(0);

    for (let i = 0; i < count; i++) {
      const l = samples[i * 3];
      const a = samples[i * 3 + 1];
      const b = samples[i * 3 + 2];
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const dl = l - centroids[c * 3];
        const da = a - centroids[c * 3 + 1];
        const db = b - centroids[c * 3 + 2];
        const d = dl * dl + da * da + db * db;
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      sums[best * 3] += l;
      sums[best * 3 + 1] += a;
      sums[best * 3 + 2] += b;
      counts[best] += 1;
    }

    let moved = 0;
    for (let c = 0; c < k; c++) {
      if (!counts[c]) continue;
      const nl = sums[c * 3] / counts[c];
      const na = sums[c * 3 + 1] / counts[c];
      const nb = sums[c * 3 + 2] / counts[c];
      moved += Math.abs(nl - centroids[c * 3]) + Math.abs(na - centroids[c * 3 + 1]) + Math.abs(nb - centroids[c * 3 + 2]);
      centroids[c * 3] = nl;
      centroids[c * 3 + 1] = na;
      centroids[c * 3 + 2] = nb;
    }

    onIteration(iter + 1, ITERATIONS);
    if (moved < 0.05) break;
  }

  return centroids;
}

/* ---------- main entry ---------- */

export async function segmentImageIntoLayers(
  image: HTMLImageElement,
  numClusters: number,
  onProgress: (percentage: number) => void,
): Promise<ImageLayer[]> {
  const k = Math.max(2, Math.min(16, Math.round(numClusters || 6)));
  const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  onProgress(4);
  await yieldToUi();

  const naturalW = image.naturalWidth || image.width;
  const naturalH = image.naturalHeight || image.height;
  if (!naturalW || !naturalH) throw new Error('Image has no dimensions.');

  const scale = Math.min(1, MAX_WORK_EDGE / Math.max(naturalW, naturalH));
  const width = Math.max(2, Math.round(naturalW * scale));
  const height = Math.max(2, Math.round(naturalH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(image, 0, 0, width, height);
  const source = ctx.getImageData(0, 0, width, height);
  const pixels = source.data;
  const pixelCount = width * height;

  onProgress(12);
  await yieldToUi();

  // Convert every pixel to LAB once.
  const lab = new Float32Array(pixelCount * 3);
  const opaqueIndices: number[] = [];
  for (let i = 0; i < pixelCount; i++) {
    const p = i * 4;
    if (pixels[p + 3] < 8) continue;
    opaqueIndices.push(i);
    rgbToLab(pixels[p], pixels[p + 1], pixels[p + 2], lab, i * 3);
  }

  if (opaqueIndices.length === 0) throw new Error('Image is fully transparent.');

  onProgress(18);
  await yieldToUi();

  // Sample subset for the (expensive) clustering iterations.
  const stride = Math.max(1, Math.floor(opaqueIndices.length / MAX_SAMPLES));
  const sampleCount = Math.ceil(opaqueIndices.length / stride);
  const samples = new Float32Array(sampleCount * 3);
  for (let s = 0, i = 0; i < opaqueIndices.length; i += stride, s++) {
    const idx = opaqueIndices[i];
    samples[s * 3] = lab[idx * 3];
    samples[s * 3 + 1] = lab[idx * 3 + 1];
    samples[s * 3 + 2] = lab[idx * 3 + 2];
  }

  const centroids = runKMeans(samples, sampleCount, k, (done, totalIterations) => {
    onProgress(18 + (done / totalIterations) * 42);
  });

  onProgress(62);
  await yieldToUi();

  // Full-resolution assignment with soft boundary alpha.
  const masks: Uint8ClampedArray[] = [];
  for (let c = 0; c < k; c++) masks.push(new Uint8ClampedArray(pixelCount * 4));

  const clusterCounts = new Int32Array(k);
  const rgbSums = new Float64Array(k * 3);

  for (let oi = 0; oi < opaqueIndices.length; oi++) {
    const i = opaqueIndices[oi];
    const l = lab[i * 3];
    const a = lab[i * 3 + 1];
    const b = lab[i * 3 + 2];

    let best = 0;
    let second = 0;
    let bestDist = Infinity;
    let secondDist = Infinity;
    for (let c = 0; c < k; c++) {
      const dl = l - centroids[c * 3];
      const da = a - centroids[c * 3 + 1];
      const db = b - centroids[c * 3 + 2];
      const d = dl * dl + da * da + db * db;
      if (d < bestDist) {
        secondDist = bestDist;
        second = best;
        bestDist = d;
        best = c;
      } else if (d < secondDist) {
        secondDist = d;
        second = c;
      }
    }

    const p = i * 4;
    const r = pixels[p];
    const g = pixels[p + 1];
    const bCh = pixels[p + 2];
    const srcAlpha = pixels[p + 3] / 255;

    // Anti-aliasing strategy:
    //  - the dominant cluster is ALWAYS fully opaque, which guarantees the
    //    stacked composite covers every pixel (no seams, no white bleed),
    //  - the runner-up cluster receives a feather (0 → 0.5) proportional to how
    //    ambiguous the pixel is, so a layer exported on its own still has a
    //    soft silhouette.
    // Overlapping shares cannot tint the composite because every mask keeps the
    // ORIGINAL pixel colour rather than its cluster centroid.
    let feather = 0;
    if (bestDist > 0 && isFinite(secondDist) && secondDist > 0) {
      const margin = (secondDist - bestDist) / (secondDist + bestDist);
      const confidence = clamp01(margin * ALPHA_GAIN);
      feather = (1 - Math.pow(confidence, 0.85)) * 0.5;
    }

    const mask = masks[best];
    mask[p] = r;
    mask[p + 1] = g;
    mask[p + 2] = bCh;
    mask[p + 3] = Math.round(255 * srcAlpha);

    if (feather > 0.004) {
      const mask2 = masks[second];
      mask2[p] = r;
      mask2[p + 1] = g;
      mask2[p + 2] = bCh;
      mask2[p + 3] = Math.round(255 * feather * srcAlpha);
    }

    // Colour statistics follow the dominant assignment so palette swatches
    // stay true to what the eye reads in that region.
    clusterCounts[best] += 1;
    rgbSums[best * 3] += r;
    rgbSums[best * 3 + 1] += g;
    rgbSums[best * 3 + 2] += bCh;

    if (oi % 60000 === 0) onProgress(62 + (oi / opaqueIndices.length) * 30);
  }

  onProgress(94);
  await yieldToUi();

  const layers: ImageLayer[] = [];
  for (let c = 0; c < k; c++) {
    const count = clusterCounts[c];
    if (!count) continue;

    const mr = rgbSums[c * 3] / count;
    const mg = rgbSums[c * 3 + 1] / count;
    const mb = rgbSums[c * 3 + 2] / count;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) continue;
    const imgData = new ImageData(masks[c], width, height);
    maskCtx.putImageData(imgData, 0, 0);

    layers.push({
      id: `layer-${c}-${Date.now().toString(36)}`,
      name: colorName(mr, mg, mb),
      dataUrl: maskCanvas.toDataURL('image/png'),
      color: [Math.round(mr), Math.round(mg), Math.round(mb)],
      colorHex: toHex(mr, mg, mb),
      percentage: (count / opaqueIndices.length) * 100,
      visible: true,
    });
  }

  // Largest component first — the sky/background tends to land at the bottom
  // of the stack, which matches what people expect from a layers panel.
  layers.sort((a, b) => b.percentage - a.percentage);

  onProgress(100);
  return layers;
}
