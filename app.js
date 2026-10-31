let currentUser = JSON.parse(localStorage.getItem('edushare_user')) || null;
let documentsData = [];
let currentForgotUserId = null;
let currentActiveDocId = null;
let currentForgotAccountInfo = '';
let otpTimerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  bindAuthForms();
  updateAuthUI();
  loadDocumentsFromServer();
});

/* ==================== AUTH UI & ROLE SWITCHER ==================== */

function updateAuthUI() {
  const authContainer = document.getElementById('auth-buttons-container');
  if (!authContainer) return;

  if (currentUser) {
    let adminBtn = '';
    if (currentUser.role === 'admin') {
      adminBtn = `<button onclick="loadUsersForAdmin()" class="btn-admin-nav">🛡️ Quản Lý System</button>`;
    }

    let roleBadge = currentUser.role === 'admin' ? 'Admin' : (currentUser.role === 'teacher' ? 'Giảng viên' : 'Sinh viên');

    authContainer.innerHTML = `
      ${adminBtn}
      <button onclick="openUserProfileModal()" class="btn-user-nav">👤 ${currentUser.fullname} (${roleBadge})</button>
      <button onclick="handleLogout()" class="btn-logout-nav">Đăng Xuất</button>
    `;
  } else {
    authContainer.innerHTML = `
      <button onclick="openModal('login-modal')" class="btn-login">Đăng Nhập</button>
      <button onclick="openModal('register-modal')" class="btn-register">Đăng Ký</button>
    `;
  }
}

function switchRole(role) {
  if (role === 'guest') {
    handleLogout();
  } else {
    currentUser = {
      id: role === 'admin' ? 1 : Date.now(),
      username: role,
      fullname: role === 'admin' ? 'Quản Trị Viên' : (role === 'teacher' ? 'Giảng Viên Mẫu' : 'Sinh Viên Mẫu'),
      role: role
    };
    localStorage.setItem('edushare_user', JSON.stringify(currentUser));
    updateAuthUI();
    renderDocuments(documentsData);
  }
}

function handleLogout() {
  localStorage.removeItem('edushare_user');
  currentUser = null;
  updateAuthUI();
  renderDocuments(documentsData);
}

/* ==================== XỬ LÝ FORM AUTH & ĐĂNG KÝ ==================== */

function bindAuthForms() {
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;

      // FIX LỖI MẬT KHẨU ĐĂNG KÝ
      if (password.length < 6) {
        alert('⚠️ Mật khẩu phải có độ dài ít nhất 6 ký tự!');
        return;
      }

      if (password !== confirmPassword) {
        alert('❌ Mật khẩu và Xác nhận mật khẩu không trùng khớp! Vui lòng kiểm tra lại.');
        return;
      }

      const payload = {
        fullname: document.getElementById('reg-fullname').value,
        gender: document.getElementById('reg-gender').value,
        dob: document.getElementById('reg-dob').value,
        emailPhone: document.getElementById('reg-email-phone').value,
        school: document.getElementById('reg-school').value,
        faculty: document.getElementById('reg-faculty').value,
        major: document.getElementById('reg-major').value,
        course: document.getElementById('reg-course').value,
        className: document.getElementById('reg-class').value,
        role: document.getElementById('reg-role').value,
        username: document.getElementById('reg-username').value,
        password: password,
        confirmPassword: confirmPassword
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
      } catch (err) {
        alert('Không thể kết nối máy chủ!');
      }
    });
  }

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
          alert(data.message);
        }
      } catch (err) { alert('Lỗi máy chủ!'); }
    });
  }

  bindForgotPassword();
}

/* ==================== QUÊN MẬT KHẨU & TẠO LẠI MẬT KHẨU (FIX BẢO MẬT) ==================== */

function startOtpTimer() {
  clearInterval(otpTimerInterval);
  let timeLeft = 60;
  const timerEl = document.getElementById('otp-timer');
  const resendBtn = document.getElementById('resend-otp-btn');
  
  if (timerEl) timerEl.innerText = timeLeft;
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.style.color = '#94a3b8';
    resendBtn.style.cursor = 'not-allowed';
    resendBtn.innerText = '🔄 Cấp lại OTP';
  }

  otpTimerInterval = setInterval(() => {
    timeLeft--;
    if (timerEl) timerEl.innerText = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(otpTimerInterval);
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.style.color = '#2563eb';
        resendBtn.style.cursor = 'pointer';
        resendBtn.innerText = '🔄 Cấp lại OTP ngay';
      }
    }
  }, 1000);
}

async function handleResendOTP() {
  if (!currentForgotAccountInfo) return;
  try {
    const res = await fetch('/api/forgot-password/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountInfo: currentForgotAccountInfo })
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) {
      currentForgotUserId = data.userId;
      document.getElementById('forgot-otp-input').value = '';
      startOtpTimer();
    }
  } catch (err) {
    alert('Lỗi gửi lại mã OTP!');
  }
}

function bindForgotPassword() {
  const step1 = document.getElementById('forgot-step1-form');
  const step2 = document.getElementById('forgot-step2-form');
  const step3 = document.getElementById('forgot-step3-form');

  if (step1) {
    step1.addEventListener('submit', async (e) => {
      e.preventDefault();
      const accountInfo = document.getElementById('forgot-account-info').value;
      currentForgotAccountInfo = accountInfo;

      try {
        const res = await fetch('/api/forgot-password/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountInfo })
        });
        const data = await res.json();
        alert(data.message);
        if (res.ok) {
          currentForgotUserId = data.userId;
          step1.style.display = 'none';
          step2.style.display = 'block';
          startOtpTimer();
        }
      } catch (err) { alert('Lỗi hệ thống!'); }
    });
  }

  if (step2) {
    step2.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otpCode = document.getElementById('forgot-otp-input').value;
      try {
        const res = await fetch('/api/forgot-password/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentForgotUserId, otpCode })
        });
        const data = await res.json();
        alert(data.message);
        if (res.ok) {
          clearInterval(otpTimerInterval);
          step2.style.display = 'none';
          step3.style.display = 'block';
        }
      } catch (err) { alert('Lỗi OTP!'); }
    });
  }

  if (step3) {
    step3.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('forgot-new-password').value;
      const confirmPassword = document.getElementById('forgot-confirm-password').value;
      const otpCode = document.getElementById('forgot-otp-input').value;

      // FIX LỖI TẠO MẬT KHẨU MỚI
      if (newPassword.length < 6) {
        alert('⚠️ Mật khẩu mới phải có ít nhất 6 ký tự!');
        return;
      }

      if (newPassword !== confirmPassword) {
        alert('❌ Mật khẩu mới và Mật khẩu xác nhận không trùng khớp! Vui lòng nhập lại.');
        return;
      }

      try {
        const res = await fetch('/api/forgot-password/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentForgotUserId, otpCode, newPassword })
        });
        const data = await res.json();
        alert(data.message);
        if (res.ok) {
          closeModal('forgot-modal');
          openModal('login-modal');
        }
      } catch (err) { alert('Lỗi khi đổi mật khẩu!'); }
    });
  }
}

function openForgotPasswordModal(e) {
  if (e) e.preventDefault();
  closeModal('login-modal');
  clearInterval(otpTimerInterval);
  document.getElementById('forgot-step1-form').style.display = 'block';
  document.getElementById('forgot-step2-form').style.display = 'none';
  document.getElementById('forgot-step3-form').style.display = 'none';
  openModal('forgot-modal');
}

/* ==================== RENDERING TÀI LIỆU & BÀI BÁO ==================== */

async function loadDocumentsFromServer() {
  try {
    const res = await fetch('/api/documents');
    if (res.ok) {
      documentsData = await res.json();
      populateFilterOptions(documentsData);
      renderDocuments(documentsData);
      renderArticles(documentsData.filter(d => d.isArticle || d.type === 'LINK' || d.category === 'Bài báo tiêu biểu'));
    }
  } catch (err) { console.error('Lỗi nạp dữ liệu:', err); }
}

function renderArticles(articles) {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  if (articles.length === 0) {
    container.innerHTML = '<p style="color:#64748b;">Chưa có bài báo khoa học nào.</p>';
    return;
  }

  container.innerHTML = articles.map(art => `
    <div class="article-card">
      <span style="background:#ea580c; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px;">📰 BÀI BÁO KHOA HỌC</span>
      <h3 style="margin:8px 0; font-size:15px; color:#0f172a;">${art.title}</h3>
      <p style="font-size:12px; color:#475569; margin-bottom:10px;"><strong>Nguồn/Tác giả:</strong> ${art.author}</p>
      <a href="${art.url}" target="_blank" onclick="recordView(${art.id})" style="color:#2563eb; font-weight:bold; font-size:13px; text-decoration:none;">Xem Bài Báo Chi Tiết ➔</a>
    </div>
  `).join('');
}

function renderDocuments(docs) {
  const container = document.getElementById('document-list');
  const countText = document.getElementById('doc-count-text');
  if (!container) return;

  const normalDocs = docs.filter(d => !d.isArticle && d.type !== 'LINK');
  if (countText) countText.innerText = `Đang hiển thị ${normalDocs.length} tài liệu học tập`;

  if (normalDocs.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#64748b; padding:30px 0;">Chưa tìm thấy tài liệu phù hợp.</p>';
    return;
  }

  container.innerHTML = normalDocs.map(doc => {
    let actionBtns = '';
    let favBtn = '';
    let downloadBtn = '';

    const commentBtnText = currentUser ? '💬 Bình luận' : '💬 Xem bình luận';
    const commentBtn = `<button onclick="openDocDetailsModal(${doc.id})" style="background:#475569; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">${commentBtnText}</button>`;

    if (currentUser) {
      favBtn = `<button onclick="toggleFavorite(${doc.id})" style="background:#fef3c7; color:#92400e; border:1px solid #f59e0b; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; margin-right:4px;">⭐ Yêu thích</button>`;
      downloadBtn = `<button onclick="downloadCheck(${doc.id})" style="background:#16a34a; color:#fff; border:none; padding:6px 14px; border-radius:4px; font-size:13px; font-weight:bold; cursor:pointer;">📥 Tải về</button>`;

      if (currentUser.role === 'admin' || currentUser.id === doc.authorId || currentUser.fullname === doc.author) {
        actionBtns += `
          <button onclick="openEditDocModal(${doc.id})" style="background:#0284c7; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; margin-right:4px;">✏️ Sửa</button>
          <button onclick="deleteDocument(${doc.id})" style="background:#dc2626; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; margin-right:4px;">🗑️ Xóa</button>
        `;
      }
    }

    return `
      <div class="doc-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:18px; box-shadow:0 2px 4px rgba(0,0,0,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="background:#2563eb; color:#fff; font-size:11px; font-weight:bold; padding:2px 8px; border-radius:4px;">${doc.type}</span>
          <span style="font-size:12px; color:#94a3b8;">📅 ${doc.date}</span>
        </div>
        <h3 style="margin:10px 0 6px 0; font-size:16px; color:#0f172a; cursor:pointer;" onclick="openDocPreviewModal(${doc.id})">${doc.title}</h3>
        <p style="margin:3px 0; font-size:13px; color:#475569;"><strong>Chuyên mục:</strong> ${doc.category}</p>
        <p style="margin:3px 0; font-size:13px; color:#475569;"><strong>Môn học:</strong> ${doc.subject || 'Tổng hợp'}</p>
        <p style="margin:3px 0; font-size:12px; color:#64748b;"><strong>Đơn vị:</strong> ${doc.faculty || 'Khoa'} - ${doc.className || 'Lớp'}</p>
        <p style="margin:3px 0; font-size:12px; color:#64748b;"><strong>Tác giả:</strong> ${doc.author}</p>
        <p style="margin:3px 0; font-size:12px; color:#94a3b8;">👁️ ${doc.views || 0} lượt xem | 📥 ${doc.downloads || 0} lượt tải</p>
        
        <div style="margin-top:14px; text-align:right; display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:4px;">
          <button onclick="openDocPreviewModal(${doc.id})" style="background:#0284c7; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">👁️ Xem trước</button>
          ${commentBtn}
          ${favBtn}
          ${actionBtns}
          ${downloadBtn}
        </div>
      </div>
    `;
  }).join('');
}

/* ==================== TÍNH NĂNG XEM TRƯỚC TỆP ==================== */

async function openDocPreviewModal(docId) {
  const doc = documentsData.find(d => d.id === docId);
  if (!doc) return;

  recordView(docId);

  document.getElementById('preview-doc-title').innerText = `👁️ Xem Trước: ${doc.title}`;
  const container = document.getElementById('preview-content-box');

  if (doc.type === 'LINK') {
    window.open(doc.url, '_blank');
    return;
  }

  if (doc.type === 'PDF') {
    container.innerHTML = `
      <iframe src="${doc.url}" width="100%" height="520px" style="border:none; border-radius:6px;"></iframe>
    `;
  } else if (doc.type === 'DOCX') {
    container.innerHTML = `
      <div id="docx-render-area" style="max-height: 500px; overflow-y: auto; background: #e2e8f0; padding: 15px; border-radius: 6px;">
        <p style="text-align:center; color:#64748b; font-weight:bold; padding: 20px;">⏳ Đang nạp và xử lý tài liệu Word...</p>
      </div>
    `;

    try {
      const response = await fetch(doc.url);
      if (!response.ok) throw new Error('Không thể tải tệp tin từ máy chủ');
      const blob = await response.blob();

      const renderArea = document.getElementById('docx-render-area');
      renderArea.innerHTML = '';

      await docx.renderAsync(blob, renderArea, null, {
        className: 'docx-preview',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false
      });
    } catch (err) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:#dc2626;">
          <p style="font-size:16px; font-weight:bold;">⚠️ Không thể xem trước tệp Word này.</p>
          <p style="font-size:13px; color:#475569; margin-top:6px;">${err.message}</p>
        </div>
      `;
    }
  } else {
    let dlBtn = currentUser ? `<button onclick="downloadCheck(${doc.id})" style="background:#16a34a; color:#fff; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; margin-top:15px; cursor:pointer;">📥 Tải Về Tệp Gốc</button>` : `<p style="color:#ef4444; font-size:13px; margin-top:10px;">🔒 Vui lòng đăng nhập để tải về tệp gốc này.</p>`;

    container.innerHTML = `
      <div style="text-align:center; padding:40px; color:#475569;">
        <p style="font-size:18px; font-weight:bold; margin-bottom:10px;">📁 Tệp định dạng ${doc.type}</p>
        ${dlBtn}
      </div>
    `;
  }

  openModal('doc-preview-modal');
}

/* ==================== XUẤT BÁO CÁO EXCEL (.XLSX) ==================== */

async function exportUsersToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('⚠️ Thư viện XLSX chưa được nạp xong. Vui lòng nhấn F5 thử lại!');
    return;
  }
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Không thể lấy danh sách người dùng');
    const users = await res.json();

    const formattedUsers = users.map((u, index) => ({
      "STT": index + 1,
      "ID": u.id,
      "Họ và Tên": u.fullname,
      "Giới tính": u.gender || 'Nam',
      "Ngày sinh": u.dob || '-',
      "Email/SĐT": u.emailPhone || '-',
      "Trường Học": u.school || '-',
      "Khoa": u.faculty || '-',
      "Ngành": u.major || '-',
      "Lớp": u.className || '-',
      "Khóa": u.course || '-',
      "Tên Tài Khoản": u.username,
      "Vai Trò": u.role,
      "Trạng Thái": u.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt',
      "Ngày Tham Gia": u.createdAt || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedUsers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachNguoiDung");

    XLSX.writeFile(workbook, `EduShare_BaoCao_NguoiDung_${new Date().toISOString().split('T')[0]}.xlsx`);
    alert('✅ Đã xuất báo cáo danh sách người dùng ra file Excel thành công!');
  } catch (err) {
    alert('Lỗi xuất báo cáo Excel người dùng: ' + err.message);
  }
}

async function exportStatsToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('⚠️ Thư viện XLSX chưa được nạp xong. Vui lòng nhấn F5 thử lại!');
    return;
  }
  try {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error('Không thể lấy danh sách tài liệu');
    const docs = await res.json();

    if (!Array.isArray(docs) || docs.length === 0) {
      alert('⚠️ Chưa có dữ liệu tài liệu để xuất!');
      return;
    }

    const formattedDocs = docs.map((d, index) => ({
      "STT": index + 1,
      "ID Tài Liệu": d.id,
      "Tiêu Đề Học Liệu": d.title,
      "Định Dạng Tệp": d.type,
      "Chuyên Mục": d.category,
      "Môn Học": d.subject || 'Tổng hợp',
      "Khoa/Đơn Vị": d.faculty || '-',
      "Tác Giả": d.author,
      "Lượt Xem": d.views || 0,
      "Lượt Tải Down": d.downloads || 0,
      "Ngày Đăng": d.date
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedDocs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ThongKeTaiLieu");

    XLSX.writeFile(workbook, `EduShare_ThongKe_LuotTai_${new Date().toISOString().split('T')[0]}.xlsx`);
    alert('✅ Đã xuất báo cáo thống kê lượt tải tài liệu ra file Excel thành công!');
  } catch (err) {
    alert('Lỗi xuất báo cáo Excel tài liệu: ' + err.message);
  }
}

/* ==================== BÌNH LUẬN & ĐÁNH GIÁ (CHO KHÁCH XEM) ==================== */

async function openDocDetailsModal(docId) {
  currentActiveDocId = docId;
  const doc = documentsData.find(d => d.id === docId);
  if (!doc) return;

  recordView(docId);

  document.getElementById('detail-doc-title').innerText = doc.title;
  document.getElementById('detail-doc-info').innerHTML = `
    <p><strong>Chuyên mục:</strong> ${doc.category} | <strong>Định dạng:</strong> ${doc.type}</p>
    <p><strong>Môn học:</strong> ${doc.subject || 'Tổng hợp'} | <strong>Tác giả:</strong> ${doc.author}</p>
    <p><strong>Trường/Khoa:</strong> ${doc.school || '-'} - ${doc.faculty || '-'}</p>
  `;

  const commentFormBox = document.getElementById('comment-form-container');
  if (commentFormBox) {
    if (currentUser) {
      commentFormBox.innerHTML = `
        <form onsubmit="submitComment(event)" style="border-top:1px solid #e2e8f0; padding-top:15px;">
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
      if (currentUser && (currentUser.role === 'admin' || currentUser.id === c.userId || currentUser.fullname === c.userName)) {
        deleteBtn = `<button onclick="deleteComment(${c.id}, ${docId})" style="background:#ef4444; color:#fff; border:none; padding:2px 6px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:bold;">🗑️ Xóa</button>`;
      }

      return `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 12px; border-radius:6px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:13px; color:#1e293b;">${c.userName}</strong>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:11px; color:#f59e0b;">${'⭐'.repeat(c.rating)}</span>
              ${deleteBtn}
            </div>
          </div>
          <p style="font-size:13px; color:#334155; margin:4px 0;">${c.content}</p>
          <span style="font-size:10px; color:#94a3b8;">${c.createdAt}</span>
        </div>
      `;
    }).join('');
  } catch (err) { container.innerHTML = '<p style="color:#dc2626;">Lỗi khi nạp bình luận.</p>'; }
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
    alert('🔒 Chưa đăng nhập! Vui lòng đăng nhập để gửi bình luận.');
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
      alert(data.message);
      document.getElementById('comment-text').value = '';
      loadComments(currentActiveDocId);
    }
  } catch (err) { alert('Lỗi gửi bình luận!'); }
}

/* ==================== BỘ LỌC, TÌM KIẾM, SẮP XẾP ==================== */

function populateFilterOptions(docs) {
  const schools = [...new Set(docs.map(d => d.school).filter(Boolean))];
  const faculties = [...new Set(docs.map(d => d.faculty).filter(Boolean))];
  const majors = [...new Set(docs.map(d => d.major).filter(Boolean))];
  const courses = [...new Set(docs.map(d => d.course).filter(Boolean))];
  const classes = [...new Set(docs.map(d => d.className).filter(Boolean))];

  fillSelect('filter-school', schools, 'Tất cả Trường');
  fillSelect('filter-faculty', faculties, 'Tất cả Khoa');
  fillSelect('filter-major', majors, 'Tất cả Ngành');
  fillSelect('filter-course', courses, 'Tất cả Khóa');
  fillSelect('filter-class', classes, 'Tất cả Lớp');
}

function fillSelect(elementId, list, defaultLabel) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<option value="">${defaultLabel}</option>` + list.map(item => `<option value="${item}">${item}</option>`).join('');
}

function handleFilterChange() {
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

function handleSearch() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const type = document.getElementById('search-type').value;

  const filtered = documentsData.filter(d => {
    const matchText = d.title.toLowerCase().includes(query) ||
                      (d.category && d.category.toLowerCase().includes(query)) ||
                      (d.subject && d.subject.toLowerCase().includes(query)) ||
                      (d.author && d.author.toLowerCase().includes(query));
    const matchType = (type === 'all') || (d.type === type);
    return matchText && matchType;
  });

  renderDocuments(filtered);
}

function filterByCategory(cat) {
  const filtered = documentsData.filter(d => d.category === cat);
  renderDocuments(filtered);
}

function filterByGroup(key, value) {
  const filtered = documentsData.filter(d => d[key] === value);
  renderDocuments(filtered);
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
  renderDocuments(documentsData);
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
    sorted.sort((a, b) => b.id - a.id);
  }

  renderDocuments(sorted);
}

/* ==================== TẢI VỀ, XEM, YÊU THÍCH ==================== */

async function downloadCheck(docId) {
  if (!currentUser) {
    alert('🔒 KHÁCH CHƯA ĐĂNG NHẬP!\nVui lòng Đăng Nhập hoặc Đăng Ký để tải về!');
    openModal('login-modal');
    return;
  }

  const doc = documentsData.find(d => d.id === docId);
  if (!doc) return;

  try {
    await fetch(`/api/documents/${docId}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    });
    
    alert('✅ Tải tài liệu thành công!');
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
    alert(data.message);
  } catch (err) { alert('Lỗi Yêu thích!'); }
}

/* ==================== TRANG CÁ NHÂN & ADMIN ==================== */

async function openUserProfileModal() {
  if (!currentUser) return;

  try {
    const res = await fetch(`/api/users/profile/${currentUser.id}`);
    if (res.ok) {
      const profile = await res.json();
      renderUserProfile(profile);
      openModal('user-profile-modal');
    }
  } catch (err) { alert('Lỗi nạp trang cá nhân!'); }
}

function renderUserProfile(profile) {
  const u = profile.user;
  document.getElementById('profile-modal-title').innerText = `👤 Trang Cá Nhân: ${u.fullname}`;

  document.getElementById('profile-details-grid').innerHTML = `
    <div class="profile-info-item"><strong>Họ và tên:</strong> ${u.fullname}</div>
    <div class="profile-info-item"><strong>Tài khoản:</strong> <code>${u.username}</code></div>
    <div class="profile-info-item"><strong>Vai trò:</strong> ${u.role === 'admin' ? 'Admin' : (u.role === 'teacher' ? 'Giảng viên' : 'Sinh viên')}</div>
    <div class="profile-info-item"><strong>Trạng thái:</strong> <span class="badge-approved">Hoạt động</span></div>
    <div class="profile-info-item"><strong>Email / SĐT:</strong> ${u.emailPhone || '-'}</div>
    <div class="profile-info-item"><strong>Ngày sinh / Giới tính:</strong> ${u.dob || '-'} (${u.gender})</div>
    <div class="profile-info-item"><strong>Trường:</strong> ${u.school || '-'}</div>
    <div class="profile-info-item"><strong>Khoa / Ngành:</strong> ${u.faculty || '-'} / ${u.major || '-'}</div>
    <div class="profile-info-item"><strong>Lớp / Khóa:</strong> ${u.className || '-'} / ${u.course || '-'}</div>
    <div class="profile-info-item"><strong>Ngày tham gia:</strong> ${u.createdAt || '-'}</div>
  `;

  document.getElementById('user-uploaded-docs').innerHTML = profile.uploadedDocs.length > 0 
    ? profile.uploadedDocs.map(d => `<div class="mini-doc-item"><span>📤 ${d.title} (${d.type})</span><div><button onclick="openEditDocModal(${d.id})">Sửa</button><button onclick="deleteDocument(${d.id})">Xóa</button></div></div>`).join('')
    : '<p style="color:#64748b;">Bạn chưa đăng tài liệu nào.</p>';

  document.getElementById('user-favorite-docs').innerHTML = profile.favoriteDocs.length > 0
    ? profile.favoriteDocs.map(d => `<div class="mini-doc-item"><span>⭐ ${d.title}</span><button onclick="downloadCheck(${d.id})">Tải về</button></div>`).join('')
    : '<p style="color:#64748b;">Chưa có tài liệu yêu thích.</p>';

  document.getElementById('user-download-docs').innerHTML = profile.downloadHistoryDocs.length > 0 
    ? profile.downloadHistoryDocs.map(d => `<div class="mini-doc-item"><span>📥 ${d.title}</span></div>`).join('') 
    : '<p style="color:#64748b;">Chưa có lịch sử tải.</p>';

  document.getElementById('user-view-docs').innerHTML = profile.viewHistoryDocs.length > 0 
    ? profile.viewHistoryDocs.map(d => `<div class="mini-doc-item"><span>👁️ ${d.title}</span></div>`).join('') 
    : '<p style="color:#64748b;">Chưa có lịch sử xem.</p>';
}

function switchProfileTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

function openUploadCheck() {
  if (!currentUser) {
    alert('🔒 Chưa đăng nhập! Vui lòng đăng nhập để tải lên tài liệu.');
    openModal('login-modal');
    return;
  }
  openModal('upload-modal');
}

function toggleUploadTypeInput(val) {
  document.getElementById('up-file-box').style.display = (val === 'LINK') ? 'none' : 'block';
  document.getElementById('up-link-box').style.display = (val === 'LINK') ? 'block' : 'none';
}

async function handleUploadSubmit(e) {
  e.preventDefault();
  const formData = new FormData();
  formData.append('title', document.getElementById('up-title').value);
  formData.append('type', document.getElementById('up-type').value);
  formData.append('category', document.getElementById('up-category').value);
  formData.append('school', document.getElementById('up-school').value);
  formData.append('faculty', document.getElementById('up-faculty').value);
  formData.append('major', document.getElementById('up-major').value);
  formData.append('course', document.getElementById('up-course').value);
  formData.append('className', document.getElementById('up-class').value);
  formData.append('subject', document.getElementById('up-subject').value);
  formData.append('author', currentUser ? currentUser.fullname : 'Khách');
  formData.append('authorId', currentUser ? currentUser.id : 0);

  const type = document.getElementById('up-type').value;
  if (type === 'LINK') {
    formData.append('articleUrl', document.getElementById('up-article-url').value);
  } else {
    const fileInput = document.getElementById('up-file');
    if (fileInput && fileInput.files[0]) formData.append('file', fileInput.files[0]);
  }

  try {
    const res = await fetch('/api/documents', { method: 'POST', body: formData });
    if (res.ok) {
      alert('Đã tải lên tài liệu thành công!');
      closeModal('upload-modal');
      document.getElementById('upload-form').reset();
      loadDocumentsFromServer();
    }
  } catch (err) { alert('Lỗi tải lên!'); }
}

function openEditDocModal(docId) {
  const doc = documentsData.find(d => d.id === docId);
  if (!doc) return;

  document.getElementById('edit-doc-id').value = doc.id;
  document.getElementById('edit-title').value = doc.title;
  document.getElementById('edit-type').value = doc.type;
  document.getElementById('edit-category').value = doc.category;
  document.getElementById('edit-school').value = doc.school || '';
  document.getElementById('edit-faculty').value = doc.faculty || '';
  document.getElementById('edit-major').value = doc.major || '';
  document.getElementById('edit-course').value = doc.course || '';
  document.getElementById('edit-class').value = doc.className || '';
  document.getElementById('edit-subject').value = doc.subject || '';

  openModal('edit-doc-modal');
}

async function handleEditDocSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-doc-id').value;
  const payload = {
    title: document.getElementById('edit-title').value,
    type: document.getElementById('edit-type').value,
    category: document.getElementById('edit-category').value,
    school: document.getElementById('edit-school').value,
    faculty: document.getElementById('edit-faculty').value,
    major: document.getElementById('edit-major').value,
    course: document.getElementById('edit-course').value,
    className: document.getElementById('edit-class').value,
    subject: document.getElementById('edit-subject').value,
  };

  try {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('Đã cập nhật thông tin thành công!');
      closeModal('edit-doc-modal');
      loadDocumentsFromServer();
    }
  } catch (err) { alert('Lỗi cập nhật!'); }
}

async function deleteDocument(docId) {
  if (!confirm('Bạn có chắc muốn xóa tài liệu này khỏi hệ thống?')) return;
  try {
    const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Đã xóa tài liệu!');
      loadDocumentsFromServer();
      if (currentUser) openUserProfileModal();
    }
  } catch (err) { alert('Lỗi xóa tài liệu!'); }
}

/* ==================== ADMIN SYSTEM MANAGEMENT ==================== */

async function loadUsersForAdmin() {
  try {
    const settingsRes = await fetch('/api/settings');
    const settings = await settingsRes.json();
    document.getElementById('approval-mode-select').value = settings.approvalMode || 'manual';

    const res = await fetch('/api/users');
    const users = await res.json();
    const tbody = document.getElementById('users-table-body');

    if (tbody) {
      tbody.innerHTML = users.map(u => `
        <tr>
          <td>${u.id}</td>
          <td><strong>${u.fullname}</strong></td>
          <td>${u.gender || '-'} / ${u.dob || '-'}</td>
          <td>${u.emailPhone || '-'}</td>
          <td>
            <div style="font-size:11px;">
              <div>${u.school || '-'}</div>
              <div>${u.faculty || '-'} - ${u.className || '-'}</div>
            </div>
          </td>
          <td><code>${u.username}</code></td>
          <td><span style="font-weight:bold; font-size:11px;">${u.role}</span></td>
          <td>${u.status === 'approved' ? `<span class="badge-approved">Đã duyệt</span>` : `<span class="badge-pending">Chờ duyệt</span>`}</td>
          <td>
            <div style="display:flex; gap:4px;">
              ${u.status === 'pending' ? `<button onclick="approveUser(${u.id})" style="background:#16a34a; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Duyệt</button>` : ''}
              ${u.username !== 'admin' ? `<button onclick="deleteUser(${u.id})" style="background:#dc2626; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Xóa</button>` : '<i>Gốc</i>'}
            </div>
          </td>
        </tr>
      `).join('');
    }
    openModal('admin-users-modal');
  } catch (err) { alert('Lỗi nạp danh sách Admin!'); }
}

async function handleApprovalModeChange(mode) {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalMode: mode })
    });
    const data = await res.json();
    alert(data.message);
  } catch (err) { alert('Lỗi cập nhật cấu hình!'); }
}

async function approveUser(id) {
  try {
    const res = await fetch(`/api/users/${id}/approve`, { method: 'PATCH' });
    if (res.ok) {
      alert('Đã duyệt tài khoản thành công!');
      loadUsersForAdmin();
    }
  } catch (err) { alert('Lỗi duyệt tài khoản!'); }
}

async function deleteUser(id) {
  if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
  try {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Đã xóa người dùng!');
      loadUsersForAdmin();
    }
  } catch (err) { alert('Lỗi xóa người dùng!'); }
}

/* ==================== TIỆN ÍCH MODAL ==================== */

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}