const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// إعداد مسار قاعدة البيانات ليتوافق مع (Render Disk) أو التشغيل المحلي
const DB_DIR = fs.existsSync('/data') ? '/data' : __dirname;
const DB_FILE = path.join(DB_DIR, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// وظائف مساعدة للقراءة والكتابة الآمنة
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
        returnActions: [], // تم تعديل الاسم ليتطابق مع الواجهة
        logs: []
    });
}

// ==========================================
// مسارات الـ API (الروابط التي يتصل بها المتصفح)
// ==========================================

// 1. جلب كافة البيانات (يستخدمه المتصفح للمزامنة الدائمة)
app.get('/api/data', (req, res) => {
    res.json(readDB());
});

// 2. تسجيل الدخول
app.post('/api/login', (req, res) => {
    const { id, pass, role } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.id === id && u.pass === pass && u.role === role);
    
    if (user) {
        return res.json({ success: true, user });
    }
    res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة أو الرتبة خاطئة" });
});

// 3. إضافة مستخدم جديد (موظف)
app.post('/api/users', (req, res) => {
    const db = readDB();
    if (db.users.find(u => u.id === req.body.id)) {
        return res.status(400).json({ success: false, message: "الرقم المدني مسجل مسبقاً" });
    }
    db.users.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

// 4. تعديل بيانات موظف أو (تجميد/تفعيل) الحساب
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

// 5. حذف موظف نهائياً (صلاحية الشؤون)
app.delete('/api/users/:id', (req, res) => {
    const db = readDB();
    db.users = db.users.filter(u => u.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
});

// 6. تقديم طلب إجازة جديد
app.post('/api/requests', (req, res) => {
    const db = readDB();
    db.requests.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

// 7. تحديث حالة الطلب (الموافقات والاعتمادات)
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

// 8. تسجيل طلبات القطع والعودة
app.post('/api/returns', (req, res) => {
    const db = readDB();
    db.returnActions.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

// 9. إضافة سجل للإشعارات (Logs)
app.post('/api/logs', (req, res) => {
    const db = readDB();
    db.logs.unshift(req.body); // الإضافة في البداية ليكون الأحدث أولاً
    writeDB(db);
    res.json({ success: true });
});

// 10. توجيه جميع المسارات الأخرى إلى ملف HTML (هام جداً لعمل الموقع)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل بنجاح على المنفذ ${PORT}`);
});
