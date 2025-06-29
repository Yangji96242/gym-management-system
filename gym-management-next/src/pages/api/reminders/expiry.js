import dbConnect from '../../../lib/mongodb';
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
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 