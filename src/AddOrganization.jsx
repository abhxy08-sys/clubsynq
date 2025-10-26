import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { supabase } from './supabaseClient';
import './theme.css';

export default function AddOrganization(){
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ name: '', category: '', shortDesc: '', about: '', instagram: '', email: '', links: [''] });
  const [nameAvailable, setNameAvailable] = React.useState(null); // null = unknown, true = available, false = taken
  const [user, setUser] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data && data.user) setUser(data.user);
        else navigate('/login');
      } catch (err) {
        navigate('/login');
      }
    })();
  }, [navigate]);
  const categories = ['STEM', 'Debate', 'Arts', 'Community Service', 'Business', 'Sports'];

  const handleFormChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') setForm(f => ({ ...f, [name]: files[0] }));
    else setForm(f => ({ ...f, [name]: value }));
  };
  const handleLinkChange = (idx, value) => setForm(f => ({ ...f, links: f.links.map((l,i) => i===idx?value:l) }));
  const addLinkField = () => setForm(f => ({ ...f, links: [...f.links, ''] }));

  // debounce check for name availability
  React.useEffect(() => {
    if (!form.name || form.name.trim().length === 0) {
      setNameAvailable(null);
      return;
    }
    let mounted = true;
    setNameAvailable(null); // show checking
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.from('organizations').select('id').ilike('name', form.name).limit(1);
        if (!mounted) return;
        if (data && data.length > 0) setNameAvailable(false);
        else setNameAvailable(true);
      } catch (err) {
        console.warn('Name availability check failed', err);
        if (mounted) setNameAvailable(null);
      }
    }, 450);
    return () => { mounted = false; clearTimeout(t); };
  }, [form.name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      // ensure user is signed in before attempting DB insert
      navigate('/login');
      return;
    }
    setMessage('');
    setUploading(true);
    // ensure organization name is unique (case-insensitive)
    try {
      const { data: existing } = await supabase.from('organizations').select('id').ilike('name', form.name).maybeSingle();
      if (existing) {
        setUploading(false);
        setMessage('An organization with this name already exists — please choose a different name.');
        return;
      }
    } catch (checkErr) {
      // if the check fails for any reason, proceed and let the insert surface the error
      console.warn('Name uniqueness check failed', checkErr);
    }
    const orgData = {
      name: form.name,
      category: form.category,
      short_desc: form.shortDesc,
      about: form.about,
      instagram: form.instagram,
      email: form.email,
    links: form.links.filter(l => l),
    admin_email: user?.email || null,
    // admin_user_id omitted to avoid type/foreign-key mismatches (fill via admin_email or an edit flow)
    };
    const { data: insertData, error } = await supabase.from('organizations').insert([orgData]);
    if (!error) {
      setUploading(false);
      navigate('/home');
    } else {
      setUploading(false);
      console.error('Insert org error', error, insertData);
      // show more detailed error if available
      const detail = error?.details || error?.message || JSON.stringify(error);
      // if the DB reports a unique-constraint violation, map to friendly message
      if (detail && /unique|duplicate/i.test(detail)) {
        setMessage('Organization name already exists (database constraint). Please choose another name.');
      } else {
        setMessage('Error creating organization: ' + detail);
      }
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>Add Organization</h2>
        <form onSubmit={handleSubmit} className="site-card" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <input name="name" type="text" placeholder="Organization Name" value={form.name} onChange={handleFormChange} required style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }} />
            <div style={{ height: 18, marginTop: 6 }}>
              {nameAvailable === true && <div style={{ color: '#10b981', fontSize: 13 }}>Name available ✓</div>}
              {nameAvailable === false && <div style={{ color: '#ef4444', fontSize: 13 }}>Name taken — choose another</div>}
              {nameAvailable === null && form.name.length > 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Checking availability…</div>}
            </div>
            <select name="category" value={form.category} onChange={handleFormChange} required style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }}>
              <option value="">Select Category/Type</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input name="shortDesc" type="text" placeholder="Short Description" value={form.shortDesc} onChange={handleFormChange} required style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }} />
            <textarea name="about" placeholder="Detailed About Section (optional)" value={form.about} onChange={handleFormChange} style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', minHeight: 120, color: 'inherit' }} />
            {/* Logo and cover removed - simplified organization creation */}
            <input name="instagram" type="text" placeholder="Instagram Handle" value={form.instagram} onChange={handleFormChange} style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }} />
            <input name="email" type="email" placeholder="Contact Email" value={form.email} onChange={handleFormChange} required style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }} />
            <div>
              <label className="muted">Links</label>
              {form.links.map((link, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input type="text" value={link} onChange={e => handleLinkChange(idx, e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'inherit' }} />
                  {idx === form.links.length - 1 && (
                    <button type="button" onClick={addLinkField} className="btn btn-primary" style={{ padding: '8px 10px' }}>+</button>
                  )}
                </div>
              ))}
            </div>
            {/* admin is set to the signed-in user */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => navigate('/home')} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={nameAvailable === false}>Create Organization</button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
