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

// 選択されたタスク
let selectedTask = null;


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
            // 最後のページが完了するまでの週数を確保
            let lastPageStartWeek = 0;
            for (let i = distribution.length - 1; i >= 0; i--) {
                if (distribution[i] > 0) {
                    lastPageStartWeek = i;
                    break;
                }
            }
            // 最後のページ開始週 + 完了に必要な週数
            const actualRequiredWeeks = lastPageStartWeek + weeksPerPage;
            return Math.max(testWeeks, actualRequiredWeeks);
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
                    id: String(taskId++),
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
                
                // 修正依頼タスク（週の間の列に配置）
                const reviewTask = {
                    id: String(taskId++),
                    pageIndex: pageIndex,
                    pageName: pageName,
                    phase: phase.name,
                    phaseType: 'client-task',
                    type: 'review',
                    week: phaseStartWeek,
                    duration: 1,
                    text: `${phase.name}修正依頼`,
                    owner: 'client',
                    parentId: submitTask.id,
                    isReview: true  // 修正依頼フラグ
                };
                scheduleData.tasks.push(reviewTask);
                scheduleData.pageSchedules[pageName].tasks.push(reviewTask);
                
                // 修正版提出&確定タスク（第2週）
                const revisionTask = {
                    id: String(taskId++),
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
        
        // 週のセル
        const weekCell = document.createElement('div');
        weekCell.className = 'timeline-week';
        
        // 週次タスク数を取得
        const weekTasks = scheduleData.weeklyTaskCounts[week] || 0;
        const isOverLimit = taskLimit > 0 && weekTasks > taskLimit;
        
        if (isOverLimit) {
            weekCell.classList.add('over-limit');
        }
        
        // 週の進捗を計算
        const weekProgress = calculateWeekProgress(week, weekDate);
        
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
        
        // 最終週以外は修正依頼の列を追加
        if (week < scheduleData.totalWeeks - 1) {
            const reviewDate = new Date(weekDate);
            reviewDate.setDate(reviewDate.getDate() + 3); // 3営業日後（木曜日）
            
            const reviewCell = document.createElement('div');
            reviewCell.className = 'timeline-review';
            reviewCell.innerHTML = `
                <div style="font-weight: 600;">修正依頼</div>
                <div style="font-size: 10px;">${formatDateJP(reviewDate)}</div>
                <div style="font-size: 10px; margin-top: 5px;">木曜</div>
            `;
            timeline.appendChild(reviewCell);
        }
    }
}

// 週の進捗を計算（スケジュール通りに進んだ場合の理論値）
function calculateWeekProgress(weekIndex, weekStartDate) {
    // この週までに完了しているべきタスクを計算
    const totalTasksUpToWeek = scheduleData.tasks.filter(task => 
        task.owner === 'ecbeing' && task.week <= weekIndex
    ).length;
    
    const totalTasks = scheduleData.tasks.filter(t => t.owner === 'ecbeing').length;
    
    if (totalTasks === 0) {
        return { percentage: 0, text: 'タスクなし' };
    }
    
    // 累積完了率
    const cumulativePercentage = Math.round((totalTasksUpToWeek / totalTasks) * 100);
    
    // この週のタスク数
    const weekTasks = scheduleData.weeklyTaskCounts[weekIndex] || 0;
    
    return { 
        percentage: cumulativePercentage, 
        text: `累積 ${cumulativePercentage}% (${weekTasks}タスク)`
    };
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
            // 週のセル
            const cell = document.createElement('div');
            cell.className = 'gantt-cell';
            cell.dataset.week = week;
            cell.dataset.cellType = 'week';
            tasksContainer.appendChild(cell);
            
            // 最終週以外は修正依頼のセルを追加
            if (week < scheduleData.totalWeeks - 1) {
                const reviewCell = document.createElement('div');
                reviewCell.className = 'gantt-cell-review';
                reviewCell.dataset.week = week;
                reviewCell.dataset.cellType = 'review';
                tasksContainer.appendChild(reviewCell);
            }
        }
        
        row.appendChild(tasksContainer);
        rowsContainer.appendChild(row);
    });
}

// タスク描画
function renderTasks() {
    const rowsContainer = document.getElementById('ganttRows');
    const cellWidth = 120;
    const reviewCellWidth = 60;
    
    // タスクをページインデックスでソート
    const sortedTasks = [...scheduleData.tasks].sort((a, b) => {
        if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
        return a.week - b.week;
    });
    
    sortedTasks.forEach(task => {
        const row = rowsContainer.children[task.pageIndex];
        if (!row) {
            console.warn(`No row found for pageIndex ${task.pageIndex}, page: ${task.pageName}`);
            return;
        }
        
        const tasksContainer = row.querySelector('.gantt-tasks');
        const taskElement = createTaskElement(task);
        
        // 位置を計算
        let left;
        let width;
        
        if (task.isReview) {
            // 修正依頼タスクは週の間の列に配置
            // 週の位置 + 週の幅 + 前の修正依頼列の幅の合計
            left = (task.week * cellWidth) + cellWidth + (task.week * reviewCellWidth) + 5;
            width = reviewCellWidth - 10;
        } else {
            // 通常のタスクは週の列に配置
            // 週の位置 + 前の修正依頼列の幅の合計
            left = (task.week * cellWidth) + (task.week * reviewCellWidth) + 5;
            width = cellWidth - 10;
        }
        
        taskElement.style.left = `${left}px`;
        taskElement.style.width = `${width}px`;
        
        // 垂直位置を調整
        taskElement.style.top = '50%';
        taskElement.style.transform = 'translateY(-50%)';
        
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
    element.tabIndex = 0; // キーボードフォーカスを可能にする
    
    // クリックイベント（選択）
    element.addEventListener('click', (e) => onTaskClick(e, task));
    
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
    
    const today = new Date();
    const startDate = new Date(scheduleData.startDate);
    const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const weeksDiff = daysDiff / 7;
    
    if (weeksDiff >= 0 && weeksDiff <= scheduleData.totalWeeks) {
        const line = document.createElement('div');
        line.className = 'today-line';
        
        // 週の幅（120px）と修正依頼列の幅（60px）を考慮した位置計算
        const cellWidth = 120;
        const reviewCellWidth = 60;
        const weekNumber = Math.floor(weeksDiff);
        const dayInWeek = daysDiff % 7;
        const dayOffset = (dayInWeek / 7) * cellWidth;
        
        // サイドバー幅 + (週数 * 週幅) + (週数 * 修正依頼列幅) + 日のオフセット
        const left = 300 + (weekNumber * cellWidth) + (weekNumber * reviewCellWidth) + dayOffset;
        
        line.style.left = `${left}px`;
        document.querySelector('.gantt-container').appendChild(line);
    }
}

// ドラッグ&ドロップ機能
function onTaskMouseDown(e) {
    e.preventDefault();
    
    const taskElement = e.currentTarget;
    const taskId = taskElement.dataset.taskId;
    const task = scheduleData.tasks.find(t => String(t.id) === taskId);
    
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

// タスクグループを移動（押し出し機能付き）
function moveTaskGroup(taskGroup, weekDelta) {
    // 左移動（weekDelta < 0）の場合、押し出し処理を行う
    if (weekDelta < 0) {
        return moveTaskGroupWithPush(taskGroup, weekDelta);
    }
    
    // 右移動の場合は通常の移動処理
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

// 押し出し機能付きのタスク移動
function moveTaskGroupWithPush(taskGroup, weekDelta) {
    // 移動するタスクの最小週を取得
    const minWeek = Math.min(...taskGroup.map(t => t.week));
    const targetWeek = minWeek + weekDelta;
    
    if (targetWeek < 0) {
        alert('これ以上左に移動できません。');
        return;
    }
    
    // 影響を受ける可能性のあるタスクを収集
    const affectedTasks = [];
    const taskGroupIds = new Set(taskGroup.map(t => t.id));
    
    // 各ページについて、影響を受けるタスクを特定
    Object.values(scheduleData.pageSchedules).forEach(pageSchedule => {
        const pageTasks = pageSchedule.tasks;
        let shouldPush = false;
        
        // このページのタスクで移動対象のものがあるかチェック
        const hasMovingTask = pageTasks.some(t => taskGroupIds.has(t.id));
        
        if (hasMovingTask) {
            // 移動対象タスクより前にあるタスクを収集
            pageTasks.forEach(task => {
                if (!taskGroupIds.has(task.id) && task.week >= targetWeek && task.week < minWeek) {
                    shouldPush = true;
                    affectedTasks.push(task);
                }
            });
        }
    });
    
    // 押し出し量を計算（移動するタスクが占める週数）
    const pushAmount = Math.abs(weekDelta);
    
    // 影響を受けるタスクを左に押し出す
    affectedTasks.forEach(task => {
        task.week -= pushAmount;
    });
    
    // 元のタスクグループを移動
    taskGroup.forEach(task => {
        task.week += weekDelta;
    });
    
    // 全タスクが範囲内にあるか確認
    const allTasksValid = scheduleData.tasks.every(task => 
        task.week >= 0 && task.week < scheduleData.totalWeeks
    );
    
    if (!allTasksValid) {
        // 元に戻す
        affectedTasks.forEach(task => {
            task.week += pushAmount;
        });
        taskGroup.forEach(task => {
            task.week -= weekDelta;
        });
        alert('タスクを押し出すとプロジェクト期間を超えてしまいます。');
        return;
    }
    
    // 週次タスク数を再計算
    recalculateWeeklyTaskCounts();
    
    // 再描画
    const rowsContainer = document.getElementById('ganttRows');
    rowsContainer.innerHTML = '';
    renderPages();
    renderTasks();
    renderTimeline();
    drawTaskChart();
    
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
    
    // 進捗状況を計算
    const today = new Date();
    const progress = calculateProjectProgress(today);
    
    document.getElementById('completedPages').textContent = progress.completed;
    document.getElementById('inProgressPages').textContent = progress.inProgress;
    document.getElementById('notStartedPages').textContent = progress.notStarted;
    document.getElementById('completionRate').textContent = progress.completionRate + '%';
}

// プロジェクト全体の進捗を計算（スケジュール通りの理論値）
function calculateProjectProgress(today) {
    // 今日が第何週目かを計算
    const weeksDiff = Math.floor((today - new Date(scheduleData.startDate)) / (1000 * 60 * 60 * 24 * 7));
    const currentWeek = Math.max(0, weeksDiff);
    
    let theoreticalCompleted = 0;
    let theoreticalInProgress = 0;
    let theoreticalNotStarted = 0;
    
    projectData.pages.forEach((pageName, index) => {
        const pageTasks = scheduleData.tasks.filter(t => t.pageIndex === index && t.owner === 'ecbeing');
        if (pageTasks.length === 0) {
            theoreticalNotStarted++;
            return;
        }
        
        // ページの開始週と終了週を取得
        const firstTask = pageTasks.find(t => t.type === 'submit' && t.phase === 'PCデザイン');
        const lastTask = pageTasks.find(t => t.type === 'revision' && t.phase === 'コーディング');
        
        if (!firstTask || !lastTask) {
            theoreticalNotStarted++;
            return;
        }
        
        if (currentWeek < firstTask.week) {
            // まだ開始していない
            theoreticalNotStarted++;
        } else if (currentWeek > lastTask.week) {
            // 完了している
            theoreticalCompleted++;
        } else {
            // 進行中
            theoreticalInProgress++;
        }
    });
    
    // 理論的な完了率（スケジュール通りに進んだ場合）
    const completionRate = Math.round((theoreticalCompleted / projectData.pages.length) * 100);
    
    return { 
        completed: theoreticalCompleted, 
        inProgress: theoreticalInProgress, 
        notStarted: theoreticalNotStarted, 
        completionRate: completionRate 
    };
}

// タスク量グラフ描画
function drawTaskChart() {
    const canvas = document.getElementById('taskChart');
    const ctx = canvas.getContext('2d');
    
    // キャンバスサイズ設定
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    
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
    ctx.font = '11px Arial';
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
    
    // キーボードイベント
    document.addEventListener('keydown', onKeyDown);
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

// タスククリック時の処理
function onTaskClick(e, task) {
    e.stopPropagation();
    
    // 既存の選択を解除
    document.querySelectorAll('.gantt-task.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // クリックしたタスクを選択
    const taskElement = e.currentTarget;
    taskElement.classList.add('selected');
    taskElement.focus();
    
    selectedTask = task;
}

// キーボードイベント処理
function onKeyDown(e) {
    if (!selectedTask) return;
    
    const cellWidth = 120;
    const reviewCellWidth = 60;
    let weekDelta = 0;
    
    switch(e.key) {
        case 'ArrowLeft':
            weekDelta = -1;
            e.preventDefault();
            break;
        case 'ArrowRight':
            weekDelta = 1;
            e.preventDefault();
            break;
        default:
            return;
    }
    
    if (weekDelta !== 0) {
        // 関連タスクを取得
        const relatedTasks = findRelatedTasks(selectedTask);
        
        // 移動可能かチェック
        const canMove = relatedTasks.every(task => {
            const newWeek = task.week + weekDelta;
            return newWeek >= 0 && newWeek < scheduleData.totalWeeks;
        });
        
        if (canMove) {
            moveTaskGroup(relatedTasks, weekDelta);
            
            // 選択を維持
            setTimeout(() => {
                const newElement = document.querySelector(`[data-task-id="${selectedTask.id}"]`);
                if (newElement) {
                    newElement.classList.add('selected');
                    newElement.focus();
                }
            }, 100);
        }
    }
}

// クリックで選択解除
document.addEventListener('click', (e) => {
    if (!e.target.closest('.gantt-task')) {
        document.querySelectorAll('.gantt-task.selected').forEach(el => {
            el.classList.remove('selected');
        });
        selectedTask = null;
    }
});

// CSVファイル選択処理
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            importCSV(e.target.result);
        } catch (error) {
            alert('CSVファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file, 'UTF-8');
}

// CSVインポート処理
function importCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        throw new Error('有効なデータが含まれていません');
    }
    
    // ヘッダー行をスキップ
    const header = lines[0];
    if (!header.includes('ページ名') || !header.includes('週')) {
        throw new Error('CSVファイルの形式が正しくありません');
    }
    
    // 新しいタスクデータを構築
    const newTasks = [];
    const pageWeeks = {};
    
    for (let i = 1; i < lines.length; i++) {
        const columns = parseCSVLine(lines[i]);
        if (columns.length < 6) continue;
        
        const pageName = columns[0];
        const phase = columns[1];
        const taskText = columns[2];
        const weekStr = columns[3];
        const weekMatch = weekStr.match(/第(\d+)週/);
        
        if (!weekMatch) continue;
        
        const week = parseInt(weekMatch[1]) - 1;
        const owner = columns[5];
        
        // ページインデックスを取得
        let pageIndex = -1;
        for (let i = 0; i < projectData.pages.length; i++) {
            // 括弧の中身で検索、または完全一致で検索
            if (projectData.pages[i].includes(`(${pageName})`) || 
                projectData.pages[i] === pageName ||
                projectData.pages[i].split('(')[0] === pageName) {
                pageIndex = i;
                break;
            }
        }
        if (pageIndex === -1) {
            console.warn(`Page not found: ${pageName}`);
            continue;
        }
        
        // タスクタイプを判定
        let type = 'pc-design';
        if (phase.includes('SP')) type = 'sp-design';
        else if (phase.includes('コーディング')) type = 'coding';
        
        const isReview = taskText.includes('修正依頼') || taskText.includes('確認');
        
        // タスクを作成
        const task = {
            id: `page${pageIndex}_${type}_week${week}${isReview ? '_review' : ''}`,
            pageIndex: pageIndex,
            pageName: projectData.pages[pageIndex],
            phase: phase,
            phaseType: owner === 'client' ? 'client-task' : type,
            text: taskText,
            week: week,
            type: isReview ? 'review' : (taskText.includes('修正版') ? 'revision' : 'submit'),
            owner: owner,
            isReview: isReview
        };
        
        newTasks.push(task);
        
        // ページの週を記録
        if (!pageWeeks[pageIndex]) {
            pageWeeks[pageIndex] = [];
        }
        pageWeeks[pageIndex].push(week);
    }
    
    if (newTasks.length === 0) {
        throw new Error('インポート可能なタスクが見つかりませんでした');
    }
    
    // 最大週を計算
    let maxWeek = 0;
    Object.values(pageWeeks).forEach(weeks => {
        const pageMaxWeek = Math.max(...weeks);
        if (pageMaxWeek > maxWeek) maxWeek = pageMaxWeek;
    });
    
    // スケジュールデータを更新
    scheduleData.tasks = newTasks;
    scheduleData.totalWeeks = maxWeek + 3; // 余裕を持たせる
    
    // ページスケジュールを再構築
    scheduleData.pageSchedules = {};
    newTasks.forEach(task => {
        if (!scheduleData.pageSchedules[task.pageName]) {
            scheduleData.pageSchedules[task.pageName] = {
                startWeek: task.week,
                tasks: []
            };
        }
        scheduleData.pageSchedules[task.pageName].tasks.push(task);
        // 開始週を更新
        if (task.week < scheduleData.pageSchedules[task.pageName].startWeek) {
            scheduleData.pageSchedules[task.pageName].startWeek = task.week;
        }
    });
    
    // 週次タスク数を再計算
    scheduleData.weeklyTaskCounts = new Array(scheduleData.totalWeeks).fill(0);
    newTasks.forEach(task => {
        if (task.owner === 'ecbeing' && task.week < scheduleData.totalWeeks) {
            scheduleData.weeklyTaskCounts[task.week]++;
        }
    });
    
    // ガントチャートを再描画
    renderGanttChart();
    
    alert(`${newTasks.length}個のタスクをインポートしました`);
}

// CSV行をパースする関数
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}
