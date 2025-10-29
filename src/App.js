import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import OrganizationDetail from './OrganizationDetail';
import Dashboard from './Dashboard';
import Profile from './Profile';
import Layout from './Layout';
import './theme.css';
import AddOrganization from './AddOrganization';
import { supabase } from './supabaseClient'; // Import Supabase client

function Home() {
  const [organizations, setOrganizations] = React.useState([]);
  // AddOrganization is a separate page; Home only lists organizations
  const [selectedOrg, setSelectedOrg] = React.useState(null);
  const categories = ['STEM', 'Debate', 'Arts', 'Community Service', 'Business', 'Sports'];
  const [selectedCategory, setSelectedCategory] = React.useState('All');

  React.useEffect(() => {
    async function fetchOrganizations() {
      const { data, error } = await supabase.from('organizations').select('*');
      if (!error) setOrganizations(data || []);
    }
    fetchOrganizations();
  }, []);


  // helper: accept either a full URL or a storage path and return a public URL
  const resolveStorageUrl = (urlOrPath) => {
    if (!urlOrPath) return null;
    try {
      if (typeof urlOrPath === 'string' && (urlOrPath.startsWith('http') || urlOrPath.includes('supabase.co'))) return urlOrPath;
      // normalize path (remove leading slash)
      let p = urlOrPath;
      if (p.startsWith('/')) p = p.slice(1);
      const { data } = supabase.storage.from('organization-media').getPublicUrl(p);
      return data?.publicUrl || null;
    } catch (err) {
      return urlOrPath;
    }
  };

  // no form handling in Home anymore

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      

      {/* Organization Details Modal */}
      {selectedOrg && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="site-card" style={{ padding: 32, borderRadius: 12, width: 480, maxHeight: '90vh', overflowY: 'auto', position: 'relative', textAlign: 'center' }}>
            <button onClick={() => setSelectedOrg(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }} aria-label="close">&times;</button>
              {selectedOrg.logo_url && <img src={resolveStorageUrl(selectedOrg.logo_url)} alt="Logo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 12, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />}
              {selectedOrg.cover_url && <img src={resolveStorageUrl(selectedOrg.cover_url)} alt="Cover" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />}
              <h2>{selectedOrg.name}</h2>
              <p style={{ color: 'var(--muted)' }}><b>Category:</b> {selectedOrg.category}</p>
              <p style={{ color: 'var(--muted)' }}><b>Short Description:</b> {selectedOrg.short_desc}</p>
              {selectedOrg.about && <p><b>About:</b> {selectedOrg.about}</p>}
            <p style={{ color: 'var(--muted)' }}><b>Instagram:</b> {selectedOrg.instagram}</p>
            <p style={{ color: 'var(--muted)' }}><b>Email:</b> {selectedOrg.email}</p>
            {selectedOrg.links && selectedOrg.links.length > 0 && (
              <div style={{ color: 'var(--muted)' }}>
                <b>Links:</b>
                <ul>
                  {selectedOrg.links.map((link, idx) => (
                    <li key={idx}><a href={link} target="_blank" rel="noopener noreferrer">{link}</a></li>
                  ))}
                </ul>
              </div>
            )}
            <p style={{ color: 'var(--muted)' }}><b>Admin Email:</b> {selectedOrg.admin_email}</p>
          </div>
        </div>
      )}

      <Layout>
        <div style={{ padding: 10 }}>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Organizations</h2>

          {/* Filter bar */}
          <div className="filter-bar" style={{ marginBottom: 12 }}>
            <button className={`filter-chip ${selectedCategory === 'All' ? 'active' : ''}`} onClick={() => setSelectedCategory('All')}>All</button>
            {categories.map(cat => (
              <button key={cat} className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>
            ))}
          </div>

          {(!organizations || organizations.length) === 0 ? (
            <div className="muted">No organizations found.</div>
          ) : (
            <div className="org-grid">
              {/** filter organizations by selectedCategory (case-insensitive) */}
              {organizations
                .filter(org => {
                  if (!selectedCategory || selectedCategory === 'All') return true;
                  if (!org || !org.category) return false;
                  return String(org.category).toLowerCase() === String(selectedCategory).toLowerCase();
                })
                .map(org => (
                <div key={org.id} className="org-card" onClick={() => window.location.href = `/organization/${org.id}`}>
                  <div className="org-accent" style={{ background: org && org.homepage_color ? org.homepage_color : undefined }} />
                  <div className="org-content">
                    <div className="org-initials">{(org.name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>
                    <div className="org-title">{org.name}</div>
                    <div className="org-meta">{org.short_desc || ''}</div>
                  </div>
                  <div className="org-badge">{org.category}</div>
                  <div className="org-overlay">
                    <button className="btn btn-primary" onClick={(e)=>{e.stopPropagation(); window.location.href = `/organization/${org.id}`}}>View</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
  <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
  <Route path="/profile" element={<Layout><Profile /></Layout>} />
  <Route path="/organization/new" element={<Layout><AddOrganization /></Layout>} />
  <Route path="/organization/:id" element={<Layout><OrganizationDetail /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;
