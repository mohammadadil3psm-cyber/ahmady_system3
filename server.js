const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// ريندر بيفضل بورت 10000 أو 5000
const PORT = process.env.PORT || 10000;

/**
 * 📂 إعداد مسار "الخزنة" (Persistent Disk)
 * في ريندر، الديسك المدفوع بيكون دايماً في المسار الرئيسي /data
 */
const DATA_DIR = '/data';
const DB_FILE = path.join(DATA_DIR, 'database.json');

app.use(cors());
app.use(express.json());
// لتقديم ملفات الموقع (HTML, CSS, JS) من المجلد الحالي
app.use(express.static(__dirname));

/**
 * 🛡️ وظيفة إعداد قاعدة البيانات
 * بتتأكد إن الديسك المدفوع شغال، ولو مش موجود بتستخدم تخزين محلي مؤقت
 */
const initDB = () => {
    try {
        let actualPath = DB_FILE;

        // فحص وجود الديسك المدفوع (/data)
        if (!fs.existsSync(DATA_DIR)) {
            console.log("⚠️ تنبيه: الديسك المدفوع غير متصل، يتم التخزين داخل مجلد المشروع.");
            actualPath = path.join(__dirname, 'database.json');
        } else {
            console.log("✅ الديسك المدفوع (/data) متصل وجاهز.");
        }

        // إنشاء الملف بالبيانات الأساسية لو مش موجود
        if (!fs.existsSync(actualPath)) {
            const initialData = {
                users: [
                    { id: "111111111111", name: "أدمن شؤون العاملين", role: "hr", status: "active", pass: "123" },
                    { id: "222222222222", name: "أدمن التوجيه", role: "cultural", status: "active", pass: "123" }
                ],
                requests: [],
                logs: []
            };
            fs.writeFileSync(actualPath, JSON.stringify(initialData, null, 2));
            console.log("📝 تم إنشاء ملف قاعدة بيانات جديد.");
        }
        return actualPath;
    } catch (err) {
        console.error("❌ خطأ في إعداد الملفات:", err.message);
        return path.join(__dirname, 'database.json');
    }
};

const FINAL_DB_PATH = initDB();

// --- 🔑 مسارات الـ API ---

// تسجيل الدخول
app.post('/api/login', (req, res) => {
    try {
        const { id, pass, role } = req.body;
        const db = JSON.parse(fs.readFileSync(FINAL_DB_PATH, 'utf8'));
        const user = db.users.find(u => u.id === id && u.pass === pass && u.role === role);
        
        if (user) {
            if (user.status === 'frozen') return res.status(403).json({ success: false });
            return res.json({ success: true, user });
        }
        res.status(401).json({ success: false });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// جلب البيانات
app.get('/api/data', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(FINAL_DB_PATH, 'utf8'));
        res.json(db);
    } catch (e) { res.status(500).json({ success: false }); }
});

/**
 * ⚠️ حل مشكلة الـ PathError (التعديل الحاسم)
 * غيرنا النجمة (*) لـ (/*) عشان النسخ الجديدة من Express و Render تقبلها
 */
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل الآن على بورت: ${PORT}`);
    console.log(`📁 مسار التخزين النشط: ${FINAL_DB_PATH}`);
});
