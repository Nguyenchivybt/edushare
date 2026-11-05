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

// KHỞI TẠO GOOGLE GEMINI AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSy_YOUR_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const systemInstruction = `
Bạn là "EduShare AI" - Trợ lý tri thức & Cố vấn học thuật thông minh của Thư viện học liệu số EduShare thuộc Trường Đại học Xây dựng Miền Tây (MTU).
Hãy giải đáp câu hỏi học thuật ngắn gọn, chính xác, hỗ trợ tra cứu tệp bài giảng, đề thi, bài báo khoa học và các liên kết tin tức giáo dục.
`;

// CẤU HÌNH MULTER UPLOAD ĐA TỆP (BATCH UPLOAD)
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

// CƠ SỞ DỮ LIỆU TÀI KHOẢN (CÓ PHÂN QUYỀN RBAC & THÔNG TIN ĐẦY ĐỦ)
let users = [
  { 
    id: '1', 
    fullname: 'Nguyễn Chí Vỹ', 
    username: 'admin', 
    password: '123', 
    role: 'admin', 
    gender: 'Nam',
    address: 'Số 427, ấp Phú Hữu, xã Hương Mỹ, tỉnh Vĩnh Long',
    emailPhone: '0862204069', 
    authProvider: 'local' 
  },
  { 
    id: '2', 
    fullname: 'TS. Nguyễn Văn Giảng', 
    username: 'lecturer', 
    password: '123', 
    role: 'teacher', 
    gender: 'Nam',
    address: 'Trường Đại học Xây dựng Miền Tây',
    emailPhone: 'giang.nv@mtu.edu.vn', 
    authProvider: 'local' 
  },
  { 
    id: '3', 
    fullname: 'Sinh Viên MTU', 
    username: 'student', 
    password: '123', 
    role: 'student', 
    gender: 'Nam',
    address: 'Phước Hậu, Vĩnh Long',
    emailPhone: 'student@mtu.edu.vn', 
    authProvider: 'local' 
  }
];

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

/* ==================== API CRUD HỌC LIỆU & ĐA TỆP ==================== */

app.get('/api/documents', (req, res) => res.json(documents));

// Đăng tải đa tệp cùng lúc (Multiple Files Upload + Link bài báo)
app.post('/api/documents/batch', upload.array('files', 10), (req, res) => {
  const { title, category, subject, faculty, major, author, authorId, articleLink } = req.body;
  const createdDocs = [];

  // Nếu chọn các tệp đính kèm
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

  // Nếu có dán Link bài báo / Tin tức
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

/* ==================== API AUTHENTICATION & KHÔI PHỤC ==================== */

app.post('/api/register', (req, res) => {
  const { username, emailPhone, password, confirmPassword, fullname, gender, address, role } = req.body;
  
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Mật khẩu xác nhận không trùng khớp!' });
  }

  if (users.some(u => u.username === username || u.emailPhone === emailPhone)) {
    return res.status(400).json({ message: 'Tài khoản hoặc Email/SĐT đã tồn tại!' });
  }

  const newUser = {
    id: String(Date.now()),
    fullname,
    username,
    password,
    emailPhone,
    gender: gender || 'Nam',
    address: address || '',
    role: role || 'student',
    authProvider: 'local'
  };
  users.push(newUser);
  res.json({ success: true, message: '🎉 Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.', user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => (u.username === username || u.emailPhone === username) && u.password === password);
  if (user) res.json({ message: 'Đăng nhập thành công', user });
  else res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
});

app.post('/api/auth/google', (req, res) => {
  const { email, name } = req.body;
  const userEmail = email || `google.${Date.now()}@gmail.com`;
  let user = users.find(u => u.emailPhone === userEmail);
  if (!user) {
    user = { id: String(Date.now()), fullname: name || 'Người dùng Google', username: userEmail.split('@')[0], emailPhone: userEmail, role: 'student', authProvider: 'google' };
    users.push(user);
  }
  res.json({ message: '🎉 Đăng nhập Google thành công!', user });
});

app.post('/api/auth/facebook', (req, res) => {
  const { name, email, id } = req.body;
  const userEmail = email || `fb.${id || Date.now()}@facebook.com`;
  let user = users.find(u => u.emailPhone === userEmail);
  if (!user) {
    user = { id: String(Date.now()), fullname: name || 'Người dùng Facebook', username: `fb_${id || Date.now()}`, emailPhone: userEmail, role: 'student', authProvider: 'facebook' };
    users.push(user);
  }
  res.json({ message: '🎉 Đăng nhập Facebook thành công!', user });
});

/* ==================== API CHATBOT AI ==================== */

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