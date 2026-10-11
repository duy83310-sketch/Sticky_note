const { app } = require('electron');

/**
 * Quản lý phiên bản & Kiểm tra nâng cấp (App Versioning & Update Manager)
 */

const APP_VERSION = '1.2.0';
const RELEASE_CHANNEL = 'stable';
const BUILD_DATE = '2026-10-12';

const CHANGELOG = [
  {
    version: '1.2.0',
    date: '2026-10-12',
    highlights: [
      'Giao diện Fluent Design Windows 11 hoàn toàn mới (chuẩn Material Layering & Mica)',
      'Hệ thống cảnh báo Deadline 3 cấp độ (Safe / Warning / Urgent) với live countdown monospace',
      'Hỗ trợ chế độ Checklist danh sách công việc tương tác trực tiếp & Rich Text',
      'Cơ chế mã hóa bảo mật Master PIN chuẩn AES-256-GCM',
      'Hệ thống lưu trữ Atomic Storage & Rolling Backup chống mất dữ liệu khi tắt đột ngột',
      'Tự động khởi động cùng Windows & Ghim trên Desktop / Always-on-top tùy chọn',
      'Khay hệ thống (System Tray) điều khiển nhanh toàn bộ ghi chú'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-10-01',
    highlights: [
      'Tích hợp 6 bảng màu pastel Windows 11',
      'Thêm bộ lọc tìm kiếm tức thì theo tiêu đề và nội dung',
      'Sửa lỗi hiển thị trên hệ điều hành Windows'
    ]
  }
];

class UpdateManager {
  constructor() {
    this.currentVersion = APP_VERSION;
    this.channel = RELEASE_CHANNEL;
    this.buildDate = BUILD_DATE;
  }

  getVersionInfo() {
    return {
      version: this.currentVersion,
      channel: this.channel,
      buildDate: this.buildDate,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      os: `${process.platform} ${process.arch}`,
      changelog: CHANGELOG,
    };
  }

  async checkForUpdates() {
    // Giả lập hoặc gọi endpoint API thực tế
    // Với app đóng gói có thể dùng electron-updater với github releases
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          hasUpdate: false,
          currentVersion: this.currentVersion,
          latestVersion: this.currentVersion,
          channel: this.channel,
          checkTime: new Date().toISOString(),
          message: 'Bạn đang sử dụng phiên bản mới nhất và ổn định nhất!',
          changelog: CHANGELOG[0],
        });
      }, 800);
    });
  }
}

module.exports = new UpdateManager();
