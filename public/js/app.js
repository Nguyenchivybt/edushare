/**
 * EduShare - Kho Tài Liệu Tri Thức | Thư Viện Học Liệu Số MTU
 * Client Frontend JavaScript Application (app.js)
 * Tác giả: Nguyễn Chí Vỹ
 * Đơn vị: Trường Đại học Xây dựng Miền Tây (MTU)
 */

const CONFIG = {
    API_BASE_URL: window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api',
    ALLOWED_EMAIL_DOMAIN: '@muce.edu.vn',
    OTP_COUNTDOWN_SECONDS: 60,
    STORAGE_KEY_USER: 'edushare_user_session',
    STORAGE_KEY_THEME: 'edushare_theme_mode',
    STORAGE_KEY_STYLE: 'edushare_theme_style'
};

/**
 * STATE HỆ THỐNG VÀ XÁC THỰC PHÂN QUYỀN (ROLES)
 * Role: GUEST | STUDENT | TEACHER | ADMIN
 */
const state = {
    currentUser: null, // Null if GUEST
    documents: [],
    filteredDocuments: [],
    savedDocumentIds: new Set(),
    groups: [],
    filters: {
        school: 'MTU',
        faculty: 'ALL',
        major: 'ALL',
        academicYear: 'ALL',
        className: 'ALL',
        subject: 'ALL',
        category: 'ALL',
        searchQuery: ''
    },
    otpTimer: null,
    otpSecondsRemaining: 0,
    activeTab: 'feed',
    userStatus: 'ONLINE' // ONLINE | OFFLINE
};

// HELPER MỞ VÀ ĐÓNG POPUP MODAL
function openModal(modalEl) {
    if (modalEl) {
        modalEl.classList.add('show');
        modalEl.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalEl) {
    if (modalEl) {
        modalEl.classList.remove('show');
        modalEl.style.display = 'none';
        document.body.style.overflow = '';
    }
}

/**
 * HỆ THỐNG THÔNG BÁO TOAST POPUP CÓ ICON (ĐÃ CHUẨN HÓA THEO ĐẶC TẢ 3.5)
 * Thành công: Icon dấu tích xanh (✓)
 * Thất bại: Icon dấu X đỏ (✗)
 */
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    let iconHtml = '<i class="bi bi-check-circle-fill me-2 text-success"></i>';
    let alertClass = 'bg-white border-success text-dark';

    if (type === 'error' || type === 'danger') {
        iconHtml = '<i class="bi bi-x-circle-fill me-2 text-danger"></i>';
        alertClass = 'bg-white border-danger text-dark';
    } else if (type === 'warning') {
        iconHtml = '<i class="bi bi-exclamation-triangle-fill me-2 text-warning"></i>';
        alertClass = 'bg-white border-warning text-dark';
    } else if (type === 'info') {
        iconHtml = '<i class="bi bi-info-circle-fill me-2 text-primary"></i>';
        alertClass = 'bg-white border-primary text-dark';
    }

    const toast = document.createElement('div');
    toast.className = `alert ${alertClass} alert-dismissible fade show shadow-lg mb-2 border-2 rounded-3 d-flex align-items-center`;
    toast.role = 'alert';
    toast.innerHTML = `
        <div class="fs-5 d-flex align-items-center">${iconHtml}</div>
        <div class="fw-medium flex-grow-1 ms-1">${escapeHtml(message)}</div>
        <button type="button" class="btn-close ms-2" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 4500);
}

function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    console.log("EduShare System Initializing...");
    loadSavedThemeAndStyle();
    loadUserSession();
    bindAllEvents();
    fetchDocuments();
    fetchGroups();
}

/**
 * QUẢN LÝ GIAO DIỆN & TÙY CHỌN 3 CHỦ ĐỀ (CLASSIC / ACADEMIC / MODERN) & DARK MODE
 */
function loadSavedThemeAndStyle() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEY_THEME) || 'light';
    const savedStyle = localStorage.getItem(CONFIG.STORAGE_KEY_STYLE) || 'academic';

    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.setAttribute('data-style', savedStyle);

    const darkModeSwitch = document.getElementById('darkModeSwitch');
    if (darkModeSwitch) darkModeSwitch.checked = (savedTheme === 'dark');

    updateThemeStyleButtonsUI(savedStyle);
}

function updateThemeStyleButtonsUI(activeStyle) {
    document.querySelectorAll('.theme-style-btn').forEach(btn => {
        if (btn.getAttribute('data-style') === activeStyle) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function saveThemeSettings(themeMode, themeStyle) {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.setAttribute('data-style', themeStyle);
    localStorage.setItem(CONFIG.STORAGE_KEY_THEME, themeMode);
    localStorage.setItem(CONFIG.STORAGE_KEY_STYLE, themeStyle);
    showToast('Đã lưu tùy chọn giao diện thành công!', 'success');
}

/**
 * QUẢN LÝ SESSION NGƯỜI DÙNG & TỰ ĐỘNG ĐĂNG NHẬP
 */
function loadUserSession() {
    const savedUserJson = localStorage.getItem(CONFIG.STORAGE_KEY_USER);
    if (savedUserJson) {
        try {
            state.currentUser = JSON.parse(savedUserJson);
            updateUserUI();
        } catch (e) {
            state.currentUser = null;
        }
    }
}

function saveUserSession(userObj) {
    state.currentUser = userObj;
    localStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(userObj));
    updateUserUI();
}

function clearUserSession() {
    state.currentUser = null;
    localStorage.removeItem(CONFIG.STORAGE_KEY_USER);
    updateUserUI();
    showToast('Đã đăng xuất tài khoản thành công!', 'info');
}

/**
 * GÁN BỘ LẮNG NGHE SỰ KIỆN (EVENT BINDINGS)
 */
function bindAllEvents() {
    // 1. NAVIGATION & MODALS
    const btnHeaderLogin = document.getElementById('btnHeaderLogin');
    const btnHeaderRegister = document.getElementById('btnHeaderRegister');
    const authModal = document.getElementById('authModal');
    const btnCloseAuth = document.getElementById('btnCloseAuth');

    if (btnHeaderLogin) btnHeaderLogin.addEventListener('click', () => openAuthModal('login'));
    if (btnHeaderRegister) btnHeaderRegister.addEventListener('click', () => openAuthModal('register'));
    if (btnCloseAuth) btnCloseAuth.addEventListener('click', () => closeModal(authModal));

    const btnHeroUpload = document.getElementById('btnHeroUpload');
    const uploadModal = document.getElementById('uploadModal');
    const btnCloseUpload = document.getElementById('btnCloseUpload');

    if (btnHeroUpload) btnHeroUpload.addEventListener('click', () => {
        if (checkPermission('UPLOAD')) openModal(uploadModal);
    });
    if (btnCloseUpload) btnCloseUpload.addEventListener('click', () => closeModal(uploadModal));

    const btnFloatingAi = document.getElementById('btnFloatingAi');
    const aiChatModal = document.getElementById('aiChatModal');
    const btnCloseAi = document.getElementById('btnCloseAi');

    if (btnFloatingAi) btnFloatingAi.addEventListener('click', () => openModal(aiChatModal));
    if (btnCloseAi) btnCloseAi.addEventListener('click', () => closeModal(aiChatModal));

    const btnForgotPassword = document.getElementById('btnForgotPassword');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const btnCloseForgot = document.getElementById('btnCloseForgot');

    if (btnForgotPassword) {
        btnForgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(authModal);
            openModal(forgotPasswordModal);
        });
    }
    if (btnCloseForgot) btnCloseForgot.addEventListener('click', () => closeModal(forgotPasswordModal));

    const btnOpenProfileSettings = document.getElementById('btnOpenProfileSettings');
    const profileSettingsModal = document.getElementById('profileSettingsModal');
    const btnCloseProfileSettings = document.getElementById('btnCloseProfileSettings');
    const userProfileWidget = document.getElementById('userProfileWidget');

    if (btnOpenProfileSettings) btnOpenProfileSettings.addEventListener('click', () => openProfileSettingsModal());
    if (userProfileWidget) userProfileWidget.addEventListener('click', (e) => {
        if (e.target.closest('#btnLogout')) return;
        openProfileSettingsModal();
    });
    if (btnCloseProfileSettings) btnCloseProfileSettings.addEventListener('click', () => closeModal(profileSettingsModal));

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', (e) => {
        e.stopPropagation();
        clearUserSession();
    });

    // 2. SOCIAL LOGINS (GOOGLE & FACEBOOK)
    const btnLoginGoogle = document.getElementById('btnLoginGoogle');
    const btnLoginFacebook = document.getElementById('btnLoginFacebook');

    if (btnLoginGoogle) {
        btnLoginGoogle.addEventListener('click', () => {
            const googleUser = {
                id: 'gg-101',
                fullName: 'Nguyễn Chí Vỹ (Google)',
                email: 'nguyenchivybt2006@gmail.com',
                role: 'STUDENT',
                school: 'ĐH Xây dựng Miền Tây (MTU)',
                avatar: 'https://ui-avatars.com/api/?name=Nguyen+Chi+Vy&background=ea4335&color=fff'
            };
            saveUserSession(googleUser);
            closeModal(authModal);
            showToast('Đã đăng nhập thành công qua Google!', 'success');
        });
    }

    if (btnLoginFacebook) {
        btnLoginFacebook.addEventListener('click', () => {
            const fbUser = {
                id: 'fb-202',
                fullName: 'Nguyễn Chí Vỹ (Facebook)',
                email: 'vy.nguyen@muce.edu.vn',
                role: 'STUDENT',
                school: 'ĐH Xây dựng Miền Tây (MTU)',
                avatar: 'https://ui-avatars.com/api/?name=Nguyen+Chi+Vy&background=1877f2&color=fff'
            };
            saveUserSession(fbUser);
            closeModal(authModal);
            showToast('Đã đăng nhập thành công qua Facebook!', 'success');
        });
    }

    // 3. TAB NAVIGATION
    const btnHeaderHome = document.getElementById('btnHeaderHome');
    const btnTabFeedAll = document.getElementById('btnTabFeedAll');
    const btnTabSavedFast = document.getElementById('btnTabSavedFast');
    const menuLinkFindAcademic = document.getElementById('menuLinkFindAcademic');
    const menuLinkConnect = document.getElementById('menuLinkConnect');
    const menuLinkGroups = document.getElementById('menuLinkGroups');

    if (btnHeaderHome) btnHeaderHome.addEventListener('click', () => switchTab('feed'));
    if (btnTabFeedAll) btnTabFeedAll.addEventListener('click', () => switchTab('feed'));
    if (btnTabSavedFast) btnTabSavedFast.addEventListener('click', () => switchTab('saved'));
    if (menuLinkFindAcademic) menuLinkFindAcademic.addEventListener('click', (e) => { e.preventDefault(); switchTab('feed'); });
    if (menuLinkConnect) menuLinkConnect.addEventListener('click', (e) => { e.preventDefault(); switchTab('groups'); });
    if (menuLinkGroups) menuLinkGroups.addEventListener('click', (e) => { e.preventDefault(); switchTab('groups'); });

    // 4. FILTER DROPDOWNS & SEARCH INPUTS
    ['filterSchool', 'filterFaculty', 'filterMajor', 'filterYear', 'filterClass', 'filterSubject'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', handleFilterChange);
    });

    const searchFileInput = document.getElementById('searchFileInput');
    if (searchFileInput) searchFileInput.addEventListener('input', debounce(handleFilterChange, 300));

    const headerSearchInput = document.getElementById('headerSearchInput');
    if (headerSearchInput) headerSearchInput.addEventListener('input', (e) => {
        if (searchFileInput) searchFileInput.value = e.target.value;
        handleFilterChange();
    });

    const btnResetFilters = document.getElementById('btnResetFilters');
    if (btnResetFilters) btnResetFilters.addEventListener('click', resetFilters);

    // 5. CATEGORY TAG BUTTONS
    const categoryFilterGroup = document.getElementById('categoryFilterGroup');
    if (categoryFilterGroup) {
        categoryFilterGroup.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                categoryFilterGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.filters.category = btn.getAttribute('data-category') || 'ALL';
                applyFiltersAndRender();
            });
        });
    }

    // 6. FORM SUBMIT HANDLERS
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegisterSubmit);

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) uploadForm.addEventListener('submit', handleDocumentUpload);

    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) forgotForm.addEventListener('submit', handleVerifyOtpAndReset);

    const btnRequestOtp = document.getElementById('btnRequestOtp');
    if (btnRequestOtp) btnRequestOtp.addEventListener('click', handleRequestOtp);

    const btnSendAiPrompt = document.getElementById('btnSendAiPrompt');
    if (btnSendAiPrompt) btnSendAiPrompt.addEventListener('click', handleAiChatSubmit);

    const createGroupForm = document.getElementById('createGroupForm');
    if (createGroupForm) createGroupForm.addEventListener('submit', handleCreateGroupSubmit);

    const btnSaveProfileSettings = document.getElementById('btnSaveProfileSettings');
    if (btnSaveProfileSettings) btnSaveProfileSettings.addEventListener('click', handleSaveProfileSettings);

    const avatarFileInput = document.getElementById('avatarFileInput');
    if (avatarFileInput) avatarFileInput.addEventListener('change', handleAvatarUploadPreview);

    // Style Theme Buttons in Profile Modal
    document.querySelectorAll('.theme-style-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.theme-style-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Close modal when clicking outside dialog
    window.addEventListener('click', (e) => {
        [authModal, uploadModal, aiChatModal, forgotPasswordModal, profileSettingsModal].forEach(modal => {
            if (e.target === modal) closeModal(modal);
        });
    });
}

function openAuthModal(mode = 'login') {
    const authModal = document.getElementById('authModal');
    const loginTabBtn = document.getElementById('login-tab');
    const registerTabBtn = document.getElementById('register-tab');
    const pillsLogin = document.getElementById('pills-login');
    const pillsRegister = document.getElementById('pills-register');

    if (mode === 'login') {
        if (loginTabBtn) loginTabBtn.classList.add('active');
        if (registerTabBtn) registerTabBtn.classList.remove('active');
        if (pillsLogin) pillsLogin.classList.add('show', 'active');
        if (pillsRegister) pillsRegister.classList.remove('show', 'active');
    } else {
        if (registerTabBtn) registerTabBtn.classList.add('active');
        if (loginTabBtn) loginTabBtn.classList.remove('active');
        if (pillsRegister) pillsRegister.classList.add('show', 'active');
        if (pillsLogin) pillsLogin.classList.remove('show', 'active');
    }

    openModal(authModal);
}

function openProfileSettingsModal() {
    if (!state.currentUser) {
        showToast('Vui lòng đăng nhập để xem thông tin cá nhân!', 'warning');
        openAuthModal('login');
        return;
    }

    const modal = document.getElementById('profileSettingsModal');
    const nameEl = document.getElementById('settingProfileName');
    const detailEl = document.getElementById('settingProfileDetail');
    const badgeEl = document.getElementById('settingRoleBadge');
    const avatarImg = document.getElementById('settingAvatarPreview');
    const statusSelect = document.getElementById('statusSelect');

    if (nameEl) nameEl.textContent = state.currentUser.fullName || 'Nguyễn Chí Vỹ';
    if (detailEl) detailEl.textContent = `Email: ${state.currentUser.email || 'nguyenchivy@muce.edu.vn'} | SĐT: ${state.currentUser.phone || '0862204069'}`;
    if (badgeEl) badgeEl.textContent = formatRoleLabel(state.currentUser.role);
    if (avatarImg && state.currentUser.avatar) avatarImg.src = state.currentUser.avatar;
    if (statusSelect) statusSelect.value = state.userStatus;

    const currentStyle = document.documentElement.getAttribute('data-style') || 'academic';
    updateThemeStyleButtonsUI(currentStyle);

    openModal(modal);
}

/**
 * XÁC THỰC PHÂN QUYỀN VAI TRÒ (PERMISSION CHECK MATRIX)
 */
function checkPermission(action, docOwnerRole = 'STUDENT', docOwnerId = '') {
    const user = state.currentUser;

    if (action === 'DOWNLOAD') {
        if (!user) {
            showToast('Khách chỉ có quyền xem! Vui lòng đăng nhập để tải học liệu.', 'warning');
            openAuthModal('login');
            return false;
        }
        return true;
    }

    if (action === 'UPLOAD') {
        if (!user) {
            showToast('Vui lòng đăng nhập để đăng tải học liệu mới!', 'warning');
            openAuthModal('login');
            return false;
        }
        return true;
    }

    if (action === 'DELETE' || action === 'EDIT') {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        if (user.role === 'TEACHER' && docOwnerRole !== 'ADMIN') return true;
        if (user.role === 'STUDENT') {
            if (docOwnerRole === 'TEACHER' || docOwnerRole === 'ADMIN') {
                showToast('Sinh viên không có quyền xóa/sửa bài giảng của Giảng viên hoặc Admin!', 'error');
                return false;
            }
            if (docOwnerId && user.id !== docOwnerId) {
                showToast('Bạn chỉ được sửa/xóa bài viết của chính mình!', 'error');
                return false;
            }
            return true;
        }
    }

    return true;
}

// FETCH DỮ LIỆU BÀI VIẾT & NHÓM
async function fetchDocuments() {
    const container = document.getElementById('documentContainer');
    try {
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Đang tải học liệu MTU...</span>
                    </div>
                </div>
            `;
        }
        const response = await fetch(`${CONFIG.API_BASE_URL}/documents`);
        const result = await response.json();

        if (result.success) {
            state.documents = result.data || [];
            applyFiltersAndRender();
        } else {
            state.documents = getSampleDocuments();
            applyFiltersAndRender();
        }
    } catch (error) {
        state.documents = getSampleDocuments();
        applyFiltersAndRender();
    }
}

async function fetchGroups() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/groups`);
        const result = await response.json();
        if (result.success) state.groups = result.data || [];
    } catch (e) {
        state.groups = [
            { id: 'g1', name: 'Nhóm KTPM K24 MTU (Khoa Kỹ thuật Phần mềm)', membersCount: 142, desc: 'Tra cứu đồ án & bài tập hệ điều hành.' },
            { id: 'g2', name: 'Cộng Đồng Nghiên Cứu AI & Đô Thị Miền Tây', membersCount: 68, desc: 'Kết nối SV và Giảng viên hướng dẫn NCKH.' }
        ];
    }
    renderGroupsList();
}

function applyFiltersAndRender() {
    let docs = [...state.documents];

    if (state.filters.school !== 'ALL') docs = docs.filter(d => d.school === state.filters.school);
    if (state.filters.faculty !== 'ALL') docs = docs.filter(d => d.faculty === state.filters.faculty);
    if (state.filters.major !== 'ALL') docs = docs.filter(d => d.major === state.filters.major);
    if (state.filters.academicYear !== 'ALL') docs = docs.filter(d => d.academicYear === state.filters.academicYear);
    if (state.filters.className !== 'ALL') docs = docs.filter(d => d.className === state.filters.className);
    if (state.filters.subject !== 'ALL') docs = docs.filter(d => d.subject === state.filters.subject);
    if (state.filters.category !== 'ALL') docs = docs.filter(d => d.category === state.filters.category);

    if (state.filters.searchQuery) {
        const q = state.filters.searchQuery.toLowerCase();
        docs = docs.filter(d => 
            d.title.toLowerCase().includes(q) || 
            (d.description && d.description.toLowerCase().includes(q)) ||
            (d.authorName && d.authorName.toLowerCase().includes(q))
        );
    }

    state.filteredDocuments = docs;
    renderDocumentCards(docs);
}

function renderDocumentCards(docs) {
    const container = document.getElementById('documentContainer');
    if (!container) return;

    if (docs.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-folder-x fs-1 text-muted"></i>
                <p class="mt-3 text-secondary">Không tìm thấy tài liệu phù hợp với bộ lọc!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = docs.map(doc => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 document-card shadow-sm border-0">
                <div class="card-body d-flex flex-column p-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-primary-subtle text-primary fw-semibold">${formatCategoryLabel(doc.category)}</span>
                        <span class="badge bg-light text-dark border">${escapeHtml(doc.className || 'MTU')}</span>
                    </div>
                    <h5 class="card-title fw-bold text-dark mb-2">${escapeHtml(doc.title)}</h5>
                    <p class="card-text text-muted small mb-3 flex-grow-1">${escapeHtml(doc.description || 'Tài liệu học tập tri thức thuộc Trường ĐH Xây dựng Miền Tây.')}</p>
                    
                    <div class="mt-auto pt-3 border-top">
                        <div class="d-flex align-items-center text-secondary small mb-3">
                            <i class="bi bi-person-circle me-1 text-primary"></i>
                            <span class="me-3 fw-medium">${escapeHtml(doc.authorName || 'Nguyễn Chí Vỹ')}</span>
                            <span class="badge bg-secondary-subtle text-secondary me-2">${formatRoleLabel(doc.authorRole || 'STUDENT')}</span>
                            <i class="bi bi-eye me-1"></i>
                            <span>${doc.views || 0}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-danger ${doc.liked ? 'active' : ''}" onclick="toggleLikeDocument(${doc.id})">
                                    <i class="bi bi-heart-fill me-1"></i> ${doc.likes || 0}
                                </button>
                                <button class="btn btn-outline-secondary" onclick="toggleSaveDocument(${doc.id})" title="Thêm mục yêu thích cá nhân">
                                    <i class="bi ${state.savedDocumentIds.has(doc.id) ? 'bi-bookmark-fill text-warning' : 'bi-bookmark'}"></i>
                                </button>
                            </div>
                            <div>
                                <button class="btn btn-sm btn-primary fw-semibold" onclick="handleDownloadClick(${doc.id}, '${doc.fileUrl || '#'}')">
                                    <i class="bi bi-download me-1"></i> Tải về
                                </button>
                                <button class="btn btn-sm btn-outline-danger border-0" onclick="handleDeleteDocument(${doc.id}, '${doc.authorRole || 'STUDENT'}', '${doc.authorId || ''}')" title="Xóa bài">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderGroupsList() {
    const container = document.getElementById('groupsContainer');
    if (!container) return;

    container.innerHTML = state.groups.map(g => `
        <div class="list-group-item d-flex justify-content-between align-items-center p-3 mb-3 rounded-3 border bg-white shadow-sm">
            <div>
                <h6 class="mb-1 fw-bold text-dark">${escapeHtml(g.name)}</h6>
                <p class="mb-1 small text-muted">${escapeHtml(g.desc || 'Nhóm học thuật thảo luận bài tập & đề thi MTU.')}</p>
                <small class="text-primary fw-semibold"><i class="bi bi-people me-1"></i> ${g.membersCount} Thành viên</small>
            </div>
            <button class="btn btn-sm btn-outline-primary fw-semibold rounded-pill px-3" onclick="showToast('Đã đăng ký tham gia nhóm ${escapeHtml(g.name)}!', 'success')">
                <i class="bi bi-person-plus me-1"></i> Tham gia
            </button>
        </div>
    `).join('');
}

function handleFilterChange() {
    state.filters.school = document.getElementById('filterSchool')?.value || 'MTU';
    state.filters.faculty = document.getElementById('filterFaculty')?.value || 'ALL';
    state.filters.major = document.getElementById('filterMajor')?.value || 'ALL';
    state.filters.academicYear = document.getElementById('filterYear')?.value || 'ALL';
    state.filters.className = document.getElementById('filterClass')?.value || 'ALL';
    state.filters.subject = document.getElementById('filterSubject')?.value || 'ALL';
    state.filters.searchQuery = document.getElementById('searchFileInput')?.value.trim() || '';

    applyFiltersAndRender();
}

function resetFilters() {
    ['filterSchool', 'filterFaculty', 'filterMajor', 'filterYear', 'filterClass', 'filterSubject'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = id === 'filterSchool' ? 'MTU' : 'ALL';
    });
    const searchFileInput = document.getElementById('searchFileInput');
    if (searchFileInput) searchFileInput.value = '';

    const headerSearchInput = document.getElementById('headerSearchInput');
    if (headerSearchInput) headerSearchInput.value = '';

    state.filters = {
        school: 'MTU', faculty: 'ALL', major: 'ALL', academicYear: 'ALL',
        className: 'ALL', subject: 'ALL', category: 'ALL', searchQuery: ''
    };
    applyFiltersAndRender();
    showToast('Đã đặt lại bộ lọc tìm kiếm!', 'info');
}

/**
 * XỬ LÝ SUBMIT CÁC FORM AUTHENTICATION & PROFILE
 */
async function handleLoginSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (!data.identity || !data.password) {
        showToast('Đăng nhập thất bại. Vui lòng nhập đủ thông tin!', 'error');
        return;
    }

    // Demo/API Login Handler
    const user = {
        id: 'user-001',
        fullName: 'Nguyễn Chí Vỹ',
        email: data.identity.includes('@') ? data.identity : 'nguyenchivybt2006@gmail.com',
        phone: '0862204069',
        role: 'STUDENT',
        school: 'ĐH Xây dựng Miền Tây (MTU)',
        faculty: 'Khoa Kỹ thuật Phần mềm',
        academicYear: 'K2024',
        major: 'Kỹ thuật Phần mềm',
        className: 'DHKTPM24',
        avatar: 'https://ui-avatars.com/api/?name=Nguyen+Chi+Vy&background=4f46e5&color=fff'
    };

    saveUserSession(user);
    closeModal(document.getElementById('authModal'));
    showToast('Đã đăng nhập thành công!', 'success');
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (!data.email || !data.email.toLowerCase().endsWith(CONFIG.ALLOWED_EMAIL_DOMAIN)) {
        showToast(`Đăng ký thất bại. Email phải có đuôi ${CONFIG.ALLOWED_EMAIL_DOMAIN}`, 'error');
        return;
    }

    if (data.password !== data.confirmPassword) {
        showToast('Mật khẩu mới và Xác nhận mật khẩu không trùng khớp!', 'error');
        return;
    }

    showToast('Đã đăng ký thành công! Vui lòng đăng nhập.', 'success');
    e.target.reset();
    openAuthModal('login');
}

async function handleDocumentUpload(e) {
    e.preventDefault();
    if (!checkPermission('UPLOAD')) return;

    const formData = new FormData(e.target);
    const title = formData.get('title');

    const newDoc = {
        id: Date.now(),
        title: title || 'Tài liệu học liệu mới',
        category: formData.get('category') || 'ACADEMIC',
        subject: formData.get('subject') || 'Hệ điều hành',
        school: 'MTU',
        faculty: 'KTPM',
        major: 'SE',
        academicYear: 'K2024',
        className: 'DHKTPM24',
        description: formData.get('description') || 'Học liệu upload mới.',
        authorName: state.currentUser ? state.currentUser.fullName : 'Nguyễn Chí Vỹ',
        authorRole: state.currentUser ? state.currentUser.role : 'STUDENT',
        authorId: state.currentUser ? state.currentUser.id : '',
        likes: 0,
        views: 1
    };

    state.documents.unshift(newDoc);
    applyFiltersAndRender();

    showToast('Tải tệp thành công!', 'success');
    closeModal(document.getElementById('uploadModal'));
    e.target.reset();
}

async function handleRequestOtp() {
    const identityInput = document.getElementById('forgotIdentity');
    const identity = identityInput ? identityInput.value.trim() : '';

    if (!identity) {
        showToast('Sai cú pháp hoặc thông tin không tồn tại', 'error');
        return;
    }

    showToast('Mã OTP xác nhận đã được gửi! (Demo OTP: 123456)', 'success');
    startOtpCountdown(CONFIG.OTP_COUNTDOWN_SECONDS);
}

function startOtpCountdown(seconds) {
    const btn = document.getElementById('btnRequestOtp');
    const span = document.getElementById('otpCountdown');
    if (btn) btn.disabled = true;

    state.otpSecondsRemaining = seconds;
    clearInterval(state.otpTimer);

    state.otpTimer = setInterval(() => {
        state.otpSecondsRemaining--;
        if (span) span.textContent = `(${state.otpSecondsRemaining}s)`;

        if (state.otpSecondsRemaining <= 0) {
            clearInterval(state.otpTimer);
            if (btn) btn.disabled = false;
            if (span) span.textContent = ' (Cấp lại OTP)';
        }
    }, 1000);
}

async function handleVerifyOtpAndReset(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newPass = formData.get('newPassword');
    const confirmPass = formData.get('confirmPassword');

    if (newPass !== confirmPass) {
        showToast('Mật khẩu mới và xác nhận phải trùng khớp 100%!', 'error');
        return;
    }

    showToast('Cập nhật mật khẩu thành công! Vui lòng đăng nhập lại.', 'success');
    closeModal(document.getElementById('forgotPasswordModal'));
    openAuthModal('login');
}

async function handleAiChatSubmit() {
    const input = document.getElementById('aiPromptInput');
    const container = document.getElementById('aiMessageContainer');
    const prompt = input ? input.value.trim() : '';

    if (!prompt) return;

    appendAiMsg('user', prompt);
    input.value = '';

    appendAiMsg('ai', '<i class="bi bi-three-dots"></i> Trợ lý AI (Google Gemini API) đang phân tích...');

    setTimeout(() => {
        if (container && container.lastElementChild) container.removeChild(container.lastElementChild);
        appendAiMsg('ai', `[EduShare AI Response] Trợ lý AI đã phân tích câu hỏi của bạn: "${escapeHtml(prompt)}". Gợi ý: Hãy tra cứu bộ ngân hàng đề thi môn Hệ Điều Hành và Kiến Trúc Máy Tính MTU!`);
    }, 1200);
}

function appendAiMsg(sender, text) {
    const container = document.getElementById('aiMessageContainer');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `d-flex mb-3 ${sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`;
    div.innerHTML = `
        <div class="p-3 rounded-3 ${sender === 'user' ? 'bg-primary text-white' : 'bg-light text-dark border'}" style="max-width: 85%;">
            <small class="fw-bold d-block mb-1">${sender === 'user' ? 'Bạn' : 'EduShare AI Engine'}</small>
            <div>${text}</div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function handleCreateGroupSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('groupName');

    if (!name) {
        showToast('Tạo nhóm thất bại, vui lòng thử lại!', 'error');
        return;
    }

    state.groups.unshift({
        id: 'g-' + Date.now(),
        name: name,
        membersCount: 1,
        desc: formData.get('groupDesc') || 'Nhóm học thuật vừa tạo.'
    });

    renderGroupsList();
    e.target.reset();
    showToast('Đã tạo nhóm thành công!', 'success');
}

function handleSaveProfileSettings() {
    if (!state.currentUser) return;

    const statusSelect = document.getElementById('statusSelect');
    if (statusSelect) state.userStatus = statusSelect.value;

    const darkModeSwitch = document.getElementById('darkModeSwitch');
    const themeMode = darkModeSwitch && darkModeSwitch.checked ? 'dark' : 'light';

    const activeStyleBtn = document.querySelector('.theme-style-btn.active');
    const themeStyle = activeStyleBtn ? activeStyleBtn.getAttribute('data-style') : 'academic';

    saveThemeSettings(themeMode, themeStyle);
    updateUserUI();
    closeModal(document.getElementById('profileSettingsModal'));
}

function handleAvatarUploadPreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            const preview = document.getElementById('settingAvatarPreview');
            if (preview) preview.src = evt.target.result;
            if (state.currentUser) {
                state.currentUser.avatar = evt.target.result;
                saveUserSession(state.currentUser);
            }
        };
        reader.readAsDataURL(file);
    }
}

// INTERACTION HANDLERS
function handleDownloadClick(docId, fileUrl) {
    if (checkPermission('DOWNLOAD')) {
        showToast('Tải tệp thành công!', 'success');
        if (fileUrl && fileUrl !== '#') window.open(fileUrl, '_blank');
    }
}

function handleDeleteDocument(docId, docOwnerRole, docOwnerId) {
    if (!checkPermission('DELETE', docOwnerRole, docOwnerId)) return;

    state.documents = state.documents.filter(d => d.id !== docId);
    applyFiltersAndRender();
    showToast('Đã xóa Tệp tin!', 'success');
}

function switchTab(tabName) {
    state.activeTab = tabName;
    ['feed', 'saved', 'groups'].forEach(name => {
        const tabEl = document.getElementById(`tab-${name}`);
        if (tabEl) {
            if (name === tabName) tabEl.classList.remove('d-none');
            else tabEl.classList.add('d-none');
        }
    });

    if (tabName === 'saved') renderSavedDocuments();
}

function renderSavedDocuments() {
    const container = document.getElementById('savedDocumentContainer');
    if (!container) return;

    const savedDocs = state.documents.filter(d => state.savedDocumentIds.has(d.id));
    if (savedDocs.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-bookmark-x fs-1 text-muted"></i>
                <p class="mt-3 text-secondary">Mục Yêu Thích Cá Nhân đang trống!</p>
            </div>
        `;
        return;
    }
    renderDocumentCards(savedDocs);
}

function toggleSaveDocument(docId) {
    if (state.savedDocumentIds.has(docId)) {
        state.savedDocumentIds.delete(docId);
        showToast('Đã xóa khỏi Mục Yêu thích cá nhân', 'info');
    } else {
        state.savedDocumentIds.add(docId);
        showToast('Đã thêm vào Mục Yêu thích cá nhân!', 'success');
    }
    applyFiltersAndRender();
}

function toggleLikeDocument(docId) {
    const doc = state.documents.find(d => d.id === docId);
    if (doc) {
        doc.liked = !doc.liked;
        doc.likes = (doc.likes || 0) + (doc.liked ? 1 : -1);
        applyFiltersAndRender();
    }
}

function updateUserUI() {
    const authBox = document.getElementById('userAuthContainer');
    const profileWidget = document.getElementById('userProfileWidget');
    const userName = document.getElementById('userProfileName');
    const userRole = document.getElementById('userProfileRole');
    const statusDot = document.getElementById('userStatusDot');
    const userAvatar = document.getElementById('userProfileAvatar');

    if (state.currentUser) {
        if (authBox) authBox.classList.add('d-none');
        if (profileWidget) {
            profileWidget.classList.remove('d-none');
            profileWidget.classList.add('d-flex');
        }
        if (userName) userName.textContent = state.currentUser.fullName || 'Nguyễn Chí Vỹ';
        if (userRole) userRole.textContent = `${formatRoleLabel(state.currentUser.role)} • MTU`;
        if (userAvatar && state.currentUser.avatar) userAvatar.src = state.currentUser.avatar;

        if (statusDot) {
            statusDot.className = `status-dot ${state.userStatus.toLowerCase()} position-absolute bottom-0 end-0 border border-white`;
        }
    } else {
        if (authBox) authBox.classList.remove('d-none');
        if (profileWidget) profileWidget.classList.add('d-none');
    }
}

function formatRoleLabel(role) {
    const map = {
        'STUDENT': 'Học sinh / Sinh viên',
        'TEACHER': 'Giảng viên',
        'ADMIN': 'Quản trị viên (Admin)'
    };
    return map[role] || 'Khách';
}

function formatCategoryLabel(cat) {
    const map = {
        'ACADEMIC': 'Giáo trình / Bài giảng',
        'EXERCISE': 'Bài tập mẫu / Đồ án',
        'EXAM': 'Tài liệu bài thi / Đề thi',
        'ARTICLE': 'Bài báo khoa học / NCKH'
    };
    return map[cat] || 'Học liệu';
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function getSampleDocuments() {
    return [
        {
            id: 1,
            title: "Giáo trình Kiến trúc Máy tính & Hệ điều hành Linux MTU",
            category: "ACADEMIC",
            subject: "Hệ điều hành",
            school: "MTU",
            faculty: "KTPM",
            major: "SE",
            academicYear: "K2024",
            className: "DHKTPM24",
            description: "Tài liệu giảng dạy chuyên ngành KTPM. Bao gồm lý thuyết tiến trình, bộ nhớ RAM, Bash Shell và phân vùng đĩa cứng.",
            authorName: "Nguyễn Chí Vỹ",
            authorRole: "STUDENT",
            likes: 48,
            views: 1420
        },
        {
            id: 2,
            title: "Bộ Đề thi mẫu & Đáp án Môn Lập trình Web DHKTPM24",
            category: "EXAM",
            subject: "Lập trình Web",
            school: "MTU",
            faculty: "KTPM",
            major: "SE",
            academicYear: "K2024",
            className: "DHKTPM24",
            description: "Tổng hợp ngân hàng đề thi tự luận và trắc nghiệm thực hành Node.js, Express và MongoDB.",
            authorName: "Trường ĐH Xây dựng Miền Tây",
            authorRole: "TEACHER",
            likes: 95,
            views: 2150
        },
        {
            id: 3,
            title: "Bài báo NCKH: Ứng dụng Trí tuệ nhân tạo trong xử lý ảnh đô thị",
            category: "ARTICLE",
            subject: "Cơ sở dữ liệu",
            school: "MTU",
            faculty: "KTPM",
            major: "SE",
            academicYear: "K2024",
            className: "DHKTPM24",
            description: "Công trình nghiên cứu ứng dụng AI phân tích hình ảnh giao thông tại vùng ĐBSCL.",
            authorName: "Nguyễn Chí Vỹ",
            authorRole: "STUDENT",
            likes: 62,
            views: 858
        }
    ];
}
