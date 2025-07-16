// グローバル変数
let tasks = [];
const PROJECT_START_DATE = new Date('2025-07-16'); // プロジェクト開始日
let workers = [
    {
        id: 1,
        name: '大成',
        type: 'director',
        skills: { director: 1.0, designer: 0.3, coder: 0.1, client: 0, wireframe: 1.0, testing: 1.0 },
        currentTask: null,
        completedTasks: [],
        totalTime: 0,
        inMeeting: false,
        fatigue: 0 // 疲労度 0-100
    },
    {
        id: 2,
        name: '眞鍋',
        type: 'designer',
        skills: { director: 0, designer: 1.0, coder: 0.1, client: 0, wireframe: 1.0, testing: 0 },
        currentTask: null,
        completedTasks: [],
        totalTime: 0,
        inMeeting: false,
        fatigue: 0
    },
    {
        id: 3,
        name: '中来田',
        type: 'designer',
        skills: { director: 0, designer: 1.0, coder: 0.1, client: 0, wireframe: 1.0, testing: 0 },
        currentTask: null,
        completedTasks: [],
        totalTime: 0,
        inMeeting: false,
        fatigue: 0
    },
    {
        id: 4,
        name: '鈴木一郎',
        type: 'coder',
        skills: { director: 0, designer: 0.2, coder: 1.0, client: 0, wireframe: 0.5, testing: 1.0 },
        currentTask: null,
        completedTasks: [],
        totalTime: 0,
        inMeeting: false,
        fatigue: 0
    },
    {
        id: 5,
        name: 'クライアント',
        type: 'client',
        skills: { director: 0, designer: 0, coder: 0, client: 1.0, wireframe: 0, testing: 0 },
        currentTask: null,
        completedTasks: [],
        totalTime: 0,
        inMeeting: false,
        fatigue: 0
    }
];

let simulationInterval = null;
let elapsedSeconds = 0;
let currentWeek = 0;
let currentDayOfWeek = 1; // 1=月曜日
let currentHourOfDay = 9; // 9時スタート
let simulationSpeed = 1; // シミュレーション速度（1-10倍）

// タスクテンプレート
const taskTemplates = [
    // ワイヤーフレームフェーズ
    { name: 'ワイヤーフレーム作成', type: 'wireframe', duration: 2, dependsOn: null },
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
    { name: '動作確認', type: 'testing', duration: 2, dependsOn: 'コーディング' },
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
                templateName: template.name,
                startDate: null,
                startTime: null,
                endDate: null,
                endTime: null,
                assignedWorker: null
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
                <span style="font-weight: 600;">${task.duration}時間</span>
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
        client: 'クライアント',
        wireframe: 'ワイヤー',
        testing: 'テスト'
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
        for (let i = 0; i < simulationSpeed; i++) {
            elapsedSeconds++;
            updateElapsedTime();
            simulateOneHour();
        }
    }, 1000); // 1秒間隔で実行
}

// シミュレーション速度変更
function changeSimulationSpeed(speed) {
    simulationSpeed = Math.max(1, Math.min(100, speed));
    document.getElementById('speedDisplay').textContent = `${simulationSpeed}x`;
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
        worker.fatigue = 0;
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
    // 昼休みチェック（12時）
    const isLunchTime = currentHourOfDay === 12;
    
    // 週末チェック（土日）
    const isWeekend = currentDayOfWeek > 5;
    
    // ミーティングチェック（毎週水曜日15-17時）
    const isMeetingTime = currentDayOfWeek === 3 && 
                         currentHourOfDay >= 15 && 
                         currentHourOfDay < 17;
    
    // 提出時間チェック（毎日11時と16時）
    const isSubmissionTime = currentHourOfDay === 11 || currentHourOfDay === 16;
    
    workers.forEach(worker => {
        // 朝の出社時チェック（9時）
        if (currentHourOfDay === 9 && !isWeekend) {
            // 前日の疲労から回復（一晩で40ポイント回復）
            if (currentDayOfWeek === 1) {
                // 月曜日は週末でしっかり休んだので完全回復
                worker.fatigue = 0;
            } else {
                // 平日は一晩で40ポイント回復
                worker.fatigue = Math.max(0, worker.fatigue - 40);
            }
            updateWorkerDisplay(worker);
        }
        
        // 週末は作業しない（表示のみ更新）
        if (isWeekend) {
            if (worker.fatigue > 0) {
                worker.fatigue = 0; // 週末で完全回復
                updateWorkerDisplay(worker);
            }
            return; // 週末は作業しない
        }
        
        // 昼休みで回復
        if (isLunchTime) {
            worker.fatigue = Math.max(0, worker.fatigue - 10); // 昼休みは10ポイント回復
            worker.isLunchBreak = true;
            updateWorkerDisplay(worker);
            return; // 昼休み中は作業しない
        } else {
            worker.isLunchBreak = false;
        }
        
        // 退勤時間（17時）チェック
        if (currentHourOfDay >= 17) {
            // 退勤後は作業しない
            return;
        }
        
        // 提出時間の処理（ディレクターのみ）
        if (isSubmissionTime && worker.type === 'director' && !worker.inMeeting) {
            // 提出可能なタスクをチェック
            const submittableTasks = tasks.filter(t => 
                t.status === 'pending' && 
                t.type === 'director' && 
                t.name.includes('提出') &&
                canStartTask(t)
            );
            
            if (submittableTasks.length > 0 && !worker.currentTask) {
                // 現在のタスクを中断して提出業務を優先
                if (worker.currentTask && worker.currentTask.type !== 'director') {
                    worker.currentTask.status = 'pending';
                    worker.currentTask = null;
                }
                
                // 提出タスクを開始
                const submissionTask = submittableTasks[0];
                worker.currentTask = submissionTask;
                submissionTask.status = 'in-progress';
                submissionTask.assignedWorker = worker.name;
                
                const currentDate = calculateCurrentDate(elapsedSeconds);
                submissionTask.startDate = formatDate(currentDate);
                submissionTask.startTime = `${currentHourOfDay}:00`;
                submissionTask.isBatchSubmission = true;
                
                renderTaskQueue();
                updateAllWorkerHeaders();
                updateWorkerDisplay(worker);
            }
        }
        
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
            // ミーティング中は少し回復（座っているだけなので）
            worker.fatigue = Math.max(0, worker.fatigue - 5);
            updateWorkerDisplay(worker);
            return; // ミーティング中は通常タスクを処理しない
        }
        
        // 現在のタスクがない場合、新しいタスクを取得
        if (!worker.currentTask) {
            const availableTask = getNextTaskForWorker(worker);
            if (availableTask) {
                worker.currentTask = availableTask;
                availableTask.status = 'in-progress';
                availableTask.assignedWorker = worker.name;
                
                // 開始日時を記録
                const currentDate = calculateCurrentDate(elapsedSeconds);
                availableTask.startDate = formatDate(currentDate);
                availableTask.startTime = `${currentHourOfDay}:00`;
                
                renderTaskQueue();
                updateAllWorkerHeaders(); // 優先タスク数を更新
            }
        }
        
        // タスクを進める（1時間分の作業）
        if (worker.currentTask || !worker.inMeeting) {
            let remainingHourCapacity = 1.0; // この1時間で使える作業容量
            worker.totalTime++;
            
            // 待機中の場合は疲労回復
            if (!worker.currentTask && !getNextTaskForWorker(worker)) {
                worker.fatigue = Math.max(0, worker.fatigue - 3); // 待機中は3ポイント回復
                updateWorkerDisplay(worker);
                return;
            }
            
            // タスクがある限り作業を続ける
            while (remainingHourCapacity > 0 && (worker.currentTask || getNextTaskForWorker(worker))) {
                // 新しいタスクを取得
                if (!worker.currentTask) {
                    const nextTask = getNextTaskForWorker(worker);
                    if (!nextTask) break;
                    
                    worker.currentTask = nextTask;
                    nextTask.status = 'in-progress';
                    nextTask.assignedWorker = worker.name;
                    
                    // 開始日時を記録
                    const startDate = calculateCurrentDate(elapsedSeconds);
                    nextTask.startDate = formatDate(startDate);
                    nextTask.startTime = `${currentHourOfDay}:00`;
                    
                    renderTaskQueue();
                updateAllWorkerHeaders(); // 優先タスク数を更新
                }
                
                // 現在のタスクを進める
                const taskType = worker.currentTask.type;
                const skillLevel = worker.skills[taskType] || 0.1;
                const progressThisIteration = Math.min(remainingHourCapacity * skillLevel, worker.currentTask.remainingTime);
                
                worker.currentTask.remainingTime -= progressThisIteration;
                remainingHourCapacity -= progressThisIteration / skillLevel;
                
                // タスク完了チェック
                if (worker.currentTask.remainingTime <= 0) {
                    // 完了日時を記録
                    const completedDate = calculateCurrentDate(elapsedSeconds);
                    worker.currentTask.endDate = formatDate(completedDate);
                    worker.currentTask.endTime = `${currentHourOfDay}:00`;
                    
                    // 疲労度を計算（苦手なタスクほど疲れる）
                    const taskSkillLevel = worker.skills[worker.currentTask.type] || 0.1;
                    // 基本疲労度: 1時間あたり8-10ポイント（8時間で64-80ポイント）
                    const baseFatigue = 9;
                    // スキルによる追加疲労: 苦手なほど疲れる
                    const skillFatigue = (1 - taskSkillLevel) * 5;
                    const fatigueIncrease = Math.round((baseFatigue + skillFatigue) * worker.currentTask.duration);
                    worker.fatigue = Math.min(100, worker.fatigue + fatigueIncrease);
                    
                    // 実際にかかった時間を計算（スキルレベルを考慮）
                    const actualTimeSpent = worker.currentTask.duration / taskSkillLevel;
                    
                    worker.currentTask.status = 'completed';
                    worker.completedTasks.push({
                        ...worker.currentTask,
                        completedAt: elapsedSeconds,
                        fatigueLevel: worker.fatigue, // タスク完了時の疲労度を記録
                        actualTime: actualTimeSpent // 実際にかかった時間を記録
                    });
                    worker.currentTask = null;
                    updateStats();
                    updateAllWorkerHeaders(); // 優先タスク数を更新
                }
            }
            
            updateWorkerDisplay(worker);
        }
    });
    
    // 全タスク完了チェック
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
    
    if (pendingTasks.length === 0 && inProgressTasks.length === 0 && simulationInterval) {
        pauseSimulation();
        setTimeout(() => {
            alert('すべてのタスクが完了しました！');
        }, 100);
    }
}

// ワーカーに適したタスクを取得
function getNextTaskForWorker(worker) {
    const availableTasks = tasks.filter(t => 
        t.status === 'pending' && 
        worker.skills[t.type] > 0 && // スキルレベルが0より大きい
        canStartTask(t) // 依存関係チェック
    );
    
    // 現在の時間が提出時間でない場合、提出タスクを除外
    const currentHour = currentHourOfDay;
    const isSubmissionHour = currentHour === 11 || currentHour === 16;
    
    let filteredTasks = availableTasks;
    if (!isSubmissionHour && worker.type === 'director') {
        // 提出時間外は提出タスクを後回しにする
        filteredTasks = availableTasks.filter(t => !t.name.includes('提出'));
    }
    
    // まず自分の専門分野（メインロール）のタスクを探す
    const myRoleTasks = filteredTasks.filter(t => {
        // ディレクターは director タスクと wireframe/testing の高スキルタスク
        if (worker.type === 'director' && (t.type === 'director' || (worker.skills[t.type] >= 1.0))) return true;
        // デザイナーは designer タスクと wireframe の高スキルタスク
        if (worker.type === 'designer' && (t.type === 'designer' || (t.type === 'wireframe' && worker.skills.wireframe >= 1.0))) return true;
        // コーダーは coder タスクと testing の高スキルタスク
        if (worker.type === 'coder' && (t.type === 'coder' || (t.type === 'testing' && worker.skills.testing >= 1.0))) return true;
        // クライアントは client タスクのみ
        if (worker.type === 'client' && t.type === 'client') return true;
        return false;
    });
    
    // 自分の専門分野のタスクがあればそれを優先
    if (myRoleTasks.length > 0) {
        // 同じページのタスクを優先
        if (worker.completedTasks.length > 0) {
            const lastPage = worker.completedTasks[worker.completedTasks.length - 1].page;
            const samePageTask = myRoleTasks.find(t => t.page === lastPage);
            if (samePageTask) return samePageTask;
        }
        return myRoleTasks[0];
    }
    
    // 専門分野のタスクがない場合のみ、スキルレベルでグループ分け
    const specialtyTasks = availableTasks.filter(t => worker.skills[t.type] >= 0.8); // 専門領域（80%以上）
    const competentTasks = availableTasks.filter(t => worker.skills[t.type] >= 0.5 && worker.skills[t.type] < 0.8); // ある程度できる（50%以上）
    const lowSkillTasks = availableTasks.filter(t => worker.skills[t.type] < 0.5); // 苦手な領域
    
    // 専門領域のタスクを優先
    if (specialtyTasks.length > 0) {
        // 同じページのタスクを優先
        if (worker.completedTasks.length > 0) {
            const lastPage = worker.completedTasks[worker.completedTasks.length - 1].page;
            const samePageTask = specialtyTasks.find(t => t.page === lastPage);
            if (samePageTask) return samePageTask;
        }
        return specialtyTasks[0];
    }
    
    // 専門領域がなければ、ある程度できるタスクを選択
    if (competentTasks.length > 0) {
        // 同じページのタスクを優先
        if (worker.completedTasks.length > 0) {
            const lastPage = worker.completedTasks[worker.completedTasks.length - 1].page;
            const samePageTask = competentTasks.find(t => t.page === lastPage);
            if (samePageTask) return samePageTask;
        }
        return competentTasks[0];
    }
    
    // それもなければ、仕方なく苦手なタスクを選択
    if (lowSkillTasks.length > 0) {
        // 同じページのタスクを優先
        if (worker.completedTasks.length > 0) {
            const lastPage = worker.completedTasks[worker.completedTasks.length - 1].page;
            const samePageTask = lowSkillTasks.find(t => t.page === lastPage);
            if (samePageTask) return samePageTask;
        }
        return lowSkillTasks[0];
    }
    
    return null;
}

// タスクが開始可能かチェック
function canStartTask(task) {
    if (!task.dependsOnTasks || task.dependsOnTasks.length === 0) {
        return true;
    }
    
    // すべての依存タスクが完了していることを確認
    return task.dependsOnTasks.every(depTask => depTask.status === 'completed');
}

// 疲労度から顔文字を取得
function getFatigueEmoji(fatigue) {
    if (fatigue === 0) return '😀'; // 元気満々
    if (fatigue < 20) return '😊'; // 笑顔
    if (fatigue < 40) return '🙂'; // 普通
    if (fatigue < 60) return '😐'; // 真顔
    if (fatigue < 80) return '😩'; // 疲れた
    return '😵'; // へとへと
}

// ワーカーの表示更新
function updateWorkerDisplay(worker) {
    const currentDiv = document.getElementById(`worker${worker.id}-current`);
    const completedDiv = document.getElementById(`worker${worker.id}-completed`);
    
    // 優先タスク数を計算
    const availableTasks = tasks.filter(t => 
        t.status === 'pending' && 
        worker.skills[t.type] > 0 && 
        canStartTask(t)
    );
    
    const priorityTaskCount = availableTasks.filter(t => {
        // 自分の専門分野のタスクをカウント
        if (worker.type === 'director' && (t.type === 'director' || (worker.skills[t.type] >= 1.0))) return true;
        if (worker.type === 'designer' && (t.type === 'designer' || (t.type === 'wireframe' && worker.skills.wireframe >= 1.0))) return true;
        if (worker.type === 'coder' && (t.type === 'coder' || (t.type === 'testing' && worker.skills.testing >= 1.0))) return true;
        if (worker.type === 'client' && t.type === 'client') return true;
        return false;
    }).length;
    
    // 昼休み中の表示
    if (worker.isLunchBreak) {
        currentDiv.className = 'current-task' + (worker.fatigue < 50 ? ' meeting' : '');
        currentDiv.innerHTML = `
            <div class="task-name">🍱 昼休み中（回復中）</div>
            <div class="task-info">
                <span style="color: #28a745;">疲労度回復: -10 ${getFatigueEmoji(worker.fatigue)}</span>
            </div>
        `;
    }
    // ミーティング中の表示
    else if (worker.inMeeting) {
        currentDiv.className = 'current-task meeting';
        currentDiv.innerHTML = `
            <div class="task-name">📅 週次ミーティング</div>
            <div class="task-info">
                <span style="color: #dc3545;">毎週水曜日 15:00-17:00</span>
                <span style="color: #28a745; margin-left: 10px;">疲労度回復: -5/h</span>
            </div>
        `;
    }
    // 現在のタスク表示
    else if (worker.currentTask) {
        const progressMade = worker.currentTask.duration - worker.currentTask.remainingTime;
        const progress = Math.max(0, Math.min(100, Math.round((progressMade / worker.currentTask.duration) * 100)));
        const remainingHours = Math.max(0, Math.ceil(worker.currentTask.remainingTime));
        const skillLevel = worker.skills[worker.currentTask.type] || 0.1;
        
        const estimatedHours = Math.ceil(remainingHours / skillLevel);
        
        currentDiv.className = 'current-task';
        const isBatchSubmission = worker.currentTask.isBatchSubmission;
        currentDiv.innerHTML = `
            <div class="task-name">
                ${worker.currentTask.name}
                ${isBatchSubmission ? '<span style="margin-left: 10px; font-size: 12px; color: #dc3545;">📤 定時提出</span>' : ''}
            </div>
            <div class="task-info" style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span style="font-size: 12px; color: #666;">標準: ${worker.currentTask.duration}h</span>
                <span style="font-size: 12px; color: #007bff;">残り: ${estimatedHours}h</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%">${Math.round(progress)}%</div>
            </div>
        `;
    } else {
        currentDiv.className = 'current-task empty';
        const isRecovering = worker.fatigue > 0;
        currentDiv.innerHTML = `
            <span>待機中${isRecovering ? '（休憩中）' : ''}...</span>
            ${isRecovering ? `<div style="margin-top: 5px; font-size: 12px; color: #17a2b8;">疲労度回復: -3/h ${getFatigueEmoji(worker.fatigue)}</div>` : ''}
            ${priorityTaskCount > 0 ? `<div style="margin-top: 5px; font-size: 12px; color: #28a745;">優先タスク: ${priorityTaskCount}件</div>` : ''}
        `;
    }
    
    // 完了タスク表示
    const completedCount = worker.completedTasks.length;
    const totalWorkHours = worker.completedTasks.reduce((sum, task) => sum + (task.actualTime || task.duration), 0);
    
    completedDiv.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 10px; color: #28a745; display: flex; justify-content: space-between; align-items: center;">
            <span>完了: ${completedCount}件 / 実働: ${Math.round(totalWorkHours)}時間</span>
            <span style="font-size: 24px;">${getFatigueEmoji(worker.fatigue)}</span>
        </div>
        ${worker.completedTasks
            .slice() // 全件表示
            .reverse()
            .map(task => {
                const actualTime = task.actualTime || task.duration;
                const timeDiff = actualTime - task.duration;
                const timeColor = timeDiff > 0 ? '#dc3545' : '#28a745';
                const typeClass = `task-type ${task.type}`;
                return `
                    <div class="completed-task" style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                        <div style="flex: 1;">
                            <div style="margin-bottom: 3px;">${task.name}</div>
                            <div style="font-size: 11px; display: flex; gap: 8px; align-items: center;">
                                <span class="${typeClass}" style="padding: 1px 6px; border-radius: 3px; font-size: 10px;">${getTaskTypeLabel(task.type)}</span>
                                <span>(標準${task.duration}h→<span style="color: ${timeColor};">実${Math.round(actualTime)}h</span>)</span>
                            </div>
                        </div>
                        <span style="font-size: 16px;" title="完了時疲労度: ${task.fatigueLevel || 0}">${getFatigueEmoji(task.fatigueLevel || 0)}</span>
                    </div>
                `;
            }).join('')}
    `;
}

// 作業員編集モーダルを開く
function openWorkerModal() {
    const modal = document.getElementById('workerModal');
    const workerForms = document.getElementById('workerForms');
    
    workerForms.innerHTML = workers.map((worker, index) => `
        <div class="worker-form">
            <h3>作業員 ${index + 1}</h3>
            <div class="form-group">
                <label>名前</label>
                <input type="text" id="worker-name-${worker.id}" value="${worker.name}">
            </div>
            <div class="form-group">
                <label>主な役割</label>
                <select id="worker-type-${worker.id}">
                    <option value="director" ${worker.type === 'director' ? 'selected' : ''}>ディレクター</option>
                    <option value="designer" ${worker.type === 'designer' ? 'selected' : ''}>デザイナー</option>
                    <option value="coder" ${worker.type === 'coder' ? 'selected' : ''}>コーダー</option>
                    <option value="client" ${worker.type === 'client' ? 'selected' : ''}>クライアント</option>
                </select>
            </div>
            <div class="form-group">
                <label>スキルレベル（0-1: 作業効率）</label>
                <p style="font-size: 12px; color: #666; margin: 5px 0;">1.0 = 通常速度、0.5 = 2倍時間、0.1 = 10倍時間</p>
                <div class="skill-group">
                    <div class="skill-item">
                        <label>ディレクター</label>
                        <input type="range" class="skill-slider" id="skill-director-${worker.id}" 
                               min="0" max="1" step="0.1" value="${worker.skills.director}"
                               oninput="updateSkillValue(${worker.id}, 'director', this.value)">
                        <div class="skill-value" id="skill-director-value-${worker.id}">${worker.skills.director}</div>
                    </div>
                    <div class="skill-item">
                        <label>デザイナー</label>
                        <input type="range" class="skill-slider" id="skill-designer-${worker.id}" 
                               min="0" max="1" step="0.1" value="${worker.skills.designer}"
                               oninput="updateSkillValue(${worker.id}, 'designer', this.value)">
                        <div class="skill-value" id="skill-designer-value-${worker.id}">${worker.skills.designer}</div>
                    </div>
                    <div class="skill-item">
                        <label>コーダー</label>
                        <input type="range" class="skill-slider" id="skill-coder-${worker.id}" 
                               min="0" max="1" step="0.1" value="${worker.skills.coder}"
                               oninput="updateSkillValue(${worker.id}, 'coder', this.value)">
                        <div class="skill-value" id="skill-coder-value-${worker.id}">${worker.skills.coder}</div>
                    </div>
                    <div class="skill-item">
                        <label>ワイヤーフレーム</label>
                        <input type="range" class="skill-slider" id="skill-wireframe-${worker.id}" 
                               min="0" max="1" step="0.1" value="${worker.skills.wireframe || 0}"
                               oninput="updateSkillValue(${worker.id}, 'wireframe', this.value)">
                        <div class="skill-value" id="skill-wireframe-value-${worker.id}">${worker.skills.wireframe || 0}</div>
                    </div>
                    <div class="skill-item">
                        <label>テスト</label>
                        <input type="range" class="skill-slider" id="skill-testing-${worker.id}" 
                               min="0" max="1" step="0.1" value="${worker.skills.testing || 0}"
                               oninput="updateSkillValue(${worker.id}, 'testing', this.value)">
                        <div class="skill-value" id="skill-testing-value-${worker.id}">${worker.skills.testing || 0}</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    modal.style.display = 'flex';
}

// 作業員編集モーダルを閉じる
function closeWorkerModal() {
    document.getElementById('workerModal').style.display = 'none';
}

// スキル値の表示更新
function updateSkillValue(workerId, skillType, value) {
    document.getElementById(`skill-${skillType}-value-${workerId}`).textContent = value;
}

// 作業員設定を保存
function saveWorkers() {
    workers.forEach(worker => {
        worker.name = document.getElementById(`worker-name-${worker.id}`).value;
        worker.type = document.getElementById(`worker-type-${worker.id}`).value;
        worker.skills.director = parseFloat(document.getElementById(`skill-director-${worker.id}`).value);
        worker.skills.designer = parseFloat(document.getElementById(`skill-designer-${worker.id}`).value);
        worker.skills.coder = parseFloat(document.getElementById(`skill-coder-${worker.id}`).value);
        worker.skills.wireframe = parseFloat(document.getElementById(`skill-wireframe-${worker.id}`).value);
        worker.skills.testing = parseFloat(document.getElementById(`skill-testing-${worker.id}`).value || 0);
    });
    
    // 表示を更新
    updateAllWorkerHeaders();
    closeWorkerModal();
}

// 全作業員のヘッダー表示を更新
function updateAllWorkerHeaders() {
    workers.forEach((worker, index) => {
        const workerColumn = document.getElementById(`worker${worker.id}-current`).closest('.worker-column');
        const headerElement = workerColumn.querySelector('.worker-name');
        if (headerElement) {
            headerElement.textContent = worker.name;
        }
        const statsElement = workerColumn.querySelector('.worker-stats');
        if (statsElement) {
            const mainSkill = getMainSkillLabel(worker);
            
            // 優先タスク数を計算
            const availableTasks = tasks.filter(t => 
                t.status === 'pending' && 
                worker.skills[t.type] > 0 && 
                canStartTask(t)
            );
            
            const priorityTaskCount = availableTasks.filter(t => {
                if (worker.type === 'director' && (t.type === 'director' || (worker.skills[t.type] >= 1.0))) return true;
                if (worker.type === 'designer' && (t.type === 'designer' || (t.type === 'wireframe' && worker.skills.wireframe >= 1.0))) return true;
                if (worker.type === 'coder' && (t.type === 'coder' || (t.type === 'testing' && worker.skills.testing >= 1.0))) return true;
                if (worker.type === 'client' && t.type === 'client') return true;
                return false;
            }).length;
            
            statsElement.innerHTML = `${mainSkill}<br><span style="font-size: 11px; color: #28a745;">優先タスク: ${priorityTaskCount}件</span>`;
        }
        updateWorkerDisplay(worker);
    });
}

// メインスキルのラベルを取得
function getMainSkillLabel(worker) {
    const roleLabels = {
        'director': 'ディレクター担当',
        'designer': 'デザイナー担当',
        'coder': 'コーダー担当',
        'client': 'クライアント担当'
    };
    return roleLabels[worker.type] || '担当';
}

// CSV出力機能
function exportToCSV() {
    const headers = ['ID', 'タスク名', 'ページ', 'タスクタイプ', '所要時間', '担当者', '開始日', '開始時刻', '完了日', '完了時刻', 'ステータス'];
    const rows = [headers];
    
    tasks.forEach(task => {
        const row = [
            task.id,
            task.name,
            task.page,
            getTaskTypeLabel(task.type),
            task.duration,
            task.assignedWorker || '',
            task.startDate || '',
            task.startTime || '',
            task.endDate || '',
            task.endTime || '',
            task.status
        ];
        rows.push(row);
    });
    
    // BOMを付けてExcelで文字化けしないようにする
    const BOM = '\uFEFF';
    const csvContent = BOM + rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // ダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const today = new Date();
    const filename = `task_report_${formatDate(today).replace(/\//g, '')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// おすすめカスタムタスク
const suggestedCustomTasks = [
    { name: '要件定義書作成', type: 'director', duration: 8 },
    { name: 'サーバー環境構築', type: 'coder', duration: 4 },
    { name: 'CMS設定・初期構築', type: 'coder', duration: 6 },
    { name: 'デザインガイドライン作成', type: 'designer', duration: 4 },
    { name: 'アイコン・素材作成', type: 'designer', duration: 6 },
    { name: 'SEO対策・設定', type: 'coder', duration: 3 },
    { name: '表示速度最適化', type: 'coder', duration: 4 },
    { name: 'アクセシビリティ対応', type: 'coder', duration: 5 },
    { name: 'ブラウザ互換性テスト', type: 'testing', duration: 4 },
    { name: 'セキュリティ診断', type: 'testing', duration: 3 },
    { name: 'コンテンツ移行計画', type: 'director', duration: 4 },
    { name: 'リダイレクト設定', type: 'coder', duration: 2 },
    { name: '404ページデザイン', type: 'designer', duration: 2 },
    { name: 'お問い合わせフォーム実装', type: 'coder', duration: 3 },
    { name: 'Google Analytics設定', type: 'coder', duration: 2 },
    { name: '最終レビュー・承認', type: 'client', duration: 4 }
];

// カスタムタスクモーダルを開く
function openCustomTaskModal() {
    const modal = document.getElementById('customTaskModal');
    
    // 依存タスクのドロップダウンを更新
    const dependencySelect = document.getElementById('customTaskDependency');
    const allTasks = tasks.filter(t => t.status !== 'completed');
    
    dependencySelect.innerHTML = '<option value="">なし</option>' + 
        allTasks.map(task => `<option value="${task.id}">${task.name}</option>`).join('');
    
    // おすすめタスクを表示
    const suggestedDiv = document.getElementById('suggestedTasks');
    suggestedDiv.innerHTML = suggestedCustomTasks.map(task => `
        <button class="btn-secondary" style="text-align: left; padding: 10px;" 
                onclick="fillCustomTaskForm('${task.name}', '${task.type}', ${task.duration})">
            <div style="font-weight: 600;">${task.name}</div>
            <div style="font-size: 12px; color: #666;">
                ${getTaskTypeLabel(task.type)} - ${task.duration}時間
            </div>
        </button>
    `).join('');
    
    modal.style.display = 'flex';
}

// カスタムタスクモーダルを閉じる
function closeCustomTaskModal() {
    document.getElementById('customTaskModal').style.display = 'none';
    // フォームをクリア
    document.getElementById('customTaskName').value = '';
    document.getElementById('customTaskType').value = 'director';
    document.getElementById('customTaskDuration').value = '2';
    document.getElementById('customTaskDependency').value = '';
}

// カスタムタスクフォームに値を設定
function fillCustomTaskForm(name, type, duration) {
    document.getElementById('customTaskName').value = name;
    document.getElementById('customTaskType').value = type;
    document.getElementById('customTaskDuration').value = duration;
}

// カスタムタスクを追加
function addCustomTask() {
    const name = document.getElementById('customTaskName').value.trim();
    const type = document.getElementById('customTaskType').value;
    const duration = parseInt(document.getElementById('customTaskDuration').value);
    const dependencyId = document.getElementById('customTaskDependency').value;
    
    if (!name) {
        alert('タスク名を入力してください');
        return;
    }
    
    const newTask = {
        id: Math.max(...tasks.map(t => t.id), 0) + 1,
        name: name,
        page: 'カスタムタスク',
        type: type,
        duration: duration,
        remainingTime: duration,
        status: 'pending',
        dependsOn: null,
        dependsOnTasks: [],
        templateName: name,
        startDate: null,
        startTime: null,
        endDate: null,
        endTime: null,
        assignedWorker: null,
        isCustom: true
    };
    
    // 依存関係を設定
    if (dependencyId) {
        const depTask = tasks.find(t => t.id === parseInt(dependencyId));
        if (depTask) {
            newTask.dependsOnTasks = [depTask];
        }
    }
    
    tasks.push(newTask);
    renderTaskQueue();
    updateStats();
    closeCustomTaskModal();
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    generateTasks();
});