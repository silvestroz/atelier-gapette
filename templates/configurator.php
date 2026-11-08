<?php
/**
 * Configurator markup. Everything is scoped under .atelier-gapette and looked up
 * by data-ag attributes, so several instances can live on the same page.
 *
 * @var string          $uid      unique prefix for label/for pairs
 * @var array           $options  passed to mount() (data-ag-options)
 * @var WC_Product|null $product  simple product for the built-in order form
 */
if ( ! defined( 'ABSPATH' ) ) exit;
$ag_id = function ( $name ) use ( $uid ) { return esc_attr( $uid . '-' . $name ); };
$ag_solid     = ! empty( $options['solid'] );
$ag_bleed     = ! empty( $options['order']['relocate'] );
$ag_has_order = $product || ( $options['order']['mode'] ?? '' ) === 'product';
$ag_rule      = $ag_has_order ? AG_Settings::discount_rule() : null;
$ag_qty_note  = $ag_rule ? sprintf( '−%s %% dès %d gapettes personnalisées', AG_Settings::format_pct( $ag_rule['pct'] ), (int) $ag_rule['min'] ) : '';
$ag_reassure  = $ag_has_order ? AG_Settings::reassurance() : array();
?>
<div class="atelier-gapette<?php echo ( function_exists( 'wp_is_block_theme' ) && wp_is_block_theme() ) ? ' alignwide' : ''; ?><?php echo ! empty( $options['flat'] ) ? ' ag-has-flat' : ''; ?><?php echo $ag_solid ? ' ag-solid' : ''; ?><?php echo $ag_bleed ? ' ag-bleed' : ''; ?>" data-ag-root data-ag-options="<?php echo esc_attr( wp_json_encode( $options ) ); ?>">
<div class="ag-main">
	<section class="studio" data-ag="studio" aria-label="<?php esc_attr_e( 'Aperçu de votre gapette', 'atelier-gapette' ); ?>">
		<div class="ag-studio-bar ag-studio-bar-left" role="group" aria-label="Historique">
			<button type="button" class="ag-chip" data-ag="undo" disabled title="Annuler (Ctrl+Z)"><span class="ag-ico ag-ico-annuler" aria-hidden="true"></span> Annuler</button>
			<button type="button" class="ag-chip ag-chip-icon" data-ag="redo" disabled title="Rétablir (Ctrl+Maj+Z)"><span class="ag-ico ag-ico-retablir" aria-hidden="true"></span><span class="screen-reader-text">Rétablir</span></button>
		</div>
		<div class="ag-viewer" data-ag="viewer" tabindex="0" role="img" aria-label="Gapette en vue de trois quarts. Choisissez la visière baissée ou relevée."><div class="ag-render-error" data-ag="render-error" role="alert" hidden>L’aperçu n’a pas pu être chargé. Vos réglages sont conservés : rechargez la page pour réessayer.</div></div>
		<div class="ag-studio-bar ag-studio-bar-right">
			<div class="view-controls" role="group" aria-label="Position de la visière"><button type="button" class="active" data-view="top" aria-pressed="true">Visière baissée</button><button type="button" data-view="bottom" aria-pressed="false">Visière relevée</button></div>
			<button type="button" class="detail-toggle ag-chip" data-ag="detail-toggle" aria-pressed="false"><span class="ag-ico ag-ico-zoom" aria-hidden="true"></span> <span data-ag="detail-label">Zoom sur le texte</span></button>
		</div>
		<div class="ag-toast" data-ag="toast" role="status" aria-live="polite" hidden></div>
		<div class="ag-text-toolbar" data-ag="text-toolbar" role="toolbar" aria-label="Modifier le texte sur l’aperçu" tabindex="-1" hidden>
			<div class="ag-tb-row">
				<label class="screen-reader-text" for="<?php echo $ag_id( 'tb-text' ); ?>">Texte</label>
				<input id="<?php echo $ag_id( 'tb-text' ); ?>" data-ag="tb-text" class="ag-tb-text" type="text" maxlength="48" autocomplete="off" placeholder="Votre texte">
				<label class="screen-reader-text" for="<?php echo $ag_id( 'tb-font' ); ?>">Typographie</label>
				<select id="<?php echo $ag_id( 'tb-font' ); ?>" data-ag="tb-font" class="ag-tb-font"></select>
			</div>
			<div class="ag-tb-row">
				<div class="ag-tb-group" role="group" aria-label="Forme du texte">
					<button type="button" data-shape="arc" aria-pressed="true" title="Arrondi"><span aria-hidden="true">⌒</span><span class="screen-reader-text">Arrondi</span></button>
					<button type="button" data-shape="straight" aria-pressed="false" title="Droit"><span aria-hidden="true">—</span><span class="screen-reader-text">Droit</span></button>
					<button type="button" data-shape="axis" aria-pressed="false" title="Dans l’axe de la visière"><span aria-hidden="true">⟂</span><span class="screen-reader-text">Dans l’axe de la visière</span></button>
				</div>
				<div class="ag-tb-group" role="group" aria-label="Taille du texte">
					<button type="button" data-ag="tb-smaller" title="Plus petit"><span aria-hidden="true">A−</span><span class="screen-reader-text">Plus petit</span></button>
					<output data-ag="tb-size" aria-live="off">100 %</output>
					<button type="button" data-ag="tb-bigger" title="Plus grand"><span aria-hidden="true">A+</span><span class="screen-reader-text">Plus grand</span></button>
				</div>
				<div class="ag-tb-group" role="group" aria-label="Inclinaison du texte">
					<button type="button" data-ag="tb-rot-minus" title="Pivoter de −15°"><span aria-hidden="true">↺</span><span class="screen-reader-text">Pivoter de moins 15 degrés</span></button>
					<output data-ag="tb-rot" aria-live="off">0°</output>
					<button type="button" data-ag="tb-rot-plus" title="Pivoter de +15°"><span aria-hidden="true">↻</span><span class="screen-reader-text">Pivoter de plus 15 degrés</span></button>
				</div>
				<button type="button" class="ag-tb-icon" data-ag="tb-center" title="Recentrer"><span aria-hidden="true">⊕</span><span class="screen-reader-text">Recentrer</span></button>
				<button type="button" class="ag-tb-icon ag-tb-delete" data-ag="tb-delete" title="Supprimer ce texte"><span class="ag-ico ag-ico-corbeille" aria-hidden="true"></span><span class="screen-reader-text">Supprimer ce texte</span></button>
				<button type="button" class="ag-tb-done" data-ag="tb-done">OK</button>
			</div>
		</div>
		<p class="screen-reader-text" data-ag="edit-status" role="status" aria-live="polite"></p>
		<?php if ( ! empty( $options['flat'] ) ) : ?>
		<div class="ag-flat" data-ag="flat">
			<div class="ag-flat-head"><span class="ag-flat-title">À plat <span class="ag-flat-face">· <span data-ag="flat-face">dessus de la visière</span></span></span><span class="ag-flat-dims">Visière 155 × 55 mm</span></div>
			<div class="ag-flat-stage" data-ag="flat-stage" tabindex="0" role="img" aria-label="Visière à plat, à l’échelle : glissez un texte pour le placer ; flèches pour l’ajuster au millimètre (Maj : 5 mm), plus et moins pour la taille."></div>
			<p class="ag-flat-help">Glissez le texte pour le placer · poignées pour l’agrandir ou l’incliner · quadrillage de 1 cm</p>
		</div>
		<?php endif; ?>
	</section>
	<aside class="settings" aria-label="Personnalisation">
		<div class="settings-heading"><h2>Personnaliser</h2><button type="button" class="text-button ag-reset-all" data-ag="reset-all">Réinitialiser</button></div>

		<?php if ( $ag_solid ) : ?>
		<section class="setting-section ag-cap-section"><h3><span class="step">01</span> La couleur <output data-ag="cap-color-name"></output></h3>
			<div class="ag-cap-colors" data-ag="cap-colors" role="group" aria-label="Couleur de la gapette"></div>
		</section>
		<?php endif; ?>
		<section class="setting-section ag-pattern-section"<?php echo $ag_solid ? ' hidden' : ''; ?>><h3><span class="step">01</span> Le motif <output data-ag="pattern-name">Peloton</output></h3>
			<div class="patterns" data-ag="patterns" role="group" aria-label="Motif de la casquette"></div>
			<div class="palette-row"><span>Palettes de départ</span><div class="palettes" data-ag="palettes" role="group" aria-label="Palette de couleurs"></div></div>
			<div class="image-import">
				<p class="field-label">Votre image ou photo</p>
				<div class="ag-file">
					<input id="<?php echo $ag_id( 'image-upload' ); ?>" data-ag="image-upload" class="ag-file-input" type="file" accept="image/jpeg,image/png,image/webp">
					<label for="<?php echo $ag_id( 'image-upload' ); ?>" class="ag-file-button"><span class="ag-ico ag-ico-plus" aria-hidden="true"></span> Choisir une image</label>
					<span class="ag-file-name" data-ag="image-name">Aucune image</span>
				</div>
				<p class="field-help">JPG, PNG ou WebP, 10 Mo max. Elle reste sur votre appareil<?php echo $product || ( $options['order']['mode'] ?? '' ) === 'product' ? ' — aperçu seulement, pas encore disponible à la commande' : ''; ?>.</p>
				<p class="field-help ag-image-status" data-ag="image-status" role="status" aria-live="polite"></p>
				<div data-ag="image-controls" hidden>
					<div class="image-actions"><button type="button" data-ag="use-image" aria-pressed="false">Utiliser mon image</button><button type="button" data-ag="remove-image">Retirer</button></div>
					<label for="<?php echo $ag_id( 'image-scale' ); ?>" class="field-label size-label">Zoom de l’image <output data-ag="image-scale-value">100 %</output></label><input id="<?php echo $ag_id( 'image-scale' ); ?>" data-ag="image-scale" type="range" min="100" max="300" value="100" step="5">
					<label for="<?php echo $ag_id( 'image-x' ); ?>" class="field-label">Cadrage horizontal <output data-ag="image-x-value">0</output></label><input id="<?php echo $ag_id( 'image-x' ); ?>" data-ag="image-x" type="range" min="-100" max="100" value="0">
					<label for="<?php echo $ag_id( 'image-y' ); ?>" class="field-label">Cadrage vertical <output data-ag="image-y-value">0</output></label><input id="<?php echo $ag_id( 'image-y' ); ?>" data-ag="image-y" type="range" min="-100" max="100" value="0">
					<button type="button" class="text-button" data-ag="reset-image">Réinitialiser le cadrage</button>
				</div>
			</div>
			<div class="custom-colors"><div class="colors-heading"><span>Vos couleurs</span><output data-ag="palette-name">Encre &amp; citron</output></div><div class="color-grid">
				<?php foreach ( AG_Schema::color_labels() as $key => $label ) : ?>
					<label class="surface-color"><span class="ag-surface-label"><?php echo esc_html( $label ); ?></span> <input type="color" data-surface-color="<?php echo esc_attr( $key ); ?>" value="#17343d" aria-label="<?php echo esc_attr( 'Couleur ' . $label ); ?>"><span class="ag-surface-name" data-color-value="<?php echo esc_attr( $key ); ?>"></span></label>
				<?php endforeach; ?>
			</div></div>
		</section>

		<section class="setting-section text-section"><h3><span class="step">02</span> Vos textes sur la visière</h3>
			<div class="ag-text-tabs" data-ag="text-tabs" role="group" aria-label="Textes (<?php echo (int) AG_Schema::MAX_TEXTS; ?> maximum)"></div>
			<label for="<?php echo $ag_id( 'text' ); ?>" class="field-label">Votre texte <span data-ag="character-count"><?php echo $ag_solid ? '0' : '14'; ?> / 24</span></label>
			<input id="<?php echo $ag_id( 'text' ); ?>" data-ag="cap-text" type="text" maxlength="48" value="<?php echo $ag_solid ? '' : 'ROULE MA POULE'; ?>" placeholder="Votre devise, votre prénom…" autocomplete="off" aria-describedby="<?php echo $ag_id( 'text-help' ); ?> <?php echo $ag_id( 'text-error' ); ?>">
			<p class="field-help" id="<?php echo $ag_id( 'text-help' ); ?>">24 caractères maximum, espaces compris. Lettres, chiffres, accents et ponctuation courante.</p>
			<p class="ag-text-error" id="<?php echo $ag_id( 'text-error' ); ?>" data-ag="text-error" role="alert" hidden></p>
			<button type="button" class="text-button ag-remove-text" data-ag="remove-text" hidden><span class="ag-ico ag-ico-corbeille" aria-hidden="true"></span> Supprimer ce texte</button>
			<fieldset class="placement"><legend>Où l’écrire ?</legend><div class="segmented">
				<label><input type="radio" name="<?php echo $ag_id( 'placement' ); ?>" data-ag-placement value="top" checked><span>Sur le dessus</span></label>
				<label><input type="radio" name="<?php echo $ag_id( 'placement' ); ?>" data-ag-placement value="bottom"><span>Sur le dessous</span></label>
			</div></fieldset>
			<div class="ag-field-group" role="group" aria-labelledby="<?php echo $ag_id( 'fonts-label' ); ?>">
				<p class="field-label" id="<?php echo $ag_id( 'fonts-label' ); ?>">Typographie <output data-ag="font-name">Sport</output></p>
				<div class="fonts" data-ag="fonts"></div>
			</div>
			<div class="ag-field-group" role="group" aria-labelledby="<?php echo $ag_id( 'color-title' ); ?>">
				<p class="field-label" id="<?php echo $ag_id( 'color-title' ); ?>">Couleur du texte <output data-ag="color-label">Blanc</output></p>
				<div class="ag-swatches" data-ag="text-swatches"></div>
				<div class="ag-color-extra">
					<label class="ag-swatch-other"><input data-ag="text-color" type="color" value="#ffffff" aria-label="Autre couleur du texte"><span>Autre couleur…</span></label>
					<label class="outline-control"><input data-ag="outline" type="checkbox"><span>Contour</span></label>
				</div>
			</div>
			<fieldset class="placement ag-shape"><legend>Forme</legend>
				<div class="image-actions ag-shapes">
					<button type="button" data-shape="arc" aria-pressed="true"><span class="ag-shape-icon" aria-hidden="true">⌒</span>Arrondi</button>
					<button type="button" data-shape="straight" aria-pressed="false"><span class="ag-shape-icon" aria-hidden="true">—</span>Droit</button>
					<button type="button" data-shape="axis" aria-pressed="false"><span class="ag-shape-icon" aria-hidden="true">⟂</span>Dans l’axe</button>
				</div>
			</fieldset>
			<p class="field-help ag-fit-note" data-ag="fit-note" role="status" aria-live="polite" hidden></p>
			<div class="ag-direct">
				<button type="button" class="ag-direct-button" data-ag="move-text" aria-pressed="false">Modifier sur l’aperçu</button>
				<p class="field-help" data-ag="move-help">Touchez le texte sur l’aperçu pour le déplacer, l’incliner et l’agrandir.</p>
			</div>
			<details class="ag-fine">
				<summary>Réglages précis</summary>
				<label for="<?php echo $ag_id( 'size' ); ?>" class="field-label size-label">Taille <output data-ag="size-value">100 %</output></label><input id="<?php echo $ag_id( 'size' ); ?>" data-ag="size" type="range" min="30" max="250" value="100" step="5">
				<label for="<?php echo $ag_id( 'curve' ); ?>" class="field-label">Courbure <output data-ag="curve-value">100 %</output></label><input id="<?php echo $ag_id( 'curve' ); ?>" data-ag="curve" type="range" min="-100" max="100" value="100" step="5">
				<label for="<?php echo $ag_id( 'rotation' ); ?>" class="field-label">Inclinaison <output data-ag="rotation-value">0°</output></label><input id="<?php echo $ag_id( 'rotation' ); ?>" data-ag="rotation" type="range" min="-90" max="90" value="0" step="1">
				<label for="<?php echo $ag_id( 'text-x' ); ?>" class="field-label">Position horizontale <output data-ag="text-x-value">0 mm</output></label><input id="<?php echo $ag_id( 'text-x' ); ?>" data-ag="text-x" type="range" min="-100" max="100" value="0" step="1">
				<label for="<?php echo $ag_id( 'text-y' ); ?>" class="field-label">Position verticale <output data-ag="text-y-value">0 mm</output></label><input id="<?php echo $ag_id( 'text-y' ); ?>" data-ag="text-y" type="range" min="-45" max="45" value="0" step="1">
				<button type="button" class="text-button" data-ag="center-text">Recentrer le texte</button>
			</details>
		</section>

		<section class="setting-section ag-logo-section"><h3><span class="step">03</span> Votre logo</h3>
			<button type="button" class="ag-soon-button ag-logo-add" data-ag-soon="logo" data-ag-soon-note="logo"><span class="ag-ico ag-ico-plus" aria-hidden="true"></span> Ajouter un logo</button>
			<p class="field-help ag-soon-note" data-ag="soon-logo" role="status" aria-live="polite"></p>
		</section>

		<?php if ( $product ) : ?>
			<form class="cart ag-order ag-order-form" data-ag="order-form" method="post" enctype="multipart/form-data" action="">
				<p class="ag-price"><?php echo wp_kses_post( $product->get_price_html() ); ?></p>
				<div class="ag-order-row">
					<div class="quantity"><label class="screen-reader-text" for="<?php echo $ag_id( 'qty' ); ?>">Quantité</label><input id="<?php echo $ag_id( 'qty' ); ?>" type="number" name="quantity" value="1" min="1" max="<?php echo esc_attr( $product->get_max_purchase_quantity() > 0 ? $product->get_max_purchase_quantity() : 99 ); ?>" step="1" inputmode="numeric"></div>
					<button type="submit" name="add-to-cart" value="<?php echo esc_attr( $product->get_id() ); ?>" class="ag-order-button"><?php echo esc_html( $product->single_add_to_cart_text() ); ?></button>
				</div>
				<input type="hidden" name="ag_config" value=""><input type="hidden" name="ag_preview" value=""><input type="hidden" name="ag_thumb" value="">
				<?php if ( $ag_qty_note ) : ?><p class="ag-qty-note" data-ag="qty-note" aria-live="polite"><?php echo esc_html( $ag_qty_note ); ?></p><?php endif; ?>
				<p class="ag-order-status" data-ag="order-status" role="status" aria-live="polite"></p>
			</form>
		<?php elseif ( ( $options['order']['mode'] ?? '' ) === 'product' ) : ?>
			<div class="ag-buy" data-ag="buy-slot" hidden></div>
			<?php if ( $ag_qty_note ) : ?><p class="ag-qty-note" data-ag="qty-note" aria-live="polite"><?php echo esc_html( $ag_qty_note ); ?></p><?php endif; ?>
			<p class="ag-order-status" data-ag="order-status" role="status" aria-live="polite"></p>
		<?php endif; ?>
		<?php if ( $ag_reassure ) : ?>
			<ul class="ag-reassurance" aria-label="Nos engagements">
				<?php foreach ( $ag_reassure as $ag_line ) : ?><li><span class="ag-ico ag-ico-check" aria-hidden="true"></span><span><?php echo esc_html( $ag_line ); ?></span></li><?php endforeach; ?>
			</ul>
		<?php endif; ?>

		<div class="configuration-summary"><span class="summary-icon" aria-hidden="true">✳</span><div class="ag-summary-body"><p class="ag-summary-title">Résumé de votre demande</p><p data-ag="summary" aria-live="polite"></p></div></div>

		<div class="ag-soon-actions" role="group" aria-label="Votre création">
			<button type="button" class="ag-soon-button" data-ag-soon="save" data-ag-soon-note="actions"><span class="ag-ico ag-ico-enregistrer" aria-hidden="true"></span> Enregistrer</button>
			<button type="button" class="ag-soon-button" data-ag-soon="share" data-ag-soon-note="actions"><span class="ag-ico ag-ico-partager" aria-hidden="true"></span> Partager</button>
		</div>
		<p class="field-help ag-soon-note" data-ag="soon-actions" role="status" aria-live="polite"></p>

		<details class="ag-config"<?php echo $ag_solid ? ' hidden' : ''; ?>>
			<summary>Code de configuration (exporter / importer)</summary>
			<div class="image-actions"><button type="button" data-ag="config-copy">Copier ma configuration</button><button type="button" data-ag="config-apply">Appliquer le code collé</button></div>
			<label class="screen-reader-text" for="<?php echo $ag_id( 'config' ); ?>">Code de configuration JSON</label>
			<textarea id="<?php echo $ag_id( 'config' ); ?>" data-ag="config-code" spellcheck="false" placeholder='{"schema_version":3,…}'></textarea>
			<p class="field-help" data-ag="config-status" role="status" aria-live="polite"></p>
		</details>

		<p class="preview-note">Aperçu indicatif. Le rendu des couleurs et du placement peut varier à la fabrication.</p>
	</aside>
</div>
<noscript><p>Activez JavaScript pour personnaliser votre gapette.</p></noscript>
</div>
