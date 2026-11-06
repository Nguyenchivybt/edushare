const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cơ sở dữ liệu mẫu trong bộ nhớ
let documents = [
  {
    id: 1,
    title: "Nghiên cứu mô hình AI nhận diện khuôn mặt sinh viên MTU",
    author: "Nguyễn Chí Vỹ",
    category: "Bài báo khoa học",
    department: "Khoa CNTT - Miền Tây",
    year: 2026,
    likes: 42,
    isLiked: false,
    views: 1280,
    downloads: 350,
    summary: "Ứng dụng thuật toán Computer Vision & Deep Learning trong tự động hóa điểm danh sinh viên."
  },
  {
    id: 2,
    title: "Ứng dụng vật liệu xanh trong xây dựng công trình Miền Tây",
    author: "Khoa Xây Dựng MTU",
    category: "Bài báo khoa học",
    department: "Khoa Xây Dựng",
    year: 2026,
    likes: 38,
    isLiked: false,
    views: 950,
    downloads: 210,
    summary: "Nghiên cứu phát triển bê tông nhẹ và nguyên liệu tái chế thích ứng biến đổi khí hậu ĐBSCL."
  },
  {
    id: 3,
    title: "Giáo trình Cấu trúc dữ liệu và Giải thuật chuẩn MTU",
    author: "Thầy Điền Việt Đức",
    category: "Bài giảng",
    department: "Bộ môn Phần mềm",
    year: 2025,
    likes: 85,
    isLiked: true,
    views: 3400,
    downloads: 1120,
    summary: "Tổng hợp toàn bộ lý thuyết cây nhị phân, đồ thị và các bài tập thực hành C++/Java."
  },
  {
    id: 4,
    title: "Bộ Đề thi mẫu & Đáp án chi tiết môn Kiến trúc Máy tính",
    author: "Bộ môn Hệ thống máy tính",
    category: "Đề thi mẫu",
    department: "Khoa CNTT",
    year: 2026,
    likes: 64,
    isLiked: false,
    views: 2100,
    downloads: 890,
    summary: "Ngân hàng câu hỏi ôn tập x86 Assembly và các dạng bài tập phân vùng bộ nhớ ảo."
  }
];

// Số người dùng Online hiện tại
let onlineCount = 128;

// API: Lấy danh sách tài liệu
app.get('/api/documents', (req, res) => {
  const { category, search } = req.query;
  let result = [...documents];
  
  if (category && category !== 'Tất cả') {
    result = result.filter(d => d.category === category);
  }
  
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(d => 
      d.title.toLowerCase().includes(q) || 
      d.author.toLowerCase().includes(q) ||
      d.summary.toLowerCase().includes(q)
    );
  }
  
  res.json({ success: true, count: result.length, data: result, onlineUsers: onlineCount });
});

// API: Toggle Nút Like (Bấm 1 lần thích, bấm 1 lần nữa thu hồi)
app.post('/api/documents/:id/like', (req, res) => {
  const docId = parseInt(req.params.id);
  const doc = documents.find(d => d.id === docId);
  
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Tài liệu không tồn tại' });
  }
  
  // Đảo trạng thái Like / Thu hồi Like
  doc.isLiked = !doc.isLiked;
  if (doc.isLiked) {
    doc.likes += 1;
  } else {
    doc.likes = Math.max(0, doc.likes - 1);
  }
  
  res.json({
    success: true,
    id: doc.id,
    isLiked: doc.isLiked,
    likes: doc.likes,
    message: doc.isLiked ? 'Đã thích tài liệu!' : 'Đã thu hồi lượt thích!'
  });
});

// API: Gợi ý tìm kiếm nội dung (Auto-suggestions)
app.get('/api/suggestions', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  if (!query) {
    return res.json({ suggestions: [] });
  }
  
  const suggestions = [];
  documents.forEach(doc => {
    if (doc.title.toLowerCase().includes(query)) {
      suggestions.push({ type: 'Tài liệu', title: doc.title, id: doc.id });
    }
    if (doc.author.toLowerCase().includes(query) && !suggestions.some(s => s.title === doc.author)) {
      suggestions.push({ type: 'Tác giả', title: doc.author, id: doc.id });
    }
    if (doc.category.toLowerCase().includes(query) && !suggestions.some(s => s.title === doc.category)) {
      suggestions.push({ type: 'Danh mục', title: doc.category, id: doc.id });
    }
  });
  
  res.json({ suggestions: suggestions.slice(0, 6) });
});

// Trả về trang chủ index.html cho các route còn lại
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server EduShare đang chạy tại http://localhost:${PORT}`);
});
