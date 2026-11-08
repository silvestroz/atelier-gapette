<?php
/**
 * One-click creation of the personalizable product (solid model):
 * a DRAFT variable product "Gapette personnalisée" with one variation per cap
 * colour, no price (to be set by the shop owner), Atelier Gapette enabled.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AG_Setup {

	const OPTION    = 'atelier_gapette_product_id';
	const ATTRIBUTE = 'Couleur';

	public static function init() {
		add_action( 'admin_post_ag_create_product', array( __CLASS__, 'handle' ) );
	}

	/** Existing product created by this tool (not trashed), or 0. */
	public static function existing() {
		$id = (int) get_option( self::OPTION );
		if ( ! $id ) return 0;
		$status = get_post_status( $id );
		return ( $status && 'trash' !== $status && 'product' === get_post_type( $id ) ) ? $id : 0;
	}

	/** Box shown under the settings form. */
	public static function box() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) return;
		$id     = self::existing();
		$labels = implode( ', ', wp_list_pluck( AG_Schema::all_cap_colors(), 'label' ) );
		echo '<h2>Produit personnalisable</h2>';
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only.
		if ( isset( $_GET['ag_created'] ) ) echo '<div class="notice notice-success inline"><p>Produit créé en brouillon. Fixez le prix des variations puis publiez-le.</p></div>';
		if ( $id ) {
			printf(
				'<p>Produit « %s » (%s) : <a class="button" href="%s">Modifier le produit</a> <a class="button" href="%s" target="_blank" rel="noopener">Prévisualiser</a></p>',
				esc_html( get_the_title( $id ) ),
				esc_html( get_post_status_object( get_post_status( $id ) )->label ),
				esc_url( get_edit_post_link( $id ) ),
				esc_url( get_preview_post_link( $id ) )
			);
			return;
		}
		echo '<p>Crée un produit variable « Gapette personnalisée » en <strong>brouillon</strong> : une variation par couleur (' . esc_html( $labels ) . '), visuels, description, case « Atelier Gapette » cochée. Aucun prix n’est renseigné : rien n’est visible ni achetable tant que vous n’avez pas fixé le prix et publié.</p>';
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		wp_nonce_field( 'ag_create_product' );
		echo '<input type="hidden" name="action" value="ag_create_product">';
		submit_button( 'Créer le produit en brouillon', 'secondary', 'submit', false );
		echo '</form>';
	}

	public static function handle() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) wp_die( 'Accès refusé.', 403 );
		check_admin_referer( 'ag_create_product' );
		$id = self::existing();
		if ( ! $id ) $id = self::create();
		wp_safe_redirect( add_query_arg( array( 'page' => 'atelier-gapette', 'ag_created' => $id ? 1 : 0 ), admin_url( 'admin.php' ) ) );
		exit;
	}

	/** @return int product id (0 on failure) */
	public static function create() {
		$colors = AG_Schema::all_cap_colors();
		$labels = array_values( wp_list_pluck( $colors, 'label' ) );

		$attribute = new WC_Product_Attribute();
		$attribute->set_name( self::ATTRIBUTE );
		$attribute->set_options( $labels );
		$attribute->set_position( 0 );
		$attribute->set_visible( true );
		$attribute->set_variation( true );

		$product = new WC_Product_Variable();
		$product->set_name( 'Gapette personnalisée' );
		$product->set_status( 'draft' );
		$product->set_catalog_visibility( 'visible' );
		$product->set_short_description( 'Votre gapette de cycliste avec votre texte imprimé sur la visière : prénom, devise, nom du club… Choisissez la couleur, écrivez, visualisez le résultat avant de commander.' );
		$product->set_description(
			"<p>Une gapette 3 panneaux en tissu technique respirant, personnalisée avec le texte de votre choix sur le dessus ou le dessous de la visière.</p>\n" .
			"<ul>\n<li>Tissu technique Bird-Eye respirant : évacue la transpiration et sèche vite</li>\n<li>Visière souple, se porte sous le casque</li>\n<li>Élastique à l’arrière pour un bon maintien</li>\n<li>Taille unique adulte</li>\n<li>Couleurs : " . esc_html( implode( ', ', $labels ) ) . "</li>\n<li>Texte jusqu’à 24 caractères, 12 typographies, imprimé sur le dessus ou le dessous de la visière</li>\n</ul>\n" .
			"<p>L’aperçu est indicatif : le rendu des couleurs et le placement peuvent varier légèrement à la fabrication. Article personnalisé, fabriqué à la commande.</p>"
		);
		$product->set_attributes( array( $attribute ) );
		$product->set_default_attributes( array( sanitize_title( self::ATTRIBUTE ) => $labels[0] ) );
		$product->update_meta_data( AG_Product::META, 'yes' );
		$id = $product->save();
		if ( ! $id ) return 0;

		$hero = self::attach_image( 'gapette-personnalisee.jpg', 'Gapette personnalisée avec texte sur la visière', $id );
		$gallery = array();
		$under = self::attach_image( 'gapette-personnalisee-dessous.jpg', 'Gapette personnalisée, texte sous la visière', $id );
		if ( $under ) $gallery[] = $under;

		foreach ( $colors as $cid => $c ) {
			$variation = new WC_Product_Variation();
			$variation->set_parent_id( $id );
			$variation->set_attributes( array( sanitize_title( self::ATTRIBUTE ) => $c['label'] ) );
			$variation->set_status( 'publish' );
			$img = self::attach_image( 'gapette-' . $cid . '.jpg', 'Gapette ' . $c['label'], $id );
			if ( $img ) { $variation->set_image_id( $img ); $gallery[] = $img; }
			$variation->save(); // no price on purpose
		}

		$product = wc_get_product( $id );
		if ( $hero ) $product->set_image_id( $hero );
		if ( $gallery ) $product->set_gallery_image_ids( $gallery );
		$product->save();
		update_option( self::OPTION, $id, false );
		return $id;
	}

	/** Copy a bundled visual into the media library. */
	private static function attach_image( $file, $title, $parent ) {
		$src = AG_DIR . 'assets/img/products/' . $file;
		if ( ! is_readable( $src ) ) return 0;
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$upload = wp_upload_bits( $file, null, file_get_contents( $src ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin file.
		if ( ! empty( $upload['error'] ) ) return 0;
		$att = wp_insert_attachment( array(
			'post_mime_type' => 'image/jpeg',
			'post_title'     => $title,
			'post_status'    => 'inherit',
		), $upload['file'], $parent );
		if ( ! $att || is_wp_error( $att ) ) return 0;
		wp_update_attachment_metadata( $att, wp_generate_attachment_metadata( $att, $upload['file'] ) );
		update_post_meta( $att, '_wp_attachment_image_alt', $title );
		return (int) $att;
	}
}
