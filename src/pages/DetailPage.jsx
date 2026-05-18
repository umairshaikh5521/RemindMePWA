import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDB } from '../hooks/useDB';

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getReminder, updateReminder, deleteReminder } = useDB();
  const [reminder, setReminder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminder();
  }, [id]);

  const loadReminder = async () => {
    const r = await getReminder(id);
    setReminder(r);
    setLoading(false);
  };

  const handleMarkDone = async () => {
    if (!reminder) return;
    await updateReminder(reminder.id, { status: 'reminded' });
    loadReminder();
  };

  const handleDelete = async () => {
    if (!reminder) return;
    await deleteReminder(reminder.id);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="page detail-page">
        <div className="empty-state">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!reminder) {
    return (
      <div className="page detail-page">
        <div className="empty-state">
          <p>Reminder not found</p>
          <button className="save-btn" style={{ marginTop: 12 }} onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    );
  }

  const scheduledDate = new Date(reminder.scheduledFor);
  const createdDate = new Date(reminder.createdAt);
  const isUrl = reminder.url && (reminder.url.startsWith('http://') || reminder.url.startsWith('https://'));

  return (
    <div className="page detail-page">
      <div className="detail-header">
        <button className="detail-back" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2>Reminder Details</h2>
        <div style={{ width: 32 }} />
      </div>

      <div className="detail-card">
        <h3 className="detail-title">{reminder.title}</h3>

        <span className={`status-badge ${reminder.status}`}>
          {reminder.status === 'pending' ? 'Pending' : 'Done'}
        </span>
      </div>

      <div className="detail-section">
        <div className="detail-row">
          <span className="detail-label">Scheduled</span>
          <span className="detail-value">
            {scheduledDate.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            <br />
            {scheduledDate.toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>

        {reminder.repeat && reminder.repeat !== 'none' && (
          <div className="detail-row">
            <span className="detail-label">Repeat</span>
            <span className="detail-value detail-repeat">{reminder.repeat}</span>
          </div>
        )}

        <div className="detail-row">
          <span className="detail-label">Created</span>
          <span className="detail-value">
            {createdDate.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Link</span>
          <span className="detail-value">
            {isUrl ? (
              <a href={reminder.url} target="_blank" rel="noopener noreferrer" className="detail-link">
                {reminder.url}
              </a>
            ) : (
              reminder.url
            )}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">ID</span>
          <span className="detail-value detail-id">{reminder.id}</span>
        </div>
      </div>

      <div className="detail-actions">
        {reminder.status === 'pending' && (
          <button className="detail-done-btn" onClick={handleMarkDone}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Mark as Done
          </button>
        )}
        <button className="detail-delete-btn" onClick={handleDelete}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}