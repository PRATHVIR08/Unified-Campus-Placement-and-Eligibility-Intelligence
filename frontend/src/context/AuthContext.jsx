import React, { createContext, useContext, useState, useEffect } from 'react';

// AuthContext [P1]
// Provides authenticated user state, role, login, and logout methods
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Scaffolding: Read token from localStorage, decode user info or fetch /auth/me
    const token = localStorage.getItem('token');
    if (token) {
      // Mock / placeholder restore
      setUser({ role: 'student', token });
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
