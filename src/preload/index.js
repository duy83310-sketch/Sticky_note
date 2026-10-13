const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // --- Notes Operations ---
  getNotes: () => ipcRenderer.invoke('get-notes'),
  getNote: (id) => ipcRenderer.invoke('get-note', id),
  saveNote: (note) => ipcRenderer.invoke('save-note', note),
  newNote: (partial) => ipcRenderer.invoke('new-note', partial),
  openNote: (id) => ipcRenderer.invoke('open-note', id),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
  closeNoteWindow: (id) => ipcRenderer.invoke('close-note-window', id),
  togglePinNote: (id) => ipcRenderer.invoke('toggle-pin-note', id),
  toggleUrgentNote: (id) => ipcRenderer.invoke('toggle-urgent-note', id),

  // --- Security & Encryption ---
  lockNote: (id, pin) => ipcRenderer.invoke('lock-note', { id, pin }),
  unlockNote: (id, pin) => ipcRenderer.invoke('unlock-note', { id, pin }),
  hasMasterPin: () => ipcRenderer.invoke('has-master-pin'),
  setMasterPin: (pin) => ipcRenderer.invoke('set-master-pin', pin),
  verifyMasterPin: (pin) => ipcRenderer.invoke('verify-master-pin', pin),
  removeMasterPin: (pin) => ipcRenderer.invoke('remove-master-pin', pin),

  // --- Settings ---
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),

  // --- Window Operations ---
  closeHub: () => ipcRenderer.invoke('close-hub'),
  minimizeHub: () => ipcRenderer.invoke('minimize-hub'),

  // --- Data Management (Backup & Restore) ---
  exportNotes: () => ipcRenderer.invoke('export-notes'),
  importNotes: (jsonStr) => ipcRenderer.invoke('import-notes', jsonStr),

  // --- Updater & App Info ---
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // --- Cloud Sync (Firebase & Mobile Companion) ---
  getSyncStatus: () => ipcRenderer.invoke('sync-get-status'),
  syncLogin: (email, password, remember) => ipcRenderer.invoke('sync-login', { email, password, remember }),
  syncRegister: (email, password) => ipcRenderer.invoke('sync-register', { email, password }),
  syncLogout: () => ipcRenderer.invoke('sync-logout'),
  syncNow: () => ipcRenderer.invoke('sync-now'),
  getCompanionUrl: () => ipcRenderer.invoke('sync-get-companion-url'),
  onSyncStatusChanged: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('sync-status-changed', handler);
    return () => ipcRenderer.removeListener('sync-status-changed', handler);
  },

  // --- Events ---
  onNotesUpdated: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('notes-updated', handler);
    return () => ipcRenderer.removeListener('notes-updated', handler);
  },
  onOpenSettings: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('open-settings', handler);
    return () => ipcRenderer.removeListener('open-settings', handler);
  },
  onOpenSync: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('open-sync', handler);
    return () => ipcRenderer.removeListener('open-sync', handler);
  },
  onUpdateStatus: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
});
