import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { initGoogleSheetsClient, requestAccessToken, appendRow } from './googleSheetsClient';
import Calendar from './Calendar';
import './theme.css';

export default function OrganizationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [events, setEvents] = React.useState([]);
  const [posts, setPosts] = React.useState([]);
  const [postVotesMap, setPostVotesMap] = React.useState({});
  const [user, setUser] = React.useState(null);
  const [isMember, setIsMember] = React.useState(false);
  const [membersCount, setMembersCount] = React.useState(0);
  const [award, setAward] = React.useState({ user_id: '', points: 0, reason: '' });
  const [certificate, setCertificate] = React.useState({ user_id: '', email: '', name: '', date: '', role: 'Participant', reason: '' });
  const [certMessage, setCertMessage] = React.useState('');
  const [certLoading, setCertLoading] = React.useState(false);
  const [membersList, setMembersList] = React.useState([]);
  const [showMembersModal, setShowMembersModal] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState(null);
  const [message, setMessage] = React.useState('');
  const [newEvent, setNewEvent] = React.useState({ title: '', date: '' });
  const [activeSection, setActiveSection] = React.useState('calendar');
  const [postContent, setPostContent] = React.useState('');
  const [isPoll, setIsPoll] = React.useState(false);
  const [pollOptions, setPollOptions] = React.useState(['', '']);
  const [postsMessage, setPostsMessage] = React.useState('');
  const [newLink, setNewLink] = React.useState('');
  const handleSelectMember = async (m) => {
    // if profile already present, just set
    if (m.profile) {
      setSelectedMember(m);
      // pre-fill award and certificate fields for admin quick actions
      setAward(a => ({ ...a, user_id: m.user_id }));
      setCertificate(c => ({ ...c, user_id: m.user_id, email: m.profile?.email || '', name: m.profile?.full_name || m.profile?.username || '' }));
      return;
    }
    // try to fetch profile on demand
    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', m.user_id).single();
      const prof = profileData || null;
      setSelectedMember({ user_id: m.user_id, profile: prof });
      // pre-fill award and certificate fields for admin quick actions
      setAward(a => ({ ...a, user_id: m.user_id }));
      setCertificate(c => ({ ...c, user_id: m.user_id, email: prof ? prof.email : '', name: prof ? (prof.full_name || prof.username) : '' }));
    } catch (err) {
      // if profiles table or query fails, still show basic member info
      setSelectedMember({ user_id: m.user_id, profile: null });
      setAward(a => ({ ...a, user_id: m.user_id }));
      setCertificate(c => ({ ...c, user_id: m.user_id }));
    }
  };
  React.useEffect(() => {
  async function fetchOrg() {
      setLoading(true);
  const { data: orgData } = await supabase.from('organizations').select('*').eq('id', id).single();
  if (orgData) setOrg(orgData);
  // try to fetch events for this org if an events table exists
  const { data: evData } = await supabase.from('events').select('*').eq('organization_id', id);
  setEvents(evData || []);
  // try to fetch posts for this org if a posts table exists
  try {
    const { data: postsData } = await supabase.from('posts').select('*').eq('organization_id', id).order('created_at', { ascending: false });
    setPosts(postsData || []);
  } catch (e) {
    // ignore if posts table doesn't exist
  }
      // fetch memberships for this org
  const { data: membersData } = await supabase.from('memberships').select('*').eq('organization_id', id);
  const members = membersData || [];
      setMembersCount(members.length);
      // try to fetch profiles if a 'profiles' table exists to show names/emails
      try {
    const ids = members.map(m => m.user_id).filter(Boolean);
    if (ids.length > 0) {
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, username, email').in('id', ids);
          const profilesById = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
          const enriched = members.map(m => ({ user_id: m.user_id, joined_at: m.joined_at, profile: profilesById[m.user_id] || null }));
          setMembersList(enriched);
        } else {
          setMembersList(members.map(m => ({ user_id: m.user_id, joined_at: m.joined_at, profile: null })));
        }
      } catch (err) {
        // profiles table probably doesn't exist; fallback to showing UUID list
        setMembersList(members.map(m => ({ user_id: m.user_id, joined_at: m.joined_at, profile: null })));
      }
      setLoading(false);
    }
    fetchOrg();
    // fetch current user
    supabase.auth.getUser().then(res => {
      if (res && res.data && res.data.user) setUser(res.data.user);
    }).catch(() => {});
    }, [id]);

    // helper: fetch votes for given posts and build counts/user-vote info
    async function fetchAndSetPostVotes(postsList) {
      try {
        if (!postsList || postsList.length === 0) {
          setPostVotesMap({});
          return;
        }
        const postIds = postsList.map(p => p.id).filter(Boolean);
        if (postIds.length === 0) {
          setPostVotesMap({});
          return;
        }
        const { data: votes } = await supabase.from('post_votes').select('*').in('post_id', postIds);
        const map = {};
        (votes || []).forEach(v => {
          if (!map[v.post_id]) map[v.post_id] = { counts: [], total: 0, userVoteIndex: null, userVoteId: null, votes: [] };
          const entry = map[v.post_id];
          entry.counts[v.option_index] = (entry.counts[v.option_index] || 0) + 1;
          entry.total = (entry.total || 0) + 1;
          entry.votes.push(v);
          if (user && v.user_id === user.id) {
            entry.userVoteIndex = v.option_index;
            entry.userVoteId = v.id;
          }
        });
        setPostVotesMap(map);
      } catch (err) {
        // ignore errors (table may not exist)
        setPostVotesMap({});
      }
    }

    // fetch votes whenever posts or user change
    React.useEffect(() => {
      fetchAndSetPostVotes(posts);
    }, [posts, user]);

  // helper for storage URLs (supabase storage or absolute URL)
  function resolveStorageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // supabase storage path stored as bucket/object
    try {
      const { SUPABASE_URL } = process.env;
      if (SUPABASE_URL) return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${path}`;
    } catch (e) {}
    return path;
  }

  // when user or org loads, determine membership
  React.useEffect(() => {
    if (!user || !org) return;
    (async () => {
      const { data } = await supabase.from('memberships').select('*').eq('organization_id', id).eq('user_id', user.id).single();
      setIsMember(!!data);
    })();
  }, [user, org, id]);

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;
  if (!org) return <div style={{ padding: 32 }}>Organization not found. <button onClick={() => navigate('/home')}>Back</button></div>;

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <div className="site-card" style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {org.logo_url ? <img src={resolveStorageUrl(org.logo_url)} alt="logo" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8 }} /> : <div className="org-logo" />}
          <div>
            <h1 style={{ margin: 0 }}>{org.name}</h1>
            <p style={{ margin: '6px 0', color: 'var(--muted)' }}><b>Category:</b> {org.category}</p>
            <p style={{ margin: '6px 0', color: 'var(--muted)' }}><b>Email:</b> {org.email}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link to="/home" style={{ color: 'var(--muted)' }}>Back to list</Link>
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="btn btn-ghost">Logout</button>
          </div>
        </div>

  {org.cover_url ? <img src={resolveStorageUrl(org.cover_url)} alt="cover" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, marginTop: 12 }} /> : null}

        <section style={{ marginTop: 16 }}>
          <h3>About</h3>
          <p>{org.about || org.short_desc}</p>
          <div style={{ marginTop: 8 }}>
            <strong>Members:</strong>
            {user && user.email === org.admin_email ? (
              <button onClick={() => setShowMembersModal(true)} style={{ marginLeft: 12, padding: '6px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>{membersCount} members</button>
            ) : (
              <span style={{ marginLeft: 12 }}>{membersCount}</span>
            )}
            {user ? (
              isMember ? (
                <button onClick={async () => {
                  const { error } = await supabase.from('memberships').delete().eq('organization_id', id).eq('user_id', user.id);
                  if (error) return setMessage('Error leaving: ' + error.message);
                  setIsMember(false);
                  setMembersCount(c => Math.max(0, c - 1));
                  setMessage('You left the organization');
                }} style={{ marginLeft: 12, padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6 }}>Leave</button>
              ) : (
                <button onClick={async () => {
                  const payload = { organization_id: id, user_id: user.id };
                  const { error } = await supabase.from('memberships').insert([payload]);
                  if (error) return setMessage('Error joining: ' + error.message);
                  setIsMember(true);
                  setMembersCount(c => c + 1);
                  setMessage('You joined the organization');
                }} style={{ marginLeft: 12, padding: '6px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>Join</button>
              )
            ) : (
              <span style={{ marginLeft: 12 }}>Log in to join</span>
            )}
          </div>
        </section>

        {/* Horizontal tab bar */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 8, alignItems: 'center' }}>
          {[
            { key: 'calendar', label: 'Calendar' },
            { key: 'members', label: 'Members' },
            { key: 'posts', label: 'Posts & Polls' },
            { key: 'admin', label: 'Admin' }
          ].map(t => (
            <button key={t.key} onClick={() => setActiveSection(t.key)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: activeSection === t.key ? '#2563eb' : 'transparent', color: activeSection === t.key ? '#fff' : 'inherit', fontWeight: activeSection === t.key ? 700 : 600 }}>{t.label}</button>
          ))}
        </div>

        {/* Section: Calendar */}
        {activeSection === 'calendar' && (
          <section style={{ marginTop: 16 }}>
            <h3>Calendar</h3>
            <Calendar events={events} />
            <div style={{ marginTop: 8, fontSize: 13, color: '#444' }}>
              <div>Current user: <b>{user ? user.email : 'not signed in'}</b></div>
              <div>Organization admin: <b>{org.admin_email || 'none'}</b></div>
            </div>
          </section>
        )}
        {/* Section: Members */}
        {activeSection === 'members' && (
          <section style={{ marginTop: 16 }}>
            <h3>Members</h3>
            {membersList.length === 0 ? (
              <p>No members yet</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {membersList.map((m, i) => (
                  <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid #fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <button onClick={() => handleSelectMember(m)} style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>{m.profile ? (m.profile.username || m.profile.full_name || m.profile.email) : 'Member'}</button>
                        <div style={{ fontSize: 12, color: '#666' }}>{m.profile ? `UUID: ${m.user_id}` : `UUID: ${m.user_id}`}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#888' }}>{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : ''}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {/* Members modal (reused) */}
            {showMembersModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="modal-card" style={{ width: 600, maxHeight: '80vh', overflowY: 'auto', borderRadius: 8, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Members ({membersList.length})</h3>
                    <button onClick={() => setShowMembersModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
                  </div>
                  <div style={{ marginTop: 12 }}>{membersList.length === 0 ? <p>No members</p> : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {membersList.map((m, i) => (
                        <li key={i} style={{ padding: 10, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.profile ? (m.profile.username || m.profile.full_name || m.profile.email) : 'Member'}</div>
                            <div style={{ fontSize: 12, color: '#666' }}>{m.profile ? `UUID: ${m.user_id}` : `UUID: ${m.user_id}`}</div>
                          </div>
                          <div style={{ fontSize: 12, color: '#888' }}>{m.joined_at ? new Date(m.joined_at).toLocaleString() : ''}</div>
                        </li>
                      ))}
                    </ul>
                  )}</div>
                </div>
              </div>
            )}
            {/* Member detail modal (admin only) */}
            {selectedMember && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="modal-card" style={{ width: 520, borderRadius: 8, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{selectedMember.profile ? (selectedMember.profile.full_name || selectedMember.profile.username) : 'Member'}</h3>
                    <button onClick={() => setSelectedMember(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div><strong>UUID:</strong> {selectedMember.user_id}</div>
                    <div><strong>Interests:</strong> {selectedMember.profile ? selectedMember.profile.interests : ''}</div>
                    <div><strong>Skills:</strong> {selectedMember.profile ? selectedMember.profile.skills : ''}</div>
                    <div><strong>Certifications:</strong> {selectedMember.profile ? selectedMember.profile.certifications : ''}</div>
                    <div><strong>School:</strong> {selectedMember.profile ? selectedMember.profile.school : ''}</div>
                    <div><strong>Grade:</strong> {selectedMember.profile ? selectedMember.profile.grade : ''}</div>
                    <div style={{ marginTop: 8 }}><strong>Bio:</strong><div style={{ marginTop: 4 }}>{selectedMember.profile ? selectedMember.profile.bio : ''}</div></div>
                  </div>
                  {user && user.email === org.admin_email && (
                    <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="number" placeholder="Points" value={award.points} onChange={e => setAward(a => ({ ...a, points: Number(e.target.value) }))} style={{ padding: 8, borderRadius: 8, width: 120 }} />
                        <input placeholder="Reason" value={award.reason} onChange={e => setAward(a => ({ ...a, reason: e.target.value }))} style={{ padding: 8, borderRadius: 8, flex: 1 }} />
                        <button className="btn btn-primary" onClick={async () => {
                          if (!award.user_id || !award.points) return setMessage('Provide user id and points');
                          const payload = { user_id: award.user_id, organization_id: id, points: award.points, reason: award.reason, awarded_by: user.id };
                          try {
                            const { error } = await supabase.from('user_points').insert([payload]);
                            if (error) return setMessage('Error awarding points: ' + error.message);
                            setAward(a => ({ ...a, points: 0, reason: '' }));
                            setMessage('Points awarded to member');
                            // optionally close modal
                            setSelectedMember(null);
                          } catch (err) {
                            setMessage('Error awarding points: ' + (err.message || err));
                          }
                        }}>Award Points</button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={async () => {
                          try {
                            if (selectedMember) {
                              // use existing profile data if present
                              let email = selectedMember.profile?.email || '';
                              let name = selectedMember.profile ? (selectedMember.profile.full_name || selectedMember.profile.username) : '';
                              // if email not available, try to fetch from profiles table first
                              if (!email) {
                                try {
                                  const { data: profileData, error } = await supabase.from('profiles').select('email, full_name, username').eq('id', selectedMember.user_id).single();
                                  if (!error && profileData) {
                                    email = profileData.email || '';
                                    name = profileData.full_name || profileData.username || name;
                                  }
                                } catch (e) {
                                  // ignore fetch error
                                }
                              }
                              // if still no email, try querying auth.users (may require DB permissions)
                              if (!email) {
                                try {
                                  const { data: authUser, error: authErr } = await supabase.from('auth.users').select('email').eq('id', selectedMember.user_id).single();
                                  if (!authErr && authUser && authUser.email) {
                                    email = authUser.email;
                                  } else {
                                    // set helpful message for admin so they're aware why email isn't auto-filled
                                    setCertMessage('Email not found in profiles; auth.users is restricted. Please enter email manually or sync profiles.');
                                  }
                                } catch (e) {
                                  // most projects don't expose auth.users to anon role; inform admin
                                  console.warn('fetching auth.users failed', e);
                                  setCertMessage('Unable to read auth.users from the client (permission denied). To auto-fill emails, either copy auth emails into `profiles` or use a server-side admin endpoint.');
                                }
                              }
                              setCertificate(c => ({ ...c, user_id: selectedMember.user_id, email, name }));
                            }
                          } catch (e) {
                            // no-op on error
                          } finally {
                            setActiveSection('admin');
                            setShowMembersModal(false);
                            setSelectedMember(null);
                          }
                        }}>Prepare Certificate</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Section: Posts & Polls (placeholder) */}
        {activeSection === 'posts' && (
          <section style={{ marginTop: 16 }}>
            <h3>Posts & Polls</h3>
            {postsMessage && <div style={{ marginTop: 8, color: postsMessage.startsWith('Error') ? 'red' : 'green' }}>{postsMessage}</div>}
            {/* Admin: quick create post/poll */}
            {user && user.email === org.admin_email && (
              <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea placeholder="Write an announcement or question..." value={postContent} onChange={e => setPostContent(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 6 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={isPoll} onChange={e => setIsPoll(e.target.checked)} /> Poll
                  </label>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => { setPostContent(''); setIsPoll(false); setPollOptions(['','']); }}>Reset</button>
                    <button className="btn btn-primary" onClick={async () => {
                      if (!postContent && !isPoll) return setMessage('Write something first');
                      try {
                        const payload = { organization_id: id, author_id: user.id, content: postContent, is_poll: isPoll, options: isPoll ? pollOptions.filter(Boolean) : null };
                        const { data, error } = await supabase.from('posts').insert([payload]);
                        if (error) return setMessage('Error creating post: ' + error.message);
                        setPostContent(''); setIsPoll(false); setPollOptions(['','']);
                        // refresh posts
                        const { data: postsData } = await supabase.from('posts').select('*').eq('organization_id', id).order('created_at', { ascending: false });
                        setPosts(postsData || []);
                        setMessage('Post created');
                      } catch (err) {
                        setMessage('Could not create post: ' + (err.message || err));
                      }
                    }}>Post</button>
                  </div>
                </div>
                {isPoll && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Poll options</strong>
                    {pollOptions.map((opt, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <input value={opt} onChange={e => setPollOptions(ps => ps.map((p, idx) => idx === i ? e.target.value : p))} style={{ flex: 1, padding: 8, borderRadius: 6 }} />
                        <button className="btn btn-ghost" onClick={() => setPollOptions(ps => ps.filter((_, idx) => idx !== i))}>Remove</button>
                      </div>
                    ))}
                    <button className="btn btn-ghost" onClick={() => setPollOptions(ps => ps.concat(['']))} style={{ marginTop: 8 }}>Add option</button>
                  </div>
                )}
              </div>
            )}

            {/* Show posts only to followers/members */}
            {(!user || !isMember) && !(user && user.email === org.admin_email) ? (
              <p style={{ color: '#666' }}>Follow the organization to see posts and polls.</p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {posts.length === 0 ? <p style={{ color: '#666' }}>No posts yet</p> : posts.map(p => (
                  <div key={p.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700 }}>{p.content}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</div>
                    </div>
                    {p.is_poll && p.options && Array.isArray(p.options) && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(p.options || []).map((opt, idx) => {
                          const voteEntry = postVotesMap[p.id] || { counts: [], userVoteIndex: null };
                          const count = (voteEntry.counts && voteEntry.counts[idx]) ? voteEntry.counts[idx] : 0;
                          const voted = voteEntry.userVoteIndex === idx;
                          return (
                          <button key={idx} className="btn btn-ghost" onClick={async () => {
                            if (!user) return setPostsMessage('Log in to vote');
                            try {
                              setPostsMessage('Voting...');
                              const { data, error } = await supabase.from('post_votes').insert([{ post_id: p.id, user_id: user.id, option_index: idx }]);
                              if (error) {
                                setPostsMessage('Error voting: ' + error.message);
                                return;
                              }
                              // refresh posts and votes
                              const { data: postsData } = await supabase.from('posts').select('*').eq('organization_id', id).order('created_at', { ascending: false });
                              setPosts(postsData || []);
                              // also refresh votes map immediately
                              fetchAndSetPostVotes(postsData || []);
                              setPostsMessage('Vote recorded');
                              // clear message after a short delay
                              setTimeout(() => setPostsMessage(''), 2500);
                            } catch (err) {
                              setPostsMessage('Error voting: ' + (err.message || err));
                              setTimeout(() => setPostsMessage(''), 3000);
                            }
                          }} style={{ fontWeight: voted ? 700 : 500 }}>{opt}{' '}{count > 0 ? `(${count})` : ''}</button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Section: Admin (manage events, points, certificates, links) */}
        {activeSection === 'admin' && (
          <section style={{ marginTop: 16 }}>
            <h3>Admin</h3>
            {user && user.email === org.admin_email ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {/* Add Event */}
                <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                  <h4 style={{ marginTop: 0 }}>Add Event</h4>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="date" value={newEvent.date} onChange={e => setNewEvent(ne => ({ ...ne, date: e.target.value }))} style={{ padding: 8, borderRadius: 8 }} />
                    <input type="text" placeholder="Event title" value={newEvent.title} onChange={e => setNewEvent(ne => ({ ...ne, title: e.target.value }))} style={{ padding: 8, borderRadius: 8, flex: 1 }} />
                    <button className="btn btn-primary" onClick={async () => {
                      setMessage('');
                      if (!newEvent.title || !newEvent.date) return setMessage('Provide title and date');
                      const payload = { title: newEvent.title, date: newEvent.date, organization_id: id };
                      try {
                        const { data, error } = await supabase.from('events').insert([payload]);
                        if (error) {
                          setMessage('Error adding event: ' + error.message);
                          return;
                        }
                        setNewEvent({ title: '', date: '' });
                        const { data: evData } = await supabase.from('events').select('*').eq('organization_id', id);
                        setEvents(evData || []);
                        setMessage('Event added');
                      } catch (err) {
                        setMessage('Unexpected error: ' + (err.message || err));
                      }
                    }}>Add</button>
                  </div>
                  {message && <div style={{ marginTop: 8, color: message.startsWith('Error') ? 'red' : 'green' }}>{message}</div>}
                </div>

                {/* Award Points */}
                <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                  <h4 style={{ marginTop: 0 }}>Award Points</h4>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input placeholder="User UUID" value={award.user_id} onChange={e => setAward(a => ({ ...a, user_id: e.target.value }))} style={{ padding: 8, borderRadius: 8 }} />
                    <input type="number" placeholder="Points" value={award.points} onChange={e => setAward(a => ({ ...a, points: Number(e.target.value) }))} style={{ padding: 8, width: 120, borderRadius: 8 }} />
                    <input placeholder="Reason" value={award.reason} onChange={e => setAward(a => ({ ...a, reason: e.target.value }))} style={{ padding: 8, borderRadius: 8, flex: 1 }} />
                    <button className="btn btn-primary" onClick={async () => {
                      if (!award.user_id || !award.points) return setMessage('Provide user id and points');
                      const payload = { user_id: award.user_id, organization_id: id, points: award.points, reason: award.reason, awarded_by: user.id };
                      const { error } = await supabase.from('user_points').insert([payload]);
                      if (error) return setMessage('Error awarding points: ' + error.message);
                      setAward({ user_id: '', points: 0, reason: '' });
                      setMessage('Points awarded');
                    }}>Award</button>
                  </div>
                </div>

                {/* Award Certificate */}
                <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                  <h4 style={{ marginTop: 0 }}>Award Certificate</h4>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input placeholder="User UUID (or email)" value={certificate.user_id} onChange={e => setCertificate(c => ({ ...c, user_id: e.target.value }))} style={{ padding: 8, borderRadius: 8, flex: 1 }} />
                      <input placeholder="Email (optional)" value={certificate.email} onChange={e => setCertificate(c => ({ ...c, email: e.target.value }))} style={{ padding: 8, borderRadius: 8, width: 320 }} />
                    </div>
                    <input placeholder="Full name on certificate" value={certificate.name} onChange={e => setCertificate(c => ({ ...c, name: e.target.value }))} style={{ padding: 8, borderRadius: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="date" value={certificate.date} onChange={e => setCertificate(c => ({ ...c, date: e.target.value }))} style={{ padding: 8, borderRadius: 8 }} />
                      <select value={certificate.role} onChange={e => setCertificate(c => ({ ...c, role: e.target.value }))} style={{ padding: 8, borderRadius: 8 }}>
                        <option>Participant</option>
                        <option>Volunteer</option>
                        <option>Speaker</option>
                        <option>Organizer</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <input placeholder="Reason / Description" value={certificate.reason} onChange={e => setCertificate(c => ({ ...c, reason: e.target.value }))} style={{ padding: 8, borderRadius: 8 }} />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost" onClick={() => setCertificate({ user_id: '', email: '', name: '', date: '', role: 'Participant', reason: '' })}>Reset</button>
                      <button className="btn btn-primary" onClick={async () => {
                        setCertMessage('');
                        setCertLoading(true);
                        try {
                          const appsUrl = process.env.REACT_APP_APPS_SCRIPT_URL || '';
                          const appsSecret = process.env.REACT_APP_APPS_SCRIPT_SECRET || '';
                          if (appsUrl) {
                            const payload = {
                              organization_id: id || '',
                              organization_name: org?.name || '',
                              recipient_user_id: certificate.user_id || '',
                              recipient_email: certificate.email || '',
                              recipient_name: certificate.name || '',
                              date: certificate.date || '',
                              role: certificate.role || '',
                              reason: certificate.reason || ''
                            };
                            const form = new URLSearchParams();
                            Object.entries(payload).forEach(([k, v]) => form.append(k, v || ''));
                            if (appsSecret) form.append('x_webhook_secret', appsSecret);
                            const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
                            const res = await fetch(appsUrl, { method: 'POST', headers, body: form.toString() });
                            let text;
                            try { text = await res.text(); } catch(e) { text = ''; }
                            if (!res.ok) {
                              setCertMessage('Failed to save to Apps Script: ' + res.status + ' ' + text);
                              setCertLoading(false);
                              return;
                            }
                            setCertMessage('Saved to Google Sheet (pending).');
                            setCertLoading(false);
                            return;
                          }

                          const sheetId = process.env.REACT_APP_GOOGLE_SHEET_ID || '';
                          const sheetName = process.env.REACT_APP_GOOGLE_SHEET_NAME || 'certificates';
                          const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
                          if (!sheetId || !clientId) {
                            setCertMessage('Google Sheets client not configured');
                            setCertLoading(false);
                            return;
                          }
                          await initGoogleSheetsClient(clientId);
                          await requestAccessToken();
                          const row = [
                            id || '',
                            org?.name || '',
                            certificate.user_id || '',
                            certificate.email || '',
                            certificate.name || '',
                            certificate.date || '',
                            certificate.role || '',
                            certificate.reason || '',
                            'pending',
                            new Date().toISOString(),
                            ''
                          ];
                          await appendRow(sheetId, sheetName, row);
                          setCertMessage('Saved to Google Sheet (pending).');
                        } catch (err) {
                          setCertMessage('Error saving to sheet: ' + (err.message || err));
                        } finally {
                          setCertLoading(false);
                        }
                      }}>{certLoading ? 'Saving...' : 'Save & Queue Certificate'}</button>
                    </div>
                    {certMessage && <div style={{ marginTop: 8, color: certMessage.startsWith('Failed') || certMessage.startsWith('Error') ? 'red' : 'green' }}>{certMessage}</div>}
                  </div>
                </div>

                {/* Links management */}
                <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                  <h4 style={{ marginTop: 0 }}>Links</h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input placeholder="https://example.com" value={newLink} onChange={e => setNewLink(e.target.value)} style={{ padding: 8, borderRadius: 8, flex: 1 }} />
                    <button className="btn btn-primary" onClick={async () => {
                      if (!newLink) return setMessage('Provide a link');
                      try {
                        const updated = (org.links || []).concat([newLink]);
                        const { error } = await supabase.from('organizations').update({ links: updated }).eq('id', id);
                        if (error) return setMessage('Error saving link: ' + error.message);
                        setOrg(o => ({ ...o, links: updated }));
                        setNewLink('');
                        setMessage('Link added');
                      } catch (err) {
                        setMessage('Error adding link: ' + (err.message || err));
                      }
                    }}>Add</button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {(org.links || []).length === 0 ? <p>No links</p> : (
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {(org.links || []).map((l, i) => (
                          <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                            <a href={l} target="_blank" rel="noreferrer noopener">{l}</a>
                            <button className="btn btn-ghost" onClick={async () => {
                              try {
                                const updated = (org.links || []).filter(x => x !== l);
                                const { error } = await supabase.from('organizations').update({ links: updated }).eq('id', id);
                                if (error) return setMessage('Error removing link: ' + error.message);
                                setOrg(o => ({ ...o, links: updated }));
                                setMessage('Link removed');
                              } catch (err) {
                                setMessage('Error removing link: ' + (err.message || err));
                              }
                            }}>Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#666' }}>Admin controls are visible to the organization admin only.</p>
            )}
          </section>
        )}

        

        <section style={{ marginTop: 16 }}>
          <h3>Links</h3>
          {org.links && org.links.length > 0 ? (
            <ul>
              {org.links.map((l, i) => <li key={i}><a href={l} target="_blank" rel="noopener noreferrer">{l}</a></li>)}
            </ul>
          ) : <p>No links</p>}
        </section>

        
      </div>
    </div>
  );
}
