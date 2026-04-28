const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// إعداد مسار قاعدة البيانات ليتوافق مع (Render Disk) أو التشغيل المحلي
// إذا كان مجلد /data موجوداً (كما في إعدادات Render)، سيتم استخدامه لضمان عدم ضياع البيانات
const DB_DIR = fs.existsSync('/data') ? '/data' : __dirname;
const DB_FILE = path.join(DB_DIR, 'database.json');

app.use(cors());
app.use(express.json());
// تقديم ملفات الواجهة الأمامية (HTML, CSS, JS)
app.use(express.static(__dirname));

// ==========================================
// وظائف مساعدة للقراءة والكتابة الآمنة
// ==========================================
const readDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) return { users: [], requests: [], returnActions: [], logs: [] };
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("خطأ في قراءة قاعدة البيانات:", error);
        return { users: [], requests: [], returnActions: [], logs: [] };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("خطأ في كتابة قاعدة البيانات:", error);
    }
};

// تهيئة قاعدة البيانات بالمسؤولين عند أول تشغيل (إذا كانت فارغة)
if (!fs.existsSync(DB_FILE)) {
    writeDB({
        users: [
            { id: "222222222222", name: "مدير شؤون العاملين", role: "hr", status: "active", pass: "1234", place: "الإدارة المركزية", file: "HR-001", nationality: "كويتي", region: "الأحمدي", job: "مدير نظام", contract: "عامة", phone: "--" },
            { id: "333333333333", name: "الموجه الثقافي", role: "cultural", status: "active", pass: "1234", place: "إدارة التوجيه", file: "CUL-001", nationality: "كويتي", region: "الأحمدي", job: "موجه فني", contract: "عامة", phone: "--" }
        ],
        requests: [],
        returnActions: [], // تم الإبقاء عليه لدعم البيانات القديمة إن وجدت
        logs: []
    });
}

// ==========================================
// مسارات الـ API (الروابط التي يتصل بها المتصفح)
// ==========================================

// 1. جلب جميع البيانات (تستخدمها الواجهة عند التحميل)
app.get('/api/data', (req, res) => {
    res.json(readDB());
});

// 2. تسجيل مستخدم جديد
app.post('/api/users', (req, res) => {
    const db = readDB();
    if (db.users.find(u => u.id === req.body.id)) {
        return res.status(400).json({ success: false, message: "الرقم المدني مسجل مسبقاً" });
    }
    db.users.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

// 3. تحديث بيانات مستخدم (تغيير حالة، أو تحديث بيانات شخصية)
app.put('/api/users/:id', (req, res) => {
    const db = readDB();
    const index = db.users.findIndex(u => u.id === req.params.id);
    if (index !== -1) {
        db.users[index] = { ...db.users[index], ...req.body };
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: "الموظف غير موجود" });
    }
});

// 4. تقديم طلب جديد (إجازة، مباشرة، قطع، أو إذن انقطاع)
app.post('/api/requests', (req, res) => {
    const db = readDB();
    db.requests.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

// 5. تحديث حالة الطلب (نقل الطلب من البديل -> الشؤون -> الثقافي)
app.put('/api/requests/:id', (req, res) => {
    const db = readDB();
    const index = db.requests.findIndex(r => r.id === req.params.id);
    if (index !== -1) {
        db.requests[index] = { ...db.requests[index], ...req.body };
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: "الطلب غير موجود" });
    }
});

// 6. تسجيل الإشعارات الذكية (Logs)
app.post('/api/logs', (req, res) => {
    const db = readDB();
    db.logs.unshift(req.body); // إضافة الإشعار الأحدث في البداية
    // الاحتفاظ بآخر 500 إشعار فقط لتخفيف حجم قاعدة البيانات
    if (db.logs.length > 500) db.logs = db.logs.slice(0, 500);
    writeDB(db);
    res.json({ success: true });
});

// ==========================================
// الحل النهائي والجذري لمشكلة التوجيه في Render (SPA Fallback)
// ==========================================
app.use((req, res) => {
    if (req.method === 'GET') {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).json({ success: false, message: "المسار غير موجود" });
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل بنجاح على المنفذ ${PORT}`);
    console.log(`📂 مسار قاعدة البيانات الحالي: ${DB_FILE}`);
});
