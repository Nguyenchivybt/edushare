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
1. HIỂU BẢN CHẤT CÂU HỎI: Phân tích sâu sắc câu hỏi từ dễ đến khó ở mọi lĩnh vực (Xây dựng, Kiến trúc, CNTT, Lập trình, Triết học, Toán học, Lịch sử, Đời sống...).
2. TRẢ LỜI ĐÚNG TRỌNG TÂM & CHUYÊN SÂU: Trả lời ngắn gọn, logic, chuẩn xác học thuật, đi thẳng vào bản chất vấn đề.
3. TRUYỀN CẢM XÚC & TỰ NHIÊN: Văn phong chân thành, ấm áp như người thầy đồng hành. Tránh câu từ máy móc, lặp lại.
4. TRÌNH BÀY ĐẸP: Dùng định dạng Markdown (in đậm, danh sách, icon) rõ ràng, mạch lạc.
`;

// CẤU HÌNH MULTER LƯU TỆP DUNG LƯỢNG LỚN (ĐA TỆP & ẢNH/MEDIA)
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
  limits: { fileSize: 100 * 1024 * 1024 } // Giới hạn 100MB
});

function detectFileType(filename) {
  if (!filename) return 'TẬP TIN';
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) return 'HÌNH ẢNH';
  if (ext === '.pdf') return 'PDF';
  if (['.docx', '.doc'].includes(ext)) return 'DOCX';
  if (['.pptx', '.ppt'].includes(ext)) return 'PPTX';
  if (['.mp3', '.wav', '.m4a', '.aac', '.flac'].includes(ext)) return 'AUDIO';
  if (['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext)) return 'VIDEO';
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return 'ZIP/RAR';
  return 'TẬP TIN';
}

// DỮ LIỆU NỘI BỘ (MOCK DATABASE)
let users = [
  { id: '1', fullname: 'Nguyễn Chí Vỹ', username: 'admin', password: '123', role: 'admin', status: 'approved', emailPhone: 'nguyenchivytails@gmail.com', favorites: ['101'], expertise: 'Kỹ thuật phần mềm, Cơ sở dữ liệu, Lập trình Web' },
  { id: '2', fullname: 'TS. Nguyễn Văn Giảng', username: 'lecturer', password: '123', role: 'teacher', status: 'approved', emailPhone: 'giang.nv@mtu.edu.vn', favorites: [], expertise: 'Cấu trúc dữ liệu, Giải thuật, Trí tuệ nhân tạo' },
  { id: '3', fullname: 'Sinh Viên Mẫu', username: 'student', password: '123', role: 'student', status: 'approved', emailPhone: 'student@edushare.edu.vn', favorites: ['102'], expertise: 'Mạng máy tính, Lập trình C++' }
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
    likes: 15,
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
    likes: 9,
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
    views: 210,
    downloads: 65,
    likes: 28,
    date: '01/11/2026',
    isArticle: true,
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  }
];

let comments = {};

let chatGroups = [
  { id: 'g1', name: '📢 Thảo Luận Học Thuật Chung', description: 'Kênh trao đổi thắc mắc học tập toàn trường' },
  { id: 'g2', name: '💻 Nhóm Lập Trình & CNTT', description: 'Góc giải đáp C++, Web, Database & AI' }
];

let chatMessages = [
  { id: 'm1', targetType: 'group', targetId: 'g1', senderId: '2', senderName: 'TS. Nguyễn Văn Giảng', senderRole: 'teacher', text: 'Chào các bạn sinh viên! Có thắc mắc gì về bài giảng cứ trao đổi và gửi tệp/ảnh vào đây nhé.', fileUrl: '', fileType: '', fileName: '', time: '08:30' }
];

// TRA CỨU WIKIPEDIA DỰ PHÒNG
async function fetchWikiFallback(queryText) {
  let cleanKeyword = queryText
    .replace(/[.,?!:;""''`~()]/g, ' ')
    .replace(/\b(cho tui hỏi|cho tôi hỏi|cho hỏi|cho em hỏi|thầy ơi|bạn ơi|ad ơi|dạ|ạ|ơi|à|với|nè|nha|nhé|đi|z|vậy|giùm|hộ|cái|gì|là gì|thế nào|được không|giúp|cho biết|cho tui biết|là ai|trong lịch sử|trong|ai là)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanKeyword) cleanKeyword = queryText;

  try {
    const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srsearch=${encodeURIComponent(cleanKeyword)}`;
    const headers = { 'User-Agent': 'EduShareBot/1.0 (https://edushare.edu.vn)' };

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
          if (extract.length > 750) extract = extract.substring(0, 750) + '...';
          return `💡 **Thông tin giải đáp học thuật về "${bestTitle}":**\n\n${extract}`;
        }
      }
    }
  } catch (err) {
    console.error("Lỗi Wiki fallback:", err);
  }

  return `🤖 **EduShare AI:** Rất tiếc tôi chưa tìm thấy dữ liệu chi tiết về câu hỏi "${cleanKeyword}". Bạn có thể thử tra cứu thêm trong thư viện học liệu EduShare nhé!`;
}

/* ==================== 1. API AI CHATBOT ==================== */

app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ reply: 'Vui lòng nhập câu hỏi!' });
  }

  const queryLower = message.toLowerCase();
  const matchedDocs = documents.filter(d => 
    (d.title && queryLower.includes(d.title.toLowerCase())) ||
    (d.subject && queryLower.includes(d.subject.toLowerCase())) ||
    (d.category && queryLower.includes(d.category.toLowerCase()))
  );

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
    console.log("⚠️ Gemini API bận hoặc chưa có Key, tự động chuyển sang Wiki Engine...");
  }

  const fallbackReply = await fetchWikiFallback(message);
  return res.json({ reply: fallbackReply, matchedDocs: matchedDocs.slice(0, 5) });
});

/* ==================== 2. API CỘNG ĐỒNG CHAT & ĐÃ TỆP ==================== */

app.get('/api/chat/groups', (req, res) => res.json(chatGroups));

app.post('/api/chat/groups', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Tên nhóm không được trống!' });
  const newGroup = { id: 'g' + Date.now(), name, description: description || 'Nhóm thảo luận học tập' };
  chatGroups.push(newGroup);
  res.json({ message: 'Đã tạo nhóm trò chuyện!', group: newGroup });
});

app.get('/api/chat/messages', (req, res) => {
  const { targetType, targetId, userId } = req.query;
  let filtered = [];

  if (targetType === 'group') {
    filtered = chatMessages.filter(m => m.targetType === 'group' && String(m.targetId) === String(targetId));
  } else if (targetType === 'direct') {
    filtered = chatMessages.filter(m => 
      m.targetType === 'direct' && 
      ((String(m.senderId) === String(userId) && String(m.targetId) === String(targetId)) ||
       (String(m.senderId) === String(targetId) && String(m.targetId) === String(userId)))
    );
  }

  res.json(filtered);
});

// API GỬI TIN NHẮN CHAT KÈM TỆP/ẢNH/MEDIA
app.post('/api/chat/messages', upload.single('file'), (req, res) => {
  const { targetType, targetId, senderId, senderName, senderRole, text } = req.body;
  
  let fileUrl = '';
  let fileType = '';
  let fileName = '';

  if (req.file) {
    fileUrl = `/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
    fileType = detectFileType(req.file.originalname);
  }

  if (!text && !req.file) {
    return res.status(400).json({ message: 'Nội dung hoặc tệp đính kèm không được trống!' });
  }

  const newMsg = {
    id: 'm' + Date.now(),
    targetType,
    targetId: String(targetId),
    senderId: String(senderId),
    senderName,
    senderRole: senderRole || 'student',
    text: text ? text.trim() : '',
    fileUrl,
    fileType,
    fileName,
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };

  chatMessages.push(newMsg);
  res.json({ success: true, message: newMsg });
});

app.post('/api/chat/suggest-helpers', (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ helpers: [] });

  const qLower = question.toLowerCase();
  let suggested = users.filter(u => {
    if (u.role === 'teacher' || u.role === 'admin') return true;
    if (u.expertise && qLower.split(' ').some(word => word.length > 2 && u.expertise.toLowerCase().includes(word))) return true;
    return false;
  });

  if (suggested.length === 0) suggested = users.slice(0, 3);

  res.json({
    helpers: suggested.map(u => ({
      id: u.id,
      fullname: u.fullname,
      role: u.role === 'teacher' ? '👨‍🏫 Giảng viên' : (u.role === 'admin' ? '🛡️ Quản trị viên' : '🎓 Sinh viên Giỏi'),
      expertise: u.expertise || 'Chuyên gia hỗ trợ'
    }))
  });
});

/* ==================== 3. API AUTH & QUẢN LÝ USER ==================== */

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => (u.username === username || u.emailPhone === username) && u.password === password);
  if (user) res.json({ message: 'Đăng nhập thành công', user });
  else res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
});

app.post('/api/register', (req, res) => {
  const { username, emailPhone } = req.body;
  const existed = users.find(u => u.username === username || u.emailPhone === emailPhone);
  if (existed) {
    return res.status(400).json({ message: 'Tên đăng nhập hoặc Email/SĐT này đã tồn tại!' });
  }

  const newUser = { id: String(Date.now()), ...req.body, status: 'approved', favorites: [] };
  users.push(newUser);
  res.json({ message: 'Đăng ký tài khoản mới thành công! Hãy đăng nhập ngay.' });
});

// API QUÊN & CẤP LAI MẬT KHẨU TOÀN DIỆN
app.post('/api/forgot-password', (req, res) => {
  const { account, newPassword } = req.body;
  if (!account || !newPassword) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin!' });
  }

  const user = users.find(u => u.username === account || u.emailPhone === account);
  if (user) {
    user.password = newPassword;
    res.json({ success: true, message: '🎉 Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.' });
  } else {
    res.status(404).json({ message: '❌ Không tìm thấy tài khoản hoặc Email/SĐT trùng khớp trong hệ thống!' });
  }
});

app.get('/api/users', (req, res) => res.json(users));

app.put('/api/users/:id/role', (req, res) => {
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (user) {
    user.role = req.body.role || user.role;
    res.json({ message: 'Đã cập nhật vai trò!', user });
  } else res.status(404).json({ message: 'Không tìm thấy user!' });
});

app.delete('/api/users/:id', (req, res) => {
  users = users.filter(u => String(u.id) !== String(req.params.id));
  res.json({ message: 'Đã xóa người dùng thành công.' });
});

app.post('/api/users/favorites', (req, res) => {
  const { userId, docId } = req.body;
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });

  if (!user.favorites) user.favorites = [];
  const index = user.favorites.indexOf(String(docId));
  let isFavorite = false;

  if (index > -1) {
    user.favorites.splice(index, 1);
    isFavorite = false;
  } else {
    user.favorites.push(String(docId));
    isFavorite = true;
  }

  res.json({ 
    message: isFavorite ? '❤️ Đã thêm vào Album Yêu thích!' : '💔 Đã bỏ khỏi Album Yêu thích!',
    isFavorite,
    favorites: user.favorites 
  });
});

/* ==================== 4. API TÀI LIỆU & BÀI BÁO ==================== */

app.get('/api/documents', (req, res) => res.json(documents));

app.post('/api/documents', upload.single('file'), (req, res) => {
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  const detectedType = req.file ? detectFileType(req.file.originalname) : (req.body.type || 'PDF');
  const isArticle = req.body.category === 'Bài báo tiêu biểu';

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
    likes: 0,
    isArticle,
    date: new Date().toLocaleDateString('vi-VN'),
    url: fileUrl
  };
  documents.unshift(newDoc);
  res.json({ message: 'Tải lên tài liệu thành công!', document: newDoc });
});

app.delete('/api/documents/:id', (req, res) => {
  documents = documents.filter(d => String(d.id) !== String(req.params.id));
  delete comments[req.params.id];
  res.json({ message: 'Đã xóa tài liệu thành công.' });
});

app.post('/api/documents/:id/like', (req, res) => {
  const doc = documents.find(d => String(d.id) === String(req.params.id));
  if (doc) {
    doc.likes = (doc.likes || 0) + 1;
    res.json({ likes: doc.likes });
  } else res.status(404).json({ message: 'Không tìm thấy tài liệu!' });
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
    userRole: req.body.userRole || 'student',
    rating: Number(req.body.rating) || 5,
    content: req.body.content,
    createdAt: new Date().toLocaleString('vi-VN')
  };
  comments[docId].unshift(newComment);
  res.json({ message: 'Đã gửi bình luận!', comment: newComment });
});

app.delete('/api/documents/comments/:commentId', (req, res) => {
  const commentId = req.params.commentId;
  for (let docId in comments) {
    comments[docId] = comments[docId].filter(c => String(c.id) !== String(commentId));
  }
  res.json({ message: 'Đã xóa bình luận thành công.' });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 EduShare Server đang chạy tại: http://localhost:${PORT}`));