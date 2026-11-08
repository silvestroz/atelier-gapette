// Developer build (not needed on the web host): bundles assets/src → assets/dist.
//   cd tools && npm install && node build.mjs
import { build } from 'esbuild';
import postcss from 'postcss';
import prefixer from 'postcss-prefix-selector';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = p => path.join(root, 'assets/src', p);
const dist = p => path.join(root, 'assets/dist', p);

await build({
	entryPoints: [src('index.js')], bundle: true, format: 'iife', target: ['es2020'],
	outfile: dist('atelier-gapette.js'), minify: false, legalComments: 'inline',
	banner: { js: '/* Atelier Gapette — built from assets/src (tools/build.mjs). */' },
});

const css = readFileSync(src('atelier-gapette.css'), 'utf8');
// Layout follows the width of the configurator itself (theme content areas are
// often narrower than the viewport): width media queries → container queries.
const toContainer = () => ({
	postcssPlugin: 'ag-container-queries',
	AtRule: { media(at) { if (/width/.test(at.params)) { at.name = 'container'; at.params = 'ag ' + at.params.replace(/\s*and\s*/g, ' and '); } } },
});
toContainer.postcss = true;
const out = await postcss([toContainer(), prefixer({
	prefix: '.atelier-gapette',
	transform(prefix, selector, prefixed) {
		if (selector === ':root') return prefix;
		if (selector === '*') return `${prefix}, ${prefix} *`;
		if (selector.startsWith(prefix)) return selector;
		return prefixed;
	},
})]).process(css, { from: undefined });
writeFileSync(dist('atelier-gapette.css'), '/* Atelier Gapette — scoped under .atelier-gapette (tools/build.mjs). */\n' + out.css);
console.log('built', dist('atelier-gapette.js'), dist('atelier-gapette.css'));
