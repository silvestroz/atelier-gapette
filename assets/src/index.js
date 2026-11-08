// Entry point (bundled to assets/dist/atelier-gapette.js).
// Mounts every `.atelier-gapette[data-ag-root]` on the page, including roots
// injected later by page builders, and exposes window.AtelierGapette.
import { mount } from './configurator.js';
import { toConfiguration, validateConfiguration } from './schema.js';

function readOptions(root) {
	try { return JSON.parse(root.getAttribute('data-ag-options') || '{}'); } catch { return {}; }
}
function mountAll(scope = document) {
	scope.querySelectorAll('.atelier-gapette[data-ag-root]:not([data-ag-mounted])').forEach(root => {
		try { mount(root, readOptions(root)); }
		catch (e) {
			const err = root.querySelector('[data-ag="render-error"]');
			if (err) err.hidden = false;
			console.error('[Atelier Gapette]', e);
		}
	});
}
function unmountRemoved(nodes) {
	nodes.forEach(n => {
		if (n.nodeType !== 1) return;
		const roots = n.matches?.('[data-ag-mounted]') ? [n] : Array.from(n.querySelectorAll?.('[data-ag-mounted]') || []);
		roots.forEach(r => r.__atelierGapette?.destroy());
	});
}

function start() {
	mountAll();
	// Page builders / popups may inject or remove the shortcode output later.
	const mo = new MutationObserver(records => {
		let added = false;
		for (const r of records) { if (r.addedNodes.length) added = true; if (r.removedNodes.length) unmountRemoved(r.removedNodes); }
		if (added) mountAll();
	});
	mo.observe(document.body, { childList: true, subtree: true });
}

window.AtelierGapette = { mount: (root, options) => mount(root, { ...readOptions(root), ...options }), mountAll, toConfiguration, validateConfiguration };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
