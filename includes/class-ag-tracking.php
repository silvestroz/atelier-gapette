<?php
/**
 * GA4 event tracking for links that lead to the personalised-cap product (0.9.4).
 * The configurator's own events live in assets/src/track.js; this adds the `cta_click`
 * event for the rest of the site (menu, articles, guides). Events go through gtag()
 * when the page defines it, so the consent banner stays in charge.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AG_Tracking {

	public static function init() {
		add_action( 'wp_footer', array( __CLASS__, 'cta_script' ), 50 );
	}

	/** Path of the personalised product (setup option), without trailing slash. */
	private static function target_path() {
		$id = (int) get_option( 'atelier_gapette_product_id' );
		if ( ! $id || 'publish' !== get_post_status( $id ) ) return '';
		$path = wp_parse_url( get_permalink( $id ), PHP_URL_PATH );
		return $path ? untrailingslashit( $path ) : '';
	}

	public static function cta_script() {
		if ( is_admin() || is_feed() || 'yes' !== AG_Settings::get( 'tracking' ) ) return;
		$path = self::target_path();
		if ( ! $path ) return;
		?>
<script id="ag-cta-tracking">
(function(){var P=<?php echo wp_json_encode( $path ); ?>;
document.addEventListener('click',function(e){
var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a||typeof window.gtag!=='function')return;
var u;try{u=new URL(a.href,location.href)}catch(x){return}
if(u.origin!==location.origin||u.pathname.replace(/\/$/,'')!==P||location.pathname.replace(/\/$/,'')===P)return;
var s=a.closest('nav,.main-navigation,header')?'menu':a.closest('footer')?'footer':a.closest('article,.entry-content,.inside-article')?'contenu':'autre';
window.gtag('event','cta_click',{cta_target:'configurateur',link_source:s,link_text:(a.textContent||'').trim().slice(0,60),source_path:location.pathname,transport_type:'beacon'});
},true);})();
</script>
		<?php
	}
}
