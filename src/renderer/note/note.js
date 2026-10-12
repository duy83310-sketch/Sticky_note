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

// Urgency & Deadline Strip Elements
const urgencyBar = document.getElementById('urgencyBar');
const urgencyNormalView = document.getElementById('urgencyNormalView');
const urgencyActiveView = document.getElementById('urgencyActiveView');
const btnSetUrgentQuick = document.getElementById('btnSetUrgentQuick');
const btnSetDeadlineQuick = document.getElementById('btnSetDeadlineQuick');
const btnEditDeadlineQuick = document.getElementById('btnEditDeadlineQuick');
const btnRemoveUrgentQuick = document.getElementById('btnRemoveUrgentQuick');
const urgencyCountdownText = document.getElementById('urgencyCountdownText');
const flyoutToggleUrgent = document.getElementById('flyoutToggleUrgent');
const flyoutUrgentIcon = document.getElementById('flyoutUrgentIcon');
const flyoutUrgentLabel = document.getElementById('flyoutUrgentLabel');
const noteToast = document.getElementById('noteToast');

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

// ── Urgency & Deadline Engine ────────────────────────────────────────────────

let toastTimer = null;
function showToast(text) {
  if (!noteToast) return;
  noteToast.textContent = text;
  noteToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    noteToast.classList.remove('show');
  }, 1900);
}

function renderDeadline() {
  if (!currentNote) return;

  const isUrgent = !!currentNote.isUrgent;
  body.classList.toggle('is-urgent', isUrgent);

  if (flyoutToggleUrgent) {
    flyoutToggleUrgent.classList.toggle('active', isUrgent);
    if (flyoutUrgentLabel) {
      flyoutUrgentLabel.textContent = isUrgent ? 'Hủy chế độ Khẩn cấp' : 'Đánh dấu KHẨN CẤP';
    }
    if (flyoutUrgentIcon) {
      flyoutUrgentIcon.textContent = isUrgent ? '✕' : '🔥';
    }
  }

  if (isUrgent) {
    if (urgencyNormalView) urgencyNormalView.style.display = 'none';
    if (urgencyActiveView) urgencyActiveView.style.display = 'flex';

    if (currentNote.deadline) {
      const targetDate = new Date(currentNote.deadline);
      const diffMs = targetDate.getTime() - Date.now();
      if (diffMs < 0) {
        urgencyCountdownText.textContent = 'Quá hạn!';
      } else {
        urgencyCountdownText.textContent = `Còn ${formatCountdown(diffMs)}`;
      }
    } else {
      urgencyCountdownText.textContent = 'Ưu tiên cao nhất';
    }
  } else if (currentNote.deadline) {
    if (urgencyNormalView) urgencyNormalView.style.display = 'flex';
    if (urgencyActiveView) urgencyActiveView.style.display = 'none';

    const targetDate = new Date(currentNote.deadline);
    const diffMs = targetDate.getTime() - Date.now();
    const isOver = diffMs < 0;
    const timeStr = formatCountdown(Math.abs(diffMs));
    const normalBadge = urgencyNormalView.querySelector('.badge-normal');
    if (normalBadge) {
      normalBadge.textContent = isOver ? `⏰ Quá hạn ${timeStr}` : `⏰ Hạn chót: còn ${timeStr}`;
    }
  } else {
    if (urgencyNormalView) urgencyNormalView.style.display = 'flex';
    if (urgencyActiveView) urgencyActiveView.style.display = 'none';
    const normalBadge = urgencyNormalView.querySelector('.badge-normal');
    if (normalBadge) {
      normalBadge.textContent = '⚪ Mức độ: Bình thường';
    }
  }
}

function formatCountdown(ms) {
  const hours = Math.floor(ms / (3600 * 1000));
  const minutes = Math.floor((ms % (3600 * 1000)) / (60 * 1000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} ngày`;
  }
  if (hours > 0) return `${hours} giờ ${minutes}p`;
  return `${Math.max(1, minutes)} phút`;
}

// Cập nhật deadline mỗi 30s
setInterval(renderDeadline, 30000);

// Urgency Quick Toggles
async function toggleUrgent() {
  const newUrgent = await window.api.toggleUrgentNote(noteId);
  if (currentNote) {
    currentNote.isUrgent = newUrgent;
    if (newUrgent && !currentNote.deadline) {
      currentNote.deadline = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    }
  }
  renderDeadline();
  showToast(newUrgent ? '🔥 Đã bật chế độ KHẨN CẤP!' : 'Đã chuyển về mức Bình thường');
}

if (btnSetUrgentQuick) btnSetUrgentQuick.addEventListener('click', toggleUrgent);
if (btnRemoveUrgentQuick) btnRemoveUrgentQuick.addEventListener('click', toggleUrgent);
if (flyoutToggleUrgent) {
  flyoutToggleUrgent.addEventListener('click', () => {
    toggleUrgent();
  });
}

// Deadline Popover & Presets
if (btnSetDeadlineQuick) btnSetDeadlineQuick.addEventListener('click', openDeadlineFlyout);
if (btnEditDeadlineQuick) btnEditDeadlineQuick.addEventListener('click', openDeadlineFlyout);
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
  setDeadlineTime(new Date(Date.now() + 2 * 3600 * 1000), true);
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

function setDeadlineTime(dateObj, makeUrgent = false) {
  if (currentNote) {
    currentNote.deadline = dateObj ? dateObj.toISOString() : null;
    if (makeUrgent) {
      currentNote.isUrgent = true;
    }
    renderDeadline();
    scheduleSave();
    showToast(dateObj ? '⏰ Đã cập nhật hạn chót!' : 'Đã xóa hạn chót');
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
  btnPin.classList.toggle('pinned-active', isPinned);
  btnPin.title = isPinned ? 'Đang ghim trên cùng (Nhấn để bỏ ghim)' : 'Ghim trên cùng màn hình (Always on top)';
}

btnPin.addEventListener('click', async () => {
  const isPinned = await window.api.togglePinNote(noteId);
  if (currentNote) currentNote.pinned = isPinned;
  updatePinButton(isPinned);
  showToast(isPinned ? '📌 Đã ghim trên cùng màn hình (Always on top)' : '📍 Đã bỏ ghim trên cùng');
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
    currentNote.isUrgent = updated.isUrgent;
    currentNote.deadline = updated.deadline;
    updatePinButton(currentNote.pinned !== false);
    renderDeadline();
  }
});

// Bắt đầu
initNote();
