import React from 'react';
import { Shield, LayoutGrid, Globe, Layers, Eye, FileCode2, Cloud, History, LogOut, Sun, Moon, Sparkles } from 'lucide-react';
import { User } from '../types';
import { Language, translations } from '../i18n';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
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

  const navItems = [
    { id: 'overview', label: t.dashboard, icon: LayoutGrid },
    { id: 'sites', label: t.sites, icon: Globe },
    { id: 'slots', label: t.adSlots, icon: Layers },
    { id: 'sandbox', label: t.liveSandbox, icon: Eye, badge: 'Live' },
    { id: 'wordpress', label: t.wordpress, icon: FileCode2 },
    { id: 'coolify', label: t.coolify, icon: Cloud },
    { id: 'logs', label: t.auditLogs, icon: History },
  ];

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer"
            onClick={() => setCurrentTab('overview')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 ring-1 ring-black/5 dark:ring-white/15">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                  AdPlatform
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Ad Manager
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:block">
                Ad Management Platform
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 rtl:space-x-reverse">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 relative ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-slate-200 dark:border-slate-700/60 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 text-[9px] bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Theme Toggle + Lang + User + Logout */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 rtl:space-x-reverse">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span>{lang === 'en' ? 'المغربية / العربية' : 'English'}</span>
            </button>

            {/* User info & Logout */}
            {user && (
              <div className="flex items-center gap-2 pl-2 rtl:pl-0 rtl:pr-2 border-l rtl:border-l-0 rtl:border-r border-slate-200 dark:border-slate-800">
                <div className="hidden lg:block text-right rtl:text-left">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.email}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-mono">{user.role}</p>
                </div>
                <button
                  onClick={onLogout}
                  title={t.logout}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800/80 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center overflow-x-auto py-2 space-x-1 rtl:space-x-reverse scrollbar-none border-t border-slate-200 dark:border-slate-800/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
