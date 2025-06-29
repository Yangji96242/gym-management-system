export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 检查环境变量
    const envCheck = {
      MONGODB_URI: process.env.MONGODB_URI ? '✅ Set' : '❌ Not set',
      NODE_ENV: process.env.NODE_ENV || '❌ Not set',
      VERCEL_ENV: process.env.VERCEL_ENV || '❌ Not set'
    };

    // 基本功能检查
    const basicChecks = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    };

    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      basic: basicChecks,
      message: 'Health check completed without MongoDB connection'
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 