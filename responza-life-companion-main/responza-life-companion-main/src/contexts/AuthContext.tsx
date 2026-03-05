import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getDb, User } from '@/store/database';
import { API_BASE } from '@/lib/api';
import { migrateLocalDataToBackend } from '@/lib/localMigration';

interface AuthContextType {
  user: User | null;
  isNominee: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  nomineeLogin: (mobile: string, dob: string, fatherName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isNominee: false,
  login: async () => ({ success: false, error: 'Not initialized' }),
  nomineeLogin: async () => ({ success: false, error: 'Not initialized' }),
  logout: () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isNominee, setIsNominee] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('responza_auth');
    const nomineeFlag = localStorage.getItem('responza_nominee');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        // Re-validate against DB
        const db = getDb();
        const found = db.users.find(x => x.id === u.id);
        if (found) {
          setUser(found);
          setIsNominee(nomineeFlag === 'true');
        }
      } catch {}
    }
  }, []);

  const login = useCallback(async (usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const identifier = usernameOrEmail.trim();
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: identifier,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const token = data.access_token;
        localStorage.setItem('responza_token', token);

        // Fetch user profile
        const profileResponse = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const profile = await profileResponse.json();

        if (profileResponse.ok) {
          const user: User = {
            id: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            dob: profile.dob,
            gender: profile.gender,
            address: profile.address,
            email: profile.email,
            mobile: profile.mobile_number,
            fatherName: profile.father_name,
            username: profile.username,
            password: '', // Not returned
            favouriteColour: profile.favourite_colour,
            favouritePlace: profile.favourite_place,
            preferredLanguage: profile.preferred_language,
            nominee: profile.nominee,
          };
          setUser(user);
          localStorage.setItem('responza_auth', JSON.stringify(user));
          void migrateLocalDataToBackend(user.id, token).catch((err) => {
            console.error('Local data migration failed:', err);
          });
          return { success: true };
        }
        return { success: false, error: profile.detail || 'Failed to fetch user profile' };
      }
      return { success: false, error: data.detail || 'Invalid credentials' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Check backend server and API URL.' };
    }
  }, [setUser]);

  const nomineeLogin = useCallback(async (mobile: string, dob: string, fatherName: string): Promise<{ success: boolean; error?: string }> => {
    const normalizeMobile = (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length === 10) return `+91${digits}`;
      if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
      if (value.startsWith('+')) return value;
      return `+${digits}`;
    };

    try {
      const response = await fetch(`${API_BASE}/nominee/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile_number: normalizeMobile(mobile.trim()),
          dob,
          father_name: fatherName.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data?.detail || 'Invalid nominee details' };
      }

      const token = data.access_token;
      localStorage.setItem('responza_token', token);

      const profileResponse = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const profile = await profileResponse.json();
      if (!profileResponse.ok) {
        return { success: false, error: profile?.detail || 'Failed to load profile' };
      }

      const user: User = {
        id: profile.user_id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        dob: profile.dob,
        gender: profile.gender,
        address: profile.address,
        email: profile.email,
        mobile: profile.mobile_number,
        fatherName: profile.father_name,
        username: profile.username,
        password: '',
        favouriteColour: profile.favourite_colour,
        favouritePlace: profile.favourite_place,
        preferredLanguage: profile.preferred_language,
        nominee: profile.nominee,
      };

      setUser(user);
      setIsNominee(true);
      localStorage.setItem('responza_auth', JSON.stringify(user));
      localStorage.setItem('responza_nominee', 'true');
      return { success: true };
    } catch {
      return { success: false, error: 'Network error during nominee login' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsNominee(false);
    localStorage.removeItem('responza_auth');
    localStorage.removeItem('responza_nominee');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isNominee, login, nomineeLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
