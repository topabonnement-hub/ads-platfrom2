import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, ShieldCheck, Eye, MousePointerClick, RefreshCw, Search, Download, AlertTriangle, UserCheck, UserX, Globe, Terminal, FileSpreadsheet } from 'lucide-react';
import { Language, translations } from '../i18n';
import { api } from '../api';

interface TrafficControlTabProps {
  lang: Language;
}

export const TrafficControlTab: React.FC<TrafficControlTabProps> = ({ lang }) => {
  const t = translations[lang];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [trafficData, setTrafficData] = useState<{
    totalImpressions: number;
    totalClicks: number;
    successfulLoginsCount: number;
    failedLoginAttemptsCount: number;
    uniqueIpVisitorsCount: number;
    loginActivity: {
      id: string;
      email: string;
      action: string;
      status: 'SUCCESS' | 'FAILED';
      details: string;
      ip: string;
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

  const exportTrafficCSV = () => {
    if (!trafficData) return;

    const lines: string[] = [];
    const escapeCsv = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

    lines.push('# TRAFFIC CONTROL & SECURITY ANALYTICS REPORT');
    lines.push(`Export Timestamp,${escapeCsv(new Date().toISOString())}`);
    lines.push(`Total Impressions Served,${trafficData.totalImpressions}`);
    lines.push(`Total Clicks,${trafficData.totalClicks}`);
    lines.push(`Successful Logins,${trafficData.successfulLoginsCount}`);
    lines.push(`Attempted / Failed Logins,${trafficData.failedLoginAttemptsCount}`);
    lines.push(`Unique IP Addresses,${trafficData.uniqueIpVisitorsCount}`);
    lines.push('');

    lines.push('# LOGIN VISITS & ATTEMPTED AUTHENTICATION LOGS');
    lines.push('Status,Target Email,Event Action,IP Address,Details,Timestamp');

    trafficData.loginActivity.forEach((item) => {
      lines.push([
        escapeCsv(item.status),
        escapeCsv(item.email),
        escapeCsv(item.action),
        escapeCsv(item.ip),
        escapeCsv(item.details),
        escapeCsv(new Date(item.timestamp).toLocaleString())
      ].join(','));
    });

    const csvContent = lines.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `adplatform_traffic_security_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = (trafficData?.loginActivity || []).filter((item) => {
    if (filter === 'success' && item.status !== 'SUCCESS') return false;
    if (filter === 'failed' && item.status !== 'FAILED') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      return (
        item.email.toLowerCase().includes(term) ||
        item.ip.toLowerCase().includes(term) ||
        item.details.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>{lang === 'ar' ? 'مراقبة حركة المرور والأمان' : 'Traffic Control & Security Monitor'}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {lang === 'ar' ? 'التحكم في الترافيك ومحاولات الدخول' : 'Traffic Control & Auth Logs'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            {lang === 'ar'
              ? 'تتبع حقيقي لعدد الإعلانات المعروضة، الزيارات الناجحة، محاولات الدخول الفاشلة، وعناوين IP.'
              : 'Real-time analytics for total ad impressions, successful logins, attempted/failed logins, and visitor IP security.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTrafficData}
            disabled={refreshing}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>

          <button
            onClick={exportTrafficCSV}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تصدير تقرير CSV' : 'Export Traffic CSV'}</span>
          </button>
        </div>
      </div>

      {/* 5 Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Impressions */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'الإعلانات المعروضة' : 'Ads Served'}
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {(trafficData?.totalImpressions || 0).toLocaleString()}
          </p>
        </div>

        {/* Clicks */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'نقرات الإعلانات' : 'Ad Clicks'}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {(trafficData?.totalClicks || 0).toLocaleString()}
          </p>
        </div>

        {/* Successful Logins */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'تسجيلات دخول ناجحة' : 'Successful Logins'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {trafficData?.successfulLoginsCount || 0}
          </p>
        </div>

        {/* Attempted / Failed Logins */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'محاولات فاشلة' : 'Failed Login Attempts'}
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {trafficData?.failedLoginAttemptsCount || 0}
          </p>
        </div>

        {/* Unique IPs */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'عناوين IP الفريدة' : 'Unique IP Visitors'}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {trafficData?.uniqueIpVisitorsCount || 1}
          </p>
        </div>
      </div>

      {/* Main Table: Login Visits & Attempted Auth Logs */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {lang === 'ar' ? 'الكل' : 'All Events'} ({trafficData?.loginActivity.length || 0})
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {lang === 'ar' ? 'دخول ناجح' : 'Successful Logins'} ({trafficData?.loginActivity.filter(i => i.status === 'SUCCESS').length || 0})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === 'failed'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
              }`}
            >
              {lang === 'ar' ? 'محاولات فاشلة' : 'Failed Attempts'} ({trafficData?.loginActivity.filter(i => i.status === 'FAILED').length || 0})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث بالبريد أو الـ IP...' : 'Search email, IP, details...'}
              className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Activity Table */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            {lang === 'ar' ? 'لا توجد بيانات مطابقة للبحث' : 'No authentication logs matching criteria'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="pb-3 font-semibold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="pb-3 font-semibold">{lang === 'ar' ? 'الحساب المستهدف' : 'Target Account'}</th>
                  <th className="pb-3 font-semibold">{lang === 'ar' ? 'عنوان IP' : 'IP Address'}</th>
                  <th className="pb-3 font-semibold">{lang === 'ar' ? 'التفاصيل' : 'Event Details'}</th>
                  <th className="pb-3 font-semibold text-right rtl:text-left">{lang === 'ar' ? 'التاريخ والوقت' : 'Timestamp'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 font-sans">
                      {item.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          <UserCheck className="w-3 h-3" />
                          <span>SUCCESS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                          <UserX className="w-3 h-3" />
                          <span>FAILED ATTEMPT</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-sans font-semibold text-slate-800 dark:text-slate-200">
                      {item.email}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                        {item.ip}
                      </span>
                    </td>
                    <td className="py-3 font-sans text-slate-600 dark:text-slate-400 text-[11px] max-w-xs truncate">
                      {item.details}
                    </td>
                    <td className="py-3 text-right rtl:text-left text-slate-500 text-[11px]">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
