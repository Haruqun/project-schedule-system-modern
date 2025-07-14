// プロジェクトデータ
const projectData = {
    pages: [
        'トップページ(top)',
        'レンタル品一覧(rental_list)',
        '購入品一覧(purchase_list)',
        'オプション一覧(option_list)',
        '商品詳細(product_detail)',
        'オプション詳細(option_detail)',
        '商品比較(product_compare)',
        'カート(cart)',
        '注文者情報入力(customer_input)',
        'お届け先情報入力(delivery_input)',
        '配送希望日入力(delivery_date)',
        '決済方法選択(payment_select)',
        'クレジットカード情報入力(credit_input)',
        '入力内容確認(confirm)',
        '注文完了(complete)',
        'マイページトップ(mypage_top)',
        '注文履歴一覧(order_history)',
        '注文詳細(order_detail)',
        '会員情報編集(member_edit)',
        'パスワード変更(password_change)',
        '退会手続き(withdrawal)',
        'お気に入り一覧(favorite_list)',
        '領収書発行(receipt)',
        'お問い合わせ(contact)',
        'お問い合わせ確認(contact_confirm)',
        'お問い合わせ完了(contact_complete)',
        '利用ガイド(guide)',
        'よくある質問(faq)',
        'プライバシーポリシー(privacy)',
        '利用規約(terms)',
        '特定商取引法(commercial_law)',
        '運営会社(company)',
        'サイトマップ(sitemap)',
        'アクセス(access)',
        '採用情報(recruit)'
    ],
    phases: [
        { name: 'PCデザイン', duration: 3, type: 'pc-design' },
        { name: 'SPデザイン', duration: 3, type: 'sp-design' },
        { name: 'コーディング', duration: 3, type: 'coding' }
    ],
    taskTypes: {
        'submit': 'ecbeing',
        'review': 'client',
        'revision': 'ecbeing'
    }
};

// グローバル変数
let scheduleData = {
    startDate: null,
    totalWeeks: 18,
    tasks: [],
    pageSchedules: {},
    weeklyTaskCounts: []
};

let dragState = {
    isDragging: false,
    draggedTask: null,
    draggedGroup: [],
    startX: 0,
    startWeek: 0,
    offsetX: 0
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeScheduler();
});

function initializeScheduler() {
    // デフォルト開始日を設定（次の水曜日）
    const today = new Date();
    const nextWednesday = getNextWednesday(today);
    document.getElementById('startDate').value = formatDate(nextWednesday);
    scheduleData.startDate = nextWednesday;
    
    // スケジュールを生成
    generateSchedule();
    
    // ガントチャートを描画
    renderGanttChart();
    
    // イベントリスナーを設定
    setupEventListeners();
}

function getNextWednesday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (3 - day + 7) % 7 || 7; // 水曜日は3
    d.setDate(d.getDate() + diff);
    return d;
}

function formatDate(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

function formatDateJP(date) {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

// スケジュール生成
function generateSchedule() {
    const taskLimit = parseInt(document.getElementById('taskLimit').value) || 15;
    const firstWeekPages = parseInt(document.getElementById('firstWeekPages').value) || 7;
    
    // 必要な週数を計算
    const requiredWeeks = calculateRequiredWeeks(projectData.pages.length, firstWeekPages, taskLimit);
    scheduleData.totalWeeks = requiredWeeks;
    
    // ページ配分を最適化
    const pageDistribution = optimizePageDistribution(
        projectData.pages.length,
        requiredWeeks,
        firstWeekPages,
        taskLimit
    );
    
    // タスクを生成
    generateTasks(pageDistribution);
    
    // 統計を更新
    updateStats();
}

// 必要週数を計算
function calculateRequiredWeeks(totalPages, firstWeekPages, taskLimit) {
    const weeksPerPage = 6; // 各ページ完了に必要な週数（2週×3フェーズ）
    
    if (!taskLimit || taskLimit === 0) {
        return Math.max(18, weeksPerPage + Math.ceil(totalPages / 4));
    }
    
    // タスク上限がある場合のシミュレーション
    let testWeeks = weeksPerPage + 1;
    const maxWeeks = 52;
    
    while (testWeeks <= maxWeeks) {
        const distribution = optimizePageDistribution(totalPages, testWeeks, firstWeekPages, taskLimit);
        const totalDistributed = distribution.reduce((sum, pages) => sum + pages, 0);
        
        if (totalDistributed >= totalPages) {
            return testWeeks;
        }
        testWeeks++;
    }
    
    return maxWeeks;
}

// ページ配分の最適化
function optimizePageDistribution(totalPages, totalWeeks, firstWeekPages, taskLimit) {
    const distribution = new Array(totalWeeks).fill(0);
    distribution[0] = firstWeekPages;
    let remaining = totalPages - firstWeekPages;
    
    if (!taskLimit || taskLimit === 0) {
        // タスク上限なしの場合
        const avgPagesPerWeek = remaining / (totalWeeks - 1);
        for (let week = 1; week < totalWeeks && remaining > 0; week++) {
            const pages = Math.min(Math.ceil(avgPagesPerWeek), remaining);
            distribution[week] = pages;
            remaining -= pages;
        }
        return distribution;
    }
    
    // タスク上限ありの場合
    const pageStates = [];
    
    // 第1週のページを追加
    for (let i = 0; i < firstWeekPages; i++) {
        pageStates.push({ startWeek: 0, currentPhase: 0 });
    }
    
    // 残りのページを配分
    for (let week = 1; week < totalWeeks && remaining > 0; week++) {
        let weekTasks = 0;
        
        // 既存ページのタスク数をカウント
        pageStates.forEach(page => {
            const weeksSinceStart = week - page.startWeek;
            for (let phase = 0; phase < 3; phase++) {
                const phaseStartWeek = phase * 2; // 各フェーズは2週間
                const weekInPhase = weeksSinceStart - phaseStartWeek;
                
                if ((weekInPhase === 0 || weekInPhase === 1) && weekInPhase >= 0) {
                    weekTasks++;
                    break;
                }
            }
        });
        
        // 新規ページを追加
        let newPages = 0;
        while (remaining > 0 && weekTasks + newPages < taskLimit) {
            pageStates.push({ startWeek: week, currentPhase: 0 });
            newPages++;
            remaining--;
            weekTasks++;
            
            if (weekTasks >= taskLimit) break;
        }
        
        distribution[week] = newPages;
    }
    
    return distribution;
}

// タスク生成
function generateTasks(pageDistribution) {
    scheduleData.tasks = [];
    scheduleData.pageSchedules = {};
    scheduleData.weeklyTaskCounts = new Array(scheduleData.totalWeeks).fill(0);
    
    let pageIndex = 0;
    let taskId = 0;
    
    pageDistribution.forEach((pageCount, week) => {
        for (let i = 0; i < pageCount && pageIndex < projectData.pages.length; i++) {
            const pageName = projectData.pages[pageIndex];
            scheduleData.pageSchedules[pageName] = {
                startWeek: week,
                tasks: []
            };
            
            // 各フェーズのタスクを生成
            projectData.phases.forEach((phase, phaseIndex) => {
                const phaseStartWeek = week + phaseIndex * 2; // 各フェーズは2週間
                
                // 提出タスク（第1週）
                const submitTask = {
                    id: taskId++,
                    pageIndex: pageIndex,
                    pageName: pageName,
                    phase: phase.name,
                    phaseType: phase.type,
                    type: 'submit',
                    week: phaseStartWeek,
                    duration: 1,
                    text: `${phase.name}提出`,
                    owner: 'ecbeing'
                };
                scheduleData.tasks.push(submitTask);
                scheduleData.pageSchedules[pageName].tasks.push(submitTask);
                
                // 修正依頼タスク（同週内、3営業日後）
                const reviewTask = {
                    id: taskId++,
                    pageIndex: pageIndex,
                    pageName: pageName,
                    phase: phase.name,
                    phaseType: 'client-task',
                    type: 'review',
                    week: phaseStartWeek,
                    duration: 1,
                    text: `${phase.name}修正依頼`,
                    owner: 'client',
                    parentId: submitTask.id
                };
                scheduleData.tasks.push(reviewTask);
                scheduleData.pageSchedules[pageName].tasks.push(reviewTask);
                
                // 修正版提出&確定タスク（第2週）
                const revisionTask = {
                    id: taskId++,
                    pageIndex: pageIndex,
                    pageName: pageName,
                    phase: phase.name,
                    phaseType: phase.type,
                    type: 'revision',
                    week: phaseStartWeek + 1, // 翌週
                    duration: 1,
                    text: `${phase.name}修正版提出&確定`,
                    owner: 'ecbeing',
                    parentId: submitTask.id
                };
                scheduleData.tasks.push(revisionTask);
                scheduleData.pageSchedules[pageName].tasks.push(revisionTask);
            });
            
            pageIndex++;
        }
    });
    
    // 週次タスク数を計算
    scheduleData.tasks.forEach(task => {
        if (task.owner === 'ecbeing' && task.week < scheduleData.totalWeeks) {
            scheduleData.weeklyTaskCounts[task.week]++;
        }
    });
}

// ガントチャート描画
function renderGanttChart() {
    renderTimeline();
    renderPages();
    renderTasks();
    addTodayLine();
}

// タイムライン描画
function renderTimeline() {
    const timeline = document.getElementById('ganttTimeline');
    timeline.innerHTML = '';
    
    for (let week = 0; week < scheduleData.totalWeeks; week++) {
        const weekDate = new Date(scheduleData.startDate);
        weekDate.setDate(weekDate.getDate() + week * 7);
        
        const weekCell = document.createElement('div');
        weekCell.className = 'timeline-week';
        weekCell.innerHTML = `
            <div class="week-number">第${week + 1}週</div>
            <div class="week-date">${formatDateJP(weekDate)}</div>
        `;
        timeline.appendChild(weekCell);
    }
}

// ページ一覧描画
function renderPages() {
    const pagesContainer = document.getElementById('ganttPages');
    const rowsContainer = document.getElementById('ganttRows');
    pagesContainer.innerHTML = '';
    rowsContainer.innerHTML = '';
    
    projectData.pages.forEach((pageName, index) => {
        // サイドバーのページ情報
        const pageInfo = document.createElement('div');
        pageInfo.className = 'gantt-page-info';
        pageInfo.innerHTML = `<div class="page-name">${pageName}</div>`;
        pagesContainer.appendChild(pageInfo);
        
        // ガントチャートの行
        const row = document.createElement('div');
        row.className = 'gantt-row';
        row.dataset.pageIndex = index;
        
        // 週ごとのセル
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'gantt-tasks';
        
        for (let week = 0; week < scheduleData.totalWeeks; week++) {
            const cell = document.createElement('div');
            cell.className = 'gantt-cell';
            cell.dataset.week = week;
            tasksContainer.appendChild(cell);
        }
        
        row.appendChild(tasksContainer);
        rowsContainer.appendChild(row);
    });
}

// タスク描画
function renderTasks() {
    const rowsContainer = document.getElementById('ganttRows');
    
    scheduleData.tasks.forEach(task => {
        const row = rowsContainer.children[task.pageIndex];
        if (!row) return;
        
        const tasksContainer = row.querySelector('.gantt-tasks');
        const taskElement = createTaskElement(task);
        
        // 位置を計算
        const cellWidth = 120;
        const left = task.week * cellWidth + 5;
        const width = task.duration * cellWidth - 10;
        
        taskElement.style.left = `${left}px`;
        taskElement.style.width = `${width}px`;
        
        // 垂直位置を調整（タスクタイプによって）
        if (task.type === 'submit') {
            taskElement.style.top = '10px';
        } else if (task.type === 'review') {
            taskElement.style.top = '30px';
        } else {
            taskElement.style.top = '10px';
        }
        
        tasksContainer.appendChild(taskElement);
    });
}

// タスク要素作成
function createTaskElement(task) {
    const element = document.createElement('div');
    element.className = `gantt-task ${task.phaseType}`;
    element.dataset.taskId = task.id;
    element.dataset.week = task.week;
    element.textContent = task.text;
    
    // ドラッグイベント
    element.addEventListener('mousedown', onTaskMouseDown);
    
    // ツールチップ
    element.addEventListener('mouseenter', (e) => showTooltip(e, task));
    element.addEventListener('mouseleave', hideTooltip);
    
    return element;
}

// 今日の線を追加
function addTodayLine() {
    const today = new Date();
    const startDate = new Date(scheduleData.startDate);
    const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const weeksDiff = daysDiff / 7;
    
    if (weeksDiff >= 0 && weeksDiff <= scheduleData.totalWeeks) {
        const line = document.createElement('div');
        line.className = 'today-line';
        line.style.left = `${300 + weeksDiff * 120}px`; // サイドバー幅 + 週数 * セル幅
        document.querySelector('.gantt-container').appendChild(line);
    }
}

// ドラッグ&ドロップ機能
function onTaskMouseDown(e) {
    e.preventDefault();
    
    const taskElement = e.currentTarget;
    const taskId = parseInt(taskElement.dataset.taskId);
    const task = scheduleData.tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    dragState.isDragging = true;
    dragState.draggedTask = task;
    dragState.startX = e.pageX;
    dragState.startWeek = task.week;
    
    // 関連タスクを特定
    dragState.draggedGroup = findRelatedTasks(task);
    
    // ドラッグ中のスタイルを適用
    dragState.draggedGroup.forEach(t => {
        const el = document.querySelector(`[data-task-id="${t.id}"]`);
        if (el) el.classList.add('dragging');
    });
    
    document.addEventListener('mousemove', onTaskMouseMove);
    document.addEventListener('mouseup', onTaskMouseUp);
}

function onTaskMouseMove(e) {
    if (!dragState.isDragging) return;
    
    const deltaX = e.pageX - dragState.startX;
    const weekDelta = Math.round(deltaX / 120); // セル幅で割る
    
    // プレビュー更新
    dragState.draggedGroup.forEach(task => {
        const element = document.querySelector(`[data-task-id="${task.id}"]`);
        if (element) {
            const newWeek = task.week - dragState.startWeek + dragState.startWeek + weekDelta;
            element.style.transform = `translateX(${weekDelta * 120}px)`;
        }
    });
}

function onTaskMouseUp(e) {
    if (!dragState.isDragging) return;
    
    const deltaX = e.pageX - dragState.startX;
    const weekDelta = Math.round(deltaX / 120);
    
    // タスクを移動
    if (weekDelta !== 0) {
        moveTaskGroup(dragState.draggedGroup, weekDelta);
    }
    
    // クリーンアップ
    dragState.draggedGroup.forEach(task => {
        const element = document.querySelector(`[data-task-id="${task.id}"]`);
        if (element) {
            element.classList.remove('dragging');
            element.style.transform = '';
        }
    });
    
    dragState.isDragging = false;
    dragState.draggedTask = null;
    dragState.draggedGroup = [];
    
    document.removeEventListener('mousemove', onTaskMouseMove);
    document.removeEventListener('mouseup', onTaskMouseUp);
}

// 関連タスクを見つける
function findRelatedTasks(task) {
    const relatedTasks = [];
    const pageTasks = scheduleData.pageSchedules[task.pageName].tasks;
    
    // 同じページの全タスクを取得
    if (task.type === 'submit') {
        // 提出タスクの場合、そのフェーズの全タスクと後続フェーズを含める
        const phaseIndex = projectData.phases.findIndex(p => p.name === task.phase);
        pageTasks.forEach(t => {
            const tPhaseIndex = projectData.phases.findIndex(p => p.name === t.phase);
            if (tPhaseIndex >= phaseIndex) {
                relatedTasks.push(t);
            }
        });
    } else if (task.type === 'review') {
        // レビュータスクの場合、同じフェーズのタスクのみ
        relatedTasks.push(task);
    } else {
        // 修正版提出の場合、そのタスクと後続フェーズ
        const phaseIndex = projectData.phases.findIndex(p => p.name === task.phase);
        pageTasks.forEach(t => {
            const tPhaseIndex = projectData.phases.findIndex(p => p.name === t.phase);
            if (tPhaseIndex > phaseIndex || (tPhaseIndex === phaseIndex && t.type === 'revision')) {
                relatedTasks.push(t);
            }
        });
    }
    
    return relatedTasks;
}

// タスクグループを移動
function moveTaskGroup(taskGroup, weekDelta) {
    // 移動可能かチェック
    const canMove = taskGroup.every(task => {
        const newWeek = task.week + weekDelta;
        return newWeek >= 0 && newWeek < scheduleData.totalWeeks;
    });
    
    if (!canMove) {
        alert('タスクを指定された週に移動できません。');
        return;
    }
    
    // タスクを移動
    taskGroup.forEach(task => {
        task.week += weekDelta;
    });
    
    // 週次タスク数を再計算
    recalculateWeeklyTaskCounts();
    
    // 再描画
    const rowsContainer = document.getElementById('ganttRows');
    rowsContainer.innerHTML = '';
    renderPages();
    renderTasks();
    
    // 統計を更新
    updateStats();
}

// 週次タスク数を再計算
function recalculateWeeklyTaskCounts() {
    scheduleData.weeklyTaskCounts = new Array(scheduleData.totalWeeks).fill(0);
    
    scheduleData.tasks.forEach(task => {
        if (task.owner === 'ecbeing' && task.week < scheduleData.totalWeeks) {
            scheduleData.weeklyTaskCounts[task.week]++;
        }
    });
}

// ツールチップ表示
function showTooltip(e, task) {
    const tooltip = document.getElementById('tooltip');
    const weekDate = new Date(scheduleData.startDate);
    weekDate.setDate(weekDate.getDate() + task.week * 7);
    
    tooltip.innerHTML = `
        <strong>${task.text}</strong><br>
        ページ: ${task.pageName}<br>
        週: 第${task.week + 1}週 (${formatDateJP(weekDate)})<br>
        担当: ${task.owner === 'ecbeing' ? 'ecbeing' : 'クライアント'}
    `;
    
    tooltip.style.left = e.pageX + 10 + 'px';
    tooltip.style.top = e.pageY - 30 + 'px';
    tooltip.style.display = 'block';
}

function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

// 統計更新
function updateStats() {
    document.getElementById('totalPages').textContent = projectData.pages.length;
    document.getElementById('projectWeeks').textContent = scheduleData.totalWeeks;
    document.getElementById('totalTasks').textContent = scheduleData.tasks.filter(t => t.owner === 'ecbeing').length;
    document.getElementById('peakTasks').textContent = Math.max(...scheduleData.weeklyTaskCounts);
}

// イベントリスナー設定
function setupEventListeners() {
    document.getElementById('startDate').addEventListener('change', () => {
        scheduleData.startDate = new Date(document.getElementById('startDate').value);
        renderGanttChart();
    });
    
    document.getElementById('taskLimit').addEventListener('change', () => {
        generateSchedule();
        renderGanttChart();
    });
    
    document.getElementById('firstWeekPages').addEventListener('change', () => {
        generateSchedule();
        renderGanttChart();
    });
}

// スケジュールリセット
function resetSchedule() {
    if (confirm('スケジュールをリセットしますか？')) {
        generateSchedule();
        renderGanttChart();
    }
}

// CSVエクスポート
function exportSchedule() {
    let csv = 'ページ名,フェーズ,タスク,週,日付,担当\n';
    
    scheduleData.tasks.forEach(task => {
        const weekDate = new Date(scheduleData.startDate);
        weekDate.setDate(weekDate.getDate() + task.week * 7);
        
        csv += `"${task.pageName}","${task.phase}","${task.text}",`;
        csv += `"第${task.week + 1}週","${formatDate(weekDate)}","${task.owner}"\n`;
    });
    
    // ダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gantt_schedule_${formatDate(new Date())}.csv`;
    link.click();
}