import dbConnect from '../../../lib/mongodb';
import Customer from '../../../models/Customer';
import Checkin from '../../../models/Checkin';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    res.status(405).end(`Method ${method} Not Allowed`);
    return;
  }

  await dbConnect();

  try {
    const { renewalIntent, notes } = req.body;
    
    // 构建更新对象
    const updateData = {};
    
    // 如果提供了续费意向，验证并添加
    if (renewalIntent !== undefined) {
      if (!['高意向', '中意向', '低意向', '放弃'].includes(renewalIntent)) {
        return res.status(400).json({ error: '无效的续费意向' });
      }
      updateData.renewalIntent = renewalIntent;
    }
    
    // 如果提供了备注，添加
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    // 如果没有提供任何要更新的字段
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: '没有提供要更新的字段' });
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ error: '客户不存在' });
    }

    res.status(200).json(customer);
  } catch (error) {
    console.error('更新续费意向失败:', error);
    res.status(500).json({ error: error.message });
  }
} 