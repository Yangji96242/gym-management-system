import dbConnect from '../../../lib/mongodb';
import Customer from '../../../models/Customer';
import Checkin from '../../../models/Checkin';

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
    return;
  }

  await dbConnect();

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
    res.status(200).json(absenceCustomers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 