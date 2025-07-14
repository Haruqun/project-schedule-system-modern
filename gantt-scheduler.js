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

// シミュレーション用の現在日付
let simulationDate = new Date();

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
    
    // シミュレーション日付を今日に設定
    document.getElementById('simulationDate').value = formatDate(today);
    simulationDate = today;
    
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
    drawTaskChart();
}

// タイムライン描画
function renderTimeline() {
    const timeline = document.getElementById('ganttTimeline');
    timeline.innerHTML = '';
    
    const taskLimit = parseInt(document.getElementById('taskLimit').value) || 15;
    
    for (let week = 0; week < scheduleData.totalWeeks; week++) {
        const weekDate = new Date(scheduleData.startDate);
        weekDate.setDate(weekDate.getDate() + week * 7);
        
        const weekCell = document.createElement('div');
        weekCell.className = 'timeline-week';
        
        // 週次タスク数を取得
        const weekTasks = scheduleData.weeklyTaskCounts[week] || 0;
        const isOverLimit = taskLimit > 0 && weekTasks > taskLimit;
        
        if (isOverLimit) {
            weekCell.classList.add('over-limit');
        }
        
        // 週の進捗を計算（シミュレーション日付を使用）
        const weekProgress = calculateWeekProgress(week, weekDate, simulationDate);
        
        weekCell.innerHTML = `
            <div class="week-number">第${week + 1}週</div>
            <div class="week-date">${formatDateJP(weekDate)}</div>
            <div class="week-tasks">${weekTasks}タスク</div>
            <div class="week-progress">
                <div class="week-progress-bar" style="width: ${weekProgress.percentage}%"></div>
            </div>
            <div class="week-progress-text">${weekProgress.text}</div>
        `;
        timeline.appendChild(weekCell);
    }
}

// 週の進捗を計算
function calculateWeekProgress(weekIndex, weekStartDate, today) {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    
    // 未来の週
    if (today < weekStartDate) {
        return { percentage: 0, text: '未着手' };
    }
    
    // 過去の週
    if (today > weekEndDate) {
        // この週のタスクを確認
        const weekTasks = scheduleData.tasks.filter(task => 
            task.week === weekIndex && task.owner === 'ecbeing'
        );
        
        if (weekTasks.length === 0) {
            return { percentage: 0, text: 'タスクなし' };
        }
        
        // 完了したと仮定（実際の実装では完了フラグが必要）
        return { percentage: 100, text: '完了' };
    }
    
    // 現在の週
    const daysPassed = Math.floor((today - weekStartDate) / (1000 * 60 * 60 * 24));
    const percentage = Math.round((daysPassed / 7) * 100);
    
    return { percentage: percentage, text: `進行中 (${daysPassed}/7日)` };
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
    // 既存の線を削除
    const existingLine = document.querySelector('.today-line');
    if (existingLine) {
        existingLine.remove();
    }
    
    const startDate = new Date(scheduleData.startDate);
    const daysDiff = Math.floor((simulationDate - startDate) / (1000 * 60 * 60 * 24));
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
    renderTimeline(); // タイムラインも更新して週次タスク数を反映
    drawTaskChart(); // グラフも更新
    
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
    
    // 進捗状況を計算（シミュレーション日付を使用）
    const progress = calculateProjectProgress(simulationDate);
    
    document.getElementById('completedPages').textContent = progress.completed;
    document.getElementById('inProgressPages').textContent = progress.inProgress;
    document.getElementById('notStartedPages').textContent = progress.notStarted;
    document.getElementById('completionRate').textContent = progress.completionRate + '%';
}

// プロジェクト全体の進捗を計算
function calculateProjectProgress(today) {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;
    
    projectData.pages.forEach((pageName, index) => {
        const pageTasks = scheduleData.tasks.filter(t => t.pageIndex === index);
        if (pageTasks.length === 0) {
            notStarted++;
            return;
        }
        
        // 最初のタスクの週を確認
        const firstTask = pageTasks.find(t => t.type === 'submit' && t.phase === 'PCデザイン');
        if (!firstTask) {
            notStarted++;
            return;
        }
        
        const firstTaskDate = new Date(scheduleData.startDate);
        firstTaskDate.setDate(firstTaskDate.getDate() + firstTask.week * 7);
        
        if (today < firstTaskDate) {
            notStarted++;
            return;
        }
        
        // 最後のタスクの週を確認
        const lastTask = pageTasks.find(t => t.type === 'revision' && t.phase === 'コーディング');
        if (!lastTask) {
            inProgress++;
            return;
        }
        
        const lastTaskDate = new Date(scheduleData.startDate);
        lastTaskDate.setDate(lastTaskDate.getDate() + lastTask.week * 7 + 7); // 週の終わり
        
        if (today > lastTaskDate) {
            completed++;
        } else {
            inProgress++;
        }
    });
    
    const completionRate = Math.round((completed / projectData.pages.length) * 100);
    
    return { completed, inProgress, notStarted, completionRate };
}

// タスク量グラフ描画
function drawTaskChart() {
    const canvas = document.getElementById('taskChart');
    const ctx = canvas.getContext('2d');
    
    // キャンバスサイズ設定
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;
    
    const data = scheduleData.weeklyTaskCounts;
    const taskLimit = parseInt(document.getElementById('taskLimit').value) || 15;
    const maxTasks = Math.max(...data, taskLimit);
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    const barWidth = (chartWidth / data.length) * 0.7;
    const spacing = chartWidth / data.length;
    
    // 背景をクリア
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // グリッド線とY軸ラベル
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        const value = Math.round((maxTasks * (5 - i)) / 5);
        
        // グリッド線
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
        
        // Y軸ラベル
        ctx.textAlign = 'right';
        ctx.fillText(value, padding - 10, y + 4);
    }
    
    // タスク上限ライン
    if (taskLimit > 0) {
        const limitY = padding + chartHeight - (taskLimit / maxTasks) * chartHeight;
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, limitY);
        ctx.lineTo(canvas.width - padding, limitY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // ラベル
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`上限: ${taskLimit}`, canvas.width - padding + 10, limitY + 4);
    }
    
    // バー描画
    data.forEach((tasks, week) => {
        const x = padding + week * spacing + (spacing - barWidth) / 2;
        const barHeight = (tasks / maxTasks) * chartHeight;
        const y = padding + chartHeight - barHeight;
        
        // バーの色（上限超過は赤）
        const isOverLimit = taskLimit > 0 && tasks > taskLimit;
        ctx.fillStyle = isOverLimit ? '#e74c3c' : '#3498db';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // タスク数表示
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        if (tasks > 0) {
            ctx.fillText(tasks, x + barWidth / 2, y - 5);
        }
        
        // X軸ラベル（週番号）
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.fillText(`${week + 1}`, x + barWidth / 2, padding + chartHeight + 15);
    });
    
    // 軸ラベル
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('週', canvas.width / 2, canvas.height - 5);
    
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('タスク数', 0, 0);
    ctx.restore();
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

// シミュレーション更新
function updateSimulation() {
    const dateInput = document.getElementById('simulationDate').value;
    const weekInput = parseInt(document.getElementById('simulationWeek').value) || 1;
    
    if (dateInput) {
        simulationDate = new Date(dateInput);
    } else {
        // 週番号から日付を計算
        simulationDate = new Date(scheduleData.startDate);
        simulationDate.setDate(simulationDate.getDate() + (weekInput - 1) * 7);
        document.getElementById('simulationDate').value = formatDate(simulationDate);
    }
    
    // 週番号を更新
    const weeksDiff = Math.floor((simulationDate - new Date(scheduleData.startDate)) / (1000 * 60 * 60 * 24 * 7));
    document.getElementById('simulationWeek').value = weeksDiff + 1;
    
    // 再描画
    renderTimeline();
    addTodayLine();
    updateStats();
}

// 今日に戻す
function resetToToday() {
    simulationDate = new Date();
    document.getElementById('simulationDate').value = formatDate(simulationDate);
    
    const weeksDiff = Math.floor((simulationDate - new Date(scheduleData.startDate)) / (1000 * 60 * 60 * 24 * 7));
    document.getElementById('simulationWeek').value = Math.max(1, weeksDiff + 1);
    
    // 再描画
    renderTimeline();
    addTodayLine();
    updateStats();
}