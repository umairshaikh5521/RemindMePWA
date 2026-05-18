import { useState, useEffect } from 'react';
import { useDB } from '../hooks/useDB';

export default function HistoryPage() {
  const [reminders, setReminders] = useState([]);
  const [filter, setFilter] = useState('all');
  const { getReminders, deleteReminder, updateReminder } = useDB();

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    const all = await getReminders();
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setReminders(all);
  };

  const handleDelete = async (id) => {
    await deleteReminder(id);
    loadReminders();
  };

  const handleMarkDone = async (id) => {
    await updateReminder(id, { status: 'reminded' });
    loadReminders();
  };

  const filtered = reminders.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="page history-page">
      <h2>Reminders</h2>

      <div className="filter-row">
        {['all', 'pending', 'reminded'].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Done'}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <p>No reminders yet</p>
        </div>
      )}

      <ul className="history-list">
        {filtered.map((r) => (
          <li key={r.id} className="history-item">
            <div className="history-item-content">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="history-link">
                {r.title || r.url}
              </a>
              <div className="history-meta">
                <span className={`status-badge ${r.status}`}>
                  {r.status === 'pending' ? 'Pending' : 'Done'}
                </span>
                <span className="history-date">
                  {new Date(r.scheduledFor).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
            <div className="history-actions">
              {r.status === 'pending' && (
                <button
                  className="action-btn done-btn"
                  onClick={() => handleMarkDone(r.id)}
                  aria-label="Mark as done"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              )}
              <button
                className="action-btn delete-btn"
                onClick={() => handleDelete(r.id)}
                aria-label="Delete"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
