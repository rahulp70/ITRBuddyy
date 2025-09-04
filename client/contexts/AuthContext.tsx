import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  authHelpers,
  subscriptions,
  isSupabaseConfigured,
  type UserProfile,
  type AuthUser,
} from '@/lib/supabase';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: { message: string } | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: { message: string } | null }>;
  signInWithOAuth: (
    provider: 'google' | 'github' | 'apple' | 'facebook',
  ) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<{ error: { message: string } | null }>;
  resetPassword: (
    email: string,
  ) => Promise<{ error: { message: string } | null }>;
  updatePassword: (
    password: string,
  ) => Promise<{ error: { message: string } | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
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
      mode: isSupabaseConfigured
        ? 'Production (Supabase)'
        : 'Development (Mock)',
    });
  }, []);

  // Cache management (only for real Supabase sessions)
  const cacheSession = useCallback((session: Session | null) => {
    if (isSupabaseConfigured && session) {
      try {
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
      } catch (e) {
        console.warn('Failed to cache session', e);
      }
    } else if (isSupabaseConfigured) {
      localStorage.removeItem(SESSION_CACHE_KEY);
    }
  }, []);

  const cacheProfile = useCallback((profile: UserProfile | null) => {
    if (profile) {
      try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
      } catch (e) {
        console.warn('Failed to cache profile', e);
      }
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
        if (
          sessionData?.expires_at &&
          new Date(sessionData.expires_at) > new Date()
        ) {
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
  const loadUserProfile = useCallback(
    async (userId: string) => {
      try {
        const { profile: userProfile, error } = await authHelpers.getUserProfile(userId);

        if (error) {
          // Provide more helpful debug output
          try {
            console.error('Error loading user profile:', error, JSON.stringify(error));
          } catch (e) {
            console.error('Error loading user profile (non-serializable):', error);
          }

          // Attempt to recover by creating a minimal profile when Supabase is configured
          if (isSupabaseConfigured) {
            try {
              const { user: authUser } = await authHelpers.getCurrentUser();
              if (authUser) {
                const email = authUser.email ?? '';
                const fullName = authUser.user_metadata?.full_name ?? '';
                const createRes = await authHelpers.createUserProfile(authUser.id, email, fullName);
                if ((createRes as any)?.data) {
                  const { profile: newProfile } = await authHelpers.getUserProfile(authUser.id);
                  setProfile(newProfile);
                  cacheProfile(newProfile);
                  return;
                }
              }
            } catch (e) {
              console.warn('Failed to recover by creating profile:', e);
            }
          }

          return;
        }

        // If no profile exists, try to create one from the auth user info
        if (!userProfile && isSupabaseConfigured) {
          try {
            const { user: authUser } = await authHelpers.getCurrentUser();
            if (authUser) {
              const email = authUser.email ?? '';
              const fullName = authUser.user_metadata?.full_name ?? email.split('@')[0] ?? '';
              const createRes = await authHelpers.createUserProfile(userId, email, fullName);
              if ((createRes as any)?.data) {
                const { profile: newProfile } = await authHelpers.getUserProfile(userId);
                setProfile(newProfile);
                cacheProfile(newProfile);
                return;
              }
            }
          } catch (e) {
            console.warn('Failed to create missing profile:', e);
          }
        }

        setProfile(userProfile);
        cacheProfile(userProfile);
      } catch (err) {
        console.error('Error loading user profile:', err);
      }
    },
    [cacheProfile],
  );

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    // Load cached data first for better UX (only for Supabase)
    if (isSupabaseConfigured) {
      loadCachedData();
    }

    // Helper to initialize or refresh current user/session from authHelpers
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
    const {
      data: { subscription },
    } = subscriptions.onAuthStateChange(async (event, session) => {
      console.log(
        '🔄 Auth state changed:',
        event,
        session ? 'Session exists' : 'No session',
      );

      if (isMounted) {
        setSession(session);
        setUser((session?.user as AuthUser) ?? null);
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

    // Also listen for manual in-app mock auth events so UI can trigger login without reloading
    const onMockAuth = async () => {
      try {
        // If a mock auth user is present in localStorage, prefer it (demo/guest flows)
        const mockUserStr = localStorage.getItem('mock-auth-user');
        const mockProfileStr = localStorage.getItem('mock-auth-profile');
        if (mockUserStr) {
          try {
            const mockUser = JSON.parse(mockUserStr) as AuthUser;
            setUser(mockUser as AuthUser);
            if (mockProfileStr) {
              try {
                const parsedProfile = JSON.parse(mockProfileStr) as UserProfile;
                setProfile(parsedProfile);
                cacheProfile(parsedProfile);
              } catch (e) {
                console.warn('Failed to parse mock profile', e);
              }
            } else {
              // if no mock profile, create a minimal one from mock user
              const minimal = {
                id: mockUser.id,
                email: mockUser.email,
                full_name: mockUser.user_metadata?.full_name || (mockUser.email || '').split('@')[0],
                created_at: mockUser.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as UserProfile;
              setProfile(minimal);
              cacheProfile(minimal);
            }

            // mark session accordingly
            const mockSession: any = {
              access_token: 'mock-session-token',
              user: mockUser,
              expires_at: Date.now() + 3600000,
            };
            setSession(mockSession as any);
            cacheSession(mockSession as any);
            setLoading(false);
            return;
          } catch (e) {
            console.warn('Failed to use mock auth user', e);
          }
        }

        // Fallback: try authHelpers (real supabase) to refresh state
        const { user: currentUser, error } = await authHelpers.getCurrentUser();
        if (!error && currentUser) {
          setUser(currentUser as AuthUser);
          await loadUserProfile(currentUser.id);
          setLoading(false);
        }
      } catch (e) {
        console.warn('Failed to refresh mock auth state', e);
      }
    };

    window.addEventListener('mock-auth-updated', onMockAuth as EventListener);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('mock-auth-updated', onMockAuth as EventListener);
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
      },
    );

    return () => {
      profileSubscription?.unsubscribe();
    };
  }, [user?.id, cacheProfile]);

  // Authentication functions with improved error handling
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
  ): Promise<{ error: { message: string } | null }> => {
    setLoading(true);
    try {
      console.log('🔄 Attempting signup:', {
        email,
        fullName,
        mode: isSupabaseConfigured ? 'Supabase' : 'Mock',
      });

      const { data, error } = await authHelpers.signUp(
        email,
        password,
        fullName,
      );

      if (!error && (data as any)?.user) {
        // Create user profile
        await authHelpers.createUserProfile((data as any).user.id, email, fullName);
      }

      if (error) {
        console.error('❌ Signup error:', error);
        const errorMessage =
          (error as any)?.message ||
          (typeof error === 'string' ? error : 'An error occurred during registration');
        return { error: { message: errorMessage } };
      } else {
        console.log('✅ Signup successful:', (data as any).user?.email);
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ Signup exception:', error);
      return {
        error: {
          message:
            error?.message || 'An unexpected error occurred during signup',
        },
      };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ error: { message: string } | null }> => {
    setLoading(true);
    try {
      console.log('🔄 Attempting signin:', {
        email,
        mode: isSupabaseConfigured ? 'Supabase' : 'Mock',
      });

      const { error } = await authHelpers.signIn(email, password);

      if (error) {
        console.error('❌ Signin error:', error);
        const errorMessage =
          (error as any)?.message ||
          (typeof error === 'string' ? error : 'An error occurred during login');
        return { error: { message: errorMessage } };
      } else {
        console.log('✅ Signin successful:', email);
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ Signin exception:', error);
      return {
        error: {
          message:
            error?.message || 'An unexpected error occurred during login',
        },
      };
    } finally {
      setLoading(false);
    }
  };

  const signInWithOAuth = async (
    provider: 'google' | 'github' | 'apple' | 'facebook',
  ): Promise<{ error: { message: string } | null }> => {
    setLoading(true);
    try {
      console.log('🔄 Attempting OAuth signin:', {
        provider,
        mode: isSupabaseConfigured ? 'Supabase' : 'Mock',
      });

      const { error } = await authHelpers.signInWithOAuth(provider as any);

      if (error) {
        console.error('❌ OAuth error:', error);
        const errorMessage =
          (error as any)?.message ||
          (typeof error === 'string'
            ? error
            : `An error occurred with ${provider} authentication`);
        return { error: { message: errorMessage } };
      } else {
        console.log('✅ OAuth successful:', provider);
        if (!isSupabaseConfigured) {
          const { user: currentUser } = await authHelpers.getCurrentUser();
          if (currentUser) {
            setUser(currentUser as AuthUser);
            const mockSession: any = {
              access_token: 'mock-jwt',
              user: currentUser,
              expires_at: Date.now() + 3600000,
            };
            setSession(mockSession);
            cacheSession(mockSession);
            await loadUserProfile((currentUser as any).id);
          }
        }
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ OAuth exception:', error);
      return {
        error: {
          message:
            error?.message ||
            `An unexpected error occurred with ${provider} authentication`,
        },
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<{ error: { message: string } | null }> => {
    setLoading(true);
    try {
      console.log('🔄 Attempting signout');

      const { error } = await authHelpers.signOut();

      if (error) {
        console.error('❌ Signout error:', error);
        const errorMessage =
          (error as any)?.message ||
          (typeof error === 'string' ? error : 'An error occurred during logout');
        return { error: { message: errorMessage } };
      } else {
        console.log('✅ Signout successful');
        setUser(null);
        setSession(null);
        setProfile(null);
        cacheSession(null);
        cacheProfile(null);
        const keysToClear = [
          'itr:docManager',
          'chatbot:messages',
          'chatbot:conversationId',
          'itr:validated',
          'itr:submitted',
        ];
        for (const k of keysToClear) localStorage.removeItem(k);
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ Signout exception:', error);
      return {
        error: {
          message:
            error?.message || 'An unexpected error occurred during logout',
        },
      };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (
    email: string,
  ): Promise<{ error: { message: string } | null }> => {
    try {
      console.log('🔄 Attempting password reset:', {
        email,
        mode: isSupabaseConfigured ? 'Supabase' : 'Mock',
      });

      const { error } = await authHelpers.resetPassword(email as string);

      if (error) {
        console.error('❌ Password reset error:', error);
        const errorMessage =
          (error as any)?.message ||
          (typeof error === 'string' ? error : 'An error occurred during password reset');
        return { error: { message: errorMessage } };
      } else {
        console.log('✅ Password reset successful:', email);
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ Password reset exception:', error);
      return {
        error: {
          message:
            error?.message || 'An unexpected error occurred during password reset',
        },
      };
    }
  };

  const updatePassword = async (
    password: string,
  ): Promise<{ error: { message: string } | null }> => {
    try {
      console.log('🔄 Attempting password update');

      const { error } = await authHelpers.updatePassword(password);

      if (error) {
        console.error('❌ Password update error:', error);
        const errorMessage =
          (error as any)?.message ||
          (typeof error === 'string' ? error : 'An error occurred during password update');
        return { error: { message: errorMessage } };
      } else {
        console.log('✅ Password update successful');
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ Password update exception:', error);
      return {
        error: {
          message:
            error?.message || 'An unexpected error occurred during password update',
        },
      };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) return { error: { message: 'No authenticated user' } };

    try {
      console.log('🔄 Attempting profile update:', updates);

      const { data, error } = await authHelpers.updateUserProfile(user.id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (!error && data) {
        setProfile(data as UserProfile);
        cacheProfile(data as UserProfile);
        console.log('✅ Profile update successful');
        return { error: null };
      } else if (error) {
        console.error('❌ Profile update error:', error);
        const errorMessage =
          (error as any)?.message ||
          (typeof error === 'string' ? error : 'An error occurred during profile update');
        return { error: { message: errorMessage } };
      }

      return { error: null };
    } catch (error: any) {
      console.error('❌ Profile update exception:', error);
      return {
        error: {
          message:
            error?.message || 'An unexpected error occurred during profile update',
        },
      };
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
