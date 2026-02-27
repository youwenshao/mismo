#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestSession() {
  try {
    // Try to create or get existing test user
    const testEmail = 'test@mismo.local';
    const testPassword = 'test123456';

    // First try to sign in (user might exist)
    let result = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Test User'
      }
    });

    if (result.error && !result.error.message.includes('already registered')) {
      throw result.error;
    }

    const userId = result.data?.user?.id;
    if (!userId) {
      // Try to get existing user
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users?.users?.find(u => u.email === testEmail);
      if (!existingUser) {
        throw new Error('Could not create or find test user');
      }
      console.log('Using existing user:', existingUser.id);
    } else {
      console.log('Created new user:', userId);
    }

    // Generate access token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: testEmail,
    });

    if (sessionError) throw sessionError;

    console.log('\n=== Test Auth Session Created ===');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('\nMagic Link:', sessionData.properties.action_link);
    console.log('\n=== Instructions ===');
    console.log('1. Open the magic link in your browser');
    console.log('2. Or sign in manually with the credentials above');
    console.log('3. Navigate to http://localhost:3000/chat to start testing');

  } catch (error) {
    console.error('Error creating test session:', error);
    process.exit(1);
  }
}

createTestSession();
