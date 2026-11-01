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

// 1. CẤU HÌNH MULTER LƯU ĐA TỆP LINH HOẠT (HỖ TRỢ ZIP, RAR, MP3, MP4, PDF, DOCX, PPTX)
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
  limits: { fileSize: 100 * 1024 * 1024 } // Giới hạn 100MB cho tệp nén & video
});

function detectFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'PDF';
  if (ext === '.docx' || ext === '.doc') return 'DOCX';
  if (ext === '.pptx' || ext === '.ppt') return 'PPTX';
  if (ext === '.zip' || ext === '.rar' || ext === '.7z') return 'ZIP/RAR';
  if (['.mp3', '.wav', '.m4a', '.aac'].includes(ext)) return 'AUDIO';
  if (['.mp4', '.mkv', '.avi', '.mov'].includes(ext)) return 'VIDEO';
  return 'TẬP TIN';
}

// DỮ LIỆU BAN ĐẦU
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

// NGÂN HÀNG TRI THỨC HỌC THUẬT MAXIMUM ACCURACY
const academicDict = {
  "triết học": "📘 **Triết học** là hệ thống tri thức lý luận chung nhất của con người về thế giới, về vị trí và vai trò của con người trong thế giới đó; nghiên cứu các quy luật vận động, phát triển chung nhất của tự nhiên, xã hội và tư duy.",
  "kinh tế chính trị": "📙 **Kinh tế chính trị** là môn khoa học nghiên cứu các quan hệ xã hội của sản xuất và trao đổi, các quy luật kinh tế chi phối sự sản xuất, phân phối, lưu thông và tiêu dùng của cải vật chất trong từng giai đoạn phát triển của xã hội.",
  "chủ nghĩa xã hội khoa học": "📗 **Chủ nghĩa xã hội khoa học** là hệ thống lý luận nghiên cứu các quy luật chính trị - xã hội của quá trình chuyển biến từ chủ nghĩa tư bản lên chủ nghĩa xã hội và chủ nghĩa cộng sản.",
  "tư tưởng hồ chí minh": "📕 **Tư tưởng Hồ Chí Minh** là hệ thống quan điểm toàn diện và sâu sắc về những vấn đề cơ bản của cách mạng Việt Nam, vận dụng sáng tạo chủ nghĩa Mác - Lênin vào điều kiện cụ thể của Việt Nam.",
  "lịch sử đảng": "📙 **Lịch sử Đảng Cộng sản Việt Nam** là môn học nghiên cứu quá trình ra đời, lãnh đạo và phát triển của Đảng qua các thời kỳ cách mạng.",
  "cấu trúc dữ liệu": "💻 **Cấu trúc dữ liệu** là cách tổ chức, quản lý và lưu trữ dữ liệu trong máy tính (như Mảng, Danh sách liên kết, Stack, Queue, Cây, Đồ thị) giúp tối ưu thuật toán xử lý.",
  "cơ sở dữ liệu": "🗄️ **Cơ sở dữ liệu (Database)** là tập hợp dữ liệu có cấu trúc được lưu trữ trên máy tính nhằm phục vụ khai thác thông tin cho nhiều người dùng.",
  "sql": "🗄️ **SQL (Structured Query Language)** là ngôn ngữ tiêu chuẩn dùng để truy vấn, cập nhật và quản lý hệ cơ sở dữ liệu quan hệ.",
  "mạng máy tính": "🌐 **Mạng máy tính** là tập hợp các máy tính kết nối với nhau qua phương tiện truyền dẫn để chia sẻ dữ liệu và tài nguyên.",
  "kỹ thuật phần mềm": "⚙️ **Kỹ thuật phần mềm** là ngành nghiên cứu quy trình thiết kế, phát triển, thử nghiệm và bảo trì các ứng dụng phần mềm."
};

/* ==================== API AI CHATBOT MAXIMUM ENGINE (NGÔN NGỮ NÓI + VIẾT) ==================== */

app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: 'Vui lòng nhập câu hỏi!' });

  const rawQuery = message.trim();
  const query = rawQuery.toLowerCase();
  let matchedDocs = [];
  let foundAnswers = [];

  // LỌC SẠCH KHẨU NGỮ TIẾNG VIỆT
  const cleanSpokenText = query
    .replace(/[.,?!:;""''`~()]/g, ' ')
    .replace(/\b(cho tui hỏi|cho tôi hỏi|cho hỏi|cho em hỏi|thầy ơi|bạn ơi|ad ơi|dạ|ạ|ơi|à|nghe nè|với|nè|nha|nhé|đi|z|vậy|giùm|hộ|cái|gì|là gì|thế nào|được không|giúp|với lại|có đặc điểm gì|như thế nào|khái niệm|định nghĩa|cho biết)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. KIỂM TRA TỪ ĐIỂN HỌC THUẬT (ĐA KHÁI NIỆM GHẾP)
  for (let key in academicDict) {
    if (cleanSpokenText.includes(key) || query.includes(key)) {
      foundAnswers.push(academicDict[key]);
      
      const docs = documents.filter(d => 
        (d.title && d.title.toLowerCase().includes(key)) ||
        (d.subject && d.subject.toLowerCase().includes(key))
      );
      matchedDocs.push(...docs);
    }
  }

  if (foundAnswers.length > 0) {
    let reply = foundAnswers.join('\n\n');
    const uniqueDocs = [...new Set(matchedDocs)];
    if (uniqueDocs.length > 0) {
      reply += `\n\n📚 **Tài liệu học tập liên quan sẵn có trên EduShare:**`;
    }
    return res.json({ reply, matchedDocs: uniqueDocs });
  }

  // 2. TÌM KIẾM TRONG KHO HỌC LIỆU EDUSHARE (RAG)
  matchedDocs = documents.filter(d => 
    (d.title && d.title.toLowerCase().includes(cleanSpokenText)) ||
    (d.subject && d.subject.toLowerCase().includes(cleanSpokenText)) ||
    (d.category && d.category.toLowerCase().includes(cleanSpokenText))
  );

  if ((query.includes('tài liệu') || query.includes('giáo trình') || query.includes('đề thi')) && matchedDocs.length > 0) {
    return res.json({ reply: `📚 **Tôi tìm thấy ${matchedDocs.length} tài liệu phù hợp trong kho EduShare:**`, matchedDocs });
  }

  // 3. WIKIPEDIA STRICT SEARCH ENGINE (TRÁNH LẠC ĐỀ SANG LỊCH SỬ THẾ GIỚI)
  try {
    const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${encodeURIComponent(cleanSpokenText)}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const searchResults = searchData?.query?.search;

    if (searchResults && searchResults.length > 0) {
      // Chỉ chọn bài viết có tiêu đề khớp trực tiếp từ khóa
      const matchedResult = searchResults.find(r => {
        const titleLower = r.title.toLowerCase();
        return cleanSpokenText.split(' ').some(w => w.length > 2 && titleLower.includes(w));
      });

      if (matchedResult) {
        const wikiUrl = `https://vi.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(matchedResult.title)}`;
        const wikiRes = await fetch(wikiUrl);
        const wikiData = await wikiRes.json();
        const pages = wikiData?.query?.pages;

        if (pages) {
          const pageId = Object.keys(pages)[0];
          if (pageId !== '-1' && pages[pageId].extract) {
            let extract = pages[pageId].extract.trim();
            if (extract.length > 500) extract = extract.substring(0, 500) + '...';
            
            return res.json({ reply: `💡 **${matchedResult.title}:**\n\n${extract}`, matchedDocs });
          }
        }
      }
    }
  } catch (err) {
    console.error("Lỗi tra cứu AI:", err);
  }

  return res.json({ 
    reply: `🤖 **EduShare AI:** Bạn có thể hỏi trực tiếp về các môn học (như *Triết học*, *Kinh tế chính trị*, *Mạng máy tính*, *Cơ sở dữ liệu*...) để tôi giải đáp ngay!`, 
    matchedDocs 
  });
});

/* ==================== CÁC API AUTH & DOCUMENT ==================== */

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
    res.status(404).json({ message: 'Không tìm thấy tài khoản hoặc Email/SĐT này!' });
  }
});

app.get('/api/users', (req, res) => res.json(users));

app.delete('/api/users/:id', (req, res) => {
  users = users.filter(u => String(u.id) !== String(req.params.id));
  res.json({ message: 'Đã xóa người dùng thành công.' });
});

app.get('/api/documents', (req, res) => res.json(documents));

app.post('/api/documents', upload.single('file'), (req, res) => {
  const fileName = req.file ? req.file.filename : '';
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  const detectedType = req.file ? detectFileType(req.file.originalname) : (req.body.type || 'PDF');

  const newDoc = {
    id: String(Date.now()),
    title: req.body.title,
    type: detectedType,
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

app.get('/api/documents/:id/comments', (req, res) => res.json(comments[req.params.id] || []));

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

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 EduShare Server running on http://localhost:${PORT}`));