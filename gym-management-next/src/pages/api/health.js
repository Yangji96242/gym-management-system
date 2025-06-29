import dbConnect from '../../lib/mongodb';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
    return;
  }

  try {
    await dbConnect();
    
    res.status(200).json({
      status: 'ok',
      message: '轻刻运动健身房管理系统运行正常',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        ready_state: mongoose.connection.readyState
      },
      mongodb_uri_set: !!process.env.MONGODB_URI
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '系统检查失败',
      error: error.message
    });
  }
} 