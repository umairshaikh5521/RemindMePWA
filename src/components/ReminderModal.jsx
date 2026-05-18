import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDB } from '../hooks/useDB';
import { useNotification } from '../hooks/useNotification';

const WORKER_URL = import.meta.env.VITE_WORKER_URL;

function getScheduledTime(option) {
  const now = new Date();
  switch (option) {
    case '30min':
      return new Date(now.getTime() + 30 * 60 * 1000);
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '3h':
      return new Date(now.getTime() + 3 * 60 * 60 * 1000);
    case 'evening': {
      const evening = new Date(now);
      evening.setHours(20, 0, 0, 0);
      if (evening <= now) evening.setDate(evening.getDate() + 1);
      return evening;
    }
    case 'tomorrow': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }
    case 'friday': {
      const friday = new Date(now);
      const daysUntilFriday = (5 - friday.getDay() + 7) % 7 || 7;
      friday.setDate(friday.getDate() + daysUntilFriday);
      friday.setHours(12, 0, 0, 0);
      return friday;
    }
    default:
      return null;
  }
}

const QUICK_OPTIONS = [
  { key: '30min', label: '30 min' },
  { key: '1h', label: '1 hour' },
  { key: '3h', label: '3 hours' },
  { key: 'evening', label: 'This evening' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'friday', label: 'Friday' },
];

const REPEAT_OPTIONS = [
  { key: 'none', label: 'No repeat' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export default function ReminderModal({ url, title, onClose, onSaved }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [reminderTitle, setReminderTitle] = useState(title || '');
  const [repeat, setRepeat] = useState('none');
  const [saving, setSaving] = useState(false);
  const { addReminder } = useDB();
  const { permission, requestPermission, ensureFcmToken } = useNotification();

  const getScheduledTimeValue = () => {
    if (selectedOption === 'custom') {
      if (!customDate || !customTime) return null;
      return new Date(`${customDate}T${customTime}`);
    }
    return getScheduledTime(selectedOption);
  };

  const scheduledTime = getScheduledTimeValue();

  const repeatPreview = (() => {
    if (!scheduledTime || repeat === 'none' || !selectedOption) return null;
    const timeStr = scheduledTime.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    const freq = repeat === 'daily' ? 'daily' : repeat === 'weekly' ? 'weekly' : 'monthly';
    return `You\u2019ll be reminded ${freq} at ${timeStr}`;
  })();

  const handleSave = async () => {
    let scheduledFor;
    if (selectedOption === 'custom') {
      if (!customDate || !customTime) return;
      scheduledFor = new Date(`${customDate}T${customTime}`);
    } else {
      scheduledFor = getScheduledTime(selectedOption);
    }
    if (!scheduledFor || !reminderTitle.trim()) return;

    setSaving(true);

    if (permission !== 'granted') {
      await requestPermission();
    }

    const fcmToken = await ensureFcmToken();

    const reminder = {
      id: uuidv4(),
      url,
      title: reminderTitle.trim(),
      scheduledFor: scheduledFor.toISOString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      repeat,
    };

    await addReminder(reminder);

    if (fcmToken && WORKER_URL) {
      fetch(`${WORKER_URL}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reminder, fcmToken }),
      }).catch((err) => console.error('Worker save failed:', err));
    }

    setSaving(false);
    onSaved?.(reminder);
  };

  const canSave =
    selectedOption &&
    reminderTitle.trim() &&
    (selectedOption === 'custom' ? customDate && customTime : true);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Set Reminder</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-url">
          <p className="url-label">Link</p>
          <p className="url-text">{url}</p>
        </div>

        <div className="modal-field">
          <label htmlFor="reminder-title">Title *</label>
          <input
            id="reminder-title"
            type="text"
            placeholder="What do you want to be reminded of?"
            value={reminderTitle}
            onChange={(e) => setReminderTitle(e.target.value)}
          />
        </div>

        <div className="time-options">
          {QUICK_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`time-option ${selectedOption === opt.key ? 'selected' : ''}`}
              onClick={() => setSelectedOption(opt.key)}
            >
              {opt.label}
            </button>
          ))}
          <button
            className={`time-option ${selectedOption === 'custom' ? 'selected' : ''}`}
            onClick={() => setSelectedOption('custom')}
          >
            Custom
          </button>
        </div>

        {selectedOption === 'custom' && (
          <div className="custom-time">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />
          </div>
        )}

        <div className="modal-field">
          <label htmlFor="reminder-repeat">Repeat</label>
          <select
            id="reminder-repeat"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          >
            {REPEAT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>

        {repeatPreview && (
          <p className="repeat-preview">{repeatPreview}</p>
        )}

        <button
          className="save-btn"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? 'Saving...' : 'Save Reminder'}
        </button>
      </div>
    </div>
  );
}