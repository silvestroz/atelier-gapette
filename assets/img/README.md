# Preview photographs (not included)

The photographs used on la-gapette.fr come from a licensed mockup and are not redistributed in this repository. The configurator needs your own "zone" photograph.

## `cap-materials.png` (required)

- Lossless PNG, **1774 × 887 px**: two 887 px squares side by side.
  - left: the cap in three-quarter view, **visor down** (text on the top);
  - right: the same cap, **visor up** (text on the underside).
- White or neutral grey background (low-saturation pixels are left untouched).
- Each material is painted in a distinct, saturated hue family; the shading (folds, seams) is kept and used to light both the colours and the ink:

| Zone | Hue | Example |
|---|---|---|
| Side panels (fabric) | magenta | `#ff00e0` |
| Centre panel (pattern) | green | `#30ff20` |
| Visor | cyan | `#00e8f8` |
| Visor piping | yellow | `#ffee00` |

- Text projection onto the visor is calibrated for the original photograph (`FACE` constants in `assets/src/product-preview.js` and `includes/class-ag-schema.php`). With another photograph, recalibrate them with `_dev/fit2.html?W=…&D=…&S=…` (visor width, depth and tip setback in mm; open it through a local web server).
- Exclude this PNG from JPEG/WebP conversions by your CDN or image plugin.

To serve the photograph from another location without editing the plugin:

```php
add_filter( 'atelier_gapette_materials_url', fn() => 'https://example.com/wp-content/uploads/my-zone-photo.png' );
```

## `products/*.jpg` (optional)

Visuals imported by "Create the product as a draft" (WooCommerce → Atelier Gapette): `gapette-noir.jpg`, `gapette-blanc.jpg`, `gapette-bleu-royal.jpg`, `gapette-rouge.jpg`, `gapette-personnalisee.jpg`, `gapette-personnalisee-dessous.jpg` (1200 × 1200 px). If they are missing, the product is created without images.
