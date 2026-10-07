import React, { useState } from 'react';
import { Shield, LayoutGrid, Globe, Layers, Eye, FileCode2, Cloud, History, Settings, LogOut, Sun, Moon, Sparkles, Menu, X, ChevronRight } from 'lucide-react';
import { User } from '../types';
import { Language, translations } from '../i18n';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  lang,
  setLang,
  theme,
  setTheme,
}) => {
  const t = translations[lang];
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: t.dashboard, icon: LayoutGrid },
    { id: 'sites', label: t.sites, icon: Globe },
    { id: 'slots', label: t.adSlots, icon: Layers },
    { id: 'sandbox', label: t.liveSandbox, icon: Eye, badge: 'Live' },
    { id: 'wordpress', label: t.wordpress, icon: FileCode2 },
    { id: 'coolify', label: t.coolify, icon: Cloud },
    { id: 'logs', label: t.auditLogs, icon: History },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  const handleSelectTab = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* -------------------------------------------------- */}
      {/* MOBILE TOP BAR (visible on screens < md)          */}
      {/* -------------------------------------------------- */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div
          className="flex items-center space-x-2.5 rtl:space-x-reverse cursor-pointer"
          onClick={() => handleSelectTab('overview')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
            AdPlatform
          </span>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Lang Toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg"
          >
            {lang === 'en' ? 'عربي' : 'EN'}
          </button>

          {/* Mobile Drawer Trigger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* -------------------------------------------------- */}
      {/* DESKTOP FIXED SIDEBAR & MOBILE DRAWER PANEL        */}
      {/* -------------------------------------------------- */}
      <aside
        className={`fixed top-0 bottom-0 z-50 w-64 bg-white dark:bg-slate-900 border-r rtl:border-r-0 rtl:border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          lang === 'ar' ? 'right-0' : 'left-0'
        } ${
          mobileOpen ? 'translate-x-0' : 'max-md:-translate-x-full rtl:max-md:translate-x-full'
        }`}
      >
        {/* Top Branding Section */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80">
          <div
            className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer group"
            onClick={() => handleSelectTab('overview')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                  AdPlatform
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 rounded-full flex items-center gap-0.5">
                  <Sparkles className="w-2 h-2" /> v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Self-Hosted Ad Engine
              </p>
            </div>
          </div>
        </div>

        {/* Center Vertical Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {lang === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/10 to-indigo-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-200 dark:border-sky-500/20 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                  }`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-sky-500 rtl:rotate-180" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Controls & Preferences Section */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Theme Switcher */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              )}
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>
          </div>

          {/* User Profile & Logout Box */}
          {user && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => handleSelectTab('settings')}
              >
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.email}</p>
                <p className="text-[10px] text-slate-500 uppercase font-mono">{user.role}</p>
              </div>

              <button
                onClick={onLogout}
                title={t.logout}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
