// Direct text editing on the preview (v0.5):
//  - an "Modifier" badge on the text when it is not selected,
//  - a frame that follows the text (rotation + perspective),
//  - a rotation handle and a resize handle (mouse, touch, keyboard),
//  - a floating toolbar next to the text: words, font, shape, size, tilt, recentre.
// Every control is a real <button>/<input>/<select> with a label, and every
// gesture has a keyboard equivalent. The side menu keeps the same settings.
import { FONTS, SHAPES } from './schema.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SIZE = [30, 250], ROT = [-90, 90];

export function attachTextEditor(ctx) {
	const { root, q, qa, on, state, preview, update, setView, select, deselect, announce, removeText } = ctx;
	const viewer = q('viewer'), studio = q('studio'), toolbar = q('text-toolbar');
	const NS = 'http://www.w3.org/2000/svg';

	/* ---------- overlay inside the viewer ---------- */
	const layer = document.createElement('div'); layer.className = 'ag-edit-layer'; layer.setAttribute('data-ag', 'edit-layer');
	const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'ag-frame'); svg.setAttribute('aria-hidden', 'true');
	const poly = document.createElementNS(NS, 'polygon'), stem = document.createElementNS(NS, 'line');
	svg.append(stem, poly);
	const mk = (cls, label, text) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label); b.title = label; b.innerHTML = text; return b; };
	const badge = mk('ag-edit-badge', 'Modifier le texte sur l’aperçu', '<span aria-hidden="true">✎</span> Modifier');
	const rotHandle = mk('ag-handle ag-handle-rotate', 'Inclinaison du texte : glisser, ou flèches gauche / droite', '<span aria-hidden="true">⟳</span>');
	const sizeHandle = mk('ag-handle ag-handle-size', 'Taille du texte : glisser, ou flèches haut / bas', '<span aria-hidden="true">⤡</span>');
	layer.append(svg, badge, rotHandle, sizeHandle);
	viewer.append(layer);

	/* ---------- toolbar content ---------- */
	const fontSel = q('tb-font');
	Object.entries(FONTS).forEach(([id, f]) => { const o = document.createElement('option'); o.value = id; o.textContent = f.label; fontSel.append(o); });

	const setSize = (v, say) => { state.size = clamp(Math.round(v), ...SIZE); state.effectiveSize = null; update(); if (say) announce(`Taille ${state.size} %`); };
	const setRot = (v, say, magnet = false) => {
		let r = clamp(Math.round(v), ...ROT);
		// while dragging, stick to 0° and ±90° (keyboard and buttons stay exact)
		if (magnet) for (const snap of [0, -90, 90]) if (Math.abs(r - snap) <= 3) r = snap;
		state.rotation = r; update(); if (say) announce(`Inclinaison ${r}°`);
	};

	on(q('tb-text'), 'input', e => { const main = q('cap-text'); main.value = e.target.value; main.dispatchEvent(new Event('input')); });
	on(fontSel, 'change', e => { state.font = e.target.value; update(); announce(`Police ${FONTS[state.font].label}`); });
	on(q('tb-smaller'), 'click', () => setSize((state.effectiveSize ?? state.size) - 5, true));
	on(q('tb-bigger'), 'click', () => setSize(state.size + 5, true));
	on(q('tb-rot-minus'), 'click', () => setRot(state.rotation - 15, true));
	on(q('tb-rot-plus'), 'click', () => setRot(state.rotation + 15, true));
	on(q('tb-center'), 'click', () => { state.textOffsets[state.placement] = { x: 0, y: 0 }; update(); announce('Texte recentré'); });
	on(q('tb-delete'), 'click', () => removeText && removeText());
	on(q('tb-done'), 'click', () => deselect(true));
	on(badge, 'click', () => select(true));
	on(toolbar, 'keydown', e => { if (e.key === 'Escape') { e.preventDefault(); deselect(true); } });
	// clicks on the overlay controls must not reach the canvas (which would deselect)
	for (const el of [badge, rotHandle, sizeHandle]) on(el, 'pointerdown', e => e.stopPropagation());

	/* ---------- handles: pointer ---------- */
	function dragHandle(handle, onMove) {
		on(handle, 'pointerdown', e => {
			if (e.button !== 0) return;
			e.preventDefault(); e.stopPropagation();
			handle.setPointerCapture(e.pointerId);
			const f = preview.textFrame(); if (!f) return;
			const start = { local: preview.clientToLocal(e.clientX, e.clientY), size: state.effectiveSize ?? state.size, rot: state.rotation, center: f.local.offset };
			const move = ev => { if (ev.pointerId === e.pointerId) onMove(preview.clientToLocal(ev.clientX, ev.clientY), start, ev); };
			const end = ev => { if (ev.pointerId !== e.pointerId) return; handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', end); handle.removeEventListener('pointercancel', end); handle.classList.remove('dragging'); };
			handle.classList.add('dragging');
			handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
		});
	}
	dragHandle(rotHandle, (p, s, ev) => {
		// angle of the pointer around the text centre; the handle sits "above" the text (−90°)
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

	/* ---------- handles: keyboard ---------- */
	on(rotHandle, 'keydown', e => {
		if (e.key.startsWith('Arrow')) e.stopPropagation();
		const step = e.shiftKey ? 15 : 1;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setRot(state.rotation - step, true); }
		if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setRot(state.rotation + step, true); }
	});
	on(sizeHandle, 'keydown', e => {
		if (e.key.startsWith('Arrow')) e.stopPropagation();
		const step = e.shiftKey ? 10 : 5;
		if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); setSize(state.size + step, true); }
		if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); setSize((state.effectiveSize ?? state.size) - step, true); }
	});

	/* ---------- layout after every render ---------- */
	const place = (el, p, w = 0, h = 0) => { el.style.left = `${p.x - w / 2}px`; el.style.top = `${p.y - h / 2}px`; };
	function layout() {
		const f = preview.textFrame();
		const hasText = !!f && !!state.text.trim();
		const editing = hasText && state.moveText;
		layer.hidden = !hasText;
		badge.hidden = !hasText || editing;
		svg.style.display = editing ? '' : 'none';
		rotHandle.hidden = sizeHandle.hidden = !editing;
		// keep the toolbar while its own field is being emptied and retyped
		toolbar.hidden = !(state.moveText && (hasText || toolbar.contains(document.activeElement)));
		// sync toolbar values
		const tb = q('tb-text'); if (document.activeElement !== tb && tb.value !== state.text) tb.value = state.text;
		fontSel.value = state.font;
		q('tb-size').textContent = `${state.effectiveSize ?? state.size} %`;
		q('tb-rot').textContent = `${state.rotation}°`;
		if (!hasText) return;
		const V = p => preview.toViewer(p);
		const quad = f.quad.map(V), top = V(f.topMid), rot = V(f.rotate), rs = V(f.resize);
		svg.setAttribute('width', viewer.clientWidth); svg.setAttribute('height', viewer.clientHeight);
		poly.setAttribute('points', quad.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
		stem.setAttribute('x1', top.x); stem.setAttribute('y1', top.y); stem.setAttribute('x2', rot.x); stem.setAttribute('y2', rot.y);
		place(rotHandle, rot, 36, 36); place(sizeHandle, rs, 36, 36);
		// badge: top-right corner of the frame
		const tr = quad.reduce((a, p) => (p.x - p.y > a.x - a.y ? p : a), quad[0]);
		badge.style.left = `${clamp(tr.x - 20, 4, viewer.clientWidth - 110)}px`; badge.style.top = `${clamp(tr.y - 34, 4, viewer.clientHeight - 36)}px`;
		if (toolbar.hidden) return;
		// toolbar: docked at the bottom on narrow studios, floating above/below the text otherwise
		const sw = studio.clientWidth, docked = sw < 620;
		toolbar.classList.toggle('ag-docked', docked);
		if (docked) { toolbar.style.left = toolbar.style.top = ''; return; }
		const vx = viewer.offsetLeft, vy = viewer.offsetTop, tw = toolbar.offsetWidth, th = toolbar.offsetHeight;
		const pts = [...quad, rot, rs], minY = Math.min(...pts.map(p => p.y)) - 18 + vy, maxY = Math.max(...pts.map(p => p.y)) + 18 + vy;
		const cx = quad.reduce((a, p) => a + p.x, 0) / 4 + vx;
		let y = minY - th; if (y < 8) y = maxY;
		y = clamp(y, 8, studio.clientHeight - th - 8);
		toolbar.style.left = `${clamp(cx - tw / 2, 8, sw - tw - 8)}px`; toolbar.style.top = `${y}px`;
	}
	return { layout, elements: { layer, badge, rotHandle, sizeHandle } };
}
