const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// تحديد مسار قاعدة البيانات (متوافق مع Render Disk أو محلي)
const DB_DIR = fs.existsSync('/data') ? '/data' : __dirname;
const DB_FILE = path.join(DB_DIR, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// وظيفة مساعدة للقراءة والكتابة
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// تهيئة قاعدة البيانات عند أول تشغيل
if (!fs.existsSync(DB_FILE)) {
    const initialData = {
        users: [
            { id: "admin1", name: "مدير شؤون العاملين", role: "hr", status: "active", pass: "1234", place: "الإدارة الرئيسي" },
            { id: "admin2", name: "مدير التوجيه الثقافي", role: "cultural", status: "active", pass: "1234", place: "التوجيه" }
        ],
        requests: [],
        logs: [],
        returns: []
    };
    writeDB(initialData);
}

// --- مسارات الـ API ---

// 1. تسجيل الدخول
app.post('/api/login', (req, res) => {
    const { id, pass, role } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.id === id && u.pass === pass && u.role === role);
    if (user) return res.json({ success: true, user });
    res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
});

// 2. جلب كل البيانات (للمزامنة)
app.get('/api/sync', (req, res) => {
    res.json(readDB());
});

// 3. تقديم طلب إجازة جديد
app.post('/api/requests', (req, res) => {
    const db = readDB();
    db.requests.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

// 4. تحديث حالة الطلب (اعتماد البديل، الثقافي، أو HR)
app.put('/api/requests/:id', (req, res) => {
    const db = readDB();
    const index = db.requests.findIndex(r => r.id === req.params.id);
    if (index !== -1) {
        db.requests[index] = { ...db.requests[index], ...req.body };
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// 5. تسجيل مستخدم جديد
app.post('/api/register', (req, res) => {
    const db = readDB();
    if (db.users.find(u => u.id === req.body.id)) {
        return res.status(400).json({ success: false, message: "الرقم المدني مسجل مسبقاً" });
    }
    db.users.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

// 6. إضافة الإشعارات (Logs)
app.post('/api/logs', (req, res) => {
    const db = readDB();
    db.logs.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

// 7. تحديث إشعارات "تمت القراءة"
app.put('/api/logs/read', (req, res) => {
    const { userId } = req.body;
    const db = readDB();
    db.logs.forEach(l => { if(l.userId === userId) l.read = true; });
    writeDB(db);
    res.json({ success: true });
});

// 8. طلبات العودة والقطع
app.post('/api/returns', (req, res) => {
    const db = readDB();
    db.returns.push(req.body);
    writeDB(db);
    res.json({ success: true });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
