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

// CẤU HÌNH UPLOAD MULTI-FILE
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

// DỮ LIỆU MẪU
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

let otpStore = {};

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
    views: 310,
    downloads: 120,
    likes: 45,
    dislikes: 2,
    likedUsers: [],
    dislikedUsers: [],
    comments: [
      { 
        id: 'c1', 
        user: 'Sinh viên IT', 
        text: 'Tài liệu rất hay và rõ ràng!', 
        date: '02/11/2026',
        replies: [
          { id: 'r1', user: 'Nguyễn Chí Vỹ', text: 'Cảm ơn em! Chúc em học tốt môn này nhé.', date: '02/11/2026' }
        ]
      }
    ],
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
    views: 185,
    downloads: 74,
    likes: 28,
    dislikes: 1,
    likedUsers: [],
    dislikedUsers: [],
    comments: [],
    date: '01/11/2026',
    url: 'https://calibre-ebook.com/downloads/demos/demo.docx'
  }
];

let forumPosts = [
  {
    id: 'f1',
    author: 'Nguyễn Chí Vỹ',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VyNguyen',
    role: 'admin',
    date: '04/11/2026',
    title: 'Chào mừng các bạn đến với Cộng đồng trao đổi học thuật MTU!',
    content: 'Kênh kết nối thảo luận chuyên môn dành cho Sinh viên và Giảng viên MTU cùng chia sẻ tài nguyên và hỗ trợ giải bài tập, đồ án.',
    likes: 15,
    replies: [
      { id: 'r1', user: 'Nguyenchivysinhvien', text: 'Cảm ơn admin Vỹ! Hệ thống EduShare hỗ trợ trao đổi rất thuận tiện!', date: '04/11/2026' }
    ]
  }
];

// DỮ LIỆU CHAT TRỰC TUYẾN & NHÓM CHAT
let liveChatMessages = [
  { id: 'm1', sender: 'Nguyễn Chí Vỹ', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VyNguyen', text: 'Chào mừng mọi người đến với Kênh Chat Trực Tuyến MTU!', time: '10:00' }
];

let directMessages = {}; // key: "userId1_userId2"
let chatGroups = [
  { id: 'g1', name: 'Nhóm Nghiên Cứu Đồ Án IT', members: ['1', '2', '3'], messages: [{ sender: 'TS. Nguyễn Văn Giảng', text: 'Thầy đã đính kèm tài liệu tham khảo nhé.', time: '10:15' }] }
];

/* API ENDPOINTS */
app.get('/api/users', (req, res) => {
  const safeUsers = users.map(u => ({ id: u.id, fullname: u.fullname, username: u.username, role: u.role, avatar: u.avatar }));
  res.json(safeUsers);
});

app.get('/api/documents', (req, res) => res.json(documents));

app.post('/api/documents/batch', upload.array('files', 10), (req, res) => {
  const { title, category, subject, faculty, major, author, authorId, articleLink } = req.body;
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
  }

  if (articleLink && articleLink.trim()) {
    const linkDoc = {
      id: String(Date.now() + 99),
      title: `${title} [Liên kết báo khoa học]`,
      type: 'LINK',
      category: category || 'Bài báo tiêu biểu',
      subject: subject || 'Nghiên cứu',
      school: 'Trường Đại học Xây dựng Miền Tây',
      faculty: faculty || 'Công nghệ thông tin',
      major: major || 'Kỹ thuật phần mềm',
      author: author || 'Thành viên MTU',
      authorId: authorId || '1',
      views: 1, downloads: 0, likes: 0, dislikes: 0,
      likedUsers: [], dislikedUsers: [], comments: [], isArticle: true,
      date: new Date().toLocaleDateString('vi-VN'),
      url: articleLink.trim()
    };
    documents.unshift(linkDoc);
    createdDocs.push(linkDoc);
  }

  res.json({ success: true, message: `🎉 Đã tải lên thành công ${createdDocs.length} tài liệu!`, documents: createdDocs });
});

// THÍCH / KHÔNG THÍCH 2 CHIỀU & THU HỒI
app.post('/api/documents/reaction-toggle', (req, res) => {
  const { docId, type, userId } = req.body;
  const doc = documents.find(d => d.id === docId);
  if (!doc) return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu' });

  doc.likedUsers = doc.likedUsers || [];
  doc.dislikedUsers = doc.dislikedUsers || [];

  const uid = userId || 'guest';

  if (type === 'like') {
    if (doc.likedUsers.includes(uid)) {
      doc.likedUsers = doc.likedUsers.filter(u => u !== uid);
      doc.likes = Math.max(0, (doc.likes || 1) - 1);
    } else {
      doc.likedUsers.push(uid);
      doc.likes = (doc.likes || 0) + 1;
      if (doc.dislikedUsers.includes(uid)) {
        doc.dislikedUsers = doc.dislikedUsers.filter(u => u !== uid);
        doc.dislikes = Math.max(0, (doc.dislikes || 1) - 1);
      }
    }
  } else if (type === 'dislike') {
    if (doc.dislikedUsers.includes(uid)) {
      doc.dislikedUsers = doc.dislikedUsers.filter(u => u !== uid);
      doc.dislikes = Math.max(0, (doc.dislikes || 1) - 1);
    } else {
      doc.dislikedUsers.push(uid);
      doc.dislikes = (doc.dislikes || 0) + 1;
      if (doc.likedUsers.includes(uid)) {
        doc.likedUsers = doc.likedUsers.filter(u => u !== uid);
        doc.likes = Math.max(0, (doc.likes || 1) - 1);
      }
    }
  }

  res.json({ success: true, likes: doc.likes, dislikes: doc.dislikes, likedUsers: doc.likedUsers, dislikedUsers: doc.dislikedUsers });
});

// BÌNH LUẬN VÀ TRẢ LỜI ĐỐI ĐÁP MULTI-LEVEL
app.post('/api/documents/comment', (req, res) => {
  const { docId, user, text, parentCommentId } = req.body;
  const doc = documents.find(d => d.id === docId);
  if (!doc) return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu' });
  if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Nội dung không được để trống' });

  doc.comments = doc.comments || [];

  if (parentCommentId) {
    const parent = doc.comments.find(c => c.id === parentCommentId);
    if (parent) {
      parent.replies = parent.replies || [];
      parent.replies.push({
        id: 'r_' + Date.now(),
        user: user || 'Thành viên MTU',
        text: text.trim(),
        date: new Date().toLocaleDateString('vi-VN')
      });
    }
  } else {
    doc.comments.push({
      id: 'c_' + Date.now(),
      user: user || 'Thành viên MTU',
      text: text.trim(),
      date: new Date().toLocaleDateString('vi-VN'),
      replies: []
    });
  }

  res.json({ success: true, comments: doc.comments });
});

app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = documents.length;
  documents = documents.filter(d => d.id !== id);
  if (documents.length < initialLen) return res.json({ success: true, message: '🗑️ Đã xóa học liệu thành công!' });
  res.status(404).json({ success: false, message: '❌ Không tìm thấy học liệu!' });
});

app.get('/api/forum', (req, res) => res.json(forumPosts));

app.post('/api/forum/create', (req, res) => {
  const { author, avatar, role, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề và nội dung!' });

  const newPost = {
    id: 'f_' + Date.now(),
    author: author || 'Sinh viên MTU',
    avatar: avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Student',
    role: role || 'student',
    date: new Date().toLocaleDateString('vi-VN'),
    title, content, likes: 0, replies: []
  };
  forumPosts.unshift(newPost);
  res.json({ success: true, message: '🎉 Đã đăng bài viết thảo luận!', post: newPost });
});

app.post('/api/forum/reply', (req, res) => {
  const { postId, user, text } = req.body;
  const post = forumPosts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });

  const reply = { id: 'r_' + Date.now(), user: user || 'Thành viên MTU', text: text.trim(), date: new Date().toLocaleDateString('vi-VN') };
  post.replies.push(reply);
  res.json({ success: true, replies: post.replies });
});

/* API KÊNH CHAT & NHÓM CHAT */
app.get('/api/chat/public', (req, res) => res.json(liveChatMessages));

app.post('/api/chat/public/send', (req, res) => {
  const { sender, avatar, text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ success: false });

  const msg = {
    id: 'm_' + Date.now(),
    sender: sender || 'Thành viên MTU',
    avatar: avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
    text: text.trim(),
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };
  liveChatMessages.push(msg);
  res.json({ success: true, message: msg });
});

app.get('/api/chat/groups', (req, res) => res.json(chatGroups));

app.post('/api/chat/groups/create', (req, res) => {
  const { name, creatorId, memberIds } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Nhập tên nhóm chat!' });

  const newGroup = {
    id: 'g_' + Date.now(),
    name,
    members: Array.from(new Set([creatorId, ...(memberIds || [])])),
    messages: []
  };
  chatGroups.push(newGroup);
  res.json({ success: true, group: newGroup });
});

app.post('/api/chat/groups/send', (req, res) => {
  const { groupId, sender, text } = req.body;
  const group = chatGroups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ success: false });

  const msg = { sender, text: text.trim(), time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) };
  group.messages.push(msg);
  res.json({ success: true, group });
});

app.post('/api/register', (req, res) => {
  const { username, emailPhone, password, confirmPassword, fullname, gender, dob, school, faculty, major, studentClass, address, role } = req.body;
  if (!username || !emailPhone || !password) return res.status(400).json({ message: 'Vui lòng điền thông tin bắt buộc!' });
  if (password !== confirmPassword) return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp!' });

  const newUser = {
    id: String(Date.now()), fullname: fullname || username, username, password, emailPhone,
    gender: gender || 'Nam', dob: dob || '', school: school || 'MTU', faculty: faculty || 'IT',
    major: major || 'KTPM', studentClass: studentClass || 'DH2024', address: address || 'Vĩnh Long',
    role: role || 'student', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`, authProvider: 'local'
  };
  users.push(newUser);
  res.json({ success: true, message: '🎉 Đăng ký tài khoản EduShare thành công!', user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const key = (username || '').trim().toLowerCase();
  const user = users.find(u => (u.username.toLowerCase() === key || u.emailPhone.toLowerCase() === key) && u.password === password);
  if (user) res.json({ success: true, message: 'Đăng nhập thành công!', user });
  else res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng!' });
});

app.post('/api/user/update-profile', (req, res) => {
  const { id, fullname, gender, dob, emailPhone, address, oldPassword, newPassword, confirmNewPassword, avatar } = req.body;
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản!' });

  if (newPassword && newPassword.trim()) {
    if (user.password !== oldPassword) return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác!' });
    if (newPassword !== confirmNewPassword) return res.status(400).json({ success: false, message: 'Xác nhận mật khẩu mới không khớp!' });
    user.password = newPassword.trim();
  }

  user.fullname = fullname || user.fullname;
  user.gender = gender || user.gender;
  user.dob = dob || user.dob;
  user.emailPhone = emailPhone || user.emailPhone;
  user.address = address || user.address;
  if (avatar) user.avatar = avatar;

  res.json({ success: true, message: '🎉 Cập nhật hồ sơ cá nhân thành công!', user });
});

app.post('/api/forgot-password/request-otp', (req, res) => {
  const { accountKey } = req.body;
  const key = (accountKey || '').trim().toLowerCase();
  if (!key) return res.status(400).json({ success: false, message: 'Vui lòng nhập Tên đăng nhập, Email hoặc SĐT!' });

  let user = users.find(u => u.username.toLowerCase() === key || u.emailPhone.toLowerCase() === key);
  if (!user) {
    user = { fullname: accountKey, username: key, emailPhone: accountKey };
    users.push({ ...user, id: String(Date.now()), password: '123', role: 'student', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${key}` });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[key] = { otp, expires: Date.now() + 5 * 60 * 1000 };

  res.json({ success: true, message: `🎉 Mã OTP đã được gửi! (Mã thử nghiệm: ${otp})`, demoOtp: otp });
});

app.post('/api/forgot-password/verify-otp', (req, res) => {
  const { accountKey, otp } = req.body;
  const key = (accountKey || '').trim().toLowerCase();
  const record = otpStore[key];
  if (!record || Date.now() > record.expires) return res.status(400).json({ success: false, message: 'Mã xác nhận hết hạn!' });
  if (record.otp !== (otp || '').trim()) return res.status(400).json({ success: false, message: 'Mã xác nhận sai!' });

  res.json({ success: true, message: '✅ Xác thực OTP thành công!' });
});

app.post('/api/forgot-password/reset-password', (req, res) => {
  const { accountKey, newPassword, confirmPassword } = req.body;
  const key = (accountKey || '').trim().toLowerCase();
  if (!newPassword || newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'Mật khẩu mới không trùng khớp!' });

  const user = users.find(u => u.username.toLowerCase() === key || u.emailPhone.toLowerCase() === key);
  if (user) user.password = newPassword;
  delete otpStore[key];

  res.json({ success: true, message: '🎉 Đổi mật khẩu thành công!' });
});

app.post('/api/auth/google', (req, res) => {
  const user = {
    id: 'g_' + Date.now(), fullname: 'Nguyễn Chí Vỹ (Google)', username: 'google_vy',
    emailPhone: 'nguyenchivybt2006@gmail.com', role: 'student', gender: 'Nam',
    school: 'MTU', faculty: 'IT', major: 'KTPM', studentClass: 'DH2024',
    address: 'Vĩnh Long', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GoogleVy', authProvider: 'google'
  };
  res.json({ success: true, message: '🎉 Đăng nhập Google thành công!', user });
});

app.post('/api/auth/facebook', (req, res) => {
  const user = {
    id: 'fb_' + Date.now(), fullname: 'Nguyễn Chí Vỹ (Facebook)', username: 'fb_vy',
    emailPhone: '0862204069', role: 'student', gender: 'Nam', school: 'MTU', faculty: 'IT',
    major: 'KTPM', studentClass: 'DH2024', address: 'Vĩnh Long', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FbVy', authProvider: 'facebook'
  };
  res.json({ success: true, message: '🎉 Đăng nhập Facebook thành công!', user });
});

app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ reply: 'Vui lòng nhập câu hỏi!' });

  try {
    if (GEMINI_API_KEY && !GEMINI_API_KEY.includes("YOUR_API_KEY")) {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
      const result = await model.generateContent(message);
      if (result.response.text()) return res.json({ reply: result.response.text() });
    }
  } catch (err) {}

  return res.json({ reply: `🤖 **EduShare AI**: Đã tiếp nhận câu hỏi "${message}". Thư viện MTU đang hỗ trợ tra cứu cho bạn!` });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 EduShare Server đang chạy tại: http://localhost:${PORT}`));