import dbConnect from '../../../lib/mongodb';
import Customer from '../../../models/Customer';
import Checkin from '../../../models/Checkin';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  await dbConnect();

  switch (method) {
    case 'DELETE':
      try {
        await Checkin.deleteMany({ customerId: id });
        await Customer.findByIdAndDelete(id);
        res.status(200).json({ message: '客户删除成功' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
      break;
    default:
      res.setHeader('Allow', ['DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
} 