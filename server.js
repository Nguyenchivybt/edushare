const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
const uploadDir = path.join(__dirname, 'uploads');
const usersFile = path.join(dataDir, 'users.json');
const docsFile = path.join(dataDir, 'documents.json');
const settingsFile = path.join(dataDir, 'settings.json');
const otpsFile = path.join(dataDir, 'otps.json');
const commentsFile = path.join(dataDir, 'comments.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

function readData(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    return defaultData;
  }
}

function saveData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Khởi tạo dữ liệu mặc định
let sysSettings = readData(settingsFile, { approvalMode: 'manual' });

let usersList = readData(usersFile, []);
if (usersList.length === 0) {
  usersList = [
    {
      id: 1,
      fullname: 'Quản trị viên Hệ thống',
      gender: 'Nam',
      dob: '2005-12-07',
      emailPhone: 'admin@edushare.vn',
      school: 'Trường Đại học Xây dựng Miền Tây',
      faculty: 'Công nghệ thông tin',
      major: 'Kỹ thuật phần mềm',
      className: 'ĐH Kỹ thuật phần mềm',
      course: 'K15',
      username: 'admin',
      password: '123',
      role: 'admin',
      status: 'approved',
      favorites: [],
      viewHistory: [],
      downloadHistory: [],
      createdAt: '2026-01-01'
    }
  ];
  saveData(usersFile, usersList);
}

let docsList = readData(docsFile, []);
if (docsList.length === 0) {
  docsList = [
    {
      id: 101,
      title: 'Giáo trình Lập trình Web nâng cao - ExpressJS & Node.js',
      type: 'PDF',
      category: 'Giáo trình',
      school: 'Trường Đại học Xây dựng Miền Tây',
      faculty: 'Công nghệ thông tin',
      major: 'Kỹ thuật phần mềm',
      course: 'K15',
      className: 'ĐH KTPM 2023',
      subject: 'Lập trình Web 2',
      author: 'ThS. Nguyễn Văn A',
      authorId: 1,
      downloads: 42,
      views: 128,
      date: '2026-02-15',
      url: '/uploads/sample-web-doc.pdf',
      isArticle: false
    },
    {
      id: 102,
      title: 'Đề thi Mẫu môn Cơ sở dữ liệu - HK1 năm học 2025-2026',
      type: 'DOCX',
      category: 'Tài liệu bài thi',
      school: 'Trường Đại học Xây dựng Miền Tây',
      faculty: 'Công nghệ thông tin',
      major: 'Kỹ thuật phần mềm',
      course: 'K15',
      className: 'ĐH KTPM 2023',
      subject: 'Cơ sở dữ liệu',
      author: 'Quản trị viên Hệ thống',
      authorId: 1,
      downloads: 85,
      views: 210,
      date: '2026-01-10',
      url: '/uploads/sample-db-exam.docx',
      isArticle: false
    },
    {
      id: 103,
      title: 'Ứng dụng Trí tuệ Nhân tạo trong Đổi mới Phương pháp Giảng dạy Đại học',
      type: 'LINK',
      category: 'Bài báo tiêu biểu',
      school: 'Toàn quốc',
      faculty: 'Khoa học máy tính',
      major: 'AI & Data Science',
      course: 'Tất cả',
      className: 'Toàn trường',
      subject: 'Nghiên cứu khoa học',
      author: 'Tạp chí Khoa học Giáo dục Việt Nam',
      authorId: 1,
      downloads: 0,
      views: 340,
      date: '2026-03-01',
      url: 'https://tapchigiaoduc.edu.vn',
      isArticle: true
    }
  ];
  saveData(docsFile, docsList);
}

/* ==================== API CẤU HÌNH & AUTH ==================== */

app.get('/api/settings', (req, res) => {
  res.json(readData(settingsFile, { approvalMode: 'manual' }));
});

app.post('/api/settings', (req, res) => {
  const { approvalMode } = req.body;
  const settings = { approvalMode: approvalMode || 'manual' };
  saveData(settingsFile, settings);
  res.json({ message: 'Đã cập nhật chế độ duyệt hệ thống thành công!', settings });
});

app.post('/api/register', (req, res) => {
  const { fullname, gender, dob, emailPhone, school, faculty, major, className, course, role, username, password, confirmPassword } = req.body;
  let users = readData(usersFile, []);
  let settings = readData(settingsFile, { approvalMode: 'manual' });

  if (!username || !password || !fullname || !emailPhone) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ các thông tin bắt buộc (*)' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Mật khẩu và Xác nhận mật khẩu không trùng khớp!' });
  }

  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại trên hệ thống!' });
  }

  if (users.some(u => u.emailPhone.toLowerCase() === emailPhone.toLowerCase())) {
    return res.status(400).json({ message: 'Email hoặc Số điện thoại này đã được đăng ký!' });
  }

  if (users.some(u => u.fullname.toLowerCase() === fullname.toLowerCase() && u.dob === dob)) {
    return res.status(400).json({ message: 'Thông tin Họ tên và Ngày sinh này đã tồn tại trên hệ thống!' });
  }

  const initialStatus = (settings.approvalMode === 'auto' || role === 'admin') ? 'approved' : 'pending';

  const newUser = {
    id: Date.now(),
    fullname,
    gender: gender || 'Nam',
    dob: dob || '',
    emailPhone,
    school: school || 'Trường Đại học Xây dựng Miền Tây',
    faculty: faculty || '',
    major: major || '',
    className: className || '',
    course: course || '',
    username,
    password,
    role: role || 'student',
    status: initialStatus,
    favorites: [],
    viewHistory: [],
    downloadHistory: [],
    createdAt: new Date().toISOString().split('T')[0]
  };

  users.push(newUser);
  saveData(usersFile, users);

  const msg = initialStatus === 'approved' 
    ? 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.' 
    : 'Đăng ký thành công! Tài khoản của bạn đang CHỜ DUYỆT bởi Admin.';

  res.status(201).json({ message: msg, user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  let users = readData(usersFile, []);

  const user = users.find(u => (u.username === username || u.emailPhone === username) && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Tên đăng nhập / Email / SĐT hoặc mật khẩu không chính xác!' });
  }

  if (user.status === 'pending') {
    return res.status(403).json({ message: 'Tài khoản của bạn đang CHỜ DUYỆT bởi Admin. Vui lòng liên hệ Quản trị viên!' });
  }

  const { password: p, ...userSafe } = user;
  res.json({ message: 'Đăng nhập thành công!', user: userSafe });
});

/* ==================== QUÊN MẬT KHẨU OTP 3 BƯỚC ==================== */

app.post('/api/forgot-password/send-otp', (req, res) => {
  const { accountInfo } = req.body;
  if (!accountInfo) return res.status(400).json({ message: 'Vui lòng nhập Tên đăng nhập, Email hoặc SĐT!' });

  let users = readData(usersFile, []);
  const user = users.find(u => u.username === accountInfo || u.emailPhone === accountInfo);

  if (!user) {
    return res.status(404).json({ message: 'Thông tin không tồn tại trên hệ thống. Vui lòng kiểm tra lại!' });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 3 * 60 * 1000;

  let otps = readData(otpsFile, []);
  otps = otps.filter(o => o.userId !== user.id);
  otps.push({ userId: user.id, otpCode, expiresAt });
  saveData(otpsFile, otps);

  res.json({
    message: `Đã gửi mã xác nhận OTP! (Mã thử nghiệm: ${otpCode})`,
    userId: user.id,
    otpDemo: otpCode
  });
});

app.post('/api/forgot-password/verify-otp', (req, res) => {
  const { userId, otpCode } = req.body;
  let otps = readData(otpsFile, []);
  const record = otps.find(o => o.userId === parseInt(userId));

  if (!record || record.otpCode !== otpCode.trim()) {
    return res.status(400).json({ message: 'Mã OTP sai, vui lòng nhập lại!' });
  }

  if (Date.now() > record.expiresAt) {
    return res.status(400).json({ message: 'Mã OTP đã quá hạn! Vui lòng chọn Cấp lại mã.' });
  }

  res.json({ message: 'Xác nhận mã OTP thành công! Mời bạn tạo mật khẩu mới.' });
});

app.post('/api/forgot-password/reset-password', (req, res) => {
  const { userId, otpCode, newPassword, confirmPassword } = req.body;

  if (!newPassword || newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Mật khẩu mới và Xác nhận mật khẩu mới không trùng khớp!' });
  }

  let otps = readData(otpsFile, []);
  const record = otps.find(o => o.userId === parseInt(userId) && o.otpCode === otpCode.trim());

  if (!record || Date.now() > record.expiresAt) {
    return res.status(400).json({ message: 'Yêu cầu không hợp lệ hoặc OTP đã quá hạn!' });
  }

  let users = readData(usersFile, []);
  const user = users.find(u => u.id === parseInt(userId));
  if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản!' });

  user.password = newPassword;
  saveData(usersFile, users);

  otps = otps.filter(o => o.userId !== parseInt(userId));
  saveData(otpsFile, otps);

  res.json({ message: 'Đặt lại mật khẩu mới thành công! Bạn có thể đăng nhập ngay.' });
});

/* ==================== API THÔNG TIN CÁ NHÂN & THƯ VIỆN ==================== */

app.get('/api/users/profile/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  let users = readData(usersFile, []);
  let docs = readData(docsFile, []);

  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });

  const { password, ...userSafe } = user;

  const uploadedDocs = docs.filter(d => d.authorId === userId || d.author === user.fullname);
  const favoriteDocs = docs.filter(d => (user.favorites || []).includes(d.id));
  const viewHistoryDocs = docs.filter(d => (user.viewHistory || []).includes(d.id));
  const downloadHistoryDocs = docs.filter(d => (user.downloadHistory || []).includes(d.id));

  res.json({
    user: userSafe,
    uploadedDocs,
    favoriteDocs,
    viewHistoryDocs,
    downloadHistoryDocs
  });
});

app.post('/api/users/favorites', (req, res) => {
  const { userId, docId } = req.body;
  let users = readData(usersFile, []);
  const user = users.find(u => u.id === parseInt(userId));

  if (!user) return res.status(401).json({ message: 'Vui lòng đăng nhập để thao tác!' });

  if (!user.favorites) user.favorites = [];
  const index = user.favorites.indexOf(docId);

  let isFav = false;
  if (index >= 0) {
    user.favorites.splice(index, 1);
  } else {
    user.favorites.push(docId);
    isFav = true;
  }

  saveData(usersFile, users);
  res.json({
    message: isFav ? 'Đã thêm tài liệu vào Thư viện Yêu Thích!' : 'Đã xóa tài liệu khỏi Yêu Thích!',
    favorites: user.favorites,
    isFav
  });
});

/* ==================== API ADMIN QUẢN LÝ NGƯỜI DÙNG ==================== */

app.get('/api/users', (req, res) => {
  let users = readData(usersFile, []);
  const safeUsers = users.map(({ password, ...rest }) => rest);
  res.json(safeUsers);
});

app.post('/api/users/add', (req, res) => {
  const { fullname, gender, dob, emailPhone, school, faculty, major, className, course, role, status, username, password } = req.body;
  let users = readData(usersFile, []);

  if (users.some(u => u.username === username)) {
    return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });
  }

  const newUser = {
    id: Date.now(),
    fullname: fullname || username,
    gender: gender || 'Nam',
    dob: dob || '',
    emailPhone: emailPhone || '',
    school: school || 'Trường Đại học Xây dựng Miền Tây',
    faculty: faculty || '',
    major: major || '',
    className: className || '',
    course: course || '',
    username,
    password,
    role: role || 'student',
    status: status || 'approved',
    favorites: [],
    viewHistory: [],
    downloadHistory: [],
    createdAt: new Date().toISOString().split('T')[0]
  };

  users.push(newUser);
  saveData(usersFile, users);
  res.status(201).json({ message: 'Admin đã thêm người dùng mới thành công!', user: newUser });
});

app.patch('/api/users/:id/approve', (req, res) => {
  const userId = parseInt(req.params.id);
  let users = readData(usersFile, []);
  const user = users.find(u => u.id === userId);

  if (user) {
    user.status = 'approved';
    saveData(usersFile, users);
    return res.json({ message: 'Đã duyệt tài khoản thành công!' });
  }
  res.status(404).json({ message: 'Không tìm thấy tài khoản!' });
});

app.delete('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  let users = readData(usersFile, []);
  users = users.filter(u => u.id !== userId);
  saveData(usersFile, users);
  res.json({ message: 'Đã xóa người dùng thành công!' });
});

/* ==================== API TÀI LIỆU & BÌNH LUẬN ==================== */

app.get('/api/documents', (req, res) => {
  res.json(readData(docsFile, []));
});

app.post('/api/documents', upload.single('file'), (req, res) => {
  let docs = readData(docsFile, []);
  const { title, type, category, school, faculty, major, course, className, subject, author, authorId, articleUrl } = req.body;

  let fileUrl = '#';
  let isArticle = (type === 'LINK');

  if (isArticle) {
    fileUrl = articleUrl || '#';
  } else if (req.file) {
    fileUrl = `/uploads/${req.file.filename}`;
  }

  const newDoc = {
    id: Date.now(),
    title: title || 'Tài liệu chưa đặt tên',
    type: type || 'PDF',
    category: category || 'Giáo trình',
    school: school || 'Trường Đại học Xây dựng Miền Tây',
    faculty: faculty || 'Công nghệ thông tin',
    major: major || 'Kỹ thuật phần mềm',
    course: course || 'K15',
    className: className || 'Toàn trường',
    subject: subject || 'Chung',
    author: author || 'Thành viên',
    authorId: parseInt(authorId) || 0,
    downloads: 0,
    views: 1,
    date: new Date().toISOString().split('T')[0],
    url: fileUrl,
    isArticle
  };

  docs.unshift(newDoc);
  saveData(docsFile, docs);
  res.status(201).json({ message: 'Tải lên tài liệu thành công!', data: newDoc });
});

app.put('/api/documents/:id', (req, res) => {
  const docId = parseInt(req.params.id);
  let docs = readData(docsFile, []);
  const doc = docs.find(d => d.id === docId);

  if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu!' });

  const { title, type, category, school, faculty, major, course, className, subject } = req.body;

  if (title) doc.title = title;
  if (type) doc.type = type;
  if (category) doc.category = category;
  if (school) doc.school = school;
  if (faculty) doc.faculty = faculty;
  if (major) doc.major = major;
  if (course) doc.course = course;
  if (className) doc.className = className;
  if (subject) doc.subject = subject;

  saveData(docsFile, docs);
  res.json({ message: 'Cập nhật tài liệu thành công!', data: doc });
});

app.delete('/api/documents/:id', (req, res) => {
  const docId = parseInt(req.params.id);
  let docs = readData(docsFile, []);
  
  const docIndex = docs.findIndex(d => d.id === docId);
  if (docIndex < 0) return res.status(404).json({ message: 'Không tìm thấy tài liệu!' });

  const doc = docs[docIndex];
  if (doc.url && doc.url.startsWith('/uploads/')) {
    const realFilePath = path.join(__dirname, doc.url);
    if (fs.existsSync(realFilePath)) {
      try { fs.unlinkSync(realFilePath); } catch (e) {}
    }
  }

  docs.splice(docIndex, 1);
  saveData(docsFile, docs);
  res.json({ message: 'Đã xóa tài liệu khỏi hệ thống!' });
});

app.post('/api/documents/:id/download', (req, res) => {
  const docId = parseInt(req.params.id);
  const { userId } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Chưa đăng nhập! Khách chỉ được xem, không thể tải tài liệu xuống.' });
  }

  let docs = readData(docsFile, []);
  const doc = docs.find(d => d.id === docId);

  if (doc) {
    doc.downloads = (doc.downloads || 0) + 1;
    saveData(docsFile, docs);

    let users = readData(usersFile, []);
    const user = users.find(u => u.id === parseInt(userId));
    if (user) {
      if (!user.downloadHistory) user.downloadHistory = [];
      if (!user.downloadHistory.includes(docId)) {
        user.downloadHistory.unshift(docId);
      }
      saveData(usersFile, users);
    }

    return res.json({ message: 'Tải tài liệu thành công!', url: doc.url, downloads: doc.downloads });
  }

  res.status(404).json({ message: 'Tài liệu không tồn tại!' });
});

app.post('/api/documents/:id/view', (req, res) => {
  const docId = parseInt(req.params.id);
  const { userId } = req.body;

  let docs = readData(docsFile, []);
  const doc = docs.find(d => d.id === docId);

  if (doc) {
    doc.views = (doc.views || 0) + 1;
    saveData(docsFile, docs);

    if (userId) {
      let users = readData(usersFile, []);
      const user = users.find(u => u.id === parseInt(userId));
      if (user) {
        if (!user.viewHistory) user.viewHistory = [];
        if (!user.viewHistory.includes(docId)) {
          user.viewHistory.unshift(docId);
        }
        saveData(usersFile, users);
      }
    }
    return res.json({ views: doc.views });
  }
  res.status(404).json({ message: 'Tài liệu không tồn tại!' });
});

app.get('/api/documents/:id/comments', (req, res) => {
  const docId = parseInt(req.params.id);
  let comments = readData(commentsFile, []);
  const docComments = comments.filter(c => c.docId === docId);
  res.json(docComments);
});

app.post('/api/documents/:id/comments', (req, res) => {
  const docId = parseInt(req.params.id);
  const { userId, userName, rating, content } = req.body;

  if (!userId || !content) {
    return res.status(400).json({ message: 'Vui lòng điền nội dung bình luận!' });
  }

  let comments = readData(commentsFile, []);
  const newComment = {
    id: Date.now(),
    docId,
    userId,
    userName: userName || 'Thành viên',
    rating: parseInt(rating) || 5,
    content,
    createdAt: new Date().toLocaleString('vi-VN')
  };

  comments.unshift(newComment);
  saveData(commentsFile, comments);
  res.status(201).json({ message: 'Đã gửi bình luận & đánh giá!', comment: newComment });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎓 EduShare Server v2.5 - Running on: http://localhost:${PORT}`);
  console.log(`====================================================`);
});