/**
 * EduShare Backend Server (Node.js + Express)
 * Kho Tài Liệu Tri Thức - Thư Viện Học Liệu Số MTU
 * Tác giả: Nguyễn Chí Vỹ | Trường ĐH Xây dựng Miền Tây (MTU)
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files from public/ and fallback to root
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeExt = path.extname(file.originalname || '');
        cb(null, `${file.fieldname}-${uniqueSuffix}${safeExt}`);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ---------- Helpers ----------

function removeVietnameseTones(str) {
    if (!str) return '';
    str = String(str).toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str.trim();
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function generateToken(userId) {
    return `${userId}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
}

function sanitizeUser(user) {
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
}

// ---------- In-memory Database ----------

const db = {
    users: [
        {
            id: "user-1",
            fullName: "Nguyễn Chí Vỹ",
            gender: "Nam",
            dob: "2006-01-06",
            email: "nguyenchivy@mtu.edu.vn",
            phone: "0862204069",
            address: "Số 427, ấp Phú Hữu, xã Hương Mỹ, tỉnh Vĩnh Long",
            school: "MTU",
            faculty: "KTPM",
            academicYear: "K2024",
            major: "SE",
            className: "DHKTPM24",
            role: "STUDENT",
            password: hashPassword("123456"),
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
            address: "Số 20B Phó Cơ Điều, Phường Phước Hậu, Tỉnh Vĩnh Long",
            school: "MTU",
            faculty: "KTPM",
            academicYear: "K2024",
            major: "SE",
            className: "DHKTPM24",
            role: "TEACHER",
            password: hashPassword("123456"),
            avatarUrl: "https://ui-avatars.com/api/?name=Dien+Viet+Duc&background=0284c7&color=fff",
            status: "online"
        },
        {
            id: "user-admin",
            fullName: "Quản Trị Viên MTU",
            gender: "Nam",
            dob: "1990-05-15",
            email: "admin@mtu.edu.vn",
            phone: "02703825903",
            address: "Trường Đại học Xây dựng Miền Tây",
            school: "MTU",
            faculty: "KTPM",
            academicYear: "K2024",
            major: "SE",
            className: "ADMIN",
            role: "ADMIN",
            password: hashPassword("123456"),
            avatarUrl: "https://ui-avatars.com/api/?name=Admin+MTU&background=dc2626&color=fff",
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
            fileUrl: "",
            files: [{ name: "Giao_trinh_Linux_MTU.pdf", url: "", type: "application/pdf" }],
            externalUrl: "",
            authorId: "user-teacher",
            authorName: "Thầy Điền Việt Đức",
            authorRole: "TEACHER",
            likes: 124,
            dislikes: 2,
            views: 1420,
            ratings: [5, 5, 5, 4, 5],
            likedBy: [],
            dislikedBy: [],
            comments: [
                { id: "cmt-1", author: "Nguyễn Chí Vỹ", authorId: "user-1", text: "Tài liệu rất chi tiết và bổ ích thưa thầy!", time: "10:15", createdAt: new Date().toISOString() }
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
            fileUrl: "",
            files: [{ name: "Bai_tap_mau_UML_PowerDesigner.docx", url: "", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }],
            externalUrl: "",
            authorId: "user-1",
            authorName: "Nguyễn Chí Vỹ",
            authorRole: "STUDENT",
            likes: 89,
            dislikes: 1,
            views: 856,
            ratings: [5, 4, 5],
            likedBy: [],
            dislikedBy: [],
            comments: [],
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            title: "Bài báo NCKH: Ứng dụng Trí tuệ nhân tạo trong xử lý ảnh đô thị tại ĐBSCL",
            category: "ARTICLE",
            subject: "Trí tuệ nhân tạo",
            school: "MTU",
            faculty: "KTPM",
            major: "SE",
            academicYear: "K2024",
            className: "DHKTPM24",
            description: "Công trình nghiên cứu khoa học cấp trường về mô hình AI nhận diện phương tiện giao thông và giám sát hạ tầng đô thị.",
            fileUrl: "",
            files: [{ name: "Bai_bao_NCKH_AI_Do_Thi_DBSCL.pdf", url: "", type: "application/pdf" }],
            externalUrl: "https://mtu.edu.vn",
            authorId: "user-teacher",
            authorName: "Thầy Điền Việt Đức",
            authorRole: "TEACHER",
            likes: 74,
            dislikes: 0,
            views: 1120,
            ratings: [5, 5, 5],
            likedBy: [],
            dislikedBy: [],
            comments: [],
            createdAt: new Date().toISOString()
        },
        {
            id: 4,
            title: "Đề thi mẫu & Đáp án môn Lập trình Web & Cơ sở dữ liệu (Năm 2024 - 2025)",
            category: "EXAM",
            subject: "Lập trình Web",
            school: "MTU",
            faculty: "KTPM",
            major: "SE",
            academicYear: "K2024",
            className: "DHKTPM24",
            description: "Bộ đề thi kết thúc học phần kèm hướng dẫn giải chi tiết dành cho sinh viên ôn tập cuối kỳ.",
            fileUrl: "",
            files: [{ name: "De_thi_mau_Lap_trinh_Web_MTU.pdf", url: "", type: "application/pdf" }],
            externalUrl: "",
            authorId: "user-teacher",
            authorName: "Thầy Điền Việt Đức",
            authorRole: "TEACHER",
            likes: 105,
            dislikes: 0,
            views: 980,
            ratings: [5, 5, 4, 5],
            likedBy: [],
            dislikedBy: [],
            comments: [],
            createdAt: new Date().toISOString()
        }
    ],
    groups: [
        { id: "group-global", name: "Kênh Trò Chuyện Chung (Tất Cả Tài Khoản)", membersCount: 520, members: ["user-1", "user-teacher", "user-admin"], status: "JOINED", desc: "Kênh trao đổi học thuật tự do giữa Giảng viên và Sinh viên toàn trường.", createdBy: "system" },
        { id: "group-1", name: "KTPM K24 MTU", membersCount: 128, members: ["user-1", "user-teacher"], status: "JOINED", desc: "Cộng đồng trao đổi bài tập và đề thi Khoa KTPM MTU.", createdBy: "user-teacher" },
        { id: "group-2", name: "Nghiên cứu CNTT MTU", membersCount: 45, members: ["user-teacher"], status: "PENDING", desc: "Nhóm nghiên cứu khoa học giảng viên & sinh viên.", createdBy: "user-teacher" },
        { id: "group-3", name: "Đồ án Tốt nghiệp KTPM 2026", membersCount: 32, members: [], status: "SUGGESTED", desc: "Nhóm hướng dẫn làm đồ án phần mềm chuẩn.", createdBy: "user-teacher" }
    ],
    groupMessages: {
        "group-global": [
            { sender: "Hệ thống EduShare", role: "ADMIN", text: "Chào mừng các bạn đến với Kênh Trò Chuyện Chung MTU!", files: [], time: "08:00" },
            { sender: "Thầy Điền Việt Đức", role: "TEACHER", text: "Chào các em, chúc các em học tập tốt và tích cực chia sẻ học liệu nhé!", files: [], time: "08:10" }
        ],
        "group-1": [
            { sender: "Thầy Điền Việt Đức", role: "TEACHER", text: "Chào các em, đã có lịch thi môn Hệ điều hành trên EduShare nhé!", files: [], time: "08:30" },
            { sender: "Nguyễn Chí Vỹ", role: "STUDENT", text: "Dạ thưa thầy, bọn em nộp bài qua hệ thống luôn đúng không ạ?", files: [], time: "08:32" }
        ],
        "group-2": [
            { sender: "Thầy Điền Việt Đức", role: "TEACHER", text: "Chào mừng các thành viên nhóm Nghiên cứu CNTT MTU!", files: [], time: "09:00" }
        ],
        "group-3": [
            { sender: "Thầy Điền Việt Đức", role: "TEACHER", text: "Kênh thảo luận Đồ án Tốt nghiệp KTPM 2026 đã mở.", files: [], time: "09:15" }
        ]
    },
    deleteRequests: [],
    sessions: []
};

const otpStore = new Map();

// Periodic auto-delete expired Admin delete-requests (30 days)
setInterval(() => {
    const now = Date.now();
    db.deleteRequests.forEach(reqItem => {
        if (reqItem.status === 'PENDING' && now >= reqItem.autoDeleteAt) {
            const idx = db.documents.findIndex(d => d.id === reqItem.documentId);
            if (idx !== -1) db.documents.splice(idx, 1);
            reqItem.status = 'AUTO_DELETED';
        }
    });
}, 60 * 1000);

// ==================== AUTH APIs ====================

app.post('/api/auth/register', (req, res) => {
    try {
        const {
            fullName, gender, dob, email, phone, address,
            school, faculty, year, academicYear, major, className,
            password, confirmPassword, role, rememberMe
        } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ Họ tên, Email và Mật khẩu!" });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const isDomainValid = cleanEmail.endsWith('@mtu.edu.vn') || cleanEmail.endsWith('@muce.edu.vn');
        if (!isDomainValid) {
            return res.status(400).json({ success: false, message: "Email đăng ký phải thuộc trường (@mtu.edu.vn hoặc @muce.edu.vn)!" });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Mật khẩu phải có ít nhất 6 ký tự!" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Mật khẩu xác nhận không trùng khớp!" });
        }

        // Check duplicate Email, Phone, or FullName + DOB
        const cleanName = String(fullName).trim();
        const cleanPhone = String(phone || '').trim();
        const cleanDob = String(dob || '').trim();

        const existedEmail = db.users.find(u => u.email.toLowerCase() === cleanEmail);
        if (existedEmail) {
            return res.status(400).json({ success: false, message: "Email này đã được đăng ký trong hệ thống!" });
        }
        if (cleanPhone && db.users.find(u => u.phone === cleanPhone)) {
            return res.status(400).json({ success: false, message: "Số điện thoại này đã tồn tại trong hệ thống!" });
        }
        if (cleanDob && db.users.find(u => u.fullName.toLowerCase() === cleanName.toLowerCase() && u.dob === cleanDob)) {
            return res.status(400).json({ success: false, message: "Họ tên và ngày sinh trùng với tài khoản đã có!" });
        }

        // Strict Role parsing (STUDENT / TEACHER / ADMIN)
        const requestedRole = String(role || req.query.role || req.headers['x-user-role'] || 'STUDENT').trim().toUpperCase();
        const VALID_ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];
        const assignedRole = VALID_ROLES.includes(requestedRole) ? requestedRole : 'STUDENT';

        const newUser = {
            id: `user-${Date.now()}`,
            fullName: cleanName,
            gender: gender || "Nam",
            dob: cleanDob || "2006-01-06",
            email: cleanEmail,
            phone: cleanPhone,
            address: address || "",
            school: school || "MTU",
            faculty: faculty || "KTPM",
            academicYear: academicYear || year || "K2024",
            major: major || "SE",
            className: className || "DHKTPM24",
            role: assignedRole,
            password: hashPassword(password),
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=4f46e5&color=fff`,
            status: "online"
        };

        db.users.push(newUser);

        // Auto add user to global group
        const globalGroup = db.groups.find(g => g.id === 'group-global');
        if (globalGroup && !globalGroup.members.includes(newUser.id)) {
            globalGroup.members.push(newUser.id);
            globalGroup.membersCount += 1;
        }

        const token = generateToken(newUser.id);
        const expiresAt = rememberMe ? Date.now() + 30 * 24 * 3600 * 1000 : Date.now() + 2 * 3600 * 1000;
        db.sessions.push({ token, userId: newUser.id, rememberMe: !!rememberMe, expiresAt, createdAt: Date.now() });

        return res.status(201).json({
            success: true,
            message: "Đã đăng ký thành công!",
            user: sanitizeUser(newUser),
            token,
            rememberMe: !!rememberMe
        });
    } catch (e) {
        return res.status(500).json({ success: false, message: "Đăng ký thất bại. Vui lòng thử lại!" });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { identity, password, rememberMe } = req.body;
    if (!identity || !password) {
        return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ tài khoản và mật khẩu!" });
    }

    const q = String(identity).trim().toLowerCase();
    const user = db.users.find(u =>
        u.email.toLowerCase() === q ||
        (u.phone && u.phone === String(identity).trim()) ||
        u.fullName.toLowerCase() === q
    );

    if (!user) {
        return res.status(401).json({ success: false, message: "Tài khoản không tồn tại!" });
    }

    if (user.password !== hashPassword(password)) {
        return res.status(401).json({ success: false, message: "Mật khẩu không chính xác!" });
    }

    const token = generateToken(user.id);
    const expiresAt = rememberMe
        ? Date.now() + 30 * 24 * 60 * 60 * 1000
        : Date.now() + 2 * 60 * 60 * 1000;

    db.sessions.push({
        token,
        userId: user.id,
        rememberMe: !!rememberMe,
        expiresAt,
        createdAt: Date.now()
    });

    user.status = "online";

    return res.json({
        success: true,
        message: "Đã đăng nhập thành công!",
        user: sanitizeUser(user),
        token,
        rememberMe: !!rememberMe
    });
});

app.post('/api/auth/logout', (req, res) => {
    const { token, userId } = req.body || {};
    if (token) {
        db.sessions = db.sessions.filter(s => s.token !== token);
    }
    if (userId) {
        db.sessions = db.sessions.filter(s => s.userId !== userId);
        const user = db.users.find(u => u.id === userId);
        if (user) user.status = "offline";
    }
    return res.json({ success: true, message: "Đã đăng xuất thành công!" });
});

app.post('/api/auth/verify-token', (req, res) => {
    const { token } = req.body || {};
    if (!token) return res.status(401).json({ success: false, message: "Token không hợp lệ!" });

    const session = db.sessions.find(s => s.token === token && s.expiresAt > Date.now());
    if (!session) {
        db.sessions = db.sessions.filter(s => s.token !== token);
        return res.status(401).json({ success: false, message: "Phiên đăng nhập đã hết hạn!" });
    }

    const user = db.users.find(u => u.id === session.userId);
    if (!user) return res.status(401).json({ success: false, message: "Người dùng không tồn tại!" });

    user.status = "online";
    return res.json({ success: true, user: sanitizeUser(user), token: session.token });
});

app.post('/api/auth/social', (req, res) => {
    const { provider, email, fullName, role, rememberMe } = req.body || {};
    if (!provider || !['google', 'facebook'].includes(provider)) {
        return res.status(400).json({ success: false, message: "Nhà cung cấp đăng nhập không hợp lệ!" });
    }

    const cleanEmail = (email && email.trim())
        ? email.trim().toLowerCase()
        : (provider === 'google' ? 'nguyenchivy@mtu.edu.vn' : 'nguyenchivy.fb@mtu.edu.vn');

    let user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
        const displayName = (fullName && fullName.trim())
            ? fullName.trim()
            : (provider === 'google' ? 'Nguyễn Chí Vỹ (Google)' : 'Nguyễn Chí Vỹ (Facebook)');
        const VALID_ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];
        const assignedRole = VALID_ROLES.includes(String(role || '').toUpperCase())
            ? String(role).toUpperCase()
            : 'STUDENT';

        user = {
            id: `user-${provider}-${Date.now()}`,
            fullName: displayName,
            gender: "Nam",
            dob: "2006-01-06",
            email: cleanEmail,
            phone: "",
            address: "Trường Đại học Xây dựng Miền Tây",
            school: "MTU",
            faculty: "KTPM",
            academicYear: "K2024",
            major: "SE",
            className: "DHKTPM24",
            role: assignedRole,
            password: hashPassword(`social-${provider}-${Date.now()}`),
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${provider === 'google' ? 'dc2626' : '2563eb'}&color=fff`,
            status: "online",
            socialProvider: provider
        };
        db.users.push(user);

        const globalGroup = db.groups.find(g => g.id === 'group-global');
        if (globalGroup && !globalGroup.members.includes(user.id)) {
            globalGroup.members.push(user.id);
            globalGroup.membersCount += 1;
        }
    }

    user.status = "online";
    const token = generateToken(user.id);
    const shouldRemember = rememberMe !== false;
    db.sessions.push({
        token,
        userId: user.id,
        rememberMe: shouldRemember,
        expiresAt: shouldRemember ? Date.now() + 30 * 24 * 3600 * 1000 : Date.now() + 2 * 3600 * 1000,
        createdAt: Date.now()
    });

    return res.json({
        success: true,
        message: "Đã đăng nhập thành công!",
        user: sanitizeUser(user),
        token,
        rememberMe: shouldRemember
    });
});

// --- Forgot Password & OTP ---
app.post('/api/auth/forgot-password/otp', (req, res) => {
    const { identity } = req.body || {};
    if (!identity || !String(identity).trim()) {
        return res.status(400).json({ success: false, message: "Sai cú pháp hoặc thông tin không tồn tại" });
    }

    const q = String(identity).trim().toLowerCase();
    const user = db.users.find(u =>
        u.email.toLowerCase() === q ||
        (u.phone && u.phone === String(identity).trim()) ||
        u.fullName.toLowerCase() === q
    );

    if (!user) {
        return res.status(404).json({ success: false, message: "Sai cú pháp hoặc thông tin không tồn tại" });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(q, {
        code: otpCode,
        expiresAt: Date.now() + 120 * 1000, // 120s
        attempts: 0,
        userId: user.id,
        createdAt: Date.now()
    });

    return res.json({
        success: true,
        message: "Mã OTP đã được gửi thành công!",
        otp: otpCode,
        expiresIn: 120
    });
});

app.post('/api/auth/forgot-password/resend-otp', (req, res) => {
    const { identity } = req.body || {};
    if (!identity || !String(identity).trim()) {
        return res.status(400).json({ success: false, message: "Sai cú pháp hoặc thông tin không tồn tại" });
    }

    const q = String(identity).trim().toLowerCase();
    const user = db.users.find(u =>
        u.email.toLowerCase() === q ||
        (u.phone && u.phone === String(identity).trim()) ||
        u.fullName.toLowerCase() === q
    );

    if (!user) {
        return res.status(404).json({ success: false, message: "Sai cú pháp hoặc thông tin không tồn tại" });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(q, {
        code: otpCode,
        expiresAt: Date.now() + 120 * 1000,
        attempts: 0,
        userId: user.id,
        createdAt: Date.now()
    });

    return res.json({
        success: true,
        message: "Đã cấp lại mã OTP mới!",
        otp: otpCode,
        expiresIn: 120
    });
});

app.post('/api/auth/forgot-password/reset', (req, res) => {
    const { identity, otp, newPassword, confirmPassword } = req.body || {};
    const q = String(identity || '').trim().toLowerCase();
    const record = otpStore.get(q);

    if (!record || record.expiresAt < Date.now() || record.code !== String(otp || '').trim()) {
        return res.status(400).json({ success: false, message: "Mã sai hoặc đã quá hạn, vui lòng nhập lại!" });
    }

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Mật khẩu mới và xác nhận mật khẩu không trùng khớp!" });
    }

    const user = db.users.find(u => u.id === record.userId);
    if (user) {
        user.password = hashPassword(newPassword);
        db.sessions = db.sessions.filter(s => s.userId !== user.id);
    }

    otpStore.delete(q);
    return res.json({ success: true, message: "Đã cập nhật mật khẩu mới thành công!" });
});

// ==================== DOCUMENTS APIs ====================

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

    if (q && q.trim()) {
        const queryNorm = removeVietnameseTones(q);
        const keywords = queryNorm.split(/\s+/).filter(Boolean);
        list = list.filter(d => {
            const fullText = removeVietnameseTones(`${d.title} ${d.description} ${d.subject} ${d.authorName} ${d.className} ${d.faculty} ${d.major}`);
            return keywords.some(kw => fullText.includes(kw));
        });
    }

    return res.json({ success: true, count: list.length, data: list });
});

app.get('/api/documents/:id', (req, res) => {
    const docId = parseInt(req.params.id, 10);
    const doc = db.documents.find(d => d.id === docId);
    if (!doc) return res.status(404).json({ success: false, message: "Tài liệu không tồn tại!" });
    doc.views += 1;
    return res.json({ success: true, data: doc });
});

// Upload Document (Multi-file + External Links + Custom Hierarchy)
app.post('/api/documents', upload.array('files', 15), (req, res) => {
    try {
        const {
            title, category, subject, description,
            school, faculty, major, academicYear, className,
            externalUrl, authorId, authorName, authorRole
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập tiêu đề tài liệu!" });
        }

        const uploadedFiles = (req.files || []).map(f => ({
            name: f.originalname,
            url: `/uploads/${f.filename}`,
            type: f.mimetype
        }));

        const newDoc = {
            id: db.documents.length > 0 ? Math.max(...db.documents.map(d => d.id)) + 1 : 1,
            title: title.trim(),
            category: category || "ACADEMIC",
            subject: (subject && subject.trim()) ? subject.trim() : "Hệ điều hành",
            school: school || "MTU",
            faculty: faculty || "KTPM",
            major: major || "SE",
            academicYear: academicYear || "K2024",
            className: (className && className.trim()) ? className.trim() : "DHKTPM24",
            description: description || "",
            fileUrl: uploadedFiles.length > 0 ? uploadedFiles[0].url : (externalUrl || ""),
            files: uploadedFiles,
            externalUrl: externalUrl || "",
            authorId: authorId || "user-1",
            authorName: authorName || "Nguyễn Chí Vỹ",
            authorRole: authorRole || "STUDENT",
            likes: 0,
            dislikes: 0,
            views: 1,
            ratings: [],
            likedBy: [],
            dislikedBy: [],
            comments: [],
            createdAt: new Date().toISOString()
        };

        db.documents.unshift(newDoc);
        return res.status(201).json({ success: true, message: "Tải tệp thành công!", data: newDoc });
    } catch (e) {
        return res.status(500).json({ success: false, message: "Tải tệp thất bại. Vui lòng thử lại sau!" });
    }
});

// Edit Document (Permission-enforced)
app.put('/api/documents/:id', (req, res) => {
    const docId = parseInt(req.params.id, 10);
    const doc = db.documents.find(d => d.id === docId);
    if (!doc) return res.status(404).json({ success: false, message: "Tài liệu không tồn tại!" });

    const { userId, userRole, title, category, subject, description, className, externalUrl } = req.body || {};

    if (!userId) {
        return res.status(401).json({ success: false, message: "Chưa đăng nhập!" });
    }

    if (userRole !== 'ADMIN' && doc.authorId !== userId) {
        return res.status(403).json({ success: false, message: "Bạn chỉ được chỉnh sửa tài liệu do bản thân đăng tải!" });
    }

    if (title !== undefined && title.trim()) doc.title = title.trim();
    if (category !== undefined) doc.category = category;
    if (subject !== undefined) doc.subject = subject;
    if (description !== undefined) doc.description = description;
    if (className !== undefined) doc.className = className;
    if (externalUrl !== undefined) doc.externalUrl = externalUrl;

    return res.json({ success: true, message: "Đã cập nhật tài liệu!", data: doc });
});

// Delete Document (Owner direct delete, Admin 30-day author approval flow)
app.delete('/api/documents/:id', (req, res) => {
    const docId = parseInt(req.params.id, 10);
    const { userId, userRole } = req.body || {};
    const index = db.documents.findIndex(d => d.id === docId);
    if (index === -1) return res.status(404).json({ success: false, message: "Tài liệu không tồn tại!" });

    const doc = db.documents[index];
    const isArticle = doc.category === 'ARTICLE';
    const successMsg = isArticle ? "Đã xóa bài báo!" : "Đã xóa Tệp tin!";

    if (!userId) {
        return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để thực hiện!" });
    }

    // Author deletes their own document immediately
    if (doc.authorId === userId) {
        db.documents.splice(index, 1);
        return res.json({ success: true, message: successMsg, deleted: true });
    }

    // Admin deletes another user's document -> 30-day author approval flow
    if (userRole === 'ADMIN') {
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        const existingReq = db.deleteRequests.find(r => r.documentId === docId && r.status === 'PENDING');
        if (existingReq) {
            return res.json({
                success: true,
                message: "Yêu cầu xóa đang chờ tác giả phê duyệt (tự động xóa sau 30 ngày nếu không phản hồi).",
                pendingApproval: true,
                deleteRequest: existingReq
            });
        }

        const deleteRequest = {
            id: `del-${Date.now()}`,
            documentId: docId,
            documentTitle: doc.title,
            requestedBy: userId,
            authorId: doc.authorId,
            status: 'PENDING',
            createdAt: Date.now(),
            autoDeleteAt: Date.now() + THIRTY_DAYS
        };
        db.deleteRequests.push(deleteRequest);
        return res.json({
            success: true,
            message: "Đã gửi yêu cầu xóa đến tác giả. Nếu không phản hồi, tài liệu sẽ tự động xóa sau 30 ngày!",
            pendingApproval: true,
            deleteRequest
        });
    }

    return res.status(403).json({ success: false, message: "Bạn chỉ được xóa tài liệu do bản thân đăng tải!" });
});

app.get('/api/delete-requests', (req, res) => {
    const { userId } = req.query;
    let list = [...db.deleteRequests];
    if (userId) {
        list = list.filter(r => r.authorId === userId || r.requestedBy === userId);
    }
    return res.json({ success: true, data: list });
});

app.post('/api/delete-requests/:id/respond', (req, res) => {
    const { action } = req.body || {};
    const request = db.deleteRequests.find(r => r.id === req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Yêu cầu không tồn tại!" });

    if (action === 'approve') {
        request.status = 'APPROVED';
        const idx = db.documents.findIndex(d => d.id === request.documentId);
        let isArticle = false;
        if (idx !== -1) {
            isArticle = db.documents[idx].category === 'ARTICLE';
            db.documents.splice(idx, 1);
        }
        return res.json({ success: true, message: isArticle ? "Đã xóa bài báo!" : "Đã xóa Tệp tin!" });
    } else {
        request.status = 'REJECTED';
        return res.json({ success: true, message: "Đã từ chối yêu cầu xóa của Quản trị viên!" });
    }
});

// Toggle Like
app.post('/api/documents/:id/like', (req, res) => {
    const docId = parseInt(req.params.id, 10);
    const { action, userId } = req.body || {};
    const doc = db.documents.find(d => d.id === docId);
    if (!doc) return res.status(404).json({ success: false, message: "Tài liệu không tồn tại!" });

    if (userId && doc.dislikedBy.includes(userId)) {
        doc.dislikedBy = doc.dislikedBy.filter(id => id !== userId);
        doc.dislikes = Math.max(0, doc.dislikes - 1);
    }

    if (action === 'unlike') {
        doc.likes = Math.max(0, doc.likes - 1);
        if (userId) doc.likedBy = doc.likedBy.filter(id => id !== userId);
        return res.json({ success: true, message: "Đã thu hồi lượt thích!", likes: doc.likes, dislikes: doc.dislikes });
    } else {
        if (!userId || !doc.likedBy.includes(userId)) {
            doc.likes += 1;
            if (userId) doc.likedBy.push(userId);
        }
        return res.json({ success: true, message: "Đã thích tài liệu!", likes: doc.likes, dislikes: doc.dislikes });
    }
});

// Toggle Dislike
app.post('/api/documents/:id/dislike', (req, res) => {
    const docId = parseInt(req.params.id, 10);
    const { action, userId } = req.body || {};
    const doc = db.documents.find(d => d.id === docId);
    if (!doc) return res.status(404).json({ success: false, message: "Tài liệu không tồn tại!" });

    if (userId && doc.likedBy.includes(userId)) {
        doc.likedBy = doc.likedBy.filter(id => id !== userId);
        doc.likes = Math.max(0, doc.likes - 1);
    }

    if (action === 'undislike') {
        doc.dislikes = Math.max(0, doc.dislikes - 1);
        if (userId) doc.dislikedBy = doc.dislikedBy.filter(id => id !== userId);
        return res.json({ success: true, message: "Đã thu hồi không thích!", likes: doc.likes, dislikes: doc.dislikes });
    } else {
        if (!userId || !doc.dislikedBy.includes(userId)) {
            doc.dislikes += 1;
            if (userId) doc.dislikedBy.push(userId);
        }
        return res.json({ success: true, message: "Đã đánh dấu không thích!", likes: doc.likes, dislikes: doc.dislikes });
    }
});

// Vote / Star Rating
app.post('/api/documents/:id/vote', (req, res) => {
    const docId = parseInt(req.params.id, 10);
    const { rating } = req.body || {};
    const doc = db.documents.find(d => d.id === docId);
    if (!doc) return res.status(404).json({ success: false, message: "Tài liệu không tồn tại!" });

    const score = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
    if (!doc.ratings) doc.ratings = [];
    doc.ratings.push(score);

    const avg = (doc.ratings.reduce((a, b) => a + b, 0) / doc.ratings.length).toFixed(1);
    return res.json({ success: true, message: `Đã bình chọn ${score} sao!`, averageRating: avg, votesCount: doc.ratings.length });
});

// Comments
app.post('/api/documents/:id/comments', (req, res) => {
    const docId = parseInt(req.params.id, 10);
    const { author, authorId, text } = req.body || {};
    const doc = db.documents.find(d => d.id === docId);
    if (!doc) return res.status(404).json({ success: false, message: "Tài liệu không tồn tại!" });
    if (!text || !text.trim()) return res.status(400).json({ success: false, message: "Vui lòng nhập nội dung bình luận!" });

    const comment = {
        id: `cmt-${Date.now()}`,
        author: author || "Thành viên MTU",
        authorId: authorId || null,
        text: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString()
    };
    if (!doc.comments) doc.comments = [];
    doc.comments.push(comment);
    return res.status(201).json({ success: true, message: "Đã gửi bình luận!", data: comment });
});

// ==================== COMMUNITY, MEMBERS & GROUPS APIs ====================

app.get('/api/users', (req, res) => {
    const { role, q } = req.query;
    let list = db.users.map(sanitizeUser);
    if (role && role !== 'ALL') {
        list = list.filter(u => u.role === role);
    }
    if (q && q.trim()) {
        const norm = removeVietnameseTones(q);
        list = list.filter(u => removeVietnameseTones(`${u.fullName} ${u.email} ${u.faculty} ${u.className} ${u.major}`).includes(norm));
    }
    return res.json({ success: true, data: list });
});

app.get('/api/users/:id', (req, res) => {
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại!" });
    return res.json({ success: true, data: sanitizeUser(user) });
});

app.put('/api/users/:id', (req, res) => {
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại!" });

    const { fullName, gender, dob, phone, address, school, faculty, academicYear, major, className, status, currentPassword, newPassword } = req.body || {};

    if (newPassword) {
        if (!currentPassword || user.password !== hashPassword(currentPassword)) {
            return res.status(400).json({ success: false, message: "Mật khẩu hiện tại không chính xác!" });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
        }
        user.password = hashPassword(newPassword);
    }

    if (fullName !== undefined && fullName.trim()) user.fullName = fullName.trim();
    if (gender !== undefined) user.gender = gender;
    if (dob !== undefined) user.dob = dob;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (school !== undefined) user.school = school;
    if (faculty !== undefined) user.faculty = faculty;
    if (academicYear !== undefined) user.academicYear = academicYear;
    if (major !== undefined) user.major = major;
    if (className !== undefined) user.className = className;
    if (status !== undefined && ['online', 'offline'].includes(status)) user.status = status;

    return res.json({ success: true, message: "Đã lưu thay đổi hồ sơ!", data: sanitizeUser(user) });
});

app.post('/api/users/:id/avatar', upload.single('avatar'), (req, res) => {
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại!" });
    if (!req.file) return res.status(400).json({ success: false, message: "Vui lòng chọn tệp ảnh đại diện!" });

    user.avatarUrl = `/uploads/${req.file.filename}`;
    return res.json({ success: true, message: "Đã cập nhật ảnh đại diện!", data: sanitizeUser(user) });
});

app.get('/api/groups', (req, res) => {
    const { userId } = req.query;
    const groups = db.groups.map(g => {
        let userStatus = g.status;
        if (userId) {
            if (g.members && g.members.includes(userId)) {
                userStatus = 'JOINED';
            } else if (g.status === 'JOINED' && g.id !== 'group-global') {
                userStatus = 'SUGGESTED';
            }
        }
        return { ...g, status: userStatus };
    });
    return res.json({ success: true, data: groups });
});

app.post('/api/groups', (req, res) => {
    const { name, desc, createdBy } = req.body || {};
    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: "Tạo nhóm thất bại, vui lòng thử lại!" });
    }

    const newGroup = {
        id: `group-${Date.now()}`,
        name: name.trim(),
        membersCount: 1,
        members: createdBy ? [createdBy] : [],
        status: "JOINED",
        desc: desc || "Nhóm thảo luận học thuật MTU",
        createdBy: createdBy || "system"
    };
    db.groups.push(newGroup);
    db.groupMessages[newGroup.id] = [
        { sender: "Hệ thống EduShare", role: "ADMIN", text: `Nhóm "${newGroup.name}" đã được khởi tạo!`, files: [], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ];
    return res.status(201).json({ success: true, message: "Đã tạo nhóm thành công!", data: newGroup });
});

app.post('/api/groups/:id/join', (req, res) => {
    const { userId } = req.body || {};
    const group = db.groups.find(g => g.id === req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Nhóm không tồn tại!" });

    if (!group.members) group.members = [];
    if (userId && !group.members.includes(userId)) {
        group.members.push(userId);
        group.membersCount += 1;
    }
    group.status = 'JOINED';

    return res.json({ success: true, message: `Đã tham gia nhóm ${group.name}!`, data: { ...group, status: 'JOINED' } });
});

app.get('/api/groups/:id/messages', (req, res) => {
    const msgs = db.groupMessages[req.params.id] || [];
    return res.json({ success: true, data: msgs });
});

app.post('/api/groups/:id/messages', upload.array('attachments', 10), (req, res) => {
    const { sender, role, text } = req.body || {};
    const files = (req.files || []).map(f => ({ name: f.originalname, url: `/uploads/${f.filename}` }));

    if (!db.groupMessages[req.params.id]) db.groupMessages[req.params.id] = [];
    const newMsg = {
        sender: sender || "Thành viên MTU",
        role: role || "STUDENT",
        text: text || "",
        files,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    db.groupMessages[req.params.id].push(newMsg);
    return res.json({ success: true, data: newMsg });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`EduShare MTU Server running at http://localhost:${PORT}`);
});
