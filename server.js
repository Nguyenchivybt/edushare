/**
 * EduShare Backend Server (Node.js + Express)
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
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

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
            dob: "2006-01-06",
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
        },
        {
            id: "user-teacher",
            fullName: "Thầy Điền Việt Đức",
            gender: "Nam",
            dob: "1988-11-20",
            email: "dienvietduc@mtu.edu.vn",
            phone: "0912345678",
            school: "Trường Đại học Xây dựng Miền Tây",
            faculty: "Khoa Kỹ thuật Phần mềm",
            academicYear: "K2024",
            major: "Kỹ thuật Phần mềm",
            className: "DHKTPM24",
            role: "TEACHER",
            avatarUrl: "https://ui-avatars.com/api/?name=Dien+Viet+Duc&background=0284c7&color=fff",
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
            description: "Tài liệu giảng dạy chính thức dành cho Sinh viên KTPM MTU. Bao gồm lý thuyết Tiến trình, Quản lý bộ nhớ và Bash Shell.",
            fileUrl: "/uploads/sample-linux.pdf",
            authorId: "user-teacher",
            authorName: "Thầy Điền Việt Đức",
            authorRole: "TEACHER",
            likes: 124,
            dislikes: 2,
            views: 1420,
            comments: [
                { author: "Nguyễn Chí Vỹ", text: "Tài liệu rất chi tiết và bổ ích thưa thầy!", time: "10:15" }
            ],
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
            description: "Tổng hợp Sơ đồ Use Case, Sequence Diagram và Class Diagram mẫu dự án Thư viện Học liệu số.",
            fileUrl: "/uploads/sample-uml.docx",
            authorId: "user-1",
            authorName: "Nguyễn Chí Vỹ",
            authorRole: "STUDENT",
            likes: 89,
            dislikes: 1,
            views: 856,
            comments: [],
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            title: "Bài báo NCKH: Ứng dụng Trí tuệ nhân tạo trong xử lý ảnh đô thị tại ĐBSCL",
            category: "ARTICLE",
            subject: "Cơ sở dữ liệu",
            school: "MTU",
            faculty: "KTPM",
            major: "SE",
            academicYear: "K2024",
            className: "DHKTPM24",
            description: "Công trình nghiên cứu khoa học cấp trường về mô hình AI nhận diện phương tiện giao thông.",
            fileUrl: "/uploads/sample-article.pdf",
            authorId: "user-teacher",
            authorName: "Thầy Điền Việt Đức",
            authorRole: "TEACHER",
            likes: 74,
            dislikes: 0,
            views: 1120,
            comments: [],
            createdAt: new Date().toISOString()
        }
    ],
    groups: [
        { id: "group-global", name: "Kênh Trò Chuyện Chung (Tất Cả Tài Khoản)", membersCount: 520, status: "JOINED", desc: "Kênh trao đổi học thuật tự do giữa Giảng viên và Sinh viên toàn trường." },
        { id: "group-1", name: "KTPM K24 MTU", membersCount: 128, status: "JOINED", desc: "Cộng đồng trao đổi bài tập và đề thi MTU." },
        { id: "group-2", name: "Nghiên cứu CNTT MTU", membersCount: 45, status: "PENDING", desc: "Nhóm nghiên cứu khoa học giảng viên & sinh viên." },
        { id: "group-3", name: "Đồ án Tốt nghiệp KTPM 2026", membersCount: 32, status: "SUGGESTED", desc: "Nhóm hướng dẫn làm đồ án phần mềm chuẩn." }
    ],
    groupMessages: {
        "group-global": [
            { sender: "Hệ thống EduShare", role: "ADMIN", text: "Chào mừng các bạn đến với Kênh Trò Chuyện Chung MTU!", files: [], time: "08:00" },
            { sender: "Thầy Điền Việt Đức", role: "TEACHER", text: "Chào các em, chúc các em học tập tốt và tích cực chia sẻ học liệu nhé!", files: [], time: "08:10" }
        ],
        "group-1": [
            { sender: "Thầy Điền Việt Đức", role: "TEACHER", text: "Chào các em, đã có lịch thi môn Hệ điều hành trên EduShare nhé!", files: [], time: "08:30" },
            { sender: "Nguyễn Chí Vỹ", role: "STUDENT", text: "Dạ thưa thầy, bọn em nộp bài qua hệ thống luôn đúng không ạ?", files: [], time: "08:32" }
        ]
    }
};

const otpStore = new Map();

// API Authentication
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
            return res.status(400).json({ success: false, message: "Thông tin Email hoặc Số điện thoại đã tồn tại!" });
        }

        const assignedRole = (role && ['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) ? role : 'STUDENT';

        const newUser = {
            id: `user-${Date.now()}`,
            fullName,
            gender: gender || "Nam",
            dob: dob || "2006-01-06",
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

app.post('/api/auth/login', (req, res) => {
    const { identity, password } = req.body;
    const user = db.users.find(u => u.email === identity || u.phone === identity || u.fullName === identity);
    if (!user) {
        return res.status(401).json({ success: false, message: "Đăng nhập thất bại. Vui lòng thử lại!" });
    }
    return res.json({ success: true, message: "Đã đăng nhập thành công!", user });
});

app.post('/api/auth/social', (req, res) => {
    const { provider } = req.body;
    const socialUser = {
        id: `user-social-${Date.now()}`,
        fullName: provider === 'google' ? "Nguyễn Chí Vỹ (Google)" : "Nguyễn Chí Vỹ (Facebook)",
        email: "nguyenchivy@mtu.edu.vn",
        phone: "0862204069",
        role: "STUDENT",
        avatarUrl: "https://ui-avatars.com/api/?name=Nguyen+Chi+Vy&background=0284c7&color=fff",
        status: "online"
    };
    return res.json({ success: true, message: `Đã đăng nhập thành công qua ${provider === 'google' ? 'Google' : 'Facebook'}!`, user: socialUser });
});

app.post('/api/auth/forgot-password/otp', (req, res) => {
    const { identity } = req.body;
    if (!identity) return res.status(400).json({ success: false, message: "Sai cú pháp hoặc thông tin không tồn tại" });
    const user = db.users.find(u => u.email === identity || u.phone === identity || u.fullName === identity);
    if (!user) return res.status(404).json({ success: false, message: "Sai cú pháp hoặc thông tin không tồn tại" });
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(identity, { code: otpCode, expiresAt: Date.now() + 60000 });
    return res.json({ success: true, message: "Mã OTP đã được gửi thành công!", otp: otpCode });
});

app.post('/api/auth/forgot-password/reset', (req, res) => {
    const { identity, otp, newPassword, confirmPassword } = req.body;
    const record = otpStore.get(identity);
    if (!record || record.expiresAt < Date.now() || record.code !== otp) {
        return res.status(400).json({ success: false, message: "Mã sai hoặc đã quá hạn, vui lòng nhập lại!" });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Mật khẩu mới và xác nhận mật khẩu không trùng khớp!" });
    }
    otpStore.delete(identity);
    return res.json({ success: true, message: "Đã cập nhật mật khẩu mới thành công!" });
});

// API Documents Search Fuzzy
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

// API Toggle Like Document
app.post('/api/documents/:id/like', (req, res) => {
    const docId = parseInt(req.params.id);
    const { action } = req.body; // 'like' hoặc 'unlike'
    const doc = db.documents.find(d => d.id === docId);
    if (!doc) return res.status(404).json({ success: false, message: "Tài liệu không tồn tại!" });

    if (action === 'unlike') {
        doc.likes = Math.max(0, doc.likes - 1);
        return res.json({ success: true, message: "Đã thu hồi lượt thích!", likes: doc.likes });
    } else {
        doc.likes += 1;
        return res.json({ success: true, message: "Đã thích tài liệu!", likes: doc.likes });
    }
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
            subject: subject || "Hệ điều hành",
            school: school || "MTU",
            faculty: faculty || "KTPM",
            major: major || "SE",
            academicYear: academicYear || "K2024",
            className: className || "DHKTPM24",
            description: description || "",
            fileUrl: fileUrls[0] || "/uploads/sample.pdf",
            authorId: authorId || "user-1",
            authorName: authorName || "Nguyễn Chí Vỹ",
            authorRole: authorRole || "STUDENT",
            likes: 0,
            dislikes: 0,
            views: 1,
            comments: [],
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

// API Chat Engine & File Upload in Community Chat
app.get('/api/groups', (req, res) => res.json({ success: true, data: db.groups }));

app.get('/api/groups/:id/messages', (req, res) => {
    const msgs = db.groupMessages[req.params.id] || [];
    return res.json({ success: true, data: msgs });
});

app.post('/api/groups/:id/messages', upload.array('attachments', 5), (req, res) => {
    const { sender, role, text } = req.body;
    const files = req.files || [];
    const fileInfos = files.map(f => ({ name: f.originalname, url: `/uploads/${f.filename}` }));

    if (!db.groupMessages[req.params.id]) db.groupMessages[req.params.id] = [];
    const newMsg = {
        sender: sender || "Sinh viên",
        role: role || "STUDENT",
        text: text || "",
        files: fileInfos,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    db.groupMessages[req.params.id].push(newMsg);
    return res.json({ success: true, data: newMsg });
});

// AI Gemini Assistant API
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
            aiReply = `[Trợ lý AI EduShare] Tìm thấy ${matchedDocs.length} tài liệu học thuật phù hợp:\n` +
                matchedDocs.map(d => `- **${d.title}** (Môn: ${d.subject} | Tác giả: ${d.authorName})`).join('\n');
        } else {
            if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
                aiReply = `[Trợ lý AI EduShare] Xin chào! Tôi đã ghi nhận thắc mắc: "${prompt}". Bạn có thể tra cứu giáo trình Linux MTU hoặc bài tập UML trên hệ thống.`;
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

app.listen(PORT, () => {
    console.log(`EduShare Server running on port ${PORT}`);
});