import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://imffuhuysgxbnvehwrpj.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmZ1aHV5c2d4Ym52ZWh3cnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njk0ODksImV4cCI6MjA5NTE0NTQ4OX0.6GVyWkBhW0NuA1bMukhlpJ-0h_W49GQEOtTVRelln7A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
