module.exports = (req, res) => {
  res.json({
    message: 'Vercel 部署测试成功',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    mongodb_uri_set: !!process.env.MONGODB_URI
  });
}; 