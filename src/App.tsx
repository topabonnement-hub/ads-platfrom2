import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { OverviewTab } from './components/OverviewTab';
import { SitesTab } from './components/SitesTab';
import { AdSlotsTab } from './components/AdSlotsTab';
import { LiveSandboxTab } from './components/LiveSandboxTab';
import { WordPressBridgeTab } from './components/WordPressBridgeTab';
import { CoolifyDeploymentTab } from './components/CoolifyDeploymentTab';
import { AuditLogsTab } from './components/AuditLogsTab';
import { api, getToken } from './api';
import { User, Site, AdSlot, AnalyticsData, AuditLog } from './types';
import { Language } from './i18n';
import { Loader2, Shield } from 'lucide-react';

export default function App() {
  // Default to English as requested
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('adplatform_lang') as Language) || 'en';
  });

  // Default to Light Mode as requested
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('adplatform_theme') as 'light' | 'dark') || 'light';
  });

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Core Data State
  const [sites, setSites] = useState<Site[]>([]);
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Navigation Filter
  const [selectedSiteIdForSlots, setSelectedSiteIdForSlots] = useState<string | null>(null);
  const [sandboxSlotId, setSandboxSlotId] = useState<string | null>(null);

  // Sync RTL/LTR and Language
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('adplatform_lang', lang);
  }, [lang]);

  // Sync Theme (Light / Dark)
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('adplatform_theme', theme);
  }, [theme]);

  // Initial Auth Check
  useEffect(() => {
    async function checkAuth() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        setUser(res.user);
        await loadAllData();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const loadAllData = async () => {
    try {
      const [sitesRes, slotsRes, analyticsRes, logsRes] = await Promise.all([
        api.getSites(),
        api.getSlots(),
        api.getAnalytics(),
        api.getAuditLogs(),
      ]);

      setSites(sitesRes.sites);
      setSlots(slotsRes.slots);
      setAnalytics(analyticsRes.analytics);
      setLogs(logsRes.logs);
    } catch (err) {
      console.error('Failed to load platform data:', err);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  const handleAuthSuccess = async (authUser: User) => {
    setUser(authUser);
    setLoading(true);
    await loadAllData();
    setLoading(false);
  };

  const handleNavigateToSlotsForSite = (siteId: string) => {
    setSelectedSiteIdForSlots(siteId);
    setCurrentTab('slots');
  };

  const handleOpenSandboxForSlot = (slot: AdSlot) => {
    setSandboxSlotId(slot.id);
    setCurrentTab('sandbox');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-700 dark:text-slate-300 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
        </div>
        <p className="text-xs font-mono text-slate-500">Loading AdPlatform...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors ${theme === 'dark' ? 'dark' : ''} ${lang === 'ar' ? 'font-tajawal' : 'font-sans'}`}>
      {/* Auth Screen if not logged in */}
      {!user && (
        <AuthModal onSuccess={handleAuthSuccess} lang={lang} />
      )}

      {/* Main Authenticated Layout */}
      {user && (
        <>
          <Navbar
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            user={user}
            onLogout={handleLogout}
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {currentTab === 'overview' && (
              <OverviewTab
                analytics={analytics}
                sites={sites}
                slots={slots}
                onNavigate={setCurrentTab}
                lang={lang}
              />
            )}

            {currentTab === 'sites' && (
              <SitesTab
                sites={sites}
                slots={slots}
                onRefresh={loadAllData}
                onNavigateToSlotsForSite={handleNavigateToSlotsForSite}
                lang={lang}
              />
            )}

            {currentTab === 'slots' && (
              <AdSlotsTab
                slots={slots}
                sites={sites}
                selectedSiteId={selectedSiteIdForSlots}
                setSelectedSiteId={setSelectedSiteIdForSlots}
                onRefresh={loadAllData}
                onOpenSandboxForSlot={handleOpenSandboxForSlot}
                lang={lang}
              />
            )}

            {currentTab === 'sandbox' && (
              <LiveSandboxTab
                slots={slots}
                sites={sites}
                initialSlotId={sandboxSlotId}
                lang={lang}
              />
            )}

            {currentTab === 'wordpress' && (
              <WordPressBridgeTab
                sites={sites}
                slots={slots}
                lang={lang}
              />
            )}

            {currentTab === 'coolify' && (
              <CoolifyDeploymentTab
                lang={lang}
              />
            )}

            {currentTab === 'logs' && (
              <AuditLogsTab
                logs={logs}
                onRefresh={loadAllData}
                lang={lang}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 py-6 text-center text-xs text-slate-500 font-mono transition-colors">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span>AdPlatform v1.0.0 &bull; Open Source Ad Management</span>
              </div>
              <div>
                <span>Released under MIT License &bull; Zero Firebase &bull; Pure Node.js</span>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
