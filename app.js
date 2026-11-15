// ===== 固定道具配置（从 JSON 文件加载） =====
let FIXED_ITEMS = [];

// ===== 主逻辑 =====
class MonthlyGameManager {
    constructor() {
        this.storageKey = 'gameMonthlyData';
        this.allData = {};
        this.currentMonth = '';
        this.currentItems = [];
        this.currentNextId = 1;
        
        // DOM 引用
        this.monthSelect = document.getElementById('monthSelect');
        this.currentMonthDisplay = document.getElementById('currentMonthDisplay');
        this.tbody = document.getElementById('itemTableBody');
        this.totalTypesEl = document.getElementById('totalTypes');
        this.totalCountEl = document.getElementById('totalCount');
        this.totalValueEl = document.getElementById('totalValue');
        this.formattedValueEl = document.getElementById('formattedValue');
        
        this.nameInput = document.getElementById('itemName');
        this.priceInput = document.getElementById('itemPrice');
        this.countInput = document.getElementById('itemCount');
        this.addBtn = document.getElementById('addBtn');
        this.resetMonthBtn = document.getElementById('resetMonthBtn');
        this.newMonthBtn = document.getElementById('newMonthBtn');
        this.copyMonthBtn = document.getElementById('copyMonthBtn');
        this.deleteMonthBtn = document.getElementById('deleteMonthBtn');
        this.prevMonthBtn = document.getElementById('prevMonthBtn');
        this.nextMonthBtn = document.getElementById('nextMonthBtn');
        this.todayMonthBtn = document.getElementById('todayMonthBtn');
        
        // 弹窗
        this.modal = document.getElementById('newMonthModal');
        this.modalYear = document.getElementById('modalYear');
        this.modalMonth = document.getElementById('modalMonth');
        this.modalConfirmBtn = document.getElementById('modalConfirmBtn');
        this.modalCancelBtn = document.getElementById('modalCancelBtn');
        
        // 初始化
        this.init();
    }

    // ---------- 加载 JSON 配置 ----------
    async loadFixedItems() {
        try {
            const response = await fetch('./fixed-items.json');
            if (!response.ok) throw new Error('JSON 文件加载失败');
            FIXED_ITEMS = await response.json();
            console.log('固定道具加载成功:', FIXED_ITEMS.length, '项');
        } catch (error) {
            console.warn('无法加载 fixed-items.json，使用内置默认配置', error);
            // 降级方案：内置默认配置
            FIXED_ITEMS = [
                { id: 1, name: '上等沉船项链', price: 34500, fixed: true, icon: './icons/xlhq.webp' },
                { id: 2, name: '沉船项链', price: 13000, fixed: true, icon: './icons/xl.webp' },
                { id: 3, name: '上等沉船耳饰', price: 30000, fixed: true, icon: './icons/eshq.webp' },
                { id: 4, name: '沉船耳饰', price: 10000, fixed: true, icon: './icons/es.webp' },
                { id: 5, name: '上等沉船手镯', price: 28500, fixed: true, icon: './icons/szhq.webp' },
                { id: 6, name: '沉船手镯', price: 9000, fixed: true, icon: './icons/sz.webp' },
                { id: 7, name: '上等沉船戒指', price: 27000, fixed: true, icon: './icons/jzhq.webp' },
                { id: 8, name: '沉船戒指', price: 8000, fixed: true, icon: './icons/jz.webp' },
                { id: 9, name: '宝石nq(2gil)', price: 2, fixed: true, icon: './icons/bsnq.webp' },
                { id: 10, name: '宝石hq/nq(3gil)', price: 3, fixed: true, icon: './icons/bshq.webp' },
                { id: 11, name: '星红/蓝石hq(4gil)', price: 4, fixed: true, icon: './icons/xhlhq.webp' },
            ];
        }
    }

    // ---------- 工具方法 ----------
    getCurrentMonth() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    getMonthLabel(month) {
        const [year, m] = month.split('-');
        return `${year}年${parseInt(m)}月`;
    }

    getAvailableMonths() {
        return Object.keys(this.allData).sort();
    }

    // 计算上个月/下个月
    getAdjacentMonth(month, offset) {
        const [year, m] = month.split('-').map(Number);
        const date = new Date(year, m - 1 + offset, 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    // ---------- 图标渲染辅助 ----------
    renderIcon(icon) {
        if (!icon) return '';
        
        if (typeof icon === 'string' && icon.startsWith('fa-')) {
            return `<i class="${icon}"></i>`;
        }
        
        if (typeof icon === 'string' && (icon.includes('.png') || icon.includes('.jpg') || 
        icon.includes('.svg') || icon.includes('.gif') || icon.includes('.webp'))){
            return `<img src="${icon}" alt="icon" onerror="this.style.display='none'">`;
        }
        
        return icon;
    }

    // ---------- 数据持久化 ----------
    saveToStorage() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.allData));
    }

    loadFromStorage() {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
            try {
                this.allData = JSON.parse(raw);
                return true;
            } catch (e) {
                console.warn('读取存储失败');
            }
        }
        return false;
    }

    // ---------- 月份管理 ----------
    initMonth(month, copyFrom = null) {
        let baseItems = FIXED_ITEMS.map(item => ({
            ...item,
            count: 0
        }));

        if (copyFrom && this.allData[copyFrom]) {
            const sourceItems = this.allData[copyFrom].items || [];
            const customItems = sourceItems
                .filter(item => !item.fixed)
                .map(item => ({ ...item, id: this.getNextIdForMonth(month) }));
            
            const fixedIds = new Set(baseItems.map(i => i.id));
            const allItems = [
                ...baseItems,
                ...customItems.filter(i => !fixedIds.has(i.id))
            ];
            
            this.allData[month] = {
                items: allItems,
                nextId: Math.max(...allItems.map(i => i.id), 0) + 1
            };
        } else {
            this.allData[month] = {
                items: baseItems,
                nextId: Math.max(...baseItems.map(i => i.id), 0) + 1
            };
        }
        
        this.saveToStorage();
        this.refreshMonthList();
        this.switchToMonth(month);
    }

    getNextIdForMonth(month) {
        if (!this.allData[month]) return 1;
        return this.allData[month].nextId || 1;
    }

    deleteMonth(month) {
        if (!this.allData[month]) {
            alert('该月份不存在');
            return;
        }
        if (!confirm(`确定要删除 ${this.getMonthLabel(month)} 的数据吗？\n此操作不可撤销！`)) return;
        
        delete this.allData[month];
        this.saveToStorage();
        
        const months = this.getAvailableMonths();
        if (months.length === 0) {
            // 如果没有月份了，自动创建当前月份
            this.initMonth(this.getCurrentMonth());
        } else {
            this.refreshMonthList();
            // 尝试切换到当前月份，如果不存在则切换到最近的月份
            const current = this.getCurrentMonth();
            if (months.includes(current)) {
                this.switchToMonth(current);
            } else {
                this.switchToMonth(months[months.length - 1]);
            }
        }
    }

    copyMonth(sourceMonth) {
        if (!this.allData[sourceMonth]) {
            alert('源月份不存在');
            return;
        }
        
        // 弹出对话框让用户选择目标月份
        const year = prompt('请输入目标年份 (如 2026)：', new Date().getFullYear());
        if (year === null) return;
        const month = prompt('请输入目标月份 (1-12)：', new Date().getMonth() + 1);
        if (month === null) return;
        
        const targetMonth = `${year}-${String(parseInt(month)).padStart(2, '0')}`;
        if (isNaN(parseInt(year)) || isNaN(parseInt(month)) || parseInt(month) < 1 || parseInt(month) > 12) {
            alert('请输入有效的年份和月份');
            return;
        }
        
        if (this.allData[targetMonth]) {
            if (!confirm(`目标月份 (${this.getMonthLabel(targetMonth)}) 已有数据，是否覆盖？`)) return;
        }
        
        this.initMonth(targetMonth, sourceMonth);
    }

    // ---------- 切换月份 ----------
    refreshMonthList() {
        const months = this.getAvailableMonths();
        const current = this.monthSelect.value;
        
        this.monthSelect.innerHTML = '';
        months.forEach(m => {
            const option = document.createElement('option');
            option.value = m;
            option.textContent = this.getMonthLabel(m);
            this.monthSelect.appendChild(option);
        });
        
        if (months.includes(current)) {
            this.monthSelect.value = current;
        } else if (months.length > 0) {
            this.monthSelect.value = months[months.length - 1];
        }
    }

    switchToMonth(month) {
        if (!this.allData[month]) {
            // 如果月份不存在，提示并创建
            if (confirm(`月份 ${this.getMonthLabel(month)} 不存在，是否创建？`)) {
                this.initMonth(month);
            } else {
                // 取消则切换到当前月份
                this.switchToMonth(this.getCurrentMonth());
            }
            return;
        }
        
        this.currentMonth = month;
        let items = this.allData[month].items || [];

        // ==========================================
        // 核心修复：每次切换月份时，自动同步最新的固定物品
        // 这样老数据也能补齐你新加的3个物品，且更新价格
        // ==========================================
        let hasChanges = false;
        FIXED_ITEMS.forEach(fixedItem => {
            const existingItem = items.find(i => i.id === fixedItem.id && i.fixed);
            if (!existingItem) {
                // 如果旧月份没有这个物品（比如新加的3个），补进去，数量设为0
                items.push({ ...fixedItem, count: 0 });
                hasChanges = true;
            } else {
                // 如果已经有了，检查价格、名字、图标是否更新了，更新它们但保留数量
                if (existingItem.name !== fixedItem.name || 
                    existingItem.price !== fixedItem.price || 
                    existingItem.icon !== fixedItem.icon) {
                    existingItem.name = fixedItem.name;
                    existingItem.price = fixedItem.price;
                    existingItem.icon = fixedItem.icon;
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            this.allData[month].items = items;
            this.saveToStorage();
        }
        // ==========================================

        this.currentItems = items;
        this.currentNextId = this.allData[month].nextId || 1;
        
        this.monthSelect.value = month;
        this.currentMonthDisplay.textContent = this.getMonthLabel(month);
        this.render();
    }

    // ---------- 核心渲染 ----------
    render() {
        this.tbody.innerHTML = '';
        
        if (this.currentItems.length === 0) {
            this.tbody.innerHTML = `
                <tr><td colspan="6" class="empty-msg">✨ 还没有道具，添加你的第一件稀有品吧</td></tr>
            `;
            this.updateStats();
            return;
        }

        const sorted = [...this.currentItems].sort((a, b) => {
            if (a.fixed && !b.fixed) return -1;
            if (!a.fixed && b.fixed) return 1;
            return a.id - b.id;
        });

        for (const item of sorted) {
            const tr = document.createElement('tr');
            const total = (item.price || 0) * (item.count || 0);
            const iconHtml = item.icon ? this.renderIcon(item.icon) : '';

            tr.innerHTML = `
                <td>
                    <div class="item-name">
                        <span class="item-icon">${iconHtml}</span>
                        <span class="item-name-text">
                            ${this.escapeHtml(item.name)}
                            ${item.fixed ? '<span class="fixed-badge">固定</span>' : ''}
                        </span>
                    </div>
                </td>
                <td class="item-price">${this.formatNumber(item.price)}</td>
                <td>
                    <div class="count-control">
                        <button data-action="decr" data-id="${item.id}">−</button>
                        <input type="number" 
                               class="count-input" 
                               data-id="${item.id}" 
                               value="${item.count}" 
                               min="0" 
                               step="1">
                        <button data-action="incr" data-id="${item.id}">+</button>
                    </div>
                </td>
                <td class="item-total">${this.formatNumber(total)}</td>
                <td class="item-total-formatted">${this.formatReadable(total)}</td>
                <td style="text-align:right;">
                    <div class="action-group">
                        ${!item.fixed ? `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${item.id}">删除</button>` : ''}
                    </div>
                </td>
            `;
            this.tbody.appendChild(tr);
        }

        this.updateStats();
        this.bindCountInputs();
    }

    // ---------- 数量输入框绑定 ----------
    bindCountInputs() {
        const countInputs = this.tbody.querySelectorAll('.count-input');
        countInputs.forEach(input => {
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            newInput.addEventListener('change', (e) => {
                this.handleCountChange(e);
            });
            
            newInput.addEventListener('input', (e) => {
                this.handleCountInput(e);
            });
        });
    }

    handleCountChange(e) {
        const input = e.target;
        const id = parseInt(input.dataset.id, 10);
        const newCount = parseInt(input.value, 10);
        
        if (isNaN(newCount) || newCount < 0) {
            const item = this.currentItems.find(it => it.id === id);
            if (item) {
                input.value = item.count;
            }
            return;
        }
        
        const item = this.currentItems.find(it => it.id === id);
        if (item && item.count !== newCount) {
            item.count = newCount;
            this.saveMonthData();
            this.render();
        }
    }

    handleCountInput(e) {
        const input = e.target;
        const id = parseInt(input.dataset.id, 10);
        const value = parseInt(input.value, 10);
        
        if (!isNaN(value) && value >= 0) {
            const item = this.currentItems.find(it => it.id === id);
            if (item) {
                const oldCount = item.count;
                item.count = value;
                this.updateStats();
                item.count = oldCount;
            }
        }
    }

    // ---------- 保存当前月份 ----------
    saveMonthData() {
        if (this.currentMonth && this.allData[this.currentMonth]) {
            this.allData[this.currentMonth].items = this.currentItems;
            this.allData[this.currentMonth].nextId = this.currentNextId;
            this.saveToStorage();
        }
    }

    // ---------- 统计更新 ----------
    updateStats() {
        const types = this.currentItems.length;
        let totalCount = 0;
        let totalValue = 0;
        
        for (const it of this.currentItems) {
            totalCount += it.count || 0;
            totalValue += (it.price || 0) * (it.count || 0);
        }
        
        this.totalTypesEl.textContent = types;
        this.totalCountEl.textContent = totalCount;
        this.totalValueEl.textContent = this.formatNumber(totalValue);
        this.formattedValueEl.textContent = this.formatReadable(totalValue);
    }

    // ---------- 格式化工具 ----------
    formatNumber(num) {
        if (num === undefined || num === null) return '0';
        return Number(num).toLocaleString('zh-CN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        });
    }

    formatReadable(num) {
        if (num === undefined || num === null || num === 0) return '0';
        
        const absNum = Math.abs(num);
        const sign = num < 0 ? '-' : '';
        
        if (absNum >= 1e8) {
            return sign + (absNum / 1e8).toFixed(1) + '亿';
        } else if (absNum >= 1e4) {
            return sign + (absNum / 1e4).toFixed(1) + '万';
        } else if (absNum >= 1e3) {
            return sign + (absNum / 1e3).toFixed(1) + '千';
        } else {
            return sign + absNum.toFixed(0);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // ---------- 数据操作 ----------
    addItem(name, price, count) {
        if (!name.trim()) { 
            alert('请输入道具名称'); 
            return false; 
        }
        const p = parseFloat(price);
        const c = parseInt(count, 10);
        if (isNaN(p) || p < 0) { 
            alert('请输入有效的单价 (≥0)'); 
            return false; 
        }
        if (isNaN(c) || c < 1) { 
            alert('数量至少为 1'); 
            return false; 
        }

        this.currentItems.push({
            id: this.currentNextId++,
            name: name.trim(),
            price: p,
            count: c,
            fixed: false,
            icon: ''
        });
        
        this.saveMonthData();
        this.render();
        
        this.nameInput.value = '';
        this.priceInput.value = '';
        this.countInput.value = '1';
        this.nameInput.focus();
        return true;
    }

    deleteItem(id) {
        const item = this.currentItems.find(it => it.id === id);
        if (!item) return;
        if (item.fixed) {
            alert('固定道具不能删除，只能将数量设为0');
            return;
        }
        if (!confirm(`确定要删除 "${item.name}" 吗？`)) return;
        
        this.currentItems = this.currentItems.filter(it => it.id !== id);
        this.saveMonthData();
        this.render();
    }

    changeCount(id, delta) {
        const item = this.currentItems.find(it => it.id === id);
        if (!item) return;
        
        const newCount = item.count + delta;
        if (newCount < 0) return;
        
        item.count = newCount;
        this.saveMonthData();
        this.render();
    }

    resetMonth() {
        if (!confirm(`重置当前月份 (${this.getMonthLabel(this.currentMonth)}) 所有数量为0？`)) return;
        
        this.currentItems.forEach(item => item.count = 0);
        this.currentItems = this.currentItems.filter(item => item.fixed);
        this.currentItems.forEach(item => item.count = 0);
        this.currentNextId = Math.max(...this.currentItems.map(i => i.id), 0) + 1;
        
        this.saveMonthData();
        this.render();
    }

    // ---------- 弹窗 ----------
    showNewMonthModal() {
        const now = new Date();
        this.modalYear.value = now.getFullYear();
        this.modalMonth.value = now.getMonth() + 1;
        this.modal.classList.add('active');
        this.modalYear.focus();
        this.modalYear.select();
    }

    hideModal() {
        this.modal.classList.remove('active');
    }

    confirmNewMonth() {
        const year = parseInt(this.modalYear.value);
        const month = parseInt(this.modalMonth.value);
        
        if (isNaN(year) || year < 2000 || year > 2100) {
            alert('请输入有效的年份 (2000-2100)');
            this.modalYear.focus();
            this.modalYear.select();
            return;
        }
        if (isNaN(month) || month < 1 || month > 12) {
            alert('请输入有效的月份 (1-12)');
            this.modalMonth.focus();
            this.modalMonth.select();
            return;
        }
        
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        
        if (this.allData[monthStr]) {
            if (!confirm(`月份 ${this.getMonthLabel(monthStr)} 已存在，是否覆盖？`)) return;
        }
        
        this.initMonth(monthStr);
        this.hideModal();
    }

    // ---------- 事件绑定 ----------
    bindEvents() {
        // 表格事件委托
        this.tbody.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            const action = target.dataset.action;
            const id = parseInt(target.dataset.id, 10);
            if (isNaN(id)) return;

            if (action === 'delete') {
                this.deleteItem(id);
            } else if (action === 'incr') {
                this.changeCount(id, 1);
            } else if (action === 'decr') {
                this.changeCount(id, -1);
            }
        });

        // 添加按钮
        this.addBtn.addEventListener('click', () => {
            this.addItem(
                this.nameInput.value,
                this.priceInput.value,
                this.countInput.value
            );
        });

        // 回车快捷添加
        document.querySelectorAll('.form-row input').forEach(inp => {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addBtn.click();
                }
            });
        });

        // 切换月份
        this.monthSelect.addEventListener('change', () => {
            this.switchToMonth(this.monthSelect.value);
        });

        // 重置当月
        this.resetMonthBtn.addEventListener('click', () => this.resetMonth());

        // 新建月份 - 弹窗
        this.newMonthBtn.addEventListener('click', () => this.showNewMonthModal());
        this.modalConfirmBtn.addEventListener('click', () => this.confirmNewMonth());
        this.modalCancelBtn.addEventListener('click', () => this.hideModal());
        
        // 点击弹窗外部关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });
        
        // 弹窗回车确认
        this.modalYear.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.modalMonth.focus();
        });
        this.modalMonth.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.confirmNewMonth();
        });

        // 拉取上月数据
        this.copyMonthBtn.addEventListener('click', () => {
            if (!this.currentMonth) return;
            
            // 1. 找到上个月
            const prevMonth = this.getAdjacentMonth(this.currentMonth, -1);
            
            // 2. 检查上个月有没有数据
            if (!this.allData[prevMonth]) {
                alert(`上个月 (${this.getMonthLabel(prevMonth)}) 还没有数据哦，请先记录上个月数据。`);
                return;
            }

            // 3. 如果当前月已经有数量不为 0 的数据了，提醒一下
            const currentTotal = this.currentItems.reduce((sum, item) => sum + (item.count || 0), 0);
            if (currentTotal > 0) {
                if (!confirm(`当前月份 (${this.getMonthLabel(this.currentMonth)}) 已经有数据了，拉取会覆盖当前数据，确定吗？`)) return;
            }

            // 4. 执行复制：把上个月复制到当前月
            this.initMonth(this.currentMonth, prevMonth);
        });

        // 删除月份
        this.deleteMonthBtn.addEventListener('click', () => {
            const month = this.monthSelect.value;
            if (!month) return;
            this.deleteMonth(month);
        });

        // 月份导航
        this.prevMonthBtn.addEventListener('click', () => {
            const prev = this.getAdjacentMonth(this.currentMonth, -1);
            this.switchToMonth(prev);
        });

        this.nextMonthBtn.addEventListener('click', () => {
            const next = this.getAdjacentMonth(this.currentMonth, 1);
            this.switchToMonth(next);
        });

        this.todayMonthBtn.addEventListener('click', () => {
            this.switchToMonth(this.getCurrentMonth());
        });
    }

    // ---------- 初始化 ----------
    async init() {
        // 先加载固定道具配置
        await this.loadFixedItems();
        
        const loaded = this.loadFromStorage();
        const currentMonth = this.getCurrentMonth();
        
        if (!loaded || Object.keys(this.allData).length === 0) {
            this.initMonth(currentMonth);
        } else {
            this.refreshMonthList();
            const months = this.getAvailableMonths();
            if (months.includes(currentMonth)) {
                this.switchToMonth(currentMonth);
            } else {
                this.switchToMonth(months[months.length - 1]);
            }
        }
        
        this.bindEvents();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new MonthlyGameManager();
});