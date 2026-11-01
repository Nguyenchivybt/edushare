let currentUser = JSON.parse(localStorage.getItem('edushare_user')) || null;
let documentsData = [];
let usersData = [];
let currentActiveDocId = null;
let currentOnlineStatus = localStorage.getItem('edushare_status') || 'online';
let selectedChatFile = null;

const ALL_QUICK_FEATURES = [
  { id: 'fav', name: '⭐ Album Yêu Thích', action: 'openFavoritesModal()' },
  { id: 'comm', name: '💬 Cộng Đồng Chat', action: 'openCommunityModal()' },
  { id: 'up', name: '📤 Tải Lên Học Liệu', action: 'openUploadCheck()' },
  { id: 'art', name: '📰 Bài Báo Khoa Học', action: 'scrollToSection("articles-section")' },
  { id: 'excel', name: '📊 Xuất Thống Kê Excel', action: 'exportStatsToExcel()' },
  { id: 'admin', name: '🛡️ Quản Lý Admin', action: 'loadUsersForAdmin()', roleRequired: 'admin' }
];

let userQuickConfig = JSON.parse(localStorage.getItem('edushare_quick_config')) || ['fav', 'comm', 'up', 'art'];
let chatCurrentTarget = { type: 'group', id: 'g1', name: '📢 Thảo Luận Học Thuật Chung' };

document.addEventListener('DOMContentLoaded', () => {
  bindAuthForms();
  updateAuthUI();
  loadDocumentsFromServer();
  loadUsersFromServer();
  renderQuickAccessBar();
  applySavedTheme();
});

/* ==================== 1. SHORTCUTS & ALBUM FAVORITES ==================== */

function renderQuickAccessBar() {
  const container = document.getElementById('quick-access-items');
  if (!container) return;

  const activeFeatures = ALL_QUICK_FEATURES.filter(f => {
    if (f.roleRequired === 'admin' && (!currentUser || currentUser.role !== 'admin')) return false;
    return userQuickConfig.includes(f.id);
  });

  container.innerHTML = activeFeatures.map(f => `
    <button class="quick-shortcut-btn" onclick="${f.action}">${f.name}</button>
  `).join('');

  renderQuickConfigModalCheckboxes();
}

function renderQuickConfigModalCheckboxes() {
  const container = document.getElementById('quick-checkboxes-list');
  if (!container) return;

  container.innerHTML = ALL_QUICK_FEATURES.map(f => `
    <label style="font-size:13px; display:flex; align-items:center; gap:8px; cursor:pointer;">
      <input type="checkbox" value="${f.id}" ${userQuickConfig.includes(f.id) ? 'checked' : ''} class="quick-feature-cb">
      ${f.name}
    </label>
  `).join('');
}

function saveQuickConfig() {
  const cbs = document.querySelectorAll('.quick-feature-cb:checked');
  userQuickConfig = Array.from(cbs).map(cb => cb.value);
  localStorage.setItem('edushare_quick_config', JSON.stringify(userQuickConfig));
  renderQuickAccessBar();
  closeModal('quick-config-modal');
  alert('✅ Đã cập nhật lối tắt!');
}

async function openFavoritesModal() {
  if (!currentUser) {
    alert('🔒 Vui lòng đăng nhập để xem Album Yêu thích!');
    openModal('login-modal');
    return;
  }

  const container = document.getElementById('favorites-grid-box');
  const favIds = currentUser.favorites || [];
  const favDocs = documentsData.filter(d => favIds.includes(String(d.id)));

  if (favDocs.length === 0) {
    container.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:30px 0;">⭐ Chưa có tài liệu nào trong Album Yêu thích.</p>`;
  } else {
    container.innerHTML = favDocs.map(doc => `
      <div class="doc-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="background:#ea580c; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px;">${doc.type}</span>
          <button onclick="toggleFavorite('${doc.id}')" style="background:none; border:none; cursor:pointer; font-size:16px;">❌</button>
        </div>
        <h4 style="margin:8px 0; font-size:14px; cursor:pointer;" onclick="openDocPreviewModal('${doc.id}')">${escapeHtml(doc.title)}</h4>
        <p style="font-size:12px; color:var(--text-muted);">Môn: ${escapeHtml(doc.subject || 'Chung')}</p>
        <button onclick="openDocPreviewModal('${doc.id}')" class="btn-artistic btn-blue" style="font-size:11px; padding:4px 8px; margin-top:8px;">👁️ Xem Ngay</button>
      </div>
    `).join('');
  }

  openModal('favorites-modal');
}

async function toggleFavorite(docId) {
  if (!currentUser) {
    alert('🔒 Vui lòng đăng nhập!');
    openModal('login-modal');
    return;
  }

  try {
    const res = await fetch('/api/users/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, docId })
    });

    const data = await res.json();
    currentUser.favorites = data.favorites;
    localStorage.setItem('edushare_user', JSON.stringify(currentUser));
    alert(data.message);
    renderDocuments(documentsData);
    if (document.getElementById('favorites-modal').style.display === 'flex') openFavoritesModal();
  } catch (err) { alert('Lỗi xử lý yêu thích!'); }
}

async function toggleLikeDocument(docId) {
  try {
    const res = await fetch(`/api/documents/${docId}/like`, { method: 'POST' });
    const data = await res.json();
    const doc = documentsData.find(d => String(d.id) === String(docId));
    if (doc) doc.likes = data.likes;
    renderDocuments(documentsData);
    renderArticles(documentsData.filter(d => d.isArticle || d.category === 'Bài báo tiêu biểu'));
  } catch (err) {}
}

/* ==================== 2. CỘNG ĐỒNG CHAT & ĐA TỆP/MEDIA ==================== */

async function openCommunityModal() {
  if (!currentUser) {
    alert('🔒 Vui lòng đăng nhập để tham gia Cộng Đồng Chat!');
    openModal('login-modal');
    return;
  }

  openModal('community-modal');
  loadChatGroups();
  loadChatUsers();
  loadCommunityMessages();
}

async function loadChatGroups() {
  try {
    const res = await fetch('/api/chat/groups');
    const groups = await res.json();
    const container = document.getElementById('chat-groups-list');

    container.innerHTML = groups.map(g => `
      <div class="chat-target-item ${chatCurrentTarget.type === 'group' && chatCurrentTarget.id === g.id ? 'active' : ''}" onclick="selectChatTarget('group', '${g.id}', '${escapeHtml(g.name)}', '${escapeHtml(g.description)}')">
        # ${escapeHtml(g.name)}
      </div>
    `).join('');
  } catch (err) {}
}

async function loadChatUsers() {
  const container = document.getElementById('chat-users-list');
  const otherUsers = usersData.filter(u => String(u.id) !== String(currentUser.id));

  container.innerHTML = otherUsers.map(u => `
    <div class="chat-target-item ${chatCurrentTarget.type === 'direct' && chatCurrentTarget.id === u.id ? 'active' : ''}" onclick="selectChatTarget('direct', '${u.id}', '${escapeHtml(u.fullname)}', '${u.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}')">
      💬 ${escapeHtml(u.fullname)} <small>(${u.role === 'teacher' ? 'Thầy' : 'SV'})</small>
    </div>
  `).join('');
}

function selectChatTarget(type, id, name, desc) {
  chatCurrentTarget = { type, id, name, desc };
  document.getElementById('chat-current-title').innerText = name;
  document.getElementById('chat-current-desc').innerText = desc || '';
  loadChatGroups();
  loadChatUsers();
  loadCommunityMessages();
}

function handleChatFileSelect(input) {
  if (input.files && input.files[0]) {
    selectedChatFile = input.files[0];
    const strip = document.getElementById('chat-file-preview-strip');
    const nameDisplay = document.getElementById('chat-file-name-display');
    if (strip && nameDisplay) {
      nameDisplay.innerText = `📎 Đã chọn: ${selectedChatFile.name} (${(selectedChatFile.size / 1024 / 1024).toFixed(2)} MB)`;
      strip.style.display = 'flex';
    }
  }
}

function clearSelectedChatFile() {
  selectedChatFile = null;
  const input = document.getElementById('community-file-input');
  if (input) input.value = '';
  const strip = document.getElementById('chat-file-preview-strip');
  if (strip) strip.style.display = 'none';
}

async function sendCommunityMessage() {
  const input = document.getElementById('community-msg-input');
  const text = input.value.trim();

  if (!text && !selectedChatFile) return;

  const formData = new FormData();
  formData.append('targetType', chatCurrentTarget.type);
  formData.append('targetId', chatCurrentTarget.id);
  formData.append('senderId', currentUser.id);
  formData.append('senderName', currentUser.fullname);
  formData.append('senderRole', currentUser.role);
  formData.append('text', text);

  if (selectedChatFile) {
    formData.append('file', selectedChatFile);
  }

  try {
    await fetch('/api/chat/messages', {
      method: 'POST',
      body: formData
    });

    input.value = '';
    clearSelectedChatFile();
    loadCommunityMessages();
  } catch (err) { alert('Lỗi gửi tin nhắn!'); }
}

async function loadCommunityMessages() {
  const container = document.getElementById('community-messages-box');
  try {
    const res = await fetch(`/api/chat/messages?targetType=${chatCurrentTarget.type}&targetId=${chatCurrentTarget.id}&userId=${currentUser.id}`);
    const msgs = await res.json();

    if (msgs.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:20px;">Hãy gửi tin nhắn hoặc hình ảnh/tệp đính kèm đầu tiên!</p>';
      return;
    }

    container.innerHTML = msgs.map(m => {
      const isMine = String(m.senderId) === String(currentUser.id);
      const roleBadge = m.senderRole === 'teacher' ? '👨‍🏫' : (m.senderRole === 'admin' ? '🛡️' : '🎓');
      
      let attachmentHtml = '';
      if (m.fileUrl) {
        if (m.fileType === 'HÌNH ẢNH') {
          attachmentHtml = `<div style="margin-top:6px;"><img src="${m.fileUrl}" style="max-width:200px; max-height:200px; border-radius:6px; cursor:pointer;" onclick="window.open('${m.fileUrl}')"></div>`;
        } else if (m.fileType === 'AUDIO') {
          attachmentHtml = `<div style="margin-top:6px;"><audio controls style="max-width:220px;"><source src="${m.fileUrl}"></audio></div>`;
        } else if (m.fileType === 'VIDEO') {
          attachmentHtml = `<div style="margin-top:6px;"><video controls style="max-width:220px; border-radius:6px;"><source src="${m.fileUrl}"></video></div>`;
        } else {
          attachmentHtml = `<div style="margin-top:6px;"><a href="${m.fileUrl}" target="_blank" download style="background:rgba(255,255,255,0.2); color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; text-decoration:none; display:inline-block;">📁 ${escapeHtml(m.fileName || 'Tải Tệp Đính Kèm')}</a></div>`;
        }
      }

      return `
        <div class="comm-msg-item ${isMine ? 'mine' : 'others'}">
          <div style="font-size:10px; opacity:0.8; margin-bottom:2px;">${roleBadge} <strong>${escapeHtml(m.senderName)}</strong> - ${m.time}</div>
          ${m.text ? `<div>${escapeHtml(m.text)}</div>` : ''}
          ${attachmentHtml}
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  } catch (err) {}
}

async function findHelperForQuestion() {
  const qInput = document.getElementById('suggest-question-input');
  const question = qInput.value.trim();
  if (!question) return;

  const box = document.getElementById('suggested-helpers-box');
  box.innerHTML = '⏳ AI đang tìm kiếm giảng viên/chuyên gia...';

  try {
    const res = await fetch('/api/chat/suggest-helpers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await res.json();

    box.innerHTML = data.helpers.map(h => `
      <div style="background:#1e293b; padding:6px; border-radius:4px; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
        <div><strong>${escapeHtml(h.fullname)}</strong><br><small style="color:#94a3b8;">${h.role}</small></div>
        <button onclick="selectChatTarget('direct', '${h.id}', '${escapeHtml(h.fullname)}', '${h.role}')" class="btn-artistic btn-blue" style="font-size:10px; padding:3px 8px;">Nhắn tin</button>
      </div>
    `).join('');
  } catch (err) {}
}

async function promptCreateGroup() {
  const name = prompt('Nhập tên nhóm trao đổi học thuật mới:');
  if (!name) return;
  const desc = prompt('Nhập mô tả nhóm:');

  try {
    await fetch('/api/chat/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc })
    });
    loadChatGroups();
  } catch (err) {}
}

/* ==================== 3. CHATBOT AI (GEMINI + WIKI) ==================== */

function toggleChatbot() {
  const win = document.getElementById('ai-chatbot-window');
  const btn = document.getElementById('ai-chatbot-button');
  if (win) {
    if (win.style.display === 'flex') {
      win.style.display = 'none';
      if (btn) btn.style.display = 'flex';
    } else {
      win.style.display = 'flex';
      if (btn) btn.style.display = 'none';
    }
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chatbot-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const msgBox = document.getElementById('chatbot-messages');
  msgBox.innerHTML += `<div class="chat-msg user-msg">${escapeHtml(text)}</div>`;
  input.value = '';

  const typingId = 'typing-' + Date.now();
  msgBox.innerHTML += `<div class="chat-msg bot-msg" id="${typingId}">🤖 <em>AI đang phân tích câu hỏi...</em></div>`;
  msgBox.scrollTop = msgBox.scrollHeight;

  try {
    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();
    const typingElem = document.getElementById(typingId);
    let formattedReply = formatMarkdownText(data.reply);

    let docCardsHtml = '';
    if (data.matchedDocs && data.matchedDocs.length > 0) {
      docCardsHtml = data.matchedDocs.slice(0, 3).map(d => `
        <div style="background:var(--bg-hover); padding:6px; border-radius:4px; margin-top:6px; font-size:11px;">
          📄 <strong>${escapeHtml(d.title)}</strong>
          <button onclick="openDocPreviewModal('${d.id}')" style="background:#2563eb; color:#fff; border:none; padding:2px 6px; border-radius:3px; cursor:pointer; margin-left:6px;">Xem ngay</button>
        </div>
      `).join('');
    }

    if (typingElem) typingElem.innerHTML = `${formattedReply} ${docCardsHtml}`;
  } catch (err) {
    const typingElem = document.getElementById(typingId);
    if (typingElem) typingElem.innerHTML = `🤖 Hệ thống AI đang cập nhật!`;
  }

  msgBox.scrollTop = msgBox.scrollHeight;
}

function formatMarkdownText(text) {
  if (!text) return '';
  let str = escapeHtml(text);
  str = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  str = str.replace(/\*(.*?)\*/g, '<em>$1</em>');
  str = str.replace(/\n/g, '<br>');
  return str;
}

/* ==================== 4. AUTH & FIX LỖI TRIỆT ĐỂ QUÊN MẬT KHẨU ==================== */

async function loadUsersFromServer() {
  try {
    const res = await fetch('/api/users');
    if (res.ok) usersData = await res.json();
  } catch (err) {}
}

function updateAuthUI() {
  const authContainer = document.getElementById('auth-buttons-container');
  const mobileAuthContainer = document.getElementById('mobile-auth-container');
  const statusBadge = (currentOnlineStatus === 'online') ? '🟢' : '⚪';

  if (currentUser) {
    let adminBtn = currentUser.role === 'admin' ? `<button onclick="loadUsersForAdmin()" class="btn-artistic btn-warning">🛡️ Admin</button>` : '';
    let roleLabel = currentUser.role === 'teacher' ? '👨‍🏫 Thầy' : (currentUser.role === 'admin' ? '🛡️ Admin' : '🎓 SV');

    if (authContainer) {
      authContainer.innerHTML = `
        ${adminBtn}
        <button onclick="openModal('settings-modal')" class="btn-artistic btn-secondary">${statusBadge} ${roleLabel} ${escapeHtml(currentUser.fullname)}</button>
        <button onclick="handleLogout()" class="btn-artistic btn-secondary">Đăng Xuất</button>
      `;
    }

    if (mobileAuthContainer) {
      mobileAuthContainer.innerHTML = `
        <div style="border-top:1px solid rgba(255,255,255,0.1); margin-top:10px; padding-top:10px; display:flex; flex-direction:column; gap:8px;">
          <span style="color:#38bdf8; font-size:12px; font-weight:bold;">👤 TÀI KHOẢN CỦA TÔI</span>
          ${currentUser.role === 'admin' ? `<button onclick="loadUsersForAdmin()" class="btn-artistic btn-warning" style="width:100%;">🛡️ Quản Lý Admin</button>` : ''}
          <button onclick="openFavoritesModal()" class="btn-artistic btn-warning" style="width:100%;">⭐ Album Yêu Thích</button>
          <button onclick="openCommunityModal()" class="btn-artistic btn-blue" style="width:100%;">💬 Cộng Đồng Chat</button>
          <button onclick="handleLogout()" class="btn-artistic btn-secondary" style="width:100%;">🚪 Đăng Xuất</button>
        </div>
      `;
    }

    const nameInput = document.getElementById('edit-profile-fullname');
    const emailInput = document.getElementById('edit-profile-email');
    if (nameInput) nameInput.value = currentUser.fullname || '';
    if (emailInput) emailInput.value = currentUser.emailPhone || '';
  } else {
    if (authContainer) {
      authContainer.innerHTML = `
        <button onclick="openModal('login-modal')" class="btn-artistic btn-blue">Đăng Nhập</button>
        <button onclick="openModal('register-modal')" class="btn-artistic btn-secondary">Đăng Ký</button>
      `;
    }

    if (mobileAuthContainer) {
      mobileAuthContainer.innerHTML = `
        <div style="border-top:1px solid rgba(255,255,255,0.1); margin-top:10px; padding-top:10px; display:flex; flex-direction:column; gap:8px;">
          <span style="color:#38bdf8; font-size:12px; font-weight:bold;">🔐 TÀI KHOẢN HỆ THỐNG</span>
          <button onclick="openModal('login-modal'); closeMobileNav();" class="btn-artistic btn-blue" style="width:100%;">🔑 Đăng Nhập</button>
          <button onclick="openModal('register-modal'); closeMobileNav();" class="btn-artistic btn-green" style="width:100%;">📝 Đăng Ký Tài Khoản</button>
        </div>
      `;
    }
  }

  renderQuickAccessBar();
}

function bindAuthForms() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
          currentUser = data.user;
          localStorage.setItem('edushare_user', JSON.stringify(currentUser));
          alert(`Đăng nhập thành công! Xin chào ${currentUser.fullname}`);
          closeModal('login-modal');
          loginForm.reset();
          updateAuthUI();
          renderDocuments(documentsData);
        } else {
          alert(data.message || 'Sai thông tin đăng nhập!');
        }
      } catch (err) { alert('Lỗi kết nối máy chủ!'); }
    });
  }

  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        fullname: document.getElementById('reg-fullname').value,
        gender: document.getElementById('reg-gender').value,
        role: document.getElementById('reg-role').value,
        emailPhone: document.getElementById('reg-email-phone').value,
        school: document.getElementById('reg-school').value,
        faculty: document.getElementById('reg-faculty').value,
        major: document.getElementById('reg-major').value,
        className: document.getElementById('reg-class').value,
        username: document.getElementById('reg-username').value,
        password: document.getElementById('reg-password').value,
        expertise: document.getElementById('reg-major').value
      };

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message);
        if (res.ok) {
          closeModal('register-modal');
          regForm.reset();
          loadUsersFromServer();
          openModal('login-modal');
        }
      } catch (err) { alert('Lỗi đăng ký!'); }
    });
  }
}

// FIX LỖI TRIỆT ĐỂ QUÊN & CẤP LẠI MẬT KHẨU
async function handleForgotPassword(e) {
  e.preventDefault();
  const account = document.getElementById('forgot-account').value.trim();
  const newPassword = document.getElementById('forgot-newpass').value.trim();
  const msgBox = document.getElementById('forgot-msg-box');

  if (!account || !newPassword) {
    alert('Vui lòng điền đầy đủ các thông tin!');
    return;
  }

  try {
    const res = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, newPassword })
    });
    const data = await res.json();

    if (msgBox) {
      msgBox.style.display = 'block';
      msgBox.style.background = res.ok ? '#15803d' : '#b91c1c';
      msgBox.style.color = '#fff';
      msgBox.innerText = data.message;
    }

    if (res.ok) {
      alert(data.message);
      document.getElementById('forgot-form').reset();
      switchModal('forgot-modal', 'login-modal');
      loadUsersFromServer();
    }
  } catch (err) { alert('Lỗi kết nối máy chủ!'); }
}

function handleLogout() {
  localStorage.removeItem('edushare_user');
  currentUser = null;
  updateAuthUI();
  renderDocuments(documentsData);
}

/* ADMIN PHÂN QUYỀN */
async function loadUsersForAdmin() {
  try {
    const res = await fetch('/api/users');
    const users = await res.json();
    usersData = users;
    const tbody = document.getElementById('users-table-body');

    if (tbody) {
      tbody.innerHTML = users.map(u => `
        <tr>
          <td>${u.id}</td>
          <td><strong>${escapeHtml(u.fullname)}</strong></td>
          <td><code>${escapeHtml(u.username)}</code></td>
          <td><span style="color:#38bdf8; font-weight:bold;">${u.role}</span></td>
          <td><span style="color:#22c55e;">🟢 Đang hoạt động</span></td>
          <td>
            <select onchange="updateUserRole('${u.id}', this.value)" style="padding:2px; font-size:11px; background:var(--bg-main); color:var(--text-main);">
              <option value="student" ${u.role === 'student' ? 'selected' : ''}>Sinh viên</option>
              <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>Giảng viên</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
          <td><button onclick="deleteUser('${u.id}')" class="btn-artistic btn-warning" style="padding:2px 6px; font-size:10px;">Xóa</button></td>
        </tr>
      `).join('');
    }
    openModal('admin-users-modal');
  } catch (err) {}
}

async function updateUserRole(userId, newRole) {
  try {
    await fetch(`/api/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    alert('Đã cập nhật vai trò dùng!');
    loadUsersFromServer();
  } catch (err) {}
}

async function deleteUser(id) {
  if (!confirm('Bạn có chắc muốn xóa user này?')) return;
  try {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    alert('Đã xóa người dùng!');
    loadUsersForAdmin();
  } catch (err) {}
}

/* ==================== 5. TẢI VÀ RENDER TÀI LIỆU ==================== */

async function loadDocumentsFromServer() {
  try {
    const res = await fetch('/api/documents');
    if (res.ok) {
      documentsData = await res.json();
      populateFilterOptions(documentsData);
      renderDocuments(documentsData);
      renderArticles(documentsData.filter(d => d.isArticle || d.category === 'Bài báo tiêu biểu'));
    }
  } catch (err) {}
}

function renderArticles(articles) {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  if (articles.length === 0) {
    container.innerHTML = '<p style="color:#64748b; font-size:13px;">Chưa có bài báo khoa học nào.</p>';
    return;
  }

  container.innerHTML = articles.map(art => `
    <div class="article-card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="background:#ea580c; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px;">📰 BÀI BÁO KHOA HỌC</span>
        <button onclick="toggleLikeDocument('${art.id}')" style="background:none; border:none; cursor:pointer; font-size:12px; color:#f59e0b;">❤️ ${art.likes || 0}</button>
      </div>
      <h3 style="margin:8px 0; font-size:15px; color:var(--text-main);">${escapeHtml(art.title)}</h3>
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;"><strong>Tác giả:</strong> ${escapeHtml(art.author || 'N/A')}</p>
      <a href="${art.url}" target="_blank" onclick="recordView('${art.id}')" style="color:#38bdf8; font-weight:bold; font-size:13px; text-decoration:none;">Xem Bài Báo Chi Tiết ➔</a>
    </div>
  `).join('');
}

function renderDocuments(docs) {
  const container = document.getElementById('document-list');
  const countText = document.getElementById('doc-count-text');
  if (!container) return;

  const normalDocs = docs.filter(d => !d.isArticle && d.type !== 'LINK');
  if (countText) countText.innerText = `Đang hiển thị ${normalDocs.length} học liệu giáo dục`;

  if (normalDocs.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding:30px 0;">Không tìm thấy học liệu phù hợp.</p>';
    return;
  }

  container.innerHTML = normalDocs.map(doc => {
    let actionBtns = '';
    const isFav = currentUser && currentUser.favorites && currentUser.favorites.includes(String(doc.id));
    const favIcon = isFav ? '⭐ Đã Lưu' : '☆ Yêu Thích';

    if (currentUser && (currentUser.role === 'admin' || String(currentUser.id) === String(doc.authorId))) {
      actionBtns = `<button onclick="deleteDocument('${doc.id}')" class="btn-artistic btn-warning" style="padding:4px 8px; font-size:11px;">🗑️ Xóa</button>`;
    }

    return `
      <div class="doc-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="background:#2563eb; color:#fff; font-size:11px; font-weight:bold; padding:2px 8px; border-radius:4px;">${doc.type}</span>
          <button onclick="toggleLikeDocument('${doc.id}')" style="background:none; border:none; cursor:pointer; font-size:12px; color:#f59e0b;">❤️ ${doc.likes || 0}</button>
        </div>
        <h3 style="margin:10px 0 6px 0; font-size:15px; color:var(--text-main); cursor:pointer;" onclick="openDocPreviewModal('${doc.id}')">${escapeHtml(doc.title)}</h3>
        <p style="margin:3px 0; font-size:12px; color:#38bdf8; font-weight:600;">🏷️ ${escapeHtml(doc.category || 'Tài liệu')}</p>
        <p style="margin:3px 0; font-size:12px; color:var(--text-muted);"><strong>Môn:</strong> ${escapeHtml(doc.subject || 'Tổng hợp')}</p>
        <p style="margin:3px 0; font-size:12px; color:var(--text-muted);"><strong>Tác giả:</strong> ${escapeHtml(doc.author || 'Vô danh')}</p>
        <p style="margin:3px 0; font-size:11px; color:#94a3b8;">👁️ ${doc.views || 0} xem | 📥 ${doc.downloads || 0} tải</p>
        
        <div style="margin-top:12px; text-align:right; display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:4px;">
          <button onclick="toggleFavorite('${doc.id}')" class="btn-artistic btn-secondary" style="font-size:11px; padding:4px 8px;">${favIcon}</button>
          <button onclick="openDocPreviewModal('${doc.id}')" class="btn-artistic btn-blue" style="font-size:11px; padding:4px 8px;">👁️ Xem</button>
          <button onclick="openDocDetailsModal('${doc.id}')" class="btn-artistic btn-secondary" style="font-size:11px; padding:4px 8px;">💬 Bình luận</button>
          ${actionBtns}
          <button onclick="downloadCheck('${doc.id}')" class="btn-artistic btn-green" style="font-size:11px; padding:4px 8px;">📥 Tải về</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ==================== 6. XEM TRƯỚC ĐA DẠNG MEDIA & HÌNH ẢNH ==================== */

async function openDocPreviewModal(docId) {
  const doc = documentsData.find(d => String(d.id) === String(docId));
  if (!doc) return;

  recordView(docId);
  document.getElementById('preview-doc-title').innerText = `👁️ Xem Trước: ${doc.title}`;
  const container = document.getElementById('preview-content-box');

  if (doc.type === 'HÌNH ẢNH') {
    container.innerHTML = `<div style="text-align:center; padding:10px;"><img src="${doc.url}" style="max-width:100%; max-height:480px; border-radius:8px;"></div>`;
  } else if (doc.type === 'PDF') {
    container.innerHTML = `<iframe src="${doc.url}" width="100%" height="480px" style="border:none; border-radius:6px;"></iframe>`;
  } else if (doc.type === 'AUDIO') {
    container.innerHTML = `<div style="text-align:center; padding:30px;"><audio controls style="width:100%; max-width:500px;"><source src="${doc.url}"></audio></div>`;
  } else if (doc.type === 'VIDEO') {
    container.innerHTML = `<div style="text-align:center; background:#000; border-radius:8px;"><video controls style="width:100%; max-height:450px;"><source src="${doc.url}"></video></div>`;
  } else {
    container.innerHTML = `
      <div style="text-align:center; padding:40px;">
        <p style="font-size:18px; font-weight:bold;">📁 Tập Tin ${doc.type}</p>
        <button onclick="downloadCheck('${doc.id}')" class="btn-artistic btn-green" style="margin-top:12px;">📥 Tải Về Tệp Gốc</button>
      </div>
    `;
  }

  openModal('doc-preview-modal');
}

async function downloadCheck(docId) {
  if (!currentUser) {
    alert('🔒 Vui lòng đăng nhập để tải học liệu về máy!');
    openModal('login-modal');
    return;
  }

  const doc = documentsData.find(d => String(d.id) === String(docId));
  if (!doc) return;

  try {
    await fetch(`/api/documents/${docId}/download`, { method: 'POST' });
    alert('✅ Đang bắt đầu tải tệp về!');
    window.open(doc.url, '_blank');
    loadDocumentsFromServer();
  } catch (err) { window.open(doc.url, '_blank'); }
}

async function recordView(docId) {
  try { await fetch(`/api/documents/${docId}/view`, { method: 'POST' }); } catch (err) {}
}

async function handleUploadSubmit(e) {
  e.preventDefault();
  if (!currentUser) { alert('🔒 Vui lòng đăng nhập!'); openModal('login-modal'); return; }

  const formData = new FormData();
  formData.append('title', document.getElementById('up-title').value);
  formData.append('category', document.getElementById('up-category').value);
  formData.append('subject', document.getElementById('up-subject').value || 'Học phần chung');
  formData.append('author', currentUser.fullname);
  formData.append('authorId', currentUser.id);

  const fileInput = document.getElementById('up-file');
  if (fileInput && fileInput.files[0]) formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch('/api/documents', { method: 'POST', body: formData });
    if (res.ok) {
      alert('✅ Đã tải lên học liệu mới thành công!');
      closeModal('upload-modal');
      document.getElementById('upload-form').reset();
      loadDocumentsFromServer();
    }
  } catch (err) { alert('Lỗi tải lên tệp!'); }
}

async function deleteDocument(docId) {
  if (!confirm('Bạn có chắc muốn xóa học liệu này?')) return;
  try {
    await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    alert('Đã xóa tài liệu!');
    loadDocumentsFromServer();
  } catch (err) {}
}

/* BÌNH LUẬN */
async function openDocDetailsModal(docId) {
  currentActiveDocId = docId;
  const doc = documentsData.find(d => String(d.id) === String(docId));
  if (!doc) return;

  recordView(docId);
  document.getElementById('detail-doc-title').innerText = doc.title;
  document.getElementById('detail-doc-info').innerHTML = `
    <p><strong>Chuyên mục:</strong> ${escapeHtml(doc.category)} | <strong>Môn:</strong> ${escapeHtml(doc.subject || 'Tổng hợp')}</p>
    <p><strong>Tác giả:</strong> ${escapeHtml(doc.author)} | <strong>Lượt thích:</strong> ❤️ ${doc.likes || 0}</p>
  `;

  const commentFormBox = document.getElementById('comment-form-container');
  if (commentFormBox) {
    if (currentUser) {
      commentFormBox.innerHTML = `
        <form onsubmit="submitComment(event)" style="border-top:1px solid var(--border-color); padding-top:12px;">
          <div class="input-group">
            <label>Nội dung bình luận học thuật:</label>
            <textarea id="comment-text" required rows="2" style="width:100%; padding:8px; border-radius:6px; background:var(--bg-main); color:var(--text-main); border:1px solid var(--border-color);" placeholder="Nhập nhận xét hoặc thảo luận..."></textarea>
          </div>
          <button type="submit" class="btn-artistic btn-blue" style="margin-top:8px;">Gửi Bình Luận</button>
        </form>
      `;
    } else {
      commentFormBox.innerHTML = `<p style="font-size:12px; color:#f59e0b; margin-top:10px;">🔒 Vui lòng đăng nhập để bình luận.</p>`;
    }
  }

  loadComments(docId);
  openModal('doc-details-modal');
}

async function loadComments(docId) {
  const container = document.getElementById('comments-list-box');
  try {
    const res = await fetch(`/api/documents/${docId}/comments`);
    const comments = await res.json();

    if (comments.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">Chưa có bình luận nào.</p>';
      return;
    }

    container.innerHTML = comments.map(c => `
      <div style="background:var(--bg-card); border:1px solid var(--border-color); padding:8px 10px; border-radius:6px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; font-size:12px;">
          <strong>${escapeHtml(c.userName)}</strong>
          <span style="color:#f59e0b;">${'⭐'.repeat(c.rating || 5)}</span>
        </div>
        <p style="font-size:12px; color:var(--text-muted); margin:4px 0;">${escapeHtml(c.content)}</p>
      </div>
    `).join('');
  } catch (err) {}
}

async function submitComment(e) {
  e.preventDefault();
  if (!currentUser) return;
  const content = document.getElementById('comment-text').value;

  try {
    await fetch(`/api/documents/${currentActiveDocId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, userName: currentUser.fullname, userRole: currentUser.role, content })
    });
    document.getElementById('comment-text').value = '';
    loadComments(currentActiveDocId);
  } catch (err) {}
}

/* ==================== 7. UTILS & BỘ LỌC ==================== */

function populateFilterOptions(docs) {
  const schools = [...new Set(docs.map(d => d.school).filter(Boolean))];
  const faculties = [...new Set(docs.map(d => d.faculty).filter(Boolean))];
  const majors = [...new Set(docs.map(d => d.major).filter(Boolean))];
  const courses = [...new Set(docs.map(d => d.course).filter(Boolean))];
  const classes = [...new Set(docs.map(d => d.className).filter(Boolean))];

  fillSelect('filter-school', schools, '🏛️ Tất cả Trường');
  fillSelect('filter-faculty', faculties, '🏢 Tất cả Khoa');
  fillSelect('filter-major', majors, '💾 Tất cả Ngành');
  fillSelect('filter-course', courses, '📦 Tất cả Khóa');
  fillSelect('filter-class', classes, '👥 Tất cả Lớp');
}

function fillSelect(id, list, defaultLabel) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<option value="">${defaultLabel}</option>` + list.map(i => `<option value="${i}">${i}</option>`).join('');
}

function handleFilterChange() {
  const school = document.getElementById('filter-school').value;
  const faculty = document.getElementById('filter-faculty').value;
  const major = document.getElementById('filter-major').value;

  const filtered = documentsData.filter(d => {
    return (!school || d.school === school) &&
           (!faculty || d.faculty === faculty) &&
           (!major || d.major === major);
  });
  renderDocuments(filtered);
}

function filterByCategory(cat) {
  const filtered = documentsData.filter(d => d.category && d.category.toLowerCase().includes(cat.toLowerCase()));
  renderDocuments(filtered);
  closeMobileNav();
}

function filterByGroup(key, val) {
  const filtered = documentsData.filter(d => d[key] === val);
  renderDocuments(filtered);
  closeMobileNav();
}

function handleSearch() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const type = document.getElementById('search-type').value;

  const filtered = documentsData.filter(d => {
    const matchText = (d.title && d.title.toLowerCase().includes(q)) || (d.subject && d.subject.toLowerCase().includes(q));
    const matchType = (type === 'all') || (d.type === type);
    return matchText && matchType;
  });

  renderDocuments(filtered);
  closeMobileNav();
}

function resetFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-type').value = 'all';
  renderDocuments(documentsData);
  closeMobileNav();
}

function resetHomePage() { resetFilters(); }

function handleSortChange() {
  const type = document.getElementById('sort-select').value;
  let sorted = [...documentsData];

  if (type === 'likes') sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  else if (type === 'downloads') sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  else if (type === 'views') sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
  else sorted.sort((a, b) => String(b.id).localeCompare(String(a.id)));

  renderDocuments(sorted);
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleMobileNav() {
  const links = document.getElementById('main-nav-links');
  if (links) links.classList.toggle('show-mobile');
}

function closeMobileNav() {
  const links = document.getElementById('main-nav-links');
  if (links) links.classList.remove('show-mobile');
}

function showSubmenuTab(tabId, el) {
  document.querySelectorAll('.submenu-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.submenu-panel').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function switchModal(fromId, toId) {
  closeModal(fromId);
  openModal(toId);
}

function openUploadCheck() {
  if (!currentUser) { alert('🔒 Vui lòng đăng nhập!'); openModal('login-modal'); return; }
  openModal('upload-modal');
}

function changeTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('edushare_theme', theme);
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem('edushare_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const selector = document.getElementById('theme-selector');
  if (selector) selector.value = savedTheme;
}

function toggleOnlineStatus(status) {
  currentOnlineStatus = status;
  localStorage.setItem('edushare_status', status);
  updateAuthUI();
}

function saveUserProfileInfo() {
  if (!currentUser) return;
  const newName = document.getElementById('edit-profile-fullname').value.trim();
  const newEmail = document.getElementById('edit-profile-email').value.trim();

  if (!newName) return alert('Họ tên không được trống!');
  currentUser.fullname = newName;
  currentUser.emailPhone = newEmail;
  localStorage.setItem('edushare_user', JSON.stringify(currentUser));
  alert('✅ Đã lưu thông tin cá nhân!');
  updateAuthUI();
  closeModal('settings-modal');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}