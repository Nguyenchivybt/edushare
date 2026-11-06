const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Mock In-Memory Databases
let files = [
    { id: 101, name: 'Giaotrinh_LapTrinh_Web_NodeJS.pdf', size: '2.4 MB', date: '05/11/2026' },
    { id: 102, name: 'BaiTap_UML_Design_Pattern.docx', size: '1.1 MB', date: '04/11/2026' }
];

let news = [
    { id: 201, title: 'Cập nhật công nghệ AI trong giáo dục đại học 2026', author: 'Admin', time: '10 phút trước' }
];

// --- AUTH ROUTES ---

// 1. Đăng ký
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin!' });
    }
    return res.json({ success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
});

// 2. Đăng nhập
app.post('/api/auth/login', (req, res) => {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email và Mật khẩu không được để trống!' });
    }
    return res.json({
        success: true,
        message: 'Đăng nhập thành công!',
        token: 'jwt_mock_token_edushare_2026',
        user: { email, name: email.split('@')[0] }
    });
});

// 3. Quên Mật Khẩu & Gửi OTP
app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập Email!' });
    }
    return res.json({ success: true, message: `Mã OTP đã được gửi đến email ${email}` });
});

// 4. Xác thực OTP
app.post('/api/auth/verify-otp', (req, res) => {
    const { otp } = req.body;
    if (!otp || otp.length < 6) {
        return res.status(400).json({ success: false, message: 'Mã OTP không hợp lệ!' });
    }
    return res.json({ success: true, message: 'Xác nhận mã OTP thành công!' });
});

// 5. Đặt lại Mật khẩu mới
app.post('/api/auth/reset-password', (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Mật khẩu phải từ 6 ký tự trở lên!' });
    }
    return res.json({ success: true, message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
});

// --- SEARCH & CONTENT ROUTES ---

// Search API
app.get('/api/search', (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    const matchedFiles = files.filter(f => f.name.toLowerCase().includes(query));
    const matchedNews = news.filter(n => n.title.toLowerCase().includes(query));
    
    return res.json({
        success: true,
        results: [
            ...matchedFiles.map(f => ({ ...f, type: 'Tệp tin' })),
            ...matchedNews.map(n => ({ ...n, type: 'Bài báo' }))
        ]
    });
});

// Delete File API
app.delete('/api/files/:id', (req, res) => {
    const id = parseInt(req.params.id);
    files = files.filter(f => f.id !== id);
    return res.json({ success: true, message: 'Đã xóa Tệp tin!' });
});

// Delete News API
app.delete('/api/news/:id', (req, res) => {
    const id = parseInt(req.params.id);
    news = news.filter(n => n.id !== id);
    return res.json({ success: true, message: 'Đã xóa bài báo!' });
});

// Fallback Route for Single Page Application
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`EduShare Server running on http://localhost:${PORT}`);
});
