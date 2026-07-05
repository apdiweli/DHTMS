// pages/Settings.jsx

import React, { useState, useEffect } from 'react';
import {
    Settings as SettingsIcon,
    Globe,
    Database,
    Shield,
    Clock,
    CheckCircle,
    Loader,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getSettings, updateSettings } from '../services/api';

const settingsTabs = [
    { id: 'general', name: 'General', icon: SettingsIcon, description: 'Basic system configurations.' },
    { id: 'security', name: 'Security', icon: Shield, description: 'Password and access controls.' },
    { id: 'integrations', name: 'Integrations', icon: Database, description: 'API and external system links.' },
    { id: 'localization', name: 'Localization', icon: Globe, description: 'Timezone and language settings.' },
];

export default function Settings() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(settingsTabs[0].id);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState({
        entityName: '',
        contactEmail: '',
        twoFactorEnabled: false,
        minimumPasswordLength: 8,
        mobileMoneyApiEndpoint: '',
        timezone: 'UTC+3 (East Africa Time)',
        defaultCurrency: 'USD'
    });

    if (user.role !== 'Super Admin') {
        return (
            <div className="text-center bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-6 rounded-lg shadow-md mt-10">
                <Shield className="w-8 h-8 mx-auto mb-3" />
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p>Only the **Super Admin** role has access to system configurations and settings.</p>
            </div>
        );
    }

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const response = await getSettings();
            if (response.data.success) {
                setSettings(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            alert('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await updateSettings(settings);
            if (response.data.success) {
                alert('Settings saved successfully!');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold border-b dark:border-slate-800 pb-2 text-gray-800 dark:text-white">System Identification</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Government Entity Name</label>
                            <input
                                type="text"
                                value={settings.entityName}
                                onChange={(e) => handleInputChange('entityName', e.target.value)}
                                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System Contact Email</label>
                            <input
                                type="email"
                                value={settings.contactEmail}
                                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold border-b dark:border-slate-800 pb-2 text-gray-800 dark:text-white">Password Policy</h3>

                        {/* 2FA Toggle */}
                        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <label htmlFor="2fa" className="text-base font-semibold text-gray-800 dark:text-white cursor-pointer">
                                        Two-Factor Authentication (2FA)
                                    </label>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Require all users to use 2FA for enhanced security
                                    </p>
                                </div>
                                <div className="ml-4">
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('twoFactorEnabled', !settings.twoFactorEnabled)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${settings.twoFactorEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${settings.twoFactorEnabled
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                    }`}>
                                    {settings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                        </div>

                        {/* Password Length */}
                        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                            <label className="block text-base font-semibold text-gray-800 dark:text-white mb-2">
                                Minimum Password Length
                            </label>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Set the minimum number of characters required for user passwords
                            </p>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    value={settings.minimumPasswordLength}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (value >= 4 && value <= 16) {
                                            handleInputChange('minimumPasswordLength', value);
                                        }
                                    }}
                                    min="4"
                                    max="16"
                                    className="w-24 border border-gray-300 dark:border-slate-700 rounded-lg p-2 text-center text-lg font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                />
                                <span className="text-gray-600 dark:text-gray-400">characters</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Allowed range: 4-16 characters. Current: <strong>{settings.minimumPasswordLength}</strong>
                            </p>
                        </div>
                    </div>
                );
            case 'integrations':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold border-b dark:border-slate-800 pb-2 text-gray-800 dark:text-white">External Services</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile Money API Endpoint</label>
                            <input
                                type="text"
                                value={settings.mobileMoneyApiEndpoint}
                                onChange={(e) => handleInputChange('mobileMoneyApiEndpoint', e.target.value)}
                                placeholder="https://api.mobilemoney.so/v1"
                                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-400 p-3 rounded-md text-sm">
                            **Note:** API keys would be managed here, but are hidden for security purposes in this view.
                        </div>
                    </div>
                );
            case 'localization':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold border-b dark:border-slate-800 pb-2 text-gray-800 dark:text-white">Regional Settings</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                            <div className="flex items-center">
                                <Clock size={18} className="text-gray-500 mr-2" />
                                <select
                                    value={settings.timezone}
                                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                                    className="border border-gray-300 dark:border-slate-700 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                >
                                    <option>UTC+3 (East Africa Time)</option>
                                    <option>UTC+0 (GMT)</option>
                                    <option>UTC+1 (Central European Time)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Currency</label>
                            <select
                                value={settings.defaultCurrency}
                                onChange={(e) => handleInputChange('defaultCurrency', e.target.value)}
                                className="border border-gray-300 dark:border-slate-700 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            >
                                <option value="USD">USD (United States Dollar)</option>
                                <option value="SOS">SOS (Somali Shilling)</option>
                            </select>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader className="w-12 h-12 mx-auto mb-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                System Settings
            </h1>

            <div className="bg-white dark:bg-slate-900 shadow-xl rounded-xl overflow-hidden flex flex-col lg:flex-row transition-colors">
                <nav className="p-6 lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30">
                    <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Configuration</h2>
                    <ul className="space-y-2">
                        {settingsTabs.map(tab => (
                            <li key={tab.id}>
                                <button
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors ${activeTab === tab.id
                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-semibold'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <tab.icon size={20} />
                                    {tab.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="flex-1 p-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{settingsTabs.find(t => t.id === activeTab).name}</h2>
                        <p className="text-gray-500 dark:text-gray-400">{settingsTabs.find(t => t.id === activeTab).description}</p>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                        {renderTabContent()}

                        <div className="pt-6 border-t border-gray-200 dark:border-slate-800 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors shadow-md ${isSaving ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                            >
                                <CheckCircle size={20} />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}