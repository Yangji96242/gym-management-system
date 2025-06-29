import dbConnect from '../../../lib/mongodb';
import Checkin from '../../../models/Checkin';
import Customer from '../../../models/Customer';

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
    return;
  }

  await dbConnect();

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
    
    res.status(200).json(result);
  } catch (error) {
    console.error('获取今日打卡记录失败:', error);
    res.status(500).json({ error: error.message });
  }
} 