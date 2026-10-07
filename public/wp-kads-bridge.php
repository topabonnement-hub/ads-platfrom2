<?php
/**
 * Plugin Name: AdPlatform Bridge (WP Kads Alternative)
 * Plugin URI: https://github.com/adplatform/adplatform
 * Description: Clean, ultra-fast, and secure self-hosted ad manager. 100% compatible with legacy [WP_KADS id=X] shortcodes and modern [adplatform id="..."] embeds.
 * Version: 1.0.0
 * Author: AdPlatform
 * Author URI: https://github.com/adplatform
 * License: MIT
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class AdPlatform_WordPress_Bridge {

    const OPTION_SERVER_URL = 'adplatform_server_url';
    const OPTION_SITE_PUBLIC_KEY = 'adplatform_site_public_key';
    const OPTION_AUTO_INJECT_HEAD = 'adplatform_auto_inject_head';

    public function __construct() {
        // Enqueue adslot.js script in front-end
        add_action('wp_enqueue_scripts', array($this, 'enqueue_adplatform_script'));

        // Shortcode handlers
        // Legacy WP Kads: [WP_KADS id=1] or [WP_KADS id="1"] or [wp_kads id=1]
        add_shortcode('WP_KADS', array($this, 'render_legacy_wp_kads_shortcode'));
        add_shortcode('wp_kads', array($this, 'render_legacy_wp_kads_shortcode'));
        
        // Native AdPlatform shortcode: [adplatform id="slot_xxx"]
        add_shortcode('adplatform', array($this, 'render_native_adplatform_shortcode'));
        add_shortcode('ad_slot', array($this, 'render_native_adplatform_shortcode'));

        // Admin Settings Page
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
    }

    /**
     * Enqueue lightweight adslot.js tag
     */
    public function enqueue_adplatform_script() {
        $server_url = get_option(self::OPTION_SERVER_URL, '');
        $public_key = get_option(self::OPTION_SITE_PUBLIC_KEY, '');

        if (empty($server_url)) {
            return;
        }

        $script_url = rtrim($server_url, '/') . '/adslot.js';

        wp_enqueue_script(
            'adplatform-adslot',
            $script_url,
            array(),
            '1.0.0',
            true // Load in footer or async
        );

        // Pass platform key and configuration
        if (!empty($public_key)) {
            wp_add_inline_script(
                'adplatform-adslot',
                'window.__AdPlatform_Host = ' . json_encode(rtrim($server_url, '/')) . '; window.__AdPlatform_PublicKey = ' . json_encode($public_key) . ';',
                'before'
            );
        }
    }

    /**
     * Handle Legacy WP Kads shortcode: [WP_KADS id=1]
     */
    public function render_legacy_wp_kads_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => '',
            'class' => '',
        ), $atts, 'WP_KADS');

        $slot_id = trim($atts['id']);
        if (empty($slot_id)) {
            return '<!-- AdPlatform: Missing slot ID -->';
        }

        $extra_class = !empty($atts['class']) ? ' ' . esc_attr($atts['class']) : '';

        // Output semantic container matching adslot.js detection
        return sprintf(
            '<div class="adplatform-slot%s" data-ad-slot="%s" data-wp-kads="%s" style="min-height:20px; margin: 12px auto; text-align: center;"></div>',
            $extra_class,
            esc_attr($slot_id),
            esc_attr($slot_id)
        );
    }

    /**
     * Handle Native AdPlatform shortcode: [adplatform id="slot_abc123"]
     */
    public function render_native_adplatform_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => '',
            'class' => '',
        ), $atts, 'adplatform');

        $slot_id = trim($atts['id']);
        if (empty($slot_id)) {
            return '<!-- AdPlatform: Missing slot ID -->';
        }

        $extra_class = !empty($atts['class']) ? ' ' . esc_attr($atts['class']) : '';

        return sprintf(
            '<div class="adplatform-slot%s" data-ad-slot="%s" style="min-height:20px; margin: 12px auto; text-align: center;"></div>',
            $extra_class,
            esc_attr($slot_id)
        );
    }

    /**
     * Register WordPress admin menu for AdPlatform
     */
    public function register_admin_menu() {
        add_options_page(
            'AdPlatform Settings',
            'AdPlatform (WP Kads)',
            'manage_options',
            'adplatform-settings',
            array($this, 'render_admin_page')
        );
    }

    public function register_settings() {
        register_setting('adplatform_options_group', self::OPTION_SERVER_URL, array('sanitize_callback' => 'esc_url_raw'));
        register_setting('adplatform_options_group', self::OPTION_SITE_PUBLIC_KEY, array('sanitize_callback' => 'sanitize_text_field'));
    }

    public function render_admin_page() {
        ?>
        <div class="wrap" style="max-width: 800px; background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 20px;">
            <h1 style="display:flex; align-items:center; gap: 10px; margin-bottom: 20px;">
                <span style="background: #0284c7; color:#fff; border-radius: 6px; padding: 4px 10px; font-size:16px;">AdPlatform</span>
                WordPress Bridge & WP Kads Migration
            </h1>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                This plugin connects your WordPress website directly to your self-hosted <strong>AdPlatform</strong> server. All legacy <code>[WP_KADS id=X]</code> shortcodes in your posts, pages, and widgets will automatically render ads from your AdPlatform dashboard without modifying old content!
            </p>

            <form method="post" action="options.php" style="margin-top: 25px;">
                <?php settings_fields('adplatform_options_group'); ?>
                <?php do_settings_sections('adplatform_options_group'); ?>

                <table class="form-table" role="presentation">
                    <tr valign="top">
                        <th scope="row" style="width: 220px; font-weight:600;">AdPlatform Server URL</th>
                        <td>
                            <input type="url" name="<?php echo esc_attr(self::OPTION_SERVER_URL); ?>" value="<?php echo esc_attr(get_option(self::OPTION_SERVER_URL)); ?>" class="regular-text" placeholder="https://your-adplatform-instance.com" required style="width: 100%; max-width: 450px;" />
                            <p class="description">The URL where your self-hosted AdPlatform instance is hosted.</p>
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row" style="font-weight:600;">Site Public Key (Optional)</th>
                        <td>
                            <input type="text" name="<?php echo esc_attr(self::OPTION_SITE_PUBLIC_KEY); ?>" value="<?php echo esc_attr(get_option(self::OPTION_SITE_PUBLIC_KEY)); ?>" class="regular-text" placeholder="pk_xxxxxxxxxxxxxxxx" style="width: 100%; max-width: 450px;" />
                            <p class="description">Copy this from your AdPlatform dashboard &gt; Sites list.</p>
                        </td>
                    </tr>
                </table>

                <?php submit_button('Save AdPlatform Settings', 'primary', 'submit', true, array('style' => 'background:#0284c7; border-color:#0284c7; font-weight:600; padding:4px 20px;')); ?>
            </form>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />

            <h2 style="font-size: 16px; margin-bottom: 12px;">Supported Shortcodes:</h2>
            <ul style="list-style: disc; padding-left: 20px; color: #334155; line-height: 1.8;">
                <li><code>[WP_KADS id=1]</code> &mdash; Legacy WP Kads shortcode format (100% backward compatible).</li>
                <li><code>[WP_KADS id="2"]</code> &mdash; Legacy with quotes.</li>
                <li><code>[adplatform id="slot_abc123"]</code> &mdash; Native AdPlatform slot ID.</li>
            </ul>
        </div>
        <?php
    }
}

new AdPlatform_WordPress_Bridge();
