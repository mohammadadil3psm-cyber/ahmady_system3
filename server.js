
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const DB_DIR = fs.existsSync('/data') ? '/data' : __dirname;
const DB_FILE = path.join(DB_DIR, 'database.json');

app.use(cors());
app.use(express.json());
// هذا السطر هو الذي يربط السيرفر بواجهة الـ HTML
app.use(express.static(__dirname));

// إنشاء قاعدة البيانات إذا لم تكن موجودة (شاملة الإدارة والتوجيه)
const initDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: [
                { id: "100", name: "أدمن النظام", role: "hr", status: "active", pass: "123", place: "الإدارة" },
                { id: "200", name: "التوجيه الثقافي", role: "cultural", status: "active", pass: "123", place: "التوجيه" }
            ],
            requests: [],
            logs: [],
            returnActions: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
};
initDB();

// --- مسارات الـ API (نقاط الربط بين الواجهة والسيرفر) ---

// تسجيل الدخول
app.post('/api/login', (req, res) => {
    try {
        const { id, pass, role } = req.body;
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const user = db.users.find(u => u.id === id && u.pass === pass && u.role === role);
        if (user) return res.json({ success: true, user });
        res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// جلب البيانات كاملة
app.get('/api/data', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        res.json(db);
    } catch (e) { res.status(500).json({ success: false }); }
});

// حفظ السجلات (Logs)
app.post('/api/logs', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        db.logs.unshift(req.body);
        if (db.logs.length > 100) db.logs.pop(); 
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// إضافة مستخدم (موظف) جديد
app.post('/api/users', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (db.users.find(u => u.id === req.body.id)) return res.status(400).json({ success: false, message: "مسجل مسبقاً" });
        db.users.push(req.body);
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// تحديث بيانات المستخدم
app.put('/api/users/:id', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const index = db.users.findIndex(u => u.id === req.params.id);
        if (index !== -1) {
            db.users[index] = { ...db.users[index], ...req.body };
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
            return res.json({ success: true });
        }
        res.status(404).json({ success: false });
    } catch (e) { res.status(500).json({ success: false }); }
});

// حذف مستخدم نهائياً
app.delete('/api/users/:id', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        db.users = db.users.filter(u => u.id !== req.params.id);
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// إضافة طلب إجازة
app.post('/api/requests', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        db.requests.push(req.body);
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// تحديث حالة الطلب
app.put('/api/requests/:id', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const index = db.requests.findIndex(r => r.id == req.params.id);
        if (index !== -1) {
            db.requests[index] = { ...db.requests[index], ...req.body };
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
            return res.json({ success: true });
        }
        res.status(404).json({ success: false });
    } catch (e) { res.status(500).json({ success: false }); }
});

// إضافة طلب عودة/قطع إجازة
app.post('/api/returns', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (!db.returnActions) db.returnActions = [];
        db.returnActions.push(req.body);
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// لضمان عمل واجهة الـ HTML عند التحديث (تم تعديل المسار هنا لتفادي الأخطاء)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 السيرفر يعمل بامتياز الآن على البورت: ${PORT}`);
});