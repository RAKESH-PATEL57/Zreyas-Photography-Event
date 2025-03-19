import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is logged in (guest or admin)
    const guestData = localStorage.getItem('guestData');
    const adminData = localStorage.getItem('adminData');
  
    if (adminData) {
      try {
        const admin = JSON.parse(adminData);
        setCurrentUser({ ...admin, type: 'admin' });
  
        // Set authorization header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${admin.token}`;
      } catch (error) {
        console.error('Error parsing adminData:', error);
        localStorage.removeItem('adminData'); // Remove invalid data to prevent future errors
      }
    } else if (guestData) {
      try {
        const guest = JSON.parse(guestData);
        setCurrentUser({ ...guest, type: 'guest' });
      } catch (error) {
        console.error('Error parsing guestData:', error);
        localStorage.removeItem('guestData'); // Remove invalid data to prevent future errors
      }
    }
  
    setLoading(false);
  }, []);
  
  
  // Guest login
  const guestLogin = async (uniqueString, randomName) => {
    try {
      const response = await axios.post('/guests/login', { uniqueString, randomName });
      
      if (response.data.success) {
        const userData = {
          ...response.data.data,
          type: 'guest'
        };
        
        setCurrentUser(userData);
        localStorage.setItem('guestData', JSON.stringify(userData));
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };
  
  // Guest signup
  const guestSignup = async () => {
    try {
      const response = await axios.post('/guests/create');
      
      if (response.data.success) {
        const userData = {
          ...response.data.data,
          type: 'guest'
        };
        
        setCurrentUser(userData);
        localStorage.setItem('guestData', JSON.stringify(userData));
        return { success: true, data: userData };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Signup failed'
      };
    }
  };
  
  // Admin login
  const adminLogin = async (username, password) => {
    try {
      const response = await axios.post('/admin/login', { username, password });
      
      if (response.data.success) {
        const userData = {
          ...response.data.admin,
          token: response.data.token,
          type: 'admin'
        };
        
        setCurrentUser(userData);
        localStorage.setItem('adminData', JSON.stringify(userData));
        
        // Set authorization header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };
  
  // Logout
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('guestData');
    localStorage.removeItem('adminData');
    delete axios.defaults.headers.common['Authorization'];
  };
  
  const value = {
    currentUser,
    guestLogin,
    guestSignup,
    adminLogin,
    logout,
    isGuest: currentUser?.type === 'guest',
    isAdmin: currentUser?.type === 'admin' && currentUser.role === 'admin',
    isSuperAdmin: currentUser?.type === 'admin' && currentUser.role === 'superadmin'
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}