import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { authHelpers, subscriptions, isSupabaseConfigured, type UserProfile, type AuthUser } from '@/lib/supabase';

interface AuthContextType {
  // Authentication state
  user: AuthUser | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  
  // Configuration status
  isSupabaseConfigured: boolean;
  
  // Authentication actions
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: 'google' | 'github' | 'apple' | 'facebook') => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  
  // Profile actions
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  
  // Utility functions
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session cache for better performance
const SESSION_CACHE_KEY = 'itr-buddy-session';
const PROFILE_CACHE_KEY = 'itr-buddy-profile';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Log configuration status
  useEffect(() => {
    console.log('🔧 Auth Provider initialized:', {
      supabaseConfigured: isSupabaseConfigured,
      mode: isSupabaseConfigured ? 'Production (Supabase)' : 'Development (Mock)'
    });
  }, []);

  // Cache management (only for real Supabase sessions)
  const cacheSession = useCallback((session: Session | null) => {
    if (isSupabaseConfigured && session) {
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
    } else if (isSupabaseConfigured) {
      localStorage.removeItem(SESSION_CACHE_KEY);
    }
  }, []);

  const cacheProfile = useCallback((profile: UserProfile | null) => {
    if (profile) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  }, []);

  const loadCachedData = useCallback(() => {
    if (!isSupabaseConfigured) return; // Don't use cache for mock auth
    
    try {
      const cachedSession = localStorage.getItem(SESSION_CACHE_KEY);
      const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY);
      
      if (cachedSession) {
        const sessionData = JSON.parse(cachedSession);
        // Check if session is still valid (not expired)
        if (sessionData.expires_at && new Date(sessionData.expires_at) > new Date()) {
          setSession(sessionData);
          setUser(sessionData.user);
        }
      }
      
      if (cachedProfile) {
        setProfile(JSON.parse(cachedProfile));
      }
    } catch (error) {
      console.error('Error loading cached auth data:', error);
      // Clear invalid cache
      localStorage.removeItem(SESSION_CACHE_KEY);
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  }, []);

  // Load user profile
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { profile: userProfile, error } = await authHelpers.getUserProfile(userId);
      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }
      
      setProfile(userProfile);
      cacheProfile(userProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, [cacheProfile]);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    // Load cached data first for better UX (only for Supabase)
    if (isSupabaseConfigured) {
      loadCachedData();
    }

    // Get current session
    const initializeAuth = async () => {
      try {
        const { user: currentUser, error } = await authHelpers.getCurrentUser();
        
        if (isMounted) {
          if (error || !currentUser) {
            setUser(null);
            setSession(null);
            setProfile(null);
            cacheSession(null);
            cacheProfile(null);
          } else {
            setUser(currentUser as AuthUser);
            // Load user profile
            await loadUserProfile(currentUser.id);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = subscriptions.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session ? 'Session exists' : 'No session');
      
      if (isMounted) {
        setSession(session);
        setUser(session?.user as AuthUser ?? null);
        cacheSession(session);

        if (session?.user) {
          // Load user profile when user signs in
          await loadUserProfile(session.user.id);
        } else {
          // Clear profile when user signs out
          setProfile(null);
          cacheProfile(null);
        }
        
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [loadCachedData, cacheSession, cacheProfile, loadUserProfile]);

  // Subscribe to profile changes (only for Supabase)
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return;

    const profileSubscription = subscriptions.subscribeToProfile(
      user.id,
      (payload) => {
        console.log('🔄 Profile changed:', payload);
        if (payload.eventType === 'UPDATE') {
          setProfile(payload.new);
          cacheProfile(payload.new);
        }
      }
    );

    return () => {
      profileSubscription?.unsubscribe();
    };
  }, [user?.id, cacheProfile]);

  // Authentication functions with improved error handling
  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      console.log('🔄 Attempting signup:', { email, fullName, mode: isSupabaseConfigured ? 'Supabase' : 'Mock' });

      const { data, error } = await authHelpers.signUp(email, password, fullName);

      if (!error && data.user) {
        // Create user profile
        await authHelpers.createUserProfile(data.user.id, email, fullName);
      }

      if (error) {
        console.error('❌ Signup error:', error);
        // Ensure error has proper message format
        const errorMessage = error?.message || (typeof error === 'string' ? error : 'An error occurred during registration');
        return { error: { message: errorMessage } };
      } else {
        console.log('✅ Signup successful:', data.user?.email);
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ Signup exception:', error);
      return { error: { message: error?.message || 'An unexpected error occurred during signup' } };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('🔄 Attempting signin:', { email, mode: isSupabaseConfigured ? 'Supabase' : 'Mock' });

      const { error } = await authHelpers.signIn(email, password);

      if (error) {
        console.error('❌ Signin error:', error);
        // Ensure error has proper message format
        const errorMessage = error?.message || (typeof error === 'string' ? error : 'An error occurred during login');
        return { error: { message: errorMessage } };
      } else {
        console.log('✅ Signin successful:', email);
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ Signin exception:', error);
      return { error: { message: error?.message || 'An unexpected error occurred during login' } };
    } finally {
      setLoading(false);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github' | 'apple' | 'facebook') => {
    setLoading(true);
    try {
      console.log('🔄 Attempting OAuth signin:', { provider, mode: isSupabaseConfigured ? 'Supabase' : 'Mock' });
      
      const { error } = await authHelpers.signInWithOAuth(provider);
      
      if (error) {
        console.error('❌ OAuth error:', error);
      } else {
        console.log('✅ OAuth successful:', provider);
      }
      
      return { error };
    } catch (error: any) {
      console.error('❌ OAuth exception:', error);
      return { error: { message: error.message || `An unexpected error occurred with ${provider} authentication` } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      console.log('🔄 Attempting signout');
      
      const { error } = await authHelpers.signOut();
      
      if (error) {
        console.error('❌ Signout error:', error);
      } else {
        console.log('✅ Signout successful');
      }
      
      return { error };
    } catch (error: any) {
      console.error('❌ Signout exception:', error);
      return { error: { message: error.message || 'An unexpected error occurred during logout' } };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('🔄 Attempting password reset:', { email, mode: isSupabaseConfigured ? 'Supabase' : 'Mock' });
      
      const { error } = await authHelpers.resetPassword(email);
      
      if (error) {
        console.error('❌ Password reset error:', error);
      } else {
        console.log('✅ Password reset successful:', email);
      }
      
      return { error };
    } catch (error: any) {
      console.error('❌ Password reset exception:', error);
      return { error: { message: error.message || 'An unexpected error occurred during password reset' } };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      console.log('🔄 Attempting password update');
      
      const { error } = await authHelpers.updatePassword(password);
      
      if (error) {
        console.error('❌ Password update error:', error);
      } else {
        console.log('✅ Password update successful');
      }
      
      return { error };
    } catch (error: any) {
      console.error('❌ Password update exception:', error);
      return { error: { message: error.message || 'An unexpected error occurred during password update' } };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) return { error: new Error('No authenticated user') };
    
    try {
      console.log('🔄 Attempting profile update:', updates);
      
      const { data, error } = await authHelpers.updateUserProfile(user.id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      
      if (!error && data) {
        setProfile(data);
        cacheProfile(data);
        console.log('✅ Profile update successful');
      } else if (error) {
        console.error('❌ Profile update error:', error);
      }
      
      return { error };
    } catch (error: any) {
      console.error('❌ Profile update exception:', error);
      return { error: { message: error.message || 'An unexpected error occurred during profile update' } };
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    console.log('🔄 Refreshing profile');
    await loadUserProfile(user.id);
  };

  const value: AuthContextType = {
    // State
    user,
    session,
    profile,
    loading,
    
    // Configuration
    isSupabaseConfigured,
    
    // Actions
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
    
    // Utilities
    isAuthenticated: !!user,
    isLoading: loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
