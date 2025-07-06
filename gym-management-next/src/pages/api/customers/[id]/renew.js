import { connectDB } from '../../../../lib/mongodb';
import Customer from '../../../../models/Customer';

export default async function handler(req, res) {
  console.log(`📝 [${req.method}] /api/customers/[id]/renew - Starting request`);
  
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return res.status(500).json({ 
      error: 'Database configuration error',
      details: 'MONGODB_URI environment variable is not set'
    });
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    return res.status(500).json({ 
      error: '数据库连接失败',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }

  const { id } = req.query;

  switch (req.method) {
    case 'POST':
      console.log('➕ Adding new project for customer...', req.body);
      try {
        const { projectType, startDate, endDate, notes } = req.body;
        
        // 验证必填字段
        if (!projectType || !startDate || !endDate) {
          console.error('❌ Missing required fields:', { projectType, startDate, endDate });
          return res.status(400).json({ 
            error: '缺少必填字段',
            details: '请填写项目类型、开始日期和结束日期'
          });
        }
        
        // 查找客户
        const customer = await Customer.findById(id);
        if (!customer) {
          return res.status(404).json({ error: '客户不存在' });
        }
        
        // 创建新项目记录
        const newProject = {
          projectType,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          notes: notes || '',
          createdAt: new Date()
        };
        
        // 添加到projects数组
        customer.projects.push(newProject);
        
        // 更新客户的主要项目信息（保持向后兼容）
        customer.projectType = projectType;
        customer.startDate = new Date(startDate);
        customer.endDate = new Date(endDate);
        
        await customer.save();
        
        console.log('✅ New project added successfully for customer:', customer._id);
        res.status(201).json({
          message: '续课成功',
          customer: customer
        });
      } catch (error) {
        console.error('❌ 添加新项目失败:', error);
        res.status(500).json({ 
          error: '添加新项目失败', 
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
      break;

    default:
      console.error('❌ Method not allowed:', req.method);
      res.setHeader('Allow', ['POST']);
      res.status(405).json({ 
        error: `Method ${req.method} Not Allowed`,
        allowedMethods: ['POST'],
        timestamp: new Date().toISOString()
      });
  }
} 