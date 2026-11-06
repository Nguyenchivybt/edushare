const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// CẤU HÌNH GOOGLE GEMINI AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSy_YOUR_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const systemInstruction = `
Bạn là "EduShare AI" - Trợ lý tri thức & Cố vấn học thuật của Thư viện học liệu số EduShare thuộc Trường Đại học Xây dựng Miền Tây (MTU).
Tác giả phát triển: Nguyễn Chí Vỹ (SĐT: 0862204069, Email: nguyenchivybt2006@gmail.com, Địa chỉ: Số 427, ấp Phú Hữu, xã Hương Mỹ, tỉnh Vĩnh Long).
Địa chỉ trường MTU: Số 20B Phó Cơ Điều, Phường Phước Hậu, Tỉnh Vĩnh Long (SĐT: 0270 3 825 903, Email: dhxdmt@muce.edu.vn, Website: https://mtu.edu.vn).
`;

// CẤU HÌNH THƯ MỤC LƯU TỆP TẢI LÊN MULTI-FILE
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

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

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

// CƠ SỞ DỮ LIỆU TẠM THỜI TRÊN BỘ NHỚ RAM
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
    emailPhone: 'nguyenchivybt2006@gmail.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VyNguyen',
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
    address: 'Số 20B Phó Cơ Điều, Phường Phước Hậu, Tỉnh Vĩnh Long',
    emailPhone: 'giang.nv@mtu.edu.vn',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Giang',
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
    address: 'Tỉnh Vĩnh Long',
    emailPhone: '0862204069',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=StudentVy',
    authProvider: 'local' 
  }
];

let documents = [
  {
    id: '101',
    title: 'Giáo Trình Cấu Trúc Dữ Liệu & Giải Thuật',
    type: 'PDF',
    category: 'Tài liệu bài giảng',
    subject: 'Cấu trúc dữ liệu',
    school: 'Trường Đại học Xây dựng Miền Tây',
    faculty: 'Công nghệ thông tin',
    major: 'Kỹ thuật phần mềm',
    author: 'Nguyễn Chí Vỹ',
    authorId: '1',
    views: 310, downloads: 120, likes: 45, dislikes: 2,
    likedUsers: [], dislikedUsers: [], comments: [],
    date: '01/11/2026',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: '102',
    title: 'Đề Thi Mẫu Môn Cơ Sở Dữ Liệu SQL Server',
    type: 'DOCX',
    category: 'Tài liệu bài thi',
    subject: 'Cơ sở dữ liệu',
    school: 'Trường Đại học Xây dựng Miền Tây',
    faculty: 'Công nghệ thông tin',
    major: 'Kỹ thuật phần mềm',
    author: 'TS. Nguyễn Văn Giảng',
    authorId: '2',
    views: 185, downloads: 74, likes: 28, dislikes: 1,
    likedUsers: [], dislikedUsers: [], comments: [],
    date: '01/11/2026',
    url: 'https://calibre-ebook.com/downloads/demos/demo.docx'
  }
];

let liveChatMessages = [
  { id: 'm1', sender: 'Nguyễn Chí Vỹ', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VyNguyen', text: 'Chào mừng mọi người đến với Kênh Chat Trực Tuyến MTU 24/7!', files: [], time: '10:00' }
];

let chatGroups = [
  { id: 'g1', name: 'Nhóm Nghiên Cứu Đồ Án KTPM', members: ['1', '2', '3'], messages: [{ sender: 'TS. Nguyễn Văn Giảng', text: 'Thầy vừa upload tài liệu đồ án mẫu nhé.', files: [], time: '10:15' }] }
];

/* API ENDPOINTS */
app.get('/api/users', (req, res) => {
  const safeUsers = users.map(u => ({ id: u.id, fullname: u.fullname, username: u.username, role: u.role, avatar: u.avatar }));
  res.json(safeUsers);
});

app.get('/api/documents', (req, res) => res.json(documents));

app.post('/api/documents/batch', upload.array('files', 10), (req, res) => {
  const { title, category, subject, faculty, major, author, authorId } = req.body;
  const createdDocs = [];

  if (req.files && req.files.length > 0) {
    req.files.forEach((file, index) => {
      const fileUrl = `/uploads/${file.filename}`;
      const docItem = {
        id: String(Date.now() + index),
        title: req.files.length > 1 ? `${title} (Tệp ${index + 1}: ${file.originalname})` : title,
        type: detectFileType(file.originalname),
        category: category || 'Tài liệu bài giảng',
        subject: subject || 'Chung',
        school: 'Trường Đại học Xây dựng Miền Tây',
        faculty: faculty || 'Công nghệ thông tin',
        major: major || 'Kỹ thuật phần mềm',
        author: author || 'Thành viên MTU',
        authorId: authorId || '1',
        views: 1, downloads: 0, likes: 0, dislikes: 0,
        likedUsers: [], dislikedUsers: [], comments: [],
        date: new Date().toLocaleDateString('vi-VN'),
        url: fileUrl
      };
      documents.unshift(docItem);
      createdDocs.push(docItem);
    });
    return res.json({ success: true, message: 'Tải tệp thành công!', documents: createdDocs });
  }

  return res.status(400).json({ success: false, message: 'Tải tệp thất bại. Vui lòng thử lại sau!' });
});

app.post('/api/chat/upload', upload.array('attachments', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'Không có tệp được chọn' });
  }

  const uploadedFiles = req.files.map(f => ({
    name: f.originalname,
    url: `/uploads/${f.filename}`,
    type: detectFileType(f.originalname)
  }));

  res.json({ success: true, files: uploadedFiles });
});

app.get('/api/chat/public', (req, res) => res.json(liveChatMessages));

app.post('/api/chat/public/send', (req, res) => {
  const { sender, avatar, text, files } = req.body;
  if ((!text || !text.trim()) && (!files || files.length === 0)) {
    return res.status(400).json({ success: false });
  }

  const msg = {
    id: 'm_' + Date.now(),
    sender: sender || 'Thành viên MTU',
    avatar: avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
    text: text ? text.trim() : '',
    files: files || [],
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };
  liveChatMessages.push(msg);
  res.json({ success: true, message: msg });
});

app.get('/api/chat/groups', (req, res) => res.json(chatGroups));

app.post('/api/chat/groups/create', (req, res) => {
  const { name, creatorId, memberIds } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Tạo nhóm thất bại, vui lòng thử lại!' });
  const newGroup = {
    id: 'g_' + Date.now(),
    name: name.trim(),
    members: [creatorId || '1', ...(memberIds || [])],
    messages: []
  };
  chatGroups.push(newGroup);
  res.json({ success: true, message: 'Đã tạo nhóm thành công!', group: newGroup });
});

app.post('/api/chat/groups/send', (req, res) => {
  const { groupId, sender, text, files } = req.body;
  const group = chatGroups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm chat' });
  if ((!text || !text.trim()) && (!files || files.length === 0)) {
    return res.status(400).json({ success: false, message: 'Nội dung không được để trống' });
  }

  const msg = {
    id: 'gm_' + Date.now(),
    sender: sender || 'Thành viên MTU',
    text: text ? text.trim() : '',
    files: files || [],
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };
  group.messages = group.messages || [];
  group.messages.push(msg);
  res.json({ success: true, message: msg, group });
});

app.post('/api/register', (req, res) => {
  const { username, emailPhone, password, confirmPassword, fullname, role } = req.body;
  if (!username || !emailPhone || !password) return res.status(400).json({ success: false, message: 'Đăng ký thất bại. Vui lòng thử lại!' });
  if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Đăng ký thất bại. Vui lòng thử lại!' });

  const newUser = {
    id: String(Date.now()), fullname: fullname || username, username, password, emailPhone,
    gender: 'Nam', dob: '', school: 'MTU', faculty: 'IT',
    major: 'KTPM', studentClass: 'DH2024', address: 'Vĩnh Long',
    role: role || 'student', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`, authProvider: 'local'
  };
  users.push(newUser);
  res.json({ success: true, message: 'Đã đăng ký thành công!', user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const key = (username || '').trim().toLowerCase();
  const user = users.find(u => (u.username.toLowerCase() === key || u.emailPhone.toLowerCase() === key) && u.password === password);
  if (user) res.json({ success: true, message: 'Đã đăng nhập thành công!', user });
  else res.status(400).json({ success: false, message: 'Đăng nhập thất bại. Vui lòng thử lại!' });
});

app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ reply: 'Vui lòng nhập nội dung câu hỏi!' });

  try {
    if (GEMINI_API_KEY && !GEMINI_API_KEY.includes("YOUR_API_KEY")) {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
      const result = await model.generateContent(message);
      if (result.response.text()) return res.json({ reply: result.response.text() });
    }
  } catch (err) {}

  return res.json({ reply: `🤖 **EduShare AI**: Đã tiếp nhận câu hỏi "${message}". Hệ thống đang sẵn sàng đồng hành cùng bạn!` });
});

app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    res.sendFile(sitemapPath);
  } else {
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://edushare-i0xh.onrender.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 EduShare Server đang chạy tại: http://localhost:${PORT}`));