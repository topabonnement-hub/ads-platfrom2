import React from 'react';
import { Globe, Layers, Eye, MousePointerClick, TrendingUp, Sparkles, CheckCircle2, ArrowUpRight, Copy, Check, Plus } from 'lucide-react';
import { AnalyticsData, Site, AdSlot } from '../types';
import { Language, translations } from '../i18n';

interface OverviewTabProps {
  analytics: AnalyticsData | null;
  sites: Site[];
  slots: AdSlot[];
  onNavigate: (tab: string) => void;
  lang: Language;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  analytics,
  sites,
  slots,
  onNavigate,
  lang,
}) => {
  const t = translations[lang];
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const totalSites = analytics?.totalSites ?? sites.length;
  const totalSlots = analytics?.totalSlots ?? slots.length;
  const totalImpressions = analytics?.totalImpressions ?? slots.reduce((a, b) => a + (b.impressionsCount || 0), 0);
  const totalClicks = analytics?.totalClicks ?? slots.reduce((a, b) => a + (b.clicksCount || 0), 0);
  const ctr = analytics?.ctr ?? (totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%' : '0.00%');

  const stats = [
    { label: t.totalSites, value: totalSites, icon: Globe, color: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/20' },
    { label: t.totalSlots, value: totalSlots, icon: Layers, color: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-500/20' },
    { label: t.totalImpressions, value: totalImpressions.toLocaleString(), icon: Eye, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { label: t.totalClicks, value: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
    { label: t.ctr, value: ctr, icon: TrendingUp, color: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / System Status */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-mono mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.serverStatus}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {lang === 'ar' ? 'مرحباً بك في منصة AdPlatform' : 'Welcome to AdPlatform'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              {t.tagline}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('sites')}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addNewSite}</span>
            </button>
            <button
              onClick={() => onNavigate('slots')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addNewSlot}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{s.label}</span>
                <div className={`p-2 rounded-xl bg-gradient-to-tr ${s.color} text-white shadow-md ${s.shadow}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* 2-Column: Quick Start Embed Guide & Active Sites */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sites & Slots Performance */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  <span>{lang === 'ar' ? 'المواقع المسجلة والإحصائيات' : 'Registered Websites & Stats'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'ar' ? 'نظرة عامة على عدد الإعلانات والمشاهدات لكل موقع' : 'Overview of ad slots and impressions per site'}
                </p>
              </div>
              <button
                onClick={() => onNavigate('sites')}
                className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-500 font-bold flex items-center gap-1"
              >
                <span>{lang === 'ar' ? 'عرض الكل' : 'View All'}</span>
                <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-[-90deg]" />
              </button>
            </div>

            {sites.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                <Globe className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.noSitesYet}</p>
                <button
                  onClick={() => onNavigate('sites')}
                  className="mt-3 px-3 py-1.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 text-xs font-semibold rounded-lg hover:bg-sky-100 dark:hover:bg-sky-500/20"
                >
                  {t.addNewSite}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="pb-3 font-semibold">{t.siteName}</th>
                      <th className="pb-3 font-semibold">{t.publicKey}</th>
                      <th className="pb-3 font-semibold text-center">{t.adSlots}</th>
                      <th className="pb-3 font-semibold text-center">{t.totalImpressions}</th>
                      <th className="pb-3 font-semibold text-right rtl:text-left">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {sites.slice(0, 5).map((site) => {
                      const siteSlots = slots.filter((s) => s.siteId === site.id);
                      const impressions = siteSlots.reduce((a, b) => a + (b.impressionsCount || 0), 0);
                      const embedScript = `<script src="${window.location.origin}/adslot.js" data-platform-key="${site.publicKey}" async></script>`;

                      return (
                        <tr key={site.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 font-semibold text-slate-900 dark:text-slate-200">
                            <div>{site.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono font-normal">{site.domain}</div>
                          </td>
                          <td className="py-3.5">
                            <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                              {site.publicKey.substring(0, 14)}...
                            </span>
                          </td>
                          <td className="py-3.5 text-center font-bold text-slate-800 dark:text-slate-300">
                            {siteSlots.length}
                          </td>
                          <td className="py-3.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {impressions.toLocaleString()}
                          </td>
                          <td className="py-3.5 text-right rtl:text-left">
                            <button
                              onClick={() => copyToClipboard(embedScript, `site_${site.id}`)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors"
                              title={t.copyTag}
                            >
                              {copiedKey === `site_${site.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-emerald-600 dark:text-emerald-400">{t.copied}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>{lang === 'ar' ? 'نسخ الـ Tag' : 'Copy Tag'}</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Sandbox Tester preview teaser */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t.testEnvironment}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md">{t.testSub}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('sandbox')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all whitespace-nowrap"
            >
              {lang === 'ar' ? 'فتح Sandbox الآن' : 'Launch Sandbox'} &rarr;
            </button>
          </div>
        </div>

        {/* Right 1 Col: How it works & WordPress fast setup */}
        <div className="space-y-6">
          {/* 3 Step Guide */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span>{lang === 'ar' ? 'كيفاش المنصة كتخدم؟' : 'How AdPlatform Works'}</span>
            </h3>

            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">1</span>
                <div>
                  <strong className="text-slate-900 dark:text-white block">{lang === 'ar' ? '1. حط الـ Tag فـ الموقع' : '1. Include Embed Tag'}</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    {lang === 'ar' ? 'حط adslot.js مرة وحدة فـ <head> ديال الموقع.' : 'Add adslot.js script tag once in your website head.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">2</span>
                <div>
                  <strong className="text-slate-900 dark:text-white block">{lang === 'ar' ? '2. حط كود الـ Slot فـ البلاصة' : '2. Place Slot snippet'}</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    {lang === 'ar' ? 'حط <div data-ad-slot="..."> أو [WP_KADS id=1] فـ المقال.' : 'Place <div data-ad-slot="..."> or shortcode anywhere in your content.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">3</span>
                <div>
                  <strong className="text-slate-900 dark:text-white block">{lang === 'ar' ? '3. الإعلان كيبان والمشاهدات كتسجل' : '3. Ads render & track'}</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    {lang === 'ar' ? 'الزائر كيشوف الإعلان بدون أي تأخير وبلا ما يعرف بلي كاين سيرفر.' : 'Ads render ultra-fast and real viewable impressions get saved in PostgreSQL.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* WordPress Fast Download Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{lang === 'ar' ? 'جاهز لـ WordPress' : 'WordPress Ready'}</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {lang === 'ar'
                ? 'عندك موقع WordPress فيه shortcodes قدام بحال [WP_KADS id=1]؟ حمل ملف الإضافة الجاهز وغيخدمو كاملين.'
                : 'Migrating from WP Kads plugin? Download our single-file bridge to run all existing [WP_KADS id=X] seamlessly.'}
            </p>
            <button
              onClick={() => onNavigate('wordpress')}
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <span>{lang === 'ar' ? 'تحميل إضافة WordPress' : 'Get WordPress Plugin'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-[-90deg]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
