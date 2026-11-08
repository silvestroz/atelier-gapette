// CSS-only build (no esbuild needed): node build-css.mjs ../assets/src/atelier-gapette.css ../assets/dist/atelier-gapette.css
import postcss from 'postcss';
import prefixer from 'postcss-prefix-selector';
import { readFileSync, writeFileSync } from 'node:fs';
const [,, inp, outp] = process.argv;
const css = readFileSync(inp, 'utf8');
const toContainer = () => ({ postcssPlugin: 'ag-container-queries', AtRule: { media(at) { if (/width/.test(at.params)) { at.name = 'container'; at.params = 'ag ' + at.params.replace(/\s*and\s*/g, ' and '); } } } });
toContainer.postcss = true;
const out = await postcss([toContainer(), prefixer({ prefix: '.atelier-gapette', transform(prefix, selector, prefixed) { if (selector === ':root') return prefix; if (selector === '*') return `${prefix}, ${prefix} *`; if (selector.startsWith(prefix)) return selector; return prefixed; } })]).process(css, { from: undefined });
writeFileSync(outp, '/* Atelier Gapette — scoped under .atelier-gapette (tools/build.mjs). */\n' + out.css);
