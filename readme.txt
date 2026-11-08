=== Atelier Gapette ===
Contributors: lagapette
Tags: woocommerce, product configurator, personalization, cycling cap
Requires at least: 6.2
Tested up to: 6.8
Requires PHP: 7.4
WC requires at least: 8.0
WC tested up to: 11.1
Stable tag: 0.12.0
License: GPLv2 or later

Cycling cap ("gapette") configurator: texts placed at scale on a flat view of the visor, realistic preview rendered on a photograph, optional WooCommerce cart / order integration.

== Description ==

* Canvas 2D rendering on a "zone" photograph (assets/img/cap-materials.png, lossless PNG — exclude it from JPEG/WebP conversions by your CDN or image plugins). The photograph is not shipped in the public repository: see assets/img/README.md.
* Flat view of the visor at scale (millimetres, 1 cm grid) where customers place their texts, next to a realistic three-quarter preview (visor down / visor up).
* Plain cap model (catalogue colours + text) or full model (12 patterns, 8 palettes with stable ids, 5 free surface colours: fabric, pattern, details, visor, piping).
* Up to 3 texts, on the top or underside of the visor, 12 locally served fonts (SIL OFL 1.1; Permanent Marker: Apache 2.0), colour, outline, size 30–250 %, moved with mouse / touch / keyboard / sliders, 24 graphemes max.
* Text shape: follows the curve, straight, or along the visor axis; adjustable curvature (arc → straight → reversed arc) and rotation from −90° to +90°.
* Print rendering: the ink is lit like the fabric (it picks up the folds, seams and shadows of the photograph).
* Image import as a pattern (preview only: it stays in the browser).
* Export / import of the configuration as JSON v3 (docs/schema-v3.json; v1 and v2 JSON are still accepted).

Without WooCommerce: shortcode `[atelier_gapette]`.

With WooCommerce:

* `[atelier_gapette product_id="123"]`: configurator + quantity + add-to-cart button (published simple product with the "Atelier Gapette" box ticked).
* Product page with the box ticked: configurator wired to the product form (variations included). Manual placement possible (setting + Shortcode block in the Single Product template).
* Strict server-side JSON validation (unknown keys, bounds, colours, fonts, patterns, character set); no price data is ever accepted from the browser.
* Two different personalisations = two cart lines; two identical ones = one line, quantity 2.
* Order line: frozen canonical JSON, sha256 fingerprint, versions (schema, engine, model, assets, fonts, plugin), readable summary, private preview image.
* Admin: preview and JSON download through an authenticated route (order management capability).
* Workshop email when an order is paid (processing / completed): summary, fingerprint, JSON and preview attached.
* HPOS compatible. Block-based Cart and Checkout: line data is displayed (tested with WooCommerce 11.1 / Twenty Twenty-Five).

Note: the user interface is in French.

== Installation ==

1. Provide your own zone photograph in assets/img/cap-materials.png (see assets/img/README.md).
2. Plugins → Add New → Upload the ZIP, then activate. No build step on the server.
3. WooCommerce → Atelier Gapette: model, cap colours and text colours offered, outline, quantity discount, reassurance lines, dedicated product page, sticky header offset, workshop email, GA4 tracking.
4. Product → Product data → General → tick "Atelier Gapette", or use "Create the product as a draft" in the settings.

Private storage: previews are stored in `wp-content/uploads/atelier-gapette-private/`, protected by .htaccess (Apache) and web.config (IIS). On Nginx, add:

    location ^~ /wp-content/uploads/atelier-gapette-private/ { deny all; }

or better, define a folder outside the web root in wp-config.php:

    define( 'AG_PRIVATE_DIR', '/path/outside/webroot/atelier-gapette' );

Previews not attached to an order are deleted after 48 h (daily scheduled task). Deactivation deletes no settings, files or order data.

== Hooks ==

* `atelier_gapette_cap_colors`: cap colour catalogue (id → label, hex, matching attribute terms).
* `atelier_gapette_quantity_discount`: quantity discount rule (`min`, `pct`).
* `atelier_gapette_materials_url`: URL of the zone photograph.

== Development ==

Readable sources: assets/src (engine, patterns, images, UI, schema). Distribution: assets/dist (IIFE bundle + CSS prefixed with `.atelier-gapette`, container queries). Rebuild: `cd tools && npm install && node build.mjs` (stylesheet only: `node build-css.mjs`).

JS API: `window.AtelierGapette.mount(root, options)` → `{ destroy(), getConfiguration(), setConfiguration(json) }`. Roots inserted later (page builders) are mounted automatically; roots removed from the DOM are unmounted.

All colours, fonts and radii are CSS variables on `.atelier-gapette` (`--ink`, `--ag-accent`, `--ag-accent-2`, `--ag-soft`, `--ag-fill`, `--line`, `--ag-muted`, `--ag-font`, `--ag-font-head`, `--ag-radius`), overridable from the theme's additional CSS.

== Changelog ==

= 0.12.0 =
* Settings to match what can actually be produced: "Cap colours offered" (all ticked by default; disabled colours remain recognised for existing carts and orders, but are no longer offered and the server refuses them), "Allowed text colours" (one per line, "Name #rrggbb"; empty = free choice, the default) and "Allow text outline" (on by default; the outline needs a second colour).
* New filter `atelier_gapette_materials_url`.

= 0.11.1 =
* Visor underside: the flat view shows the visor the right way up when it is raised (outer edge at the top, seam at the bottom) and the text follows the edge in the right direction, on the flat view as on the "visor up" photograph.
* Engine decal-6: mirrored reference frame for the underside; underside projection recalibrated on the photograph. Underside texts saved with 0.11.0 (decal-5) are flipped on load; decal-1 to decal-4 are converted as in 0.11.0.

= 0.11.0 =
* Flat view: below the three-quarter photograph, the visor at scale (155 × 55 mm, 1 cm grid). Customers place their texts on it: drag to move, handles to resize and rotate, arrow keys to adjust by 1 mm (Shift: 5 mm), + / − for size; the actual text size is shown in millimetres; anything outside the visor is greyed out. On an empty visor, a click invites the customer to type. The photograph becomes a live, read-only realistic preview. "Flat view" setting (on by default) to go back to editing on the photograph.
* Engine decal-5: text positions in millimetres on the flat visor (origin at mid-depth on the centre line), size 100 % = 12 mm. decal-1 to decal-4 configurations (open carts, configuration codes) are converted on load, same place and same apparent size; existing orders keep their original JSON.

= 0.10.0 =
* Quantity discount: −10 % from 10 personalised caps (setting "Quantity discount"; 0 = none). The threshold counts every personalised cap in the cart, across lines. Computed server-side; regular price struck through and a "Quantity discount" line in the cart and on the order; the button total includes the discount.
* Reassurance list under the add-to-cart button (one line per commitment, 4 max).
* Announced features: "Save", "Share" and "Add a logo" buttons show "Coming soon" and send a GA4 `feature_interest` event (`feature`: save, share or logo) to measure interest. Nothing is stored or sent.

= 0.9.4 – 0.9.10 =
* GA4 tracking through the page's gtag() (Site Kit), only when gtag exists (i.e. after consent): config_started, color_selected, font_changed, text_added, text_removed, position_changed, visor_view_changed, preview_zoomed, undo_used, redo_used, config_reset, advanced_settings_opened, overflow_warning, validation_error, config_add_to_cart, add_to_cart_failed, cta_click. Optional standard add_to_cart. No typed text is ever sent, only counts.
* Customer-facing preview image (top and underside of the visor, captioned) in the cart, checkout (classic and blocks), order confirmation, My Account and WooCommerce order emails. Always private, served through a signed link tied to the order key.
* Styling driven by design tokens with fallbacks; custom icons; dedicated product page capped at 1440 px.

= 0.9.0 – 0.9.3 =
* Dedicated product page: WooCommerce gallery and sidebar removed, full-width configurator carrying the purchase block; the product's "Colour" select is driven by the swatches.
* Several texts: up to 3 per cap, each with its own side, font, colour, size, shape and position.
* Slight overflow allowed past the visor edge (clipped in the preview, with a warning).
* JSON schema v3 (`texts[]`), engine decal-4; v1 and v2 converted.
* Add-to-cart button shows the total price; text surcharge removed (text included in the product price).

= 0.8.0 =
* "Plain cap + text" model: the customer picks the cap colour (Black, White, Royal blue, Red) and types a text. Colour choice and the product's "Colour" variation are synced both ways; the server uses the chosen variation.
* "Create the product as a draft" button (variable product, 4 variations, visuals, no price).
* Filter `atelier_gapette_cap_colors`.

= 0.4.0 – 0.7.1 =
* 12 fonts in a preview grid, glyph coverage checked (tools/check-glyphs.py); text shape presets, curvature and rotation; size up to 250 %.
* Direct editing on the preview (drag, rotate and resize handles, floating toolbar, full keyboard support, screen reader announcements); undo / redo.
* Named colour swatches; AJAX add to cart from the shortcode; layout fix for classic themes.

= 0.3.0 =
* First WordPress release of the photographic engine: shortcode, product page, isolated CSS, multiple instances, deferred mounting, destroy(); local OFL fonts, grapheme counting (browser and server); JSON schema v1 export / import; WooCommerce integration (server validation, HPOS orders, private previews, workshop email).
