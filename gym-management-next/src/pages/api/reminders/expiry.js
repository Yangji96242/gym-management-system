import { connectDB } from '../../../lib/mongodb';
import Customer from '../../../models/Customer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    
    // 获取7天内到期的客户，按剩余天数排序
    const expiringCustomers = await Customer.find({
      endDate: {
        $gte: today,
        $lte: sevenDaysLater
      }
    }).sort({ endDate: 1 });
    
    // 计算剩余天数并添加续费意向
    const customersWithDays = expiringCustomers.map(customer => {
      const endDate = new Date(customer.endDate);
      const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      
      return {
        ...customer.toObject(),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        isExpired: daysRemaining < 0,
        expiredDays: daysRemaining < 0 ? Math.abs(daysRemaining) : 0
      };
    });
    
    res.status(200).json(customersWithDays);
  } catch (error) {
    console.error('获取到期提醒失败:', error);
    res.status(500).json({ error: '获取到期提醒失败' });
  }
} 