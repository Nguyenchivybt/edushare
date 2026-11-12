/**
 * EduShare Frontend Logic - public/js/app.js
 * Kho Tài Liệu Tri Thức - Thư Viện Học Liệu Số MTU
 * Tác giả: Nguyễn Chí Vỹ
 */

const CONFIG = {
    API_BASE_URL: (window.location.origin && window.location.origin.startsWith('http'))
        ? `${window.location.origin}/api`
        : 'http://localhost:5000/api',
    STORAGE_KEY_USER: 'edushare_user_session_v2',
    STORAGE_KEY_TOKEN: 'edushare_auth_token_v2',
    STORAGE_KEY_REMEMBER: 'edushare_remember_flag_v2',
    STORAGE_KEY_THEME: 'edushare_theme_mode_v2',
    STORAGE_KEY_STYLE: 'edushare_theme_style_v2',
    STORAGE_KEY_SAVED_DOCS: 'edushare_saved_docs_v2',
    STORAGE_KEY_HISTORY: 'edushare_user_history_v2'
};

const state = {
    currentUser: null,
    authToken: null,
    documents: [],
    groups: [],
    members: [],
    likedDocIds: new Set(),
    dislikedDocIds: new Set(),
    savedDocumentIds: new Set(),
    viewedDocIds: [],
    downloadedDocIds: [],
    activeGroupId: "group-global",
    activeCategory: "ALL",
    selectedStyle: "academic",
    currentViewingDocId: null,
    otpTimer: null
};

// ---------- Utilities ----------

function removeVietnameseTones(str) {
    if (!str) return '';
    str = String(str).toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str.trim();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const isSuccess = type === 'success';
    const isWarning = type === 'warning';
    const toastClass = isSuccess ? 'success' : (isWarning ? 'warning' : 'error');
    const iconHtml = isSuccess
        ? '<i class="bi bi-check-circle-fill fs-5"></i>'
        : (isWarning ? '<i class="bi bi-exclamation-triangle-fill fs-5"></i>' : '<i class="bi bi-x-circle-fill fs-5"></i>');

    const toast = document.createElement('div');
    toast.className = `edu-toast ${toastClass}`;
    toast.innerHTML = `${iconHtml}<div class="flex-grow-1">${escapeHtml(message)}</div>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.25s ease';
        setTimeout(() => toast.remove(), 260);
    }, 3800);
}

function openModal(el) {
    if (el) el.classList.add('show');
}

function closeModal(el) {
    if (el) el.classList.remove('show');
}

function formatRoleLabel(role) {
    const map = {
        'STUDENT': 'Sinh viên',
        'TEACHER': 'Giảng viên',
        'ADMIN': 'Quản trị viên'
    };
    return map[String(role || '').toUpperCase()] || 'Khách';
}

function formatCategoryLabel(cat) {
    const map = {
        'ACADEMIC': 'Giáo trình / Học thuật',
        'EXERCISE': 'Bài tập mẫu',
        'EXAM': 'Tài liệu bài thi',
        'ARTICLE': 'Bài báo khoa học'
    };
    return map[cat] || cat;
}

// ---------- Initialization ----------

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    loadThemeSettings();
    await restoreSessionSafely();
    loadUserPersonalData();
    bindEvents();
    await fetchDocuments();
    await fetchGroups();
    await fetchCommunityMembers();
    checkDeleteRequests();
}

// ---------- Synchronized Light / Dark & 3 Themes ----------

function loadThemeSettings() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEY_THEME) || 'light';
    const savedStyle = localStorage.getItem(CONFIG.STORAGE_KEY_STYLE) || 'academic';

    state.selectedStyle = savedStyle;
    applyThemeToDOM(savedTheme, savedStyle);
}

function applyThemeToDOM(themeMode, styleName) {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.setAttribute('data-style', styleName);

    const switchEl = document.getElementById('darkModeSwitch');
    if (switchEl) switchEl.checked = (themeMode === 'dark');

    document.querySelectorAll('.theme-style-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.styleVal === styleName);
    });
}

// ---------- Session & Strict Anti-Auto-Login After Logout ----------

async function restoreSessionSafely() {
    // Only restore session if user explicitly chose "Ghi nhớ mật khẩu & duy trì đăng nhập lần sau"
    // OR has an active current-tab sessionStorage session (cleared when browser closes or user logs out)
    const rememberFlag = localStorage.getItem(CONFIG.STORAGE_KEY_REMEMBER) === 'true';
    const persistentUser = localStorage.getItem(CONFIG.STORAGE_KEY_USER);
    const persistentToken = localStorage.getItem(CONFIG.STORAGE_KEY_TOKEN);

    const tabUser = sessionStorage.getItem(CONFIG.STORAGE_KEY_USER);
    const tabToken = sessionStorage.getItem(CONFIG.STORAGE_KEY_TOKEN);

    let candidateUser = null;
    let candidateToken = null;

    if (rememberFlag && persistentUser && persistentToken) {
        try {
            candidateUser = JSON.parse(persistentUser);
            candidateToken = persistentToken;
        } catch (_) {}
    } else if (tabUser && tabToken) {
        try {
            candidateUser = JSON.parse(tabUser);
            candidateToken = tabToken;
        } catch (_) {}
    }

    if (candidateUser && candidateToken) {
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/verify-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: candidateToken })
            });
            const data = await res.json();
            if (data.success && data.user) {
                state.currentUser = data.user;
                state.authToken = data.token;
            } else {
                // Server restarted or session expired -> re-sync user cleanly if remembered
                state.currentUser = candidateUser;
                state.authToken = candidateToken;
            }
        } catch (_) {
            state.currentUser = candidateUser;
            state.authToken = candidateToken;
        }
    } else {
        state.currentUser = null;
        state.authToken = null;
    }

    updateUserUI();
}

function saveUserSession(user, token, rememberMe) {
    state.currentUser = user;
    state.authToken = token;

    // Clear old keys first
    localStorage.removeItem(CONFIG.STORAGE_KEY_USER);
    localStorage.removeItem(CONFIG.STORAGE_KEY_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEY_REMEMBER);
    sessionStorage.removeItem(CONFIG.STORAGE_KEY_USER);
    sessionStorage.removeItem(CONFIG.STORAGE_KEY_TOKEN);

    if (rememberMe) {
        localStorage.setItem(CONFIG.STORAGE_KEY_REMEMBER, 'true');
        localStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(CONFIG.STORAGE_KEY_TOKEN, token);
    } else {
        sessionStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(user));
        sessionStorage.setItem(CONFIG.STORAGE_KEY_TOKEN, token);
    }

    loadUserPersonalData();
    updateUserUI();
}

async function handleLogoutUser() {
    const token = state.authToken;
    const userId = state.currentUser ? state.currentUser.id : null;

    try {
        await fetch(`${CONFIG.API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, userId })
        });
    } catch (_) {}

    state.currentUser = null;
    state.authToken = null;
    state.likedDocIds.clear();
    state.dislikedDocIds.clear();
    state.savedDocumentIds.clear();

    // Completely wipe all auth keys so F5 reload NEVER auto-logs back in
    localStorage.removeItem(CONFIG.STORAGE_KEY_USER);
    localStorage.removeItem(CONFIG.STORAGE_KEY_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEY_REMEMBER);
    sessionStorage.removeItem(CONFIG.STORAGE_KEY_USER);
    sessionStorage.removeItem(CONFIG.STORAGE_KEY_TOKEN);

    updateUserUI();
    renderDocuments(state.documents);
    showToast('Đã đăng xuất tài khoản!', 'success');
}

function loadUserPersonalData() {
    if (!state.currentUser) {
        state.savedDocumentIds = new Set();
        state.viewedDocIds = [];
        state.downloadedDocIds = [];
        return;
    }
    const uid = state.currentUser.id;
    try {
        const savedRaw = localStorage.getItem(`${CONFIG.STORAGE_KEY_SAVED_DOCS}_${uid}`);
        state.savedDocumentIds = new Set(savedRaw ? JSON.parse(savedRaw) : []);
    } catch (_) {
        state.savedDocumentIds = new Set();
    }

    try {
        const histRaw = localStorage.getItem(`${CONFIG.STORAGE_KEY_HISTORY}_${uid}`);
        const parsed = histRaw ? JSON.parse(histRaw) : { viewed: [], downloaded: [] };
        state.viewedDocIds = parsed.viewed || [];
        state.downloadedDocIds = parsed.downloaded || [];
    } catch (_) {
        state.viewedDocIds = [];
        state.downloadedDocIds = [];
    }
}

function persistUserPersonalData() {
    if (!state.currentUser) return;
    const uid = state.currentUser.id;
    localStorage.setItem(`${CONFIG.STORAGE_KEY_SAVED_DOCS}_${uid}`, JSON.stringify(Array.from(state.savedDocumentIds)));
    localStorage.setItem(`${CONFIG.STORAGE_KEY_HISTORY}_${uid}`, JSON.stringify({
        viewed: state.viewedDocIds.slice(0, 20),
        downloaded: state.downloadedDocIds.slice(0, 20)
    }));
}

function updateUserUI() {
    const authBox = document.getElementById('userAuthContainer');
    const profileWidget = document.getElementById('userProfileWidget');

    if (state.currentUser) {
        authBox?.classList.add('d-none');
        authBox?.classList.remove('d-flex');

        profileWidget?.classList.remove('d-none');
        profileWidget?.classList.add('d-flex');

        const nameEl = document.getElementById('userProfileName');
        const roleEl = document.getElementById('userProfileRole');
        const avatarEl = document.getElementById('userProfileAvatar');
        const statusDot = document.getElementById('userOnlineIndicator');

        if (nameEl) nameEl.textContent = state.currentUser.fullName;
        if (roleEl) roleEl.textContent = `${formatRoleLabel(state.currentUser.role)} • MTU`;
        if (avatarEl) {
            avatarEl.src = state.currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.fullName)}&background=2563eb&color=fff`;
        }
        if (statusDot) {
            const isOnline = (state.currentUser.status || 'online') === 'online';
            statusDot.style.backgroundColor = isOnline ? '#22c55e' : '#94a3b8';
        }
    } else {
        authBox?.classList.remove('d-none');
        authBox?.classList.add('d-flex');

        profileWidget?.classList.add('d-none');
        profileWidget?.classList.remove('d-flex');
    }
}

// ---------- Event Bindings ----------

function bindEvents() {
    // Logo & Home navigation
    document.getElementById('brandLogoLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('feed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btnHeaderHome')?.addEventListener('click', () => {
        switchTab('feed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btnMobileHome')?.addEventListener('click', () => {
        switchTab('feed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Favorites navigation
    document.getElementById('dropdownNavFavorites')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('saved');
    });

    document.getElementById('btnTabSavedFast')?.addEventListener('click', () => switchTab('saved'));
    document.getElementById('btnTabFeedAll')?.addEventListener('click', () => switchTab('feed'));

    // Auth Modal open/close & tab switches
    const authModal = document.getElementById('authModal');
    document.getElementById('btnHeaderLogin')?.addEventListener('click', () => {
        document.getElementById('login-tab')?.click();
        openModal(authModal);
    });
    document.getElementById('btnHeaderRegister')?.addEventListener('click', () => {
        document.getElementById('register-tab')?.click();
        openModal(authModal);
    });
    document.getElementById('linkQuickForgot')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('forgot-tab')?.click();
    });
    document.getElementById('btnCloseAuth')?.addEventListener('click', () => closeModal(authModal));

    // Logout
    document.getElementById('btnLogout')?.addEventListener('click', handleLogoutUser);

    // Profile Settings Modal
    document.getElementById('btnOpenProfileSettings')?.addEventListener('click', openProfileSettingsModal);
    document.getElementById('headerAvatarClick')?.addEventListener('click', openProfileSettingsModal);
    document.getElementById('headerNameClick')?.addEventListener('click', openProfileSettingsModal);
    document.getElementById('btnCloseProfileSettings')?.addEventListener('click', () => closeModal(document.getElementById('profileSettingsModal')));

    // Theme style buttons inside Profile Modal
    document.querySelectorAll('.theme-style-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.selectedStyle = btn.dataset.styleVal;
            document.querySelectorAll('.theme-style-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Avatar file preview
    document.getElementById('inputAvatarFile')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = document.getElementById('settingsProfileAvatar');
                if (img) img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Save Profile & Theme Settings
    document.getElementById('btnSaveProfileSettings')?.addEventListener('click', handleSaveProfileSettings);

    // Document View & Edit Modals
    document.getElementById('btnCloseViewDoc')?.addEventListener('click', () => closeModal(document.getElementById('documentViewModal')));
    document.getElementById('btnCloseEditDoc')?.addEventListener('click', () => closeModal(document.getElementById('editDocModal')));

    // Submit Comment inside View Modal
    document.getElementById('btnSubmitComment')?.addEventListener('click', handleSubmitComment);
    document.getElementById('commentInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmitComment();
        }
    });

    // Upload Modal
    document.getElementById('btnHeroUpload')?.addEventListener('click', () => {
        if (!state.currentUser) {
            showToast('Chưa đăng nhập! Vui lòng đăng nhập để đăng tải học liệu.', 'error');
            document.getElementById('login-tab')?.click();
            openModal(authModal);
            return;
        }
        openModal(document.getElementById('uploadModal'));
    });
    document.getElementById('btnCloseUpload')?.addEventListener('click', () => closeModal(document.getElementById('uploadModal')));

    // Register Form Submit
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());
        payload.role = document.getElementById('registerRoleSelect')?.value || payload.role || 'STUDENT';
        payload.rememberMe = document.getElementById('registerRememberCheck')?.checked || false;

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success && result.user) {
                saveUserSession(result.user, result.token, payload.rememberMe);
                closeModal(authModal);
                e.target.reset();
                renderDocuments(state.documents);
                fetchGroups();
                fetchCommunityMembers();
                showToast('Đã đăng ký thành công!', 'success');
            } else {
                showToast(result.message || 'Đăng ký thất bại. Vui lòng thử lại!', 'error');
            }
        } catch (err) {
            showToast('Đăng ký thất bại. Vui lòng thử lại!', 'error');
        }
    });

    // Login Form Submit
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const identity = formData.get('identity');
        const password = formData.get('password');
        const rememberMe = document.getElementById('rememberMeCheck')?.checked || false;

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity, password, rememberMe })
            });
            const result = await res.json();
            if (result.success && result.user) {
                saveUserSession(result.user, result.token, rememberMe);
                closeModal(authModal);
                renderDocuments(state.documents);
                fetchGroups();
                checkDeleteRequests();
                showToast('Đã đăng nhập thành công!', 'success');
            } else {
                showToast(result.message || 'Đăng nhập thất bại. Vui lòng thử lại!', 'error');
            }
        } catch (err) {
            showToast('Đăng nhập thất bại. Vui lòng thử lại!', 'error');
        }
    });

    // Social Login Google & Facebook
    document.getElementById('btnSocialGoogle')?.addEventListener('click', () => handleSocialLogin('google'));
    document.getElementById('btnSocialFacebook')?.addEventListener('click', () => handleSocialLogin('facebook'));

    // Forgot Password OTP
    document.getElementById('btnRequestOtp')?.addEventListener('click', handleRequestOtp);
    document.getElementById('btnResendOtp')?.addEventListener('click', handleResendOtp);
    document.getElementById('btnSubmitResetPass')?.addEventListener('click', handleResetPassword);

    // Upload Document Form
    document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.currentUser) {
            showToast('Vui lòng đăng nhập để tải tệp lên!', 'error');
            return;
        }
        const formData = new FormData(e.target);
        formData.append('authorId', state.currentUser.id);
        formData.append('authorName', state.currentUser.fullName);
        formData.append('authorRole', state.currentUser.role);

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/documents`, {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            if (result.success) {
                closeModal(document.getElementById('uploadModal'));
                e.target.reset();
                await fetchDocuments();
                showToast('Tải tệp thành công!', 'success');
            } else {
                showToast('Tải tệp thất bại. Vui lòng thử lại sau!', 'error');
            }
        } catch (err) {
            showToast('Tải tệp thất bại. Vui lòng thử lại sau!', 'error');
        }
    });

    // Edit Document Form
    document.getElementById('editDocForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.currentUser) return;
        const docId = document.getElementById('editDocId').value;
        const payload = {
            userId: state.currentUser.id,
            userRole: state.currentUser.role,
            title: document.getElementById('editDocTitle').value,
            category: document.getElementById('editDocCategory').value,
            subject: document.getElementById('editDocSubject').value,
            className: document.getElementById('editDocClass').value,
            description: document.getElementById('editDocDesc').value
        };

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/documents/${docId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                closeModal(document.getElementById('editDocModal'));
                await fetchDocuments();
                showToast('Đã cập nhật tài liệu thành công!', 'success');
            } else {
                showToast(result.message || 'Cập nhật thất bại!', 'error');
            }
        } catch (_) {
            showToast('Lỗi kết nối máy chủ!', 'error');
        }
    });

    // Search Inputs (Header, Mobile, Filter) synced
    const syncSearch = (val) => {
        const h = document.getElementById('headerSearchInput');
        const m = document.getElementById('mobileSearchInput');
        const f = document.getElementById('filterSearchInput');
        if (h && h.value !== val) h.value = val;
        if (m && m.value !== val) m.value = val;
        if (f && f.value !== val) f.value = val;

        const clearBtn = document.getElementById('btnClearHeaderSearch');
        if (clearBtn) clearBtn.classList.toggle('d-none', !val);

        applyCombinedFilters();
    };

    document.getElementById('headerSearchInput')?.addEventListener('input', (e) => syncSearch(e.target.value));
    document.getElementById('mobileSearchInput')?.addEventListener('input', (e) => syncSearch(e.target.value));
    document.getElementById('filterSearchInput')?.addEventListener('input', (e) => syncSearch(e.target.value));
    document.getElementById('btnClearHeaderSearch')?.addEventListener('click', () => syncSearch(''));

    // 6-Level Filter Selects
    ['filterSchool', 'filterFaculty', 'filterMajor', 'filterYear', 'filterClass', 'filterSubject'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyCombinedFilters);
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        document.getElementById('filterSchool').value = 'ALL';
        document.getElementById('filterFaculty').value = 'ALL';
        document.getElementById('filterMajor').value = 'ALL';
        document.getElementById('filterYear').value = 'ALL';
        document.getElementById('filterClass').value = 'ALL';
        document.getElementById('filterSubject').value = 'ALL';
        state.activeCategory = 'ALL';
        document.querySelectorAll('#categoryFilterGroup .btn').forEach(b => {
            b.classList.toggle('active', b.dataset.category === 'ALL');
        });
        syncSearch('');
    });

    // Category Pills
    document.querySelectorAll('#categoryFilterGroup .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.activeCategory = btn.dataset.category;
            document.querySelectorAll('#categoryFilterGroup .btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyCombinedFilters();
        });
    });

    // Community Member Search & Filter
    document.getElementById('memberRoleFilter')?.addEventListener('change', fetchCommunityMembers);
    document.getElementById('memberSearchInput')?.addEventListener('input', fetchCommunityMembers);

    // Create Group Modal
    document.getElementById('btnCreateGroup')?.addEventListener('click', () => {
        if (!state.currentUser) {
            showToast('Vui lòng đăng nhập để tạo nhóm học thuật!', 'error');
            openModal(authModal);
            return;
        }
        openModal(document.getElementById('createGroupModal'));
    });
    document.getElementById('btnCloseCreateGroup')?.addEventListener('click', () => closeModal(document.getElementById('createGroupModal')));

    document.getElementById('createGroupForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('createGroupNameInput')?.value.trim();
        const desc = document.getElementById('createGroupDescInput')?.value.trim();
        if (!name) {
            showToast('Tạo nhóm thất bại, vui lòng thử lại!', 'error');
            return;
        }
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    desc,
                    createdBy: state.currentUser ? state.currentUser.id : 'user-1'
                })
            });
            const result = await res.json();
            if (result.success && result.data) {
                closeModal(document.getElementById('createGroupModal'));
                e.target.reset();
                await fetchGroups();
                openGroupChat(result.data.id, result.data.name, result.data.membersCount);
                showToast('Đã tạo nhóm thành công!', 'success');
            } else {
                showToast('Tạo nhóm thất bại, vui lòng thử lại!', 'error');
            }
        } catch (_) {
            showToast('Tạo nhóm thất bại, vui lòng thử lại!', 'error');
        }
    });

    // Group Chat Send Form
    document.getElementById('chatSendForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.currentUser) {
            showToast('Vui lòng đăng nhập để gửi tin nhắn cộng đồng!', 'error');
            openModal(authModal);
            return;
        }
        const textInput = document.getElementById('chatInputText');
        const fileInput = document.getElementById('chatFileInput');
        const text = textInput ? textInput.value.trim() : '';
        const files = fileInput ? fileInput.files : [];

        if (!text && files.length === 0) return;

        const formData = new FormData();
        formData.append('sender', state.currentUser.fullName);
        formData.append('role', state.currentUser.role);
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
                appendChatMessage(result.data.sender, result.data.text, result.data.files, result.data.time, true);
                if (textInput) textInput.value = '';
                if (fileInput) fileInput.value = '';
                document.getElementById('chatFilePreviewContainer').innerHTML = '';
            }
        } catch (_) {
            showToast('Gửi tin nhắn thất bại!', 'error');
        }
    });

    document.getElementById('chatFileInput')?.addEventListener('change', (e) => {
        const preview = document.getElementById('chatFilePreviewContainer');
        if (!preview) return;
        preview.innerHTML = '';
        Array.from(e.target.files).forEach(f => {
            preview.innerHTML += `<span class="badge bg-primary-subtle text-primary border"><i class="bi bi-paperclip me-1"></i>${escapeHtml(f.name)}</span>`;
        });
    });

    // AI Chatbot Modal & Multi-file Input
    document.getElementById('btnFloatingAi')?.addEventListener('click', () => openModal(document.getElementById('aiChatModal')));
    document.getElementById('btnCloseAi')?.addEventListener('click', () => closeModal(document.getElementById('aiChatModal')));

    document.getElementById('aiFileInput')?.addEventListener('change', (e) => {
        const preview = document.getElementById('aiFilePreview');
        if (!preview) return;
        preview.innerHTML = '';
        Array.from(e.target.files).forEach(f => {
            preview.innerHTML += `<span class="badge bg-primary-subtle text-primary border"><i class="bi bi-file-earmark me-1"></i>${escapeHtml(f.name)}</span>`;
        });
    });

    document.getElementById('btnSendAiPrompt')?.addEventListener('click', handleSendAiMessage);
    document.getElementById('aiPromptInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSendAiMessage();
        }
    });

    // Anti-copy protection for unauthenticated Guests
    document.addEventListener('copy', (e) => {
        if (!state.currentUser) {
            e.preventDefault();
            showToast('Khách chỉ được xem nội dung, không được copy bài viết!', 'error');
        }
    });
}

// ---------- Social Login Handler ----------

async function handleSocialLogin(provider) {
    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';
    const rememberMe = document.getElementById('rememberMeCheck')?.checked ?? true;

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/auth/social`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider,
                rememberMe
            })
        });
        const result = await res.json();
        if (result.success && result.user) {
            saveUserSession(result.user, result.token, rememberMe);
            closeModal(document.getElementById('authModal'));
            renderDocuments(state.documents);
            fetchGroups();
            showToast('Đã đăng nhập thành công!', 'success');
        } else {
            showToast(`Đăng nhập qua ${providerLabel} thất bại. Vui lòng thử lại!`, 'error');
        }
    } catch (_) {
        showToast('Đăng nhập thất bại. Vui lòng thử lại!', 'error');
    }
}

// ---------- OTP Forgot Password Handlers ----------

async function handleRequestOtp() {
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
            const banner = document.getElementById('otpDisplayBanner');
            if (banner) {
                banner.innerHTML = `Mã OTP xác nhận của bạn là: <strong class="fs-5 text-primary">${result.otp}</strong> (Có hiệu lực trong 120 giây)`;
            }
            startOtpTimer(result.expiresIn || 120);
            showToast(`Đã gửi mã OTP: ${result.otp}`, 'success');
        } else {
            showToast(result.message || 'Sai cú pháp hoặc thông tin không tồn tại', 'error');
        }
    } catch (_) {
        showToast('Sai cú pháp hoặc thông tin không tồn tại', 'error');
    }
}

async function handleResendOtp() {
    const identity = document.getElementById('forgotIdentityInput')?.value.trim();
    if (!identity) return;

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/auth/forgot-password/resend-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity })
        });
        const result = await res.json();
        if (result.success) {
            const banner = document.getElementById('otpDisplayBanner');
            if (banner) {
                banner.innerHTML = `Mã OTP mới đã được cấp lại: <strong class="fs-5 text-primary">${result.otp}</strong>`;
            }
            startOtpTimer(result.expiresIn || 120);
            showToast(`Đã cấp lại mã OTP: ${result.otp}`, 'success');
        } else {
            showToast(result.message || 'Không thể cấp lại mã OTP!', 'error');
        }
    } catch (_) {
        showToast('Lỗi kết nối máy chủ!', 'error');
    }
}

async function handleResetPassword() {
    const identity = document.getElementById('forgotIdentityInput')?.value.trim();
    const otp = document.getElementById('otpCodeInput')?.value.trim();
    const newPassword = document.getElementById('otpNewPassword')?.value;
    const confirmPassword = document.getElementById('otpConfirmPassword')?.value;

    if (!otp || !newPassword || !confirmPassword) {
        showToast('Vui lòng nhập đầy đủ mã OTP và mật khẩu mới!', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('Mật khẩu mới và xác nhận mật khẩu không trùng khớp!', 'error');
        return;
    }

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/auth/forgot-password/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity, otp, newPassword, confirmPassword })
        });
        const result = await res.json();
        if (result.success) {
            clearInterval(state.otpTimer);
            document.getElementById('forgotStep2')?.classList.add('d-none');
            document.getElementById('forgotStep1')?.classList.remove('d-none');
            document.getElementById('otpCodeInput').value = '';
            document.getElementById('otpNewPassword').value = '';
            document.getElementById('otpConfirmPassword').value = '';
            document.getElementById('login-tab')?.click();
            showToast('Đã cập nhật mật khẩu mới thành công! Vui lòng đăng nhập lại.', 'success');
        } else {
            showToast(result.message || 'Mã sai hoặc đã quá hạn, vui lòng nhập lại!', 'error');
        }
    } catch (_) {
        showToast('Mã sai hoặc đã quá hạn, vui lòng nhập lại!', 'error');
    }
}

function startOtpTimer(sec) {
    let count = sec;
    const timerSpan = document.getElementById('otpTimerCount');
    clearInterval(state.otpTimer);
    if (timerSpan) timerSpan.textContent = count;
    state.otpTimer = setInterval(() => {
        count--;
        if (timerSpan) timerSpan.textContent = Math.max(0, count);
        if (count <= 0) {
            clearInterval(state.otpTimer);
            const banner = document.getElementById('otpDisplayBanner');
            if (banner) {
                banner.innerHTML = `<span class="text-danger fw-bold">Mã OTP đã quá hạn! Vui lòng bấm "Cấp lại mã OTP".</span>`;
            }
        }
    }, 1000);
}

// ---------- Profile Settings & Theme Modal ----------

function openProfileSettingsModal() {
    if (!state.currentUser) return;

    const u = state.currentUser;
    const avatarEl = document.getElementById('settingsProfileAvatar');
    const nameEl = document.getElementById('settingsProfileName');
    const metaEl = document.getElementById('settingsProfileMeta');
    const roleEl = document.getElementById('settingsProfileRole');
    const statusSel = document.getElementById('onlineStatusSelect');

    if (avatarEl) avatarEl.src = u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=2563eb&color=fff`;
    if (nameEl) nameEl.textContent = u.fullName;
    if (metaEl) metaEl.textContent = `Email: ${u.email} | SĐT: ${u.phone || 'Chưa cập nhật'}`;
    if (roleEl) roleEl.textContent = formatRoleLabel(u.role);
    if (statusSel) statusSel.value = u.status || 'online';

    const currentTheme = localStorage.getItem(CONFIG.STORAGE_KEY_THEME) || 'light';
    const currentStyle = localStorage.getItem(CONFIG.STORAGE_KEY_STYLE) || 'academic';
    state.selectedStyle = currentStyle;
    applyThemeToDOM(currentTheme, currentStyle);

    // Role-specific history / library summary
    const histContainer = document.getElementById('roleHistorySection');
    if (histContainer) {
        const myDocs = state.documents.filter(d => d.authorId === u.id);
        if (u.role === 'TEACHER' || u.role === 'ADMIN') {
            histContainer.innerHTML = `
                <div class="p-2 rounded-3 border small" style="background-color: var(--input-bg);">
                    <div class="fw-bold text-primary mb-1"><i class="bi bi-journal-check me-1"></i>Lịch sử &amp; Quản lý (${formatRoleLabel(u.role)})</div>
                    <div class="text-secondary">Tài liệu đã đăng tải: <strong>${myDocs.length}</strong> • Yêu thích cá nhân: <strong>${state.savedDocumentIds.size}</strong></div>
                </div>
            `;
        } else {
            histContainer.innerHTML = `
                <div class="p-2 rounded-3 border small" style="background-color: var(--input-bg);">
                    <div class="fw-bold text-primary mb-1"><i class="bi bi-clock-history me-1"></i>Hoạt Động Học Tập Cá Nhân</div>
                    <div class="text-secondary">Đã xem: <strong>${state.viewedDocIds.length}</strong> • Đã tải xuống: <strong>${state.downloadedDocIds.length}</strong> • Yêu thích: <strong>${state.savedDocumentIds.size}</strong></div>
                </div>
            `;
        }
    }

    openModal(document.getElementById('profileSettingsModal'));
}

async function handleSaveProfileSettings() {
    if (!state.currentUser) return;

    const isDark = document.getElementById('darkModeSwitch')?.checked;
    const themeMode = isDark ? 'dark' : 'light';
    const styleVal = state.selectedStyle || 'academic';
    const newStatus = document.getElementById('onlineStatusSelect')?.value || 'online';

    const oldPass = document.getElementById('settingOldPass')?.value || '';
    const newPass = document.getElementById('settingNewPass')?.value || '';
    const confirmNewPass = document.getElementById('settingConfirmNewPass')?.value || '';

    if (newPass && newPass !== confirmNewPass) {
        showToast('Mật khẩu mới và xác nhận mật khẩu không trùng khớp!', 'error');
        return;
    }

    // 1. Apply & persist theme and dark mode immediately
    localStorage.setItem(CONFIG.STORAGE_KEY_THEME, themeMode);
    localStorage.setItem(CONFIG.STORAGE_KEY_STYLE, styleVal);
    applyThemeToDOM(themeMode, styleVal);

    // 2. Upload avatar if file chosen
    const avatarFile = document.getElementById('inputAvatarFile')?.files?.[0];
    if (avatarFile) {
        try {
            const fd = new FormData();
            fd.append('avatar', avatarFile);
            const avRes = await fetch(`${CONFIG.API_BASE_URL}/users/${state.currentUser.id}/avatar`, {
                method: 'POST',
                body: fd
            });
            const avData = await avRes.json();
            if (avData.success && avData.data) {
                state.currentUser.avatarUrl = avData.data.avatarUrl;
            }
        } catch (_) {}
    }

    // 3. Update user status & password on server
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/users/${state.currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: newStatus,
                currentPassword: oldPass || undefined,
                newPassword: newPass || undefined
            })
        });
        const result = await res.json();
        if (!result.success) {
            showToast(result.message || 'Cập nhật thất bại!', 'error');
            return;
        }
        if (result.data) {
            state.currentUser = { ...state.currentUser, ...result.data };
        }
    } catch (_) {
        state.currentUser.status = newStatus;
    }

    // Sync updated user to active storage
    const rememberFlag = localStorage.getItem(CONFIG.STORAGE_KEY_REMEMBER) === 'true';
    if (rememberFlag) {
        localStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(state.currentUser));
    } else {
        sessionStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(state.currentUser));
    }

    document.getElementById('settingOldPass').value = '';
    document.getElementById('settingNewPass').value = '';
    document.getElementById('settingConfirmNewPass').value = '';
    document.getElementById('inputAvatarFile').value = '';

    updateUserUI();
    closeModal(document.getElementById('profileSettingsModal'));
    showToast('Đã áp dụng và lưu thay đổi thành công!', 'success');
}

// ---------- Documents Fetching, Filtering & Rendering ----------

async function fetchDocuments() {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/documents`);
        const result = await res.json();
        state.documents = result.data || [];
        applyCombinedFilters();
    } catch (_) {
        state.documents = [];
    }
}

function switchTab(tabName) {
    document.getElementById('tab-feed')?.classList.toggle('d-none', tabName !== 'feed');
    document.getElementById('tab-saved')?.classList.toggle('d-none', tabName !== 'saved');
    document.getElementById('tab-groups')?.classList.toggle('d-none', tabName !== 'groups');

    if (tabName === 'saved') {
        renderSavedDocuments();
    } else if (tabName === 'feed') {
        applyCombinedFilters();
    }
}

function filterByNav(key, val) {
    switchTab('feed');
    if (key === 'category') {
        state.activeCategory = val;
        document.querySelectorAll('#categoryFilterGroup .btn').forEach(b => {
            b.classList.toggle('active', b.dataset.category === val);
        });
    } else if (key === 'school') {
        const el = document.getElementById('filterSchool');
        if (el) el.value = val;
    } else if (key === 'faculty') {
        const el = document.getElementById('filterFaculty');
        if (el) el.value = val;
    } else if (key === 'major') {
        const el = document.getElementById('filterMajor');
        if (el) el.value = val;
    } else if (key === 'academicYear') {
        const el = document.getElementById('filterYear');
        if (el) el.value = val;
    } else if (key === 'className') {
        const el = document.getElementById('filterClass');
        if (el) el.value = val;
    }
    applyCombinedFilters();
    document.getElementById('documentSectionAnchor')?.scrollIntoView({ behavior: 'smooth' });
}

function applyCombinedFilters() {
    const query = document.getElementById('filterSearchInput')?.value || document.getElementById('headerSearchInput')?.value || '';
    const school = document.getElementById('filterSchool')?.value || 'ALL';
    const faculty = document.getElementById('filterFaculty')?.value || 'ALL';
    const major = document.getElementById('filterMajor')?.value || 'ALL';
    const year = document.getElementById('filterYear')?.value || 'ALL';
    const className = document.getElementById('filterClass')?.value || 'ALL';
    const subject = document.getElementById('filterSubject')?.value || 'ALL';
    const category = state.activeCategory || 'ALL';

    let list = [...state.documents];

    if (school !== 'ALL') list = list.filter(d => d.school === school);
    if (faculty !== 'ALL') list = list.filter(d => d.faculty === faculty);
    if (major !== 'ALL') list = list.filter(d => d.major === major);
    if (year !== 'ALL') list = list.filter(d => d.academicYear === year);
    if (className !== 'ALL') list = list.filter(d => d.className === className);
    if (subject !== 'ALL') list = list.filter(d => d.subject === subject);
    if (category !== 'ALL') list = list.filter(d => d.category === category);

    if (query.trim()) {
        const qNorm = removeVietnameseTones(query);
        const keywords = qNorm.split(/\s+/).filter(Boolean);
        list = list.filter(d => {
            const full = removeVietnameseTones(`${d.title} ${d.description} ${d.subject} ${d.authorName} ${d.className} ${d.faculty}`);
            return keywords.some(kw => full.includes(kw));
        });
    }

    renderDocuments(list, 'documentContainer');
}

function buildDocumentCardHtml(doc) {
    const isLiked = state.likedDocIds.has(doc.id);
    const isDisliked = state.dislikedDocIds.has(doc.id);
    const isSaved = state.savedDocumentIds.has(doc.id);
    const commentCount = (doc.comments || []).length;
    const avgRating = (doc.ratings && doc.ratings.length > 0)
        ? (doc.ratings.reduce((a, b) => a + b, 0) / doc.ratings.length).toFixed(1)
        : '5.0';

    const canEdit = state.currentUser && (state.currentUser.role === 'ADMIN' || state.currentUser.id === doc.authorId);
    const canDelete = state.currentUser && (state.currentUser.role === 'ADMIN' || state.currentUser.id === doc.authorId);

    return `
    <div class="col-md-6 col-lg-4">
        <div class="doc-card h-100 d-flex flex-column p-4">
            <div class="d-flex justify-content-between align-items-center mb-2 gap-1">
                <span class="badge bg-primary-subtle text-primary fw-bold">${escapeHtml(doc.category)}</span>
                <div class="d-flex align-items-center gap-2">
                    <span class="small fw-bold text-warning" title="Đánh giá bình chọn"><i class="bi bi-star-fill"></i> ${avgRating}</span>
                    <button type="button" class="btn btn-sm btn-link text-warning p-0" onclick="toggleSaveDocument(${doc.id})" title="${isSaved ? 'Bỏ khỏi mục Yêu thích' : 'Thêm vào mục Yêu thích'}">
                        <i class="bi ${isSaved ? 'bi-star-fill' : 'bi-star'} fs-5"></i>
                    </button>
                    <span class="badge bg-secondary-subtle text-main border fw-semibold">${escapeHtml(doc.className || 'MTU')}</span>
                </div>
            </div>

            <h5 class="fw-bold mb-2 text-main fs-6 cursor-pointer" onclick="handleViewDocument(${doc.id})">${escapeHtml(doc.title)}</h5>
            <p class="text-muted small mb-3 flex-grow-1">${escapeHtml(doc.description)}</p>

            <div class="mt-auto pt-3 border-top">
                <div class="d-flex align-items-center justify-content-between text-secondary small mb-3">
                    <div class="d-flex align-items-center gap-1 flex-wrap">
                        <i class="bi bi-person-circle text-primary"></i>
                        <span class="fw-bold text-main">${escapeHtml(doc.authorName)}</span>
                        <span class="badge bg-light text-main border">${formatRoleLabel(doc.authorRole)}</span>
                    </div>
                    <small class="text-muted"><i class="bi bi-eye me-1"></i>${doc.views || 0}</small>
                </div>

                <div class="d-flex flex-wrap gap-1 justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-1">
                        <button type="button" class="btn btn-sm ${isLiked ? 'btn-danger' : 'btn-outline-danger'} fw-bold" onclick="toggleLikeDocument(${doc.id})" title="Thích tài liệu">
                            <i class="bi bi-hand-thumbs-up-fill me-1"></i>${doc.likes || 0}
                        </button>
                        <button type="button" class="btn btn-sm ${isDisliked ? 'btn-secondary' : 'btn-outline-secondary'} fw-bold" onclick="toggleDislikeDocument(${doc.id})" title="Không thích">
                            <i class="bi bi-hand-thumbs-down-fill"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary fw-bold" onclick="handleViewDocument(${doc.id}, true)" title="Bình luận &amp; Bình chọn">
                            <i class="bi bi-chat-dots me-1"></i>${commentCount}
                        </button>
                    </div>

                    <div class="d-flex align-items-center gap-1">
                        <button type="button" class="btn btn-sm btn-outline-primary fw-bold" onclick="handleViewDocument(${doc.id})">
                            <i class="bi bi-eye me-1"></i>Xem
                        </button>
                        <button type="button" class="btn btn-sm btn-primary fw-bold" onclick="handleDownloadDocument(${doc.id}, '${doc.category}')">
                            <i class="bi bi-download me-1"></i>Tải về
                        </button>
                        ${canEdit ? `<button type="button" class="btn btn-sm btn-outline-warning border-0" onclick="openEditDocModal(${doc.id})" title="Sửa tài liệu"><i class="bi bi-pencil-square"></i></button>` : ''}
                        ${canDelete ? `<button type="button" class="btn btn-sm btn-outline-danger border-0" onclick="handleDeleteDocument(${doc.id})" title="Xóa tài liệu"><i class="bi bi-trash"></i></button>` : ''}
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

function renderDocuments(docs, targetId = 'documentContainer') {
    const container = document.getElementById(targetId);
    if (!container) return;

    if (!docs || docs.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="surface-card p-5 text-center text-muted">
                    <i class="bi bi-folder-x fs-1 d-block mb-2 text-primary"></i>
                    <div class="fw-bold">Không tìm thấy tài liệu phù hợp với từ khóa hoặc bộ lọc hiện tại.</div>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = docs.map(buildDocumentCardHtml).join('');
}

// ---------- Document Interactions (Like, Dislike, Save, View, Vote, Comment, Edit, Delete) ----------

async function toggleLikeDocument(docId) {
    const isLiked = state.likedDocIds.has(docId);
    const action = isLiked ? 'unlike' : 'like';

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/documents/${docId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, userId: state.currentUser?.id })
        });
        const result = await res.json();
        if (result.success) {
            if (isLiked) {
                state.likedDocIds.delete(docId);
                showToast('Đã thu hồi lượt thích!', 'warning');
            } else {
                state.likedDocIds.add(docId);
                state.dislikedDocIds.delete(docId);
                showToast('Đã thích tài liệu!', 'success');
            }
            const doc = state.documents.find(d => d.id === docId);
            if (doc) {
                doc.likes = result.likes;
                doc.dislikes = result.dislikes;
            }
            applyCombinedFilters();
            if (!document.getElementById('tab-saved')?.classList.contains('d-none')) renderSavedDocuments();
            if (state.currentViewingDocId === docId) renderViewModalActions(doc);
        }
    } catch (_) {
        showToast('Lỗi tương tác nút Thích!', 'error');
    }
}

async function toggleDislikeDocument(docId) {
    const isDisliked = state.dislikedDocIds.has(docId);
    const action = isDisliked ? 'undislike' : 'dislike';

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/documents/${docId}/dislike`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, userId: state.currentUser?.id })
        });
        const result = await res.json();
        if (result.success) {
            if (isDisliked) {
                state.dislikedDocIds.delete(docId);
                showToast('Đã thu hồi không thích!', 'warning');
            } else {
                state.dislikedDocIds.add(docId);
                state.likedDocIds.delete(docId);
                showToast('Đã đánh dấu không thích tài liệu!', 'warning');
            }
            const doc = state.documents.find(d => d.id === docId);
            if (doc) {
                doc.likes = result.likes;
                doc.dislikes = result.dislikes;
            }
            applyCombinedFilters();
            if (state.currentViewingDocId === docId) renderViewModalActions(doc);
        }
    } catch (_) {}
}

function toggleSaveDocument(docId) {
    if (!state.currentUser) {
        showToast('Vui lòng đăng nhập để thêm tài liệu vào Mục Yêu Thích!', 'error');
        openModal(document.getElementById('authModal'));
        return;
    }

    if (state.savedDocumentIds.has(docId)) {
        state.savedDocumentIds.delete(docId);
        showToast('Đã bỏ khỏi mục Yêu thích cá nhân!', 'warning');
    } else {
        state.savedDocumentIds.add(docId);
        showToast('Đã thêm vào mục Yêu thích cá nhân!', 'success');
    }

    persistUserPersonalData();
    applyCombinedFilters();
    renderSavedDocuments();

    if (state.currentViewingDocId === docId) {
        const doc = state.documents.find(d => d.id === docId);
        if (doc) renderViewModalActions(doc);
    }
}

function renderSavedDocuments() {
    const container = document.getElementById('savedDocumentContainer');
    if (!container) return;

    const savedDocs = state.documents.filter(d => state.savedDocumentIds.has(d.id));
    if (savedDocs.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="surface-card p-5 text-center text-muted">
                    <i class="bi bi-star fs-1 text-warning d-block mb-2"></i>
                    <div class="fw-bold">Chưa có tài liệu nào trong mục Yêu thích cá nhân.</div>
                    <small>Hãy bấm biểu tượng ngôi sao (<i class="bi bi-star"></i>) trên thẻ tài liệu để lưu vào thư viện của bạn!</small>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = savedDocs.map(buildDocumentCardHtml).join('');
}

function handleViewDocument(docId, focusComment = false) {
    const doc = state.documents.find(d => d.id === docId);
    if (!doc) return;

    state.currentViewingDocId = docId;

    // Track view history for logged-in user
    if (state.currentUser && !state.viewedDocIds.includes(docId)) {
        state.viewedDocIds.unshift(docId);
        persistUserPersonalData();
    }

    document.getElementById('viewDocTitle').textContent = doc.title;
    document.getElementById('viewDocSubject').textContent = `${formatCategoryLabel(doc.category)} • Môn: ${doc.subject} • Lớp: ${doc.className || 'MTU'}`;
    document.getElementById('viewDocDesc').textContent = doc.description;
    document.getElementById('viewDocAuthor').textContent = `${doc.authorName} (${formatRoleLabel(doc.authorRole)})`;

    // Files & External URL
    const filesArea = document.getElementById('viewDocFilesArea');
    if (filesArea) {
        let filesHtml = '';
        if (doc.files && doc.files.length > 0) {
            filesHtml += `<div class="d-flex flex-wrap gap-2 mb-2">` + doc.files.map(f =>
                `<span class="badge bg-primary-subtle text-primary border px-2 py-1"><i class="bi bi-file-earmark-text me-1"></i>${escapeHtml(f.name)}</span>`
            ).join('') + `</div>`;
        }
        if (doc.externalUrl) {
            filesHtml += `<a href="${escapeHtml(doc.externalUrl)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-info fw-bold"><i class="bi bi-box-arrow-up-right me-1"></i>Mở liên kết nguồn bài báo</a>`;
        }
        filesArea.innerHTML = filesHtml;
    }

    // Preview frame (Guests get unselectable read-only notice)
    const preview = document.getElementById('docPreviewContainer');
    if (preview) {
        let mediaPreview = '';
        if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
            const lower = doc.fileUrl.toLowerCase();
            if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
                mediaPreview = `<img src="${doc.fileUrl}" class="img-fluid rounded-3 mb-3 border" alt="Preview">`;
            } else if (lower.endsWith('.mp4') || lower.endsWith('.webm')) {
                mediaPreview = `<video src="${doc.fileUrl}" controls class="w-100 rounded-3 mb-3"></video>`;
            } else if (lower.endsWith('.mp3') || lower.endsWith('.wav')) {
                mediaPreview = `<audio src="${doc.fileUrl}" controls class="w-100 mb-3"></audio>`;
            } else if (lower.endsWith('.pdf')) {
                mediaPreview = `<iframe src="${doc.fileUrl}" class="w-100 rounded-3 border mb-3" style="height: 340px;"></iframe>`;
            }
        }

        if (!state.currentUser) {
            preview.classList.add('unselectable');
            preview.innerHTML = `
                <div class="alert alert-warning small fw-bold mb-3">
                    <i class="bi bi-shield-lock-fill me-1"></i>Chế độ Khách: Bạn chỉ được xem nội dung tài liệu. Không thể tải về, sao chép (copy) hoặc chỉnh sửa!
                </div>
                ${mediaPreview}
                <div class="text-main">${escapeHtml(doc.description)}</div>
            `;
        } else {
            preview.classList.remove('unselectable');
            preview.innerHTML = `
                ${mediaPreview}
                <div class="text-main">${escapeHtml(doc.description)}</div>
            `;
        }
    }

    renderViewModalActions(doc);
    renderDocumentComments(doc);
    openModal(document.getElementById('documentViewModal'));

    if (focusComment) {
        setTimeout(() => document.getElementById('commentInput')?.focus(), 150);
    }
}

function renderViewModalActions(doc) {
    const bar = document.getElementById('viewDocActionBar');
    if (!bar || !doc) return;

    const isLiked = state.likedDocIds.has(doc.id);
    const isDisliked = state.dislikedDocIds.has(doc.id);
    const isSaved = state.savedDocumentIds.has(doc.id);
    const avgRating = (doc.ratings && doc.ratings.length > 0)
        ? (doc.ratings.reduce((a, b) => a + b, 0) / doc.ratings.length).toFixed(1)
        : '5.0';

    bar.innerHTML = `
        <div class="d-flex flex-wrap align-items-center gap-2">
            <button type="button" class="btn btn-sm ${isLiked ? 'btn-danger' : 'btn-outline-danger'} fw-bold" onclick="toggleLikeDocument(${doc.id})">
                <i class="bi bi-hand-thumbs-up-fill me-1"></i>Thích (${doc.likes || 0})
            </button>
            <button type="button" class="btn btn-sm ${isDisliked ? 'btn-secondary' : 'btn-outline-secondary'} fw-bold" onclick="toggleDislikeDocument(${doc.id})">
                <i class="bi bi-hand-thumbs-down-fill me-1"></i>Không thích (${doc.dislikes || 0})
            </button>
            <button type="button" class="btn btn-sm ${isSaved ? 'btn-warning' : 'btn-outline-warning'} fw-bold" onclick="toggleSaveDocument(${doc.id})">
                <i class="bi ${isSaved ? 'bi-star-fill' : 'bi-star'} me-1"></i>${isSaved ? 'Đã yêu thích' : 'Yêu thích'}
            </button>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-2">
            <div class="d-flex align-items-center gap-1" title="Bình chọn đánh giá tài liệu">
                <span class="small fw-bold text-secondary">Bình chọn (${avgRating}★):</span>
                ${[1, 2, 3, 4, 5].map(star => `
                    <button type="button" class="btn btn-sm btn-link text-warning p-0" onclick="handleVoteDocument(${doc.id}, ${star})">
                        <i class="bi bi-star-fill"></i>
                    </button>
                `).join('')}
            </div>
            <button type="button" class="btn btn-sm btn-primary fw-bold px-3" onclick="handleDownloadDocument(${doc.id}, '${doc.category}')">
                <i class="bi bi-download me-1"></i>Tải xuống
            </button>
        </div>
    `;
}

async function handleVoteDocument(docId, rating) {
    if (!state.currentUser) {
        showToast('Vui lòng đăng nhập để bình chọn tài liệu!', 'error');
        return;
    }
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/documents/${docId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating })
        });
        const result = await res.json();
        if (result.success) {
            const doc = state.documents.find(d => d.id === docId);
            if (doc) {
                if (!doc.ratings) doc.ratings = [];
                doc.ratings.push(rating);
                renderViewModalActions(doc);
            }
            applyCombinedFilters();
            showToast(result.message, 'success');
        }
    } catch (_) {}
}

function renderDocumentComments(doc) {
    const listEl = document.getElementById('commentsList');
    if (!listEl) return;

    const comments = doc.comments || [];
    if (comments.length === 0) {
        listEl.innerHTML = `<div class="text-muted small">Chưa có bình luận nào. Hãy là người đầu tiên đóng góp ý kiến!</div>`;
        return;
    }

    listEl.innerHTML = comments.map(c => `
        <div class="p-2 mb-2 rounded-3 border" style="background-color: var(--input-bg);">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong class="small text-primary">${escapeHtml(c.author)}</strong>
                <small class="text-muted" style="font-size: 0.72rem;">${escapeHtml(c.time || '')}</small>
            </div>
            <div class="small text-main">${escapeHtml(c.text)}</div>
        </div>
    `).join('');
}

async function handleSubmitComment() {
    if (!state.currentUser) {
        showToast('Vui lòng đăng nhập để bình luận!', 'error');
        openModal(document.getElementById('authModal'));
        return;
    }

    const input = document.getElementById('commentInput');
    const text = input?.value.trim();
    const docId = state.currentViewingDocId;
    if (!text || !docId) return;

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/documents/${docId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                author: `${state.currentUser.fullName} (${formatRoleLabel(state.currentUser.role)})`,
                authorId: state.currentUser.id,
                text
            })
        });
        const result = await res.json();
        if (result.success && result.data) {
            const doc = state.documents.find(d => d.id === docId);
            if (doc) {
                if (!doc.comments) doc.comments = [];
                doc.comments.push(result.data);
                renderDocumentComments(doc);
            }
            input.value = '';
            applyCombinedFilters();
            showToast('Đã gửi bình luận thành công!', 'success');
        }
    } catch (_) {
        showToast('Gửi bình luận thất bại!', 'error');
    }
}

function handleDownloadDocument(docId, category) {
    if (!state.currentUser) {
        showToast('Chưa đăng nhập! Khách chỉ được xem tài liệu, không thể tải về.', 'error');
        openModal(document.getElementById('authModal'));
        return;
    }

    // Student cannot download scientific articles (ARTICLE)
    if (state.currentUser.role === 'STUDENT' && category === 'ARTICLE') {
        showToast('Sinh viên chỉ có quyền xem bài báo khoa học, không được phép tải về!', 'error');
        return;
    }

    const doc = state.documents.find(d => d.id === docId);
    if (!doc) return;

    if (!state.downloadedDocIds.includes(docId)) {
        state.downloadedDocIds.unshift(docId);
        persistUserPersonalData();
    }

    // Trigger real download if file exists on server, otherwise generate downloadable text summary
    if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
        const a = document.createElement('a');
        a.href = doc.fileUrl;
        a.download = doc.title;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } else {
        const content = `EDUSHARE MTU - KHO TÀI LIỆU TRI THỨC\n=====================================\nTiêu đề: ${doc.title}\nDanh mục: ${formatCategoryLabel(doc.category)}\nMôn học: ${doc.subject}\nTác giả: ${doc.authorName}\nMô tả: ${doc.description}\n`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title.replace(/[^a-zA-Z0-9\u00C0-\u1EF9\s_-]/g, '')}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    showToast('Tải tệp thành công!', 'success');
}

function openEditDocModal(docId) {
    const doc = state.documents.find(d => d.id === docId);
    if (!doc || !state.currentUser) return;

    if (state.currentUser.role !== 'ADMIN' && state.currentUser.id !== doc.authorId) {
        showToast('Bạn chỉ được chỉnh sửa tài liệu do bản thân đăng tải!', 'error');
        return;
    }

    document.getElementById('editDocId').value = doc.id;
    document.getElementById('editDocTitle').value = doc.title;
    document.getElementById('editDocCategory').value = doc.category;
    document.getElementById('editDocSubject').value = doc.subject;
    document.getElementById('editDocClass').value = doc.className || '';
    document.getElementById('editDocDesc').value = doc.description || '';

    openModal(document.getElementById('editDocModal'));
}

async function handleDeleteDocument(docId) {
    if (!state.currentUser) {
        showToast('Vui lòng đăng nhập để thực hiện!', 'error');
        return;
    }

    const doc = state.documents.find(d => d.id === docId);
    if (!doc) return;

    if (state.currentUser.role !== 'ADMIN' && state.currentUser.id !== doc.authorId) {
        showToast('Bạn chỉ được phép xóa tài liệu do bản thân đăng tải!', 'error');
        return;
    }

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/documents/${docId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: state.currentUser.id,
                userRole: state.currentUser.role
            })
        });
        const result = await res.json();
        if (result.success) {
            await fetchDocuments();
            if (result.pendingApproval) {
                showToast(result.message, 'warning');
            } else {
                showToast(result.message || (doc.category === 'ARTICLE' ? 'Đã xóa bài báo!' : 'Đã xóa Tệp tin!'), 'success');
            }
        } else {
            showToast(result.message || 'Không thể xóa tài liệu!', 'error');
        }
    } catch (_) {
        showToast('Lỗi kết nối máy chủ!', 'error');
    }
}

async function checkDeleteRequests() {
    const banner = document.getElementById('deleteApprovalBannerContainer');
    if (!banner) return;
    if (!state.currentUser) {
        banner.innerHTML = '';
        return;
    }

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/delete-requests?userId=${encodeURIComponent(state.currentUser.id)}`);
        const result = await res.json();
        const pendingForAuthor = (result.data || []).filter(r => r.status === 'PENDING' && r.authorId === state.currentUser.id);

        if (pendingForAuthor.length === 0) {
            banner.innerHTML = '';
            return;
        }

        banner.innerHTML = pendingForAuthor.map(r => `
            <div class="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2 shadow-sm rounded-4 mb-2">
                <div class="small fw-semibold">
                    <i class="bi bi-exclamation-triangle-fill me-1"></i>
                    Quản trị viên yêu cầu xóa tài liệu <strong>"${escapeHtml(r.documentTitle)}"</strong> (tự động xóa sau 30 ngày nếu không phản hồi).
                </div>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-sm btn-danger fw-bold" onclick="respondDeleteRequest('${r.id}', 'approve')">Đồng ý xóa</button>
                    <button type="button" class="btn btn-sm btn-outline-dark fw-bold" onclick="respondDeleteRequest('${r.id}', 'reject')">Từ chối</button>
                </div>
            </div>
        `).join('');
    } catch (_) {
        banner.innerHTML = '';
    }
}

async function respondDeleteRequest(reqId, action) {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/delete-requests/${reqId}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        const result = await res.json();
        if (result.success) {
            showToast(result.message, 'success');
            await fetchDocuments();
            await checkDeleteRequests();
        }
    } catch (_) {}
}

// ---------- Community, Member Connect & Group Chat ----------

function openCommunitySection(section = 'groups') {
    switchTab('groups');
    if (section === 'connect') {
        document.getElementById('academicConnectPanel')?.scrollIntoView({ behavior: 'smooth' });
    } else {
        document.getElementById('groupChatSection')?.scrollIntoView({ behavior: 'smooth' });
    }
}

async function fetchCommunityMembers() {
    const role = document.getElementById('memberRoleFilter')?.value || 'ALL';
    const q = document.getElementById('memberSearchInput')?.value || '';

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/users?role=${encodeURIComponent(role)}&q=${encodeURIComponent(q)}`);
        const result = await res.json();
        state.members = result.data || [];
        renderCommunityMembers();
    } catch (_) {}
}

function renderCommunityMembers() {
    const container = document.getElementById('communityMembersList');
    if (!container) return;

    const list = state.members.filter(m => !state.currentUser || m.id !== state.currentUser.id);
    if (list.length === 0) {
        container.innerHTML = `<div class="col-12 text-muted small">Không tìm thấy thành viên phù hợp.</div>`;
        return;
    }

    container.innerHTML = list.map(m => `
        <div class="col-md-6 col-lg-4">
            <div class="p-2 rounded-3 border d-flex align-items-center justify-content-between gap-2" style="background-color: var(--input-bg);">
                <div class="d-flex align-items-center gap-2 overflow-hidden">
                    <img src="${escapeHtml(m.avatarUrl)}" class="rounded-circle border" width="38" height="38" alt="Avatar" style="object-fit: cover;">
                    <div class="overflow-hidden">
                        <div class="fw-bold small text-main text-truncate">${escapeHtml(m.fullName)}</div>
                        <small class="text-secondary d-block text-truncate" style="font-size: 0.72rem;">${formatRoleLabel(m.role)} • ${escapeHtml(m.faculty || 'MTU')}</small>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-primary fw-bold text-nowrap" onclick="startDirectConnect('${m.id}', '${escapeHtml(m.fullName)}')">
                    <i class="bi bi-chat-dots me-1"></i>Kết nối
                </button>
            </div>
        </div>
    `).join('');
}

async function startDirectConnect(targetUserId, targetName) {
    if (!state.currentUser) {
        showToast('Vui lòng đăng nhập để kết nối trò chuyện học thuật!', 'error');
        openModal(document.getElementById('authModal'));
        return;
    }

    const pairIds = [state.currentUser.id, targetUserId].sort();
    const dmRoomId = `dm-${pairIds[0]}-${pairIds[1]}`;
    const roomTitle = `Trao đổi học thuật: ${state.currentUser.fullName} & ${targetName}`;

    openGroupChat(dmRoomId, roomTitle, 2);
    showToast(`Đã mở kênh kết nối với ${targetName}`, 'success');
}

async function fetchGroups() {
    try {
        const uidParam = state.currentUser ? `?userId=${encodeURIComponent(state.currentUser.id)}` : '';
        const res = await fetch(`${CONFIG.API_BASE_URL}/groups${uidParam}`);
        const result = await res.json();
        state.groups = result.data || [];
        renderGroupLists();

        // Load initial messages for active group
        const active = state.groups.find(g => g.id === state.activeGroupId) || state.groups[0];
        if (active) {
            loadGroupMessages(active.id, active.name, active.membersCount);
        }
    } catch (_) {}
}

function renderGroupLists() {
    const joined = state.groups.filter(g => g.status === 'JOINED');
    const pending = state.groups.filter(g => g.status === 'PENDING');
    const suggested = state.groups.filter(g => g.status === 'SUGGESTED');

    const joinedEl = document.getElementById('joinedGroupsList');
    const pendingEl = document.getElementById('pendingGroupsList');
    const suggestedEl = document.getElementById('suggestedGroupsList');

    if (joinedEl) {
        joinedEl.innerHTML = joined.length ? joined.map(g => `
            <div class="list-group-item d-flex justify-content-between align-items-center p-2 cursor-pointer" onclick="openGroupChat('${g.id}', '${escapeHtml(g.name)}', ${g.membersCount})">
                <div class="me-2 overflow-hidden">
                    <strong class="text-primary small d-block text-truncate">${escapeHtml(g.name)}</strong>
                    <small class="text-secondary" style="font-size: 0.72rem;">${g.membersCount} thành viên</small>
                </div>
                <button type="button" class="btn btn-sm btn-primary fw-bold text-nowrap">Trò chuyện</button>
            </div>
        `).join('') : '<div class="small text-muted">Chưa tham gia nhóm nào.</div>';
    }

    if (pendingEl) {
        pendingEl.innerHTML = pending.length ? pending.map(g => `
            <div class="list-group-item d-flex justify-content-between align-items-center p-2">
                <div class="me-2 overflow-hidden">
                    <strong class="text-main small d-block text-truncate">${escapeHtml(g.name)}</strong>
                    <small class="text-warning" style="font-size: 0.72rem;">Đang chờ phê duyệt</small>
                </div>
                <button type="button" class="btn btn-sm btn-outline-warning fw-bold text-nowrap" onclick="joinGroupNow('${g.id}')">Vào nhanh</button>
            </div>
        `).join('') : '<div class="small text-muted">Không có nhóm chờ duyệt.</div>';
    }

    if (suggestedEl) {
        suggestedEl.innerHTML = suggested.length ? suggested.map(g => `
            <div class="list-group-item d-flex justify-content-between align-items-center p-2">
                <div class="me-2 overflow-hidden">
                    <strong class="text-main small d-block text-truncate">${escapeHtml(g.name)}</strong>
                    <small class="text-secondary" style="font-size: 0.72rem;">${g.membersCount} thành viên</small>
                </div>
                <button type="button" class="btn btn-sm btn-outline-primary fw-bold text-nowrap" onclick="joinGroupNow('${g.id}')">Tham gia</button>
            </div>
        `).join('') : '<div class="small text-muted">Không có gợi ý mới.</div>';
    }
}

async function joinGroupNow(groupId) {
    if (!state.currentUser) {
        showToast('Vui lòng đăng nhập để tham gia nhóm!', 'error');
        openModal(document.getElementById('authModal'));
        return;
    }

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/groups/${groupId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.currentUser.id })
        });
        const result = await res.json();
        if (result.success && result.data) {
            await fetchGroups();
            openGroupChat(result.data.id, result.data.name, result.data.membersCount);
            showToast(result.message, 'success');
        }
    } catch (_) {}
}

function openGroupChat(groupId, groupName, membersCount) {
    state.activeGroupId = groupId;
    switchTab('groups');
    loadGroupMessages(groupId, groupName, membersCount);
    document.getElementById('chatWindowCard')?.scrollIntoView({ behavior: 'smooth' });
}

function loadGroupMessages(groupId, groupName, membersCount) {
    state.activeGroupId = groupId;
    const nameEl = document.getElementById('chatGroupName');
    const memEl = document.getElementById('chatGroupMembers');
    if (nameEl) nameEl.textContent = groupName;
    if (memEl) memEl.textContent = `${membersCount} Thành viên`;

    fetch(`${CONFIG.API_BASE_URL}/groups/${groupId}/messages`)
        .then(r => r.json())
        .then(res => {
            const chatBox = document.getElementById('chatMessagesBox');
            if (chatBox && res.success) {
                chatBox.innerHTML = `<div class="text-center text-secondary small my-2 fw-semibold">-- Phòng trò chuyện: ${escapeHtml(groupName)} --</div>`;
                (res.data || []).forEach(m => {
                    const isSelf = state.currentUser && m.sender === state.currentUser.fullName;
                    appendChatMessage(m.sender, m.text, m.files, m.time, isSelf);
                });
            }
        })
        .catch(() => {});
}

function appendChatMessage(sender, text, files = [], time = '', isSelf = false) {
    const chatBox = document.getElementById('chatMessagesBox');
    if (!chatBox) return;

    let filesHtml = '';
    if (files && files.length > 0) {
        filesHtml = '<div class="mt-2 d-flex flex-wrap gap-2">' + files.map(f =>
            `<a href="${escapeHtml(f.url)}" target="_blank" rel="noopener" class="btn btn-sm btn-light border text-primary fw-bold"><i class="bi bi-file-earmark-arrow-down me-1"></i>${escapeHtml(f.name)}</a>`
        ).join('') + '</div>';
    }

    const div = document.createElement('div');
    div.className = `chat-bubble ${isSelf ? 'self' : ''}`;
    div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center gap-3 mb-1">
            <strong class="small chat-sender">${escapeHtml(sender)}</strong>
            <small class="chat-time" style="font-size: 0.7rem;">${escapeHtml(time)}</small>
        </div>
        <div class="small">${escapeHtml(text)}</div>
        ${filesHtml}
    `;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ---------- AI Chatbot Handler ----------

async function handleSendAiMessage() {
    const input = document.getElementById('aiPromptInput');
    const fileInput = document.getElementById('aiFileInput');
    const prompt = input?.value.trim() || '';
    const files = fileInput?.files || [];

    if (!prompt && files.length === 0) return;

    const box = document.getElementById('aiMessageContainer');
    if (box) {
        const fileNote = files.length > 0 ? ` <span class="badge bg-secondary">+${files.length} tệp</span>` : '';
        box.innerHTML += `<div class="mb-2 text-end text-primary"><strong>Bạn:</strong> ${escapeHtml(prompt)}${fileNote}</div>`;
        box.scrollTop = box.scrollHeight;
    }

    const formData = new FormData();
    formData.append('prompt', prompt);
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    if (input) input.value = '';
    if (fileInput) fileInput.value = '';
    const preview = document.getElementById('aiFilePreview');
    if (preview) preview.innerHTML = '';

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/ai/chat`, {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        if (box) {
            box.innerHTML += `<div class="mb-3 p-2 rounded-3 border" style="background-color: var(--card-bg);"><strong>AI EduShare:</strong><div class="mt-1 small">${result.reply || result.message}</div></div>`;
            box.scrollTop = box.scrollHeight;
        }
    } catch (_) {
        if (box) {
            box.innerHTML += `<div class="mb-2 text-danger"><strong>AI EduShare:</strong> Không thể kết nối máy chủ AI.</div>`;
        }
    }
}
