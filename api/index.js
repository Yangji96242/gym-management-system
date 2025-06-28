const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // 只处理 GET 请求
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    // 读取 index.html 文件
    const indexPath = path.join(__dirname, '../public/index.html');
    const htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(htmlContent);
  } catch (error) {
    console.error('Error reading index.html:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to load index.html'
    });
  }
}; 