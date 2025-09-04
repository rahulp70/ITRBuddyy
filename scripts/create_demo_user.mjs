import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase URL or ANON key in environment.');
  process.exit(1);
}

const supabase = createClient(url, key);

const email = 'demo@itrbuddy.com';
const password = 'Demo123!';
const fullName = 'Demo User';

console.log('Creating demo user:', email);

try {
  // Try sign up
  const signUpRes = await supabase.auth.signUp({ email, password });
  if (signUpRes.error) {
    console.warn('Sign up returned error:', signUpRes.error.message || signUpRes.error);

    // If user already exists, try signing in
    const existsMsg = String(signUpRes.error.message || '').toLowerCase();
    if (existsMsg.includes('already') || existsMsg.includes('user')) {
      console.log('User may already exist; attempting sign in with password...');
      const signInRes = await supabase.auth.signInWithPassword({ email, password });
      if (signInRes.error) {
        console.error('Sign in failed:', signInRes.error);
      } else {
        console.log('Sign in successful.');
      }
    } else {
      console.error('Sign up failed with non-recoverable error.');
    }
  } else {
    console.log('Sign up successful:', signUpRes.data);

    // If the project requires email confirmation, the user may need to confirm their email before sign-in.
  }

  // Ensure we have a user object (either from signUp or current session)
  let user = signUpRes.data?.user ?? null;
  if (!user) {
    const userRes = await supabase.auth.getUser();
    user = userRes.data?.user ?? null;
  }

  if (!user) {
    console.warn('No user available after sign up/sign in. Attempting to fetch by email via admin endpoint (may not be available).');
  }

  // Upsert profile (works if profiles table exists)
  if (user) {
    const payload = {
      id: user.id,
      email,
      full_name: fullName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const upsertRes = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select().single();
      if (upsertRes.error) {
        console.warn('Profile upsert returned error:', upsertRes.error.message || upsertRes.error);
      } else {
        console.log('Profile upserted:', upsertRes.data);
      }
    } catch (e) {
      console.error('Error upserting profile:', e);
    }
  } else {
    console.warn('Skipping profile upsert because user is not available.');
  }

  console.log('Demo user script finished.');
  process.exit(0);
} catch (e) {
  console.error('Unexpected error creating demo user:', e);
  process.exit(1);
}
