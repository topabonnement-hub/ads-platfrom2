import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, ShieldCheck, Eye, MousePointerClick, RefreshCw, Search, Globe, Terminal, FileSpreadsheet, MapPin, Laptop, Link2, AlertTriangle, UserCheck, UserX, Clock, Radio } from 'lucide-react';
import { Language, translations } from '../i18n';
import { api } from '../api';

interface TrafficControlTabProps {
  lang: Language;
}

export const TrafficControlTab: React.FC<TrafficControlTabProps> = ({ lang }) => {
  const t = translations[lang];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'countries' | 'pages' | 'security'>('feed');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [trafficData, setTrafficData] = useState<{
    totalImpressions: number;
    totalClicks: number;
    successfulLoginsCount: number;
    failedLoginAttemptsCount: number;
    uniqueIpVisitorsCount: number;
    topCountries: {
      code: string;
      name: string;
      flag: string;
      visitorsCount: number;
      percentage: number;
    }[];
    topPages: {
      url: string;
      views: number;
      uniqueIps: number;
    }[];
    liveFeed: {
      id: string;
      email: string;
      action: string;
      status: 'SUCCESS' | 'FAILED' | 'WARNING';
      details: string;
      ip: string;
      country: string;
      countryCode: string;
      countryFlag: string;
      city: string;
      page: string;
      device: string;
      timestamp: string;
    }[];
  } | null>(null);

  const fetchTrafficData = async () => {
    try {
      setRefreshing(true);
      const res = await api.getTrafficAnalytics();
      setTrafficData(res.traffic);
    } catch (err) {
      console.error('Failed to load traffic analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrafficData();
  }, []);

  // Live Auto Refresh every 10s if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchTrafficData();
    }, 10000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const exportTrafficCSV = () => {
    if (!trafficData) return;

    const lines: string[] = [];
    const escapeCsv = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

    lines.push('# TRAFFIC CONTROL & GEOGRAPHIC SECURITY REPORT');
    lines.push(`Export Timestamp,${escapeCsv(new Date().toISOString())}`);
    lines.push(`Total Impressions Served,${trafficData.totalImpressions}`);
    lines.push(`Total Clicks,${trafficData.totalClicks}`);
    lines.push(`Successful Logins,${trafficData.successfulLoginsCount}`);
    lines.push(`Failed Logins / Security Alerts,${trafficData.failedLoginAttemptsCount}`);
    lines.push(`Unique IP Visitors,${trafficData.uniqueIpVisitorsCount}`);
    lines.push('');

    lines.push('# LIVE TRAFFIC LOGS (IP, COUNTRY, PAGE, DEVICE)');
    lines.push('Status,IP Address,Country,City,Page / Embed URL,User / Account,Event Action,Device,Timestamp');

    (trafficData.liveFeed || []).forEach((item) => {
      lines.push([
        escapeCsv(item.status),
        escapeCsv(item.ip),
        escapeCsv(`${item.countryFlag} ${item.country}`),
        escapeCsv(item.city),
        escapeCsv(item.page),
        escapeCsv(item.email),
        escapeCsv(item.action),
        escapeCsv(item.device),
        escapeCsv(new Date(item.timestamp).toLocaleString())
      ].join(','));
    });

    const csvContent = lines.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `traffic_control_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredFeed = (trafficData?.liveFeed || []).filter((item) => {
    if (activeTab === 'security' && item.status === 'SUCCESS') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      return (
        item.email.toLowerCase().includes(term) ||
        item.ip.toLowerCase().includes(term) ||
        item.country.toLowerCase().includes(term) ||
        item.page.toLowerCase().includes(term) ||
        item.action.toLowerCase().includes(term) ||
        item.details.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{lang === 'ar' ? 'مراقبة حية مباشرة' : 'LIVE MONITORING ACTIVE'}</span>
            </div>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {lang === 'ar' ? 'تحديد مواقع IP والجلسات' : 'GeoIP & Visitor Analytics'}
            </span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-sky-500" />
            <span>{lang === 'ar' ? 'مركز مراقبة حركة المرور والأمان (Traffic Control)' : 'Traffic Control & Live Geo Analytics'}</span>
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            {lang === 'ar'
              ? 'تتبع الدخول، عناوين IP، البلدان، الصفحات التي تعرض الإعلانات، ومحاولات الأمان الحية لحظة بلحظة.'
              : 'Real-time detection for visitor IP addresses, geographic locations, ad page requests, active sessions, and security alerts.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Auto-Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
              autoRefresh
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-500 animate-pulse' : ''}`} />
            <span>{autoRefresh ? (lang === 'ar' ? 'تحديث تلقائي: مفعل' : 'Auto-Live: ON') : (lang === 'ar' ? 'تحديث تلقائي: متوقف' : 'Auto-Live: OFF')}</span>
          </button>

          <button
            onClick={fetchTrafficData}
            disabled={refreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{lang === 'ar' ? 'تحديث الآن' : 'Refresh Now'}</span>
          </button>

          <button
            onClick={exportTrafficCSV}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* 5 Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Ads Served */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>{lang === 'ar' ? 'الإعلانات المعروضة' : 'Ads Served'}</span>
            <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {(trafficData?.totalImpressions || 0).toLocaleString()}
          </p>
        </div>

        {/* Ad Clicks */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>{lang === 'ar' ? 'النقرات' : 'Ad Clicks'}</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {(trafficData?.totalClicks || 0).toLocaleString()}
          </p>
        </div>

        {/* Unique IP Visitors */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>{lang === 'ar' ? 'زوار IP الفريدين' : 'Unique IP Visitors'}</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {trafficData?.uniqueIpVisitorsCount || 1}
          </p>
        </div>

        {/* Successful Auth */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>{lang === 'ar' ? 'تسجيل دخول ناجح' : 'Successful Logins'}</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {trafficData?.successfulLoginsCount || 0}
          </p>
        </div>

        {/* Failed Login Security Alerts */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>{lang === 'ar' ? 'تنبيهات الأمان / الفاشلة' : 'Failed Security Alerts'}</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {trafficData?.failedLoginAttemptsCount || 0}
          </p>
        </div>
      </div>

      {/* Main Content Grid: Live Feed & Country/Pages breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1-Col: Top Countries & Top Pages Cards */}
        <div className="space-y-6">
          {/* Top Countries Geo Distribution */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-500" />
                <span>{lang === 'ar' ? 'التوزيع الجغرافي (حسب الدول)' : 'Top Visitor Countries'}</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">GeoIP</span>
            </div>

            <div className="space-y-3">
              {(trafficData?.topCountries || []).map((country) => (
                <div key={country.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="text-base">{country.flag}</span>
                      <span>{country.name}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                      {country.visitorsCount} ({country.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(country.percentage, 5)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Pages & Embed URLs */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-500" />
                <span>{lang === 'ar' ? 'الصفحات والنطاقات النشطة' : 'Top Visited Pages & Domains'}</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">URLs</span>
            </div>

            <div className="space-y-2.5">
              {(trafficData?.topPages || []).map((page) => (
                <div
                  key={page.url}
                  className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 max-w-[200px] truncate">
                    <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate" title={page.url}>
                      {page.url}
                    </p>
                    <p className="text-[10px] text-slate-500">Unique IPs: {page.uniqueIps}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                    {page.views} views
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2-Col: Live Stream / Detailed Activity Table */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
          {/* Section Navigation Tabs & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('feed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'feed'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {lang === 'ar' ? 'بث الترافيك المباشر' : 'Live Traffic Stream'} ({trafficData?.liveFeed.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'security'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                }`}
              >
                {lang === 'ar' ? 'تنبيهات الأمان' : 'Security Alerts'} ({trafficData?.liveFeed.filter(i => i.status !== 'SUCCESS').length || 0})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={lang === 'ar' ? 'بحث بالـ IP، الدولة، الصفحة...' : 'Search IP, country, page, email...'}
                className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Activity Logs Table */}
          {filteredFeed.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              {lang === 'ar' ? 'لا توجد سجلات ترافيك مطابقة للبحث حالياً' : 'No traffic logs matching search criteria.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="pb-3">{lang === 'ar' ? 'عنوان IP والدولة' : 'IP & Country'}</th>
                    <th className="pb-3">{lang === 'ar' ? 'الحساب / المستخدم' : 'User / Visitor'}</th>
                    <th className="pb-3">{lang === 'ar' ? 'الصفحة / الحدث' : 'Target Page & Action'}</th>
                    <th className="pb-3">{lang === 'ar' ? 'الجهاز' : 'Device'}</th>
                    <th className="pb-3 text-right rtl:text-left">{lang === 'ar' ? 'الوقت' : 'Timestamp'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {filteredFeed.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* IP & Country */}
                      <td className="py-3.5 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                          <span className="text-base">{item.countryFlag}</span>
                          <span>{item.ip}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-sans">
                          {item.city}, {item.country}
                        </p>
                      </td>

                      {/* User / Email */}
                      <td className="py-3.5 font-sans">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.email}
                        </div>
                        <span
                          className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded ${
                            item.status === 'SUCCESS'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Page / Event Action */}
                      <td className="py-3.5 font-sans max-w-[200px]">
                        <p className="font-mono text-sky-600 dark:text-sky-400 text-[11px] font-semibold truncate" title={item.page}>
                          {item.page}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate" title={item.details}>
                          {item.action}: {item.details}
                        </p>
                      </td>

                      {/* Device */}
                      <td className="py-3.5 font-sans text-[11px] text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Laptop className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[120px]">{item.device}</span>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 text-right rtl:text-left text-slate-500 text-[10px] font-sans">
                        <div className="flex items-center justify-end gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
