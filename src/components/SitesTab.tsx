import React, { useState } from 'react';
import { Globe, Plus, Trash2, Copy, Check, ExternalLink, ShieldCheck, AlertTriangle, Layers } from 'lucide-react';
import { Site, AdSlot } from '../types';
import { Language, translations } from '../i18n';
import { api } from '../api';

interface SitesTabProps {
  sites: Site[];
  slots: AdSlot[];
  onRefresh: () => void;
  onNavigateToSlotsForSite: (siteId: string) => void;
  lang: Language;
}

export const SitesTab: React.FC<SitesTabProps> = ({
  sites,
  slots,
  onRefresh,
  onNavigateToSlotsForSite,
  lang,
}) => {
  const t = translations[lang];
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.createSite(name, domain);
      setName('');
      setDomain('');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create site');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!window.confirm(t.confirmDeleteSite)) return;

    setDeletingSiteId(siteId);
    try {
      await api.deleteSite(siteId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete site');
    } finally {
      setDeletingSiteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            <span>{t.sites}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'ar'
              ? 'أضف المواقع ديالك وخود الـ Public Key و Embed Tag لكل موقع'
              : 'Manage your connected websites and retrieve their unique public integration tags'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addNewSite}</span>
        </button>
      </div>

      {/* Sites Grid */}
      {sites.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8">
          <Globe className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t.noSitesYet}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
            {lang === 'ar'
              ? 'باش تبدا تعرض الإعلانات، خاصك تزيد أول موقع ديالك باش يعطيك الـ Tag الخاص بيه.'
              : 'Add your first domain to generate its dedicated embed tag and begin serving ads.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl"
          >
            {t.addNewSite}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sites.map((site) => {
            const siteSlots = slots.filter((s) => s.siteId === site.id);
            const totalImps = siteSlots.reduce((sum, s) => sum + (s.impressionsCount || 0), 0);
            const totalClks = siteSlots.reduce((sum, s) => sum + (s.clicksCount || 0), 0);
            const embedScript = `<script src="${window.location.origin}/adslot.js" data-platform-key="${site.publicKey}" async></script>`;

            return (
              <div
                key={site.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Title & Delete */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{site.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>{site.domain}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onNavigateToSlotsForSite(site.id)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Manage Slots"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{siteSlots.length} {t.adSlots}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteSite(site.id)}
                        disabled={deletingSiteId === site.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                        title={t.deleteSite}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics summary */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">{t.adSlots}</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{siteSlots.length}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">{t.totalImpressions}</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{totalImps.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">{t.totalClicks}</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">{totalClks.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Public Key field */}
                  <div className="mt-4 space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">{t.publicKey}</label>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                      <code className="text-xs text-sky-700 dark:text-sky-300 font-mono flex-1 overflow-x-auto select-all font-semibold">
                        {site.publicKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(site.publicKey, `pk_${site.id}`)}
                        className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1"
                        title="Copy Public Key"
                      >
                        {copiedKey === `pk_${site.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Embed Tag snippet */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">{t.embedTag}</label>
                      <span className="text-[10px] text-slate-500">Put in &lt;head&gt;</span>
                    </div>
                    <div className="relative group">
                      <pre className="text-[11px] text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-mono overflow-x-auto whitespace-pre-wrap break-all select-all">
                        {embedScript}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(embedScript, `tag_${site.id}`)}
                        className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold border border-slate-300 dark:border-slate-700 flex items-center gap-1 shadow-sm"
                      >
                        {copiedKey === `tag_${site.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400">{t.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{lang === 'ar' ? 'نسخ الـ Tag' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>ID: {site.id}</span>
                  <span>{new Date(site.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Site Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                <span>{t.addNewSite}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.siteName}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Tech Blog"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.siteDomain}</label>
                <input
                  type="text"
                  required
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="mytechblog.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {lang === 'ar' ? 'بدون http:// أو مسارات، غير الدومين فقط' : 'Without http:// or trailing slashes, e.g. domain.com'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl disabled:opacity-50 shadow-sm"
                >
                  {loading ? t.loading : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
