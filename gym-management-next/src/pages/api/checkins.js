import { connectDB } from '../../lib/mongodb';
import Checkin from '../../models/Checkin';
import Customer from '../../models/Customer';

// 获取中国时间的工具函数
const getChinaTime = () => {
  const now = new Date();
  return new Date(now.getTime() + 8 * 60 * 60 * 1000);
};

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    return res.status(500).json({ error: '数据库连接失败' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const { date } = req.query;
        let query = {};
        
        if (date) {
          // 使用中国时间处理日期查询
          const startOfDay = new Date(date + 'T00:00:00.000+08:00');
          const endOfDay = new Date(date + 'T23:59:59.999+08:00');
          
          query.checkinDate = {
            $gte: startOfDay,
            $lte: endOfDay
          };
        }
        
        const checkins = await Checkin.find(query)
          .populate('customerId', 'name phone')
          .sort({ checkinDate: -1 });
        
        res.status(200).json(checkins);
      } catch (error) {
        console.error('获取打卡记录失败:', error);
        res.status(500).json({ error: '获取打卡记录失败', details: error.message });
      }
      break;

    case 'POST':
      try {
        const { customerId } = req.body;
        
        if (!customerId) {
          return res.status(400).json({ error: '缺少客户ID' });
        }
        
        // 检查客户是否存在
        const customer = await Customer.findById(customerId);
        if (!customer) {
          return res.status(404).json({ error: '客户不存在' });
        }
        
        // 使用中国时间获取今天的日期范围
        const cnTime = getChinaTime();
        const today = new Date(cnTime);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const existingCheckin = await Checkin.findOne({
          customerId,
          checkinDate: {
            $gte: today,
            $lt: tomorrow
          }
        });
        
        if (existingCheckin) {
          return res.status(400).json({ error: '今日已打卡' });
        }
        
        // 创建打卡记录
        const checkin = new Checkin({
          customerId,
          customerName: customer.name,
          checkinDate: cnTime // 使用中国时间
        });
        await checkin.save();
        
        res.status(201).json(checkin);
      } catch (error) {
        console.error('打卡失败:', error);
        res.status(500).json({ error: '打卡失败', details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 