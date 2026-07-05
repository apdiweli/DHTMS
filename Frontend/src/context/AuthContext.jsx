// context/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- ROLE-BASED ACCESS CONTROL (RBAC) CONFIGURATION ---
const ROLE_PERMISSIONS = {
    'Super Admin': {
        // System Setup
        canManageUsers: true,
        canAudit: true,
        canViewReports: true,
        // Core Operations
        canCreateProperty: true,
        canEditTaxRate: true,
        canProcessPayment: true,
    },
    'Tax Officer': {
        // System Setup
        canManageUsers: false,
        canAudit: true, // Can view audit log for transparency
        canViewReports: false,
        // Core Operations
        canCreateProperty: true,
        canEditTaxRate: true,
        canProcessPayment: true, // Can manage payments within their jurisdiction
    },
    'Owner': {
        // System Setup
        canManageUsers: false,
        canAudit: false,
        canViewReports: false,
        // Core Operations
        canCreateProperty: false,
        canEditTaxRate: false,
        canProcessPayment: true, // The primary task
    },
};

const API_URL = 'http://localhost:5002/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser && storedToken) {
            const userData = JSON.parse(storedUser);
            setUser({
                ...userData,
                permissions: ROLE_PERMISSIONS[userData.role] || {},
                isAuthenticated: true,
            });
        }
        setLoading(false);
    }, []);

    // Login function - calls backend API
    const login = async (email, password) => {
        try {
            let response;
            try {
                response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });
            } catch (networkError) {
                // Server is unreachable
                throw new Error('Cannot connect to server. Please ensure the backend is running.');
            }

            // Safely parse JSON — backend might return HTML on crash/misconfiguration
            const contentType = response.headers.get('content-type') || '';
            let data = {};
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // Non-JSON response (e.g. HTML 404/500 page) — don't expose it
                const text = await response.text();
                console.error('Non-JSON response from server:', text.slice(0, 200));
                throw new Error('Server error. Please try again or contact support.');
            }

            if (!response.ok) {
                throw new Error(data.message || 'Invalid email or password. Please try again.');
            }

            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify({
                _id: data._id,
                name: data.name,
                email: data.email,
                role: data.role,
                jurisdiction: data.jurisdiction,
            }));

            // Set user state with permissions
            setUser({
                _id: data._id,
                name: data.name,
                email: data.email,
                role: data.role,
                jurisdiction: data.jurisdiction,
                permissions: ROLE_PERMISSIONS[data.role] || {},
                isAuthenticated: true,
            });

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        // Clear storage and reset state
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    // Helper to get auth token
    const getToken = () => localStorage.getItem('token');

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="text-white">Loading...</div>
        </div>;
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, getToken, ROLE_PERMISSIONS }}>
            {children}
        </AuthContext.Provider>
    );
};
