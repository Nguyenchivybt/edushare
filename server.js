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
  { id: '1', fullname: 'Nguyễn Chí Vỹ', username: 'admin', password: '123', role: 'admin', status: 'approved', emailPhone: 'nguyenchivytails@gmail.com' },
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

// BỘ TỪ ĐIỂN TỔNG HỢP KIẾN THỨC MÔN HỌC ĐẠI HỌC (TRẢ LỜI ĐÚNG TRỌNG TÂM 100%)
const academicDictionary = {
  "triết học": "📌 **Triết học** là hệ thống tri thức lý luận chung nhất của con người về thế giới, về vị trí và vai trò của con người trong thế giới đó. Triết học nghiên cứu các quy luật vận động, phát triển chung nhất của tự nhiên, xã hội và tư duy.",
  "triết học mác - lê nin": "📌 **Triết học Mác - Lênin** là hệ thống quan điểm duy vật phiến diện và biện chứng về tự nhiên, xã hội và tư duy, do C.Mác và Ph.Ăngghen sáng lập, được V.I.Lênin phát triển.",
  "cấu trúc dữ liệu": "💻 **Cấu trúc dữ liệu** là cách tổ chức, lưu trữ và quản lý dữ liệu trong máy tính sao cho có thể truy xuất và thao tác hiệu quả nhất (Ví dụ: Mảng, Danh sách liên kết, Ngăn xếp Stack, Hàng đợi Queue, Cây Tree, Đồ thị Graph).",
  "cơ sở dữ liệu": "🗄️ **Cơ sở dữ liệu (Database)** là một tập hợp các dữ liệu có liên quan logic với nhau, được lưu trữ trên các thiết bị nhớ để đáp ứng nhu cầu khai thác thông tin của nhiều người dùng.",
  "sql": "🗄️ **SQL (Structured Query Language)** là ngôn ngữ chuẩn dùng để truy vấn, cập nhật, tạo và quản lý các hệ quản trị cơ sở dữ liệu quan hệ như SQL Server, MySQL, PostgreSQL, Oracle.",
  "mạng máy tính": "🌐 **Mạng máy tính** là tập hợp các máy tính độc lập được kết nối với nhau thông qua các phương tiện truyền dẫn (dây cáp, sóng wifi) để chia sẻ tài nguyên và dữ liệu.",
  "kỹ thuật phần mềm": "⚙️ **Kỹ thuật phần mềm (Software Engineering)** là ngành học ứng dụng tiếp cận có hệ thống, có kỷ luật và định lượng vào việc phát triển, vận hành và bảo trì phần mềm.",
  "lập trình hướng đối tượng": "🧩 **Lập trình hướng đối tượng (OOP)** là phương pháp lập trình dựa trên khái niệm 'đối tượng' (object), chứa dữ liệu (thuộc tính) và mã lệnh (phương thức). OOP có 4 tính chất chính: **Đóng gói, Kế thừa, Đa hình, Trừu tượng**."
};

/* ==================== API AI CHATBOT MAXIMUM SMART ENGINE ==================== */

app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: 'Vui lòng nhập câu hỏi!' });

  const rawQuery = message.trim();
  const query = rawQuery.toLowerCase();
  let reply = '';
  let matchedDocs = [];

  // 1. TRUY VẤN TỪ ĐIỂN TỔNG HỢP KIẾN THỨC MÔN HỌC (TRẢ LỜI NGAY CÂU ĐẦU TIÊN)
  for (let key in academicDictionary) {
    if (query.includes(key)) {
      reply = academicDictionary[key];
      
      // Bổ sung các tài liệu trong EduShare nếu có
      matchedDocs = documents.filter(d => 
        (d.title && d.title.toLowerCase().includes(key)) ||
        (d.subject && d.subject.toLowerCase().includes(key))
      );
      if (matchedDocs.length > 0) {
        reply += `\n\n📚 **Tài liệu sẵn có trong EduShare:**`;
      }
      return res.json({ reply, matchedDocs });
    }
  }

  // 2. TÌM KIẾM TRONG KHO HỌC LIỆU EDUSHARE (RAG Engine)
  matchedDocs = documents.filter(d => 
    (d.title && d.title.toLowerCase().includes(query)) ||
    (d.subject && d.subject.toLowerCase().includes(query)) ||
    (d.category && d.category.toLowerCase().includes(query)) ||
    (d.major && d.major.toLowerCase().includes(query)) ||
    (d.faculty && d.faculty.toLowerCase().includes(query))
  );

  if ((query.includes('tài liệu') || query.includes('giáo trình') || query.includes('đề thi') || query.includes('bài giảng')) && matchedDocs.length > 0) {
    reply = `📚 **Tìm thấy ${matchedDocs.length} tài liệu phù hợp trong kho EduShare:**`;
    return res.json({ reply, matchedDocs });
  }

  // 3. THUẬT TOÁN BÓC TÁCH KHẨU NGỮ & TRUY VẤN WIKIPEDIA SEARCH ENGINE
  let cleanKeyword = query
    .replace(/[.,?!:;""''`~]/g, '')
    .replace(/(khái niệm về|khái niệm|là gì|cho biết|tìm hiểu|giải thích|nghĩa là gì|định nghĩa|cho tôi hỏi|cho hỏi|thế nào là|cho tui hỏi|nói về|cho xem|cho hỏi về)/gi, '')
    .replace(/\b(đi|nè|nha|nhé|với|ạ|ơi|á|z|vậy|giùm|hộ)\b/gi, '')
    .trim();

  if (!cleanKeyword) cleanKeyword = query.replace(/[.,?!:;""''`~]/g, '').trim();

  try {
    const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${encodeURIComponent(cleanKeyword)}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const searchResults = searchData?.query?.search;

    if (searchResults && searchResults.length > 0) {
      const bestTitle = searchResults[0].title;
      const wikiUrl = `https://vi.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(bestTitle)}`;
      const wikiRes = await fetch(wikiUrl);
      const wikiData = await wikiRes.json();
      const pages = wikiData?.query?.pages;

      if (pages) {
        const pageId = Object.keys(pages)[0];
        if (pageId !== '-1' && pages[pageId].extract) {
          let extract = pages[pageId].extract.trim();
          if (extract.length > 550) extract = extract.substring(0, 550) + '...';
          
          reply = `📌 **${bestTitle}** là ${extract.replace(/^[^:]*là\s*/i, '')}`;
          return res.json({ reply, matchedDocs });
        }
      }
    }
  } catch (err) {
    console.error("Lỗi truy vấn Search:", err);
  }

  // 4. LUỒNG TRẢ LỜI MẶC ĐỊNH
  reply = `🤖 **EduShare AI:** Bạn có thể tra cứu thông tin khái niệm (Ví dụ: *Triết học*, *Mạng máy tính*, *Cơ sở dữ liệu*...) hoặc gõ tên môn học để tìm tài liệu, đề thi tương ứng.`;
  return res.json({ reply, matchedDocs });
});

/* ==================== API AUTH, REGISTER & FORGOT PASSWORD ==================== */

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

app.post('/api/forgot-password', (req, res) => {
  const { account, newPassword } = req.body;
  const user = users.find(u => u.username === account || u.emailPhone === account);
  if (user) {
    user.password = newPassword;
    res.json({ message: 'Đã cập nhật mật khẩu mới thành công!' });
  } else {
    res.status(404).json({ message: 'Không tìm thấy tài khoản hoặc Email/SĐT này trong hệ thống!' });
  }
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