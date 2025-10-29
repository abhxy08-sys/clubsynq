import React from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
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
  const [currentProfile, setCurrentProfile] = React.useState(null);
  const [isMember, setIsMember] = React.useState(false);
  const [membership, setMembership] = React.useState(null); // holds the membership row (role etc)
  const [membersCount, setMembersCount] = React.useState(0);
  const [award, setAward] = React.useState({ user_id: '', points: 0, reason: '' });
  const [certificate, setCertificate] = React.useState({ user_id: '', email: '', name: '', date: '', role: 'Participant', reason: '' });
  const [certMessage, setCertMessage] = React.useState('');
  const [certLoading, setCertLoading] = React.useState(false);
  const [membersList, setMembersList] = React.useState([]);
  const [memberTagsInput, setMemberTagsInput] = React.useState('');
  const [showMembersModal, setShowMembersModal] = React.useState(false);
  const [showTargetedPostModal, setShowTargetedPostModal] = React.useState(false);
  const [targetedSelectedMemberIds, setTargetedSelectedMemberIds] = React.useState([]);
  const [targetedPostContent, setTargetedPostContent] = React.useState('');
  // helper to open targeted post modal (adds logging for debugging)
  function openTargetedPostModal() {
    try {
      console.log('Opening targeted post modal');
      setTargetedSelectedMemberIds([]);
      setTargetedPostContent('');
      setShowTargetedPostModal(true);
      setMessage('');
    } catch (e) {
      console.warn('openTargetedPostModal error', e);
      setMessage('Could not open targeted post modal');
    }
  }
  const [selectedMember, setSelectedMember] = React.useState(null);
  const [message, setMessage] = React.useState('');
  const [newEvent, setNewEvent] = React.useState({ title: '', date: '' });
  const [activeSection, setActiveSection] = React.useState('calendar');
  const [postContent, setPostContent] = React.useState('');
  const [isPoll, setIsPoll] = React.useState(false);
  const [pollOptions, setPollOptions] = React.useState(['', '']);
  // Q&A state
  const [qaList, setQaList] = React.useState([]);
  const [newQuestion, setNewQuestion] = React.useState('');
  const [qaMessage, setQaMessage] = React.useState('');
  const [qaLoading, setQaLoading] = React.useState(false);
  const [answerDrafts, setAnswerDrafts] = React.useState({});
  const [qaRepliesMap, setQaRepliesMap] = React.useState({});
  const [replyDrafts, setReplyDrafts] = React.useState({});
  const [orgTags, setOrgTags] = React.useState([]); // tags available for this organization {id, name}
  const [selectedTags, setSelectedTags] = React.useState([]); // names of tags selected for new post
  const [showNewTagInput, setShowNewTagInput] = React.useState(false);
  const [newTagName, setNewTagName] = React.useState('');
  const [groups, setGroups] = React.useState([]); // target groups for this org
  const [groupMembersMap, setGroupMembersMap] = React.useState({}); // group_id -> [user_id]
  const [groupMemberProfiles, setGroupMemberProfiles] = React.useState({}); // user_id -> profile
  const [showGroupModal, setShowGroupModal] = React.useState(false);
  const [groupNameInput, setGroupNameInput] = React.useState('');
  const [groupSelectedMemberIds, setGroupSelectedMemberIds] = React.useState([]);
  const [emailSearch, setEmailSearch] = React.useState('');
  const [emailSearchMessage, setEmailSearchMessage] = React.useState('');
  const [emailSearchLoading, setEmailSearchLoading] = React.useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = React.useState(false);
  const [addMembersGroupId, setAddMembersGroupId] = React.useState(null);
  const [addMemberEmail, setAddMemberEmail] = React.useState('');
  const [addMemberMessage, setAddMemberMessage] = React.useState('');
  const [addMemberLoading, setAddMemberLoading] = React.useState(false);
  const [showGroupPostModal, setShowGroupPostModal] = React.useState(false);
  const [groupPostContent, setGroupPostContent] = React.useState('');
  const [postingToGroupId, setPostingToGroupId] = React.useState(null);
  // Group chat state
  const [activeChatGroupId, setActiveChatGroupId] = React.useState(null);
  const [groupMessages, setGroupMessages] = React.useState([]);
  const [groupMessageInput, setGroupMessageInput] = React.useState('');
  const [showGroupChatModal, setShowGroupChatModal] = React.useState(false);
  const [postsMessage, setPostsMessage] = React.useState('');
  const [newLink, setNewLink] = React.useState('');
  // role change confirmation modal state
  const [showRoleConfirm, setShowRoleConfirm] = React.useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = React.useState(null); // user_id
  const [roleChangeNewRole, setRoleChangeNewRole] = React.useState(null); // 'admin' or 'member'
  const [roleChangeTargetName, setRoleChangeTargetName] = React.useState('');
  const handleSelectMember = async (m) => {
    // Always attempt to fetch the latest profile when opening the member modal.
    // This ensures that profile edits made elsewhere (e.g. Profile page) are
    // reflected immediately in the modal and in the membersList cache.
    try {
      const { data: profileData, error } = await supabase.from('profiles').select('*').eq('id', m.user_id).single();
      const prof = (error || !profileData) ? (m.profile || null) : profileData;
      // update selected member with freshest profile (or fallback to existing)
      setSelectedMember({ user_id: m.user_id, joined_at: m.joined_at, role: m.role, profile: prof });
      setMemberTagsInput(prof ? (prof.tags || '') : '');
      // update membersList cache so other UI shows updated profile too
      setMembersList(list => (list || []).map(item => item.user_id === m.user_id ? ({ ...item, profile: prof }) : item));
      // pre-fill award and certificate fields for admin quick actions
      setAward(a => ({ ...a, user_id: m.user_id }));
      setCertificate(c => ({ ...c, user_id: m.user_id, email: prof ? prof.email : '', name: prof ? (prof.full_name || prof.username) : '' }));
    } catch (err) {
      // if profiles table or query fails, still show basic member info
      setSelectedMember({ user_id: m.user_id, joined_at: m.joined_at, role: m.role, profile: m.profile || null });
      setMemberTagsInput(m.profile ? (m.profile.tags || '') : '');
      setAward(a => ({ ...a, user_id: m.user_id }));
      setCertificate(c => ({ ...c, user_id: m.user_id }));
    }
  };

  // Add a member to the current group selection by their email (admin only)
  async function addMemberByEmail(email) {
    const e = (email || '').trim();
    if (!e) return setEmailSearchMessage('Enter an email');
    setEmailSearchMessage('');
    setEmailSearchLoading(true);
    try {
      let profile = null;
      try {
        const { data: p, error: perr } = await supabase.from('profiles').select('id, email, full_name, username').eq('email', e).limit(1).single();
        if (!perr && p) profile = p;
      } catch (err) {}
      if (!profile) {
        try {
          const { data: au, error: aerr } = await supabase.from('auth.users').select('id, email, raw_user_meta_data, user_metadata').eq('email', e).limit(1).single();
          if (!aerr && au) {
            const u = au;
            let full_name = null, username = null;
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
            } catch (e2) {}
            try {
              const { data: up, error: uerr } = await supabase.from('profiles').upsert([{ id: u.id, email: u.email, full_name: full_name || null, username: username || null }], { onConflict: 'id' }).select().single();
              if (!uerr && up) profile = up; else profile = { id: u.id, email: u.email, full_name: full_name || null, username: username || null };
            } catch (e3) {
              profile = { id: u.id, email: u.email, full_name: full_name || null, username: username || null };
            }
          }
        } catch (err) {
          // auth.users may be restricted
        }
      }
      if (profile && profile.id) {
        setGroupSelectedMemberIds(ids => ids.includes(profile.id) ? ids : ids.concat([profile.id]));
        setMembersList(list => {
          if ((list || []).some(x => x.user_id === profile.id)) return list;
    return (list || []).concat([{ user_id: profile.id, joined_at: null, role: 'member', profile }]);
        });
        setEmailSearchMessage('Added ' + (profile.full_name || profile.email || profile.id));
        setEmailSearch('');
      } else {
        setEmailSearchMessage('No user found with that email');
      }
    } catch (err) {
      setEmailSearchMessage('Error: ' + (err.message || err));
    } finally {
      setEmailSearchLoading(false);
    }
  }
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
  // try to fetch tags for this org (tags table may not exist)
  try {
    const { data: tagsData } = await supabase.from('tags').select('*').eq('organization_id', id).order('created_at', { ascending: false });
    setOrgTags(tagsData || []);
  } catch (e) {
    // ignore if tags table doesn't exist
  }
      // try to fetch target groups and their members (tables may not exist)
      try {
        const { data: groupsData } = await supabase.from('target_groups').select('*').eq('organization_id', id).order('created_at', { ascending: false });
        const groupsList = groupsData || [];
        setGroups(groupsList);
        try {
          // fetch members for the groups we just loaded by group_id
          const groupIds = groupsList.map(g => g.id).filter(Boolean);
          if (groupIds.length > 0) {
            const { data: gm } = await supabase.from('target_group_members').select('*').in('group_id', groupIds);
            const gmList = gm || [];
            const map = {};
            (gmList || []).forEach(r => {
              if (!map[r.group_id]) map[r.group_id] = [];
              map[r.group_id].push(r.user_id);
            });
            setGroupMembersMap(map);
            // fetch profiles for these member user ids
            try {
              const allUserIds = Array.from(new Set((gmList || []).map(x => x.user_id).filter(Boolean)));
              if (allUserIds.length > 0) {
                const { data: profiles } = await supabase.from('profiles').select('id, full_name, username, email').in('id', allUserIds);
                const profMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
                setGroupMemberProfiles(profMap);
              } else {
                setGroupMemberProfiles({});
              }
            } catch (e) {
              setGroupMemberProfiles({});
            }
          } else {
            setGroupMembersMap({});
            setGroupMemberProfiles({});
          }
        } catch (e) {
          // ignore if target_group_members doesn't exist or permission denied
          setGroupMembersMap({});
          setGroupMemberProfiles({});
        }
      } catch (e) {
        // ignore if target_groups table doesn't exist
      }
      // fetch memberships for this org
  const { data: membersData } = await supabase.from('memberships').select('*').eq('organization_id', id);
  const members = membersData || [];
      setMembersCount(members.length);
      // try to fetch profiles if a 'profiles' table exists to show names/emails
        try {
      const ids = members.map(m => m.user_id).filter(Boolean);
      if (ids.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, username, email, tags, role, interests').in('id', ids);
            const profilesById = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
            // If some members don't have a profiles row, try a best-effort read of auth.users to get emails/names
            const missing = ids.filter(i => !profilesById[i]);
            if (missing.length > 0) {
              try {
                // attempt to read auth.users for fallback info (may be restricted by RLS)
                const { data: authUsers } = await supabase.from('auth.users').select('id, email, raw_user_meta_data, user_metadata').in('id', missing);
                (authUsers || []).forEach(u => {
                  // derive a friendly name from available metadata
                  let full_name = null;
                  try {
                    if (u.user_metadata && typeof u.user_metadata === 'object') {
                      full_name = u.user_metadata.full_name || u.user_metadata.fullName || u.user_metadata.name || null;
                    }
                    if (!full_name && u.raw_user_meta_data) {
                      const parsed = typeof u.raw_user_meta_data === 'string' ? JSON.parse(u.raw_user_meta_data) : u.raw_user_meta_data;
                      full_name = parsed && (parsed.full_name || parsed.fullName || parsed.name) ? (parsed.full_name || parsed.fullName || parsed.name) : null;
                    }
                  } catch (e) {
                    // ignore JSON parse or shape errors
                  }
                  profilesById[u.id] = { id: u.id, email: u.email || null, full_name: full_name || null, username: null };
                });
              } catch (e) {
                // reading auth.users may be restricted; that's fine — we'll fall back to UUIDs
              }
            }
            const enriched = members.map(m => ({ user_id: m.user_id, joined_at: m.joined_at, role: m.role || 'member', profile: profilesById[m.user_id] || null }));
            setMembersList(enriched);
          } else {
            setMembersList(members.map(m => ({ user_id: m.user_id, joined_at: m.joined_at, role: m.role || 'member', profile: null })));
          }
        } catch (errProfiles) {
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

    // fetch profile for current user when available
    React.useEffect(() => {
      if (!user) {
        setCurrentProfile(null);
        return;
      }
      (async () => {
        try {
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          setCurrentProfile(prof || null);
        } catch (e) {
          setCurrentProfile(null);
        }
      })();
    }, [user]);

    // helper: fetch votes for given posts and build counts/user-vote info
    const fetchAndSetPostVotes = React.useCallback(async (postsList) => {
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
    }, [user]);

    // save tags for a member's profile (create profile row if missing)
    async function saveMemberTags(userId, tagsArray) {
      const tagsStr = (tagsArray || []).map(t => ('' + t).trim()).filter(Boolean).join(',');
      try {
        // Use upsert so we create the profile row if it doesn't exist or update existing row.
        // Upsert requires a primary key (profiles.id) and will insert or update accordingly.
        const { data, error } = await supabase.from('profiles').upsert([{ id: userId, tags: tagsStr }], { onConflict: 'id' }).select().single();
        if (error) {
          throw error;
        }
        // Also attempt to ensure these tag names exist in the org's tags table so post-tag picker and profile tags align.
        try {
          if (org && org.id && Array.isArray(tagsArray) && tagsArray.length > 0) {
            for (const name of tagsArray.map(t => ('' + t).trim()).filter(Boolean)) {
              try {
                // check if tag exists for this org
                const { data: found } = await supabase.from('tags').select('*').eq('organization_id', id).eq('name', name).limit(1).single();
                if (!found) {
                  // insert; if tags table doesn't exist this will throw and be caught below
                  const { data: createdTag, error: createErr } = await supabase.from('tags').insert([{ organization_id: id, name, created_by: user ? user.id : null }]).select().single();
                  if (!createErr && createdTag) {
                    setOrgTags(t => [createdTag].concat(t || []));
                  }
                }
              } catch (e) {
                // ignore errors (table may not exist or permission denied)
              }
            }
          }
        } catch (e) {
          // ignore
        }
        // update local selectedMember and membersList
        setSelectedMember(sm => sm && sm.user_id === userId ? ({ ...sm, profile: { ...(sm.profile || {}), tags: tagsStr } }) : sm);
        setMembersList(list => list.map(m => m.user_id === userId ? ({ ...m, profile: { ...(m.profile || {}), tags: tagsStr } }) : m));
        setMessage('Member tags updated');
      } catch (err) {
        setMessage('Error saving member tags: ' + (err.message || err));
      }
    }

    // fetch votes whenever posts or user change -- but only for posts the current user can see
    React.useEffect(() => {
      // determine visible posts for the current user
      const visible = (posts || []).filter(p => {
        // group-targeted posts
        const groupId = (p.metadata && p.metadata.group_id) || null;
        if (groupId) {
          if (!user) return false;
          if (user.email === org?.admin_email) return true;
          if (p.author_id && user.id === p.author_id) return true;
          const membersForGroup = groupMembersMap && groupMembersMap[groupId] ? groupMembersMap[groupId] : [];
          if (Array.isArray(membersForGroup) && membersForGroup.includes(user.id)) return true;
          const allowedUserIds = (p.metadata && p.metadata.allowed_user_ids) || null;
          if (Array.isArray(allowedUserIds) && allowedUserIds.includes(user.id)) return true;
          return false;
        }

        // explicit allowed_user_ids
        const allowedUserIds = (p.metadata && p.metadata.allowed_user_ids) || null;
        if (Array.isArray(allowedUserIds) && allowedUserIds.length > 0) {
          if (!user) return false;
          if (user.email === org?.admin_email) return true;
          if (p.author_id && user.id === p.author_id) return true;
          if (allowedUserIds.includes(user.id)) return true;
          return false;
        }

        const tags = (p.metadata && p.metadata.tags) || [];
        if (!tags || tags.length === 0) return true; // public post
        // org admin can see everything
        if (user && user.email === org?.admin_email) return true;
        // membership role match
        if (membership && membership.role && tags.includes(membership.role)) return true;
        // profile-level tag or role fields (allow comma-separated tags in profile.tags or a profile.role)
        if (currentProfile) {
          if (currentProfile.role && tags.includes(currentProfile.role)) return true;
          const profTags = (currentProfile.tags || currentProfile.interests || '');
          const profTagList = ('' + profTags).split(',').map(t => t.trim()).filter(Boolean);
          if (profTagList.some(t => tags.includes(t))) return true;
        }
        return false;
      });
      fetchAndSetPostVotes(visible);
  }, [posts, user, membership, currentProfile, org, fetchAndSetPostVotes, groupMembersMap]);

  // Fetch messages for an active chat group
  async function fetchGroupMessages(groupId) {
    if (!groupId) return setGroupMessages([]);
    try {
      const { data } = await supabase.from('group_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
      setGroupMessages(data || []);
    } catch (e) {
      // table may not exist or permission denied
      setGroupMessages([]);
    }
  }

  // Send a group chat message
  async function sendGroupMessage(groupId, text) {
    if (!groupId || !user || !text || text.trim().length === 0) return;
    try {
      const payload = { group_id: groupId, author_id: user.id, content: text.trim() };
      console.debug('[group chat] inserting message payload', payload);
      const { data, error } = await supabase.from('group_messages').insert([payload]).select().single();
      console.debug('[group chat] insert result', { data, error });
      if (error) return setMessage('Error sending message: ' + error.message);
      // optimistic append
      setGroupMessages(g => (g || []).concat([data]));
      setGroupMessageInput('');
    } catch (err) {
      setMessage('Could not send message: ' + (err.message || err));
    }
  }


  // subscribe to new group messages when chat is open
  React.useEffect(() => {
    if (!activeChatGroupId) return;
    let sub = null;
    try {
      // fetch initial messages
      fetchGroupMessages(activeChatGroupId);
      // subscribe to new inserts (debug: log subscription and incoming payloads)
      console.debug('[group chat] subscribing to realtime for group', activeChatGroupId);
      sub = supabase.from(`group_messages:group_id=eq.${activeChatGroupId}`).on('INSERT', payload => {
        console.debug('[group chat] realtime payload received', payload);
        if (payload && payload.new) setGroupMessages(g => (g || []).concat([payload.new]));
      }).subscribe();
      console.debug('[group chat] subscription object', sub);
    } catch (e) {
      // ignore
    }
    return () => {
      try {
        console.debug('[group chat] unsubscribing', activeChatGroupId, sub);
        if (sub && sub.unsubscribe) sub.unsubscribe();
      } catch (e) {}
    };
  }, [activeChatGroupId]);

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
      setMembership(data || null);
    })();
    }, [user, org, id]);

  // fetch Q&A for this org when organizer page is viewed or when Q&A tab becomes active
  React.useEffect(() => {
    if (!org) return;
    if (activeSection !== 'qa') return;
    let mounted = true;
    (async () => {
      setQaLoading(true);
      try {
        const { data } = await supabase.from('organization_questions').select('*').eq('organization_id', id).order('created_at', { ascending: false });
        if (!mounted) return;
        // split into top-level questions and replies (parent_id)
        const rows = data || [];
        const top = [];
        const map = {};
        (rows || []).forEach(r => {
          if (r.parent_id) {
            map[r.parent_id] = map[r.parent_id] || [];
            map[r.parent_id].push(r);
          } else {
            top.push(r);
          }
        });
        setQaList(top);
        setQaRepliesMap(map);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setQaLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [org, activeSection, id]);

  // Ensure missing member profiles are fetched (batch). This will populate membersList entries
  // so the UI shows names/emails instead of UUIDs when possible.
  React.useEffect(() => {
    async function fetchMissingProfiles() {
      try {
        const missing = (membersList || []).filter(m => !m.profile).map(m => m.user_id).filter(Boolean);
        if (!missing || missing.length === 0) return;
        // try profiles table first
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, username, email').in('id', missing);
        const profilesById = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
        const stillMissing = missing.filter(id => !profilesById[id]);
        let authUsersById = {};
        if (stillMissing.length > 0) {
          try {
            const { data: authUsers } = await supabase.from('auth.users').select('id, email, raw_user_meta_data, user_metadata').in('id', stillMissing);
            (authUsers || []).forEach(u => {
              let full_name = null, username = null;
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
              } catch (e) {}
              authUsersById[u.id] = { id: u.id, email: u.email || null, full_name: full_name || null, username: username || null };
            });
          } catch (e) {
            // auth.users may be restricted; ignore
          }
        }
        // merge into membersList
        setMembersList(list => (list || []).map(m => {
          if (m.profile) return m;
          const p = profilesById[m.user_id] || authUsersById[m.user_id] || null;
          return p ? ({ ...m, profile: p }) : m;
        }));
      } catch (err) {
        // ignore non-critical errors
      }
    }
    fetchMissingProfiles();
  }, [membersList]);

  // determine if current user is an org admin (either via membership.role or legacy org.admin_email)
  const isOrgAdmin = !!(user && ( (membership && membership.role === 'admin') || (org && user.email === org.admin_email) ));

  // When an organization chooses a "solid" homepage color (yellow variants),
  // set the document body background and toggle a helper class so the outer
  // When an organization picks a homepage color, apply it to the document
  // background and toggle a helper class so the outer page area can match
  // the org color. Run unconditionally (top-level) so hooks keep stable.
  React.useEffect(() => {
    // If no org or no color, ensure we remove the helper class and restore
    // any previous background value.
    if (!org || !org.homepage_color) {
      try { document.body.classList.remove('org-solid-bg'); } catch (e) {}
      return;
    }

    try {
      const c = (org.homepage_color || '').toString().trim();
      const prevBodyBg = document.body.style.background || '';
      // Apply the chosen color (solid). This intentionally uses a solid
      // fill so the outer page area matches the selected color exactly.
      document.body.style.background = c;
      document.body.classList.add('org-solid-bg');

      // Also force the top-level layout wrappers to be transparent so the
      // body background shows through immediately (some pages render a
      // wrapping .site-card from Layout that would otherwise obscure body).
      const appEl = document.querySelector('.app-container');
      const outerCard = appEl ? appEl.querySelector('.site-card') : document.querySelector('.site-card');
      const prevAppBg = appEl ? appEl.style.background || '' : null;
      const prevOuterCardBg = outerCard ? outerCard.style.background || '' : null;
      const prevOuterCardBorder = outerCard ? outerCard.style.border || '' : null;
      const prevOuterCardBoxShadow = outerCard ? outerCard.style.boxShadow || '' : null;
      try {
        if (appEl) appEl.style.background = 'transparent';
        if (outerCard) {
          outerCard.style.background = 'transparent';
          outerCard.style.border = 'none';
          outerCard.style.boxShadow = 'none';
        }
      } catch (e) {}

      return () => {
        // restore previous background and remove helper class on unmount
        try { document.body.style.background = prevBodyBg || ''; } catch (e) {}
        try { document.body.classList.remove('org-solid-bg'); } catch (e) {}
        try { if (appEl) appEl.style.background = prevAppBg || ''; } catch (e) {}
        try { if (outerCard) { outerCard.style.background = prevOuterCardBg || ''; outerCard.style.border = prevOuterCardBorder || ''; outerCard.style.boxShadow = prevOuterCardBoxShadow || ''; } } catch (e) {}
      };
    } catch (e) {
      // best-effort only
      try { document.body.classList.remove('org-solid-bg'); } catch (e) {}
    }
  }, [org]);

  // Apply organization-chosen text color to the CSS variable --text so the
  // UI uses the admin selected color. This runs unconditionally and restores
  // the previous value on cleanup.
  React.useEffect(() => {
    if (!org || !org.homepage_text_color) {
      // remove override if present
      try { document.documentElement.style.removeProperty('--text'); } catch (e) {}
      return;
    }
    try {
      const newText = (org.homepage_text_color || '').toString().trim();
      const prevText = getComputedStyle(document.documentElement).getPropertyValue('--text') || '';
      const prevMuted = getComputedStyle(document.documentElement).getPropertyValue('--muted') || '';
      // set both --text and --muted so UI elements that use var(--muted)
      // (category, email, secondary labels) also update to the chosen color
      document.documentElement.style.setProperty('--text', newText);
      document.documentElement.style.setProperty('--muted', newText);
      return () => {
        try {
          if (prevText && prevText.trim().length > 0) document.documentElement.style.setProperty('--text', prevText.trim());
          else document.documentElement.style.removeProperty('--text');
        } catch (e) {}
        try {
          if (prevMuted && prevMuted.trim().length > 0) document.documentElement.style.setProperty('--muted', prevMuted.trim());
          else document.documentElement.style.removeProperty('--muted');
        } catch (e) {}
      };
    } catch (e) {
      try { document.documentElement.style.removeProperty('--text'); } catch (e) {}
      try { document.documentElement.style.removeProperty('--muted'); } catch (e) {}
    }
  }, [org]);

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;
  if (!org) return <div style={{ padding: 32 }}>Organization not found. <button onClick={() => navigate('/home')}>Back</button></div>;

  // compute which posts are visible to the current user
  const visiblePosts = (posts || []).filter(p => {
    // If post targets a group, only allow if current user is in that group (or is org admin or author)
    const groupId = (p.metadata && p.metadata.group_id) || null;
    if (groupId) {
      if (!user) return false;
      if (isOrgAdmin) return true;
      if (p.author_id && user.id === p.author_id) return true;
      const membersForGroup = groupMembersMap && groupMembersMap[groupId] ? groupMembersMap[groupId] : [];
      if (Array.isArray(membersForGroup) && membersForGroup.includes(user.id)) return true;
      // if metadata.allowed_user_ids present, fall back to that
      const allowedUserIds = (p.metadata && p.metadata.allowed_user_ids) || null;
      if (Array.isArray(allowedUserIds) && allowedUserIds.length > 0) {
        if (allowedUserIds.includes(user.id)) return true;
      }
      return false;
    }

    // If post targets specific user IDs, only allow if current user is in the list or is the org admin or the author
    const allowedUserIds = (p.metadata && p.metadata.allowed_user_ids) || null;
    if (Array.isArray(allowedUserIds) && allowedUserIds.length > 0) {
      if (!user) return false;
      if (isOrgAdmin) return true;
      if (p.author_id && user.id === p.author_id) return true;
      if (allowedUserIds.includes(user.id)) return true;
      return false;
    }

    const tags = (p.metadata && p.metadata.tags) || [];
    if (!tags || tags.length === 0) return true;
  if (isOrgAdmin) return true;
    if (membership && membership.role && tags.includes(membership.role)) return true;
    if (currentProfile) {
      if (currentProfile.role && tags.includes(currentProfile.role)) return true;
      const profTags = (currentProfile.tags || currentProfile.interests || '');
      const profTagList = ('' + profTags).split(',').map(t => t.trim()).filter(Boolean);
      if (profTagList.some(t => tags.includes(t))) return true;
    }
    return false;
  });

  // compute which groups are visible to the current user: only org admin or invited members
  const visibleGroups = (groups || []).filter(g => {
    if (!user) return false; // anonymous users shouldn't see groups
    if (isOrgAdmin) return true; // admin sees all
    const members = (groupMembersMap && groupMembersMap[g.id]) || [];
    return Array.isArray(members) && members.includes(user.id);
  });

  // helper: tags for the currently selected member (safe array)
  const selectedMemberTags = (selectedMember && selectedMember.profile)
    ? ('' + (selectedMember.profile.tags || '')).split(',').map(t => t.trim()).filter(Boolean)
    : [];

  // helper: resolve a display name for a user id using several caches
  function displayNameForUser(userId) {
    if (!userId) return '';
    // group members profiles cache
    if (groupMemberProfiles && groupMemberProfiles[userId]) {
      const p = groupMemberProfiles[userId];
      return p.full_name || p.username || p.email || ('' + userId).slice(0, 8);
    }
    // membersList profiles
    const m = (membersList || []).find(x => x.user_id === userId);
    if (m && m.profile) return m.profile.full_name || m.profile.username || m.profile.email || ('' + userId).slice(0, 8);
    // currentProfile
    if (currentProfile && currentProfile.id === userId) return currentProfile.full_name || currentProfile.username || currentProfile.email || ('' + userId).slice(0, 8);
    // fallback to short id
    return ('' + userId).slice(0, 8);
  }


  // helper: convert hex color to rgba string
  function hexToRgba(hex, alpha) {
    if (!hex) return null;
    let h = hex.replace('#', '').trim();
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    const intVal = parseInt(h, 16);
    if (Number.isNaN(intVal)) return null;
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // promote / demote a member's role (admin can make other members admin)
  async function updateMemberRole(userId, newRole) {
    if (!isOrgAdmin) return setMessage('Only organization admins can change member roles');
    try {
      // optimistic update locally
      setMembersList(list => (list || []).map(m => m.user_id === userId ? ({ ...m, role: newRole }) : m));
      // try to persist to DB
      const { data, error } = await supabase.from('memberships').update({ role: newRole }).eq('organization_id', id).eq('user_id', userId).select().single();
      if (error) {
        setMessage('Error updating role: ' + error.message);
        return;
      }
      // reflect persisted value
      setMembersList(list => (list || []).map(m => m.user_id === userId ? ({ ...m, role: data.role || newRole }) : m));
      setMessage('Member role updated');
    } catch (err) {
      setMessage('Could not update role: ' + (err.message || err));
    }
  }

  // open confirmation modal for role change
  function requestRoleChange(userId, newRole, displayName) {
    setRoleChangeTarget(userId);
    setRoleChangeNewRole(newRole);
    setRoleChangeTargetName(displayName || 'member');
    setShowRoleConfirm(true);
  }

  // confirm the role change (called from confirmation modal)
  async function confirmRoleChange() {
    if (!roleChangeTarget || !roleChangeNewRole) {
      setShowRoleConfirm(false);
      return;
    }
    try {
      await updateMemberRole(roleChangeTarget, roleChangeNewRole);
    } catch (e) {
      // updateMemberRole reports errors via setMessage
    } finally {
      setShowRoleConfirm(false);
      setRoleChangeTarget(null);
      setRoleChangeNewRole(null);
      setRoleChangeTargetName('');
    }
  }

  // compute page background when org color provided
  // If admin chooses a bright 'yellow' color, make the whole page solid that color
  let pageBackground = undefined;
  let orgHomepageIsSolid = false;
  if (org && org.homepage_color) {
    const c = (org.homepage_color || '').toString().trim();
    const lower = c.toLowerCase();
    // treat a few common yellow representations as "make solid"
    const yellowValues = new Set(['#ffff00', '#ff0', 'yellow', '#ffd700']);
    if (yellowValues.has(lower)) {
      pageBackground = c;
      orgHomepageIsSolid = true;
    } else {
      pageBackground = `linear-gradient(180deg, ${hexToRgba(c, 0.12)}, ${hexToRgba(c, 0.06)})`;
    }
  }

  // (Effect moved earlier to run before any early returns.)

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.6 }}
      style={{ padding: 24, minHeight: '100vh', background: pageBackground }}
    >
      <motion.div 
        className="site-card"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.2, 0.9, 0.3, 1] }}
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: 20,
          borderTop: org && org.homepage_color ? `6px solid ${org.homepage_color}` : undefined,
          background: orgHomepageIsSolid ? 'transparent' : undefined
        }}
      >
        <motion.div 
          initial={{ y: 10, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{ display: 'flex', gap: 16, alignItems: 'center' }}
        >
          {org.logo_url ? (
            <motion.img 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              src={resolveStorageUrl(org.logo_url)} 
              alt="logo" 
              style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8 }} 
            />
          ) : (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="org-logo" 
            />
          )}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <motion.h1 
              style={{ margin: 0 }}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {org.name}
            </motion.h1>
            <motion.p 
              style={{ margin: '6px 0', color: 'var(--muted)' }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <b>Category:</b> {org.category}
            </motion.p>
            <motion.p 
              style={{ margin: '6px 0', color: 'var(--muted)' }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <b>Email:</b> {org.email}
            </motion.p>
          </motion.div>
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}
          />
        </motion.div>

  {org.cover_url ? (
          <motion.img 
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            src={resolveStorageUrl(org.cover_url)} 
            alt="cover" 
            style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, marginTop: 12 }} 
          />
        ) : null}

        <motion.section 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          style={{ marginTop: 16 }}
        >
          <motion.h3
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            About
          </motion.h3>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            {org.about || org.short_desc}
          </motion.p>
          {/* Admin color picker for homepage/accent color (per-organization) */}
          {isOrgAdmin && (
            <div style={{ marginTop: 12 }}>
              <strong>Homepage color</strong>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={(org && org.homepage_color) ? org.homepage_color : '#2563eb'} onChange={e => {
                  const newColor = e.target.value;
                  // optimistic update
                  setOrg(o => ({ ...(o || {}), homepage_color: newColor }));
                }} style={{ width: 48, height: 36, border: 'none', padding: 0, background: 'transparent' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13 }}>Text color</span>
                    <input type="color" value={(org && org.homepage_text_color) ? org.homepage_text_color : '#764E47'} onChange={e => {
                      const newText = e.target.value;
                      setOrg(o => ({ ...(o || {}), homepage_text_color: newText }));
                    }} style={{ width: 44, height: 32, border: 'none', padding: 0, background: 'transparent' }} />
                  </label>
                  <button className="btn btn-primary" onClick={async () => {
                    if (!org) return;
                    const newColor = org.homepage_color || '#2563eb';
                    const newText = org.homepage_text_color || '#764E47';
                    try {
                      const { data, error } = await supabase.from('organizations').update({ homepage_color: newColor, homepage_text_color: newText }).eq('id', org.id).select().single();
                      if (error) return setMessage('Could not save colors: ' + error.message);
                      setOrg(data);
                      setMessage('Saved homepage colors');
                    } catch (err) {
                      setMessage('Could not save colors: ' + (err.message || err));
                    }
                  }}>Save color</button>
                </div>
              </div>
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <strong>Members:</strong>
            {isOrgAdmin ? (
                <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => setShowMembersModal(true)} style={{ marginLeft: 12, padding: '6px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>{membersCount} members</button>
                  </div>
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
        </motion.section>

        {/* Horizontal tab bar */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          style={{ display: 'flex', gap: 8, marginTop: 16, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 8, alignItems: 'center' }}
        >
          {[
            { key: 'calendar', label: 'Calendar' },
            { key: 'members', label: 'Members' },
            { key: 'posts', label: 'Posts & Polls' },
            { key: 'qa', label: 'Q & A' },
            { key: 'admin', label: 'Admin' }
          ].map((t, index) => (
            <motion.button 
              key={t.key} 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveSection(t.key)} 
              style={{ 
                padding: '8px 14px', 
                borderRadius: 8, 
                border: 'none', 
                cursor: 'pointer', 
                background: activeSection === t.key ? '#2563eb' : 'transparent', 
                color: activeSection === t.key ? '#fff' : 'inherit', 
                fontWeight: activeSection === t.key ? 700 : 600 
              }}
            >
              {t.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Section: Calendar */}
        {activeSection === 'calendar' && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ marginTop: 16 }}
          >
            <h3>Calendar</h3>
            <Calendar events={events} />
            {/* Admin: Add Event (moved here from Admin tab) */}
            {isOrgAdmin && (
              <div style={{ marginTop: 12, border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
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
            )}
            <div style={{ marginTop: 8, fontSize: 13, color: '#444' }}>
              <div>Current user: <b>{user ? user.email : 'not signed in'}</b></div>
              <div>Organization admin: <b>{org.admin_email || 'none'}</b></div>
            </div>
          </motion.section>
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
                        <button onClick={() => handleSelectMember(m)} style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>{displayNameForUser(m.user_id)}</button>
                        <div style={{ fontSize: 12, color: '#666' }}>{m.profile ? (m.profile.email ? m.profile.email : `UUID: ${m.user_id}`) : `UUID: ${m.user_id}`}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 12, color: '#888' }}>{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : ''}</div>
                        {/* role badge */}
                        <div style={{ padding: '6px 8px', borderRadius: 12, background: m.role === 'admin' ? 'linear-gradient(90deg,var(--accent),var(--accent-2))' : 'rgba(255,255,255,0.02)', color: m.role === 'admin' ? '#fff' : 'var(--muted)', fontSize: 12, fontWeight: 700 }}>{m.role || 'member'}</div>
                        {/* Role changes are managed under the Admin section */}
                      </div>
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
                            <div style={{ fontWeight: 600 }}>{displayNameForUser(m.user_id)}</div>
                            <div style={{ fontSize: 12, color: '#666' }}>{m.profile ? (m.profile.email ? m.profile.email : `UUID: ${m.user_id}`) : `UUID: ${m.user_id}`}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 12, color: '#888' }}>{m.joined_at ? new Date(m.joined_at).toLocaleString() : ''}</div>
                            <div style={{ padding: '6px 8px', borderRadius: 12, background: m.role === 'admin' ? 'linear-gradient(90deg,var(--accent),var(--accent-2))' : 'rgba(255,255,255,0.02)', color: m.role === 'admin' ? '#fff' : 'var(--muted)', fontSize: 12, fontWeight: 700 }}>{m.role || 'member'}</div>
                            {/* Role changes are managed in the Admin section */}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}</div>
                </div>
              </div>
            )}

            {/* Targeted post modal (admin only) */}
            {showTargetedPostModal && isOrgAdmin && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="modal-card" style={{ width: 720, maxHeight: '80vh', overflowY: 'auto', borderRadius: 8, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Create targeted post</h3>
                    <button onClick={() => setShowTargetedPostModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
                  </div>
                  <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                    <div>
                      <strong>Choose members</strong>
                      <div style={{ marginTop: 8, maxHeight: 220, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
                        {membersList.length === 0 ? <div style={{ color: '#666' }}>No members</div> : (
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {membersList.map((m, i) => (
                              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px' }}>
                                <input type="checkbox" checked={targetedSelectedMemberIds.includes(m.user_id)} onChange={() => {
                                  setTargetedSelectedMemberIds(ids => ids.includes(m.user_id) ? ids.filter(id => id !== m.user_id) : ids.concat([m.user_id]));
                                }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600 }}>{m.profile ? (m.profile.username || m.profile.full_name || m.profile.email) : m.user_id}</div>
                                  <div style={{ fontSize: 12, color: '#666' }}>{m.profile ? (m.profile.email || '') : ''}</div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div>
                      <strong>Message</strong>
                      <textarea value={targetedPostContent} onChange={e => setTargetedPostContent(e.target.value)} placeholder="Write a message for selected members..." style={{ width: '100%', minHeight: 120, padding: 8, borderRadius: 8 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost" onClick={() => { setShowTargetedPostModal(false); }}>Cancel</button>
                      <button className="btn btn-primary" onClick={async () => {
                        if (!targetedPostContent || targetedPostContent.trim().length === 0) return setMessage('Write a message');
                        if (!targetedSelectedMemberIds || targetedSelectedMemberIds.length === 0) return setMessage('Select at least one member');
                        try {
                          const payload = { organization_id: id, author_id: user.id, content: targetedPostContent, metadata: { allowed_user_ids: targetedSelectedMemberIds } };
                          const { data: createdPost, error: postErr } = await supabase.from('posts').insert([payload]).select().single();
                          if (postErr) return setMessage('Error creating post: ' + postErr.message);
                          // refresh posts
                          const { data: postsData } = await supabase.from('posts').select('*').eq('organization_id', id).order('created_at', { ascending: false });
                          setPosts(postsData || []);
                          setMessage('Targeted post created');
                          setShowTargetedPostModal(false);
                          setTargetedPostContent('');
                          setTargetedSelectedMemberIds([]);
                        } catch (err) {
                          setMessage('Could not create targeted post: ' + (err.message || err));
                        }
                      }}>Post to members</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* Create group chat button (moved to top of Members section for admins) */}
              {isOrgAdmin && (
                <div style={{ marginTop: 18, marginBottom: 8 }}>
                  <button className="btn btn-primary" onClick={() => { setShowGroupModal(true); setGroupNameInput(''); setGroupSelectedMemberIds([]); }} style={{ padding: '8px 16px', borderRadius: 8 }}>
                    Create Group Chat
                  </button>
                </div>
              )}
              {/* Groups list (under Members section) */}
              {visibleGroups.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>Groups</h4>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {visibleGroups.map(g => (
                      <li key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f6f6f6' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{g.name}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>{((groupMembersMap[g.id] || []).length > 0) ? (groupMembersMap[g.id] || []).map(uid => displayNameForUser(uid)).filter(Boolean).join(', ') : 'No members'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {/* Chat button: only visible to admin or group members */}
                          {user && (
                            // only allow chat button for admin or for users present in the group's member map
                            ((isOrgAdmin) || (groupMembersMap[g.id] || []).includes(user.id)) ? (
                              <button className="btn btn-ghost" onClick={() => {
                                setActiveChatGroupId(g.id);
                                setShowGroupChatModal(true);
                              }}>Chat</button>
                            ) : null
                          )}
                          {isOrgAdmin && (
                            <>
                              <button className="btn btn-ghost" onClick={() => {
                                // allow admin to post to group (existing flow)
                                setPostingToGroupId(g.id);
                                setShowGroupPostModal(true);
                              }}>Post</button>
                              <button className="btn btn-ghost" onClick={() => {
                                setAddMembersGroupId(g.id);
                                setAddMemberEmail('');
                                setAddMemberMessage('');
                                setShowAddMembersModal(true);
                              }}>Add</button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Group chat modal */}
              {showGroupChatModal && activeChatGroupId && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="modal-card" style={{ width: 720, height: '70vh', overflow: 'hidden', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0 }}>{(groups || []).find(x => x.id === activeChatGroupId)?.name || 'Group chat'}</h3>
                      <button onClick={() => { setShowGroupChatModal(false); setActiveChatGroupId(null); setGroupMessages([]); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
                    </div>
                    <div style={{ marginTop: 12, flex: 1, overflowY: 'auto', border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                        {(groupMessages || []).length === 0 ? <div style={{ color: '#666' }}>No messages</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(groupMessages || []).map(m => (
                          <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 18, background: '#e6e6e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{(displayNameForUser(m.author_id) || '').slice(0,2)}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{displayNameForUser(m.author_id)}</div>
                              <div style={{ fontSize: 14, marginTop: 4 }}>{m.content}</div>
                              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</div>
                            </div>
                          </div>
                        ))}
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input placeholder="Write a message..." value={groupMessageInput} onChange={e => setGroupMessageInput(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8 }} />
                      <button className="btn btn-primary" onClick={async () => {
                        if (!groupMessageInput || groupMessageInput.trim().length === 0) return;
                        // only allow members or admin to send
                          const allowed = user && (isOrgAdmin || (groupMembersMap[activeChatGroupId] || []).includes(user.id));
                        if (!allowed) return setMessage('You are not allowed to send messages to this group');
                        await sendGroupMessage(activeChatGroupId, groupMessageInput);
                      }}>Send</button>
                    </div>
                  </div>
                </div>
              )}
              {/* Group creation modal (admin only) */}
              {showGroupModal && isOrgAdmin && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="modal-card" style={{ width: 720, maxHeight: '80vh', overflowY: 'auto', borderRadius: 8, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0 }}>Create member group</h3>
                      <button onClick={() => setShowGroupModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
                    </div>
                    <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                      <div>
                        <strong>Group name</strong>
                        <input placeholder="Name (e.g. Volunteers 2025)" value={groupNameInput} onChange={e => setGroupNameInput(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 8 }} />
                      </div>
                      <div>
                        <strong>Choose members</strong>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 6 }}>
                          <input placeholder="Enter member email (e.g. name@gmail.com)" value={emailSearch} onChange={e => setEmailSearch(e.target.value)} style={{ padding: 8, borderRadius: 6, flex: 1 }} />
                          <button className="btn btn-ghost" onClick={() => addMemberByEmail(emailSearch)}>{emailSearchLoading ? 'Adding...' : 'Add by email'}</button>
                        </div>
                        {emailSearchMessage ? <div style={{ fontSize: 12, color: emailSearchMessage.startsWith('Error') ? 'red' : 'green', marginBottom: 8 }}>{emailSearchMessage}</div> : null}
                        <div style={{ marginTop: 8, maxHeight: 260, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
                          {membersList.length === 0 ? <div style={{ color: '#666' }}>No members</div> : (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                              {membersList.map((m, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px' }}>
                                  <input type="checkbox" checked={groupSelectedMemberIds.includes(m.user_id)} onChange={() => {
                                    setGroupSelectedMemberIds(ids => ids.includes(m.user_id) ? ids.filter(id => id !== m.user_id) : ids.concat([m.user_id]));
                                  }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{m.profile ? (m.profile.username || m.profile.full_name || m.profile.email) : m.user_id}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>{m.profile ? (m.profile.email || '') : ''}</div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={() => setShowGroupModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={async () => {
                          if (!groupNameInput || groupNameInput.trim().length === 0) return setMessage('Enter group name');
                          if (!groupSelectedMemberIds || groupSelectedMemberIds.length === 0) return setMessage('Select at least one member');
                          try {
                            // insert group
                            const payload = { organization_id: id, name: groupNameInput.trim(), created_by: user.id };
                            const { data: created, error: createErr } = await supabase.from('target_groups').insert([payload]).select().single();
                            if (createErr) {
                              // try to proceed even if no table
                              throw createErr;
                            }
                            const groupId = created.id;
                            // insert members
                            const mappings = groupSelectedMemberIds.map(uid => ({ group_id: groupId, user_id: uid, added_by: user.id }));
                            try {
                              const { data: inserted, error: insertErr } = await supabase.from('target_group_members').insert(mappings).select();
                              if (insertErr) {
                                // table exists but insertion failed (likely RLS/permission) — notify admin
                                setMessage('Group created but saving members failed: ' + insertErr.message + '. Members may not be preserved after reload.');
                              } else {
                                setMessage('Group created');
                              }
                            } catch (e) {
                              // ignore low-level errors but show a hint
                              setMessage('Group created but saving members encountered an error. Check DB policies or run migrations.');
                            }
                            // update local state regardless so admin sees immediate members in UI until reload
                            setGroups(g => [created].concat(g || []));
                            setGroupMembersMap(m => ({ ...(m || {}), [groupId]: groupSelectedMemberIds }));
                            // fetch profiles for newly added members so names display immediately (best-effort)
                            try {
                              const allUserIds = Array.from(new Set((groupSelectedMemberIds || []).filter(Boolean)));
                              if (allUserIds.length > 0) {
                                const { data: profiles } = await supabase.from('profiles').select('id, full_name, username, email').in('id', allUserIds);
                                const profMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
                                setGroupMemberProfiles(prev => ({ ...(prev || {}), ...profMap }));
                              }
                            } catch (e) {
                              // ignore - table may not exist or permission denied
                            }
                            setShowGroupModal(false);
                            setGroupNameInput('');
                            setGroupSelectedMemberIds([]);
                            // open group post modal to allow immediate posting
                            setPostingToGroupId(groupId);
                            setGroupPostContent('');
                            setShowGroupPostModal(true);
                          } catch (err) {
                            setMessage('Could not create group: ' + (err.message || err));
                          }
                        }}>Create & Post</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Group post modal (admin, after create or from group list) */}
              {showGroupPostModal && isOrgAdmin && postingToGroupId && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1460, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="modal-card" style={{ width: 720, maxHeight: '80vh', overflowY: 'auto', borderRadius: 8, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0 }}>Post to group</h3>
                      <button onClick={() => { setShowGroupPostModal(false); setPostingToGroupId(null); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
                    </div>
                    <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                      <div><strong>Group:</strong> {(groups || []).find(g => g.id === postingToGroupId)?.name || 'Group'}</div>
                      <div>
                        <strong>Message</strong>
                        <textarea value={groupPostContent} onChange={e => setGroupPostContent(e.target.value)} placeholder="Write a message for the group..." style={{ width: '100%', minHeight: 140, padding: 8, borderRadius: 8 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={() => { setShowGroupPostModal(false); setPostingToGroupId(null); }}>Cancel</button>
                        <button className="btn btn-primary" onClick={async () => {
                          if (!groupPostContent || groupPostContent.trim().length === 0) return setMessage('Write a message');
                          try {
                            // try to get group members list
                            const membersForGroup = groupMembersMap[postingToGroupId] || [];
                            const metadata = { group_id: postingToGroupId };
                            const payload = { organization_id: id, author_id: user.id, content: groupPostContent, metadata };
                            const { data: createdPost, error: postErr } = await supabase.from('posts').insert([payload]).select().single();
                            if (postErr) return setMessage('Could not create post: ' + postErr.message);
                            // optionally, also set allowed_user_ids (for DBs that expect that) — best-effort if posts table supports json
                            try {
                              const allowed = membersForGroup && membersForGroup.length > 0 ? membersForGroup : null;
                              if (allowed && allowed.length > 0) {
                                await supabase.from('posts').update({ metadata: { ...createdPost.metadata, allowed_user_ids: allowed, group_id: postingToGroupId } }).eq('id', createdPost.id);
                              }
                            } catch (e) {
                              // ignore
                            }
                            // refresh posts
                            const { data: postsData } = await supabase.from('posts').select('*').eq('organization_id', id).order('created_at', { ascending: false });
                            setPosts(postsData || []);
                            setShowGroupPostModal(false);
                            setPostingToGroupId(null);
                            setGroupPostContent('');
                            setMessage('Posted to group');
                          } catch (err) {
                            setMessage('Error posting to group: ' + (err.message || err));
                          }
                        }}>Post</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            {/* Member detail modal (admin only) */}
            {selectedMember && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="modal-card modal-large">
                  <div className="modal-header">
                    <div style={{ flex: 1 }}>
                      <div className="modal-title">{selectedMember.profile ? (selectedMember.profile.full_name || selectedMember.profile.username) : 'Member'}</div>
                      <div className="modal-sub">{selectedMember.profile?.email || ''}</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <button onClick={() => setSelectedMember(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
                    </div>
                  </div>

                  <div className="modal-grid">
                    <div className="modal-left">
                      <div className="modal-field"><strong>UUID:</strong><div style={{ marginTop:6 }}>{selectedMember.user_id}</div></div>
                      <div className="modal-field"><strong>Interests:</strong><div style={{ marginTop:6 }}>{selectedMember.profile ? selectedMember.profile.interests || '-' : '-'}</div></div>
                      <div className="modal-field"><strong>Skills:</strong><div style={{ marginTop:6 }}>{selectedMember.profile ? selectedMember.profile.skills || '-' : '-'}</div></div>
                      <div className="modal-field"><strong>Certifications:</strong><div style={{ marginTop:6 }}>{selectedMember.profile ? selectedMember.profile.certifications || '-' : '-'}</div></div>
                      <div className="modal-field"><strong>School / Grade:</strong><div style={{ marginTop:6 }}>{selectedMember.profile ? ((selectedMember.profile.school || '') + (selectedMember.profile.grade ? (' • ' + selectedMember.profile.grade) : '')) : '-'}</div></div>
                      <div className="modal-field"><strong>Bio:</strong>
                        <div className="modal-bio">{selectedMember.profile ? selectedMember.profile.bio || 'No bio provided' : 'No profile information'}</div>
                      </div>
                    </div>

                    <div className="modal-right">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="stat-badge">{selectedMember.joined_at ? new Date(selectedMember.joined_at).toLocaleString() : 'Joined: -'}</div>
                        <div style={{ marginLeft: 8 }} className="stat-badge">{selectedMember.role || 'member'}</div>
                      </div>

                      {/* Tags removed per user request */}

                      {isOrgAdmin && (
                        <div style={{ marginTop: 18 }}>
                          <strong>Award Points</strong>
                          <div className="award-row">
                            <input type="number" placeholder="Points" value={award.points} onChange={e => setAward(a => ({ ...a, points: Number(e.target.value) }))} />
                            <input type="text" placeholder="Reason" value={award.reason} onChange={e => setAward(a => ({ ...a, reason: e.target.value }))} />
                            <button className="btn btn-primary" onClick={async () => {
                              if (!award.points) return setMessage('Provide points');
                              const payload = { user_id: selectedMember.user_id, organization_id: id, points: award.points, reason: award.reason, awarded_by: user.id };
                              try {
                                const { error } = await supabase.from('user_points').insert([payload]);
                                if (error) return setMessage('Error awarding points: ' + error.message);
                                setAward(a => ({ ...a, points: 0, reason: '' }));
                                setMessage('Points awarded to member');
                                setSelectedMember(null);
                              } catch (err) {
                                setMessage('Error awarding points: ' + (err.message || err));
                              }
                            }}>Award</button>
                          </div>

                          <button className="btn btn-ghost prepare-cert" onClick={async () => {
                            try {
                              if (selectedMember) {
                                let email = selectedMember.profile?.email || '';
                                let name = selectedMember.profile ? (selectedMember.profile.full_name || selectedMember.profile.username) : '';
                                if (!email) {
                                  try {
                                    const { data: profileData, error } = await supabase.from('profiles').select('email, full_name, username').eq('id', selectedMember.user_id).single();
                                    if (!error && profileData) {
                                      email = profileData.email || '';
                                      name = profileData.full_name || profileData.username || name;
                                    }
                                  } catch (e) {}
                                }
                                if (!email) {
                                  try {
                                    const { data: authUser, error: authErr } = await supabase.from('auth.users').select('email').eq('id', selectedMember.user_id).single();
                                    if (!authErr && authUser && authUser.email) {
                                      email = authUser.email;
                                    } else {
                                      setCertMessage('Email not found in profiles; auth.users is restricted. Please enter email manually or sync profiles.');
                                    }
                                  } catch (e) {
                                    console.warn('fetching auth.users failed', e);
                                    setCertMessage('Unable to read auth.users from the client (permission denied). To auto-fill emails, either copy auth emails into `profiles` or use a server-side admin endpoint.');
                                  }
                                }
                                setCertificate(c => ({ ...c, user_id: selectedMember.user_id, email, name }));
                              }
                            } catch (e) {
                            } finally {
                              setActiveSection('admin');
                              setShowMembersModal(false);
                              setSelectedMember(null);
                            }
                          }}>Prepare Certificate</button>
                        </div>
                      )}
                    </div>
                  </div>
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
            {isOrgAdmin && (
              <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea placeholder="Write an announcement or question..." value={postContent} onChange={e => setPostContent(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 6 }} />
                </div>
                {/* ...existing code... (removed tag selection UI) */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={isPoll} onChange={e => setIsPoll(e.target.checked)} /> Poll
                  </label>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => { setPostContent(''); setIsPoll(false); setPollOptions(['','']); }}>Reset</button>
                    <button className="btn btn-primary" onClick={async () => {
                      if (!postContent && !isPoll) return setMessage('Write something first');
                      try {
                        const tags = (selectedTags || []).map(t => ('' + t).trim()).filter(Boolean);
                        const metadata = tags.length > 0 ? { tags } : null;
                        const payload = { organization_id: id, author_id: user.id, content: postContent, is_poll: isPoll, options: isPoll ? pollOptions.filter(Boolean) : null, metadata };
                        // insert post and return created row
                        const { data: createdPosts, error: postErr } = await supabase.from('posts').insert([payload]).select().single();
                        if (postErr) return setMessage('Error creating post: ' + postErr.message);
                        const createdPost = createdPosts;
                        // ensure tags exist in tags table and create post_tags mappings if table exists
                        try {
                          const tagIds = [];
                          for (const name of tags) {
                            // try find
                            const { data: found } = await supabase.from('tags').select('*').eq('organization_id', id).eq('name', name).limit(1).single();
                            let tagRow = found;
                            if (!tagRow) {
                              const { data: createdTag } = await supabase.from('tags').insert([{ organization_id: id, name, created_by: user ? user.id : null }]).select().single();
                              tagRow = createdTag || null;
                              if (tagRow) setOrgTags(t => [tagRow].concat(t || []));
                            }
                            if (tagRow && tagRow.id) tagIds.push(tagRow.id);
                          }
                          if (tagIds.length > 0) {
                            // insert post_tags rows
                            try {
                              const mappings = tagIds.map(tid => ({ post_id: createdPost.id, tag_id: tid }));
                              await supabase.from('post_tags').insert(mappings);
                            } catch (e) {
                              // ignore if post_tags table doesn't exist
                            }
                          }
                        } catch (e) {
                          // ignore errors if tags/post_tags tables don't exist
                        }

                        setPostContent(''); setIsPoll(false); setPollOptions(['','']); setSelectedTags([]); setNewTagName('');
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
            {(!user || !isMember) && !isOrgAdmin ? (
              <p style={{ color: '#666' }}>Follow the organization to see posts and polls.</p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {visiblePosts.length === 0 ? <p style={{ color: '#666' }}>No posts yet</p> : visiblePosts.map(p => (
                  <div key={p.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700 }}>{p.content}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</div>
                    </div>
                    {/* Show tags (if any) for this post */}
                    {p.metadata && Array.isArray(p.metadata.tags) && p.metadata.tags.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {p.metadata.tags.map((t, idx) => (
                          <span key={idx} style={{ padding: '6px 10px', borderRadius: 20, background: '#f3f4f6', fontSize: 12 }}>{t}</span>
                        ))}
                      </div>
                    )}
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
            {isOrgAdmin ? (
              <div style={{ display: 'grid', gap: 12 }}>
                

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
                          // Prefer server-side API (service account) to avoid prompting admins for Google OAuth
                          const apiBase = process.env.REACT_APP_API_URL || '';
                          const apiSecret = process.env.REACT_APP_ADMIN_SECRET || '';
                          if (apiBase && apiSecret) {
                            try {
                              const url = apiBase.replace(/\/$/, '') + '/api/certificates';
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
                              const res = await fetch(url, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'x-admin-secret': apiSecret
                                },
                                body: JSON.stringify(payload)
                              });
                              if (!res.ok) {
                                const text = await res.text().catch(() => '');
                                setCertMessage('Server error saving certificate: ' + res.status + ' ' + text);
                                setCertLoading(false);
                                return;
                              }
                              setCertMessage('Saved to Google Sheet (queued via server).');
                              setCertLoading(false);
                              return;
                            } catch (err) {
                              console.error('Error posting to server certificate endpoint', err);
                              setCertMessage('Network error posting to server: ' + (err.message || err));
                              setCertLoading(false);
                              return;
                            }
                          }

                          const appsUrl = process.env.REACT_APP_APPS_SCRIPT_URL || '';
                          const appsSecret = process.env.REACT_APP_APPS_SCRIPT_SECRET || '';
                          console.log('Using Apps Script URL:', appsUrl);
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

                          // Client-side Google Sheets flow (OAuth)
                          const sheetId = process.env.REACT_APP_GOOGLE_SHEET_ID || '';
                          const sheetName = process.env.REACT_APP_GOOGLE_SHEET_NAME || 'certificates';
                          const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

                          // Clearer missing env var messages (expect REACT_APP_ prefixed vars)
                          const missing = [];
                          if (!sheetId) missing.push('REACT_APP_GOOGLE_SHEET_ID');
                          if (!clientId) missing.push('REACT_APP_GOOGLE_CLIENT_ID');
                          if (missing.length > 0) {
                            setCertMessage('Google Sheets client not configured. Missing env vars: ' + missing.join(', ') + '. Alternatively set REACT_APP_APPS_SCRIPT_URL to post to an Apps Script webhook.');
                            console.warn('Google Sheets certificate flow blocked - missing env vars:', missing);
                            setCertLoading(false);
                            return;
                          }

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

                          try {
                            // initialize client, request token and append row
                            await initGoogleSheetsClient(clientId);
                            await requestAccessToken();
                            await appendRow(sheetId, sheetName, row);
                            setCertMessage('Saved to Google Sheet (pending).');
                          } catch (err) {
                            console.error('Google Sheets append error', err);
                            setCertMessage('Error saving to Google Sheet: ' + (err && err.message ? err.message : String(err)));
                          } finally {
                            setCertLoading(false);
                          }
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
                
                {/* Manage member roles (only in Admin section) */}
                <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                  <h4 style={{ marginTop: 0 }}>Manage member roles</h4>
                  <div style={{ marginTop: 8 }}>
                    {membersList.length === 0 ? (
                      <p>No members</p>
                    ) : (
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {membersList.map((m, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f6f6f6' }}>
                            <div>
                              <div style={{ fontWeight: 700 }}>{displayNameForUser(m.user_id)}</div>
                              <div style={{ fontSize: 12, color: '#666' }}>{m.profile ? (m.profile.email || '') : m.user_id}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <div style={{ padding: '6px 8px', borderRadius: 12, background: m.role === 'admin' ? 'linear-gradient(90deg,var(--accent),var(--accent-2))' : 'rgba(255,255,255,0.02)', color: m.role === 'admin' ? '#fff' : 'var(--muted)', fontSize: 12, fontWeight: 700 }}>{m.role || 'member'}</div>
                              {user && isOrgAdmin && user.id !== m.user_id && (
                                <div>
                                  {m.role === 'admin' ? (
                                    <button className="btn btn-ghost" onClick={() => requestRoleChange(m.user_id, 'member', displayNameForUser(m.user_id))}>Revoke Admin</button>
                                  ) : (
                                    <button className="btn btn-primary" onClick={() => requestRoleChange(m.user_id, 'admin', displayNameForUser(m.user_id))}>Make Admin</button>
                                  )}
                                </div>
                              )}
                            </div>
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

        {/* Section: Q & A */}
        {activeSection === 'qa' && (
          <section style={{ marginTop: 16 }}>
            <h3>Q & A</h3>
            <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea placeholder="Ask a question to the club..." value={newQuestion} onChange={e => setNewQuestion(e.target.value)} style={{ minHeight: 80, padding: 8, borderRadius: 6 }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => setNewQuestion('')}>Reset</button>
                  <button className="btn btn-primary" onClick={async () => {
                    setQaMessage('');
                    if (!newQuestion || newQuestion.trim().length === 0) return setQaMessage('Write a question first');
                    try {
                      setQaLoading(true);
                      const payload = { organization_id: id, author_id: user ? user.id : null, content: newQuestion.trim() };
                      const { data, error } = await supabase.from('organization_questions').insert([payload]).select().single();
                      if (error) return setQaMessage('Error posting question: ' + error.message);
                      setNewQuestion('');
                      // prepend to local list
                      setQaList(q => [data].concat(q || []));
                      setQaMessage('Question posted');
                      setTimeout(() => setQaMessage(''), 2500);
                    } catch (err) {
                      setQaMessage('Could not post question: ' + (err.message || err));
                    } finally {
                      setQaLoading(false);
                    }
                  }}>{qaLoading ? 'Posting...' : 'Post question'}</button>
                </div>
                {qaMessage ? <div style={{ color: qaMessage.startsWith('Error') ? 'red' : 'green' }}>{qaMessage}</div> : null}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {qaList.length === 0 ? <p style={{ color: '#666' }}>No questions yet</p> : qaList.map(q => (
                <div key={q.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontWeight: 700 }}>{q.content}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{q.created_at ? new Date(q.created_at).toLocaleString() : ''}</div>
                  </div>
                  <div style={{ marginTop: 8, color: '#666' }}>Asked by: <b>{q.author_id ? displayNameForUser(q.author_id) : 'Anonymous'}</b></div>
                  {q.answer ? (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#fbfbfb' }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Answer</div>
                      <div style={{ marginTop: 8 }}>{q.answer}</div>
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>Answered by: <b>{q.answered_by ? displayNameForUser(q.answered_by) : '—'}</b> {q.answered_at ? ` • ${new Date(q.answered_at).toLocaleString()}` : ''}</div>
                    </div>
                  ) : (
                    isOrgAdmin ? (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input placeholder="Write an answer..." value={answerDrafts[q.id] || ''} onChange={e => setAnswerDrafts(ad => ({ ...(ad||{}), [q.id]: e.target.value }))} style={{ flex: 1, padding: 8, borderRadius: 6 }} />
                        <button className="btn btn-primary" onClick={async () => {
                          const ans = (answerDrafts[q.id] || '').trim();
                          if (!ans) return setQaMessage('Write an answer first');
                          try {
                            setQaLoading(true);
                            const payload = { answer: ans, answered_by: user ? user.id : null, answered_at: new Date().toISOString() };
                            const { data, error } = await supabase.from('organization_questions').update(payload).eq('id', q.id).select().single();
                            if (error) return setQaMessage('Error saving answer: ' + error.message);
                            // update local list
                            setQaList(list => (list || []).map(item => item.id === q.id ? data : item));
                            setAnswerDrafts(ad => { const copy = { ...(ad||{}) }; delete copy[q.id]; return copy; });
                            setQaMessage('Answer saved');
                            setTimeout(() => setQaMessage(''), 2500);
                          } catch (err) {
                            setQaMessage('Could not save answer: ' + (err.message || err));
                          } finally {
                            setQaLoading(false);
                          }
                        }}>Answer</button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 12, color: '#999' }}>Not answered yet.</div>
                    )
                  )}
                </div>
              ))}
            </div>
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

          {/* Add members to existing group modal (admin) */}
          {/* Confirmation modal for role changes */}
          {showRoleConfirm && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="modal-card" style={{ width: 480, borderRadius: 8, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Confirm role change</h3>
                  <button onClick={() => setShowRoleConfirm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
                </div>
                <div style={{ marginTop: 12 }}>
                  <p>Are you sure you want to <strong>{roleChangeNewRole === 'admin' ? 'make' : 'revoke'} admin</strong> for <strong>{roleChangeTargetName || roleChangeTarget}</strong>?</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                    <button className="btn btn-ghost" onClick={() => setShowRoleConfirm(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={confirmRoleChange}>{roleChangeNewRole === 'admin' ? 'Make Admin' : 'Revoke Admin'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showAddMembersModal && addMembersGroupId && isOrgAdmin && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="modal-card" style={{ width: 560, maxHeight: '70vh', overflowY: 'auto', borderRadius: 8, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Add members to {(groups || []).find(x => x.id === addMembersGroupId)?.name || 'Group'}</h3>
                  <button onClick={() => { setShowAddMembersModal(false); setAddMembersGroupId(null); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
                </div>
                <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                  <div>
                    <input placeholder="Member email to add" value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => { setShowAddMembersModal(false); setAddMembersGroupId(null); }}>Cancel</button>
                    <button className="btn btn-primary" onClick={async () => {
                      const email = (addMemberEmail || '').trim();
                      if (!email) return setAddMemberMessage('Enter an email');
                      setAddMemberMessage('');
                      setAddMemberLoading(true);
                      try {
                        // lookup profile by email
                        let profile = null;
                        try {
                          const { data: p, error: perr } = await supabase.from('profiles').select('id, email, full_name, username').eq('email', email).limit(1).single();
                          if (!perr && p) profile = p;
                        } catch (e) {}
                        if (!profile) {
                          try {
                            const { data: au, error: aerr } = await supabase.from('auth.users').select('id, email, raw_user_meta_data, user_metadata').eq('email', email).limit(1).single();
                            if (!aerr && au) {
                              const u = au; let full_name = null, username = null;
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
                              } catch (e) {}
                              try {
                                const { data: up, error: uerr } = await supabase.from('profiles').upsert([{ id: u.id, email: u.email, full_name: full_name || null, username: username || null }], { onConflict: 'id' }).select().single();
                                if (!uerr && up) profile = up; else profile = { id: u.id, email: u.email, full_name: full_name || null, username: username || null };
                              } catch (e) {
                                profile = { id: u.id, email: u.email, full_name: full_name || null, username: username || null };
                              }
                            }
                          } catch (e) {}
                        }
                        if (!profile || !profile.id) {
                          setAddMemberMessage('No user found with that email');
                          setAddMemberLoading(false);
                          return;
                        }
                        // insert into target_group_members
                        try {
                          const { data: ins, error: insertErr } = await supabase.from('target_group_members').insert([{ group_id: addMembersGroupId, user_id: profile.id, added_by: user.id }]);
                          if (insertErr) {
                            // may be RLS/permission; still update local state optimistically
                            setAddMemberMessage('Member added locally, but DB insert failed: ' + insertErr.message);
                          } else {
                            setAddMemberMessage('Member added to group');
                          }
                        } catch (e) {
                          setAddMemberMessage('Error adding member: ' + (e.message || e));
                        }
                        // update local caches so UI reflects change immediately
                        setGroupMembersMap(m => {
                          const cur = (m || {})[addMembersGroupId] || [];
                          const next = cur.includes(profile.id) ? cur : cur.concat([profile.id]);
                          return { ...(m || {}), [addMembersGroupId]: next };
                        });
                        setGroupMemberProfiles(p => ({ ...(p || {}), [profile.id]: profile }));
                        // also ensure membersList has the profile for display in modal/list
                        setMembersList(list => {
                          if ((list || []).some(x => x.user_id === profile.id)) return list;
                          return (list || []).concat([{ user_id: profile.id, joined_at: null, role: 'member', profile }]);
                        });
                        setAddMemberEmail('');
                      } catch (err) {
                        setAddMemberMessage('Unexpected error: ' + (err.message || err));
                      } finally {
                        setAddMemberLoading(false);
                      }
                    }}>{addMemberLoading ? 'Adding...' : 'Add'}</button>
                  </div>
                  {addMemberMessage ? <div style={{ fontSize: 13, color: addMemberMessage.startsWith('Error') || addMemberMessage.includes('failed') ? 'red' : 'green' }}>{addMemberMessage}</div> : null}
                </div>
              </div>
            </div>
          )}

        
      </motion.div>
    </motion.div>
  );
}
