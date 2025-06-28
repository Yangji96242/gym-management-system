const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const Customer = require('./models/Customer');
const Checkin = require('./models/Checkin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// 连接MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('已连接到MongoDB Atlas');
}).catch(err => {
    console.error('MongoDB连接失败:', err.message);
    process.exit(1);
});

// 获取所有客户
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 添加新客户
app.post('/api/customers', async (req, res) => {
    try {
        const { name, phone, gender, startDate, endDate } = req.body;
        const customer = new Customer({ name, phone, gender, startDate, endDate });
        await customer.save();
        res.json({ id: customer._id, message: '客户添加成功' });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ error: '该手机号已存在' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// 删除客户
app.delete('/api/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Checkin.deleteMany({ customerId: id });
        await Customer.findByIdAndDelete(id);
        res.json({ message: '客户删除成功' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 客户打卡
app.post('/api/checkins', async (req, res) => {
    try {
        const { customerId, checkinDate, checkinTime } = req.body;
        const checkin = new Checkin({ customerId, checkinDate, checkinTime });
        await checkin.save();
        res.json({ id: checkin._id, message: '打卡成功' });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ error: '该客户今天已经打卡' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// 获取今日打卡记录（支持搜索）
app.get('/api/checkins/today', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { search } = req.query;
        let query = { checkinDate: today };
        if (search) {
            const customers = await Customer.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ]
            });
            const customerIds = customers.map(c => c._id);
            query.customerId = { $in: customerIds };
        }
        const checkins = await Checkin.find(query)
            .populate('customerId', 'name phone')
            .sort({ checkinTime: -1 });
        const result = checkins.map(checkin => ({
            id: checkin._id,
            checkin_time: checkin.checkinTime,
            name: checkin.customerId.name,
            phone: checkin.customerId.phone
        }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 到期提醒（7天内到期，按到期时间升序）
app.get('/api/reminders/expiry', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const customers = await Customer.find({
            endDate: { $gte: today, $lte: sevenDaysLater }
        }).sort({ endDate: 1 });
        const result = customers.map(customer => {
            const daysRemaining = Math.ceil((new Date(customer.endDate) - new Date(today)) / (1000 * 60 * 60 * 24));
            return {
                ...customer.toObject(),
                days_remaining: daysRemaining
            };
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 缺席提醒（近7天未打卡）
app.get('/api/reminders/absence', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const customers = await Customer.find();
        const absenceCustomers = [];
        for (const customer of customers) {
            const checkinCount = await Checkin.countDocuments({
                customerId: customer._id,
                checkinDate: { $gte: sevenDaysAgo }
            });
            if (checkinCount === 0) {
                const lastCheckin = await Checkin.findOne({ customerId: customer._id }).sort({ checkinDate: -1 });
                const daysAbsent = lastCheckin
                    ? Math.ceil((new Date(today) - new Date(lastCheckin.checkinDate)) / (1000 * 60 * 60 * 24))
                    : -1;
                absenceCustomers.push({
                    ...customer.toObject(),
                    last_checkin: lastCheckin ? lastCheckin.checkinDate : '从未打卡',
                    days_absent: daysAbsent
                });
            }
        }
        absenceCustomers.sort((a, b) => b.days_absent - a.days_absent);
        res.json(absenceCustomers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 客户搜索
app.get('/api/customers/search', async (req, res) => {
    try {
        const { q } = req.query;
        const customers = await Customer.find({
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { phone: { $regex: q, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: '轻刻运动健身房管理系统运行正常',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`服务器运行在端口 ${PORT}`);
    });
}

module.exports = app; 