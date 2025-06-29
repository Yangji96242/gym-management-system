import dbConnect from '../../lib/mongodb';
import Checkin from '../../models/Checkin';

export default async function handler(req, res) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    case 'POST':
      try {
        const { customerId, checkinDate, checkinTime } = req.body;
        const checkin = new Checkin({ customerId, checkinDate, checkinTime });
        await checkin.save();
        res.status(200).json({ id: checkin._id, message: '打卡成功' });
      } catch (error) {
        if (error.code === 11000) {
          res.status(400).json({ error: '该客户今天已经打卡' });
        } else {
          res.status(500).json({ error: error.message });
        }
      }
      break;
    default:
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
} 