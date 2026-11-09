/**
 * EduShare - Kho Tài Liệu Tri Thức | Thư Viện Học Liệu MTU
 * Backend Server Application (Node.js + Express)
 * Tác giả phát triển: Nguyễn Chí Vỹ
 * Đơn vị đồng hành: Trường Đại học Xây dựng Miền Tây (MTU)
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Cấu hình Ứng dụng Express
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Phục vụ các tệp tĩnh
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use(express.static('public'));
app.use('/uploads', express.static(uploadDir));

// 2. Cấu hình Multer Tải Đa Tệp (PDF, Word, Slide, Image, Audio, Video)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Giới hạn 100MB
    fileFilter: (req, file, cb) => {
        const allowedExtensions = /\.(pdf|doc|docx|ppt|pptx|txt|jpg|jpeg|png|mp3|wav|mp4|avi|mkv)$/i;
        if (!file.originalname.match(allowedExtensions)) {
            return cb(new Error('Định dạng tệp không được hỗ trợ!'), false);
        }
        cb(null, true);
    }
});

// 3. Khởi tạo Google Gemini AI Engine
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 4. Cơ sở Dữ liệu Đệm (In-memory Storage)
const db = {
    users: [
        {
            id: "user-1",
            fullName: "Nguyễn Chí Vỹ",
            gender: "Nam",
            email: "nguyenchivy@mtu.edu.vn",
            phone: "0862204069",
            school: "Trường Đại học Xây dựng Miền Tây",
            faculty: "Khoa Kỹ thuật Phần mềm",
            academicYear: "K2024",
            major: "Kỹ thuật Phần mềm",
            className: "DHKTPM24",
            role: "STUDENT", // STUDENT | TEACHER | ADMIN
            avatarUrl: "https://ui-avatars.com/api/?name=Nguyen+Chi+Vy&background=4f46e5&color=fff",
            status: "online",
            createdAt: new Date().toISOString()
        }
    ],
    documents: [
        {
            id: 1,
            title: "Giáo trình Kiến trúc Máy tính & Hệ điều hành Linux MTU",
            category: "ACADEMIC",
            subject: "Hệ điều hành",
            school: "MTU",
            faculty: "KTPM",
            major: "SE",
            academicYear: "K2024",
            className: "DHKTPM24",
            description: "Tài liệu giảng dạy chuyên ngành KTPM. Bao gồm lý thuyết tiến trình, quản lý bộ nhớ RAM và thực hành Bash Shell.",
            fileUrl: "/uploads/sample-linux-course.pdf",
            fileType: "pdf",
            authorId: "user-1",
            authorName: "Nguyễn Chí Vỹ",
            authorRole: "STUDENT",
            likes: 42,
            likedBy: [],
            favorites: [],
            views: 1420,
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            title: "Bài tập mẫu Phân tích & Thiết kế Hệ thống UML với SAP PowerDesigner",
            category: "EXERCISE",
            subject: "Cơ sở dữ liệu",
            school: "MTU",
            faculty: "KTPM",
            major: "SE",
            academicYear: "K2024",
            className: "DHKTPM24",
            description: "Tổng hợp Use Case, Sequence Diagram và Class Diagram dự án Quản lý Thư viện Học liệu số.",
            fileUrl: "/uploads/sample-uml-exercise.docx",
            fileType: "docx",
            authorId: "user-1",
            authorName: "Nguyễn Chí Vỹ",
            authorRole: "STUDENT",
            likes: 89,
            likedBy: [],
            favorites: ["user-1"],
            views: 856,
            createdAt: new Date().toISOString()
        }
    ],
    comments: [
        {
            id: "cmt-1",
            documentId: 1,
            authorName: "Sinh viên MTU",
            text: "Tài liệu rất chi tiết, cảm ơn tác giả đã chia sẻ!",
            createdAt: new Date().toISOString()
        }
    ],
    groups: [
        {
            id: "group-1",
            name: "KTPM K24 MTU",
            scope: "CLASS",
            membersCount: 128,
            createdBy: "user-1"
        },
        {
            id: "group-2",
            name: "Nghiên cứu CNTT MTU",
            scope: "RESEARCH",
            membersCount: 45,
            createdBy: "user-1"
        }
    ],
    chatMessages: []
};

// Bộ lưu trữ OTP quên mật khẩu có đếm ngược
const otpStore = new Map();

// 5. Middleware Phân quyền NGUỜI DÙNG (RBAC - Role-based Access Control)
function authorizeRole(allowedRoles = []) {
    return (req, res, next) => {
        const userRole = req.headers['x-user-role'] || 'GUEST';
        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền thực hiện thao tác này!"
            });
        }
        next();
    };
}

// Validation Email Trường @mtu.edu.vn
function validateMtuEmail(email) {
    return email && email.trim().toLowerCase().endsWith('@mtu.edu.vn');
}

// ==========================================
// 6. CÁC API XÁC THỰC (AUTHENTICATION API)
// ==========================================

// 6.1 API Đăng ký Tài khoản
app.post('/api/auth/register', (req, res) => {
    try {
        const { fullName, gender, dob, email, phone, school, faculty, academicYear, major, className, password, confirmPassword, role } = req.body;

        // Ràng buộc 1: Validation Email trường @mtu.edu.vn
        if (!validateMtuEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Email đăng ký phải có đuôi trường @mtu.edu.vn"
            });
        }

        // Ràng buộc 2: Mật khẩu xác nhận phải trùng khớp
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu xác nhận không trùng khớp!"
            });
        }

        // Ràng buộc 3: Kiểm tra trùng lặp (Email hoặc SĐT)
        const existedUser = db.users.find(u => u.email === email || u.phone === phone);
        if (existedUser) {
            return res.status(400).json({
                success: false,
                message: "Email hoặc Số điện thoại này đã được đăng ký trên hệ thống!"
            });
        }

        // Tạo người dùng mới
        const newUser = {
            id: `user-${Date.now()}`,
            fullName,
            gender: gender || "Nam",
            dob,
            email,
            phone,
            school: school || "Trường Đại học Xây dựng Miền Tây",
            faculty: faculty || "Khoa Kỹ thuật Phần mềm",
            academicYear: academicYear || "K2024",
            major: major || "Kỹ thuật Phần mềm",
            className: className || "DHKTPM24",
            role: role || "STUDENT",
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4f46e5&color=fff`,
            status: "online",
            createdAt: new Date().toISOString()
        };

        db.users.push(newUser);

        return res.status(201).json({
            success: true,
            message: "Đã đăng ký thành công!",
            user: newUser
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Đăng ký thất bại. Vui lòng thử lại!" });
    }
});

// 6.2 API Đăng nhập
app.post('/api/auth/login', (req, res) => {
    const { identity, password } = req.body;

    const user = db.users.find(u => u.email === identity || u.phone === identity || u.fullName === identity);
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Đăng nhập thất bại. Vui lòng thử lại!"
        });
    }

    return res.json({
        success: true,
        message: "Đã đăng nhập thành công!",
        token: `mock-jwt-token-${user.id}`,
        user: user
    });
});

// 6.3 API Đăng nhập Mạng xã hội (Google / Facebook)
app.post('/api/auth/social-login', (req, res) => {
    const { provider, socialId, name, email } = req.body;
    let user = db.users.find(u => u.email === email);

    if (!user) {
        user = {
            id: `user-social-${Date.now()}`,
            fullName: name || `${provider} User`,
            email: email || `user_${socialId}@mtu.edu.vn`,
            role: "STUDENT",
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0d9488&color=fff`,
            status: "online",
            createdAt: new Date().toISOString()
        };
        db.users.push(user);
    }

    return res.json({
        success: true,
        message: `Đã đăng nhập thành công qua ${provider}!`,
        user
    });
});

// 6.4 Luồng Quên Mật Khẩu - Yêu cầu Mã OTP (Có đếm ngược 60 giây)
app.post('/api/auth/forgot-password/request-otp', (req, res) => {
    const { identity } = req.body;

    if (!identity) {
        return res.status(400).json({
            success: false,
            message: "Sai cú pháp hoặc thông tin không tồn tại"
        });
    }

    const user = db.users.find(u => u.email === identity || u.phone === identity);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: "Sai cú pháp hoặc thông tin không tồn tại"
        });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 60 * 1000; // Hết hạn sau 60 giây

    otpStore.set(identity, { code: otpCode, expiresAt });

    return res.json({
        success: true,
        message: "Mã OTP đã được gửi thành công!",
        otpDemo: otpCode, // Demo hiển thị
        expiresSec: 60
    });
});

// 6.5 Luồng Quên Mật Khẩu - Xác nhận OTP & Đổi mật khẩu
app.post('/api/auth/forgot-password/verify', (req, res) => {
    const { identity, otp, newPassword, confirmPassword } = req.body;

    const record = otpStore.get(identity);
    if (!record || record.expiresAt < Date.now() || record.code !== otp) {
        return res.status(400).json({
            success: false,
            message: "Mã OTP không hợp lệ hoặc đã hết hạn!"
        });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: "Mật khẩu mới không trùng khớp!"
        });
    }

    otpStore.delete(identity);
    return res.json({
        success: true,
        message: "Cập nhật mật khẩu thành công!"
    });
});


// ==========================================
// 7. CÁC API QUẢN LÝ TÀI LIỆU (DOCUMENTS API)
// ==========================================

// 7.1 Lấy danh sách Tài liệu + Lọc phễu 6 cấp
app.get('/api/documents', (req, res) => {
    let { school, faculty, major, academicYear, className, subject, category, q } = req.query;
    let list = [...db.documents];

    if (school && school !== 'ALL') list = list.filter(d => d.school === school);
    if (faculty && faculty !== 'ALL') list = list.filter(d => d.faculty === faculty);
    if (major && major !== 'ALL') list = list.filter(d => d.major === major);
    if (academicYear && academicYear !== 'ALL') list = list.filter(d => d.academicYear === academicYear);
    if (className && className !== 'ALL') list = list.filter(d => d.className === className);
    if (subject && subject !== 'ALL') list = list.filter(d => d.subject === subject);
    if (category && category !== 'ALL') list = list.filter(d => d.category === category);

    if (q) {
        const keyword = q.toLowerCase();
        list = list.filter(d => d.title.toLowerCase().includes(keyword) || d.description.toLowerCase().includes(keyword));
    }

    return res.json({ success: true, count: list.length, data: list });
});

// 7.2 Đăng Học liệu mới (Tải hàng loạt / Đa tệp)
app.post('/api/documents', upload.array('files', 10), (req, res) => {
    try {
        const { title, category, subject, description, externalLink, school, faculty, major, academicYear, className, authorId, authorName, authorRole } = req.body;

        const uploadedFiles = req.files || [];
        const fileUrls = uploadedFiles.map(f => `/uploads/${f.filename}`);

        const newDoc = {
            id: db.documents.length + 1,
            title,
            category: category || "ACADEMIC",
            subject: subject || "Chung",
            school: school || "MTU",
            faculty: faculty || "KTPM",
            major: major || "SE",
            academicYear: academicYear || "K2024",
            className: className || "DHKTPM24",
            description: description || "",
            fileUrl: fileUrls[0] || externalLink || "",
            additionalFiles: fileUrls,
            externalLink: externalLink || "",
            authorId: authorId || "user-1",
            authorName: authorName || "Nguyễn Chí Vỹ",
            authorRole: authorRole || "STUDENT",
            likes: 0,
            likedBy: [],
            favorites: [],
            views: 0,
            createdAt: new Date().toISOString()
        };

        db.documents.unshift(newDoc);

        return res.status(201).json({
            success: true,
            message: "Tải tệp thành công!",
            data: newDoc
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Tải tệp thất bại. Vui lòng thử lại sau!"
        });
    }
});

// 7.3 Thích / Hủy thích Tài liệu
app.post('/api/documents/:id/like', (req, res) => {
    const docId = parseInt(req.params.id);
    const { userId } = req.body;
    const doc = db.documents.find(d => d.id === docId);

    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu!" });

    const index = doc.likedBy.indexOf(userId);
    if (index === -1) {
        doc.likedBy.push(userId);
        doc.likes += 1;
    } else {
        doc.likedBy.splice(index, 1);
        doc.likes -= 1;
    }

    return res.json({ success: true, likes: doc.likes, isLiked: index === -1 });
});

// 7.4 Xóa Tài liệu (Kiểm tra Phân quyền RBAC)
app.delete('/api/documents/:id', authorizeRole(['STUDENT', 'TEACHER', 'ADMIN']), (req, res) => {
    const docId = parseInt(req.params.id);
    const index = db.documents.findIndex(d => d.id === docId);

    if (index === -1) {
        return res.status(404).json({ success: false, message: "Tài liệu không tồn tại!" });
    }

    db.documents.splice(index, 1);
    return res.json({ success: true, message: "Đã xóa Tệp tin!" });
});


// ==========================================
// 8. CÁC API NHÓM & CỘNG ĐỒNG (COMMUNITY API)
// ==========================================

// 8.1 Lấy danh sách nhóm
app.get('/api/groups', (req, res) => {
    return res.json({ success: true, data: db.groups });
});

// 8.2 Tạo nhóm mới
app.post('/api/groups', (req, res) => {
    const { name, scope, createdBy } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: "Tạo nhóm thất bại, vui lòng thử lại!" });
    }

    const newGroup = {
        id: `group-${Date.now()}`,
        name,
        scope: scope || "CLASS",
        membersCount: 1,
        createdBy: createdBy || "user-1"
    };

    db.groups.push(newGroup);
    return res.status(201).json({
        success: true,
        message: "Đã tạo nhóm thành công!",
        data: newGroup
    });
});


// ==========================================
// 9. API INTEGRATION GOOGLE GEMINI AI
// ==========================================

app.post('/api/ai/chat', upload.single('file'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const uploadedFile = req.file;

        let aiResponseText = "";

        if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
            aiResponseText = `[Trợ Lý AI EduShare] Phân tích cho yêu cầu: "${prompt || 'Phân tích tài liệu'}". Hệ thống đã ghi nhận tệp học liệu ${uploadedFile ? uploadedFile.originalname : ''}.`;
        } else {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt || "Tóm tắt nội dung tài liệu học thuật này.");
            const response = await result.response;
            aiResponseText = response.text();
        }

        return res.json({
            success: true,
            reply: aiResponseText
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Hệ thống AI xử lý thất bại, vui lòng thử lại sau!",
            error: error.message
        });
    }
});


// ==========================================
// 10. SEO & SITEMAP ROUTES
// ==========================================

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send("User-agent: *\nAllow: /\nSitemap: https://edushare.mtu.edu.vn/sitemap.xml");
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://edushare.mtu.edu.vn/</loc>
    <lastmod>2026-11-09</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`);
});


// 11. Khởi chạy Server
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`EduShare Backend Server is running on port ${PORT}`);
    console.log(`Author: Nguyễn Chí Vỹ - Trường ĐH Xây dựng Miền Tây (MTU)`);
    console.log(`==================================================`);
});