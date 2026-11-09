/**
 * EduShare Frontend Logic - public/js/app.js
 * Tác giả: Nguyễn Chí Vỹ | MTU
 */

const CONFIG = {
    API_BASE_URL: window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api',
    STORAGE_KEY_USER: 'edushare_user_session',
    STORAGE_KEY_THEME: 'edushare_theme_mode',
    STORAGE_KEY_STYLE: 'edushare_theme_style'
};

const state = {
    currentUser: null,
    documents: [],
    groups: [],
    likedDocIds: new Set(),
    savedDocumentIds: new Set(),
    activeGroupId: "group-global",
    otpTimer: null
};

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
    document.getElementById('brandLogoLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('feed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btnHeaderHome')?.addEventListener('click', () => {
        switchTab('feed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('dropdownNavFavorites')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('saved');
    });

    document.getElementById('btnTabSavedFast')?.addEventListener('click', () => switchTab('saved'));
    document.getElementById('btnTabFeedAll')?.addEventListener('click', () => switchTab('feed'));

    // Modals
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

    document.getElementById('btnLogout')?.addEventListener('click', () => {
        state.currentUser = null;
        localStorage.removeItem(CONFIG.STORAGE_KEY_USER);
        updateUserUI();
        showToast('Đã đăng xuất tài khoản!', 'success');
    });

    // Form Đăng ký
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
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
                if (remember) localStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(result.user));
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

    // Theme Settings
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

    // Form Upload Document
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

    // Form Chat Send với Đính kèm Đa Tệp
    document.getElementById('chatSendForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textInput = document.getElementById('chatInputText');
        const fileInput = document.getElementById('chatFileInput');
        
        const text = textInput ? textInput.value.trim() : '';
        const files = fileInput ? fileInput.files : [];
        
        if (!text && files.length === 0) return;

        const formData = new FormData();
        formData.append('sender', state.currentUser ? state.currentUser.fullName : "Sinh viên");
        formData.append('role', state.currentUser ? state.currentUser.role : "STUDENT");
        formData.append('text', text);
        for (let i = 0; i < files.length; i++) {
            formData.append('attachments', files[i]);
        }

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/groups/${state.activeGroupId}/messages`, {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            if (result.success) {
                appendChatMessage(result.data.sender, result.data.text, result.data.files);
                if (textInput) textInput.value = '';
                if (fileInput) fileInput.value = '';
                document.getElementById('chatFilePreviewContainer').innerHTML = '';
            }
        } catch (err) {
            showToast('Gửi tin nhắn thất bại!', 'error');
        }
    });

    document.getElementById('chatFileInput')?.addEventListener('change', (e) => {
        const preview = document.getElementById('chatFilePreviewContainer');
        if (!preview) return;
        preview.innerHTML = '';
        Array.from(e.target.files).forEach(f => {
            preview.innerHTML += `<span class="badge bg-secondary-subtle text-dark border"><i class="bi bi-paperclip me-1"></i>${f.name}</span>`;
        });
    });

    // Chatbot AI
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

    document.getElementById('headerSearchInput')?.addEventListener('input', (e) => filterDocuments(e.target.value));

    // Chống copy đối với Khách
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

function filterByNav(key, val) {
    switchTab('feed');
    const filtered = state.documents.filter(d => d[key] === val);
    renderDocuments(filtered.length ? filtered : state.documents);
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

    container.innerHTML = docs.map(doc => {
        const isLiked = state.likedDocIds.has(doc.id);
        const isSaved = state.savedDocumentIds.has(doc.id);

        return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 shadow-sm border-0 rounded-4" style="background-color: var(--card-bg);">
                <div class="card-body d-flex flex-column p-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-primary-subtle text-primary fw-bold">${doc.category}</span>
                        <div class="d-flex align-items-center gap-1">
                            <button class="btn btn-sm btn-link text-warning p-0" onclick="toggleSaveDocument(${doc.id})">
                                <i class="bi ${isSaved ? 'bi-star-fill' : 'bi-star'} fs-5"></i>
                            </button>
                            <span class="badge bg-secondary-subtle text-dark border fw-semibold">${doc.className || 'MTU'}</span>
                        </div>
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
                            
                            <!-- LOGIC NÚT THÍCH TOGGLE (BẤM 1 LẦN THÍCH, BẤM THÊM 1 LẦN THU HỒI) -->
                            <button class="btn btn-sm ${isLiked ? 'btn-danger' : 'btn-outline-danger'} fw-bold" onclick="toggleLikeDocument(${doc.id})">
                                <i class="bi bi-heart-fill me-1"></i> ${doc.likes}
                            </button>

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
    `}).join('');
}

// XỬ LÝ NÚT THÍCH TOGGLE BẤM 1 LẦN THÍCH, BẤM 2 LẦN THU HỒI
async function toggleLikeDocument(docId) {
    const isLiked = state.likedDocIds.has(docId);
    const action = isLiked ? 'unlike' : 'like';

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/documents/${docId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        const result = await res.json();
        if (result.success) {
            if (isLiked) {
                state.likedDocIds.delete(docId);
                showToast('Đã thu hồi lượt thích!', 'info');
            } else {
                state.likedDocIds.add(docId);
                showToast('Đã thích tài liệu thành công!', 'success');
            }
            const doc = state.documents.find(d => d.id === docId);
            if (doc) doc.likes = result.likes;
            renderDocuments(state.documents);
        }
    } catch (e) {
        showToast('Lỗi tương tác nút Thích!', 'error');
    }
}

function toggleSaveDocument(docId) {
    if (state.savedDocumentIds.has(docId)) {
        state.savedDocumentIds.delete(docId);
        showToast('Đã bỏ khỏi mục Yêu thích cá nhân!', 'info');
    } else {
        state.savedDocumentIds.add(docId);
        showToast('Đã thêm vào mục Yêu thích cá nhân!', 'success');
    }
    renderDocuments(state.documents);
    renderSavedDocuments();
}

function renderSavedDocuments() {
    const container = document.getElementById('savedDocumentContainer');
    if (!container) return;
    const savedDocs = state.documents.filter(d => state.savedDocumentIds.has(d.id));
    if (savedDocs.length === 0) {
        container.innerHTML = `<div class="col-12 text-muted fw-semibold py-4">Chưa có tài liệu nào trong mục Yêu thích cá nhân.</div>`;
        return;
    }
    renderDocuments(savedDocs);
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

    document.getElementById('joinedGroupsList').innerHTML = joined.map(g => `
        <div class="list-group-item d-flex justify-content-between align-items-center p-2 cursor-pointer bg-transparent text-main" onclick="openGroupChat('${g.id}', '${g.name}', ${g.membersCount})">
            <div><strong class="text-primary">${g.name}</strong><br><small class="text-secondary">${g.membersCount} thành viên</small></div>
            <button class="btn btn-sm btn-primary fw-bold">Trò chuyện</button>
        </div>
    `).join('');
}

function openGroupChat(groupId, groupName, membersCount) {
    state.activeGroupId = groupId;
    switchTab('groups');
    document.getElementById('chatGroupName').textContent = groupName;
    document.getElementById('chatGroupMembers').textContent = `${membersCount} Thành viên`;

    fetch(`${CONFIG.API_BASE_URL}/groups/${groupId}/messages`).then(r => r.json()).then(res => {
        const chatBox = document.getElementById('chatMessagesBox');
        if (chatBox && res.success) {
            chatBox.innerHTML = `<div class="text-center text-secondary small my-2 fw-semibold">-- Đã tham gia phòng trò chuyện nhóm ${groupName} --</div>`;
            res.data.forEach(m => appendChatMessage(m.sender, m.text, m.files));
        }
    });
}

function appendChatMessage(sender, text, files = []) {
    const chatBox = document.getElementById('chatMessagesBox');
    if (!chatBox) return;

    let filesHtml = '';
    if (files && files.length > 0) {
        filesHtml = '<div class="mt-1 flex-wrap d-flex gap-2">' + files.map(f => 
            `<a href="${f.url}" target="_blank" class="btn btn-sm btn-light border text-primary fw-bold"><i class="bi bi-file-earmark-arrow-down me-1"></i>${f.name}</a>`
        ).join('') + '</div>';
    }

    const div = document.createElement('div');
    div.className = 'mb-3 text-dark bg-white p-2 rounded-3 shadow-sm border';
    div.innerHTML = `<div><strong class="text-primary">${sender}:</strong> ${text}</div>${filesHtml}`;
    
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