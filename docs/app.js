/**
 * Sticky Notes Mobile PWA - Companion Controller
 * Real-time 2-way Sync with Desktop via Firebase
 */

const firebaseConfig = {
  apiKey: "AIzaSyASAxAWiqZcAk5_TeV6MVcQ6WioAuyr-3Y",
  authDomain: "sticky-note-sync-58b02.firebaseapp.com",
  databaseURL: "https://sticky-note-sync-58b02-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sticky-note-sync-58b02",
  storageBucket: "sticky-note-sync-58b02.firebasestorage.app",
  messagingSenderId: "169127890229",
  appId: "1:169127890229:web:44cc8d699e29a0c4dc907c"
};

// Initialize Firebase
let firebaseApp, auth, db;
try {
  firebaseApp = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.database();
} catch (e) {
  console.warn('Firebase init error or offline:', e);
}

// State
let localNotes = {};
let noteList = [];
let currentFilter = 'all';
let searchQuery = '';
let currentUser = null;
let editingNoteId = null;
let currentEditColor = 'yellow';
let currentEditType = 'text';
let currentEditChecklist = [];
let authMode = 'login'; // 'login' | 'register'

// DOM References
const notesContainer = document.getElementById('notesContainer');
const searchInput = document.getElementById('searchInput');
const filterChips = document.querySelectorAll('.filter-chip[data-filter]');
const btnFabNew = document.getElementById('btnFabNew');

// Sync & Auth Elements
const syncPill = document.getElementById('syncPill');
const syncDot = document.getElementById('syncDot');
const syncText = document.getElementById('syncText');
const btnAuthModal = document.getElementById('btnAuthModal');
const authModal = document.getElementById('authModal');
const btnCloseAuthModal = document.getElementById('btnCloseAuthModal');
const loggedInView = document.getElementById('loggedInView');
const loggedOutView = document.getElementById('loggedOutView');
const userEmailLabel = document.getElementById('userEmailLabel');
const btnManualSync = document.getElementById('btnManualSync');
const btnLogout = document.getElementById('btnLogout');
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const btnSubmitAuth = document.getElementById('btnSubmitAuth');
const authErrorMsg = document.getElementById('authErrorMsg');

// Note Modal Elements
const noteModal = document.getElementById('noteModal');
const btnCloseNoteModal = document.getElementById('btnCloseNoteModal');
const modalTitle = document.getElementById('modalTitle');
const editTitle = document.getElementById('editTitle');
const btnModeText = document.getElementById('btnModeText');
const btnModeChecklist = document.getElementById('btnModeChecklist');
const groupTextContent = document.getElementById('groupTextContent');
const groupChecklistContent = document.getElementById('groupChecklistContent');
const editContent = document.getElementById('editContent');
const builderList = document.getElementById('builderList');
const btnAddCheckItem = document.getElementById('btnAddCheckItem');
const colorOptions = document.querySelectorAll('.color-option');
const toggleUrgent = document.getElementById('toggleUrgent');
const editDeadline = document.getElementById('editDeadline');
const btnSaveNote = document.getElementById('btnSaveNote');
const btnDeleteNote = document.getElementById('btnDeleteNote');
const toast = document.getElementById('toast');

// ── Khởi tạo Ứng dụng ────────────────────────────────────────────────────────

function init() {
  loadLocalCache();
  renderNotes();
  bindEvents();
  registerServiceWorker();

  // Khởi động Auth Listener
  if (auth) {
    auth.onAuthStateChanged((user) => {
      currentUser = user;
      updateSyncStatusUI();
      if (user) {
        setupCloudListener(user.uid);
      } else {
        renderNotes();
      }
    });
  }
}

function loadLocalCache() {
  try {
    const raw = localStorage.getItem('sticky_notes_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      localNotes = parsed.notes || {};
      noteList = parsed.noteList || Object.keys(localNotes);
    }
  } catch (e) {
    console.warn('Lỗi đọc local cache:', e);
  }
}

function saveLocalCache() {
  try {
    localStorage.setItem('sticky_notes_cache', JSON.stringify({
      notes: localNotes,
      noteList: noteList,
      savedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.warn('Lỗi lưu local cache:', e);
  }
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Firebase Realtime Sync ──────────────────────────────────────────────────

function setupCloudListener(uid) {
  if (!db) return;
  const userNotesRef = db.ref(`users/${uid}/notes`);

  userNotesRef.on('value', (snapshot) => {
    const cloudNotes = snapshot.val();
    if (cloudNotes) {
      // Merge với cache local
      localNotes = cloudNotes;
      noteList = Object.keys(cloudNotes).sort((a, b) => {
        const tA = new Date(cloudNotes[a].updatedAt || 0).getTime();
        const tB = new Date(cloudNotes[b].updatedAt || 0).getTime();
        return tB - tA;
      });
      saveLocalCache();
      renderNotes();
      updateSyncStatusUI(true);
    } else {
      // Nếu cloud chưa có gì nhưng local có, đẩy lên
      if (Object.keys(localNotes).length > 0) {
        db.ref(`users/${uid}/notes`).set(localNotes);
      }
    }
  }, (err) => {
    console.error('Lỗi sync cloud:', err);
    updateSyncStatusUI(false, err.message);
  });
}

function updateSyncStatusUI(isSuccess = true, error = null) {
  if (currentUser) {
    syncDot.className = 'sync-dot ' + (isSuccess ? 'synced' : 'error');
    syncText.textContent = isSuccess ? 'Đã đồng bộ' : 'Lỗi sync';
    userEmailLabel.textContent = currentUser.email;
    loggedInView.style.display = 'flex';
    loggedOutView.style.display = 'none';
  } else {
    syncDot.className = 'sync-dot';
    syncText.textContent = 'Chưa đăng nhập';
    loggedInView.style.display = 'none';
    loggedOutView.style.display = 'flex';
  }
}

// ── Render Notes List ────────────────────────────────────────────────────────

function renderNotes() {
  notesContainer.innerHTML = '';

  const q = searchQuery.toLowerCase().trim();
  const allIds = noteList.length ? noteList : Object.keys(localNotes);

  const filtered = allIds.map(id => localNotes[id]).filter(note => {
    if (!note) return false;

    // Search query
    const matchSearch = !q ||
      (note.title || '').toLowerCase().includes(q) ||
      (note.content || '').toLowerCase().includes(q) ||
      (note.checklist || []).some(item => (item.text || '').toLowerCase().includes(q));

    if (!matchSearch) return false;

    // Filter chip
    if (currentFilter === 'urgent') {
      if (note.isUrgent) return true;
      if (!note.deadline) return false;
      const diff = new Date(note.deadline).getTime() - Date.now();
      return diff < 6 * 3600 * 1000;
    }
    if (currentFilter === 'deadline') return !!note.deadline;
    if (currentFilter === 'checklist') return note.type === 'checklist';
    if (currentFilter === 'pinned') return !!note.pinned;

    return true;
  });

  if (filtered.length === 0) {
    notesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p>${q ? 'Không tìm thấy ghi chú phù hợp' : 'Chưa có ghi chú nào.<br>Nhấn nút <strong>+</strong> để tạo ghi chú mới!'}</p>
      </div>
    `;
    return;
  }

  filtered.forEach(note => {
    const card = document.createElement('div');
    card.className = `note-card theme-${note.color || 'yellow'}`;
    card.onclick = () => openEditModal(note.id);

    // Badges
    let badgesHtml = '';
    if (note.isUrgent) {
      badgesHtml += `<span class="badge badge-urgent">⚡ KHẨN CẤP</span>`;
    }
    if (note.deadline) {
      const dlText = formatDeadlineText(note.deadline);
      badgesHtml += `<span class="badge badge-deadline">⏰ ${dlText}</span>`;
    }
    if (note.pinned) {
      badgesHtml += `<span class="badge badge-pinned">📌 Ghim</span>`;
    }

    // Body content: Checklist vs Text
    let bodyHtml = '';
    if (note.type === 'checklist' && Array.isArray(note.checklist) && note.checklist.length > 0) {
      const total = note.checklist.length;
      const doneCount = note.checklist.filter(i => i.done).length;
      const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

      let listItemsHtml = '';
      // Hiển thị tối đa 4 mục checklist trên card xem trước
      note.checklist.slice(0, 4).forEach(item => {
        listItemsHtml += `
          <div class="checklist-preview-item ${item.done ? 'done' : ''}">
            <div class="custom-checkbox ${item.done ? 'checked' : ''}">
              ${item.done ? '✓' : ''}
            </div>
            <span>${escapeHtml(item.text || '')}</span>
          </div>
        `;
      });

      if (total > 4) {
        listItemsHtml += `<div style="font-size: 11px; opacity: 0.6; padding-left: 25px;">+${total - 4} mục khác...</div>`;
      }

      // Proportional Green Progress Bar (theo đúng yêu cầu của người dùng)
      const progressBarHtml = `
        <div class="checklist-progress-wrap">
          <div class="progress-header">
            <span>Tiến độ hoàn thành</span>
            <span>${doneCount}/${total} (${percent}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;

      bodyHtml = `
        <div class="checklist-preview-list">
          ${listItemsHtml}
        </div>
        ${progressBarHtml}
      `;
    } else {
      bodyHtml = `
        <div class="card-content">${escapeHtml(note.content || 'Không có nội dung')}</div>
      `;
    }

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">${escapeHtml(note.title || 'Ghi chú')}</div>
        <div class="card-actions">
          <button class="card-btn-icon" onclick="event.stopPropagation(); togglePinNote('${note.id}')" title="Ghim">
            ${note.pinned ? '📌' : '📍'}
          </button>
        </div>
      </div>
      ${badgesHtml ? `<div class="card-badges">${badgesHtml}</div>` : ''}
      ${bodyHtml}
    `;

    notesContainer.appendChild(card);
  });
}

function formatDeadlineText(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Quá hạn';
  const hours = Math.floor(diff / (1000 * 3600));
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
    return `Còn ${mins} phút`;
  }
  if (hours < 24) return `Còn ${hours} giờ`;
  const days = Math.floor(hours / 24);
  return `Còn ${days} ngày`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// ── Note Modal Controller ───────────────────────────────────────────────────

function openNewModal() {
  editingNoteId = null;
  modalTitle.textContent = 'Ghi chú mới';
  editTitle.value = '';
  editContent.value = '';
  currentEditType = 'text';
  currentEditColor = 'yellow';
  currentEditChecklist = [];
  toggleUrgent.checked = false;
  editDeadline.value = '';
  btnDeleteNote.style.display = 'none';

  updateModalTypeUI();
  updateModalColorUI();
  noteModal.classList.add('active');
  setTimeout(() => editTitle.focus(), 150);
}

function openEditModal(id) {
  const note = localNotes[id];
  if (!note) return;

  editingNoteId = id;
  modalTitle.textContent = 'Chỉnh sửa ghi chú';
  editTitle.value = note.title || '';
  editContent.value = note.content || '';
  currentEditType = note.type || 'text';
  currentEditColor = note.color || 'yellow';
  currentEditChecklist = (note.checklist || []).map(i => ({ ...i }));
  toggleUrgent.checked = !!note.isUrgent;

  if (note.deadline) {
    const d = new Date(note.deadline);
    // Định dạng YYYY-MM-DDTHH:mm cho datetime-local
    const pad = n => String(n).padStart(2, '0');
    editDeadline.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    editDeadline.value = '';
  }

  btnDeleteNote.style.display = 'block';

  updateModalTypeUI();
  updateModalColorUI();
  renderChecklistBuilder();
  noteModal.classList.add('active');
}

function closeNoteModal() {
  noteModal.classList.remove('active');
}

function updateModalTypeUI() {
  if (currentEditType === 'text') {
    btnModeText.classList.add('active');
    btnModeChecklist.classList.remove('active');
    groupTextContent.style.display = 'flex';
    groupChecklistContent.style.display = 'none';
  } else {
    btnModeText.classList.remove('active');
    btnModeChecklist.classList.add('active');
    groupTextContent.style.display = 'none';
    groupChecklistContent.style.display = 'flex';
    renderChecklistBuilder();
  }
}

function updateModalColorUI() {
  colorOptions.forEach(opt => {
    if (opt.dataset.color === currentEditColor) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });
}

function renderChecklistBuilder() {
  builderList.innerHTML = '';
  currentEditChecklist.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'builder-item';
    row.innerHTML = `
      <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleBuilderItem(${index})">
      <input type="text" value="${escapeHtml(item.text || '')}" placeholder="Nội dung mục..." oninput="updateBuilderItemText(${index}, this.value)">
      <button type="button" class="btn-remove-item" onclick="removeBuilderItem(${index})">✕</button>
    `;
    builderList.appendChild(row);
  });
}

window.toggleBuilderItem = (index) => {
  if (currentEditChecklist[index]) {
    currentEditChecklist[index].done = !currentEditChecklist[index].done;
  }
};

window.updateBuilderItemText = (index, val) => {
  if (currentEditChecklist[index]) {
    currentEditChecklist[index].text = val;
  }
};

window.removeBuilderItem = (index) => {
  currentEditChecklist.splice(index, 1);
  renderChecklistBuilder();
};

function addBuilderItem() {
  currentEditChecklist.push({
    id: 'c_' + Date.now(),
    text: '',
    done: false
  });
  renderChecklistBuilder();
  const inputs = builderList.querySelectorAll('input[type="text"]');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

async function saveCurrentNote() {
  const id = editingNoteId || `note_${Date.now()}`;
  const now = new Date().toISOString();

  let dlVal = null;
  if (editDeadline.value) {
    dlVal = new Date(editDeadline.value).toISOString();
  } else if (toggleUrgent.checked) {
    // Mặc định khẩn cấp 2 giờ
    dlVal = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
  }

  const noteObj = {
    id,
    title: editTitle.value.trim() || 'Ghi chú mới',
    type: currentEditType,
    content: editContent.value,
    checklist: currentEditType === 'checklist' ? currentEditChecklist.filter(i => (i.text || '').trim()) : [],
    color: currentEditColor,
    isUrgent: toggleUrgent.checked,
    deadline: dlVal,
    pinned: editingNoteId && localNotes[editingNoteId] ? localNotes[editingNoteId].pinned : false,
    updatedAt: now,
    createdAt: editingNoteId && localNotes[editingNoteId] ? (localNotes[editingNoteId].createdAt || now) : now
  };

  localNotes[id] = noteObj;
  if (!noteList.includes(id)) {
    noteList.unshift(id);
  }

  saveLocalCache();
  renderNotes();
  closeNoteModal();
  showToast('Đã lưu ghi chú');

  // Đẩy lên Firebase Cloud tức thì
  if (currentUser && db) {
    try {
      await db.ref(`users/${currentUser.uid}/notes/${id}`).set(noteObj);
      showToast('Đã đồng bộ lên Cloud');
    } catch (e) {
      console.warn('Lỗi đẩy note lên cloud:', e);
    }
  }
}

async function deleteCurrentNote() {
  if (!editingNoteId) return;
  if (!confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return;

  const id = editingNoteId;
  delete localNotes[id];
  noteList = noteList.filter(item => item !== id);

  saveLocalCache();
  renderNotes();
  closeNoteModal();
  showToast('Đã xóa ghi chú');

  if (currentUser && db) {
    try {
      await db.ref(`users/${currentUser.uid}/notes/${id}`).remove();
    } catch (e) {
      console.warn('Lỗi xóa note trên cloud:', e);
    }
  }
}

async function togglePinNote(id) {
  if (!localNotes[id]) return;
  localNotes[id].pinned = !localNotes[id].pinned;
  localNotes[id].updatedAt = new Date().toISOString();
  saveLocalCache();
  renderNotes();

  if (currentUser && db) {
    try {
      await db.ref(`users/${currentUser.uid}/notes/${id}/pinned`).set(localNotes[id].pinned);
    } catch (e) {}
  }
}

// ── Auth & Firebase Events ──────────────────────────────────────────────────

function bindEvents() {
  // Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderNotes();
  });

  // Filter chips
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderNotes();
    });
  });

  // FAB
  btnFabNew.addEventListener('click', openNewModal);
  btnCloseNoteModal.addEventListener('click', closeNoteModal);
  btnSaveNote.addEventListener('click', saveCurrentNote);
  btnDeleteNote.addEventListener('click', deleteCurrentNote);

  // Mode buttons
  btnModeText.addEventListener('click', () => {
    currentEditType = 'text';
    updateModalTypeUI();
  });
  btnModeChecklist.addEventListener('click', () => {
    currentEditType = 'checklist';
    updateModalTypeUI();
  });

  // Checklist builder
  btnAddCheckItem.addEventListener('click', addBuilderItem);

  // Color picker
  colorOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      currentEditColor = opt.dataset.color;
      updateModalColorUI();
    });
  });

  // Auth Modal
  syncPill.addEventListener('click', () => authModal.classList.add('active'));
  btnAuthModal.addEventListener('click', () => authModal.classList.add('active'));
  btnCloseAuthModal.addEventListener('click', () => authModal.classList.remove('active'));

  tabLogin.addEventListener('click', () => {
    authMode = 'login';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    btnSubmitAuth.textContent = 'Đăng nhập';
    authErrorMsg.style.display = 'none';
  });

  tabRegister.addEventListener('click', () => {
    authMode = 'register';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    btnSubmitAuth.textContent = 'Tạo tài khoản mới';
    authErrorMsg.style.display = 'none';
  });

  btnSubmitAuth.addEventListener('click', handleAuthSubmit);
  btnLogout.addEventListener('click', handleLogout);
  btnManualSync.addEventListener('click', handleManualSync);
}

async function handleAuthSubmit() {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  authErrorMsg.style.display = 'none';

  if (!email || !password) {
    authErrorMsg.textContent = 'Vui lòng nhập đầy đủ Email và Mật khẩu!';
    authErrorMsg.style.display = 'block';
    return;
  }

  btnSubmitAuth.disabled = true;
  btnSubmitAuth.textContent = 'Đang xử lý...';

  try {
    if (authMode === 'login') {
      await auth.signInWithEmailAndPassword(email, password);
      showToast('Đăng nhập thành công');
    } else {
      await auth.createUserWithEmailAndPassword(email, password);
      showToast('Đăng ký thành công');
    }
    authModal.classList.remove('active');
  } catch (err) {
    authErrorMsg.textContent = translateError(err.code || err.message);
    authErrorMsg.style.display = 'block';
  } finally {
    btnSubmitAuth.disabled = false;
    btnSubmitAuth.textContent = authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản mới';
  }
}

async function handleLogout() {
  if (!confirm('Bạn có muốn đăng xuất tài khoản?')) return;
  try {
    await auth.signOut();
    showToast('Đã đăng xuất');
    authModal.classList.remove('active');
  } catch (e) {
    alert(e.message);
  }
}

async function handleManualSync() {
  if (!currentUser || !db) return;
  btnManualSync.textContent = 'Đang đồng bộ...';
  try {
    const snap = await db.ref(`users/${currentUser.uid}/notes`).once('value');
    const cloudNotes = snap.val() || {};
    localNotes = cloudNotes;
    noteList = Object.keys(cloudNotes);
    saveLocalCache();
    renderNotes();
    showToast('Đã đồng bộ dữ liệu mới nhất');
  } catch (e) {
    showToast('Lỗi đồng bộ: ' + e.message);
  } finally {
    btnManualSync.textContent = '🔄 Đồng bộ ngay';
  }
}

function translateError(code) {
  if (code.includes('invalid-credential') || code.includes('wrong-password')) {
    return 'Email hoặc mật khẩu không chính xác';
  }
  if (code.includes('user-not-found')) {
    return 'Tài khoản không tồn tại. Vui lòng chuyển sang tab Đăng ký';
  }
  if (code.includes('email-already-in-use')) {
    return 'Email này đã có người đăng ký';
  }
  if (code.includes('weak-password')) {
    return 'Mật khẩu phải từ 6 ký tự trở lên';
  }
  return 'Lỗi: ' + code;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW register error:', err);
    });
  }
}

// Chạy khởi động
document.addEventListener('DOMContentLoaded', init);
