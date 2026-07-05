// pages/UserManagement.jsx

import React, { useState, useEffect } from 'react';
import {
    UserCog,
    Search,
    Edit,
    CheckCircle,
    XCircle,
    MapPin,
    PlusCircle,
    Trash2,
    AlertTriangle,
    Loader,
    Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
    getUsers,
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser
} from '../services/api';

const BANADIR_DISTRICTS = ['Abdiaziz', 'Bondhere', 'Daynile', 'Dharkenley', 'Garasbaley', 'Hamar Jajab', 'Hamar Weyne', 'Heliwa', 'Hodan', 'Howlwadag', 'Kahda', 'Karan', 'Shangani', 'Shibis', 'Waberi', 'Wadajir', 'Wardhigley', 'Yaqshid'].sort();

/**
 * User Management Page (Accessible only by Super Admin)
 */
const UserManagement = () => {
    const { user } = useAuth();
    const [staffList, setStaffList] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Form state
    const [userForm, setUserForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Tax Officer',
        jurisdiction: 'All Districts',
        status: 'Active'
    });

    // Fetch users on mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await getUsers();
            setStaffList(response.data.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Failed to load users. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Handlers ---

    // 1. Open Modal for Create
    const openCreateModal = () => {
        setIsEditMode(false);
        setSelectedUserId(null);
        setUserForm({
            name: '',
            email: '',
            password: '',
            role: 'Tax Officer',
            jurisdiction: 'All Districts',
            status: 'Active'
        });
        setIsAddModalOpen(true);
    };

    // 2. Open Modal for Edit
    const openEditModal = (staff) => {
        setIsEditMode(true);
        setSelectedUserId(staff._id);
        setUserForm({
            name: staff.name,
            email: staff.email,
            password: '', // Leave empty to keep existing
            role: staff.role,
            jurisdiction: staff.jurisdiction || 'All Districts',
            status: staff.status
        });
        setIsAddModalOpen(true);
    };

    // 3. Handle Submit (Create or Update)
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (isEditMode) {
                // Update User
                const dataToUpdate = { ...userForm };
                if (!dataToUpdate.password) delete dataToUpdate.password; // Don't send empty password

                await updateUser(selectedUserId, dataToUpdate);
                alert('User updated successfully!');
            } else {
                // Create User
                await createUser(userForm);
                alert('User created successfully!');
            }

            // Refresh user list
            await fetchUsers();
            setIsAddModalOpen(false);
        } catch (error) {
            console.error('Error saving user:', error);
            alert(error.response?.data?.message || 'Failed to save user. Please try again.');
        }
    };

    // 4. Handle Status Toggle
    const handleStatusToggle = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
        if (!confirm(`Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'suspend'} this user?`)) {
            return;
        }
        try {
            await updateUserStatus(userId, newStatus);
            alert('User status updated successfully!');
            await fetchUsers();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update user status. Please try again.');
        }
    };

    // 5. Handle Delete User
    const handleDeleteUser = async (userId, userName) => {
        if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
            return;
        }
        try {
            await deleteUser(userId);
            alert('User deleted successfully!');
            await fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert(error.response?.data?.message || 'Failed to delete user. Please try again.');
        }
    };

    // --- Permission Check ---
    if (!user?.permissions?.canManageUsers) {
        return (
            <div className="text-center bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md mt-10">
                <Lock className="w-8 h-8 mx-auto mb-3" />
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p>This page is restricted. You must have the **`canManageUsers`** privilege (Super Admin only) to view and modify staff.</p>
            </div>
        );
    }

    // Filter users based on search
    const filteredStaff = staffList.filter(staff =>
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <UserCog className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    User Management
                </h1>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                >
                    <PlusCircle size={20} />
                    Add New Staff
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
                    <div className="text-center">
                        <Loader className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                        <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={20} />
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* Staff List Table */}
            {!isLoading && !error && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden transition-colors">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-slate-800">
                            <thead className="bg-gray-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="text-left px-6 py-3 font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Staff Member</th>
                                    <th className="text-left px-6 py-3 font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                    <th className="text-left px-6 py-3 font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Jurisdiction</th>
                                    <th className="text-center px-6 py-3 font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-center px-6 py-3 font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                                {filteredStaff.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStaff.map((staff) => (
                                        <tr key={staff._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">
                                                {staff.name} <br />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{staff.email}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">{staff.role}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                                <MapPin size={14} className="text-green-500" />
                                                {staff.jurisdiction}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleStatusToggle(staff._id, staff.status)}
                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${staff.status === 'Active'
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                        }`}
                                                >
                                                    {staff.status}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        title="Edit User"
                                                        onClick={() => openEditModal(staff)}
                                                        className="text-indigo-500 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded transition-colors"
                                                    >
                                                        <Edit size={18} />
                                                    </button>

                                                    {staff.role !== 'Super Admin' && (
                                                        <button
                                                            title="Delete User"
                                                            onClick={() => handleDeleteUser(staff._id, staff.name)}
                                                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- Add/Edit User Modal --- */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-gray-800 dark:text-white">
                                {isEditMode ? 'Edit Staff Member' : 'Add New Staff Member'}
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)}>
                                <XCircle size={20} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={userForm.name}
                                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                    placeholder="e.g. Ahmed Ali"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={userForm.email}
                                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                    placeholder="staff@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Password {isEditMode && <span className="text-gray-400 font-normal">(Leave blank to keep current)</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        required={!isEditMode}
                                        value={userForm.password}
                                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                        className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                        placeholder={isEditMode ? "••••••••" : "••••••••"}
                                    />
                                    {!isEditMode && <p className="text-[10px] text-gray-400 mt-1">Must be at least 6 characters</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                                    <select
                                        value={userForm.role}
                                        onChange={(e) => {
                                            const newRole = e.target.value;
                                            setUserForm({
                                                ...userForm,
                                                role: newRole,
                                                jurisdiction: newRole === 'Tax Officer' ? '' : 'All Districts'
                                            });
                                        }}
                                        className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 outline-none"
                                    >
                                        <option value="Tax Officer">Tax Officer</option>
                                        <option value="Super Admin">Super Admin</option>
                                        <option value="Owner">Owner</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Jurisdiction</label>
                                    <select
                                        value={userForm.jurisdiction}
                                        onChange={(e) => setUserForm({ ...userForm, jurisdiction: e.target.value })}
                                        disabled={userForm.role === 'Super Admin'}
                                        className={`w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg outline-none ${userForm.role === 'Super Admin'
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-slate-900 dark:text-gray-500'
                                            : 'bg-white text-gray-800 dark:bg-slate-800 dark:text-gray-200'
                                            }`}
                                    >
                                        {userForm.role === 'Super Admin' ? (
                                            <option value="All Districts">All Districts</option>
                                        ) : (
                                            <>
                                                <option value="" disabled>Select District</option>
                                                {BANADIR_DISTRICTS.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all hover:shadow-indigo-200"
                                >
                                    {isEditMode ? 'Update Staff' : 'Create Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserManagement;