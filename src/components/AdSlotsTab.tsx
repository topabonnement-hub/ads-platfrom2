import React, { useState } from 'react';
import { Layers, Plus, Trash2, Copy, Check, ExternalLink, Code2, Globe, Sparkles, AlertTriangle, Play, CheckCircle2 } from 'lucide-react';
import { Site, AdSlot, AdSlotType, AdSlotConfig } from '../types';
import { Language, translations } from '../i18n';
import { api } from '../api';

interface AdSlotsTabProps {
  slots: AdSlot[];
  sites: Site[];
  selectedSiteId: string | null;
  setSelectedSiteId: (siteId: string | null) => void;
  onRefresh: () => void;
  onOpenSandboxForSlot: (slot: AdSlot) => void;
  lang: Language;
}

export const AdSlotsTab: React.FC<AdSlotsTabProps> = ({
  slots,
  sites,
  selectedSiteId,
  setSelectedSiteId,
  onRefresh,
  onOpenSandboxForSlot,
  lang,
}) => {
  const t = translations[lang];

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AdSlot | null>(null);

  // Form Fields
  const [formSiteId, setFormSiteId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AdSlotType>('adsense');
  const [legacyId, setLegacyId] = useState('');
  const [dimensions, setDimensions] = useState('responsive');
  
  // AdSense Config
  const [adsenseClientId, setAdsenseClientId] = useState('ca-pub-');
  const [adsenseSlotId, setAdsenseSlotId] = useState('');
  const [adsenseFormat, setAdsenseFormat] = useState('auto');
  const [responsive, setResponsive] = useState(true);

  // HTML Config
  const [htmlContent, setHtmlContent] = useState('');

  // JS Config
  const [jsCode, setJsCode] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Filter slots
  const filteredSlots = selectedSiteId
    ? slots.filter((s) => s.siteId === selectedSiteId)
    : slots;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openCreateModal = () => {
    setEditingSlot(null);
    setFormSiteId(selectedSiteId || (sites.length > 0 ? sites[0].id : ''));
    setName('');
    setType('adsense');
    setLegacyId('');
    setDimensions('responsive');
    setAdsenseClientId('ca-pub-');
    setAdsenseSlotId('');
    setAdsenseFormat('auto');
    setResponsive(true);
    setHtmlContent('');
    setJsCode('');
    setError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (slot: AdSlot) => {
    setEditingSlot(slot);
    setFormSiteId(slot.siteId);
    setName(slot.name);
    setType(slot.type);
    setLegacyId(slot.legacyId || '');
    setDimensions(slot.dimensions || 'responsive');
    
    setAdsenseClientId(slot.config.adsenseClientId || 'ca-pub-');
    setAdsenseSlotId(slot.config.adsenseSlotId || '');
    setAdsenseFormat(slot.config.adsenseFormat || 'auto');
    setResponsive(slot.config.responsive !== false);
    
    setHtmlContent(slot.config.htmlContent || '');
    setJsCode(slot.config.jsCode || '');
    setError(null);
    setShowCreateModal(true);
  };

  // Preset HTML Templates
  const applyHtmlPreset = (presetName: 'banner300' | 'leaderboard728' | 'affiliate') => {
    if (presetName === 'banner300') {
      setDimensions('300x250');
      setHtmlContent(`<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:300px; min-height:250px; background:linear-gradient(135deg, #1e293b, #0f172a); border:1px solid #334155; border-radius:12px; padding:20px; text-align:center; color:#fff; box-sizing:border-box;">
  <span style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; margin-bottom:6px;">Sponsored</span>
  <h4 style="margin:0 0 8px 0; font-size:18px; color:#38bdf8; font-weight:700;">Fast Cloud Hosting</h4>
  <p style="margin:0 0 16px 0; font-size:13px; color:#cbd5e1; line-height:1.4;">Get 99.9% uptime with instant NVMe storage.</p>
  <a href="https://example.com" target="_blank" rel="noopener noreferrer" style="background:#0284c7; color:#fff; padding:8px 18px; border-radius:8px; font-size:13px; text-decoration:none; font-weight:600;">Get Started &rarr;</a>
</div>`);
    } else if (presetName === 'leaderboard728') {
      setDimensions('728x90');
      setHtmlContent(`<div style="display:flex; align-items:center; justify-content:space-between; max-width:728px; min-height:90px; background:#0f172a; border:1px solid #38bdf8; border-radius:10px; padding:12px 24px; color:#fff; box-sizing:border-box;">
  <div>
    <span style="font-size:10px; background:#0284c7; padding:2px 6px; border-radius:4px; text-transform:uppercase;">Special Offer</span>
    <h4 style="margin:4px 0 0 0; font-size:16px; font-weight:700; color:#fff;">Developer Pro Suite 2026</h4>
  </div>
  <a href="https://example.com" target="_blank" rel="noopener noreferrer" style="background:#38bdf8; color:#0f172a; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:700; text-decoration:none;">Explore Now</a>
</div>`);
    } else if (presetName === 'affiliate') {
      setDimensions('responsive');
      setHtmlContent(`<div style="padding:16px; background:#18181b; border:1px solid #27272a; border-radius:12px; text-align:center; color:#fafafa;">
  <p style="margin:0 0 10px 0; font-size:14px; font-weight:600; color:#a1a1aa;">Recommended Service</p>
  <a href="https://example.com" target="_blank" rel="noopener noreferrer" style="display:inline-block; font-size:15px; font-weight:700; color:#60a5fa; text-decoration:underline;">
    Click here to try our recommended solution with exclusive 30-day trial
  </a>
</div>`);
    }
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const config: AdSlotConfig = {};
    if (type === 'adsense') {
      config.adsenseClientId = adsenseClientId.trim();
      config.adsenseSlotId = adsenseSlotId.trim();
      config.adsenseFormat = adsenseFormat;
      config.responsive = responsive;
    } else if (type === 'html') {
      config.htmlContent = htmlContent;
    } else if (type === 'custom_js') {
      config.jsCode = jsCode;
    }

    try {
      if (editingSlot) {
        await api.updateSlot(editingSlot.id, {
          name,
          type,
          legacyId: legacyId || undefined,
          dimensions,
          config,
        });
      } else {
        await api.createSlot({
          siteId: formSiteId,
          name,
          type,
          legacyId: legacyId || undefined,
          dimensions,
          config,
          isActive: true,
        });
      }

      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save ad slot');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (slot: AdSlot) => {
    try {
      await api.updateSlot(slot.id, { isActive: !slot.isActive });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm(t.confirmDeleteSlot)) return;
    try {
      await api.deleteSlot(slotId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete slot');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedSiteId) return;
    setBulkDeleting(true);
    try {
      await api.bulkDeleteSlots(selectedSiteId);
      setShowBulkDeleteModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete slots');
    } finally {
      setBulkDeleting(false);
    }
  };

  const currentSelectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Site Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span>{t.adSlots}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'ar'
              ? 'إنشاء وإدارة وحدات الإعلانات (AdSense, HTML, JS) مع دعم WP Kads'
              : 'Create and manage ad placements (AdSense, HTML, Custom JS) with legacy WP Kads shortcode support'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Site Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:inline">{lang === 'ar' ? 'الموقع:' : 'Site:'}</span>
            <select
              value={selectedSiteId || ''}
              onChange={(e) => setSelectedSiteId(e.target.value ? e.target.value : null)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 shadow-sm"
            >
              <option value="">{lang === 'ar' ? 'جميع المواقع (All Sites)' : 'All Websites'}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.domain})
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Delete Button if a specific site is selected */}
          {selectedSiteId && filteredSlots.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              title={t.deleteAllSlots}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.deleteAllSlots}</span>
            </button>
          )}

          <button
            onClick={openCreateModal}
            disabled={sites.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewSlot}</span>
          </button>
        </div>
      </div>

      {/* Sites Warning if 0 */}
      {sites.length === 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500 dark:text-amber-400" />
          <span>{lang === 'ar' ? 'خاصك تضيف موقع أولاً قبل ما تنشئ إعلان.' : 'Please create at least one website before adding ad slots.'}</span>
        </div>
      )}

      {/* Slots List / Grid */}
      {filteredSlots.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8">
          <Layers className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t.noSlotsYet}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
            {lang === 'ar'
              ? 'أنشئ أول إعلان (AdSense أو HTML أو JS) وخود الـ Snippet باش تحطو فـ الموقع.'
              : 'Create your first ad slot to get the snippet or shortcode for your website.'}
          </p>
          {sites.length > 0 && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              {t.addNewSlot}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSlots.map((slot) => {
            const site = sites.find((s) => s.id === slot.siteId);
            const htmlSnippet = `<div data-ad-slot="${slot.id}"></div>`;
            const wpShortcode = slot.legacyId
              ? `[WP_KADS id=${slot.legacyId}]`
              : `[adplatform id="${slot.id}"]`;

            return (
              <div
                key={slot.id}
                className={`bg-white dark:bg-slate-900/90 border rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between ${
                  slot.isActive ? 'border-slate-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800/50 opacity-70'
                }`}
              >
                <div>
                  {/* Top Bar: Type Badge & Active Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          slot.type === 'adsense'
                            ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                            : slot.type === 'html'
                            ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30'
                            : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        }`}
                      >
                        {slot.type === 'adsense' ? 'Google AdSense' : slot.type === 'html' ? 'HTML Banner' : 'Custom JS'}
                      </span>

                      {slot.legacyId && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                          WP #{slot.legacyId}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleActive(slot)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                        slot.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {slot.isActive ? t.activeStatus : t.pausedStatus}
                    </button>
                  </div>

                  {/* Slot Title & Site */}
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{slot.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Globe className="w-3 h-3 text-slate-400" />
                      <span>{site?.name || 'Unknown Site'}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 dark:text-slate-400">{slot.dimensions}</span>
                    </p>
                    {(slot.ownerEmail || site?.ownerEmail) && (
                      <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-1">
                        Owner: {slot.ownerEmail || site?.ownerEmail}
                      </p>
                    )}
                  </div>

                  {/* Impressions & Clicks count */}
                  <div className="grid grid-cols-2 gap-2 mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">{t.totalImpressions}</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {(slot.impressionsCount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">{t.totalClicks}</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {(slot.clicksCount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Snippets to copy */}
                  <div className="space-y-2 mt-4">
                    {/* HTML Snippet */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                        <span className="font-semibold">HTML Snippet</span>
                        <button
                          onClick={() => copyToClipboard(htmlSnippet, `html_${slot.id}`)}
                          className="text-sky-600 dark:text-sky-400 hover:text-sky-500 font-bold flex items-center gap-1"
                        >
                          {copiedKey === `html_${slot.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-600 dark:text-emerald-400">{t.copied}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{t.copySnippet}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-300 select-all overflow-x-auto">
                        {htmlSnippet}
                      </div>
                    </div>

                    {/* WordPress Shortcode */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                        <span className="font-semibold">WordPress Shortcode</span>
                        <button
                          onClick={() => copyToClipboard(wpShortcode, `wp_${slot.id}`)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-bold flex items-center gap-1"
                        >
                          {copiedKey === `wp_${slot.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-600 dark:text-emerald-400">{t.copied}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{t.copyShortcode}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-indigo-700 dark:text-indigo-300 select-all overflow-x-auto">
                        {wpShortcode}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons: Live Test, Edit, Delete */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => onOpenSandboxForSlot(slot)}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{lang === 'ar' ? 'تجربة حية' : 'Test Live'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(slot)}
                      className="px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 font-medium"
                    >
                      {lang === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                <span>{editingSlot ? (lang === 'ar' ? 'تعديل الإعلان' : 'Edit Ad Slot') : t.addNewSlot}</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
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

            <form onSubmit={handleSaveSlot} className="space-y-4">
              {/* Site Selector */}
              {!editingSlot && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.targetSite}</label>
                  <select
                    required
                    value={formSiteId}
                    onChange={(e) => setFormSiteId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.domain})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Slot Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.slotName}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Header Leaderboard 728x90"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Type Selector: 3 Options */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.slotType}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('adsense')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
                      type === 'adsense'
                        ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/50 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>Google AdSense</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('html')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
                      type === 'html'
                        ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-500/50 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>HTML Banner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('custom_js')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
                      type === 'custom_js'
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/50 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>Custom JS</span>
                  </button>
                </div>
              </div>

              {/* Dimensions & Legacy WP Kads ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.dimensions}</label>
                  <select
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="responsive">Responsive (Fluid / المتجاوب)</option>
                    <option value="728x90">728x90 (Leaderboard)</option>
                    <option value="300x250">300x250 (Medium Rectangle)</option>
                    <option value="336x280">336x280 (Large Rectangle)</option>
                    <option value="160x600">160x600 (Wide Skyscraper)</option>
                    <option value="320x50">320x50 (Mobile Leaderboard)</option>
                    <option value="300x600">300x600 (Half Page)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.legacyWpId}</label>
                  <input
                    type="text"
                    value={legacyId}
                    onChange={(e) => setLegacyId(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              {/* Type Specific Fields */}
              {type === 'adsense' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>AdSense Configuration</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">{t.adsenseClientId}</label>
                    <input
                      type="text"
                      required
                      value={adsenseClientId}
                      onChange={(e) => setAdsenseClientId(e.target.value)}
                      placeholder="ca-pub-1234567890123456"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">{t.adsenseSlotId}</label>
                    <input
                      type="text"
                      required
                      value={adsenseSlotId}
                      onChange={(e) => setAdsenseSlotId(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{t.responsiveAd}</label>
                    <input
                      type="checkbox"
                      checked={responsive}
                      onChange={(e) => setResponsive(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                    />
                  </div>
                </div>
              )}

              {type === 'html' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1.5">
                      <Code2 className="w-4 h-4" />
                      <span>{t.htmlContent}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">{lang === 'ar' ? 'نماذج جاهزة:' : 'Presets:'}</span>
                      <button
                        type="button"
                        onClick={() => applyHtmlPreset('banner300')}
                        className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] rounded font-medium"
                      >
                        300x250
                      </button>
                      <button
                        type="button"
                        onClick={() => applyHtmlPreset('leaderboard728')}
                        className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] rounded font-medium"
                      >
                        728x90
                      </button>
                    </div>
                  </div>

                  <textarea
                    required
                    rows={6}
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="<div><a href='...'><img src='...' /></a></div>"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-sky-500 resize-y"
                  />
                </div>
              )}

              {type === 'custom_js' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    <Code2 className="w-4 h-4" />
                    <span>{t.jsCode}</span>
                  </div>

                  <textarea
                    required
                    rows={6}
                    value={jsCode}
                    onChange={(e) => setJsCode(e.target.value)}
                    placeholder="(function(container) { container.innerHTML = 'Hello Ad'; })(document.currentScript.parentElement);"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-emerald-500 resize-y"
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl disabled:opacity-50 shadow-sm"
                >
                  {loading ? t.loading : editingSlot ? t.save : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && currentSelectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.deleteAllSlots}</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'ar'
                ? `تحذير: سيتم حذف جميع إعلانات الموقع "${currentSelectedSite.name}" (${filteredSlots.length} إعلان) بشكل نهائي وبلا تراجع!`
                : `Are you sure you want to permanently delete all ${filteredSlots.length} ad slots for "${currentSelectedSite.name}"? This cannot be undone.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                {bulkDeleting ? t.loading : lang === 'ar' ? 'تأكيد الحذف الكلي' : 'Confirm Bulk Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
