// プロジェクトデータ
const projectData = {
    pages: [
        'ジャンルページ（一覧・詳細）',
        'カテゴリページ（一覧・詳細）',
        '選び方ページ - 縦走用アックスの選び方',
        '選び方ページ -登山用軽量ハーネスの活用',
        '選び方ページ -アルトテント/テロステント',
        '新着商品',
        'キャンペーン',
        '限定アイテム',
        'Tech Info TOP',
        'Tech Info 一覧',
        'Tech Info詳細',
        'Tech Info 製品別 一覧',
        'Tech Info 製品別 詳細',
        '商品詳細',
        'マイページ',
        'ご利用にあたって',
        'ご利用ガイド一覧',
        'ご利用ガイド詳細',
        'コーポレートTOP',
        '会社情報',
        '会社情報詳細',
        '取扱店',
        '取扱店一覧',
        'サポート情報',
        '取扱説明書一覧 (PDF)',
        'お問い合わせ',
        'ニュース',
        '重要なお知らせ',
        'ブランドTOPページ',
        'Black Diamondページ',
        '製品一覧',
        'ヒストリー',
        'Ospreyページ',
        'Scarpaページ',
        'Smartwoolページ'
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
let selectedTasks = []; // 複数選択用
let lastSelectedTask = null; // 範囲選択の起点
let selectedTaskId = null;

// アンドゥ機能用の履歴
let undoHistory = [];
let maxUndoSteps = 50;


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
    
    // タスクページオプションを初期化
    updateTaskPageOptions();
    
    // フォームテンプレートを初期化
    populatePageTemplate();
    populateTaskTemplate();
    
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
    
    // 全てのページを第0週から開始するが、タスク構造は維持
    projectData.pages.forEach((pageName, pageIndex) => {
        scheduleData.pageSchedules[pageName] = {
            startWeek: 0,
            tasks: []
        };
        
        // 各フェーズのタスクを生成（正しい間隔を維持）
        projectData.phases.forEach((phase, phaseIndex) => {
            const phaseStartWeek = phaseIndex * 2; // 各フェーズは2週間隔
                
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
                    text: `${phase.name}修正依頼提出`,
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
                    text: `${phase.name}修正版提出&確認確定`,
                    owner: 'ecbeing',
                    parentId: submitTask.id
                };
                scheduleData.tasks.push(revisionTask);
                scheduleData.pageSchedules[pageName].tasks.push(revisionTask);
        });
        
        taskId = taskId; // taskIdはそのまま継続
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
    
    // サイドバー分のスペースを追加（stickyなし）
    const sidebarSpace = document.createElement('div');
    sidebarSpace.style.minWidth = '300px';
    sidebarSpace.style.background = '#667eea';
    timeline.appendChild(sidebarSpace);
    
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
        
        // 週クリックでその週のタスクを全選択
        weekCell.addEventListener('click', () => selectWeekTasks(week));
        weekCell.style.cursor = 'pointer';
        
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
        
        // 選択状態を復元
        if (selectedTaskId && task.id === selectedTaskId) {
            taskElement.classList.add('selected');
            selectedTask = task;
        }
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
    
    // ツールチップを隠す
    hideTooltip();
    
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
    const cellWidth = 120;
    const reviewCellWidth = 60;
    const totalCellWidth = cellWidth + reviewCellWidth; // 週セル + 修正依頼セル = 180px
    const weekDelta = Math.round(deltaX / totalCellWidth);
    
    // プレビュー更新
    dragState.draggedGroup.forEach(task => {
        const element = document.querySelector(`[data-task-id="${task.id}"]`);
        if (element) {
            element.style.transform = `translateX(${weekDelta * totalCellWidth}px)`;
        }
    });
}

function onTaskMouseUp(e) {
    if (!dragState.isDragging) return;
    
    // ツールチップを隠す
    hideTooltip();
    
    const deltaX = e.pageX - dragState.startX;
    const cellWidth = 120;
    const reviewCellWidth = 60;
    const totalCellWidth = cellWidth + reviewCellWidth; // 週セル + 修正依頼セル = 180px
    const weekDelta = Math.round(deltaX / totalCellWidth);
    
    // タスクを移動
    if (weekDelta !== 0) {
        // ドラッグ移動では関連タスクロジックを適用
        const relatedTasks = findRelatedTasks(dragState.draggedTask, weekDelta);
        moveTaskGroup(relatedTasks, weekDelta);
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

// 関連タスクを見つける（選択タスクの右側全て）
function findRelatedTasks(task, direction) {
    const pageTasks = scheduleData.pageSchedules[task.pageName].tasks;
    const relatedTasks = [];
    
    // 左移動の場合：選択タスクとその右側のタスク
    if (direction < 0) {
        pageTasks.forEach(t => {
            if (t.week >= task.week) {
                relatedTasks.push(t);
            }
        });
    } 
    // 右移動の場合：選択タスクとその右側のタスク
    else {
        pageTasks.forEach(t => {
            if (t.week >= task.week) {
                relatedTasks.push(t);
            }
        });
    }
    
    return relatedTasks;
}

// タスクグループを移動（重複回避機能付き）
function moveTaskGroup(taskGroup, weekDelta) {
    // 状態を保存（アンドゥ用）
    saveStateForUndo();
    
    // 移動先の候補週を計算
    const targetWeeks = taskGroup.map(task => task.week + weekDelta);
    
    // 境界チェック
    const canMove = targetWeeks.every(week => week >= 0 && week < scheduleData.totalWeeks);
    if (!canMove) {
        return; // 範囲外の場合は移動しない
    }
    
    // 移動するタスクのページ名を取得
    const movingPageNames = [...new Set(taskGroup.map(t => t.pageName))];
    
    // ページごとに処理
    movingPageNames.forEach(pageName => {
        const pageSchedule = scheduleData.pageSchedules[pageName];
        if (!pageSchedule) return;
        
        const pageTaskGroup = taskGroup.filter(t => t.pageName === pageName);
        const otherTasks = pageSchedule.tasks.filter(t => !taskGroup.includes(t));
        
        // 移動先で重複する既存タスクを見つける
        const conflictingTasks = [];
        pageTaskGroup.forEach(movingTask => {
            const newWeek = movingTask.week + weekDelta;
            otherTasks.forEach(existingTask => {
                if (existingTask.week === newWeek && existingTask.phase === movingTask.phase) {
                    conflictingTasks.push(existingTask);
                }
            });
        });
        
        // 重複するタスクを押し出す
        if (conflictingTasks.length > 0) {
            const pushDirection = weekDelta > 0 ? 1 : -1; // 移動方向と同じ方向に押し出す
            
            conflictingTasks.forEach(conflictTask => {
                // 押し出し先を探す
                let pushWeek = conflictTask.week + pushDirection;
                
                // 空いている週を探す
                while (pushWeek >= 0 && pushWeek < scheduleData.totalWeeks) {
                    const hasConflict = otherTasks.some(t => 
                        t.week === pushWeek && 
                        t.phase === conflictTask.phase && 
                        t !== conflictTask &&
                        !conflictingTasks.includes(t)
                    );
                    
                    if (!hasConflict) {
                        break;
                    }
                    pushWeek += pushDirection;
                }
                
                // 範囲内なら移動
                if (pushWeek >= 0 && pushWeek < scheduleData.totalWeeks) {
                    conflictTask.week = pushWeek;
                }
            });
        }
        
        // 元のタスクを移動
        pageTaskGroup.forEach(task => {
            task.week += weekDelta;
        });
    });
    
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

// 指定されたページのタスクのみを前に詰める
function optimizePageSchedule(pageName) {
    const taskLimit = parseInt(document.getElementById('taskLimit').value) || 15;
    
    // 週ごとのタスク数を計算
    const weeklyTaskCounts = new Array(scheduleData.totalWeeks).fill(0);
    scheduleData.tasks.forEach(task => {
        if (task.owner === 'ecbeing' && task.week < scheduleData.totalWeeks) {
            weeklyTaskCounts[task.week]++;
        }
    });
    
    // 指定されたページのタスクのみを処理
    const pageSchedule = scheduleData.pageSchedules[pageName];
    if (!pageSchedule) return;
    
    // そのページのタスクを週順にソート
    const pageTasks = pageSchedule.tasks.filter(t => t.owner === 'ecbeing').sort((a, b) => a.week - b.week);
    
    // 各タスクについて、より早い週に移動できるかチェック
    pageTasks.forEach((task, index) => {
        const currentWeek = task.week;
        
        // 前のタスクの最終週を取得
        let minAllowedWeek = 0;
        if (index > 0) {
            const prevTask = pageTasks[index - 1];
            minAllowedWeek = prevTask.week + 1;
        }
        
        // より早い週を探す
        for (let week = minAllowedWeek; week < currentWeek; week++) {
            if (weeklyTaskCounts[week] < taskLimit) {
                // この週に移動可能
                weeklyTaskCounts[currentWeek]--;
                weeklyTaskCounts[week]++;
                task.week = week;
                break;
            }
        }
    });
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
    
    if (e.shiftKey && lastSelectedTask) {
        // Shift+クリック: 範囲選択
        selectTaskRange(lastSelectedTask, task);
    } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+クリック: 追加選択
        toggleTaskSelection(task);
    } else {
        // 通常クリック: 単一選択
        clearSelection();
        selectSingleTask(task);
    }
}

// 単一タスクを選択
function selectSingleTask(task) {
    clearSelection();
    
    const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
    if (taskElement) {
        taskElement.classList.add('selected');
        taskElement.focus();
    }
    
    selectedTask = task;
    selectedTaskId = task.id;
    selectedTasks = [task];
    lastSelectedTask = task;
}

// タスクの選択をトグル
function toggleTaskSelection(task) {
    const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
    if (!taskElement) return;
    
    const isSelected = taskElement.classList.contains('selected');
    
    if (isSelected) {
        // 選択解除
        taskElement.classList.remove('selected');
        selectedTasks = selectedTasks.filter(t => t.id !== task.id);
        if (selectedTask && selectedTask.id === task.id) {
            selectedTask = selectedTasks.length > 0 ? selectedTasks[selectedTasks.length - 1] : null;
            selectedTaskId = selectedTask ? selectedTask.id : null;
        }
    } else {
        // 選択追加
        taskElement.classList.add('selected');
        selectedTasks.push(task);
        selectedTask = task;
        selectedTaskId = task.id;
    }
    
    lastSelectedTask = task;
}

// 範囲選択
function selectTaskRange(fromTask, toTask) {
    clearSelection();
    selectedTasks = [];
    
    // 全タスクを取得してDOM上の表示順にソート
    const allTaskElements = Array.from(document.querySelectorAll('.gantt-task'));
    const taskPositions = new Map();
    
    allTaskElements.forEach((element, index) => {
        const taskId = element.dataset.taskId;
        taskPositions.set(taskId, index);
    });
    
    // fromTaskとtoTaskの位置を取得
    const fromIndex = taskPositions.get(fromTask.id);
    const toIndex = taskPositions.get(toTask.id);
    
    if (fromIndex === undefined || toIndex === undefined) {
        selectSingleTask(toTask);
        return;
    }
    
    // 範囲内のタスクを選択
    const minIndex = Math.min(fromIndex, toIndex);
    const maxIndex = Math.max(fromIndex, toIndex);
    
    for (let i = minIndex; i <= maxIndex; i++) {
        const element = allTaskElements[i];
        const taskId = element.dataset.taskId;
        const task = scheduleData.tasks.find(t => t.id === taskId);
        
        if (task) {
            element.classList.add('selected');
            selectedTasks.push(task);
        }
    }
    
    selectedTask = toTask;
    selectedTaskId = toTask.id;
    lastSelectedTask = toTask;
}

// 選択をクリア
function clearSelection() {
    document.querySelectorAll('.gantt-task.selected').forEach(el => {
        el.classList.remove('selected');
    });
    selectedTasks = [];
}

// 特定週のタスクを全選択
function selectWeekTasks(week) {
    clearSelection();
    selectedTasks = [];
    
    // その週のタスクを全て選択
    scheduleData.tasks.forEach(task => {
        if (task.week === week) {
            const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
            if (taskElement) {
                taskElement.classList.add('selected');
                selectedTasks.push(task);
            }
        }
    });
    
    // 選択されたタスクがある場合は最初のタスクをアクティブに
    if (selectedTasks.length > 0) {
        selectedTask = selectedTasks[0];
        selectedTaskId = selectedTask.id;
        lastSelectedTask = selectedTask;
    }
}

// キーボードイベント処理
function onKeyDown(e) {
    // Command/Ctrl + Z でアンドゥ
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undoLastAction();
        return;
    }
    
    // ? キーでショートカット表示
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        showShortcutHelp();
        return;
    }
    
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
        case 'ArrowUp':
            if (e.shiftKey && lastSelectedTask) {
                // Shift+上: 範囲選択を拡張
                extendSelectionVertically(-1);
            } else {
                // 上のページのタスクを選択
                selectAdjacentPageTask(-1);
            }
            e.preventDefault();
            return;
        case 'ArrowDown':
            if (e.shiftKey && lastSelectedTask) {
                // Shift+下: 範囲選択を拡張
                extendSelectionVertically(1);
            } else {
                // 下のページのタスクを選択
                selectAdjacentPageTask(1);
            }
            e.preventDefault();
            return;
        default:
            return;
    }
    
    if (weekDelta !== 0) {
        let tasksToMove = [];
        
        // 複数選択時は選択されたタスクをすべて移動
        if (selectedTasks && selectedTasks.length > 1) {
            // 各タスクの右側のタスクも含める
            selectedTasks.forEach(task => {
                const relatedTasks = findRelatedTasks(task, weekDelta);
                relatedTasks.forEach(rt => {
                    if (!tasksToMove.find(t => t.id === rt.id)) {
                        tasksToMove.push(rt);
                    }
                });
            });
        } else if (selectedTask) {
            // 単一選択時は従来通り
            tasksToMove = findRelatedTasks(selectedTask, weekDelta);
        }
        
        if (tasksToMove.length === 0) return;
        
        // 移動可能かチェック
        const canMove = tasksToMove.every(task => {
            const newWeek = task.week + weekDelta;
            return newWeek >= 0 && newWeek < scheduleData.totalWeeks;
        });
        
        if (canMove) {
            // シンプルな移動処理
            moveTaskGroup(tasksToMove, weekDelta);
        }
        
        // 選択を維持（移動したタスクを再選択）
        setTimeout(() => {
            selectedTasks.forEach(task => {
                const newElement = document.querySelector(`[data-task-id="${task.id}"]`);
                if (newElement) {
                    newElement.classList.add('selected');
                }
            });
            
            if (selectedTask) {
                const focusElement = document.querySelector(`[data-task-id="${selectedTask.id}"]`);
                if (focusElement) {
                    focusElement.focus();
                    focusElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 100);
    }
}

// クリックで選択解除
document.addEventListener('click', (e) => {
    if (!e.target.closest('.gantt-task')) {
        clearSelection();
        selectedTask = null;
        selectedTaskId = null;
        lastSelectedTask = null;
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
            // 完全一致または部分一致で検索
            if (projectData.pages[i] === pageName || 
                projectData.pages[i].includes(pageName) ||
                pageName.includes(projectData.pages[i])) {
                pageIndex = i;
                break;
            }
        }
        if (pageIndex === -1) {
            console.warn(`Page not found: ${pageName}`);
            // ページが見つからない場合は最初のページとして追加
            pageIndex = 0;
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
    
    // ページリストとタスクリストのフォームを更新
    updatePageListForm();
    updateTaskListForm();
    
    // タスクページオプションも更新
    updateTaskPageOptions();
    
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

// 状態を保存（アンドゥ用）
function saveStateForUndo() {
    const currentState = {
        tasks: JSON.parse(JSON.stringify(scheduleData.tasks)),
        pageSchedules: JSON.parse(JSON.stringify(scheduleData.pageSchedules)),
        weeklyTaskCounts: [...scheduleData.weeklyTaskCounts]
    };
    
    undoHistory.push(currentState);
    
    // 履歴が多すぎる場合は古いものを削除
    if (undoHistory.length > maxUndoSteps) {
        undoHistory.shift();
    }
}

// アンドゥ実行
function undoLastAction() {
    if (undoHistory.length === 0) {
        showModal('元に戻す', '<p style="text-align: center; color: #666; font-size: 16px;">元に戻せる操作がありません。</p>');
        return;
    }
    
    const previousState = undoHistory.pop();
    
    // 状態を復元
    scheduleData.tasks = previousState.tasks;
    scheduleData.pageSchedules = previousState.pageSchedules;
    scheduleData.weeklyTaskCounts = previousState.weeklyTaskCounts;
    
    // 画面を再描画
    const rowsContainer = document.getElementById('ganttRows');
    rowsContainer.innerHTML = '';
    renderPages();
    renderTasks();
    renderTimeline();
    drawTaskChart();
    updateStats();
    
    // 選択を解除
    selectedTask = null;
    document.querySelectorAll('.gantt-task.selected').forEach(el => {
        el.classList.remove('selected');
    });
}

// 垂直方向に範囲選択を拡張
function extendSelectionVertically(direction) {
    if (!selectedTask || !lastSelectedTask) return;
    
    const currentElement = document.querySelector(`[data-task-id="${selectedTask.id}"]`);
    if (!currentElement) return;
    
    // 現在のタスクの位置を取得
    const currentRect = currentElement.getBoundingClientRect();
    const currentCenterX = currentRect.left + currentRect.width / 2;
    
    // すべてのタスクを取得
    const allTasks = Array.from(document.querySelectorAll('.gantt-task'));
    const currentIndex = allTasks.findIndex(el => el.dataset.taskId === selectedTask.id);
    
    // 上下方向のタスクを探す
    let targetElement = null;
    let targetTask = null;
    
    if (direction < 0) {
        // 上方向
        for (let i = currentIndex - 1; i >= 0; i--) {
            const task = allTasks[i];
            const rect = task.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            
            if (Math.abs(centerX - currentCenterX) < 50) {
                targetElement = task;
                const taskId = targetElement.dataset.taskId;
                targetTask = scheduleData.tasks.find(t => t.id === taskId);
                break;
            }
        }
    } else {
        // 下方向
        for (let i = currentIndex + 1; i < allTasks.length; i++) {
            const task = allTasks[i];
            const rect = task.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            
            if (Math.abs(centerX - currentCenterX) < 50) {
                targetElement = task;
                const taskId = targetElement.dataset.taskId;
                targetTask = scheduleData.tasks.find(t => t.id === taskId);
                break;
            }
        }
    }
    
    if (targetTask) {
        // 範囲選択を実行
        const fromPageIndex = Math.min(lastSelectedTask.pageIndex, targetTask.pageIndex);
        const toPageIndex = Math.max(lastSelectedTask.pageIndex, targetTask.pageIndex);
        const week = lastSelectedTask.week;
        
        // 範囲内のタスクを選択
        clearSelection();
        selectedTasks = [];
        
        for (let i = fromPageIndex; i <= toPageIndex; i++) {
            const pageName = projectData.pages[i];
            const pageTasks = scheduleData.pageSchedules[pageName]?.tasks;
            
            if (pageTasks) {
                pageTasks.forEach(task => {
                    if (task.week === week && task.phase === lastSelectedTask.phase) {
                        const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
                        if (taskElement) {
                            taskElement.classList.add('selected');
                            selectedTasks.push(task);
                        }
                    }
                });
            }
        }
        
        // 現在のタスクを更新
        selectedTask = targetTask;
        selectedTaskId = targetTask.id;
        
        // フォーカスを移動
        if (targetElement) {
            targetElement.focus();
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// 隣接ページのタスクを選択（画面上の位置ベース）
function selectAdjacentPageTask(direction) {
    if (!selectedTask) return;
    
    const currentElement = document.querySelector(`[data-task-id="${selectedTask.id}"]`);
    if (!currentElement) return;
    
    // 現在のタスクの位置を取得
    const currentRect = currentElement.getBoundingClientRect();
    const currentCenterX = currentRect.left + currentRect.width / 2;
    
    // すべてのタスクを取得
    const allTasks = Array.from(document.querySelectorAll('.gantt-task'));
    
    // 現在のタスクのインデックスを見つける
    const currentIndex = allTasks.findIndex(el => el.dataset.taskId === selectedTask.id);
    
    // 上下方向のタスクを探す
    let targetElement = null;
    
    if (direction < 0) {
        // 上方向: 現在のタスクより上にあり、X座標が近いタスクを探す
        for (let i = currentIndex - 1; i >= 0; i--) {
            const task = allTasks[i];
            const rect = task.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            
            // X座標が近い（同じ列にある）タスクを選択
            if (Math.abs(centerX - currentCenterX) < 50) {
                targetElement = task;
                break;
            }
        }
    } else {
        // 下方向: 現在のタスクより下にあり、X座標が近いタスクを探す
        for (let i = currentIndex + 1; i < allTasks.length; i++) {
            const task = allTasks[i];
            const rect = task.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            
            // X座標が近い（同じ列にある）タスクを選択
            if (Math.abs(centerX - currentCenterX) < 50) {
                targetElement = task;
                break;
            }
        }
    }
    
    if (targetElement) {
        // 現在の選択を解除
        currentElement.classList.remove('selected');
        
        // 新しいタスクを選択
        const taskId = targetElement.dataset.taskId;
        const targetTask = scheduleData.tasks.find(t => t.id === taskId);
        
        if (targetTask) {
            selectedTask = targetTask;
            targetElement.classList.add('selected');
            targetElement.focus();
            
            // スクロールして表示
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// ショートカットヘルプを表示
function showShortcutHelp() {
    const isMac = navigator.platform.includes('Mac');
    const cmdKey = isMac ? 'Cmd' : 'Ctrl';
    
    const helpContent = `
        <div class="shortcut-section">
            <h3>🖱️ マウス操作</h3>
            <ul class="shortcut-list">
                <li class="shortcut-item">
                    <span class="shortcut-key">クリック</span>
                    <span class="shortcut-desc">タスクを単一選択</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">${cmdKey} + クリック</span>
                    <span class="shortcut-desc">タスクを追加選択/選択解除</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">Shift + クリック</span>
                    <span class="shortcut-desc">範囲選択（最後に選択したタスクから現在のタスクまで）</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">ドラッグ&ドロップ</span>
                    <span class="shortcut-desc">タスクを別の週に移動（関連タスクも一緒に移動）</span>
                </li>
            </ul>
        </div>
        
        <div class="shortcut-section">
            <h3>⌨️ キーボード操作</h3>
            <ul class="shortcut-list">
                <li class="shortcut-item">
                    <span class="shortcut-key">← →</span>
                    <span class="shortcut-desc">選択したタスクを左右に移動（選択タスクの右側全ても一緒に移動）</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">↑ ↓</span>
                    <span class="shortcut-desc">上下のタスクを選択（同じ列の直上・直下のタスク）</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">Shift + ↑↓</span>
                    <span class="shortcut-desc">上下方向に範囲選択を拡張</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">${cmdKey} + Z</span>
                    <span class="shortcut-desc">直前の操作を元に戻す（アンドゥ）</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">?</span>
                    <span class="shortcut-desc">このヘルプを表示</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">Esc</span>
                    <span class="shortcut-desc">ドロワー/モーダルを閉じる</span>
                </li>
            </ul>
        </div>
        
        <div class="shortcut-section">
            <h3>📋 タスク移動の仕組み</h3>
            <ul class="shortcut-list">
                <li class="shortcut-item">
                    <span class="shortcut-key">移動単位</span>
                    <span class="shortcut-desc">選択タスクとその右側のタスクが一緒に移動</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">重複回避</span>
                    <span class="shortcut-desc">移動先に既存タスクがある場合、自動的に押し出し</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">フェーズ連動</span>
                    <span class="shortcut-desc">同じページ・同じフェーズのタスクが連動</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">境界チェック</span>
                    <span class="shortcut-desc">プロジェクト期間外への移動は自動的に防止</span>
                </li>
            </ul>
        </div>
        
        <div class="shortcut-section">
            <h3>⚙️ 設定・管理機能</h3>
            <ul class="shortcut-list">
                <li class="shortcut-item">
                    <span class="shortcut-key">週次タスク上限</span>
                    <span class="shortcut-desc">1週間あたりの最大タスク数を設定（赤色で警告表示）</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">ページ一括登録</span>
                    <span class="shortcut-desc">テキストエリアに1行1ページで入力して一括登録</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">タスク一括登録</span>
                    <span class="shortcut-desc">テキストエリアに1行1タスクで入力して一括登録</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">CSVエクスポート</span>
                    <span class="shortcut-desc">現在のスケジュールをCSVファイルとして保存</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">CSVインポート</span>
                    <span class="shortcut-desc">CSVファイルからスケジュールを読み込み</span>
                </li>
            </ul>
        </div>
        
        <div class="shortcut-section">
            <h3>🎨 表示の見方</h3>
            <ul class="shortcut-list">
                <li class="shortcut-item">
                    <span class="shortcut-key">青色タスク</span>
                    <span class="shortcut-desc">PCデザイン関連（提出→修正依頼→修正版提出）</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">赤色タスク</span>
                    <span class="shortcut-desc">SPデザイン関連（提出→修正依頼→修正版提出）</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">緑色タスク</span>
                    <span class="shortcut-desc">コーディング関連（提出→修正依頼→修正版提出）</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">グレータスク</span>
                    <span class="shortcut-desc">クライアント確認（修正依頼）</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">赤枠</span>
                    <span class="shortcut-desc">選択中のタスク</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">赤い縦線</span>
                    <span class="shortcut-desc">今日の位置</span>
                </li>
            </ul>
        </div>
        
        <div class="shortcut-section">
            <h3>💡 便利な使い方</h3>
            <ul class="shortcut-list">
                <li class="shortcut-item">
                    <span class="shortcut-key">ドロワーメニュー</span>
                    <span class="shortcut-desc">左上の⚙️ボタンで設定画面を開く（開いたままでも操作可能）</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">複数ページ選択</span>
                    <span class="shortcut-desc">Shift+↓で複数ページのタスクを選択して一括移動</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">週次進捗確認</span>
                    <span class="shortcut-desc">タイムライン上部で各週のタスク数と進捗率を確認</span>
                </li>
                <li class="shortcut-item">
                    <span class="shortcut-key">統計情報</span>
                    <span class="shortcut-desc">ドロワー内で総タスク数、平均タスク数などを確認</span>
                </li>
            </ul>
        </div>
    `;
    
    showModal('📊 ガントチャート操作マニュアル', helpContent);
}

// モーダル表示
function showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('modalOverlay').style.display = 'flex';
}

// モーダル閉じる
function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

// オーバーレイクリックで閉じる
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) {
        closeModal();
    }
});

// Escキーで閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeDrawer();
    }
});

// ドロワー制御関数
function toggleDrawer() {
    const drawer = document.getElementById('drawer');
    const ganttContainer = document.querySelector('.gantt-container');
    
    if (drawer.classList.contains('active')) {
        closeDrawer();
    } else {
        drawer.classList.add('active');
        ganttContainer.classList.add('drawer-open');
    }
}

function closeDrawer() {
    const drawer = document.getElementById('drawer');
    const ganttContainer = document.querySelector('.gantt-container');
    
    drawer.classList.remove('active');
    ganttContainer.classList.remove('drawer-open');
}

// アコーディオン機能
function toggleAccordion(id) {
    const content = document.getElementById(id);
    const header = content.previousElementSibling;
    
    if (content.classList.contains('active')) {
        content.classList.remove('active');
        header.classList.remove('active');
    } else {
        content.classList.add('active');
        header.classList.add('active');
    }
}

// ページ追加機能（テキストエリア版）
function addNewPages() {
    const pageText = document.getElementById('pageTextArea').value.trim();
    
    if (!pageText) {
        showModal('入力エラー', '<p style="color: #dc3545;">ページリストが入力されていません。</p>');
        return;
    }
    
    const lines = pageText.split('\n').filter(line => line.trim());
    const newPages = [];
    const errors = [];
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
        
        // 形式チェック: ページ名(page_id) または ページ名
        const match = trimmedLine.match(/^(.+?)\(([^)]+)\)$/) || trimmedLine.match(/^(.+)$/);
        
        if (!match) {
            errors.push(`行${index + 1}: 形式が正しくありません`);
            return;
        }
        
        const pageName = match[1].trim();
        const pageId = match[2] ? match[2].trim() : pageName.toLowerCase().replace(/\s+/g, '_');
        
        // 重複チェック
        const exists = projectData.pages.some(page => page.includes(`(${pageId})`));
        if (exists) {
            errors.push(`行${index + 1}: ページID「${pageId}」は既に存在します`);
            return;
        }
        
        newPages.push(`${pageName}(${pageId})`);
    });
    
    if (errors.length > 0) {
        showModal('入力エラー', `<p style="color: #dc3545;">${errors.join('<br>')}</p>`);
        return;
    }
    
    if (newPages.length === 0) {
        showModal('入力エラー', '<p style="color: #dc3545;">追加可能なページがありません。</p>');
        return;
    }
    
    // ページを追加
    projectData.pages.push(...newPages);
    
    // ガントチャートを再生成
    generateSchedule();
    renderGanttChart();
    updateTaskPageOptions();
    
    // フォームをクリア
    clearPageForm();
    
    showModal('ページ追加完了', `<p style="color: #28a745;">${newPages.length}件のページを追加しました。</p>`);
}

// カスタムタスク追加機能（シンプル版）
function addCustomTasks() {
    const taskText = document.getElementById('taskTextArea').value.trim();
    
    if (!taskText) {
        showModal('入力エラー', '<p style="color: #dc3545;">タスクリストが入力されていません。</p>');
        return;
    }
    
    const lines = taskText.split('\n').filter(line => line.trim());
    const newTasks = [];
    
    lines.forEach((line, index) => {
        const taskName = line.trim();
        if (!taskName) return;
        
        // 最初のページに追加し、週1に配置、デフォルトはecbeingのpc-designタスクとする
        const firstPage = projectData.pages[0];
        
        const newTask = {
            id: `custom_${Date.now()}_${index}`,
            pageIndex: 0,
            pageName: firstPage,
            phase: taskName,
            phaseType: 'pc-design',
            text: taskName,
            week: 0, // 第1週
            type: 'custom',
            owner: 'ecbeing',
            isReview: false
        };
        
        newTasks.push(newTask);
    });
    
    if (newTasks.length === 0) {
        showModal('入力エラー', '<p style="color: #dc3545;">追加可能なタスクがありません。</p>');
        return;
    }
    
    // タスクを追加
    scheduleData.tasks.push(...newTasks);
    
    // ページスケジュールに追加
    newTasks.forEach(newTask => {
        if (!scheduleData.pageSchedules[newTask.pageName]) {
            scheduleData.pageSchedules[newTask.pageName] = { tasks: [] };
        }
        scheduleData.pageSchedules[newTask.pageName].tasks.push(newTask);
    });
    
    // 週次タスク数を再計算
    recalculateWeeklyTaskCounts();
    
    // ガントチャートを再描画
    const rowsContainer = document.getElementById('ganttRows');
    rowsContainer.innerHTML = '';
    renderPages();
    renderTasks();
    renderTimeline();
    drawTaskChart();
    updateStats();
    
    // フォームをクリア
    clearTaskForm();
    
    showModal('タスク追加完了', `<p style="color: #28a745;">${newTasks.length}件のタスクを追加しました。</p>`);
}

// フォームクリア機能
function clearPageForm() {
    populatePageTemplate();
}

function clearTaskForm() {
    populateTaskTemplate();
}

// テンプレート表示機能
function populatePageTemplate() {
    const pageList = projectData.pages.join('\n');
    document.getElementById('pageTextArea').value = pageList;
}

function populateTaskTemplate() {
    // 現在のタスクリストを表示
    const currentTasks = scheduleData.tasks
        .map(task => task.text)
        .filter((text, index, arr) => arr.indexOf(text) === index) // 重複除去
        .sort();
    
    if (currentTasks.length > 0) {
        document.getElementById('taskTextArea').value = currentTasks.join('\n');
    } else {
        // タスクがない場合はサンプルを表示
        const sampleTasks = [
            '特別レビュー',
            '追加修正',
            '最終確認',
            'クライアント打ち合わせ'
        ];
        document.getElementById('taskTextArea').value = sampleTasks.join('\n');
    }
}

// タスクページオプションを更新
function updateTaskPageOptions() {
    const select = document.getElementById('taskPage');
    if (!select) return; // 要素が存在しない場合は何もしない
    
    select.innerHTML = '<option value="">ページを選択...</option>';
    
    projectData.pages.forEach(page => {
        const match = page.match(/\(([^)]+)\)$/);
        if (match) {
            const pageId = match[1];
            const pageName = page.replace(/\([^)]+\)$/, '');
            const option = document.createElement('option');
            option.value = pageId;
            option.textContent = pageName;
            select.appendChild(option);
        }
    });
}

// アイテム一覧に追加
function addToItemsList(type, data) {
    const list = document.getElementById('addedItemsList');
    const item = document.createElement('div');
    item.className = 'task-item';
    
    if (type === 'page') {
        item.innerHTML = `
            <div class="task-info">
                <div class="task-name">📄 ${data.name}</div>
                <div class="task-details">ID: ${data.id} ${data.description ? '• ' + data.description : ''}</div>
            </div>
            <div class="task-actions">
                <button class="btn-small btn-delete" onclick="removeItem(this, 'page', '${data.id}')">削除</button>
            </div>
        `;
    } else if (type === 'task') {
        item.innerHTML = `
            <div class="task-info">
                <div class="task-name">⚡ ${data.name}</div>
                <div class="task-details">ページ: ${data.page} • 第${data.week}週 • ${data.type} • ${data.owner}</div>
            </div>
            <div class="task-actions">
                <button class="btn-small btn-delete" onclick="removeItem(this, 'task', '${data.name}')">削除</button>
            </div>
        `;
    }
    
    list.appendChild(item);
}

// アイテム削除
function removeItem(button, type, id) {
    const item = button.closest('.task-item');
    if (confirm(`この${type === 'page' ? 'ページ' : 'タスク'}を削除しますか？`)) {
        item.remove();
        
        if (type === 'page') {
            // ページを削除
            const pageIndex = projectData.pages.findIndex(page => page.includes(`(${id})`));
            if (pageIndex !== -1) {
                projectData.pages.splice(pageIndex, 1);
                generateSchedule();
                renderGanttChart();
                updateTaskPageOptions();
            }
        } else if (type === 'task') {
            // カスタムタスクを削除
            const taskIndex = scheduleData.tasks.findIndex(task => task.text === id && task.type === 'custom');
            if (taskIndex !== -1) {
                scheduleData.tasks.splice(taskIndex, 1);
                recalculateWeeklyTaskCounts();
                
                const rowsContainer = document.getElementById('ganttRows');
                rowsContainer.innerHTML = '';
                renderPages();
                renderTasks();
                renderTimeline();
                drawTaskChart();
                updateStats();
            }
        }
    }
}
