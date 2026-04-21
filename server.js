const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * 🔍 مراجعة المسار: 
 * الكود هيفحص أولاً لو مجلد /data (الخزنة المدفوعة) موجود ومتاح للكتابة.
 * لو مش متاح، هيحول تلقائياً للمجلد الحالي عشان السيرفر ميفصلش (Zero Downtime).
 */
let DB_FILE = '/data/database.json';
try {
    if (!fs.existsSync('/data')) {
        DB_FILE = path.join(__dirname, 'database.json');
    }
} catch (e) {
    DB_FILE = path.join(__dirname, 'database.json');
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 🛡️ دالة تأمين وتشغيل قاعدة البيانات
const initDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const initialData = {
                users: [
                    { id: "111111111111", name: "أدمن شؤون العاملين", role: "hr", status: "active", pass: "123" },
                    { id: "222222222222", name: "أدمن التوجيه", role: "cultural", status: "active", pass: "123" }
                ],
                requests: [],
                logs: []
            };
            // تأكد من وجود المجلد قبل الكتابة لتجنب خطأ EACCES
            const dir = path.dirname(DB_FILE);
            if (dir !== __dirname && !fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        }
    } catch (err) {
        console.error("Database initialization failed, falling back...");
        DB_FILE = path.join(__dirname, 'database.json');
    }
};

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

initDB();

// 🔑 نظام تسجيل دخول ذكي وسريع
app.post('/api/login', (req, res) => {
    const { id, pass, role } = req.body;
    try {
        const db = readDB();
        const user = db.users.find(u => u.id === id && u.pass === pass && u.role === role);
        if (user) {
            if (user.status === 'frozen') return res.status(403).json({ success: false, message: "frozen" });
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

// 📋 جلب البيانات لكل الأقسام
app.get('/api/data', (req, res) => {
    try { res.json(readDB()); } 
    catch (e) { res.status(500).json({ success: false }); }
});

// ✍️ إضافة موظفين وحفظهم في الخزنة
app.post('/api/users', (req, res) => {
    try {
        const db = readDB();
        db.users.push(req.body);
        writeDB(db);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.listen(PORT, () => {
    console.log(`✅ System is fully operational on port ${PORT}`);
});
