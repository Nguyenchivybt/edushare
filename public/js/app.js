/**
 * EduShare - Kho Tài Liệu Tri Thức | Thư Viện Học Liệu MTU
 * Frontend Client Application JavaScript (app.js)
 * Tác giả phát triển: Nguyễn Chí Vỹ
 * Đơn vị đồng hành: Trường Đại học Xây dựng Miền Tây (MTU)
 */

// ==========================================
// 1. GLOBAL STATE & CONFIGURATION
// ==========================================
const CONFIG = {
    API_BASE_URL: window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api',
    ALLOWED_EMAIL_DOMAIN: '@muce.edu.vn',
    MAX_FILE_SIZE_MB: 100,
    OTP_COUNTDOWN_SECONDS: 60
};

const state = {
    currentUser: {
        id: "user-1",
        fullName: "Nguyễn Chí Vỹ",
        email: "vy.nguyen@muce.edu.vn",
        role: "STUDENT",
        school: "Trường Đại học Xây dựng Miền Tây",
        faculty: "Khoa Kỹ thuật Phần mềm",
        major: "Kỹ thuật Phần mềm",
        academicYear: "K2024",
        className: "DHKTPM24",
        avatarUrl: "https://ui-avatars.com/api/?name=Nguyen+Chi+Vy&background=4f46e5&color=fff"
    },
    documents: [],
    filteredDocuments: [],
    savedDocumentIds: new Set(),
    groups: [],
    filters: {
        school: 'ALL',
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
    activeTab: 'feed'
};

// ==========================================
// 2. DOM ELEMENTS SELECTION
// ==========================================
const DOM = {
    // Navigation & Tabs
    navLinks: document.querySelectorAll('.nav-link'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Document Feed & Filters
    docContainer: document.getElementById('documentContainer'),
    searchFileInput: document.getElementById('searchFileInput'),
    filterSchool: document.getElementById('filterSchool'),
    filterFaculty: document.getElementById('filterFaculty'),
    filterMajor: document.getElementById('filterMajor'),
    filterYear: document.getElementById('filterYear'),
    filterClass: document.getElementById('filterClass'),
    filterSubject: document.getElementById('filterSubject'),
    filterCategory: document.getElementById('filterCategory'),
    btnResetFilters: document.getElementById('btnResetFilters'),

    // Modals
    uploadModal: document.getElementById('uploadModal'),
    btnOpenUpload: document.getElementById('btnOpenUpload'),
    btnCloseUpload: document.getElementById('btnCloseUpload'),
    uploadForm: document.getElementById('uploadForm'),

    authModal: document.getElementById('authModal'),
    btnLoginRegister: document.getElementById('btnLoginRegister'),
    btnCloseAuth: document.getElementById('btnCloseAuth'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),

    forgotPasswordModal: document.getElementById('forgotPasswordModal'),
    btnForgotPassword: document.getElementById('btnForgotPassword'),
    forgotForm: document.getElementById('forgotForm'),
    btnRequestOtp: document.getElementById('btnRequestOtp'),
    otpCountdownSpan: document.getElementById('otpCountdown'),

    // AI Assistant
    aiChatModal: document.getElementById('aiChatModal'),
    btnOpenAi: document.getElementById('btnOpenAi'),
    aiMessageContainer: document.getElementById('aiMessageContainer'),
    aiPromptInput: document.getElementById('aiPromptInput'),
    aiFileInput: document.getElementById('aiFileInput'),
    btnSendAiPrompt: document.getElementById('btnSendAiPrompt'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
};

// ==========================================
// 3. INITIALIZATION & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    console.log("EduShare Frontend Application Initialized...");
    bindEventListeners();
    fetchDocuments();
    fetchGroups();
    updateUserProfileUI();
}

function bindEventListeners() {
    // Navigation Tabs
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = link.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Filters Event Listeners
    [DOM.filterSchool, DOM.filterFaculty, DOM.filterMajor, DOM.filterYear, DOM.filterClass, DOM.filterSubject, DOM.filterCategory].forEach(select => {
        if (select) select.addEventListener('change', handleFilterChange);
    });

    if (DOM.searchFileInput) {
        DOM.searchFileInput.addEventListener('input', debounce(handleFilterChange, 300));
    }

    if (DOM.btnResetFilters) {
        DOM.btnResetFilters.addEventListener('click', resetFilters);
    }

    // Modal Control Events
    if (DOM.btnOpenUpload) DOM.btnOpenUpload.addEventListener('click', () => openModal(DOM.uploadModal));
    if (DOM.btnCloseUpload) DOM.btnCloseUpload.addEventListener('click', () => closeModal(DOM.uploadModal));

    if (DOM.btnLoginRegister) DOM.btnLoginRegister.addEventListener('click', () => openModal(DOM.authModal));
    if (DOM.btnCloseAuth) DOM.btnCloseAuth.addEventListener('click', () => closeModal(DOM.authModal));

    if (DOM.btnOpenAi) DOM.btnOpenAi.addEventListener('click', () => openModal(DOM.aiChatModal));

    // Form Submissions
    if (DOM.uploadForm) DOM.uploadForm.addEventListener('submit', handleDocumentUpload);
    if (DOM.registerForm) DOM.registerForm.addEventListener('submit', handleRegisterSubmit);
    if (DOM.loginForm) DOM.loginForm.addEventListener('submit', handleLoginSubmit);
    if (DOM.btnRequestOtp) DOM.btnRequestOtp.addEventListener('click', handleRequestOtp);
    if (DOM.forgotForm) DOM.forgotForm.addEventListener('submit', handleVerifyOtpAndReset);
    if (DOM.btnSendAiPrompt) DOM.btnSendAiPrompt.addEventListener('click', handleAiChatSubmit);
}

// ==========================================
// 4. API CALLS & DATA FETCHING
// ==========================================
async function fetchDocuments() {
    try {
        showLoadingSpinner(DOM.docContainer);
        const queryParams = new URLSearchParams(state.filters).toString();
        const response = await fetch(`${CONFIG.API_BASE_URL}/documents?${queryParams}`);
        const result = await response.json();

        if (result.success) {
            state.documents = result.data || [];
            applyFiltersAndRender();
        } else {
            showToast('Không thể tải danh sách tài liệu!', 'error');
        }
    } catch (error) {
        console.error('Lỗi kết nối Server:', error);
        showToast('Lỗi kết nối đến máy chủ Backend', 'error');
    }
}

async function fetchGroups() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/groups`);
        const result = await response.json();
        if (result.success) {
            state.groups = result.data || [];
            renderGroupsList();
        }
    } catch (error) {
        console.warn('Lỗi lấy danh sách nhóm:', error);
    }
}

// ==========================================
// 5. RENDERING & UI UPDATES
// ==========================================
function applyFiltersAndRender() {
    let docs = [...state.documents];

    // Lọc phễu 6 cấp
    if (state.filters.school !== 'ALL') docs = docs.filter(d => d.school === state.filters.school);
    if (state.filters.faculty !== 'ALL') docs = docs.filter(d => d.faculty === state.filters.faculty);
    if (state.filters.major !== 'ALL') docs = docs.filter(d => d.major === state.filters.major);
    if (state.filters.academicYear !== 'ALL') docs = docs.filter(d => d.academicYear === state.filters.academicYear);
    if (state.filters.className !== 'ALL') docs = docs.filter(d => d.className === state.filters.className);
    if (state.filters.subject !== 'ALL') docs = docs.filter(d => d.subject === state.filters.subject);
    if (state.filters.category !== 'ALL') docs = docs.filter(d => d.category === state.filters.category);

    // Tìm kiếm từ khóa
    if (state.filters.searchQuery) {
        const query = state.filters.searchQuery.toLowerCase();
        docs = docs.filter(d => 
            d.title.toLowerCase().includes(query) || 
            (d.description && d.description.toLowerCase().includes(query)) ||
            (d.authorName && d.authorName.toLowerCase().includes(query))
        );
    }

    state.filteredDocuments = docs;
    renderDocumentCards(docs);
}

function renderDocumentCards(docs) {
    if (!DOM.docContainer) return;

    if (docs.length === 0) {
        DOM.docContainer.innerHTML = `
            <div class="empty-state text-center p-5">
                <i class="bi bi-folder-x fs-1 text-muted"></i>
                <p class="mt-3 text-secondary">Không tìm thấy tài liệu phù hợp với bộ lọc!</p>
            </div>
        `;
        return;
    }

    DOM.docContainer.innerHTML = docs.map(doc => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 document-card shadow-sm border-0 rounded-3">
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-primary-subtle text-primary fw-semibold">${formatCategoryLabel(doc.category)}</span>
                        <span class="badge bg-light text-dark border">${doc.className || 'Chung'}</span>
                    </div>
                    <h5 class="card-title fw-bold text-dark mb-2 text-truncate-2">${escapeHtml(doc.title)}</h5>
                    <p class="card-text text-muted small text-truncate-3 mb-3">${escapeHtml(doc.description || 'Chưa có mô tả.')}</p>
                    
                    <div class="mt-auto">
                        <div class="d-flex align-items-center text-secondary small mb-3">
                            <i class="bi bi-person-circle me-1"></i>
                            <span class="me-3">${escapeHtml(doc.authorName || 'Tác giả')}</span>
                            <i class="bi bi-eye me-1"></i>
                            <span>${doc.views || 0} lượt xem</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center border-top pt-2">
                            <button class="btn btn-sm btn-outline-danger btn-like ${doc.likedBy && doc.likedBy.includes(state.currentUser.id) ? 'active' : ''}" onclick="toggleLikeDocument(${doc.id})">
                                <i class="bi bi-heart-fill me-1"></i> <span id="like-count-${doc.id}">${doc.likes || 0}</span>
                            </button>
                            <div>
                                <button class="btn btn-sm btn-outline-secondary me-1" onclick="toggleSaveDocument(${doc.id})">
                                    <i class="bi ${state.savedDocumentIds.has(doc.id) ? 'bi-bookmark-fill text-warning' : 'bi-bookmark'}"></i>
                                </button>
                                <a href="${doc.fileUrl || '#'}" target="_blank" class="btn btn-sm btn-primary">
                                    <i class="bi bi-download me-1"></i> Tải về
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderGroupsList() {
    const groupContainer = document.getElementById('groupsContainer');
    if (!groupContainer) return;

    groupContainer.innerHTML = state.groups.map(g => `
        <div class="list-group-item d-flex justify-content-between align-items-center p-3 mb-2 rounded border">
            <div>
                <h6 class="mb-1 fw-bold">${escapeHtml(g.name)}</h6>
                <small class="text-muted"><i class="bi bi-people me-1"></i> ${g.membersCount} Thành viên</small>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="joinGroup('${g.id}')">Tham gia</button>
        </div>
    `).join('');
}

// ==========================================
// 6. ACTION HANDLERS (LIKE, SAVE, FILTERS)
// ==========================================
async function toggleLikeDocument(docId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/documents/${docId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.currentUser.id })
        });
        const result = await response.json();

        if (result.success) {
            const doc = state.documents.find(d => d.id === docId);
            if (doc) {
                doc.likes = result.likes;
                const index = doc.likedBy.indexOf(state.currentUser.id);
                if (result.isLiked && index === -1) doc.likedBy.push(state.currentUser.id);
                else if (!result.isLiked && index !== -1) doc.likedBy.splice(index, 1);
            }
            applyFiltersAndRender();
        }
    } catch (error) {
        showToast('Không thể cập nhật lượt thích!', 'error');
    }
}

function toggleSaveDocument(docId) {
    if (state.savedDocumentIds.has(docId)) {
        state.savedDocumentIds.delete(docId);
        showToast('Đã xóa khỏi danh sách đã lưu', 'info');
    } else {
        state.savedDocumentIds.add(docId);
        showToast('Đã lưu tài liệu thành công!', 'success');
    }
    applyFiltersAndRender();
}

function handleFilterChange() {
    state.filters.school = DOM.filterSchool ? DOM.filterSchool.value : 'ALL';
    state.filters.faculty = DOM.filterFaculty ? DOM.filterFaculty.value : 'ALL';
    state.filters.major = DOM.filterMajor ? DOM.filterMajor.value : 'ALL';
    state.filters.academicYear = DOM.filterYear ? DOM.filterYear.value : 'ALL';
    state.filters.className = DOM.filterClass ? DOM.filterClass.value : 'ALL';
    state.filters.subject = DOM.filterSubject ? DOM.filterSubject.value : 'ALL';
    state.filters.category = DOM.filterCategory ? DOM.filterCategory.value : 'ALL';
    state.filters.searchQuery = DOM.searchFileInput ? DOM.searchFileInput.value.trim() : '';

    applyFiltersAndRender();
}

function resetFilters() {
    [DOM.filterSchool, DOM.filterFaculty, DOM.filterMajor, DOM.filterYear, DOM.filterClass, DOM.filterSubject, DOM.filterCategory].forEach(select => {
        if (select) select.value = 'ALL';
    });
    if (DOM.searchFileInput) DOM.searchFileInput.value = '';

    state.filters = {
        school: 'ALL', faculty: 'ALL', major: 'ALL', academicYear: 'ALL',
        className: 'ALL', subject: 'ALL', category: 'ALL', searchQuery: ''
    };
    applyFiltersAndRender();
    showToast('Đã đặt lại bộ lọc', 'info');
}

// ==========================================
// 7. FORM SUBMISSIONS (UPLOAD, AUTH, OTP)
// ==========================================
async function handleDocumentUpload(e) {
    e.preventDefault();
    const formData = new FormData(DOM.uploadForm);
    formData.append('authorId', state.currentUser.id);
    formData.append('authorName', state.currentUser.fullName);

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/documents`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.success) {
            showToast('Tải học liệu lên thành công!', 'success');
            closeModal(DOM.uploadModal);
            DOM.uploadForm.reset();
            fetchDocuments();
        } else {
            showToast(result.message || 'Tải học liệu thất bại!', 'error');
        }
    } catch (error) {
        showToast('Lỗi khi đăng tải học liệu!', 'error');
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const formData = new FormData(DOM.registerForm);
    const data = Object.fromEntries(formData.entries());

    // Validation 1: Email Trường @muce.edu.vn
    if (!data.email || !data.email.toLowerCase().endsWith(CONFIG.ALLOWED_EMAIL_DOMAIN)) {
        showToast(`Email đăng ký phải có đuôi trường ${CONFIG.ALLOWED_EMAIL_DOMAIN}`, 'warning');
        return;
    }

    // Validation 2: Mật khẩu xác nhận
    if (data.password !== data.confirmPassword) {
        showToast('Mật khẩu xác nhận không trùng khớp!', 'error');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            showToast('Đăng ký tài khoản thành công! Vui lòng đăng nhập.', 'success');
            DOM.registerForm.reset();
            closeModal(DOM.authModal);
        } else {
            showToast(result.message || 'Đăng ký thất bại!', 'error');
        }
    } catch (error) {
        showToast('Không thể kết nối đến máy chủ xác thực!', 'error');
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const formData = new FormData(DOM.loginForm);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            state.currentUser = result.user;
            updateUserProfileUI();
            showToast(`Chào mừng ${result.user.fullName} trở lại!`, 'success');
            closeModal(DOM.authModal);
        } else {
            showToast('Đăng nhập thất bại. Vui lòng thử lại!', 'error');
        }
    } catch (error) {
        showToast('Lỗi đăng nhập hệ thống!', 'error');
    }
}

// 7.1 Luồng Quên Mật Khẩu với Đếm ngược OTP 60s
async function handleRequestOtp() {
    const identityInput = document.getElementById('forgotIdentity');
    const identity = identityInput ? identityInput.value.trim() : '';

    if (!identity) {
        showToast('Sai cú pháp hoặc thông tin không tồn tại', 'warning');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/forgot-password/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity })
        });
        const result = await response.json();

        if (result.success) {
            showToast(`Mã OTP đã được gửi! (Demo OTP: ${result.otpDemo})`, 'success');
            startOtpCountdown(CONFIG.OTP_COUNTDOWN_SECONDS);
        } else {
            showToast(result.message || 'Sai cú pháp hoặc thông tin không tồn tại', 'error');
        }
    } catch (error) {
        showToast('Lỗi gửi mã OTP!', 'error');
    }
}

function startOtpCountdown(seconds) {
    state.otpSecondsRemaining = seconds;
    if (DOM.btnRequestOtp) DOM.btnRequestOtp.disabled = true;

    clearInterval(state.otpTimer);
    state.otpTimer = setInterval(() => {
        state.otpSecondsRemaining--;
        if (DOM.otpCountdownSpan) {
            DOM.otpCountdownSpan.textContent = `(${state.otpSecondsRemaining}s)`;
        }

        if (state.otpSecondsRemaining <= 0) {
            clearInterval(state.otpTimer);
            if (DOM.btnRequestOtp) DOM.btnRequestOtp.disabled = false;
            if (DOM.otpCountdownSpan) DOM.otpCountdownSpan.textContent = '';
        }
    }, 1000);
}

async function handleVerifyOtpAndReset(e) {
    e.preventDefault();
    const formData = new FormData(DOM.forgotForm);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/forgot-password/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            showToast('Đổi mật khẩu thành công! Vui lòng đăng nhập.', 'success');
            closeModal(DOM.forgotPasswordModal);
            DOM.forgotForm.reset();
        } else {
            showToast(result.message || 'Xác thực OTP thất bại!', 'error');
        }
    } catch (error) {
        showToast('Lỗi cập nhật mật khẩu!', 'error');
    }
}

// ==========================================
// 8. GEMINI AI ASSISTANT CHAT
// ==========================================
async function handleAiChatSubmit() {
    const prompt = DOM.aiPromptInput ? DOM.aiPromptInput.value.trim() : '';
    const file = DOM.aiFileInput && DOM.aiFileInput.files[0] ? DOM.aiFileInput.files[0] : null;

    if (!prompt && !file) return;

    appendAiChatMessage('user', prompt || `[Tệp đính kèm: ${file.name}]`);
    if (DOM.aiPromptInput) DOM.aiPromptInput.value = '';

    const formData = new FormData();
    if (prompt) formData.append('prompt', prompt);
    if (file) formData.append('file', file);

    try {
        appendAiChatMessage('ai', '<i class="bi bi-three-dots"></i> Trợ lý AI đang suy nghĩ...');
        const response = await fetch(`${CONFIG.API_BASE_URL}/ai/chat`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        // Xóa message loading tạm thời
        if (DOM.aiMessageContainer && DOM.aiMessageContainer.lastElementChild) {
            DOM.aiMessageContainer.removeChild(DOM.aiMessageContainer.lastElementChild);
        }

        if (result.success) {
            appendAiChatMessage('ai', result.reply);
        } else {
            appendAiChatMessage('ai', 'Hệ thống AI xử lý thất bại, vui lòng thử lại sau!');
        }
    } catch (error) {
        appendAiChatMessage('ai', 'Lỗi kết nối máy chủ AI!');
    }
}

function appendAiChatMessage(sender, text) {
    if (!DOM.aiMessageContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `d-flex mb-3 ${sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`;

    messageDiv.innerHTML = `
        <div class="p-3 rounded-3 ${sender === 'user' ? 'bg-primary text-white' : 'bg-light text-dark border'}" style="max-width: 80%;">
            <small class="fw-bold d-block mb-1">${sender === 'user' ? 'Bạn' : 'EduShare AI'}</small>
            <div>${text}</div>
        </div>
    `;

    DOM.aiMessageContainer.appendChild(messageDiv);
    DOM.aiMessageContainer.scrollTop = DOM.aiMessageContainer.scrollHeight;
}

// ==========================================
// 9. HELPER FUNCTIONS & UI UTILITIES
// ==========================================
function switchTab(tabName) {
    state.activeTab = tabName;
    DOM.navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('data-tab') === tabName));
    DOM.tabContents.forEach(c => c.classList.toggle('d-none', c.id !== `tab-${tabName}`));

    if (tabName === 'saved') {
        const savedDocs = state.documents.filter(d => state.savedDocumentIds.has(d.id));
        renderDocumentCards(savedDocs);
    } else if (tabName === 'feed') {
        applyFiltersAndRender();
    }
}

function updateUserProfileUI() {
    const userNameEl = document.getElementById('userProfileName');
    const userAvatarEl = document.getElementById('userProfileAvatar');

    if (userNameEl) userNameEl.textContent = state.currentUser.fullName;
    if (userAvatarEl) userAvatarEl.src = state.currentUser.avatarUrl;
}

function formatCategoryLabel(category) {
    const map = {
        'ACADEMIC': 'Giáo trình / Bài giảng',
        'EXERCISE': 'Bài tập / Đồ án',
        'EXAM': 'Đề thi / Đáp án',
        'THESIS': 'Luận văn / NCKH'
    };
    return map[category] || 'Tài liệu học tập';
}

function openModal(modalEl) {
    if (modalEl) modalEl.classList.add('show', 'd-block');
}

function closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove('show', 'd-block');
}

function showToast(message, type = 'info') {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show shadow-sm mb-2`;
    toast.role = 'alert';
    toast.innerHTML = `
        <span>${escapeHtml(message)}</span>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function showLoadingSpinner(container) {
    if (container) {
        container.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
            </div>
        `;
    }
}

function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
