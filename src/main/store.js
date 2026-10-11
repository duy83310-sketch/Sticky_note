const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Quản lý lưu trữ bền vững & an toàn (Atomic File Write & Rolling Backup)
 */

const USER_DATA = app.getPath('userData');
const DATA_FILE = path.join(USER_DATA, 'sticky_notes_v2.json');
const BACKUP_FILE = path.join(USER_DATA, 'sticky_notes_backup.json');
const LEGACY_FILE = path.join(USER_DATA, 'notes.json');

const DEFAULT_SETTINGS = {
  alwaysOnTop: true,
  openAtLogin: true,
  minimizeToTray: true,
  soundAlerts: true,
  snapToEdge: true,
  masterPinEnabled: false,
  masterPinHash: null,
  masterPinSalt: null,
};

function getInitialData() {
  const sampleId = `note_${Date.now()}`;
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS },
    noteList: [sampleId],
    notes: {
      [sampleId]: {
        id: sampleId,
        title: 'Bữa tối: King Salmon sốt chanh bơ',
        type: 'checklist',
        content: 'Chuẩn bị bữa tối đặc biệt cùng gia đình. Áp chảo cá hồi chín vàng vừa tới, rưới sốt bơ chanh thơm ngậy.',
        checklist: [
          { id: 'c1', text: 'Mua phi lê cá hồi tươi ngon', done: true },
          { id: 'c2', text: 'Bơ lạt, 2 quả chanh vàng, muối biển', done: true },
          { id: 'c3', text: 'Áp chảo cá hồi trong 8 đến 10 phút', done: false },
          { id: 'c4', text: 'Rưới sốt bơ chanh & trang trí thì là tươi', done: false }
        ],
        color: 'yellow',
        deadline: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), // 2 giờ tới
        pinned: true,
        locked: false,
        winX: null,
        winY: null,
        winWidth: 350,
        winHeight: 460,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
  };
}

class Store {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.notes && parsed.noteList) {
          parsed.settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Lỗi đọc file chính, thử khôi phục từ backup:', err);
      try {
        if (fs.existsSync(BACKUP_FILE)) {
          const rawBackup = fs.readFileSync(BACKUP_FILE, 'utf8');
          const parsed = JSON.parse(rawBackup);
          if (parsed && parsed.notes) return parsed;
        }
      } catch (backupErr) {
        console.error('Không thể đọc file backup:', backupErr);
      }
    }

    // Migration từ bản cũ nếu có
    try {
      if (fs.existsSync(LEGACY_FILE)) {
        const rawLegacy = fs.readFileSync(LEGACY_FILE, 'utf8');
        const legacy = JSON.parse(rawLegacy);
        if (legacy && legacy.notes && legacy.noteList && legacy.noteList.length > 0) {
          const migrated = getInitialData();
          migrated.noteList = legacy.noteList;
          migrated.notes = {};
          for (const id of legacy.noteList) {
            const oldNote = legacy.notes[id] || {};
            migrated.notes[id] = {
              id,
              title: oldNote.title || 'Ghi chú',
              type: 'text',
              content: oldNote.content || '',
              checklist: [],
              color: oldNote.color || 'yellow',
              deadline: oldNote.deadline || null,
              pinned: true,
              locked: false,
              winX: oldNote.winX || null,
              winY: oldNote.winY || null,
              winWidth: 350,
              winHeight: 460,
              createdAt: oldNote.updatedAt || new Date().toISOString(),
              updatedAt: oldNote.updatedAt || new Date().toISOString(),
            };
          }
          this.saveAtomic(migrated);
          return migrated;
        }
      }
    } catch (e) {
      console.warn('Không có file cũ để migrate:', e);
    }

    const init = getInitialData();
    this.saveAtomic(init);
    return init;
  }

  saveAtomic(data) {
    const tempFile = `${DATA_FILE}.tmp_${Date.now()}`;
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempFile, jsonStr, 'utf8');
      fs.renameSync(tempFile, DATA_FILE);

      // Tạo backup
      fs.copyFileSync(DATA_FILE, BACKUP_FILE);
    } catch (err) {
      console.error('Lỗi khi lưu dữ liệu an toàn:', err);
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (_) {}
    }
  }

  save() {
    this.saveAtomic(this.data);
  }

  // --- Notes Operations ---
  getAllNotes() {
    return this.data.noteList
      .map(id => this.data.notes[id])
      .filter(Boolean);
  }

  getNote(id) {
    return this.data.notes[id] || null;
  }

  createNote(partial = {}) {
    const id = `note_${Date.now()}`;
    const newNote = {
      id,
      title: partial.title || 'Ghi chú mới',
      type: partial.type || 'text',
      content: partial.content || '',
      checklist: partial.checklist || [],
      color: partial.color || 'yellow',
      deadline: partial.deadline || null,
      pinned: partial.pinned !== undefined ? partial.pinned : true,
      locked: false,
      winX: null,
      winY: null,
      winWidth: 350,
      winHeight: 460,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...partial,
    };

    this.data.notes[id] = newNote;
    this.data.noteList = [id, ...this.data.noteList];
    this.save();
    return newNote;
  }

  updateNote(id, updates) {
    if (!this.data.notes[id]) return null;
    this.data.notes[id] = {
      ...this.data.notes[id],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.notes[id];
  }

  deleteNote(id) {
    if (this.data.notes[id]) {
      delete this.data.notes[id];
      this.data.noteList = this.data.noteList.filter(item => item !== id);
      this.save();
      return true;
    }
    return false;
  }

  // --- Settings Operations ---
  getSettings() {
    return { ...this.data.settings };
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }

  // --- Backup & Export / Import ---
  exportToJson() {
    return JSON.stringify(this.data, null, 2);
  }

  importFromJson(rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && parsed.notes && Array.isArray(parsed.noteList)) {
        this.data = {
          version: 2,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          noteList: parsed.noteList,
          notes: parsed.notes,
        };
        this.save();
        return { success: true, count: parsed.noteList.length };
      }
      return { success: false, error: 'Định dạng file không hợp lệ' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new Store();
