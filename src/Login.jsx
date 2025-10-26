import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else navigate('/home');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="site-card" style={{ width: 360, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 8, fontSize: 20 }}>Welcome Back</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 18 }}>Sign in to manage your clubs and events</p>
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
          <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }} />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ borderRadius: 12 }}>{loading ? 'Logging in...' : 'Log In'}</button>
        </form>
        {error && <div style={{ color: '#ff6b6b', marginTop: 12 }}>{error}</div>}
        <div style={{ marginTop: 18 }}>
          <div className="muted">or</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-ghost">Continue with Google</button>
            <button className="btn btn-ghost">Continue with Apple</button>
          </div>
        </div>
        <div style={{ marginTop: 18, fontSize: 14 }}>
          Don't have an account? <button type="button" onClick={() => navigate('/signup')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: '700' }}>Sign up</button>
        </div>
      </div>
    </div>
  );
}
