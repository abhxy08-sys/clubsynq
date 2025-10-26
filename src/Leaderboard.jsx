import React from 'react';

export default function Leaderboard({ data = [], title = 'Leaderboard' }) {
  return (
    <div className="site-card" style={{ padding: 12 }}>
      <h4 style={{ marginTop: 0 }}>{title}</h4>
      {data.length === 0 ? <p className="muted">No data</p> : (
        <ol>
          {data.map((row, i) => (
            <li key={i} style={{ marginBottom: 6 }}>{row.name || row.user_id} — {row.points} pts</li>
          ))}
        </ol>
      )}
    </div>
  );
}
