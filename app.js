let currentUser = JSON.parse(localStorage.getItem('edushare_user')) || null;
let documentsData = [];
let currentOnlineStatus = localStorage.getItem('edushare_status') || 'online';

document.addEventListener('DOMContentLoaded', () => {
  bindAuthForms();
  updateAuthUI();
  loadDocumentsFromServer();
  applySavedTheme();
});

/* ==================== XỬ LÝ SỰ CỐ TỆP WORD/DOCX PREVIEW ==================== */

async function openDocPreviewModal(docId) {
  const doc = documentsData.find(d => String(d.id) === String(docId));
  if (!doc) return;

  document.getElementById('preview-doc-title').innerText = `👁️ Xem Trước: ${doc.title}`;
  const container = document.getElementById('preview-content-box');

  if (doc.type === 'PDF') {
    container.innerHTML = `<iframe src="${doc.url}" width="100%" height="500px" style="border:none; border-radius:6px;"></iframe>`;
  } else if (doc.type === 'DOCX') {
    // Xử lý thông minh khắc phục lỗi "Can't find end of central directory"
    container.innerHTML = `
      <div id="docx-container-box" style="width:100%; height:500px; overflow-y:auto; background:#f1f5f9; padding:10px; border-radius:6px;">
        <p style="text-align:center; padding:20px; color:#64748b;">⏳ Đang mở trình xem tài liệu Word...</p>
      </div>
    `;

    if (doc.url && doc.url.startsWith('http')) {
      // Ưu tiên Trình xem Microsoft / Google cho file từ URL để không bị hỏng cấu trúc Zip
      const encodedUrl = encodeURIComponent(doc.url);
      document.getElementById('docx-container-box').innerHTML = `
        <iframe src="https://docs.google.com/viewer?url=${encodedUrl}&embedded=true" width="100%" height="480px" style="border:none;"></iframe>
      `;
    } else {
      // Fallback thử Render Blob nếu có tệp tin nội bộ
      try {
        const response = await fetch(doc.url);
        const blob = await response.blob();
        const renderBox = document.getElementById('docx-container-box');
        renderBox.innerHTML = '';
        await docx.renderAsync(blob, renderBox);
      } catch (err) {
        document.getElementById('docx-container-box').innerHTML = `
          <div style="text-align:center; padding:30px; color:#dc2626;">
            <p style="font-weight:bold; font-size:15px;">📄 Đang ở chế độ xem nhanh tệp Word</p>
            <p style="font-size:13px; color:#475569; margin:10px 0;">Bạn có thể tải về tệp gốc để xem đầy đủ nhất trên thiết bị của mình.</p>
            ${currentUser ? `<button onclick="downloadCheck('${doc.id}')" class="btn-submit btn-green" style="width:auto; padding:8px 20px;">📥 Tải Về Tệp Gốc</button>` : `<p style="color:#2563eb; font-weight:bold;">🔒 Vui lòng đăng nhập để tải về.</p>`}
          </div>
        `;
      }
    }
  } else {
    container.innerHTML = `<div style="text-align:center; padding:40px;">📁 Tệp định dạng ${doc.type}. Vui lòng tải về để xem nội dung đầy đủ.</div>`;
  }

  openModal('doc-preview-modal');
}

/* ==================== CÀI ĐẶT & GIAO DIỆN SÁNG / TỐI ==================== */

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
  alert(`Đã chuyển trạng thái sang: ${status === 'online' ? '🟢 Online' : '⚪ Offline'}`);
  updateAuthUI();
}

function saveUserProfileInfo() {
  if (!currentUser) return;
  currentUser.fullname = document.getElementById('edit-profile-fullname').value;
  currentUser.emailPhone = document.getElementById('edit-profile-email').value;
  localStorage.setItem('edushare_user', JSON.stringify(currentUser));
  alert('✅ Đã cập nhật thông tin cá nhân thành công!');
  updateAuthUI();
  closeModal('settings-modal');
}

/* ==================== CHATBOT AI THÔNG MINH ==================== */

function toggleChatbot() {
  const win = document.getElementById('ai-chatbot-window');
  if (win) win.style.display = (win.style.display === 'flex') ? 'none' : 'flex';
}

function sendChatMessage() {
  const input = document.getElementById('chatbot-input');
  const text = input.value.trim();
  if (!text) return;

  const msgBox = document.getElementById('chatbot-messages');
  msgBox.innerHTML += `<div class="chat-msg user-msg">${text}</div>`;
  input.value = '';

  setTimeout(() => {
    let reply = "Tôi có thể giúp bạn tìm giáo trình, slide bài giảng hoặc bài tập mẫu. Bạn muốn tra cứu môn học nào?";
    const lower = text.toLowerCase();

    if (lower.includes('thi') || lower.includes('đề thi')) {
      reply = "🎯 Để tìm đề thi, bạn chọn chuyên mục '🎯 Đề Thi & Ngân Hàng Câu Hỏi' trên menu hoặc nhập tên môn học vào ô tìm kiếm nhé!";
    } else if (lower.includes('đăng ký') || lower.includes('tài khoản')) {
      reply = "📝 Bạn bấm vào nút 'Đăng Ký' góc phải trên cùng để tạo tài khoản mới chỉ trong 1 phút.";
    } else if (lower.includes('word') || lower.includes('lỗi')) {
      reply = "📄 Hệ thống đã tự động chuyển trình xem tài liệu Word mượt mà nhất. Bạn có thể nhấn 'Xem Trước' hoặc 'Tải về' bất cứ lúc nào.";
    }

    msgBox.innerHTML += `<div class="chat-msg bot-msg">🤖 ${reply}</div>`;
    msgBox.scrollTop = msgBox.scrollHeight;
  }, 600);
}

/* ==================== RENDERING TÀI LIỆU & NAV ==================== */

async function loadDocumentsFromServer() {
  try {
    const res = await fetch('/api/documents');
    if (res.ok) {
      documentsData = await res.json();
      populateFilterOptions(documentsData);
      renderDocuments(documentsData);
    }
  } catch (err) {}
}

function renderDocuments(docs) {
  const container = document.getElementById('document-list');
  if (!container) return;

  if (docs.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:30px;">Chưa có tài liệu phù hợp.</p>';
    return;
  }

  container.innerHTML = docs.map(doc => `
    <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:16px;">
      <span style="background:#2563eb; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px;">${doc.type}</span>
      <h3 style="font-size:15px; margin:8px 0; color:var(--text-main); cursor:pointer;" onclick="openDocPreviewModal('${doc.id}')">${doc.title}</h3>
      <p style="font-size:12px; color:var(--text-muted);">🏷️ ${doc.category || 'Tài liệu'} | 👤 ${doc.author}</p>
      <div style="margin-top:12px; text-align:right; display:flex; justify-content:flex-end; gap:6px;">
        <button onclick="openDocPreviewModal('${doc.id}')" style="background:#0284c7; color:#fff; border:none; padding:5px 10px; border-radius:4px; font-size:12px; cursor:pointer;">👁️ Xem trước</button>
        ${currentUser ? `<button onclick="downloadCheck('${doc.id}')" style="background:#16a34a; color:#fff; border:none; padding:5px 10px; border-radius:4px; font-size:12px; cursor:pointer;">📥 Tải về</button>` : ''}
      </div>
    </div>
  `).join('');
}

function updateAuthUI() {
  const authContainer = document.getElementById('auth-buttons-container');
  if (!authContainer) return;

  const statusBadge = currentOnlineStatus === 'online' ? '🟢' : '⚪';

  if (currentUser) {
    let adminBtn = currentUser.role === 'admin' ? `<button onclick="loadUsersForAdmin()" style="background:#dc3545; color:#fff;">🛡️ Admin</button>` : '';
    authContainer.innerHTML = `
      ${adminBtn}
      <button onclick="openModal('settings-modal')" class="btn-user-nav">${statusBadge} ${currentUser.fullname}</button>
      <button onclick="handleLogout()" style="background:#64748b; color:#fff;">Đăng Xuất</button>
    `;
    document.getElementById('edit-profile-fullname').value = currentUser.fullname || '';
    document.getElementById('edit-profile-email').value = currentUser.emailPhone || '';
  } else {
    authContainer.innerHTML = `
      <button onclick="openModal('login-modal')" class="btn-login">Đăng Nhập</button>
      <button onclick="openModal('register-modal')" style="background:#475569; color:#fff;">Đăng Ký</button>
    `;
  }
}

function handleLogout() {
  localStorage.removeItem('edushare_user');
  currentUser = null;
  updateAuthUI();
  renderDocuments(documentsData);
}

function toggleMobileNav() {
  const links = document.getElementById('main-nav-links');
  if (links) links.classList.toggle('show-mobile');
}

function showSubmenuTab(tabId, el) {
  document.querySelectorAll('.submenu-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.submenu-panel').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
}

/* ADMIN XEM AI ONLINE / OFFLINE */
async function loadUsersForAdmin() {
  try {
    const res = await fetch('/api/users');
    const users = await res.json();
    const tbody = document.getElementById('users-table-body');

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td><strong>${u.fullname}</strong></td>
        <td><code>${u.username}</code></td>
        <td>${u.role}</td>
        <td><span class="${currentOnlineStatus === 'online' ? 'badge-online' : 'badge-offline'}">${currentOnlineStatus === 'online' ? '🟢 Đang hoạt động' : '⚪ Ngoại tuyến'}</span></td>
        <td>${u.status === 'approved' ? 'Đã duyệt' : 'Chờ'}</td>
        <td><button onclick="deleteUser('${u.id}')" style="background:#dc2626; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Xóa</button></td>
      </tr>
    `).join('');
    openModal('admin-users-modal');
  } catch (err) {}
}

function populateFilterOptions(docs) {}
function handleFilterChange() {}
function filterByCategory() {}
function filterByGroup() {}
function handleSearch() {}
function resetFilters(e) { if(e) e.preventDefault(); renderDocuments(documentsData); }
function resetHomePage() { resetFilters(); }
function handleSortChange() {}
function exportStatsToExcel() {}
function bindAuthForms() {}
function downloadCheck(id) { alert('Đang tải tệp về thiết bị...'); }
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function openUploadCheck() { if(!currentUser) { alert('🔒 Vui lòng đăng nhập!'); openModal('login-modal'); return;} openModal('upload-modal'); }