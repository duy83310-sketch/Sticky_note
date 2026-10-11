const { Tray, Menu, app } = require('electron');
const path = require('path');

let tray = null;

function setupTray({ windowManager, store, updater }) {
  try {
    const iconPath = path.join(__dirname, '..', 'renderer', 'assets', 'tray.ico');
    tray = new Tray(iconPath);
    tray.setToolTip('Sticky Notes - Fluent Deadline Planner');
  } catch (err) {
    console.warn('Không thể khởi tạo khay hệ thống Tray:', err);
    return { tray: null, updateMenu: () => {} };
  }

  function updateMenu() {
    const settings = store.getSettings();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '📝 Tạo ghi chú mới',
        click: () => {
          const newNote = store.createNote();
          windowManager.createNoteWindow(newNote.id);
          windowManager.notifyNotesUpdated();
        },
      },
      {
        label: '📋 Danh sách ghi chú (Hub)',
        click: () => {
          windowManager.showHub();
        },
      },
      { type: 'separator' },
      {
        label: '📌 Luôn hiện trên cùng (Always on Top)',
        type: 'checkbox',
        checked: settings.alwaysOnTop,
        click: (item) => {
          store.updateSettings({ alwaysOnTop: item.checked });
          windowManager.setAlwaysOnTop(item.checked);
        },
      },
      {
        label: '🚀 Khởi động cùng Windows',
        type: 'checkbox',
        checked: settings.openAtLogin,
        click: (item) => {
          store.updateSettings({ openAtLogin: item.checked });
          app.setLoginItemSettings({
            openAtLogin: item.checked,
            path: process.execPath,
          });
        },
      },
      { type: 'separator' },
      {
        label: '⚙️ Cài đặt & Bảo mật',
        click: () => {
          windowManager.showHub();
          windowManager.openHubSettings();
        },
      },
      {
        label: `🔄 Kiểm tra cập nhật (v${updater.currentVersion})`,
        click: async () => {
          windowManager.showHub();
          const info = await updater.checkForUpdates();
          windowManager.sendToHub('update-status', info);
        },
      },
      { type: 'separator' },
      {
        label: '🚪 Thoát ứng dụng',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
  }

  // Click vào tray icon sẽ toggle/focus Hub
  tray.on('click', () => {
    windowManager.toggleHub();
  });

  updateMenu();

  return {
    tray,
    updateMenu,
  };
}

module.exports = { setupTray };
