let currentUser = JSON.parse(localStorage.getItem('edushare_user')) || null;
let documentsData = [];

document.addEventListener('DOMContentLoaded', () => {
  bindAuthForms();
  updateAuthUI();
  loadDocumentsFromServer();
});

/* ==================== 1. ĐĂNG NHẬP GOOGLE & FACEBOOK ==================== */

async function loginWithGoogle() {
  const fakeGoogleUser = {
    name: 'Sinh Viên Google',
    email: `sv.google.${Math.floor(Math.random()*1000)}@gmail.com`,
    picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
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

/* ==================== 2. CHATBOT AI CẢI TIẾN ==================== */

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

/* ==================== 3. AUTH & UTILS ==================== */

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

async function loadDocumentsFromServer() {
  try {
    const res = await fetch('/api/documents');
    if (res.ok) {
      documentsData = await res.json();
      renderDocuments(documentsData);
    }
  } catch (err) {}
}

function renderDocuments(docs) {
  const container = document.getElementById('document-list');
  if (!container) return;

  container.innerHTML = docs.map(doc => `
    <div class="doc-card" style="background:var(--bg-card); border:1px solid var(--border-color); padding:14px; border-radius:8px;">
      <span style="background:#2563eb; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px;">${doc.type}</span>
      <h3 style="font-size:14px; margin:8px 0; color:var(--text-main);">${escapeHtml(doc.title)}</h3>
      <p style="font-size:12px; color:var(--text-muted);">Môn: ${escapeHtml(doc.subject)}</p>
      <a href="${doc.url}" target="_blank" class="btn-artistic btn-green-glow" style="font-size:11px; padding:4px 8px; margin-top:8px; text-decoration:none; display:inline-block;">📥 Tải Học Liệu</a>
    </div>
  `).join('');
}

function handleLogout() {
  localStorage.removeItem('edushare_user');
  currentUser = null;
  updateAuthUI();
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function switchModal(fromId, toId) { closeModal(fromId); openModal(toId); }
function toggleMobileNav() { document.getElementById('main-nav-links').classList.toggle('show-mobile'); }
function resetHomePage() { location.reload(); }
function escapeHtml(str) { return str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''; }