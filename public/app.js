let currentUser = JSON.parse(localStorage.getItem('edushare_user')) || null;
let documentsData = [];
let currentActiveDocId = null;
let currentOnlineStatus = localStorage.getItem('edushare_status') || 'online';

document.addEventListener('DOMContentLoaded', () => {
  bindAuthForms();
  updateAuthUI();
  loadDocumentsFromServer();
  applySavedTheme();
});

/* ==================== 1. CHATBOT AI & BẬT TẮT NÚT NỔI ==================== */

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
  msgBox.innerHTML += `<div class="chat-msg bot-msg" id="${typingId}">🤖 <em>AI đang phân tích và tìm kiếm tri thức...</em></div>`;
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
        <div class="chat-doc-card">
          <h4>📄 ${escapeHtml(d.title)}</h4>
          <p>📌 <strong>Môn:</strong> ${escapeHtml(d.subject || 'Tổng hợp')} | <strong>Định dạng:</strong> ${d.type}</p>
          <button onclick="openDocPreviewModal('${d.id}')" style="background:#2563eb; color:#fff; border:none; padding:3px 8px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:bold; margin-top:4px;">👁️ Xem ngay</button>
        </div>
      `).join('');
    }

    if (typingElem) {
      typingElem.innerHTML = `${formattedReply} ${docCardsHtml}`;
    }
  } catch (err) {
    const typingElem = document.getElementById(typingId);
    if (typingElem) {
      typingElem.innerHTML = `🤖 Rất tiếc, đã có lỗi kết nối mạng! Vui lòng thử lại sau.`;
    }
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

/* ==================== 2. CÀI ĐẶT GIAO DIỆN & TRẠNG THÁI ==================== */

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
  const newName = document.getElementById('edit-profile-fullname').value.trim();
  const newEmail = document.getElementById('edit-profile-email').value.trim();

  if (!newName) {
    alert('⚠️ Họ và tên không được để trống!');
    return;
  }

  currentUser.fullname = newName;
  currentUser.emailPhone = newEmail;
  localStorage.setItem('edushare_user', JSON.stringify(currentUser));
  alert('✅ Đã cập nhật thông tin cá nhân thành công!');
  updateAuthUI();
  closeModal('settings-modal');
}

/* ==================== 3. XỬ LÝ XEM TRƯỚC TỆP WORD/PDF KHÔNG LỖI ==================== */

async function openDocPreviewModal(docId) {
  const doc = documentsData.find(d => String(d.id) === String(docId));
  if (!doc) return;

  recordView(docId);

  document.getElementById('preview-doc-title').innerText = `👁️ Xem Trước: ${doc.title}`;
  const container = document.getElementById('preview-content-box');

  if (doc.type === 'LINK') {
    window.open(doc.url, '_blank');
    return;
  }

  if (doc.type === 'PDF') {
    container.innerHTML = `<iframe src="${doc.url}" width="100%" height="500px" style="border:none; border-radius:6px;"></iframe>`;
  } else if (doc.type === 'DOCX') {
    container.innerHTML = `
      <div id="docx-render-area" style="width:100%; height:500px; overflow-y:auto; background:#f1f5f9; padding:15px; border-radius:6px;">
        <p style="text-align:center; color:#64748b; font-weight:bold; padding:20px;">⏳ Đang nạp và xử lý tệp Word...</p>
      </div>
    `;

    if (doc.url && (doc.url.startsWith('http://') || doc.url.startsWith('https://'))) {
      const encodedUrl = encodeURIComponent(doc.url);
      document.getElementById('docx-render-area').innerHTML = `
        <iframe src="https://docs.google.com/viewer?url=${encodedUrl}&embedded=true" width="100%" height="480px" style="border:none; border-radius:6px;"></iframe>
      `;
    } else {
      try {
        const response = await fetch(doc.url);
        if (!response.ok) throw new Error('Không thể tải tệp từ máy chủ');
        const blob = await response.blob();
        const renderArea = document.getElementById('docx-render-area');
        renderArea.innerHTML = '';
        await docx.renderAsync(blob, renderArea, null, { inWrapper: true });
      } catch (err) {
        document.getElementById('docx-render-area').innerHTML = `
          <div style="text-align:center; padding:30px; color:#dc2626;">
            <p style="font-size:16px; font-weight:bold;">📄 Xem Trước Tệp Word (${doc.type})</p>
            <p style="font-size:13px; color:#475569; margin:10px 0;">Vui lòng tải tệp về thiết bị để xem với định dạng đầy đủ nhất.</p>
            ${currentUser ? `<button onclick="downloadCheck('${doc.id}')" class="btn-submit btn-green" style="width:auto; padding:8px 20px;">📥 Tải Về Tệp Gốc</button>` : `<p style="color:#2563eb; font-weight:bold; font-size:13px;">🔒 Vui lòng đăng nhập để tải tệp về.</p>`}
          </div>
        `;
      }
    }
  } else {
    container.innerHTML = `
      <div style="text-align:center; padding:40px; color:#475569;">
        <p style="font-size:18px; font-weight:bold; margin-bottom:10px;">📁 Tệp định dạng ${doc.type}</p>
        ${currentUser ? `<button onclick="downloadCheck('${doc.id}')" class="btn-submit btn-green" style="width:auto; padding:8px 20px;">📥 Tải Về Tệp Gốc</button>` : `<p style="color:#ef4444; font-size:13px; margin-top:10px;">🔒 Vui lòng đăng nhập để tải tệp về.</p>`}
      </div>
    `;
  }

  openModal('doc-preview-modal');
}

/* ==================== 4. TẢI DỮ LIỆU & RENDER ==================== */

async function loadDocumentsFromServer() {
  try {
    const res = await fetch('/api/documents');
    if (res.ok) {
      documentsData = await res.json();
      populateFilterOptions(documentsData);
      renderDocuments(documentsData);
      renderArticles(documentsData.filter(d => d.isArticle || d.type === 'LINK' || d.category === 'Bài báo tiêu biểu'));
    }
  } catch (err) {
    console.error('Lỗi kết nối máy chủ:', err);
  }
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
      <span style="background:#ea580c; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px;">📰 BÀI BÁO KHOA HỌC</span>
      <h3 style="margin:8px 0; font-size:15px; color:var(--text-main);">${escapeHtml(art.title)}</h3>
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;"><strong>Tác giả/Nguồn:</strong> ${escapeHtml(art.author || 'N/A')}</p>
      <a href="${art.url}" target="_blank" onclick="recordView('${art.id}')" style="color:#2563eb; font-weight:bold; font-size:13px; text-decoration:none;">Xem Bài Báo Chi Tiết ➔</a>
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
    let favBtn = '';
    let downloadBtn = '';

    const commentBtnText = currentUser ? '💬 Bình luận' : '💬 Xem bình luận';
    const commentBtn = `<button onclick="openDocDetailsModal('${doc.id}')" style="background:#475569; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">${commentBtnText}</button>`;

    if (currentUser) {
      favBtn = `<button onclick="toggleFavorite('${doc.id}')" style="background:#fef3c7; color:#92400e; border:1px solid #f59e0b; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; margin-right:4px;">⭐ Yêu thích</button>`;
      downloadBtn = `<button onclick="downloadCheck('${doc.id}')" style="background:#16a34a; color:#fff; border:none; padding:6px 14px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;">📥 Tải về</button>`;

      if (currentUser.role === 'admin' || String(currentUser.id) === String(doc.authorId) || currentUser.fullname === doc.author) {
        actionBtns += `
          <button onclick="deleteDocument('${doc.id}')" style="background:#dc2626; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; margin-right:4px;">🗑️ Xóa</button>
        `;
      }
    }

    return `
      <div class="doc-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:16px; box-shadow:0 2px 4px rgba(0,0,0,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="background:#2563eb; color:#fff; font-size:11px; font-weight:bold; padding:2px 8px; border-radius:4px;">${doc.type}</span>
          <span style="font-size:12px; color:var(--text-muted);">📅 ${doc.date || ''}</span>
        </div>
        <h3 style="margin:10px 0 6px 0; font-size:15px; color:var(--text-main); cursor:pointer;" onclick="openDocPreviewModal('${doc.id}')">${escapeHtml(doc.title)}</h3>
        <p style="margin:3px 0; font-size:13px; color:#2563eb; font-weight:600;">🏷️ ${escapeHtml(doc.category || 'Tài liệu')}</p>
        <p style="margin:3px 0; font-size:12px; color:var(--text-muted);"><strong>Môn học:</strong> ${escapeHtml(doc.subject || 'Tổng hợp')}</p>
        <p style="margin:3px 0; font-size:12px; color:var(--text-muted);"><strong>Đơn vị:</strong> ${escapeHtml(doc.faculty || 'Khoa')} ➔ ${escapeHtml(doc.major || 'Ngành')}</p>
        <p style="margin:3px 0; font-size:12px; color:var(--text-muted);"><strong>Tác giả:</strong> ${escapeHtml(doc.author || 'Vô danh')}</p>
        <p style="margin:3px 0; font-size:11px; color:#94a3b8;">👁️ ${doc.views || 0} lượt xem | 📥 ${doc.downloads || 0} lượt tải</p>
        
        <div style="margin-top:14px; text-align:right; display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:4px;">
          <button onclick="openDocPreviewModal('${doc.id}')" style="background:#0284c7; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">👁️ Xem trước</button>
          ${commentBtn}
          ${favBtn}
          ${actionBtns}
          ${downloadBtn}
        </div>
      </div>
    `;
  }).join('');
}

/* ==================== 5. BỘ LỌC PHÂN CẤP ==================== */

function populateFilterOptions(docs) {
  const selectedSchool = document.getElementById('filter-school').value;
  const selectedFaculty = document.getElementById('filter-faculty').value;
  const selectedMajor = document.getElementById('filter-major').value;
  const selectedCourse = document.getElementById('filter-course').value;

  let filteredForSchool = docs;
  let filteredForFaculty = docs.filter(d => !selectedSchool || d.school === selectedSchool);
  let filteredForMajor = filteredForFaculty.filter(d => !selectedFaculty || d.faculty === selectedFaculty);
  let filteredForCourse = filteredForMajor.filter(d => !selectedMajor || d.major === selectedMajor);
  let filteredForClass = filteredForCourse.filter(d => !selectedCourse || d.course === selectedCourse);

  const schools = [...new Set(filteredForSchool.map(d => d.school).filter(Boolean))];
  const faculties = [...new Set(filteredForFaculty.map(d => d.faculty).filter(Boolean))];
  const majors = [...new Set(filteredForMajor.map(d => d.major).filter(Boolean))];
  const courses = [...new Set(filteredForCourse.map(d => d.course).filter(Boolean))];
  const classes = [...new Set(filteredForClass.map(d => d.className).filter(Boolean))];

  fillSelect('filter-school', schools, '🏛️ Tất cả Trường', selectedSchool);
  fillSelect('filter-faculty', faculties, '🏢 Tất cả Khoa', selectedFaculty);
  fillSelect('filter-major', majors, '💾 Tất cả Ngành', selectedMajor);
  fillSelect('filter-course', courses, '📦 Tất cả Khóa', selectedCourse);
  fillSelect('filter-class', classes, '👥 Tất cả Lớp');

  populateMegaDropdownLists(faculties, majors, courses, classes);
}

function populateMegaDropdownLists(faculties, majors, courses, classes) {
  const defaultFaculties = faculties.length ? faculties : ['Công nghệ thông tin', 'Xây dựng', 'Kiến trúc'];
  const defaultMajors = majors.length ? majors : ['Kỹ thuật phần mềm', 'Quản lý xây dựng', 'Đô thị'];
  const defaultCourses = courses.length ? courses : ['K14', 'K15', 'K16', 'K17'];
  const defaultClasses = classes.length ? classes : ['ĐH KTPM 2023', 'ĐH Xây dựng 2023'];

  document.getElementById('dropdown-list-faculty').innerHTML = defaultFaculties.map(f => `<a href="#" onclick="filterByGroup('faculty', '${f}')">🏢 ${f}</a>`).join('');
  document.getElementById('dropdown-list-major').innerHTML = defaultMajors.map(m => `<a href="#" onclick="filterByGroup('major', '${m}')">💾 ${m}</a>`).join('');
  document.getElementById('dropdown-list-course').innerHTML = defaultCourses.map(c => `<a href="#" onclick="filterByGroup('course', '${c}')">📦 Khóa ${c}</a>`).join('');
  document.getElementById('dropdown-list-class').innerHTML = defaultClasses.map(cl => `<a href="#" onclick="filterByGroup('className', '${cl}')">👥 Lớp ${cl}</a>`).join('');
}

function fillSelect(elementId, list, defaultLabel, currentValue = '') {
  const el = document.getElementById(elementId);
  if (!el) return;

  let optionsHtml = `<option value="">${defaultLabel}</option>`;
  list.forEach(item => {
    const isSelected = item === currentValue ? 'selected' : '';
    optionsHtml += `<option value="${item}" ${isSelected}>${item}</option>`;
  });
  el.innerHTML = optionsHtml;
}

function handleFilterChange(changedLevel) {
  if (changedLevel === 'school') {
    document.getElementById('filter-faculty').value = '';
    document.getElementById('filter-major').value = '';
    document.getElementById('filter-course').value = '';
    document.getElementById('filter-class').value = '';
  } else if (changedLevel === 'faculty') {
    document.getElementById('filter-major').value = '';
    document.getElementById('filter-course').value = '';
    document.getElementById('filter-class').value = '';
  } else if (changedLevel === 'major') {
    document.getElementById('filter-course').value = '';
    document.getElementById('filter-class').value = '';
  } else if (changedLevel === 'course') {
    document.getElementById('filter-class').value = '';
  }

  populateFilterOptions(documentsData);

  const school = document.getElementById('filter-school').value;
  const faculty = document.getElementById('filter-faculty').value;
  const major = document.getElementById('filter-major').value;
  const course = document.getElementById('filter-course').value;
  const className = document.getElementById('filter-class').value;

  const filtered = documentsData.filter(d => {
    return (!school || d.school === school) &&
           (!faculty || d.faculty === faculty) &&
           (!major || d.major === major) &&
           (!course || d.course === course) &&
           (!className || d.className === className);
  });

  renderDocuments(filtered);
}

function filterByCategory(cat) {
  const filtered = documentsData.filter(d => {
    if (!d.category) return false;
    return d.category.toLowerCase().includes(cat.toLowerCase());
  });
  renderDocuments(filtered);
  closeMobileNav();
  const docSection = document.querySelector('.doc-list-section');
  if (docSection) docSection.scrollIntoView({ behavior: 'smooth' });
}

function filterByGroup(key, value) {
  const filtered = documentsData.filter(d => d[key] === value);
  renderDocuments(filtered);
  closeMobileNav();
  const docSection = document.querySelector('.doc-list-section');
  if (docSection) docSection.scrollIntoView({ behavior: 'smooth' });
}

function handleSearch() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const type = document.getElementById('search-type').value;

  const filtered = documentsData.filter(d => {
    const matchText = (d.title && d.title.toLowerCase().includes(query)) ||
                      (d.category && d.category.toLowerCase().includes(query)) ||
                      (d.subject && d.subject.toLowerCase().includes(query)) ||
                      (d.author && d.author.toLowerCase().includes(query));
    const matchType = (type === 'all') || (d.type === type);
    return matchText && matchType;
  });

  renderDocuments(filtered);
  closeMobileNav();
  const docSection = document.querySelector('.doc-list-section');
  if (docSection) docSection.scrollIntoView({ behavior: 'smooth' });
}

function resetFilters(e) {
  if (e) e.preventDefault();
  document.getElementById('search-input').value = '';
  document.getElementById('search-type').value = 'all';
  document.getElementById('filter-school').value = '';
  document.getElementById('filter-faculty').value = '';
  document.getElementById('filter-major').value = '';
  document.getElementById('filter-course').value = '';
  document.getElementById('filter-class').value = '';
  populateFilterOptions(documentsData);
  renderDocuments(documentsData);
  closeMobileNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetHomePage() { resetFilters(); }

function handleSortChange() {
  const sortType = document.getElementById('sort-select').value;
  let sorted = [...documentsData];

  if (sortType === 'downloads') {
    sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  } else if (sortType === 'views') {
    sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else {
    sorted.sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }

  renderDocuments(sorted);
}

/* ==================== 6. BÌNH LUẬN ==================== */

async function openDocDetailsModal(docId) {
  currentActiveDocId = docId;
  const doc = documentsData.find(d => String(d.id) === String(docId));
  if (!doc) return;

  recordView(docId);

  document.getElementById('detail-doc-title').innerText = doc.title;
  document.getElementById('detail-doc-info').innerHTML = `
    <p><strong>Chuyên mục:</strong> ${escapeHtml(doc.category)} | <strong>Định dạng:</strong> ${doc.type}</p>
    <p><strong>Môn học:</strong> ${escapeHtml(doc.subject || 'Tổng hợp')} | <strong>Tác giả:</strong> ${escapeHtml(doc.author)}</p>
    <p><strong>Đơn vị:</strong> ${escapeHtml(doc.school || '-')} ➔ ${escapeHtml(doc.faculty || '-')} ➔ ${escapeHtml(doc.major || '-')}</p>
  `;

  const commentFormBox = document.getElementById('comment-form-container');
  if (commentFormBox) {
    if (currentUser) {
      commentFormBox.innerHTML = `
        <form onsubmit="submitComment(event)" style="border-top:1px solid var(--border-color); padding-top:15px;">
          <div class="form-grid-2">
            <div class="input-group">
              <label>Đánh giá sao:</label>
              <select id="comment-rating">
                <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
                <option value="4">⭐⭐⭐⭐ (4 sao)</option>
                <option value="3">⭐⭐⭐ (3 sao)</option>
                <option value="2">⭐⭐ (2 sao)</option>
                <option value="1">⭐ (1 sao)</option>
              </select>
            </div>
            <div class="input-group" style="grid-column: span 2;">
              <label>Nội dung bình luận:</label>
              <textarea id="comment-text" required rows="2" style="width:100%; padding:8px; border-radius:6px; border:1px solid #cbd5e1;" placeholder="Nhập cảm nhận của bạn về tài liệu này..."></textarea>
            </div>
          </div>
          <button type="submit" class="btn-submit btn-blue" style="margin-top:10px;">Gửi Bình Luận</button>
        </form>
      `;
    } else {
      commentFormBox.innerHTML = `
        <div style="text-align:center; padding:12px; background:#fffbeb; border:1px solid #fef3c7; border-radius:6px; color:#b45309; font-size:13px; margin-top:15px;">
          🔒 Bạn đang ở chế độ Khách. Vui lòng <a href="#" onclick="closeModal('doc-details-modal'); openModal('login-modal');" style="color:#2563eb; font-weight:bold; text-decoration:underline;">Đăng Nhập</a> để gửi bình luận.
        </div>
      `;
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
      container.innerHTML = '<p style="color:#94a3b8; font-size:13px;">Chưa có bình luận nào.</p>';
      return;
    }

    container.innerHTML = comments.map(c => {
      let deleteBtn = '';
      if (currentUser && (currentUser.role === 'admin' || String(currentUser.id) === String(c.userId) || currentUser.fullname === c.userName)) {
        deleteBtn = `<button onclick="deleteComment('${c.id}', '${docId}')" style="background:#ef4444; color:#fff; border:none; padding:2px 6px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:bold;">🗑️ Xóa</button>`;
      }

      return `
        <div style="background:var(--bg-card); border:1px solid var(--border-color); padding:10px 12px; border-radius:6px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:13px; color:var(--text-main);">${escapeHtml(c.userName)}</strong>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:11px; color:#f59e0b;">${'⭐'.repeat(c.rating || 5)}</span>
              ${deleteBtn}
            </div>
          </div>
          <p style="font-size:13px; color:var(--text-muted); margin:4px 0;">${escapeHtml(c.content)}</p>
          <span style="font-size:10px; color:#94a3b8;">${c.createdAt || ''}</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p style="color:#dc2626; font-size:12px;">Lỗi khi nạp danh sách bình luận.</p>';
  }
}

async function deleteComment(commentId, docId) {
  if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
  try {
    await fetch(`/api/documents/comments/${commentId}`, { method: 'DELETE' });
    alert('Đã xóa bình luận thành công!');
    loadComments(docId);
  } catch (err) {
    loadComments(docId);
  }
}

async function submitComment(e) {
  e.preventDefault();
  if (!currentUser) {
    alert('🔒 Vui lòng đăng nhập để gửi bình luận.');
    openModal('login-modal');
    return;
  }

  const rating = document.getElementById('comment-rating').value;
  const content = document.getElementById('comment-text').value;

  try {
    const res = await fetch(`/api/documents/${currentActiveDocId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, userName: currentUser.fullname, rating, content })
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Gửi bình luận thành công!');
      document.getElementById('comment-text').value = '';
      loadComments(currentActiveDocId);
    }
  } catch (err) {
    alert('Lỗi gửi bình luận!');
  }
}

/* ==================== 7. XUẤT EXCEL ==================== */

async function exportUsersToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('⚠️ Thư viện XLSX chưa nạp xong. Vui lòng bấm F5 thử lại!');
    return;
  }
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Lỗi tải danh sách user');
    const users = await res.json();

    const formattedUsers = users.map((u, index) => ({
      "STT": index + 1,
      "ID": u.id,
      "Họ và Tên": u.fullname,
      "Giới tính": u.gender || 'Nam',
      "Ngày sinh": u.dob || '-',
      "Email/SĐT": u.emailPhone || '-',
      "Trường": u.school || '-',
      "Khoa": u.faculty || '-',
      "Ngành": u.major || '-',
      "Tài khoản": u.username,
      "Vai trò": u.role,
      "Trạng thái": u.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedUsers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachUser");
    XLSX.writeFile(workbook, `EduShare_Users_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (err) {
    alert('Lỗi xuất Excel: ' + err.message);
  }
}

async function exportStatsToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('⚠️ Thư viện XLSX chưa nạp xong. Vui lòng bấm F5 thử lại!');
    return;
  }
  try {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error('Lỗi lấy tài liệu');
    const docs = await res.json();

    const formattedDocs = docs.map((d, index) => ({
      "STT": index + 1,
      "ID": d.id,
      "Tên Học Liệu": d.title,
      "Loại Tệp": d.type,
      "Chuyên Mục": d.category,
      "Môn Học": d.subject || 'Tổng hợp',
      "Tác Giả": d.author,
      "Lượt Xem": d.views || 0,
      "Lượt Tải": d.downloads || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedDocs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ThongKeTàiLiệu");
    XLSX.writeFile(workbook, `EduShare_DocStats_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (err) {
    alert('Lỗi xuất Excel: ' + err.message);
  }
}

/* ==================== 8. AUTH & TẢI TỆP ==================== */

function updateAuthUI() {
  const authContainer = document.getElementById('auth-buttons-container');
  if (!authContainer) return;

  const statusBadge = (currentOnlineStatus === 'online') ? '🟢' : '⚪';

  if (currentUser) {
    let adminBtn = currentUser.role === 'admin' ? `<button onclick="loadUsersForAdmin()" style="background:#dc3545; color:#fff;">🛡️ Admin</button>` : '';
    authContainer.innerHTML = `
      ${adminBtn}
      <button onclick="openModal('settings-modal')" class="btn-user-nav">${statusBadge} ${escapeHtml(currentUser.fullname)}</button>
      <button onclick="handleLogout()" style="background:#64748b; color:#fff;">Đăng Xuất</button>
    `;
    const nameInput = document.getElementById('edit-profile-fullname');
    const emailInput = document.getElementById('edit-profile-email');
    if (nameInput) nameInput.value = currentUser.fullname || '';
    if (emailInput) emailInput.value = currentUser.emailPhone || '';
  } else {
    authContainer.innerHTML = `
      <button onclick="openModal('login-modal')" class="btn-login">Đăng Nhập</button>
      <button onclick="openModal('register-modal')" style="background:#475569; color:#fff;">Đăng Ký</button>
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
        dob: document.getElementById('reg-dob').value,
        emailPhone: document.getElementById('reg-email-phone').value,
        school: document.getElementById('reg-school').value,
        faculty: document.getElementById('reg-faculty').value,
        major: document.getElementById('reg-major').value,
        className: document.getElementById('reg-class').value,
        username: document.getElementById('reg-username').value,
        password: document.getElementById('reg-password').value,
        role: 'student'
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
        }
      } catch (err) { alert('Lỗi đăng ký!'); }
    });
  }
}

function handleLogout() {
  localStorage.removeItem('edushare_user');
  currentUser = null;
  updateAuthUI();
  renderDocuments(documentsData);
}

async function downloadCheck(docId) {
  if (!currentUser) {
    alert('🔒 KHÁCH CHƯA ĐĂNG NHẬP!\nVui lòng Đăng Nhập hoặc Đăng Ký để tải về!');
    openModal('login-modal');
    return;
  }

  const doc = documentsData.find(d => String(d.id) === String(docId));
  if (!doc) return;

  try {
    await fetch(`/api/documents/${docId}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    });
    alert('✅ Đang bắt đầu tải tệp về thiết bị!');
    window.open(doc.url, '_blank');
    loadDocumentsFromServer();
  } catch (err) {
    window.open(doc.url, '_blank');
  }
}

async function recordView(docId) {
  try {
    await fetch(`/api/documents/${docId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser ? currentUser.id : null })
    });
  } catch (err) {}
}

async function toggleFavorite(docId) {
  if (!currentUser) {
    alert('Vui lòng đăng nhập để lưu vào Yêu Thích!');
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
    alert(data.message || 'Đã cập nhật danh sách yêu thích!');
  } catch (err) { alert('Lỗi yêu thích!'); }
}

async function handleUploadSubmit(e) {
  e.preventDefault();
  if (!currentUser) {
    alert('Vui lòng đăng nhập!');
    openModal('login-modal');
    return;
  }

  const formData = new FormData();
  formData.append('title', document.getElementById('up-title').value);
  formData.append('type', document.getElementById('up-type').value);
  formData.append('category', document.getElementById('up-category').value);
  formData.append('author', currentUser.fullname);
  formData.append('authorId', currentUser.id);

  const fileInput = document.getElementById('up-file');
  if (fileInput && fileInput.files[0]) formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch('/api/documents', { method: 'POST', body: formData });
    if (res.ok) {
      alert('Đã tải lên học liệu thành công!');
      closeModal('upload-modal');
      document.getElementById('upload-form').reset();
      loadDocumentsFromServer();
    }
  } catch (err) { alert('Lỗi tải lên!'); }
}

async function deleteDocument(docId) {
  if (!confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
  try {
    const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Đã xóa tài liệu!');
      loadDocumentsFromServer();
    }
  } catch (err) { alert('Lỗi xóa!'); }
}

/* ADMIN QUẢN LÝ USER */
async function loadUsersForAdmin() {
  try {
    const res = await fetch('/api/users');
    const users = await res.json();
    const tbody = document.getElementById('users-table-body');

    if (tbody) {
      tbody.innerHTML = users.map(u => `
        <tr>
          <td>${u.id}</td>
          <td><strong>${escapeHtml(u.fullname)}</strong></td>
          <td><code>${escapeHtml(u.username)}</code></td>
          <td>${u.role}</td>
          <td><span class="${currentOnlineStatus === 'online' ? 'badge-online' : 'badge-offline'}">${currentOnlineStatus === 'online' ? '🟢 Đang hoạt động' : '⚪ Ngoại tuyến'}</span></td>
          <td>${u.status === 'approved' ? '<span class="badge-online">Đã duyệt</span>' : 'Chờ'}</td>
          <td><button onclick="deleteUser('${u.id}')" style="background:#dc2626; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Xóa</button></td>
        </tr>
      `).join('');
    }
    openModal('admin-users-modal');
  } catch (err) { alert('Lỗi nạp danh sách admin!'); }
}

async function deleteUser(id) {
  if (!confirm('Bạn có chắc muốn xóa user này?')) return;
  try {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    alert('Đã xóa người dùng!');
    loadUsersForAdmin();
  } catch (err) { alert('Lỗi xóa người dùng!'); }
}

/* TIỆN ÍCH MENU MOBILE & MODAL */
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

function openUploadCheck() {
  if (!currentUser) {
    alert('🔒 Vui lòng đăng nhập để tải lên tài liệu!');
    openModal('login-modal');
    return;
  }
  openModal('upload-modal');
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}