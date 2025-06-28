// 轻刻运动 健身房客户管理系统 - SQLite版本
const API_BASE = 'http://localhost:3000/api';

// 工具函数
function getNowCN() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const cnTime = new Date(utc + (3600000 * 8));
    return cnTime;
}

function formatDate(date, withTime = false) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    if (withTime) {
        const h = d.getHours().toString().padStart(2, '0');
        const min = d.getMinutes().toString().padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}`;
    }
    return `${y}-${m}-${day}`;
}

// API请求函数
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '请求失败');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API请求错误:', error);
        throw error;
    }
}

// 页面元素
const currentTimeEl = document.getElementById('currentTime');
const customerForm = document.getElementById('customerForm');
const customerListEl = document.getElementById('customerList');
const checkinCustomerEl = document.getElementById('checkinCustomer');
const checkinBtn = document.getElementById('checkinBtn');
const todayCheckinsList = document.getElementById('todayCheckinsList');
const expiryReminders = document.getElementById('expiryReminders');
const absenceReminders = document.getElementById('absenceReminders');
const searchCustomer = document.getElementById('searchCustomer');

// 模态框元素
const customerModal = document.getElementById('customerModal');
const customerDetails = document.getElementById('customerDetails');
const closeModalBtn = document.querySelector('#customerModal .close');
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const cancelDeleteBtn = document.getElementById('cancelDelete');

let customers = [];
let deleteCustomerId = null;

// 1. 显示中国时间
function updateTime() {
    currentTimeEl.textContent = formatDate(getNowCN(), true);
}
setInterval(updateTime, 1000);
updateTime();

// 2. 加载客户数据
async function loadCustomers() {
    try {
        customers = await apiRequest('/customers');
        renderCustomerSelect();
        renderCustomerList();
    } catch (error) {
        console.error('加载客户数据失败:', error);
        alert('加载客户数据失败');
    }
}

// 3. 渲染客户下拉和列表
function renderCustomerSelect() {
    checkinCustomerEl.innerHTML = '<option value="">请选择客户</option>';
    customers.forEach(c => {
        checkinCustomerEl.innerHTML += `<option value="${c.id}">${c.name}（${c.phone}）</option>`;
    });
}

function renderCustomerList(filter = '') {
    let list = customers;
    if (filter) {
        list = customers.filter(c => c.name.includes(filter) || c.phone.includes(filter));
    }
    
    if (list.length === 0) {
        customerListEl.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><h3>暂无客户</h3></div>';
        return;
    }
    
    customerListEl.innerHTML = '';
    list.forEach(c => {
        const status = getCustomerStatus(c);
        customerListEl.innerHTML += `
        <div class="customer-item" data-id="${c.id}">
            <div class="customer-header">
                <span class="customer-name"><span class="status-indicator ${status}"></span>${c.name}</span>
                <span class="customer-phone">${c.phone}</span>
            </div>
            <div class="customer-details">
                <span>性别: ${c.gender}</span>
                <span>开始: ${c.start_date}</span>
                <span>结束: ${c.end_date}</span>
            </div>
        </div>`;
    });
}

function getCustomerStatus(c) {
    const now = formatDate(getNowCN());
    if (c.end_date < now) return 'status-expired';
    const daysUntilExpiry = Math.ceil((new Date(c.end_date) - new Date(now)) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7) return 'status-warning';
    return 'status-active';
}

// 4. 新增客户
customerForm.onsubmit = async function(e) {
    e.preventDefault();
    const name = customerForm.name.value.trim();
    const phone = customerForm.phone.value.trim();
    const gender = customerForm.gender.value;
    const startDate = customerForm.startDate.value;
    const endDate = customerForm.endDate.value;
    
    if (!name || !phone || !gender || !startDate || !endDate) {
        alert('请填写所有必填字段');
        return;
    }
    
    try {
        await apiRequest('/customers', {
            method: 'POST',
            body: JSON.stringify({ name, phone, gender, startDate, endDate })
        });
        
        customerForm.reset();
        await loadCustomers();
        alert('客户添加成功');
    } catch (error) {
        alert('错误: ' + error.message);
    }
};

// 5. 打卡
checkinBtn.onclick = async function() {
    const cid = checkinCustomerEl.value;
    if (!cid) {
        alert('请选择客户');
        return;
    }
    
    const today = formatDate(getNowCN());
    const now = formatDate(getNowCN(), true);
    
    try {
        await apiRequest('/checkins', {
            method: 'POST',
            body: JSON.stringify({
                customerId: cid,
                checkinDate: today,
                checkinTime: now
            })
        });
        
        checkinCustomerEl.value = '';
        await loadTodayCheckins();
        await loadAbsenceReminders();
        alert('打卡成功');
    } catch (error) {
        alert('错误: ' + error.message);
    }
};

// 6. 加载今日打卡（支持搜索）
async function loadTodayCheckins(search = '') {
    try {
        const url = search ? `/checkins/today?search=${encodeURIComponent(search)}` : '/checkins/today';
        const checkins = await apiRequest(url);
        renderTodayCheckins(checkins);
    } catch (error) {
        console.error('加载今日打卡失败:', error);
    }
}

function renderTodayCheckins(checkins) {
    if (checkins.length === 0) {
        todayCheckinsList.innerHTML = '<div class="empty-state"><i class="fas fa-user-clock"></i><h3>今日暂无打卡</h3></div>';
        return;
    }
    
    todayCheckinsList.innerHTML = '';
    checkins.forEach(checkin => {
        todayCheckinsList.innerHTML += `
            <div class="checkin-item">
                ${checkin.name} 
                <span class="checkin-time">${checkin.checkin_time}</span>
            </div>`;
    });
}

// 7. 加载到期提醒
async function loadExpiryReminders() {
    try {
        const reminders = await apiRequest('/reminders/expiry');
        renderExpiryReminders(reminders);
    } catch (error) {
        console.error('加载到期提醒失败:', error);
    }
}

function renderExpiryReminders(reminders) {
    if (reminders.length === 0) {
        expiryReminders.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><h3>暂无到期提醒</h3></div>';
        return;
    }
    
    expiryReminders.innerHTML = '';
    reminders.forEach(c => {
        const days = Math.ceil(c.days_remaining);
        expiryReminders.innerHTML += `
            <div class="reminder-item">
                <div class="reminder-info">
                    <span class="reminder-name">${c.name}</span>
                    <div class="reminder-detail">${c.end_date} 到期</div>
                </div>
                <span class="reminder-days">${days}天</span>
            </div>`;
    });
}

// 8. 加载缺席提醒（近7天未打卡）
async function loadAbsenceReminders() {
    try {
        const reminders = await apiRequest('/reminders/absence');
        renderAbsenceReminders(reminders);
    } catch (error) {
        console.error('加载缺席提醒失败:', error);
    }
}

function renderAbsenceReminders(reminders) {
    if (reminders.length === 0) {
        absenceReminders.innerHTML = '<div class="empty-state"><i class="fas fa-user-check"></i><h3>暂无缺席提醒</h3></div>';
        return;
    }
    
    absenceReminders.innerHTML = '';
    reminders.forEach(c => {
        const days = c.days_absent === -1 ? '从未打卡' : `已缺席${Math.ceil(c.days_absent)}天`;
        absenceReminders.innerHTML += `
            <div class="reminder-item">
                <div class="reminder-info">
                    <span class="reminder-name">${c.name}</span>
                    <div class="reminder-detail">${days}</div>
                </div>
            </div>`;
    });
}

// 9. 搜索客户
searchCustomer.oninput = async function() {
    const query = searchCustomer.value.trim();
    if (!query) {
        renderCustomerList();
        return;
    }
    
    try {
        const results = await apiRequest(`/customers/search?q=${encodeURIComponent(query)}`);
        renderCustomerList('', results);
    } catch (error) {
        console.error('搜索失败:', error);
    }
};

// 10. 客户详情弹窗
customerListEl.onclick = function(e) {
    let item = e.target;
    while (item && !item.classList.contains('customer-item')) {
        item = item.parentElement;
    }
    if (!item) return;
    
    const cid = item.getAttribute('data-id');
    const c = customers.find(x => x.id == cid);
    if (!c) return;
    
    customerDetails.innerHTML = `
        <div><b>姓名：</b>${c.name}</div>
        <div><b>手机号：</b>${c.phone}</div>
        <div><b>性别：</b>${c.gender}</div>
        <div><b>项目开始：</b>${c.start_date}</div>
        <div><b>项目结束：</b>${c.end_date}</div>
        <div style="margin-top:15px;">
            <button class="btn btn-danger" id="deleteCustomerBtn">删除客户</button>
        </div>
    `;
    customerModal.style.display = 'block';
    deleteCustomerId = cid;
};

closeModalBtn.onclick = function() {
    customerModal.style.display = 'none';
};

window.onclick = function(e) {
    if (e.target === customerModal) customerModal.style.display = 'none';
    if (e.target === deleteModal) deleteModal.style.display = 'none';
};

// 11. 删除客户
customerDetails.onclick = function(e) {
    if (e.target && e.target.id === 'deleteCustomerBtn') {
        customerModal.style.display = 'none';
        deleteModal.style.display = 'block';
    }
};

confirmDeleteBtn.onclick = async function() {
    if (!deleteCustomerId) return;
    
    try {
        await apiRequest(`/customers/${deleteCustomerId}`, {
            method: 'DELETE'
        });
        
        await loadCustomers();
        await loadTodayCheckins();
        await loadExpiryReminders();
        await loadAbsenceReminders();
        deleteModal.style.display = 'none';
        deleteCustomerId = null;
        alert('客户删除成功');
    } catch (error) {
        alert('错误: ' + error.message);
    }
};

cancelDeleteBtn.onclick = function() {
    deleteModal.style.display = 'none';
};

// 搜索今日打卡
const searchCheckin = document.getElementById('searchCheckin');
if (searchCheckin) {
    searchCheckin.oninput = function() {
        loadTodayCheckins(searchCheckin.value.trim());
    };
}

// 初始化
async function init() {
    try {
        await loadCustomers();
        await loadTodayCheckins();
        await loadExpiryReminders();
        await loadAbsenceReminders();
    } catch (error) {
        console.error('初始化失败:', error);
        alert('系统初始化失败，请检查服务器是否运行');
    }
}

init();

// 定期刷新数据
setInterval(async () => {
    await loadTodayCheckins();
    await loadExpiryReminders();
    await loadAbsenceReminders();
}, 60000); 