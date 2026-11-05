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

// KHỞI TẠO GEMINI AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSy_YOUR_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const systemInstruction = `
Bạn là "EduShare AI" - Trợ lý tri thức & Cố vấn học thuật thông minh của Thư viện học liệu số EduShare thuộc Trường Đại học Xây dựng Miền Tây (MTU).
Hãy giải đáp câu hỏi học thuật ngắn gọn, chính xác, lịch sự, đúng trọng tâm và trình bày đẹp bằng Markdown.
`;

// CẤU HÌNH MULTER UPLOAD TỆP ĐA PHƯƠNG TIỆN
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
  if (!filename) return 'TẬP TIN';
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) return 'HÌNH ẢNH';
  if (ext === '.pdf') return 'PDF';
  if (['.docx', '.doc'].includes(ext)) return 'DOCX';
  if (['.pptx', '.ppt'].includes(ext)) return 'PPTX';
  if (['.mp3', '.wav', '.m4a', '.flac'].includes(ext)) return 'AUDIO';
  if (['.mp4', '.mkv', '.avi', '.mov'].includes(ext)) return 'VIDEO';
  if (['.zip', '.rar', '.7z'].includes(ext)) return 'ZIP/RAR';
  return 'TẬP TIN';
}

// DATABASE MẪU NỘI BỘ
let users = [
  { id: '1', fullname: 'Nguyễn Chí Vỹ', username: 'admin', password: '123', role: 'admin', status: 'approved', emailPhone: 'nguyenchivytails@gmail.com', favorites: ['101'], authProvider: 'local' },
  { id: '2', fullname: 'TS. Nguyễn Văn Giảng', username: 'lecturer', password: '123', role: 'teacher', status: 'approved', emailPhone: 'giang.nv@mtu.edu.vn', favorites: [], authProvider: 'local' },
  { id: '3', fullname: 'Sinh Viên MTU', username: 'student', password: '123', role: 'student', status: 'approved', emailPhone: 'student@mtu.edu.vn', favorites: ['102'], authProvider: 'local' }
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
    views: 156,
    downloads: 62,
    likes: 29,
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
    author: 'Giảng viên CNTT',
    authorId: '2',
    views: 110,
    downloads: 45,
    likes: 18,
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
    author: 'TS. Nguyễn Văn Giảng',
    authorId: '2',
    views: 245,
    downloads: 88,
    likes: 41,
    date: '01/11/2026',
    isArticle: true,
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  }
];

let chatGroups = [
  { id: 'g1', name: '📢 Thảo Luận Học Thuật Chung', description: 'Kênh trao đổi thắc mắc học tập toàn trường' },
  { id: 'g2', name: '💻 Nhóm Lập Trình & CNTT', description: 'Góc giải đáp C++, Web, Database & AI' }
];

let chatMessages = [
  { id: 'm1', targetType: 'group', targetId: 'g1', senderId: '2', senderName: 'TS. Nguyễn Văn Giảng', senderRole: 'teacher', text: 'Chào các bạn sinh viên! Có thắc mắc gì về bài giảng cứ gửi vào đây nhé.', fileUrl: '', fileType: '', fileName: '', time: '08:30' }
];

/* API SOCIAL AUTH (GOOGLE & FACEBOOK) */
app.post('/api/auth/google', (req, res) => {
  const { email, name, picture } = req.body;
  const userEmail = email || `google.${Date.now()}@gmail.com`;
  let user = users.find(u => u.emailPhone === userEmail);
  if (!user) {
    user = { id: String(Date.now()), fullname: name || 'Người dùng Google', username: userEmail.split('@')[0], emailPhone: userEmail, role: 'student', status: 'approved', authProvider: 'google', favorites: [] };
    users.push(user);
  }
  res.json({ message: '🎉 Đăng nhập Google thành công!', user });
});

app.post('/api/auth/facebook', (req, res) => {
  const { name, email, id } = req.body;
  const userEmail = email || `fb.${id || Date.now()}@facebook.com`;
  let user = users.find(u => u.emailPhone === userEmail);
  if (!user) {
    user = { id: String(Date.now()), fullname: name || 'Người dùng Facebook', username: `fb_${id || Date.now()}`, emailPhone: userEmail, role: 'student', status: 'approved', authProvider: 'facebook', favorites: [] };
    users.push(user);
  }
  res.json({ message: '🎉 Đăng nhập Facebook thành công!', user });
});

/* API CHATBOT & THƯ VIỆN */
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
    reply: `🤖 **EduShare AI**: Tôi đã tiếp nhận câu hỏi "${message}". Bạn có thể xem các tài liệu liên quan bên dưới!`,
    matchedDocs: matchedDocs.slice(0, 4)
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => (u.username === username || u.emailPhone === username) && u.password === password);
  if (user) res.json({ message: 'Đăng nhập thành công', user });
  else res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
});

app.post('/api/register', (req, res) => {
  const { username, emailPhone } = req.body;
  if (users.some(u => u.username === username || u.emailPhone === emailPhone)) {
    return res.status(400).json({ message: 'Tài khoản hoặc Email/SĐT đã tồn tại!' });
  }
  const newUser = { id: String(Date.now()), ...req.body, status: 'approved', favorites: [], authProvider: 'local' };
  users.push(newUser);
  res.json({ message: 'Đăng ký tài khoản thành công!' });
});

app.post('/api/forgot-password', (req, res) => {
  const { account, newPassword } = req.body;
  const user = users.find(u => u.username === account || u.emailPhone === account);
  if (user) {
    user.password = newPassword;
    res.json({ success: true, message: '🎉 Đã khôi phục mật khẩu thành công!' });
  } else {
    res.status(404).json({ message: '❌ Không tìm thấy tài khoản!' });
  }
});

app.get('/api/documents', (req, res) => res.json(documents));

app.post('/api/documents', upload.single('file'), (req, res) => {
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  const detectedType = req.file ? detectFileType(req.file.originalname) : (req.body.type || 'PDF');
  
  const newDoc = {
    id: String(Date.now()),
    title: req.body.title || 'Tài liệu mới',
    type: detectedType,
    category: req.body.category || 'Tài liệu',
    subject: req.body.subject || 'Học phần chung',
    school: 'Trường Đại học Xây dựng Miền Tây',
    author: req.body.author || 'Tác giả',
    authorId: req.body.authorId || '1',
    views: 0,
    downloads: 0,
    likes: 0,
    isArticle: req.body.category === 'Bài báo tiêu biểu',
    date: new Date().toLocaleDateString('vi-VN'),
    url: fileUrl
  };
  documents.unshift(newDoc);
  res.json({ message: 'Tải lên học liệu thành công!', document: newDoc });
});

app.get('/api/users', (req, res) => res.json(users));
app.get('/api/chat/groups', (req, res) => res.json(chatGroups));
app.get('/api/chat/messages', (req, res) => {
  const { targetType, targetId } = req.query;
  res.json(chatMessages.filter(m => m.targetType === targetType && String(m.targetId) === String(targetId)));
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 EduShare Server đang chạy tại: http://localhost:${PORT}`));