<?php
/**
 * Per-product toggle: "Atelier Gapette" (personalization required for this product).
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AG_Product {

	const META = '_atelier_gapette';

	public static function init() {
		add_action( 'woocommerce_product_options_general_product_data', array( __CLASS__, 'field' ) );
		add_action( 'woocommerce_admin_process_product_object', array( __CLASS__, 'save' ) );
	}

	public static function field() {
		woocommerce_wp_checkbox( array(
			'id'          => self::META,
			'label'       => 'Atelier Gapette',
			'description' => 'Affiche le configurateur sur cette fiche et rend la personnalisation obligatoire à l’ajout au panier.',
		) );
	}

	public static function save( $product ) {
		$product->update_meta_data( self::META, isset( $_POST[ self::META ] ) ? 'yes' : 'no' ); // phpcs:ignore WordPress.Security.NonceVerification -- WooCommerce verifies the product edit nonce.
	}

	public static function is_enabled( $product_id ) {
		if ( ! $product_id || ! function_exists( 'wc_get_product' ) ) return false;
		$p = wc_get_product( $product_id );
		if ( ! $p ) return false;
		if ( $p->is_type( 'variation' ) ) $p = wc_get_product( $p->get_parent_id() );
		return $p && 'yes' === $p->get_meta( self::META, true );
	}
}
