# Supabase Authentication Setup

This project uses Supabase for authentication, user management, and JWT token handling. Follow these steps to configure your Supabase connection.

## 1. Environment Variables

Create a `.env.local` file in your project root with your Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### How to get these values:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **anon/public** key

## 2. Database Setup

### Create User Profiles Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 3. Authentication Configuration

### Enable OAuth Providers

In your Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Enable the providers you want:
   - **Google**: Configure OAuth consent screen and get client ID/secret
   - **GitHub**: Create GitHub OAuth app and get client ID/secret
   - **Apple**, **Facebook**, etc.

### Email Settings

1. Go to **Authentication** → **Settings**
2. Configure:
   - **Site URL**: `http://localhost:8080` (development) or your production URL
   - **Redirect URLs**: Add your domain(s)
   - **Email templates**: Customize signup, reset password emails

## 4. Security Configuration

### JWT Settings
- **JWT expiry**: Default 3600 seconds (1 hour)
- **Auto-refresh**: Enabled by default
- **Session persistence**: Uses localStorage

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Policies enforce secure data access

## 5. Features Included

### ✅ Authentication Features
- [x] Email/password registration and login
- [x] OAuth providers (Google, GitHub)
- [x] Password reset functionality
- [x] Email verification
- [x] JWT token management
- [x] Session persistence and caching
- [x] Protected routes
- [x] User profile management

### ✅ Security Features
- [x] Row Level Security (RLS)
- [x] JWT token validation
- [x] Secure password requirements
- [x] PKCE flow for OAuth
- [x] Session timeout handling
- [x] Encrypted data storage

### ✅ User Experience
- [x] Loading states and error handling
- [x] Form validation with Zod
- [x] Password strength indicator
- [x] Real-time authentication state
- [x] Responsive design
- [x] Toast notifications

## 6. Usage Examples

### Check Authentication Status
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, profile } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return <div>Welcome, {profile?.full_name || user?.email}!</div>;
}
```

### Protect Routes
```typescript
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DashboardPage />
    </ProtectedRoute>
  );
}
```

### Manual Authentication
```typescript
import { useAuth } from '@/contexts/AuthContext';

function LoginForm() {
  const { signIn, signInWithOAuth } = useAuth();
  
  const handleLogin = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    if (error) {
      console.error('Login failed:', error);
    }
  };
  
  const handleOAuthLogin = async () => {
    const { error } = await signInWithOAuth('google');
    if (error) {
      console.error('OAuth login failed:', error);
    }
  };
}
```

## 7. Troubleshooting

### Common Issues

1. **Environment variables not loading**
   - Ensure `.env.local` is in project root
   - Restart development server after adding variables
   - Variables must start with `VITE_` for client-side access

2. **OAuth not working**
   - Check redirect URLs in Supabase dashboard
   - Verify OAuth app configuration
   - Ensure site URL is correctly set

3. **RLS policies blocking access**
   - Check if policies are correctly configured
   - Verify user is authenticated before accessing data
   - Test policies in Supabase SQL editor

4. **Session not persisting**
   - Check if localStorage is available
   - Verify JWT token validity
   - Ensure proper session configuration

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- Check browser console for detailed error messages
- Use Supabase Dashboard logs for debugging

## 8. Development vs Production

### Development
- Use `http://localhost:8080` as site URL
- Enable development mode in OAuth apps
- Use development keys

### Production
- Update site URL to your domain
- Configure production OAuth apps
- Use production keys
- Enable additional security measures
- Set up proper CORS policies

Your ITR Buddy application now has enterprise-grade authentication with JWT tokens, OAuth support, and secure user data management!
