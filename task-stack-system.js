// グローバル変数
let tasks = [];
const PROJECT_START_DATE = new Date('2025-07-16'); // プロジェクト開始日
let workers = [
    {
        id: 1,
        name: '山田太郎',
        type: 'director',
        currentTask: null,
        completedTasks: [],
        totalTime: 0,
        inMeeting: false
    },
    {
        id: 2,
        name: '佐藤花子',
        type: 'designer',
        currentTask: null,
        completedTasks: [],
        totalTime: 0,
        inMeeting: false
    },
    {
        id: 3,
        name: '鈴木一郎',
        type: 'coder',
        currentTask: null,
        completedTasks: [],
        totalTime: 0,
        inMeeting: false
    },
    {
        id: 4,
        name: 'クライアント',
        type: 'client',
        currentTask: null,
        completedTasks: [],
        totalTime: 0,
        inMeeting: false
    }
];

let simulationInterval = null;
let elapsedSeconds = 0;
let currentWeek = 0;
let currentDayOfWeek = 1; // 1=月曜日
let currentHourOfDay = 9; // 9時スタート

// タスクテンプレート
const taskTemplates = [
    // ワイヤーフレームフェーズ
    { name: 'ワイヤーフレーム作成', type: 'director', duration: 2, dependsOn: null },
    { name: 'ワイヤーフレーム提出', type: 'director', duration: 1, dependsOn: 'ワイヤーフレーム作成' },
    { name: 'クライアント確認（ワイヤー）', type: 'client', duration: 2, dependsOn: 'ワイヤーフレーム提出' },
    
    // デザインフェーズ
    { name: 'PCデザイン', type: 'designer', duration: 3, dependsOn: 'クライアント確認（ワイヤー）' },
    { name: 'SPデザイン', type: 'designer', duration: 3, dependsOn: 'クライアント確認（ワイヤー）' },
    { name: 'デザイン提出', type: 'director', duration: 1, dependsOn: ['PCデザイン', 'SPデザイン'] },
    { name: 'デザイン初回確認', type: 'client', duration: 2, dependsOn: 'デザイン提出' },
    { name: 'デザイン修正依頼作成', type: 'client', duration: 1, dependsOn: 'デザイン初回確認' },
    { name: 'デザイン修正対応', type: 'designer', duration: 2, dependsOn: 'デザイン修正依頼作成' },
    { name: 'デザイン修正版提出', type: 'director', duration: 1, dependsOn: 'デザイン修正対応' },
    { name: 'デザイン再確認・承認', type: 'client', duration: 1, dependsOn: 'デザイン修正版提出' },
    
    // コーディングフェーズ
    { name: 'コーディング', type: 'coder', duration: 4, dependsOn: 'デザイン再確認・承認' },
    { name: '動作確認', type: 'coder', duration: 2, dependsOn: 'コーディング' },
    { name: 'テストサイト提出', type: 'director', duration: 1, dependsOn: '動作確認' },
    { name: 'コーディング初回確認', type: 'client', duration: 2, dependsOn: 'テストサイト提出' },
    { name: 'バグ・修正依頼作成', type: 'client', duration: 1, dependsOn: 'コーディング初回確認' },
    { name: 'バグ修正対応', type: 'coder', duration: 2, dependsOn: 'バグ・修正依頼作成' },
    { name: '修正版提出', type: 'director', duration: 1, dependsOn: 'バグ修正対応' },
    { name: '最終確認・リリース承認', type: 'client', duration: 1, dependsOn: '修正版提出' }
];

// ページリスト
const pages = [
    'ジャンルページ（一覧・詳細）',
    'カテゴリページ（一覧・詳細）',
    '選び方ページ - 縦走用アックスの選び方',
    '選び方ページ - 登山用軽量ハーネスの活用',
    '選び方ページ - アルトテント/テロステント',
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
];

// タスク生成
function generateTasks() {
    tasks = [];
    let taskId = 1;
    
    pages.forEach(page => {
        const pageTasks = [];
        
        taskTemplates.forEach(template => {
            const task = {
                id: taskId++,
                name: `${page} - ${template.name}`,
                page: page,
                type: template.type,
                duration: template.duration,
                remainingTime: template.duration,
                status: 'pending',
                dependsOn: template.dependsOn,
                templateName: template.name
            };
            tasks.push(task);
            pageTasks.push(task);
        });
        
        // 同じページ内のタスクの依存関係を設定
        pageTasks.forEach(task => {
            if (task.dependsOn) {
                if (Array.isArray(task.dependsOn)) {
                    task.dependsOnTasks = task.dependsOn.map(depName => 
                        pageTasks.find(t => t.templateName === depName)
                    ).filter(t => t);
                } else {
                    const depTask = pageTasks.find(t => t.templateName === task.dependsOn);
                    task.dependsOnTasks = depTask ? [depTask] : [];
                }
            } else {
                task.dependsOnTasks = [];
            }
        });
    });
    
    renderTaskQueue();
    updateStats();
}

// タスクキューの表示
function renderTaskQueue() {
    const taskList = document.getElementById('taskList');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    taskList.innerHTML = pendingTasks.map(task => `
        <div class="task-item" draggable="true" data-task-id="${task.id}">
            <div class="task-name">${task.name}</div>
            <div class="task-info">
                <span class="task-type ${task.type}">${getTaskTypeLabel(task.type)}</span>
                <span>${task.duration}時間</span>
            </div>
        </div>
    `).join('');
    
    document.getElementById('queueCount').textContent = pendingTasks.length;
}

// タスクタイプのラベル取得
function getTaskTypeLabel(type) {
    const labels = {
        director: 'ディレクター',
        designer: 'デザイナー',
        coder: 'コーダー',
        client: 'クライアント'
    };
    return labels[type] || type;
}

// 統計情報の更新
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const remaining = total - completed;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('remainingTasks').textContent = remaining;
    
    // プログレスバーの更新
    const progressBar = document.getElementById('overallProgress');
    progressBar.style.width = `${progressPercent}%`;
    progressBar.querySelector('.progress-text').textContent = `${progressPercent}%`;
}

// シミュレーション開始
function startSimulation() {
    if (simulationInterval) return;
    
    simulationInterval = setInterval(() => {
        elapsedSeconds++;
        updateElapsedTime();
        simulateOneHour();
    }, 1000); // 1秒 = 1時間
}

// シミュレーション一時停止
function pauseSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
}

// シミュレーションリセット
function resetSimulation() {
    pauseSimulation();
    elapsedSeconds = 0;
    updateElapsedTime();
    
    // タスクリセット
    tasks.forEach(task => {
        task.status = 'pending';
        task.remainingTime = task.duration;
    });
    
    // ワーカーリセット
    workers.forEach(worker => {
        worker.currentTask = null;
        worker.completedTasks = [];
        worker.totalTime = 0;
        updateWorkerDisplay(worker);
    });
    
    renderTaskQueue();
    updateStats();
}

// 経過時間の更新
function updateElapsedTime() {
    const totalHours = elapsedSeconds;
    const weeks = Math.floor(totalHours / 40);
    const hoursInWeek = totalHours % 40;
    const days = Math.floor(hoursInWeek / 8);
    const hoursInDay = hoursInWeek % 8;
    
    // 現在の週、曜日、時間を更新
    currentWeek = weeks;
    currentDayOfWeek = days + 1; // 1=月曜日
    currentHourOfDay = hoursInDay + 9; // 9時始業
    
    // 実際の日付を計算
    const currentDate = calculateCurrentDate(totalHours);
    
    document.getElementById('elapsedTime').textContent = 
        `第${weeks + 1}週 ${getDayName(currentDayOfWeek)}曜日 ${currentHourOfDay}時 (${formatDate(currentDate)})`;
}

// 現在の日付を計算
function calculateCurrentDate(totalHours) {
    const totalDays = Math.floor(totalHours / 8);
    const totalWeeks = Math.floor(totalDays / 5);
    const daysInWeek = totalDays % 5;
    
    const currentDate = new Date(PROJECT_START_DATE);
    currentDate.setDate(PROJECT_START_DATE.getDate() + (totalWeeks * 7) + daysInWeek);
    
    // 週末をスキップ
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return currentDate;
}

// 日付フォーマット
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

// 曜日名取得
function getDayName(day) {
    const dayNames = ['', '月', '火', '水', '木', '金'];
    return dayNames[day] || '';
}

// 1時間のシミュレーション
function simulateOneHour() {
    // ミーティングチェック（毎週水曜日9-11時）
    const isMeetingTime = currentDayOfWeek === 3 && 
                         currentHourOfDay >= 9 && 
                         currentHourOfDay < 11;
    
    workers.forEach(worker => {
        // ミーティング開始
        if (isMeetingTime && !worker.inMeeting) {
            worker.inMeeting = true;
            // 現在のタスクを一時中断
            if (worker.currentTask) {
                worker.currentTask.status = 'pending';
                worker.currentTask = null;
            }
        }
        
        // ミーティング終了
        if (!isMeetingTime && worker.inMeeting) {
            worker.inMeeting = false;
        }
        
        // ミーティング中の処理
        if (worker.inMeeting) {
            worker.totalTime++;
            updateWorkerDisplay(worker);
            return; // ミーティング中は通常タスクを処理しない
        }
        
        // 現在のタスクがない場合、新しいタスクを取得
        if (!worker.currentTask) {
            const availableTask = getNextTaskForWorker(worker);
            if (availableTask) {
                worker.currentTask = availableTask;
                availableTask.status = 'in-progress';
                renderTaskQueue();
            }
        }
        
        // タスクを進める
        if (worker.currentTask) {
            worker.currentTask.remainingTime--;
            worker.totalTime++;
            
            // タスク完了チェック
            if (worker.currentTask.remainingTime <= 0) {
                worker.currentTask.status = 'completed';
                worker.completedTasks.push({
                    ...worker.currentTask,
                    completedAt: elapsedSeconds
                });
                worker.currentTask = null;
                updateStats();
            }
            
            updateWorkerDisplay(worker);
        }
    });
    
    // 全タスク完了チェック
    if (tasks.every(t => t.status === 'completed')) {
        pauseSimulation();
        alert('すべてのタスクが完了しました！');
    }
}

// ワーカーに適したタスクを取得
function getNextTaskForWorker(worker) {
    const availableTasks = tasks.filter(t => 
        t.status === 'pending' && 
        t.type === worker.type &&
        canStartTask(t) // 依存関係チェック
    );
    
    // 同じページのタスクを優先
    if (worker.completedTasks.length > 0) {
        const lastPage = worker.completedTasks[worker.completedTasks.length - 1].page;
        const samePageTask = availableTasks.find(t => t.page === lastPage);
        if (samePageTask) return samePageTask;
    }
    
    return availableTasks[0] || null;
}

// タスクが開始可能かチェック
function canStartTask(task) {
    if (!task.dependsOnTasks || task.dependsOnTasks.length === 0) {
        return true;
    }
    
    // すべての依存タスクが完了していることを確認
    return task.dependsOnTasks.every(depTask => depTask.status === 'completed');
}

// ワーカーの表示更新
function updateWorkerDisplay(worker) {
    const currentDiv = document.getElementById(`worker${worker.id}-current`);
    const completedDiv = document.getElementById(`worker${worker.id}-completed`);
    
    // ミーティング中の表示
    if (worker.inMeeting) {
        currentDiv.className = 'current-task meeting';
        currentDiv.innerHTML = `
            <div class="task-name">📅 週次ミーティング</div>
            <div class="task-info">
                <span style="color: #dc3545;">毎週水曜日 9:00-11:00</span>
            </div>
        `;
    }
    // 現在のタスク表示
    else if (worker.currentTask) {
        const progress = ((worker.currentTask.duration - worker.currentTask.remainingTime) / worker.currentTask.duration) * 100;
        currentDiv.className = 'current-task';
        currentDiv.innerHTML = `
            <div class="task-name">${worker.currentTask.name}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%">${Math.round(progress)}%</div>
            </div>
        `;
    } else {
        currentDiv.className = 'current-task empty';
        currentDiv.innerHTML = '<span>待機中...</span>';
    }
    
    // 完了タスク表示
    completedDiv.innerHTML = worker.completedTasks
        .slice(-10) // 最新10件のみ表示
        .reverse()
        .map(task => `
            <div class="completed-task">
                ${task.name} (${task.duration}h)
            </div>
        `).join('');
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    generateTasks();
});