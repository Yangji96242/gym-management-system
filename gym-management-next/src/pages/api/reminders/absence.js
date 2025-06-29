import { connectDB } from '../../../lib/mongodb';
import Checkin from '../../../models/Checkin';
import Customer from '../../../models/Customer';

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
    return;
  }

  try {
    await connectDB();
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    return res.status(500).json({ error: '数据库连接失败' });
  }

  try {
    // 使用中国时间获取今天的日期
    const now = new Date();
    const cnTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const today = new Date(cnTime);
    today.setHours(0, 0, 0, 0);
    
    // 计算3天前的日期
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    
    console.log('调试信息:');
    console.log('当前时间:', now.toISOString());
    console.log('中国时间:', cnTime.toISOString());
    console.log('今天日期:', today.toISOString());
    console.log('3天前日期:', threeDaysAgo.toISOString());
    
    // 获取所有客户
    const customers = await Customer.find({});
    console.log('总客户数:', customers.length);
    
    // 获取每个客户最后一次打卡记录
    const absenceReminders = [];
    
    for (const customer of customers) {
      // 查找该客户最后一次打卡记录
      const lastCheckin = await Checkin.findOne({ customerId: customer._id })
        .sort({ checkinDate: -1 })
        .limit(1);
      
      if (!lastCheckin) {
        // 如果从未打卡过，显示在缺席提醒中（无论创建时间多久）
        const customerCreatedAt = new Date(customer.createdAt);
        const daysSinceCreation = Math.floor((today.getTime() - customerCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`客户 ${customer.name} 从未打卡，创建时间: ${customerCreatedAt.toISOString()}, 天数: ${daysSinceCreation}`);
        
        // 移除天数限制，让所有从未打卡的客户都显示
        absenceReminders.push({
          customer: {
            _id: customer._id,
            name: customer.name,
            phone: customer.phone,
            gender: customer.gender,
            projectType: customer.projectType,
            startDate: customer.startDate,
            endDate: customer.endDate,
            notes: customer.notes,
            createdAt: customer.createdAt
          },
          daysAbsent: 0, // 新客户显示为0天缺席
          lastCheckinDate: null,
          neverCheckedIn: true
        });
      } else {
        // 计算距离最后一次打卡的天数
        const lastCheckinDate = new Date(lastCheckin.checkinDate);
        const daysSinceLastCheckin = Math.floor((today.getTime() - lastCheckinDate.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`客户 ${customer.name} 最后打卡: ${lastCheckinDate.toISOString()}, 天数: ${daysSinceLastCheckin}`);
        
        if (daysSinceLastCheckin > 3) {
          absenceReminders.push({
            customer: {
              _id: customer._id,
              name: customer.name,
              phone: customer.phone,
              gender: customer.gender,
              projectType: customer.projectType,
              startDate: customer.startDate,
              endDate: customer.endDate,
              notes: customer.notes,
              createdAt: customer.createdAt
            },
            daysAbsent: daysSinceLastCheckin,
            lastCheckinDate: lastCheckinDate,
            neverCheckedIn: false
          });
        }
      }
    }
    
    console.log('缺席提醒数量:', absenceReminders.length);
    
    // 按缺席天数排序，缺席天数多的排在前面
    absenceReminders.sort((a, b) => b.daysAbsent - a.daysAbsent);
    
    res.status(200).json(absenceReminders);
  } catch (error) {
    console.error('获取缺席提醒失败:', error);
    res.status(500).json({ error: '获取缺席提醒失败', details: error.message });
  }
} 