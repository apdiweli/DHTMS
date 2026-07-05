import React, { useState, useEffect } from 'react';
import {
    Gavel, Settings, ChevronDown, ChevronUp, Search,
    Filter, Plus, MoreHorizontal, PieChart, Activity,
    ArrowUpRight, AlertCircle, Save, X, RefreshCw, Edit, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getTaxRules, recalculateAllTaxes, createTaxRule, updateTaxRule, deleteTaxRule } from '../services/api';

const CATEGORIES = ['All', 'Residential', 'Industrial', 'Agricultural', 'Government', 'Religious', 'Charity', 'Educational'];

export default function TaxManagement() {
    const { user } = useAuth();
    const [rules, setRules] = useState([]);
    const [activeTab, setActiveTab] = useState('All');
    const [expandedRow, setExpandedRow] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRecalculating, setIsRecalculating] = useState(false);

    // New Rule Form State
    const initialFormState = {
        ruleName: '',
        propertyType: 'Residential',
        buildingType: '',
        calculationMethod: 'Fixed',
        rate: '',
        description: ''
    };
    const [newRule, setNewRule] = useState(initialFormState);

    // Fetch rules on mount
    const fetchRules = async () => {
        setIsLoading(true);
        try {
            const res = await getTaxRules();
            setRules(res.data || []);
        } catch (error) {
            console.error("Failed to fetch tax rules", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    // Handle Form Submit
    const handleCreateRule = async (e) => {
        e.preventDefault();
        try {
            const ruleToSave = {
                ...newRule,
                rate: Number(newRule.rate),
                propertyType: newRule.propertyType || 'Residential'
            };

            // Only set isActive=true for new rules; preserve existing value when editing
            if (!editingRuleId) {
                ruleToSave.isActive = true;
            }

            if (editingRuleId) {
                await updateTaxRule(editingRuleId, ruleToSave);
                alert('Rule Updated Successfully!');
            } else {
                await createTaxRule(ruleToSave);
                alert('Rule Created Successfully!');
            }

            setIsFormOpen(false);
            setNewRule(initialFormState);
            setEditingRuleId(null);
            fetchRules(); // Refresh list
        } catch (error) {
            console.error("Failed to save rule", error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
            alert("Failed to save rule: " + errMsg);
        }
    };
    
    const handleEditClick = (rule, e) => {
        e.stopPropagation();
        setNewRule({
            ruleName: rule.ruleName,
            propertyType: rule.propertyType || 'Residential',
            buildingType: rule.buildingType || '',
            calculationMethod: rule.calculationMethod || 'Fixed',
            rate: rule.rate ?? '',
            description: rule.description || '',
            isActive: rule.isActive
        });
        setEditingRuleId(rule._id);
        setIsFormOpen(true);
    };

    const handleCreateClick = () => {
        setNewRule(initialFormState);
        setEditingRuleId(null);
        setIsFormOpen(true);
    };

    const handleDeleteRule = async (rule, e) => {
        e.stopPropagation();
        if (!window.confirm(`Delete rule "${rule.ruleName}"? This cannot be undone.`)) return;
        try {
            await deleteTaxRule(rule._id);
            setRules(prev => prev.filter(r => r._id !== rule._id));
        } catch (error) {
            const errMsg = error.response?.data?.error || error.message;
            alert('Failed to delete rule: ' + errMsg);
        }
    };

    // Handle Recalculate All
    const handleRecalculateAll = async () => {
        if (!window.confirm("This will update tax for ALL properties based on current rules. Continue?")) return;
        setIsRecalculating(true);
        try {
            const res = await recalculateAllTaxes();
            alert(`Success! Updated ${res.data.updatedSuccess} properties.`);
        } catch (error) {
            console.error(error);
            alert("Recalculation failed.");
        } finally {
            setIsRecalculating(false);
        }
    };

    // --- LOGIC ---
    const filteredRules = rules.filter(r => activeTab === 'All' || r.propertyType === activeTab);

    const toggleRow = (id) => {
        if (expandedRow === id) setExpandedRow(null);
        else setExpandedRow(id);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    // --- PERMISSION CHECK ---
    // if (!user.permissions.canEditTaxRate) return <div className="p-10 text-center text-gray-500">Access Denied</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

            {/* 1. Minimal Header */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-100 dark:border-slate-800 pb-6">
                <div>
                    <h2 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">Configuration</h2>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tax Rules & Rates</h1>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <button
                        onClick={handleRecalculateAll}
                        disabled={isRecalculating}
                        className="flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                        title="Force update all property taxes"
                    >
                        <RefreshCw size={16} className={`${isRecalculating ? 'animate-spin' : ''}`} />
                        {isRecalculating ? 'Processing...' : 'Recalculate All'}
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        System Active
                    </div>
                </div>
            </div>

            {/* 2. Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Gavel size={20} />
                        </div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Active Rules</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{rules.length} Rules</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                            <PieChart size={20} />
                        </div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Methods</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {[...new Set(rules.map(r => r.calculationMethod))].length} Types
                    </h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Settings size={20} />
                        </div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">System Status</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Operational</h3>
                </div>
            </div>

            {/* 3. Main Interface */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-lg shadow-gray-100 dark:shadow-slate-900/40 overflow-hidden transition-colors">

                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-slate-800/50">
                    {/* Tabs */}
                    <div className="flex p-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm overflow-x-auto">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveTab(cat)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === cat
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={handleCreateClick}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 transition-all"
                        >
                            <Plus size={18} /> New Rule
                        </button>
                    </div>
                </div>

                {/* The Table */}
                <div className="overflow-x-auto p-6">
                    {isLoading ? (
                        <div className="p-10 text-center text-gray-500 dark:text-gray-400">Loading Rules...</div>
                    ) : (
                        <div className="border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Rule Definition</th>
                                    <th className="px-6 py-4">Rate Structure</th>
                                    <th className="px-6 py-4">Method</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                {filteredRules.map(rule => (
                                    <React.Fragment key={rule._id}>
                                        {/* Main Row */}
                                        <tr
                                            onClick={() => toggleRow(rule._id)}
                                            className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50 group ${expandedRow === rule._id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-900'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-10 rounded-r-lg ${rule.isActive ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{rule.ruleName}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <span className="bg-gray-100 dark:bg-slate-800 px-1.5 rounded text-[10px]">{rule.propertyType}</span>
                                                            • {rule.buildingType}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-lg font-bold text-gray-800 dark:text-white">
                                                        {rule.calculationMethod === 'Fixed' ? formatCurrency(rule.rate) : `${rule.rate}%`}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-medium uppercase">Rate</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{rule.calculationMethod}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${rule.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${rule.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                                                    {rule.isActive ? 'Active' : 'Archived'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={(e) => handleEditClick(rule, e)}
                                                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                                                        title="Edit Rule"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    {user?.role === 'Super Admin' && (
                                                        <button
                                                            onClick={(e) => handleDeleteRule(rule, e)}
                                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                            title="Delete Rule"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleRow(rule._id); }}
                                                        className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                    >
                                                        {expandedRow === rule._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Detail Drawer (Accordion) */}
                                        {expandedRow === rule._id && (
                                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 animate-in slide-in-from-top-2 duration-200">
                                                <td colSpan="5" className="p-0">
                                                    <div className="p-6 pl-12 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 dark:border-slate-800">
                                                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
                                                            <h4 className="font-bold text-gray-800 dark:text-white text-sm mb-4">Description</h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">{rule.description || "No detailed description provided."}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 text-center text-xs text-gray-400">
                    Showing {filteredRules.length} rules
                </div>
            </div>

            {/* NEW/EDIT RULE FORM MODAL */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{editingRuleId ? 'Edit Tax Rule' : 'New Tax Rule'}</h2>
                            <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-600 dark:text-gray-300"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateRule} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rule Name</label>
                                <input required type="text" value={newRule.ruleName} onChange={e => setNewRule({ ...newRule, ruleName: e.target.value })} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="e.g. 2025 Standard Levy" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property Category</label>
                                <select value={newRule.propertyType} onChange={e => setNewRule({ ...newRule, propertyType: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white">
                                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Building/Unit Type (Target)</label>
                                <input required type="text" value={newRule.buildingType} onChange={e => setNewRule({ ...newRule, buildingType: e.target.value })} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="e.g. Apartment, Villa, Shop..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Method</label>
                                    <select value={newRule.calculationMethod} onChange={e => setNewRule({ ...newRule, calculationMethod: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none text-gray-900 dark:text-white">
                                        <option value="Fixed">Fixed Amount</option>
                                        <option value="PerUnit">Per Unit</option>
                                        <option value="PerFloor">Per Floor</option>
                                        <option value="PerM2">Per Sqm (m²)</option>
                                        <option value="PerHectare">Per Hectare</option>
                                        <option value="PerHalfHectare">Per Half Hectare</option>
                                        <option value="Percentage">Percentage %</option>
                                        <option value="Exempt">Exempt</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate</label>
                                    <input required type="number" value={newRule.rate} onChange={e => setNewRule({ ...newRule, rate: e.target.value })} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea rows="3" value={newRule.description} onChange={e => setNewRule({ ...newRule, description: e.target.value })} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="Optional notes..."></textarea>
                            </div>
                            <div className="pt-10">
                                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 hover:bg-indigo-700 flex justify-center items-center gap-2 transition-transform active:scale-95">
                                    <Save size={20} /> {editingRuleId ? 'Update Rule' : 'Create Rule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}