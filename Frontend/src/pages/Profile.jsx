import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Save, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserById, updateUser } from '../services/api';

export default function Profile() {
    const { user: authUser } = useAuth(); // Get ID from context
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        role: '',
        phone: '',
        currentPassword: '',
        newPassword: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const canEdit = authUser.role === 'Super Admin';

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        if (!authUser._id && !authUser.id) return;
        try {
            const id = authUser._id || authUser.id;
            const res = await getUserById(id);
            // Ensure we handle both { data: user } and direct user object
            const data = res.data?.data || res.data || {};
            setProfileData(prev => ({
                ...prev,
                ...data,
                // Keep passwords empty
                currentPassword: '',
                newPassword: ''
            }));
        } catch (error) {
            console.error("Failed to fetch profile", error);
            setMessage({ type: 'error', text: 'Failed to load profile data.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const id = authUser._id || authUser.id;
            // Filter out empty passwords if not changing
            const payload = { ...profileData };
            if (payload.newPassword) {
                payload.password = payload.newPassword;
            }
            delete payload.currentPassword;
            delete payload.newPassword;

            await updateUser(id, payload);
            setMessage({ type: 'success', text: 'Profile updated successfully.' });
        } catch (error) {
            console.error("Failed to update profile", error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center text-gray-500">Loading profile...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
                <p className="text-gray-500 text-sm">Manage your account settings and preferences.</p>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 sm:p-8 space-y-8">

                    {/* Header / Avatar */}
                    <div className="flex items-center gap-6 pb-8 border-b border-gray-100">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                            {profileData.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{profileData.name}</h2>
                            <p className="text-gray-500 flex items-center gap-1 mt-1 text-sm">
                                <Shield size={14} className="text-indigo-500" />
                                {profileData.role}
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    name="name"
                                    value={profileData.name}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${canEdit ? 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10' : 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'} outline-none transition-all`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleChange}
                                    disabled={!canEdit} // Email often locked or strictly validated
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${canEdit ? 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10' : 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'} outline-none transition-all`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Role</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={profileData.role}
                                    disabled
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 pl-1">Role cannot be changed directly.</p>
                            </div>
                        </div>

                        {/* Password Section - Optional */}
                        {canEdit && (
                            <>
                                <div className="md:col-span-2 pt-4 border-t border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <Key size={16} />
                                        Change Password
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">New Password</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={profileData.newPassword}
                                        onChange={handleChange}
                                        placeholder="Leave empty to keep current"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                    />
                                </div>
                            </>
                        )}

                        {/* Footer Actions */}
                        <div className="md:col-span-2 pt-6 flex justify-end gap-3">
                            {canEdit ? (
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            ) : (
                                <div className="px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg flex items-center gap-2">
                                    <Shield size={16} />
                                    View Only Mode
                                </div>
                            )}
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
