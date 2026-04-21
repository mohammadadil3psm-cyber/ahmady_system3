const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// رندر بيحدد البورت أوتوماتيكياً
const PORT = process.env.PORT || 5000; 

/**
 * مراجعة مسار قاعدة البيانات:
 * الكود هيفحص لو المجلد /data موجود (بتاع الخزنة المدفوعة) هيستخدمه.
 * لو مش موجود أو مفيش صلاحية، هيستخدم المجلد الحالي للمشروع عشان السيرفر ميفصلش.
 */
let DB_FILE;
if (fs.existsSync('/data')) {
    DB_FILE = '/data/database.json';
} else {
    DB_FILE = path.join(__dirname, 'database.json');
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); 

// دالة التهيئة - تم تعديلها عشان تتجنب خطأ mkdir اللي ظهر في الصورة
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
            fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
            console.log("✅ Database initialized at: " + DB_FILE);
        }
    } catch (err) {
        console.error("❌ Database Init Error: ", err.message);
        // حل احتياطي لو فشل الكتابة في /data
        DB_FILE = path.join(__dirname, 'database.json');
    }
};

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

initDB();

// المسارات الأساسية
app.get('/api/data', (req, res) => {
    try { res.json(readDB()); } 
    catch (e) { res.status(500).json({ success: false }); }
});

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

// باقي العمليات (إضافة موظف، طلبات، لوجز)
app.post('/api/users', (req, res) => {
    const db = readDB();
    db.users.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/requests', (req, res) => {
    const db = readDB();
    db.requests.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is Live on port ${PORT}`);
});
