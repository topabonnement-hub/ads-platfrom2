import React, { useState } from 'react';
import { FileCode2, Download, Copy, Check, ExternalLink, HelpCircle, CheckCircle2, Terminal, Layers } from 'lucide-react';
import { Site, AdSlot } from '../types';
import { Language, translations } from '../i18n';

interface WordPressBridgeTabProps {
  sites: Site[];
  slots: AdSlot[];
  lang: Language;
}

export const WordPressBridgeTab: React.FC<WordPressBridgeTabProps> = ({
  sites,
  slots,
  lang,
}) => {
  const t = translations[lang];
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState(sites.length > 0 ? sites[0].id : '');

  const currentSite = sites.find((s) => s.id === selectedSiteId) || sites[0];
  const legacySlots = slots.filter((s) => s.legacyId);

  const phpPluginCode = `<?php
/**
 * Plugin Name: AdPlatform Bridge (WP Kads Alternative)
 * Plugin URI: https://github.com/adplatform/adplatform
 * Description: Clean, ultra-fast, and secure self-hosted ad manager. 100% compatible with legacy [WP_KADS id=X] shortcodes and modern [adplatform id="..."] embeds.
 * Version: 1.0.0
 * Author: AdPlatform
 * License: MIT
 */

if (!defined('ABSPATH')) exit;

class AdPlatform_WordPress_Bridge {
    const OPTION_SERVER_URL = 'adplatform_server_url';
    const OPTION_SITE_PUBLIC_KEY = 'adplatform_site_public_key';

    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_adplatform_script'));
        add_shortcode('WP_KADS', array($this, 'render_legacy_wp_kads_shortcode'));
        add_shortcode('wp_kads', array($this, 'render_legacy_wp_kads_shortcode'));
        add_shortcode('adplatform', array($this, 'render_native_adplatform_shortcode'));
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
    }

    public function enqueue_adplatform_script() {
        $server_url = get_option(self::OPTION_SERVER_URL, '${window.location.origin}');
        $public_key = get_option(self::OPTION_SITE_PUBLIC_KEY, '${currentSite?.publicKey || ''}');
        if (empty($server_url)) return;

        wp_enqueue_script('adplatform-adslot', rtrim($server_url, '/') . '/adslot.js', array(), '1.0.0', true);
        if (!empty($public_key)) {
            wp_add_inline_script('adplatform-adslot', 'window.__AdPlatform_Host = ' . json_encode(rtrim($server_url, '/')) . '; window.__AdPlatform_PublicKey = ' . json_encode($public_key) . ';', 'before');
        }
    }

    public function render_legacy_wp_kads_shortcode($atts) {
        $atts = shortcode_atts(array('id' => '', 'class' => ''), $atts, 'WP_KADS');
        $slot_id = trim($atts['id']);
        if (empty($slot_id)) return '<!-- AdPlatform: Missing slot ID -->';
        return sprintf('<div class="adplatform-slot%s" data-ad-slot="%s" data-wp-kads="%s" style="min-height:20px; margin: 12px auto; text-align: center;"></div>', !empty($atts['class']) ? ' ' . esc_attr($atts['class']) : '', esc_attr($slot_id), esc_attr($slot_id));
    }

    public function render_native_adplatform_shortcode($atts) {
        $atts = shortcode_atts(array('id' => '', 'class' => ''), $atts, 'adplatform');
        $slot_id = trim($atts['id']);
        if (empty($slot_id)) return '<!-- AdPlatform: Missing slot ID -->';
        return sprintf('<div class="adplatform-slot%s" data-ad-slot="%s" style="min-height:20px; margin: 12px auto; text-align: center;"></div>', !empty($atts['class']) ? ' ' . esc_attr($atts['class']) : '', esc_attr($slot_id));
    }

    public function register_admin_menu() {
        add_options_page('AdPlatform Settings', 'AdPlatform (WP Kads)', 'manage_options', 'adplatform-settings', array($this, 'render_admin_page'));
    }

    public function register_settings() {
        register_setting('adplatform_options_group', self::OPTION_SERVER_URL);
        register_setting('adplatform_options_group', self::OPTION_SITE_PUBLIC_KEY);
    }

    public function render_admin_page() {
        ?>
        <div class="wrap" style="max-width:800px; background:#fff; padding:25px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); margin-top:20px;">
            <h2>AdPlatform Settings</h2>
            <form method="post" action="options.php">
                <?php settings_fields('adplatform_options_group'); ?>
                <table class="form-table">
                    <tr>
                        <th>Server URL</th>
                        <td><input type="url" name="<?php echo esc_attr(self::OPTION_SERVER_URL); ?>" value="<?php echo esc_attr(get_option(self::OPTION_SERVER_URL, '${window.location.origin}')); ?>" style="width:100%;" required /></td>
                    </tr>
                    <tr>
                        <th>Public Key</th>
                        <td><input type="text" name="<?php echo esc_attr(self::OPTION_SITE_PUBLIC_KEY); ?>" value="<?php echo esc_attr(get_option(self::OPTION_SITE_PUBLIC_KEY, '${currentSite?.publicKey || ''}')); ?>" style="width:100%;" /></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}
new AdPlatform_WordPress_Bridge();
`;

  const copyCode = () => {
    navigator.clipboard.writeText(phpPluginCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([phpPluginCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'wp-kads-bridge.php';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span>{t.wpTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.wpDesc}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={copyCode}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? t.copied : t.viewCode}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadPlugin}</span>
          </button>
        </div>
      </div>

      {/* 3 Step WordPress Migration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center text-xs">
            1
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {lang === 'ar' ? '1. حط ملف الإضافة فـ WordPress' : '1. Upload Plugin File'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'نزل ملف wp-kads-bridge.php وحطو مباشرة فـ المجلد wp-content/plugins/ فـ السيرفر ديالك.'
              : 'Download the wp-kads-bridge.php single file and upload it to wp-content/plugins/ on your WordPress server.'}
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs">
            2
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {lang === 'ar' ? '2. فعل الإضافة من لوحة WordPress' : '2. Activate in WP Admin'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'دخل لـ Plugins ودير Activate لـ AdPlatform Bridge.'
              : 'Go to WP Admin > Plugins and click Activate for AdPlatform Bridge.'}
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
            3
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {lang === 'ar' ? '3. خدام 100% بلا تعديل' : '3. 100% Backward Compatible'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'جميع الـ Shortcodes القديمة بحال [WP_KADS id=1] غيخدمو فـ المقالات والودجات تلقائياً.'
              : 'All existing posts containing [WP_KADS id=1] or [WP_KADS id=2] render smoothly without changing content.'}
          </p>
        </div>
      </div>

      {/* Legacy Shortcode Map Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span>{lang === 'ar' ? 'جدول توافق شورت كود WP Kads القديم' : 'WP Kads Legacy Shortcode Mappings'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'ar' ? 'الإعلانات اللي معرفين بـ Legacy ID كيتعرف عليهم WordPress تلقائياً' : 'Slots with a legacy ID are automatically resolved by the WordPress bridge plugin'}
            </p>
          </div>
        </div>

        {legacySlots.length === 0 ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            {lang === 'ar'
              ? 'ما عندك حتى إعلان فيه Legacy WP ID دابا. ضيف إعلان ودير ليه مثلاً ID = 1'
              : 'No ad slots with legacy IDs currently mapped. Set Legacy ID on your slots to link them.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="pb-3 font-semibold">Legacy Shortcode</th>
                  <th className="pb-3 font-semibold">Mapped Slot Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Dimensions</th>
                  <th className="pb-3 font-semibold text-right rtl:text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {legacySlots.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 text-indigo-600 dark:text-indigo-400 font-bold">
                      [WP_KADS id={s.legacyId}]
                    </td>
                    <td className="py-3 font-sans font-semibold text-slate-800 dark:text-slate-200">
                      {s.name}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 uppercase text-[11px]">
                      {s.type}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {s.dimensions}
                    </td>
                    <td className="py-3 text-right rtl:text-left font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {s.isActive ? 'Active' : 'Paused'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Code Preview Box */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>wp-kads-bridge.php (Source Code)</span>
          </h3>
          <button
            onClick={copyCode}
            className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-500 flex items-center gap-1 font-semibold"
          >
            {copiedCode ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCode ? t.copied : 'Copy PHP Code'}</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-300 max-h-80 overflow-y-auto whitespace-pre-wrap select-all">
          {phpPluginCode}
        </pre>
      </div>
    </div>
  );
};
