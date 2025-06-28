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

// 定时任务：每天中国时间0点自动刷新今日打卡列表
function scheduleDailyCheckinReset() {
    const now = new Date();
    // 手动计算中国时间（UTC+8）
    const cnTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    
    // 计算下一个0点的时间
    const nextReset = new Date(cnTime);
    nextReset.setHours(0, 0, 0, 0);
    
    // 如果今天已经过了0点，设置为明天0点
    if (cnTime >= nextReset) {
        nextReset.setDate(nextReset.getDate() + 1);
    }
    
    const timeUntilReset = nextReset.getTime() - cnTime.getTime();
    
    console.log(`下次刷新今日打卡列表时间: ${nextReset.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    
    setTimeout(() => {
        console.log('执行每日打卡列表刷新...');
        // 这里可以添加清空逻辑，比如删除过期的打卡记录
        // 目前只是日志记录，实际清空可以在需要时添加
        scheduleDailyCheckinReset(); // 设置下一天的定时任务
    }, timeUntilReset);
}

// 启动定时任务
scheduleDailyCheckinReset();

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
        const { name, phone, gender, projectType, startDate, endDate, notes, renewalIntent } = req.body;
        const customer = new Customer({ name, phone, gender, projectType, startDate, endDate, notes, renewalIntent });
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
        // 使用中国时间获取今天的日期
        const now = new Date();
        // 手动计算中国时间（UTC+8）
        const cnTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const today = cnTime.toISOString().split('T')[0];
        
        console.log(`服务器时间: ${now.toISOString()}`);
        console.log(`中国时间: ${cnTime.toISOString()}`);
        console.log(`今日日期: ${today}`);
        
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
            
        console.log(`找到 ${checkins.length} 条今日打卡记录`);
        
        const result = checkins.map(checkin => ({
            id: checkin._id,
            checkin_time: checkin.checkinTime,
            name: checkin.customerId.name,
            phone: checkin.customerId.phone
        }));
        
        res.json(result);
    } catch (error) {
        console.error('获取今日打卡记录失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 到期提醒（显示所有客户，前端处理排序）
app.get('/api/reminders/expiry', async (req, res) => {
    try {
        // 使用中国时间
        const now = new Date();
        // 手动计算中国时间（UTC+8）
        const cnTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const today = cnTime.toISOString().split('T')[0];
        
        // 获取所有客户，排除续费意向为"无意向"的客户，让前端处理排序
        const customers = await Customer.find({ 
            renewalIntent: { $ne: '无意向' } 
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

// 缺席提醒（3天以上没有参与今日打卡的客户）
app.get('/api/reminders/absence', async (req, res) => {
    try {
        // 使用中国时间
        const now = new Date();
        // 手动计算中国时间（UTC+8）
        const cnTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const today = cnTime.toISOString().split('T')[0];
        
        // 获取所有客户
        const customers = await Customer.find();
        const absenceCustomers = [];
        
        for (const customer of customers) {
            // 查找该客户最近3天的打卡记录
            const threeDaysAgo = new Date(cnTime.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const recentCheckins = await Checkin.find({
                customerId: customer._id,
                checkinDate: { $gte: threeDaysAgo }
            }).sort({ checkinDate: -1 });
            
            // 如果3天内没有打卡记录，则加入缺席提醒
            if (recentCheckins.length === 0) {
                // 查找最后一次打卡记录
                const lastCheckin = await Checkin.findOne({ customerId: customer._id }).sort({ checkinDate: -1 });
                
                let daysAbsent = 0;
                let lastCheckinText = '从未打卡';
                
                if (lastCheckin) {
                    const lastCheckinDate = new Date(lastCheckin.checkinDate);
                    const todayDate = new Date(today);
                    daysAbsent = Math.ceil((todayDate - lastCheckinDate) / (1000 * 60 * 60 * 24));
                    lastCheckinText = `上次打卡: ${lastCheckin.checkinDate}`;
                } else {
                    daysAbsent = -1; // 从未打卡
                }
                
                absenceCustomers.push({
                    ...customer.toObject(),
                    last_checkin: lastCheckinText,
                    days_absent: daysAbsent
                });
            }
        }
        
        // 按缺席天数降序排列
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

// 修改客户续费意向
app.patch('/api/customers/:id/renewal-intent', async (req, res) => {
    try {
        const { id } = req.params;
        const { renewalIntent } = req.body;
        if (!['低', '中', '高', '无意向'].includes(renewalIntent)) {
            return res.status(400).json({ error: '无效的续费意向' });
        }
        await Customer.findByIdAndUpdate(id, { renewalIntent });
        res.json({ message: '续费意向已更新' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 修改客户备注
app.patch('/api/customers/:id/notes', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        await Customer.findByIdAndUpdate(id, { notes });
        res.json({ message: '客户备注已更新' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 修改客户评论
app.patch('/api/customers/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const { comments } = req.body;
        await Customer.findByIdAndUpdate(id, { comments });
        res.json({ message: '客户评论已更新' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`服务器运行在端口 ${PORT}`);
    });
}

module.exports = app; 