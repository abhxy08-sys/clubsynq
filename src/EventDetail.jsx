import React from 'react';

export default function EventDetail({ event, onClose }) {
  if (!event) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400 }}>
      <div className="site-card" style={{ width: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{event.title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20 }} aria-label="close">&times;</button>
        </div>
        <p style={{ color: 'var(--muted)' }}><strong>Organization:</strong> {event.organization_name || event.organization_id}</p>
  <p><strong>Date:</strong> {event.date ? new Date(event.date).toLocaleString() : 'TBD'}</p>
  {event.description && <p>{event.description}</p>}
      </div>
    </div>
  );
}
