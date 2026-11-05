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

// CẤU HÌNH GOOGLE GEMINI AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSy_YOUR_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const systemInstruction = `
Bạn là "EduShare AI" - Trợ lý tri thức & Cố vấn học thuật của Thư viện học liệu số EduShare (Trường Đại học Xây dựng Miền Tây - MTU).
Tác giả phát triển: Nguyễn Chí Vỹ (SĐT: 0862204069, Địa chỉ: Số 427, ấp Phú Hữu, xã Hương Mỹ, tỉnh Vĩnh Long).
Địa chỉ trường MTU: Số 20B Phó Cơ Điều, Phường Phước Hậu, Tỉnh Vĩnh Long (SĐT: 0270 3 825 903).
Hãy hỗ trợ người dùng tra cứu tài liệu, giải đáp câu hỏi học thuật, phân tích file upload (PDF, Word, Slides, MP3, MP4, Hình ảnh) và liên kết bài báo khoa học.
`;

// CẤU HÌNH LƯU TRỮ TỆP TẢI LÊN MULTI-FILE
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

// DATABASE TẠM THỜI TÀI KHOẢN & MÃ OTP
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
    address: 'Số 20B Phó Cơ Điều, Phường Phước Hậu, Tỉnh Vĩnh Long',
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
    address: 'Tỉnh Vĩnh Long',
    emailPhone: 'sv.vy@mtu.edu.vn', 
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
    views: 450,
    downloads: 210,
    date: '01/11/2026',
    isArticle: true,
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  }
];

/* API DANH SÁCH HỌC LIỆU */
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
        category: category || 'Tài liệu bài giảng',
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
      title: `${title} [Liên kết báo khoa học]`,
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

  res.json({ success: true, message: `🎉 Đã tải lên thành công ${createdDocs.length} tài liệu!`, documents: createdDocs });
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

/* API ĐĂNG KÝ & ĐĂNG NHẬP & QUÊN MẬT KHẨU OTP */
app.post('/api/register', (req, res) => {
  const { username, emailPhone, password, confirmPassword, fullname, gender, dob, school, faculty, major, studentClass, address, role } = req.body;
  
  if (!username || !emailPhone || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ các thông tin bắt buộc!' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Mật khẩu và Xác nhận mật khẩu không trùng khớp!' });
  }

  if (users.some(u => u.username === username || u.emailPhone === emailPhone)) {
    return res.status(400).json({ message: 'Tên đăng nhập, Email hoặc SĐT đã tồn tại trên hệ thống!' });
  }

  const newUser = {
    id: String(Date.now()),
    fullname: fullname || username,
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
  res.json({ success: true, message: '🎉 Đăng ký tài khoản EduShare thành công!', user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => (u.username === username || u.emailPhone === username) && u.password === password);
  if (user) res.json({ success: true, message: 'Đăng nhập thành công!', user });
  else res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
});

// GỬI MÃ XÁC NHẬN OTP
app.post('/api/forgot-password/request-otp', (req, res) => {
  const { accountKey } = req.body;
  const key = (accountKey || '').trim();
  const user = users.find(u => u.username === key || u.emailPhone === key);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Sai cú pháp hoặc không tìm thấy tài khoản! Vui lòng kiểm tra lại.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[key] = { otp, expires: Date.now() + 5 * 60 * 1000 };

  res.json({ 
    success: true, 
    message: `Mã xác thực OTP đã gửi đến thông tin của ${user.fullname}! (Mã demo: ${otp})`, 
    demoOtp: otp 
  });
});

// XÁC NHẬN MÃ OTP
app.post('/api/forgot-password/verify-otp', (req, res) => {
  const { accountKey, otp } = req.body;
  const key = (accountKey || '').trim();
  const record = otpStore[key];

  if (!record) {
    return res.status(400).json({ success: false, message: 'Mã xác nhận không tồn tại hoặc đã hết hạn! Vui lòng bấm Gửi lại.' });
  }

  if (Date.now() > record.expires) {
    delete otpStore[key];
    return res.status(400).json({ success: false, message: 'Mã xác nhận đã quá hạn 5 phút! Vui lòng bấm Gửi lại mã.' });
  }

  if (record.otp !== (otp || '').trim()) {
    return res.status(400).json({ success: false, message: 'Mã xác nhận không đúng! Vui lòng nhập lại.' });
  }

  res.json({ success: true, message: '✅ Xác nhận mã OTP thành công! Vui lòng nhập mật khẩu mới.' });
});

// ĐẶT LẠI MẬT KHẨU MỚI
app.post('/api/forgot-password/reset-password', (req, res) => {
  const { accountKey, newPassword, confirmPassword } = req.body;
  const key = (accountKey || '').trim();

  if (!newPassword || newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới và xác nhận mật khẩu không trùng khớp!' });
  }

  const user = users.find(u => u.username === key || u.emailPhone === key);
  if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });

  user.password = newPassword;
  delete otpStore[key];

  res.json({ success: true, message: '🎉 Khôi phục mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.' });
});

// MÔ PHỎNG ĐĂNG NHẬP GOOGLE VÀ FACEBOOK
app.post('/api/auth/google', (req, res) => {
  const user = {
    id: 'g_' + Date.now(),
    fullname: 'Nguyễn Chí Vỹ (Google User)',
    username: 'google_vy',
    emailPhone: 'nguyenchivybt2006@gmail.com',
    role: 'student',
    gender: 'Nam',
    school: 'Trường Đại học Xây dựng Miền Tây',
    faculty: 'Công nghệ thông tin',
    major: 'Kỹ thuật phần mềm',
    authProvider: 'google'
  };
  res.json({ success: true, message: '🎉 Đăng nhập Google thành công!', user });
});

app.post('/api/auth/facebook', (req, res) => {
  const user = {
    id: 'fb_' + Date.now(),
    fullname: 'Nguyễn Chí Vỹ (Facebook User)',
    username: 'fb_vy',
    emailPhone: '0862204069',
    role: 'student',
    gender: 'Nam',
    school: 'Trường Đại học Xây dựng Miền Tây',
    faculty: 'Công nghệ thông tin',
    major: 'Kỹ thuật phần mềm',
    authProvider: 'facebook'
  };
  res.json({ success: true, message: '🎉 Đăng nhập Facebook thành công!', user });
});

/* API CHATBOT AI KHAI THÁC DỮ LIỆU MTU */
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
    reply: `🤖 **EduShare AI**: Tôi đã tiếp nhận thắc mắc "${message}". Dưới đây là danh sách tài liệu tham khảo phù hợp nhất từ kho học liệu MTU!`,
    matchedDocs: matchedDocs.slice(0, 4)
  });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 Server EduShare đang khởi chạy tại: http://localhost:${PORT}`));