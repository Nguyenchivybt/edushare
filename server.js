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

// 🔑 KHỞI TẠO GOOGLE GEMINI AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSy_YOUR_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const systemInstruction = `
Bạn là "EduShare AI" - Trợ lý tri thức & Cố vấn học thuật thông minh, tinh tế và truyền cảm hứng của Thư viện học liệu số EduShare thuộc Trường Đại học Xây dựng Miền Tây (MTU).

NHIỆM VỤ VÀ TÍNH CÁCH CỦA BẠN:
1. HIỂU BẢN CHẤT CÂU HỎI: Phân tích sâu sắc cả ngôn ngữ viết chuẩn xác và khẩu ngữ tự nhiên của người Việt (dù có từ lót, vắn tắt, dùng từ địa phương hay câu hỏi ghép phức tạp).
2. TRẢ LỜI ĐÚNG TRỌNG TÂM & CHUYÊN SÂU: Phân tích đúng bản chất vấn đề, cung cấp kiến thức chính xác, logic, có chiều sâu học thuật ở mọi lĩnh vực (Lịch sử, Triết học, Dòng họ, Công nghệ thông tin, Xây dựng, Lập trình, Đời sống...).
3. TRUYỀN CẢM XÚC & ẤM ÁP: Văn phong tự nhiên, chân thành, gần gũi, giàu tri thức như một người thầy hay người bạn đồng hành. Tránh câu trả lời máy móc, lặp lại mẫu câu rập khuôn.
4. TỐI ƯU TRÌNH BÀY: Dùng định dạng Markdown (in đậm, gạch đầu dòng, icon minh họa) để bài viết mạch lạc, dễ tiếp thu.
`;

// CẤU HÌNH MULTER LƯU ĐA TỆP
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
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

function detectFileType(filename) {
  if (!filename) return 'TẬP TIN';
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'PDF';
  if (ext === '.docx' || ext === '.doc') return 'DOCX';
  if (ext === '.pptx' || ext === '.ppt') return 'PPTX';
  if (['.zip', '.rar', '.7z'].includes(ext)) return 'ZIP/RAR';
  if (['.mp3', '.wav', '.m4a'].includes(ext)) return 'AUDIO';
  if (['.mp4', '.mkv', '.avi'].includes(ext)) return 'VIDEO';
  return 'TẬP TIN';
}

// DỮ LIỆU NỘI BỘ
let users = [
  { id: '1', fullname: 'Nguyễn Chí Vỹ', username: 'admin', password: '123', role: 'admin', status: 'approved', emailPhone: 'nguyenchivytails@gmail.com', favorites: ['101'] },
  { id: '2', fullname: 'Sinh Viên Mẫu', username: 'student', password: '123', role: 'student', status: 'approved', emailPhone: 'student@edushare.edu.vn', favorites: [] }
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

// HÀM BỔ TRỢ: TRA CỨU WIKIPEDIA DỰ PHÒNG KHI GEMINI CHƯA CÓ KEY
async function fetchWikiFallback(queryText) {
  let cleanKeyword = queryText
    .replace(/[.,?!:;""''`~()]/g, ' ')
    .replace(/\b(cho tui hỏi|cho tôi hỏi|cho hỏi|cho em hỏi|thầy ơi|bạn ơi|ad ơi|dạ|ạ|ơi|à|với|nè|nha|nhé|đi|z|vậy|giùm|hộ|cái|gì|là gì|thế nào|được không|giúp|cho biết|cho tui biết|là ai|trong lịch sử|trong|ai là)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanKeyword) cleanKeyword = queryText;

  try {
    const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srsearch=${encodeURIComponent(cleanKeyword)}`;
    const headers = { 'User-Agent': 'EduShareBot/1.0 (https://edushare.edu.vn; support@edushare.edu.vn)' };

    const searchRes = await fetch(searchUrl, { headers });
    const searchData = await searchRes.json();
    const searchResults = searchData?.query?.search;

    if (searchResults && searchResults.length > 0) {
      let bestTitle = searchResults[0].title;
      const wikiUrl = `https://vi.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&redirects=1&origin=*&titles=${encodeURIComponent(bestTitle)}`;
      const wikiRes = await fetch(wikiUrl, { headers });
      const wikiData = await wikiRes.json();
      const pages = wikiData?.query?.pages;

      if (pages) {
        const pageId = Object.keys(pages)[0];
        if (pageId !== '-1' && pages[pageId].extract) {
          let extract = pages[pageId].extract.trim();
          if (extract.length > 700) extract = extract.substring(0, 700) + '...';
          return `💡 **Thông tin giải đáp về "${bestTitle}":**\n\n${extract}`;
        }
      }
    }
  } catch (err) {
    console.error("Lỗi Wiki fallback:", err);
  }

  return `🤖 **EduShare AI:** Rất tiếc tôi chưa tìm thấy thông tin chi tiết về từ khóa "${cleanKeyword}". Bạn có thể thử tìm kiếm tài liệu theo tên môn học trong thư viện EduShare nhé!`;
}

/* ==================== 1. API AI CHATBOT (HYBRID ENGINE) ==================== */

app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ reply: 'Vui lòng nhập câu hỏi!' });
  }

  // Tải danh sách tài liệu liên quan từ EduShare
  const queryLower = message.toLowerCase();
  const matchedDocs = documents.filter(d => 
    (d.title && queryLower.includes(d.title.toLowerCase())) ||
    (d.subject && queryLower.includes(d.subject.toLowerCase())) ||
    (d.category && queryLower.includes(d.category.toLowerCase()))
  );

  // Thử gọi Gemini AI
  try {
    if (GEMINI_API_KEY && !GEMINI_API_KEY.includes("YOUR_API_KEY")) {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemInstruction
      });

      const result = await model.generateContent(message);
      const responseText = result.response.text();

      if (responseText && responseText.trim().length > 0) {
        return res.json({ reply: responseText, matchedDocs: matchedDocs.slice(0, 5) });
      }
    }
  } catch (err) {
    console.log("⚠️ Gemini API bận hoặc cấu hình Key chưa sẵn sàng, tự động chuyển sang Wiki Engine...");
  }

  // Nếu Gemini chưa có Key hoặc bị lỗi -> Tự động dùng Fallback Engine
  const fallbackReply = await fetchWikiFallback(message);
  return res.json({ reply: fallbackReply, matchedDocs: matchedDocs.slice(0, 5) });
});

/* ==================== 2. API KHÁC GIỮ NGUYÊN ==================== */

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => (u.username === username || u.emailPhone === username) && u.password === password);
  if (user) res.json({ message: 'Đăng nhập thành công', user });
  else res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
});

app.post('/api/register', (req, res) => {
  const newUser = { id: String(Date.now()), ...req.body, status: 'approved', favorites: [] };
  users.push(newUser);
  res.json({ message: 'Đăng ký tài khoản thành công!' });
});

app.post('/api/forgot-password', (req, res) => {
  const { account, newPassword } = req.body;
  const user = users.find(u => u.username === account || u.emailPhone === account);
  if (user) {
    user.password = newPassword;
    res.json({ message: 'Đã cập nhật mật khẩu mới thành công!' });
  } else res.status(404).json({ message: 'Không tìm thấy tài khoản!' });
});

app.get('/api/users', (req, res) => res.json(users));
app.delete('/api/users/:id', (req, res) => {
  users = users.filter(u => String(u.id) !== String(req.params.id));
  res.json({ message: 'Đã xóa người dùng thành công.' });
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
    rating: Number(req.body.rating) || 5,
    content: req.body.content,
    createdAt: new Date().toLocaleString('vi-VN')
  };
  comments[docId].unshift(newComment);
  res.json({ message: 'Đã gửi bình luận!', comment: newComment });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 EduShare Server đang chạy tại: http://localhost:${PORT}`));