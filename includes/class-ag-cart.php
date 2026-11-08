<?php
/**
 * Cart: validate the posted configuration, attach it to the cart line,
 * display it (classic cart and Cart/Checkout blocks via item data), apply the
 * server-side text surcharge and the quantity discount (0.10).
 *
 * Identical configurations of the same product share one line (quantity 2);
 * different configurations always get their own line (the canonical config is
 * part of the cart item data, hence of the cart item key).
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AG_Cart {

	const KEY           = 'atelier_gapette';
	const RATE_LIMIT    = 40;          // previews stored per session …
	const RATE_WINDOW   = HOUR_IN_SECONDS; // … per hour

	/** Validated payload for the current request (validation → add_cart_item_data). */
	private static $pending = null;

	public static function init() {
		add_filter( 'woocommerce_add_to_cart_validation', array( __CLASS__, 'validate' ), 20, 5 );
		add_filter( 'woocommerce_add_cart_item_data', array( __CLASS__, 'add_data' ), 10, 3 );
		add_filter( 'woocommerce_add_cart_item', array( __CLASS__, 'apply_price' ), 20 );
		add_filter( 'woocommerce_get_cart_item_from_session', array( __CLASS__, 'from_session' ), 20, 2 );
		add_filter( 'woocommerce_get_item_data', array( __CLASS__, 'item_data' ), 10, 2 );
		add_filter( 'woocommerce_cart_item_thumbnail', array( __CLASS__, 'thumbnail' ), 10, 2 );
		add_action( 'woocommerce_before_calculate_totals', array( __CLASS__, 'quantity_discount' ), 20 );
		// Also when the cart comes back from the session: pages that do not recalculate totals (mini-cart) still show the discounted lines.
		add_action( 'woocommerce_cart_loaded_from_session', array( __CLASS__, 'quantity_discount' ), 20 );
		add_filter( 'woocommerce_cart_item_price', array( __CLASS__, 'discounted_price_html' ), 20, 2 );
		add_action( 'wp_ajax_ag_add_to_cart', array( __CLASS__, 'ajax_add_to_cart' ) );
		add_action( 'wp_ajax_nopriv_ag_add_to_cart', array( __CLASS__, 'ajax_add_to_cart' ) );
	}

	private static function error( $msg ) {
		wc_add_notice( $msg, 'error' );
		self::$pending = null;
		return false;
	}

	public static function validate( $passed, $product_id, $quantity, $variation_id = 0, $variations = array() ) {
		self::$pending = null;
		if ( ! $passed || ! AG_Product::is_enabled( $product_id ) ) return $passed;

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- public add-to-cart form; every value is validated below.
		$raw = isset( $_POST['ag_config'] ) ? wp_unslash( $_POST['ag_config'] ) : '';
		$doc = AG_Schema::validate_json( is_string( $raw ) ? $raw : '' );
		if ( is_wp_error( $doc ) ) return self::error( 'Personnalisation : ' . $doc->get_error_message() );
		if ( AG_Settings::is_solid() ) {
			// The variation (attribute "Couleur") decides the cap colour; the browser only previews it.
			$doc = AG_Schema::enforce_solid( $doc, self::posted_color( (array) $variations ) );
			if ( is_wp_error( $doc ) ) return self::error( $doc->get_error_message() );
		}

		$preview = AG_Files::decode_data_url( isset( $_POST['ag_preview'] ) ? wp_unslash( $_POST['ag_preview'] ) : '' );
		$thumb   = AG_Files::decode_data_url( isset( $_POST['ag_thumb'] ) ? wp_unslash( $_POST['ag_thumb'] ) : '', 400 );
		// phpcs:enable
		if ( is_wp_error( $preview ) || is_wp_error( $thumb ) ) {
			return self::error( 'L’aperçu de votre gapette n’a pas pu être préparé. Patientez une seconde puis réessayez.' );
		}
		if ( ! self::within_rate_limit() ) return self::error( 'Trop d’envois en peu de temps. Réessayez dans quelques minutes.' );

		$tmp = AG_Files::store_tmp( $preview );
		if ( ! $tmp ) return self::error( 'Impossible d’enregistrer l’aperçu. Réessayez.' );

		self::$pending = array(
			'config' => $doc,
			'hash'   => AG_Schema::hash( $doc ),
			'tmp'    => $tmp,
			'thumb'  => 'data:image/' . ( 'png' === $thumb['ext'] ? 'png' : 'jpeg' ) . ';base64,' . base64_encode( $thumb['bytes'] ),
		);
		return true;
	}

	/** Cap colour id from the chosen variation attributes (or the posted attribute_* fields). */
	private static function posted_color( array $variations ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- read-only lookup, matched against a fixed list.
		foreach ( $_POST as $k => $v ) if ( 0 === strpos( (string) $k, 'attribute_' ) && is_string( $v ) && ! isset( $variations[ $k ] ) ) $variations[ $k ] = wp_unslash( $v );
		foreach ( $variations as $value ) {
			$id = AG_Schema::cap_color_from_term( $value );
			if ( $id ) return $id;
		}
		return null;
	}

	private static function within_rate_limit() {
		if ( ! WC()->session ) return true;
		$now = time();
		$log = array_filter( (array) WC()->session->get( 'ag_uploads', array() ), function ( $t ) use ( $now ) { return $t > $now - self::RATE_WINDOW; } );
		if ( count( $log ) >= self::RATE_LIMIT ) return false;
		$log[] = $now;
		WC()->session->set( 'ag_uploads', array_values( $log ) );
		return true;
	}

	public static function add_data( $data, $product_id, $variation_id ) {
		if ( ! AG_Product::is_enabled( $product_id ) ) return $data;
		if ( ! self::$pending ) {
			// Should never happen (validation runs first), but never create a line without its personalization.
			throw new Exception( 'Personnalisation manquante.' );
		}
		$p = self::$pending;
		$data[ self::KEY ] = array( 'config' => $p['config'], 'hash' => $p['hash'] );
		// Files are tracked in the session by hash so they don't split identical lines.
		if ( WC()->session ) {
			$files = (array) WC()->session->get( 'ag_files', array() );
			$files[ $p['hash'] ] = array( 'tmp' => $p['tmp'], 'thumb' => $p['thumb'] );
			WC()->session->set( 'ag_files', $files );
		}
		self::$pending = null;
		return $data;
	}

	public static function session_file( $hash ) {
		if ( ! WC()->session ) return null;
		$files = (array) WC()->session->get( 'ag_files', array() );
		return $files[ $hash ] ?? null;
	}

	/** "−10 % (dès 10 gapettes personnalisées)". */
	public static function discount_label( $pct ) {
		$rule = AG_Settings::discount_rule();
		return '−' . AG_Settings::format_pct( $pct ) . ' %' . ( $rule ? ' (dès ' . (int) $rule['min'] . ' gapettes personnalisées)' : '' );
	}

	public static function surcharge_for( array $cart_item ) {
		if ( empty( $cart_item[ self::KEY ]['config'] ) ) return 0.0;
		return AG_Schema::has_text( (array) $cart_item[ self::KEY ]['config'] ) ? (float) AG_Settings::get( 'text_surcharge' ) : 0.0;
	}

	/** Server-side price: base product price + surcharge. Browser prices are ignored. */
	public static function apply_price( $cart_item ) {
		$s = self::surcharge_for( $cart_item );
		if ( $s > 0 && isset( $cart_item['data'] ) && $cart_item['data'] instanceof WC_Product && empty( $cart_item['ag_priced'] ) ) {
			$cart_item['data']->set_price( (float) $cart_item['data']->get_price( 'edit' ) + $s );
			$cart_item['ag_priced'] = true;
		}
		return $cart_item;
	}

	/**
	 * Quantity discount (0.10): from N personalised caps in the cart — all lines
	 * together, so a club with a different first name on each cap gets it too —
	 * every personalised cap is priced at (100 − P) % of its price.
	 * The undiscounted price is kept on the line (ag_base) so that repeated
	 * calculations never compound, and the discount goes away below the threshold.
	 */
	public static function quantity_discount( $cart ) {
		if ( ! $cart instanceof WC_Cart ) return;
		$rule  = AG_Settings::discount_rule();
		$count = 0;
		foreach ( $cart->cart_contents as $item ) {
			if ( ! empty( $item[ self::KEY ] ) ) $count += (int) $item['quantity'];
		}
		$pct = $rule && $count >= $rule['min'] ? (float) $rule['pct'] : 0.0;
		foreach ( $cart->cart_contents as $key => $item ) {
			if ( empty( $item[ self::KEY ] ) || ! isset( $item['data'] ) || ! $item['data'] instanceof WC_Product ) continue;
			if ( ! isset( $item['ag_base'] ) ) $cart->cart_contents[ $key ]['ag_base'] = (float) $item['data']->get_price( 'edit' );
			$base = (float) $cart->cart_contents[ $key ]['ag_base'];
			$item['data']->set_price( $pct > 0 ? round( $base * ( 1 - $pct / 100 ), wc_get_price_decimals() ) : $base );
			$cart->cart_contents[ $key ]['ag_discount'] = $pct;
		}
	}

	/** Cart line: the usual price struck through next to the discounted one. */
	public static function discounted_price_html( $html, $cart_item ) {
		if ( empty( $cart_item[ self::KEY ] ) || empty( $cart_item['ag_discount'] ) || ! isset( $cart_item['ag_base'], $cart_item['data'] ) ) return $html;
		$args = array( 'price' => (float) $cart_item['ag_base'] );
		$base = WC()->cart && WC()->cart->display_prices_including_tax() ? wc_get_price_including_tax( $cart_item['data'], $args ) : wc_get_price_excluding_tax( $cart_item['data'], $args );
		return '<del aria-hidden="true">' . wc_price( $base ) . '</del> <ins>' . $html . '</ins>';
	}

	public static function from_session( $cart_item, $values ) {
		unset( $cart_item['ag_priced'], $cart_item['ag_base'], $cart_item['ag_discount'] ); // the product object is fresh: price again
		if ( isset( $values[ self::KEY ] ) ) {
			// Re-validate what comes back from the session (defence in depth).
			$doc = AG_Schema::validate( (array) $values[ self::KEY ]['config'] );
			if ( is_wp_error( $doc ) ) return $cart_item;
			$hash = AG_Schema::hash( $doc );
			$old  = $values[ self::KEY ]['hash'] ?? '';
			// A cart started before a schema upgrade: keep its preview files under the new hash.
			if ( $old && $old !== $hash && WC()->session ) {
				$files = (array) WC()->session->get( 'ag_files', array() );
				if ( isset( $files[ $old ] ) && ! isset( $files[ $hash ] ) ) { $files[ $hash ] = $files[ $old ]; WC()->session->set( 'ag_files', $files ); }
			}
			$cart_item[ self::KEY ] = array( 'config' => $doc, 'hash' => $hash );
		}
		return self::apply_price( $cart_item );
	}

	public static function item_data( $item_data, $cart_item ) {
		if ( empty( $cart_item[ self::KEY ]['config'] ) ) return $item_data;
		foreach ( AG_Schema::summary( $cart_item[ self::KEY ]['config'] ) as $k => $v ) {
			// the variation line already shows the colour attribute
			if ( ! empty( $cart_item['variation'] ) && __( 'Couleur de la gapette', 'atelier-gapette' ) === $k && AG_Schema::cap_color_from_term( implode( ' ', array_slice( (array) $cart_item['variation'], 0, 1 ) ) ) ) continue;
			$item_data[] = array( 'key' => $k, 'value' => $v, 'display' => esc_html( $v ) );
		}
		$s = self::surcharge_for( $cart_item );
		if ( $s > 0 ) $item_data[] = array( 'key' => 'Supplément texte', 'value' => wp_strip_all_tags( wc_price( $s ) ), 'display' => wc_price( $s ) );
		if ( ! empty( $cart_item['ag_discount'] ) ) {
			$v = self::discount_label( $cart_item['ag_discount'] );
			$item_data[] = array( 'key' => 'Remise quantité', 'value' => $v, 'display' => esc_html( $v ) );
		}
		return $item_data;
	}

	/**
	 * Add to cart without leaving the page (built-in form of the shortcode).
	 * Same validation path as the classic form: woocommerce_add_to_cart_validation
	 * + woocommerce_add_cart_item_data read the posted ag_* fields.
	 */
	public static function ajax_add_to_cart() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- public add-to-cart, values validated in validate().
		$pid = isset( $_POST['ag_product'] ) ? absint( $_POST['ag_product'] ) : 0;
		$qty = isset( $_POST['quantity'] ) ? max( 1, absint( $_POST['quantity'] ) ) : 1;
		// phpcs:enable
		$product = $pid ? wc_get_product( $pid ) : null;
		if ( ! $product || 'publish' !== $product->get_status() || ! $product->is_type( 'simple' ) || ! AG_Product::is_enabled( $pid ) ) {
			wp_send_json_error( array( 'messages' => array( 'Produit indisponible.' ) ), 400 );
		}
		$passed = apply_filters( 'woocommerce_add_to_cart_validation', true, $pid, $qty );
		$key    = false;
		if ( $passed ) {
			try { $key = WC()->cart->add_to_cart( $pid, $qty ); } catch ( Exception $e ) { wc_add_notice( $e->getMessage(), 'error' ); }
		}
		$errors = array_map( function ( $n ) { return wp_strip_all_tags( is_array( $n ) ? $n['notice'] : $n ); }, wc_get_notices( 'error' ) );
		wc_clear_notices();
		if ( ! $key ) {
			wp_send_json_error( array( 'messages' => $errors ? $errors : array( 'L’ajout au panier a échoué.' ) ), 422 );
		}
		WC()->cart->calculate_totals();
		wp_send_json_success( array(
			'count'     => WC()->cart->get_cart_contents_count(),
			'cart_url'  => wc_get_cart_url(),
			'cart_hash' => WC()->cart->get_cart_hash(),
		) );
	}

	/** Classic cart only (blocks show the product image). */
	public static function thumbnail( $html, $cart_item ) {
		if ( empty( $cart_item[ self::KEY ]['hash'] ) ) return $html;
		$f = self::session_file( $cart_item[ self::KEY ]['hash'] );
		if ( empty( $f['thumb'] ) || 0 !== strpos( $f['thumb'], 'data:image/' ) ) return $html;
		return '<img src="' . esc_attr( $f['thumb'] ) . '" alt="' . esc_attr__( 'Votre gapette personnalisée', 'atelier-gapette' ) . '" width="120" height="120" style="object-fit:contain;background:#fff" />';
	}
}
