<?php
/**
 * Customization data contract — schema v2 (server side).
 * Mirrors assets/src/schema.js: keep both in sync.
 * v1 documents (0.3.x) are accepted and upgraded: curve 100, rotation 0.
 * Renderer decal-5 (0.11): positions in mm on the flat visor (origin at
 * mid-depth on the centre line), size 100 % = 12 mm em; decal-1…4 documents
 * are converted on upgrade (same place, same printed size).
 * Renderer decal-6 (0.11.1): the underside's flat frame is mirrored (outer edge
 * up, read with the visor raised); decal-5 underside texts are mirrored.
 * Orders already placed keep the JSON they were stored with.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AG_Schema {

	const SCHEMA_VERSION   = 3;
	const RENDERER_VERSION = 'decal-6';
	const MAX_TEXTS        = 3;
	const MODEL_ID         = 'gapette-standard-v1';
	const ASSET_VERSION    = 'materials-v1';
	const MAX_GRAPHEMES    = 24;
	const MAX_PAYLOAD      = 4096; // bytes of JSON

	/** Characters every bundled font covers (keep identical to schema.js). */
	const ALLOWED_CHARS = '/^[A-Za-z0-9À-ÖØ-öø-ÿŒœ .,\'’!?&:;()\/+#@*"«»…€-]*$/u';

	public static function patterns() {
		return array(
			'peloton' => 'Peloton', 'stripe' => 'Rayures', 'check' => 'Damier', 'dot' => 'Pois',
			'chevron' => 'Échappée', 'plain' => 'Uni', 'breton' => 'Marinière', 'wave' => 'Ondulations',
			'confetti' => 'Confettis', 'tartan' => 'Tartan', 'sprint' => 'Sprint', 'contour' => 'Topographie',
		);
	}

	/** font_id => [ label, family, license file ]. Ids are stable: never rename. */
	public static function fonts() {
		return array(
			'sport-v1'     => array( 'label' => 'Sport',       'family' => 'Archivo Black 400',             'license' => 'LICENSE-archivo-black.txt' ),
			'athletic-v1'  => array( 'label' => 'Athlétique',  'family' => 'Oswald 600',                    'license' => 'LICENSE-oswald.txt' ),
			'condensed-v1' => array( 'label' => 'Condensée',   'family' => 'Bebas Neue 400',                'license' => 'LICENSE-bebas-neue.txt' ),
			'racing-v1'    => array( 'label' => 'Course',      'family' => 'Racing Sans One 400',           'license' => 'LICENSE-racing-sans-one.txt' ),
			'slab-v1'      => array( 'label' => 'Slab rétro',  'family' => 'Alfa Slab One 400',             'license' => 'LICENSE-alfa-slab-one.txt' ),
			'varsity-v1'   => array( 'label' => 'Varsity',     'family' => 'Graduate 400',                  'license' => 'LICENSE-graduate.txt' ),
			'retro-v1'     => array( 'label' => 'Rétro sérif', 'family' => 'Libre Baskerville 700',         'license' => 'LICENSE-libre-baskerville.txt' ),
			'script-v1'    => array( 'label' => 'Italique',    'family' => 'Libre Baskerville 700 italic',  'license' => 'LICENSE-libre-baskerville.txt' ),
			'elegant-v1'   => array( 'label' => 'Élégante',    'family' => 'Playfair Display 700 italic',   'license' => 'LICENSE-playfair-display.txt' ),
			'brush-v1'     => array( 'label' => 'Pinceau',     'family' => 'Pacifico 400',                  'license' => 'LICENSE-pacifico.txt' ),
			'marker-v1'    => array( 'label' => 'Feutre',      'family' => 'Permanent Marker 400',          'license' => 'LICENSE-permanent-marker.txt' ),
			'mono-v1'      => array( 'label' => 'Machine',     'family' => 'Courier Prime 700',             'license' => 'LICENSE-courier-prime.txt' ),
		);
	}

	/** Presets shown in the UI; also used to label the summary. */
	public static function shapes() {
		return array(
			'arc'      => array( 'label' => 'Arrondi', 'curve' => 100, 'rotation' => 0 ),
			'straight' => array( 'label' => 'Droit',          'curve' => 0,   'rotation' => 0 ),
			'axis'     => array( 'label' => 'Dans l’axe',     'curve' => 0,   'rotation' => -90 ),
		);
	}

	/** Text position bounds in mm (decal-5). */
	const POS_X = 100;
	const POS_Y = 50;

	/**
	 * decal-4 → decal-5: one text from the photo's decal plane to the flat visor.
	 * Same constants as product-preview.js (FACE, EM_MM = 12) — keep identical.
	 */
	public static function upgrade_decal4( $t ) {
		$face = array( 'top' => array( 3.73, -0.06, 23, -38 ), 'bottom' => array( 2.39, 0.04, 17, -18 ) );
		if ( ! is_array( $t ) || ! isset( $face[ $t['side'] ?? '' ] ) || ! is_array( $t['position'] ?? null ) ) return $t;
		foreach ( array( $t['position']['x'] ?? null, $t['position']['y'] ?? null, $t['size_percent'] ?? null, $t['rotation'] ?? null ) as $n ) if ( ! is_int( $n ) && ! is_float( $n ) ) return $t;
		list( $k, $a, $ox, $oy ) = $face[ $t['side'] ];
		$c  = cos( $a ); $s = sin( $a );
		$dx = ( $t['position']['x'] - $ox ) / $k; $dy = ( $t['position']['y'] - $oy ) / $k;
		$cl = function ( $v, $min, $max ) { return (int) max( $min, min( $max, $v ) ); };
		// JavaScript's Math.round (halves toward +∞) so both sides give the same numbers
		$r  = function ( $v ) { return (int) floor( $v + 0.5 ); };
		$t['position']     = array( 'x' => $cl( $r( $dx * $c + $dy * $s ), -self::POS_X, self::POS_X ), 'y' => $cl( $r( -$dx * $s + $dy * $c ), -self::POS_Y, self::POS_Y ) );
		$t['size_percent'] = $cl( $r( $t['size_percent'] * 41 / $k / 12 ), 30, 250 );
		$t['rotation']     = $cl( $r( $t['rotation'] - $a * 180 / M_PI ), -90, 90 );
		return $t;
	}

	/** v1 → v2 → v3, decal-1…4 → decal-5. */
	public static function upgrade( $doc ) {
		if ( ! is_array( $doc ) ) return $doc;
		$v = $doc['schema_version'] ?? null;
		$legacy = in_array( $doc['renderer_version'] ?? null, array( 'decal-1', 'decal-2', 'decal-3', 'decal-4' ), true );
		$mirror = 'decal-5' === ( $doc['renderer_version'] ?? null );
		if ( $legacy || $mirror ) $doc['renderer_version'] = self::RENDERER_VERSION;
		if ( 1 === $v ) {
			if ( isset( $doc['text'] ) && is_array( $doc['text'] ) ) {
				$doc['text']['curve']    = 100;
				$doc['text']['rotation'] = 0;
			}
			$v = 2;
		}
		if ( 2 === $v ) {
			// v3 (0.9): one or several texts.
			if ( isset( $doc['text'] ) && is_array( $doc['text'] ) && ! isset( $doc['texts'] ) ) {
				$doc['texts'] = array( $doc['text'] );
				unset( $doc['text'] );
			}
			$v = 3;
		}
		if ( 3 === $v ) $doc['schema_version'] = 3;
		if ( $legacy && isset( $doc['texts'] ) && is_array( $doc['texts'] ) ) $doc['texts'] = array_map( array( __CLASS__, 'upgrade_decal4' ), $doc['texts'] );
		// decal-5 → decal-6: the underside frame is now mirrored (outer edge up)
		if ( $mirror && isset( $doc['texts'] ) && is_array( $doc['texts'] ) ) {
			$doc['texts'] = array_map( function ( $t ) {
				if ( ! is_array( $t ) || 'bottom' !== ( $t['side'] ?? '' ) || ! is_array( $t['position'] ?? null ) ) return $t;
				if ( ! is_int( $t['position']['y'] ?? null ) || ! is_int( $t['rotation'] ?? null ) ) return $t;
				$t['position']['y'] = 0 - $t['position']['y'];
				$t['rotation']      = 0 - $t['rotation'];
				return $t;
			}, $doc['texts'] );
		}
		return $doc;
	}

	/**
	 * Solid model (0.8): the caps actually sold — one plain colour each.
	 * id => label, hex (preview pigment), terms (slugs recognised in the product's colour attribute).
	 */
	public static function all_cap_colors() {
		return apply_filters( 'atelier_gapette_cap_colors', array(
			'noir'       => array( 'label' => 'Noir',       'hex' => '#1d1e20', 'terms' => array( 'noir', 'black', 'negro' ) ),
			'blanc'      => array( 'label' => 'Blanc',      'hex' => '#f7f7f4', 'terms' => array( 'blanc', 'white', 'blanco' ) ),
			'bleu-royal' => array( 'label' => 'Bleu royal', 'hex' => '#1c5bb8', 'terms' => array( 'bleu-royal', 'bleu', 'royal', 'royal-blue', 'blue', 'azul-royal' ) ),
			'rouge'      => array( 'label' => 'Rouge',      'hex' => '#a8182b', 'terms' => array( 'rouge', 'red', 'lotto-red', 'rojo' ) ),
		) );
	}

	/**
	 * 0.12: the caps on sale today (WooCommerce → Atelier Gapette → « Couleurs de gapette proposées »).
	 * Falls back to every catalogue colour when none is ticked, so the tool never ends up empty.
	 */
	public static function cap_colors() {
		$all = self::all_cap_colors();
		$ids = class_exists( 'AG_Settings' ) ? AG_Settings::enabled_cap_ids() : array();
		$on  = $ids ? array_intersect_key( $all, array_flip( $ids ) ) : $all;
		return $on ? $on : $all;
	}

	/** Colour id for an attribute value ("Bleu royal", "bleu-royal", "Royal Blue"…), or null. */
	public static function cap_color_from_term( $value ) {
		$slug = sanitize_title( remove_accents( (string) $value ) );
		if ( '' === $slug ) return null;
		foreach ( self::all_cap_colors() as $id => $c ) {
			if ( $slug === $id || in_array( $slug, $c['terms'], true ) ) return $id;
		}
		return null;
	}

	/** Colour id of a solid document (all five surfaces in one catalogue colour), or null. */
	public static function cap_color_of( array $doc ) {
		$hexes = array_unique( array_values( $doc['colors'] ?? array() ) );
		if ( 1 !== count( $hexes ) || 'plain' !== ( $doc['pattern_id'] ?? '' ) ) return null;
		foreach ( self::all_cap_colors() as $id => $c ) if ( strtolower( $c['hex'] ) === $hexes[0] ) return $id;
		return null;
	}

	/**
	 * Solid model rules on a validated document: plain cap in a catalogue colour
	 * (forced to $color_id when the product variation tells which one) and a text.
	 */
	public static function enforce_solid( array $doc, $color_id = null ) {
		$colors = self::cap_colors();
		if ( ! self::has_text( $doc ) ) return new WP_Error( 'ag_text', __( 'Saisissez le texte à imprimer sur la visière.', 'atelier-gapette' ) );
		// 0.12: a colour switched off in the settings is refused even when the product still lists it.
		if ( $color_id && isset( self::all_cap_colors()[ $color_id ] ) && ! isset( $colors[ $color_id ] ) ) return new WP_Error( 'ag_color_off', __( 'Cette couleur de gapette n’est pas proposée pour le moment. Choisissez une autre couleur.', 'atelier-gapette' ) );
		if ( ! $color_id || ! isset( $colors[ $color_id ] ) ) {
			$doc['pattern_id'] = 'plain';
			$base = $doc['colors']['base'];
			foreach ( $colors as $id => $c ) if ( strtolower( $c['hex'] ) === $base ) $color_id = $id;
			if ( ! $color_id || ! isset( $colors[ $color_id ] ) ) return new WP_Error( 'ag_color', __( 'Couleur de gapette inconnue. Choisissez une couleur puis réessayez.', 'atelier-gapette' ) );
		}
		$hex = strtolower( $colors[ $color_id ]['hex'] );
		$doc['pattern_id'] = 'plain';
		foreach ( array_keys( self::color_labels() ) as $k ) $doc['colors'][ $k ] = $hex;
		// 0.12: only the text colours (and the outline) that can be printed today.
		$texts   = (array) ( $doc['texts'] ?? array() );
		$palette = class_exists( 'AG_Settings' ) ? AG_Settings::text_palette() : array();
		if ( $palette ) {
			$allowed = array_column( $palette, 'hex' );
			foreach ( $texts as $t ) if ( ! in_array( strtolower( (string) ( $t['color'] ?? '' ) ), $allowed, true ) ) return new WP_Error( 'ag_text_color', __( 'Cette couleur de texte n’est pas disponible pour le moment. Choisissez une des couleurs proposées.', 'atelier-gapette' ) );
		}
		if ( class_exists( 'AG_Settings' ) && ! AG_Settings::text_outline_allowed() ) {
			foreach ( $texts as $t ) if ( ! empty( $t['outline'] ) ) return new WP_Error( 'ag_outline', __( 'Le contour du texte n’est pas disponible pour le moment.', 'atelier-gapette' ) );
		}
		return $doc;
	}

	/** At least one non-empty text (any schema version). */
	public static function has_text( array $doc ) {
		$doc = self::upgrade( $doc );
		foreach ( (array) ( $doc['texts'] ?? array() ) as $t ) if ( '' !== trim( (string) ( $t['value'] ?? '' ) ) ) return true;
		return false;
	}

	public static function color_labels() {
		return array( 'base' => 'Tissu', 'accent' => 'Motif', 'light' => 'Détails', 'brim' => 'Visière', 'trim' => 'Liseré' );
	}

	public static function grapheme_count( $s ) {
		return (int) preg_match_all( '/\X/u', $s );
	}

	/**
	 * Validate a raw JSON string. Returns the canonical array, or WP_Error.
	 * Unknown keys, out-of-range numbers, HTML, unsupported glyphs → rejected.
	 */
	public static function validate_json( $raw ) {
		if ( ! is_string( $raw ) || '' === $raw ) return new WP_Error( 'ag_empty', __( 'La personnalisation n’a pas été transmise. Réessayez.', 'atelier-gapette' ) );
		if ( strlen( $raw ) > self::MAX_PAYLOAD ) return new WP_Error( 'ag_size', __( 'Personnalisation trop volumineuse.', 'atelier-gapette' ) );
		$doc = json_decode( $raw, true, 8 );
		if ( ! is_array( $doc ) ) return new WP_Error( 'ag_json', __( 'Personnalisation illisible.', 'atelier-gapette' ) );
		return self::validate( $doc );
	}

	public static function validate( $doc ) {
		$doc = self::upgrade( $doc );
		if ( ! is_array( $doc ) ) return new WP_Error( 'ag_invalid', 'Configuration illisible' );
		$e = array();
		$only = function ( $arr, $keys, $where ) use ( &$e ) {
			foreach ( array_keys( $arr ) as $k ) {
				if ( ! in_array( $k, $keys, true ) ) $e[] = 'Clé inconnue : ' . $where . $k;
			}
		};
		$int = function ( $v, $min, $max, $name ) use ( &$e ) {
			if ( ! is_int( $v ) || $v < $min || $v > $max ) $e[] = $name . ' hors bornes';
		};
		$hex = function ( $v ) { return is_string( $v ) && preg_match( '/^#[0-9a-f]{6}$/', $v ); };

		$only( $doc, array( 'schema_version', 'renderer_version', 'model_id', 'asset_version', 'pattern_id', 'colors', 'texts', 'image' ), '' );
		if ( ( $doc['schema_version'] ?? null ) !== self::SCHEMA_VERSION ) $e[] = 'Version de schéma non prise en charge';
		if ( ( $doc['renderer_version'] ?? null ) !== self::RENDERER_VERSION || ( $doc['model_id'] ?? null ) !== self::MODEL_ID || ( $doc['asset_version'] ?? null ) !== self::ASSET_VERSION ) $e[] = 'Version de modèle ou de moteur inconnue';
		$pattern = $doc['pattern_id'] ?? null;
		if ( 'custom' === $pattern ) $e[] = 'L’import de photo n’est pas encore disponible à la commande';
		elseif ( ! is_string( $pattern ) || ! isset( self::patterns()[ $pattern ] ) ) $e[] = 'Motif inconnu';

		$colors = $doc['colors'] ?? null;
		if ( ! is_array( $colors ) ) $e[] = 'Couleurs manquantes';
		else {
			$only( $colors, array_keys( self::color_labels() ), 'colors.' );
			foreach ( array_keys( self::color_labels() ) as $k ) if ( ! $hex( $colors[ $k ] ?? null ) ) $e[] = 'Couleur ' . $k . ' invalide';
		}

		$texts = $doc['texts'] ?? null;
		$clean = array();
		if ( ! is_array( $texts ) || ! $texts || array_keys( $texts ) !== range( 0, count( $texts ) - 1 ) ) $e[] = 'Texte manquant';
		elseif ( count( $texts ) > self::MAX_TEXTS ) $e[] = self::MAX_TEXTS . ' textes maximum';
		else foreach ( $texts as $i => $t ) {
			$w = 'texts[' . $i . '].';
			if ( ! is_array( $t ) ) { $e[] = 'Texte invalide'; continue; }
			$only( $t, array( 'value', 'side', 'font_id', 'size_percent', 'color', 'outline', 'curve', 'rotation', 'position' ), $w );
			$value = $t['value'] ?? null;
			if ( ! is_string( $value ) || ! preg_match( '//u', $value ) ) $e[] = 'Texte invalide';
			else {
				if ( self::grapheme_count( $value ) > self::MAX_GRAPHEMES ) $e[] = 'Texte limité à ' . self::MAX_GRAPHEMES . ' caractères';
				if ( ! preg_match( self::ALLOWED_CHARS, $value ) ) $e[] = 'Caractère non pris en charge par les polices';
				if ( count( $texts ) > 1 && '' === trim( $value ) ) $e[] = 'Texte vide';
			}
			if ( ! in_array( $t['side'] ?? null, array( 'top', 'bottom' ), true ) ) $e[] = 'Face du texte invalide';
			if ( ! isset( self::fonts()[ $t['font_id'] ?? '' ] ) ) $e[] = 'Police inconnue';
			$int( $t['size_percent'] ?? null, 30, 250, 'Taille' );
			$int( $t['curve'] ?? null, -100, 100, 'Courbure' );
			$int( $t['rotation'] ?? null, -90, 90, 'Inclinaison' );
			if ( ! $hex( $t['color'] ?? null ) ) $e[] = 'Couleur du texte invalide';
			if ( ! is_bool( $t['outline'] ?? null ) ) $e[] = 'Contour invalide';
			$pos = $t['position'] ?? null;
			if ( ! is_array( $pos ) ) $e[] = 'Position manquante';
			else {
				$only( $pos, array( 'x', 'y' ), $w . 'position.' );
				$int( $pos['x'] ?? null, -self::POS_X, self::POS_X, 'Position x' );
				$int( $pos['y'] ?? null, -self::POS_Y, self::POS_Y, 'Position y' );
			}
			if ( ! $e ) $clean[] = array(
				'value'        => $t['value'],
				'side'         => $t['side'],
				'font_id'      => $t['font_id'],
				'size_percent' => $t['size_percent'],
				'color'        => $t['color'],
				'outline'      => $t['outline'],
				'curve'        => $t['curve'],
				'rotation'     => $t['rotation'],
				'position'     => array( 'x' => $t['position']['x'], 'y' => $t['position']['y'] ),
			);
		}
		if ( ! array_key_exists( 'image', $doc ) || null !== $doc['image'] ) $e[] = 'Image importée non prise en charge';

		if ( $e ) return new WP_Error( 'ag_invalid', implode( ' · ', array_unique( $e ) ) );

		// Canonical order (identical to schema.js) → stable hash.
		return array(
			'schema_version'   => self::SCHEMA_VERSION,
			'renderer_version' => self::RENDERER_VERSION,
			'model_id'         => self::MODEL_ID,
			'asset_version'    => self::ASSET_VERSION,
			'pattern_id'       => $pattern,
			'colors'           => array( 'base' => $colors['base'], 'accent' => $colors['accent'], 'light' => $colors['light'], 'brim' => $colors['brim'], 'trim' => $colors['trim'] ),
			'texts'            => $clean,
			'image'            => null,
		);
	}

	public static function canonical_json( array $doc ) {
		return wp_json_encode( $doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	}

	/** Hash of the normalised choices (not of any preview or URL). */
	public static function hash( array $doc ) {
		return hash( 'sha256', self::canonical_json( $doc ) );
	}

	/** Human-readable lines for cart, order, emails. */
	public static function summary( array $doc ) {
		$doc = self::upgrade( $doc ); // orders placed before 0.9 keep their v1/v2 JSON
		if ( empty( $doc['texts'] ) || ! is_array( $doc['texts'] ) ) $doc['texts'] = array();
		$fonts = self::fonts();
		$cap = self::cap_color_of( $doc );
		if ( $cap ) {
			$lines = array( __( 'Couleur de la gapette', 'atelier-gapette' ) => self::all_cap_colors()[ $cap ]['label'] );
		} else {
			$lines = array(
				__( 'Motif', 'atelier-gapette' ) => self::patterns()[ $doc['pattern_id'] ],
			);
			$c = array();
			foreach ( self::color_labels() as $k => $label ) $c[] = $label . ' ' . strtoupper( $doc['colors'][ $k ] );
			$lines[ __( 'Couleurs', 'atelier-gapette' ) ] = implode( ' · ', $c );
		}
		$texts = array_values( array_filter( $doc['texts'], function ( $t ) { return '' !== trim( $t['value'] ); } ) );
		if ( ! $texts ) $lines[ __( 'Texte', 'atelier-gapette' ) ] = __( 'Sans texte', 'atelier-gapette' );
		foreach ( $texts as $i => $t ) {
			$n     = count( $texts ) > 1 ? ' ' . ( $i + 1 ) : '';
			$shape = null;
			foreach ( self::shapes() as $sh ) {
				if ( $sh['curve'] === $t['curve'] && $sh['rotation'] === $t['rotation'] ) $shape = $sh['label'];
			}
			$lines[ __( 'Texte', 'atelier-gapette' ) . $n ] = '« ' . $t['value'] . ' »';
			$lines[ __( 'Face', 'atelier-gapette' ) . $n ] = 'top' === $t['side'] ? __( 'Dessus de la visière', 'atelier-gapette' ) : __( 'Dessous de la visière', 'atelier-gapette' );
			$lines[ __( 'Typographie', 'atelier-gapette' ) . $n ] = $fonts[ $t['font_id'] ]['label'] . ' · ' . $t['size_percent'] . ' % · ' . strtoupper( $t['color'] ) . ( $t['outline'] ? ' · ' . __( 'contour', 'atelier-gapette' ) : '' );
			$lines[ __( 'Forme', 'atelier-gapette' ) . $n ] = $shape ? $shape : sprintf( 'Courbure %d %% · inclinaison %d°', $t['curve'], $t['rotation'] );
		}
		return $lines;
	}
}
