const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== THƯ MỤC UPLOADS & LƯU TỆP ====================
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ==================== KẾT NỐI CƠ SỞ DỮ LIỆU MONGODB ATLAS ====================
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://nguyenchivybt2006_db_user:EduShare2026Pass@edushare.novhmdl.mongodb.net/edushare?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('🟢 Đã kết nối thành công với MongoDB Atlas!');
    initDefaultAdmin();
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối MongoDB Atlas:', err.message);
  });

// ==================== ĐỊNH NGHĨA SCHEMAS & MODELS ====================

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  fullname: { type: String, required: true },
  gender: { type: String, default: 'Nam' },
  dob: String,
  emailPhone: { type: String, trim: true },
  school: { type: String, default: 'Trường Đại học Xây dựng Miền Tây' },
  faculty: String,
  major: String,
  course: String,
  className: String,
  role: { type: String, default: 'student' },
  status: { type: String, default: 'approved' },
  createdAt: { type: String, default: () => new Date().toLocaleDateString('vi-VN') },
  favorites: [{ type: String }],
  downloadHistory: [{ type: String }],
  viewHistory: [{ type: String }]
}, { timestamps: true });

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  category: { type: String, default: 'Giáo trình' },
  school: { type: String, default: 'Trường Đại học Xây dựng Miền Tây' },
  faculty: String,
  major: String,
  course: String,
  className: String,
  subject: String,
  author: { type: String, default: 'Khách' },
  authorId: { type: String, default: '0' },
  url: { type: String, required: true },
  date: { type: String, default: () => new Date().toLocaleDateString('vi-VN') },
  views: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 }
}, { timestamps: true });

const CommentSchema = new mongoose.Schema({
  docId: { type: String, required: true },
  userId: String,
  userName: String,
  rating: { type: Number, default: 5 },
  content: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toLocaleString('vi-VN') }
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({
  approvalMode: { type: String, default: 'manual' }
});

const User = mongoose.model('User', UserSchema);
const DocumentModel = mongoose.model('Document', DocumentSchema);
const Comment = mongoose.model('Comment', CommentSchema);
const Setting = mongoose.model('Setting', SettingsSchema);

// ==================== TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH ====================
async function initDefaultAdmin() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        password: 'adminpassword123',
        fullname: 'Quản Trị Viên',
        emailPhone: 'admin@edushare.vn',
        role: 'admin',
        status: 'approved'
      });
      console.log('👤 Đã khởi tạo tài khoản Admin mặc định (username: admin / pass: adminpassword123)');
    }
  } catch (err) {
    console.error('Lỗi khởi tạo Admin:', err.message);
  }
}

// ==================== BỘ NHỚ OTP TẠM THỜI & EMAIL TRANSPORTER ====================
const otpStore = {};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOTPEmail(toEmail, otpCode) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[DEV TEST MODE] OTP gửi tới ${toEmail} là: ${otpCode}`);
    return false;
  }

  const mailOptions = {
    from: `"EduShare Support" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔑 Mã Xác Thực OTP Khôi Phục Mật Khẩu - EduShare',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
        <h2 style="color: #2563eb;">🎓 EduShare - Thư Viện Học Liệu Số</h2>
        <p>Bạn vừa yêu cầu khôi phục mật khẩu tài khoản. Mã OTP của bạn là:</p>
        <div style="background: #2563eb; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 12px 24px; display: inline-block; border-radius: 6px; margin: 10px 0;">
          ${otpCode}
        </div>
        <p style="color: #ef4444; font-size: 13px;">Mã có hiệu lực trong <strong>5 phút</strong>. Vui lòng không tiết lộ mã này cho bất kỳ ai.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Lỗi gửi email Nodemailer:', err.message);
    return false;
  }
}

// ==================== MIDDLEWARE & STATIC FILES ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

function formatUser(u) {
  if (!u) return null;
  const obj = u.toObject ? u.toObject() : u;
  obj.id = obj._id.toString();
  return obj;
}

function formatDoc(d) {
  if (!d) return null;
  const obj = d.toObject ? d.toObject() : d;
  obj.id = obj._id.toString();
  return obj;
}

// ==================== AUTHENTICATION APIs ====================

app.post('/api/register', async (req, res) => {
  try {
    const newUser = req.body;
    const existing = await User.findOne({ username: newUser.username });
    if (existing) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });
    }

    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({ approvalMode: 'manual' });

    newUser.status = settings.approvalMode === 'auto' ? 'approved' : 'pending';
    const user = await User.create(newUser);

    const msg = user.status === 'approved' 
      ? 'Đăng ký thành công! Bạn có thể đăng nhập ngay.' 
      : 'Đăng ký thành công! Tài khoản đang chờ Admin phê duyệt.';

    res.json({ message: msg, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi đăng ký hệ thống: ' + err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({
      $or: [{ username: username }, { emailPhone: username }],
      password: password
    });

    if (!user) {
      return res.status(400).json({ message: 'Tài khoản/Email hoặc mật khẩu không đúng!' });
    }
    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Tài khoản của bạn đang chờ Admin phê duyệt!' });
    }

    res.json({ message: 'Đăng nhập thành công!', user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập!' });
  }
});

app.post('/api/forgot-password/send-otp', async (req, res) => {
  try {
    const { accountInfo } = req.body;
    if (!accountInfo) {
      return res.status(400).json({ message: 'Vui lòng nhập Tên đăng nhập, Email hoặc SĐT!' });
    }

    const queryInfo = accountInfo.trim();
    const user = await User.findOne({
      $or: [
        { username: queryInfo },
        { emailPhone: queryInfo }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản hợp lệ trong hệ thống!' });
    }

    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const userIdStr = user._id.toString();

    otpStore[userIdStr] = {
      code: generatedOTP,
      expiresAt: Date.now() + 5 * 60 * 1000,
      verified: false
    };

    let emailSent = false;
    if (user.emailPhone && user.emailPhone.includes('@') && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      emailSent = await sendOTPEmail(user.emailPhone, generatedOTP);
    }

    let responseMsg = 'Mã OTP đã được gửi đến email của bạn!';
    if (!emailSent) {
      responseMsg = `Mã OTP tạo tự động là: ${generatedOTP}`;
    }

    res.json({ message: responseMsg, userId: userIdStr });
  } catch (err) {
    console.error('Lỗi send-otp:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi xử lý mã OTP!' });
  }
});

app.post('/api/forgot-password/verify-otp', (req, res) => {
  const { userId, otpCode } = req.body;
  const record = otpStore[userId];

  if (!record || Date.now() > record.expiresAt) {
    return res.status(400).json({ message: 'Mã OTP không tồn tại hoặc đã hết hạn (quá 5 phút)!' });
  }

  if (record.code !== otpCode.trim()) {
    return res.status(400).json({ message: 'Mã OTP không chính xác!' });
  }

  record.verified = true;
  res.json({ message: 'Xác thực OTP thành công! Mời đặt lại mật khẩu mới.' });
});

app.post('/api/forgot-password/reset-password', async (req, res) => {
  try {
    const { userId, otpCode, newPassword } = req.body;
    const record = otpStore[userId];

    if (!record || !record.verified || record.code !== otpCode.trim()) {
      return res.status(400).json({ message: 'Yêu cầu xác thực OTP không hợp lệ!' });
    }

    await User.findByIdAndUpdate(userId, { password: newPassword });
    delete otpStore[userId];

    res.json({ message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi cập nhật mật khẩu mới!' });
  }
});

// ==================== DOCUMENTS APIs ====================

app.get('/api/documents', async (req, res) => {
  try {
    const docs = await DocumentModel.find().sort({ _id: -1 });
    res.json(docs.map(formatDoc));
  } catch (err) {
    res.status(500).json([]);
  }
});

app.post('/api/documents', upload.single('file'), async (req, res) => {
  try {
    const body = req.body;
    let fileUrl = body.type === 'LINK' ? body.articleUrl : (req.file ? `/uploads/${req.file.filename}` : '');

    const newDoc = await DocumentModel.create({
      title: body.title,
      type: body.type,
      category: body.category,
      school: body.school,
      faculty: body.faculty,
      major: body.major,
      course: body.course,
      className: body.className,
      subject: body.subject,
      author: body.author || 'Khách',
      authorId: body.authorId || '0',
      url: fileUrl
    });

    res.json({ message: 'Tải lên tài liệu thành công!', document: formatDoc(newDoc) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi tải lên tài liệu!' });
  }
});

app.put('/api/documents/:id', async (req, res) => {
  try {
    await DocumentModel.findByIdAndUpdate(req.params.id, req.body);
    res.json({ message: 'Cập nhật tài liệu thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật tài liệu!' });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    await DocumentModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa tài liệu!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa tài liệu!' });
  }
});

app.post('/api/documents/:id/view', async (req, res) => {
  try {
    await DocumentModel.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    if (req.body.userId && req.body.userId !== '0') {
      await User.findByIdAndUpdate(req.body.userId, { $addToSet: { viewHistory: req.params.id } });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/documents/:id/download', async (req, res) => {
  try {
    await DocumentModel.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
    if (req.body.userId && req.body.userId !== '0') {
      await User.findByIdAndUpdate(req.body.userId, { $addToSet: { downloadHistory: req.params.id } });
    }
    res.json({ success: true, message: 'Đã ghi nhận lượt tải!' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ==================== COMMENTS APIs ====================

app.get('/api/documents/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ docId: req.params.id }).sort({ _id: -1 });
    const formatted = comments.map(c => {
      const obj = c.toObject();
      obj.id = obj._id.toString();
      return obj;
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.post('/api/documents/:id/comments', async (req, res) => {
  try {
    const { userId, userName, rating, content } = req.body;
    const newComment = await Comment.create({
      docId: req.params.id,
      userId: userId || '0',
      userName: userName || 'Khách',
      rating: Number(rating) || 5,
      content
    });

    const obj = newComment.toObject();
    obj.id = obj._id.toString();

    res.json({ message: 'Đã gửi bình luận thành công!', comment: obj });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi gửi bình luận!' });
  }
});

app.delete('/api/documents/comments/:commentId', async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.commentId);
    res.json({ message: 'Đã xóa bình luận!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa bình luận!' });
  }
});

// ==================== USER PROFILE & ADMIN APIs ====================

app.get('/api/users/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });

    const formattedUser = formatUser(user);

    const uploadedDocs = (await DocumentModel.find({
      $or: [{ authorId: user._id.toString() }, { author: user.fullname }]
    })).map(formatDoc);

    const favoriteDocs = (await DocumentModel.find({ _id: { $in: user.favorites || [] } })).map(formatDoc);
    const downloadHistoryDocs = (await DocumentModel.find({ _id: { $in: user.downloadHistory || [] } })).map(formatDoc);
    const viewHistoryDocs = (await DocumentModel.find({ _id: { $in: user.viewHistory || [] } })).map(formatDoc);

    res.json({ user: formattedUser, uploadedDocs, favoriteDocs, downloadHistoryDocs, viewHistoryDocs });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi nạp thông tin trang cá nhân!' });
  }
});

app.post('/api/users/favorites', async (req, res) => {
  try {
    const { userId, docId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại!' });

    const isFav = user.favorites.includes(docId);
    if (isFav) {
      await User.findByIdAndUpdate(userId, { $pull: { favorites: docId } });
    } else {
      await User.findByIdAndUpdate(userId, { $addToSet: { favorites: docId } });
    }

    res.json({ message: isFav ? 'Đã xóa khỏi danh sách Yêu thích!' : 'Đã thêm vào danh sách Yêu thích!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật danh sách Yêu thích!' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users.map(formatUser));
  } catch (err) {
    res.status(500).json([]);
  }
});

// HÀM DUYỆT TÀI KHOẢN (BẮT TẤT CẢ ROUTE VÀ PHƯƠNG THỨC)
const handleApproveUser = async (req, res) => {
  try {
    const userId = req.params.id || req.body.id || req.body.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Không tìm thấy ID người dùng!' });
    }

    await User.findByIdAndUpdate(userId, { status: 'approved' });
    res.json({ message: 'Đã duyệt tài khoản thành công!' });
  } catch (err) {
    console.error('Lỗi duyệt tài khoản:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi duyệt tài khoản!' });
  }
};

app.patch('/api/users/:id/approve', handleApproveUser);
app.post('/api/users/:id/approve', handleApproveUser);
app.put('/api/users/:id/approve', handleApproveUser);
app.post('/api/users/approve', handleApproveUser);

// HÀM XÓA TÀI KHOẢN (BẮT TẤT CẢ ROUTE VÀ PHƯƠNG THỨC)
const handleDeleteUser = async (req, res) => {
  try {
    const userId = req.params.id || req.body.id || req.body.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Không tìm thấy ID người dùng!' });
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: 'Đã xóa người dùng thành công!' });
  } catch (err) {
    console.error('Lỗi xóa người dùng:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi xóa người dùng!' });
  }
};

app.delete('/api/users/:id', handleDeleteUser);
app.post('/api/users/:id/delete', handleDeleteUser);
app.post('/api/users/delete', handleDeleteUser);

// ==================== SETTINGS APIs ====================

app.get('/api/settings', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({ approvalMode: 'manual' });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ approvalMode: 'manual' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    await Setting.findOneAndUpdate({}, req.body, { upsert: true });
    res.json({ message: 'Đã cập nhật cấu hình hệ thống!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật cấu hình!' });
  }
});

// Fallback Route cho Single Page Application (SPA)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== KHỞI CHẠY SERVER ====================
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 EduShare Server listening on PORT: ${PORT}`);
  console.log(`=================================`);
});