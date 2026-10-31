const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== KHỞI TẠO THƯ MỤC DỮ LIỆU & UPLOADS ====================
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Tệp dữ liệu JSON
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DOCS_FILE = path.join(DATA_DIR, 'documents.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Hàm đọc / ghi JSON helper
function readJSON(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return defaultData;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Khởi tạo dữ liệu mẫu nếu rỗng
let users = readJSON(USERS_FILE, [
  { id: 1, username: 'admin', fullname: 'Quản Trị Viên', role: 'admin', status: 'approved', emailPhone: 'admin@edushare.vn' }
]);
let documents = readJSON(DOCS_FILE, []);
let comments = readJSON(COMMENTS_FILE, []);
let settings = readJSON(SETTINGS_FILE, { approvalMode: 'manual' });

// ==================== MIDDLEWARE & SERVE STATIC FILES ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ tệp tĩnh công khai cho giao diện & thư mục uploads
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(UPLOADS_DIR));

// Cấu hình Multer tải tệp lên
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'doc-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// ==================== AUTHENTICATION APIs ====================

app.post('/api/register', (req, res) => {
  const newUser = req.body;
  users = readJSON(USERS_FILE);
  
  if (users.some(u => u.username === newUser.username)) {
    return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });
  }

  newUser.id = Date.now();
  newUser.status = settings.approvalMode === 'auto' ? 'approved' : 'pending';
  newUser.createdAt = new Date().toLocaleDateString('vi-VN');
  newUser.favorites = [];
  newUser.downloadHistory = [];
  newUser.viewHistory = [];

  users.push(newUser);
  writeJSON(USERS_FILE, users);

  const msg = newUser.status === 'approved' 
    ? 'Đăng ký thành công! Bạn có thể đăng nhập ngay.' 
    : 'Đăng ký thành công! Tài khoản đang chờ Admin phê duyệt.';
  res.json({ message: msg, user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  users = readJSON(USERS_FILE);

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không đúng!' });
  }
  if (user.status === 'pending') {
    return res.status(403).json({ message: 'Tài khoản của bạn đang chờ Admin phê duyệt!' });
  }

  res.json({ message: 'Đăng nhập thành công!', user });
});

app.post('/api/forgot-password/send-otp', (req, res) => {
  const { accountInfo } = req.body;
  users = readJSON(USERS_FILE);
  const user = users.find(u => u.username === accountInfo || u.emailPhone === accountInfo);

  if (!user) {
    return res.status(404).json({ message: 'Không tìm thấy tài khoản hợp lệ!' });
  }

  res.json({ message: 'Mã OTP thử nghiệm là: 123456', userId: user.id });
});

app.post('/api/forgot-password/verify-otp', (req, res) => {
  const { otpCode } = req.body;
  if (otpCode === '123456') {
    return res.json({ message: 'Xác thực OTP thành công!' });
  }
  res.status(400).json({ message: 'Mã OTP không chính xác!' });
});

app.post('/api/forgot-password/reset-password', (req, res) => {
  const { userId, otpCode, newPassword } = req.body;
  if (otpCode !== '123456') return res.status(400).json({ message: 'Mã OTP sai!' });

  users = readJSON(USERS_FILE);
  const user = users.find(u => u.id == userId);
  if (user) {
    user.password = newPassword;
    writeJSON(USERS_FILE, users);
    return res.json({ message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
  }
  res.status(404).json({ message: 'Lỗi không tìm thấy người dùng!' });
});

// ==================== DOCUMENTS APIs ====================

app.get('/api/documents', (req, res) => {
  documents = readJSON(DOCS_FILE);
  res.json(documents);
});

app.post('/api/documents', upload.single('file'), (req, res) => {
  documents = readJSON(DOCS_FILE);
  const body = req.body;

  let fileUrl = '';
  if (body.type === 'LINK') {
    fileUrl = body.articleUrl;
  } else if (req.file) {
    fileUrl = `/uploads/${req.file.filename}`;
  }

  const newDoc = {
    id: Date.now(),
    title: body.title,
    type: body.type,
    category: body.category,
    school: body.school,
    faculty: body.faculty,
    major: body.major,
    course: body.course,
    className: body.className,
    subject: body.subject,
    author: body.author || 'Khách',
    authorId: Number(body.authorId) || 0,
    url: fileUrl,
    date: new Date().toLocaleDateString('vi-VN'),
    views: 0,
    downloads: 0
  };

  documents.unshift(newDoc);
  writeJSON(DOCS_FILE, documents);
  res.json({ message: 'Tải lên tài liệu thành công!', document: newDoc });
});

app.put('/api/documents/:id', (req, res) => {
  const docId = Number(req.params.id);
  documents = readJSON(DOCS_FILE);
  const index = documents.findIndex(d => d.id === docId);

  if (index !== -1) {
    documents[index] = { ...documents[index], ...req.body };
    writeJSON(DOCS_FILE, documents);
    return res.json({ message: 'Cập nhật tài liệu thành công!' });
  }
  res.status(404).json({ message: 'Không tìm thấy tài liệu!' });
});

app.delete('/api/documents/:id', (req, res) => {
  const docId = Number(req.params.id);
  documents = readJSON(DOCS_FILE);
  documents = documents.filter(d => d.id !== docId);
  writeJSON(DOCS_FILE, documents);
  res.json({ message: 'Đã xóa tài liệu!' });
});

app.post('/api/documents/:id/view', (req, res) => {
  const docId = Number(req.params.id);
  const { userId } = req.body;

  documents = readJSON(DOCS_FILE);
  const doc = documents.find(d => d.id === docId);
  if (doc) {
    doc.views = (doc.views || 0) + 1;
    writeJSON(DOCS_FILE, documents);
  }

  if (userId) {
    users = readJSON(USERS_FILE);
    const user = users.find(u => u.id == userId);
    if (user) {
      if (!user.viewHistory) user.viewHistory = [];
      if (!user.viewHistory.includes(docId)) user.viewHistory.unshift(docId);
      writeJSON(USERS_FILE, users);
    }
  }

  res.json({ success: true });
});

app.post('/api/documents/:id/download', (req, res) => {
  const docId = Number(req.params.id);
  const { userId } = req.body;

  documents = readJSON(DOCS_FILE);
  const doc = documents.find(d => d.id === docId);
  if (doc) {
    doc.downloads = (doc.downloads || 0) + 1;
    writeJSON(DOCS_FILE, documents);
  }

  if (userId) {
    users = readJSON(USERS_FILE);
    const user = users.find(u => u.id == userId);
    if (user) {
      if (!user.downloadHistory) user.downloadHistory = [];
      if (!user.downloadHistory.includes(docId)) user.downloadHistory.unshift(docId);
      writeJSON(USERS_FILE, users);
    }
  }

  res.json({ success: true, message: 'Đã ghi nhận lượt tải!' });
});

// ==================== COMMENTS APIs ====================

app.get('/api/documents/:id/comments', (req, res) => {
  const docId = Number(req.params.id);
  comments = readJSON(COMMENTS_FILE);
  const docComments = comments.filter(c => c.docId === docId);
  res.json(docComments);
});

app.post('/api/documents/:id/comments', (req, res) => {
  const docId = Number(req.params.id);
  const { userId, userName, rating, content } = req.body;

  comments = readJSON(COMMENTS_FILE);
  const newComment = {
    id: Date.now(),
    docId,
    userId,
    userName,
    rating: Number(rating) || 5,
    content,
    createdAt: new Date().toLocaleString('vi-VN')
  };

  comments.unshift(newComment);
  writeJSON(COMMENTS_FILE, comments);
  res.json({ message: 'Đã gửi bình luận thành công!', comment: newComment });
});

app.delete('/api/documents/comments/:commentId', (req, res) => {
  const commentId = Number(req.params.commentId);
  comments = readJSON(COMMENTS_FILE);
  comments = comments.filter(c => c.id !== commentId);
  writeJSON(COMMENTS_FILE, comments);
  res.json({ message: 'Đã xóa bình luận!' });
});

// ==================== USER PROFILE & ADMIN APIs ====================

app.get('/api/users/profile/:id', (req, res) => {
  const userId = Number(req.params.id);
  users = readJSON(USERS_FILE);
  documents = readJSON(DOCS_FILE);

  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại!' });

  const uploadedDocs = documents.filter(d => d.authorId === userId || d.author === user.fullname);
  const favoriteDocs = documents.filter(d => (user.favorites || []).includes(d.id));
  const downloadHistoryDocs = documents.filter(d => (user.downloadHistory || []).includes(d.id));
  const viewHistoryDocs = documents.filter(d => (user.viewHistory || []).includes(d.id));

  res.json({ user, uploadedDocs, favoriteDocs, downloadHistoryDocs, viewHistoryDocs });
});

app.post('/api/users/favorites', (req, res) => {
  const { userId, docId } = req.body;
  users = readJSON(USERS_FILE);
  const user = users.find(u => u.id == userId);

  if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại!' });

  if (!user.favorites) user.favorites = [];
  const index = user.favorites.indexOf(docId);

  let message = '';
  if (index === -1) {
    user.favorites.push(docId);
    message = 'Đã thêm vào danh sách Yêu thích!';
  } else {
    user.favorites.splice(index, 1);
    message = 'Đã xóa khỏi danh sách Yêu thích!';
  }

  writeJSON(USERS_FILE, users);
  res.json({ message, favorites: user.favorites });
});

app.get('/api/users', (req, res) => {
  users = readJSON(USERS_FILE);
  res.json(users);
});

app.patch('/api/users/:id/approve', (req, res) => {
  const userId = Number(req.params.id);
  users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === userId);
  if (user) {
    user.status = 'approved';
    writeJSON(USERS_FILE, users);
    return res.json({ message: 'Đã duyệt tài khoản!' });
  }
  res.status(404).json({ message: 'Không tìm thấy người dùng!' });
});

app.delete('/api/users/:id', (req, res) => {
  const userId = Number(req.params.id);
  users = readJSON(USERS_FILE);
  users = users.filter(u => u.id !== userId);
  writeJSON(USERS_FILE, users);
  res.json({ message: 'Đã xóa người dùng!' });
});

app.get('/api/settings', (req, res) => {
  settings = readJSON(SETTINGS_FILE);
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  writeJSON(SETTINGS_FILE, settings);
  res.json({ message: 'Đã cập nhật cấu hình hệ thống!' });
});

// Xử lý tất cả các route còn lại trả về index.html (SPA Fallback an toàn cho Express v5)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== KHỞI CHẠY SERVER ====================
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 EduShare Server listening on PORT: ${PORT}`);
  console.log(`=================================`);
});