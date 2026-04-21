const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// رندر بيحدد البورت أوتوماتيكياً من البيئة
const PORT = process.env.PORT || 5000; 

// ⭐ التعديل الأهم: ربط قاعدة البيانات بالخزنة (Disk) اللي عملناها في رندر
const DB_FILE = '/data/database.json';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); 

// دالة تهيئة قاعدة البيانات في المكان الجديد
const initDB = () => {
    // التأكد من وجود المجلد أولاً
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
        const initialData = { 
            users: [
                { id: "111111111111", name: "أدمن شؤون العاملين", role: "hr", status: "active", pass: "123" },
                { id: "222222222222", name: "أدمن التوجيه", role: "cultural", status: "active", pass: "123" }
            ], 
            requests: [], 
            logs: [] 
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log("📁 تم إنشاء ملف قاعدة البيانات في الخزنة الأمان بنجاح.");
    }
};

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

initDB();

// جلب كل البيانات
app.get('/api/data', (req, res) => {
    try { res.json(readDB()); } 
    catch (e) { res.status(500).json({ success: false, message: "خطأ في قراءة البيانات" }); }
});

// تسجيل الدخول
app.post('/api/login', (req, res) => {
    const { id, pass, role } = req.body;
    try {
        const db = readDB();
        const user = db.users.find(u => u.id === id && u.pass === pass && u.role === role);
        if (user) {
            if (user.status === 'frozen') return res.status(403).json({ success: false, message: "هذا الحساب مجمد" });
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

// تسجيل موظف جديد
app.post('/api/users', (req, res) => {
    const newUser = req.body;
    const db = readDB();
    if (db.users.some(u => u.id === newUser.id)) {
        return res.status(400).json({ success: false, message: "الرقم المدني مسجل مسبقاً" });
    }
    db.users.push(newUser);
    writeDB(db);
    res.json({ success: true, message: "تم التسجيل بنجاح" });
});

// تعديل بيانات موظف
app.put('/api/users/:id', (req, res) => {
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === req.params.id);
    if (userIndex !== -1) {
        db.users[userIndex] = { ...db.users[userIndex], ...req.body };
        writeDB(db);
        res.json({ success: true });
    } else { res.status(404).json({ success: false }); }
});

// تقديم طلب جديد
app.post('/api/requests', (req, res) => {
    const db = readDB();
    db.requests.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

// تحديث حالة الطلبات
app.put('/api/requests/:id', (req, res) => {
    const db = readDB();
    const reqIndex = db.requests.findIndex(r => r.id == req.params.id);
    if (reqIndex !== -1) {
        db.requests[reqIndex] = { ...db.requests[reqIndex], ...req.body };
        writeDB(db);
        res.json({ success: true });
    } else { res.status(404).json({ success: false }); }
});

// تسجيل الحركات
app.post('/api/logs', (req, res) => {
    const db = readDB();
    db.logs.unshift(req.body);
    writeDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🚀 السيرفر العالمي شغال الآن على بورت ${PORT}`);
});
