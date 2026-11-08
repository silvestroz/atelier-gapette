<?php
/**
 * Workshop notification: one email per paid order containing personalized
 * lines — summary, hash, JSON + preview attachments. Customer texts and
 * photos are never written to logs.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AG_Email {

	public static function init() {
		add_action( 'woocommerce_order_status_processing', array( __CLASS__, 'send' ) );
		add_action( 'woocommerce_order_status_completed', array( __CLASS__, 'send' ) );
	}

	public static function send( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order || 'yes' === $order->get_meta( '_ag_notified', true ) ) return;
		$rows = AG_Order::rows( $order );
		if ( ! $rows ) return;
		$to = AG_Settings::get( 'notification_email' );
		if ( ! is_email( $to ) ) return;

		$attachments = array();
		$tmp_json    = array();
		$dir         = AG_Files::dir();
		$body = '<p>Nouvelle commande personnalisée <strong>#' . esc_html( $order->get_order_number() ) . '</strong> — '
			. esc_html( $order->get_formatted_billing_full_name() ) . '.</p>'
			. '<p style="color:#666">Le JSON fait foi pour la fabrication ; l’aperçu joint est indicatif.</p>'
			. '<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font:14px Arial,sans-serif">';
		foreach ( $rows as $i => $r ) {
			$body .= '<tr><td colspan="2" style="border-top:1px solid #ddd;padding-top:12px"><strong>' . esc_html( $r['product'] ) . '</strong> × ' . intval( $r['qty'] ) . ' <span style="color:#888;font-size:12px">ligne ' . intval( $r['item_id'] ) . '</span></td></tr>';
			if ( is_array( $r['doc'] ) ) {
				foreach ( AG_Schema::summary( $r['doc'] ) as $k => $v ) {
					$body .= '<tr><td style="color:#666;width:130px">' . esc_html( $k ) . '</td><td>' . esc_html( $v ) . '</td></tr>';
				}
				$up  = AG_Schema::upgrade( $r['doc'] );
				$pos = array();
				foreach ( (array) ( $up['texts'] ?? array() ) as $n => $t ) {
					if ( '' === trim( (string) ( $t['value'] ?? '' ) ) ) continue;
					$pos[] = ( count( $up['texts'] ) > 1 ? 'texte ' . ( $n + 1 ) . ' : ' : '' ) . 'x ' . intval( $t['position']['x'] ) . ' · y ' . intval( $t['position']['y'] );
				}
				if ( $pos ) $body .= '<tr><td style="color:#666">Position</td><td>' . esc_html( implode( ' ; ', $pos ) ) . ' (repère local du décalque)</td></tr>';
			}
			$body .= '<tr><td style="color:#666">Empreinte</td><td style="font-family:monospace;font-size:12px">' . esc_html( $r['hash'] ) . '</td></tr>';
			if ( $r['preview'] ) $attachments[] = $r['preview'];
			if ( $dir ) {
				$f = $dir . '/tmp/ag-json-' . wp_generate_password( 12, false, false ) . '-commande-' . intval( $order->get_id() ) . '-ligne-' . intval( $r['item_id'] ) . '.json';
				if ( false !== file_put_contents( $f, $r['json'] ) ) { $attachments[] = $f; $tmp_json[] = $f; }
			}
		}
		$body .= '</table>';
		$body .= '<p><a href="' . esc_url( $order->get_edit_order_url() ) . '">Ouvrir la commande</a></p>';

		$sent = wp_mail( $to, sprintf( '[Atelier Gapette] Commande personnalisée #%s', $order->get_order_number() ), $body, array( 'Content-Type: text/html; charset=UTF-8' ), $attachments );
		foreach ( $tmp_json as $f ) @unlink( $f );
		if ( $sent ) {
			$order->update_meta_data( '_ag_notified', 'yes' );
			$order->save();
		}
	}
}
