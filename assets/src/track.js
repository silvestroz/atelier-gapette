// Atelier Gapette — GA4 event tracking (0.9.4).
// Events go through the page's own gtag() (Google Site Kit / GA4). When gtag() is not
// defined (GA disabled, or the consent banner has not released it) nothing is sent, so
// the visitor's consent choice stays in charge.
export function createTracker(cfg = {}) {
	const enabled = !!cfg.enabled;
	const counts = Object.create(null), seen = new Set();
	const base = {};
	if (cfg.productId) base.product_id = String(cfg.productId);
	/** Send one event (capped per event name, so a slider cannot flood GA). */
	const send = (name, params = {}) => {
		if (!enabled || typeof window.gtag !== 'function') return false;
		if ((counts[name] = (counts[name] || 0) + 1) > (cfg.maxPerEvent || 25)) return false;
		try { window.gtag('event', name, { ...base, ...params }); return true; } catch (e) { return false; }
	};
	/** Send at most once per key. */
	const once = (key, name, params) => {
		if (seen.has(key)) return false;
		const ok = send(name, params);
		if (ok) seen.add(key);
		return ok;
	};
	return { send, once, has: key => seen.has(key), enabled };
}
