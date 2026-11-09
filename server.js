/**
 * EduShare - Kho Tài Liệu Tri Thức | Thư Viện Học Liệu Số MTU
 * Backend Server (Node.js + Express)
 * Tác giả: Nguyễn Chí Vỹ | Trường ĐH Xây dựng Miền Tây (MTU)
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Phục vụ tĩnh thư mục public
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// Cấu hình Multer tải tệp
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 100 * 1024 * 1024 } });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str.trim();
}

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
            role: "STUDENT",
            avatarUrl: "https://ui-avatars.com/api/?name=Nguyen+Chi+Vy&background=4f46e5&color=fff",
            status: "online"
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
            description: "Tài liệu giảng dạy chuyên ngành KTPM. Bao gồm lý thuyết tiến trình, bộ nhớ RAM và Bash Shell.",
            fileUrl: "/uploads/sample-linux.pdf",
            authorId: "user-1",
            authorName: "Nguyễn Chí Vỹ",
            authorRole: "STUDENT",
            likes: 42,
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
            fileUrl: "/uploads/sample-uml.docx",
            authorId: "user-1",
            authorName: "Nguyễn Chí Vỹ",
            authorRole: "STUDENT",
            likes: 89,
            views: 856,
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            title: "Bài báo NCKH: Ứng dụng Trí tuệ nhân tạo trong xử lý ảnh đô thị",
            category: "ARTICLE",
            subject: "Cơ sở dữ liệu",
            school: "MTU",
            faculty: "KTPM",
            major: "SE",
            academicYear: "K2024",
            className: "DHKTPM24",
            description: "Công trình nghiên cứu ứng dụng AI phân tích hình ảnh giao thông tại vùng ĐBSCL.",
            fileUrl: "/uploads/sample-article.pdf",
            authorId: "user-2",
            authorName: "Giảng viên MTU",
            authorRole: "TEACHER",
            likes: 62,
            views: 1120,
            createdAt: new Date().toISOString()
        }
    ],
    groups: [
        { id: "group-1", name: "KTPM K24 MTU", membersCount: 128, status: "JOINED", desc: "Nhóm học thuật thảo luận bài tập & đề thi MTU." },
        { id: "group-2", name: "Nghiên cứu CNTT MTU", membersCount: 45, status: "PENDING", desc: "Cộng đồng nghiên cứu phát triển học thuật." },
        { id: "group-3", name: "Đồ án Tốt nghiệp KTPM 2026", membersCount: 32, status: "SUGGESTED", desc: "Nhóm trao đổi kinh nghiệm làm đồ án tốt nghiệp." }
    ],
    groupMessages: {
        "group-1": [
            { sender: "Giảng viên MTU", text: "Chào các em, đã có lịch nộp bài tập lớn môn Hệ điều hành nhé!", time: "08:30" },
            { sender: "Nguyễn Chí Vỹ", text: "Dạ thưa thầy, bọn em nộp tệp PDF lên EduShare đúng không ạ?", time: "08:32" }
        ]
    }
};

const otpStore = new Map();

// API Auth Register (Fix triệt để giữ nguyên vai trò TEACHER / ADMIN)
app.post('/api/auth/register', (req, res) => {
    try {
        const { fullName, gender, dob, email, phone, school, faculty, academicYear, major, className, password, confirmPassword, role } = req.body;

        const isDomainValid = email && (email.toLowerCase().endsWith('@mtu.edu.vn') || email.toLowerCase().endsWith('@muce.edu.vn'));
        if (!isDomainValid) {
            return res.status(400).json({ success: false, message: "Email đăng ký phải có đuôi trường @mtu.edu.vn hoặc @muce.edu.vn" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Mật khẩu xác nhận không trùng khớp!" });
        }

        const existed = db.users.find(u => u.email === email || u.phone === phone);
        if (existed) {
            return res.status(400).json({ success: false, message: "Email hoặc Số điện thoại đã tồn tại trong hệ thống!" });
        }

        const assignedRole = (role && ['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) ? role : 'STUDENT';

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
            role: assignedRole,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4f46e5&color=fff`,
            status: "online"
        };

        db.users.push(newUser);
        return res.status(201).json({ success: true, message: "Đã đăng ký thành công!", user: newUser });
    } catch (e) {
        return res.status(500).json({ success: false, message: "Đăng ký thất bại. Vui lòng thử lại!" });
    }
});

// API Auth Login
app.post('/api/auth/login', (req, res) => {
    const { identity } = req.body;
    const user = db.users.find(u => u.email === identity || u.phone === identity || u.fullName === identity);
    if (!user) {
        return res.status(401).json({ success: false, message: "Đăng nhập thất bại. Vui lòng thử lại!" });
    }
    return res.json({ success: true, message: "Đã đăng nhập thành công!", user });
});

// API Forgot Password OTP
app.post('/api/auth/forgot-password/request-otp', (req, res) => {
    const { identity } = req.body;
    if (!identity) {
        return res.status(400).json({ success: false, message: "Sai cú pháp hoặc thông tin không tồn tại" });
    }
    const user = db.users.find(u => u.email === identity || u.phone === identity);
    if (!user) {
        return res.status(404).json({ success: false, message: "Sai cú pháp hoặc thông tin không tồn tại" });
    }
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(identity, { code: otpCode, expiresAt: Date.now() + 60000 });
    return res.json({ success: true, message: "Mã OTP đã được gửi thành công!", otpDemo: otpCode, expiresSec: 60 });
});

// API Documents Search (Fuzzy search không dấu)
app.get('/api/documents', (req, res) => {
    let { q, category, school, faculty, major, academicYear, className, subject } = req.query;
    let list = [...db.documents];

    if (school && school !== 'ALL') list = list.filter(d => d.school === school);
    if (faculty && faculty !== 'ALL') list = list.filter(d => d.faculty === faculty);
    if (major && major !== 'ALL') list = list.filter(d => d.major === major);
    if (academicYear && academicYear !== 'ALL') list = list.filter(d => d.academicYear === academicYear);
    if (className && className !== 'ALL') list = list.filter(d => d.className === className);
    if (subject && subject !== 'ALL') list = list.filter(d => d.subject === subject);
    if (category && category !== 'ALL') list = list.filter(d => d.category === category);

    if (q) {
        const queryNorm = removeVietnameseTones(q);
        const keywords = queryNorm.split(' ').filter(k => k);
        list = list.filter(d => {
            const titleNorm = removeVietnameseTones(d.title);
            const descNorm = removeVietnameseTones(d.description);
            const subjectNorm = removeVietnameseTones(d.subject);
            const authorNorm = removeVietnameseTones(d.authorName);
            const fullText = `${titleNorm} ${descNorm} ${subjectNorm} ${authorNorm}`;
            return keywords.some(kw => fullText.includes(kw));
        });
    }

    return res.json({ success: true, count: list.length, data: list });
});

// API Upload Document
app.post('/api/documents', upload.array('files', 10), (req, res) => {
    try {
        const { title, category, subject, description, school, faculty, major, academicYear, className, authorId, authorName, authorRole } = req.body;
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
            fileUrl: fileUrls[0] || "",
            authorId: authorId || "user-1",
            authorName: authorName || "Nguyễn Chí Vỹ",
            authorRole: authorRole || "STUDENT",
            likes: 0,
            views: 1,
            createdAt: new Date().toISOString()
        };

        db.documents.unshift(newDoc);
        return res.status(201).json({ success: true, message: "Tải tệp thành công!", data: newDoc });
    } catch (e) {
        return res.status(500).json({ success: false, message: "Tải tệp thất bại. Vui lòng thử lại sau!" });
    }
});

// API Delete Document
app.delete('/api/documents/:id', (req, res) => {
    const docId = parseInt(req.params.id);
    const index = db.documents.findIndex(d => d.id === docId);
    if (index === -1) return res.status(404).json({ success: false, message: "Tài liệu không tồn tại!" });
    db.documents.splice(index, 1);
    return res.json({ success: true, message: "Đã xóa Tệp tin!" });
});

// API AI Gemini Engine
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        const normPrompt = removeVietnameseTones(prompt || '');

        const matchedDocs = db.documents.filter(d => {
            const titleNorm = removeVietnameseTones(d.title);
            const descNorm = removeVietnameseTones(d.description);
            return normPrompt.split(' ').some(kw => kw.length > 1 && (titleNorm.includes(kw) || descNorm.includes(kw)));
        });

        let aiReply = "";
        if (matchedDocs.length > 0) {
            aiReply = `[EduShare AI Engine] Tìm thấy ${matchedDocs.length} tài liệu phù hợp:\n` +
                matchedDocs.map(d => `- **${d.title}** (Môn: ${d.subject} | Tác giả: ${d.authorName})`).join('\n');
        } else {
            if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
                aiReply = `[EduShare AI Engine] Xin chào! Tôi ghi nhận câu hỏi: "${prompt}". Bạn có thể tra cứu thêm các giáo trình Kiến trúc máy tính & Hệ điều hành Linux MTU.`;
            } else {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(prompt);
                aiReply = result.response.text();
            }
        }
        return res.json({ success: true, reply: aiReply });
    } catch (e) {
        return res.status(500).json({ success: false, message: "AI Engine gặp sự cố!", error: e.message });
    }
});

// API Group Chat
app.get('/api/groups', (req, res) => res.json({ success: true, data: db.groups }));

app.post('/api/groups', (req, res) => {
    const { name, desc } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Tạo nhóm thất bại, vui lòng thử lại!" });
    const newGroup = { id: `group-${Date.now()}`, name, membersCount: 1, status: "JOINED", desc: desc || "Nhóm mới tạo." };
    db.groups.unshift(newGroup);
    db.groupMessages[newGroup.id] = [{ sender: "Hệ thống", text: `Nhóm ${name} đã được khởi tạo.`, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }];
    return res.status(201).json({ success: true, message: "Đã tạo nhóm thành công!", data: newGroup });
});

app.get('/api/groups/:id/messages', (req, res) => {
    const msgs = db.groupMessages[req.params.id] || [];
    return res.json({ success: true, data: msgs });
});

app.post('/api/groups/:id/messages', (req, res) => {
    const { sender, text } = req.body;
    if (!db.groupMessages[req.params.id]) db.groupMessages[req.params.id] = [];
    const newMsg = { sender: sender || "Sinh viên", text, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    db.groupMessages[req.params.id].push(newMsg);
    return res.json({ success: true, data: newMsg });
});

app.listen(PORT, () => {
    console.log(`EduShare Server running on port ${PORT}`);
});