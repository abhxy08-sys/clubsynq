import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/login',
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim()
          }
        }
      });
      
      if (error) {
        setLoading(false);
        setError(error.message);
        return;
      }

      // Check if email verification is required
      if (data?.user?.identities?.length === 0) {
        setError('This email is already registered. Please check your email for the verification link.');
        setLoading(false);
        return;
      }
      
      // Ensure profile row contains full name, username, and email
      try {
        const userRes = await supabase.auth.getUser();
        const user = userRes && userRes.data && userRes.data.user ? userRes.data.user : null;
        if (user && user.id) {
          const fullName = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim() || null;
          // Use email prefix as default username if not set
          let username = '';
          if (user.user_metadata && user.user_metadata.username) {
            username = user.user_metadata.username;
          } else if (email) {
            username = email.split('@')[0];
          }
          const payload = {
            id: user.id,
            email: user.email || email || null,
            full_name: fullName,
            username: username
          };
          await supabase.from('profiles').upsert([payload], { onConflict: 'id' });
        }
      } catch (e) {
        // ignore profile upsert errors here; ensureProfile in supabaseClient will still run on auth state change
        console.warn('profile upsert failed', e);
      }
      setLoading(false);
      setSuccess('Signup successful! You are now logged in.');
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setLoading(false);
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="site-card" style={{ width: 360, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 8, fontSize: 20 }}>Create an account</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 18 }}>Join clubs, RSVP to events and earn points</p>
        <form onSubmit={handleSignup} style={{ display: 'grid', gap: 12 }}>
          <input className="input" type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }} />
          <input className="input" type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }} />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }} />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ borderRadius: 12 }}>{loading ? 'Signing up...' : 'Sign up'}</button>
        </form>
        {error && <div style={{ color: '#ff6b6b', marginTop: 12 }}>{error}</div>}
        {success && <div style={{ color: '#34d399', marginTop: 12 }}>{success}</div>}
        <div style={{ marginTop: 18, fontSize: 14 }}>
          Already have an account? <button type="button" onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: '700' }}>Login</button>
        </div>
      </div>
    </div>
  );
}
