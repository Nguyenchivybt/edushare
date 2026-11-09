/**
 * EduShare Frontend Logic - public/js/app.js
 * Tác giả: Nguyễn Chí Vỹ | Trường ĐH Xây dựng Miền Tây (MTU)
 */

const CONFIG = {
    API_BASE_URL: window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api',
    STORAGE_KEY_USER: 'edushare_user_session',
    STORAGE_KEY_THEME: 'edushare_theme_mode',
    STORAGE_KEY_STYLE: 'edushare_theme_style'
};

const state = {
    currentUser: null, // Null = Khách
    documents: [],
    groups: [],
    savedDocumentIds: new Set(),
    activeGroupId: "group-1",
    otpTimer: null
};

// Loại bỏ dấu tiếng Việt để phục vụ tìm kiếm thông minh Fuzzy
function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str.trim();
}

// Hệ thống Thông báo Toast Popup chuẩn Icon Tích Xanh & Dấu X Đỏ
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const isSuccess = type === 'success';
    const alertClass = isSuccess ? 'bg-success text-white' : (type === 'warning' ? 'bg-warning text-dark' : 'bg-danger text-white');
    const iconHtml = isSuccess ? '<i class="bi bi-check-circle-fill me-2 fs-5"></i>' : '<i class="bi bi-x-circle-fill me-2 fs-5"></i>';
    
    const toast = document.createElement('div');
    toast.className = `alert ${alertClass} alert-dismissible fade show shadow-lg mb-2 rounded-3 d-flex align-items-center`;
    toast.innerHTML = `${iconHtml}<div class="fw-bold">${message}</div><button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadThemeSettings();
    loadUserSession();
    bindEvents();
    fetchDocuments();
    fetchGroups();
}

function loadThemeSettings() {
    const theme = localStorage.getItem(CONFIG.STORAGE_KEY_THEME) || 'light';
    const style = localStorage.getItem(CONFIG.STORAGE_KEY_STYLE) || 'academic';
    
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-style', style);
    
    const switchEl = document.getElementById('darkModeSwitch');
    if (switchEl) switchEl.checked = (theme === 'dark');
}

function loadUserSession() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY_USER);
    if (saved) {
        try { state.currentUser = JSON.parse(saved); } catch (e) { state.currentUser = null; }
    }
    updateUserUI();
}

function bindEvents() {
    // 1. Nhấp Logo EduShare -> Quay về Trang Chủ
    document.getElementById('brandLogoLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('feed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btnHeaderHome')?.addEventListener('click', () => {
        switchTab('feed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('navLinkDocs')?.addEventListener('click', (e) => { e.preventDefault(); switchTab('feed'); });
    document.getElementById('navLinkCommunity')?.addEventListener('click', (e) => { e.preventDefault(); switchTab('groups'); });

    // Modals Handling
    const authModal = document.getElementById('authModal');
    document.getElementById('btnHeaderLogin')?.addEventListener('click', () => openModal(authModal));
    document.getElementById('btnHeaderRegister')?.addEventListener('click', () => openModal(authModal));
    document.getElementById('btnCloseAuth')?.addEventListener('click', () => closeModal(authModal));

    document.getElementById('btnCloseViewDoc')?.addEventListener('click', () => closeModal(document.getElementById('documentViewModal')));
    document.getElementById('btnCloseProfileSettings')?.addEventListener('click', () => closeModal(document.getElementById('profileSettingsModal')));
    document.getElementById('btnOpenProfileSettings')?.addEventListener('click', () => openModal(document.getElementById('profileSettingsModal')));

    document.getElementById('btnHeroUpload')?.addEventListener('click', () => {
        if (!state.currentUser) {
            showToast('Chưa đăng nhập! Vui lòng đăng nhập để đăng tải học liệu.', 'error');
            openModal(authModal);
            return;
        }
        openModal(document.getElementById('uploadModal'));
    });
    document.getElementById('btnCloseUpload')?.addEventListener('click', () => closeModal(document.getElementById('uploadModal')));

    document.getElementById('btnFloatingAi')?.addEventListener('click', () => openModal(document.getElementById('aiChatModal')));
    document.getElementById('btnCloseAi')?.addEventListener('click', () => closeModal(document.getElementById('aiChatModal')));

    // Đăng xuất: Ngăn tự động đăng nhập khi F5
    document.getElementById('btnLogout')?.addEventListener('click', () => {
        state.currentUser = null;
        localStorage.removeItem(CONFIG.STORAGE_KEY_USER);
        updateUserUI();
        showToast('Đã đăng xuất tài khoản!', 'success');
    });

    // Form Đăng ký: Giữ nguyên phân quyền chính xác
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const role = formData.get('role');

        const payload = Object.fromEntries(formData.entries());
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                state.currentUser = result.user;
                localStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(result.user));
                updateUserUI();
                closeModal(authModal);
                showToast('Đã đăng ký thành công!', 'success');
            } else {
                showToast(result.message || 'Đăng ký thất bại. Vui lòng thử lại!', 'error');
            }
        } catch (err) {
            showToast('Đăng ký thất bại. Vui lòng thử lại!', 'error');
        }
    });

    // Form Đăng nhập
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const identity = formData.get('identity');
        const password = formData.get('password');
        const remember = document.getElementById('rememberMeCheck')?.checked;

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity, password })
            });
            const result = await res.json();
            if (result.success) {
                state.currentUser = result.user;
                if (remember) {
                    localStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(result.user));
                }
                updateUserUI();
                closeModal(authModal);
                showToast('Đã đăng nhập thành công!', 'success');
            } else {
                showToast('Đăng nhập thất bại. Vui lòng thử lại!', 'error');
            }
        } catch (err) {
            showToast('Đăng nhập thất bại. Vui lòng thử lại!', 'error');
        }
    });

    // Đăng nhập nhanh Google / Facebook
    document.getElementById('btnSocialGoogle')?.addEventListener('click', () => handleSocialLogin('google'));
    document.getElementById('btnSocialFacebook')?.addEventListener('click', () => handleSocialLogin('facebook'));

    // Quên mật khẩu OTP
    document.getElementById('btnRequestOtp')?.addEventListener('click', async () => {
        const identity = document.getElementById('forgotIdentityInput')?.value.trim();
        if (!identity) {
            showToast('Sai cú pháp hoặc thông tin không tồn tại', 'error');
            return;
        }
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/forgot-password/otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity })
            });
            const result = await res.json();
            if (result.success) {
                document.getElementById('forgotStep1')?.classList.add('d-none');
                document.getElementById('forgotStep2')?.classList.remove('d-none');
                startOtpTimer(60);
                showToast(`Mã OTP demo của bạn là: ${result.otp}`, 'success');
            } else {
                showToast(result.message || 'Sai cú pháp hoặc thông tin không tồn tại', 'error');
            }
        } catch (e) {
            showToast('Sai cú pháp hoặc thông tin không tồn tại', 'error');
        }
    });

    document.getElementById('btnSubmitResetPass')?.addEventListener('click', async () => {
        const identity = document.getElementById('forgotIdentityInput')?.value.trim();
        const otp = document.getElementById('otpCodeInput')?.value.trim();
        const newPassword = document.getElementById('otpNewPassword')?.value;
        const confirmPassword = document.getElementById('otpConfirmPassword')?.value;

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/forgot-password/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity, otp, newPassword, confirmPassword })
            });
            const result = await res.json();
            if (result.success) {
                showToast('Đã cập nhật mật khẩu mới! Vui lòng đăng nhập lại.', 'success');
                document.getElementById('forgotStep2')?.classList.add('d-none');
                document.getElementById('forgotStep1')?.classList.remove('d-none');
            } else {
                showToast(result.message || 'Mã sai hoặc đã quá hạn, vui lòng nhập lại!', 'error');
            }
        } catch (e) {
            showToast('Mã sai hoặc đã quá hạn, vui lòng nhập lại!', 'error');
        }
    });

    // Lưu thiết lập Giao diện Cá nhân
    document.getElementById('btnSaveProfileSettings')?.addEventListener('click', () => {
        const isDark = document.getElementById('darkModeSwitch')?.checked;
        const styleVal = document.getElementById('settingStyleSelect')?.value || 'academic';

        const themeMode = isDark ? 'dark' : 'light';
        localStorage.setItem(CONFIG.STORAGE_KEY_THEME, themeMode);
        localStorage.setItem(CONFIG.STORAGE_KEY_STYLE, styleVal);

        document.documentElement.setAttribute('data-theme', themeMode);
        document.documentElement.setAttribute('data-style', styleVal);

        closeModal(document.getElementById('profileSettingsModal'));
        showToast('Đã lưu thiết lập giao diện!', 'success');
    });

    // Upload Form
    document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        if (state.currentUser) {
            formData.append('authorId', state.currentUser.id);
            formData.append('authorName', state.currentUser.fullName);
            formData.append('authorRole', state.currentUser.role);
        }

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/documents`, {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            if (result.success) {
                closeModal(document.getElementById('uploadModal'));
                fetchDocuments();
                showToast('Tải tệp thành công!', 'success');
            } else {
                showToast('Tải tệp thất bại. Vui lòng thử lại sau!', 'error');
            }
        } catch (err) {
            showToast('Tải tệp thất bại. Vui lòng thử lại sau!', 'error');
        }
    });

    // Chatbot AI Prompt
    document.getElementById('btnSendAiPrompt')?.addEventListener('click', async () => {
        const input = document.getElementById('aiPromptInput');
        const prompt = input?.value.trim();
        if (!prompt) return;

        const box = document.getElementById('aiMessageContainer');
        if (box) {
            box.innerHTML += `<div class="mb-2 text-end text-primary"><strong>Bạn:</strong> ${prompt}</div>`;
            input.value = '';
            box.scrollTop = box.scrollHeight;
        }

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const result = await res.json();
            if (box) {
                box.innerHTML += `<div class="mb-2 text-dark"><strong>AI Engine:</strong> ${result.reply}</div>`;
                box.scrollTop = box.scrollHeight;
            }
        } catch (e) {
            if (box) box.innerHTML += `<div class="mb-2 text-danger"><strong>AI Engine:</strong> Gặp sự cố kết nối.</div>`;
        }
    });

    // Fuzzy Search Events
    document.getElementById('headerSearchInput')?.addEventListener('input', (e) => filterDocuments(e.target.value));
    document.getElementById('searchFileInput')?.addEventListener('input', (e) => filterDocuments(e.target.value));

    // Form Chat Send
    document.getElementById('chatSendForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInputText');
        const text = input ? input.value.trim() : '';
        if (!text) return;
        appendChatMessage(state.currentUser ? state.currentUser.fullName : "Sinh viên", text);
        input.value = '';
    });

    // Chống copy với Khách chưa đăng nhập
    document.addEventListener('copy', (e) => {
        if (!state.currentUser) {
            e.preventDefault();
            showToast('Khách chỉ được xem nội dung, không được copy bài viết!', 'error');
        }
    });
}

function handleSocialLogin(provider) {
    fetch(`${CONFIG.API_BASE_URL}/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
    }).then(r => r.json()).then(res => {
        if (res.success) {
            state.currentUser = res.user;
            localStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(res.user));
            updateUserUI();
            closeModal(document.getElementById('authModal'));
            showToast(`Đã đăng nhập thành công qua ${provider === 'google' ? 'Google' : 'Facebook'}!`, 'success');
        }
    });
}

function startOtpTimer(sec) {
    let count = sec;
    const timerSpan = document.getElementById('otpTimerCount');
    clearInterval(state.otpTimer);
    state.otpTimer = setInterval(() => {
        count--;
        if (timerSpan) timerSpan.textContent = count;
        if (count <= 0) clearInterval(state.otpTimer);
    }, 1000);
}

function openModal(el) { if (el) el.classList.add('show'); }
function closeModal(el) { if (el) el.classList.remove('show'); }

function switchTab(tabName) {
    document.getElementById('tab-feed')?.classList.toggle('d-none', tabName !== 'feed');
    document.getElementById('tab-saved')?.classList.toggle('d-none', tabName !== 'saved');
    document.getElementById('tab-groups')?.classList.toggle('d-none', tabName !== 'groups');
}

async function fetchDocuments() {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/documents`);
        const result = await res.json();
        state.documents = result.data || [];
        renderDocuments(state.documents);
    } catch (e) {
        state.documents = [];
    }
}

function filterDocuments(query) {
    if (!query) {
        renderDocuments(state.documents);
        return;
    }
    const qNorm = removeVietnameseTones(query);
    const filtered = state.documents.filter(d => {
        const full = removeVietnameseTones(`${d.title} ${d.description} ${d.subject} ${d.authorName}`);
        return qNorm.split(' ').some(kw => full.includes(kw));
    });
    renderDocuments(filtered);
}

function renderDocuments(docs) {
    const container = document.getElementById('documentContainer');
    if (!container) return;

    container.innerHTML = docs.map(doc => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 shadow-sm border-0 rounded-4" style="background-color: var(--card-bg);">
                <div class="card-body d-flex flex-column p-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-primary-subtle text-primary fw-bold">${doc.category}</span>
                        <span class="badge bg-secondary-subtle text-dark border fw-semibold">${doc.className || 'MTU'}</span>
                    </div>
                    <h5 class="card-title fw-bold mb-2 text-main fs-6">${doc.title}</h5>
                    <p class="card-text text-muted small mb-3 flex-grow-1 fw-medium">${doc.description}</p>
                    <div class="mt-auto pt-3 border-top">
                        <div class="d-flex align-items-center text-secondary small mb-3">
                            <i class="bi bi-person-circle me-1 text-primary"></i>
                            <span class="me-2 fw-bold text-main">${doc.authorName}</span>
                            <span class="badge bg-light text-dark border">${formatRoleLabel(doc.authorRole)}</span>
                        </div>
                        <div class="d-flex flex-wrap gap-1 justify-content-between align-items-center">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-danger" onclick="handleLikeDocument(${doc.id})"><i class="bi bi-hand-thumbs-up-fill"></i> ${doc.likes}</button>
                                <button class="btn btn-outline-secondary" onclick="handleDislikeDocument(${doc.id})"><i class="bi bi-hand-thumbs-down-fill"></i> ${doc.dislikes}</button>
                            </div>
                            <div class="d-flex gap-1">
                                <button class="btn btn-sm btn-outline-primary fw-bold" onclick="handleViewDocument(${doc.id})"><i class="bi bi-eye"></i> Xem</button>
                                <button class="btn btn-sm btn-primary fw-bold" onclick="handleDownloadDocument(${doc.id}, '${doc.category}')"><i class="bi bi-download"></i> Tải về</button>
                                <button class="btn btn-sm btn-outline-danger border-0" onclick="handleDeleteDocument(${doc.id}, '${doc.authorId}')"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function handleViewDocument(docId) {
    const doc = state.documents.find(d => d.id === docId);
    if (!doc) return;

    document.getElementById('viewDocTitle').textContent = doc.title;
    document.getElementById('viewDocSubject').textContent = `Môn học: ${doc.subject}`;
    document.getElementById('viewDocDesc').textContent = doc.description;
    document.getElementById('viewDocAuthor').textContent = doc.authorName;

    const preview = document.getElementById('docPreviewContainer');
    if (!state.currentUser) {
        preview.classList.add('unselectable');
        preview.innerHTML = `<div class="alert alert-warning small mb-2 fw-bold">Khách chỉ được xem nội dung. Không thể tải về hoặc copy bài viết.</div><div>${doc.description}</div>`;
    } else {
        preview.classList.remove('unselectable');
        preview.innerHTML = `<div>${doc.description}</div>`;
    }
    openModal(document.getElementById('documentViewModal'));
}

function handleDownloadDocument(docId, category) {
    if (!state.currentUser) {
        showToast('Chưa đăng nhập! Khách chỉ được xem tài liệu, không thể tải về.', 'error');
        openModal(document.getElementById('authModal'));
        return;
    }
    if (state.currentUser.role === 'STUDENT' && category === 'ARTICLE') {
        showToast('Sinh viên chỉ có quyền xem bài báo khoa học, không được phép tải về!', 'error');
        return;
    }
    showToast('Tải tệp thành công!', 'success');
}

function handleDeleteDocument(docId, docAuthorId) {
    if (!state.currentUser) {
        showToast('Vui lòng đăng nhập để thực hiện!', 'error');
        return;
    }
    if (state.currentUser.role !== 'ADMIN' && state.currentUser.id !== docAuthorId) {
        showToast('Bạn chỉ được phép chỉnh sửa hoặc xóa tài liệu do bản thân đăng tải!', 'error');
        return;
    }
    state.documents = state.documents.filter(d => d.id !== docId);
    renderDocuments(state.documents);
    showToast('Đã xóa Tệp tin!', 'success');
}

function handleLikeDocument(docId) {
    const d = state.documents.find(x => x.id === docId);
    if (d) { d.likes++; renderDocuments(state.documents); }
}

function handleDislikeDocument(docId) {
    const d = state.documents.find(x => x.id === docId);
    if (d) { d.dislikes++; renderDocuments(state.documents); }
}

async function fetchGroups() {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/groups`);
        const result = await res.json();
        state.groups = result.data || [];
        renderGroupLists();
    } catch (e) {}
}

function renderGroupLists() {
    const joined = state.groups.filter(g => g.status === 'JOINED');
    const pending = state.groups.filter(g => g.status === 'PENDING');
    const suggested = state.groups.filter(g => g.status === 'SUGGESTED');

    document.getElementById('joinedGroupsList').innerHTML = joined.map(g => `
        <div class="list-group-item d-flex justify-content-between align-items-center p-2 cursor-pointer bg-transparent text-main" onclick="openGroupChat('${g.id}', '${g.name}', ${g.membersCount})">
            <div><strong class="text-primary">${g.name}</strong><br><small class="text-secondary">${g.membersCount} thành viên</small></div>
            <button class="btn btn-sm btn-primary fw-bold">Trò chuyện</button>
        </div>
    `).join('');

    document.getElementById('pendingGroupsList').innerHTML = pending.map(g => `
        <div class="list-group-item d-flex justify-content-between align-items-center p-2 bg-transparent text-main">
            <div><strong>${g.name}</strong><br><small class="text-warning fw-bold">Đang chờ duyệt</small></div>
        </div>
    `).join('');

    document.getElementById('suggestedGroupsList').innerHTML = suggested.map(g => `
        <div class="list-group-item d-flex justify-content-between align-items-center p-2 bg-transparent text-main">
            <div><strong>${g.name}</strong><br><small class="text-secondary">${g.membersCount} thành viên</small></div>
            <button class="btn btn-sm btn-outline-primary fw-bold" onclick="handleJoinGroup('${g.id}', '${g.name}')">Tham gia</button>
        </div>
    `).join('');
}

// THAM GIA HOẶC TẠO NHÓM -> TỰ ĐỘNG CHUYỂN NGAY SANG TAB CHAT
function handleJoinGroup(groupId, groupName) {
    const g = state.groups.find(x => x.id === groupId);
    if (g) g.status = 'JOINED';
    renderGroupLists();
    showToast(`Đã tạo/tham gia nhóm ${groupName} thành công!`, 'success');
    openGroupChat(groupId, groupName, g ? g.membersCount : 50);
}

function openGroupChat(groupId, groupName, membersCount) {
    state.activeGroupId = groupId;
    switchTab('groups');
    document.getElementById('chatGroupName').textContent = groupName;
    document.getElementById('chatGroupMembers').textContent = `${membersCount} Thành viên`;

    const chatBox = document.getElementById('chatMessagesBox');
    if (chatBox) {
        chatBox.innerHTML = `
            <div class="text-center text-secondary small my-2 fw-semibold">-- Bạn đã tham gia phòng trò chuyện nhóm ${groupName} --</div>
            <div class="mb-2 text-dark"><strong>Thầy Điền Việt Đức (Giảng viên):</strong> Chào các em, chúc các em học tập tốt!</div>
        `;
    }
}

function appendChatMessage(sender, text) {
    const chatBox = document.getElementById('chatMessagesBox');
    if (!chatBox) return;
    const div = document.createElement('div');
    div.className = 'mb-2 text-dark';
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function updateUserUI() {
    const authBox = document.getElementById('userAuthContainer');
    const profileWidget = document.getElementById('userProfileWidget');

    if (state.currentUser) {
        authBox?.classList.add('d-none');
        profileWidget?.classList.remove('d-none');
        profileWidget?.classList.add('d-flex');
        document.getElementById('userProfileName').textContent = state.currentUser.fullName;
        document.getElementById('userProfileRole').textContent = `${formatRoleLabel(state.currentUser.role)} • MTU`;
    } else {
        authBox?.classList.remove('d-none');
        profileWidget?.classList.add('d-none');
    }
}

function formatRoleLabel(role) {
    const map = { 'STUDENT': 'Sinh viên', 'TEACHER': 'Giảng viên', 'ADMIN': 'Quản trị viên' };
    return map[role] || 'Khách';
}