<?php
/**
 * Front-end: assets (loaded only where the tool is present), shortcode and
 * automatic display on enabled product pages.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AG_Frontend {

	private static $instances = 0;

	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'register' ), 5 );
		add_shortcode( 'atelier_gapette', array( __CLASS__, 'shortcode' ) );
		add_action( 'woocommerce_before_add_to_cart_button', array( __CLASS__, 'product_hidden_fields' ) );
		add_action( 'woocommerce_after_single_product_summary', array( __CLASS__, 'product_page' ), 4 );
		add_action( 'wp', array( __CLASS__, 'dedicated_page' ) );
	}

	/** Unit price + shop currency format, so the button can show the total (quantity × price). */
	public static function price_data( $product ) {
		if ( ! $product instanceof WC_Product || ! function_exists( 'wc_get_price_to_display' ) ) return null;
		$unit = (float) wc_get_price_to_display( $product );
		return array(
			'unit'     => $unit,
			'discount' => AG_Settings::discount_rule(),
			'decimals' => (int) wc_get_price_decimals(),
			'decSep'   => wc_get_price_decimal_separator(),
			'thouSep'  => wc_get_price_thousand_separator(),
			'symbol'   => html_entity_decode( get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' ),
			'format'   => html_entity_decode( get_woocommerce_price_format(), ENT_QUOTES, 'UTF-8' ),
		);
	}

	/** Dedicated layout applies to enabled product pages when the setting is on. */
	public static function is_dedicated() {
		return 'yes' === AG_Settings::get( 'dedicated' ) && function_exists( 'is_product' ) && is_product() && AG_Product::is_enabled( get_queried_object_id() );
	}

	/**
	 * Dedicated product page (0.9): no WooCommerce gallery, no sidebar, the
	 * configurator spans the page and carries the purchase block.
	 */
	public static function dedicated_page() {
		if ( ! self::is_dedicated() ) return;
		remove_action( 'woocommerce_before_single_product_summary', 'woocommerce_show_product_sale_flash', 10 );
		remove_action( 'woocommerce_before_single_product_summary', 'woocommerce_show_product_images', 20 );
		add_filter( 'body_class', function ( $classes ) { $classes[] = 'ag-dedicated'; return $classes; } );
		// SKU / category line: after the configurator instead of between the title and it.
		if ( 'yes' === AG_Settings::get( 'auto_product' ) && remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_meta', 40 ) ) {
			add_action( 'woocommerce_after_single_product_summary', 'woocommerce_template_single_meta', 5 );
		}
		// GeneratePress: this page has no sidebar (other themes: set it in the theme).
		add_filter( 'generate_sidebar_layout', function () { return 'no-sidebar'; }, 99 );
	}

	/** Versioned by content hash so a new build never mixes with a cached old one. */
	private static function ver( $rel ) {
		$f = AG_DIR . $rel;
		return is_file( $f ) ? substr( md5_file( $f ), 0, 10 ) : AG_VERSION;
	}

	public static function register() {
		wp_register_style( 'atelier-gapette', AG_URL . 'assets/dist/atelier-gapette.css', array(), self::ver( 'assets/dist/atelier-gapette.css' ) );
		wp_register_script( 'atelier-gapette', AG_URL . 'assets/dist/atelier-gapette.js', array(), self::ver( 'assets/dist/atelier-gapette.js' ), true );
		if ( is_singular( 'product' ) && AG_Product::is_enabled( get_queried_object_id() ) ) self::enqueue();
	}

	public static function enqueue() {
		wp_enqueue_style( 'atelier-gapette' );
		wp_enqueue_script( 'atelier-gapette' );
		$offset = intval( AG_Settings::get( 'sticky_offset' ) );
		if ( $offset ) wp_add_inline_style( 'atelier-gapette', '.atelier-gapette{--ag-sticky-top:' . $offset . 'px}' );
		if ( self::is_dedicated() ) {
			wp_add_inline_style( 'atelier-gapette', '.ag-dedicated.woocommerce div.product div.summary,.ag-dedicated div.product .summary{float:none!important;width:100%!important;max-width:none;margin-bottom:1.5em}.ag-dedicated div.product>.product_meta{clear:both;margin:1.5em 0}' );
		}
	}

	/** Options handed to mount(); the materials PNG is lossless and versioned. */
	public static function options( $order ) {
		$o = array(
			// Filter `atelier_gapette_materials_url` to serve your own zone photo (see assets/img/README.md).
			'materialsUrl' => apply_filters( 'atelier_gapette_materials_url', add_query_arg( 'ver', self::ver( 'assets/img/cap-materials.png' ), AG_URL . 'assets/img/cap-materials.png' ) ),
			'order'        => $order,
		);
		if ( 'yes' === AG_Settings::get( 'flat_view' ) ) $o['flat'] = true;
		if ( AG_Settings::is_solid() ) {
			$colors = array();
			foreach ( AG_Schema::cap_colors() as $id => $c ) $colors[] = array( 'id' => $id, 'label' => $c['label'], 'hex' => strtolower( $c['hex'] ), 'terms' => array_values( $c['terms'] ) );
			$o['solid'] = array( 'colors' => $colors, 'default' => $colors[0]['id'] );
			// 0.12: printable text colours and outline (see Atelier Gapette settings).
			$pal = AG_Settings::text_palette();
			if ( $pal ) $o['solid']['textColors'] = $pal;
			if ( ! AG_Settings::text_outline_allowed() ) $o['solid']['outline'] = false;
		}
		// GA4 events (0.9.4), sent through the page's gtag() — see assets/src/track.js.
		if ( 'yes' === AG_Settings::get( 'tracking' ) ) {
			$pid = function_exists( 'is_product' ) && is_product() ? get_queried_object_id() : 0;
			$o['track'] = array(
				'enabled'      => true,
				'productId'    => $pid,
				'itemName'     => $pid ? wp_strip_all_tags( get_the_title( $pid ) ) : 'Gapette personnalisée',
				'currency'     => function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : 'EUR',
				'standardCart' => 'yes' === AG_Settings::get( 'track_standard_cart' ),
			);
		}
		return $o;
	}

	/**
	 * [atelier_gapette] or [atelier_gapette product_id="123"].
	 * product_id must be a published simple product with Atelier Gapette enabled.
	 */
	public static function shortcode( $atts ) {
		$atts    = shortcode_atts( array( 'product_id' => 0 ), $atts, 'atelier_gapette' );
		$product = null;
		$notice  = '';
		$pid     = absint( $atts['product_id'] );
		if ( $pid ) {
			$product = function_exists( 'wc_get_product' ) ? wc_get_product( $pid ) : null;
			if ( ! $product || 'publish' !== $product->get_status() || ! AG_Product::is_enabled( $pid ) ) {
				$product = null;
				$notice  = current_user_can( 'edit_posts' ) ? 'Atelier Gapette : product_id invalide ou personnalisation non activée sur ce produit.' : '';
			} elseif ( ! $product->is_type( 'simple' ) ) {
				$notice  = 'Pour choisir une taille ou une variante, personnalisez votre gapette depuis sa fiche produit.';
				$link    = $product->get_permalink();
				$product = null;
			}
		}
		// On an enabled product page, a bare shortcode binds to the product's own form
		// (manual placement, e.g. in a block theme's single-product template).
		$order = $product ? array( 'mode' => 'form', 'ajaxUrl' => admin_url( 'admin-ajax.php' ), 'cartUrl' => wc_get_cart_url(), 'price' => self::price_data( $product ) ) : array( 'mode' => 'none' );
		if ( ! $pid && function_exists( 'is_product' ) && is_product() && AG_Product::is_enabled( get_queried_object_id() ) ) {
			if ( 'yes' === AG_Settings::get( 'auto_product' ) ) return ''; // already placed automatically
			$order = array( 'mode' => 'product', 'formSelector' => 'form.cart', 'price' => self::price_data( wc_get_product( get_queried_object_id() ) ) );
			if ( self::is_dedicated() ) $order['relocate'] = true;
		}
		self::enqueue();
		ob_start();
		if ( $notice ) {
			echo '<p class="atelier-gapette-notice">' . esc_html( $notice ) . ( ! empty( $link ) ? ' <a href="' . esc_url( $link ) . '">' . esc_html__( 'Voir le produit', 'atelier-gapette' ) . '</a>' : '' ) . '</p>';
		}
		// Show add-to-cart results (success or server-side refusal) next to the tool:
		// plain pages of block themes don't print WooCommerce notices by themselves.
		if ( $product && function_exists( 'wc_print_notices' ) && ! is_admin() && WC()->session ) {
			echo '<div class="woocommerce atelier-gapette-notices">';
			wc_print_notices();
			echo '</div>';
		}
		self::render( self::options( $order ), $product );
		return ob_get_clean();
	}

	/** Product page: full-width configurator under the summary, bound to form.cart. */
	public static function product_page() {
		global $product;
		if ( 'yes' !== AG_Settings::get( 'auto_product' ) ) return;
		if ( ! $product instanceof WC_Product || ! AG_Product::is_enabled( $product->get_id() ) ) return;
		$order = array( 'mode' => 'product', 'formSelector' => 'form.cart', 'price' => self::price_data( $product ) );
		if ( self::is_dedicated() ) $order['relocate'] = true;
		self::render( self::options( $order ), null );
	}

	/** Placeholders inside the product form (filled by the configurator). */
	public static function product_hidden_fields() {
		global $product;
		if ( ! $product instanceof WC_Product || ! AG_Product::is_enabled( $product->get_id() ) ) return;
		// No nonce here on purpose: product pages are often cached for guests. The
		// server re-validates every value and ignores any price from the browser.
		echo '<input type="hidden" name="ag_config" value=""><input type="hidden" name="ag_preview" value=""><input type="hidden" name="ag_thumb" value="">';
	}

	public static function render( array $options, $product ) {
		$uid = 'ag' . ( ++self::$instances );
		include AG_DIR . 'templates/configurator.php';
	}
}
