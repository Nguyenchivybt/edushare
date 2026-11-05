const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// GOOGLE GEMINI AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSy_YOUR_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const systemInstruction = `
Bạn là "EduShare AI" - Trợ lý tri thức & Cố vấn học thuật thông minh của Thư viện học liệu số EduShare thuộc Trường Đại học Xây dựng Miền Tây (MTU).
Hãy giải đáp câu hỏi học thuật ngắn gọn, chính xác, hỗ trợ tra cứu tệp bài giảng, đề thi, bài báo khoa học và các liên kết tin tức giáo dục.
`;

// UPLOAD ĐA TỆP MULTI-FILE
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 100 * 1024 * 1024 }
});

function detectFileType(filename) {
  if (!filename) return 'LINK';
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) return 'HÌNH ẢNH';
  if (ext === '.pdf') return 'PDF';
  if (['.docx', '.doc', '.txt'].includes(ext)) return 'DOCX';
  if (['.pptx', '.ppt'].includes(ext)) return 'PPTX';
  if (['.mp3', '.wav', '.m4a', '.flac'].includes(ext)) return 'AUDIO';
  if (['.mp4', '.mkv', '.avi', '.mov'].includes(ext)) return 'VIDEO';
  return 'TẬP TIN';
}

// CƠ SỞ DỮ LIỆU TÀI KHOẢN & MÃ OTP QUÊN MẬT KHẨU
let users = [
  { 
    id: '1', 
    fullname: 'Nguyễn Chí Vỹ', 
    username: 'admin', 
    password: 'adminpassword123', 
    role: 'admin', 
    gender: 'Nam',
    dob: '2006-01-06',
    school: 'Trường Đại học Xây dựng Miền Tây',
    faculty: 'Công nghệ thông tin',
    major: 'Kỹ thuật phần mềm',
    studentClass: 'KTPM2024',
    address: 'Số 427, ấp Phú Hữu, xã Hương Mỹ, tỉnh Vĩnh Long',
    emailPhone: '0862204069', 
    authProvider: 'local' 
  },
  { 
    id: '2', 
    fullname: 'TS. Nguyễn Văn Giảng', 
    username: 'giangnv', 
    password: '123', 
    role: 'teacher', 
    gender: 'Nam',
    dob: '1980-05-15',
    school: 'Trường Đại học Xây dựng Miền Tây',
    faculty: 'Xây dựng',
    major: 'Kỹ thuật xây dựng',
    studentClass: 'GV-XD',
    address: 'Trường Đại học Xây dựng Miền Tây',
    emailPhone: 'giang.nv@mtu.edu.vn', 
    authProvider: 'local' 
  },
  { 
    id: '3', 
    fullname: 'Nguyenchivysinhvien', 
    username: 'Nguyenchivysinhvien', 
    password: '123', 
    role: 'student', 
    gender: 'Nam',
    dob: '2006-01-06',
    school: 'Trường Đại học Xây dựng Miền Tây',
    faculty: 'Công nghệ thông tin',
    major: 'Kỹ thuật phần mềm',
    studentClass: 'DH2024',
    address: 'Vĩnh Long',
    emailPhone: 'sv.vy@mtu.edu.vn', 
    authProvider: 'local' 
  }
];

let otpStore = {}; // Lưu trữ OTP quên mật khẩu tạm thời

let documents = [
  {
    id: '101',
    title: 'Giáo Trình Cấu Trúc Dữ Liệu & Giải Thuật',
    type: 'PDF',
    category: 'Tài liệu',
    subject: 'Cấu trúc dữ liệu',
    school: 'Trường Đại học Xây dựng Miền Tây',
    faculty: 'Công nghệ thông tin',
    major: 'Kỹ thuật phần mềm',
    author: 'Nguyễn Chí Vỹ',
    authorId: '1',
    views: 210,
    downloads: 85,
    date: '01/11/2026',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: '102',
    title: 'Đề Thi Mẫu Môn Cơ Sở Dữ Liệu SQL Server 2022',
    type: 'DOCX',
    category: 'Tài liệu bài thi',
    subject: 'Cơ sở dữ liệu',
    school: 'Trường Đại học Xây dựng Miền Tây',
    faculty: 'Công nghệ thông tin',
    major: 'Kỹ thuật phần mềm',
    author: 'TS. Nguyễn Văn Giảng',
    authorId: '2',
    views: 145,
    downloads: 62,
    date: '01/11/2026',
    url: 'https://calibre-ebook.com/downloads/demos/demo.docx'
  },
  {
    id: '103',
    title: 'Nghiên Cứu Ứng Dụng AI Trong Tối Ưu Hóa Kết Cấu Bê Tông Cốt Thép',
    type: 'PDF',
    category: 'Bài báo tiêu biểu',
    subject: 'Xây dựng',
    school: 'Trường Đại học Xây dựng Miền Tây',
    faculty: 'Xây dựng',
    major: 'Kỹ thuật xây dựng',
    author: 'TS. Nguyễn Văn Giảng',
    authorId: '2',
    views: 320,
    downloads: 140,
    date: '01/11/2026',
    isArticle: true,
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  }
];

/* API HỌC LIỆU */
app.get('/api/documents', (req, res) => res.json(documents));

app.post('/api/documents/batch', upload.array('files', 10), (req, res) => {
  const { title, category, subject, faculty, major, author, authorId, articleLink } = req.body;
  const createdDocs = [];

  if (req.files && req.files.length > 0) {
    req.files.forEach((file, index) => {
      const fileUrl = `/uploads/${file.filename}`;
      const detectedType = detectFileType(file.originalname);
      const docItem = {
        id: String(Date.now() + index),
        title: req.files.length > 1 ? `${title} (Tệp ${index + 1}: ${file.originalname})` : title,
        type: detectedType,
        category: category || 'Tài liệu',
        subject: subject || 'Chung',
        school: 'Trường Đại học Xây dựng Miền Tây',
        faculty: faculty || 'Công nghệ thông tin',
        major: major || 'Kỹ thuật phần mềm',
        author: author || 'Thành viên MTU',
        authorId: authorId || '1',
        views: 1,
        downloads: 0,
        isArticle: category === 'Bài báo tiêu biểu',
        date: new Date().toLocaleDateString('vi-VN'),
        url: fileUrl
      };
      documents.unshift(docItem);
      createdDocs.push(docItem);
    });
  }

  if (articleLink && articleLink.trim()) {
    const linkDoc = {
      id: String(Date.now() + 99),
      title: `${title} [Liên kết ngoài]`,
      type: 'LINK',
      category: category || 'Bài báo tiêu biểu',
      subject: subject || 'Nghiên cứu',
      school: 'Trường Đại học Xây dựng Miền Tây',
      faculty: faculty || 'Công nghệ thông tin',
      major: major || 'Kỹ thuật phần mềm',
      author: author || 'Thành viên MTU',
      authorId: authorId || '1',
      views: 1,
      downloads: 0,
      isArticle: true,
      date: new Date().toLocaleDateString('vi-VN'),
      url: articleLink.trim()
    };
    documents.unshift(linkDoc);
    createdDocs.push(linkDoc);
  }

  res.json({ success: true, message: `🎉 Đã đăng tải thành công ${createdDocs.length} học liệu!`, documents: createdDocs });
});

app.put('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const index = documents.findIndex(d => d.id === id);
  if (index !== -1) {
    documents[index] = { ...documents[index], ...req.body };
    return res.json({ success: true, message: '🎉 Đã cập nhật học liệu!', document: documents[index] });
  }
  res.status(404).json({ success: false, message: '❌ Không tìm thấy học liệu!' });
});

app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = documents.length;
  documents = documents.filter(d => d.id !== id);
  if (documents.length < initialLen) {
    return res.json({ success: true, message: '🗑️ Đã xóa học liệu thành công!' });
  }
  res.status(404).json({ success: false, message: '❌ Không tìm thấy học liệu!' });
});

/* API XÁC THỰC & ĐĂNG KÝ & QUÊN MẬT KHẨU */
app.post('/api/register', (req, res) => {
  const { username, emailPhone, password, confirmPassword, fullname, gender, dob, school, faculty, major, studentClass, address, role } = req.body;
  
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Mật khẩu xác nhận không trùng khớp!' });
  }

  if (users.some(u => u.username === username || u.emailPhone === emailPhone)) {
    return res.status(400).json({ message: 'Tên tài khoản, Email hoặc SĐT đã tồn tại trên hệ thống!' });
  }

  const newUser = {
    id: String(Date.now()),
    fullname,
    username,
    password,
    emailPhone,
    gender: gender || 'Nam',
    dob: dob || '',
    school: school || 'Trường Đại học Xây dựng Miền Tây',
    faculty: faculty || 'Công nghệ thông tin',
    major: major || 'Kỹ thuật phần mềm',
    studentClass: studentClass || '',
    address: address || '',
    role: role || 'student',
    authProvider: 'local'
  };
  users.push(newUser);
  res.json({ success: true, message: '🎉 Đăng ký tài khoản thành công!', user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => (u.username === username || u.emailPhone === username) && u.password === password);
  if (user) res.json({ message: 'Đăng nhập thành công', user });
  else res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
});

// XỬ LÝ QUÊN MẬT KHẨU - BƯỚC 1: GỬI MÃ OTP
app.post('/api/forgot-password/request-otp', (req, res) => {
  const { accountKey } = req.body;
  const user = users.find(u => u.username === accountKey || u.emailPhone === accountKey);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Sai cú pháp hoặc không tìm thấy tài khoản! Vui lòng nhập lại.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[accountKey] = { otp, expires: Date.now() + 5 * 60 * 1000 };

  res.json({ 
    success: true, 
    message: `🎉 Mã xác nhận (OTP) đã gửi thành công tới ${user.emailPhone}!`, 
    demoOtp: otp 
  });
});

// XỬ LÝ QUÊN MẬT KHẨU - BƯỚC 2: XÁC NHẬN OTP
app.post('/api/forgot-password/verify-otp', (req, res) => {
  const { accountKey, otp } = req.body;
  const record = otpStore[accountKey];

  if (!record) {
    return res.status(400).json({ success: false, message: 'Mã xác nhận không tồn tại hoặc đã hết hạn! Vui lòng bấm Gửi lại.' });
  }

  if (Date.now() > record.expires) {
    delete otpStore[accountKey];
    return res.status(400).json({ success: false, message: 'Mã xác nhận đã quá hạn! Vui lòng yêu cầu mã mới.' });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ success: false, message: 'Mã xác nhận không đúng! Vui lòng nhập lại.' });
  }

  res.json({ success: true, message: '✅ Mã xác nhận chính xác! Hãy tạo mật khẩu mới.' });
});

// XỬ LÝ QUÊN MẬT KHẨU - BƯỚC 3: ĐẶT MẬT KHẨU MỚI
app.post('/api/forgot-password/reset-password', (req, res) => {
  const { accountKey, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới và xác nhận mật khẩu không trùng khớp!' });
  }

  const user = users.find(u => u.username === accountKey || u.emailPhone === accountKey);
  if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });

  user.password = newPassword;
  delete otpStore[accountKey];

  res.json({ success: true, message: '🎉 Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.' });
});

// MÔ PHỎNG DỊCH VỤ MẠNG XÃ HỘI GOOGLE & FACEBOOK
app.post('/api/auth/google', (req, res) => {
  const { email, name } = req.body;
  const userEmail = email || `google_user@mtu.edu.vn`;
  let user = users.find(u => u.emailPhone === userEmail);
  if (!user) {
    user = { 
      id: String(Date.now()), 
      fullname: name || 'Google User MTU', 
      username: 'google_' + Date.now(), 
      emailPhone: userEmail, 
      role: 'student', 
      gender: 'Nam',
      school: 'Trường Đại học Xây dựng Miền Tây',
      authProvider: 'google' 
    };
    users.push(user);
  }
  res.json({ message: '🎉 Đăng nhập Google thành công!', user });
});

app.post('/api/auth/facebook', (req, res) => {
  const { name, email, id } = req.body;
  const userEmail = email || `fb_user@mtu.edu.vn`;
  let user = users.find(u => u.emailPhone === userEmail);
  if (!user) {
    user = { 
      id: String(Date.now()), 
      fullname: name || 'Facebook User MTU', 
      username: 'fb_' + Date.now(), 
      emailPhone: userEmail, 
      role: 'student', 
      gender: 'Nam',
      school: 'Trường Đại học Xây dựng Miền Tây',
      authProvider: 'facebook' 
    };
    users.push(user);
  }
  res.json({ message: '🎉 Đăng nhập Facebook thành công!', user });
});

/* API CHATBOT AI */
app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ reply: 'Vui lòng nhập câu hỏi!' });

  const queryLower = message.toLowerCase();
  const matchedDocs = documents.filter(d => (d.title && queryLower.includes(d.title.toLowerCase())) || (d.subject && queryLower.includes(d.subject.toLowerCase())));

  try {
    if (GEMINI_API_KEY && !GEMINI_API_KEY.includes("YOUR_API_KEY")) {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
      const result = await model.generateContent(message);
      const responseText = result.response.text();
      if (responseText) return res.json({ reply: responseText, matchedDocs: matchedDocs.slice(0, 4) });
    }
  } catch (err) {}

  return res.json({
    reply: `🤖 **EduShare AI**: Tôi đã tiếp nhận câu hỏi "${message}". Dưới đây là các tài liệu bài giảng/nghiên cứu phù hợp trong kho học liệu MTU!`,
    matchedDocs: matchedDocs.slice(0, 4)
  });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 EduShare Server đang chạy tại: http://localhost:${PORT}`));