/* Atelier Gapette — built from assets/src (tools/build.mjs). */
(() => {
  // ../assets/src/customization.js
  async function decodeImageFile(file) {
    if (!file) throw new Error("Choisissez une image.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choisissez une image JPG, PNG ou WebP.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Cette image d\xE9passe 10 Mo. Choisissez un fichier plus l\xE9ger.");
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      throw new Error("Cette image ne peut pas \xEAtre lue. Essayez un autre fichier JPG, PNG ou WebP.");
    }
    try {
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return { width: canvas.width, height: canvas.height, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
    } finally {
      bitmap.close();
    }
  }
  function sampleUploadedImage(image, u, v, settings, base) {
    const zoom = settings.scale / 100, side = Math.min(image.width, image.height) / zoom;
    const cx = image.width / 2 + settings.x / 100 * (image.width - side) / 2;
    const cy = image.height / 2 + settings.y / 100 * (image.height - side) / 2;
    const x = Math.max(0, Math.min(image.width - 1, cx + (Math.max(0, Math.min(1, u)) - 0.5) * side));
    const y = Math.max(0, Math.min(image.height - 1, cy + (Math.max(0, Math.min(1, v)) - 0.5) * side));
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(image.width - 1, x0 + 1), y1 = Math.min(image.height - 1, y0 + 1), fx = x - x0, fy = y - y0;
    const samples = [[(y0 * image.width + x0) * 4, (1 - fx) * (1 - fy)], [(y0 * image.width + x1) * 4, fx * (1 - fy)], [(y1 * image.width + x0) * 4, (1 - fx) * fy], [(y1 * image.width + x1) * 4, fx * fy]];
    const result = [0, 0, 0];
    for (const [i, weight] of samples) {
      const alpha = image.data[i + 3] / 255;
      for (let k = 0; k < 3; k++) result[k] += (image.data[i + k] * alpha + base[k] * (1 - alpha)) * weight;
    }
    return result;
  }

  // ../assets/src/patterns.js
  var patterns = [
    { id: "peloton", name: "Peloton" },
    { id: "stripe", name: "Rayures" },
    { id: "check", name: "Damier" },
    { id: "dot", name: "Pois" },
    { id: "chevron", name: "\xC9chapp\xE9e" },
    { id: "plain", name: "Uni" },
    { id: "breton", name: "Marini\xE8re" },
    { id: "wave", name: "Ondulations" },
    { id: "confetti", name: "Confettis" },
    { id: "tartan", name: "Tartan" },
    { id: "sprint", name: "Sprint" },
    { id: "contour", name: "Topographie" }
  ];
  var palettes = [
    { id: "encre-citron", name: "Encre & citron", base: "#17343d", accent: "#d7ed71", light: "#f6f4e8" },
    { id: "bleu-creme", name: "Bleu & cr\xE8me", base: "#294cba", accent: "#f0c775", light: "#fff8e9" },
    { id: "rouge-rose", name: "Rouge & rose", base: "#b52f3e", accent: "#ffc3cc", light: "#fff0e5" },
    { id: "noir-blanc", name: "Noir & blanc", base: "#272929", accent: "#f5f5ed", light: "#929a93" },
    { id: "retro-course", name: "R\xE9tro course", base: "#692a3d", accent: "#eb9b40", light: "#f5e6be" },
    { id: "foret", name: "For\xEAt", base: "#164f43", accent: "#d3d38b", light: "#f5f3dc" },
    { id: "riviera", name: "Riviera", base: "#126f93", accent: "#f68f65", light: "#fff0d2" },
    { id: "ultraviolet", name: "Ultraviolet", base: "#3e227e", accent: "#dd80ec", light: "#c6f676" }
  ];
  var fract = (x) => x - Math.floor(x);
  var hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
  function samplePattern(pattern, u, v, region, colors) {
    if (pattern === "plain") return colors.base;
    if (pattern === "peloton") {
      if (region === 1 || region === 0 && (u < 0.35 || u > 0.65)) return colors.base;
      return u < 0.371 || u > 0.629 ? colors.light : colors.accent;
    }
    if (pattern === "breton") {
      const band = fract(v * 9);
      return band < 0.2 ? colors.accent : band > 0.68 && band < 0.76 ? colors.light : colors.base;
    }
    if (pattern === "wave") {
      const band = fract(v * 7 + 0.3 * Math.sin(u * 15));
      return band < 0.25 ? colors.accent : band > 0.46 && band < 0.56 ? colors.light : colors.base;
    }
    if (pattern === "confetti") {
      const sx = u * 13, sy = v * 11, cx = Math.floor(sx), cy = Math.floor(sy);
      const seed = hash(cx, cy), x = fract(sx) - 0.5, y = fract(sy) - 0.5;
      const angle = seed * Math.PI * 2, dx = x * Math.cos(angle) + y * Math.sin(angle), dy = -x * Math.sin(angle) + y * Math.cos(angle);
      const inside = seed < 0.5 ? Math.abs(dx) < 0.13 && Math.abs(dy) < 0.31 : dy > -0.25 && dy < 0.27 && Math.abs(dx) < (0.27 - dy) * 0.55;
      return inside ? seed < 0.5 ? colors.accent : colors.light : colors.base;
    }
    if (pattern === "tartan") {
      const x = fract(u * 7), y = fract(v * 7);
      if (Math.abs(x - 0.5) < 0.022 || Math.abs(y - 0.5) < 0.022) return colors.light;
      if (x < 0.22 || y < 0.22) return colors.accent;
      return colors.base;
    }
    if (pattern === "sprint") {
      const lane = fract((u - v * 0.7) * 5);
      return lane < 0.3 ? colors.accent : lane > 0.4 && lane < 0.46 ? colors.light : colors.base;
    }
    if (pattern === "contour") {
      const field = 2.2 * Math.sin(u * 8) + 1.2 * Math.cos(v * 7) + 0.7 * Math.sin((u + v) * 11);
      const ring = fract(field * 2.1);
      return ring < 0.07 ? Math.floor(field * 2.1) % 3 === 0 ? colors.light : colors.accent : colors.base;
    }
    let on = false;
    if (pattern === "stripe") on = fract((u - v * 0.45) * 8) < 0.43;
    else if (pattern === "check") on = (Math.floor(u * 10) + Math.floor(v * 10)) % 2 === 0;
    else if (pattern === "dot") {
      const row = Math.floor(v * 9), dx = fract(u * 10 + row % 2 * 0.5) - 0.5, dy = fract(v * 9) - 0.5;
      on = dx * dx + dy * dy < 0.045;
    } else if (pattern === "chevron") on = fract(v * 7 - Math.abs(fract(u * 3) - 0.5) * 1.5) < 0.36;
    return on ? colors.accent : colors.base;
  }
  function drawPattern(ctx, id, p, width, height) {
    const colors = Object.fromEntries(["base", "accent", "light"].map((key) => [key, [1, 3, 5].map((i) => parseInt(p[key].slice(i, i + 2), 16))]));
    const image = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const color = samplePattern(id, x / width, y / width, 0, colors), i = (y * width + x) * 4;
      image.data[i] = color[0];
      image.data[i + 1] = color[1];
      image.data[i + 2] = color[2];
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }

  // ../assets/src/product-preview.js
  var rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  var clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  var letteringAreas = {
    top: { center: [625.483848007078, 683.3437468561909], rotation: -0.2, depth: 0.68, shear: 0.16, px: 45e-5, py: -35e-5, bend: -135e-5 },
    bottom: { center: [627.5809293711, 505.252610312432], rotation: -0.39, depth: 0.9, shear: 0.08, px: 25e-5, py: 2e-4, bend: 5e-4 }
  };
  function projectDecal(view, x, y) {
    const a = letteringAreas[view], d = 1 + a.px * x + a.py * y;
    const u = (x + a.shear * y) / d, v = a.depth * y / d, c = Math.cos(a.rotation), s = Math.sin(a.rotation);
    return { x: a.center[0] + u * c - v * s, y: a.center[1] + u * s + v * c };
  }
  function unprojectDecal(view, x, y) {
    const a = letteringAreas[view], c = Math.cos(a.rotation), s = Math.sin(a.rotation);
    const dx = x - a.center[0], dy = y - a.center[1], v = (-dx * s + dy * c) / a.depth;
    const u = dx * c + dy * s - a.shear * v, d = 1 - a.px * u - a.py * v;
    return { x: u / d, y: v / d };
  }
  var VISOR = { width: 155, depth: 55, setback: 15, overhang: 4, provisional: false };
  var FACE = { top: { k: 3.73, t: -0.06, ox: 23, oy: -38 }, bottom: { k: 2.39, t: 0.04, ox: 17, oy: -18 } };
  var faceSign = (view) => view === "bottom" ? -1 : 1;
  var EM_MM = 12;
  var PXMM = 8;
  var arcR = (chord, h) => (chord * chord / 4 + h * h) / (2 * h);
  var VISOR_ARCS = (() => {
    const { width: W, depth: D, setback: S } = VISOR, ro = arcR(W, D + S), ri = arcR(W, S);
    return { outer: { cy: D / 2 - ro, r: ro }, seam: { cy: -D / 2 - ri, r: ri } };
  })();
  var visorOutline = (() => {
    const c = VISOR.width / 2, { outer: o, seam: s } = VISOR_ARCS, pts = [], n = 90;
    for (let i = 0; i <= n; i++) {
      const x = -c + 2 * c * i / n;
      pts.push([x, o.cy + Math.sqrt(o.r * o.r - x * x)]);
    }
    for (let i = n - 1; i > 0; i--) {
      const x = -c + 2 * c * i / n;
      pts.push([x, s.cy + Math.sqrt(s.r * s.r - x * x)]);
    }
    return pts;
  })();
  var underOutline = visorOutline.map(([x, y]) => [x, -y]);
  var outlineFor = (view) => view === "bottom" ? underOutline : visorOutline;
  var EDGE_BEND = -1 / (2 * (VISOR_ARCS.outer.r - VISOR.depth / 2));
  function mmToLocal(view, x, y) {
    const f2 = FACE[view], c = Math.cos(f2.t), s = Math.sin(f2.t);
    return { x: f2.ox + f2.k * (x * c - y * s), y: f2.oy + f2.k * (x * s + y * c) };
  }
  function localToMm(view, x, y) {
    const f2 = FACE[view], c = Math.cos(f2.t), s = Math.sin(f2.t), dx = (x - f2.ox) / f2.k, dy = (y - f2.oy) / f2.k;
    return { x: dx * c + dy * s, y: -dx * s + dy * c };
  }
  var mmToPhoto = (view, x, y) => {
    const l = mmToLocal(view, x, y);
    return projectDecal(view, l.x, l.y);
  };
  var photoToMm = (view, x, y) => {
    const l = unprojectDecal(view, x, y);
    return localToMm(view, l.x, l.y);
  };
  function legacyToMm(view, t) {
    const f2 = FACE[view], p = localToMm(view, t.position.x, t.position.y);
    return {
      position: { x: Math.round(p.x), y: Math.round(p.y) },
      size_percent: Math.round(t.size_percent * 41 / f2.k / EM_MM),
      rotation: Math.round(t.rotation - f2.t * 180 / Math.PI)
    };
  }
  var pxPerMm = (view) => FACE[view].k;
  function insideVisor(x, y) {
    let a = false;
    const p = visorOutline;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j];
      if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) a = !a;
    }
    return a;
  }
  function distanceToVisor(x, y) {
    let d = Infinity;
    const p = visorOutline;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [x1, y1] = p[j], [x2, y2] = p[i], dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
      d = Math.min(d, Math.hypot(x - x1 - t * dx, y - y1 - t * dy));
    }
    return d;
  }
  function onVisor(x, y, strict = true, view = "top") {
    y *= faceSign(view);
    return insideVisor(x, y) || !strict && distanceToVisor(x, y) <= VISOR.overhang;
  }
  function curveAt(view, t, offset = { x: 0, y: 0 }) {
    const x = (t - 0.5) * 120;
    return mmToPhoto(view, x + (offset.x || 0), faceSign(view) * EDGE_BEND * x * x + (offset.y || 0));
  }
  function offsetForDrag(view, offset, dx, dy) {
    const anchor = mmToPhoto(view, offset.x, offset.y);
    return photoToMm(view, anchor.x + dx, anchor.y + dy);
  }
  function preparePhoto(ctx, image, view) {
    const n = 887, offset = view === "top" ? 0 : image.width / 2;
    ctx.drawImage(image, offset, 0, image.width / 2, image.height, 0, 0, n, n);
    const original = ctx.getImageData(0, 0, n, n), pixels = original.data;
    const region = new Uint8Array(n * n), shade = new Float32Array(n * n), neutral = new Float32Array(n * n);
    const left = new Float32Array(n).fill(n), right = new Float32Array(n);
    for (let i = 0; i < n * n; i++) {
      const j = i * 4, r = pixels[j], g = pixels[j + 1], b = pixels[j + 2];
      const lo = Math.min(r, g, b), hi = Math.max(r, g, b), chroma = hi - lo;
      if (chroma < 25) continue;
      const material = g > r * 1.35 && g > b * 1.35 ? 2 : r < g * 0.72 && r < b * 0.72 ? 3 : b < r * 0.72 && b < g * 0.72 ? 4 : 1;
      region[i] = material;
      const active = material === 1 ? (r + b) / 2 : material === 2 ? g : material === 3 ? (g + b) / 2 : (r + g) / 2;
      shade[i] = clamp((active - lo) / 235);
      neutral[i] = lo;
      if (material === 2) {
        const y = Math.floor(i / n), x = i % n;
        left[y] = Math.min(left[y], x);
        right[y] = Math.max(right[y], x);
      }
    }
    const smooth = (array, y) => {
      let sum = 0, count = 0;
      for (let k = Math.max(70, y - 5); k <= Math.min(n - 1, y + 5); k++) {
        if (right[k] > left[k]) {
          sum += array[k];
          count++;
        }
      }
      return count ? sum / count : array[y];
    };
    const panelLeft = new Float32Array(n), panelRight = new Float32Array(n);
    const la = smooth(left, 430), ls = (la - smooth(left, 370)) / 60;
    const ra = smooth(right, 330), rs = (ra - smooth(right, 270)) / 60;
    for (let y = 0; y < n; y++) {
      panelLeft[y] = y > 430 ? la + (y - 430) * ls : smooth(left, y);
      panelRight[y] = y > 330 ? ra + (y - 330) * rs : smooth(right, y);
    }
    const u = new Float32Array(n * n), v = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = Math.floor(i / n);
      if (region[i] === 2) {
        u[i] = 0.35 + 0.3 * (x - panelLeft[y]) / Math.max(1, panelRight[y] - panelLeft[y]);
        v[i] = (y - 70) / 550;
      } else {
        const ny = clamp((y - 70) / 550), bend = Math.sqrt(Math.max(0.12, 1 - (1 - ny) ** 2));
        u[i] = (x - 35) / (730 * bend) * 0.7 + ny * 0.07;
        v[i] = ny + x / 887 * 0.2;
      }
    }
    const mask = ctx.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      if (region[i] === 3) {
        mask.data[i * 4] = mask.data[i * 4 + 1] = mask.data[i * 4 + 2] = 255;
        mask.data[i * 4 + 3] = 255;
      }
    }
    const brim = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++) brim[i] = region[i] === 3 ? 1 : 0;
    const near = dilate(brim, n, OVERHANG);
    return { n, original, region, shade, neutral, u, v, mask, near };
  }
  var OVERHANG = 18;
  function dilate(src, n, r) {
    const tmp = new Uint8Array(n * n), out = new Uint8Array(n * n);
    for (let y = 0; y < n; y++) {
      let count = 0;
      const row = y * n;
      for (let x = 0; x < Math.min(r, n); x++) count += src[row + x];
      for (let x = 0; x < n; x++) {
        if (x + r < n) count += src[row + x + r];
        if (x - r - 1 >= 0) count -= src[row + x - r - 1];
        tmp[row + x] = count > 0 ? 1 : 0;
      }
    }
    for (let x = 0; x < n; x++) {
      let count = 0;
      for (let y = 0; y < Math.min(r, n); y++) count += tmp[y * n + x];
      for (let y = 0; y < n; y++) {
        if (y + r < n) count += tmp[(y + r) * n + x];
        if (y - r - 1 >= 0) count -= tmp[(y - r - 1) * n + x];
        out[y * n + x] = count > 0 ? 1 : 0;
      }
    }
    return out;
  }
  function buildPatternLayer(photo, pattern) {
    const { region, u, v } = photo, layer = new Uint8Array(region.length), indices = { base: 0, accent: 1, light: 2 };
    for (let i = 0; i < region.length; i++) if (region[i] === 1 || region[i] === 2) {
      layer[i] = samplePattern(pattern, u[i], v[i], region[i], indices);
    }
    return layer;
  }
  function colorPhoto(photo, state, ctx, customImage = null) {
    const colors = Object.fromEntries(Object.entries(state.colors).map(([k, c]) => [k, rgb(c)]));
    const output = ctx.createImageData(photo.n, photo.n);
    output.data.set(photo.original.data);
    const { region, shade, neutral, u, v } = photo;
    photo.patternLayers ?? (photo.patternLayers = /* @__PURE__ */ new Map());
    if (!photo.patternLayers.has(state.pattern)) photo.patternLayers.set(state.pattern, buildPatternLayer(photo, state.pattern));
    const layer = photo.patternLayers.get(state.pattern), pigments = [colors.base, colors.accent, colors.light];
    for (let i = 0; i < region.length; i++) {
      if (!region[i]) continue;
      const c = region[i] === 3 ? colors.brim : region[i] === 4 ? colors.trim : state.pattern === "custom" && customImage ? sampleUploadedImage(customImage, u[i], v[i], state.imageSettings, colors.base) : pigments[layer[i]];
      const j = i * 4;
      for (let k = 0; k < 3; k++) output.data[j + k] = Math.min(255, c[k] * shade[i] + neutral[i]);
    }
    ctx.putImageData(output, 0, 0);
    return output;
  }
  function letteringLayout(ctx, state, font) {
    if (!state.text.trim() || state.placement !== state.view) return { glyphs: [], bounds: null };
    const offset = state.textOffsets?.[state.view] || { x: 0, y: 0 };
    const chars = typeof Intl.Segmenter === "function" ? Array.from(new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(state.text), (s) => s.segment) : Array.from(state.text);
    const points = [];
    let length = 0;
    const bend = faceSign(state.view) * EDGE_BEND * (Number.isFinite(state.curve) ? state.curve : 100) / 100;
    const rot = (Number.isFinite(state.rotation) ? state.rotation : 0) * Math.PI / 180, rc = Math.cos(rot), rs = Math.sin(rot);
    for (let i = 0; i <= 600; i++) {
      const x0 = (i / 600 - 0.5) * 400, y0 = bend * x0 * x0, x = x0 * rc - y0 * rs, y = x0 * rs + y0 * rc;
      if (i) length += Math.hypot(x - points[i - 1].x, y - points[i - 1].y);
      points.push({ x, y, length });
    }
    const size = EM_MM * state.size / 100, track = size * 0.035;
    ctx.save();
    ctx.font = font.replace("SIZE", size * PXMM);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const measure = () => ctx.measureText(state.text).width / PXMM + track * (chars.length - 1);
    const centerDistance = points[300].length;
    let distance = centerDistance - measure() / 2, prefix = "", previous = 0;
    const glyphs = [], samples = [], localSamples = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const char of chars) {
      prefix += char;
      const width = ctx.measureText(prefix).width / PXMM, advance = width - previous;
      const d = distance + advance / 2;
      let i = 1;
      while (i < points.length - 1 && points[i].length < d) i++;
      const a = points[i - 1], b = points[i], t = clamp((d - a.length) / (b.length - a.length));
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, angle = Math.atan2(b.y - a.y, b.x - a.x);
      glyphs.push({ char, x, y, angle });
      if (char.trim()) {
        const m = ctx.measureText(char), pad = (state.outline ? size * 0.075 / 2 : 0) + 0.3;
        const left = -m.actualBoundingBoxLeft / PXMM - pad, right = m.actualBoundingBoxRight / PXMM + pad;
        const top = -m.actualBoundingBoxAscent / PXMM - pad, bottom = m.actualBoundingBoxDescent / PXMM + pad;
        for (const gx of [left, (left + right) / 2, right]) for (const gy of [top, (top + bottom) / 2, bottom]) {
          const lx = x + gx * Math.cos(angle) - gy * Math.sin(angle), ly = y + gx * Math.sin(angle) + gy * Math.cos(angle);
          localSamples.push([lx, ly]);
          const p = mmToPhoto(state.view, lx + offset.x, ly + offset.y);
          samples.push([p.x, p.y]);
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
      }
      previous = width;
      distance += advance + track;
    }
    const resolvedFont = ctx.font;
    ctx.restore();
    return { glyphs, samples, localSamples, offset, font: resolvedFont, size, bounds: samples.length ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : null };
  }
  function paintGlyphs(ink, layout, state, outlineColor, scale, tx, ty, offset = { x: 0, y: 0 }) {
    ink.save();
    ink.translate(tx, ty);
    ink.scale(scale / PXMM, scale / PXMM);
    ink.font = layout.font;
    ink.textAlign = "center";
    ink.textBaseline = "middle";
    ink.fillStyle = state.color;
    ink.strokeStyle = outlineColor;
    ink.lineJoin = "round";
    ink.lineWidth = layout.size * 0.075 * PXMM;
    for (const glyph of layout.glyphs) {
      ink.save();
      ink.translate((glyph.x + offset.x) * PXMM, (glyph.y + offset.y) * PXMM);
      ink.rotate(glyph.angle);
      if (state.outline) ink.strokeText(glyph.char, 0, 0);
      ink.fillText(glyph.char, 0, 0);
      ink.restore();
    }
    ink.restore();
  }
  var decalCanvas;
  function drawLettering(ctx, state, font, outlineColor) {
    const layout = letteringLayout(ctx, state, font);
    if (!layout.glyphs.length) return layout;
    decalCanvas ?? (decalCanvas = document.createElement("canvas"));
    const pad = 1;
    const xs = layout.localSamples.map((p) => p[0]), ys = layout.localSamples.map((p) => p[1]);
    const left = Math.floor(Math.min(...xs)) - pad, top = Math.floor(Math.min(...ys)) - pad;
    const width = Math.ceil(Math.max(...xs)) - left + pad, height = Math.ceil(Math.max(...ys)) - top + pad;
    decalCanvas.width = width * PXMM;
    decalCanvas.height = height * PXMM;
    const ink = decalCanvas.getContext("2d", { willReadFrequently: true });
    paintGlyphs(ink, layout, state, outlineColor, PXMM, -left * PXMM, -top * PXMM);
    const src = ink.getImageData(0, 0, decalCanvas.width, decalCanvas.height), sw = src.width, sh = src.height;
    const b = layout.bounds, x0 = Math.max(0, Math.floor(b.x) - 2), y0 = Math.max(0, Math.floor(b.y) - 2);
    const w = Math.min(ctx.canvas.width - x0, Math.ceil(b.x + b.width) + 2 - x0), h = Math.min(ctx.canvas.height - y0, Math.ceil(b.y + b.height) + 2 - y0);
    if (w <= 0 || h <= 0) return layout;
    const result = ctx.getImageData(x0, y0, w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = photoToMm(state.view, x0 + x + 0.5, y0 + y + 0.5);
      const sx = (p.x - layout.offset.x - left) * PXMM - 0.5, sy = (p.y - layout.offset.y - top) * PXMM - 0.5;
      const ix = Math.floor(sx), iy = Math.floor(sy);
      if (ix < 0 || iy < 0 || ix >= sw - 1 || iy >= sh - 1) continue;
      const fx = sx - ix, fy = sy - iy, weights = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy];
      const indices = [(iy * sw + ix) * 4, (iy * sw + ix + 1) * 4, ((iy + 1) * sw + ix) * 4, ((iy + 1) * sw + ix + 1) * 4];
      let alpha = 0;
      const rgb3 = [0, 0, 0];
      for (let n = 0; n < 4; n++) {
        const a = src.data[indices[n] + 3] / 255 * weights[n];
        alpha += a;
        for (let k = 0; k < 3; k++) rgb3[k] += src.data[indices[n] + k] * a;
      }
      if (!alpha) continue;
      const j = (y * w + x) * 4, under = result.data[j + 3] / 255 * (1 - alpha), out = alpha + under;
      for (let k = 0; k < 3; k++) result.data[j + k] = (rgb3[k] + result.data[j + k] * under) / out;
      result.data[j + 3] = out * 255;
    }
    ctx.putImageData(result, x0, y0);
    return layout;
  }
  function layoutFits(photo, ctx, state, font, offset, strict = false) {
    const layout = letteringLayout(ctx, { ...state, textOffsets: { ...state.textOffsets, [state.view]: offset } }, font);
    return (layout.localSamples || []).every(([x, y]) => onVisor(x + offset.x, y + offset.y, strict, state.view));
  }
  function overhangs(photo, ctx, state, font, offset) {
    return !layoutFits(photo, ctx, state, font, offset, true);
  }
  var MIN_SIZE = 30;
  function fitTextSize(photo, ctx, state, font) {
    if (!state.text.trim() || state.placement !== state.view) return state.size;
    const at = (size) => layoutFits(photo, ctx, { ...state, size }, font, { x: 0, y: 0 });
    if (at(state.size)) return state.size;
    let lo = MIN_SIZE, hi = state.size;
    if (!at(lo)) return lo;
    for (let i = 0; i < 7; i++) {
      const mid = (lo + hi) / 2;
      if (at(mid)) lo = mid;
      else hi = mid;
    }
    return Math.max(MIN_SIZE, Math.floor(lo));
  }
  function resolveTextPosition(photo, ctx, state, font, requested) {
    const candidate = { x: Math.round(clamp(requested.x, -100, 100)), y: Math.round(clamp(requested.y, -45, 45)) };
    const fits = (offset) => layoutFits(photo, ctx, state, font, offset);
    if (fits(candidate)) return candidate;
    let low = 0, high = 1, safe = { x: 0, y: 0 };
    for (let i = 0; i < 10; i++) {
      const t = (low + high) / 2, point = { x: Math.round(candidate.x * t), y: Math.round(candidate.y * t) };
      if (fits(point)) {
        safe = point;
        low = t;
      } else high = t;
    }
    return safe;
  }
  function composeLit(photo, base, ink, x0, y0) {
    const n = photo.n, { region, shade, neutral } = photo, src = ink.data, dst = base.data, w = base.width, h = base.height;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const gi = (y + y0) * n + x + x0;
      if (region[gi] !== 3) continue;
      const j = (y * w + x) * 4, a = src[j + 3] / 255;
      if (!a) continue;
      const f2 = shade[gi], nb = neutral[gi];
      for (let k = 0; k < 3; k++) dst[j + k] = dst[j + k] * (1 - a) + Math.min(255, src[j + k] * f2 + nb) * a;
    }
    return base;
  }
  var ProductPreview = class {
    /**
     * @param {HTMLElement} element  viewer container
     * @param {HTMLElement} error    inline error element
     * @param {Function} onTextMove  called with (view, offset) when the text is moved/clamped
     * @param {{materialsUrl:string}} options
     */
    constructor(element, error, onTextMove = () => {
    }, options = {}) {
      this.element = element;
      this.error = error;
      this.photos = {};
      this.tinted = {};
      this.tintedData = {};
      this.cache = {};
      this.onTextMove = onTextMove;
      this.customImage = null;
      this.imageVersion = 0;
      this.onFit = options.onFit || (() => {
      });
      this.effectiveSize = {};
      this.editable = options.editable !== false;
      this.onPickText = options.onPickText || (() => {
      });
      this.onLayerMove = options.onLayerMove || (() => {
      });
      this.onSelectText = options.onSelectText || (() => {
      });
      this.onBlank = options.onBlank || (() => {
      });
      this.onRender = options.onRender || (() => {
      });
      this.abort = new AbortController();
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.canvas.height = 887;
      this.canvas.setAttribute("aria-hidden", "true");
      element.append(this.canvas);
      this.context = this.canvas.getContext("2d");
      this.scratch = document.createElement("canvas");
      this.scratch.width = this.scratch.height = 887;
      this.scratchCtx = this.scratch.getContext("2d", { willReadFrequently: true });
      this.bindTextDragging();
      this.element.setAttribute("aria-busy", "true");
      const image = this.image = new Image();
      image.onload = () => {
        if (this.destroyed) return;
        try {
          for (const view of ["top", "bottom"]) {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 887;
            this.photos[view] = preparePhoto(canvas.getContext("2d", { willReadFrequently: true }), image, view);
            this.tinted[view] = canvas;
          }
          this.ready = true;
          this.element.removeAttribute("aria-busy");
          this.render();
          this.warmPatterns();
        } catch (e) {
          this.fail(e);
        }
      };
      image.onerror = () => this.fail(new Error("materials"));
      image.src = options.materialsUrl;
      this.observer = new ResizeObserver(() => this.fit());
      this.observer.observe(element);
      document.fonts?.ready.then(() => {
        if (!this.destroyed) this.invalidate();
      });
    }
    /** Precompute the motif layers of both views in idle time (first switch becomes instant). */
    warmPatterns() {
      const ids = ["peloton", "stripe", "check", "dot", "chevron", "plain", "breton", "wave", "confetti", "tartan", "sprint", "contour"], jobs = [];
      for (const view of ["top", "bottom"]) for (const id of ids) jobs.push([view, id]);
      const idle = window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 8 }), 60));
      const step = (deadline) => {
        if (this.destroyed) return;
        while (jobs.length && deadline.timeRemaining() > 4) {
          const [view, id] = jobs.shift(), photo = this.photos[view];
          photo.patternLayers ?? (photo.patternLayers = /* @__PURE__ */ new Map());
          if (!photo.patternLayers.has(id)) photo.patternLayers.set(id, buildPatternLayer(photo, id));
        }
        if (jobs.length) this.idle = idle(step);
      };
      this.idle = idle(step);
    }
    /**
     * Oriented box of the current text, in canvas pixels (887 space): the frame
     * follows the text's own rotation, then the visor perspective.
     * Returns null when no text is shown on the current view.
     */
    textFrame(pad = 9, index = null) {
      const entry = index === null ? null : this.cache[this.state?.view]?.infos?.[index];
      const info = entry ? entry.info : this.inkInfo, st = entry ? entry.state : this.state;
      if (index !== null && !entry) return null;
      if (!info?.bounds || !st || st.view !== st.placement || !info.localSamples?.length) return null;
      const rot = (st.rotation || 0) * Math.PI / 180, c = Math.cos(rot), s = Math.sin(rot), off = info.offset;
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const [x, y] of info.localSamples) {
        const u = x * c + y * s, v = -x * s + y * c;
        u0 = Math.min(u0, u);
        u1 = Math.max(u1, u);
        v0 = Math.min(v0, v);
        v1 = Math.max(v1, v);
      }
      const k = pxPerMm(st.view), pm = pad / k;
      u0 -= pm;
      u1 += pm;
      v0 -= pm;
      v1 += pm;
      const P = (u, v) => mmToPhoto(st.view, u * c - v * s + off.x, u * s + v * c + off.y);
      return {
        quad: [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)],
        center: P((u0 + u1) / 2, (v0 + v1) / 2),
        rotate: P((u0 + u1) / 2, v0 - 34 / k),
        topMid: P((u0 + u1) / 2, v0),
        resize: P(u1, v1),
        local: { u0, u1, v0, v1, offset: { ...off } }
      };
    }
    pointInFrame(p, margin = 0, index = null) {
      const f2 = this.textFrame(9 + margin, index);
      if (!f2) return false;
      let sign = 0;
      for (let i = 0; i < 4; i++) {
        const a = f2.quad[i], b = f2.quad[(i + 1) % 4], cr = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (cr) {
          if (sign && Math.sign(cr) !== sign) return false;
          sign = Math.sign(cr);
        }
      }
      return true;
    }
    /** Canvas px → px relative to the viewer element (uses the target layout, not the CSS transition). */
    toViewer(p) {
      const st = this.canvas.style, size = parseFloat(st.width) || this.element.clientWidth, k = size / 887;
      return { x: (parseFloat(st.left) || 0) + p.x * k, y: (parseFloat(st.top) || 0) + p.y * k };
    }
    /** Client (pointer) coordinates → flat visor coordinates (mm) of the current view. */
    clientToLocal(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect();
      return photoToMm(this.state.view, (clientX - r.left) * 887 / r.width, (clientY - r.top) * 887 / r.height);
    }
    /** Forget cached layouts (e.g. once web fonts finish loading). */
    invalidate() {
      this.cache = {};
      this.fitCache = /* @__PURE__ */ new Map();
      this.render();
    }
    fail(e) {
      this.element.removeAttribute("aria-busy");
      if (this.error) this.error.hidden = false;
      if (window.console) console.error("[Atelier Gapette]", e);
    }
    update(state, font, outlineColor) {
      this.state = { ...state, colors: { ...state.colors }, textOffsets: { top: { ...state.textOffsets?.top }, bottom: { ...state.textOffsets?.bottom } }, layers: state.layers ? JSON.parse(JSON.stringify(state.layers)) : null };
      this.font = font;
      this.outlineColor = outlineColor;
      if (!this.pending) {
        this.pending = true;
        this.raf = requestAnimationFrame(() => {
          this.pending = false;
          this.render();
        });
      }
    }
    fit() {
      if (!this.state) return;
      const w = this.element.clientWidth, h = this.element.clientHeight;
      let size = Math.min(w, h) * 1.02;
      let x = (w - size) / 2, y = (h - size) / 2;
      if (this.state.detail) {
        size = Math.min(w / 0.67, h / 0.43);
        const anchor = curveAt(this.state.view, 0.5);
        const focus = [anchor.x / 887, anchor.y / 887];
        x = w / 2 - focus[0] * size;
        y = h / 2 - focus[1] * size;
      }
      Object.assign(this.canvas.style, { width: `${size}px`, height: `${size}px`, left: `${x}px`, top: `${y}px` });
      this.onRender();
    }
    setImage(image) {
      this.customImage = image;
      this.imageVersion++;
      this.colorKeys = {};
    }
    bindTextDragging() {
      const signal = this.abort.signal;
      const position = (event) => {
        const rect = this.canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * 887 / rect.width, y: (event.clientY - rect.top) * 887 / rect.height };
      };
      this.canvas.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !this.state) return;
        const onText = this.state.view === this.state.placement && this.inkInfo?.bounds && this.pointInFrame(position(event), 15);
        if (!this.editable) {
          const infos = this.cache[this.state.view]?.infos || {}, pt = position(event);
          const other = onText ? void 0 : Object.keys(infos).map(Number).find((i) => i !== this.activeIndex() && this.pointInFrame(pt, 15, i));
          if (other !== void 0) {
            event.preventDefault();
            this.onPickText(other);
          }
          return;
        }
        if (!onText) {
          const infos = this.cache[this.state.view]?.infos || {}, pt = position(event);
          const other = Object.keys(infos).map(Number).find((i) => i !== this.activeIndex() && this.pointInFrame(pt, 15, i));
          if (other !== void 0) {
            event.preventDefault();
            this.onPickText(other);
            return;
          }
          if (this.state.moveText) this.onBlank();
          return;
        }
        if (!this.state.moveText) {
          this.state.moveText = true;
          this.onSelectText();
        }
        const p = position(event), offset = this.state.textOffsets[this.state.view];
        event.preventDefault();
        this.drag = { pointer: event.pointerId, start: p, offset: { ...offset } };
        this.canvas.setPointerCapture(event.pointerId);
      }, { signal });
      this.canvas.addEventListener("pointermove", (event) => {
        if (!this.drag || this.drag.pointer !== event.pointerId) return;
        event.preventDefault();
        const p = position(event);
        this.moveTextTo(offsetForDrag(this.state.view, this.drag.offset, p.x - this.drag.start.x, p.y - this.drag.start.y));
      }, { signal });
      const end = (event) => {
        if (this.drag?.pointer === event.pointerId) {
          this.drag = null;
          if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
        }
      };
      this.canvas.addEventListener("pointerup", end, { signal });
      this.canvas.addEventListener("pointercancel", end, { signal });
      this.canvas.addEventListener("lostpointercapture", () => {
        this.drag = null;
      }, { signal });
    }
    moveTextTo(requested) {
      if (!this.ready || !this.inkInfo) return;
      const view = this.state.view, sized = { ...this.state, size: this.cache[view]?.fits?.[this.activeIndex()] ?? this.state.size };
      const offset = resolveTextPosition(this.photos[view], this.scratchCtx, sized, this.font, requested);
      this.state.textOffsets[view] = offset;
      this.onTextMove(view, offset);
      this.render();
    }
    /** Lit composite of one view for the current state (cached). */
    /** Recolour a view only when it is needed (the hidden view waits until shown). */
    tint(view) {
      const state = this.state, key = JSON.stringify([state.colors, state.pattern, state.imageSettings, this.imageVersion]);
      this.colorKeys ?? (this.colorKeys = {});
      if (this.colorKeys[view] !== key) {
        this.tintedData[view] = colorPhoto(this.photos[view], state, this.tinted[view].getContext("2d"), this.customImage);
        this.colorKeys[view] = key;
      }
      return key;
    }
    activeIndex() {
      return this.state?.layers?.length ? this.state.active || 0 : 0;
    }
    /** Texts shown on a view: the active one comes from the live (flat) state. */
    layersFor(view) {
      const st = this.state, list = st.layers?.length ? st.layers : [null], active = this.activeIndex();
      return list.map((l, i) => i === active || l === null ? { ...st, view, index: i, active: true } : { ...st, ...l, view, index: i, active: false }).filter((l) => l.placement === view && String(l.text).trim());
    }
    composite(view) {
      const colorKey = this.tint(view), photo = this.photos[view], fits = {}, over = {}, prepared = [];
      this.fitCache ?? (this.fitCache = /* @__PURE__ */ new Map());
      for (const L of this.layersFor(view)) {
        const font = L.active ? this.font : L.fontCanvas, outline = L.active ? this.outlineColor : L.outlineColor;
        const fitKey = JSON.stringify([view, L.text, L.size, L.curve, L.rotation, L.outline, font]);
        let size = this.fitCache.get(fitKey);
        if (size === void 0) {
          size = fitTextSize(photo, this.scratchCtx, L, font);
          if (this.fitCache.size > 60) this.fitCache.clear();
          this.fitCache.set(fitKey, size);
        }
        const state = { ...L, size };
        fits[L.index] = size;
        if (L.active) {
          const k = view + ":" + L.index;
          if (this.effectiveSize[k] !== size) {
            this.effectiveSize[k] = size;
            this.onFit(view, size, L.index);
          }
        }
        let offset = state.textOffsets?.[view];
        if (!Number.isFinite(offset?.x)) offset = { x: 0, y: 0 };
        const safe = resolveTextPosition(photo, this.scratchCtx, state, font, offset);
        if (safe.x !== offset.x || safe.y !== offset.y) {
          offset = safe;
          if (L.active) {
            this.state.textOffsets[view] = safe;
            this.onTextMove(view, safe);
          } else this.onLayerMove(L.index, view, safe);
        }
        state.textOffsets = { ...state.textOffsets, [view]: offset };
        prepared.push({ state, font, outline, offset });
      }
      const key = JSON.stringify([colorKey, view, this.activeIndex(), prepared.map((p) => [p.state.index, p.state.text, p.state.size, p.state.curve, p.state.rotation, p.state.outline, p.state.color, p.font, p.outline, p.offset])]);
      const c = this.cache[view];
      if (c && c.key === key) return c;
      const ink = this.scratchCtx;
      const canvas = c?.canvas || document.createElement("canvas");
      canvas.width = canvas.height = 887;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(this.tinted[view], 0, 0);
      const infos = {};
      let activeInfo = { glyphs: [], bounds: null };
      for (const p of prepared) {
        ink.clearRect(0, 0, 887, 887);
        const info = drawLettering(ink, p.state, p.font, p.outline);
        infos[p.state.index] = { info, state: p.state };
        if (p.state.active) activeInfo = info;
        over[p.state.index] = overhangs(photo, this.scratchCtx, p.state, p.font, p.offset);
        const bd = info.bounds;
        if (bd) {
          const x0 = Math.max(1, Math.floor(bd.x) - 6), y0 = Math.max(1, Math.floor(bd.y) - 6);
          const w = Math.min(886, Math.ceil(bd.x + bd.width) + 6) - x0, h = Math.min(886, Math.ceil(bd.y + bd.height) + 6) - y0;
          if (w > 0 && h > 0) {
            const out = composeLit(photo, ctx.getImageData(x0, y0, w, h), ink.getImageData(x0, y0, w, h), x0, y0);
            ctx.putImageData(out, x0, y0);
          }
        }
      }
      return this.cache[view] = { key, canvas, info: activeInfo, infos, fits, over };
    }
    /** Compose both faces so that every text has its fitted size (before reading the configuration). */
    settle() {
      if (!this.ready || !this.state) return null;
      const out = { fits: {}, over: {} };
      for (const view of ["top", "bottom"]) {
        const c = this.composite(view);
        Object.assign(out.fits, c.fits);
        Object.assign(out.over, c.over);
      }
      return out;
    }
    render() {
      if (!this.ready || !this.state || this.destroyed) return;
      try {
        const { state } = this;
        const c = this.composite(state.view);
        this.inkInfo = c.info;
        const ctx = this.context;
        ctx.clearRect(0, 0, 887, 887);
        ctx.drawImage(c.canvas, 0, 0);
        if (this.error) this.error.hidden = true;
        this.element.classList.toggle("moving-text", !!state.moveText && state.view === state.placement);
        this.fit();
      } catch (e) {
        this.fail(e);
      }
    }
    /**
     * Both views side by side, for the order preview (JPEG/PNG data URL).
     * Returns null until the photo is ready.
     */
    snapshot({ width = 960, type = "image/jpeg", quality = 0.86, views = ["top", "bottom"] } = {}) {
      if (!this.ready || !this.state) return null;
      const cell = Math.round(width / views.length), out = document.createElement("canvas");
      out.width = cell * views.length;
      out.height = cell;
      const ctx = out.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
      views.forEach((v, i) => ctx.drawImage(this.composite(v).canvas, i * cell, 0, cell, cell));
      if (views.length > 1) {
        const names = { top: "DESSUS DE LA VISI\xC8RE", bottom: "DESSOUS DE LA VISI\xC8RE" };
        ctx.font = `600 ${Math.round(cell / 34)}px Arial, sans-serif`;
        ctx.fillStyle = "#555555";
        ctx.textAlign = "center";
        views.forEach((v, i) => ctx.fillText(names[v] || "", i * cell + cell / 2, cell - Math.round(cell / 30)));
      }
      return out.toDataURL(type, quality);
    }
    destroy() {
      this.destroyed = true;
      this.abort.abort();
      this.observer?.disconnect();
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.idle) {
        (window.cancelIdleCallback || clearTimeout)(this.idle);
      }
      if (this.image) {
        this.image.onload = this.image.onerror = null;
      }
      this.canvas.remove();
      this.cache = {};
      this.photos = {};
      this.tinted = {};
      this.tintedData = {};
    }
  };

  // ../assets/src/schema.js
  var SCHEMA_VERSION = 3;
  var RENDERER_VERSION = "decal-6";
  var MAX_TEXTS = 3;
  var MODEL_ID = "gapette-standard-v1";
  var ASSET_VERSION = "materials-v1";
  var MAX_GRAPHEMES = 24;
  var BOUNDS = { size: [30, 250], x: [-100, 100], y: [-50, 50], curve: [-100, 100], rotation: [-90, 90] };
  var f = (label, family, weight, style, fallback, extra = {}) => ({
    label,
    family,
    weight,
    style,
    canvas: `${style === "italic" ? "italic " : ""}${weight} SIZEpx "${family}", ${fallback}`,
    ...extra
  });
  var FONTS = {
    "sport-v1": f("Sport", "AG Archivo Black", "400", "normal", "Arial, sans-serif"),
    "athletic-v1": f("Athl\xE9tique", "AG Oswald", "600", "normal", '"Arial Narrow", sans-serif'),
    "condensed-v1": f("Condens\xE9e", "AG Bebas Neue", "400", "normal", "Impact, sans-serif", { capsOnly: true }),
    "racing-v1": f("Course", "AG Racing Sans One", "400", "normal", "Arial, sans-serif"),
    "slab-v1": f("Slab r\xE9tro", "AG Alfa Slab One", "400", "normal", "Georgia, serif"),
    "varsity-v1": f("Varsity", "AG Graduate", "400", "normal", "Georgia, serif"),
    "retro-v1": f("R\xE9tro s\xE9rif", "AG Libre Baskerville", "700", "normal", "Georgia, serif"),
    "script-v1": f("Italique", "AG Libre Baskerville", "700", "italic", "Georgia, serif"),
    "elegant-v1": f("\xC9l\xE9gante", "AG Playfair Display", "700", "italic", "Georgia, serif"),
    "brush-v1": f("Pinceau", "AG Pacifico", "400", "normal", "cursive"),
    "marker-v1": f("Feutre", "AG Permanent Marker", "400", "normal", "cursive"),
    "mono-v1": f("Machine", "AG Courier Prime", "700", "normal", '"Courier New", monospace')
  };
  var DEFAULT_FONT = "sport-v1";
  var LEGACY_FONTS = { sport: "sport-v1", retro: "retro-v1", script: "script-v1", mono: "mono-v1" };
  var SHAPES = {
    arc: { label: "Arrondi", curve: 100, rotation: 0 },
    straight: { label: "Droit", curve: 0, rotation: 0 },
    axis: { label: "Dans l\u2019axe", curve: 0, rotation: -90 }
  };
  var ALLOWED_CHARS = /^[A-Za-z0-9À-ÖØ-öø-ÿŒœ .,'’!?&:;()/+#@*"«»…€-]*$/u;
  var HEX = /^#[0-9a-f]{6}$/;
  var PATTERN_IDS = patterns.map((p) => p.id);
  function graphemes(text) {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      return Array.from(new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(text), (s) => s.segment);
    }
    return Array.from(text);
  }
  function unsupportedChars(text) {
    return [...new Set(graphemes(text).filter((g) => !ALLOWED_CHARS.test(g)))];
  }
  function textEntry(t) {
    const off = t.textOffsets && t.textOffsets[t.placement] || { x: 0, y: 0 };
    return {
      value: t.text,
      side: t.placement,
      font_id: FONTS[t.font] ? t.font : DEFAULT_FONT,
      // the size actually rendered (after fitting the visor), so the order matches the preview
      size_percent: Math.round(t.effectiveSize ?? t.size),
      color: t.color.toLowerCase(),
      outline: !!t.outline,
      curve: Math.round(t.curve ?? 100),
      rotation: Math.round(t.rotation ?? 0),
      position: { x: Math.round(off.x), y: Math.round(off.y) }
    };
  }
  function toConfiguration(state) {
    const list = state.texts && state.texts.length ? state.texts : [state];
    let texts = list.filter((t) => String(t.text).trim()).map(textEntry);
    if (!texts.length) texts = [textEntry(list[0])];
    return {
      schema_version: SCHEMA_VERSION,
      renderer_version: RENDERER_VERSION,
      model_id: MODEL_ID,
      asset_version: ASSET_VERSION,
      pattern_id: state.pattern,
      colors: {
        base: state.colors.base.toLowerCase(),
        accent: state.colors.accent.toLowerCase(),
        light: state.colors.light.toLowerCase(),
        brim: state.colors.brim.toLowerCase(),
        trim: state.colors.trim.toLowerCase()
      },
      texts,
      image: null
    };
  }
  function upgrade(doc) {
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) return doc;
    let d = { ...doc };
    const legacy = ["decal-1", "decal-2", "decal-3", "decal-4"].includes(d.renderer_version);
    const mirrorUnder = d.renderer_version === "decal-5";
    if (legacy || mirrorUnder) d.renderer_version = RENDERER_VERSION;
    if (d.schema_version === 1) {
      if (d.text && typeof d.text === "object") {
        const t = d.text, text = { ...t, curve: 100, rotation: 0 };
        if (t.position !== void 0) {
          delete text.position;
          text.position = t.position;
        }
        d.text = text;
      }
      d.schema_version = 2;
    }
    if (d.schema_version === 2) {
      if (d.text && typeof d.text === "object" && d.texts === void 0) {
        const { text, image, ...rest } = d;
        d = { ...rest, texts: [text], ...image !== void 0 ? { image } : {} };
      }
      d.schema_version = 3;
    }
    if (legacy && Array.isArray(d.texts)) d.texts = d.texts.map((t) => {
      if (!t || typeof t !== "object" || !t.position || !["top", "bottom"].includes(t.side) || ![t.position.x, t.position.y, t.size_percent, t.rotation].every(Number.isFinite)) return t;
      const m = legacyToMm(t.side, t), cl = (v, [a, b]) => Math.max(a, Math.min(b, v));
      return { ...t, size_percent: cl(m.size_percent, BOUNDS.size), rotation: cl(m.rotation, BOUNDS.rotation), position: { x: cl(m.position.x, BOUNDS.x), y: cl(m.position.y, BOUNDS.y) } };
    });
    if (mirrorUnder && Array.isArray(d.texts)) d.texts = d.texts.map((t) => t && typeof t === "object" && t.side === "bottom" && t.position && Number.isFinite(t.position.y) && Number.isFinite(t.rotation) ? { ...t, rotation: 0 - t.rotation, position: { ...t.position, y: 0 - t.position.y } } : t);
    return d;
  }
  function validateConfiguration(input) {
    const errors = [];
    const isObj = (o) => o && typeof o === "object" && !Array.isArray(o);
    if (!isObj(input)) return { ok: false, errors: ["Configuration illisible"] };
    const doc = upgrade(input);
    const keys = (o, allowed, where) => Object.keys(o).forEach((k) => {
      if (!allowed.includes(k)) errors.push(`Cl\xE9 inconnue : ${where}${k}`);
    });
    const int = (v, [a, b], name) => {
      if (!Number.isInteger(v) || v < a || v > b) errors.push(`${name} hors bornes (${a} \xE0 ${b})`);
    };
    keys(doc, ["schema_version", "renderer_version", "model_id", "asset_version", "pattern_id", "colors", "texts", "image"], "");
    if (doc.schema_version !== SCHEMA_VERSION) errors.push("Version de sch\xE9ma non prise en charge");
    if (doc.renderer_version !== RENDERER_VERSION || doc.model_id !== MODEL_ID || doc.asset_version !== ASSET_VERSION) errors.push("Version de mod\xE8le ou de moteur inconnue");
    if (doc.pattern_id === "custom") errors.push("Motif \xAB Mon image \xBB : l\u2019import de photo n\u2019est pas encore disponible \xE0 la commande");
    else if (!PATTERN_IDS.includes(doc.pattern_id)) errors.push("Motif inconnu");
    if (!isObj(doc.colors)) errors.push("Couleurs manquantes");
    else {
      keys(doc.colors, ["base", "accent", "light", "brim", "trim"], "colors.");
      for (const k of ["base", "accent", "light", "brim", "trim"]) if (!HEX.test(doc.colors[k] || "")) errors.push(`Couleur ${k} invalide`);
    }
    const texts = doc.texts;
    if (!Array.isArray(texts) || !texts.length) errors.push("Texte manquant");
    else if (texts.length > MAX_TEXTS) errors.push(`${MAX_TEXTS} textes maximum`);
    else texts.forEach((t, i) => {
      const w = `texts[${i}].`;
      if (!isObj(t)) {
        errors.push("Texte invalide");
        return;
      }
      keys(t, ["value", "side", "font_id", "size_percent", "color", "outline", "curve", "rotation", "position"], w);
      if (typeof t.value !== "string") errors.push("Texte invalide");
      else {
        if (graphemes(t.value).length > MAX_GRAPHEMES) errors.push(`Texte limit\xE9 \xE0 ${MAX_GRAPHEMES} caract\xE8res`);
        const bad = unsupportedChars(t.value);
        if (bad.length) errors.push(`Caract\xE8re(s) non pris en charge : ${bad.join(" ")}`);
        if (texts.length > 1 && !t.value.trim()) errors.push("Texte vide");
      }
      if (!["top", "bottom"].includes(t.side)) errors.push("Face du texte invalide");
      if (!FONTS[t.font_id]) errors.push("Police inconnue");
      int(t.size_percent, BOUNDS.size, "Taille");
      if (!HEX.test(t.color || "")) errors.push("Couleur du texte invalide");
      if (typeof t.outline !== "boolean") errors.push("Contour invalide");
      int(t.curve, BOUNDS.curve, "Courbure");
      int(t.rotation, BOUNDS.rotation, "Inclinaison");
      if (!isObj(t.position)) errors.push("Position manquante");
      else {
        keys(t.position, ["x", "y"], `${w}position.`);
        int(t.position.x, BOUNDS.x, "Position x");
        int(t.position.y, BOUNDS.y, "Position y");
      }
    });
    if (doc.image !== null) errors.push("Image import\xE9e : non prise en charge dans cette version");
    if (errors.length) return { ok: false, errors: [...new Set(errors)], value: null };
    const value = {
      schema_version: doc.schema_version,
      renderer_version: doc.renderer_version,
      model_id: doc.model_id,
      asset_version: doc.asset_version,
      pattern_id: doc.pattern_id,
      colors: { base: doc.colors.base, accent: doc.colors.accent, light: doc.colors.light, brim: doc.colors.brim, trim: doc.colors.trim },
      texts: texts.map((t) => ({ value: t.value, side: t.side, font_id: t.font_id, size_percent: t.size_percent, color: t.color, outline: t.outline, curve: t.curve, rotation: t.rotation, position: { x: t.position.x, y: t.position.y } })),
      image: null
    };
    return { ok: true, errors, value };
  }
  function textFromEntry(t) {
    return {
      text: t.value,
      placement: t.side,
      font: t.font_id,
      size: t.size_percent,
      color: t.color,
      outline: t.outline,
      curve: t.curve,
      rotation: t.rotation,
      effectiveSize: null,
      textOffsets: { top: { x: 0, y: 0 }, bottom: { x: 0, y: 0 }, [t.side]: { ...t.position } }
    };
  }
  function applyConfiguration(state, doc) {
    state.pattern = doc.pattern_id;
    state.colors = { ...doc.colors };
    state.palette = null;
    state.texts = doc.texts.map(textFromEntry);
    state.active = 0;
    Object.assign(state, JSON.parse(JSON.stringify(state.texts[0])));
    return state;
  }
  function shapeOf(state) {
    return Object.keys(SHAPES).find((k) => SHAPES[k].curve === state.curve && SHAPES[k].rotation === state.rotation) || null;
  }

  // ../assets/src/text-editor.js
  var clamp2 = (v, a, b) => Math.max(a, Math.min(b, v));
  var SIZE = [30, 250];
  var ROT = [-90, 90];
  function attachTextEditor(ctx) {
    const { root, q, qa, on, state, preview, update, setView, select, deselect, announce, removeText } = ctx;
    const viewer = q("viewer"), studio = q("studio"), toolbar = q("text-toolbar");
    const NS = "http://www.w3.org/2000/svg";
    const layer = document.createElement("div");
    layer.className = "ag-edit-layer";
    layer.setAttribute("data-ag", "edit-layer");
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "ag-frame");
    svg.setAttribute("aria-hidden", "true");
    const poly = document.createElementNS(NS, "polygon"), stem = document.createElementNS(NS, "line");
    svg.append(stem, poly);
    const mk = (cls, label, text) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = cls;
      b.setAttribute("aria-label", label);
      b.title = label;
      b.innerHTML = text;
      return b;
    };
    const badge = mk("ag-edit-badge", "Modifier le texte sur l\u2019aper\xE7u", '<span aria-hidden="true">\u270E</span> Modifier');
    const rotHandle = mk("ag-handle ag-handle-rotate", "Inclinaison du texte : glisser, ou fl\xE8ches gauche / droite", '<span aria-hidden="true">\u27F3</span>');
    const sizeHandle = mk("ag-handle ag-handle-size", "Taille du texte : glisser, ou fl\xE8ches haut / bas", '<span aria-hidden="true">\u2921</span>');
    layer.append(svg, badge, rotHandle, sizeHandle);
    viewer.append(layer);
    const fontSel = q("tb-font");
    Object.entries(FONTS).forEach(([id, f2]) => {
      const o = document.createElement("option");
      o.value = id;
      o.textContent = f2.label;
      fontSel.append(o);
    });
    const setSize = (v, say) => {
      state.size = clamp2(Math.round(v), ...SIZE);
      state.effectiveSize = null;
      update();
      if (say) announce(`Taille ${state.size} %`);
    };
    const setRot = (v, say, magnet = false) => {
      let r = clamp2(Math.round(v), ...ROT);
      if (magnet) {
        for (const snap of [0, -90, 90]) if (Math.abs(r - snap) <= 3) r = snap;
      }
      state.rotation = r;
      update();
      if (say) announce(`Inclinaison ${r}\xB0`);
    };
    on(q("tb-text"), "input", (e) => {
      const main = q("cap-text");
      main.value = e.target.value;
      main.dispatchEvent(new Event("input"));
    });
    on(fontSel, "change", (e) => {
      state.font = e.target.value;
      update();
      announce(`Police ${FONTS[state.font].label}`);
    });
    on(q("tb-smaller"), "click", () => setSize((state.effectiveSize ?? state.size) - 5, true));
    on(q("tb-bigger"), "click", () => setSize(state.size + 5, true));
    on(q("tb-rot-minus"), "click", () => setRot(state.rotation - 15, true));
    on(q("tb-rot-plus"), "click", () => setRot(state.rotation + 15, true));
    on(q("tb-center"), "click", () => {
      state.textOffsets[state.placement] = { x: 0, y: 0 };
      update();
      announce("Texte recentr\xE9");
    });
    on(q("tb-delete"), "click", () => removeText && removeText());
    on(q("tb-done"), "click", () => deselect(true));
    on(badge, "click", () => select(true));
    on(toolbar, "keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        deselect(true);
      }
    });
    for (const el of [badge, rotHandle, sizeHandle]) on(el, "pointerdown", (e) => e.stopPropagation());
    function dragHandle(handle, onMove) {
      on(handle, "pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        handle.setPointerCapture(e.pointerId);
        const f2 = preview.textFrame();
        if (!f2) return;
        const start2 = { local: preview.clientToLocal(e.clientX, e.clientY), size: state.effectiveSize ?? state.size, rot: state.rotation, center: f2.local.offset };
        const move = (ev) => {
          if (ev.pointerId === e.pointerId) onMove(preview.clientToLocal(ev.clientX, ev.clientY), start2, ev);
        };
        const end = (ev) => {
          if (ev.pointerId !== e.pointerId) return;
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", end);
          handle.removeEventListener("pointercancel", end);
          handle.classList.remove("dragging");
        };
        handle.classList.add("dragging");
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", end);
        handle.addEventListener("pointercancel", end);
      });
    }
    dragHandle(rotHandle, (p, s, ev) => {
      const a = Math.atan2(p.y - s.center.y, p.x - s.center.x) * 180 / Math.PI + 90;
      let r = ((a + 180) % 360 + 360) % 360 - 180;
      if (ev.shiftKey) r = Math.round(r / 15) * 15;
      setRot(r, false, true);
    });
    dragHandle(sizeHandle, (p, s) => {
      const d0 = Math.hypot(s.local.x - s.center.x, s.local.y - s.center.y) || 1;
      const d = Math.hypot(p.x - s.center.x, p.y - s.center.y);
      setSize(s.size * d / d0);
    });
    on(rotHandle, "keydown", (e) => {
      if (e.key.startsWith("Arrow")) e.stopPropagation();
      const step = e.shiftKey ? 15 : 1;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        setRot(state.rotation - step, true);
      }
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        setRot(state.rotation + step, true);
      }
    });
    on(sizeHandle, "keydown", (e) => {
      if (e.key.startsWith("Arrow")) e.stopPropagation();
      const step = e.shiftKey ? 10 : 5;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        setSize(state.size + step, true);
      }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSize((state.effectiveSize ?? state.size) - step, true);
      }
    });
    const place = (el, p, w = 0, h = 0) => {
      el.style.left = `${p.x - w / 2}px`;
      el.style.top = `${p.y - h / 2}px`;
    };
    function layout() {
      const f2 = preview.textFrame();
      const hasText = !!f2 && !!state.text.trim();
      const editing = hasText && state.moveText;
      layer.hidden = !hasText;
      badge.hidden = !hasText || editing;
      svg.style.display = editing ? "" : "none";
      rotHandle.hidden = sizeHandle.hidden = !editing;
      toolbar.hidden = !(state.moveText && (hasText || toolbar.contains(document.activeElement)));
      const tb = q("tb-text");
      if (document.activeElement !== tb && tb.value !== state.text) tb.value = state.text;
      fontSel.value = state.font;
      q("tb-size").textContent = `${state.effectiveSize ?? state.size} %`;
      q("tb-rot").textContent = `${state.rotation}\xB0`;
      if (!hasText) return;
      const V = (p) => preview.toViewer(p);
      const quad = f2.quad.map(V), top = V(f2.topMid), rot = V(f2.rotate), rs = V(f2.resize);
      svg.setAttribute("width", viewer.clientWidth);
      svg.setAttribute("height", viewer.clientHeight);
      poly.setAttribute("points", quad.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
      stem.setAttribute("x1", top.x);
      stem.setAttribute("y1", top.y);
      stem.setAttribute("x2", rot.x);
      stem.setAttribute("y2", rot.y);
      place(rotHandle, rot, 36, 36);
      place(sizeHandle, rs, 36, 36);
      const tr = quad.reduce((a, p) => p.x - p.y > a.x - a.y ? p : a, quad[0]);
      badge.style.left = `${clamp2(tr.x - 20, 4, viewer.clientWidth - 110)}px`;
      badge.style.top = `${clamp2(tr.y - 34, 4, viewer.clientHeight - 36)}px`;
      if (toolbar.hidden) return;
      const sw = studio.clientWidth, docked = sw < 620;
      toolbar.classList.toggle("ag-docked", docked);
      if (docked) {
        toolbar.style.left = toolbar.style.top = "";
        return;
      }
      const vx = viewer.offsetLeft, vy = viewer.offsetTop, tw = toolbar.offsetWidth, th = toolbar.offsetHeight;
      const pts = [...quad, rot, rs], minY = Math.min(...pts.map((p) => p.y)) - 18 + vy, maxY = Math.max(...pts.map((p) => p.y)) + 18 + vy;
      const cx = quad.reduce((a, p) => a + p.x, 0) / 4 + vx;
      let y = minY - th;
      if (y < 8) y = maxY;
      y = clamp2(y, 8, studio.clientHeight - th - 8);
      toolbar.style.left = `${clamp2(cx - tw / 2, 8, sw - tw - 8)}px`;
      toolbar.style.top = `${y}px`;
    }
    return { layout, elements: { layer, badge, rotHandle, sizeHandle } };
  }

  // ../assets/src/colors.js
  var NAMED = [
    ["Blanc", "#ffffff"],
    ["Cr\xE8me", "#f6f1e1"],
    ["Beige", "#d9c7a3"],
    ["Gris clair", "#c8cccb"],
    ["Gris", "#8a9092"],
    ["Anthracite", "#3a3d3f"],
    ["Noir", "#141414"],
    ["Citron", "#d7ed71"],
    ["Jaune", "#f2c230"],
    ["Or", "#c8a13a"],
    ["Orange", "#eb8a2e"],
    ["Corail", "#f68f65"],
    ["Rouge", "#c0392b"],
    ["Bordeaux", "#692a3d"],
    ["Rose", "#ffc3cc"],
    ["Fuchsia", "#d6428f"],
    ["Lilas", "#c7a3e6"],
    ["Violet", "#3e227e"],
    ["Marine", "#17264d"],
    ["Bleu", "#294cba"],
    ["Bleu ciel", "#8ec5f0"],
    ["Turquoise", "#1a9aa0"],
    ["P\xE9trole", "#17343d"],
    ["Vert for\xEAt", "#164f43"],
    ["Vert", "#3c9a4a"],
    ["Vert d\u2019eau", "#a8dcc4"],
    ["Kaki", "#6f6d3a"],
    ["Marron", "#6b4128"]
  ];
  var rgb2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function colorName(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || "")) return "";
    const [r, g, b] = rgb2(hex.toLowerCase());
    let best = "", d = Infinity;
    for (const [name, h] of NAMED) {
      const [R, G, B] = rgb2(h), rm = (r + R) / 2;
      const dist = (2 + rm / 256) * (r - R) ** 2 + 4 * (g - G) ** 2 + (2 + (255 - rm) / 256) * (b - B) ** 2;
      if (dist < d) {
        d = dist;
        best = name;
      }
    }
    return best;
  }
  var TEXT_SWATCHES = ["#ffffff", "#141414", "#f6f1e1", "#d7ed71", "#f2c230", "#eb8a2e", "#c0392b", "#ffc3cc", "#294cba", "#164f43"];

  // ../assets/src/track.js
  function createTracker(cfg = {}) {
    const enabled = !!cfg.enabled;
    const counts = /* @__PURE__ */ Object.create(null), seen = /* @__PURE__ */ new Set();
    const base = {};
    if (cfg.productId) base.product_id = String(cfg.productId);
    const send = (name, params = {}) => {
      if (!enabled || typeof window.gtag !== "function") return false;
      if ((counts[name] = (counts[name] || 0) + 1) > (cfg.maxPerEvent || 25)) return false;
      try {
        window.gtag("event", name, { ...base, ...params });
        return true;
      } catch (e) {
        return false;
      }
    };
    const once = (key, name, params) => {
      if (seen.has(key)) return false;
      const ok = send(name, params);
      if (ok) seen.add(key);
      return ok;
    };
    return { send, once, has: (key) => seen.has(key), enabled };
  }

  // ../assets/src/flat-view.js
  var MARGIN = 7;
  var HANDLE = 13;
  var lum = (hex) => {
    const n = parseInt(String(hex).slice(1), 16);
    return ((n >> 16) * 0.299 + (n >> 8 & 255) * 0.587 + (n & 255) * 0.114) / 255;
  };
  var FlatView = class {
    /**
     * @param {HTMLElement} stage  element that receives the canvas (sized by CSS)
     * @param {object} o  { preview, signal, onPick(index), onDrag(offsetMm), onDragEnd(),
     *                      onKey(dx, dy), onHandleStart(kind), onResize(ratio), onRotate(deg), onSizeKey(step),
     *                      onEmpty(view) — the visor face carries no text yet and was pressed }
     */
    constructor(stage, o) {
      this.stage = stage;
      this.o = o;
      this.preview = o.preview;
      this.canvas = document.createElement("canvas");
      this.canvas.setAttribute("aria-hidden", "true");
      stage.append(this.canvas);
      this.ctx = this.canvas.getContext("2d");
      const signal = o.signal, on = (el, t, fn, opt = {}) => el.addEventListener(t, fn, { ...opt, signal });
      on(this.canvas, "pointerdown", (e) => this.down(e));
      on(this.canvas, "pointermove", (e) => this.move(e));
      const end = (e) => {
        if (this.drag?.pointer !== e.pointerId) return;
        const kind = this.drag.kind;
        this.drag = null;
        this.canvas.classList.remove("dragging");
        if (kind === "move") this.o.onDragEnd?.();
        else this.render();
      };
      on(this.canvas, "pointerup", end);
      on(this.canvas, "pointercancel", end);
      on(stage, "keydown", (e) => {
        const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (k) {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          this.o.onKey?.(k[0] * step, k[1] * step);
          return;
        }
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          this.o.onSizeKey?.(5);
        }
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          this.o.onSizeKey?.(-5);
        }
      });
      if (window.ResizeObserver) {
        this.ro = new ResizeObserver(() => this.render());
        this.ro.observe(stage);
        signal?.addEventListener("abort", () => this.ro.disconnect());
      }
    }
    /** Screen ↔ mm transform for the current stage size. */
    frame() {
      const w = this.stage.clientWidth, h = this.stage.clientHeight;
      const sg = faceSign(this.preview.state?.view), far = VISOR.depth / 2 + VISOR.setback + MARGIN, near = VISOR.depth / 2 + MARGIN;
      const x0 = -VISOR.width / 2 - MARGIN, x1 = VISOR.width / 2 + MARGIN;
      const y0 = sg > 0 ? -far : -near, y1 = sg > 0 ? near : far;
      const s = Math.max(0.1, Math.min(w / (x1 - x0), h / (y1 - y0)));
      return { w, h, s, ox: w / 2 - s * (x0 + x1) / 2, oy: h / 2 - s * (y0 + y1) / 2 };
    }
    toMm(e) {
      const r = this.canvas.getBoundingClientRect(), f2 = this.T || this.frame();
      return { x: (e.clientX - r.left - f2.ox) / f2.s, y: (e.clientY - r.top - f2.oy) / f2.s };
    }
    toScreen(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    /** Texts drawn on the face currently shown: [{ index, info, state }]. */
    entries() {
      const p = this.preview, view = p.state?.view, c = view && p.cache?.[view];
      if (!c?.infos) return [];
      return Object.entries(c.infos).map(([i, e]) => ({ index: Number(i), ...e })).filter((e) => e.info?.glyphs?.length);
    }
    /** Box of a text in its own rotated frame (mm, without the measuring pad). */
    box(e) {
      const rot = (e.state.rotation || 0) * Math.PI / 180, c = Math.cos(rot), s = Math.sin(rot);
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const [x, y] of e.info.localSamples) {
        const u = x * c + y * s, v = -x * s + y * c;
        u0 = Math.min(u0, u);
        u1 = Math.max(u1, u);
        v0 = Math.min(v0, v);
        v1 = Math.max(v1, v);
      }
      const pad = 0.3 + (e.state.outline ? e.info.size * 0.075 / 2 : 0);
      return { u0: u0 + pad, u1: u1 - pad, v0: v0 + pad, v1: v1 - pad, c, s, off: e.info.offset };
    }
    /** Frame corners, centre and handles of the active text (screen px). */
    handles() {
      const act = this.entries().find((e) => e.index === this.preview.activeIndex());
      const f2 = this.T;
      if (!act || !f2) return null;
      const b = this.box(act), g = 1.5;
      const mm = (u, v) => ({ x: u * b.c - v * b.s + b.off.x, y: u * b.s + v * b.c + b.off.y });
      const S = (p) => ({ x: f2.ox + p.x * f2.s, y: f2.oy + p.y * f2.s });
      const quad = [mm(b.u0 - g, b.v0 - g), mm(b.u1 + g, b.v0 - g), mm(b.u1 + g, b.v1 + g), mm(b.u0 - g, b.v1 + g)].map(S);
      const centerMm = mm((b.u0 + b.u1) / 2, (b.v0 + b.v1) / 2), topMid = S(mm((b.u0 + b.u1) / 2, b.v0 - g));
      const up = { x: b.s, y: -b.c }, reach = HANDLE + 16;
      return {
        act,
        box: b,
        quad,
        centerMm,
        topMid,
        rotate: { x: topMid.x + up.x * reach, y: topMid.y + up.y * reach },
        resize: quad[2]
      };
    }
    hit(m) {
      const list = this.entries(), active = this.preview.activeIndex();
      list.sort((a, b) => (b.index === active) - (a.index === active));
      for (const e of list) {
        const b = this.box(e), x = m.x - b.off.x, y = m.y - b.off.y, u = x * b.c + y * b.s, v = -x * b.s + y * b.c, g = 2.5;
        if (u >= b.u0 - g && u <= b.u1 + g && v >= b.v0 - g && v <= b.v1 + g) return e;
      }
      return null;
    }
    hitHandle(pt) {
      const h = this.handles();
      if (!h) return null;
      for (const kind of ["rotate", "resize"]) if (Math.hypot(pt.x - h[kind].x, pt.y - h[kind].y) <= HANDLE + 6) return { kind, h };
      return null;
    }
    down(e) {
      if (e.button !== 0 || !this.preview.ready) return;
      const pt = this.toScreen(e), m = this.toMm(e), handle = this.hitHandle(pt);
      if (handle) {
        e.preventDefault();
        this.stage.focus({ preventScroll: true });
        this.o.onHandleStart?.(handle.kind);
        const c = handle.h.centerMm;
        this.drag = { pointer: e.pointerId, kind: handle.kind, center: c, d0: Math.hypot(m.x - c.x, m.y - c.y) || 1 };
        this.canvas.setPointerCapture(e.pointerId);
        this.canvas.classList.add("dragging");
        return;
      }
      const hit = this.hit(m);
      if (!hit) {
        if (!this.entries().length && onVisor(m.x, m.y, true, this.preview.state.view)) {
          e.preventDefault();
          this.o.onEmpty?.(this.preview.state.view);
        }
        return;
      }
      e.preventDefault();
      this.stage.focus({ preventScroll: true });
      if (hit.index !== this.preview.activeIndex()) this.o.onPick?.(hit.index);
      this.drag = { pointer: e.pointerId, kind: "move", start: m, offset: { ...hit.info.offset } };
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.classList.add("dragging");
    }
    move(e) {
      if (!this.drag) {
        if (!this.preview.ready) return;
        const handle = this.hitHandle(this.toScreen(e));
        const m2 = this.toMm(e);
        this.canvas.style.cursor = handle ? handle.kind === "resize" ? "nwse-resize" : "grab" : this.hit(m2) ? "grab" : !this.entries().length && onVisor(m2.x, m2.y, true, this.preview.state.view) ? "text" : "";
        return;
      }
      if (this.drag.pointer !== e.pointerId) return;
      e.preventDefault();
      const m = this.toMm(e), d = this.drag;
      if (d.kind === "move") this.o.onDrag?.({ x: d.offset.x + m.x - d.start.x, y: d.offset.y + m.y - d.start.y });
      else if (d.kind === "resize") this.o.onResize?.(Math.hypot(m.x - d.center.x, m.y - d.center.y) / d.d0);
      else {
        let r = Math.atan2(m.y - d.center.y, m.x - d.center.x) * 180 / Math.PI + 90;
        r = ((r + 180) % 360 + 360) % 360 - 180;
        if (e.shiftKey) r = Math.round(r / 15) * 15;
        this.o.onRotate?.(r);
      }
    }
    render() {
      const p = this.preview;
      if (!p.ready || !p.state) return;
      const f2 = this.T = this.frame(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round(f2.w * dpr), ch = Math.round(f2.h * dpr);
      if (this.canvas.width !== cw || this.canvas.height !== ch) {
        this.canvas.width = cw;
        this.canvas.height = ch;
        this.canvas.style.width = `${f2.w}px`;
        this.canvas.style.height = `${f2.h}px`;
      }
      const ctx = this.ctx, X = (x) => f2.ox + x * f2.s, Y = (y) => f2.oy + y * f2.s;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, f2.w, f2.h);
      ctx.save();
      ctx.lineWidth = 1;
      for (const axis of ["x", "y"]) {
        const lo = Math.floor(((axis === "x" ? 0 : 0) - (axis === "x" ? f2.ox : f2.oy)) / f2.s / 10) * 10, hi = ((axis === "x" ? f2.w : f2.h) - (axis === "x" ? f2.ox : f2.oy)) / f2.s;
        for (let v = lo; v <= hi; v += 10) {
          ctx.strokeStyle = v % 50 === 0 ? "rgba(20,35,60,.11)" : "rgba(20,35,60,.05)";
          const sv = Math.round(axis === "x" ? X(v) : Y(v)) + 0.5;
          ctx.beginPath();
          axis === "x" ? (ctx.moveTo(sv, 0), ctx.lineTo(sv, f2.h)) : (ctx.moveTo(0, sv), ctx.lineTo(f2.w, sv));
          ctx.stroke();
        }
      }
      ctx.restore();
      const brim = p.state.colors?.brim || "#1d1e20", dark = lum(brim) < 0.55;
      const sg = faceSign(p.state.view), outline = outlineFor(p.state.view);
      const path = () => {
        ctx.beginPath();
        outline.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)));
        ctx.closePath();
      };
      ctx.save();
      ctx.shadowColor = "rgba(20,35,60,.18)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      path();
      ctx.fillStyle = brim;
      ctx.fill();
      ctx.restore();
      path();
      ctx.lineWidth = 1;
      ctx.strokeStyle = dark ? "rgba(20,35,60,.55)" : "rgba(20,35,60,.35)";
      ctx.stroke();
      ctx.save();
      path();
      ctx.clip();
      const o = VISOR_ARCS.outer;
      ctx.beginPath();
      ctx.arc(X(0), Y(sg * o.cy), (o.r - 3) * f2.s, 0, Math.PI * 2);
      ctx.setLineDash([Math.max(2, 2.2 * f2.s), Math.max(2, 1.6 * f2.s)]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = dark ? "rgba(255,255,255,.28)" : "rgba(20,35,60,.22)";
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = dark ? "rgba(255,255,255,.35)" : "rgba(20,35,60,.3)";
      ctx.lineWidth = 1;
      const yOut = sg * (o.cy + o.r), s = VISOR_ARCS.seam, ySeam = sg * (s.cy + s.r);
      ctx.beginPath();
      ctx.moveTo(X(0) + 0.5, Y(yOut) - 6 * sg);
      ctx.lineTo(X(0) + 0.5, Y(yOut));
      ctx.moveTo(X(0) + 0.5, Y(ySeam));
      ctx.lineTo(X(0) + 0.5, Y(ySeam) + 6 * sg);
      ctx.stroke();
      ctx.restore();
      const entries = this.entries(), active = p.activeIndex();
      if (!entries.length) {
        const coarse = window.matchMedia?.("(pointer: coarse)").matches;
        const lines = [coarse ? "Touchez la visi\xE8re" : "Cliquez sur la visi\xE8re", "pour \xE9crire votre texte"];
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = dark ? "rgba(255,255,255,.8)" : "rgba(20,35,60,.72)";
        let size = Math.max(12, Math.min(18, 4.2 * f2.s));
        const fit = () => {
          ctx.font = `600 ${size}px Barlow, "Helvetica Neue", Arial, sans-serif`;
          return Math.max(...lines.map((l) => ctx.measureText(l).width));
        };
        while (size > 10 && fit() > VISOR.width * f2.s * 0.62) size -= 1;
        lines.forEach((l, i) => ctx.fillText(l, X(0), Y(2 * sg) + (i - 0.5) * size * 1.3));
        ctx.restore();
      }
      for (const e of entries) {
        const outline2 = e.state.active ? p.outlineColor : e.state.outlineColor || "#000";
        ctx.save();
        ctx.globalAlpha = 0.3;
        paintGlyphs(ctx, e.info, e.state, outline2, f2.s, f2.ox, f2.oy, e.info.offset);
        ctx.restore();
        ctx.save();
        path();
        ctx.clip();
        paintGlyphs(ctx, e.info, e.state, outline2, f2.s, f2.ox, f2.oy, e.info.offset);
        ctx.restore();
      }
      const h = this.handles();
      if (h) {
        const q = h.quad;
        ctx.save();
        ctx.beginPath();
        q.forEach(({ x, y }, i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath();
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255,255,255,.9)";
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#14233c";
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(h.topMid.x, h.topMid.y);
        ctx.lineTo(h.rotate.x, h.rotate.y);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        const dragging = this.drag?.kind;
        for (const kind of ["rotate", "resize"]) {
          const c = h[kind], on = dragging === kind;
          ctx.save();
          ctx.beginPath();
          ctx.arc(c.x, c.y, HANDLE, 0, Math.PI * 2);
          ctx.fillStyle = on ? "#fac811" : "#fbf8f1";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#14233c";
          ctx.stroke();
          ctx.strokeStyle = "#14233c";
          ctx.lineWidth = 1.8;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          if (kind === "rotate") {
            ctx.arc(c.x, c.y, 5.5, -Math.PI * 0.85, Math.PI * 0.45);
            const a = Math.PI * 0.45, ex = c.x + 5.5 * Math.cos(a), ey = c.y + 5.5 * Math.sin(a);
            ctx.moveTo(ex - 3.5, ey - 0.5);
            ctx.lineTo(ex, ey);
            ctx.lineTo(ex + 0.5, ey - 3.5);
          } else {
            ctx.moveTo(c.x - 5, c.y - 5);
            ctx.lineTo(c.x + 5, c.y + 5);
            ctx.moveTo(c.x + 5, c.y + 1);
            ctx.lineTo(c.x + 5, c.y + 5);
            ctx.lineTo(c.x + 1, c.y + 5);
            ctx.moveTo(c.x - 5, c.y - 1);
            ctx.lineTo(c.x - 5, c.y - 5);
            ctx.lineTo(c.x - 1, c.y - 5);
          }
          ctx.stroke();
          ctx.restore();
        }
        const b = h.box, label = `${Math.round(b.u1 - b.u0)} \xD7 ${Math.round(b.v1 - b.v0)} mm`;
        const bottom = q.reduce((a, c) => c.y > a.y ? c : a), cx = (q[2].x + q[3].x) / 2;
        ctx.save();
        ctx.font = '600 12px Barlow, "Helvetica Neue", Arial, sans-serif';
        const tw = ctx.measureText(label).width + 12, ty = Math.min(f2.h - 22, bottom.y + 8), tx = Math.min(Math.max(2, cx - tw / 2), f2.w - tw - 2);
        ctx.fillStyle = "#14233c";
        ctx.fillRect(tx, ty, tw, 20);
        ctx.fillStyle = "#fbf8f1";
        ctx.textBaseline = "middle";
        ctx.fillText(label, tx + 6, ty + 10.5);
        ctx.restore();
        this.activeLabel = label;
      } else this.activeLabel = "";
      this.o.onRendered?.(this);
    }
  };

  // ../assets/src/configurator.js
  var colorsFromPalette = (p) => ({ base: p.base, accent: p.accent, light: p.light, brim: p.base, trim: p.accent });
  function contrast(hex) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 145 ? "#142a32" : "#ffffff";
  }
  function mount(root, options = {}) {
    if (root.__atelierGapette) return root.__atelierGapette;
    const opts = { order: { mode: "none" }, ...options };
    const solid = opts.solid && Array.isArray(opts.solid.colors) && opts.solid.colors.length ? opts.solid : null;
    const capOf = (hex) => solid && solid.colors.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase()) || null;
    const solidColors = (hex) => ({ base: hex, accent: hex, light: hex, brim: hex, trim: hex });
    const textPal = solid && Array.isArray(solid.textColors) && solid.textColors.length ? solid.textColors.map((c) => ({ hex: String(c.hex).toLowerCase(), label: c.label || "" })) : null;
    const outlineOk = !solid || solid.outline !== false;
    const lum2 = (h) => parseInt(h.slice(1, 3), 16) * 0.299 + parseInt(h.slice(3, 5), 16) * 0.587 + parseInt(h.slice(5, 7), 16) * 0.114;
    const autoText = (capHex) => textPal ? textPal.reduce((best, c) => Math.abs(lum2(c.hex) - lum2(capHex)) > Math.abs(lum2(best.hex) - lum2(capHex)) ? c : best, textPal[0]).hex : contrast(capHex) === "#ffffff" ? "#ffffff" : "#141414";
    const abort = new AbortController(), signal = abort.signal;
    const on = (el, type, fn, o = {}) => el && el.addEventListener(type, fn, { ...o, signal });
    const q = (name) => root.querySelector(`[data-ag="${name}"]`);
    const qa = (sel) => Array.from(root.querySelectorAll(sel));
    const timers = /* @__PURE__ */ new Set();
    const tracker = createTracker(opts.track), track = tracker.send, trackOnce = tracker.once;
    ["pointerdown", "keydown", "input"].forEach((t) => on(root, t, () => trackOnce("config_started", "config_started"), { capture: true, passive: true }));
    const state = {
      pattern: "peloton",
      palette: 0,
      colors: colorsFromPalette(palettes[0]),
      text: q("cap-text")?.value ?? "ROULE MA POULE",
      placement: "top",
      font: DEFAULT_FONT,
      color: "#ffffff",
      size: 100,
      outline: false,
      curve: 100,
      rotation: 0,
      effectiveSize: null,
      view: "top",
      brimRaised: false,
      detail: false,
      moveText: false,
      textOffsets: { top: { x: 0, y: 0 }, bottom: { x: 0, y: 0 } },
      imageSettings: { scale: 100, x: 0, y: 0 }
    };
    let preview, flat = null, flatStart = null, editor = null, swatchColors, imageName = "", imageRequest = 0, lastPattern = "peloton";
    const TEXT_KEYS = ["text", "placement", "font", "color", "size", "outline", "curve", "rotation", "effectiveSize", "textOffsets"];
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const packActive = () => clone(Object.fromEntries(TEXT_KEYS.map((k) => [k, state[k]])));
    const commitActive = () => {
      state.texts[state.active] = packActive();
    };
    const loadActive = () => {
      Object.assign(state, clone(state.texts[state.active]));
    };
    state.active = 0;
    state.texts = [packActive()];
    function activateText(i, focus = false) {
      if (i < 0 || i >= state.texts.length) return;
      commitActive();
      state.active = i;
      loadActive();
      setView(state.placement, false, state.detail);
      if (focus) q("cap-text").focus({ preventScroll: true });
    }
    function freeOffset(side, except) {
      const taken = state.texts.filter((t, i) => i !== except && t.placement === side && t.text.trim()).map((t) => t.textOffsets[side] || { x: 0, y: 0 });
      for (const y of [0, 13, -12, 24]) if (!taken.some((o) => Math.abs(o.y - y) < 10 && Math.abs(o.x) < 45)) return { x: 0, y };
      return { x: 0, y: 0 };
    }
    function addText() {
      if (state.texts.length >= MAX_TEXTS) return;
      commitActive();
      const used = state.texts.filter((t) => t.text.trim()).map((t) => t.placement);
      const side = used.includes(state.placement) && !used.includes(state.placement === "top" ? "bottom" : "top") ? state.placement === "top" ? "bottom" : "top" : state.placement;
      state.texts.push({
        text: "",
        placement: side,
        font: state.font,
        color: state.color,
        size: 70,
        outline: false,
        curve: 100,
        rotation: 0,
        effectiveSize: null,
        textOffsets: { top: { x: 0, y: 0 }, bottom: { x: 0, y: 0 }, [side]: freeOffset(side, -1) }
      });
      state.active = state.texts.length - 1;
      loadActive();
      state.moveText = false;
      setView(state.placement, false, false);
      q("cap-text").focus({ preventScroll: true });
      announce(`Texte ${state.active + 1} ajout\xE9. Saisissez-le.`);
    }
    function removeText(index = state.active) {
      commitActive();
      if (state.texts[index] && state.texts[index].text.trim()) track("text_removed", { text_count: Math.max(0, state.texts.filter((t) => t.text.trim()).length - 1) });
      if (state.texts.length < 2) {
        if (!state.text.trim()) return;
        state.text = "";
        state.effectiveSize = null;
        q("cap-text").value = "";
      } else {
        state.texts.splice(index, 1);
        if (index < state.active || state.active >= state.texts.length) state.active = Math.max(0, state.active - 1);
        loadActive();
      }
      state.moveText = false;
      setView(state.placement, false, false);
      announce("Texte supprim\xE9. \xAB Annuler \xBB permet de le r\xE9cup\xE9rer.");
    }
    function buildTextTabs() {
      const box = q("text-tabs");
      if (!box) return;
      const key = JSON.stringify([state.active, state.texts.map((t, i) => i === state.active ? state.text : t.text)]);
      if (box.dataset.key === key) return;
      box.dataset.key = key;
      const tabs = state.texts.map((t, i) => {
        const value = (i === state.active ? state.text : t.text).trim();
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ag-text-tab";
        b.dataset.textIndex = String(i);
        b.setAttribute("aria-pressed", String(i === state.active));
        const n = document.createElement("span");
        n.className = "ag-text-tab-n";
        n.textContent = String(i + 1);
        const l = document.createElement("span");
        l.className = "ag-text-tab-label";
        l.textContent = value || "Nouveau texte";
        b.append(n, l);
        b.setAttribute("aria-label", `Texte ${i + 1}${value ? ` : ${value}` : ""}`);
        on(b, "click", () => activateText(i));
        if (state.texts.length < 2 && !value) return b;
        const wrap = document.createElement("span");
        wrap.className = "ag-text-tab-wrap";
        wrap.dataset.active = String(i === state.active);
        const x = document.createElement("button");
        x.type = "button";
        x.className = "ag-text-tab-x";
        x.dataset.removeIndex = String(i);
        x.setAttribute("aria-label", `Supprimer le texte ${i + 1}${value ? ` : ${value}` : ""}`);
        x.title = "Supprimer ce texte";
        const cross = document.createElement("span");
        cross.setAttribute("aria-hidden", "true");
        cross.className = "ag-ico ag-ico-corbeille";
        x.append(cross);
        on(x, "click", () => removeText(i));
        wrap.append(b, x);
        return wrap;
      });
      if (state.texts.length < MAX_TEXTS) {
        const add = document.createElement("button");
        add.type = "button";
        add.className = "ag-text-tab ag-text-add";
        const plus = document.createElement("span");
        plus.setAttribute("aria-hidden", "true");
        plus.className = "ag-ico ag-ico-plus";
        add.append(plus, " Ajouter un texte");
        on(add, "click", addText);
        tabs.push(add);
      }
      box.replaceChildren(...tabs);
      const rm = q("remove-text");
      if (rm) rm.hidden = state.texts.length < 2 && !state.text.trim();
    }
    let textColorChosen = false, colorSelect = null;
    if (solid) {
      const first = solid.colors.find((c) => c.id === solid.default) || solid.colors[0];
      state.pattern = "plain";
      lastPattern = "plain";
      state.palette = null;
      state.colors = solidColors(first.hex);
      state.color = autoText(first.hex);
      if (textPal) {
        const other = root.querySelector(".ag-swatch-other");
        if (other) other.style.display = "none";
      }
      if (!outlineOk) {
        const o = q("outline");
        if (o) {
          o.checked = false;
          (o.closest("label") || o).style.display = "none";
        }
      }
    }
    function setCapColor(id) {
      const c = solid && solid.colors.find((x) => x.id === id);
      if (!c) return;
      state.colors = solidColors(c.hex);
      const auto = autoText(c.hex);
      commitActive();
      for (const t of state.texts) if (textPal || !textColorChosen || colorName(t.color) === colorName(c.hex)) t.color = auto;
      loadActive();
      update();
    }
    function findColorSelect(form) {
      if (!solid || !form) return null;
      return Array.from(form.querySelectorAll('select[name^="attribute_"]')).find((sel) => Array.from(sel.options).some((o) => termId(o.value) || termId(o.textContent))) || null;
    }
    const slug = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    function termId(v) {
      const s = slug(v);
      if (!s) return null;
      const c = solid.colors.find((x) => x.id === s || (x.terms || []).includes(s));
      return c ? c.id : null;
    }
    function syncColorSelect() {
      if (!colorSelect) return;
      const cap = capOf(state.colors.base);
      if (!cap) return;
      if (termId(colorSelect.value) === cap.id) return;
      const opt = Array.from(colorSelect.options).find((o) => o.value && (termId(o.value) === cap.id || termId(o.textContent) === cap.id));
      if (!opt) return;
      colorSelect.value = opt.value;
      colorSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
    function buildControls() {
      patterns.forEach((p) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "pattern-button";
        button.dataset.pattern = p.id;
        button.setAttribute("aria-pressed", String(p.id === state.pattern));
        const canvas = document.createElement("canvas");
        canvas.width = 220;
        canvas.height = 120;
        canvas.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.textContent = p.name;
        button.append(canvas, label);
        on(button, "click", () => {
          state.pattern = p.id;
          lastPattern = p.id;
          update();
        });
        q("patterns").append(button);
      });
      Object.entries(FONTS).forEach(([id, f2]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "font-button";
        button.dataset.font = id;
        button.setAttribute("aria-pressed", String(id === state.font));
        button.setAttribute("aria-label", f2.label);
        const sample = document.createElement("span");
        sample.className = "font-sample";
        sample.textContent = f2.capsOnly ? "GAPETTE" : "Gapette";
        sample.style.fontFamily = `"${f2.family}"`;
        sample.style.fontWeight = f2.weight;
        sample.style.fontStyle = f2.style;
        const label = document.createElement("span");
        label.className = "font-label";
        label.textContent = f2.label;
        button.append(sample, label);
        on(button, "click", () => {
          track("font_changed", { font: id });
          state.font = id;
          if (state.view !== state.placement) setView(state.placement, false, true);
          else update();
        });
        q("fonts").append(button);
      });
      palettes.forEach((p, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "palette-button";
        button.dataset.palette = p.id;
        button.style.background = `linear-gradient(135deg,${p.base} 50%,${p.accent} 50%)`;
        button.title = p.name;
        button.setAttribute("aria-label", p.name);
        button.setAttribute("aria-pressed", String(i === state.palette));
        on(button, "click", () => {
          state.palette = i;
          state.colors = colorsFromPalette(p);
          update();
        });
        q("palettes").append(button);
      });
    }
    function buildCapColors() {
      const box = q("cap-colors");
      if (!box || !solid) return;
      box.replaceChildren(...solid.colors.map((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ag-cap-color";
        b.dataset.capColor = c.id;
        const dot = document.createElement("span");
        dot.className = "ag-cap-dot";
        dot.style.background = c.hex;
        dot.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.textContent = c.label;
        b.append(dot, label);
        on(b, "click", () => {
          setCapColor(c.id);
          track("color_selected", { color: c.id });
        });
        return b;
      }));
    }
    function update() {
      if (!FONTS[state.font]) state.font = LEGACY_FONTS[state.font] || DEFAULT_FONT;
      if (!Array.isArray(state.texts) || !state.texts.length) {
        state.texts = [packActive()];
        state.active = 0;
      }
      state.active = Math.max(0, Math.min(state.texts.length - 1, state.active || 0));
      commitActive();
      state.layers = state.texts.map((t) => ({ ...t, fontCanvas: (FONTS[t.font] || FONTS[DEFAULT_FONT]).canvas, outlineColor: contrast(t.color) }));
      buildTextTabs();
      if (solid) {
        const cap2 = capOf(state.colors.base) || solid.colors.find((c) => c.id === solid.default) || solid.colors[0];
        state.pattern = "plain";
        state.palette = null;
        if (Object.values(state.colors).some((v) => String(v).toLowerCase() !== cap2.hex.toLowerCase())) state.colors = solidColors(cap2.hex);
      }
      const p = state.colors;
      const cap = solid ? capOf(p.base) : null;
      if (cap) {
        qa("[data-cap-color]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.capColor === cap.id)));
        const out = q("cap-color-name");
        if (out) out.textContent = cap.label;
      }
      const paletteName = cap ? cap.label : state.palette === null ? "Couleurs personnalis\xE9es" : palettes[state.palette].name;
      q("palette-name").textContent = paletteName;
      qa("[data-surface-color]").forEach((input) => {
        const value = p[input.dataset.surfaceColor];
        input.value = value;
        root.querySelector(`[data-color-value="${input.dataset.surfaceColor}"]`).textContent = colorName(value);
      });
      qa("[data-ag-placement]").forEach((input) => {
        input.checked = input.value === state.placement;
      });
      const swatchKey = [p.base, p.accent, p.light].join();
      qa("[data-pattern]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.pattern === state.pattern));
        if (swatchKey !== swatchColors) {
          const c = b.querySelector("canvas");
          drawPattern(c.getContext("2d"), b.dataset.pattern, p, c.width, c.height);
        }
      });
      if (swatchKey !== swatchColors) buildTextSwatches();
      swatchColors = swatchKey;
      qa(".palette-button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === state.palette)));
      const name = cap ? "Gapette" : state.pattern === "custom" ? "Mon image" : patterns.find((x) => x.id === state.pattern).name;
      q("pattern-name").textContent = name;
      q("character-count").textContent = `${graphemes(state.text).length} / ${MAX_GRAPHEMES}`;
      q("size-value").textContent = `${state.size} %`;
      q("color-label").textContent = colorName(state.color);
      qa("[data-text-color]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.textColor === state.color.toLowerCase())));
      if (!FONTS[state.font]) state.font = LEGACY_FONTS[state.font] || DEFAULT_FONT;
      qa("[data-font]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.font === state.font)));
      q("font-name").textContent = FONTS[state.font].label;
      q("text-color").value = state.color;
      q("size").value = state.size;
      q("outline").checked = state.outline;
      q("curve").value = state.curve;
      q("rotation").value = state.rotation;
      q("curve-value").textContent = state.curve === 0 ? "droit" : `${state.curve > 0 ? "" : "\u2212"}${Math.abs(state.curve)} %${state.curve < 0 ? " (invers\xE9)" : ""}`;
      q("rotation-value").textContent = `${state.rotation > 0 ? "+" : state.rotation < 0 ? "\u2212" : ""}${Math.abs(state.rotation)}\xB0`;
      const shape = shapeOf(state);
      qa("[data-shape]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.shape === shape)));
      showFitNote();
      if (q("cap-text").value !== state.text) q("cap-text").value = state.text;
      const face = state.placement === "top" ? "dessus" : "dessous", brim = state.brimRaised ? "relev\xE9e" : "baiss\xE9e";
      q("summary").replaceChildren(
        document.createTextNode(cap ? `Gapette ${cap.label.toLowerCase()}` : `${name} \xB7 ${paletteName}`),
        document.createElement("br"),
        document.createTextNode(summaryText(cap, brim))
      );
      q("viewer").setAttribute("aria-label", `${cap ? `Gapette ${cap.label.toLowerCase()}` : `Gapette motif ${name}, ${paletteName}`}, visi\xE8re ${brim}${state.text ? `, texte \xAB ${state.text} \xBB sur le ${face} de la visi\xE8re` : ""}. Vue fixe de trois quarts.`);
      const bad = unsupportedChars(state.text), err = q("text-error");
      q("cap-text").setAttribute("aria-invalid", String(!!bad.length));
      if (err) {
        err.hidden = !bad.length;
        err.textContent = bad.length ? `Caract\xE8re(s) non disponible(s) dans les polices : ${bad.join(" ")}` : "";
      }
      syncTextPosition();
      q("image-controls").hidden = !imageName;
      q("use-image").setAttribute("aria-pressed", String(state.pattern === "custom"));
      for (const key of ["scale", "x", "y"]) {
        q("image-" + key).value = state.imageSettings[key];
        q("image-" + key + "-value").textContent = state.imageSettings[key] + (key === "scale" ? " %" : "");
      }
      preview?.update(state, FONTS[state.font].canvas, contrast(state.color));
      syncColorSelect();
      scheduleOrderFields();
      recordHistory();
    }
    function buildTextSwatches() {
      const box = q("text-swatches");
      if (!box) return;
      const seen = /* @__PURE__ */ new Set(), list = [];
      if (solid && !textPal) seen.add(colorName(state.colors.base));
      for (const c of (textPal ? textPal.map((x) => x.hex) : solid ? TEXT_SWATCHES : [state.colors.base, state.colors.accent, state.colors.light, ...TEXT_SWATCHES]).map((x) => x.toLowerCase())) {
        const n = colorName(c);
        if (!textPal && seen.has(n)) continue;
        seen.add(n);
        list.push(c);
      }
      list.splice(12);
      if (!list.includes(state.color.toLowerCase()) && seen.has(colorName(state.color))) {
      }
      box.replaceChildren(...list.map((hex) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ag-swatch";
        b.dataset.textColor = hex;
        const lab = textPal && (textPal.find((c) => c.hex === hex) || {}).label || colorName(hex);
        b.style.background = hex;
        b.title = lab;
        b.setAttribute("aria-label", lab);
        b.setAttribute("aria-pressed", String(hex === state.color.toLowerCase()));
        on(b, "click", () => {
          state.color = hex;
          textColorChosen = true;
          if (state.view !== state.placement) setView(state.placement, false, true);
          else update();
        });
        return b;
      }));
    }
    const HISTORY_KEYS = ["pattern", "palette", "colors", "text", "placement", "font", "color", "size", "outline", "curve", "rotation", "textOffsets", "imageSettings", "texts", "active"];
    const snapshot = () => JSON.stringify(HISTORY_KEYS.map((k) => k === "texts" ? state.texts.map((t) => ({ ...t, effectiveSize: null })) : state[k]));
    const history = { past: [], future: [], last: 0, applying: false, current: null };
    function recordHistory() {
      if (history.applying) return;
      const snap = snapshot();
      if (history.current === null) {
        history.current = snap;
        syncHistoryButtons();
        return;
      }
      if (snap === history.current) return;
      const now = Date.now();
      if (!(now - history.last < 700 && history.past.length)) history.past.push(history.current);
      if (history.past.length > 60) history.past.shift();
      history.current = snap;
      history.future = [];
      history.last = now;
      syncHistoryButtons();
    }
    function restore(snap) {
      const values = JSON.parse(snap);
      history.applying = true;
      HISTORY_KEYS.forEach((k, i) => {
        state[k] = values[i];
      });
      state.effectiveSize = null;
      if (state.pattern === "custom" && !imageName) state.pattern = lastPattern;
      setView(state.view, false, state.detail);
      history.applying = false;
      history.current = snapshot();
      history.last = 0;
      syncHistoryButtons();
    }
    function undo() {
      if (!history.past.length) return;
      track("undo_used");
      history.future.push(history.current);
      restore(history.past.pop());
      announce("Modification annul\xE9e");
    }
    function redo() {
      if (!history.future.length) return;
      track("redo_used");
      history.past.push(history.current);
      restore(history.future.pop());
      announce("Modification r\xE9tablie");
    }
    function syncHistoryButtons() {
      const u = q("undo"), r = q("redo");
      if (u) u.disabled = !history.past.length;
      if (r) r.disabled = !history.future.length;
    }
    const filledTexts = () => state.texts.filter((t) => t.text.trim());
    function summaryText(cap, brim) {
      const list = filledTexts();
      if (!list.length) return cap ? "Ajoutez votre texte pour commander" : `Sans texte \xB7 Visi\xE8re ${brim}`;
      if (list.length > 1) return list.map((t2) => `\xAB ${t2.text} \xBB (${t2.placement === "top" ? "dessus" : "dessous"})`).join(" \xB7 ");
      const t = list[0], face = t.placement === "top" ? "dessus" : "dessous";
      return state.text.trim() ? `\xAB ${state.text} \xBB sur le ${face} \xB7 ${FONTS[state.font].label} \xB7 ${shapeLabel()} \xB7 ${state.effectiveSize ?? state.size} %` : `\xAB ${t.text} \xBB sur le ${face}`;
    }
    function shapeLabel() {
      const sh = shapeOf(state);
      return sh ? SHAPES[sh].label : `courbure ${state.curve} % \xB7 ${state.rotation}\xB0`;
    }
    function showFitNote() {
      const note = q("fit-note");
      if (!note) return;
      const eff = state.effectiveSize;
      const reduced = state.text.trim() && eff != null && eff < state.size;
      const over = !!state.text.trim() && !!preview?.cache?.[state.placement]?.over?.[state.active];
      if (tracker.has("config_started") && (over || reduced)) trackOnce(`overflow:${state.active}:${state.placement}:${over ? "edge" : "size"}`, "overflow_warning", { reason: over ? "edge" : "size_reduced", position: state.placement });
      note.hidden = !reduced && !over;
      note.textContent = [reduced ? `Taille ramen\xE9e \xE0 ${eff} % pour que le texte tienne sur la visi\xE8re.` : "", over ? "Le texte touche le bord de la visi\xE8re : ce qui d\xE9passe ne sera pas imprim\xE9." : ""].filter(Boolean).join(" ");
    }
    function setView(view, immediate = false, detail = false) {
      state.view = view;
      state.brimRaised = view === "bottom";
      state.detail = detail;
      q("detail-toggle").setAttribute("aria-pressed", String(detail));
      {
        const dl = q("detail-toggle").querySelector("[data-ag=detail-label]");
        if (dl) dl.textContent = detail ? "Vue d\u2019ensemble" : "Zoom sur le texte";
      }
      root.classList.toggle("ag-is-detail", detail);
      q("studio").classList.toggle("detail-mode", detail);
      qa("[data-view]").forEach((button) => {
        const active = button.dataset.view === view;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      {
        const ff = q("flat-face");
        if (ff) ff.textContent = view === "top" ? "dessus de la visi\xE8re" : "dessous de la visi\xE8re";
      }
      update();
    }
    const setBrimRaised = (raised) => setView(raised ? "bottom" : "top", false, state.detail);
    function syncTextPosition() {
      const offset = state.textOffsets[state.placement];
      for (const key of ["x", "y"]) {
        q("text-" + key).value = offset[key];
        q("text-" + key + "-value").textContent = `${offset[key] > 0 ? "+" + offset[key] : String(offset[key])} mm`;
      }
      q("move-text").setAttribute("aria-pressed", String(state.moveText));
      q("move-text").textContent = state.moveText ? "Terminer la modification" : "Modifier sur l\u2019aper\xE7u";
      for (const id of ["move-text", "center-text", "text-x", "text-y"]) q(id).disabled = !state.text.trim();
      q("move-help").textContent = state.moveText ? "Glissez le texte pour le d\xE9placer, la poign\xE9e \u27F3 pour l\u2019incliner, la poign\xE9e \u2921 pour l\u2019agrandir. Clavier : fl\xE8ches, + / \u2212, [ / ], \xC9chap." : "Touchez le texte sur l\u2019aper\xE7u pour le d\xE9placer, l\u2019incliner et l\u2019agrandir.";
    }
    function changeTextPosition(position) {
      state.textOffsets[state.placement] = { ...position };
      if (state.view !== state.placement) setView(state.placement, false, true);
      else update();
    }
    const imageMessage = (text, error = false) => {
      q("image-status").textContent = text;
      q("image-status").dataset.error = String(error);
    };
    const setImageName = (name) => {
      const n = q("image-name");
      if (n) n.textContent = name || "Aucune image";
    };
    buildControls();
    buildCapColors();
    preview = new ProductPreview(
      q("viewer"),
      q("render-error"),
      (view, offset) => {
        state.textOffsets[view] = { ...offset };
        syncTextPosition();
        scheduleOrderFields();
      },
      {
        materialsUrl: opts.materialsUrl,
        // 0.11: with the flat view, texts are placed there; the 3/4 view is the realistic preview
        editable: !q("flat-stage"),
        onSelectText: () => select(false),
        onPickText: (i) => {
          activateText(i);
          if (!q("flat-stage")) select(false);
        },
        onLayerMove: (i, view, offset) => {
          if (state.texts[i]) state.texts[i].textOffsets[view] = { ...offset };
          scheduleOrderFields();
        },
        onBlank: () => deselect(false),
        onRender: () => {
          editor?.layout();
          showFitNote();
          flat?.render();
        },
        onFit: (view, size, index) => {
          if (index !== void 0 && index !== state.active) return;
          if (view !== state.placement) return;
          state.effectiveSize = size;
          showFitNote();
          scheduleOrderFields();
          const sum = q("summary");
          if (sum && sum.lastChild && state.text) sum.lastChild.textContent = summaryText(solid ? capOf(state.colors.base) : null, state.brimRaised ? "relev\xE9e" : "baiss\xE9e");
        }
      }
    );
    function announce(msg) {
      const r = q("edit-status");
      if (r) {
        r.textContent = "";
        setTimeout(() => {
          r.textContent = msg;
        }, 30);
      }
    }
    function select(focusToolbar) {
      if (!state.text.trim()) {
        q("cap-text").focus();
        return;
      }
      state.moveText = true;
      setView(state.placement, false, true);
      announce("Modification du texte sur l\u2019aper\xE7u. \xC9chap pour terminer.");
      if (focusToolbar) requestAnimationFrame(() => requestAnimationFrame(() => {
        const t = q("text-toolbar");
        if (t && !t.hidden) t.focus({ preventScroll: true });
      }));
    }
    function deselect(returnFocus) {
      if (!state.moveText) return;
      const hadFocus = q("text-toolbar")?.contains(document.activeElement);
      state.moveText = false;
      setView(state.view, false, false);
      if (returnFocus || hadFocus) requestAnimationFrame(() => {
        const b = root.querySelector(".ag-edit-badge");
        (b && !b.hidden ? b : q("viewer")).focus({ preventScroll: true });
      });
    }
    editor = attachTextEditor({ root, q, qa, on, state, preview, update, setView, select, deselect, announce, removeText });
    if (q("flat-stage")) {
      root.classList.add("ag-has-flat");
      flat = new FlatView(q("flat-stage"), {
        preview,
        signal,
        onPick: (i) => activateText(i),
        // the preview resolves the position on the visor and reports it back (onTextMove)
        onDrag: (requested) => {
          if (state.view === state.placement) preview.moveTextTo(requested);
        },
        onDragEnd: () => update(),
        onKey: (dx, dy) => {
          if (!state.text.trim() || state.view !== state.placement) return;
          const o = state.textOffsets[state.placement] || { x: 0, y: 0 };
          changeTextPosition({ x: o.x + dx, y: o.y + dy });
        },
        // handles: size and tilt of the active text (same bounds as the 3/4 editor)
        onHandleStart: () => {
          flatStart = { size: state.effectiveSize ?? state.size, rotation: state.rotation };
        },
        onResize: (ratio) => {
          if (!flatStart || !state.text.trim()) return;
          state.size = Math.max(30, Math.min(250, Math.round(flatStart.size * ratio)));
          state.effectiveSize = null;
          update();
        },
        onRotate: (deg) => {
          if (!state.text.trim()) return;
          let r = Math.max(-90, Math.min(90, Math.round(deg)));
          for (const snap of [0, -90, 90]) if (Math.abs(r - snap) <= 3) r = snap;
          state.rotation = r;
          update();
        },
        // empty face pressed: write on it (a new text when the active one is already filled)
        onEmpty: (view) => {
          if (state.text.trim() && state.texts.length < MAX_TEXTS) addText();
          if (state.placement !== view) {
            const r = root.querySelector(`[data-ag-placement][value="${view}"]`);
            if (r) {
              r.checked = true;
              r.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }
          const field2 = q("cap-text");
          field2.focus({ preventScroll: true });
          field2.scrollIntoView({ block: "nearest", behavior: "smooth" });
        },
        onSizeKey: (step) => {
          if (!state.text.trim()) return;
          state.size = Math.max(30, Math.min(250, (step < 0 ? state.effectiveSize ?? state.size : state.size) + step));
          state.effectiveSize = null;
          update();
          announce(`Taille ${state.size} %`);
        }
      });
    }
    if (document.fonts?.load) {
      Promise.all(Object.values(FONTS).map((f2) => document.fonts.load(`${f2.style} ${f2.weight} 40px "${f2.family}"`, "A\xC9g\u0153"))).then(() => {
        if (signal.aborted) return;
        preview.invalidate();
        update();
      }).catch(() => {
      });
    }
    let textTimer = 0;
    on(q("cap-text"), "input", (e) => {
      const g = graphemes(e.target.value);
      state.text = g.slice(0, MAX_GRAPHEMES).join("");
      if (g.length > MAX_GRAPHEMES) e.target.value = state.text;
      update();
      const slot = state.active;
      clearTimeout(textTimer);
      timers.delete(textTimer);
      textTimer = setTimeout(() => {
        if (slot !== state.active || !state.text.trim()) return;
        trackOnce("text_added:" + slot, "text_added", { text_count: state.texts.filter((t, i) => i === slot ? true : !!t.text.trim()).length, char_count: graphemes(state.text).length, position: state.placement, font: state.font });
      }, 1200);
      timers.add(textTimer);
    });
    on(q("cap-text"), "focus", () => setView(state.placement, false, true));
    qa("[data-ag-placement]").forEach((input) => on(input, "change", (e) => {
      track("position_changed", { position: e.target.value });
      state.placement = e.target.value;
      state.effectiveSize = null;
      const o = state.textOffsets[state.placement] || { x: 0, y: 0 };
      if (state.texts.some((t, i) => i !== state.active && t.placement === state.placement && t.text.trim() && Math.abs((t.textOffsets[state.placement]?.y || 0) - o.y) < 10 && Math.abs((t.textOffsets[state.placement]?.x || 0) - o.x) < 45)) state.textOffsets[state.placement] = freeOffset(state.placement, state.active);
      update();
      setView(state.placement, false, true);
    }));
    qa("[data-surface-color]").forEach((input) => on(input, "input", (e) => {
      state.colors[e.target.dataset.surfaceColor] = e.target.value;
      state.palette = null;
      update();
    }));
    on(q("detail-toggle"), "click", () => {
      track("preview_zoomed", { zoomed: !state.detail });
      setView(state.detail ? state.view : state.placement, false, !state.detail);
    });
    qa("[data-shape]").forEach((b) => on(b, "click", () => {
      const sh = SHAPES[b.dataset.shape];
      state.curve = sh.curve;
      state.rotation = sh.rotation;
      state.textOffsets[state.placement] = { x: 0, y: 0 };
      setView(state.placement, false, true);
    }));
    on(q("curve"), "input", (e) => {
      state.curve = Number(e.target.value);
      if (state.view !== state.placement) setView(state.placement, false, true);
      else update();
    });
    on(q("rotation"), "input", (e) => {
      state.rotation = Number(e.target.value);
      if (state.view !== state.placement) setView(state.placement, false, true);
      else update();
    });
    on(q("text-color"), "input", (e) => {
      state.color = e.target.value;
      textColorChosen = true;
      update();
    });
    on(q("size"), "input", (e) => {
      state.size = Number(e.target.value);
      update();
    });
    on(q("outline"), "change", (e) => {
      state.outline = e.target.checked;
      update();
    });
    qa("[data-view]").forEach((button) => on(button, "click", () => {
      track("visor_view_changed", { view: button.dataset.view });
      setView(button.dataset.view);
    }));
    on(root.querySelector("details.ag-fine"), "toggle", (e) => {
      if (e.target.open) track("advanced_settings_opened");
    });
    on(q("undo"), "click", undo);
    on(q("redo"), "click", redo);
    on(q("reset-all"), "click", () => {
      if (snapshot() === initialSnapshot) return;
      track("config_reset");
      history.past.push(history.current);
      history.future = [];
      state.moveText = false;
      state.detail = false;
      restore(initialSnapshot);
      announce("Configuration r\xE9initialis\xE9e. \xAB Annuler \xBB permet de revenir en arri\xE8re.");
    });
    on(root, "keydown", (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      if (e.target.matches("input[type=text], textarea")) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    });
    on(q("remove-text"), "click", () => removeText());
    on(q("move-text"), "click", () => {
      if (state.moveText) deselect(false);
      else select(true);
    });
    on(q("center-text"), "click", () => changeTextPosition({ x: 0, y: 0 }));
    for (const key of ["x", "y"]) on(q("text-" + key), "input", (e) => changeTextPosition({ ...state.textOffsets[state.placement], [key]: Number(e.target.value) }));
    on(q("viewer"), "keydown", (event) => {
      if (event.key === "Escape") {
        deselect(false);
        return;
      }
      if (state.moveText && ["+", "=", "-", "_", "[", "]"].includes(event.key)) {
        event.preventDefault();
        if (event.key === "[" || event.key === "]") {
          state.rotation = Math.max(-90, Math.min(90, state.rotation + (event.key === "]" ? 5 : -5)));
          announce(`Inclinaison ${state.rotation}\xB0`);
        } else {
          state.size = Math.max(30, Math.min(250, event.key === "-" || event.key === "_" ? (state.effectiveSize ?? state.size) - 5 : state.size + 5));
          state.effectiveSize = null;
          announce(`Taille ${state.size} %`);
        }
        update();
        return;
      }
      if (state.moveText && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const step = event.shiftKey ? 5 : 1, offset = state.textOffsets[state.placement];
        changeTextPosition({ x: offset.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0), y: offset.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0) });
      } else if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        setView(state.brimRaised ? "top" : "bottom", false, state.detail);
      }
    });
    on(q("image-upload"), "change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const request = ++imageRequest;
      imageMessage("Chargement de l\u2019image\u2026");
      try {
        const decoded = await decodeImageFile(file);
        if (request !== imageRequest || signal.aborted) return;
        if (state.pattern !== "custom") lastPattern = state.pattern;
        preview.setImage(decoded);
        imageName = file.name;
        setImageName(file.name);
        state.pattern = "custom";
        state.imageSettings = { scale: 100, x: 0, y: 0 };
        state.moveText = false;
        setView(state.view, false, false);
        imageMessage("Image appliqu\xE9e au tissu. Elle dispara\xEEt si vous quittez la page.");
      } catch (error) {
        if (request === imageRequest) imageMessage(error.message, true);
      } finally {
        if (request === imageRequest) event.target.value = "";
      }
    });
    on(q("use-image"), "click", () => {
      if (imageName) {
        state.pattern = "custom";
        state.moveText = false;
        setView(state.view, false, false);
      }
    });
    on(q("remove-image"), "click", () => {
      imageRequest++;
      preview.setImage(null);
      imageName = "";
      setImageName("");
      q("image-upload").value = "";
      if (state.pattern === "custom") state.pattern = lastPattern;
      state.imageSettings = { scale: 100, x: 0, y: 0 };
      imageMessage("");
      update();
    });
    for (const key of ["scale", "x", "y"]) on(q("image-" + key), "input", (e) => {
      if (!imageName) return;
      state.imageSettings = { ...state.imageSettings, [key]: Number(e.target.value) };
      state.pattern = "custom";
      update();
    });
    on(q("reset-image"), "click", () => {
      state.imageSettings = { scale: 100, x: 0, y: 0 };
      if (imageName) state.pattern = "custom";
      update();
    });
    function getConfiguration() {
      commitActive();
      const settled = preview?.settle?.();
      if (settled) state.texts.forEach((t, i) => {
        const f2 = settled.fits[i];
        t.effectiveSize = f2 === void 0 ? null : Math.min(t.size, f2);
      });
      return toConfiguration(state);
    }
    function setConfiguration(doc) {
      const v = validateConfiguration(typeof doc === "string" ? JSON.parse(doc) : doc);
      if (!v.ok) return v;
      applyConfiguration(state, v.value);
      state.effectiveSize = null;
      state.moveText = false;
      q("cap-text").value = state.text;
      setView(state.placement, false, false);
      return v;
    }
    on(q("config-copy"), "click", async () => {
      const json = JSON.stringify(getConfiguration(), null, 2);
      q("config-code").value = json;
      try {
        await navigator.clipboard.writeText(json);
        q("config-status").textContent = "Configuration copi\xE9e.";
      } catch {
        q("config-status").textContent = "Configuration affich\xE9e ci-dessous : copiez-la.";
      }
    });
    on(q("config-apply"), "click", () => {
      let res;
      try {
        res = setConfiguration(q("config-code").value);
      } catch {
        res = { ok: false, errors: ["JSON illisible"] };
      }
      q("config-status").textContent = res.ok ? "Configuration appliqu\xE9e." : res.errors.join(" \xB7 ");
      q("config-status").dataset.error = String(!res.ok);
    });
    const orderForm = opts.order.mode === "form" ? q("order-form") : opts.order.mode === "product" ? root.closest("form.cart") || document.querySelector(opts.order.formSelector || "form.cart") : null;
    function field(form, name) {
      let input = form.querySelector(`input[name="${name}"]`);
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        form.append(input);
      }
      return input;
    }
    function fillOrderFields() {
      if (!orderForm) return { ok: true };
      commitActive();
      const anyText = filledTexts()[0];
      const view = anyText ? anyText.placement : "top";
      const full = preview.snapshot({ width: 960 }), thumb = preview.snapshot({ width: 240, views: [view] });
      if (!full) return { ok: false, errors: ["L\u2019aper\xE7u est encore en pr\xE9paration, r\xE9essayez dans un instant."] };
      const v = solid && !anyText ? { ok: false, errors: ["Saisissez le texte \xE0 imprimer sur la visi\xE8re avant d\u2019ajouter au panier."], needsText: true } : validateConfiguration(getConfiguration());
      const status = q("order-status");
      if (!v.ok) {
        field(orderForm, "ag_config").value = "";
        return v;
      }
      field(orderForm, "ag_config").value = JSON.stringify(v.value);
      field(orderForm, "ag_preview").value = full;
      field(orderForm, "ag_thumb").value = thumb;
      if (status && status.dataset.error === "true") {
        status.textContent = "";
        status.dataset.error = "false";
      }
      return v;
    }
    if (solid && orderForm) {
      colorSelect = findColorSelect(orderForm);
      if (colorSelect) {
        const fromSelect = () => {
          const id2 = termId(colorSelect.value) || termId(colorSelect.selectedOptions[0]?.textContent);
          const cur = capOf(state.colors.base);
          if (id2 && (!cur || cur.id !== id2)) setCapColor(id2);
        };
        on(colorSelect, "change", fromSelect);
        if (window.jQuery) {
          const $s = window.jQuery(colorSelect), h = () => fromSelect();
          $s.on("change.atelierGapette", h);
          signal.addEventListener("abort", () => $s.off("change.atelierGapette", h));
        }
        const id = termId(colorSelect.value);
        if (id) state.colors = solidColors(solid.colors.find((c) => c.id === id).hex), state.color = autoText(state.colors.base);
      }
    }
    const restoreMoves = [];
    if (opts.order.relocate && orderForm && q("buy-slot")) {
      const slot = q("buy-slot"), summary = orderForm.closest(".summary") || orderForm.parentElement;
      const price = summary && Array.from(summary.children).find((el) => el.matches && el.matches(".price"));
      for (const el of [price, orderForm]) {
        if (!el) continue;
        const marker = document.createComment("ag");
        el.before(marker);
        slot.append(el);
        restoreMoves.push(() => {
          marker.replaceWith(el);
        });
      }
      slot.hidden = false;
      if (colorSelect && orderForm.querySelectorAll('select[name^="attribute_"]').length === 1) orderForm.classList.add("ag-hide-variations");
    }
    if (root.classList.contains("ag-bleed")) {
      const bleed = () => {
        root.style.marginLeft = "0px";
        root.style.width = "";
        const left = root.getBoundingClientRect().left, w = document.documentElement.clientWidth;
        const gutter = Math.max(16, Math.min(48, w * 0.04)), width = Math.min(w - 2 * gutter, 1440);
        root.style.width = `${width}px`;
        root.style.marginLeft = `${-left + (w - width) / 2}px`;
      };
      bleed();
      on(window, "resize", bleed);
      if (window.ResizeObserver && root.parentElement) {
        const ro = new ResizeObserver(bleed);
        ro.observe(root.parentElement);
        signal.addEventListener("abort", () => ro.disconnect());
      }
    }
    const pf = opts.order.price;
    const cta = orderForm && orderForm.querySelector(".single_add_to_cart_button, .ag-order-button");
    const rule = pf && pf.discount && pf.discount.min >= 2 && pf.discount.pct > 0 && pf.discount.pct < 100 ? pf.discount : null;
    const cents = 10 ** (pf && pf.decimals || 2);
    const unitFor = (unit, n) => rule && n >= rule.min ? Math.round(unit * (1 - rule.pct / 100) * cents) / cents : unit;
    if (cta && pf && Number.isFinite(pf.unit)) {
      const base = cta.textContent.trim(), qty = orderForm.querySelector('input.qty, input[name="quantity"]');
      const note = q("qty-note"), noteDefault = note ? note.textContent : "", pct = rule ? String(rule.pct).replace(".", ",") : "";
      let unit = pf.unit;
      const money = (n) => {
        const [int, dec] = Math.abs(n).toFixed(pf.decimals).split(".");
        const num = int.replace(/\B(?=(\d{3})+(?!\d))/g, pf.thouSep) + (dec ? pf.decSep + dec : "");
        return pf.format.replace("%1$s", pf.symbol).replace("%2$s", num).replace(/ /g, "\xA0");
      };
      const refresh = () => {
        if (cta.getAttribute("aria-busy") === "true") return;
        const n = Math.max(1, parseInt(qty && qty.value, 10) || 1), each = unitFor(unit, n), applied = unit > 0 && each < unit;
        cta.textContent = unit > 0 ? `${base} \xB7\xA0${money(each * n)}` : base;
        root.classList.toggle("ag-price-in-cta", unit > 0);
        if (note) {
          note.textContent = applied ? `Remise de ${pct} % appliqu\xE9e : ${money(each * n)} au lieu de ${money(unit * n)}.` : noteDefault;
          note.dataset.applied = String(applied);
        }
      };
      if (qty) {
        on(qty, "input", refresh);
        on(qty, "change", refresh);
      }
      if (window.jQuery) {
        const $f = window.jQuery(orderForm);
        $f.on("found_variation.atelierGapette", (e, v) => {
          if (v && typeof v.display_price === "number") {
            unit = v.display_price;
            refresh();
          }
        });
        $f.on("reset_data.atelierGapette", () => {
          unit = pf.unit;
          refresh();
        });
        signal.addEventListener("abort", () => {
          $f.off(".atelierGapette");
          cta.textContent = base;
          if (note) {
            note.textContent = noteDefault;
            note.dataset.applied = "false";
          }
        });
      }
      refresh();
    }
    let orderTimer = 0;
    function scheduleOrderFields() {
      if (!orderForm) return;
      clearTimeout(orderTimer);
      timers.delete(orderTimer);
      orderTimer = setTimeout(() => {
        try {
          fillOrderFields();
        } catch (e) {
        }
      }, 450);
      timers.add(orderTimer);
    }
    if (orderForm) {
      on(orderForm, "submit", (event) => {
        let res;
        try {
          res = fillOrderFields();
        } catch (e) {
          res = { ok: false, errors: ["L\u2019aper\xE7u n\u2019a pas pu \xEAtre pr\xE9par\xE9. R\xE9essayez."] };
        }
        if (!res.ok) {
          track("validation_error", { reason: res.needsText ? "text_missing" : "invalid_configuration" });
          event.preventDefault();
          event.stopImmediatePropagation();
          const status = q("order-status");
          if (status) {
            status.textContent = res.errors.join(" \xB7 ");
            status.dataset.error = "true";
            status.scrollIntoView({ block: "center", behavior: "smooth" });
          }
          if (res.needsText) {
            toast(res.errors[0], "error");
            q("cap-text").focus({ preventScroll: true });
            q("cap-text").scrollIntoView({ block: "center", behavior: "smooth" });
          }
          return;
        }
        if (opts.order.mode === "form" && opts.order.ajaxUrl && window.fetch && window.FormData) {
          event.preventDefault();
          addToCartAjax(event.submitter);
        }
      }, { capture: true });
    }
    const SOON = {
      save: "vous pourrez enregistrer votre cr\xE9ation pour la retrouver plus tard.",
      share: "vous pourrez partager votre cr\xE9ation avec un simple lien.",
      logo: "vous pourrez ajouter le logo de votre club ou de votre marque."
    };
    qa("[data-ag-soon]").forEach((button) => on(button, "click", () => {
      const feature = button.dataset.agSoon, note = q(`soon-${button.dataset.agSoonNote}`);
      if (!SOON[feature] || !note) return;
      const lead = document.createElement("strong");
      lead.textContent = "Bient\xF4t disponible :";
      note.replaceChildren(lead, document.createTextNode(` ${SOON[feature]}`));
      track("feature_interest", { feature });
    }));
    function toast(text, kind = "ok", link = null) {
      const t = q("toast");
      if (!t) return;
      t.replaceChildren(document.createTextNode(text));
      if (link) {
        const a = document.createElement("a");
        a.href = link.href;
        a.textContent = link.label;
        t.append(" ", a);
      }
      t.dataset.kind = kind;
      t.hidden = false;
      clearTimeout(toast.timer);
      toast.timer = setTimeout(() => {
        t.hidden = true;
      }, kind === "ok" ? 6e3 : 9e3);
      timers.add(toast.timer);
    }
    function trackCart() {
      try {
        const filled = state.texts.filter((t) => t.text.trim()), cap = capOf(state.colors.base);
        const qtyEl = orderForm.querySelector('input.qty, input[name="quantity"]');
        const quantity = Math.max(1, parseInt(qtyEl && qtyEl.value, 10) || 1);
        const unit = unitFor(opts.order.price && Number.isFinite(opts.order.price.unit) ? opts.order.price.unit : 0, quantity);
        const currency = opts.track && opts.track.currency || "EUR", value = Math.round(unit * quantity * 100) / 100, color = cap ? cap.id : "custom";
        track("config_add_to_cart", { currency, value, quantity, color, text_count: filled.length, char_count: filled.reduce((n, t) => n + graphemes(t.text).length, 0), has_top_text: filled.some((t) => t.placement === "top"), has_underside_text: filled.some((t) => t.placement === "bottom") });
        if (opts.track && opts.track.standardCart) track("add_to_cart", { currency, value, items: [{ item_id: String(opts.track.productId || ""), item_name: opts.track.itemName || "Gapette personnalis\xE9e", item_variant: color, price: unit, quantity }] });
      } catch (e) {
      }
    }
    async function addToCartAjax(submitter) {
      const button = orderForm.querySelector(".ag-order-button"), label = button.textContent, status = q("order-status");
      if (button.getAttribute("aria-busy") === "true") return;
      button.setAttribute("aria-busy", "true");
      button.disabled = true;
      button.textContent = "Ajout en cours\u2026";
      const data = new FormData(orderForm);
      data.set("action", "ag_add_to_cart");
      data.delete("add-to-cart");
      data.set("ag_product", submitter && submitter.value || button.value);
      try {
        const res = await fetch(opts.order.ajaxUrl, { method: "POST", body: data, credentials: "same-origin" });
        const json = await res.json();
        if (!json.success) throw new Error((json.data && json.data.messages || []).join(" \xB7 ") || "L\u2019ajout au panier a \xE9chou\xE9.");
        trackCart();
        toast(`\u2713 Ajout\xE9 au panier${json.data.count ? ` (${json.data.count} article${json.data.count > 1 ? "s" : ""})` : ""}.`, "ok", opts.order.cartUrl ? { href: opts.order.cartUrl, label: "Voir le panier" } : null);
        if (status) {
          status.textContent = "";
          status.dataset.error = "false";
        }
        if (window.jQuery) window.jQuery(document.body).trigger("added_to_cart", [json.data.fragments || {}, json.data.cart_hash || ""]);
        document.body.dispatchEvent(new CustomEvent("wc-blocks_added_to_cart", { bubbles: true }));
      } catch (e) {
        track("add_to_cart_failed");
        toast(`L\u2019ajout n\u2019a pas abouti. ${e.message && !/JSON|fetch/i.test(e.message) ? e.message : "V\xE9rifiez votre connexion et r\xE9essayez."}`, "error");
        if (status) {
          status.textContent = e.message || "";
          status.dataset.error = "true";
        }
      } finally {
        button.removeAttribute("aria-busy");
        button.disabled = false;
        button.textContent = label;
      }
    }
    update();
    const initialSnapshot = history.current;
    const instance = {
      getConfiguration,
      setConfiguration,
      getState: () => JSON.parse(JSON.stringify(state)),
      getFlatView: () => flat,
      // tests / debugging
      preview,
      destroy() {
        abort.abort();
        timers.forEach(clearTimeout);
        preview.destroy();
        restoreMoves.reverse().forEach((fn) => fn());
        qa(".pattern-button, .palette-button, .font-button, .ag-cap-color").forEach((b) => b.remove());
        delete root.__atelierGapette;
        root.removeAttribute("data-ag-mounted");
      }
    };
    root.__atelierGapette = instance;
    root.setAttribute("data-ag-mounted", "1");
    return instance;
  }

  // ../assets/src/index.js
  function readOptions(root) {
    try {
      return JSON.parse(root.getAttribute("data-ag-options") || "{}");
    } catch {
      return {};
    }
  }
  function mountAll(scope = document) {
    scope.querySelectorAll(".atelier-gapette[data-ag-root]:not([data-ag-mounted])").forEach((root) => {
      try {
        mount(root, readOptions(root));
      } catch (e) {
        const err = root.querySelector('[data-ag="render-error"]');
        if (err) err.hidden = false;
        console.error("[Atelier Gapette]", e);
      }
    });
  }
  function unmountRemoved(nodes) {
    nodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      const roots = n.matches?.("[data-ag-mounted]") ? [n] : Array.from(n.querySelectorAll?.("[data-ag-mounted]") || []);
      roots.forEach((r) => r.__atelierGapette?.destroy());
    });
  }
  function start() {
    mountAll();
    const mo = new MutationObserver((records) => {
      let added = false;
      for (const r of records) {
        if (r.addedNodes.length) added = true;
        if (r.removedNodes.length) unmountRemoved(r.removedNodes);
      }
      if (added) mountAll();
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  window.AtelierGapette = { mount: (root, options) => mount(root, { ...readOptions(root), ...options }), mountAll, toConfiguration, validateConfiguration };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
