import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserSettings } from '@/types';
import { DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE } from '@/lib/constants';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  settings: UserSettings | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default settings used when Supabase is unavailable (offline / APK mode)
const OFFLINE_SETTINGS: UserSettings = {
  user_id: 'offline-user',
  default_source_language: DEFAULT_SOURCE_LANGUAGE,
  default_target_language: DEFAULT_TARGET_LANGUAGE,
  tts_provider: 'openai',
  conversation_mode_default: false,
  updated_at: new Date().toISOString(),
};

// A minimal offline user object so the app doesn't block on "Sign In Required"
const OFFLINE_USER = { id: 'offline-user', email: 'offline@local' } as User;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase is not available, use offline mode immediately
    if (!supabase) {
      console.log('📱 Running in offline mode (no Supabase)');
      setUser(OFFLINE_USER);
      setSettings(OFFLINE_SETTINGS);
      setLoading(false);
      return;
    }

    // Supabase available — normal auth flow
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserSettings(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserSettings(session.user.id);
      } else {
        setSettings(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserSettings = async (userId: string) => {
    if (!supabase) {
      setSettings(OFFLINE_SETTINGS);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
      }

      if (!data) {
        const defaultSettings: Omit<UserSettings, 'updated_at'> = {
          user_id: userId,
          default_source_language: DEFAULT_SOURCE_LANGUAGE,
          default_target_language: DEFAULT_TARGET_LANGUAGE,
          tts_provider: 'openai',
          conversation_mode_default: false,
        };

        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating settings:', insertError);
          setSettings(OFFLINE_SETTINGS);
        } else {
          setSettings(newSettings);
        }
      } else {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error in loadUserSettings:', err);
      setSettings(OFFLINE_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Offline mode — sign in not available');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error('Offline mode — sign up not available');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) throw new Error('Offline mode — sign out not available');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;

    if (!supabase) {
      // Offline: update local settings only
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      return;
    }

    const { data, error } = await supabase
      .from('user_settings')
      .update({ ...newSettings, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      throw error;
    }

    setSettings(data);
  };

  const refreshSettings = async () => {
    if (user) {
      await loadUserSettings(user.id);
    }
  };

  const value = {
    session,
    user,
    settings,
    loading,
    signIn,
    signUp,
    signOut,
    updateSettings,
    refreshSettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
