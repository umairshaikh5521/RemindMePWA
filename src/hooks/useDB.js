import { openDB } from 'idb';
import { useCallback } from 'react';

const DB_NAME = 'remind-me-db';
const STORE_NAME = 'reminders';
const DB_VERSION = 1;

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('scheduledFor', 'scheduledFor');
      }
    },
  });
}

export function useDB() {
  const addReminder = useCallback(async (reminder) => {
    const db = await getDB();
    await db.put(STORE_NAME, reminder);
  }, []);

  const getReminders = useCallback(async () => {
    const db = await getDB();
    return db.getAll(STORE_NAME);
  }, []);

  const getReminder = useCallback(async (id) => {
    const db = await getDB();
    return db.get(STORE_NAME, id);
  }, []);

  const updateReminder = useCallback(async (id, updates) => {
    const db = await getDB();
    const existing = await db.get(STORE_NAME, id);
    if (existing) {
      await db.put(STORE_NAME, { ...existing, ...updates });
    }
  }, []);

  const deleteReminder = useCallback(async (id) => {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  }, []);

  return { addReminder, getReminders, getReminder, updateReminder, deleteReminder };
}
