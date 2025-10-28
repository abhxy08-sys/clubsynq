import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://poigdqqoabwyllerunjq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvaWdkcXFvYWJ3eWxsZXJ1bmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NjcxODAsImV4cCI6MjA3NDQ0MzE4MH0.FeolsVDz0HLLtp9jMgBLf_nB0jgPEXen7U8K7vG6BBg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Ensure a profile row exists for a given user (upsert). This is safe to call from the client
// when RLS allows authenticated users to upsert their own profile (common pattern).
export async function ensureProfile(user) {
	if (!user || !user.id) return null;
	const payload = {
		id: user.id,
		email: user.email || null,
		full_name: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || null,
		username: (user.user_metadata && (user.user_metadata.username || user.user_metadata.preferred_username)) || null
	};
	try {
		const { data, error } = await supabase.from('profiles').upsert([payload], { onConflict: 'id' }).select().single();
		if (error) throw error;
		return data;
	} catch (err) {
		// swallow - caller can inspect console or returned value
		console.warn('ensureProfile failed', err.message || err);
		return null;
	}
}

// Listen for sign-in events and ensure a profile exists for newly signed in users.
// This helps keep `profiles` populated for users who only authenticated but never filled the profile UI.
if (typeof supabase.auth !== 'undefined' && supabase.auth.onAuthStateChange) {
	supabase.auth.onAuthStateChange((event, session) => {
		try {
			if (event === 'SIGNED_IN' && session && session.user) {
				// fire-and-forget
				ensureProfile(session.user);
			}
		} catch (e) {
			console.warn('auth state handler error', e);
		}
	});
}
