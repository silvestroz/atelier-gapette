// Human names for colours (shown instead of hex codes) and the text colour swatches.
const NAMED = [
	['Blanc', '#ffffff'], ['Crème', '#f6f1e1'], ['Beige', '#d9c7a3'], ['Gris clair', '#c8cccb'], ['Gris', '#8a9092'],
	['Anthracite', '#3a3d3f'], ['Noir', '#141414'], ['Citron', '#d7ed71'], ['Jaune', '#f2c230'], ['Or', '#c8a13a'],
	['Orange', '#eb8a2e'], ['Corail', '#f68f65'], ['Rouge', '#c0392b'], ['Bordeaux', '#692a3d'], ['Rose', '#ffc3cc'],
	['Fuchsia', '#d6428f'], ['Lilas', '#c7a3e6'], ['Violet', '#3e227e'], ['Marine', '#17264d'], ['Bleu', '#294cba'],
	['Bleu ciel', '#8ec5f0'], ['Turquoise', '#1a9aa0'], ['Pétrole', '#17343d'], ['Vert forêt', '#164f43'], ['Vert', '#3c9a4a'],
	['Vert d’eau', '#a8dcc4'], ['Kaki', '#6f6d3a'], ['Marron', '#6b4128'],
];
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

/** Nearest human-friendly name (weighted RGB distance). */
export function colorName(hex) {
	if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return '';
	const [r, g, b] = rgb(hex.toLowerCase());
	let best = '', d = Infinity;
	for (const [name, h] of NAMED) {
		const [R, G, B] = rgb(h), rm = (r + R) / 2;
		const dist = (2 + rm / 256) * (r - R) ** 2 + 4 * (g - G) ** 2 + (2 + (255 - rm) / 256) * (b - B) ** 2;
		if (dist < d) { d = dist; best = name; }
	}
	return best;
}

/** Text colours that print well; the current palette colours are added in front. */
export const TEXT_SWATCHES = ['#ffffff', '#141414', '#f6f1e1', '#d7ed71', '#f2c230', '#eb8a2e', '#c0392b', '#ffc3cc', '#294cba', '#164f43'];
