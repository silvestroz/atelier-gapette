<?php
/**
 * Private storage for order previews (PNG/JPEG produced by the browser).
 *
 * - Files live outside public access: in AG_PRIVATE_DIR if defined (recommended:
 *   a folder outside the web root), otherwise in uploads/atelier-gapette-private
 *   protected by .htaccess / web.config (Apache/IIS; on Nginx add a deny rule,
 *   see readme). A random file name is NOT the access control: files are only
 *   served through an authorised admin route.
 * - Unattached temporary files are swept after 48 h by a daily cron.
 * - Browser previews are illustrative; they never override the server JSON.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AG_Files {

	const TMP_TTL   = 2 * DAY_IN_SECONDS;
	const MAX_BYTES = 1500000;
	const MAX_SIDE  = 1200;

	public static function init() {
		add_action( 'ag_sweep_tmp', array( __CLASS__, 'sweep' ) );
		add_action( 'admin_post_ag_file', array( __CLASS__, 'serve' ) );
	}

	public static function dir() {
		if ( defined( 'AG_PRIVATE_DIR' ) && AG_PRIVATE_DIR ) {
			$dir = untrailingslashit( AG_PRIVATE_DIR );
		} else {
			$up = wp_upload_dir( null, false );
			if ( ! empty( $up['error'] ) ) return '';
			$dir = trailingslashit( $up['basedir'] ) . 'atelier-gapette-private';
		}
		if ( ! is_dir( $dir ) && ! wp_mkdir_p( $dir . '/tmp' ) ) return '';
		if ( ! is_dir( $dir . '/tmp' ) ) wp_mkdir_p( $dir . '/tmp' );
		foreach ( array( $dir, $dir . '/tmp' ) as $d ) {
			if ( ! file_exists( $d . '/.htaccess' ) ) file_put_contents( $d . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n" );
			if ( ! file_exists( $d . '/index.php' ) ) file_put_contents( $d . '/index.php', "<?php\n// Silence is golden.\n" );
			if ( ! file_exists( $d . '/web.config' ) ) file_put_contents( $d . '/web.config', "<?xml version=\"1.0\"?>\n<configuration><system.webServer><authorization><deny users=\"*\" /></authorization></system.webServer></configuration>\n" );
		}
		return $dir;
	}

	/**
	 * Decode + verify a data URL image (real signature, decodable, bounded).
	 * Returns [ 'bytes' => string, 'ext' => 'png'|'jpg', 'w' => int, 'h' => int ] or WP_Error.
	 */
	public static function decode_data_url( $data_url, $max_side = self::MAX_SIDE ) {
		if ( ! is_string( $data_url ) || ! preg_match( '#^data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+)$#', $data_url, $m ) ) {
			return new WP_Error( 'ag_img', 'Aperçu invalide' );
		}
		if ( strlen( $m[2] ) > self::MAX_BYTES * 1.4 ) return new WP_Error( 'ag_img', 'Aperçu trop lourd' );
		$bytes = base64_decode( $m[2], true );
		if ( false === $bytes || strlen( $bytes ) > self::MAX_BYTES ) return new WP_Error( 'ag_img', 'Aperçu illisible' );
		$sig_png = "\x89PNG\r\n\x1a\n";
		$is_png  = 0 === strncmp( $bytes, $sig_png, 8 );
		$is_jpg  = 0 === strncmp( $bytes, "\xFF\xD8\xFF", 3 );
		if ( ! $is_png && ! $is_jpg ) return new WP_Error( 'ag_img', 'Signature de fichier inattendue' );
		$info = @getimagesizefromstring( $bytes );
		if ( ! $info || ! in_array( $info[2], array( IMAGETYPE_PNG, IMAGETYPE_JPEG ), true ) ) return new WP_Error( 'ag_img', 'Aperçu non décodable' );
		if ( $info[0] < 16 || $info[1] < 16 || $info[0] > $max_side || $info[1] > $max_side ) return new WP_Error( 'ag_img', 'Dimensions d’aperçu inattendues' );
		if ( function_exists( 'imagecreatefromstring' ) ) {
			$im = @imagecreatefromstring( $bytes );
			if ( ! $im ) return new WP_Error( 'ag_img', 'Aperçu non décodable' );
			imagedestroy( $im );
		}
		return array( 'bytes' => $bytes, 'ext' => $is_png ? 'png' : 'jpg', 'w' => $info[0], 'h' => $info[1] );
	}

	/** Store bytes as a temporary private file; returns the file name or ''. */
	public static function store_tmp( array $img ) {
		$dir = self::dir();
		if ( ! $dir ) return '';
		$name = 'ag-' . wp_generate_password( 24, false, false ) . '.' . $img['ext'];
		if ( false === file_put_contents( $dir . '/tmp/' . $name, $img['bytes'] ) ) return '';
		@chmod( $dir . '/tmp/' . $name, 0640 );
		return $name;
	}

	/** Move a temp file under the order folder. Returns relative path or ''. */
	public static function attach_to_order( $tmp_name, $order_id, $item_id ) {
		$dir = self::dir();
		if ( ! $dir || ! preg_match( '/^ag-[A-Za-z0-9]{24}\.(png|jpg)$/', (string) $tmp_name, $m ) ) return '';
		$src = $dir . '/tmp/' . $tmp_name;
		if ( ! is_file( $src ) ) return '';
		$rel = 'orders/' . intval( $order_id );
		wp_mkdir_p( $dir . '/' . $rel );
		$dst = $rel . '/item-' . intval( $item_id ) . '-' . wp_generate_password( 8, false, false ) . '.' . $m[1];
		// copy (not move): the same cart line may be re-used if the payment is retried
		return copy( $src, $dir . '/' . $dst ) ? $dst : '';
	}

	public static function path( $rel ) {
		$dir = self::dir();
		if ( ! $dir || ! preg_match( '#^orders/\d+/item-\d+-[A-Za-z0-9]{8}\.(png|jpg)$#', (string) $rel ) ) return '';
		$p = $dir . '/' . $rel;
		return is_file( $p ) ? $p : '';
	}

	/** Authorised download URL (admin only, nonce-bound to the order item). */
	public static function url( $item_id, $what = 'preview' ) {
		return wp_nonce_url( admin_url( 'admin-post.php?action=ag_file&item=' . intval( $item_id ) . '&what=' . rawurlencode( $what ) ), 'ag_file_' . intval( $item_id ) );
	}

	public static function serve() {
		$item_id = isset( $_GET['item'] ) ? absint( $_GET['item'] ) : 0;
		$what    = isset( $_GET['what'] ) ? sanitize_key( $_GET['what'] ) : 'preview';
		check_admin_referer( 'ag_file_' . $item_id );
		// Nonce ≠ authorisation: also require the capability to manage orders.
		if ( ! current_user_can( 'edit_shop_orders' ) && ! current_user_can( 'manage_woocommerce' ) ) wp_die( esc_html__( 'Accès refusé.', 'atelier-gapette' ), 403 );
		$item = WC_Order_Factory::get_order_item( $item_id );
		if ( ! $item ) wp_die( 'Not found', 404 );
		nocache_headers();
		if ( 'json' === $what ) {
			$json = (string) $item->get_meta( '_ag_config', true );
			if ( ! $json ) wp_die( 'Not found', 404 );
			header( 'Content-Type: application/json; charset=utf-8' );
			header( 'Content-Disposition: attachment; filename="gapette-commande-' . intval( $item->get_order_id() ) . '-ligne-' . $item_id . '.json"' );
			echo $json; // phpcs:ignore -- canonical JSON produced by AG_Schema.
			exit;
		}
		$path = self::path( (string) $item->get_meta( '_ag_preview', true ) );
		if ( ! $path ) wp_die( 'Not found', 404 );
		header( 'Content-Type: ' . ( substr( $path, -4 ) === '.png' ? 'image/png' : 'image/jpeg' ) );
		header( 'Content-Length: ' . filesize( $path ) );
		header( 'X-Content-Type-Options: nosniff' );
		readfile( $path );
		exit;
	}

	/** Daily: drop temp previews older than 48 h (never touches order folders). */
	public static function sweep() {
		$dir = self::dir();
		if ( ! $dir ) return;
		foreach ( (array) glob( $dir . '/tmp/ag-*' ) as $f ) {
			if ( is_file( $f ) && filemtime( $f ) < time() - self::TMP_TTL ) @unlink( $f );
		}
	}
}
