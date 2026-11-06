const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Express Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Mock Data Stores
let files = [
    { id: 101, name: 'Giaotrinh_LapTrinh_Web_NodeJS.pdf', size: '2.4 MB', date: '05/11/2026', owner: 'Giảng viên' },
    { id: 102, name: 'BaiTap_UML_Design_Pattern.docx', size: '1.1 MB', date: '04/11/2026', owner: 'Sinh viên' }
];

let news = [
    { id: 201, title: 'Cập nhật công nghệ AI trong giáo dục đại học 2026', author: 'Quản trị viên', time: '10 phút trước' }
];

let groups = [];

// Authentication Routes
app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Đăng ký thất bại. Vui lòng thử lại!' });
    }
    return res.json({ success: true, message: 'Đã đăng ký thành công!' });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Đăng nhập thất bại. Vui lòng thử lại!' });
    }
    return res.json({
        success: true,
        message: 'Đã đăng nhập thành công!',
        user: { name: email.split('@')[0], email, role: 'Giảng viên' }
    });
});

app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Đăng nhập thất bại. Vui lòng thử lại!' });
    }
    return res.json({ success: true, message: `Mã OTP đã gửi về ${email}` });
});

// Academic Group Routes
app.post('/api/groups', (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'Tạo nhóm thất bại, vui lòng thử lại!' });
    }
    const newGroup = { id: Date.now(), name, description };
    groups.push(newGroup);
    return res.json({ success: true, message: 'Đã tạo nhóm thành công!', group: newGroup });
});

// File Management Routes
app.delete('/api/files/:id', (req, res) => {
    const id = parseInt(req.params.id);
    files = files.filter(f => f.id !== id);
    return res.json({ success: true, message: 'Đã xóa Tệp tin!' });
});

app.delete('/api/news/:id', (req, res) => {
    const id = parseInt(req.params.id);
    news = news.filter(n => n.id !== id);
    return res.json({ success: true, message: 'Đã xóa bài báo!' });
});

// SPA Fallback Route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`EduShare Server running on port ${PORT}`);
});
