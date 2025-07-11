'use client';

import { useState, useEffect } from 'react';

// 获取中国时间的工具函数
const getChinaTime = () => {
  const now = new Date();
  return new Date(now.getTime() + 8 * 60 * 60 * 1000);
};

interface Customer {
  _id: string;
  name: string;
  phone: string;
  gender: string;
  projectType: string;
  startDate: string;
  endDate: string;
  notes?: string;
  renewalIntent?: string;
  createdAt: string;
  projects?: Array<{
    _id?: string;
    projectType: string;
    startDate: string;
    endDate: string;
    notes?: string;
    createdAt: string;
  }>;
}

interface ExpiryReminder {
  customer: Customer;
  daysRemaining: number;
  isExpired: boolean;
}

interface AbsenceReminder {
  customer: Customer;
  daysAbsent: number;
  lastCheckinDate: string | null;
  neverCheckedIn: boolean;
}

interface TodayCheckin {
  _id: string;
  customerId: {
    _id: string;
    name: string;
    phone: string;
  };
  checkinDate: string;
  customerName: string;
}

export default function Home() {
  const [currentTime, setCurrentTime] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expiryReminders, setExpiryReminders] = useState<ExpiryReminder[]>([]);
  const [absenceReminders, setAbsenceReminders] = useState<AbsenceReminder[]>([]);
  const [todayCheckins, setTodayCheckins] = useState<TodayCheckin[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinSearchTerm, setCheckinSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [absenceLoading, setAbsenceLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: '',
    projectType: '',
    startDate: '',
    endDate: '',
    notes: '',
    renewalIntent: '中意向'
  });
  const [editCommentMap, setEditCommentMap] = useState<{ [id: string]: string }>({});
  const [commentLoadingMap, setCommentLoadingMap] = useState<{ [id: string]: boolean }>({});
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedCustomerForRenew, setSelectedCustomerForRenew] = useState<Customer | null>(null);
  const [renewFormData, setRenewFormData] = useState({
    projectType: '',
    startDate: '',
    endDate: '',
    notes: ''
  });
  const [renewLoading, setRenewLoading] = useState(false);

  // 计算到期提醒
  const calculateExpiryReminders = (customers: Customer[]): ExpiryReminder[] => {
    // 使用中国时间获取今天的日期
    const cnTime = getChinaTime();
    const today = new Date(cnTime);
    today.setHours(0, 0, 0, 0); // 设置时间为当天0点
    
    console.log('计算到期提醒，当前日期:', today.toISOString());
    
    const reminders = customers
      .filter(customer => customer.renewalIntent !== '放弃') // 过滤掉续费意向为"放弃"的客户
      .map(customer => {
        const endDate = new Date(customer.endDate);
        endDate.setHours(0, 0, 0, 0);
        
        const timeDiff = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        console.log(`客户 ${customer.name} 到期日期: ${endDate.toISOString()}, 剩余天数: ${daysRemaining}, 备注: ${customer.notes || '无'}, 续费意向: ${customer.renewalIntent || '未设置'}`);
        
        return {
          customer,
          daysRemaining,
          isExpired: daysRemaining < 0
        };
      })
      .filter(reminder => reminder.daysRemaining <= 7) // 只显示7天内到期的
      .sort((a, b) => {
        // 按剩余天数排序，过期的最前面，然后按剩余天数从少到多
        if (a.isExpired && !b.isExpired) return -1;
        if (!a.isExpired && b.isExpired) return 1;
        return a.daysRemaining - b.daysRemaining;
      });
    
    console.log('到期提醒过滤后的客户数量:', reminders.length);
    reminders.forEach(r => {
      console.log(`- ${r.customer.name}: 剩余${r.daysRemaining}天, 备注: ${r.customer.notes || '无'}, 续费意向: ${r.customer.renewalIntent || '未设置'}`);
    });
    
    return reminders;
  };

  // 获取客户列表
  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
        // 计算到期提醒
        const reminders = calculateExpiryReminders(data);
        setExpiryReminders(reminders);
        console.log('客户列表更新，到期提醒数量:', reminders.length);
        console.log('到期提醒数据:', reminders);
      } else {
        console.error('获取客户列表失败:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('错误详情:', errorData);
      }
    } catch (error) {
      console.error('获取客户列表失败:', error);
    }
  };

  // 获取缺席提醒
  const fetchAbsenceReminders = async () => {
    setAbsenceLoading(true);
    try {
      const response = await fetch('/api/reminders/absence');
      if (response.ok) {
        const data = await response.json();
        setAbsenceReminders(data);
        console.log('缺席提醒数据:', data);
      } else {
        console.error('获取缺席提醒失败:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('错误详情:', errorData);
      }
    } catch (error) {
      console.error('获取缺席提醒失败:', error);
    } finally {
      setAbsenceLoading(false);
    }
  };

  // 获取今日打卡记录
  const fetchTodayCheckins = async () => {
    try {
      // 使用中国时间获取今天的日期
      const cnTime = getChinaTime();
      const today = cnTime.toISOString().split('T')[0];
      const response = await fetch(`/api/checkins?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        setTodayCheckins(data);
      } else {
        console.error('获取今日打卡记录失败:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('错误详情:', errorData);
      }
    } catch (error) {
      console.error('获取今日打卡记录失败:', error);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('zh-CN'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    // 获取客户列表
    fetchCustomers();
    
    // 获取缺席提醒
    fetchAbsenceReminders();
    
    // 获取今日打卡记录
    fetchTodayCheckins();
    
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        alert('客户添加成功！');
        setFormData({
          name: '',
          phone: '',
          gender: '',
          projectType: '',
          startDate: '',
          endDate: '',
          notes: '',
          renewalIntent: '中意向'
        });
        // 刷新客户列表
        await fetchCustomers();
        
        // 刷新缺席提醒
        await fetchAbsenceReminders();
      } else {
        const errorData = await response.json().catch(() => ({ error: '未知错误' }));
        console.error('添加客户失败:', response.status, response.statusText, errorData);
        alert(errorData.error || `添加失败 (${response.status})，请重试`);
      }
    } catch (error) {
      console.error('添加客户网络错误:', error);
      alert('网络连接失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 格式化日期时间（详细到秒钟）
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 手机号脱敏函数
  const maskPhoneNumber = (phone: string) => {
    if (!phone || phone.length !== 11) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  };

  // 处理手机号点击
  const handlePhoneClick = () => {
    if (!isPasswordVerified) {
      setShowPasswordModal(true);
    }
  };

  // 验证密码
  const handlePasswordSubmit = () => {
    if (passwordInput === '0710') {
      setIsPasswordVerified(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('密码错误，请重试');
    }
  };

  // 关闭密码弹框
  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordInput('');
    setPasswordError('');
  };

  // 过滤今日打卡记录
  const filteredTodayCheckins = todayCheckins.filter(checkin => 
    checkin.customerName.toLowerCase().includes(checkinSearchTerm.toLowerCase()) ||
    checkin.customerId.phone.includes(checkinSearchTerm)
  );

  // 过滤客户列表
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.phone.includes(customerSearchTerm)
  );

  // 过滤未打卡的客户（用于打卡选择）
  const availableForCheckin = customers.filter(customer => 
    !todayCheckins.some(checkin => checkin.customerId._id === customer._id)
  );

  // 格式化缺席天数显示
  const formatAbsenceDays = (daysAbsent: number, neverCheckedIn: boolean) => {
    if (neverCheckedIn) {
      if (daysAbsent === 0) {
        return '注册后从未打卡';
      } else if (daysAbsent === 1) {
        return '昨天注册未打卡';
      } else {
        return `注册${daysAbsent}天未打卡`;
      }
    } else if (daysAbsent === 1) {
      return '昨天没来';
    } else {
      return `${daysAbsent}天没来了`;
    }
  };

  // 获取续费意向样式
  const getRenewalIntentStyle = (renewalIntent: string) => {
    switch (renewalIntent) {
      case '高意向':
        return 'bg-green-100 text-green-800 border-green-300';
      case '中意向':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case '低意向':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case '放弃':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // 执行打卡操作
  const handleCheckin = async () => {
    if (!selectedCustomerId) {
      alert('请选择客户');
      return;
    }

    setCheckinLoading(true);
    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId: selectedCustomerId }),
      });

      if (response.ok) {
        alert('打卡成功！');
        setSelectedCustomerId('');
        // 刷新今日打卡记录
        await fetchTodayCheckins();
        // 刷新缺席提醒
        await fetchAbsenceReminders();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '打卡失败，请重试');
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setCheckinLoading(false);
    }
  };

  // 更新续费意向
  const handleRenewalIntentChange = async (customerId: string, renewalIntent: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ renewalIntent }),
      });

      if (response.ok) {
        // 刷新客户列表和到期提醒
        await fetchCustomers();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '更新失败，请重试');
      }
    } catch {
      alert('网络错误，请重试');
    }
  };

  // 删除客户
  const handleDeleteCustomer = async (customerId: string) => {
    if (!window.confirm('确定要删除该客户吗？此操作不可恢复！')) return;
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchCustomers();
        await fetchAbsenceReminders();
        await fetchTodayCheckins();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '删除失败，请重试');
      }
    } catch {
      alert('网络错误，删除失败');
    }
  };

  // 保存评论
  const handleSaveComment = async (customerId: string, comment: string) => {
    const customer = customers.find(c => c._id === customerId);
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: comment, renewalIntent: customer?.renewalIntent || '中意向' }),
      });
      if (response.ok) {
        console.log('评论保存成功，开始刷新数据...');
        await fetchCustomers(); // 这会重新获取客户列表并计算到期提醒
        await fetchAbsenceReminders();
        console.log('数据刷新完成');
      } else {
        const errorData = await response.json();
        alert(errorData.error || '保存失败，请重试');
      }
    } catch {
      alert('网络错误，保存失败');
    }
  };

  // 打开续课弹窗
  const handleOpenRenewModal = (customer: Customer) => {
    setSelectedCustomerForRenew(customer);
    setRenewFormData({
      projectType: '',
      startDate: '',
      endDate: '',
      notes: ''
    });
    setShowRenewModal(true);
  };

  // 关闭续课弹窗
  const handleCloseRenewModal = () => {
    setShowRenewModal(false);
    setSelectedCustomerForRenew(null);
    setRenewFormData({
      projectType: '',
      startDate: '',
      endDate: '',
      notes: ''
    });
  };

  // 处理续课表单输入
  const handleRenewInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRenewFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 提交续课
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForRenew) return;

    setRenewLoading(true);
    try {
      const response = await fetch(`/api/customers/${selectedCustomerForRenew._id}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(renewFormData),
      });

      if (response.ok) {
        alert('续课成功！');
        handleCloseRenewModal();
        // 刷新客户列表
        await fetchCustomers();
        await fetchAbsenceReminders();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '续课失败，请重试');
      }
    } catch (error) {
      console.error('续课失败:', error);
      alert('网络错误，续课失败');
    } finally {
      setRenewLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-6">
        {/* 头部区域 */}
        <header className="bg-white rounded-lg shadow-md p-6 mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6v6m0 0v6m0-6h6m-6 0H9" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">轻刻运动</h1>
          </div>
          <div className="text-gray-600 font-medium">
            {currentTime}
          </div>
        </header>

        {/* 主要内容区域 */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧面板 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 提醒区域 */}
            <div className="space-y-6">
              {/* 到期提醒 */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  到期提醒
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {expiryReminders.length === 0 ? (
                    <div className="text-gray-500 text-center py-6">
                      <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm">暂无到期提醒</p>
                    </div>
                  ) : (
                    expiryReminders.map(customer => {
                      // 使用中国时间计算剩余天数
                      const cnTime = getChinaTime();
                      const daysRemaining = Math.ceil((new Date(customer.customer.endDate).getTime() - cnTime.getTime()) / (1000 * 60 * 60 * 24));
                      const isExpired = daysRemaining < 0;
                      const urgencyColor = isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-yellow-600';
                      const urgencyBg = isExpired ? 'bg-red-50 border-red-200' : daysRemaining <= 3 ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200';
                      
                      // 调试信息：显示客户备注
                      console.log(`客户 ${customer.customer.name} 的备注:`, customer.customer.notes);
                      
                      return (
                        <div key={customer.customer._id} className={`bg-white rounded-lg shadow-sm border ${urgencyBg} hover:shadow-md transition-all duration-200 p-3`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-semibold text-xs">
                                  {customer.customer.name.charAt(0)}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-semibold text-gray-900 text-sm truncate">{customer.customer.name}</h3>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${urgencyColor} ${urgencyBg}`}>
                                    {isExpired ? `已过期${Math.abs(daysRemaining)}天` : `剩余${daysRemaining}天`}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                  <span 
                                    className="cursor-pointer hover:text-blue-600 transition-colors"
                                    onClick={handlePhoneClick}
                                    title={isPasswordVerified ? "点击查看完整手机号" : "点击输入密码查看完整手机号"}
                                  >
                                    📱 {isPasswordVerified ? customer.customer.phone : maskPhoneNumber(customer.customer.phone)}
                                  </span>
                                  <span>🏃 {customer.customer.projectType}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                  <span>📅 {formatDate(customer.customer.endDate)}</span>
                                  {customer.customer.notes && <span className="truncate">📝 {customer.customer.notes}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1 ml-2">
                              <select
                                value={customer.customer.renewalIntent || '中意向'}
                                onChange={(e) => handleRenewalIntentChange(customer.customer._id, e.target.value)}
                                className={`text-xs px-2 py-1 rounded border ${getRenewalIntentStyle(customer.customer.renewalIntent || '中意向')} bg-white`}
                              >
                                <option value="高意向">高意向</option>
                                <option value="中意向">中意向</option>
                                <option value="低意向">低意向</option>
                                <option value="放弃">放弃</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 缺席提醒 */}
              <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-red-800 flex items-center">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    缺席提醒
                  </h2>
                  <button 
                    onClick={fetchAbsenceReminders}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    {absenceLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        刷新中...
                      </>
                    ) : (
                      '刷新'
                    )}
                  </button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {absenceReminders.length === 0 ? (
                    <div className="text-gray-500 text-center py-6">
                      <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm">暂无缺席提醒</p>
                    </div>
                  ) : (
                    absenceReminders.map(reminder => {
                      const urgencyColor = reminder.daysAbsent >= 7 ? 'text-red-600' : reminder.daysAbsent >= 5 ? 'text-orange-600' : 'text-yellow-600';
                      const urgencyBg = reminder.daysAbsent >= 7 ? 'bg-red-50 border-red-200' : reminder.daysAbsent >= 5 ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200';
                      
                      return (
                        <div key={reminder.customer._id} className={`bg-white rounded-lg shadow-sm border ${urgencyBg} hover:shadow-md transition-all duration-200 p-3`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                reminder.daysAbsent >= 7 
                                  ? 'bg-gradient-to-br from-red-500 to-red-600' 
                                  : reminder.daysAbsent >= 5
                                  ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                                  : 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                              }`}>
                                <span className="text-white font-semibold text-xs">
                                  {reminder.customer.name.charAt(0)}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-semibold text-gray-900 text-sm truncate">{reminder.customer.name}</h3>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${urgencyColor} ${urgencyBg}`}>
                                    {formatAbsenceDays(reminder.daysAbsent, reminder.neverCheckedIn)}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                  <span 
                                    className="cursor-pointer hover:text-blue-600 transition-colors"
                                    onClick={handlePhoneClick}
                                    title={isPasswordVerified ? "点击查看完整手机号" : "点击输入密码查看完整手机号"}
                                  >
                                    📱 {isPasswordVerified ? reminder.customer.phone : maskPhoneNumber(reminder.customer.phone)}
                                  </span>
                                  <span>👤 {reminder.customer.gender}</span>
                                  <span>🏃 {reminder.customer.projectType}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                  <span>
                                    {reminder.neverCheckedIn 
                                      ? `📅 注册时间: ${formatDate(reminder.customer.createdAt)}`
                                      : `📅 上次打卡: ${reminder.lastCheckinDate ? formatDate(reminder.lastCheckinDate) : '无'}`
                                    }
                                  </span>
                                  {reminder.customer.notes && <span className="truncate">💬 {reminder.customer.notes}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* 客户列表 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                客户列表 ({filteredCustomers.length})
              </h2>
              <div className="relative mb-4">
                <input
                  type="text"
                  id="searchCustomer"
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  placeholder="搜索客户姓名或手机号..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <svg className="w-4 h-4 text-gray-400 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div id="customerList" className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="text-gray-500 text-center py-6">
                    <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm">{customers.length === 0 ? '暂无客户数据' : '没有找到匹配的客户'}</p>
                  </div>
                ) : (
                  filteredCustomers.map(customer => {
                    const editComment = editCommentMap[customer._id] ?? customer.notes ?? '';
                    const commentLoading = commentLoadingMap[customer._id] ?? false;
                    return (
                      <div key={customer._id} className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 p-3 relative">
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <button
                            className="text-gray-400 hover:text-blue-500"
                            title="续课"
                            onClick={() => handleOpenRenewModal(customer)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                          <button
                            className="text-gray-400 hover:text-red-500"
                            title="删除客户"
                            onClick={() => handleDeleteCustomer(customer._id)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex justify-between items-start pr-8">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-xs">
                                {customer.name.charAt(0)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-gray-900 text-sm truncate">{customer.name}</h3>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getRenewalIntentStyle(customer.renewalIntent || '中意向')}`}>{customer.renewalIntent || '中意向'}</span>
                              </div>
                              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                <span 
                                  className="cursor-pointer hover:text-blue-600 transition-colors"
                                  onClick={handlePhoneClick}
                                  title={isPasswordVerified ? "点击查看完整手机号" : "点击输入密码查看完整手机号"}
                                >
                                  📱 {isPasswordVerified ? customer.phone : maskPhoneNumber(customer.phone)}
                                </span>
                                <span>👤 {customer.gender}</span>
                                <span>🏃 {customer.projectType}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                <span>📅 {formatDate(customer.startDate)} - {formatDate(customer.endDate)}</span>
                              </div>
+                              {/* 项目历史 */}
+                              {customer.projects && customer.projects.length > 0 && (
+                                <div className="mt-2 p-2 bg-gray-50 rounded-md">
+                                  <div className="text-xs font-medium text-gray-700 mb-1">📋 项目历史:</div>
+                                  <div className="space-y-1">
+                                    {customer.projects.map((project, index) => (
+                                      <div key={index} className="text-xs text-gray-600 bg-white p-1 rounded border-l-2 border-blue-300">
+                                        <div className="flex justify-between">
+                                          <span className="font-medium">{project.projectType}</span>
+                                          <span className="text-gray-400">{formatDate(project.createdAt)}</span>
+                                        </div>
+                                        <div className="text-gray-500">
+                                          {formatDate(project.startDate)} - {formatDate(project.endDate)}
+                                          {project.notes && <span className="ml-2">💬 {project.notes}</span>}
+                                        </div>
+                                      </div>
+                                    ))}
+                                  </div>
+                                </div>
+                              )}
                              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                <textarea
                                  className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs resize-none"
                                  rows={1}
                                  name={`edit-comment-${customer._id}`}
                                  value={editComment}
                                  onChange={e => setEditCommentMap(map => ({ ...map, [customer._id]: e.target.value }))}
                                  placeholder="评论..."
                                />
                                <button
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                                  disabled={commentLoading || editComment === (customer.notes || '')}
                                  onClick={async () => {
                                    setCommentLoadingMap(map => ({ ...map, [customer._id]: true }));
                                    await handleSaveComment(customer._id, editComment);
                                    setCommentLoadingMap(map => ({ ...map, [customer._id]: false }));
                                  }}
                                >{commentLoading ? '保存中...' : '保存'}</button>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{formatDate(customer.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 右侧面板 */}
          <div className="space-y-6">
            {/* 打卡系统 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                今日打卡
              </h2>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label htmlFor="checkinCustomer" className="block text-sm font-medium text-gray-700 mb-1">
                      选择客户
                    </label>
                    <select
                      id="checkinCustomer"
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">请选择客户</option>
                      {availableForCheckin.map(customer => (
                        <option key={customer._id} value={customer._id}>
                          {customer.name} - {maskPhoneNumber(customer.phone)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleCheckin}
                      disabled={checkinLoading}
                      className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors flex items-center"
                    >
                      {checkinLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          打卡中...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          打卡
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    id="searchCheckin"
                    value={checkinSearchTerm}
                    onChange={(e) => setCheckinSearchTerm(e.target.value)}
                    placeholder="搜索今日打卡姓名或手机号..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="today-checkins">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">今日已打卡客户</h3>
                  <div id="todayCheckinsList" className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredTodayCheckins.length === 0 ? (
                      <div className="text-gray-500 text-center py-6">
                        <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">暂无打卡记录</p>
                      </div>
                    ) : (
                      filteredTodayCheckins.map(checkin => (
                        <div key={checkin._id} className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 p-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-semibold text-xs">
                                  {checkin.customerName.charAt(0)}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-semibold text-gray-900 text-sm truncate">{checkin.customerName}</h4>
                                  <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                    ✓ 已打卡
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                  <span 
                                    className="cursor-pointer hover:text-blue-600 transition-colors"
                                    onClick={handlePhoneClick}
                                    title={isPasswordVerified ? "点击查看完整手机号" : "点击输入密码查看完整手机号"}
                                  >
                                    📱 {isPasswordVerified ? checkin.customerId.phone : maskPhoneNumber(checkin.customerId.phone)}
                                  </span>
                                  <span>⏰ {formatDateTime(checkin.checkinDate)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 客户信息录入 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                新增客户
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      姓名 *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      手机号 *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                      性别 *
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="projectType" className="block text-sm font-medium text-gray-700 mb-1">
                      项目类型 *
                    </label>
                    <select
                      id="projectType"
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="自助健身卡">自助健身卡</option>
                      <option value="包月私教卡">包月私教卡</option>
                      <option value="课包私教卡">课包私教卡</option>
                      <option value="体验课">体验课</option>
                      <option value="体验卡">体验卡</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                      项目开始日期 *
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                      项目结束日期 *
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    备注
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="请输入备注信息（可选）"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="renewalIntent" className="block text-sm font-medium text-gray-700 mb-1">
                    续费意向
                  </label>
                  <select
                    id="renewalIntent"
                    name="renewalIntent"
                    value={formData.renewalIntent}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="中意向">中意向</option>
                    <option value="高意向">高意向</option>
                    <option value="低意向">低意向</option>
                    <option value="放弃">放弃</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      保存中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      保存客户
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* 密码验证弹框 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">安全验证</h3>
              <button
                onClick={handleClosePasswordModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                为了保护客户隐私，查看完整手机号需要输入密码验证。
              </p>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                请输入密码
              </label>
              <input
                type="password"
                id="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入密码"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2">{passwordError}</p>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClosePasswordModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                验证
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 续课弹框 */}
      {showRenewModal && selectedCustomerForRenew && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">续课 - {selectedCustomerForRenew.name}</h3>
              <button
                onClick={handleCloseRenewModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div>
                <label htmlFor="renewProjectType" className="block text-sm font-medium text-gray-700 mb-1">
                  项目类型 *
                </label>
                <select
                  id="renewProjectType"
                  name="projectType"
                  value={renewFormData.projectType}
                  onChange={handleRenewInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="自助健身卡">自助健身卡</option>
                  <option value="包月私教卡">包月私教卡</option>
                  <option value="课包私教卡">课包私教卡</option>
                  <option value="体验课">体验课</option>
                  <option value="体验卡">体验卡</option>
                </select>
              </div>
              <div>
                <label htmlFor="renewStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                  开始日期 *
                </label>
                <input
                  type="date"
                  id="renewStartDate"
                  name="startDate"
                  value={renewFormData.startDate}
                  onChange={handleRenewInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="renewEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                  结束日期 *
                </label>
                <input
                  type="date"
                  id="renewEndDate"
                  name="endDate"
                  value={renewFormData.endDate}
                  onChange={handleRenewInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="renewNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  备注
                </label>
                <textarea
                  id="renewNotes"
                  name="notes"
                  value={renewFormData.notes}
                  onChange={handleRenewInputChange}
                  rows={3}
                  placeholder="请输入备注信息（可选）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseRenewModal}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={renewLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {renewLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      续课中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      确认续课
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 