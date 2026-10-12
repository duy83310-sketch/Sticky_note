// Controller cho cửa sổ Quản lý Sticky Notes (Hub)

let allNotes = [];
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const notesList = document.getElementById('notesList');
const searchInput = document.getElementById('searchInput');
const footerCount = document.getElementById('footerCount');
const btnHubNew = document.getElementById('btnHubNew');
const btnHubSettings = document.getElementById('btnHubSettings');
const btnHubMinimize = document.getElementById('btnHubMinimize');
const btnHubClose = document.getElementById('btnHubClose');

// Settings Modal Elements
const settingsModal = document.getElementById('settingsModal');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const toggleStartup = document.getElementById('toggleStartup');
const toggleAlwaysOnTop = document.getElementById('toggleAlwaysOnTop');
const toggleSound = document.getElementById('toggleSound');
const pinStatusText = document.getElementById('pinStatusText');
const btnSetPin = document.getElementById('btnSetPin');
const btnRemovePin = document.getElementById('btnRemovePin');
const btnExportData = document.getElementById('btnExportData');
const btnImportData = document.getElementById('btnImportData');
const btnCheckUpdate = document.getElementById('btnCheckUpdate');
const updateMsg = document.getElementById('updateMsg');
const appVersionInfo = document.getElementById('appVersionInfo');

// ── Khởi tạo ────────────────────────────────────────────────────────────────

async function initHub() {
  await loadAndRenderNotes();
  await loadSettings();

  const ver = await window.api.getAppVersion();
  if (ver) {
    document.getElementById('versionLabel').textContent = `v${ver.version}`;
    appVersionInfo.textContent = `v${ver.version} (${ver.channel})`;
  }
}

async function loadAndRenderNotes() {
  allNotes = await window.api.getNotes();

  // Sắp xếp: Ghi chú có deadline khẩn cấp lên đầu, sau đó theo thời gian cập nhật
  allNotes.sort((a, b) => {
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  renderCards();
}

// ── Render danh sách Note Cards ─────────────────────────────────────────────

function renderCards() {
  notesList.innerHTML = '';

  const q = searchQuery.toLowerCase().trim();
  const filtered = allNotes.filter(note => {
    // 1. Tìm kiếm theo từ khóa
    const matchSearch = !q ||
      (note.title || '').toLowerCase().includes(q) ||
      (note.content || '').toLowerCase().includes(q) ||
      (note.checklist || []).some(item => (item.text || '').toLowerCase().includes(q));

    if (!matchSearch) return false;

    // 2. Lọc theo danh mục tab
    if (currentFilter === 'deadline') return !!note.deadline;
    if (currentFilter === 'urgent') {
      if (!note.deadline) return false;
      const diff = new Date(note.deadline).getTime() - Date.now();
      return diff < 6 * 3600 * 1000; // Dưới 6 giờ hoặc quá hạn
    }
    if (currentFilter === 'checklist') return note.type === 'checklist';
    if (currentFilter === 'locked') return !!note.locked;

    return true;
  });

  footerCount.textContent = `${filtered.length} ghi chú${filtered.length !== allNotes.length ? ` (lọc từ ${allNotes.length})` : ''}`;

  if (filtered.length === 0) {
    notesList.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: rgba(255,255,255,0.35); font-size: 12.5px;">
        ${q ? 'Không tìm thấy ghi chú phù hợp' : 'Chưa có ghi chú trong danh mục này.<br>Nhấn nút <strong>+</strong> ở góc trên để tạo mới!'}
      </div>
    `;
    return;
  }

  filtered.forEach(note => {
    const card = document.createElement('article');
    const colorClass = getCardColorClass(note.color);
    card.className = `note-card ${colorClass}`;
    card.dataset.id = note.id;

    // Deadline hoặc timestamp
    const dlInfo = calculateDeadlineInfo(note.deadline);
    const badgeHtml = dlInfo ? `
      <span class="card-badge ${dlInfo.cls}">
        ${dlInfo.text}
      </span>
    ` : `
      <span style="opacity: 0.7; font-size: 10px;">${formatTimeShort(note.updatedAt)}</span>
    `;

    // Nội dung tóm tắt & Thanh tiến độ xanh lá bao trùm theo tỉ lệ
    let cardBodyHtml = '';

    if (note.locked) {
      cardBodyHtml = `<p class="card-excerpt">🔒 Nội dung đã được mã hóa bảo mật bằng mã PIN</p>`;
    } else if (note.type === 'checklist') {
      const items = note.checklist || [];
      const totalCount = items.length;
      const doneCount = items.filter(i => i.done).length;
      const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
      const isComplete = doneCount === totalCount && totalCount > 0;

      // 1. Thanh màu xanh lá bao trùm từ trái sang phải theo tỉ lệ tích (1/3 -> 33%, 2/3 -> 67%, 3/3 -> 100%)
      const progressHtml = `
        <div class="progress-container" style="margin: 4px 0 6px 0;">
          <div class="progress-header">
            <span style="font-size: 10.5px; opacity: 0.85;">${isComplete ? 'Hoàn thành 🎉' : 'Tiến độ'}</span>
            <span class="progress-tag">${doneCount}/${totalCount} (${pct}%)</span>
          </div>
          <div class="progress-track" style="height: 5px;">
            <div class="progress-fill ${isComplete ? 'complete' : ''}" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;

      // 2. Hiển thị dạng list từng dòng riêng biệt
      const visibleItems = items.slice(0, 4);
      const remainingCount = items.length - visibleItems.length;

      const listRowsHtml = visibleItems.map((item, idx) => `
        <div class="card-checklist-row ${item.done ? 'done' : ''}">
          <span class="card-check-bullet">${item.done ? '✓' : ''}</span>
          <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.text || 'Công việc…')}</span>
        </div>
      `).join('');

      const moreHtml = remainingCount > 0 ? `<div class="card-checklist-more">+${remainingCount} mục khác…</div>` : '';

      cardBodyHtml = `
        ${progressHtml}
        <div class="card-checklist-container">
          ${listRowsHtml}
          ${moreHtml}
        </div>
      `;
    } else {
      cardBodyHtml = `<p class="card-excerpt">${escapeHtml(stripHtml(note.content) || 'Chưa có nội dung…')}</p>`;
    }

    card.innerHTML = `
      <div class="card-header">
        <span class="card-title">${escapeHtml(note.title || 'Ghi chú không tên')}</span>
        ${badgeHtml}
      </div>
      ${cardBodyHtml}
      <div class="card-footer">
        <span>${formatDateShort(note.updatedAt)}</span>
        <div class="card-actions">
          <button class="card-btn btn-open" title="Mở ghi chú">Mở</button>
          <button class="card-btn btn-pin" title="${note.pinned !== false ? 'Bỏ ghim' : 'Ghim'}">${note.pinned !== false ? '📌' : '📍'}</button>
          <button class="card-btn card-btn-delete btn-delete" title="Xóa">Xóa</button>
        </div>
      </div>
    `;

    // Click vào thẻ mở ghi chú
    card.addEventListener('click', () => {
      window.api.openNote(note.id);
    });

    // Nút mở
    card.querySelector('.btn-open').addEventListener('click', (e) => {
      e.stopPropagation();
      window.api.openNote(note.id);
    });

    // Nút ghim
    card.querySelector('.btn-pin').addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.api.togglePinNote(note.id);
      await loadAndRenderNotes();
    });

    // Nút xóa
    card.querySelector('.btn-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Xóa ghi chú "${note.title || 'này'}"?`)) {
        await window.api.deleteNote(note.id);
        await loadAndRenderNotes();
      }
    });

    notesList.appendChild(card);
  });
}

function getCardColorClass(color) {
  const map = {
    yellow: 'card-yellow',
    blue: 'card-blue',
    pink: 'card-pink',
    green: 'card-green',
    purple: 'card-purple',
    charcoal: 'card-charcoal',
  };
  return map[color] || 'card-yellow';
}

function calculateDeadlineInfo(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();

  if (diff < 0) {
    return { cls: 'deadline-badge dl-urgent', text: 'Quá hạn!' };
  }
  if (diff < 6 * 3600 * 1000) {
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return {
      cls: 'deadline-badge dl-urgent',
      text: hours > 0 ? `Còn ${hours}g ${mins}p` : `Còn ${mins}p!`,
    };
  }
  if (diff < 24 * 3600 * 1000) {
    return { cls: 'deadline-badge dl-warn', text: 'Hôm nay!' };
  }
  if (diff < 48 * 3600 * 1000) {
    return { cls: 'deadline-badge dl-warn', text: 'Ngày mai' };
  }
  const days = Math.floor(diff / (24 * 3600000));
  return { cls: 'deadline-badge dl-safe', text: `Còn ${days} ngày` };
}

function formatTimeShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// ── Bộ lọc & Tìm kiếm ───────────────────────────────────────────────────────

document.querySelectorAll('.tab-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.tab-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.dataset.filter;
    renderCards();
  });
});

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderCards();
});

// ── Nút Header Hub ──────────────────────────────────────────────────────────

btnHubNew.addEventListener('click', () => {
  window.api.newNote();
});

btnHubMinimize.addEventListener('click', () => {
  window.api.minimizeHub();
});

btnHubClose.addEventListener('click', () => {
  window.api.closeHub();
});

btnHubSettings.addEventListener('click', () => {
  openSettingsModal();
});

btnCloseSettings.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

function openSettingsModal() {
  settingsModal.style.display = 'flex';
  loadSettings();
}

// ── Cài đặt & Quản lý ứng dụng ──────────────────────────────────────────────

async function loadSettings() {
  const settings = await window.api.getSettings();
  if (settings) {
    toggleStartup.checked = !!settings.openAtLogin;
    toggleAlwaysOnTop.checked = !!settings.alwaysOnTop;
    toggleSound.checked = !!settings.soundAlerts;
  }

  const hasPin = await window.api.hasMasterPin();
  if (hasPin) {
    pinStatusText.textContent = 'Đã kích hoạt bảo vệ Master PIN';
    pinStatusText.style.color = '#27ae60';
    btnSetPin.textContent = 'Đổi mã PIN';
    btnRemovePin.style.display = 'inline-block';
  } else {
    pinStatusText.textContent = 'Chưa thiết lập mã PIN chính';
    pinStatusText.style.color = '#eab308';
    btnSetPin.textContent = 'Thiết lập mã PIN';
    btnRemovePin.style.display = 'none';
  }
}

toggleStartup.addEventListener('change', async () => {
  await window.api.updateSettings({ openAtLogin: toggleStartup.checked });
});

toggleAlwaysOnTop.addEventListener('change', async () => {
  await window.api.updateSettings({ alwaysOnTop: toggleAlwaysOnTop.checked });
});

toggleSound.addEventListener('change', async () => {
  await window.api.updateSettings({ soundAlerts: toggleSound.checked });
  if (toggleSound.checked) playChimeSound();
});

// Quản lý Master PIN
btnSetPin.addEventListener('click', async () => {
  const pin = prompt('Nhập mã PIN mới (tối thiểu 4 chữ số):');
  if (pin && pin.trim().length >= 4) {
    const res = await window.api.setMasterPin(pin.trim());
    if (res.success) {
      alert('Đã thiết lập mã PIN bảo mật thành công!');
      loadSettings();
    } else {
      alert(res.message);
    }
  } else if (pin !== null) {
    alert('Mã PIN cần có tối thiểu 4 chữ số!');
  }
});

btnRemovePin.addEventListener('click', async () => {
  const pin = prompt('Nhập mã PIN hiện tại để xác nhận hủy:');
  if (pin) {
    const res = await window.api.removeMasterPin(pin.trim());
    if (res.success) {
      alert('Đã hủy mã PIN chính!');
      loadSettings();
    } else {
      alert(res.message || 'Mã PIN không đúng!');
    }
  }
});

// Sao lưu & Phục hồi
btnExportData.addEventListener('click', async () => {
  const jsonStr = await window.api.exportNotes();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sticky_notes_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

btnImportData.addEventListener('click', async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const res = await window.api.importNotes(event.target.result);
      if (res.success) {
        alert(`Đã khôi phục thành công ${res.count} ghi chú!`);
        await loadAndRenderNotes();
      } else {
        alert(`Lỗi phục hồi: ${res.error}`);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

// Nâng cấp & Kiểm tra cập nhật
btnCheckUpdate.addEventListener('click', async () => {
  btnCheckUpdate.disabled = true;
  btnCheckUpdate.textContent = 'Đang kiểm tra…';
  const info = await window.api.checkForUpdates();
  btnCheckUpdate.disabled = false;
  btnCheckUpdate.textContent = 'Kiểm tra bản cập nhật mới';

  updateMsg.style.display = 'block';
  updateMsg.textContent = `✓ ${info.message}`;
});

// Âm thanh chuông báo (Web Audio API Synthesizer - không cần file audio ngoài)
function playChimeSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } catch (_) {}
}

// ── Lắng nghe sự kiện từ Main ───────────────────────────────────────────────

window.api.onNotesUpdated(() => {
  loadAndRenderNotes();
});

window.api.onOpenSettings(() => {
  openSettingsModal();
});

// Khởi chạy
initHub();
