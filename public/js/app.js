/**
 * EduShare Frontend Logic - public/js/app.js
 * Tác giả: Nguyễn Chí Vỹ | MTU
 */

const CONFIG = {
    API_BASE_URL: window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api',
    STORAGE_KEY_USER: 'edushare_user_session'
};

const state = {
    currentUser: null, // Null = Khách
    documents: [],
    groups: [],
    savedDocumentIds: new Set(),
    activeGroupId: "group-1"
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
    const alertClass = type === 'error' ? 'bg-danger text-white' : (type === 'warning' ? 'bg-warning text-dark' : 'bg-success text-white');
    const toast = document.createElement('div');
    toast.className = `alert ${alertClass} alert-dismissible fade show shadow mb-2 rounded-3`;
    toast.innerHTML = `<div>${message}</div><button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadUserSession();
    bindEvents();
    fetchDocuments();
    fetchGroups();
}

function loadUserSession() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY_USER);
    if (saved) {
        try { state.currentUser = JSON.parse(saved); } catch (e) { state.currentUser = null; }
    }
    updateUserUI();
}

function bindEvents() {
    // 1. NHẤP LOGO VỀ TRANG CHỦ
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
            showToast('Vui lòng đăng nhập để đăng tải tệp!', 'warning');
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
        showToast('Đã đăng xuất tài khoản!', 'info');
    });

    // Form Đăng ký (Lưu chính xác Role)
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const role = formData.get('role'); // Sửa triệt để không bị đè về STUDENT

        const user = {
            id: 'user-' + Date.now(),
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            role: role || 'STUDENT',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('fullName'))}&background=4f46e5&color=fff`
        };

        state.currentUser = user;
        localStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(user));
        updateUserUI();
        closeModal(authModal);
        showToast(`Đăng ký thành công với vai trò: ${formatRoleLabel(role)}!`, 'success');
    });

    // Form Đăng nhập
    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = {
            id: 'user-1',
            fullName: 'Nguyễn Chí Vỹ',
            email: 'nguyenchivy@mtu.edu.vn',
            role: 'STUDENT',
            avatar: 'https://ui-avatars.com/api/?name=Nguyen+Chi+Vy&background=4f46e5&color=fff'
        };
        state.currentUser = user;
        localStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(user));
        updateUserUI();
        closeModal(authModal);
        showToast('Đã đăng nhập thành công!', 'success');
    });

    // Tim kiếm Fuzzy
    document.getElementById('headerSearchInput')?.addEventListener('input', (e) => {
        filterDocuments(e.target.value);
    });
    document.getElementById('searchFileInput')?.addEventListener('input', (e) => {
        filterDocuments(e.target.value);
    });

    // Form Chat Send
    document.getElementById('chatSendForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInputText');
        const text = input ? input.value.trim() : '';
        if (!text) return;
        appendChatMessage(state.currentUser ? state.currentUser.fullName : "Sinh viên", text);
        input.value = '';
    });

    // Chống copy đối với Khách
    document.addEventListener('copy', (e) => {
        if (!state.currentUser) {
            e.preventDefault();
            showToast('Chưa đăng nhập! Bạn không thể copy văn bản.', 'error');
        }
    });
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
            <div class="card h-100 shadow-sm border-0 rounded-4">
                <div class="card-body d-flex flex-column p-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-primary-subtle text-primary fw-semibold">${doc.category}</span>
                        <span class="badge bg-secondary-subtle text-dark border">${doc.className || 'MTU'}</span>
                    </div>
                    <h5 class="card-title fw-bold mb-2">${doc.title}</h5>
                    <p class="card-text text-muted small mb-3 flex-grow-1">${doc.description}</p>
                    <div class="mt-auto pt-3 border-top">
                        <div class="d-flex align-items-center text-secondary small mb-3">
                            <i class="bi bi-person-circle me-1 text-primary"></i>
                            <span class="me-2 fw-medium">${doc.authorName}</span>
                            <span class="badge bg-light text-dark border">${formatRoleLabel(doc.authorRole)}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <button class="btn btn-sm btn-outline-danger" onclick="showToast('Đã thích!', 'success')"><i class="bi bi-heart-fill"></i> ${doc.likes}</button>
                            <div>
                                <button class="btn btn-sm btn-outline-primary fw-semibold me-1" onclick="handleViewDocument(${doc.id})"><i class="bi bi-eye"></i> Xem</button>
                                <button class="btn btn-sm btn-primary fw-semibold" onclick="handleDownloadDocument(${doc.id}, '${doc.category}')"><i class="bi bi-download"></i> Tải về</button>
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
        preview.innerHTML = `<div class="alert alert-warning small mb-2">Khách chỉ được xem. Không thể tải về hoặc copy.</div><div>${doc.description}</div>`;
    } else {
        preview.classList.remove('unselectable');
        preview.innerHTML = `<div>${doc.description}</div>`;
    }
    openModal(document.getElementById('documentViewModal'));
}

function handleDownloadDocument(docId, category) {
    if (!state.currentUser) {
        showToast('Khách chỉ được xem tài liệu, không thể tải về!', 'error');
        openModal(document.getElementById('authModal'));
        return;
    }
    if (state.currentUser.role === 'STUDENT' && category === 'ARTICLE') {
        showToast('Sinh viên chỉ có quyền xem bài báo khoa học, không được phép tải về!', 'warning');
        return;
    }
    showToast('Tải tài liệu thành công!', 'success');
}

function handleDeleteDocument(docId, docAuthorId) {
    if (!state.currentUser) {
        showToast('Vui lòng đăng nhập!', 'error');
        return;
    }
    if (state.currentUser.role !== 'ADMIN' && state.currentUser.id !== docAuthorId) {
        showToast('Bạn chỉ được phép chỉnh sửa hoặc xóa bài viết của chính mình!', 'error');
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
    const pending = state.groups.filter(g => g.status === 'PENDING');
    const suggested = state.groups.filter(g => g.status === 'SUGGESTED');

    document.getElementById('joinedGroupsList').innerHTML = joined.map(g => `
        <div class="list-group-item d-flex justify-content-between align-items-center p-2 cursor-pointer" onclick="openGroupChat('${g.id}', '${g.name}', ${g.membersCount})">
            <div><strong>${g.name}</strong><br><small class="text-muted">${g.membersCount} thành viên</small></div>
            <button class="btn btn-sm btn-primary">Trò chuyện</button>
        </div>
    `).join('');

    document.getElementById('pendingGroupsList').innerHTML = pending.map(g => `
        <div class="list-group-item d-flex justify-content-between align-items-center p-2">
            <div>${g.name}<br><small class="text-warning">Chờ duyệt</small></div>
        </div>
    `).join('');

    document.getElementById('suggestedGroupsList').innerHTML = suggested.map(g => `
        <div class="list-group-item d-flex justify-content-between align-items-center p-2">
            <div>${g.name}<br><small class="text-muted">${g.membersCount} thành viên</small></div>
            <button class="btn btn-sm btn-outline-primary" onclick="handleJoinGroup('${g.id}', '${g.name}')">Tham gia</button>
        </div>
    `).join('');
}

// THAM GIA HOẶC TẠO NHÓM -> TỰ ĐỘNG CHUYỂN TAB SANG CHAT
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

    const chatBox = document.getElementById('chatMessagesBox');
    if (chatBox) {
        chatBox.innerHTML = `
            <div class="text-center text-muted small my-2">-- Đã kết nối vào phòng trò chuyện nhóm ${groupName} --</div>
            <div class="mb-2"><strong>Giảng viên MTU:</strong> Chào các em, thảo luận học thuật tại đây nhé!</div>
        `;
    }
}

function appendChatMessage(sender, text) {
    const chatBox = document.getElementById('chatMessagesBox');
    if (!chatBox) return;
    const div = document.createElement('div');
    div.className = 'mb-2';
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
    const map = { 'STUDENT': 'Học sinh / Sinh viên', 'TEACHER': 'Giảng viên', 'ADMIN': 'Quản trị viên (Admin)' };
    return map[role] || 'Khách';
}