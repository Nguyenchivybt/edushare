const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình Multer lưu tệp tải lên
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// MOCK DATA BAN ĐẦU
let users = [
  { id: '1', fullname: 'Nguyễn Chí Vỹ', username: 'admin', password: '123', role: 'admin', status: 'approved', emailPhone: 'vy@edushare.edu.vn' },
  { id: '2', fullname: 'Sinh Viên Mẫu', username: 'student', password: '123', role: 'student', status: 'approved', emailPhone: 'student@edushare.edu.vn' }
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

let comments = {};

/* ==================== API AI CHATBOT THÔNG MINH BẬC CAO ==================== */

app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: 'Vui lòng nhập câu hỏi!' });

  const rawQuery = message.trim();
  const query = rawQuery.toLowerCase();
  let reply = '';
  let matchedDocs = [];

  // 1. TÌM KIẾM TRONG KHO HỌC LIỆU EDUSHARE (RAG Engine)
  matchedDocs = documents.filter(d => 
    (d.title && d.title.toLowerCase().includes(query)) ||
    (d.subject && d.subject.toLowerCase().includes(query)) ||
    (d.category && d.category.toLowerCase().includes(query)) ||
    (d.major && d.major.toLowerCase().includes(query)) ||
    (d.faculty && d.faculty.toLowerCase().includes(query)) ||
    (d.author && d.author.toLowerCase().includes(query))
  );

  if ((query.includes('tài liệu') || query.includes('giáo trình') || query.includes('đề thi') || query.includes('bài giảng')) && matchedDocs.length > 0) {
    reply = `📚 **Tôi tìm thấy ${matchedDocs.length} tài liệu khớp trong kho EduShare:**`;
    return res.json({ reply, matchedDocs });
  }

  // 2. GIẢI ĐÁP TÍNH NĂNG EDUSHARE
  if (query.includes('đăng ký') || query.includes('tạo tài khoản')) {
    reply = "📝 **Hướng dẫn Đăng ký:**\n1. Nhấn **'Đăng Ký'** ở góc trên bên phải thanh Menu.\n2. Điền thông tin cá nhân và nhấn **'Tạo Tài Khoản Mới'**.";
    return res.json({ reply });
  }
  if (query.includes('tải lên') || query.includes('up tài liệu')) {
    reply = "📤 **Hướng dẫn Tải lên:**\n1. Đăng nhập tài khoản.\n2. Bấm nút **'+ Tải Lên'** màu xanh lá trên Navbar.\n3. Chọn file PDF/DOCX từ thiết bị để tải lên.";
    return res.json({ reply });
  }

  // 3. THUẬT TOÁN BÓC TÁCH KHẨU NGỮ & TRUY VẤN WIKIPEDIA SEARCH ENGINE
  let cleanKeyword = query
    .replace(/[.,?!:;""''`~]/g, '') // Bỏ toàn bộ dấu câu
    .replace(/(khái niệm về|khái niệm|là gì|cho biết|tìm hiểu|giải thích|nghĩa là gì|định nghĩa|cho tôi hỏi|cho hỏi|thế nào là|cho tui hỏi|nói về|cho xem|cho hỏi về)/gi, '')
    .replace(/\b(đi|nè|nha|nhé|với|ạ|ơi|á|z|vậy|giùm|hộ)\b/gi, '') // Bỏ khẩu ngữ tiếng Việt
    .trim();

  if (!cleanKeyword) cleanKeyword = query.replace(/[.,?!:;""''`~]/g, '').trim();

  try {
    // BƯỚC A: Dùng Wikipedia Search API để tự tìm kết quả phù hợp nhất (Fuzzy Search)
    const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${encodeURIComponent(cleanKeyword)}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const searchResults = searchData?.query?.search;

    if (searchResults && searchResults.length > 0) {
      // Lấy tiêu đề chuẩn nhất từ danh sách kết quả (ví dụ: "Triết học")
      const bestTitle = searchResults[0].title;

      // BƯỚC B: Tải tóm tắt khái niệm từ trang tiêu đề chuẩn
      const wikiUrl = `https://vi.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(bestTitle)}`;
      const wikiRes = await fetch(wikiUrl);
      const wikiData = await wikiRes.json();
      const pages = wikiData?.query?.pages;

      if (pages) {
        const pageId = Object.keys(pages)[0];
        if (pageId !== '-1' && pages[pageId].extract) {
          let extract = pages[pageId].extract.trim();
          if (extract.length > 600) extract = extract.substring(0, 600) + '...';
          
          reply = `💡 **Khái niệm & Tri thức học thuật (${bestTitle.toUpperCase()}):**\n\n${extract}\n\n📌 *Bạn có thể tìm kiếm thêm các tài liệu, bài giảng môn này trên thanh tìm kiếm của EduShare!*`;
          return res.json({ reply, matchedDocs });
        }
      }
    }
  } catch (err) {
    console.error("Lỗi truy vấn Wikipedia Search:", err);
  }

  // 4. LUỒNG TRẢ LỜI DỰ PHÒNG CHO MÔN HỌC
  if (query.includes('sql') || query.includes('cơ sở dữ liệu')) {
    reply = "🗄️ **Cơ Sở Dữ Liệu & SQL Server:**\nCơ sở dữ liệu là tập hợp dữ liệu có cấu trúc. SQL là ngôn ngữ chuẩn để truy vấn và quản lý CSDL.\n\n👉 EduShare có sẵn **Đề Thi Mẫu Môn Cơ Sở Dữ Liệu SQL Server 2022**!";
  } else if (query.includes('cấu trúc dữ liệu') || query.includes('thuật toán')) {
    reply = "💻 **Cấu Trúc Dữ Liệu & Giải Thuật:**\nLà môn học cốt lõi giúp tối ưu bộ nhớ và tốc độ chạy của phần mềm.\n\n📚 EduShare có sẵn **Giáo Trình Cấu Trúc Dữ Liệu & Giải Thuật**!";
  } else {
    reply = `🤖 **Trợ lý AI EduShare:**\nCảm ơn câu hỏi của bạn về chủ đề *"__${rawQuery}__"*.\n\n• **Tìm học liệu:** Nhập tên môn học hoặc mã học phần lên thanh tìm kiếm.\n• **Hỏi đáp:** Nhập tên khái niệm (Ví dụ: *Triết học*, *Mạng máy tính*, *Lập trình C*...) để AI giải thích!`;
  }

  return res.json({ reply, matchedDocs });
});

/* ==================== API AUTH & DOCUMENT ==================== */

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => (u.username === username || u.emailPhone === username) && u.password === password);
  if (user) {
    res.json({ message: 'Đăng nhập thành công', user });
  } else {
    res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
  }
});

app.post('/api/register', (req, res) => {
  const newUser = { id: String(Date.now()), ...req.body, status: 'approved' };
  users.push(newUser);
  res.json({ message: 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.' });
});

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.delete('/api/users/:id', (req, res) => {
  users = users.filter(u => String(u.id) !== String(req.params.id));
  res.json({ message: 'Đã xóa người dùng thành công.' });
});

app.get('/api/documents', (req, res) => {
  res.json(documents);
});

app.post('/api/documents', upload.single('file'), (req, res) => {
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  const newDoc = {
    id: String(Date.now()),
    title: req.body.title,
    type: req.body.type || 'PDF',
    category: req.body.category || 'Tài liệu',
    subject: 'Học phần chung',
    school: 'Trường Đại học Xây dựng Miền Tây',
    faculty: 'Công nghệ thông tin',
    major: 'Kỹ thuật phần mềm',
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

app.delete('/api/documents/:id', (req, res) => {
  documents = documents.filter(d => String(d.id) !== String(req.params.id));
  res.json({ message: 'Đã xóa tài liệu thành công.' });
});

app.post('/api/documents/:id/view', (req, res) => {
  const doc = documents.find(d => String(d.id) === String(req.params.id));
  if (doc) doc.views = (doc.views || 0) + 1;
  res.json({ success: true });
});

app.post('/api/documents/:id/download', (req, res) => {
  const doc = documents.find(d => String(d.id) === String(req.params.id));
  if (doc) doc.downloads = (doc.downloads || 0) + 1;
  res.json({ success: true });
});

app.get('/api/documents/:id/comments', (req, res) => {
  res.json(comments[req.params.id] || []);
});

app.post('/api/documents/:id/comments', (req, res) => {
  const docId = req.params.id;
  if (!comments[docId]) comments[docId] = [];

  const newComment = {
    id: String(Date.now()),
    userId: req.body.userId,
    userName: req.body.userName,
    rating: req.body.rating || 5,
    content: req.body.content,
    createdAt: new Date().toLocaleString('vi-VN')
  };

  comments[docId].unshift(newComment);
  res.json({ message: 'Đã gửi bình luận thành công!', comment: newComment });
});

app.delete('/api/documents/comments/:commentId', (req, res) => {
  for (let docId in comments) {
    comments[docId] = comments[docId].filter(c => String(c.id) !== String(req.params.commentId));
  }
  res.json({ message: 'Đã xóa bình luận.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 EduShare Server running on http://localhost:${PORT}`);
});