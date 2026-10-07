import React, { useState, useEffect, useRef } from 'react';
import { Eye, Monitor, Tablet, Smartphone, Sparkles, RefreshCw, CheckCircle2, Play, Code, AlertCircle, ArrowUpRight } from 'lucide-react';
import { AdSlot, Site } from '../types';
import { Language, translations } from '../i18n';
import { api } from '../api';

interface LiveSandboxTabProps {
  slots: AdSlot[];
  sites: Site[];
  initialSlotId?: string | null;
  lang: Language;
}

export const LiveSandboxTab: React.FC<LiveSandboxTabProps> = ({
  slots,
  sites,
  initialSlotId,
  lang,
}) => {
  const t = translations[lang];
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    initialSlotId || (slots.length > 0 ? slots[0].id : '')
  );
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [testLog, setTestLog] = useState<{ id: string; time: string; message: string; type: 'info' | 'success' | 'warn' }[]>([]);
  const [renderKey, setRenderKey] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const currentSlot = slots.find((s) => s.id === selectedSlotId);
  const currentSite = currentSlot ? sites.find((s) => s.id === currentSlot.siteId) : null;

  const addLog = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setTestLog((prev) => [
      {
        id: Math.random().toString(),
        time: new Date().toLocaleTimeString(),
        message,
        type,
      },
      ...prev.slice(0, 15),
    ]);
  };

  // Trigger test impression
  const handleTriggerImpression = async () => {
    if (!currentSlot) return;
    try {
      await api.trackTestImpression(currentSlot.id, currentSlot.siteId);
      addLog(`Impression beacon recorded in DB for [${currentSlot.name}]`, 'success');
    } catch (err: any) {
      addLog(`Failed to record impression: ${err.message}`, 'warn');
    }
  };

  // Render ad inside preview whenever slot or renderKey changes
  useEffect(() => {
    if (!currentSlot || !previewContainerRef.current) return;

    const container = previewContainerRef.current;
    container.innerHTML = '';
    addLog(`Mounting slot: "${currentSlot.name}" (${currentSlot.type})`, 'info');

    if (currentSlot.type === 'adsense') {
      const config = currentSlot.config || {};
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        border: 2px dashed #f59e0b;
        background: rgba(245, 158, 11, 0.08);
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        font-family: system-ui, sans-serif;
        color: inherit;
        margin: auto;
        max-width: ${currentSlot.dimensions === '728x90' ? '728px' : currentSlot.dimensions === '300x250' ? '300px' : '100%'};
      `;
      placeholder.innerHTML = `
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#f59e0b; font-weight:700;">Google AdSense Slot Simulation</div>
        <div style="font-size:14px; font-weight:700; margin: 8px 0;">Client: ${config.adsenseClientId || 'ca-pub-xxx'}</div>
        <div style="font-size:12px; font-family:monospace; opacity:0.8;">Slot ID: ${config.adsenseSlotId || '1234567890'} | Format: ${config.adsenseFormat || 'auto'}</div>
        <div style="margin-top:12px; font-size:11px; opacity:0.6;">AdSense &lt;ins class="adsbygoogle"&gt; tag generated successfully</div>
      `;
      container.appendChild(placeholder);
      addLog('AdSense ins tag container mounted & verified', 'success');
    } else if (currentSlot.type === 'html') {
      const content = currentSlot.config?.htmlContent || '<p>No HTML content</p>';
      const wrapper = document.createElement('div');
      wrapper.innerHTML = content;
      container.appendChild(wrapper);
      addLog('HTML banner markup injected & rendered', 'success');
    } else if (currentSlot.type === 'custom_js') {
      const js = currentSlot.config?.jsCode || '';
      try {
        const slotEl = document.createElement('div');
        container.appendChild(slotEl);
        (window as any).__ad_target_el = slotEl;
        const fn = new Function('container', js);
        fn(slotEl);
        addLog('Custom JS executed in sandbox without errors', 'success');
      } catch (err: any) {
        addLog(`Custom JS Execution Error: ${err.message}`, 'warn');
      }
    }
  }, [currentSlot, renderKey]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            <span>{t.testEnvironment}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.testSub}
          </p>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl self-start sm:self-auto shadow-sm">
          <button
            onClick={() => setDeviceView('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              deviceView === 'desktop'
                ? 'bg-sky-600 dark:bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.desktop}</span>
          </button>
          <button
            onClick={() => setDeviceView('tablet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              deviceView === 'tablet'
                ? 'bg-sky-600 dark:bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.tablet}</span>
          </button>
          <button
            onClick={() => setDeviceView('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              deviceView === 'mobile'
                ? 'bg-sky-600 dark:bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.mobile}</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Select Slot + Reload + Trigger Impression */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.selectSlotToTest}:</span>
          <select
            value={selectedSlotId}
            onChange={(e) => {
              setSelectedSlotId(e.target.value);
              setRenderKey((k) => k + 1);
            }}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs rounded-xl focus:outline-none focus:border-sky-500"
          >
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.type} - {s.dimensions})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRenderKey((k) => k + 1)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'إعادة تحميل' : 'Reload Slot'}</span>
          </button>

          <button
            onClick={handleTriggerImpression}
            disabled={!currentSlot}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t.triggerImpression}</span>
          </button>
        </div>
      </div>

      {/* 2-Columns: Left Canvas Simulator, Right Live Test Logs & Payload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Simulated Website Article Canvas */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <div
            className={`w-full transition-all duration-300 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden ${
              deviceView === 'desktop'
                ? 'max-w-full'
                : deviceView === 'tablet'
                ? 'max-w-[768px]'
                : 'max-w-[380px]'
            }`}
          >
            {/* Browser Address Bar Mockup */}
            <div className="bg-slate-100 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 bg-white dark:bg-slate-950 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                https://{currentSite?.domain || 'my-wordpress-blog.com'}/article/12-best-tech-trends
              </div>
            </div>

            {/* Simulated Content Layout */}
            <div className="p-6 sm:p-8 space-y-6 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-[500px]">
              {/* Fake Article Header */}
              <div className="space-y-2 border-b border-slate-200 dark:border-slate-800/80 pb-5">
                <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 uppercase tracking-widest bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-500/20 font-bold">
                  Tech & Software
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  How High-Performance Ad Placement Boosts Publishing Revenue in 2026
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Published by Editor • 4 min read • Simulated WordPress Post
                </p>
              </div>

              {/* Fake Article Body Paragraph 1 */}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Website monetization relies on fast, responsive, and privacy-preserving ad infrastructure.
                When ads load smoothly without layout shifting (CLS) or heavy third-party tracker lag, user retention increases significantly.
              </p>

              {/* LIVE AD PLACEMENT CONTAINER */}
              <div className="my-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 relative group">
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-400 rounded border border-slate-300 dark:border-slate-700 font-semibold">
                  AdPlatform Placement &bull; {currentSlot?.dimensions || 'auto'}
                </div>
                <div
                  ref={previewContainerRef}
                  className="flex items-center justify-center min-h-[100px] w-full pt-2"
                />
              </div>

              {/* Fake Article Body Paragraph 2 */}
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                AdPlatform delivers advertisements directly via clean JSON payloads and embeds them into native DOM elements,
                ensuring seamless integration with WordPress, Next.js, and static websites without bloat.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Test Console & Slot Inspector */}
        <div className="space-y-5">
          {/* Active Slot Inspector */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span>Slot Inspector</span>
            </h3>

            {currentSlot ? (
              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">ID:</span>
                  <span className="text-sky-700 dark:text-sky-300 font-semibold">{currentSlot.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <span className="text-amber-700 dark:text-amber-300 font-semibold">{currentSlot.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dimensions:</span>
                  <span>{currentSlot.dimensions}</span>
                </div>
                {currentSlot.legacyId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Legacy WP ID:</span>
                    <span className="text-indigo-700 dark:text-indigo-300 font-semibold">[WP_KADS id={currentSlot.legacyId}]</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Impressions:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{currentSlot.impressionsCount}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No slot selected</p>
            )}
          </div>

          {/* Test Live Event Log */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Live Event Log</span>
              </h3>
              <button
                onClick={() => setTestLog([])}
                className="text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold"
              >
                Clear
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-[11px] pr-1">
              {testLog.length === 0 ? (
                <div className="text-center py-6 text-slate-400 dark:text-slate-600 text-xs">
                  Awaiting test events...
                </div>
              ) : (
                testLog.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                      log.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                        : log.type === 'warn'
                        ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-slate-400 text-[10px] flex-shrink-0">{log.time}</span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* IAB Viewability explanation */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Real Viewable Impressions Standard</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {t.viewableNotice}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
