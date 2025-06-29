export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 基本功能测试
    const testResults = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      tests: {
        basicFunctionality: '✅ Working',
        environmentVariables: {
          NODE_ENV: process.env.NODE_ENV || '❌ Not set',
          VERCEL_ENV: process.env.VERCEL_ENV || '❌ Not set',
          MONGODB_URI: process.env.MONGODB_URI ? '✅ Set' : '❌ Not set'
        },
        systemInfo: {
          platform: process.platform,
          nodeVersion: process.version,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        }
      },
      message: 'Basic API functionality test completed'
    };

    res.status(200).json(testResults);
  } catch (error) {
    console.error('Test API failed:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 