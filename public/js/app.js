/**
 * EduShare Frontend Application Logic (app.js)
 * Tác giả: Nguyễn Chí Vỹ
 * Đơn vị đồng hành: Trường Đại học Xây dựng Miền Tây (MTU)
 */

const CONFIG = {
    API_BASE_URL: window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api',
    ALLOWED_EMAIL_DOMAIN: '@mtu.edu.vn',
    OTP_COUNTDOWN_SECONDS: 60,
    STORAGE_KEY_USER: 'edushare_user_session',
    STORAGE_KEY_THEME: 'edushare_theme_mode',
    STORAGE_KEY_STYLE: 'edushare_theme_style'
};

const state = {
    currentUser: null, // Null = Khách chưa đăng nhập
    documents: [],
    filteredDocuments: [],
    savedDocumentIds: new Set(),
    groups: [],
    activeGroupId: "group-1",
    filters: {
        school: 'MTU', faculty: 'ALL', major: 'ALL', academicYear: 'ALL',
        className: 'ALL', subject: 'ALL', category: 'ALL', searchQuery: ''
    },
    otpTimer: null,
    otpSecondsRemaining: 0,
    activeTab: 'feed',
    userStatus: 'ONLINE'
};

// Loại bỏ dấu tiếng Việt hỗ trợ tìm kiếm linh hoạt không dấu (Fuzzy Search)
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
    loadSavedThemeAndStyle();
    loadUserSession();
    bindAllEvents();
    fetchDocuments();
    fetchGroups();
}

function loadSavedThemeAndStyle() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEY_THEME) || 'light';
    const savedStyle = localStorage.getItem(CONFIG.STORAGE_KEY_STYLE) || 'academic';

    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.setAttribute('data-style', savedStyle);

    const darkModeSwitch = document.getElementById('darkModeSwitch');
    if (darkModeSwitch) darkModeSwitch.checked = (savedTheme === 'dark');
}

function saveThemeSettings(themeMode, themeStyle) {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.setAttribute('data-style', themeStyle);
    localStorage.setItem(CONFIG.STORAGE_KEY_THEME, themeMode);
    localStorage.setItem(CONFIG.STORAGE_KEY_STYLE, themeStyle);
    showToast('Đã lưu tùy chọn giao diện thành công!', 'success');
}

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

function bindAllEvents() {
    // 1. NHẤP LOGO EDUSHARE QUAY VỀ TRANG CHỦ
    const brandLogoLink = document.getElementById('brandLogoLink');
    if (brandLogoLink) {
        brandLogoLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('feed');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const btnHeaderHome = document.getElementById('btnHeaderHome');
    if (btnHeaderHome) btnHeaderHome.addEventListener('click', () => {
        switchTab('feed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const navLinkDocs = document.getElementById('navLinkDocs');
    if (navLinkDocs) navLinkDocs.addEventListener('click', (e) => { e.preventDefault(); switchTab('feed'); });

    const navLinkCommunity = document.getElementById('navLinkCommunity');
    if (navLinkCommunity) navLinkCommunity.addEventListener('click', (e) => { e.preventDefault(); switchTab('groups'); });

    // Modals
    const authModal = document.getElementById('authModal');
    const btnHeaderLogin = document.getElementById('btnHeaderLogin');
    const btnHeaderRegister = document.getElementById('btnHeaderRegister');
    const btnCloseAuth = document.getElementById('btnCloseAuth');

    if (btnHeaderLogin) btnHeaderLogin.addEventListener('click', () => openAuthModal('login'));
    if (btnHeaderRegister) btnHeaderRegister.addEventListener('click', () => openAuthModal('register'));
    if (btnCloseAuth) btnCloseAuth.addEventListener('click', () => closeModal(authModal));

    const uploadModal = document.getElementById('uploadModal');
    const btnHeroUpload = document.getElementById('btnHeroUpload');
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

    const documentViewModal = document.getElementById('documentViewModal');
    const btnCloseViewDoc = document.getElementById('btnCloseViewDoc');
    if (btnCloseViewDoc) btnCloseViewDoc.addEventListener('click', () => closeModal(documentViewModal));

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', () => clearUserSession());

    // Switch tabs buttons
    document.getElementById('btnTabFeedAll')?.addEventListener('click', () => switchTab('feed'));
    document.getElementById('btnTabSavedFast')?.addEventListener('click', () => switchTab('saved'));

    // Search bar input filter (Fuzzy search)
    const headerSearchInput = document.getElementById('headerSearchInput');
    const searchFileInput = document.getElementById('searchFileInput');

    if (headerSearchInput) {
        headerSearchInput.addEventListener('input', (e) => {
            if (searchFileInput) searchFileInput.value = e.target.value;
            state.filters.searchQuery = e.target.value;
            applyFiltersAndRender();
        });
    }

    if (searchFileInput) {
        searchFileInput.addEventListener('input', (e) => {
            if (headerSearchInput) headerSearchInput.value = e.target.value;
            state.filters.searchQuery = e.target.value;
            applyFiltersAndRender();
        });
    }

    // 6-level Filter dropdowns
    ['filterSchool', 'filterFaculty', 'filterMajor', 'filterYear', 'filterClass', 'filterSubject'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', handleFilterChange);
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', resetFilters);

    // Categories
    const categoryGroup = document.getElementById('categoryFilterGroup');
    if (categoryGroup) {
        categoryGroup.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                categoryGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.filters.category = btn.getAttribute('data-category') || 'ALL';
                applyFiltersAndRender();
            });
        });
    }

    // Form Submits
    document.getElementById('loginForm')?.addEventListener('submit', handleLoginSubmit);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegisterSubmit);
    document.getElementById('uploadForm')?.addEventListener('submit', handleDocumentUpload);
    document.getElementById('createGroupForm')?.addEventListener('submit', handleCreateGroupSubmit);
    document.getElementById('btnSendAiPrompt')?.addEventListener('click', handleAiChatSubmit);
    document.getElementById('btnSaveProfileSettings')?.addEventListener('click', handleSaveProfileSettings);

    // Form gửi tin nhắn Chat nhóm
    document.getElementById('chatSendForm')?.addEventListener('submit', handleSendGroupMessage);

    // Chống copy chép đối với Khách chưa đăng nhập
    document.addEventListener('copy', (e) => {
        if (!state.currentUser) {
            e.preventDefault();
            showToast('Khách chưa đăng nhập! Không thể sao chép văn bản bài viết.', 'error');
        }
    });
}

function openAuthModal(mode = 'login') {
    const authModal = document.getElementById('authModal');
    const loginTabBtn = document.getElementById('login-tab');
    const registerTabBtn = document.getElementById('register-tab');
    const pillsLogin = document.getElementById('pills-login');
    const pillsRegister = document.getElementById('pills-register');

    if (mode === 'login') {
        loginTabBtn?.classList.add('active');
        registerTabBtn?.classList.remove('active');
        pillsLogin?.classList.add('show', 'active');
        pillsRegister?.classList.remove('show', 'active');
    } else {
        registerTabBtn?.classList.add('active');
        loginTabBtn?.classList.remove('active');
        pillsRegister?.classList.add('show', 'active');
        pillsLogin?.classList.remove('show', 'active');
    }

    openModal(authModal);
}

// XÁC THỰC PHÂN QUYỀN (RBAC MATRIX PERMISSION)
function checkPermission(action, docOwnerRole = 'STUDENT', docOwnerId = '') {
    const user = state.currentUser;

    if (action === 'DOWNLOAD') {
        if (!user) {
            showToast('Khách chỉ được xem tài liệu, không thể tải về! Vui lòng đăng nhập.', 'warning');
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
        if (!user) {
            showToast('Vui lòng đăng nhập để thực hiện thao tác này!', 'warning');
            openAuthModal('login');
            return false;
        }
        if (user.role === 'ADMIN') return true;
        if (user.id !== docOwnerId) {
            showToast('Bạn chỉ được phép chỉnh sửa hoặc xóa bài viết do chính mình đăng!', 'error');
            return false;
        }
        return true;
    }

    return true;
}

// FETCH VÀ RENDER DỮ LIỆU TÀI LIỆU
async function fetchDocuments() {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/documents`);
        const result = await res.json();
        if (result.success) state.documents = result.data || [];
        applyFiltersAndRender();
    } catch (e) {
        state.documents = getSampleDocuments();
        applyFiltersAndRender();
    }
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
        const qNorm = removeVietnameseTones(state.filters.searchQuery);
        const keywords = qNorm.split(' ').filter(k => k);
        docs = docs.filter(d => {
            const titleNorm = removeVietnameseTones(d.title);
            const descNorm = removeVietnameseTones(d.description);
            const subjectNorm = removeVietnameseTones(d.subject);
            const authorNorm = removeVietnameseTones(d.authorName);
            const fullText = `${titleNorm} ${descNorm} ${subjectNorm} ${authorNorm}`;
            return keywords.some(kw => fullText.includes(kw));
        });
    }

    state.filteredDocuments = docs;
    renderDocumentCards(docs);
}

// RENDER THẺ TÀI LIỆU (BỔ SUNG NÚT XEM VÀ TẢI VỀ THEO HÌNH 2)
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
                        <span class="badge bg-secondary-subtle text-body border">${escapeHtml(doc.className || 'MTU')}</span>
                    </div>
                    <h5 class="card-title fw-bold mb-2">${escapeHtml(doc.title)}</h5>
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
                                <button class="btn btn-outline-secondary" onclick="toggleSaveDocument(${doc.id})" title="Lưu mục yêu thích cá nhân">
                                    <i class="bi ${state.savedDocumentIds.has(doc.id) ? 'bi-bookmark-fill text-warning' : 'bi-bookmark'}"></i>
                                </button>
                            </div>
                            <div>
                                <!-- NÚT XEM TÀI LIỆU -->
                                <button class="btn btn-sm btn-outline-primary fw-semibold me-1" onclick="handleViewDocument(${doc.id})">
                                    <i class="bi bi-eye me-1"></i> Xem
                                </button>
                                <!-- NÚT TẢI VỀ -->
                                <button class="btn btn-sm btn-primary fw-semibold" onclick="handleDownloadClick(${doc.id}, '${doc.category}')">
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

// XỬ LÝ XEM TÀI LIỆU (KHÁCH CÓ THỂ XEM, NHƯNG BỊ BẢO VỆ CHỐNG COPY)
function handleViewDocument(docId) {
    const doc = state.documents.find(d => d.id === docId);
    if (!doc) return;

    document.getElementById('viewDocTitle').textContent = doc.title;
    document.getElementById('viewDocSubject').textContent = `Môn học: ${doc.subject}`;
    document.getElementById('viewDocDesc').textContent = doc.description;
    document.getElementById('viewDocAuthor').textContent = doc.authorName;

    const previewContainer = document.getElementById('docPreviewContainer');
    if (!state.currentUser) {
        previewContainer.classList.add('unselectable');
        previewContainer.innerHTML = `
            <div class="alert alert-warning small mb-3"><i class="bi bi-shield-lock me-1"></i>Bạn đang xem với tư cách Khách. Không thể sao chép văn bản hoặc tải về tệp gốc.</div>
            <div class="p-3 bg-light rounded">${escapeHtml(doc.description)}</div>
        `;
    } else {
        previewContainer.classList.remove('unselectable');
        previewContainer.innerHTML = `
            <div class="p-3 bg-light rounded">${escapeHtml(doc.description)}</div>
        `;
    }

    openModal(document.getElementById('documentViewModal'));
}

// XỬ LÝ TẢI VỀ VÀ PHÂN QUYỀN VAI TRÒ
function handleDownloadClick(docId, category) {
    if (!checkPermission('DOWNLOAD')) return;

    // Sinh viên không được tải Bài báo khoa học (ARTICLE)
    if (state.currentUser.role === 'STUDENT' && category === 'ARTICLE') {
        showToast('Sinh viên chỉ có quyền xem bài báo khoa học, không được phép tải về!', 'warning');
        return;
    }

    showToast('Tải tệp thành công!', 'success');
}

function handleDeleteDocument(docId, docOwnerRole, docOwnerId) {
    if (!checkPermission('DELETE', docOwnerRole, docOwnerId)) return;

    state.documents = state.documents.filter(d => d.id !== docId);
    applyFiltersAndRender();
    showToast('Đã xóa Tệp tin!', 'success');
}

// RENDER DANH SÁCH NHÓM & TỰ ĐỘNG CHUYỂN SANG KHUNG CHAT (HÌNH 1)
async function fetchGroups() {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/groups`);
        const result = await res.json();
        if (result.success) state.groups = result.data || [];
        renderGroupLists();
    } catch (e) {
        state.groups = [
            { id: "group-1", name: "KTPM K24 MTU", membersCount: 128, status: "JOINED", desc: "Nhóm học thuật thảo luận bài tập & đề thi MTU." },
            { id: "group-2", name: "Nghiên cứu CNTT MTU", membersCount: 45, status: "PENDING", desc: "Cộng đồng nghiên cứu phát triển học thuật." },
            { id: "group-3", name: "Đồ án Tốt nghiệp KTPM 2026", membersCount: 32, status: "SUGGESTED", desc: "Nhóm trao đổi kinh nghiệm làm đồ án tốt nghiệp." }
        ];
        renderGroupLists();
    }
}

function renderGroupLists() {
    const joinedList = document.getElementById('joinedGroupsList');
    const pendingList = document.getElementById('pendingGroupsList');
    const suggestedList = document.getElementById('suggestedGroupsList');

    const joined = state.groups.filter(g => g.status === 'JOINED');
    const pending = state.groups.filter(g => g.status === 'PENDING');
    const suggested = state.groups.filter(g => g.status === 'SUGGESTED');

    if (joinedList) {
        joinedList.innerHTML = joined.map(g => `
            <div class="list-group-item d-flex justify-content-between align-items-center cursor-pointer p-2 mb-1 rounded border" onclick="openGroupChat('${g.id}', '${escapeHtml(g.name)}', ${g.membersCount})">
                <div><strong>${escapeHtml(g.name)}</strong><br><small class="text-muted">${g.membersCount} thành viên</small></div>
                <button class="btn btn-sm btn-primary rounded-pill px-3 fw-bold">Trò chuyện</button>
            </div>
        `).join('');
    }

    if (pendingList) {
        pendingList.innerHTML = pending.map(g => `
            <div class="list-group-item d-flex justify-content-between align-items-center p-2 mb-1 rounded border">
                <div><strong>${escapeHtml(g.name)}</strong><br><small class="text-warning">Đang chờ quản trị viên duyệt</small></div>
            </div>
        `).join('');
    }

    if (suggestedList) {
        suggestedList.innerHTML = suggested.map(g => `
            <div class="list-group-item d-flex justify-content-between align-items-center p-2 mb-1 rounded border">
                <div><strong>${escapeHtml(g.name)}</strong><br><small class="text-muted">${g.membersCount} thành viên</small></div>
                <button class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold" onclick="handleJoinGroup('${g.id}', '${escapeHtml(g.name)}')">Tham gia</button>
            </div>
        `).join('');
    }
}

// THAM GIA HOẶC TẠO NHÓM -> TỰ ĐỘNG CHUYỂN SANG KHUNG CHAT
function handleJoinGroup(groupId, groupName) {
    const g = state.groups.find(x => x.id === groupId);
    if (g) g.status = 'JOINED';
    renderGroupLists();
    showToast(`Đã tham gia nhóm ${groupName}!`, 'success');
    openGroupChat(groupId, groupName, g ? g.membersCount : 50);
}

function openGroupChat(groupId, groupName, membersCount) {
    state.activeGroupId = groupId;
    switchTab('groups');

    document.getElementById('chatGroupName').textContent = groupName;
    document.getElementById('chatGroupMembers').textContent = `${membersCount} Thành viên`;

    fetchGroupMessages(groupId);
}

async function fetchGroupMessages(groupId) {
    const chatBox = document.getElementById('chatMessagesBox');
    if (!chatBox) return;

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/groups/${groupId}/messages`);
        const result = await res.json();
        const msgs = result.data || [];

        chatBox.innerHTML = msgs.map(m => `
            <div class="mb-2 p-2 bg-white rounded border">
                <small class="fw-bold text-primary">${escapeHtml(m.sender)}</small> <small class="text-muted">(${m.time || ''})</small>
                <div>${escapeHtml(m.text)}</div>
            </div>
        `).join('');
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) {
        chatBox.innerHTML = `<div class="text-center text-muted small my-2">-- Kết nối phòng trò chuyện nhóm ${state.activeGroupId} --</div>`;
    }
}

async function handleSendGroupMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chatInputText');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    const senderName = state.currentUser ? state.currentUser.fullName : "Sinh viên MTU";

    try {
        await fetch(`${CONFIG.API_BASE_URL}/groups/${state.activeGroupId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: senderName, text })
        });
    } catch (e) {}

    const chatBox = document.getElementById('chatMessagesBox');
    if (chatBox) {
        const div = document.createElement('div');
        div.className = 'mb-2 p-2 bg-white rounded border';
        div.innerHTML = `<small class="fw-bold text-primary">${escapeHtml(senderName)}</small> <div>${escapeHtml(text)}</div>`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    input.value = '';
}

// XỬ LÝ AUTHENTICATION (SỬA LỖI ĐĂNG KÝ VAI TRÒ)
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

    // Lấy chính xác vai trò từ Select (STUDENT | TEACHER | ADMIN)
    const assignedRole = data.role || 'STUDENT';

    const newUser = {
        id: 'user-' + Date.now(),
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: assignedRole,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=4f46e5&color=fff`
    };

    saveUserSession(newUser);
    closeModal(document.getElementById('authModal'));
    showToast(`Đăng ký thành công tài khoản ${formatRoleLabel(assignedRole)}!`, 'success');
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const identity = formData.get('identity');

    const user = {
        id: 'user-1',
        fullName: 'Nguyễn Chí Vỹ',
        email: identity.includes('@') ? identity : 'nguyenchivy@mtu.edu.vn',
        phone: '0862204069',
        role: 'STUDENT',
        avatar: 'https://ui-avatars.com/api/?name=Nguyen+Chi+Vy&background=4f46e5&color=fff'
    };

    saveUserSession(user);
    closeModal(document.getElementById('authModal'));
    showToast('Đã đăng nhập thành công!', 'success');
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
        description: formData.get('description') || 'Học liệu tải lên mới.',
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

async function handleCreateGroupSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('groupName');
    const desc = formData.get('groupDesc');

    if (!name) {
        showToast('Tạo nhóm thất bại, vui lòng thử lại!', 'error');
        return;
    }

    const newGroup = {
        id: 'group-' + Date.now(),
        name: name,
        membersCount: 1,
        status: 'JOINED',
        desc: desc || 'Nhóm học thuật vừa tạo.'
    };

    state.groups.unshift(newGroup);
    renderGroupLists();
    e.target.reset();
    showToast('Đã tạo nhóm thành công!', 'success');
    openGroupChat(newGroup.id, newGroup.name, 1);
}

async function handleAiChatSubmit() {
    const input = document.getElementById('aiPromptInput');
    const prompt = input ? input.value.trim() : '';
    if (!prompt) return;

    appendAiMsg('user', prompt);
    input.value = '';

    appendAiMsg('ai', '<i class="bi bi-three-dots"></i> Trợ lý AI đang tìm kiếm...');

    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        const result = await res.json();
        const container = document.getElementById('aiMessageContainer');
        if (container && container.lastElementChild) container.removeChild(container.lastElementChild);

        appendAiMsg('ai', result.reply || `Đã ghi nhận yêu cầu của bạn.`);
    } catch (e) {
        appendAiMsg('ai', `Phân tích yêu cầu "${escapeHtml(prompt)}". Bạn có thể tìm đề thi Hệ Điều Hành trên hệ thống EduShare MTU.`);
    }
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

function handleFilterChange() {
    state.filters.school = document.getElementById('filterSchool')?.value || 'MTU';
    state.filters.faculty = document.getElementById('filterFaculty')?.value || 'ALL';
    state.filters.major = document.getElementById('filterMajor')?.value || 'ALL';
    state.filters.academicYear = document.getElementById('filterYear')?.value || 'ALL';
    state.filters.className = document.getElementById('filterClass')?.value || 'ALL';
    state.filters.subject = document.getElementById('filterSubject')?.value || 'ALL';
    applyFiltersAndRender();
}

function resetFilters() {
    ['filterSchool', 'filterFaculty', 'filterMajor', 'filterYear', 'filterClass', 'filterSubject'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = id === 'filterSchool' ? 'MTU' : 'ALL';
    });
    const headerSearchInput = document.getElementById('headerSearchInput');
    if (headerSearchInput) headerSearchInput.value = '';

    const searchFileInput = document.getElementById('searchFileInput');
    if (searchFileInput) searchFileInput.value = '';

    state.filters = {
        school: 'MTU', faculty: 'ALL', major: 'ALL', academicYear: 'ALL',
        className: 'ALL', subject: 'ALL', category: 'ALL', searchQuery: ''
    };
    applyFiltersAndRender();
    showToast('Đã đặt lại bộ lọc!', 'info');
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
        showToast('Đã xóa khỏi Mục Yêu thích', 'info');
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

function updateUserUI() {
    const authBox = document.getElementById('userAuthContainer');
    const profileWidget = document.getElementById('userProfileWidget');
    const userName = document.getElementById('userProfileName');
    const userRole = document.getElementById('userProfileRole');
    const userAvatar = document.getElementById('userProfileAvatar');

    if (state.currentUser) {
        authBox?.classList.add('d-none');
        if (profileWidget) {
            profileWidget.classList.remove('d-none');
            profileWidget.classList.add('d-flex');
        }
        if (userName) userName.textContent = state.currentUser.fullName;
        if (userRole) userRole.textContent = `${formatRoleLabel(state.currentUser.role)} • MTU`;
        if (userAvatar && state.currentUser.avatar) userAvatar.src = state.currentUser.avatar;
    } else {
        authBox?.classList.remove('d-none');
        profileWidget?.classList.add('d-none');
    }
}

function formatRoleLabel(role) {
    const map = { 'STUDENT': 'Học sinh / Sinh viên', 'TEACHER': 'Giảng viên', 'ADMIN': 'Quản trị viên (Admin)' };
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
            title: "Bài tập mẫu Phân tích & Thiết kế Hệ thống UML với SAP PowerDesigner",
            category: "EXERCISE",
            subject: "Cơ sở dữ liệu",
            school: "MTU",
            faculty: "KTPM",
            major: "SE",
            academicYear: "K2024",
            className: "DHKTPM24",
            description: "Tổng hợp Use Case, Sequence Diagram và Class Diagram dự án Quản lý Thư viện Học liệu số.",
            authorName: "Nguyễn Chí Vỹ",
            authorRole: "STUDENT",
            likes: 89,
            views: 856
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
            authorName: "Giảng viên MTU",
            authorRole: "TEACHER",
            likes: 62,
            views: 1120
        }
    ];
}