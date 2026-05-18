import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDB } from '../hooks/useDB';
import { useNotification } from '../hooks/useNotification';
import ReminderModal from '../components/ReminderModal';

export default function HomePage() {
  const [reminders, setReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const { getReminders } = useDB();
  const { permission, requestPermission } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    loadReminders();

    const interval = setInterval(loadReminders, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadReminders = async () => {
    const all = await getReminders();
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setReminders(all);
  };

  const pendingReminders = reminders.filter((r) => r.status === 'pending');
  const recentReminders = reminders.slice(0, 10);

  const handleAddManual = () => {
    if (!manualUrl.trim()) return;
    setShowModal(true);
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="page home-page">
      {permission !== 'granted' && (
        <div className="notification-banner">
          <p>Enable notifications to receive reminders</p>
          <button onClick={requestPermission} className="enable-btn">
            Enable
          </button>
        </div>
      )}

      <section className="add-section">
        <h2>Add a Reminder</h2>
        <p className="hint">Paste a link or share from Instagram</p>
        <div className="input-row">
          <input
            type="url"
            placeholder="Paste a link here..."
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            className="url-input"
          />
          <button
            onClick={handleAddManual}
            disabled={!manualUrl.trim()}
            className="add-btn"
          >
            Add
          </button>
        </div>
      </section>

      {pendingReminders.length > 0 && (
        <section className="upcoming-section">
          <h2>Upcoming ({pendingReminders.length})</h2>
          <ul className="reminder-list">
            {pendingReminders.map((r) => (
              <li key={r.id} className="reminder-item" onClick={() => navigate(`/reminder/${r.id}`)}>
                <span className="reminder-link">{r.title}</span>
                <span className="reminder-time">
                  {formatTime(r.scheduledFor)}
                  {r.repeat && r.repeat !== 'none' && (
                    <span className="repeat-indicator"> &middot; {r.repeat}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recentReminders.length > 0 && pendingReminders.length === 0 && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p>No upcoming reminders</p>
          <p className="hint">Share a link from Instagram or paste one above</p>
        </div>
      )}

      {recentReminders.length > 0 && (
        <section className="recent-section">
          <h2>Recent</h2>
          <ul className="reminder-list">
            {recentReminders.map((r) => (
              <li key={r.id} className="reminder-item" onClick={() => navigate(`/reminder/${r.id}`)}>
                <span className="reminder-link">{r.title}</span>
                <span className="reminder-time">
                  <span className={`status-badge-inline ${r.status}`}>
                    {r.status === 'pending' ? 'Pending' : 'Done'}
                  </span>
                  {' '}{formatTime(r.scheduledFor)}
                  {r.repeat && r.repeat !== 'none' && (
                    <span className="repeat-indicator"> &middot; {r.repeat}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reminders.length === 0 && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p>No reminders yet</p>
          <p className="hint">Share a link from Instagram or paste one above</p>
        </div>
      )}

      {showModal && (
        <ReminderModal
          url={manualUrl}
          title=""
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            setManualUrl('');
            loadReminders();
          }}
        />
      )}
    </div>
  );
}