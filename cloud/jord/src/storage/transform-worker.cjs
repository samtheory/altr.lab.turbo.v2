"use strict";
/**
 * S0082 image render worker (worker_thread, pure JS: jpeg-js + pngjs).
 * Plain CommonJS so it loads unchanged under tsx / vitest / node.
 *
 * Input  (workerData): { bytes, format, params }
 * Output (message):    { ok: true, bytes, width, height } | { ok: false, error }
 *
 * The parent has already sniffed the format and checked header dimensions
 * against the pixel budget; the decoder memory cap here is a second guard.
 */
const { parentPort, workerData } = require("node:worker_threads");
const jpeg = require("jpeg-js");
const { PNG } = require("pngjs");

/** Per-axis weight table: for each output index, [srcStart, weights[]]. */
function axisWeights(srcOffset, srcLen, outLen) {
  const table = new Array(outLen);
  const scale = srcLen / outLen;
  for (let o = 0; o < outLen; o++) {
    if (scale > 1) {
      // Downscale: exact area (box) average with fractional edge weights.
      const a = o * scale;
      const b = (o + 1) * scale;
      const i0 = Math.floor(a);
      const i1 = Math.min(srcLen - 1, Math.ceil(b) - 1);
      const w = [];
      let sum = 0;
      for (let i = i0; i <= i1; i++) {
        const wt = Math.min(b, i + 1) - Math.max(a, i);
        w.push(wt);
        sum += wt;
      }
      for (let k = 0; k < w.length; k++) w[k] /= sum;
      table[o] = [srcOffset + i0, w];
    } else {
      // Upscale / identity: bilinear on pixel centres.
      const c = (o + 0.5) * scale - 0.5;
      const i0 = Math.max(0, Math.min(srcLen - 1, Math.floor(c)));
      const i1 = Math.min(srcLen - 1, i0 + 1);
      const f = Math.max(0, Math.min(1, c - i0));
      table[o] =
        i0 === i1 ? [srcOffset + i0, [1]] : [srcOffset + i0, [1 - f, f]];
    }
  }
  return table;
}

/**
 * Resize RGBA `src` (sw x sh) cropping to (cx,cy,cw,ch) and scaling to ow x oh.
 * Row-streaming: only one float row is held besides the output.
 */
function resize(src, sw, cx, cy, cw, ch, ow, oh) {
  const xs = axisWeights(cx, cw, ow);
  const ys = axisWeights(cy, ch, oh);
  const out = Buffer.alloc(ow * oh * 4);
  const rowAcc = new Float32Array(cw * 4);
  for (let oy = 0; oy < oh; oy++) {
    rowAcc.fill(0);
    const [ys0, yw] = ys[oy];
    for (let k = 0; k < yw.length; k++) {
      const wy = yw[k];
      const base = ((ys0 + k) * sw + cx) * 4;
      for (let i = 0; i < cw * 4; i += 4) {
        const a = src[base + i + 3] / 255;
        // premultiply so transparent pixels do not bleed colour.
        const wa = wy * a;
        rowAcc[i] += src[base + i] * wa;
        rowAcc[i + 1] += src[base + i + 1] * wa;
        rowAcc[i + 2] += src[base + i + 2] * wa;
        rowAcc[i + 3] += wy * src[base + i + 3];
      }
    }
    for (let ox = 0; ox < ow; ox++) {
      const [xs0, xw] = xs[ox];
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < xw.length; k++) {
        const j = (xs0 - cx + k) * 4;
        const wx = xw[k];
        r += rowAcc[j] * wx;
        g += rowAcc[j + 1] * wx;
        b += rowAcc[j + 2] * wx;
        a += rowAcc[j + 3] * wx;
      }
      const o = (oy * ow + ox) * 4;
      const alpha = a / 255;
      if (alpha > 0) {
        out[o] = Math.round(Math.min(255, r / alpha));
        out[o + 1] = Math.round(Math.min(255, g / alpha));
        out[o + 2] = Math.round(Math.min(255, b / alpha));
      }
      out[o + 3] = Math.round(Math.min(255, a));
    }
  }
  return out;
}

function plan(sw, sh, p) {
  // Returns crop rect + output size.
  let w = p.w;
  let h = p.h;
  if (w > 0 && h > 0) {
    if (p.fit === "fill") return { cx: 0, cy: 0, cw: sw, ch: sh, ow: w, oh: h };
    if (p.fit === "cover") {
      const targetAspect = w / h;
      const srcAspect = sw / sh;
      let cw = sw;
      let ch = sh;
      if (srcAspect > targetAspect) cw = Math.max(1, Math.round(sh * targetAspect));
      else ch = Math.max(1, Math.round(sw / targetAspect));
      return {
        cx: Math.floor((sw - cw) / 2),
        cy: Math.floor((sh - ch) / 2),
        cw,
        ch,
        ow: w,
        oh: h,
      };
    }
    // contain: fit inside the box, keep aspect, no padding.
    const s = Math.min(w / sw, h / sh);
    return {
      cx: 0, cy: 0, cw: sw, ch: sh,
      ow: Math.max(1, Math.round(sw * s)),
      oh: Math.max(1, Math.round(sh * s)),
    };
  }
  if (w > 0) h = Math.max(1, Math.round((sh * w) / sw));
  else w = Math.max(1, Math.round((sw * h) / sh));
  return { cx: 0, cy: 0, cw: sw, ch: sh, ow: w, oh: h };
}

let stage = "decode";
try {
  const { bytes, format, params } = workerData;
  const buf = Buffer.from(bytes);
  let rgba;
  let sw;
  let sh;
  stage = "decode";
  if (format === "jpeg") {
    const d = jpeg.decode(buf, {
      useTArray: true,
      formatAsRGBA: true,
      maxMemoryUsageInMB: 512,
      maxResolutionInMP: 16,
    });
    rgba = d.data; sw = d.width; sh = d.height;
  } else {
    const d = PNG.sync.read(buf);
    rgba = d.data; sw = d.width; sh = d.height;
  }
  stage = "render";
  const pl = plan(sw, sh, params);
  const pix = resize(rgba, sw, pl.cx, pl.cy, pl.cw, pl.ch, pl.ow, pl.oh);
  let outBytes;
  if (params.fm === "jpeg") {
    // JPEG has no alpha: flatten over white.
    for (let i = 0; i < pix.length; i += 4) {
      const a = pix[i + 3] / 255;
      pix[i] = Math.round(pix[i] * a + 255 * (1 - a));
      pix[i + 1] = Math.round(pix[i + 1] * a + 255 * (1 - a));
      pix[i + 2] = Math.round(pix[i + 2] * a + 255 * (1 - a));
      pix[i + 3] = 255;
    }
    outBytes = jpeg.encode({ data: pix, width: pl.ow, height: pl.oh }, params.q).data;
  } else {
    const png = new PNG({ width: pl.ow, height: pl.oh });
    pix.copy(png.data);
    outBytes = PNG.sync.write(png);
  }
  const out = new Uint8Array(outBytes);
  parentPort.postMessage(
    { ok: true, bytes: out, width: pl.ow, height: pl.oh },
    [out.buffer],
  );
} catch (err) {
  parentPort.postMessage({
    ok: false,
    stage,
    error: err && err.message ? String(err.message) : "render failed",
  });
}
