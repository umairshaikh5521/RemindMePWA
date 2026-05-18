import { useState, useEffect } from 'react';
import { useDB } from '../hooks/useDB';
import { useNotification } from '../hooks/useNotification';
import ReminderModal from '../components/ReminderModal';

export default function HomePage() {
  const [pendingReminders, setPendingReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const { getReminders } = useDB();
  const { permission, requestPermission } = useNotification();

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    const all = await getReminders();
    const pending = all
      .filter((r) => r.status === 'pending')
      .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
    setPendingReminders(pending);
  };

  const handleAddManual = () => {
    if (!manualUrl.trim()) return;
    setShowModal(true);
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
          <h2>Upcoming</h2>
          <ul className="reminder-list">
            {pendingReminders.slice(0, 5).map((r) => (
              <li key={r.id} className="reminder-item">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="reminder-link">
                  {r.title}
                </a>
                <span className="reminder-time">
                  {new Date(r.scheduledFor).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {r.repeat && r.repeat !== 'none' && (
                    <span className="repeat-indicator"> &middot; {r.repeat}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingReminders.length === 0 && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p>No upcoming reminders</p>
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
