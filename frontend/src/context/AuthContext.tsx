import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { safeJson } from '../utils/api';

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  loginAs: (userId: string) => Promise<void>;
  loginWithCredentials: (email: string) => Promise<boolean>;
  loginWithMobileAndPassword: (mobileOrEmail: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signupRetailer: (name: string, storeName: string, email: string, mobileNumber?: string, password?: string, state?: string, district?: string, block?: string, referralCode?: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: { name?: string; storeName?: string; email?: string; mobileNumber?: string; state?: string; district?: string; block?: string; currentPassword?: string; newPassword?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateLocalWallet: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TOKEN_KEY = 'ecyber_session_token';

function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

function setSessionToken(token: string) {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch (e) {
    console.error('Failed to set session token:', e);
  }
}

function clearSessionToken() {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem('ecyber_user_session'); // Clean up legacy key
  } catch (e) {
    console.error('Failed to clear session token:', e);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const token = getSessionToken();
      if (!token) return null;
      const cached = localStorage.getItem('ecyber_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const cached = localStorage.getItem('ecyber_cached_all_users');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  // Sync user changes to persistent cache
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('ecyber_cached_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('ecyber_cached_user');
      }
    } catch (e) {}
  }, [user]);

  const fetchUsers = async () => {
    try {
      const token = getSessionToken();
      if (!token) {
        setAllUsers([]);
        return;
      }
      const res = await fetch('/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Session-Token': token,
        },
      });
      if (res.ok) {
        const data: User[] = (await safeJson(res, [])) || [];
        setAllUsers(data);
        try {
          localStorage.setItem('ecyber_cached_all_users', JSON.stringify(data));
        } catch (e) {}
      } else {
        setAllUsers([]);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  };

  // Verify active session token on initialization
  const verifyCurrentSession = async () => {
    const token = getSessionToken();
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token }),
      });

      if (res.ok) {
        const data = await safeJson(res);
        if (data) {
          setUser(data.user);
          setSessionToken(data.sessionToken);
        } else {
          clearSessionToken();
          setUser(null);
        }
      } else {
        clearSessionToken();
        setUser(null);
      }
    } catch (e) {
      console.error('Error verifying session token:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    verifyCurrentSession();

    // Re-verify session only on window focus or visibility change
    const handleFocus = () => {
      verifyCurrentSession();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Admin-Only Account Switching
  const loginAs = async (targetUserId: string) => {
    const token = getSessionToken();
    if (!token) {
      alert('🔒 Unauthorized! Please log in as Admin first.');
      return;
    }

    try {
      const res = await fetch('/api/auth/impersonate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Session-Token': token
        },
        body: JSON.stringify({ adminSessionToken: token, targetUserId }),
      });
      const data = (await safeJson(res)) || {};
      if (res.ok && data.sessionToken) {
        setSessionToken(data.sessionToken);
        setUser(data.user);
        window.dispatchEvent(new CustomEvent('login_as_success', { detail: data.user }));
      } else {
        alert(`❌ Account Switch Failed: ${data.error || 'Permission denied.'}`);
      }
    } catch (e: any) {
      alert(`❌ Connection Error: ${e.message}`);
    }
  };

  const loginWithCredentials = async (email: string) => {
    return false;
  };

  const loginWithMobileAndPassword = async (mobileOrEmail: string, password?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileOrEmail, password }),
      });
      const data = await safeJson<any>(res, null);
      if (res.ok && data?.sessionToken) {
        setUser(data.user);
        setSessionToken(data.sessionToken);
        fetchUsers();
        return { success: true };
      } else {
        const errorMsg = data?.error || (res.status === 401 ? 'Incorrect Mobile/Email or Password!' : 'Login failed. Please check your credentials or network connection.');
        return { success: false, error: errorMsg };
      }
    } catch (e: any) {
      console.error('Login error:', e);
      return { success: false, error: e?.message || 'Server connection error. Please try again.' };
    }
  };

  const signupRetailer = async (name: string, storeName: string, email: string, mobileNumber?: string, password?: string, state?: string, district?: string, block?: string, referralCode?: string, role?: UserRole) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, storeName, email, mobileNumber, password, state, district, block, referralCode, role }),
      });
      const data = await safeJson<any>(res, null);
      if (res.ok && data?.sessionToken) {
        setUser(data.user);
        setSessionToken(data.sessionToken);
        fetchUsers();
        return { success: true };
      } else {
        const errorMsg = data?.error || 'Registration failed. Please check your details or try again.';
        return { success: false, error: errorMsg };
      }
    } catch (e: any) {
      return { success: false, error: 'Server connection error. Please try again.' };
    }
  };

  const updateProfile = async (data: { name?: string; storeName?: string; email?: string; mobileNumber?: string; state?: string; district?: string; block?: string; currentPassword?: string; newPassword?: string }) => {
    if (!user) return { success: false, error: 'No user logged in.' };
    const token = getSessionToken();
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token, userId: user.id, ...data }),
      });
      const resData = await safeJson<any>(res, null);
      if (res.ok && resData?.user) {
        setUser(resData.user);
        await fetchUsers();
        return { success: true, message: resData.message || 'Profile updated successfully.' };
      } else {
        return { success: false, error: resData?.error || 'Failed to update profile.' };
      }
    } catch (e: any) {
      return { success: false, error: 'Server error. Please try again.' };
    }
  };

  const logout = () => {
    const token = getSessionToken();
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token }),
      }).catch(() => {});
    }
    clearSessionToken();
    setUser(null);
  };

  const refreshUser = async () => {
    await verifyCurrentSession();
    await fetchUsers();
  };

  const updateLocalWallet = (newBalance: number) => {
    if (user) {
      setUser({ ...user, walletBalance: newBalance });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      allUsers, 
      loginAs, 
      loginWithCredentials, 
      loginWithMobileAndPassword, 
      signupRetailer, 
      updateProfile, 
      logout, 
      refreshUser, 
      updateLocalWallet 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
