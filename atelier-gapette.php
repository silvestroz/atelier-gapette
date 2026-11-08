<?php
/**
 * Plugin Name:       Atelier Gapette
 * Plugin URI:        https://github.com/silvestroz/atelier-gapette
 * Description:       Configurateur de gapette (texte placé sur la visière à plat, à l’échelle, aperçu réaliste sur photographie), par shortcode [atelier_gapette] ou sur les fiches produit ; liaison panier / commande WooCommerce optionnelle.
 * Version:           0.12.0
 * Author:            La Gapette
 * License:           GPLv2 or later
 * Text Domain:       atelier-gapette
 * Requires at least: 6.2
 * Tested up to:      6.8
 * Requires PHP:      7.4
 * WC requires at least: 8.0
 * WC tested up to:   11.1
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'AG_VERSION', '0.12.0' );
define( 'AG_FILE', __FILE__ );
define( 'AG_DIR', plugin_dir_path( __FILE__ ) );
define( 'AG_URL', plugin_dir_url( __FILE__ ) );

require_once AG_DIR . 'includes/class-ag-schema.php';
require_once AG_DIR . 'includes/class-ag-settings.php';

add_action( 'plugins_loaded', function () {
	AG_Settings::init();
	// Lot A — works without WooCommerce.
	require_once AG_DIR . 'includes/class-ag-product.php';
	require_once AG_DIR . 'includes/class-ag-frontend.php';
	require_once AG_DIR . 'includes/class-ag-tracking.php';
	AG_Frontend::init();
	AG_Tracking::init();
	// Lot B — WooCommerce bridge.
	if ( class_exists( 'WooCommerce' ) ) {
		require_once AG_DIR . 'includes/class-ag-files.php';
		require_once AG_DIR . 'includes/class-ag-cart.php';
		require_once AG_DIR . 'includes/class-ag-order.php';
		require_once AG_DIR . 'includes/class-ag-email.php';
		require_once AG_DIR . 'includes/class-ag-customer.php';
		AG_Product::init();
		AG_Files::init();
		AG_Cart::init();
		AG_Order::init();
		AG_Email::init();
		AG_Customer::init();
		if ( is_admin() ) {
			require_once AG_DIR . 'includes/class-ag-setup.php';
			AG_Setup::init();
		}
	}
	if ( defined( 'LGC_VERSION' ) ) {
		add_action( 'admin_notices', function () {
			echo '<div class="notice notice-warning"><p><strong>Atelier Gapette</strong> remplace « La Gapette Customizer » : désactivez l’ancienne extension pour éviter deux configurateurs sur les fiches produit (les commandes passées restent lisibles).</p></div>';
		} );
	}
} );

register_activation_hook( __FILE__, function () {
	if ( ! get_option( AG_Settings::OPTION ) ) add_option( AG_Settings::OPTION, AG_Settings::defaults() );
	if ( ! wp_next_scheduled( 'ag_sweep_tmp' ) ) wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'ag_sweep_tmp' );
} );

// Deactivation keeps every setting, file and order meta; only the cron is removed.
register_deactivation_hook( __FILE__, function () {
	$ts = wp_next_scheduled( 'ag_sweep_tmp' );
	if ( $ts ) wp_unschedule_event( $ts, 'ag_sweep_tmp' );
} );

add_action( 'before_woocommerce_init', function () {
	if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		// Cart/Checkout blocks: the line data is exposed through woocommerce_get_item_data.
		// Declared only after the recette (test matrix B01–B04) on the target site.
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, false );
	}
} );
