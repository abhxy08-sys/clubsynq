import React from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState({ full_name: '', username: '', interests: '', skills: '', certifications: '', school: '', grade: '', bio: '' });
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    supabase.auth.getUser().then(res => {
      if (res && res.data && res.data.user) {
        setUser(res.data.user);
        // try to fetch profile from 'profiles' table
        (async () => {
          const { data } = await supabase.from('profiles').select('*').eq('id', res.data.user.id).single();
          if (data) setProfile({ full_name: data.full_name || '', username: data.username || '', interests: data.interests || '', skills: data.skills || '', certifications: data.certifications || '', school: data.school || '', grade: data.grade || '', bio: data.bio || '' });
          setLoading(false);
        })();
      } else setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!user) return navigate('/login');
    const payload = { id: user.id, full_name: profile.full_name, username: profile.username, interests: profile.interests, skills: profile.skills, certifications: profile.certifications, school: profile.school, grade: profile.grade };
    // upsert into profiles table
    const { error } = await supabase.from('profiles').upsert({ ...payload, bio: profile.bio });
    if (error) {
      // detect missing column error
      if (error.message && error.message.includes("Could not find the 'bio' column")) {
        return alert('Error saving profile: the profiles table is missing the "bio" column. Run db/create_profiles_table.sql or add the column: ALTER TABLE public.profiles ADD COLUMN bio TEXT;');
      }
      return alert('Error saving profile: ' + error.message);
    }
    alert('Profile saved');
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!user) return <div style={{ padding: 24 }}>Please <button onClick={() => navigate('/login')}>login</button> to edit your profile.</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="site-card">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 96, height: 96, borderRadius: 14, background: 'linear-gradient(90deg,var(--accent),var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>A</div>
            <div>
              <h2 style={{ margin: 0 }}>Edit Profile</h2>
              <div className="muted">{user.email}</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="muted">Full name</label>
                <input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent' }} />
              </div>
              <div>
                <label className="muted">Username</label>
                <input value={profile.username} onChange={e => setProfile(p => ({ ...p, username: e.target.value }))} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="muted">Interests</label>
                <input value={profile.interests} onChange={e => setProfile(p => ({ ...p, interests: e.target.value }))} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="muted">Bio</label>
                <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', minHeight: 120 }} />
              </div>
              <div>
                <label className="muted">Skills</label>
                <input value={profile.skills} onChange={e => setProfile(p => ({ ...p, skills: e.target.value }))} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent' }} />
              </div>
              <div>
                <label className="muted">Certifications</label>
                <input value={profile.certifications} onChange={e => setProfile(p => ({ ...p, certifications: e.target.value }))} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent' }} />
              </div>
              <div>
                <label className="muted">School / University</label>
                <input value={profile.school} onChange={e => setProfile(p => ({ ...p, school: e.target.value }))} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent' }} />
              </div>
              <div>
                <label className="muted">Grade / Year</label>
                <input value={profile.grade} onChange={e => setProfile(p => ({ ...p, grade: e.target.value }))} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent' }} />
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => navigate('/home')} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary">Save changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
