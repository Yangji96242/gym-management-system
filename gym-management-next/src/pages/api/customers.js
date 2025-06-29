import { connectDB } from '../../lib/mongodb';
import Customer from '../../models/Customer';

export default async function handler(req, res) {
  await connectDB();

  switch (req.method) {
    case 'GET':
      try {
        const customers = await Customer.find({}).sort({ createdAt: -1 });
        res.status(200).json(customers);
      } catch (error) {
        console.error('获取客户列表失败:', error);
        res.status(500).json({ error: '获取客户列表失败' });
      }
      break;

    case 'POST':
      try {
        const customerData = {
          ...req.body,
          startDate: new Date(req.body.startDate),
          endDate: new Date(req.body.endDate)
        };
        const customer = new Customer(customerData);
        await customer.save();
        res.status(201).json(customer);
      } catch (error) {
        console.error('创建客户失败:', error);
        res.status(500).json({ error: '创建客户失败' });
      }
      break;

    case 'PUT':
      try {
        const { id, ...updateData } = req.body;
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
        
        res.status(200).json(customer);
      } catch (error) {
        console.error('更新客户失败:', error);
        res.status(500).json({ error: '更新客户失败' });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.query;
        const customer = await Customer.findByIdAndDelete(id);
        
        if (!customer) {
          return res.status(404).json({ error: '客户不存在' });
        }
        
        res.status(200).json({ message: '客户删除成功' });
      } catch (error) {
        console.error('删除客户失败:', error);
        res.status(500).json({ error: '删除客户失败' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 