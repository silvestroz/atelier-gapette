// Atelier Gapette — flat view of the visor (0.11, maquette).
// The face shown by the 3/4 view, flattened and at scale: the texts exactly as
// they will be printed, in millimetres. Pressing a text selects it, dragging
// moves it (the 3/4 view follows); the active text has a resize handle (corner)
// and a rotation handle (above). Keyboard: arrows move the active text by 1 mm
// (Shift: 5 mm), + / − change its size. Everything is drawn from the preview's
// own layouts (ProductPreview.cache[view].infos), so both views always agree.
import { VISOR, VISOR_ARCS, outlineFor, faceSign, paintGlyphs, onVisor } from './product-preview.js';

const MARGIN = 7; // mm around the visor
const HANDLE = 13; // handle radius, CSS px
const lum = hex => { const n = parseInt(String(hex).slice(1), 16); return ((n >> 16) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114) / 255; };

export class FlatView {
	/**
	 * @param {HTMLElement} stage  element that receives the canvas (sized by CSS)
	 * @param {object} o  { preview, signal, onPick(index), onDrag(offsetMm), onDragEnd(),
	 *                      onKey(dx, dy), onHandleStart(kind), onResize(ratio), onRotate(deg), onSizeKey(step),
	 *                      onEmpty(view) — the visor face carries no text yet and was pressed }
	 */
	constructor(stage, o) {
		this.stage = stage; this.o = o; this.preview = o.preview;
		this.canvas = document.createElement('canvas'); this.canvas.setAttribute('aria-hidden', 'true');
		stage.append(this.canvas);
		this.ctx = this.canvas.getContext('2d');
		const signal = o.signal, on = (el, t, fn, opt = {}) => el.addEventListener(t, fn, { ...opt, signal });
		on(this.canvas, 'pointerdown', e => this.down(e));
		on(this.canvas, 'pointermove', e => this.move(e));
		const end = e => {
			if (this.drag?.pointer !== e.pointerId) return;
			const kind = this.drag.kind; this.drag = null; this.canvas.classList.remove('dragging');
			if (kind === 'move') this.o.onDragEnd?.(); else this.render();
		};
		on(this.canvas, 'pointerup', end); on(this.canvas, 'pointercancel', end);
		on(stage, 'keydown', e => {
			const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
			if (k) { e.preventDefault(); const step = e.shiftKey ? 5 : 1; this.o.onKey?.(k[0] * step, k[1] * step); return; }
			if (e.key === '+' || e.key === '=') { e.preventDefault(); this.o.onSizeKey?.(5); }
			if (e.key === '-' || e.key === '_') { e.preventDefault(); this.o.onSizeKey?.(-5); }
		});
		if (window.ResizeObserver) { this.ro = new ResizeObserver(() => this.render()); this.ro.observe(stage); signal?.addEventListener('abort', () => this.ro.disconnect()); }
	}

	/** Screen ↔ mm transform for the current stage size. */
	frame() {
		const w = this.stage.clientWidth, h = this.stage.clientHeight;
		// top face: tips up (seam side); underside: mirrored, outer edge up and tips down
		const sg = faceSign(this.preview.state?.view), far = VISOR.depth / 2 + VISOR.setback + MARGIN, near = VISOR.depth / 2 + MARGIN;
		const x0 = -VISOR.width / 2 - MARGIN, x1 = VISOR.width / 2 + MARGIN;
		const y0 = sg > 0 ? -far : -near, y1 = sg > 0 ? near : far;
		const s = Math.max(.1, Math.min(w / (x1 - x0), h / (y1 - y0)));
		return { w, h, s, ox: w / 2 - s * (x0 + x1) / 2, oy: h / 2 - s * (y0 + y1) / 2 };
	}
	toMm(e) {
		const r = this.canvas.getBoundingClientRect(), f = this.T || this.frame();
		return { x: (e.clientX - r.left - f.ox) / f.s, y: (e.clientY - r.top - f.oy) / f.s };
	}
	toScreen(e) { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
	/** Texts drawn on the face currently shown: [{ index, info, state }]. */
	entries() {
		const p = this.preview, view = p.state?.view, c = view && p.cache?.[view];
		if (!c?.infos) return [];
		return Object.entries(c.infos).map(([i, e]) => ({ index: Number(i), ...e })).filter(e => e.info?.glyphs?.length);
	}
	/** Box of a text in its own rotated frame (mm, without the measuring pad). */
	box(e) {
		const rot = (e.state.rotation || 0) * Math.PI / 180, c = Math.cos(rot), s = Math.sin(rot);
		let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
		for (const [x, y] of e.info.localSamples) { const u = x * c + y * s, v = -x * s + y * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
		const pad = .3 + (e.state.outline ? e.info.size * .075 / 2 : 0);
		return { u0: u0 + pad, u1: u1 - pad, v0: v0 + pad, v1: v1 - pad, c, s, off: e.info.offset };
	}
	/** Frame corners, centre and handles of the active text (screen px). */
	handles() {
		const act = this.entries().find(e => e.index === this.preview.activeIndex());
		const f = this.T; if (!act || !f) return null;
		const b = this.box(act), g = 1.5;
		const mm = (u, v) => ({ x: u * b.c - v * b.s + b.off.x, y: u * b.s + v * b.c + b.off.y });
		const S = p => ({ x: f.ox + p.x * f.s, y: f.oy + p.y * f.s });
		const quad = [mm(b.u0 - g, b.v0 - g), mm(b.u1 + g, b.v0 - g), mm(b.u1 + g, b.v1 + g), mm(b.u0 - g, b.v1 + g)].map(S);
		const centerMm = mm((b.u0 + b.u1) / 2, (b.v0 + b.v1) / 2), topMid = S(mm((b.u0 + b.u1) / 2, b.v0 - g));
		const up = { x: b.s, y: -b.c }, reach = HANDLE + 16;
		return {
			act, box: b, quad, centerMm, topMid,
			rotate: { x: topMid.x + up.x * reach, y: topMid.y + up.y * reach },
			resize: quad[2],
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
		const h = this.handles(); if (!h) return null;
		for (const kind of ['rotate', 'resize']) if (Math.hypot(pt.x - h[kind].x, pt.y - h[kind].y) <= HANDLE + 6) return { kind, h };
		return null;
	}
	down(e) {
		if (e.button !== 0 || !this.preview.ready) return;
		const pt = this.toScreen(e), m = this.toMm(e), handle = this.hitHandle(pt);
		if (handle) {
			e.preventDefault(); this.stage.focus({ preventScroll: true });
			this.o.onHandleStart?.(handle.kind);
			const c = handle.h.centerMm;
			this.drag = { pointer: e.pointerId, kind: handle.kind, center: c, d0: Math.hypot(m.x - c.x, m.y - c.y) || 1 };
			this.canvas.setPointerCapture(e.pointerId); this.canvas.classList.add('dragging');
			return;
		}
		const hit = this.hit(m);
		if (!hit) {
			// empty face: pressing the visor starts a text on it
			if (!this.entries().length && onVisor(m.x, m.y, true, this.preview.state.view)) { e.preventDefault(); this.o.onEmpty?.(this.preview.state.view); }
			return;
		}
		e.preventDefault(); this.stage.focus({ preventScroll: true });
		if (hit.index !== this.preview.activeIndex()) this.o.onPick?.(hit.index);
		this.drag = { pointer: e.pointerId, kind: 'move', start: m, offset: { ...hit.info.offset } };
		this.canvas.setPointerCapture(e.pointerId); this.canvas.classList.add('dragging');
	}
	move(e) {
		if (!this.drag) {
			if (!this.preview.ready) return;
			const handle = this.hitHandle(this.toScreen(e));
			const m = this.toMm(e);
			this.canvas.style.cursor = handle ? (handle.kind === 'resize' ? 'nwse-resize' : 'grab') : this.hit(m) ? 'grab' : !this.entries().length && onVisor(m.x, m.y, true, this.preview.state.view) ? 'text' : '';
			return;
		}
		if (this.drag.pointer !== e.pointerId) return;
		e.preventDefault();
		const m = this.toMm(e), d = this.drag;
		if (d.kind === 'move') this.o.onDrag?.({ x: d.offset.x + m.x - d.start.x, y: d.offset.y + m.y - d.start.y });
		else if (d.kind === 'resize') this.o.onResize?.(Math.hypot(m.x - d.center.x, m.y - d.center.y) / d.d0);
		else {
			// the handle sits "above" the text: pointer angle around the centre + 90°
			let r = Math.atan2(m.y - d.center.y, m.x - d.center.x) * 180 / Math.PI + 90;
			r = ((r + 180) % 360 + 360) % 360 - 180;
			if (e.shiftKey) r = Math.round(r / 15) * 15;
			this.o.onRotate?.(r);
		}
	}

	render() {
		const p = this.preview; if (!p.ready || !p.state) return;
		const f = this.T = this.frame(), dpr = Math.min(window.devicePixelRatio || 1, 2);
		const cw = Math.round(f.w * dpr), ch = Math.round(f.h * dpr);
		if (this.canvas.width !== cw || this.canvas.height !== ch) { this.canvas.width = cw; this.canvas.height = ch; this.canvas.style.width = `${f.w}px`; this.canvas.style.height = `${f.h}px`; }
		const ctx = this.ctx, X = x => f.ox + x * f.s, Y = y => f.oy + y * f.s;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, f.w, f.h);
		// cutting-mat grid: 1 cm, every 5 cm a little darker, centred on the visor
		ctx.save(); ctx.lineWidth = 1;
		for (const axis of ['x', 'y']) {
			const lo = Math.floor(((axis === 'x' ? 0 : 0) - (axis === 'x' ? f.ox : f.oy)) / f.s / 10) * 10, hi = ((axis === 'x' ? f.w : f.h) - (axis === 'x' ? f.ox : f.oy)) / f.s;
			for (let v = lo; v <= hi; v += 10) {
				ctx.strokeStyle = v % 50 === 0 ? 'rgba(20,35,60,.11)' : 'rgba(20,35,60,.05)';
				const sv = Math.round(axis === 'x' ? X(v) : Y(v)) + .5;
				ctx.beginPath(); axis === 'x' ? (ctx.moveTo(sv, 0), ctx.lineTo(sv, f.h)) : (ctx.moveTo(0, sv), ctx.lineTo(f.w, sv)); ctx.stroke();
			}
		}
		ctx.restore();
		const brim = p.state.colors?.brim || '#1d1e20', dark = lum(brim) < .55;
		const sg = faceSign(p.state.view), outline = outlineFor(p.state.view);
		const path = () => { ctx.beginPath(); outline.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.closePath(); };
		// visor: fabric colour, edge, stitching 3 mm inside the outer edge
		ctx.save(); ctx.shadowColor = 'rgba(20,35,60,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
		path(); ctx.fillStyle = brim; ctx.fill(); ctx.restore();
		path(); ctx.lineWidth = 1; ctx.strokeStyle = dark ? 'rgba(20,35,60,.55)' : 'rgba(20,35,60,.35)'; ctx.stroke();
		ctx.save(); path(); ctx.clip();
		const o = VISOR_ARCS.outer; ctx.beginPath(); ctx.arc(X(0), Y(sg * o.cy), (o.r - 3) * f.s, 0, Math.PI * 2);
		ctx.setLineDash([Math.max(2, 2.2 * f.s), Math.max(2, 1.6 * f.s)]); ctx.lineWidth = 1; ctx.strokeStyle = dark ? 'rgba(255,255,255,.28)' : 'rgba(20,35,60,.22)'; ctx.stroke();
		ctx.restore();
		// centre mark on the seam and on the outer edge
		ctx.save(); ctx.strokeStyle = dark ? 'rgba(255,255,255,.35)' : 'rgba(20,35,60,.3)'; ctx.lineWidth = 1;
		const yOut = sg * (o.cy + o.r), s = VISOR_ARCS.seam, ySeam = sg * (s.cy + s.r);
		ctx.beginPath(); ctx.moveTo(X(0) + .5, Y(yOut) - 6 * sg); ctx.lineTo(X(0) + .5, Y(yOut)); ctx.moveTo(X(0) + .5, Y(ySeam)); ctx.lineTo(X(0) + .5, Y(ySeam) + 6 * sg); ctx.stroke(); ctx.restore();
		// texts: what overhangs the visor is shown faded (it is not printed)
		const entries = this.entries(), active = p.activeIndex();
		if (!entries.length) {
			// empty face: an invitation to write, in the middle of the visor
			const coarse = window.matchMedia?.('(pointer: coarse)').matches;
			const lines = [coarse ? 'Touchez la visière' : 'Cliquez sur la visière', 'pour écrire votre texte'];
			ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = dark ? 'rgba(255,255,255,.8)' : 'rgba(20,35,60,.72)';
			let size = Math.max(12, Math.min(18, 4.2 * f.s));
			const fit = () => { ctx.font = `600 ${size}px Barlow, "Helvetica Neue", Arial, sans-serif`; return Math.max(...lines.map(l => ctx.measureText(l).width)); };
			while (size > 10 && fit() > VISOR.width * f.s * .62) size -= 1;
			lines.forEach((l, i) => ctx.fillText(l, X(0), Y(2 * sg) + (i - .5) * size * 1.3));
			ctx.restore();
		}
		for (const e of entries) {
			const outline = e.state.active ? p.outlineColor : e.state.outlineColor || '#000';
			ctx.save(); ctx.globalAlpha = .3; paintGlyphs(ctx, e.info, e.state, outline, f.s, f.ox, f.oy, e.info.offset); ctx.restore();
			ctx.save(); path(); ctx.clip(); paintGlyphs(ctx, e.info, e.state, outline, f.s, f.ox, f.oy, e.info.offset); ctx.restore();
		}
		// active text: frame, handles, printed size
		const h = this.handles();
		if (h) {
			const q = h.quad;
			ctx.save(); ctx.beginPath(); q.forEach(({ x, y }, i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
			ctx.setLineDash([5, 4]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
			ctx.lineWidth = 1.5; ctx.strokeStyle = '#14233c'; ctx.stroke();
			ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(h.topMid.x, h.topMid.y); ctx.lineTo(h.rotate.x, h.rotate.y); ctx.lineWidth = 1.5; ctx.stroke();
			ctx.restore();
			const dragging = this.drag?.kind;
			for (const kind of ['rotate', 'resize']) {
				const c = h[kind], on = dragging === kind;
				ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, HANDLE, 0, Math.PI * 2);
				ctx.fillStyle = on ? '#fac811' : '#fbf8f1'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#14233c'; ctx.stroke();
				ctx.strokeStyle = '#14233c'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
				if (kind === 'rotate') { ctx.arc(c.x, c.y, 5.5, -Math.PI * .85, Math.PI * .45); const a = Math.PI * .45, ex = c.x + 5.5 * Math.cos(a), ey = c.y + 5.5 * Math.sin(a); ctx.moveTo(ex - 3.5, ey - .5); ctx.lineTo(ex, ey); ctx.lineTo(ex + .5, ey - 3.5); }
				else { ctx.moveTo(c.x - 5, c.y - 5); ctx.lineTo(c.x + 5, c.y + 5); ctx.moveTo(c.x + 5, c.y + 1); ctx.lineTo(c.x + 5, c.y + 5); ctx.lineTo(c.x + 1, c.y + 5); ctx.moveTo(c.x - 5, c.y - 1); ctx.lineTo(c.x - 5, c.y - 5); ctx.lineTo(c.x - 1, c.y - 5); }
				ctx.stroke(); ctx.restore();
			}
			const b = h.box, label = `${Math.round(b.u1 - b.u0)} × ${Math.round(b.v1 - b.v0)} mm`;
			const bottom = q.reduce((a, c) => (c.y > a.y ? c : a)), cx = (q[2].x + q[3].x) / 2;
			ctx.save(); ctx.font = '600 12px Barlow, "Helvetica Neue", Arial, sans-serif';
			const tw = ctx.measureText(label).width + 12, ty = Math.min(f.h - 22, bottom.y + 8), tx = Math.min(Math.max(2, cx - tw / 2), f.w - tw - 2);
			ctx.fillStyle = '#14233c'; ctx.fillRect(tx, ty, tw, 20);
			ctx.fillStyle = '#fbf8f1'; ctx.textBaseline = 'middle'; ctx.fillText(label, tx + 6, ty + 10.5); ctx.restore();
			this.activeLabel = label;
		} else this.activeLabel = '';
		this.o.onRendered?.(this);
	}
}
