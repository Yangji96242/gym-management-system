import dbConnect from '../../lib/mongodb';
import Checkin from '../../models/Checkin';
import Customer from '../../models/Customer';

export default async function handler(req, res) {
  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const { date } = req.query;
        let query = {};
        
        if (date) {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);
          
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
        res.status(500).json({ error: '获取打卡记录失败' });
      }
      break;

    case 'POST':
      try {
        const { customerId } = req.body;
        
        // 检查客户是否存在
        const customer = await Customer.findById(customerId);
        if (!customer) {
          return res.status(404).json({ error: '客户不存在' });
        }
        
        // 检查今日是否已打卡
        const today = new Date();
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
          checkinDate: new Date()
        });
        await checkin.save();
        
        res.status(201).json(checkin);
      } catch (error) {
        console.error('打卡失败:', error);
        res.status(500).json({ error: '打卡失败' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 