import React, { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldCheck, UserX, UserCheck, Search, Edit3, Trash2, ShieldAlert, Key, Mail, RefreshCw, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Language, translations } from '../i18n';
import { api } from '../api';
import { User } from '../types';

interface UsersTabProps {
  currentUser: User;
  lang: Language;
}

export const UsersTab: React.FC<UsersTabProps> = ({ currentUser, lang }) => {
  const t = translations[lang];

  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Search
  const [filter, setFilter] = useState<'all' | 'active' | 'banned' | 'admin'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [addLoading, setAddLoading] = useState(false);

  // Edit Modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete Confirm Modal state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await api.getAdminUsers();
      setUsersList(res.users);
    } catch (err: any) {
      setError(err.message || 'Failed to load users list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setError(null);
    try {
      await api.createAdminUser({
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      });
      setSuccessMsg(lang === 'ar' ? 'تم إنشاء الحساب بنجاح!' : 'User account created successfully!');
      setShowAddModal(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditLoading(true);
    setError(null);
    try {
      await api.updateAdminUser(editingUser.id, {
        email: editEmail,
        role: editRole,
        password: editPassword || undefined,
      });
      setSuccessMsg(lang === 'ar' ? 'تم تحديث الحساب بنجاح!' : 'User account updated successfully!');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleBan = async (user: User) => {
    if (user.id === currentUser.id) {
      setError(lang === 'ar' ? 'لا يمكنك حظر حسابك الخاص!' : 'You cannot ban your own account!');
      return;
    }

    try {
      const nextBanState = !user.isBanned;
      await api.banAdminUser(user.id, nextBanState);
      setSuccessMsg(
        nextBanState
          ? (lang === 'ar' ? `تم حظر المستخدم ${user.email}` : `User ${user.email} has been banned.`)
          : (lang === 'ar' ? `تم إلغاء حظر المستخدم ${user.email}` : `User ${user.email} unbanned successfully.`)
      );
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to change ban status');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    if (deletingUser.id === currentUser.id) {
      setError(lang === 'ar' ? 'لا يمكنك حذف حسابك الخاص!' : 'You cannot delete your own account!');
      setDeletingUser(null);
      return;
    }

    setDeleteLoading(true);
    setError(null);
    try {
      await api.deleteAdminUser(deletingUser.id);
      setSuccessMsg(lang === 'ar' ? 'تم حذف الحساب وجميع بياناته بنجاح!' : 'User account deleted successfully!');
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (filter === 'active' && u.isBanned) return false;
    if (filter === 'banned' && !u.isBanned) return false;
    if (filter === 'admin' && u.role !== 'admin') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      return u.email.toLowerCase().includes(term) || u.id.toLowerCase().includes(term);
    }
    return true;
  });

  const totalUsers = usersList.length;
  const activeCount = usersList.filter((u) => !u.isBanned).length;
  const bannedCount = usersList.filter((u) => u.isBanned).length;
  const adminCount = usersList.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs">
            <Users className="w-4 h-4" />
            <span>{t.usersManagement || 'Users Management'}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {lang === 'ar' ? 'إدارة المستخدمين والحسابات' : 'User Accounts & Access Control'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            {lang === 'ar'
              ? 'عرض جميع حسابات المستخدمين، تعديل البيانات، تعيين الأدوار، أو حظر/حذف الحسابات.'
              : 'Manage registered user accounts, edit profiles, assign admin privileges, ban/unban users, or delete accounts.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={refreshing}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-rose-700 dark:text-rose-300 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-emerald-700 dark:text-emerald-300 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'إجمالي الحسابات' : 'Total Accounts'}
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalUsers}</p>
        </div>

        {/* Active Users */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'الحسابات النشطة' : 'Active Accounts'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
        </div>

        {/* Banned Users */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'الحسابات المحظورة' : 'Banned Accounts'}
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{bannedCount}</p>
        </div>

        {/* Admins */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'المدراء (Admins)' : 'Administrators'}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{adminCount}</p>
        </div>
      </div>

      {/* Main Users Table Section */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {lang === 'ar' ? 'الكل' : 'All Users'} ({totalUsers})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {lang === 'ar' ? 'نشط' : 'Active'} ({activeCount})
            </button>
            <button
              onClick={() => setFilter('banned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === 'banned'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
              }`}
            >
              {lang === 'ar' ? 'محظور' : 'Banned'} ({bannedCount})
            </button>
            <button
              onClick={() => setFilter('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === 'admin'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
              }`}
            >
              {lang === 'ar' ? 'المدراء' : 'Admins'} ({adminCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث بالبريد الإلكتروني...' : 'Search by email address...'}
              className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            {t.loading}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            {lang === 'ar' ? 'لا يوجد مستخدمون يطابقون خيارات البحث' : 'No user accounts match criteria'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="pb-3 font-semibold">{lang === 'ar' ? 'البريد الإلكتروني' : 'User Email'}</th>
                  <th className="pb-3 font-semibold">{lang === 'ar' ? 'الدور (Role)' : 'Role'}</th>
                  <th className="pb-3 font-semibold">{lang === 'ar' ? 'الحالة' : 'Account Status'}</th>
                  <th className="pb-3 font-semibold">{lang === 'ar' ? 'المواقع / الإعلانات' : 'Sites / Ads'}</th>
                  <th className="pb-3 font-semibold">{lang === 'ar' ? 'تاريخ التسجيل' : 'Registered Date'}</th>
                  <th className="pb-3 font-semibold text-right rtl:text-left">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      {/* Email */}
                      <td className="py-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{u.email}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 rounded">
                              {lang === 'ar' ? 'أنت' : 'You'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <span>User</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5">
                        {u.isBanned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                            <UserX className="w-3 h-3" />
                            <span>Banned</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            <UserCheck className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      {/* Sites / Ads count */}
                      <td className="py-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {u.sitesCount || 0} sites &bull; {u.slotsCount || 0} slots
                      </td>

                      {/* Created date */}
                      <td className="py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 text-right rtl:text-left">
                        <div className="inline-flex items-center gap-1">
                          {/* Ban / Unban Button */}
                          <button
                            onClick={() => handleToggleBan(u)}
                            disabled={isSelf}
                            title={u.isBanned ? (lang === 'ar' ? 'إلغاء الحظر' : 'Unban User') : (lang === 'ar' ? 'حظر الحساب' : 'Ban User')}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${
                              u.isBanned
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400'
                            }`}
                          >
                            {u.isBanned ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>

                          {/* Edit User Button */}
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setEditEmail(u.email);
                              setEditRole(u.role);
                              setEditPassword('');
                            }}
                            title={lang === 'ar' ? 'تعديل الحساب' : 'Edit User'}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete User Button */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={isSelf}
                            title={lang === 'ar' ? 'حذف الحساب' : 'Delete User'}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 transition-colors disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add New User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {lang === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User Account'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.email}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.password}
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'نوع الحساب (Role)' : 'Account Role'}
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="user">{lang === 'ar' ? 'مستخدم عادي (User)' : 'Regular User'}</option>
                  <option value="admin">{lang === 'ar' ? 'مدير نظام (Admin)' : 'Administrator'}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  {addLoading ? t.loading : (lang === 'ar' ? 'إنشاء الحساب' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {lang === 'ar' ? 'تعديل بيانات المستخدم' : 'Edit User Account'}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.email}
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'نوع الحساب (Role)' : 'Role'}
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'user' | 'admin')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="user">{lang === 'ar' ? 'مستخدم عادي (User)' : 'Regular User'}</option>
                  <option value="admin">{lang === 'ar' ? 'مدير نظام (Admin)' : 'Administrator'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'تغيير كلمة السر (اتركه فارغاً للإبقاء عليها)' : 'Reset Password (optional)'}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  {editLoading ? t.loading : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete User Confirm */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {lang === 'ar' ? 'حذف حساب المستخدم؟' : 'Delete User Account?'}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar'
                ? `سيتم حذف الحساب "${deletingUser.email}" بصفة نهائية مع جميع المواقع والإعلانات التابعة له.`
                : `User account "${deletingUser.email}" and all associated websites and ads will be permanently removed.`}
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {deleteLoading ? t.loading : t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
