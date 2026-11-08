<?php
/**
 * Order: freeze the configuration on each line item (CRUD, HPOS-compatible),
 * attach the private preview, show everything to the workshop in the admin.
 *
 * Stored per line item:
 *   _ag_config   canonical JSON (immutable copy)
 *   _ag_hash     sha256 of the canonical JSON
 *   _ag_versions JSON: schema / renderer / model / assets / fonts / plugin
 *   _ag_preview  private relative path of the browser preview (illustrative)
 *   + visible, human-readable lines (Motif, Couleurs, Texte…)
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AG_Order {

	public static function init() {
		add_action( 'woocommerce_checkout_create_order_line_item', array( __CLASS__, 'create_line' ), 10, 4 );
		add_action( 'woocommerce_new_order_item', array( __CLASS__, 'attach_preview' ), 10, 3 );
		add_action( 'woocommerce_after_order_itemmeta', array( __CLASS__, 'admin_view' ), 10, 3 );
		add_filter( 'woocommerce_hidden_order_itemmeta', array( __CLASS__, 'hidden_meta' ) );
	}

	public static function versions() {
		return array(
			'schema_version'   => AG_Schema::SCHEMA_VERSION,
			'renderer_version' => AG_Schema::RENDERER_VERSION,
			'model_id'         => AG_Schema::MODEL_ID,
			'asset_version'    => AG_Schema::ASSET_VERSION,
			'fonts'            => array_map( function ( $f ) { return $f['family']; }, AG_Schema::fonts() ),
			'plugin'           => AG_VERSION,
		);
	}

	public static function create_line( $item, $cart_item_key, $values, $order ) {
		if ( empty( $values[ AG_Cart::KEY ]['config'] ) ) return;
		$doc = AG_Schema::validate( (array) $values[ AG_Cart::KEY ]['config'] );
		if ( is_wp_error( $doc ) ) throw new Exception( 'Personnalisation invalide : ' . $doc->get_error_message() );
		$hash = AG_Schema::hash( $doc );
		foreach ( AG_Schema::summary( $doc ) as $k => $v ) $item->add_meta_data( $k, $v, true );
		// 0.10: the line price already carries the quantity discount; say so on the order.
		if ( ! empty( $values['ag_discount'] ) ) $item->add_meta_data( 'Remise quantité', AG_Cart::discount_label( $values['ag_discount'] ), true );
		$item->add_meta_data( '_ag_config', AG_Schema::canonical_json( $doc ), true );
		$item->add_meta_data( '_ag_hash', $hash, true );
		$item->add_meta_data( '_ag_versions', wp_json_encode( self::versions() ), true );
		$f = AG_Cart::session_file( $hash );
		if ( ! empty( $f['tmp'] ) ) $item->add_meta_data( '_ag_preview_tmp', $f['tmp'], true );
	}

	/** Runs once the item has an id: copy the temp preview under the order folder. */
	public static function attach_preview( $item_id, $item, $order_id ) {
		if ( ! $item instanceof WC_Order_Item_Product ) return;
		$tmp = $item->get_meta( '_ag_preview_tmp', true );
		if ( ! $tmp || $item->get_meta( '_ag_preview', true ) ) return;
		$rel = AG_Files::attach_to_order( $tmp, $order_id, $item_id );
		$item->delete_meta_data( '_ag_preview_tmp' );
		if ( $rel ) $item->update_meta_data( '_ag_preview', $rel );
		$item->save_meta_data();
	}

	public static function hidden_meta( $keys ) {
		return array_merge( $keys, array( '_ag_config', '_ag_hash', '_ag_versions', '_ag_preview', '_ag_preview_tmp' ) );
	}

	public static function admin_view( $item_id, $item, $product ) {
		if ( ! is_admin() || ! $item instanceof WC_Order_Item_Product ) return;
		$json = $item->get_meta( '_ag_config', true );
		if ( ! $json ) return;
		echo '<div class="ag-admin-item" style="margin-top:8px">';
		if ( AG_Files::path( (string) $item->get_meta( '_ag_preview', true ) ) ) {
			printf( '<a href="%1$s" target="_blank" rel="noopener"><img src="%1$s" alt="" style="max-width:320px;height:auto;border:1px solid #ddd;border-radius:4px;background:#fff;display:block" /></a>', esc_url( AG_Files::url( $item_id ) ) );
		}
		printf(
			'<p style="margin:6px 0 0"><a class="button button-small" href="%s">JSON de fabrication</a> <span style="color:#777;font-size:11px">sha256 %s · aperçu indicatif, le JSON fait foi</span></p>',
			esc_url( AG_Files::url( $item_id, 'json' ) ),
			esc_html( substr( (string) $item->get_meta( '_ag_hash', true ), 0, 16 ) . '…' )
		);
		echo '</div>';
	}

	/** Lines of an order that carry a configuration. */
	public static function rows( WC_Order $order ) {
		$rows = array();
		foreach ( $order->get_items() as $item_id => $item ) {
			$json = $item->get_meta( '_ag_config', true );
			if ( ! $json ) continue;
			$doc = json_decode( $json, true );
			$rows[] = array(
				'item_id' => $item_id,
				'product' => $item->get_name(),
				'qty'     => $item->get_quantity(),
				'doc'     => $doc,
				'json'    => $json,
				'hash'    => $item->get_meta( '_ag_hash', true ),
				'preview' => AG_Files::path( (string) $item->get_meta( '_ag_preview', true ) ),
			);
		}
		return $rows;
	}
}
