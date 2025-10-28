import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

  const container = {
    hidden: { opacity: 0, y: 20, scale: 0.995 },
    show: { opacity: 1, y: 0, scale: 1, transition: { staggerChildren: 0.08, ease: [0.2, 0.9, 0.3, 1] } }
  };
  const field = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.2, 0.9, 0.3, 1] } }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {/* animated background blob */}
      <div className="animated-blob" aria-hidden="true" />
      <motion.div className="site-card" style={{ width: 380, textAlign: 'center' }} variants={container} initial="hidden" animate="show">
        <motion.h2 style={{ marginBottom: 8, fontSize: 20, zIndex: 2 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}>Welcome Back</motion.h2>
        <motion.p className="muted" style={{ marginTop: 0, marginBottom: 18, zIndex: 2 }} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.06, duration: 0.5 } }}>Sign in to manage your clubs and events</motion.p>
        <motion.form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
          <motion.div variants={field}>
            <motion.input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }}
              whileFocus={{ scale: 1.01 }}
            />
          </motion.div>
          <motion.div variants={field}>
            <motion.input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }}
              whileFocus={{ scale: 1.01 }}
            />
          </motion.div>
          <motion.div variants={field}>
            <motion.button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-glow"
              style={{ borderRadius: 12, width: '100%' }}
              whileHover={{ y: -3, boxShadow: '0 10px 40px rgba(124,58,237,0.18)' }}
              whileTap={{ scale: 0.995 }}
            >{loading ? 'Logging in...' : 'Log In'}</motion.button>
          </motion.div>
        </motion.form>
        {error && <div style={{ color: '#ff6b6b', marginTop: 12 }}>{error}</div>}
        <div style={{ marginTop: 18, fontSize: 14 }}>
          Don't have an account? <button type="button" onClick={() => navigate('/signup')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: '700' }}>Sign up</button>
        </div>
      </motion.div>
    </div>
  );
}
