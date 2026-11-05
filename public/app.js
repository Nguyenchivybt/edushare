let currentUser = JSON.parse(localStorage.getItem('edushare_user')) || null;
let documentsData = [];
let quickShortcuts = JSON.parse(localStorage.getItem('edushare_quick')) || [
  { title: 'Cấu trúc dữ liệu', keyword: 'Cấu trúc dữ liệu' },
  { title: 'Bài báo AI', keyword: 'AI' }
];

document.addEventListener('DOMContentLoaded', () => {
  bindAuthForms();
  updateAuthUI();
  initFilterOptions();
  loadDocumentsFromServer();
  renderQuickAccess();
});

/* Khởi tạo dữ liệu các bộ lọc phân cấp */
function initFilterOptions() {
  const schoolSel = document.getElementById('filter-school');
  const facultySel = document.getElementById('filter-faculty');
  const majorSel = document.getElementById('filter-major');

  if (schoolSel && schoolSel.options.length <= 1) {
    schoolSel.innerHTML = `
      <option value="">🏛️ Tất cả Trường</option>
      <option value="Trường Đại học Xây dựng Miền Tây">Trường Đại học Xây dựng Miền Tây</option>
    `;
  }
  if (facultySel && facultySel.options.length <= 1) {
    facultySel.innerHTML = `
      <option value="">🏢 Tất cả Khoa</option>
      <option value="Công nghệ thông tin">Khoa Công Nghệ Thông Tin</option>
      <option value="Xây dựng">Khoa Xây Dựng</option>
      <option value="Kiến trúc">Khoa Kiến Trúc</option>
    `;
  }
  if (majorSel && majorSel.options.length <= 1) {
    majorSel.innerHTML = `
      <option value="">💾 Tất cả Ngành</option>
      <option value="Kỹ thuật phần mềm">Ngành Kỹ Thuật Phần Mềm</option>
      <option value="Kỹ thuật xây dựng">Ngành Kỹ Thuật Xây Dựng</option>
    `;
  }
}

/* TẢI DỮ LIỆU VÀ HIỂN THỊ FULL CHỨC NĂNG CARD */
async function loadDocumentsFromServer() {
  try {
    const res = await fetch('/api/documents');
    if (res.ok) {
      documentsData = await res.json();
      renderAllContent(documentsData);
    }
  } catch (err) {
    console.error('Lỗi tải dữ liệu tài liệu:', err);
  }
}

function renderAllContent(docs) {
  const articles = docs.filter(d => d.isArticle || d.category === 'Bài báo tiêu biểu');
  const normalDocs = docs.filter(d => !d.isArticle && d.category !== 'Bài báo tiêu biểu');

  renderArticles(articles);
  renderDocuments(normalDocs);
}

function renderArticles(articles) {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  if (articles.length === 0) {
    container.innerHTML = `<p style="font-size:12px; color:var(--text-muted); grid-column:span 3;">Chưa có bài báo khoa học nào trong danh mục này.</p>`;
    return;
  }

  container.innerHTML = articles.map(art => `
    <div class="doc-card" style="border-left: 4px solid #ea580c;">
      <div>
        <span style="background:#ea580c; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px;">📰 ${art.type}</span>
        <h3 style="font-size:14px; margin:8px 0; color:var(--text-main);">${escapeHtml(art.title)}</h3>
        <p style="font-size:12px; color:var(--text-muted); margin:4px 0;">✍️ Tác giả: <strong>${escapeHtml(art.author)}</strong></p>
        <p style="font-size:11px; color:var(--text-muted);">🏢 ${escapeHtml(art.faculty || 'Khoa Nghiên cứu')} • 📅 ${art.date}</p>
      </div>
      <div class="doc-card-actions">
        <button onclick="previewDocument('${art.id}')" class="btn-artistic btn-blue" style="font-size:11px; padding:4px 8px;">👁️ Xem</button>
        <a href="${art.url}" target="_blank" class="btn-artistic btn-green-glow" style="font-size:11px; padding:4px 8px; text-decoration:none;">📥 Tải Về</a>
        <button onclick="openEditDocumentModal('${art.id}')" class="btn-artistic btn-secondary" style="font-size:11px; padding:4px 8px;">📝 Sửa</button>
        <button onclick="deleteDocument('${art.id}')" class="btn-artistic btn-warning" style="font-size:11px; padding:4px 8px;">🗑️ Xóa</button>
      </div>
    </div>
  `).join('');
}

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
        <p style="font-size:11px; color:var(--text-muted);">✍️ ${escapeHtml(doc.author)} • 📅 ${doc.date}</p>
      </div>
      <div class="doc-card-actions">
        <button onclick="previewDocument('${doc.id}')" class="btn-artistic btn-blue" style="font-size:11px; padding:4px 8px;">👁️ Xem</button>
        <a href="${doc.url}" target="_blank" class="btn-artistic btn-green-glow" style="font-size:11px; padding:4px 8px; text-decoration:none;">📥 Tải Về</a>
        <button onclick="openEditDocumentModal('${doc.id}')" class="btn-artistic btn-secondary" style="font-size:11px; padding:4px 8px;">📝 Sửa</button>
        <button onclick="deleteDocument('${doc.id}')" class="btn-artistic btn-warning" style="font-size:11px; padding:4px 8px;">🗑️ Xóa</button>
      </div>
    </div>
  `).join('');
}

/* PREVIEW TỆP */
function previewDocument(id) {
  const doc = documentsData.find(d => d.id === id);
  if (!doc) return alert('Không tìm thấy tệp!');

  document.getElementById('preview-title').innerText = `👁️ Xem: ${doc.title}`;
  const body = document.getElementById('preview-body');

  if (doc.type === 'PDF' || doc.url.endsWith('.pdf')) {
    body.innerHTML = `<iframe src="${doc.url}" style="width:100%; height:450px; border:none;"></iframe>`;
  } else if (doc.type === 'HÌNH ẢNH') {
    body.innerHTML = `<img src="${doc.url}" style="max-width:100%; max-height:450px; border-radius:8px;">`;
  } else {
    body.innerHTML = `
      <div style="padding:40px 10px;">
        <p style="font-size:14px;">📄 Định dạng <strong>${doc.type}</strong> cần tải về máy để xem đầy đủ.</p>
        <a href="${doc.url}" target="_blank" class="btn-artistic btn-green-glow" style="margin-top:15px; text-decoration:none; display:inline-block;">📥 Tải Tệp Về Máy Mở</a>
      </div>
    `;
  }
  openModal('preview-modal');
}

/* TẢI LÊN VÀ CHỈNH SỬA TÀI LIỆU */
function openUploadCheck() {
  if (!currentUser) {
    alert('Vui lòng đăng nhập trước khi tải lên học liệu!');
    openModal('login-modal');
    return;
  }
  openModal('upload-modal');
}

async function handleUploadSubmit(e) {
  e.preventDefault();
  const fileInput = document.getElementById('up-file');
  if (!fileInput.files || fileInput.files.length === 0) return alert('Vui lòng chọn tệp!');

  const formData = new FormData();
  formData.append('title', document.getElementById('up-title').value);
  formData.append('category', document.getElementById('up-category').value);
  formData.append('subject', document.getElementById('up-subject').value);
  formData.append('author', currentUser ? currentUser.fullname : 'Khách');
  formData.append('authorId', currentUser ? currentUser.id : '0');
  formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch('/api/documents', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      closeModal('upload-modal');
      document.getElementById('upload-form').reset();
      loadDocumentsFromServer();
    } else alert('Lỗi tải lên tệp!');
  } catch (err) { alert('Lỗi kết nối server!'); }
}

function openEditDocumentModal(id) {
  const doc = documentsData.find(d => d.id === id);
  if (!doc) return;

  document.getElementById('edit-doc-id').value = doc.id;
  document.getElementById('edit-doc-title').value = doc.title;
  document.getElementById('edit-doc-subject').value = doc.subject || '';
  document.getElementById('edit-doc-category').value = doc.category || 'Tài liệu';
  openModal('edit-doc-modal');
}

async function handleEditSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-doc-id').value;
  const updatedData = {
    title: document.getElementById('edit-doc-title').value,
    subject: document.getElementById('edit-doc-subject').value,
    category: document.getElementById('edit-doc-category').value
  };

  try {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      closeModal('edit-doc-modal');
      loadDocumentsFromServer();
    } else alert('Cập nhật thất bại!');
  } catch (err) { alert('Lỗi máy chủ!'); }
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
  } catch (err) { alert('Lỗi khi xóa!'); }
}

/* ĐĂNG NHẬP GOOGLE & FACEBOOK OAUTH */
async function loginWithGoogle() {
  const fakeGoogleUser = {
    name: 'Sinh Viên Google',
    email: `sv.google.${Math.floor(Math.random()*1000)}@gmail.com`
  };
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fakeGoogleUser)
    });
    const data = await res.json();
    currentUser = data.user;
    localStorage.setItem('edushare_user', JSON.stringify(currentUser));
    alert(data.message);
    closeModal('login-modal');
    closeModal('register-modal');
    updateAuthUI();
  } catch (err) { alert('Lỗi đăng nhập Google!'); }
}

async function loginWithFacebook() {
  const fakeFbUser = {
    name: 'Sinh Viên Facebook',
    email: `sv.fb.${Math.floor(Math.random()*1000)}@facebook.com`,
    id: String(Date.now())
  };
  try {
    const res = await fetch('/api/auth/facebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fakeFbUser)
    });
    const data = await res.json();
    currentUser = data.user;
    localStorage.setItem('edushare_user', JSON.stringify(currentUser));
    alert(data.message);
    closeModal('login-modal');
    closeModal('register-modal');
    updateAuthUI();
  } catch (err) { alert('Lỗi đăng nhập Facebook!'); }
}

/* BỘ LỌC VÀ TÌM KIẾM */
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

/* XUẤT EXCEL */
function exportStatsToExcel() {
  if (!window.XLSX) return alert('Thư viện Excel đang được tải!');
  const dataToExport = documentsData.map(d => ({
    'Mã Học Liệu': d.id,
    'Tên Tài Liệu': d.title,
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

/* LỐI TẮT NHANH */
function renderQuickAccess() {
  const container = document.getElementById('quick-access-items');
  if (!container) return;
  container.innerHTML = quickShortcuts.map(item => `
    <button class="btn-quick-item" onclick="quickSearchShortcut('${escapeHtml(item.keyword)}')">⚡ ${escapeHtml(item.title)}</button>
  `).join('');
}

function quickSearchShortcut(kw) {
  document.getElementById('search-input').value = kw;
  handleSearch();
}

function addQuickShortcut() {
  const title = document.getElementById('quick-title-input').value.trim();
  const keyword = document.getElementById('quick-keyword-input').value.trim();
  if (!title || !keyword) return alert('Vui lòng nhập đầy đủ tên và từ khóa!');

  quickShortcuts.push({ title, keyword });
  localStorage.setItem('edushare_quick', JSON.stringify(quickShortcuts));
  renderQuickAccess();
  closeModal('quick-config-modal');
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
    document.getElementById(typingId).innerHTML = `🤖 EduShare AI đang bận!`;
  }
  msgBox.scrollTop = msgBox.scrollHeight;
}

/* UTILS */
function updateAuthUI() {
  const authContainer = document.getElementById('auth-buttons-container');
  if (!authContainer) return;

  if (currentUser) {
    authContainer.innerHTML = `
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
        } else alert(data.message);
      } catch (err) { alert('Lỗi máy chủ!'); }
    });
  }
}

function handleLogout() {
  localStorage.removeItem('edushare_user');
  currentUser = null;
  updateAuthUI();
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