import { connectDB } from '../../lib/mongodb';
import Customer from '../../models/Customer';

export default async function handler(req, res) {
  console.log(`📝 [${req.method}] /api/customers - Starting request`);
  
  // 检查环境变量
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

  switch (req.method) {
    case 'GET':
      console.log('📋 Getting customer list...');
      try {
        const customers = await Customer.find({}).sort({ createdAt: -1 });
        console.log(`✅ Found ${customers.length} customers`);
        res.status(200).json(customers);
      } catch (error) {
        console.error('❌ 获取客户列表失败:', error);
        res.status(500).json({ 
          error: '获取客户列表失败', 
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
      break;

    case 'POST':
      console.log('➕ Creating new customer...', req.body);
      try {
        const { name, phone, startDate, endDate, notes } = req.body;
        
        // 验证必填字段
        if (!name || !phone || !startDate || !endDate) {
          console.error('❌ Missing required fields:', { name, phone, startDate, endDate });
          return res.status(400).json({ 
            error: '缺少必填字段',
            details: '请填写姓名、手机号、开始日期和结束日期'
          });
        }
        
        const customerData = {
          name,
          phone,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          notes: notes || ''
        };
        
        const customer = new Customer(customerData);
        await customer.save();
        console.log('✅ Customer created successfully:', customer._id);
        res.status(201).json(customer);
      } catch (error) {
        console.error('❌ 创建客户失败:', error);
        if (error.code === 11000) {
          res.status(400).json({ error: '手机号已存在' });
        } else {
          res.status(500).json({ 
            error: '创建客户失败', 
            details: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
      break;

    case 'PUT':
      console.log('✏️ Updating customer...', req.body);
      try {
        const { id, ...updateData } = req.body;
        if (!id) {
          return res.status(400).json({ error: '缺少客户ID' });
        }
        
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
        
        const customer = await Customer.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        );
        
        if (!customer) {
          return res.status(404).json({ error: '客户不存在' });
        }
        
        console.log('✅ Customer updated successfully:', customer._id);
        res.status(200).json(customer);
      } catch (error) {
        console.error('❌ 更新客户失败:', error);
        res.status(500).json({ 
          error: '更新客户失败', 
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
      break;

    case 'DELETE':
      console.log('🗑️ Deleting customer...', req.query);
      try {
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: '缺少客户ID' });
        }
        
        const customer = await Customer.findByIdAndDelete(id);
        
        if (!customer) {
          return res.status(404).json({ error: '客户不存在' });
        }
        
        console.log('✅ Customer deleted successfully:', id);
        res.status(200).json({ message: '客户删除成功' });
      } catch (error) {
        console.error('❌ 删除客户失败:', error);
        res.status(500).json({ 
          error: '删除客户失败', 
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
      break;

    default:
      console.error('❌ Method not allowed:', req.method);
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ 
        error: `Method ${req.method} Not Allowed`,
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        timestamp: new Date().toISOString()
      });
  }
} 