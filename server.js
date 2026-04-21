const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// إعداد البورت ليتوافق مع Render
const PORT = process.env.PORT || 10000;

/**
 * 📂 إعدادات قاعدة البيانات والديسك (Persistent Storage)
 */
const DATA_DIR = '/data';
const DB_FILE = path.join(DATA_DIR, 'database.json');

app.use(cors());
app.use(express.json());
// لتقديم ملفات index.html و CSS و JS الموجودة في نفس المجلد
app.use(express.static(__dirname));

/**
 * دالة للتأكد من وجود قاعدة البيانات وربطها بالديسك
 */
const initDB = () => {
    try {
        let actualPath = DB_FILE;

        // إذا لم يكن الديسك /data موجوداً (في حالة التشغيل المحلي)، استخدم المجلد الحالي
        if (!fs.existsSync(DATA_DIR)) {
            actualPath = path.join(__dirname, 'database.json');
        }

        // إنشاء ملف البيانات إذا لم يكن موجوداً
        if (!fs.existsSync(actualPath)) {
            const initialData = {
                users: [
                    { id: "100", name: "أدمن", role: "hr", status: "active", pass: "123" }
                ],
                requests: [],
                logs: []
            };
            fs.writeFileSync(actualPath, JSON.stringify(initialData, null, 2));
        }
        return actualPath;
    } catch (err) {
        console.error("Error initializing DB:", err);
        return path.join(__dirname, 'database.json');
    }
};

const FINAL_DB_PATH = initDB();

// --- المسارات (Routes) ---

// 1. تسجيل الدخول
app.post('/api/login', (req, res) => {
    try {
        const { id, pass, role } = req.body;
        const db = JSON.parse(fs.readFileSync(FINAL_DB_PATH, 'utf8'));
        const user = db.users.find(u => u.id === id && u.pass === pass && u.role === role);
        
        if (user) {
            return res.json({ success: true, user });
        }
        res.status(401).json({ success: false, message: "بيانات غير صحيحة" });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// 2. جلب كل البيانات
app.get('/api/data', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(FINAL_DB_PATH, 'utf8'));
        res.json(db);
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// 3. حفظ الحركات (Logs) - لحل مشكلة الصورة الأخيرة
app.post('/api/logs', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(FINAL_DB_PATH, 'utf8'));
        db.logs.unshift(req.body);
        fs.writeFileSync(FINAL_DB_PATH, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

/**
 * 🛠️ الحل الحاسم لمشكلة الـ PathError
 * هذا السطر يضمن أن أي مسار يتم فتحه يوجه المتصفح لملف index.html
 */
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            res.status(500).send(err);
        }
    });
});

// تشغيل السيرفر
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📁 Database Path: ${FINAL_DB_PATH}`);
});
