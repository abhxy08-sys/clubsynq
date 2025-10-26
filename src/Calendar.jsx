import React from 'react';

function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let week = new Array(7).fill(null);
  let day = 1;
  // fill first week
  for (let i = startDay; i < 7; i++) {
    week[i] = day++;
  }
  weeks.push(week);
  while (day <= daysInMonth) {
    week = new Array(7).fill(null);
    for (let i = 0; i < 7 && day <= daysInMonth; i++) {
      week[i] = day++;
    }
    weeks.push(week);
  }
  return weeks;
}

export default function Calendar({ events = [], onEventClick }) {
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth());

  const monthName = new Date(year, month, 1).toLocaleString(undefined, { month: 'long' });
  const matrix = getMonthMatrix(year, month);

  // normalize events: expect events to have at least { date: '2025-10-12', title }
  // normalize events by full date (year-month-day) so they only show on the correct day
  const eventsByDate = {};
  events.forEach(ev => {
    const d = ev.date || ev.event_date || ev.start_date;
    if (!d) return;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return;
    const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`; // month is 0-based
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(ev);
  });

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button onClick={() => setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11; } return m - 1; })}>&lt;</button>
        <strong>{monthName} {year}</strong>
        <button onClick={() => setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0; } return m + 1; })}>&gt;</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <th key={d} style={{ padding: 6, textAlign: 'center', fontWeight: 600 }}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => (
                <td key={di} style={{ verticalAlign: 'top', padding: 6, height: 80, border: '1px solid #fafafa' }}>
                  {day && (
                    <div>
                      <div style={{ fontSize: 12, color: '#666' }}>{day}</div>
                      <div style={{ marginTop: 6 }}>
                        {(eventsByDate[`${year}-${month}-${day}`] || []).map((ev, i) => (
                          <div
                            key={i}
                            style={{
                              background: '#e6f0ff',
                              color: '#0b1220',
                              padding: '2px 6px',
                              borderRadius: 6,
                              marginBottom: 6,
                              fontSize: 12,
                              cursor: onEventClick ? 'pointer' : 'default',
                              display: 'inline-block',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            onClick={() => onEventClick ? onEventClick(ev) : null}
                            title={ev.title || ev.name || 'Event'}
                          >
                            {ev.title || ev.name || 'Event'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
