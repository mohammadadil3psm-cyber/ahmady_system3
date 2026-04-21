
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// ريندر بيستخدم بورت 10000 أو 5000 بشكل افتراضي
const PORT = process.env.PORT || 10000;

/**
 * 📂 إعداد مسار "الخزنة" (Persistent Disk)
 * في ريندر، الديسك المدفوع بيكون دايماً في المسار الرئيسي /data
 */
const DATA_DIR = '/data';
const DB_FILE = path.join(DATA_DIR, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/**
 * 🛡️ وظيفة تجهيز قاعدة البيانات
 * الكود ده بيتأكد إن الديسك المدفوع شغال، ولو مش موجود بيشغل "خطة بديلة" محلياً
 */
const initDB = () => {
    try {
        let actualPath = DB_FILE;

        // التأكد من وجود مجلد /data (الديسك المدفوع)
        if (!fs.existsSync(DATA_DIR)) {
            console.log("⚠️ تنبيه: الديسك المدفوع غير متصل، يتم استخدام التخزين المحلي مؤقتاً.");
            const localDir = path.join(__dirname, 'local_db');
            if (!fs.existsSync(localDir)) fs.mkdirSync(localDir);
            actualPath = path.join(localDir, 'database.json');
        } else {
            console.log("✅ الديسك المدفوع متصل وجاهز للاستخدام.");
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
        console.error("❌ خطأ فادح في إعداد الملفات:", err.message);
        return path.join(__dirname, 'fallback_db.json');
    }
};

// تحديد المسار النهائي اللي السيرفر هيشتغل عليه
const FINAL_DB_PATH = initDB();

// --- 🔑 نظام تسجيل الدخول ---
app.post('/api/login', (req, res) => {
    try {
        const { id, pass, role } = req.body;
        const db = JSON.parse(fs.readFileSync(FINAL_DB_PATH, 'utf8'));
        
        const user = db.users.find(u => u.id === id && u.pass === pass && u.role === role);
        
        if (user) {
            if (user.status === 'frozen') {
                return res.status(403).json({ success: false, message: "frozen" });
            }
            return res.json({ success: true, user });
        }
        
        res.status(401).json({ success: false });
    } catch (e) {
        console.error("❌ خطأ في Login:", e.message);
        res.status(500).json({ success: false });
    }
});

// --- 📋 جلب البيانات ---
app.get('/api/data', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(FINAL_DB_PATH, 'utf8'));
        res.json(db);
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// --- ✍️ إضافة مستخدم جديد ---
app.post('/api/users', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(FINAL_DB_PATH, 'utf8'));
        db.users.push(req.body);
        fs.writeFileSync(FINAL_DB_PATH, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

/**
 * ⚠️ حل مشكلة الـ PathError (التعديل الأهم)
 * ريندر بيعترض على علامة * لوحدها، فاستخدمنا الـ Regex (.*)
 * عشان يفتح صفحة index.html لو المسار مش معروف
 */
app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// تشغيل المحرك
app.listen(PORT, () => {
    console.log(`🚀 السيرفر انطلق بنجاح على بورت: ${PORT}`);
    console.log(`📁 مسار التخزين النشط: ${FINAL_DB_PATH}`);
});
