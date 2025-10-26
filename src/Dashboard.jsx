import React from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import Calendar from './Calendar';
import EventDetail from './EventDetail';

export default function Dashboard() {
  const [user, setUser] = React.useState(null);
  const [totalPoints, setTotalPoints] = React.useState(0);
  const [breakdown, setBreakdown] = React.useState({});
  const [orgsJoined, setOrgsJoined] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [events, setEvents] = React.useState([]);
  const [upcoming, setUpcoming] = React.useState([]);
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    supabase.auth.getUser().then(res => {
      if (res && res.data && res.data.user) setUser(res.data.user);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      // Sum points only for current user
      const { data, error } = await supabase.from('user_points').select('organization_id, points').eq('user_id', user.id);
      if (error) {
        setTotalPoints(0);
        return;
      }
      const total = (data || []).reduce((s, r) => s + (r.points || 0), 0);
      setTotalPoints(total);
      // breakdown per organization
      const byOrg = {};
      (data || []).forEach(r => {
        const oid = r.organization_id || 'unknown';
        byOrg[oid] = (byOrg[oid] || 0) + (r.points || 0);
      });
      setBreakdown(byOrg);
    })();
        // fetch user's followed organizations (memberships) and their events
    (async () => {
      try {
        const { data: memberships } = await supabase.from('memberships').select('organization_id').eq('user_id', user.id);
        setOrgsJoined((memberships || []).length);
        const orgIds = (memberships || []).map(m => m.organization_id).filter(Boolean);
        if (orgIds.length === 0) {
          setEvents([]);
          setUpcoming([]);
          return;
        }
        const { data: evData } = await supabase.from('events').select('id, organization_id, title, date, description').in('organization_id', orgIds);
        const eventsList = (evData || []).map(ev => ({ ...ev, date: ev.date }));
        // enrich with organization names
        const { data: orgs } = await supabase.from('organizations').select('id, name').in('id', orgIds);
        const orgById = (orgs || []).reduce((acc, o) => { acc[o.id] = o.name; return acc; }, {});
        const enriched = eventsList.map(ev => ({ ...ev, organization_name: orgById[ev.organization_id] || String(ev.organization_id) }));
        setEvents(enriched);
        // upcoming: next 10 upcoming events sorted
        const upcomingList = enriched.filter(e => e.date).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0,10);
        setUpcoming(upcomingList);
      } catch (err) {
        console.error('Failed loading events for dashboard', err);
      }
    })();
    // removed global leaderboard; keep dashboard focused on calendar and upcoming events
  }, [user]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!user) return <div style={{ padding: 24 }}>Not signed in. <button onClick={() => navigate('/login')}>Login</button></div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div className="site-card" style={{ flex: 1, textAlign: 'center' }}>
            <div className="muted">Total Points</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{totalPoints}</div>
          </div>
          <div className="site-card" style={{ width: 200, textAlign: 'center' }}>
            <div className="muted">Orgs Joined</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{orgsJoined}</div>
          </div>
          <div className="site-card" style={{ width: 200, textAlign: 'center' }}>
            <div className="muted">Upcoming</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{upcoming.length}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 12 }}>
          <div className="site-card">
            <h3 style={{ marginTop: 0 }}>Calendar</h3>
            <Calendar events={events} onEventClick={ev => setSelectedEvent(ev)} />
          </div>
          <div className="site-card">
            <h4 style={{ marginTop: 0 }}>Upcoming Events</h4>
            {upcoming.length === 0 ? <div className="muted">No upcoming events from followed clubs.</div> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {upcoming.map(ev => (
                  <li key={ev.id} style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{ev.title}</div>
                        <div className="muted">{ev.organization_name} • {new Date(ev.date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <button className="btn btn-ghost" onClick={() => setSelectedEvent(ev)}>View</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {selectedEvent && <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      </div>
    </div>
  );
}
