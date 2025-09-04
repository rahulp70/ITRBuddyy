import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseUrl.includes('.supabase.co')
);

// Log configuration status for debugging
console.log('🔧 Supabase Configuration:', {
  configured: isSupabaseConfigured,
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'Not set',
});

// Create Supabase client only when configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : (null as any);

// Database types (extend as needed)
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  created_at?: string;
  email_confirmed_at?: string;
}

// Mock authentication for development when Supabase isn't configured
const mockAuthHelpers = {
  signUp: async (email: string, password: string, fullName: string) => {
    console.log('🔄 Mock signup:', { email, fullName });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockUser = {
      id: `mock-${Date.now()}`,
      email,
      user_metadata: { full_name: fullName },
      app_metadata: { provider: 'email' },
      created_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
    };

    localStorage.setItem('mock-auth-user', JSON.stringify(mockUser));

    return { data: { user: mockUser }, error: null };
  },

  signIn: async (email: string, password: string) => {
    console.log('🔄 Mock signin:', { email });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (email === 'demo@itrbuddy.com' && password === 'Demo123!') {
      const mockUser = {
        id: 'demo-user',
        email: 'demo@itrbuddy.com',
        user_metadata: { full_name: 'Demo User' },
        app_metadata: { provider: 'email' },
        created_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
      };

      localStorage.setItem('mock-auth-user', JSON.stringify(mockUser));

      return {
        data: {
          user: mockUser,
          session: {
            access_token: 'mock-jwt-token',
            user: mockUser,
            expires_at: Date.now() + 3600000,
          },
        },
        error: null,
      };
    }

    if (email === 'error@test.com') {
      return { data: null, error: { message: 'Invalid login credentials' } };
    }

    if (password.length < 6) {
      return { data: null, error: { message: 'Invalid login credentials' } };
    }

    const mockUser = {
      id: `user-${Date.now()}`,
      email,
      user_metadata: { full_name: email.split('@')[0] },
      app_metadata: { provider: 'email' },
      created_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
    };

    localStorage.setItem('mock-auth-user', JSON.stringify(mockUser));

    return {
      data: {
        user: mockUser,
        session: {
          access_token: 'mock-jwt-token',
          user: mockUser,
          expires_at: Date.now() + 3600000,
        },
      },
      error: null,
    };
  },

  signInWithOAuth: async (
    provider: 'google' | 'github' | 'apple' | 'facebook',
  ) => {
    console.log('🔄 Mock OAuth signin:', { provider });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockUser = {
      id: `${provider}-${Date.now()}`,
      email: `user@${provider}.com`,
      user_metadata: {
        full_name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
        avatar_url: `https://ui-avatars.com/api/?name=${provider}&background=random`,
      },
      app_metadata: { provider },
      created_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
    };

    localStorage.setItem('mock-auth-user', JSON.stringify(mockUser));

    return { data: { url: null }, error: null };
  },

  signOut: async () => {
    console.log('🔄 Mock signout');
    localStorage.removeItem('mock-auth-user');
    localStorage.removeItem('mock-auth-profile');
    return { error: null };
  },

  getCurrentUser: async () => {
    const mockUser = localStorage.getItem('mock-auth-user');
    if (mockUser) {
      return { user: JSON.parse(mockUser), error: null };
    }
    return { user: null, error: null };
  },

  resetPassword: async (email: string) => {
    console.log('🔄 Mock password reset:', { email });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { data: {}, error: null };
  },

  updatePassword: async (password: string) => {
    console.log('🔄 Mock password update');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { data: {}, error: null };
  },

  getUserProfile: async (userId: string) => {
    const mockProfile = localStorage.getItem('mock-auth-profile');
    if (mockProfile) {
      return { profile: JSON.parse(mockProfile), error: null };
    }

    const mockUser = localStorage.getItem('mock-auth-user');
    if (mockUser) {
      const user = JSON.parse(mockUser);
      const profile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        created_at: user.created_at,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('mock-auth-profile', JSON.stringify(profile));
      return { profile, error: null };
    }

    return { profile: null, error: null };
  },

  updateUserProfile: async (userId: string, updates: Partial<UserProfile>) => {
    console.log('🔄 Mock profile update:', updates);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const existingProfile = localStorage.getItem('mock-auth-profile');
    const profile = existingProfile ? JSON.parse(existingProfile) : {};

    const updatedProfile = {
      ...profile,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem('mock-auth-profile', JSON.stringify(updatedProfile));
    return { data: updatedProfile, error: null };
  },

  createUserProfile: async (
    userId: string,
    email: string,
    fullName: string,
  ) => {
    console.log('🔄 Mock profile creation:', { userId, email, fullName });

    const profile = {
      id: userId,
      email,
      full_name: fullName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem('mock-auth-profile', JSON.stringify(profile));
    return { data: profile, error: null };
  },
};

// Real auth helpers backed by Supabase
const realAuthHelpers = {
  signUp: async (email: string, password: string, fullName: string) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

    const { data, error } = await supabase.auth.signUp({ email, password }, { data: { full_name: fullName } as any });

    if (error) return { data: null, error };

    // Attempt to create a profile row
    try {
      if (data?.user) {
        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            email,
            full_name: fullName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        );
      }
    } catch (e) {
      console.warn('Failed to create profile row:', e);
    }

    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    const res = await supabase.auth.signInWithPassword({ email, password });
    return { data: res.data, error: res.error };
  },

  signInWithOAuth: async (provider: 'google' | 'github' | 'apple' | 'facebook') => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    const res = await supabase.auth.signInWithOAuth({ provider });
    return { data: res.data, error: res.error };
  },

  signOut: async () => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    if (!supabase) return { user: null, error: { message: 'Supabase not configured' } };
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user ?? null, error };
  },

  resetPassword: async (email: string) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    const res = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    return { data: res.data, error: res.error };
  },

  updatePassword: async (password: string) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    const res = await supabase.auth.updateUser({ password });
    return { data: res.data, error: res.error };
  },

  getUserProfile: async (userId: string) => {
    if (!supabase) return { profile: null, error: { message: 'Supabase not configured' } };

    try {
      const { data, error } = await (supabase as any).from('profiles').select('*').eq('id', userId).single();
      if (error) {
        // If the profiles table is missing in the database, fall back to localStorage
        if (error?.code === 'PGRST205' || (error?.message && String(error.message).includes("Could not find the table 'public.profiles'"))) {
          console.warn("Supabase profiles table missing; falling back to localStorage for profiles.");
          const local = localStorage.getItem(`supabase-profile-${userId}`);
          return { profile: local ? JSON.parse(local) : null, error };
        }
        return { profile: data ?? null, error };
      }

      return { profile: data ?? null, error: null };
    } catch (e: any) {
      // Handle unexpected errors and provide fallback
      try {
        if (String(e?.message).includes("Could not find the table 'public.profiles'")) {
          console.warn("Supabase profiles table missing; falling back to localStorage for profiles.");
          const local = localStorage.getItem(`supabase-profile-${userId}`);
          return { profile: local ? JSON.parse(local) : null, error: e };
        }
      } catch (_) {}

      return { profile: null, error: e };
    }
  },

  updateUserProfile: async (userId: string, updates: Partial<UserProfile>) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

    try {
      const { data, error } = await (supabase as any).from('profiles').update(updates).eq('id', userId).select().single();
      if (error) {
        if (error?.code === 'PGRST205' || (error?.message && String(error.message).includes("Could not find the table 'public.profiles'"))) {
          // Fallback: update local cache
          const existing = localStorage.getItem(`supabase-profile-${userId}`);
          const parsed = existing ? JSON.parse(existing) : { id: userId };
          const updated = { ...parsed, ...updates, updated_at: new Date().toISOString() } as any;
          localStorage.setItem(`supabase-profile-${userId}`, JSON.stringify(updated));
          return { data: updated, error };
        }
        return { data, error };
      }

      return { data, error: null };
    } catch (e: any) {
      try {
        if (String(e?.message).includes("Could not find the table 'public.profiles'")) {
          const existing = localStorage.getItem(`supabase-profile-${userId}`);
          const parsed = existing ? JSON.parse(existing) : { id: userId };
          const updated = { ...parsed, ...updates, updated_at: new Date().toISOString() } as any;
          localStorage.setItem(`supabase-profile-${userId}`, JSON.stringify(updated));
          return { data: updated, error: e };
        }
      } catch (_) {}
      return { data: null, error: e };
    }
  },

  createUserProfile: async (userId: string, email: string, fullName: string) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    const payload = {
      id: userId,
      email,
      full_name: fullName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await (supabase as any).from('profiles').insert(payload).select().single();
      if (error) {
        if (error?.code === 'PGRST205' || (error?.message && String(error.message).includes("Could not find the table 'public.profiles'"))) {
          // Fallback: persist profile locally
          const local = payload as any;
          localStorage.setItem(`supabase-profile-${userId}`, JSON.stringify(local));
          console.warn('Created local fallback profile because profiles table is missing.');
          return { data: local, error };
        }
        return { data, error };
      }

      return { data, error: null };
    } catch (e: any) {
      try {
        if (String(e?.message).includes("Could not find the table 'public.profiles'")) {
          const local = payload as any;
          localStorage.setItem(`supabase-profile-${userId}`, JSON.stringify(local));
          console.warn('Created local fallback profile because profiles table is missing.');
          return { data: local, error: e };
        }
      } catch (_) {}
      return { data: null, error: e };
    }
  },
};

// Export auth helpers (real when configured, otherwise mock)
export const authHelpers = isSupabaseConfigured ? realAuthHelpers : mockAuthHelpers;

// Real-time subscription helpers
export const subscriptions = {
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback mock behavior
      setTimeout(() => {
        const mockUser = localStorage.getItem('mock-auth-user');
        if (mockUser) {
          const user = JSON.parse(mockUser);
          const mockSession: any = {
            access_token: 'mock-jwt-token',
            user,
            expires_at: Date.now() + 3600000,
          };
          callback('SIGNED_IN', mockSession);
        } else {
          callback('SIGNED_OUT', null);
        }
      }, 100);

      return {
        data: {
          subscription: {
            unsubscribe: () => console.log('🔄 Mock auth subscription unsubscribed'),
          },
        },
      } as any;
    }

    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session?.session ?? null);
    });
  },

  subscribeToProfile: (userId: string, callback: (payload: any) => void) => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        unsubscribe: () => console.log('🔄 Mock profile subscription unsubscribed'),
      } as any;
    }

    // Subscribe to Postgres changes for the profiles table for this user
    const channel = supabase
      .channel(`public:profiles:id=eq.${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => callback(payload),
      )
      .subscribe();

    return {
      unsubscribe: () => {
        try {
          // supabase.removeChannel is available in newer SDKs
          if ((supabase as any).removeChannel) {
            (supabase as any).removeChannel(channel);
          } else if ((channel as any).unsubscribe) {
            (channel as any).unsubscribe();
          }
        } catch (e) {
          console.warn('Failed to unsubscribe profile channel', e);
        }
      },
    } as any;
  },
};

export default supabase;
