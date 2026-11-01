const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 🔑 KHỞI TẠO GOOGLE GEMINI AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "DÁN_API_KEY_GEMINI_CỦA_BẠN_VÀO_ĐÂY";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// System Instruction thiết lập tính cách và chuyên môn cho AI
const systemInstruction = `
Bạn là "EduShare AI" - Trợ lý tri thức & Cố vấn học thuật thông minh, tinh tế và truyền cảm hứng của Thư viện học liệu số EduShare thuộc Trường Đại học Xây dựng Miền Tây (MTU).

NHIỆM VỤ VÀ TÍNH CÁCH CỦA BẠN:
1. HIỂU BẢN CHẤT CÂU HỎI: Có khả năng phân tích sâu sắc cả ngôn ngữ viết chuẩn xác và ngôn ngữ nói/khẩu ngữ tự nhiên của người Việt (dù có từ lót, vắn tắt, từ địa phương hay câu hỏi ghép phức tạp).
2. TRẢ LỜI ĐÚNG TRỌNG TÂM & CHUYÊN SÂU: Phân tích đúng bản chất vấn đề, cung cấp kiến thức chính xác, logic, có chiều sâu học thuật ở mọi lĩnh vực (Lịch sử, Triết học, Công nghệ thông tin, Xây dựng, Kiến trúc, Lập trình, Đời sống...).
3. TRUYỀN CẢM XÚC & ẤM ÁP: Văn phong tự nhiên, chân thành, gần gũi, giàu tri thức như một người thầy hay người bạn đồng hành. Tránh câu trả lời máy móc, lặp lại mẫu câu rập khuôn.
4. TỐI ƯU TRÌNH BÀY: Dùng định dạng Markdown (in đậm, gạch đầu dòng, danh sách, icon phù hợp) để bài viết mạch lạc, dễ hiểu.
5. GIỚI THIỆU TRƯỜNG & DỰ ÁN: Khi được hỏi về EduShare hay MTU, hãy tự hào giới thiệu nền tảng học liệu mở EduShare thuộc Trường Đại học Xây dựng Miền Tây.
`;

// 📦 CẤU HÌNH MULTER LƯU ĐA TỆP (GIỚI HẠN 100MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // Giới hạn tối đa 100MB
});

// Hàm tự động nhận diện loại tệp
function detectFileType(filename) {
  if (!filename) return 'TẬP TIN';
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'PDF';
  if (ext === '.docx' || ext === '.doc') return 'DOCX';
  if (ext === '.pptx' || ext === '.ppt') return 'PPTX';
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return 'ZIP/RAR';
  if (['.mp3', '.wav', '.m4a', '.aac', '.flac'].includes(ext)) return 'AUDIO';
  if (['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext)) return 'VIDEO';
  return 'TẬP TIN';
}

// 👥 DỮ LIỆU USER NỘI BỘ (MOCK DATA)
let users = [
  { 
    id: '1', 
    fullname: 'Nguyễn Chí Vỹ', 
    username: 'admin', 
    password: '123', 
    role: 'admin', 
    status: 'approved', 
    emailPhone: 'nguyenchivytails@gmail.com',
    favorites: ['101']
  },
  { 
    id: '2', 
    fullname: 'Sinh Viên Mẫu', 
    username: 'student', 
    password: '123', 
    role: 'student', 
    status: 'approved', 
    emailPhone: 'student@edushare.edu.vn',
    favorites: []
  }
];

// 📚 DỮ LIỆU TÀI LIỆU (MOCK DATA)
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
    course: 'K16',
    className: 'ĐH KTPM 2023',
    author: 'Nguyễn Chí Vỹ',
    authorId: '1',
    views: 125,
    downloads: 48,
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
    course: 'K16',
    className: 'ĐH KTPM 2023',
    author: 'Giảng viên CNTT',
    authorId: '2',
    views: 89,
    downloads: 32,
    date: '01/11/2026',
    url: 'https://calibre-ebook.com/downloads/demos/demo.docx'
  }
];

// 💬 DỮ LIỆU BÌNH LUẬN (MOCK DATA)
let comments = {
  '101': [
    {
      id: 'c1',
      userId: '2',
      userName: 'Sinh Viên Mẫu',
      rating: 5,
      content: 'Tài liệu rất hay và chi tiết, cám ơn tác giả!',
      createdAt: '01/11/2026 10:30:00'
    }
  ]
};

/* ==================== 1. API AI CHATBOT (BỘ NÃO GEMINI AI) ==================== */

app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ reply: 'Vui lòng nhập câu hỏi!' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

    const result = await model.generateContent(message);
    const responseText = result.response.text();

    // Tìm kiếm tự động các học liệu liên quan trong kho EduShare
    const queryLower = message.toLowerCase();
    const matchedDocs = documents.filter(d => 
      (d.title && queryLower.includes(d.title.toLowerCase())) ||
      (d.subject && queryLower.includes(d.subject.toLowerCase())) ||
      (d.category && queryLower.includes(d.category.toLowerCase()))
    );

    return res.json({ 
      reply: responseText, 
      matchedDocs: matchedDocs.slice(0, 5) 
    });

  } catch (err) {
    console.error("Lỗi AI Gemini API:", err);

    // Xử lý fallback khi API Key chưa cấu hình hoặc mất mạng
    return res.json({ 
      reply: `🤖 **EduShare AI:** Rất tiếc, hệ thống đang gặp chút gián đoạn kết nối AI. Bạn vui lòng kiểm tra lại biến môi trường \`GEMINI_API_KEY\` hoặc thử lại sau ít phút nhé!`, 
      matchedDocs: [] 
    });
  }
});

/* ==================== 2. API TÀI KHOẢN & XÁC THỰC ==================== */

// Đăng nhập
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => (u.username === username || u.emailPhone === username) && u.password === password);
  if (user) {
    res.json({ message: 'Đăng nhập thành công', user });
  } else {
    res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
  }
});

// Đăng ký
app.post('/api/register', (req, res) => {
  const newUser = { 
    id: String(Date.now()), 
    ...req.body, 
    status: 'approved',
    favorites: []
  };
  users.push(newUser);
  res.json({ message: 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.' });
});

// Quên mật khẩu
app.post('/api/forgot-password', (req, res) => {
  const { account, newPassword } = req.body;
  const user = users.find(u => u.username === account || u.emailPhone === account);
  if (user) {
    user.password = newPassword;
    res.json({ message: 'Đã cập nhật mật khẩu mới thành công!' });
  } else {
    res.status(404).json({ message: 'Không tìm thấy tài khoản hoặc Email/SĐT này!' });
  }
});

// Lấy danh sách người dùng (Admin)
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Xóa người dùng (Admin)
app.delete('/api/users/:id', (req, res) => {
  users = users.filter(u => String(u.id) !== String(req.params.id));
  res.json({ message: 'Đã xóa người dùng thành công.' });
});

// Yêu thích tài liệu
app.post('/api/users/favorites', (req, res) => {
  const { userId, docId } = req.body;
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });

  if (!user.favorites) user.favorites = [];
  const index = user.favorites.indexOf(docId);
  if (index > -1) {
    user.favorites.splice(index, 1);
    res.json({ message: 'Đã bỏ khỏi danh sách yêu thích!' });
  } else {
    user.favorites.push(docId);
    res.json({ message: 'Đã thêm vào danh sách yêu thích thành công!' });
  }
});

/* ==================== 3. API TÀI LIỆU & QUẢN LÝ TỆP ==================== */

// Lấy tất cả tài liệu
app.get('/api/documents', (req, res) => {
  res.json(documents);
});

// Tải lên tài liệu mới (Hỗ trợ Đa tệp Multer)
app.post('/api/documents', upload.single('file'), (req, res) => {
  const fileUrl = req.file 
    ? `/uploads/${req.file.filename}` 
    : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  const detectedType = req.file 
    ? detectFileType(req.file.originalname) 
    : (req.body.type || 'PDF');

  const newDoc = {
    id: String(Date.now()),
    title: req.body.title || 'Tài liệu mới',
    type: detectedType,
    category: req.body.category || 'Tài liệu',
    subject: req.body.subject || 'Học phần chung',
    school: req.body.school || 'Trường Đại học Xây dựng Miền Tây',
    faculty: req.body.faculty || 'Công nghệ thông tin',
    major: req.body.major || 'Kỹ thuật phần mềm',
    course: req.body.course || 'K16',
    className: req.body.className || 'ĐH KTPM 2023',
    author: req.body.author || 'Tác giả',
    authorId: req.body.authorId || '1',
    views: 0,
    downloads: 0,
    date: new Date().toLocaleDateString('vi-VN'),
    url: fileUrl
  };

  documents.unshift(newDoc);
  res.json({ message: 'Tải lên tài liệu thành công!', document: newDoc });
});

// Xóa tài liệu
app.delete('/api/documents/:id', (req, res) => {
  documents = documents.filter(d => String(d.id) !== String(req.params.id));
  delete comments[req.params.id];
  res.json({ message: 'Đã xóa tài liệu thành công.' });
});

// Ghi nhận lượt xem tài liệu
app.post('/api/documents/:id/view', (req, res) => {
  const doc = documents.find(d => String(d.id) === String(req.params.id));
  if (doc) doc.views = (doc.views || 0) + 1;
  res.json({ success: true });
});

// Ghi nhận lượt tải tài liệu
app.post('/api/documents/:id/download', (req, res) => {
  const doc = documents.find(d => String(d.id) === String(req.params.id));
  if (doc) doc.downloads = (doc.downloads || 0) + 1;
  res.json({ success: true });
});

/* ==================== 4. API BÌNH LUẬN & ĐÁNH GIÁ ==================== */

// Lấy danh sách bình luận của 1 tài liệu
app.get('/api/documents/:id/comments', (req, res) => {
  res.json(comments[req.params.id] || []);
});

// Gửi bình luận mới
app.post('/api/documents/:id/comments', (req, res) => {
  const docId = req.params.id;
  if (!comments[docId]) comments[docId] = [];

  const newComment = {
    id: String(Date.now()),
    userId: req.body.userId,
    userName: req.body.userName,
    rating: Number(req.body.rating) || 5,
    content: req.body.content,
    createdAt: new Date().toLocaleString('vi-VN')
  };

  comments[docId].unshift(newComment);
  res.json({ message: 'Đã gửi bình luận thành công!', comment: newComment });
});

// Xóa bình luận
app.delete('/api/documents/comments/:commentId', (req, res) => {
  const commentId = req.params.commentId;
  for (let docId in comments) {
    comments[docId] = comments[docId].filter(c => String(c.id) !== String(commentId));
  }
  res.json({ message: 'Đã xóa bình luận thành công.' });
});

/* ==================== 5. FALLBACK & CHẠY SERVER ==================== */

// Điều hướng tất cả trang còn lại về index.html (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bắt đầu lắng nghe cổng
app.listen(PORT, () => {
  console.log(`🚀 EduShare Server đang chạy tại: http://localhost:${PORT}`);
});