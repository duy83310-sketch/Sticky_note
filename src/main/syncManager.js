const { initializeApp, getApps } = require('firebase/app');
const {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} = require('firebase/auth');
const {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  off,
  remove
} = require('firebase/database');
const firebaseConfig = require('../config/firebaseConfig');

class SyncManager {
  constructor(store, windowManager) {
    this.store = store;
    this.windowManager = windowManager;
    this.app = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.isSyncing = false;
    this.lastSyncedAt = null;
    this.lastError = null;
    this.isApplyingCloudUpdate = false;
    this.notesListenerRef = null;

    this.initFirebase();
  }

  initFirebase() {
    try {
      if (!getApps().length) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApps()[0];
      }
      this.auth = getAuth(this.app);
      this.db = getDatabase(this.app);

      // Theo dõi trạng thái đăng nhập
      onAuthStateChanged(this.auth, (user) => {
        if (user) {
          this.currentUser = {
            uid: user.uid,
            email: user.email,
          };
          this.setupRealtimeListener(user.uid);
          this.broadcastStatus();
        } else {
          this.cleanupListener();
          this.currentUser = null;
          this.broadcastStatus();
        }
      });

      // Tự động khôi phục đăng nhập nếu có thông tin lưu trữ an toàn trong settings
      this.autoLoginIfSaved();
    } catch (err) {
      console.error('[SyncManager] Lỗi khởi tạo Firebase:', err);
      this.lastError = err.message;
    }
  }

  async autoLoginIfSaved() {
    try {
      const settings = this.store.getSettings();
      if (settings && settings.cloudAuth && settings.cloudAuth.email && settings.cloudAuth.password) {
        await this.login(settings.cloudAuth.email, settings.cloudAuth.password, false);
      }
    } catch (err) {
      console.warn('[SyncManager] Tự động đăng nhập thất bại:', err.message);
    }
  }

  getStatus() {
    return {
      loggedIn: !!this.currentUser,
      user: this.currentUser,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      error: this.lastError,
    };
  }

  broadcastStatus() {
    if (this.windowManager) {
      this.windowManager.sendToHub('sync-status-changed', this.getStatus());
    }
  }

  setupRealtimeListener(uid) {
    this.cleanupListener();

    const notesRef = ref(this.db, `users/${uid}/notes`);
    this.notesListenerRef = notesRef;

    onValue(notesRef, (snapshot) => {
      if (this.isSyncing) return; // Tránh xung đột khi đang chủ động sync
      const cloudNotes = snapshot.val();
      this.handleIncomingCloudNotes(cloudNotes, uid);
    }, (error) => {
      console.error('[SyncManager] Lỗi lắng nghe Realtime Database:', error);
      this.lastError = error.message;
      this.broadcastStatus();
    });
  }

  cleanupListener() {
    if (this.notesListenerRef) {
      try {
        off(this.notesListenerRef);
      } catch (_) {}
      this.notesListenerRef = null;
    }
  }

  handleIncomingCloudNotes(cloudNotes, uid) {
    if (!cloudNotes) {
      // Nếu cloud trống rỗng nhưng local có note, tự động đồng bộ local lên cloud lần đầu
      const localNotes = this.store.getAllNotes();
      if (localNotes.length > 0) {
        this.pushAllLocalNotes(uid);
      }
      return;
    }

    this.isApplyingCloudUpdate = true;
    let hasChanges = false;

    try {
      const currentNotes = this.store.data.notes || {};
      const cloudNoteList = Object.keys(cloudNotes);

      // 1. Cập nhật hoặc thêm ghi chú từ Cloud vào Local
      for (const id of cloudNoteList) {
        const cNote = cloudNotes[id];
        if (!cNote) continue;

        const lNote = currentNotes[id];
        if (!lNote) {
          // Note mới từ Cloud (tạo từ điện thoại)
          currentNotes[id] = cNote;
          if (!this.store.data.noteList.includes(id)) {
            this.store.data.noteList.unshift(id);
          }
          hasChanges = true;
        } else {
          // So sánh thời gian cập nhật
          const cTime = new Date(cNote.updatedAt || 0).getTime();
          const lTime = new Date(lNote.updatedAt || 0).getTime();
          if (cTime > lTime) {
            // Cloud mới hơn -> ghi đè local
            currentNotes[id] = { ...lNote, ...cNote };
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        this.store.save();
        this.lastSyncedAt = new Date().toISOString();
        if (this.windowManager) {
          this.windowManager.notifyNotesUpdated();
        }
      }
    } catch (err) {
      console.error('[SyncManager] Lỗi áp dụng dữ liệu từ Cloud:', err);
    } finally {
      this.isApplyingCloudUpdate = false;
      this.broadcastStatus();
    }
  }

  async login(email, password, remember = true) {
    try {
      this.isSyncing = true;
      this.lastError = null;
      this.broadcastStatus();

      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      this.currentUser = {
        uid: cred.user.uid,
        email: cred.user.email,
      };

      if (remember) {
        this.store.updateSettings({
          cloudAuth: { email, password }
        });
      }

      // Khởi tạo listener
      this.setupRealtimeListener(cred.user.uid);

      // Thực hiện đồng bộ 2 chiều ngay lập tức
      await this.syncNow();

      return { success: true, user: this.currentUser };
    } catch (err) {
      console.error('[SyncManager] Đăng nhập thất bại:', err);
      this.lastError = this.translateFirebaseError(err.code || err.message);
      return { success: false, error: this.lastError };
    } finally {
      this.isSyncing = false;
      this.broadcastStatus();
    }
  }

  async register(email, password) {
    try {
      this.isSyncing = true;
      this.lastError = null;
      this.broadcastStatus();

      const cred = await createUserWithEmailAndPassword(this.auth, email, password);
      this.currentUser = {
        uid: cred.user.uid,
        email: cred.user.email,
      };

      this.store.updateSettings({
        cloudAuth: { email, password }
      });

      this.setupRealtimeListener(cred.user.uid);

      // Đẩy tất cả dữ liệu ghi chú hiện tại lên tài khoản mới
      await this.pushAllLocalNotes(cred.user.uid);

      return { success: true, user: this.currentUser };
    } catch (err) {
      console.error('[SyncManager] Đăng ký thất bại:', err);
      this.lastError = this.translateFirebaseError(err.code || err.message);
      return { success: false, error: this.lastError };
    } finally {
      this.isSyncing = false;
      this.broadcastStatus();
    }
  }

  async logout() {
    try {
      this.cleanupListener();
      await signOut(this.auth);
      this.currentUser = null;
      this.store.updateSettings({
        cloudAuth: null
      });
      this.broadcastStatus();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Đẩy tất cả ghi chú local lên Cloud
  async pushAllLocalNotes(uid) {
    const targetUid = uid || (this.currentUser && this.currentUser.uid);
    if (!targetUid) return;

    try {
      const allNotes = this.store.data.notes || {};
      const noteList = this.store.data.noteList || [];
      const notesRef = ref(this.db, `users/${targetUid}/notes`);
      const listRef = ref(this.db, `users/${targetUid}/noteList`);

      await set(notesRef, allNotes);
      await set(listRef, noteList);
      this.lastSyncedAt = new Date().toISOString();
    } catch (err) {
      console.error('[SyncManager] Lỗi đẩy toàn bộ ghi chú lên cloud:', err);
      throw err;
    }
  }

  // Đồng bộ 2 chiều thủ công
  async syncNow() {
    if (!this.currentUser) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    try {
      this.isSyncing = true;
      this.broadcastStatus();

      const uid = this.currentUser.uid;
      const snapshot = await get(ref(this.db, `users/${uid}/notes`));
      const cloudNotes = snapshot.val() || {};

      this.handleIncomingCloudNotes(cloudNotes, uid);

      // Đẩy các ghi chú local mới hơn lên cloud
      const currentNotes = this.store.data.notes || {};
      for (const [id, note] of Object.entries(currentNotes)) {
        const cNote = cloudNotes[id];
        if (!cNote || new Date(note.updatedAt || 0) > new Date(cNote.updatedAt || 0)) {
          await set(ref(this.db, `users/${uid}/notes/${id}`), note);
        }
      }

      await set(ref(this.db, `users/${uid}/noteList`), this.store.data.noteList);
      this.lastSyncedAt = new Date().toISOString();
      this.lastError = null;
      return { success: true };
    } catch (err) {
      console.error('[SyncManager] Lỗi syncNow:', err);
      this.lastError = err.message;
      return { success: false, error: err.message };
    } finally {
      this.isSyncing = false;
      this.broadcastStatus();
    }
  }

  // Hook gọi khi local note được tạo hoặc sửa đổi
  onLocalNoteSaved(note) {
    if (!this.currentUser || this.isApplyingCloudUpdate || !note || !note.id) return;
    try {
      const uid = this.currentUser.uid;
      set(ref(this.db, `users/${uid}/notes/${note.id}`), note);
      set(ref(this.db, `users/${uid}/noteList`), this.store.data.noteList);
      this.lastSyncedAt = new Date().toISOString();
    } catch (err) {
      console.error('[SyncManager] Lỗi push note lên cloud:', err);
    }
  }

  // Hook gọi khi local note bị xóa
  onLocalNoteDeleted(noteId) {
    if (!this.currentUser || this.isApplyingCloudUpdate || !noteId) return;
    try {
      const uid = this.currentUser.uid;
      remove(ref(this.db, `users/${uid}/notes/${noteId}`));
      set(ref(this.db, `users/${uid}/noteList`), this.store.data.noteList);
      this.lastSyncedAt = new Date().toISOString();
    } catch (err) {
      console.error('[SyncManager] Lỗi xóa note trên cloud:', err);
    }
  }

  translateFirebaseError(code) {
    if (!code) return 'Lỗi kết nối Firebase';
    if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
      return 'Email hoặc mật khẩu không chính xác';
    }
    if (code.includes('auth/user-not-found')) {
      return 'Tài khoản không tồn tại. Vui lòng chuyển sang tab Đăng ký';
    }
    if (code.includes('auth/email-already-in-use')) {
      return 'Email này đã được đăng ký tài khoản';
    }
    if (code.includes('auth/weak-password')) {
      return 'Mật khẩu cần tối thiểu 6 ký tự';
    }
    if (code.includes('auth/invalid-email')) {
      return 'Địa chỉ email không đúng định dạng';
    }
    if (code.includes('auth/network-request-failed')) {
      return 'Lỗi mạng, vui lòng kiểm tra kết nối Internet';
    }
    return code;
  }
}

module.exports = SyncManager;
