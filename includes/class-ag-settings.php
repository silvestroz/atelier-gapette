<?php
/**
 * WooCommerce → Atelier Gapette settings.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AG_Settings {

	const OPTION = 'atelier_gapette_settings';

	public static function defaults() {
		return array(
			'notification_email' => get_option( 'admin_email' ),
			'text_surcharge'     => '0',
			'sticky_offset'      => 0,
			'auto_product'       => 'yes',
			'model'              => 'solid',
			'dedicated'          => 'yes',
			'tracking'           => 'yes',
			'track_standard_cart' => 'no',
			// 0.10: −10 % from 10 personalised caps in the cart (0 = no discount).
			// 0.11: texts are placed on the flat visor (at scale); the 3/4 photo is the preview
			'flat_view'          => 'yes',
			'qty_discount_min'   => 10,
			'qty_discount_pct'   => 10,
			// 0.12: what can be produced today — cap colours on sale, printable text colours (one per line, « Nom #rrggbb »; empty = free choice), outline.
			'cap_enabled'        => array( 'noir', 'blanc', 'bleu-royal', 'rouge' ),
			'text_colors'        => '',
			'text_outline'       => 'yes',
			'reassurance'        => "Personnalisation incluse dans le prix\nCommande dès 1 gapette\nImprimée par nos soins dans notre atelier",
		);
	}

	/** Quantity discount rule, or null when it is switched off. */
	public static function discount_rule() {
		$min = (int) self::get( 'qty_discount_min' );
		$pct = (float) self::get( 'qty_discount_pct' );
		if ( $min < 2 || $pct <= 0 || $pct >= 100 ) return null;
		return apply_filters( 'atelier_gapette_quantity_discount', array( 'min' => $min, 'pct' => $pct ) );
	}

	/** "10" or "12,5": the percentage as written to the customer. */
	public static function format_pct( $pct ) {
		return str_replace( '.', ',', (string) ( round( (float) $pct, 2 ) + 0 ) );
	}

	/** Reassurance lines shown under the add-to-cart button (4 at most). */
	public static function reassurance() {
		$lines = array_filter( array_map( 'trim', preg_split( '/\R/u', (string) self::get( 'reassurance' ) ) ), 'strlen' );
		return array_slice( array_values( $lines ), 0, 4 );
	}

	/** Solid model: plain cap in catalogue colours + required text (0.8). */
	public static function is_solid() {
		return 'full' !== self::get( 'model' );
	}

	/** 0.12: ids of the cap colours on sale. */
	public static function enabled_cap_ids() {
		$ids = self::get( 'cap_enabled' );
		return is_array( $ids ) ? array_values( array_map( 'strval', $ids ) ) : array();
	}

	/** 0.12: printable text colours, [ [ 'hex' => '#141414', 'label' => 'Noir' ], … ]. Empty = free choice. */
	public static function text_palette() {
		$out = array();
		foreach ( preg_split( '/\R/u', (string) self::get( 'text_colors' ) ) as $line ) {
			if ( ! preg_match( '/#([0-9a-fA-F]{6})\b/', $line, $m ) ) continue;
			$hex = '#' . strtolower( $m[1] );
			if ( isset( $out[ $hex ] ) ) continue;
			$out[ $hex ] = array( 'hex' => $hex, 'label' => sanitize_text_field( trim( str_replace( $m[0], '', $line ), " \t:-–—" ) ) );
		}
		return array_slice( array_values( $out ), 0, 8 );
	}

	/** 0.12: the outline needs a second colour: off by default while the text palette is restricted. */
	public static function text_outline_allowed() {
		return 'yes' === self::get( 'text_outline' ) || ! self::text_palette();
	}

	private static function clean_text_colors( $raw ) {
		$lines = array();
		foreach ( preg_split( '/\R/u', (string) $raw ) as $line ) {
			if ( ! preg_match( '/#([0-9a-fA-F]{6})\b/', $line, $m ) ) continue;
			$label   = sanitize_text_field( trim( str_replace( $m[0], '', $line ), " \t:-–—" ) );
			$lines[] = trim( $label . ' #' . strtolower( $m[1] ) );
		}
		return implode( "\n", array_slice( array_values( array_unique( $lines ) ), 0, 8 ) );
	}

	public static function get( $key ) {
		// 0.9.2: no text surcharge any more — the text is included in the product price.
		if ( 'text_surcharge' === $key ) return '0';
		$o = wp_parse_args( (array) get_option( self::OPTION, array() ), self::defaults() );
		return $o[ $key ] ?? null;
	}

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
	}

	public static function menu() {
		$parent = class_exists( 'WooCommerce' ) ? 'woocommerce' : 'options-general.php';
		add_submenu_page( $parent, 'Atelier Gapette', 'Atelier Gapette', class_exists( 'WooCommerce' ) ? 'manage_woocommerce' : 'manage_options', 'atelier-gapette', array( __CLASS__, 'page' ) );
	}

	public static function register() {
		register_setting( 'atelier_gapette', self::OPTION, array( 'sanitize_callback' => array( __CLASS__, 'sanitize' ) ) );
	}

	public static function sanitize( $in ) {
		$in = (array) $in;
		return array(
			'notification_email' => sanitize_email( $in['notification_email'] ?? '' ),
			'text_surcharge'     => '0',
			'sticky_offset'      => max( 0, min( 300, intval( $in['sticky_offset'] ?? 0 ) ) ),
			'auto_product'       => empty( $in['auto_product'] ) ? 'no' : 'yes',
			'model'              => ( $in['model'] ?? 'solid' ) === 'full' ? 'full' : 'solid',
			'dedicated'          => empty( $in['dedicated'] ) ? 'no' : 'yes',
			'tracking'           => empty( $in['tracking'] ) ? 'no' : 'yes',
			'track_standard_cart' => empty( $in['track_standard_cart'] ) ? 'no' : 'yes',
			'flat_view'          => empty( $in['flat_view'] ) ? 'no' : 'yes',
			'cap_enabled'        => array_values( array_intersect( array_keys( AG_Schema::all_cap_colors() ), array_map( 'sanitize_key', (array) ( $in['cap_enabled'] ?? array() ) ) ) ),
			'text_colors'        => self::clean_text_colors( $in['text_colors'] ?? '' ),
			'text_outline'       => empty( $in['text_outline'] ) ? 'no' : 'yes',
			'qty_discount_min'   => max( 0, min( 999, intval( $in['qty_discount_min'] ?? 0 ) ) ),
			'qty_discount_pct'   => max( 0, min( 90, round( (float) str_replace( ',', '.', (string) ( $in['qty_discount_pct'] ?? 0 ) ), 2 ) ) ),
			'reassurance'        => implode( "\n", array_slice( array_values( array_filter( array_map( 'sanitize_text_field', preg_split( '/\R/u', (string) ( $in['reassurance'] ?? '' ) ) ), 'strlen' ) ), 0, 4 ) ),
		);
	}

	public static function page() {
		$o = wp_parse_args( (array) get_option( self::OPTION, array() ), self::defaults() );
		$n = self::OPTION;
		?>
		<div class="wrap">
			<h1>Atelier Gapette</h1>
			<p>Shortcode : <code>[atelier_gapette]</code> (configurateur seul) · <code>[atelier_gapette product_id="123"]</code> (avec ajout au panier, produit simple dont la personnalisation est activée).
			Sur une fiche produit dont la case « Atelier Gapette » est cochée, le configurateur s’affiche automatiquement sous le résumé du produit.</p>
			<form method="post" action="options.php">
				<?php settings_fields( 'atelier_gapette' ); ?>
				<table class="form-table" role="presentation">
					<tr><th scope="row"><label for="ag-model">Modèle proposé</label></th>
						<td><select id="ag-model" name="<?php echo esc_attr( $n ); ?>[model]">
							<option value="solid" <?php selected( $o['model'], 'solid' ); ?>>Gapette unie + texte (<?php echo esc_html( implode( ', ', wp_list_pluck( AG_Schema::cap_colors(), 'label' ) ) ); ?>)</option>
							<option value="full" <?php selected( $o['model'], 'full' ); ?>>Atelier complet (motifs, palettes, couleurs libres)</option>
						</select>
						<p class="description">« Gapette unie + texte » : le client choisit la couleur de la gapette (reliée à l’attribut Couleur du produit) et saisit un texte, obligatoire à la commande.</p></td></tr>
					<tr><th scope="row">Couleurs de gapette proposées</th>
						<td><?php foreach ( AG_Schema::all_cap_colors() as $id => $c ) : ?>
						<label style="margin-right:1.2em"><input type="checkbox" name="<?php echo esc_attr( $n ); ?>[cap_enabled][]" value="<?php echo esc_attr( $id ); ?>" <?php checked( in_array( $id, (array) $o['cap_enabled'], true ) ); ?>> <?php echo esc_html( $c['label'] ); ?></label>
						<?php endforeach; ?>
						<p class="description">Seules les couleurs cochées sont proposées au client, et le serveur refuse les autres à l’ajout au panier. Désactivez aussi les variations correspondantes du produit dans WooCommerce.</p></td></tr>
					<tr><th scope="row"><label for="ag-textcolors">Couleurs de texte</label></th>
						<td><textarea id="ag-textcolors" class="regular-text" rows="3" name="<?php echo esc_attr( $n ); ?>[text_colors]"><?php echo esc_textarea( $o['text_colors'] ); ?></textarea>
						<p class="description">Une couleur par ligne, au format « Nom #rrggbb » (exemple : <code>Noir #141414</code>). Seules ces couleurs sont proposées pour le texte, et le serveur refuse les autres. Laisser vide pour une palette libre.</p>
						<label><input type="checkbox" name="<?php echo esc_attr( $n ); ?>[text_outline]" value="1" <?php checked( $o['text_outline'], 'yes' ); ?>> Autoriser le contour du texte (une deuxième couleur à imprimer)</label></td></tr>
					<tr><th scope="row"><label for="ag-email">Email atelier</label></th>
						<td><input id="ag-email" type="email" class="regular-text" name="<?php echo esc_attr( $n ); ?>[notification_email]" value="<?php echo esc_attr( $o['notification_email'] ); ?>">
						<p class="description">Reçoit le récapitulatif, le JSON et l’aperçu de chaque commande personnalisée.</p></td></tr>
					<tr><th scope="row">Fiche produit</th>
						<td><label><input type="checkbox" name="<?php echo esc_attr( $n ); ?>[auto_product]" value="1" <?php checked( $o['auto_product'], 'yes' ); ?>> Afficher automatiquement le configurateur sous le résumé du produit</label>
						<p class="description">Décochez pour le placer vous-même : ajoutez un bloc Shortcode <code>[atelier_gapette]</code> dans le modèle « Produit unique » (thèmes à blocs) ; il se relie alors au bouton d’ajout au panier de la fiche.</p></td></tr>
					<tr><th scope="row">Vue à plat</th>
						<td><label><input type="checkbox" name="<?php echo esc_attr( $n ); ?>[flat_view]" value="1" <?php checked( $o['flat_view'], 'yes' ); ?>> Le client place ses textes sur la visière à plat, à l’échelle (155 × 55 mm)</label>
						<p class="description">La photo en 3/4 reste au-dessus comme aperçu réaliste, mise à jour en direct. Décochez pour revenir à l’édition directement sur la photo.</p></td></tr>
					<tr><th scope="row">Fiche dédiée</th>
						<td><label><input type="checkbox" name="<?php echo esc_attr( $n ); ?>[dedicated]" value="1" <?php checked( $o['dedicated'], 'yes' ); ?>> Le configurateur remplace la galerie du produit, sur toute la largeur de la page</label>
						<p class="description">Sur les fiches où « Atelier Gapette » est coché : la galerie WooCommerce et la barre latérale sont retirées, l’aperçu fait office d’image produit, et le prix, la quantité et le bouton d’ajout au panier sont placés à la fin des réglages. Les autres produits ne changent pas.</p></td></tr>
					<tr><th scope="row"><label for="ag-sticky">Décalage de l’aperçu fixe (px)</label></th>
						<td><input id="ag-sticky" type="number" min="0" max="300" class="small-text" name="<?php echo esc_attr( $n ); ?>[sticky_offset]" value="<?php echo esc_attr( $o['sticky_offset'] ); ?>">
						<p class="description">Hauteur de l’en-tête fixe du thème, pour que l’aperçu ne passe pas dessous.</p></td></tr>
					<tr><th scope="row">Remise quantité</th>
						<td><label for="ag-qd-pct">Remise de</label> <input id="ag-qd-pct" type="number" min="0" max="90" step="0.5" class="small-text" name="<?php echo esc_attr( $n ); ?>[qty_discount_pct]" value="<?php echo esc_attr( $o['qty_discount_pct'] ); ?>"> %
						<label for="ag-qd-min">à partir de</label> <input id="ag-qd-min" type="number" min="0" max="999" step="1" class="small-text" name="<?php echo esc_attr( $n ); ?>[qty_discount_min]" value="<?php echo esc_attr( $o['qty_discount_min'] ); ?>"> gapettes personnalisées
						<p class="description">Le seuil compte toutes les gapettes personnalisées du panier, même réparties sur plusieurs lignes (textes ou couleurs différents). La remise est calculée par le serveur sur le prix de chaque gapette personnalisée ; elle s’ajoute aux codes promo éventuels. Mettre 0 pour ne proposer aucune remise.</p></td></tr>
					<tr><th scope="row"><label for="ag-reassurance">Réassurance</label></th>
						<td><textarea id="ag-reassurance" class="large-text" rows="4" name="<?php echo esc_attr( $n ); ?>[reassurance]"><?php echo esc_textarea( $o['reassurance'] ); ?></textarea>
						<p class="description">Une ligne par engagement (4 au maximum), affichées sous le bouton d’ajout au panier. Exemple à ajouter : votre délai de fabrication. Laisser vide pour ne rien afficher.</p></td></tr>
					<tr><th scope="row">Suivi GA4</th>
						<td><label><input type="checkbox" name="<?php echo esc_attr( $n ); ?>[tracking]" value="1" <?php checked( $o['tracking'], 'yes' ); ?>> Envoyer les événements du configurateur et les clics vers cette fiche à Google Analytics</label>
						<p class="description">Événements : <code>config_started</code>, <code>color_selected</code>, <code>text_added</code>, <code>text_removed</code>, <code>font_changed</code>, <code>position_changed</code>, <code>visor_view_changed</code>, <code>preview_zoomed</code>, <code>undo_used</code>, <code>redo_used</code>, <code>config_reset</code>, <code>advanced_settings_opened</code>, <code>overflow_warning</code>, <code>validation_error</code>, <code>config_add_to_cart</code>, <code>add_to_cart_failed</code>, <code>cta_click</code>, <code>feature_interest</code> (clic sur « Enregistrer », « Partager » ou « Ajouter un logo », fonctions annoncées : paramètre <code>feature</code>). Ils passent par <code>gtag()</code> (Site Kit) : rien n’est envoyé tant que Google Analytics n’est pas chargé, donc le bandeau de consentement reste prioritaire.</p>
						<label><input type="checkbox" name="<?php echo esc_attr( $n ); ?>[track_standard_cart]" value="1" <?php checked( $o['track_standard_cart'], 'yes' ); ?>> Envoyer aussi l’événement standard <code>add_to_cart</code></label>
						<p class="description">À cocher seulement si GA4 (DebugView) ne reçoit pas déjà <code>add_to_cart</code> via Site Kit lors d’un ajout depuis le configurateur : sinon l’ajout serait compté deux fois.</p></td></tr>
				</table>
				<?php submit_button(); ?>
			</form>
			<?php if ( class_exists( 'AG_Setup' ) ) AG_Setup::box(); ?>
		</div>
		<?php
	}
}
