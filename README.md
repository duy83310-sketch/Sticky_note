# 📌 Sticky Notes Fluent - Cross-Device Sync (Desktop & Mobile)

Ứng dụng Sticky Notes chuẩn Windows 11 Fluent Design tích hợp đồng bộ hai chiều thời gian thực giữa **Máy tính (Electron)** và **Điện thoại di động (Mobile Web PWA)** thông qua **Firebase Realtime Database**.

---

## ✨ Tính năng nổi bật

### 1. 🖥️ Desktop App (Windows Electron)
- **Windows 11 Fluent Acrylic Design**: Bo góc, hiệu ứng đổ bóng mờ mica/acrylic sang trọng.
- **Always on Top & Ghim**: Ghim ghi chú nổi tuyệt đối trên màn hình làm việc.
- **Tiến độ Checklist trực quan**: Hiển thị dạng list kèm thanh tiến độ xanh lá tỉ lệ % (1/3 -> 1/3 thanh, tăng dần đến đầy khi hoàn thành).
- **Trạng thái Khẩn cấp (Urgent)**: Chế độ báo động thị giác nhấp nháy, đếm ngược thời gian hạn chót.
- **Bảo mật mã PIN (AES-256)**: Khóa và mã hóa an toàn nội dung ghi chú nhạy cảm.
- **Chạy ngầm System Tray**: Thu nhỏ xuống khay hệ thống, khởi động cùng Windows.
- **Atomic File Write & Rolling Backup**: Chống mất mát dữ liệu khi mất điện hoặc tắt máy đột ngột.

### 2. 📱 Mobile Companion (Progressive Web App - PWA)
- Hoạt động mượt mà trên mọi thiết bị di động (iOS Safari, Android Chrome).
- Có thể **Thêm vào màn hình chính (Add to Home Screen)** để dùng toàn màn hình như ứng dụng gốc.
- Hỗ trợ lưu trữ offline với Service Worker và LocalStorage Cache.
- Đầy đủ tính năng: Tạo, sửa, xóa ghi chú, chọn màu, checklist với thanh tiến độ xanh lá, gắn mác khẩn cấp và hạn chót.

### 3. ☁️ Đồng bộ Thời gian thực (Firebase Realtime Cloud Sync)
- **2-Way Realtime Sync**: Khi sửa ghi chú trên điện thoại, cửa sổ Sticky Note trên máy tính lập tức cập nhật tự động không cần bấm tải lại.
- **Tài khoản cá nhân**: Đăng nhập/Đăng ký qua Firebase Authentication (Email & Mật khẩu).
- **Máy chủ cục bộ tích hợp**: Desktop app tự động phát hiện IP mạng LAN (ví dụ `http://192.168.1.x:3000`) để bạn mở ngay trên điện thoại khi cùng mạng WiFi.

---

## 🚀 Hướng dẫn khởi chạy

### Trên máy tính:
1. Cài đặt thư viện:
   ```bash
   npm install
   ```
2. Khởi chạy ứng dụng:
   ```bash
   npm start
   ```
   *(Hoặc click đúp chuột vào file `Chay_App.bat` / `Chay_App_An.vbs`)*

### Kết nối với điện thoại:
1. Mở cửa sổ **Hub** trên máy tính, nhấn vào biểu tượng **Đám mây ☁️**.
2. **Đăng nhập** hoặc **Tạo tài khoản** (nếu chưa có).
3. Copy đường link hiển thị (ví dụ `http://192.168.1.15:3000`) và mở trên trình duyệt điện thoại.
4. Đăng nhập cùng tài khoản trên điện thoại.
5. Mọi ghi chú của bạn sẽ đồng bộ lập tức qua lại giữa 2 thiết bị!

---

## 🌐 Triển khai lên Internet (Firebase Hosting)

Nếu muốn truy cập ứng dụng trên điện thoại ở bất kỳ đâu ngoài mạng WiFi nhà:
```bash
npx firebase-tools deploy --only hosting
```
Link truy cập web mobile sẽ có dạng: `https://sticky-note-sync-58b02.web.app`
