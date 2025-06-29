import dbConnect from '../../lib/mongodb';
import Customer from '../../models/Customer';

export default async function handler(req, res) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.status(200).json(customers);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
      break;
    case 'POST':
      try {
        const { name, phone, gender, projectType, startDate, endDate, notes, renewalIntent } = req.body;
        const customer = new Customer({ name, phone, gender, projectType, startDate, endDate, notes, renewalIntent });
        await customer.save();
        res.status(200).json({ id: customer._id, message: '客户添加成功' });
      } catch (error) {
        if (error.code === 11000) {
          res.status(400).json({ error: '该手机号已存在' });
        } else {
          res.status(500).json({ error: error.message });
        }
      }
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
} 