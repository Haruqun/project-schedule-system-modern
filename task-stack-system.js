// グローバル変数
let tasks = [];
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
    }
];

let simulationInterval = null;
let elapsedSeconds = 0;
let currentWeek = 0;
let currentDayOfWeek = 1; // 1=月曜日
let currentHourOfDay = 9; // 9時スタート

// タスクテンプレート
const taskTemplates = [
    { name: 'ワイヤーフレーム作成', type: 'director', duration: 2 },
    { name: 'PCデザイン', type: 'designer', duration: 3 },
    { name: 'SPデザイン', type: 'designer', duration: 3 },
    { name: 'コーディング', type: 'coder', duration: 4 },
    { name: '動作確認', type: 'coder', duration: 2 }
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
        taskTemplates.forEach(template => {
            tasks.push({
                id: taskId++,
                name: `${page} - ${template.name}`,
                page: page,
                type: template.type,
                duration: template.duration,
                remainingTime: template.duration,
                status: 'pending'
            });
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
        coder: 'コーダー'
    };
    return labels[type] || type;
}

// 統計情報の更新
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const remaining = total - completed;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('remainingTasks').textContent = remaining;
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
    
    document.getElementById('elapsedTime').textContent = 
        `第${weeks + 1}週 ${getDayName(currentDayOfWeek)}曜日 ${currentHourOfDay}時`;
}

// 曜日名取得
function getDayName(day) {
    const dayNames = ['', '月', '火', '水', '木', '金'];
    return dayNames[day] || '';
}

// 1時間のシミュレーション
function simulateOneHour() {
    // ミーティングチェック（毎週月曜日9-11時）
    const isMeetingTime = currentDayOfWeek === 1 && 
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
    const pendingTasks = tasks.filter(t => 
        t.status === 'pending' && 
        t.type === worker.type
    );
    
    // 同じページのタスクを優先
    if (worker.completedTasks.length > 0) {
        const lastPage = worker.completedTasks[worker.completedTasks.length - 1].page;
        const samePageTask = pendingTasks.find(t => t.page === lastPage);
        if (samePageTask) return samePageTask;
    }
    
    return pendingTasks[0] || null;
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
                <span style="color: #dc3545;">毎週月曜日 9:00-11:00</span>
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