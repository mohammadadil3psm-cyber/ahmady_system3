const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// ريندر بيحدد البورت تلقائياً، ولو مفيش بنستخدم 5000
const PORT = process.env.PORT || 5000;

/**
 * 📂 إعدادات مسار قاعدة البيانات:
 * ريندر بيوفر مسار اسمه /data للمساحة المدفوعة.
 * الكود بيفحص لو المسار ده موجود بيستخدمه، لو مش موجود بيستخدم مجلد محلي.
 */
const DATA_DIR = fs.existsSync('/data') ? '/data' : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

app.use(cors());
app.use(express.json());
// لتقديم ملفات الـ HTML والـ JS الخاصة بالواجهة
app.use(express.static(__dirname));

// 🛡️ دالة لتجهيز قاعدة البيانات والتأكد من الصلاحيات
const initDB = () => {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
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
            console.log("✅ Database created at:", DB_FILE);
        }
    } catch (err) {
        console.error("❌ Initialization error:", err.message);
    }
};

const readDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { users: [], requests: [], logs: [] };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error("❌ Write error:", e.message);
        return false;
    }
};

initDB();

// --- المسارات (Routes) ---

// 🔑 تسجيل دخول
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
    } catch (e) { 
        res.status(500).json({ success: false }); 
    }
});

// 📋 جلب كافة البيانات
app.get('/api/data', (req, res) => {
    try { 
        res.json(readDB()); 
    } catch (e) { 
        res.status(500).json({ success: false }); 
    }
});

// ✍️ إضافة موظف جديد
app.post('/api/users', (req, res) => {
    try {
        const db = readDB();
        db.users.push(req.body);
        if (writeDB(db)) {
            res.json({ success: true });
        } else {
            res.status(500).json({ success: false });
        }
    } catch (e) { 
        res.status(500).json({ success: false }); 
    }
});

// أي طلب غير المسارات اللي فوق يرجع ملف الـ index.html (عشان الـ Routing يشتغل)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📁 Using database at: ${DB_FILE}`);
});
