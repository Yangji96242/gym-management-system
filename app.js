// 轻刻运动 健身房客户管理系统 - MongoDB版本
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
        checkinCustomerEl.innerHTML += `<option value="${c._id}">${c.name}（${c.phone}）</option>`;
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
        <div class="customer-item" data-id="${c._id}">
            <div class="customer-header">
                <span class="customer-name"><span class="status-indicator ${status}"></span>${c.name}</span>
                <span class="customer-phone">${c.phone}</span>
                <span class="customer-renewal ${getRenewalIntentClass(c.renewalIntent)}">续费意向：${c.renewalIntent || '中'}</span>
            </div>
            <div class="customer-details">
                <span>性别: ${c.gender}</span>
                <span>项目类型: ${c.projectType}</span>
                <span>开始: ${c.startDate}</span>
                <span>结束: ${c.endDate}</span>
                ${c.notes ? `<span class="customer-notes">备注: ${c.notes}</span>` : ''}
                ${c.comments ? `<span class="customer-comments">评论: ${c.comments}</span>` : ''}
            </div>
        </div>`;
    });
}

function getCustomerStatus(c) {
    const now = formatDate(getNowCN());
    if (c.endDate < now) return 'status-expired';
    const daysUntilExpiry = Math.ceil((new Date(c.endDate) - new Date(now)) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7) return 'status-warning';
    return 'status-active';
}

function getRenewalIntentClass(renewalIntent) {
    if (!renewalIntent || renewalIntent === '中') return 'medium';
    if (renewalIntent === '低') return 'low';
    if (renewalIntent === '高') return 'high';
    if (renewalIntent === '无意向') return 'none';
    return 'medium';
}

// 4. 新增客户
customerForm.onsubmit = async function(e) {
    e.preventDefault();
    const name = customerForm.name.value.trim();
    const phone = customerForm.phone.value.trim();
    const gender = customerForm.gender.value;
    const projectType = customerForm.projectType.value;
    const startDate = customerForm.startDate.value;
    const endDate = customerForm.endDate.value;
    const notes = customerForm.notes.value.trim();
    
    if (!name || !phone || !gender || !projectType || !startDate || !endDate) {
        alert('请填写所有必填字段');
        return;
    }
    
    try {
        await apiRequest('/customers', {
            method: 'POST',
            body: JSON.stringify({ name, phone, gender, projectType, startDate, endDate, notes, renewalIntent: '中' })
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
        await loadCustomers();
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
        alert('加载今日打卡失败');
    }
}

function renderTodayCheckins(checkins) {
    if (checkins.length === 0) {
        todayCheckinsList.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><h3>今日暂无打卡</h3></div>';
        return;
    }
    
    todayCheckinsList.innerHTML = '';
    checkins.forEach(c => {
        todayCheckinsList.innerHTML += `
        <div class="checkin-item">
            <span class="checkin-name">${c.name}</span>
            <span class="checkin-phone">${c.phone}</span>
            <span class="checkin-time">${c.checkin_time}</span>
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
    // 过滤出7天内到期或已过期的客户
    const relevantReminders = reminders.filter(c => c.days_remaining <= 7);
    
    if (relevantReminders.length === 0) {
        expiryReminders.innerHTML = '<div class="empty-state"><i class="fas fa-bell"></i><h3>无到期提醒</h3></div>';
        return;
    }
    
    // 排序：过期的按过期天数降序，未过期的按剩余天数升序
    relevantReminders.sort((a, b) => {
        const aExpired = a.days_remaining <= 0;
        const bExpired = b.days_remaining <= 0;
        
        if (aExpired && bExpired) {
            // 都过期了，按过期天数降序（过期越久的越靠前）
            return a.days_remaining - b.days_remaining;
        } else if (aExpired && !bExpired) {
            // a过期，b未过期，a放后面（超过3天放最后）
            return a.days_remaining <= -3 ? 1 : -1;
        } else if (!aExpired && bExpired) {
            // a未过期，b过期，b放后面
            return b.days_remaining <= -3 ? -1 : 1;
        } else {
            // 都未过期，按剩余天数升序
            return a.days_remaining - b.days_remaining;
        }
    });
    
    expiryReminders.innerHTML = '';
    relevantReminders.forEach(c => {
        const isExpired = c.days_remaining <= 0;
        const isOver3Days = c.days_remaining <= -3;
        let statusClass = 'warning';
        let daysText = '';
        
        if (isExpired) {
            statusClass = 'expired';
            daysText = `过期${Math.abs(c.days_remaining)}天`;
        } else {
            daysText = `剩余${c.days_remaining}天`;
        }
        
        expiryReminders.innerHTML += `
        <div class="reminder-item ${statusClass} ${isOver3Days ? 'overdue' : ''}">
            <span class="reminder-name">${c.name}</span>
            <span class="reminder-phone">${c.phone}</span>
            <span class="reminder-days">${daysText}</span>
            <span class="customer-renewal ${getRenewalIntentClass(c.renewalIntent)}">续费意向：${c.renewalIntent || '中'}</span>
        </div>`;
    });
}

// 8. 加载缺席提醒
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
        absenceReminders.innerHTML = '<div class="empty-state"><i class="fas fa-user-clock"></i><h3>无缺席提醒</h3></div>';
        return;
    }
    
    absenceReminders.innerHTML = '';
    reminders.forEach(c => {
        let daysText = '';
        if (c.days_absent === -1) {
            daysText = '从未打卡';
        } else {
            daysText = `${c.days_absent}天没来了`;
        }
        
        absenceReminders.innerHTML += `
        <div class="reminder-item absence">
            <span class="reminder-name">${c.name}</span>
            <span class="reminder-phone">${c.phone}</span>
            <span class="reminder-days">${daysText}</span>
            <span class="last-checkin-tag">${c.last_checkin}</span>
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
        if (results.length === 0) {
            customerListEl.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>未找到匹配的客户</h3></div>';
            return;
        }
        
        customerListEl.innerHTML = '';
        results.forEach(c => {
            const status = getCustomerStatus(c);
            customerListEl.innerHTML += `
            <div class="customer-item" data-id="${c._id}">
                <div class="customer-header">
                    <span class="customer-name"><span class="status-indicator ${status}"></span>${c.name}</span>
                    <span class="customer-phone">${c.phone}</span>
                    <span class="customer-renewal ${getRenewalIntentClass(c.renewalIntent)}">续费意向：${c.renewalIntent || '中'}</span>
                </div>
                <div class="customer-details">
                    <span>性别: ${c.gender}</span>
                    <span>项目类型: ${c.projectType}</span>
                    <span>开始: ${c.startDate}</span>
                    <span>结束: ${c.endDate}</span>
                    ${c.notes ? `<span class="customer-notes">备注: ${c.notes}</span>` : ''}
                    ${c.comments ? `<span class="customer-comments">评论: ${c.comments}</span>` : ''}
                </div>
            </div>`;
        });
    } catch (error) {
        console.error('搜索失败:', error);
        alert('搜索失败: ' + error.message);
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
    const c = customers.find(x => x._id == cid);
    if (!c) return;
    
    customerDetails.innerHTML = `
        <div><b>姓名：</b>${c.name}</div>
        <div><b>手机号：</b>${c.phone}</div>
        <div><b>性别：</b>${c.gender}</div>
        <div><b>项目类型：</b>${c.projectType}</div>
        <div><b>项目开始：</b>${c.startDate}</div>
        <div><b>项目结束：</b>${c.endDate}</div>
        <div style="margin-top:10px;">
            <b>备注：</b>
            <textarea id="customerNotes" rows="2" placeholder="请输入客户备注...">${c.notes || ''}</textarea>
            <button id="saveNotesBtn" class="btn btn-primary" style="margin-top:5px;">保存备注</button>
        </div>
        <div style="margin-top:10px;"><b>续费意向：</b>
            <select id="renewalIntentSelect">
                <option value="低" ${c.renewalIntent === '低' ? 'selected' : ''}>低</option>
                <option value="中" ${!c.renewalIntent || c.renewalIntent === '中' ? 'selected' : ''}>中</option>
                <option value="高" ${c.renewalIntent === '高' ? 'selected' : ''}>高</option>
                <option value="无意向" ${c.renewalIntent === '无意向' ? 'selected' : ''}>无意向</option>
            </select>
        </div>
        <div style="margin-top:10px;">
            <b>状态评论：</b>
            <textarea id="customerComments" rows="3" placeholder="请输入客户状态评论...">${c.comments || ''}</textarea>
            <button id="saveCommentsBtn" class="btn btn-primary" style="margin-top:5px;">保存评论</button>
        </div>
        <div style="margin-top:15px;">
            <button class="btn btn-danger" id="deleteCustomerBtn">删除客户</button>
        </div>
    `;
    customerModal.style.display = 'block';
    deleteCustomerId = cid;

    // 绑定续费意向切换事件
    const renewalIntentSelect = document.getElementById('renewalIntentSelect');
    if (renewalIntentSelect) {
        renewalIntentSelect.onchange = async function() {
            try {
                await apiRequest(`/customers/${cid}/renewal-intent`, {
                    method: 'PATCH',
                    body: JSON.stringify({ renewalIntent: renewalIntentSelect.value })
                });
                // 更新本地数据并刷新列表
                c.renewalIntent = renewalIntentSelect.value;
                await loadCustomers();
                alert('续费意向已更新');
            } catch (error) {
                alert('续费意向更新失败: ' + error.message);
            }
        };
    }

    // 绑定保存评论事件
    const saveCommentsBtn = document.getElementById('saveCommentsBtn');
    if (saveCommentsBtn) {
        saveCommentsBtn.onclick = async function() {
            const comments = document.getElementById('customerComments').value.trim();
            try {
                await apiRequest(`/customers/${cid}/comments`, {
                    method: 'PATCH',
                    body: JSON.stringify({ comments })
                });
                // 更新本地数据并刷新列表
                c.comments = comments;
                await loadCustomers();
                alert('客户评论已保存');
            } catch (error) {
                alert('保存评论失败: ' + error.message);
            }
        };
    }

    // 绑定保存备注事件
    const saveNotesBtn = document.getElementById('saveNotesBtn');
    if (saveNotesBtn) {
        saveNotesBtn.onclick = async function() {
            const notes = document.getElementById('customerNotes').value.trim();
            try {
                await apiRequest(`/customers/${cid}/notes`, {
                    method: 'PATCH',
                    body: JSON.stringify({ notes })
                });
                // 更新本地数据并刷新列表
                c.notes = notes;
                await loadCustomers();
                alert('客户备注已保存');
            } catch (error) {
                alert('保存备注失败: ' + error.message);
            }
        };
    }
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

// 暂时禁用自动刷新，减少API调用
// 移除定时器，改为手动刷新或事件驱动刷新
// 只在页面获得焦点时刷新数据
// document.addEventListener('visibilitychange', async () => {
//     if (!document.hidden) {
//         await loadTodayCheckins();
//         await loadExpiryReminders();
//         await loadAbsenceReminders();
//     }
// }); 