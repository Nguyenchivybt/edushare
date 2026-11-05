let currentUser = JSON.parse(localStorage.getItem('edushare_user')) || null;
let documentsData = [];

document.addEventListener('DOMContentLoaded', () => {
  bindAuthForms();
  updateAuthUI();
  initFilterOptions();
  loadDocumentsFromServer();
});

function initFilterOptions() {
  const schoolSel = document.getElementById('filter-school');
  const facultySel = document.getElementById('filter-faculty');
  const majorSel = document.getElementById('filter-major');

  if (schoolSel) schoolSel.innerHTML = `<option value="">🏛️ Tất cả Trường</option><option value="Trường Đại học Xây dựng Miền Tây">Trường Đại học Xây dựng Miền Tây</option>`;
  if (facultySel) facultySel.innerHTML = `<option value="">🏢 Tất cả Khoa</option><option value="Công nghệ thông tin">Khoa CNTT</option><option value="Xây dựng">Khoa Xây Dựng</option><option value="Kiến trúc">Khoa Kiến Trúc</option>`;
  if (majorSel) majorSel.innerHTML = `<option value="">💾 Tất cả Ngành</option><option value="Kỹ thuật phần mềm">Ngành Kỹ Thuật Phần Mềm</option><option value="Kỹ thuật xây dựng">Ngành Kỹ Thuật Xây Dựng</option>`;
}

async function loadDocumentsFromServer() {
  try {
    const res = await fetch('/api/documents');
    if (res.ok) {
      documentsData = await res.json();
      renderAllContent(documentsData);
    }
  } catch (err) {}
}

function renderAllContent(docs) {
  const articles = docs.filter(d => d.isArticle || d.category === 'Bài báo tiêu biểu' || d.type === 'LINK');
  const normalDocs = docs.filter(d => !d.isArticle && d.category !== 'Bài báo tiêu biểu' && d.type !== 'LINK');

  renderArticles(articles);
  renderDocuments(normalDocs);
}

/* HIỂN THỊ BÀI BÁO KHOA HỌC */
function renderArticles(articles) {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  if (articles.length === 0) {
    container.innerHTML = `<p style="font-size:12px; color:var(--text-muted); grid-column:span 3;">Chưa có bài báo khoa học nào.</p>`;
    return;
  }

  container.innerHTML = articles.map(art => `
    <div class="doc-card" style="border-left: 4px solid #ea580c;">
      <div>
        <span style="background:#ea580c; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px;">📰 ${art.type}</span>
        <h3 style="font-size:14px; margin:8px 0; color:var(--text-main);">${escapeHtml(art.title)}</h3>
        <p style="font-size:12px; color:var(--text-muted); margin:4px 0;">✍️ Tác giả: <strong>${escapeHtml(art.author)}</strong></p>
        <p style="font-size:11px; color:var(--text-muted);">🏢 ${escapeHtml(art.faculty || 'Nghiên cứu')} • 📅 ${art.date}</p>
      </div>
      <div class="doc-card-actions">
        <button onclick="previewDocument('${art.id}')" class="btn-artistic btn-blue" style="font-size:11px; padding:4px 8px;">👁️ Xem</button>
        <a href="${art.url}" target="_blank" class="btn-artistic btn-green-glow" style="font-size:11px; padding:4px 8px; text-decoration:none;">🌐 Mở Link / Tải</a>
        ${getRoleActionButtons(art)}
      </div>
    </div>
  `).join('');
}

/* HIỂN THỊ TÀI LIỆU VÀ KIỂM TRA PHÂN QUYỀN RBAC */
function renderDocuments(docs) {
  const container = document.getElementById('document-list');
  if (!container) return;

  if (docs.length === 0) {
    container.innerHTML = `<p style="font-size:12px; color:var(--text-muted); grid-column:span 3;">Không tìm thấy tài liệu phù hợp.</p>`;
    return;
  }

  container.innerHTML = docs.map(doc => `
    <div class="doc-card">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="background:#2563eb; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px;">${doc.type}</span>
          <span style="font-size:10px; color:var(--text-muted);">👁️ ${doc.views} lượt xem</span>
        </div>
        <h3 style="font-size:14px; margin:8px 0; color:var(--text-main);">${escapeHtml(doc.title)}</h3>
        <p style="font-size:12px; color:var(--accent); margin:4px 0;">📖 Môn: <strong>${escapeHtml(doc.subject)}</strong></p>
        <p style="font-size:11px; color:var(--text-muted);">✍️ Đăng bởi: ${escapeHtml(doc.author)} • 📅 ${doc.date}</p>
      </div>
      <div class="doc-card-actions">
        <button onclick="previewDocument('${doc.id}')" class="btn-artistic btn-blue" style="font-size:11px; padding:4px 8px;">👁️ Xem</button>
        <a href="${doc.url}" target="_blank" class="btn-artistic btn-green-glow" style="font-size:11px; padding:4px 8px; text-decoration:none;">📥 Tải Về</a>
        ${getRoleActionButtons(doc)}
      </div>
    </div>
  `).join('');
}

/* NÚT THAO TÁC THEO PHÂN QUYỀN */
function getRoleActionButtons(doc) {
  if (!currentUser) return '';
  const isAdmin = currentUser.role === 'admin';
  const isOwner = currentUser.id === doc.authorId;

  if (isAdmin || isOwner) {
    return `
      <button onclick="openEditDocumentModal('${doc.id}')" class="btn-artistic btn-secondary" style="font-size:11px; padding:4px 8px;">📝 Sửa</button>
      <button onclick="deleteDocument('${doc.id}')" class="btn-artistic btn-warning" style="font-size:11px; padding:4px 8px;">🗑️ Xóa</button>
    `;
  }
  return '';
}

/* XỬ LÝ ĐĂNG KÝ VỚI ĐẦY ĐỦ CÁC TRƯỜNG THÔNG TIN */
async function handleRegisterSubmit(e) {
  e.preventDefault();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;

  if (password !== confirmPassword) {
    return alert('❌ Mật khẩu xác nhận không trùng khớp!');
  }

  const payload = {
    fullname: document.getElementById('reg-fullname').value,
    emailPhone: document.getElementById('reg-email-phone').value,
    gender: document.getElementById('reg-gender').value,
    role: document.getElementById('reg-role').value,
    address: document.getElementById('reg-address').value,
    username: document.getElementById('reg-username').value,
    password,
    confirmPassword
  };

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(data.message);
      closeModal('register-modal');
      document.getElementById('register-form').reset();
      openModal('login-modal');
    } else {
      alert(data.message || 'Lỗi đăng ký!');
    }
  } catch (err) { alert('Lỗi kết nối máy chủ!'); }
}

/* ĐĂNG TẢI ĐA TỆP VÀ LINK BÀI BÁO */
async function handleBatchUploadSubmit(e) {
  e.preventDefault();
  const filesInput = document.getElementById('up-files');
  const linkInput = document.getElementById('up-link').value;

  if ((!filesInput.files || filesInput.files.length === 0) && !linkInput.trim()) {
    return alert('Vui lòng chọn ít nhất 1 tệp hoặc dán 1 đường dẫn bài báo!');
  }

  const formData = new FormData();
  formData.append('title', document.getElementById('up-title').value);
  formData.append('category', document.getElementById('up-category').value);
  formData.append('subject', document.getElementById('up-subject').value);
  formData.append('articleLink', linkInput);
  formData.append('author', currentUser ? currentUser.fullname : 'Khách');
  formData.append('authorId', currentUser ? currentUser.id : '0');

  if (filesInput.files) {
    for (let i = 0; i < filesInput.files.length; i++) {
      formData.append('files', filesInput.files[i]);
    }
  }

  try {
    const res = await fetch('/api/documents/batch', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      closeModal('upload-modal');
      document.getElementById('upload-form').reset();
      loadDocumentsFromServer();
    } else alert('Lỗi tải lên!');
  } catch (err) { alert('Lỗi kết nối server!'); }
}

/* PREVIEW FILE */
function previewDocument(id) {
  const doc = documentsData.find(d => d.id === id);
  if (!doc) return alert('Không tìm thấy tệp!');

  document.getElementById('preview-title').innerText = `👁️ Xem: ${doc.title}`;
  const body = document.getElementById('preview-body');

  if (doc.type === 'PDF' || doc.url.endsWith('.pdf')) {
    body.innerHTML = `<iframe src="${doc.url}" style="width:100%; height:450px; border:none;"></iframe>`;
  } else if (doc.type === 'HÌNH ẢNH') {
    body.innerHTML = `<img src="${doc.url}" style="max-width:100%; max-height:450px; border-radius:8px;">`;
  } else if (doc.type === 'LINK') {
    body.innerHTML = `<p>🌐 Liên kết ngoài: <a href="${doc.url}" target="_blank" style="color:var(--accent); font-weight:bold;">${doc.url}</a></p>`;
  } else {
    body.innerHTML = `
      <div style="padding:30px;">
        <p>📄 Tệp <strong>${doc.type}</strong> cần tải về máy để xem đầy đủ.</p>
        <a href="${doc.url}" target="_blank" class="btn-artistic btn-green-glow" style="margin-top:10px; text-decoration:none; display:inline-block;">📥 Tải Tệp Về Máy</a>
      </div>
    `;
  }
  openModal('preview-modal');
}

async function deleteDocument(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa học liệu này không?')) return;
  try {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadDocumentsFromServer();
    } else alert(data.message);
  } catch (err) { alert('Lỗi xóa tệp!'); }
}

/* AUTHENTICATION UI */
function updateAuthUI() {
  const authContainer = document.getElementById('auth-buttons-container');
  if (!authContainer) return;

  if (currentUser) {
    const roleBadge = currentUser.role === 'admin' ? '🔑 Admin' : (currentUser.role === 'teacher' ? '👨‍🏫 Giảng Viên' : '🎓 Sinh Viên');
    authContainer.innerHTML = `
      <span style="font-size:11px; color:var(--accent); font-weight:bold; margin-right:4px;">[${roleBadge}]</span>
      <button onclick="handleLogout()" class="btn-artistic btn-secondary"><span class="icon-lg">🚪</span> Đăng Xuất (${escapeHtml(currentUser.fullname)})</button>
    `;
  } else {
    authContainer.innerHTML = `
      <button onclick="openModal('login-modal')" class="btn-artistic btn-blue"><span class="icon-lg">🔑</span> Đăng Nhập</button>
      <button onclick="openModal('register-modal')" class="btn-artistic btn-secondary"><span class="icon-lg">📝</span> Đăng Ký</button>
    `;
  }
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
          updateAuthUI();
          loadDocumentsFromServer();
        } else alert(data.message);
      } catch (err) { alert('Lỗi máy chủ!'); }
    });
  }
}

function openUploadCheck() {
  if (!currentUser) {
    alert('Vui lòng đăng nhập trước khi tải lên học liệu!');
    openModal('login-modal');
    return;
  }
  openModal('upload-modal');
}

function handleLogout() {
  localStorage.removeItem('edushare_user');
  currentUser = null;
  updateAuthUI();
  loadDocumentsFromServer();
}

/* SEARCH & FILTERS */
function handleSearch() {
  const kw = document.getElementById('search-input').value.toLowerCase().trim();
  const type = document.getElementById('search-type').value;

  const filtered = documentsData.filter(d => {
    const matchKw = !kw || d.title.toLowerCase().includes(kw) || (d.subject && d.subject.toLowerCase().includes(kw)) || d.author.toLowerCase().includes(kw);
    const matchType = type === 'all' || d.type === type;
    return matchKw && matchType;
  });

  renderAllContent(filtered);
}

function filterByCategory(cat) {
  const filtered = documentsData.filter(d => d.category === cat);
  renderAllContent(filtered);
}

function filterByGroup(groupType, value) {
  const filtered = documentsData.filter(d => d[groupType] === value);
  renderAllContent(filtered);
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

  renderAllContent(filtered);
}

function resetFilters(e) {
  if (e) e.preventDefault();
  document.getElementById('filter-school').value = '';
  document.getElementById('filter-faculty').value = '';
  document.getElementById('filter-major').value = '';
  document.getElementById('search-input').value = '';
  document.getElementById('search-type').value = 'all';
  renderAllContent(documentsData);
}

function exportStatsToExcel() {
  if (!window.XLSX) return alert('Đang tải thư viện Excel...');
  const dataToExport = documentsData.map(d => ({
    'Mã Học Liệu': d.id,
    'Tên Tài Liệu': d.title,
    'Loại Tệp': d.type,
    'Chuyên Mục': d.category,
    'Môn Học': d.subject,
    'Tác Giả': d.author,
    'Lượt Xem': d.views,
    'Ngày Đăng': d.date
  }));

  const ws = XLSX.utils.json_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DanhSachHocLieu");
  XLSX.writeFile(wb, "EduShare_MTU_HocLieu.xlsx");
}

/* CHATBOT AI */
function toggleChatbot() {
  const win = document.getElementById('ai-chatbot-window');
  if (win) win.style.display = (win.style.display === 'flex') ? 'none' : 'flex';
}

function quickPrompt(text) {
  document.getElementById('chatbot-input').value = text;
  sendChatMessage();
}

async function sendChatMessage() {
  const input = document.getElementById('chatbot-input');
  const text = input.value.trim();
  if (!text) return;

  const msgBox = document.getElementById('chatbot-messages');
  msgBox.innerHTML += `<div class="chat-msg user-msg">${escapeHtml(text)}</div>`;
  input.value = '';

  const typingId = 'typing-' + Date.now();
  msgBox.innerHTML += `<div class="chat-msg bot-msg" id="${typingId}">🤖 <em>AI đang phân tích...</em></div>`;
  msgBox.scrollTop = msgBox.scrollHeight;

  try {
    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    
    let matchedHtml = '';
    if (data.matchedDocs && data.matchedDocs.length > 0) {
      matchedHtml = data.matchedDocs.map(d => `<div style="font-size:11px; margin-top:4px;">📄 <strong>${escapeHtml(d.title)}</strong></div>`).join('');
    }

    document.getElementById(typingId).innerHTML = `${escapeHtml(data.reply)} ${matchedHtml}`;
  } catch (err) {
    document.getElementById(typingId).innerHTML = `🤖 EduShare AI đang xử lý!`;
  }
  msgBox.scrollTop = msgBox.scrollHeight;
}

function showSubmenuTab(tabId, el) {
  document.querySelectorAll('.submenu-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.submenu-panel').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function switchModal(fromId, toId) { closeModal(fromId); openModal(toId); }
function toggleMobileNav() { document.getElementById('main-nav-links').classList.toggle('show-mobile'); }
function resetHomePage() { window.location.href = '/'; }
function escapeHtml(str) { return str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''; }