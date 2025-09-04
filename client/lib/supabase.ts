// Environment variables for Supabase configuration
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

// NOTE: Avoid importing '@supabase/supabase-js' directly in the client bundle to prevent build-time resolution
// The app supports mock authentication when Supabase isn't configured. If you want to enable Supabase,
// the recommended approach is to use server-side integration or ensure the dependency is available in the environment.

export const supabase = null as any; // runtime client is not created in this environment

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
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    
    // Create mock user
    const mockUser = {
      id: `mock-${Date.now()}`,
      email,
      user_metadata: { full_name: fullName },
      app_metadata: { provider: 'email' },
      created_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
    };
    
    // Store in localStorage for persistence
    localStorage.setItem('mock-auth-user', JSON.stringify(mockUser));
    
    return { data: { user: mockUser }, error: null };
  },

  signIn: async (email: string, password: string) => {
    console.log('🔄 Mock signin:', { email });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check for demo credentials
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
            expires_at: Date.now() + 3600000 // 1 hour
          }
        }, 
        error: null 
      };
    }
    
    // Simulate different error scenarios for testing
    if (email === 'error@test.com') {
      return { data: null, error: { message: 'Invalid login credentials' } };
    }
    
    if (password.length < 6) {
      return { data: null, error: { message: 'Invalid login credentials' } };
    }
    
    // Default success for any other credentials
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
          expires_at: Date.now() + 3600000
        }
      }, 
      error: null 
    };
  },

  signInWithOAuth: async (provider: 'google' | 'github' | 'apple' | 'facebook') => {
    console.log('🔄 Mock OAuth signin:', { provider });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockUser = {
      id: `${provider}-${Date.now()}`,
      email: `user@${provider}.com`,
      user_metadata: { 
        full_name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
        avatar_url: `https://ui-avatars.com/api/?name=${provider}&background=random`
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { data: {}, error: null };
  },

  updatePassword: async (password: string) => {
    console.log('🔄 Mock password update');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { data: {}, error: null };
  },

  getUserProfile: async (userId: string) => {
    const mockProfile = localStorage.getItem('mock-auth-profile');
    if (mockProfile) {
      return { profile: JSON.parse(mockProfile), error: null };
    }
    
    // Create default profile from user data
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
    await new Promise(resolve => setTimeout(resolve, 500));
    
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

  createUserProfile: async (userId: string, email: string, fullName: string) => {
    console.log('��� Mock profile creation:', { userId, email, fullName });
    
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

// Auth helper functions - default to mock helpers to avoid depending on Supabase at build time
export const authHelpers = mockAuthHelpers;

// Real-time subscription helpers (stubbed for mock mode)
export const subscriptions = {
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    // Simulate auth state on startup
    setTimeout(() => {
      const mockUser = localStorage.getItem('mock-auth-user');
      if (mockUser) {
        const user = JSON.parse(mockUser);
        const mockSession = {
          access_token: 'mock-jwt-token',
          user,
          expires_at: Date.now() + 3600000,
        };
        callback('SIGNED_IN', mockSession);
      } else {
        callback('SIGNED_OUT', null);
      }
    }, 100);

    return { data: { subscription: { unsubscribe: () => console.log('🔄 Mock auth subscription unsubscribed') } } } as any;
  },
  subscribeToProfile: (userId: string, callback: (payload: any) => void) => {
    return { unsubscribe: () => console.log('🔄 Mock profile subscription unsubscribed') } as any;
  },
};

export default supabase;
