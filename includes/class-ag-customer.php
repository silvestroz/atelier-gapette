<?php
/**
 * Customer-facing preview (0.9.5): the personalisation image (visor top + underside)
 * is shown at checkout, on the order-received / account order pages and in the
 * WooCommerce order emails, so the customer can check where the texts will be placed.
 *
 * The stored file stays private: it is served by a signed route bound to the order key.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AG_Customer {

	public static function init() {
		add_action( 'woocommerce_order_item_meta_end', array( __CLASS__, 'order_item_image' ), 10, 4 );
		add_filter( 'woocommerce_cart_item_name', array( __CLASS__, 'checkout_thumb' ), 20, 3 );
		add_filter( 'woocommerce_store_api_cart_item_images', array( __CLASS__, 'store_api_images' ), 10, 3 );
		add_action( 'admin_post_ag_file_public', array( __CLASS__, 'serve' ) );
		add_action( 'admin_post_nopriv_ag_file_public', array( __CLASS__, 'serve' ) );
	}

	private static function sig( $item_id, $order_key ) {
		return hash_hmac( 'sha256', intval( $item_id ) . '|' . $order_key, wp_salt( 'auth' ) );
	}

	public static function public_url( WC_Order_Item_Product $item, WC_Order $order ) {
		return add_query_arg( array(
			'action' => 'ag_file_public',
			'item'   => $item->get_id(),
			'k'      => self::sig( $item->get_id(), $order->get_order_key() ),
		), admin_url( 'admin-post.php' ) );
	}

	public static function order_item_image( $item_id, $item, $order, $plain_text = false ) {
		if ( $plain_text || ! $item instanceof WC_Order_Item_Product || ! $order instanceof WC_Order ) return;
		if ( ! class_exists( 'AG_Files' ) || ! AG_Files::path( (string) $item->get_meta( '_ag_preview', true ) ) ) return;
		printf(
			'<div class="ag-customer-preview" style="margin-top:8px"><img src="%s" alt="%s" width="280" style="max-width:100%%;height:auto;border:1px solid #e5e5e5;border-radius:4px;background:#fff;display:block" /><span style="display:block;font-size:12px;color:#777;margin-top:4px">%s</span></div>',
			esc_url( self::public_url( $item, $order ) ),
			esc_attr__( 'Aperçu de votre gapette : dessus et dessous de la visière', 'atelier-gapette' ),
			esc_html__( 'Aperçu indicatif : emplacement des textes sur la visière (dessus à gauche, dessous à droite).', 'atelier-gapette' )
		);
	}

	/** Classic checkout review table (the cart page already has the thumbnail). */
	public static function checkout_thumb( $name, $cart_item, $cart_item_key ) {
		if ( ! function_exists( 'is_checkout' ) || ! is_checkout() || is_wc_endpoint_url( 'order-received' ) ) return $name;
		if ( empty( $cart_item[ AG_Cart::KEY ]['hash'] ) ) return $name;
		$f = AG_Cart::session_file( $cart_item[ AG_Cart::KEY ]['hash'] );
		if ( empty( $f['thumb'] ) || 0 !== strpos( $f['thumb'], 'data:image/' ) ) return $name;
		return $name . '<div class="ag-checkout-thumb" style="margin-top:6px"><img src="' . esc_attr( $f['thumb'] ) . '" alt="' . esc_attr__( 'Votre gapette personnalisée', 'atelier-gapette' ) . '" width="96" height="96" style="object-fit:contain;background:#fff;border:1px solid #e5e5e5;border-radius:4px" /></div>';
	}

	/** Block cart / checkout: replace the product image by the personalised preview. */
	public static function store_api_images( $images, $cart_item, $cart_item_key ) {
		if ( empty( $cart_item[ AG_Cart::KEY ]['hash'] ) ) return $images;
		$f = AG_Cart::session_file( $cart_item[ AG_Cart::KEY ]['hash'] );
		if ( empty( $f['thumb'] ) || 0 !== strpos( $f['thumb'], 'data:image/' ) ) return $images;
		return array( (object) array(
			'id'        => 0,
			'src'       => $f['thumb'],
			'thumbnail' => $f['thumb'],
			'srcset'    => '',
			'sizes'     => '',
			'name'      => 'gapette-personnalisee',
			'alt'       => __( 'Votre gapette personnalisée', 'atelier-gapette' ),
		) );
	}

	public static function serve() {
		$item_id = isset( $_GET['item'] ) ? absint( $_GET['item'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification -- signed URL.
		$k       = isset( $_GET['k'] ) ? sanitize_text_field( wp_unslash( $_GET['k'] ) ) : ''; // phpcs:ignore
		$item    = $item_id ? WC_Order_Factory::get_order_item( $item_id ) : null;
		$order   = $item instanceof WC_Order_Item_Product ? wc_get_order( $item->get_order_id() ) : null;
		if ( ! $order || ! hash_equals( self::sig( $item_id, $order->get_order_key() ), $k ) ) wp_die( 'Not found', 404 );
		$path = AG_Files::path( (string) $item->get_meta( '_ag_preview', true ) );
		if ( ! $path ) wp_die( 'Not found', 404 );
		nocache_headers();
		header( 'Content-Type: ' . ( '.png' === substr( $path, -4 ) ? 'image/png' : 'image/jpeg' ) );
		header( 'Content-Length: ' . filesize( $path ) );
		header( 'X-Content-Type-Options: nosniff' );
		readfile( $path );
		exit;
	}
}
