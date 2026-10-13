const { BrowserWindow, screen, app } = require('electron');
const path = require('path');

let hubWindow = null;
const noteWindows = new Map(); // noteId -> BrowserWindow
let preloadPath = path.join(__dirname, '..', 'preload', 'index.js');
let appIconPath = path.join(__dirname, '..', 'renderer', 'assets', 'app-icon.png');

class WindowManager {
  constructor(store) {
    this.store = store;
  }

  // --- Hub Window ---
  createHubWindow() {
    if (hubWindow && !hubWindow.isDestroyed()) {
      hubWindow.show();
      hubWindow.focus();
      return hubWindow;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { workArea } = primaryDisplay;

    const width = 340;
    const height = Math.min(620, workArea.height - 80);
    const x = workArea.x + workArea.width - width - 20;
    const y = workArea.y + 40;

    const settings = this.store.getSettings();

    hubWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      minWidth: 300,
      minHeight: 450,
      frame: false,
      transparent: false,
      backgroundColor: '#1b1c22',
      alwaysOnTop: settings.alwaysOnTop,
      skipTaskbar: false,
      resizable: true,
      icon: appIconPath,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        devTools: true,
      },
      show: true,
    });

    const hubPath = path.join(__dirname, '..', 'renderer', 'hub', 'hub.html');
    hubWindow.loadFile(hubPath);

    const showSafely = () => {
      if (hubWindow && !hubWindow.isDestroyed()) {
        hubWindow.show();
        hubWindow.focus();
        hubWindow.moveTop();
        if (settings.alwaysOnTop) {
          hubWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      }
    };

    hubWindow.once('ready-to-show', showSafely);
    showSafely();

    hubWindow.on('close', (e) => {
      if (!app.isQuitting) {
        e.preventDefault();
        hubWindow.hide();
      }
    });

    hubWindow.on('closed', () => {
      hubWindow = null;
    });

    return hubWindow;
  }

  showHub() {
    if (!hubWindow || hubWindow.isDestroyed()) {
      this.createHubWindow();
    } else {
      hubWindow.show();
      hubWindow.focus();
    }
  }

  toggleHub() {
    if (!hubWindow || hubWindow.isDestroyed()) {
      this.createHubWindow();
    } else if (hubWindow.isVisible()) {
      hubWindow.hide();
    } else {
      hubWindow.show();
      hubWindow.focus();
    }
  }

  openHubSettings() {
    this.showHub();
    this.sendToHub('open-settings');
  }

  sendToHub(channel, data) {
    if (hubWindow && !hubWindow.isDestroyed()) {
      hubWindow.webContents.send(channel, data);
    }
  }

  // --- Note Windows ---
  createNoteWindow(noteId) {
    if (noteWindows.has(noteId)) {
      const exist = noteWindows.get(noteId);
      if (!exist.isDestroyed()) {
        exist.show();
        exist.focus();
        return exist;
      }
    }

    const note = this.store.getNote(noteId);
    if (!note) return null;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { workArea } = primaryDisplay;

    let width = note.winWidth || 350;
    let height = note.winHeight || 460;
    let x = note.winX;
    let y = note.winY;

    // Nếu chưa có tọa độ hoặc ngoài màn hình thì tính toán vị trí góc màn hình
    if (x === null || x === undefined || isNaN(x)) {
      x = workArea.x + workArea.width - width - 380;
    }
    if (y === null || y === undefined || isNaN(y)) {
      y = workArea.y + 60;
    }

    // Đảm bảo không văng ra khỏi khu vực hiển thị
    if (x < workArea.x) x = workArea.x + 20;
    if (x + width > workArea.x + workArea.width) x = workArea.x + workArea.width - width - 20;
    if (y < workArea.y) y = workArea.y + 20;
    if (y + height > workArea.y + workArea.height) y = workArea.y + workArea.height - height - 20;

    const settings = this.store.getSettings();

    const win = new BrowserWindow({
      width,
      height,
      x,
      y,
      minWidth: 260,
      minHeight: 320,
      frame: false,
      transparent: false,
      backgroundColor: '#fef08a',
      alwaysOnTop: note.pinned !== false,
      skipTaskbar: false,
      resizable: true,
      icon: appIconPath,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        devTools: true,
      },
      show: true,
    });

    const noteHtmlPath = path.join(__dirname, '..', 'renderer', 'note', 'note.html');
    win.loadFile(noteHtmlPath, { query: { id: noteId } });

    const showSafely = () => {
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
        win.moveTop();
        if (note.pinned !== false) {
          win.setAlwaysOnTop(true, 'screen-saver');
        }
      }
    };

    win.once('ready-to-show', showSafely);
    showSafely();

    // Lưu vị trí khi di chuyển hoặc đổi kích thước
    const saveBounds = () => {
      if (win.isDestroyed()) return;
      const [nx, ny] = win.getPosition();
      const [nw, nh] = win.getSize();
      this.store.updateNote(noteId, {
        winX: nx,
        winY: ny,
        winWidth: nw,
        winHeight: nh,
      });
    };

    win.on('moved', saveBounds);
    win.on('resized', saveBounds);

    win.on('closed', () => {
      noteWindows.delete(noteId);
      this.notifyNotesUpdated();
    });

    noteWindows.set(noteId, win);
    return win;
  }

  closeNoteWindow(noteId) {
    if (noteWindows.has(noteId)) {
      const win = noteWindows.get(noteId);
      if (!win.isDestroyed()) {
        win.close();
      }
      noteWindows.delete(noteId);
    }
  }

  isNoteOpen(noteId) {
    return noteWindows.has(noteId) && !noteWindows.get(noteId).isDestroyed();
  }

  setAlwaysOnTop(isAlways) {
    if (hubWindow && !hubWindow.isDestroyed()) {
      hubWindow.setAlwaysOnTop(isAlways);
    }
    for (const [id, win] of noteWindows.entries()) {
      if (!win.isDestroyed()) {
        const note = this.store.getNote(id);
        const shouldPin = (note && note.pinned !== false) ? isAlways : false;
        win.setAlwaysOnTop(shouldPin);
      }
    }
  }

  sendToHub(channel, ...args) {
    if (hubWindow && !hubWindow.isDestroyed()) {
      hubWindow.webContents.send(channel, ...args);
    }
  }

  notifyNotesUpdated() {
    this.sendToHub('notes-updated');
    for (const win of noteWindows.values()) {
      if (!win.isDestroyed()) {
        win.webContents.send('notes-updated');
      }
    }
  }
}

module.exports = WindowManager;
