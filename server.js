const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// 数据库连接
const db = new sqlite3.Database('./gym.db', (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('已连接到SQLite数据库');
        initDatabase();
    }
});

// 初始化数据库
function initDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        gender TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        checkin_date TEXT NOT NULL,
        checkin_time TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        UNIQUE(customer_id, checkin_date)
    )`);
}

// API路由
app.get('/api/customers', (req, res) => {
    db.all('SELECT * FROM customers ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/customers', (req, res) => {
    const { name, phone, gender, startDate, endDate } = req.body;
    const sql = 'INSERT INTO customers (name, phone, gender, start_date, end_date) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [name, phone, gender, startDate, endDate], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: '客户添加成功' });
    });
});

app.delete('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM checkins WHERE customer_id = ?', [id], (err) => {
        db.run('DELETE FROM customers WHERE id = ?', [id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: '客户删除成功' });
        });
    });
});

app.post('/api/checkins', (req, res) => {
    const { customerId, checkinDate, checkinTime } = req.body;
    const sql = 'INSERT INTO checkins (customer_id, checkin_date, checkin_time) VALUES (?, ?, ?)';
    db.run(sql, [customerId, checkinDate, checkinTime], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: '打卡成功' });
    });
});

app.get('/api/checkins/today', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const sql = `
        SELECT c.id, c.checkin_time, cu.name, cu.phone 
        FROM checkins c 
        JOIN customers cu ON c.customer_id = cu.id 
        WHERE c.checkin_date = ? 
        ORDER BY c.checkin_time DESC
    `;
    db.all(sql, [today], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/reminders/expiry', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const sql = `
        SELECT *, 
               (julianday(end_date) - julianday('${today}')) as days_remaining
        FROM customers 
        WHERE julianday(end_date) - julianday('${today}') BETWEEN 0 AND 7
        ORDER BY end_date ASC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/reminders/absence', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const sql = `
        SELECT c.*, 
               COALESCE(MAX(ch.checkin_date), '从未打卡') as last_checkin,
               CASE 
                   WHEN MAX(ch.checkin_date) IS NULL THEN -1
                   ELSE julianday('${today}') - julianday(MAX(ch.checkin_date))
               END as days_absent
        FROM customers c
        LEFT JOIN checkins ch ON c.id = ch.customer_id
        GROUP BY c.id
        HAVING days_absent >= 3 OR days_absent = -1
        ORDER BY days_absent DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/customers/search', (req, res) => {
    const { q } = req.query;
    const sql = 'SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY created_at DESC';
    const searchTerm = `%${q}%`;
    db.all(sql, [searchTerm, searchTerm], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '轻刻运动健身房管理系统运行正常' });
});

// 启动服务器
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`服务器运行在端口 ${PORT}`);
    });
}

// 导出app以适配Vercel
module.exports = app; 