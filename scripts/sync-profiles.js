#!/usr/bin/env node
// Usage:
// SUPABASE_URL=https://xyz.supabase.co SERVICE_ROLE_KEY=your_service_role_key node scripts/sync-profiles.js

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_URL and SERVICE_ROLE_KEY env vars and re-run.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  console.log('Listing users from auth.admin...');
  let allUsers = [];
  let page = 1;
  let keepGoing = true;
  while (keepGoing) {
    try {
      // use admin.listUsers if available
      const res = await supabase.auth.admin.listUsers({ perPage: 100, page: page });
      if (res.error) {
        console.error('Error listing users:', res.error.message || res.error);
        process.exit(1);
      }
      const users = res.data || [];
      allUsers = allUsers.concat(users);
      if (!res?.data || users.length < 100) keepGoing = false; else page++;
    } catch (e) {
      console.error('Unexpected error listing users:', e.message || e);
      process.exit(1);
    }
  }

  console.log(`Fetched ${allUsers.length} users.`);
  if (allUsers.length === 0) {
    console.log('No users to process.');
    process.exit(0);
  }

  // Build upsert payloads in chunks
  const chunkSize = 200;
  const payloads = allUsers.map(u => {
    let full_name = null;
    let username = null;
    try {
      if (u.user_metadata && typeof u.user_metadata === 'object') {
        username = u.user_metadata.preferred_username || u.user_metadata.username || null;
        full_name = u.user_metadata.full_name || u.user_metadata.fullName || u.user_metadata.name || null;
      }
      if (!full_name && u.raw_user_meta_data) {
        const parsed = typeof u.raw_user_meta_data === 'string' ? JSON.parse(u.raw_user_meta_data) : u.raw_user_meta_data;
        full_name = parsed && (parsed.full_name || parsed.fullName || parsed.name) ? (parsed.full_name || parsed.fullName || parsed.name) : null;
        username = username || (parsed && (parsed.preferred_username || parsed.username) ? (parsed.preferred_username || parsed.username) : null);
      }
    } catch (e) {
      // ignore parse errors
    }
    return { id: u.id, email: u.email || null, username: username || null, full_name: full_name || null };
  });

  // upsert in chunks
  let success = 0;
  let failed = 0;
  for (let i = 0; i < payloads.length; i += chunkSize) {
    const chunk = payloads.slice(i, i + chunkSize);
    try {
      const { data, error } = await supabase.from('profiles').upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.error('Upsert error for chunk starting at', i, error.message || error);
        failed += chunk.length;
      } else {
        success += chunk.length;
        console.log(`Upserted chunk ${i}-${i + chunk.length - 1}`);
      }
    } catch (e) {
      console.error('Unexpected upsert error:', e.message || e);
      failed += chunk.length;
    }
  }

  console.log(`Done. success=${success}, failed=${failed}`);
  process.exit(0);
}

main();
