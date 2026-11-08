// Atelier Gapette — configurator UI (instance-scoped port of the original app.js).
// mount(root, options) → { destroy, getConfiguration, setConfiguration }
import { decodeImageFile } from './customization.js';
import { ProductPreview } from './product-preview.js';
import { patterns, palettes, drawPattern } from './patterns.js';
import { attachTextEditor } from './text-editor.js';
import { colorName, TEXT_SWATCHES } from './colors.js';
import { createTracker } from './track.js';
import { FlatView } from './flat-view.js';
import { FONTS, DEFAULT_FONT, LEGACY_FONTS, SHAPES, MAX_GRAPHEMES, MAX_TEXTS, graphemes, unsupportedChars, toConfiguration, validateConfiguration, applyConfiguration, shapeOf } from './schema.js';

const colorsFromPalette = p => ({ base: p.base, accent: p.accent, light: p.light, brim: p.base, trim: p.accent });
function contrast(hex) { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return r * .299 + g * .587 + b * .114 > 145 ? '#142a32' : '#ffffff'; }

export function mount(root, options = {}) {
	if (root.__atelierGapette) return root.__atelierGapette;
	const opts = { order: { mode: 'none' }, ...options };
	// Solid model (0.8): one plain cap in a few catalogue colours + a required text.
	const solid = opts.solid && Array.isArray(opts.solid.colors) && opts.solid.colors.length ? opts.solid : null;
	const capOf = hex => solid && solid.colors.find(c => c.hex.toLowerCase() === String(hex).toLowerCase()) || null;
	const solidColors = hex => ({ base: hex, accent: hex, light: hex, brim: hex, trim: hex });
	// 0.12: text colours that can be printed today (solid.textColors) and whether the outline is offered.
	const textPal = solid && Array.isArray(solid.textColors) && solid.textColors.length ? solid.textColors.map(c => ({ hex: String(c.hex).toLowerCase(), label: c.label || '' })) : null;
	const outlineOk = !solid || solid.outline !== false;
	const lum = h => parseInt(h.slice(1, 3), 16) * .299 + parseInt(h.slice(3, 5), 16) * .587 + parseInt(h.slice(5, 7), 16) * .114;
	/** Readable text colour on a cap: black/white as before, or the best contrast among the printable colours. */
	const autoText = capHex => textPal ? textPal.reduce((best, c) => Math.abs(lum(c.hex) - lum(capHex)) > Math.abs(lum(best.hex) - lum(capHex)) ? c : best, textPal[0]).hex : (contrast(capHex) === '#ffffff' ? '#ffffff' : '#141414');
	const abort = new AbortController(), signal = abort.signal;
	const on = (el, type, fn, o = {}) => el && el.addEventListener(type, fn, { ...o, signal });
	const q = name => root.querySelector(`[data-ag="${name}"]`);
	const qa = sel => Array.from(root.querySelectorAll(sel));
	const timers = new Set();
	/* ---------- GA4 events (0.9.4): see track.js ---------- */
	const tracker = createTracker(opts.track), track = tracker.send, trackOnce = tracker.once;
	['pointerdown', 'keydown', 'input'].forEach(t => on(root, t, () => trackOnce('config_started', 'config_started'), { capture: true, passive: true }));

	const state = {
		pattern: 'peloton', palette: 0, colors: colorsFromPalette(palettes[0]), text: q('cap-text')?.value ?? 'ROULE MA POULE',
		placement: 'top', font: DEFAULT_FONT, color: '#ffffff', size: 100, outline: false, curve: 100, rotation: 0, effectiveSize: null, view: 'top', brimRaised: false,
		detail: false, moveText: false, textOffsets: { top: { x: 0, y: 0 }, bottom: { x: 0, y: 0 } }, imageSettings: { scale: 100, x: 0, y: 0 },
	};
	let preview, flat = null, flatStart = null, editor = null, swatchColors, imageName = '', imageRequest = 0, lastPattern = 'peloton';
	/* ---------- several texts (0.9): the flat fields above are the ACTIVE text ---------- */
	const TEXT_KEYS = ['text', 'placement', 'font', 'color', 'size', 'outline', 'curve', 'rotation', 'effectiveSize', 'textOffsets'];
	const clone = o => JSON.parse(JSON.stringify(o));
	const packActive = () => clone(Object.fromEntries(TEXT_KEYS.map(k => [k, state[k]])));
	const commitActive = () => { state.texts[state.active] = packActive(); };
	const loadActive = () => { Object.assign(state, clone(state.texts[state.active])); };
	state.active = 0; state.texts = [packActive()];
	function activateText(i, focus = false) {
		if (i < 0 || i >= state.texts.length) return;
		commitActive(); state.active = i; loadActive();
		setView(state.placement, false, state.detail);
		if (focus) q('cap-text').focus({ preventScroll: true });
	}
	/** A starting position on a face that does not sit on another text. */
	function freeOffset(side, except) {
		const taken = state.texts.filter((t, i) => i !== except && t.placement === side && t.text.trim()).map(t => t.textOffsets[side] || { x: 0, y: 0 });
		// mm on the flat visor (decal-5): one line of text is about 10 mm high
		for (const y of [0, 13, -12, 24]) if (!taken.some(o => Math.abs(o.y - y) < 10 && Math.abs(o.x) < 45)) return { x: 0, y };
		return { x: 0, y: 0 };
	}
	function addText() {
		if (state.texts.length >= MAX_TEXTS) return;
		commitActive();
		// start on the other face when the current one already carries a text
		const used = state.texts.filter(t => t.text.trim()).map(t => t.placement);
		const side = used.includes(state.placement) && !used.includes(state.placement === 'top' ? 'bottom' : 'top') ? (state.placement === 'top' ? 'bottom' : 'top') : state.placement;
		state.texts.push({ text: '', placement: side, font: state.font, color: state.color, size: 70, outline: false, curve: 100, rotation: 0, effectiveSize: null,
			textOffsets: { top: { x: 0, y: 0 }, bottom: { x: 0, y: 0 }, [side]: freeOffset(side, -1) } });
		state.active = state.texts.length - 1; loadActive();
		state.moveText = false; setView(state.placement, false, false);
		q('cap-text').focus({ preventScroll: true });
		announce(`Texte ${state.active + 1} ajouté. Saisissez-le.`);
	}
	/** Delete a text (default: the active one). The last remaining text is emptied instead. */
	function removeText(index = state.active) {
		commitActive();
		if (state.texts[index] && state.texts[index].text.trim()) track('text_removed', { text_count: Math.max(0, state.texts.filter(t => t.text.trim()).length - 1) });
		if (state.texts.length < 2) {
			if (!state.text.trim()) return;
			state.text = ''; state.effectiveSize = null; q('cap-text').value = '';
		} else {
			state.texts.splice(index, 1);
			if (index < state.active || state.active >= state.texts.length) state.active = Math.max(0, state.active - 1);
			loadActive();
		}
		state.moveText = false; setView(state.placement, false, false);
		announce('Texte supprimé. « Annuler » permet de le récupérer.');
	}
	function buildTextTabs() {
		const box = q('text-tabs'); if (!box) return;
		const key = JSON.stringify([state.active, state.texts.map((t, i) => (i === state.active ? state.text : t.text))]);
		if (box.dataset.key === key) return; box.dataset.key = key;
		const tabs = state.texts.map((t, i) => {
			const value = (i === state.active ? state.text : t.text).trim();
			const b = document.createElement('button'); b.type = 'button'; b.className = 'ag-text-tab'; b.dataset.textIndex = String(i);
			b.setAttribute('aria-pressed', String(i === state.active));
			const n = document.createElement('span'); n.className = 'ag-text-tab-n'; n.textContent = String(i + 1);
			const l = document.createElement('span'); l.className = 'ag-text-tab-label'; l.textContent = value || 'Nouveau texte';
			b.append(n, l); b.setAttribute('aria-label', `Texte ${i + 1}${value ? ` : ${value}` : ''}`);
			on(b, 'click', () => activateText(i));
			// delete link on the tab itself (the only text is emptied rather than removed)
			if (state.texts.length < 2 && !value) return b;
			const wrap = document.createElement('span'); wrap.className = 'ag-text-tab-wrap'; wrap.dataset.active = String(i === state.active);
			const x = document.createElement('button'); x.type = 'button'; x.className = 'ag-text-tab-x'; x.dataset.removeIndex = String(i);
			x.setAttribute('aria-label', `Supprimer le texte ${i + 1}${value ? ` : ${value}` : ''}`); x.title = 'Supprimer ce texte';
			const cross = document.createElement('span'); cross.setAttribute('aria-hidden', 'true'); cross.className = 'ag-ico ag-ico-corbeille'; x.append(cross);
			on(x, 'click', () => removeText(i));
			wrap.append(b, x);
			return wrap;
		});
		if (state.texts.length < MAX_TEXTS) {
			const add = document.createElement('button'); add.type = 'button'; add.className = 'ag-text-tab ag-text-add'; const plus = document.createElement('span'); plus.setAttribute('aria-hidden', 'true'); plus.className = 'ag-ico ag-ico-plus'; add.append(plus, ' Ajouter un texte');
			on(add, 'click', addText); tabs.push(add);
		}
		box.replaceChildren(...tabs);
		const rm = q('remove-text'); if (rm) rm.hidden = state.texts.length < 2 && !state.text.trim();
	}
	let textColorChosen = false, colorSelect = null;
	if (solid) {
		const first = solid.colors.find(c => c.id === solid.default) || solid.colors[0];
		state.pattern = 'plain'; lastPattern = 'plain'; state.palette = null; state.colors = solidColors(first.hex); state.color = autoText(first.hex);
		if (textPal) { const other = root.querySelector('.ag-swatch-other'); if (other) other.style.display = 'none'; }
		if (!outlineOk) { const o = q('outline'); if (o) { o.checked = false; (o.closest('label') || o).style.display = 'none'; } }
	}
	/** Choose the cap colour (solid model); keeps the text readable unless the customer picked its colour. */
	function setCapColor(id) {
		const c = solid && solid.colors.find(x => x.id === id); if (!c) return;
		state.colors = solidColors(c.hex);
		const auto = autoText(c.hex);
		commitActive();
		for (const t of state.texts) if (textPal || !textColorChosen || colorName(t.color) === colorName(c.hex)) t.color = auto;
		loadActive();
		update();
	}
	/** Variation <select> of the product form that carries the colour, if any. */
	function findColorSelect(form) {
		if (!solid || !form) return null;
		return Array.from(form.querySelectorAll('select[name^="attribute_"]')).find(sel => Array.from(sel.options).some(o => termId(o.value) || termId(o.textContent))) || null;
	}
	const slug = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	function termId(v) { const s = slug(v); if (!s) return null; const c = solid.colors.find(x => x.id === s || (x.terms || []).includes(s)); return c ? c.id : null; }
	function syncColorSelect() {
		if (!colorSelect) return;
		const cap = capOf(state.colors.base); if (!cap) return;
		if (termId(colorSelect.value) === cap.id) return;
		const opt = Array.from(colorSelect.options).find(o => o.value && (termId(o.value) === cap.id || termId(o.textContent) === cap.id));
		if (!opt) return;
		colorSelect.value = opt.value;
		colorSelect.dispatchEvent(new Event('change', { bubbles: true })); // reaches jQuery handlers too (WooCommerce variations)
	}

	/* ---------- controls ---------- */
	function buildControls() {
		patterns.forEach(p => {
			const button = document.createElement('button'); button.type = 'button'; button.className = 'pattern-button'; button.dataset.pattern = p.id; button.setAttribute('aria-pressed', String(p.id === state.pattern));
			const canvas = document.createElement('canvas'); canvas.width = 220; canvas.height = 120; canvas.setAttribute('aria-hidden', 'true');
			const label = document.createElement('span'); label.textContent = p.name; button.append(canvas, label);
			on(button, 'click', () => { state.pattern = p.id; lastPattern = p.id; update(); });
			q('patterns').append(button);
		});
		Object.entries(FONTS).forEach(([id, f]) => {
			const button = document.createElement('button'); button.type = 'button'; button.className = 'font-button'; button.dataset.font = id;
			button.setAttribute('aria-pressed', String(id === state.font)); button.setAttribute('aria-label', f.label);
			const sample = document.createElement('span'); sample.className = 'font-sample'; sample.textContent = f.capsOnly ? 'GAPETTE' : 'Gapette';
			sample.style.fontFamily = `"${f.family}"`; sample.style.fontWeight = f.weight; sample.style.fontStyle = f.style;
			const label = document.createElement('span'); label.className = 'font-label'; label.textContent = f.label;
			button.append(sample, label);
			on(button, 'click', () => { track('font_changed', { font: id }); state.font = id; if (state.view !== state.placement) setView(state.placement, false, true); else update(); });
			q('fonts').append(button);
		});
		palettes.forEach((p, i) => {
			const button = document.createElement('button'); button.type = 'button'; button.className = 'palette-button'; button.dataset.palette = p.id;
			button.style.background = `linear-gradient(135deg,${p.base} 50%,${p.accent} 50%)`; button.title = p.name; button.setAttribute('aria-label', p.name); button.setAttribute('aria-pressed', String(i === state.palette));
			on(button, 'click', () => { state.palette = i; state.colors = colorsFromPalette(p); update(); });
			q('palettes').append(button);
		});
	}

	function buildCapColors() {
		const box = q('cap-colors'); if (!box || !solid) return;
		box.replaceChildren(...solid.colors.map(c => {
			const b = document.createElement('button'); b.type = 'button'; b.className = 'ag-cap-color'; b.dataset.capColor = c.id;
			const dot = document.createElement('span'); dot.className = 'ag-cap-dot'; dot.style.background = c.hex; dot.setAttribute('aria-hidden', 'true');
			const label = document.createElement('span'); label.textContent = c.label;
			b.append(dot, label);
			on(b, 'click', () => { setCapColor(c.id); track('color_selected', { color: c.id }); });
			return b;
		}));
	}

	function update() {
		if (!FONTS[state.font]) state.font = LEGACY_FONTS[state.font] || DEFAULT_FONT;
		if (!Array.isArray(state.texts) || !state.texts.length) { state.texts = [packActive()]; state.active = 0; }
		state.active = Math.max(0, Math.min(state.texts.length - 1, state.active || 0));
		commitActive();
		// what the renderer needs for the other texts
		state.layers = state.texts.map(t => ({ ...t, fontCanvas: (FONTS[t.font] || FONTS[DEFAULT_FONT]).canvas, outlineColor: contrast(t.color) }));
		buildTextTabs();
		if (solid) {
			// imported / restored documents are brought back to the catalogue
			const cap = capOf(state.colors.base) || solid.colors.find(c => c.id === solid.default) || solid.colors[0];
			state.pattern = 'plain'; state.palette = null;
			if (Object.values(state.colors).some(v => String(v).toLowerCase() !== cap.hex.toLowerCase())) state.colors = solidColors(cap.hex);
		}
		const p = state.colors;
		const cap = solid ? capOf(p.base) : null;
		if (cap) {
			qa('[data-cap-color]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.capColor === cap.id)));
			const out = q('cap-color-name'); if (out) out.textContent = cap.label;
		}
		const paletteName = cap ? cap.label : state.palette === null ? 'Couleurs personnalisées' : palettes[state.palette].name;
		q('palette-name').textContent = paletteName;
		qa('[data-surface-color]').forEach(input => { const value = p[input.dataset.surfaceColor]; input.value = value; root.querySelector(`[data-color-value="${input.dataset.surfaceColor}"]`).textContent = colorName(value); });
		qa('[data-ag-placement]').forEach(input => { input.checked = input.value === state.placement; });
		const swatchKey = [p.base, p.accent, p.light].join();
		qa('[data-pattern]').forEach(b => {
			b.setAttribute('aria-pressed', String(b.dataset.pattern === state.pattern));
			if (swatchKey !== swatchColors) { const c = b.querySelector('canvas'); drawPattern(c.getContext('2d'), b.dataset.pattern, p, c.width, c.height); }
		});
		if (swatchKey !== swatchColors) buildTextSwatches();
		swatchColors = swatchKey;
		qa('.palette-button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === state.palette)));
		const name = cap ? 'Gapette' : state.pattern === 'custom' ? 'Mon image' : patterns.find(x => x.id === state.pattern).name;
		q('pattern-name').textContent = name;
		q('character-count').textContent = `${graphemes(state.text).length} / ${MAX_GRAPHEMES}`;
		q('size-value').textContent = `${state.size} %`; q('color-label').textContent = colorName(state.color);
		qa('[data-text-color]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.textColor === state.color.toLowerCase())));
		if (!FONTS[state.font]) state.font = LEGACY_FONTS[state.font] || DEFAULT_FONT;
		qa('[data-font]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.font === state.font)));
		q('font-name').textContent = FONTS[state.font].label;
		q('text-color').value = state.color; q('size').value = state.size; q('outline').checked = state.outline;
		q('curve').value = state.curve; q('rotation').value = state.rotation;
		q('curve-value').textContent = state.curve === 0 ? 'droit' : `${state.curve > 0 ? '' : '−'}${Math.abs(state.curve)} %${state.curve < 0 ? ' (inversé)' : ''}`;
		q('rotation-value').textContent = `${state.rotation > 0 ? '+' : state.rotation < 0 ? '−' : ''}${Math.abs(state.rotation)}°`;
		const shape = shapeOf(state);
		qa('[data-shape]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.shape === shape)));
		showFitNote();
		if (q('cap-text').value !== state.text) q('cap-text').value = state.text;
		const face = state.placement === 'top' ? 'dessus' : 'dessous', brim = state.brimRaised ? 'relevée' : 'baissée';
		q('summary').replaceChildren(document.createTextNode(cap ? `Gapette ${cap.label.toLowerCase()}` : `${name} · ${paletteName}`), document.createElement('br'),
			document.createTextNode(summaryText(cap, brim)));
		q('viewer').setAttribute('aria-label', `${cap ? `Gapette ${cap.label.toLowerCase()}` : `Gapette motif ${name}, ${paletteName}`}, visière ${brim}${state.text ? `, texte « ${state.text} » sur le ${face} de la visière` : ''}. Vue fixe de trois quarts.`);
		// unsupported characters
		const bad = unsupportedChars(state.text), err = q('text-error');
		q('cap-text').setAttribute('aria-invalid', String(!!bad.length));
		if (err) { err.hidden = !bad.length; err.textContent = bad.length ? `Caractère(s) non disponible(s) dans les polices : ${bad.join(' ')}` : ''; }
		syncTextPosition();
		q('image-controls').hidden = !imageName;
		q('use-image').setAttribute('aria-pressed', String(state.pattern === 'custom'));
		for (const key of ['scale', 'x', 'y']) {
			q('image-' + key).value = state.imageSettings[key];
			q('image-' + key + '-value').textContent = state.imageSettings[key] + (key === 'scale' ? ' %' : '');
		}
		preview?.update(state, FONTS[state.font].canvas, contrast(state.color));
		syncColorSelect();
		scheduleOrderFields();
		recordHistory();
	}

	/* ---------- text colour swatches (palette colours first) ---------- */
	function buildTextSwatches() {
		const box = q('text-swatches'); if (!box) return;
		// palette colours first, then print-friendly ones; near-duplicates (same name) are skipped
		const seen = new Set(), list = [];
		if (solid && !textPal) seen.add(colorName(state.colors.base)); // a text in the cap's own colour would not show
		for (const c of (textPal ? textPal.map(x => x.hex) : solid ? TEXT_SWATCHES : [state.colors.base, state.colors.accent, state.colors.light, ...TEXT_SWATCHES]).map(x => x.toLowerCase())) {
			const n = colorName(c); if (!textPal && seen.has(n)) continue; seen.add(n); list.push(c);
		}
		list.splice(12);
		if (!list.includes(state.color.toLowerCase()) && seen.has(colorName(state.color))) { /* keep current colour selectable via its twin */ }
		box.replaceChildren(...list.map(hex => {
			const b = document.createElement('button'); b.type = 'button'; b.className = 'ag-swatch'; b.dataset.textColor = hex;
			const lab = (textPal && (textPal.find(c => c.hex === hex) || {}).label) || colorName(hex);
			b.style.background = hex; b.title = lab; b.setAttribute('aria-label', lab);
			b.setAttribute('aria-pressed', String(hex === state.color.toLowerCase()));
			on(b, 'click', () => { state.color = hex; textColorChosen = true; if (state.view !== state.placement) setView(state.placement, false, true); else update(); });
			return b;
		}));
	}

	/* ---------- undo / redo / reset ---------- */
	const HISTORY_KEYS = ['pattern', 'palette', 'colors', 'text', 'placement', 'font', 'color', 'size', 'outline', 'curve', 'rotation', 'textOffsets', 'imageSettings', 'texts', 'active'];
	// effectiveSize is derived (fit to the visor), not a user change
	const snapshot = () => JSON.stringify(HISTORY_KEYS.map(k => (k === 'texts' ? state.texts.map(t => ({ ...t, effectiveSize: null })) : state[k])));
	const history = { past: [], future: [], last: 0, applying: false, current: null };
	function recordHistory() {
		if (history.applying) return;
		const snap = snapshot();
		if (history.current === null) { history.current = snap; syncHistoryButtons(); return; }
		if (snap === history.current) return;
		const now = Date.now();
		// changes less than 700 ms apart (a drag, typing) form a single step
		if (!(now - history.last < 700 && history.past.length)) history.past.push(history.current);
		if (history.past.length > 60) history.past.shift();
		history.current = snap; history.future = []; history.last = now;
		syncHistoryButtons();
	}
	function restore(snap) {
		const values = JSON.parse(snap);
		history.applying = true;
		HISTORY_KEYS.forEach((k, i) => { state[k] = values[i]; });
		state.effectiveSize = null;
		if (state.pattern === 'custom' && !imageName) state.pattern = lastPattern;
		setView(state.view, false, state.detail);
		history.applying = false; history.current = snapshot(); history.last = 0;
		syncHistoryButtons();
	}
	function undo() { if (!history.past.length) return; track('undo_used'); history.future.push(history.current); restore(history.past.pop()); announce('Modification annulée'); }
	function redo() { if (!history.future.length) return; track('redo_used'); history.past.push(history.current); restore(history.future.pop()); announce('Modification rétablie'); }
	function syncHistoryButtons() {
		const u = q('undo'), r = q('redo');
		if (u) u.disabled = !history.past.length;
		if (r) r.disabled = !history.future.length;
	}

	const filledTexts = () => state.texts.filter(t => t.text.trim());
	function summaryText(cap, brim) {
		const list = filledTexts();
		if (!list.length) return cap ? 'Ajoutez votre texte pour commander' : `Sans texte · Visière ${brim}`;
		if (list.length > 1) return list.map(t => `« ${t.text} » (${t.placement === 'top' ? 'dessus' : 'dessous'})`).join(' · ');
		const t = list[0], face = t.placement === 'top' ? 'dessus' : 'dessous';
		return state.text.trim() ? `« ${state.text} » sur le ${face} · ${FONTS[state.font].label} · ${shapeLabel()} · ${state.effectiveSize ?? state.size} %` : `« ${t.text} » sur le ${face}`;
	}
	function shapeLabel() {
		const sh = shapeOf(state);
		return sh ? SHAPES[sh].label : `courbure ${state.curve} % · ${state.rotation}°`;
	}
	function showFitNote() {
		const note = q('fit-note'); if (!note) return;
		const eff = state.effectiveSize;
		const reduced = state.text.trim() && eff != null && eff < state.size;
		const over = !!state.text.trim() && !!preview?.cache?.[state.placement]?.over?.[state.active];
		if (tracker.has('config_started') && (over || reduced)) trackOnce(`overflow:${state.active}:${state.placement}:${over ? 'edge' : 'size'}`, 'overflow_warning', { reason: over ? 'edge' : 'size_reduced', position: state.placement });
		note.hidden = !reduced && !over;
		note.textContent = [reduced ? `Taille ramenée à ${eff} % pour que le texte tienne sur la visière.` : '', over ? 'Le texte touche le bord de la visière : ce qui dépasse ne sera pas imprimé.' : ''].filter(Boolean).join(' ');
	}
	function setView(view, immediate = false, detail = false) {
		state.view = view; state.brimRaised = view === 'bottom'; state.detail = detail;
		q('detail-toggle').setAttribute('aria-pressed', String(detail));
		{ const dl = q('detail-toggle').querySelector('[data-ag=detail-label]'); if (dl) dl.textContent = detail ? 'Vue d’ensemble' : 'Zoom sur le texte'; }
		root.classList.toggle('ag-is-detail', detail);
		q('studio').classList.toggle('detail-mode', detail);
		qa('[data-view]').forEach(button => { const active = button.dataset.view === view; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
		{ const ff = q('flat-face'); if (ff) ff.textContent = view === 'top' ? 'dessus de la visière' : 'dessous de la visière'; }
		update();
	}
	const setBrimRaised = raised => setView(raised ? 'bottom' : 'top', false, state.detail);

	function syncTextPosition() {
		const offset = state.textOffsets[state.placement];
		for (const key of ['x', 'y']) { q('text-' + key).value = offset[key]; q('text-' + key + '-value').textContent = `${offset[key] > 0 ? '+' + offset[key] : String(offset[key])} mm`; }
		q('move-text').setAttribute('aria-pressed', String(state.moveText));
		q('move-text').textContent = state.moveText ? 'Terminer la modification' : 'Modifier sur l’aperçu';
		for (const id of ['move-text', 'center-text', 'text-x', 'text-y']) q(id).disabled = !state.text.trim();
		q('move-help').textContent = state.moveText ? 'Glissez le texte pour le déplacer, la poignée ⟳ pour l’incliner, la poignée ⤡ pour l’agrandir. Clavier : flèches, + / −, [ / ], Échap.' : 'Touchez le texte sur l’aperçu pour le déplacer, l’incliner et l’agrandir.';
	}
	function changeTextPosition(position) {
		state.textOffsets[state.placement] = { ...position };
		if (state.view !== state.placement) setView(state.placement, false, true); else update();
	}
	const imageMessage = (text, error = false) => { q('image-status').textContent = text; q('image-status').dataset.error = String(error); };
	const setImageName = name => { const n = q('image-name'); if (n) n.textContent = name || 'Aucune image'; };

	buildControls();
	buildCapColors();
	preview = new ProductPreview(q('viewer'), q('render-error'), (view, offset) => { state.textOffsets[view] = { ...offset }; syncTextPosition(); scheduleOrderFields(); },
		{ materialsUrl: opts.materialsUrl,
			// 0.11: with the flat view, texts are placed there; the 3/4 view is the realistic preview
			editable: !q('flat-stage'),
			onSelectText: () => select(false),
			onPickText: i => { activateText(i); if (!q('flat-stage')) select(false); },
			onLayerMove: (i, view, offset) => { if (state.texts[i]) state.texts[i].textOffsets[view] = { ...offset }; scheduleOrderFields(); },
			onBlank: () => deselect(false),
			onRender: () => { editor?.layout(); showFitNote(); flat?.render(); },
			onFit: (view, size, index) => {
				if (index !== undefined && index !== state.active) return;
				if (view !== state.placement) return;
				state.effectiveSize = size; showFitNote(); scheduleOrderFields();
				const sum = q('summary'); if (sum && sum.lastChild && state.text) sum.lastChild.textContent = summaryText(solid ? capOf(state.colors.base) : null, state.brimRaised ? 'relevée' : 'baissée');
			} });
	/* ---------- direct editing on the preview ---------- */
	function announce(msg) { const r = q('edit-status'); if (r) { r.textContent = ''; setTimeout(() => { r.textContent = msg; }, 30); } }
	function select(focusToolbar) {
		if (!state.text.trim()) { q('cap-text').focus(); return; }
		state.moveText = true; setView(state.placement, false, true);
		announce('Modification du texte sur l’aperçu. Échap pour terminer.');
		if (focusToolbar) requestAnimationFrame(() => requestAnimationFrame(() => { const t = q('text-toolbar'); if (t && !t.hidden) t.focus({ preventScroll: true }); }));
	}
	function deselect(returnFocus) {
		if (!state.moveText) return;
		const hadFocus = q('text-toolbar')?.contains(document.activeElement);
		state.moveText = false; setView(state.view, false, false);
		if (returnFocus || hadFocus) requestAnimationFrame(() => { const b = root.querySelector('.ag-edit-badge'); (b && !b.hidden ? b : q('viewer')).focus({ preventScroll: true }); });
	}
	editor = attachTextEditor({ root, q, qa, on, state, preview, update, setView, select, deselect, announce, removeText });

	/* ---------- flat view (0.11): the visor at scale, the texts as printed ---------- */
	if (q('flat-stage')) {
		// the 3/4 view becomes the realistic preview; texts are placed on the flat visor
		root.classList.add('ag-has-flat');
		flat = new FlatView(q('flat-stage'), {
			preview, signal,
			onPick: i => activateText(i),
			// the preview resolves the position on the visor and reports it back (onTextMove)
			onDrag: requested => { if (state.view === state.placement) preview.moveTextTo(requested); },
			onDragEnd: () => update(),
			onKey: (dx, dy) => {
				if (!state.text.trim() || state.view !== state.placement) return;
				const o = state.textOffsets[state.placement] || { x: 0, y: 0 };
				changeTextPosition({ x: o.x + dx, y: o.y + dy });
			},
			// handles: size and tilt of the active text (same bounds as the 3/4 editor)
			onHandleStart: () => { flatStart = { size: state.effectiveSize ?? state.size, rotation: state.rotation }; },
			onResize: ratio => { if (!flatStart || !state.text.trim()) return; state.size = Math.max(30, Math.min(250, Math.round(flatStart.size * ratio))); state.effectiveSize = null; update(); },
			onRotate: deg => {
				if (!state.text.trim()) return;
				let r = Math.max(-90, Math.min(90, Math.round(deg)));
				for (const snap of [0, -90, 90]) if (Math.abs(r - snap) <= 3) r = snap; // magnet while dragging
				state.rotation = r; update();
			},
			// empty face pressed: write on it (a new text when the active one is already filled)
			onEmpty: view => {
				if (state.text.trim() && state.texts.length < MAX_TEXTS) addText();
				if (state.placement !== view) { const r = root.querySelector(`[data-ag-placement][value="${view}"]`); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } }
				const field = q('cap-text'); field.focus({ preventScroll: true }); field.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			},
			onSizeKey: step => { if (!state.text.trim()) return; state.size = Math.max(30, Math.min(250, (step < 0 ? state.effectiveSize ?? state.size : state.size) + step)); state.effectiveSize = null; update(); announce(`Taille ${state.size} %`); },
		});
	}

	// Canvas text needs the bundled fonts loaded explicitly before measuring.
	if (document.fonts?.load) {
		Promise.all(Object.values(FONTS).map(f => document.fonts.load(`${f.style} ${f.weight} 40px "${f.family}"`, 'AÉgœ'))).then(() => {
			if (signal.aborted) return; preview.invalidate(); update();
		}).catch(() => {});
	}

	let textTimer = 0;
	on(q('cap-text'), 'input', e => {
		const g = graphemes(e.target.value);
		state.text = g.slice(0, MAX_GRAPHEMES).join('');
		if (g.length > MAX_GRAPHEMES) e.target.value = state.text;
		update();
		// one `text_added` per text, once the visitor pauses typing
		const slot = state.active; clearTimeout(textTimer); timers.delete(textTimer);
		textTimer = setTimeout(() => {
			if (slot !== state.active || !state.text.trim()) return;
			trackOnce('text_added:' + slot, 'text_added', { text_count: state.texts.filter((t, i) => i === slot ? true : !!t.text.trim()).length, char_count: graphemes(state.text).length, position: state.placement, font: state.font });
		}, 1200); timers.add(textTimer);
	});
	on(q('cap-text'), 'focus', () => setView(state.placement, false, true));
	qa('[data-ag-placement]').forEach(input => on(input, 'change', e => {
		track('position_changed', { position: e.target.value }); state.placement = e.target.value; state.effectiveSize = null;
		// moving to a face that already carries a text: do not land on top of it
		const o = state.textOffsets[state.placement] || { x: 0, y: 0 };
		if (state.texts.some((t, i) => i !== state.active && t.placement === state.placement && t.text.trim() && Math.abs((t.textOffsets[state.placement]?.y || 0) - o.y) < 10 && Math.abs((t.textOffsets[state.placement]?.x || 0) - o.x) < 45)) state.textOffsets[state.placement] = freeOffset(state.placement, state.active);
		update(); setView(state.placement, false, true);
	}));
	qa('[data-surface-color]').forEach(input => on(input, 'input', e => { state.colors[e.target.dataset.surfaceColor] = e.target.value; state.palette = null; update(); }));
	on(q('detail-toggle'), 'click', () => { track('preview_zoomed', { zoomed: !state.detail }); setView(state.detail ? state.view : state.placement, false, !state.detail); });
	qa('[data-shape]').forEach(b => on(b, 'click', () => {
		const sh = SHAPES[b.dataset.shape]; state.curve = sh.curve; state.rotation = sh.rotation;
		state.textOffsets[state.placement] = { x: 0, y: 0 }; setView(state.placement, false, true);
	}));
	on(q('curve'), 'input', e => { state.curve = Number(e.target.value); if (state.view !== state.placement) setView(state.placement, false, true); else update(); });
	on(q('rotation'), 'input', e => { state.rotation = Number(e.target.value); if (state.view !== state.placement) setView(state.placement, false, true); else update(); });
	on(q('text-color'), 'input', e => { state.color = e.target.value; textColorChosen = true; update(); });
	on(q('size'), 'input', e => { state.size = Number(e.target.value); update(); });
	on(q('outline'), 'change', e => { state.outline = e.target.checked; update(); });
	qa('[data-view]').forEach(button => on(button, 'click', () => { track('visor_view_changed', { view: button.dataset.view }); setView(button.dataset.view); }));
	on(root.querySelector('details.ag-fine'), 'toggle', e => { if (e.target.open) track('advanced_settings_opened'); });
	on(q('undo'), 'click', undo);
	on(q('redo'), 'click', redo);
	on(q('reset-all'), 'click', () => {
		if (snapshot() === initialSnapshot) return;
		track('config_reset');
		history.past.push(history.current); history.future = [];
		state.moveText = false; state.detail = false;
		restore(initialSnapshot);
		announce('Configuration réinitialisée. « Annuler » permet de revenir en arrière.');
	});
	on(root, 'keydown', e => {
		if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
		if (e.target.matches('input[type=text], textarea')) return; // native undo in text fields
		e.preventDefault(); if (e.shiftKey) redo(); else undo();
	});
	on(q('remove-text'), 'click', () => removeText());
	on(q('move-text'), 'click', () => { if (state.moveText) deselect(false); else select(true); });
	on(q('center-text'), 'click', () => changeTextPosition({ x: 0, y: 0 }));
	for (const key of ['x', 'y']) on(q('text-' + key), 'input', e => changeTextPosition({ ...state.textOffsets[state.placement], [key]: Number(e.target.value) }));
	on(q('viewer'), 'keydown', event => {
		if (event.key === 'Escape') { deselect(false); return; }
		if (state.moveText && ['+', '=', '-', '_', '[', ']'].includes(event.key)) {
			event.preventDefault();
			if (event.key === '[' || event.key === ']') { state.rotation = Math.max(-90, Math.min(90, state.rotation + (event.key === ']' ? 5 : -5))); announce(`Inclinaison ${state.rotation}°`); }
			else { state.size = Math.max(30, Math.min(250, (event.key === '-' || event.key === '_' ? (state.effectiveSize ?? state.size) - 5 : state.size + 5))); state.effectiveSize = null; announce(`Taille ${state.size} %`); }
			update(); return;
		}
		if (state.moveText && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
			event.preventDefault(); const step = event.shiftKey ? 5 : 1, offset = state.textOffsets[state.placement]; // mm
			changeTextPosition({ x: offset.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), y: offset.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0) });
		} else if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); setView(state.brimRaised ? 'top' : 'bottom', false, state.detail); }
	});
	on(q('image-upload'), 'change', async event => {
		const file = event.target.files?.[0]; if (!file) return;
		const request = ++imageRequest; imageMessage('Chargement de l’image…');
		try {
			const decoded = await decodeImageFile(file); if (request !== imageRequest || signal.aborted) return;
			if (state.pattern !== 'custom') lastPattern = state.pattern;
			preview.setImage(decoded); imageName = file.name; setImageName(file.name); state.pattern = 'custom'; state.imageSettings = { scale: 100, x: 0, y: 0 };
			state.moveText = false; setView(state.view, false, false);
			imageMessage('Image appliquée au tissu. Elle disparaît si vous quittez la page.');
		} catch (error) { if (request === imageRequest) imageMessage(error.message, true); }
		finally { if (request === imageRequest) event.target.value = ''; }
	});
	on(q('use-image'), 'click', () => { if (imageName) { state.pattern = 'custom'; state.moveText = false; setView(state.view, false, false); } });
	on(q('remove-image'), 'click', () => {
		imageRequest++; preview.setImage(null); imageName = ''; setImageName(''); q('image-upload').value = '';
		if (state.pattern === 'custom') state.pattern = lastPattern;
		state.imageSettings = { scale: 100, x: 0, y: 0 }; imageMessage(''); update();
	});
	for (const key of ['scale', 'x', 'y']) on(q('image-' + key), 'input', e => { if (!imageName) return; state.imageSettings = { ...state.imageSettings, [key]: Number(e.target.value) }; state.pattern = 'custom'; update(); });
	on(q('reset-image'), 'click', () => { state.imageSettings = { scale: 100, x: 0, y: 0 }; if (imageName) state.pattern = 'custom'; update(); });

	/* ---------- export / import of the v1 document (lot A) ---------- */
	function getConfiguration() {
		commitActive();
		// every text gets the size actually rendered on its face
		const settled = preview?.settle?.();
		if (settled) state.texts.forEach((t, i) => { const f = settled.fits[i]; t.effectiveSize = f === undefined ? null : Math.min(t.size, f); });
		return toConfiguration(state);
	}
	function setConfiguration(doc) {
		const v = validateConfiguration(typeof doc === 'string' ? JSON.parse(doc) : doc);
		if (!v.ok) return v;
		applyConfiguration(state, v.value); state.effectiveSize = null; state.moveText = false; q('cap-text').value = state.text; setView(state.placement, false, false);
		return v;
	}
	on(q('config-copy'), 'click', async () => {
		const json = JSON.stringify(getConfiguration(), null, 2);
		q('config-code').value = json;
		try { await navigator.clipboard.writeText(json); q('config-status').textContent = 'Configuration copiée.'; }
		catch { q('config-status').textContent = 'Configuration affichée ci-dessous : copiez-la.'; }
	});
	on(q('config-apply'), 'click', () => {
		let res; try { res = setConfiguration(q('config-code').value); } catch { res = { ok: false, errors: ['JSON illisible'] }; }
		q('config-status').textContent = res.ok ? 'Configuration appliquée.' : res.errors.join(' · ');
		q('config-status').dataset.error = String(!res.ok);
	});

	/* ---------- order binding (lot B) ---------- */
	const orderForm = opts.order.mode === 'form' ? q('order-form') : opts.order.mode === 'product' ? (root.closest('form.cart') || document.querySelector(opts.order.formSelector || 'form.cart')) : null;
	function field(form, name) {
		let input = form.querySelector(`input[name="${name}"]`);
		if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = name; form.append(input); }
		return input;
	}
	function fillOrderFields() {
		if (!orderForm) return { ok: true };
		// Render first: it also settles the size fitted to the visor (onFit), which goes in the JSON.
		commitActive();
		const anyText = filledTexts()[0];
		const view = anyText ? anyText.placement : 'top';
		const full = preview.snapshot({ width: 960 }), thumb = preview.snapshot({ width: 240, views: [view] });
		if (!full) return { ok: false, errors: ['L’aperçu est encore en préparation, réessayez dans un instant.'] };
		const v = solid && !anyText ? { ok: false, errors: ['Saisissez le texte à imprimer sur la visière avant d’ajouter au panier.'], needsText: true } : validateConfiguration(getConfiguration());
		const status = q('order-status');
		if (!v.ok) { field(orderForm, 'ag_config').value = ''; return v; }
		field(orderForm, 'ag_config').value = JSON.stringify(v.value);
		field(orderForm, 'ag_preview').value = full;
		field(orderForm, 'ag_thumb').value = thumb;
		if (status && status.dataset.error === 'true') { status.textContent = ''; status.dataset.error = 'false'; }
		return v;
	}
	if (solid && orderForm) {
		colorSelect = findColorSelect(orderForm);
		if (colorSelect) {
			const fromSelect = () => { const id = termId(colorSelect.value) || termId(colorSelect.selectedOptions[0]?.textContent); const cur = capOf(state.colors.base); if (id && (!cur || cur.id !== id)) setCapColor(id); };
			on(colorSelect, 'change', fromSelect);
			if (window.jQuery) { const $s = window.jQuery(colorSelect), h = () => fromSelect(); $s.on('change.atelierGapette', h); signal.addEventListener('abort', () => $s.off('change.atelierGapette', h)); }
			const id = termId(colorSelect.value); if (id) state.colors = solidColors(solid.colors.find(c => c.id === id).hex), state.color = autoText(state.colors.base);
		}
	}
	/* ---------- dedicated product page: purchase block inside the configurator, full-bleed ---------- */
	const restoreMoves = [];
	if (opts.order.relocate && orderForm && q('buy-slot')) {
		const slot = q('buy-slot'), summary = orderForm.closest('.summary') || orderForm.parentElement;
		const price = summary && Array.from(summary.children).find(el => el.matches && el.matches('.price'));
		for (const el of [price, orderForm]) {
			if (!el) continue;
			const marker = document.createComment('ag'); el.before(marker);
			slot.append(el); restoreMoves.push(() => { marker.replaceWith(el); });
		}
		slot.hidden = false;
		// the colour swatches drive the product's colour list: no need to show it twice
		if (colorSelect && orderForm.querySelectorAll('select[name^="attribute_"]').length === 1) orderForm.classList.add('ag-hide-variations');
	}
	if (root.classList.contains('ag-bleed')) {
		const bleed = () => {
			root.style.marginLeft = '0px'; root.style.width = '';
			const left = root.getBoundingClientRect().left, w = document.documentElement.clientWidth;
			// wide, not edge to edge: side margins (16px phone → 48px desktop), capped at 1440px and centred
			const gutter = Math.max(16, Math.min(48, w * 0.04)), width = Math.min(w - 2 * gutter, 1440);
			root.style.width = `${width}px`; root.style.marginLeft = `${-left + (w - width) / 2}px`;
		};
		bleed(); on(window, 'resize', bleed);
		if (window.ResizeObserver && root.parentElement) { const ro = new ResizeObserver(bleed); ro.observe(root.parentElement); signal.addEventListener('abort', () => ro.disconnect()); }
	}
	/* ---------- total price inside the add-to-cart button ---------- */
	const pf = opts.order.price;
	const cta = orderForm && orderForm.querySelector('.single_add_to_cart_button, .ag-order-button');
	// Quantity discount (0.10): the server applies it in the cart (all personalised caps
	// together); the button only previews it for the quantity typed here.
	const rule = pf && pf.discount && pf.discount.min >= 2 && pf.discount.pct > 0 && pf.discount.pct < 100 ? pf.discount : null;
	const cents = 10 ** ((pf && pf.decimals) || 2);
	const unitFor = (unit, n) => rule && n >= rule.min ? Math.round(unit * (1 - rule.pct / 100) * cents) / cents : unit;
	if (cta && pf && Number.isFinite(pf.unit)) {
		const base = cta.textContent.trim(), qty = orderForm.querySelector('input.qty, input[name="quantity"]');
		const note = q('qty-note'), noteDefault = note ? note.textContent : '', pct = rule ? String(rule.pct).replace('.', ',') : '';
		let unit = pf.unit;
		const money = n => {
			const [int, dec] = Math.abs(n).toFixed(pf.decimals).split('.');
			const num = int.replace(/\B(?=(\d{3})+(?!\d))/g, pf.thouSep) + (dec ? pf.decSep + dec : '');
			return pf.format.replace('%1$s', pf.symbol).replace('%2$s', num).replace(/ /g, '\u00a0'); // never broken across lines
		};
		const refresh = () => {
			if (cta.getAttribute('aria-busy') === 'true') return;
			const n = Math.max(1, parseInt(qty && qty.value, 10) || 1), each = unitFor(unit, n), applied = unit > 0 && each < unit;
			cta.textContent = unit > 0 ? `${base} ·\u00a0${money(each * n)}` : base;
			root.classList.toggle('ag-price-in-cta', unit > 0);
			if (note) {
				note.textContent = applied ? `Remise de ${pct} % appliquée : ${money(each * n)} au lieu de ${money(unit * n)}.` : noteDefault;
				note.dataset.applied = String(applied);
			}
		};
		if (qty) { on(qty, 'input', refresh); on(qty, 'change', refresh); }
		if (window.jQuery) {
			const $f = window.jQuery(orderForm);
			$f.on('found_variation.atelierGapette', (e, v) => { if (v && typeof v.display_price === 'number') { unit = v.display_price; refresh(); } });
			$f.on('reset_data.atelierGapette', () => { unit = pf.unit; refresh(); });
			signal.addEventListener('abort', () => { $f.off('.atelierGapette'); cta.textContent = base; if (note) { note.textContent = noteDefault; note.dataset.applied = 'false'; } });
		}
		refresh();
	}
	let orderTimer = 0;
	function scheduleOrderFields() {
		if (!orderForm) return;
		clearTimeout(orderTimer); timers.delete(orderTimer);
		orderTimer = setTimeout(() => { try { fillOrderFields(); } catch (e) { /* retried on submit */ } }, 450); timers.add(orderTimer);
	}
	if (orderForm) {
		on(orderForm, 'submit', event => {
			let res; try { res = fillOrderFields(); } catch (e) { res = { ok: false, errors: ['L’aperçu n’a pas pu être préparé. Réessayez.'] }; }
			if (!res.ok) {
				track('validation_error', { reason: res.needsText ? 'text_missing' : 'invalid_configuration' });
				event.preventDefault(); event.stopImmediatePropagation();
				const status = q('order-status');
				if (status) { status.textContent = res.errors.join(' · '); status.dataset.error = 'true'; status.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
				if (res.needsText) { toast(res.errors[0], 'error'); q('cap-text').focus({ preventScroll: true }); q('cap-text').scrollIntoView({ block: 'center', behavior: 'smooth' }); }
				return;
			}
			// Built-in form: add to the cart without leaving the page (the classic
			// form post stays as the fallback when JavaScript or fetch is unavailable).
			if (opts.order.mode === 'form' && opts.order.ajaxUrl && window.fetch && window.FormData) {
				event.preventDefault(); addToCartAjax(event.submitter);
			}
		}, { capture: true });
	}
	/* ---------- announced features (0.10): the button is there, the feature is not yet ---------- */
	// A click shows « bientôt disponible » next to the button and counts the interest (GA4).
	const SOON = {
		save: 'vous pourrez enregistrer votre création pour la retrouver plus tard.',
		share: 'vous pourrez partager votre création avec un simple lien.',
		logo: 'vous pourrez ajouter le logo de votre club ou de votre marque.',
	};
	qa('[data-ag-soon]').forEach(button => on(button, 'click', () => {
		const feature = button.dataset.agSoon, note = q(`soon-${button.dataset.agSoonNote}`);
		if (!SOON[feature] || !note) return;
		const lead = document.createElement('strong'); lead.textContent = 'Bientôt disponible :';
		note.replaceChildren(lead, document.createTextNode(` ${SOON[feature]}`));
		track('feature_interest', { feature });
	}));
	function toast(text, kind = 'ok', link = null) {
		const t = q('toast'); if (!t) return;
		t.replaceChildren(document.createTextNode(text));
		if (link) { const a = document.createElement('a'); a.href = link.href; a.textContent = link.label; t.append(' ', a); }
		t.dataset.kind = kind; t.hidden = false;
		clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, kind === 'ok' ? 6000 : 9000); timers.add(toast.timer);
	}
	/** add-to-cart events: always the custom one, the GA4 e-commerce one only when enabled in the settings. */
	function trackCart() {
		try {
			const filled = state.texts.filter(t => t.text.trim()), cap = capOf(state.colors.base);
			const qtyEl = orderForm.querySelector('input.qty, input[name="quantity"]');
			const quantity = Math.max(1, parseInt(qtyEl && qtyEl.value, 10) || 1);
			const unit = unitFor(opts.order.price && Number.isFinite(opts.order.price.unit) ? opts.order.price.unit : 0, quantity);
			const currency = (opts.track && opts.track.currency) || 'EUR', value = Math.round(unit * quantity * 100) / 100, color = cap ? cap.id : 'custom';
			track('config_add_to_cart', { currency, value, quantity, color, text_count: filled.length, char_count: filled.reduce((n, t) => n + graphemes(t.text).length, 0), has_top_text: filled.some(t => t.placement === 'top'), has_underside_text: filled.some(t => t.placement === 'bottom') });
			if (opts.track && opts.track.standardCart) track('add_to_cart', { currency, value, items: [{ item_id: String(opts.track.productId || ''), item_name: opts.track.itemName || 'Gapette personnalisée', item_variant: color, price: unit, quantity }] });
		} catch (e) { /* tracking must never block a purchase */ }
	}
	async function addToCartAjax(submitter) {
		const button = orderForm.querySelector('.ag-order-button'), label = button.textContent, status = q('order-status');
		if (button.getAttribute('aria-busy') === 'true') return; // double click
		button.setAttribute('aria-busy', 'true'); button.disabled = true; button.textContent = 'Ajout en cours…';
		const data = new FormData(orderForm);
		data.set('action', 'ag_add_to_cart');
		// not "add-to-cart": WooCommerce's own form handler would add the item a second time
		data.delete('add-to-cart'); data.set('ag_product', (submitter && submitter.value) || button.value);
		try {
			const res = await fetch(opts.order.ajaxUrl, { method: 'POST', body: data, credentials: 'same-origin' });
			const json = await res.json();
			if (!json.success) throw new Error((json.data && json.data.messages || []).join(' · ') || 'L’ajout au panier a échoué.');
			trackCart();
			toast(`✓ Ajouté au panier${json.data.count ? ` (${json.data.count} article${json.data.count > 1 ? 's' : ''})` : ''}.`, 'ok', opts.order.cartUrl ? { href: opts.order.cartUrl, label: 'Voir le panier' } : null);
			if (status) { status.textContent = ''; status.dataset.error = 'false'; }
			// let the theme refresh its mini-cart (classic + blocks)
			// (no button argument: WooCommerce would append its own "Voir le panier" link next to it)
			if (window.jQuery) window.jQuery(document.body).trigger('added_to_cart', [json.data.fragments || {}, json.data.cart_hash || '']);
			document.body.dispatchEvent(new CustomEvent('wc-blocks_added_to_cart', { bubbles: true }));
		} catch (e) {
			track('add_to_cart_failed');
			toast(`L’ajout n’a pas abouti. ${e.message && !/JSON|fetch/i.test(e.message) ? e.message : 'Vérifiez votre connexion et réessayez.'}`, 'error');
			if (status) { status.textContent = e.message || ''; status.dataset.error = 'true'; }
		} finally {
			button.removeAttribute('aria-busy'); button.disabled = false; button.textContent = label;
		}
	}

	update();
	const initialSnapshot = history.current;

	const instance = {
		getConfiguration, setConfiguration,
		getState: () => JSON.parse(JSON.stringify(state)),
		getFlatView: () => flat, // tests / debugging
		preview,
		destroy() {
			abort.abort(); timers.forEach(clearTimeout); preview.destroy(); restoreMoves.reverse().forEach(fn => fn());
			qa('.pattern-button, .palette-button, .font-button, .ag-cap-color').forEach(b => b.remove());
			delete root.__atelierGapette; root.removeAttribute('data-ag-mounted');
		},
	};
	root.__atelierGapette = instance; root.setAttribute('data-ag-mounted', '1');
	return instance;
}
