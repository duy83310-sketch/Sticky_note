// Controller cho cửa sổ Sticky Note
const urlParams = new URLSearchParams(window.location.search);
const noteId = urlParams.get('id');

let currentNote = null;
let saveTimer = null;

// DOM Elements
const body = document.body;
const noteTitle = document.getElementById('noteTitle');
const noteEditor = document.getElementById('noteEditor');
const checklistView = document.getElementById('checklistView');
const btnAddCheckItem = document.getElementById('btnAddCheckItem');
const deadlineBanner = document.getElementById('deadlineBanner');
const dlDot = document.getElementById('dlDot');
const dlTimeText = document.getElementById('dlTimeText');
const dlBadgeText = document.getElementById('dlBadgeText');

// Progress Bar Elements
const checklistProgress = document.getElementById('checklistProgress');
const progressLabelText = document.getElementById('progressLabelText');
const progressTagText = document.getElementById('progressTagText');
const progressFillBar = document.getElementById('progressFillBar');

// Flyouts
const menuFlyout = document.getElementById('menuFlyout');
const deadlineFlyout = document.getElementById('deadlineFlyout');
const btnMenu = document.getElementById('btnMenu');
const btnPin = document.getElementById('btnPin');
const btnClose = document.getElementById('btnClose');
const btnNewNote = document.getElementById('btnNewNote');
const btnOpenDeadline = document.getElementById('btnOpenDeadline');
const customDlInput = document.getElementById('customDlInput');

// Lock Screen
const lockScreen = document.getElementById('lockScreen');
const pinUnlockInput = document.getElementById('pinUnlockInput');
const btnSubmitUnlock = document.getElementById('btnSubmitUnlock');
const unlockError = document.getElementById('unlockError');

// ── Khởi tạo & Tải dữ liệu ──────────────────────────────────────────────────

async function initNote() {
  if (!noteId) return;
  currentNote = await window.api.getNote(noteId);
  if (!currentNote) return;

  renderNote();
}

function renderNote() {
  // 1. Áp dụng Theme
  applyTheme(currentNote.color || 'yellow');

  // 2. Trạng thái Ghim
  updatePinButton(currentNote.pinned !== false);

  // 3. Khóa bảo vệ
  if (currentNote.locked) {
    showLockScreen(true);
    return;
  } else {
    showLockScreen(false);
  }

  // 4. Tiêu đề
  noteTitle.value = currentNote.title || '';

  // 5. Chế độ hiển thị: Checklist hoặc Rich Text
  if (currentNote.type === 'checklist') {
    checklistView.style.display = 'flex';
    btnAddCheckItem.style.display = 'flex';
    noteEditor.style.display = 'none';
    renderChecklist();
    updateChecklistProgress();
  } else {
    if (checklistProgress) checklistProgress.style.display = 'none';
    checklistView.style.display = 'none';
    btnAddCheckItem.style.display = 'none';
    noteEditor.style.display = 'block';
    noteEditor.innerHTML = currentNote.content || '';
  }

  // 6. Deadline
  renderDeadline();
}

// ── Theme / Màu sắc ──────────────────────────────────────────────────────────

function applyTheme(color) {
  body.className = `theme-${color}`;
  if (currentNote) currentNote.color = color;
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.classList.toggle('active', swatch.dataset.color === color);
  });
}

document.querySelectorAll('.color-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    applyTheme(swatch.dataset.color);
    closeFlyouts();
    scheduleSave();
  });
});

// ── Deadline Engine ─────────────────────────────────────────────────────────

function renderDeadline() {
  if (!currentNote || !currentNote.deadline) {
    deadlineBanner.style.display = 'none';
    return;
  }

  deadlineBanner.style.display = 'flex';
  const targetDate = new Date(currentNote.deadline);
  const now = Date.now();
  const diffMs = targetDate.getTime() - now;

  // Format thời gian hiển thị
  const isToday = targetDate.toDateString() === new Date().toDateString();
  const timeStr = targetDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = targetDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  dlTimeText.textContent = isToday ? `${timeStr} hôm nay` : `${timeStr} ngày ${dateStr}`;

  // 3 cấp độ: Safe (>48h) / Warning (24-48h) / Urgent (<6h hoặc quá hạn)
  dlDot.classList.remove('pulse-beacon');
  dlBadgeText.className = 'deadline-badge';

  if (diffMs < 0) {
    dlDot.style.background = '#D13438';
    dlDot.classList.add('pulse-beacon');
    dlBadgeText.classList.add('dl-urgent');
    dlBadgeText.textContent = 'Quá hạn!';
  } else if (diffMs < 6 * 3600 * 1000) {
    dlDot.style.background = '#D13438';
    dlDot.classList.add('pulse-beacon');
    dlBadgeText.classList.add('dl-urgent');
    dlBadgeText.textContent = `Còn ${formatCountdown(diffMs)}`;
  } else if (diffMs < 48 * 3600 * 1000) {
    dlDot.style.background = '#D83B01';
    dlBadgeText.classList.add('dl-warn');
    dlBadgeText.textContent = `Còn ${formatCountdown(diffMs)}`;
  } else {
    dlDot.style.background = '#107C41';
    dlBadgeText.classList.add('dl-safe');
    dlBadgeText.textContent = `Còn ${formatCountdown(diffMs)}`;
  }
}

function formatCountdown(ms) {
  const hours = Math.floor(ms / (3600 * 1000));
  const minutes = Math.floor((ms % (3600 * 1000)) / (60 * 1000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} ngày`;
  }
  if (hours > 0) return `${hours} giờ`;
  return `${Math.max(1, minutes)} phút`;
}

// Cập nhật deadline mỗi 30s
setInterval(renderDeadline, 30000);

// Deadline Popover & Presets
deadlineBanner.addEventListener('click', openDeadlineFlyout);
btnOpenDeadline.addEventListener('click', openDeadlineFlyout);

function openDeadlineFlyout(e) {
  e.stopPropagation();
  closeFlyouts();
  deadlineFlyout.style.display = 'block';
  if (currentNote?.deadline) {
    const localIso = new Date(new Date(currentNote.deadline).getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    customDlInput.value = localIso;
  } else {
    customDlInput.value = '';
  }
}

document.getElementById('quickDl2h').addEventListener('click', () => {
  setDeadlineTime(new Date(Date.now() + 2 * 3600 * 1000));
});

document.getElementById('quickDlToday').addEventListener('click', () => {
  const d = new Date();
  d.setHours(17, 30, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  setDeadlineTime(d);
});

document.getElementById('quickDlTonight').addEventListener('click', () => {
  const d = new Date();
  d.setHours(21, 0, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  setDeadlineTime(d);
});

document.getElementById('quickDlTomorrow').addEventListener('click', () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  setDeadlineTime(d);
});

document.getElementById('btnSaveDeadline').addEventListener('click', () => {
  if (customDlInput.value) {
    setDeadlineTime(new Date(customDlInput.value));
  } else {
    setDeadlineTime(null);
  }
});

document.getElementById('btnClearDeadline').addEventListener('click', () => {
  setDeadlineTime(null);
});

function setDeadlineTime(dateObj) {
  if (currentNote) {
    currentNote.deadline = dateObj ? dateObj.toISOString() : null;
    renderDeadline();
    scheduleSave();
  }
  closeFlyouts();
}

// ── Checklist Engine & Progress Bar ─────────────────────────────────────────

function updateChecklistProgress() {
  if (!currentNote || currentNote.type !== 'checklist') {
    if (checklistProgress) checklistProgress.style.display = 'none';
    return;
  }
  const items = currentNote.checklist || [];
  if (items.length === 0) {
    if (checklistProgress) checklistProgress.style.display = 'none';
    return;
  }

  if (checklistProgress) checklistProgress.style.display = 'flex';
  const totalCount = items.length;
  const doneCount = items.filter(i => i.done).length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (progressFillBar) {
    // Màu xanh lá bao trùm theo tỉ lệ tích (1/3 -> 33%, 2/3 -> 67%, 3/3 -> 100%)
    progressFillBar.style.width = `${pct}%`;
    progressFillBar.classList.toggle('complete', doneCount === totalCount && totalCount > 0);
  }

  if (progressTagText) {
    progressTagText.textContent = `${doneCount}/${totalCount} (${pct}%)`;
  }

  if (progressLabelText) {
    progressLabelText.textContent = (doneCount === totalCount && totalCount > 0)
      ? 'Hoàn thành tất cả! 🎉'
      : `Tiến độ: ${doneCount}/${totalCount} (${pct}%)`;
  }
}

function renderChecklist() {
  checklistView.innerHTML = '';
  const items = currentNote.checklist || [];

  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'check-item';

    // Số thứ tự danh sách (1., 2., 3.)
    const numberSpan = document.createElement('span');
    numberSpan.className = 'check-number';
    numberSpan.textContent = `${index + 1}.`;

    // Ô Checkbox tùy chỉnh dạng Fluent
    const customCheck = document.createElement('div');
    customCheck.className = `custom-checkbox ${item.done ? 'checked' : ''}`;
    customCheck.innerHTML = item.done ? '✓' : '';
    customCheck.title = item.done ? 'Bỏ chọn' : 'Đánh dấu hoàn thành';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = `check-input ${item.done ? 'done' : ''}`;
    textInput.value = item.text || '';
    textInput.placeholder = 'Nội dung công việc…';

    // Toggle hoàn thành khi bấm vào ô checkbox
    customCheck.addEventListener('click', () => {
      item.done = !item.done;
      customCheck.classList.toggle('checked', item.done);
      customCheck.innerHTML = item.done ? '✓' : '';
      textInput.classList.toggle('done', item.done);
      updateChecklistProgress();
      scheduleSave();
    });

    textInput.addEventListener('input', () => {
      item.text = textInput.value;
      scheduleSave();
    });

    // Nhấn Enter tạo dòng tiếp theo ngay phía dưới
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        insertCheckItem(index + 1);
      }
    });

    const btnDel = document.createElement('button');
    btnDel.className = 'btn-del-item';
    btnDel.innerHTML = '✕';
    btnDel.title = 'Xóa mục này';
    btnDel.addEventListener('click', () => {
      items.splice(index, 1);
      renderChecklist();
      updateChecklistProgress();
      scheduleSave();
    });

    row.appendChild(numberSpan);
    row.appendChild(customCheck);
    row.appendChild(textInput);
    row.appendChild(btnDel);
    checklistView.appendChild(row);
  });

  updateChecklistProgress();
}

function insertCheckItem(atIndex) {
  if (!currentNote.checklist) currentNote.checklist = [];
  const newItem = { id: `c_${Date.now()}`, text: '', done: false };
  if (typeof atIndex === 'number') {
    currentNote.checklist.splice(atIndex, 0, newItem);
  } else {
    currentNote.checklist.push(newItem);
  }
  renderChecklist();
  updateChecklistProgress();
  scheduleSave();

  // Focus vào ô vừa tạo
  setTimeout(() => {
    const inputs = checklistView.querySelectorAll('.check-input');
    const targetIdx = typeof atIndex === 'number' ? atIndex : inputs.length - 1;
    if (inputs[targetIdx]) inputs[targetIdx].focus();
  }, 50);
}

btnAddCheckItem.addEventListener('click', () => insertCheckItem());

// Chuyển đổi qua lại giữa Checklist và Free Note
document.getElementById('btnToggleChecklist').addEventListener('click', toggleNoteMode);
document.getElementById('menuModeChecklist').addEventListener('click', () => {
  toggleNoteMode();
  closeFlyouts();
});

function toggleNoteMode() {
  if (currentNote.type === 'checklist') {
    // Chuyển sang text
    currentNote.type = 'text';
    const textList = (currentNote.checklist || []).map(i => `${i.done ? '☑' : '☐'} ${i.text}`).join('<br>');
    currentNote.content = textList || currentNote.content;
  } else {
    // Chuyển sang checklist
    currentNote.type = 'checklist';
    if (!currentNote.checklist || currentNote.checklist.length === 0) {
      currentNote.checklist = [
        { id: 'c1', text: 'Mục công việc 1', done: false },
        { id: 'c2', text: 'Mục công việc 2', done: false }
      ];
    }
  }
  renderNote();
  scheduleSave();
}

// ── Rich Text Format Tools ──────────────────────────────────────────────────

function execFormat(command) {
  if (currentNote.type === 'checklist') return;
  noteEditor.focus();
  document.execCommand(command, false, null);
  scheduleSave();
}

document.getElementById('fmtBold').addEventListener('click', () => execFormat('bold'));
document.getElementById('fmtItalic').addEventListener('click', () => execFormat('italic'));
document.getElementById('fmtUnderline').addEventListener('click', () => execFormat('underline'));
document.getElementById('fmtStrike').addEventListener('click', () => execFormat('strikeThrough'));

// ── Lưu dữ liệu tự động (Debounced Auto-save) ───────────────────────────────

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNoteData, 400);
}

async function saveNoteData() {
  if (!currentNote || currentNote.locked) return;

  currentNote.title = noteTitle.value.trim();
  if (currentNote.type === 'text') {
    currentNote.content = noteEditor.innerHTML;
  }

  await window.api.saveNote(currentNote);
}

noteTitle.addEventListener('input', scheduleSave);
noteEditor.addEventListener('input', scheduleSave);

// ── Pin / Header Controls ───────────────────────────────────────────────────

function updatePinButton(isPinned) {
  btnPin.style.opacity = isPinned ? '1' : '0.4';
  btnPin.title = isPinned ? 'Bỏ ghim trên cùng' : 'Ghim trên cùng';
}

btnPin.addEventListener('click', async () => {
  const isPinned = await window.api.togglePinNote(noteId);
  if (currentNote) currentNote.pinned = isPinned;
  updatePinButton(isPinned);
});

btnNewNote.addEventListener('click', () => {
  window.api.newNote();
});

btnClose.addEventListener('click', async () => {
  await saveNoteData();
  window.api.closeNoteWindow(noteId);
});

// ── Flyouts & Outside Click ─────────────────────────────────────────────────

btnMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  closeFlyouts();
  menuFlyout.style.display = 'block';
});

function closeFlyouts() {
  menuFlyout.style.display = 'none';
  deadlineFlyout.style.display = 'none';
}

document.addEventListener('click', closeFlyouts);
menuFlyout.addEventListener('click', (e) => e.stopPropagation());
deadlineFlyout.addEventListener('click', (e) => e.stopPropagation());

// ── Xóa ghi chú ─────────────────────────────────────────────────────────────

document.getElementById('menuDelete').addEventListener('click', async () => {
  closeFlyouts();
  if (confirm('Bạn có chắc chắn muốn xóa ghi chú này không?')) {
    await window.api.deleteNote(noteId);
  }
});

// ── Bảo mật & Khóa bằng PIN ─────────────────────────────────────────────────

document.getElementById('menuLock').addEventListener('click', async () => {
  closeFlyouts();
  const pin = prompt('Nhập mã PIN (tối thiểu 4 số) để mã hóa khóa ghi chú:');
  if (pin && pin.trim().length >= 4) {
    const res = await window.api.lockNote(noteId, pin.trim());
    if (res.success) {
      currentNote.locked = true;
      showLockScreen(true);
    } else {
      alert(res.message || 'Khóa thất bại');
    }
  } else if (pin !== null) {
    alert('Mã PIN cần có tối thiểu 4 ký tự!');
  }
});

function showLockScreen(show) {
  lockScreen.style.display = show ? 'flex' : 'none';
  if (show) {
    pinUnlockInput.value = '';
    unlockError.style.display = 'none';
    setTimeout(() => pinUnlockInput.focus(), 100);
  }
}

btnSubmitUnlock.addEventListener('click', submitUnlock);
pinUnlockInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitUnlock();
});

async function submitUnlock() {
  const pin = pinUnlockInput.value.trim();
  if (!pin) return;

  const res = await window.api.unlockNote(noteId, pin);
  if (res.success) {
    currentNote.locked = false;
    currentNote.content = res.content;
    currentNote.checklist = res.checklist;
    showLockScreen(false);
    renderNote();
  } else {
    unlockError.style.display = 'block';
    pinUnlockInput.select();
  }
}

// Lắng nghe sự kiện reload từ Main
window.api.onNotesUpdated(async () => {
  const updated = await window.api.getNote(noteId);
  if (updated && !currentNote?.locked) {
    currentNote.pinned = updated.pinned;
    updatePinButton(currentNote.pinned !== false);
  }
});

// Bắt đầu
initNote();
