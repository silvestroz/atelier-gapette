// Customization data contract — schema v3 (see docs/schema-v3.json).
// v3 (0.9) = v2 with `texts` (1 to 3 texts) instead of `text`; renderer decal-4
// (texts may slightly overhang the visor edge; the ink is cut at the edge).
// Mirrors includes/class-ag-schema.php: any change here must be made there too.
// v2 = v1 + text.curve + text.rotation + 8 more fonts + size 30–250 %.
// Renderer decal-3 (0.6): no hidden length cap, the stored size is the printed size.
// v1 documents and decal-1/decal-2 documents are accepted and upgraded.
// Renderer decal-5 (0.11): texts laid out on the flat visor — positions in mm
// (origin at mid-depth on the centre line), size 100 % = 12 mm em. decal-1…4
// documents are converted (same place, same printed size).
// Renderer decal-6 (0.11.1): the underside's flat frame is mirrored (outer edge
// up, read with the visor raised); decal-5 underside texts are mirrored (y, rotation).
import { patterns } from './patterns.js';
import { legacyToMm } from './product-preview.js';

export const SCHEMA_VERSION = 3;
export const RENDERER_VERSION = 'decal-6';
export const MAX_TEXTS = 3;
export const MODEL_ID = 'gapette-standard-v1';
export const ASSET_VERSION = 'materials-v1';
export const MAX_GRAPHEMES = 24;
export const BOUNDS = { size: [30, 250], x: [-100, 100], y: [-50, 50], curve: [-100, 100], rotation: [-90, 90] }; // x, y in mm (decal-5)

// Local, licensed fonts (assets/fonts; SIL OFL 1.1, Permanent Marker: Apache 2.0).
// Keys are stable ids stored in orders — never rename, add a new id instead.
const f = (label, family, weight, style, fallback, extra = {}) => ({
	label, family, weight, style,
	canvas: `${style === 'italic' ? 'italic ' : ''}${weight} SIZEpx "${family}", ${fallback}`,
	...extra,
});
export const FONTS = {
	'sport-v1':     f('Sport', 'AG Archivo Black', '400', 'normal', 'Arial, sans-serif'),
	'athletic-v1':  f('Athlétique', 'AG Oswald', '600', 'normal', '"Arial Narrow", sans-serif'),
	'condensed-v1': f('Condensée', 'AG Bebas Neue', '400', 'normal', 'Impact, sans-serif', { capsOnly: true }),
	'racing-v1':    f('Course', 'AG Racing Sans One', '400', 'normal', 'Arial, sans-serif'),
	'slab-v1':      f('Slab rétro', 'AG Alfa Slab One', '400', 'normal', 'Georgia, serif'),
	'varsity-v1':   f('Varsity', 'AG Graduate', '400', 'normal', 'Georgia, serif'),
	'retro-v1':     f('Rétro sérif', 'AG Libre Baskerville', '700', 'normal', 'Georgia, serif'),
	'script-v1':    f('Italique', 'AG Libre Baskerville', '700', 'italic', 'Georgia, serif'),
	'elegant-v1':   f('Élégante', 'AG Playfair Display', '700', 'italic', 'Georgia, serif'),
	'brush-v1':     f('Pinceau', 'AG Pacifico', '400', 'normal', 'cursive'),
	'marker-v1':    f('Feutre', 'AG Permanent Marker', '400', 'normal', 'cursive'),
	'mono-v1':      f('Machine', 'AG Courier Prime', '700', 'normal', '"Courier New", monospace'),
};
export const DEFAULT_FONT = 'sport-v1';
// v0.3 UI values → font ids (for old saved states).
export const LEGACY_FONTS = { sport: 'sport-v1', retro: 'retro-v1', script: 'script-v1', mono: 'mono-v1' };

// Text shape presets shown as buttons (sliders stay available for fine tuning).
export const SHAPES = {
	arc:      { label: 'Arrondi', curve: 100, rotation: 0 },
	straight: { label: 'Droit', curve: 0, rotation: 0 },
	axis:     { label: 'Dans l’axe', curve: 0, rotation: -90 },
};

// Characters every bundled font covers (checked with tools/check-glyphs.py).
export const ALLOWED_CHARS = /^[A-Za-z0-9À-ÖØ-öø-ÿŒœ .,'’!?&:;()/+#@*"«»…€-]*$/u;

const HEX = /^#[0-9a-f]{6}$/;
const PATTERN_IDS = patterns.map(p => p.id);

export function graphemes(text) {
	if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
		return Array.from(new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(text), s => s.segment);
	}
	return Array.from(text);
}

/** Characters of `text` the fonts can't render (deduplicated). */
export function unsupportedChars(text) {
	return [...new Set(graphemes(text).filter(g => !ALLOWED_CHARS.test(g)))];
}

/** One text of the configurator state → document entry. */
function textEntry(t) {
	const off = (t.textOffsets && t.textOffsets[t.placement]) || { x: 0, y: 0 };
	return {
		value: t.text, side: t.placement, font_id: FONTS[t.font] ? t.font : DEFAULT_FONT,
		// the size actually rendered (after fitting the visor), so the order matches the preview
		size_percent: Math.round(t.effectiveSize ?? t.size),
		color: t.color.toLowerCase(), outline: !!t.outline,
		curve: Math.round(t.curve ?? 100), rotation: Math.round(t.rotation ?? 0),
		position: { x: Math.round(off.x), y: Math.round(off.y) },
	};
}

/** Build the canonical v3 document from the configurator state (state.texts is up to date). */
export function toConfiguration(state) {
	const list = (state.texts && state.texts.length ? state.texts : [state]);
	let texts = list.filter(t => String(t.text).trim()).map(textEntry);
	if (!texts.length) texts = [textEntry(list[0])];
	return {
		schema_version: SCHEMA_VERSION,
		renderer_version: RENDERER_VERSION,
		model_id: MODEL_ID,
		asset_version: ASSET_VERSION,
		pattern_id: state.pattern,
		colors: {
			base: state.colors.base.toLowerCase(), accent: state.colors.accent.toLowerCase(),
			light: state.colors.light.toLowerCase(), brim: state.colors.brim.toLowerCase(), trim: state.colors.trim.toLowerCase(),
		},
		texts,
		image: null,
	};
}

/** v1 / v2 → v3 (same geometry). Returns a new object. */
export function upgrade(doc) {
	if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return doc;
	let d = { ...doc };
	const legacy = ['decal-1', 'decal-2', 'decal-3', 'decal-4'].includes(d.renderer_version);
	const mirrorUnder = d.renderer_version === 'decal-5';
	if (legacy || mirrorUnder) d.renderer_version = RENDERER_VERSION;
	if (d.schema_version === 1) {
		if (d.text && typeof d.text === 'object') {
			const t = d.text, text = { ...t, curve: 100, rotation: 0 };
			if (t.position !== undefined) { delete text.position; text.position = t.position; }
			d.text = text;
		}
		d.schema_version = 2;
	}
	if (d.schema_version === 2) {
		if (d.text && typeof d.text === 'object' && d.texts === undefined) {
			const { text, image, ...rest } = d;
			d = { ...rest, texts: [text], ...(image !== undefined ? { image } : {}) };
		}
		d.schema_version = 3;
	}
	// decal-4 → decal-5: positions and sizes onto the flat visor (mm)
	if (legacy && Array.isArray(d.texts)) d.texts = d.texts.map(t => {
		if (!t || typeof t !== 'object' || !t.position || !['top', 'bottom'].includes(t.side) || ![t.position.x, t.position.y, t.size_percent, t.rotation].every(Number.isFinite)) return t;
		const m = legacyToMm(t.side, t), cl = (v, [a, b]) => Math.max(a, Math.min(b, v));
		return { ...t, size_percent: cl(m.size_percent, BOUNDS.size), rotation: cl(m.rotation, BOUNDS.rotation), position: { x: cl(m.position.x, BOUNDS.x), y: cl(m.position.y, BOUNDS.y) } };
	});
	// decal-5 → decal-6: the underside frame is now mirrored (outer edge up)
	if (mirrorUnder && Array.isArray(d.texts)) d.texts = d.texts.map(t => (t && typeof t === 'object' && t.side === 'bottom' && t.position && Number.isFinite(t.position.y) && Number.isFinite(t.rotation))
		? { ...t, rotation: 0 - t.rotation, position: { ...t.position, y: 0 - t.position.y } } : t);
	return d;
}

/**
 * Validate a v3 (or v1 / v2, upgraded) document — same rules as the server.
 * Returns { ok, errors, value } with `value` in canonical key order.
 */
export function validateConfiguration(input) {
	const errors = [];
	const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
	if (!isObj(input)) return { ok: false, errors: ['Configuration illisible'] };
	const doc = upgrade(input);
	const keys = (o, allowed, where) => Object.keys(o).forEach(k => { if (!allowed.includes(k)) errors.push(`Clé inconnue : ${where}${k}`); });
	const int = (v, [a, b], name) => { if (!Number.isInteger(v) || v < a || v > b) errors.push(`${name} hors bornes (${a} à ${b})`); };
	keys(doc, ['schema_version', 'renderer_version', 'model_id', 'asset_version', 'pattern_id', 'colors', 'texts', 'image'], '');
	if (doc.schema_version !== SCHEMA_VERSION) errors.push('Version de schéma non prise en charge');
	if (doc.renderer_version !== RENDERER_VERSION || doc.model_id !== MODEL_ID || doc.asset_version !== ASSET_VERSION) errors.push('Version de modèle ou de moteur inconnue');
	if (doc.pattern_id === 'custom') errors.push('Motif « Mon image » : l’import de photo n’est pas encore disponible à la commande');
	else if (!PATTERN_IDS.includes(doc.pattern_id)) errors.push('Motif inconnu');
	if (!isObj(doc.colors)) errors.push('Couleurs manquantes');
	else {
		keys(doc.colors, ['base', 'accent', 'light', 'brim', 'trim'], 'colors.');
		for (const k of ['base', 'accent', 'light', 'brim', 'trim']) if (!HEX.test(doc.colors[k] || '')) errors.push(`Couleur ${k} invalide`);
	}
	const texts = doc.texts;
	if (!Array.isArray(texts) || !texts.length) errors.push('Texte manquant');
	else if (texts.length > MAX_TEXTS) errors.push(`${MAX_TEXTS} textes maximum`);
	else texts.forEach((t, i) => {
		const w = `texts[${i}].`;
		if (!isObj(t)) { errors.push('Texte invalide'); return; }
		keys(t, ['value', 'side', 'font_id', 'size_percent', 'color', 'outline', 'curve', 'rotation', 'position'], w);
		if (typeof t.value !== 'string') errors.push('Texte invalide');
		else {
			if (graphemes(t.value).length > MAX_GRAPHEMES) errors.push(`Texte limité à ${MAX_GRAPHEMES} caractères`);
			const bad = unsupportedChars(t.value);
			if (bad.length) errors.push(`Caractère(s) non pris en charge : ${bad.join(' ')}`);
			if (texts.length > 1 && !t.value.trim()) errors.push('Texte vide');
		}
		if (!['top', 'bottom'].includes(t.side)) errors.push('Face du texte invalide');
		if (!FONTS[t.font_id]) errors.push('Police inconnue');
		int(t.size_percent, BOUNDS.size, 'Taille');
		if (!HEX.test(t.color || '')) errors.push('Couleur du texte invalide');
		if (typeof t.outline !== 'boolean') errors.push('Contour invalide');
		int(t.curve, BOUNDS.curve, 'Courbure');
		int(t.rotation, BOUNDS.rotation, 'Inclinaison');
		if (!isObj(t.position)) errors.push('Position manquante');
		else { keys(t.position, ['x', 'y'], `${w}position.`); int(t.position.x, BOUNDS.x, 'Position x'); int(t.position.y, BOUNDS.y, 'Position y'); }
	});
	if (doc.image !== null) errors.push('Image importée : non prise en charge dans cette version');
	if (errors.length) return { ok: false, errors: [...new Set(errors)], value: null };
	const value = {
		schema_version: doc.schema_version, renderer_version: doc.renderer_version, model_id: doc.model_id, asset_version: doc.asset_version,
		pattern_id: doc.pattern_id,
		colors: { base: doc.colors.base, accent: doc.colors.accent, light: doc.colors.light, brim: doc.colors.brim, trim: doc.colors.trim },
		texts: texts.map(t => ({ value: t.value, side: t.side, font_id: t.font_id, size_percent: t.size_percent, color: t.color, outline: t.outline, curve: t.curve, rotation: t.rotation, position: { x: t.position.x, y: t.position.y } })),
		image: null,
	};
	return { ok: true, errors, value };
}

/** Document entry → one text of the configurator state. */
export function textFromEntry(t) {
	return {
		text: t.value, placement: t.side, font: t.font_id, size: t.size_percent, color: t.color, outline: t.outline,
		curve: t.curve, rotation: t.rotation, effectiveSize: null,
		textOffsets: { top: { x: 0, y: 0 }, bottom: { x: 0, y: 0 }, [t.side]: { ...t.position } },
	};
}

/** Apply a validated document to a configurator state object (in place). */
export function applyConfiguration(state, doc) {
	state.pattern = doc.pattern_id;
	state.colors = { ...doc.colors };
	state.palette = null;
	state.texts = doc.texts.map(textFromEntry);
	state.active = 0;
	Object.assign(state, JSON.parse(JSON.stringify(state.texts[0])));
	return state;
}

/** Which preset (if any) the current curve/rotation match. */
export function shapeOf(state) {
	return Object.keys(SHAPES).find(k => SHAPES[k].curve === state.curve && SHAPES[k].rotation === state.rotation) || null;
}
