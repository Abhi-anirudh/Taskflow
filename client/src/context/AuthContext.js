import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('taskflow_token');
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('taskflow_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('taskflow_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const signup = async (name, email, password, role) => {
    const res = await api.post('/auth/signup', { name, email, password, role });
    localStorage.setItem('taskflow_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('taskflow_token');
    setUser(null);
  };

  const updateUser = (updated) => setUser(updated);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
