const { app, ipcMain } = require('electron');
const path = require('path');
const store = require('./store');
const security = require('./security');
const updater = require('./updater');
const WindowManager = require('./windowManager');
const { setupTray } = require('./trayManager');

// Vô hiệu hóa GPU và sandbox để đảm bảo 100% ổn định trên Windows
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('no-sandbox');

// Đảm bảo chạy duy nhất 1 instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

const windowManager = new WindowManager(store);
let trayController = null;

// Xử lý khi user mở app lần 2
app.on('second-instance', () => {
  windowManager.showHub();
});

// ── IPC Handlers ─────────────────────────────────────────────────────────────

// Notes
ipcMain.handle('get-notes', () => {
  return store.getAllNotes().map(note => {
    // Nếu note bị khóa, che nội dung ở danh sách Hub để bảo mật
    if (note.locked) {
      return {
        ...note,
        contentPreview: '🔒 Ghi chú đã được mã hóa bảo vệ bằng mã PIN',
      };
    }
    return note;
  });
});

ipcMain.handle('get-note', (_e, id) => {
  return store.getNote(id);
});

ipcMain.handle('save-note', (_e, noteData) => {
  if (!noteData || !noteData.id) return false;
  const updated = store.updateNote(noteData.id, noteData);
  windowManager.notifyNotesUpdated();
  return !!updated;
});

ipcMain.handle('new-note', (_e, partial) => {
  const newNote = store.createNote(partial || {});
  windowManager.createNoteWindow(newNote.id);
  windowManager.notifyNotesUpdated();
  return newNote;
});

ipcMain.handle('open-note', (_e, id) => {
  return windowManager.createNoteWindow(id);
});

ipcMain.handle('delete-note', (_e, id) => {
  windowManager.closeNoteWindow(id);
  const ok = store.deleteNote(id);
  windowManager.notifyNotesUpdated();
  return ok;
});

ipcMain.handle('close-note-window', (_e, id) => {
  windowManager.closeNoteWindow(id);
  return true;
});

ipcMain.handle('toggle-pin-note', (_e, id) => {
  const note = store.getNote(id);
  if (!note) return false;
  const newPinned = !note.pinned;
  store.updateNote(id, { pinned: newPinned });

  if (windowManager.noteWindows.has(id)) {
    const win = windowManager.noteWindows.get(id);
    if (!win.isDestroyed()) {
      // Ghim nổi tuyệt đối trên màn hình
      win.setAlwaysOnTop(newPinned, 'screen-saver');
      if (newPinned) {
        win.moveTop();
        win.focus();
      }
    }
  }
  windowManager.notifyNotesUpdated();
  return newPinned;
});

ipcMain.handle('toggle-urgent-note', (_e, id) => {
  const note = store.getNote(id);
  if (!note) return false;
  const newUrgent = !note.isUrgent;
  const updates = { isUrgent: newUrgent };
  if (newUrgent && !note.deadline) {
    // Mặc định gán hạn chót khẩn cấp trong 2 giờ
    updates.deadline = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
  }
  store.updateNote(id, updates);
  windowManager.notifyNotesUpdated();
  return newUrgent;
});

// Security & PIN
ipcMain.handle('has-master-pin', () => {
  const s = store.getSettings();
  return !!(s.masterPinEnabled && s.masterPinHash);
});

ipcMain.handle('set-master-pin', (_e, pin) => {
  if (!pin || String(pin).length < 4) return { success: false, message: 'Mã PIN tối thiểu 4 ký tự' };
  const salt = security.generateSalt();
  const hash = security.hashPin(pin, salt);
  store.updateSettings({
    masterPinEnabled: true,
    masterPinHash: hash,
    masterPinSalt: salt,
  });
  return { success: true };
});

ipcMain.handle('verify-master-pin', (_e, pin) => {
  const s = store.getSettings();
  if (!s.masterPinHash || !s.masterPinSalt) return false;
  return security.verifyPin(pin, s.masterPinHash, s.masterPinSalt);
});

ipcMain.handle('remove-master-pin', (_e, pin) => {
  const s = store.getSettings();
  if (security.verifyPin(pin, s.masterPinHash, s.masterPinSalt)) {
    store.updateSettings({
      masterPinEnabled: false,
      masterPinHash: null,
      masterPinSalt: null,
    });
    return { success: true };
  }
  return { success: false, message: 'Mã PIN hiện tại không đúng' };
});

ipcMain.handle('lock-note', (_e, { id, pin }) => {
  const note = store.getNote(id);
  if (!note) return { success: false, message: 'Không tìm thấy ghi chú' };
  try {
    const plain = JSON.stringify({ content: note.content, checklist: note.checklist || [] });
    const encryptedObj = security.encryptText(plain, pin);
    store.updateNote(id, {
      locked: true,
      encryptedPayload: encryptedObj,
      content: '', // Xóa plain text trong store
      checklist: [],
    });
    windowManager.notifyNotesUpdated();
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('unlock-note', (_e, { id, pin }) => {
  const note = store.getNote(id);
  if (!note || !note.locked || !note.encryptedPayload) return { success: false, message: 'Ghi chú không bị khóa' };
  try {
    const decryptedStr = security.decryptText(note.encryptedPayload, pin);
    const parsed = JSON.parse(decryptedStr);
    store.updateNote(id, {
      locked: false,
      encryptedPayload: null,
      content: parsed.content || '',
      checklist: parsed.checklist || [],
    });
    windowManager.notifyNotesUpdated();
    return { success: true, content: parsed.content, checklist: parsed.checklist };
  } catch (err) {
    return { success: false, message: 'Sai mã PIN!' };
  }
});

// Settings
ipcMain.handle('get-settings', () => {
  return store.getSettings();
});

ipcMain.handle('update-settings', (_e, newSettings) => {
  const updated = store.updateSettings(newSettings);
  if (newSettings.alwaysOnTop !== undefined) {
    windowManager.setAlwaysOnTop(newSettings.alwaysOnTop);
  }
  if (newSettings.openAtLogin !== undefined) {
    app.setLoginItemSettings({
      openAtLogin: newSettings.openAtLogin,
      path: process.execPath,
    });
  }
  if (trayController) {
    trayController.updateMenu();
  }
  return updated;
});

// Window controls
ipcMain.handle('close-hub', () => {
  const settings = store.getSettings();
  if (settings.minimizeToTray) {
    if (windowManager.hubWindow && !windowManager.hubWindow.isDestroyed()) {
      windowManager.hubWindow.hide();
    }
  } else {
    app.quit();
  }
  return true;
});

ipcMain.handle('minimize-hub', () => {
  if (windowManager.hubWindow && !windowManager.hubWindow.isDestroyed()) {
    windowManager.hubWindow.minimize();
  }
  return true;
});

// Backup & Export / Import
ipcMain.handle('export-notes', () => {
  return store.exportToJson();
});

ipcMain.handle('import-notes', (_e, jsonStr) => {
  const result = store.importFromJson(jsonStr);
  if (result.success) {
    windowManager.notifyNotesUpdated();
  }
  return result;
});

// Updater & Info
ipcMain.handle('get-app-version', () => {
  return updater.getVersionInfo();
});

ipcMain.handle('check-for-updates', async () => {
  return await updater.checkForUpdates();
});

// ── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  const settings = store.getSettings();

  // Khởi động cùng Windows nếu được bật
  if (settings.openAtLogin) {
    try {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
      });
    } catch(err) {
      console.warn('setLoginItemSettings error:', err.message);
    }
  }

  // Khởi tạo System Tray
  try {
    trayController = setupTray({ windowManager, store, updater });
  } catch(err) {
    console.warn('Tray setup error:', err.message);
  }

  // Mở Hub
  try {
    windowManager.createHubWindow();
  } catch(err) {
    console.error('createHubWindow error:', err.message);
  }

  // Mở ghi chú đầu tiên lên desktop như một sticky note thực tế
  try {
    const allNotes = store.getAllNotes();
    if (allNotes.length > 0) {
      windowManager.createNoteWindow(allNotes[0].id);
    }
  } catch(err) {
    console.error('createNoteWindow error:', err.message);
  }
});

app.on('window-all-closed', (e) => {
  // Không thoát ứng dụng nếu minimizeToTray đang bật, giữ sticky notes hoặc tray chạy
  const settings = store.getSettings();
  if (!settings.minimizeToTray) {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
