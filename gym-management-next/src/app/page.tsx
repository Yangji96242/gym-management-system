import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            健身房管理系统
          </h1>
          <p className="text-lg text-gray-600">
            专业的会员管理和健身追踪平台
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* 客户管理 */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">客户管理</h3>
                <p className="text-gray-600 text-sm">
                  管理会员信息、续费提醒、健身计划
                </p>
              </div>
              <div className="space-y-2">
                <Link 
                  href="/api/customers" 
                  className="block w-full text-center bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                >
                  查看客户列表
                </Link>
                <Link 
                  href="/api/customers" 
                  className="block w-full text-center border border-blue-500 text-blue-500 py-2 px-4 rounded hover:bg-blue-50 transition-colors"
                >
                  添加新客户
                </Link>
              </div>
            </div>

            {/* 打卡管理 */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">打卡管理</h3>
                <p className="text-gray-600 text-sm">
                  会员打卡记录、出勤统计
                </p>
              </div>
              <div className="space-y-2">
                <Link 
                  href="/api/checkins/today" 
                  className="block w-full text-center bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
                >
                  今日打卡
                </Link>
                <Link 
                  href="/api/checkins" 
                  className="block w-full text-center border border-green-500 text-green-500 py-2 px-4 rounded hover:bg-green-50 transition-colors"
                >
                  打卡记录
                </Link>
              </div>
            </div>

            {/* 提醒系统 */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.19 4.19A2 2 0 004 6v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-1.81 1.19zM12 8v4m0 4h.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">提醒系统</h3>
                <p className="text-gray-600 text-sm">
                  到期提醒、缺席提醒、续费提醒
                </p>
              </div>
              <div className="space-y-2">
                <Link 
                  href="/api/reminders/expiry" 
                  className="block w-full text-center bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition-colors"
                >
                  到期提醒
                </Link>
                <Link 
                  href="/api/reminders/absence" 
                  className="block w-full text-center border border-orange-500 text-orange-500 py-2 px-4 rounded hover:bg-orange-50 transition-colors"
                >
                  缺席提醒
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">系统概览</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-500 mb-2">0</div>
                <div className="text-gray-600">总会员数</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500 mb-2">0</div>
                <div className="text-gray-600">今日打卡</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500 mb-2">0</div>
                <div className="text-gray-600">待处理提醒</div>
              </div>
            </div>
          </div>

          {/* API Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">API 状态</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-700">健康检查</span>
                <Link 
                  href="/api/health" 
                  className="text-blue-500 hover:underline"
                >
                  检查状态
                </Link>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-700">数据库连接</span>
                <span className="text-green-500">正常</span>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-500">
          <p>&copy; 2024 健身房管理系统. 基于 Next.js 构建</p>
        </footer>
      </div>
    </div>
  );
}
