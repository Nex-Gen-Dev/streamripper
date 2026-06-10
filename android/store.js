// src/services/store.js — Global state with Zustand
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CF_WORKER = 'https://streamripper-worker.YOUR_SUBDOMAIN.workers.dev';

export const useStore = create((set, get) => ({
  // Auth
  user:  null,
  token: null,

  // Queue
  queue: [],

  // Settings
  quality:       '128',
  embedMeta:     true,
  saveThumbnail: true,
  skipDupes:     true,
  defaultMode:   'audio',

  // ── Auth actions ──────────────────────────────────────────────────────────
  login: async (email, password) => {
    const res  = await fetch(`${CF_WORKER}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    set({ user: { email: data.email, name: data.name, uid: data.uid }, token: data.token });
    await AsyncStorage.setItem('sr_token', data.token);
    await AsyncStorage.setItem('sr_user',  JSON.stringify({ email: data.email, name: data.name }));
    return data;
  },

  register: async (email, password, name) => {
    const DeviceInfo = require('react-native-device-info');
    const res  = await fetch(`${CF_WORKER}/api/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        email, password, name,
        os: `Android ${DeviceInfo.getSystemVersion()}`,
        ua: DeviceInfo.getUserAgentSync(),
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    set({ user: { email: data.email, name, uid: data.uid }, token: data.token });
    await AsyncStorage.setItem('sr_token', data.token);
    await AsyncStorage.setItem('sr_user',  JSON.stringify({ email: data.email, name }));
    return data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('sr_token');
    await AsyncStorage.removeItem('sr_user');
    set({ user: null, token: null });
  },

  restoreSession: async () => {
    const token = await AsyncStorage.getItem('sr_token');
    const raw   = await AsyncStorage.getItem('sr_user');
    if (token && raw) {
      set({ token, user: JSON.parse(raw) });
      return true;
    }
    return false;
  },

  // ── Queue actions ─────────────────────────────────────────────────────────
  addToQueue: (item) => {
    const job = {
      id:        Math.random().toString(36).slice(2),
      url:       item.url,
      title:     item.title || item.url,
      artist:    item.artist || '',
      album:     item.album  || '',
      mode:      item.mode   || get().defaultMode,
      quality:   get().quality,
      platform:  detectPlatform(item.url),
      status:    'queued',
      progress:  0,
      createdAt: new Date().toISOString(),
    };
    set(s => ({ queue: [job, ...s.queue] }));
    return job;
  },

  updateJob: (id, patch) => {
    set(s => ({ queue: s.queue.map(j => j.id === id ? { ...j, ...patch } : j) }));
  },

  removeJob: (id) => {
    set(s => ({ queue: s.queue.filter(j => j.id !== id) }));
  },

  clearFinished: () => {
    set(s => ({ queue: s.queue.filter(j => !['done','failed','cancelled'].includes(j.status)) }));
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  setSetting: async (key, val) => {
    set({ [key]: val });
    await AsyncStorage.setItem(`sr_setting_${key}`, JSON.stringify(val));
  },

  loadSettings: async () => {
    const keys = ['quality','embedMeta','saveThumbnail','skipDupes','defaultMode'];
    const updates = {};
    for (const k of keys) {
      const v = await AsyncStorage.getItem(`sr_setting_${k}`);
      if (v !== null) updates[k] = JSON.parse(v);
    }
    set(updates);
  },
}));

function detectPlatform(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('tiktok.com'))    return 'TikTok';
  if (u.includes('instagram.com')) return 'Instagram';
  if (u.includes('music.youtube')) return 'YouTube Music';
  return 'YouTube';
}
