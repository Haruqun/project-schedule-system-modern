// グローバル変数
let projectData = {
    startDate: '2025-07-16',
    weeks: 12,
    pages: [],
    taskTemplate: [],
    workers: [],
    customTasks: [],
    meetings: [],
    taskQueue: []
};

// 時間管理の設定
const TIME_CONFIG = {
    WORK_DAYS_PER_WEEK: 5,      // 週5日（営業日）
    WORK_HOURS_PER_DAY: 8,      // 1日8時間
    QUARTER_HOURS: 2,           // 1/4日 = 2時間
    QUARTERS_PER_DAY: 4,        // 1日4分割
    TOTAL_QUARTERS_PER_WEEK: 20 // 5日 × 4分割 = 20区間
};

// 時間変換ヘルパー関数
function hoursToQuarters(hours) {
    return Math.ceil(hours / TIME_CONFIG.QUARTER_HOURS);
}

function quartersToHours(quarters) {
    return quarters * TIME_CONFIG.QUARTER_HOURS;
}

function weeksToQuarters(weeks) {
    return weeks * TIME_CONFIG.TOTAL_QUARTERS_PER_WEEK;
}

function quartersToWeeks(quarters) {
    return quarters / TIME_CONFIG.TOTAL_QUARTERS_PER_WEEK;
}

function quarterToTimeString(quarterIndex) {
    const week = Math.floor(quarterIndex / TIME_CONFIG.TOTAL_QUARTERS_PER_WEEK);
    const quarterInWeek = quarterIndex % TIME_CONFIG.TOTAL_QUARTERS_PER_WEEK;
    const day = Math.floor(quarterInWeek / TIME_CONFIG.QUARTERS_PER_DAY);
    const quarter = quarterInWeek % TIME_CONFIG.QUARTERS_PER_DAY;
    
    const dayNames = ['月', '火', '水', '木', '金'];
    const quarterTimes = ['09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00'];
    
    return `第${week + 1}週 ${dayNames[day]}曜日 ${quarterTimes[quarter]}`;
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    // 日付の初期値設定
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = projectData.startDate;
    
    // 初期レンダリング
    renderGanttChart();
    updateWeekSelects();
    
    // ローカルストレージからデータ復元
    loadFromLocalStorage();
    
    // サンプル作業員を常に追加（色付けのため）
    addSampleWorkers();
    
    // デフォルトの定例ミーティングを追加
    addDefaultMeetings();
    
    // タスクを作業員に割り当て
    assignTasksToWorkers();
    
    // データがない場合はサンプルデータを設定 (コメントアウト - 空のチャートを表示)
    // if (projectData.pages.length === 0) {
    //     loadSampleData();
    // }
});

// サンプル作業員を追加
function addSampleWorkers() {
    // 作業員をリセットして3人に固定
    projectData.workers = [];
    
    // サンプル作業員（ディレクター、デザイナー、コーダー）
    const sampleWorkers = [
        { 
            name: '山田太郎（ディレクター）', 
            skills: { director: 1.0, designer: 0.5, coder: 0.3 }, 
            capacity: 40,
            color: '#3498db' // 青
        },
        { 
            name: '佐藤花子（デザイナー）', 
            skills: { director: 0.5, designer: 1.0, coder: 0.4 }, 
            capacity: 40,
            color: '#e74c3c' // 赤
        },
        { 
            name: '鈴木一郎（コーダー）', 
            skills: { director: 0.4, designer: 0.5, coder: 1.0 }, 
            capacity: 40,
            color: '#2ecc71' // 緑
        }
    ];
    
    sampleWorkers.forEach(w => {
        projectData.workers.push({
            id: `worker-${Date.now()}-${Math.random()}`,
            name: w.name,
            skills: w.skills,
            capacity: w.capacity,
            color: w.color,
            currentLoad: 0,
            assignedTasks: [],
            taskQueue: [],
            currentTask: null,
            totalWorkedHours: 0
        });
    });
    
    // UIを更新
    updateWorkerList();
}

// デフォルトの定例ミーティングを追加
function addDefaultMeetings() {
    // 既にミーティングがある場合は追加しない
    if (projectData.meetings.length > 0) {
        return;
    }
    
    // 週次定例ミーティング（2025/07/16から毎週）
    const defaultMeeting = {
        id: 'meeting-weekly-001',
        name: '週次進捗会議',
        startDate: '2025-07-16',
        repeatType: 'weekly',
        duration: 1, // 1時間
        type: 'meeting',
        participants: ['全員'],
        simulationStatus: 'waiting',
        progress: 0
    };
    
    projectData.meetings.push(defaultMeeting);
}

// タブ切り替え
function switchTab(tabName) {
    // すべてのタブとコンテンツを非アクティブに
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 選択されたタブとコンテンツをアクティブに
    const tabButton = Array.from(document.querySelectorAll('.tab')).find(tab => 
        tab.textContent.includes(getTabLabel(tabName))
    );
    if (tabButton) tabButton.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function getTabLabel(tabName) {
    const labels = {
        'settings': 'プロジェクト設定',
        'workers': '作業員',
        'custom': 'カスタムタスク',
        'meeting': '定例ミーティング'
    };
    return labels[tabName] || '';
}

// サイドバーの開閉
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

// プロジェクト設定の適用
function applySettings() {
    // ページ一覧の解析
    const pageListText = document.getElementById('pageList').value;
    projectData.pages = pageListText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map((name, index) => {
            // ページ名からコードを抽出
            const match = name.match(/^(.+?)\((.+?)\)$/);
            const pageName = match ? match[1].trim() : name;
            const pageCode = match ? match[2].trim() : `page_${index}`;
            
            return {
                id: `P${String(index + 1).padStart(3, '0')}`, // P001, P002, P003...
                name: pageName,
                code: pageCode,
                tasks: []
            };
        });
    
    // タスクテンプレートの解析
    const taskTemplateText = document.getElementById('taskTemplate').value;
    projectData.taskTemplate = taskTemplateText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            const parts = line.split(',');
            return {
                name: parts[0] || '',
                duration: parseInt(parts[1]) || 1,
                type: parts[2] || 'pc-design'
            };
        });
    
    // 各ページにタスクを生成
    generateTasksForPages();
    
    // タスクを作業員に割り当て
    assignTasksToWorkers();
    
    // ガントチャートを更新
    renderGanttChart();
    updatePageSelects();
    saveToLocalStorage();
    
    alert('プロジェクト設定を適用しました');
}

// 各ページにタスクを生成
function generateTasksForPages() {
    projectData.pages.forEach((page, pageIndex) => {
        page.tasks = [];
        let currentWeek = 0; // 全て週0から開始（並列処理想定）
        
        projectData.taskTemplate.forEach((template, taskIndex) => {
            const task = {
                id: `${page.id}-T${String(taskIndex + 1).padStart(2, '0')}`, // P001-T01, P001-T02...
                name: template.name,
                startWeek: currentWeek,
                duration: template.duration,
                type: template.type,
                owner: template.type === 'client-task' ? 'client' : 'ecbeing',
                pageId: page.id,
                status: 'pending',
                assignedTo: null,
                isClientTask: template.type === 'client-task',
                simulationStatus: 'waiting', // シミュレーション用ステータス
                progress: 0 // 進捗率
            };
            page.tasks.push(task);
            currentWeek += template.duration;
        });
    });
    
    // タスクキューを更新
    updateTaskQueue();
}

// タスクキューの更新
function updateTaskQueue() {
    projectData.taskQueue = [];
    
    // すべてのタスクを収集
    projectData.pages.forEach(page => {
        page.tasks.forEach(task => {
            if (task.status === 'pending' && !task.assignedTo) {
                projectData.taskQueue.push({
                    ...task,
                    pageName: page.name
                });
            }
        });
    });
    
    // カスタムタスクも追加
    projectData.customTasks.forEach(task => {
        if (task.status === 'pending' && !task.assignedTo) {
            projectData.taskQueue.push({
                ...task,
                pageName: task.pageId ? projectData.pages.find(p => p.id === task.pageId)?.name : '独立タスク'
            });
        }
    });
    
    // 開始週でソート
    projectData.taskQueue.sort((a, b) => a.startWeek - b.startWeek);
}

// 作業員の追加
function addWorker() {
    // 作業員数の上限チェック（最大3人）
    if (projectData.workers.length >= 3) {
        alert('作業員の上限は3人までです');
        return;
    }
    
    const name = document.getElementById('workerName').value.trim();
    const skillDirector = parseFloat(document.getElementById('skillDirector').value);
    const skillDesigner = parseFloat(document.getElementById('skillDesigner').value);
    const skillCoder = parseFloat(document.getElementById('skillCoder').value);
    const capacity = parseInt(document.getElementById('workerCapacity').value);
    
    if (!name) {
        alert('作業員名を入力してください');
        return;
    }
    
    if (skillDirector === 0 && skillDesigner === 0 && skillCoder === 0) {
        alert('少なくとも1つのスキルを0より大きく設定してください');
        return;
    }
    
    const worker = {
        id: `worker-${Date.now()}`,
        name: name,
        skills: {
            director: skillDirector,
            designer: skillDesigner,
            coder: skillCoder
        },
        capacity: capacity,
        currentLoad: 0,
        assignedTasks: [],
        color: getNextWorkerColor()
    };
    
    projectData.workers.push(worker);
    
    // フォームをクリア
    document.getElementById('workerName').value = '';
    document.getElementById('skillDirector').value = '0.5';
    document.getElementById('skillDesigner').value = '0.5';
    document.getElementById('skillCoder').value = '0.5';
    document.getElementById('workerCapacity').value = '40';
    
    // リストを更新
    updateWorkerList();
    assignTasksToWorkers();
    renderGanttChart();
    saveToLocalStorage();
}

// 作業員リストの更新
function updateWorkerList() {
    const workerList = document.getElementById('workerList');
    workerList.innerHTML = '';
    
    projectData.workers.forEach(worker => {
        const loadPercentage = (worker.currentLoad / worker.capacity) * 100;
        const loadClass = loadPercentage >= 100 ? 'danger' : loadPercentage >= 80 ? 'warning' : '';
        
        // 現在のタスクを取得
        let currentTaskInfo = '';
        let progressBar = '';
        let statusText = '待機中';
        let statusColor = '#95a5a6';
        
        if (worker.currentTask) {
            const task = findTaskById(worker.currentTask);
            if (task) {
                statusText = '作業中';
                statusColor = worker.color || '#e74c3c';
                const progress = task.progress || 0;
                currentTaskInfo = `
                    <div style="font-size: 12px; color: #333; margin-top: 4px; font-weight: 600; background: ${worker.color}20; padding: 4px 8px; border-radius: 4px; border-left: 4px solid ${worker.color};">
                        🔧 現在: ${task.name}
                    </div>
                    <div style="font-size: 10px; color: #666; margin-top: 2px; margin-left: 8px;">
                        📄 ${task.pageName} | 進捗: ${progress.toFixed(1)}% | 残り: ${((100 - progress) / 100 * task.duration).toFixed(1)}h
                    </div>
                `;
                progressBar = `
                    <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; margin-top: 4px; overflow: hidden;">
                        <div style="height: 100%; background: ${worker.color || '#2ecc71'}; width: ${progress}%; transition: width 0.3s; animation: ${progress > 0 ? 'pulse 2s infinite' : 'none'};"></div>
                    </div>
                `;
            }
        }
        
        // 次のタスクを予測
        let nextTaskInfo = '';
        const nextTask = findNextTaskForWorker(worker);
        if (nextTask) {
            nextTaskInfo = `
                <div style="font-size: 11px; color: #666; margin-top: 4px; background: #f8f9fa; padding: 3px 6px; border-radius: 3px;">
                    ⏭️ 次: ${nextTask.name} (${nextTask.pageName})
                </div>
            `;
        }
        
        const workerElement = document.createElement('div');
        workerElement.className = 'worker-item';
        workerElement.style.border = `3px solid ${worker.color || '#ccc'}`;
        workerElement.style.borderRadius = '8px';
        workerElement.innerHTML = `
            <div class="worker-info">
                <div class="worker-name" style="color: ${worker.color || '#333'}; font-weight: 600; font-size: 14px;">
                    <span class="worker-color-indicator" style="background: ${worker.color || '#ccc'}; width: 16px; height: 16px; border-radius: 50%; display: inline-block; margin-right: 8px;"></span>
                    ${worker.name}
                </div>
                <div class="worker-details" style="font-size: 10px; color: #666; margin-top: 2px;">
                    Dir: ${worker.skills.director.toFixed(1)} | Des: ${worker.skills.designer.toFixed(1)} | Cod: ${worker.skills.coder.toFixed(1)}
                </div>
                <div style="margin-top: 6px; padding: 4px 8px; background: ${statusColor}20; border-radius: 4px; font-size: 11px; font-weight: 600; color: ${statusColor};">
                    ${statusText}
                </div>
                ${currentTaskInfo}
                ${nextTaskInfo}
                ${progressBar}
            </div>
            <div class="worker-load" style="text-align: right; font-size: 10px;">
                <div>負荷: ${worker.currentLoad.toFixed(1)}/${worker.capacity}h</div>
                <div class="load-bar">
                    <div class="load-fill ${loadClass}" style="width: ${Math.min(loadPercentage, 100)}%"></div>
                </div>
            </div>
            <button onclick="removeWorker('${worker.id}')" style="margin-left: 10px; padding: 4px 8px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;">削除</button>
        `;
        workerList.appendChild(workerElement);
    });
    
    // タスクキューの表示も更新
    updateTaskQueueDisplay();
}

// タスクキューの表示
function updateTaskQueueDisplay() {
    const customTaskList = document.getElementById('customTaskList');
    const queueSection = customTaskList.parentElement;
    
    // 既存のキュー表示を削除
    const existingQueue = queueSection.querySelector('.task-queue-section');
    if (existingQueue) {
        existingQueue.remove();
    }
    
    if (projectData.taskQueue.length > 0) {
        const queueElement = document.createElement('div');
        queueElement.className = 'task-queue-section';
        queueElement.innerHTML = `
            <div class="queue-header">
                <span>⏳ 未割当タスク</span>
                <span class="queue-count">${projectData.taskQueue.length}</span>
            </div>
            <div class="task-list">
                ${projectData.taskQueue.slice(0, 5).map(task => `
                    <div class="task-item">
                        <div class="task-info-text">
                            <strong>${task.name}</strong> (${task.pageName})
                            <br>
                            <small>第${task.startWeek + 1}週〜 / ${task.duration}週間</small>
                        </div>
                    </div>
                `).join('')}
                ${projectData.taskQueue.length > 5 ? `<div style="text-align: center; color: #666; font-size: 12px;">他 ${projectData.taskQueue.length - 5} 件</div>` : ''}
            </div>
        `;
        queueSection.appendChild(queueElement);
    }
}

// タスクタイプに対応するスキルを取得
function getSkillForTaskType(taskType) {
    const skillMap = {
        'pc-design': 'designer',
        'sp-design': 'designer',
        'coding': 'coder',
        'client-task': 'director',
        'custom-task': 'director',
        'meeting': 'director'
    };
    return skillMap[taskType] || 'director';
}

// 作業員の削除
function removeWorker(workerId) {
    if (confirm('この作業員を削除しますか？割り当てられたタスクは未割当に戻ります。')) {
        const worker = projectData.workers.find(w => w.id === workerId);
        if (worker) {
            // 割り当てられたタスクを解放
            worker.assignedTasks.forEach(taskId => {
                const task = findTaskById(taskId);
                if (task) {
                    task.assignedTo = null;
                    task.status = 'pending';
                }
            });
        }
        
        projectData.workers = projectData.workers.filter(w => w.id !== workerId);
        updateTaskQueue();
        updateWorkerList();
        assignTasksToWorkers();
        renderGanttChart();
        saveToLocalStorage();
    }
}

// タスクをIDで検索
function findTaskById(taskId) {
    // ページタスクから検索
    for (const page of projectData.pages) {
        const task = page.tasks.find(t => t.id === taskId);
        if (task) return task;
    }
    
    // カスタムタスクから検索
    const customTask = projectData.customTasks.find(t => t.id === taskId);
    if (customTask) return customTask;
    
    // ミーティングから検索
    const meeting = projectData.meetings.find(m => m.id === taskId);
    if (meeting) return meeting;
    
    return null;
}

// 元のタスクオブジェクトを見つける関数
function findOriginalTask(task) {
    // ページタスクから検索
    for (let page of projectData.pages) {
        const foundTask = page.tasks.find(t => t.id === task.id);
        if (foundTask) return foundTask;
    }
    
    // カスタムタスクから検索
    const foundCustomTask = projectData.customTasks.find(t => t.id === task.id);
    if (foundCustomTask) return foundCustomTask;
    
    return null;
}

// タスクを作業員に割り当て（各作業員が最善を尽くす）
function assignTasksToWorkers() {
    // 全作業員の現在の負荷をリセット
    projectData.workers.forEach(worker => {
        worker.currentLoad = 0;
        worker.assignedTasks = [];
        worker.taskQueue = []; // 各作業員のタスクキュー
        worker.currentTaskEndWeek = -1; // 現在のタスクが終わる週
    });
    
    // 全タスクのactualStartWeekをリセット
    projectData.pages.forEach(page => {
        page.tasks.forEach(task => {
            task.actualStartWeek = undefined;
            task.assignedTo = null;
            task.status = 'pending';
        });
    });
    projectData.customTasks.forEach(task => {
        task.actualStartWeek = undefined;
        task.assignedTo = null;
        task.status = 'pending';
    });
    
    // すべてのタスクを収集
    const allTasks = [];
    projectData.pages.forEach(page => {
        page.tasks.forEach(task => {
            allTasks.push({...task, pageName: page.name});
        });
    });
    projectData.customTasks.forEach(task => {
        allTasks.push({
            ...task, 
            pageName: task.pageId ? projectData.pages.find(p => p.id === task.pageId)?.name : '独立タスク'
        });
    });
    
    // 開始週でソート（同じ週なら依存関係を考慮）
    allTasks.sort((a, b) => {
        if (a.startWeek !== b.startWeek) {
            return a.startWeek - b.startWeek;
        }
        // ページ内の順序を維持
        if (a.pageId === b.pageId) {
            return allTasks.indexOf(a) - allTasks.indexOf(b);
        }
        return 0;
    });
    
    // 各タスクを適切な作業員のキューに追加
    allTasks.forEach(task => {
        const requiredSkill = getSkillForTaskType(task.type);
        
        // スキルを持つ作業員を探す
        let eligibleWorkers = projectData.workers.filter(worker => {
            return worker.skills[requiredSkill] > 0;
        });
        
        // クライアントタスクの場合は、クライアント担当者を優先
        if (task.type === 'client-task' || task.isClientTask) {
            const clientWorkers = eligibleWorkers.filter(w => w.name.includes('クライアント'));
            if (clientWorkers.length > 0) {
                eligibleWorkers = clientWorkers;
            }
        }
        
        if (eligibleWorkers.length > 0) {
            // 最もスキルが高い作業員を選択
            const bestWorker = eligibleWorkers.reduce((best, worker) => {
                return worker.skills[requiredSkill] > best.skills[requiredSkill] ? worker : best;
            });
            
            bestWorker.taskQueue.push(task);
            task.assignedTo = bestWorker.id;
            task.status = 'assigned';
        }
    });
    
    // 複数回処理して依存関係を解決
    let maxIterations = 5;
    let iteration = 0;
    let hasChanges = true;
    
    while (hasChanges && iteration < maxIterations) {
        hasChanges = false;
        iteration++;
        
        // 各作業員がキューに積まれたタスクを順番に処理
        projectData.workers.forEach(worker => {
            let currentQuarter = 0; // 四半期単位で管理
            
            worker.taskQueue.forEach(task => {
                const requiredSkill = getSkillForTaskType(task.type);
                const skillLevel = worker.skills[requiredSkill] || 0.1;
                
                // タスクの期間を時間（四半期）単位で計算
                const taskHours = task.duration; // 直接時間として使用
                const adjustedHours = Math.ceil(taskHours / skillLevel); // スキルレベルに基づく調整
                const adjustedQuarters = hoursToQuarters(adjustedHours); // 時間 → 四半期
                
                // タスクの開始可能四半期を計算
                const taskStartQuarter = weeksToQuarters(task.startWeek);
                let actualStartQuarter = Math.max(taskStartQuarter, currentQuarter);
                
                // 依存タスクがある場合のチェック
                if (task.type === 'coding' || task.name.includes('コーディング')) {
                    // デザインタスクが完了している必要がある
                    const pageDesignTasks = allTasks.filter(t => 
                        t.pageId === task.pageId && 
                        (t.type === 'pc-design' || t.type === 'sp-design')
                    );
                    let maxDesignEndQuarter = 0;
                    pageDesignTasks.forEach(designTask => {
                        // 元のタスクオブジェクトからactualStartQuarterを取得
                        const originalDesignTask = findOriginalTask(designTask);
                        if (originalDesignTask && originalDesignTask.actualStartQuarter !== undefined && originalDesignTask.assignedTo) {
                            const designWorker = projectData.workers.find(w => w.id === originalDesignTask.assignedTo);
                            if (designWorker) {
                                const designSkill = designWorker.skills[getSkillForTaskType(designTask.type)];
                                const designHours = designTask.duration;
                                const designAdjustedHours = Math.ceil(designHours / designSkill);
                                const designQuarters = hoursToQuarters(designAdjustedHours);
                                maxDesignEndQuarter = Math.max(maxDesignEndQuarter, originalDesignTask.actualStartQuarter + designQuarters);
                            }
                        }
                    });
                    actualStartQuarter = Math.max(actualStartQuarter, maxDesignEndQuarter);
                }
                
                // 元のタスクオブジェクトに実際の開始時刻を設定
                const originalTask = findOriginalTask(task);
                if (originalTask) {
                    const previousStartQuarter = originalTask.actualStartQuarter;
                    originalTask.actualStartQuarter = actualStartQuarter;
                    originalTask.actualStartWeek = quartersToWeeks(actualStartQuarter); // 週も併用
                    originalTask.assignedTo = worker.id;
                    originalTask.status = 'assigned';
                    originalTask.durationInQuarters = adjustedQuarters;
                    
                    // 変更があった場合はフラグを立てる
                    if (previousStartQuarter !== actualStartQuarter) {
                        hasChanges = true;
                    }
                }
                
                // 作業員のタスクリストに追加
                worker.assignedTasks.push(task.id);
                
                // 次のタスクの開始時刻を更新
                currentQuarter = actualStartQuarter + adjustedQuarters;
                worker.currentTaskEndQuarter = currentQuarter - 1;
            });
        });
    }
    
    // 各作業員の最大負荷を計算
    projectData.workers.forEach(worker => {
        let maxLoad = 0;
        for (let week = 0; week < projectData.weeks; week++) {
            const load = getWorkerLoadForWeek(worker, week);
            maxLoad = Math.max(maxLoad, load);
        }
        worker.currentLoad = maxLoad;
    });
    
    updateTaskQueue();
    updateWorkerList();
}

// 特定の週のタスクを取得
function getTasksForWeek(week) {
    const tasks = [];
    
    // ページタスク
    projectData.pages.forEach(page => {
        page.tasks.forEach(task => {
            if (task.startWeek <= week && week < task.startWeek + task.duration) {
                tasks.push(task);
            }
        });
    });
    
    // カスタムタスク
    projectData.customTasks.forEach(task => {
        if (task.startWeek <= week && week < task.startWeek + task.duration) {
            tasks.push(task);
        }
    });
    
    return tasks;
}

// タスクに対して利用可能な作業員を見つける
function findAvailableWorkerForTask(task) {
    const requiredSkill = getSkillForTaskType(task.type);
    
    const eligibleWorkers = projectData.workers.filter(worker => {
        // スキルレベルが0より大きいかチェック
        return worker.skills[requiredSkill] > 0;
    });
    
    // 最も早くタスクを開始できる作業員を選択
    let bestWorker = null;
    let earliestStartWeek = Infinity;
    let bestSkillLevel = 0;
    
    eligibleWorkers.forEach(worker => {
        // この作業員がタスクを開始できる最早週
        const canStartWeek = Math.max(task.startWeek, worker.currentTaskEndWeek + 1);
        const skillLevel = worker.skills[requiredSkill];
        
        // より早く開始できるか、同じ週ならスキルが高い作業員を選択
        if (canStartWeek < earliestStartWeek || 
            (canStartWeek === earliestStartWeek && skillLevel > bestSkillLevel)) {
            earliestStartWeek = canStartWeek;
            bestSkillLevel = skillLevel;
            bestWorker = worker;
        }
    });
    
    return bestWorker;
}

// 作業員の週次負荷を取得（時間単位）
function getWorkerLoadForWeek(worker, week) {
    let load = 0;
    worker.assignedTasks.forEach(taskId => {
        const task = findTaskById(taskId);
        if (task && task.startWeek <= week && week < task.startWeek + task.duration) {
            // タスクの推定時間を作業員のスキルで調整
            const requiredSkill = getSkillForTaskType(task.type);
            const skillLevel = worker.skills[requiredSkill] || 0.1;
            const baseHours = getTaskBaseHours(task);
            load += baseHours / skillLevel;
        }
    });
    return load;
}

// タスクの基本作業時間を取得
function getTaskBaseHours(task) {
    // タスクタイプに基づいて基本時間を設定（週単位）
    const baseHoursMap = {
        'pc-design': 20,
        'sp-design': 20,
        'coding': 30,
        'client-task': 5,
        'custom-task': 15,
        'meeting': 2
    };
    return baseHoursMap[task.type] || 10;
}

// 週次負荷を更新
function updateWeeklyLoad(week) {
    projectData.workers.forEach(worker => {
        const load = getWorkerLoadForWeek(worker, week);
        worker.currentLoad = Math.max(worker.currentLoad, load);
    });
}

// カスタムタスクの追加
function addCustomTask() {
    const name = document.getElementById('customTaskName').value.trim();
    const startWeek = parseInt(document.getElementById('customTaskWeek').value);
    const duration = parseInt(document.getElementById('customTaskDuration').value);
    const type = document.getElementById('customTaskType').value;
    const owner = document.getElementById('customTaskOwner').value;
    const pageId = document.getElementById('customTaskPage').value;
    
    if (!name) {
        alert('タスク名を入力してください');
        return;
    }
    
    const customTask = {
        id: `custom-${Date.now()}`,
        name: name,
        startWeek: startWeek,
        duration: duration,
        type: type,
        owner: owner,
        pageId: pageId,
        status: 'pending',
        assignedTo: null
    };
    
    projectData.customTasks.push(customTask);
    
    // フォームをクリア
    document.getElementById('customTaskName').value = '';
    document.getElementById('customTaskDuration').value = '1';
    
    // 更新
    updateTaskQueue();
    assignTasksToWorkers();
    renderGanttChart();
    updateCustomTaskList();
    saveToLocalStorage();
}

// カスタムタスクリストの更新
function updateCustomTaskList() {
    const customTaskList = document.getElementById('customTaskList');
    customTaskList.innerHTML = '';
    
    projectData.customTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.innerHTML = `
            <div class="task-info-text">
                <strong>${task.name}</strong>
                <br>
                <small>第${task.startWeek + 1}週〜 / ${task.duration}週間 / ${task.owner}</small>
            </div>
            <button onclick="removeCustomTask('${task.id}')">削除</button>
        `;
        customTaskList.appendChild(taskElement);
    });
    
    updateTaskQueueDisplay();
}

// カスタムタスクの削除
function removeCustomTask(taskId) {
    projectData.customTasks = projectData.customTasks.filter(t => t.id !== taskId);
    updateTaskQueue();
    assignTasksToWorkers();
    renderGanttChart();
    updateCustomTaskList();
    saveToLocalStorage();
}

// 定例ミーティングの追加
function addMeeting() {
    const name = document.getElementById('meetingName').value.trim();
    const interval = document.getElementById('meetingInterval').value;
    const dayOfWeek = parseInt(document.getElementById('meetingDayOfWeek').value);
    const startWeek = parseInt(document.getElementById('meetingStartWeek').value);
    const owner = document.getElementById('meetingOwner').value;
    
    if (!name) {
        alert('ミーティング名を入力してください');
        return;
    }
    
    const meeting = {
        id: `meeting-${Date.now()}`,
        name: name,
        interval: interval,
        dayOfWeek: dayOfWeek,
        startWeek: startWeek,
        owner: owner,
        type: 'meeting'
    };
    
    projectData.meetings.push(meeting);
    
    // フォームをクリア
    document.getElementById('meetingName').value = '';
    
    // 更新
    renderGanttChart();
    updateMeetingList();
    saveToLocalStorage();
}

// ミーティングリストの更新
function updateMeetingList() {
    const meetingList = document.getElementById('meetingList');
    meetingList.innerHTML = '';
    
    projectData.meetings.forEach(meeting => {
        const meetingElement = document.createElement('div');
        meetingElement.className = 'task-item';
        meetingElement.innerHTML = `
            <div class="task-info-text">
                <strong>${meeting.name}</strong>
                <br>
                <small>${getIntervalLabel(meeting.interval)} / ${meeting.owner}</small>
            </div>
            <button onclick="removeMeeting('${meeting.id}')">削除</button>
        `;
        meetingList.appendChild(meetingElement);
    });
}

// インターバルのラベル取得
function getIntervalLabel(interval) {
    const labels = {
        'weekly': '毎週',
        'biweekly': '隔週',
        'monthly': '毎月'
    };
    return labels[interval] || interval;
}

// ミーティングの削除
function removeMeeting(meetingId) {
    projectData.meetings = projectData.meetings.filter(m => m.id !== meetingId);
    renderGanttChart();
    updateMeetingList();
    saveToLocalStorage();
}

// 週選択肢の更新
function updateWeekSelects() {
    const weekSelects = ['customTaskWeek', 'meetingStartWeek'];
    
    weekSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '';
            for (let i = 0; i < projectData.weeks; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `第${i + 1}週`;
                select.appendChild(option);
            }
        }
    });
}

// ページ選択肢の更新
function updatePageSelects() {
    const pageSelect = document.getElementById('customTaskPage');
    if (pageSelect) {
        pageSelect.innerHTML = '<option value="">独立タスク</option>';
        projectData.pages.forEach(page => {
            const option = document.createElement('option');
            option.value = page.id;
            option.textContent = page.name;
            pageSelect.appendChild(option);
        });
    }
}

// スケジュールの更新
function updateSchedule() {
    projectData.startDate = document.getElementById('startDate').value;
    projectData.weeks = parseInt(document.getElementById('weeks').value);
    
    updateWeekSelects();
    renderGanttChart();
    saveToLocalStorage();
}

// ガントチャートの描画（横向きカレンダー形式）
function renderGanttChart() {
    const container = document.getElementById('ganttContainer');
    container.innerHTML = '';
    
    // スクロールコンテナ
    const scrollContainer = document.createElement('div');
    scrollContainer.style.overflowX = 'auto';
    scrollContainer.style.overflowY = 'visible';
    
    // ヘッダー作成
    const header = document.createElement('div');
    header.className = 'gantt-header';
    header.style.position = 'sticky';
    header.style.top = '0';
    header.style.zIndex = '1000';
    header.style.backgroundColor = '#f8f9fa';
    
    // タスク情報の幅を考慮したコンテナ
    const headerContainer = document.createElement('div');
    headerContainer.style.display = 'flex';
    headerContainer.style.minWidth = 'fit-content';
    
    // タスク情報部分の空のスペース
    const taskInfoSpace = document.createElement('div');
    taskInfoSpace.style.width = '280px';
    taskInfoSpace.style.marginRight = '10px';
    taskInfoSpace.style.backgroundColor = '#f8f9fa';
    taskInfoSpace.style.borderBottom = '2px solid #dee2e6';
    headerContainer.appendChild(taskInfoSpace);
    
    const timeline = document.createElement('div');
    timeline.className = 'gantt-timeline';
    timeline.style.display = 'flex';
    timeline.style.flex = '1';
    
    // カレンダー形式のヘッダー作成
    const startDate = new Date(projectData.startDate);
    const hourWidth = 25; // 1時間あたりのピクセル幅
    const dayWidth = TIME_CONFIG.WORK_HOURS_PER_DAY * hourWidth; // 8時間 × 25px = 200px
    const totalDays = projectData.weeks * TIME_CONFIG.WORK_DAYS_PER_WEEK;
    
    // 月レベルのヘッダー
    const monthHeader = document.createElement('div');
    monthHeader.className = 'month-header';
    monthHeader.style.display = 'flex';
    monthHeader.style.height = '30px';
    monthHeader.style.backgroundColor = '#e9ecef';
    monthHeader.style.borderBottom = '1px solid #dee2e6';
    
    // 日レベルのヘッダー
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.style.display = 'flex';
    dayHeader.style.height = '25px';
    dayHeader.style.backgroundColor = '#f1f3f4';
    dayHeader.style.borderBottom = '1px solid #dee2e6';
    
    // 時間レベルのヘッダー
    const hourHeader = document.createElement('div');
    hourHeader.className = 'hour-header';
    hourHeader.style.display = 'flex';
    hourHeader.style.height = '20px';
    hourHeader.style.backgroundColor = '#f8f9fa';
    hourHeader.style.borderBottom = '1px solid #dee2e6';
    
    let currentMonth = null;
    let monthSpan = 0;
    
    for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + Math.floor(dayIndex / TIME_CONFIG.WORK_DAYS_PER_WEEK) * 7 + (dayIndex % TIME_CONFIG.WORK_DAYS_PER_WEEK));
        
        // 土日をスキップして営業日のみを表示
        while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const month = currentDate.getMonth();
        const date = currentDate.getDate();
        const dayOfWeek = currentDate.getDay();
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        
        // 月ヘッダー
        if (currentMonth !== month) {
            if (monthSpan > 0) {
                // 前の月のヘッダーを完成させる
                const prevMonthCell = monthHeader.lastChild;
                if (prevMonthCell) {
                    prevMonthCell.style.width = `${monthSpan * dayWidth}px`;
                }
            }
            
            currentMonth = month;
            monthSpan = 0;
            
            const monthCell = document.createElement('div');
            monthCell.className = 'month-cell';
            monthCell.style.borderRight = '1px solid #dee2e6';
            monthCell.style.textAlign = 'center';
            monthCell.style.fontSize = '14px';
            monthCell.style.fontWeight = '600';
            monthCell.style.color = '#495057';
            monthCell.style.padding = '5px';
            monthCell.textContent = `${currentDate.getFullYear()}年${month + 1}月`;
            monthHeader.appendChild(monthCell);
        }
        monthSpan++;
        
        // 日ヘッダー
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        dayCell.style.width = `${dayWidth}px`;
        dayCell.style.borderRight = '1px solid #dee2e6';
        dayCell.style.textAlign = 'center';
        dayCell.style.fontSize = '12px';
        dayCell.style.fontWeight = '500';
        dayCell.style.color = '#6c757d';
        dayCell.style.padding = '3px';
        dayCell.textContent = `${date}日 (${dayNames[dayOfWeek]})`;
        
        // 今日の日付をハイライト
        const today = new Date();
        if (currentDate.toDateString() === today.toDateString()) {
            dayCell.style.backgroundColor = '#fff3cd';
            dayCell.style.color = '#856404';
        }
        
        dayHeader.appendChild(dayCell);
        
        // 時間ヘッダー
        const hourContainer = document.createElement('div');
        hourContainer.className = 'hour-container';
        hourContainer.style.display = 'flex';
        hourContainer.style.width = `${dayWidth}px`;
        hourContainer.style.borderRight = '1px solid #dee2e6';
        
        for (let hour = 9; hour < 17; hour++) { // 9:00-17:00
            const hourCell = document.createElement('div');
            hourCell.className = 'hour-cell';
            hourCell.style.width = `${hourWidth}px`;
            hourCell.style.height = '100%';
            hourCell.style.borderRight = '1px solid #f0f0f0';
            hourCell.style.backgroundColor = hour % 2 === 1 ? '#fafafa' : '#ffffff';
            hourCell.style.fontSize = '8px';
            hourCell.style.textAlign = 'center';
            hourCell.style.color = '#999';
            hourCell.style.paddingTop = '2px';
            hourCell.textContent = `${hour}`;
            
            hourContainer.appendChild(hourCell);
        }
        
        hourHeader.appendChild(hourContainer);
    }
    
    // 最後の月のヘッダーを完成させる
    if (monthSpan > 0 && monthHeader.lastChild) {
        monthHeader.lastChild.style.width = `${monthSpan * dayWidth}px`;
    }
    
    timeline.appendChild(monthHeader);
    timeline.appendChild(dayHeader);
    timeline.appendChild(hourHeader);
    
    headerContainer.appendChild(timeline);
    header.appendChild(headerContainer);
    scrollContainer.appendChild(header);
    
    // ボディ作成
    const body = document.createElement('div');
    body.className = 'gantt-body';
    
    // シミュレーション中でない場合は空のガントチャートを表示
    if (!isSimulating) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.innerHTML = `
            <p>シミュレーションを開始すると、作業員がタスクを処理していく様子が表示されます。</p>
            <p>「▶ シミュレーション開始」ボタンを押してください。</p>
        `;
        body.appendChild(emptyMessage);
    } else {
        // シミュレーション中はページ別にグループ化されたタスクを表示
        const pageGroups = collectAllTasks();
        
        if (pageGroups.length > 0) {
            pageGroups.forEach(group => {
                const pageRow = createPageRowCalendar(group, totalDays, hourWidth);
                body.appendChild(pageRow);
            });
        } else {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.innerHTML = `
                <p>タスクがありません。</p>
                <p>左のサイドバーでプロジェクト設定を行い、タスクを生成してください。</p>
            `;
            body.appendChild(emptyMessage);
        }
    }
    
    scrollContainer.appendChild(body);
    container.appendChild(scrollContainer);
}

// 全てのタスクを収集する関数（ページ別にグループ化）
function collectAllTasks() {
    const pageGroups = [];
    
    // ページタスクとそのページに関連するカスタムタスクをグループ化
    projectData.pages.forEach(page => {
        const pageTasks = [];
        
        // ページの通常タスクを追加
        page.tasks.forEach(task => {
            pageTasks.push({
                ...task,
                pageName: page.name,
                source: 'page'
            });
        });
        
        // このページに関連するカスタムタスクを追加
        projectData.customTasks.forEach(task => {
            if (task.pageId === page.id) {
                pageTasks.push({
                    ...task,
                    pageName: page.name,
                    source: 'custom'
                });
            }
        });
        
        // タスクを開始週でソート
        pageTasks.sort((a, b) => {
            const aStartWeek = a.actualStartWeek !== undefined ? a.actualStartWeek : a.startWeek;
            const bStartWeek = b.actualStartWeek !== undefined ? b.actualStartWeek : b.startWeek;
            return aStartWeek - bStartWeek;
        });
        
        if (pageTasks.length > 0) {
            pageGroups.push({
                type: 'page',
                pageName: page.name,
                pageId: page.id,
                tasks: pageTasks
            });
        }
    });
    
    // 独立カスタムタスクのグループ
    const independentCustomTasks = [];
    projectData.customTasks.forEach(task => {
        if (!task.pageId) {
            independentCustomTasks.push({
                ...task,
                pageName: '独立タスク',
                source: 'custom'
            });
        }
    });
    
    if (independentCustomTasks.length > 0) {
        // 開始週でソート
        independentCustomTasks.sort((a, b) => {
            const aStartWeek = a.actualStartWeek !== undefined ? a.actualStartWeek : a.startWeek;
            const bStartWeek = b.actualStartWeek !== undefined ? b.actualStartWeek : b.startWeek;
            return aStartWeek - bStartWeek;
        });
        
        pageGroups.push({
            type: 'custom',
            pageName: '独立タスク',
            pageId: null,
            tasks: independentCustomTasks
        });
    }
    
    // ミーティングは動的に挿入するため、ここでは追加しない
    // シミュレーション中に適切な位置に挿入される
    
    return pageGroups;
}

// 全てのタスクを収集する関数（フラットな配列として開始時間順でソート）
function collectAllTasksFlat() {
    const allTasks = [];
    
    // ページタスクを追加
    projectData.pages.forEach(page => {
        page.tasks.forEach(task => {
            allTasks.push({
                ...task,
                pageName: page.name,
                source: 'page'
            });
        });
    });
    
    // カスタムタスクを追加
    projectData.customTasks.forEach(task => {
        const pageName = task.pageId ? 
            projectData.pages.find(p => p.id === task.pageId)?.name || '独立タスク' : 
            '独立タスク';
        allTasks.push({
            ...task,
            pageName: pageName,
            source: 'custom'
        });
    });
    
    // ミーティングを追加
    projectData.meetings.forEach(meeting => {
        const meetingInstances = expandMeetingInstances(meeting);
        meetingInstances.forEach(instance => {
            allTasks.push({
                ...instance,
                pageName: '定例ミーティング',
                source: 'meeting'
            });
        });
    });
    
    // 開始時間でソート
    allTasks.sort((a, b) => {
        const aStartWeek = a.actualStartWeek !== undefined ? a.actualStartWeek : a.startWeek;
        const bStartWeek = b.actualStartWeek !== undefined ? b.actualStartWeek : b.startWeek;
        return aStartWeek - bStartWeek;
    });
    
    return allTasks;
}

// ページセクションの作成
function createPageSection(page) {
    const section = document.createElement('div');
    section.className = 'page-section';
    
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
        <span>${page.name}</span>
        <div class="page-actions">
            <span style="font-size: 12px; opacity: 0.8;">${page.tasks.length} タスク</span>
        </div>
    `;
    section.appendChild(header);
    
    const taskGrid = document.createElement('div');
    taskGrid.className = 'task-grid';
    
    page.tasks.forEach(task => {
        const taskRow = createTaskRow(task);
        taskGrid.appendChild(taskRow);
    });
    
    section.appendChild(taskGrid);
    return section;
}

// カスタムタスクセクションの作成
function createCustomTaskSection() {
    const section = document.createElement('div');
    section.className = 'custom-tasks-section';
    
    const header = document.createElement('div');
    header.className = 'custom-tasks-header';
    header.textContent = 'カスタムタスク';
    section.appendChild(header);
    
    const body = document.createElement('div');
    body.className = 'custom-tasks-body';
    
    const taskGrid = document.createElement('div');
    taskGrid.className = 'task-grid';
    
    projectData.customTasks.forEach(task => {
        const taskRow = createTaskRow(task);
        taskGrid.appendChild(taskRow);
    });
    
    body.appendChild(taskGrid);
    section.appendChild(body);
    return section;
}

// ミーティングセクションの作成
function createMeetingSection() {
    const section = document.createElement('div');
    section.className = 'custom-tasks-section';
    
    const header = document.createElement('div');
    header.className = 'custom-tasks-header meeting-section';
    header.textContent = '定例ミーティング';
    section.appendChild(header);
    
    const body = document.createElement('div');
    body.className = 'custom-tasks-body';
    
    const taskGrid = document.createElement('div');
    taskGrid.className = 'task-grid';
    
    // ミーティングを週ごとに展開
    projectData.meetings.forEach(meeting => {
        const meetingInstances = expandMeetingInstances(meeting);
        meetingInstances.forEach(instance => {
            const taskRow = createTaskRow(instance);
            taskGrid.appendChild(taskRow);
        });
    });
    
    body.appendChild(taskGrid);
    section.appendChild(body);
    return section;
}

// ミーティングインスタンスの展開
function expandMeetingInstances(meeting) {
    const instances = [];
    const startDate = new Date(projectData.startDate);
    
    for (let week = meeting.startWeek; week < projectData.weeks; week++) {
        let shouldAdd = false;
        
        if (meeting.interval === 'weekly') {
            shouldAdd = true;
        } else if (meeting.interval === 'biweekly') {
            shouldAdd = (week - meeting.startWeek) % 2 === 0;
        } else if (meeting.interval === 'monthly') {
            shouldAdd = (week - meeting.startWeek) % 4 === 0;
        }
        
        if (shouldAdd) {
            instances.push({
                ...meeting,
                id: `${meeting.id}-week-${week}`,
                startWeek: week,
                duration: 1,
                type: 'meeting'
            });
        }
    }
    
    return instances;
}

// タスク行の作成
function createTaskRow(task) {
    const row = document.createElement('div');
    row.className = 'task-row';
    
    // タスク情報
    const taskInfo = document.createElement('div');
    taskInfo.className = 'task-info';
    
    const worker = projectData.workers.find(w => w.id === task.assignedTo);
    const assignedText = worker ? `担当: ${worker.name}` : '未割当';
    
    // タスク名のみを表示（ページ名はグループヘッダーに表示されるため）
    taskInfo.innerHTML = `
        <div class="task-name">${task.name}</div>
        <div class="task-details">
            <span class="task-duration">${assignedText}</span>
            <span class="task-type">${getTaskTypeLabel(task.type)}</span>
        </div>
    `;
    row.appendChild(taskInfo);
    
    // ガントバーコンテナ
    const barContainer = document.createElement('div');
    barContainer.className = 'gantt-bar-container';
    barContainer.style.width = `${projectData.weeks * 120}px`;
    
    // ガントバー
    const actualStartWeek = task.actualStartWeek !== undefined ? task.actualStartWeek : task.startWeek;
    if (actualStartWeek >= 0 && actualStartWeek < projectData.weeks) {
        const ganttTask = document.createElement('div');
        ganttTask.className = `gantt-task ${task.type}`;
        
        // 作業員ベースの色付け
        if (task.assignedTo && worker) {
            const workerColor = getWorkerColor(worker.id);
            ganttTask.style.backgroundColor = workerColor;
            ganttTask.classList.add('worker-assigned');
        }
        
        // 作業員のスキルに基づいて実際の期間を計算
        let actualDuration = task.duration;
        if (task.assignedTo && worker) {
            const requiredSkill = getSkillForTaskType(task.type);
            const skillLevel = worker.skills[requiredSkill] || 0.1;
            actualDuration = Math.ceil(task.duration / skillLevel);
        }
        
        // 四半期単位での位置計算（視認性を重視して幅を拡大）
        const quarterStart = task.actualStartQuarter || weeksToQuarters(actualStartWeek);
        const quarterDuration = task.durationInQuarters || hoursToQuarters(actualDuration * TIME_CONFIG.WORK_HOURS_PER_DAY);
        const quarterWidth = 30; // 視認性を重視して30px per quarter
        
        const leftPosition = quarterStart * quarterWidth;
        const width = Math.min(quarterDuration, weeksToQuarters(projectData.weeks) - quarterStart) * quarterWidth - 2;
        
        ganttTask.style.left = `${leftPosition}px`;
        ganttTask.style.width = `${width}px`;
        ganttTask.textContent = task.name;
        ganttTask.dataset.taskId = task.id; // タスクIDを設定
        
        if (task.assignedTo) {
            ganttTask.style.opacity = '1';
        } else {
            ganttTask.style.opacity = '0.5';
            ganttTask.style.border = '2px dashed rgba(255,255,255,0.5)';
        }
        
        barContainer.appendChild(ganttTask);
    }
    
    row.appendChild(barContainer);
    return row;
}

// タスク行の作成（カレンダー形式）
function createTaskRowCalendar(task, totalDays, hourWidth) {
    const row = document.createElement('div');
    row.className = 'task-row';
    
    // タスク情報
    const taskInfo = document.createElement('div');
    taskInfo.className = 'task-info';
    
    const worker = projectData.workers.find(w => w.id === task.assignedTo);
    const assignedText = worker ? `担当: ${worker.name}` : '未割当';
    
    // タスク名と詳細情報を表示
    taskInfo.innerHTML = `
        <div class="task-name">${task.name}</div>
        <div class="task-details">
            <span class="task-page">${task.pageName}</span>
            <span class="task-duration">${assignedText}</span>
            <span class="task-type">${getTaskTypeLabel(task.type)}</span>
        </div>
    `;
    taskInfo.style.width = '280px';
    taskInfo.style.marginRight = '10px';
    taskInfo.style.padding = '10px';
    taskInfo.style.borderRight = '1px solid #dee2e6';
    taskInfo.style.backgroundColor = '#f8f9fa';
    row.appendChild(taskInfo);
    
    // ガントバーコンテナ
    const barContainer = document.createElement('div');
    barContainer.className = 'gantt-bar-container';
    barContainer.style.position = 'relative';
    barContainer.style.height = '40px';
    barContainer.style.width = `${totalDays * TIME_CONFIG.WORK_HOURS_PER_DAY * hourWidth}px`;
    
    // ガントバー
    const actualStartWeek = task.actualStartWeek !== undefined ? task.actualStartWeek : task.startWeek;
    const startDate = new Date(projectData.startDate);
    
    if (actualStartWeek >= 0 && actualStartWeek < projectData.weeks) {
        const ganttTask = document.createElement('div');
        ganttTask.className = `gantt-task ${task.type}`;
        ganttTask.style.position = 'absolute';
        ganttTask.style.height = '30px';
        ganttTask.style.top = '5px';
        ganttTask.style.borderRadius = '4px';
        ganttTask.style.display = 'flex';
        ganttTask.style.alignItems = 'center';
        ganttTask.style.justifyContent = 'center';
        ganttTask.style.fontSize = '12px';
        ganttTask.style.fontWeight = '500';
        ganttTask.style.color = 'white';
        ganttTask.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
        ganttTask.style.overflow = 'hidden';
        ganttTask.style.whiteSpace = 'nowrap';
        ganttTask.style.textOverflow = 'ellipsis';
        
        // 作業員ベースの色付け
        if (task.assignedTo && worker) {
            const workerColor = getWorkerColor(worker.id);
            ganttTask.style.backgroundColor = workerColor;
            ganttTask.classList.add('worker-assigned');
        } else {
            ganttTask.style.backgroundColor = '#6c757d';
            ganttTask.style.opacity = '0.7';
        }
        
        // 作業員のスキルに基づいて実際の期間を計算
        let actualDuration = task.duration;
        if (task.assignedTo && worker) {
            const requiredSkill = getSkillForTaskType(task.type);
            const skillLevel = worker.skills[requiredSkill] || 0.1;
            actualDuration = Math.ceil(task.duration / skillLevel);
        }
        
        // カレンダー上の位置計算
        const taskStartDay = Math.floor(actualStartWeek * TIME_CONFIG.WORK_DAYS_PER_WEEK);
        const taskStartHour = 0; // 1日の開始時間（9:00を0とする）
        const taskDurationHours = actualDuration * TIME_CONFIG.WORK_HOURS_PER_DAY;
        
        const leftPosition = (taskStartDay * TIME_CONFIG.WORK_HOURS_PER_DAY + taskStartHour) * hourWidth;
        const width = Math.min(taskDurationHours, (totalDays * TIME_CONFIG.WORK_HOURS_PER_DAY) - (taskStartDay * TIME_CONFIG.WORK_HOURS_PER_DAY + taskStartHour)) * hourWidth - 2;
        
        ganttTask.style.left = `${leftPosition}px`;
        ganttTask.style.width = `${Math.max(width, 20)}px`; // 最小幅20px
        ganttTask.textContent = task.name;
        ganttTask.dataset.taskId = task.id; // タスクIDを設定
        ganttTask.title = `${task.name} (${task.pageName}) - ${assignedText}`;
        
        if (!task.assignedTo) {
            ganttTask.style.border = '2px dashed rgba(255,255,255,0.5)';
        }
        
        barContainer.appendChild(ganttTask);
    }
    
    row.appendChild(barContainer);
    return row;
}

// ページ行を作成する関数（カレンダー形式）
function createPageRowCalendar(pageGroup, totalDays, hourWidth) {
    const row = document.createElement('div');
    row.className = 'page-row';
    row.style.cssText = `
        display: flex;
        align-items: center;
        min-height: 50px;
        border-bottom: 1px solid #e0e0e0;
        background: white;
        margin-bottom: 2px;
    `;
    
    // ページ名の部分
    const pageInfo = document.createElement('div');
    pageInfo.className = 'page-info';
    pageInfo.style.cssText = `
        width: 280px;
        padding: 10px 15px;
        background: ${pageGroup.type === 'meeting' ? '#f39c12' : pageGroup.type === 'custom' ? '#2ecc71' : '#667eea'};
        color: white;
        font-weight: 600;
        font-size: 14px;
        border-radius: 4px;
        margin-right: 10px;
        flex-shrink: 0;
    `;
    pageInfo.textContent = pageGroup.pageName;
    row.appendChild(pageInfo);
    
    // タスクバーコンテナ
    const barContainer = document.createElement('div');
    barContainer.className = 'gantt-bar-container';
    barContainer.style.cssText = `
        flex: 1;
        position: relative;
        height: 50px;
        background: #fafafa;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        min-width: ${totalDays * 8 * hourWidth}px;
    `;
    
    // 各タスクのバーを配置
    let currentPosition = 0; // 横並びの位置を管理
    pageGroup.tasks.forEach((task, index) => {
        // シミュレーション中でない場合は待機状態で表示
        if (!isSimulating) {
            // 待機中タスクとして表示（横並びで配置）
            const taskWidth = Math.max(task.duration * 20, 120); // 時間に比例したサイズ（最小120px）
            const taskBar = document.createElement('div');
            taskBar.className = 'task-bar waiting';
            taskBar.style.cssText = `
                position: absolute;
                left: ${currentPosition}px;
                width: ${taskWidth}px;
                height: 35px;
                background: ${getTaskTypeColor(task.type)};
                border: 2px solid rgba(255,255,255,0.8);
                border-radius: 4px;
                top: 7px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                padding: 0 8px;
                opacity: 0.7;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            `;
            taskBar.textContent = `${task.name} (${task.duration}h)`;
            taskBar.title = `${task.name}\nタイプ: ${getTaskTypeLabel(task.type)}\n予定時間: ${task.duration}時間`;
            barContainer.appendChild(taskBar);
            
            // 次のタスクの位置を更新
            currentPosition += taskWidth + 5; // 5pxの間隔を追加
            return;
        }
        
        const worker = projectData.workers.find(w => w.id === task.assignedTo);
        const workerColor = worker ? getWorkerColor(worker.id) : '#ccc';
        
        // タスクの開始時間と期間を計算（順次実行）
        let taskStartHour = 0;
        let taskDurationHours = 0;
        
        // 同じページ内の前のタスクの終了時間を計算（順次実行）
        let cumulativePosition = 0;
        const currentTaskIndex = pageGroup.tasks.indexOf(task);
        
        for (let i = 0; i < currentTaskIndex; i++) {
            const prevTask = pageGroup.tasks[i];
            cumulativePosition += prevTask.duration;
        }
        
        if (task.actualStartHour !== undefined) {
            taskStartHour = task.actualStartHour;
        } else if (task.startedAt !== undefined) {
            taskStartHour = task.startedAt;
        } else {
            taskStartHour = cumulativePosition;
        }
        
        if (task.simulationStatus === 'completed' && task.startedAt !== undefined && task.completedAt !== undefined) {
            taskDurationHours = task.completedAt - task.startedAt;
        } else if (task.simulationStatus === 'in-progress' && task.startedAt !== undefined) {
            // 進行中のタスクは現在時刻までの実際の作業時間
            const actualWorkedHours = simulationTime - task.startedAt;
            taskDurationHours = actualWorkedHours;
        } else {
            taskDurationHours = task.duration; // 直接時間として使用
        }
        
        const leftPosition = taskStartHour * hourWidth;
        const width = Math.max(taskDurationHours * hourWidth - 2, 10); // 最小幅10px
        
        const taskBar = document.createElement('div');
        taskBar.className = 'task-bar';
        taskBar.style.cssText = `
            position: absolute;
            left: ${leftPosition}px;
            width: ${width}px;
            height: 35px;
            background: ${workerColor};
            border-radius: 4px;
            top: 7px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.2s;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            padding: 0 8px;
        `;
        
        // タスクの進捗状況による表示（プログレッシブバー風）
        if (task.simulationStatus === 'completed') {
            taskBar.style.opacity = '1';
            taskBar.style.border = '2px solid #27ae60';
            taskBar.style.background = `linear-gradient(to right, ${workerColor} 100%, transparent 100%)`;
        } else if (task.simulationStatus === 'in-progress') {
            taskBar.style.opacity = '0.9';
            taskBar.style.border = '2px solid #f39c12';
            const progress = task.progress || 0;
            // 進捗に応じたグラデーション
            taskBar.style.background = `linear-gradient(to right, ${workerColor} ${progress}%, rgba(200,200,200,0.3) ${progress}%)`;
        } else {
            taskBar.style.opacity = '0.3';
            taskBar.style.background = 'rgba(200,200,200,0.3)';
        }
        
        taskBar.textContent = task.name;
        taskBar.title = `${task.name}\n担当者: ${worker ? worker.name : '未割当'}\nタイプ: ${getTaskTypeLabel(task.type)}`;
        
        // ホバーエフェクト
        taskBar.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.zIndex = '10';
        });
        
        taskBar.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.zIndex = '1';
        });
        
        barContainer.appendChild(taskBar);
    });
    
    row.appendChild(barContainer);
    return row;
}

// 次の作業員の色を取得
function getNextWorkerColor() {
    const colors = [
        '#3498db', // 青
        '#e74c3c', // 赤
        '#2ecc71', // 緑
        '#f39c12', // オレンジ
        '#9b59b6', // 紫
        '#1abc9c', // ターコイズ
        '#e67e22', // カロット
        '#34495e', // 濃いグレー
        '#f1c40f', // 黄色
        '#e91e63'  // ピンク
    ];
    
    return colors[projectData.workers.length % colors.length];
}

// 作業員の色を取得
function getWorkerColor(workerId) {
    const worker = projectData.workers.find(w => w.id === workerId);
    if (worker && worker.color) {
        return worker.color;
    }
    
    // フォールバック色
    const colors = [
        '#3498db', // 青
        '#e74c3c', // 赤
        '#2ecc71', // 緑
        '#f39c12', // オレンジ
        '#9b59b6', // 紫
        '#1abc9c', // ターコイズ
        '#e67e22', // カロット
        '#34495e', // 濃いグレー
        '#f1c40f', // 黄色
        '#e91e63'  // ピンク
    ];
    
    // 作業員IDのハッシュから色を選択
    const workerIndex = projectData.workers.findIndex(w => w.id === workerId);
    return colors[workerIndex % colors.length];
}

// タスクタイプのラベルを取得
function getTaskTypeLabel(type) {
    const labels = {
        'pc-design': 'PCデザイン',
        'sp-design': 'SPデザイン',
        'coding': 'コーディング',
        'client-task': 'クライアント確認',
        'custom-task': 'カスタム',
        'meeting': 'ミーティング'
    };
    return labels[type] || type;
}

// タスクタイプの色を取得
function getTaskTypeColor(type) {
    const colors = {
        'director': '#3498db',
        'pc-design': '#3498db',
        'sp-design': '#e74c3c',
        'coding': '#2ecc71',
        'client-task': '#95a5a6',
        'custom-task': '#9b59b6',
        'meeting': '#f39c12'
    };
    return colors[type] || '#6c757d';
}

// IDでタスクを検索
function findTaskById(taskId) {
    // ページタスクから検索
    for (const page of projectData.pages) {
        const task = page.tasks.find(t => t.id === taskId);
        if (task) {
            task.pageName = page.name;
            return task;
        }
    }
    
    // カスタムタスクから検索
    const customTask = projectData.customTasks.find(t => t.id === taskId);
    if (customTask) {
        customTask.pageName = 'カスタムタスク';
        return customTask;
    }
    
    // ミーティングから検索
    const meeting = projectData.meetings.find(t => t.id === taskId);
    if (meeting) {
        meeting.pageName = 'ミーティング';
        return meeting;
    }
    
    return null;
}

// 週次ミーティングを動的に挿入
function insertMeetingForWeek(currentWeek) {
    // すでにこの週のミーティングが存在するかチェック
    const existingMeeting = projectData.pages.find(page => 
        page.id === `meeting-week-${currentWeek}` || 
        page.name === `第${currentWeek}週 定例ミーティング`
    );
    
    if (existingMeeting) {
        return; // すでに存在する場合は何もしない
    }
    
    // 完了したタスクの数を数える
    let completedPageCount = 0;
    projectData.pages.forEach(page => {
        const allCompleted = page.tasks.every(task => task.simulationStatus === 'completed');
        if (allCompleted) {
            completedPageCount++;
        }
    });
    
    // 新しいミーティングページを作成
    const meetingPage = {
        id: `meeting-week-${currentWeek}`,
        name: `第${currentWeek}週 定例ミーティング`,
        code: `meeting_week_${currentWeek}`,
        tasks: [{
            id: `meeting-week-${currentWeek}-task`,
            name: '週次進捗会議',
            startWeek: currentWeek,
            duration: 2, // 2時間
            type: 'meeting',
            pageId: `meeting-week-${currentWeek}`,
            pageName: `第${currentWeek}週 定例ミーティング`,
            simulationStatus: 'waiting',
            progress: 0
        }]
    };
    
    // 完了したページの後に挿入
    const insertIndex = Math.min(completedPageCount, projectData.pages.length);
    projectData.pages.splice(insertIndex, 0, meetingPage);
    
    // ガントチャートを再描画
    renderGanttChart();
}

// 作業員の次のタスクを予測
function findNextTaskForWorker(worker) {
    // 現在のタスクが完了に近い場合のみ次のタスクを予測
    if (worker.currentTask) {
        const currentTask = findTaskById(worker.currentTask);
        if (currentTask && currentTask.progress < 80) {
            return null; // まだ現在のタスクに集中
        }
    }
    
    // 利用可能なタスクを検索
    const availableTasks = [];
    
    // ページタスクから検索
    projectData.pages.forEach(page => {
        page.tasks.forEach(task => {
            if (task.simulationStatus !== 'completed' && 
                task.simulationStatus !== 'in-progress' && 
                task.assignedTo !== worker.id &&
                canStartTask(task, worker)) {
                task.pageName = page.name;
                availableTasks.push(task);
            }
        });
    });
    
    // カスタムタスクから検索
    projectData.customTasks.forEach(task => {
        if (task.simulationStatus !== 'completed' && 
            task.simulationStatus !== 'in-progress' && 
            task.assignedTo !== worker.id &&
            canStartTask(task, worker)) {
            task.pageName = 'カスタムタスク';
            availableTasks.push(task);
        }
    });
    
    if (availableTasks.length === 0) {
        return null;
    }
    
    // 最適なタスクを選択（スキルレベルが高いもの）
    return availableTasks.reduce((best, current) => {
        const bestSkill = worker.skills[getSkillForTaskType(best.type)] || 0;
        const currentSkill = worker.skills[getSkillForTaskType(current.type)] || 0;
        return currentSkill > bestSkill ? current : best;
    });
}

// 日付フォーマット
function formatDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}

// CSV出力
function exportCSV() {
    let csv = 'ページ,タスク名,開始週,期間,タイプ,担当,割当作業員\n';
    
    // ページタスク
    projectData.pages.forEach(page => {
        page.tasks.forEach(task => {
            const worker = projectData.workers.find(w => w.id === task.assignedTo);
            csv += `"${page.name}","${task.name}",${task.startWeek + 1},${task.duration},"${task.type}","${task.owner}","${worker?.name || '未割当'}"\n`;
        });
    });
    
    // カスタムタスク
    projectData.customTasks.forEach(task => {
        const pageName = task.pageId ? projectData.pages.find(p => p.id === task.pageId)?.name : '独立タスク';
        const worker = projectData.workers.find(w => w.id === task.assignedTo);
        csv += `"${pageName}","${task.name}",${task.startWeek + 1},${task.duration},"${task.type}","${task.owner}","${worker?.name || '未割当'}"\n`;
    });
    
    // ダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `schedule_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// CSV読み込み
function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',');
            
            // 既存データをクリア
            projectData.pages = [];
            projectData.customTasks = [];
            
            const pageMap = new Map();
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = line.match(/(".*?"|[^,]+)/g).map(v => v.replace(/^"|"$/g, ''));
                
                const pageName = values[0];
                const taskName = values[1];
                const startWeek = parseInt(values[2]) - 1;
                const duration = parseInt(values[3]);
                const type = values[4];
                const owner = values[5];
                
                if (pageName === '独立タスク') {
                    // カスタムタスク
                    projectData.customTasks.push({
                        id: `custom-${Date.now()}-${i}`,
                        name: taskName,
                        startWeek: startWeek,
                        duration: duration,
                        type: type,
                        owner: owner,
                        pageId: '',
                        status: 'pending',
                        assignedTo: null
                    });
                } else {
                    // ページタスク
                    if (!pageMap.has(pageName)) {
                        const pageId = `page-${pageMap.size}`;
                        pageMap.set(pageName, {
                            id: pageId,
                            name: pageName,
                            tasks: []
                        });
                    }
                    
                    const page = pageMap.get(pageName);
                    page.tasks.push({
                        id: `${page.id}-task-${page.tasks.length}`,
                        name: taskName,
                        startWeek: startWeek,
                        duration: duration,
                        type: type,
                        owner: owner,
                        pageId: page.id,
                        status: 'pending',
                        assignedTo: null
                    });
                }
            }
            
            projectData.pages = Array.from(pageMap.values());
            
            // UI更新
            updateTaskQueue();
            assignTasksToWorkers();
            renderGanttChart();
            updateCustomTaskList();
            updatePageSelects();
            saveToLocalStorage();
            
            alert('CSVファイルを読み込みました');
        } catch (error) {
            alert('CSVファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    
    reader.readAsText(file, 'UTF-8');
}

// ローカルストレージへの保存
function saveToLocalStorage() {
    localStorage.setItem('ganttScheduler2Data', JSON.stringify(projectData));
}

// シミュレーション関連の変数
let simulationInterval = null;
let simulationTime = 0; // 現在のシミュレーション時間（時間単位）
let simulationSpeed = 1000; // ミリ秒（1秒 = 1時間）
let isSimulating = false;

// シミュレーションの開始/停止
function toggleSimulation() {
    if (isSimulating) {
        stopSimulation();
    } else {
        startSimulation();
    }
}

// シミュレーション開始
function startSimulation() {
    isSimulating = true;
    const btn = document.getElementById('simulationBtn');
    btn.textContent = '⏸ 一時停止';
    btn.style.background = '#e74c3c';
    
    document.getElementById('simulationInfo').style.display = 'block';
    
    // 全タスクの進捗をリセット
    resetTaskProgress();
    
    // ガントチャートを再描画
    renderGanttChart();
    
    // シミュレーション開始
    simulationInterval = setInterval(() => {
        simulateHour();
    }, simulationSpeed);
}

// シミュレーション停止
function stopSimulation() {
    isSimulating = false;
    const btn = document.getElementById('simulationBtn');
    btn.textContent = '▶ シミュレーション開始';
    btn.style.background = '#2ecc71';
    
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    
    // ガントチャートを再描画（空の状態に戻す）
    renderGanttChart();
}

// シミュレーション速度の更新
function updateSimulationSpeed() {
    simulationSpeed = parseInt(document.getElementById('simulationSpeed').value);
    if (isSimulating) {
        stopSimulation();
        startSimulation();
    }
}

// タスクの進捗をリセット
function resetTaskProgress() {
    simulationTime = 0;
    
    // すべてのタスクの進捗をリセット
    projectData.pages.forEach(page => {
        page.tasks.forEach(task => {
            task.progress = 0;
            task.simulationStatus = 'waiting';
            task.startedAt = null;
            task.completedAt = null;
        });
    });
    
    projectData.customTasks.forEach(task => {
        task.progress = 0;
        task.simulationStatus = 'waiting';
        task.startedAt = null;
        task.completedAt = null;
    });
    
    // 作業員の状態をリセット
    projectData.workers.forEach(worker => {
        worker.currentTask = null;
        worker.totalWorkedHours = 0;
    });
    
    updateSimulationDisplay();
    renderGanttChart();
}

// 1時間分のシミュレーション
function simulateHour() {
    const currentWeek = Math.floor(simulationTime / 40); // 週40時間で計算
    const currentHour = simulationTime % 40; // 週内の時間
    
    // ミーティングのチェック（毎週月曜日の9時にミーティング）
    if (currentHour === 0 && currentWeek > 0) { // 週の最初の時間にミーティング
        insertMeetingForWeek(currentWeek);
    }
    
    // 各作業員の作業を進める
    projectData.workers.forEach(worker => {
        // 現在のタスクがない場合、利用可能なタスクを探す
        if (!worker.currentTask) {
            // 全タスクから作業員のスキルに適合するタスクを探す
            const availableTask = findAvailableTask(worker, currentWeek);
            if (availableTask) {
                worker.currentTask = availableTask.id; // タスクIDを保存
                availableTask.simulationStatus = 'in-progress';
                availableTask.startedAt = simulationTime;
                availableTask.progress = 0;
                availableTask.actualStartWeek = currentWeek;
                availableTask.actualStartHour = simulationTime;
                availableTask.assignedTo = worker.id;
            }
        }
        
        // 現在のタスクを進める
        if (worker.currentTask) {
            const task = findTaskById(worker.currentTask);
            if (task) {
                const requiredSkill = getSkillForTaskType(task.type);
                const skillLevel = worker.skills[requiredSkill] || 0.1;
                
                // 1時間あたりの進捗率を計算
                const taskHours = task.duration; // 直接時間として使用
                const adjustedHours = taskHours / skillLevel; // スキルレベルに応じて調整
                const progressPerHour = 100 / adjustedHours;
                
                task.progress = Math.min(100, (task.progress || 0) + progressPerHour);
                worker.totalWorkedHours = (worker.totalWorkedHours || 0) + 1;
                
                // タスク完了チェック
                if (task.progress >= 100) {
                    task.simulationStatus = 'completed';
                    task.completedAt = simulationTime;
                    worker.currentTask = null;
                }
            } else {
                // タスクが見つからない場合はクリア
                worker.currentTask = null;
            }
        }
    });
    
    // 時間を進める
    simulationTime++;
    
    // 表示更新
    updateSimulationDisplay();
    renderGanttChart();
    
    // 全タスク完了チェック
    if (isAllTasksCompleted()) {
        stopSimulation();
        alert('すべてのタスクが完了しました！');
    }
}

// 作業員が利用可能なタスクを探す
function findAvailableTask(worker, currentWeek) {
    // 全タスクを収集
    const allTasks = [];
    projectData.pages.forEach(page => {
        page.tasks.forEach(task => allTasks.push(task));
    });
    projectData.customTasks.forEach(task => allTasks.push(task));
    projectData.meetings.forEach(meeting => allTasks.push(meeting));
    
    // 利用可能なタスクをフィルタリング
    const availableTasks = allTasks.filter(task => {
        // 既に完了または進行中のタスクは除外
        if (task.simulationStatus === 'completed' || task.simulationStatus === 'in-progress') {
            return false;
        }
        
        // 開始予定週をチェック
        const taskStartWeek = task.actualStartWeek || task.startWeek || 0;
        if (currentWeek < taskStartWeek) {
            return false;
        }
        
        // 作業員のスキルレベルをチェック
        const requiredSkill = getSkillForTaskType(task.type);
        const skillLevel = worker.skills[requiredSkill] || 0;
        if (skillLevel <= 0) {
            return false;
        }
        
        // 依存関係をチェック
        if (!canStartTask(task)) {
            return false;
        }
        
        return true;
    });
    
    // 利用可能なタスクがない場合
    if (availableTasks.length === 0) {
        return null;
    }
    
    // タスクの優先度を決定（ページ内の順序を考慮）
    return availableTasks.reduce((best, current) => {
        // 1. まず、ページ内の順序を比較
        const bestPageIndex = getTaskIndexInPage(best);
        const currentPageIndex = getTaskIndexInPage(current);
        
        if (bestPageIndex !== currentPageIndex) {
            // より早い順序のタスクを優先
            return currentPageIndex < bestPageIndex ? current : best;
        }
        
        // 2. 同じ順序の場合は、スキルレベルで比較
        const bestSkill = worker.skills[getSkillForTaskType(best.type)] || 0;
        const currentSkill = worker.skills[getSkillForTaskType(current.type)] || 0;
        return currentSkill > bestSkill ? current : best;
    });
}

// ページ内でのタスクの順序を取得
function getTaskIndexInPage(task) {
    if (!task.pageId) {
        return 999; // ページタスクでない場合は最後に処理
    }
    
    const page = projectData.pages.find(p => p.id === task.pageId);
    if (!page) {
        return 999;
    }
    
    return page.tasks.findIndex(t => t.id === task.id);
}

// タスクが開始可能かチェック
function canStartTask(task) {
    // ページ内のタスクは順次実行する必要がある
    if (task.pageId) {
        const page = projectData.pages.find(p => p.id === task.pageId);
        if (page && page.tasks.length > 0) {
            // 現在のタスクのインデックスを取得
            const currentTaskIndex = page.tasks.findIndex(t => t.id === task.id);
            if (currentTaskIndex > 0) {
                // 前のタスクが完了しているかチェック
                const previousTask = page.tasks[currentTaskIndex - 1];
                if (previousTask.simulationStatus !== 'completed') {
                    return false;
                }
            }
        }
    }
    
    // 従来のコーディングタスクの依存関係チェック（念のため残す）
    if (task.type === 'coding' || task.name.includes('コーディング')) {
        const pageId = task.pageId;
        const page = projectData.pages.find(p => p.id === pageId);
        if (page) {
            const designTasks = page.tasks.filter(t => 
                (t.type === 'pc-design' || t.type === 'sp-design') &&
                t.simulationStatus !== 'completed'
            );
            if (designTasks.length > 0) {
                return false;
            }
        }
    }
    return true;
}

// シミュレーション表示の更新
function updateSimulationDisplay() {
    const currentWeek = Math.floor(simulationTime / 40) + 1;
    const hourInWeek = simulationTime % 40;
    
    // 要素が存在する場合のみ更新
    const timeElement = document.getElementById('simulationTime');
    if (timeElement) {
        timeElement.textContent = `第${currentWeek}週 ${hourInWeek}時間目`;
    }
    
    // 統計情報の更新
    let activeCount = 0;
    let completedCount = 0;
    let waitingCount = 0;
    
    const countTask = (task) => {
        if (task.simulationStatus === 'in-progress') activeCount++;
        else if (task.simulationStatus === 'completed') completedCount++;
        else waitingCount++;
    };
    
    // 全タスクを収集して統計を計算
    projectData.pages.forEach(page => {
        page.tasks.forEach(countTask);
    });
    projectData.customTasks.forEach(countTask);
    projectData.meetings.forEach(countTask);
    
    // 要素が存在する場合のみ更新
    const activeElement = document.getElementById('activeTaskCount');
    const completedElement = document.getElementById('completedTaskCount');
    const waitingElement = document.getElementById('waitingTaskCount');
    
    if (activeElement) activeElement.textContent = activeCount;
    if (completedElement) completedElement.textContent = completedCount;
    if (waitingElement) waitingElement.textContent = waitingCount;
    
    // ガントチャートの更新
    updateGanttTaskStatus();
}

// ガントチャートのタスク状態を更新
function updateGanttTaskStatus() {
    document.querySelectorAll('.gantt-task').forEach(element => {
        const taskId = element.dataset.taskId;
        if (!taskId) return;
        
        const task = findTaskById(taskId);
        if (!task) return;
        
        // 既存のクラスを削除
        element.classList.remove('in-progress', 'completed');
        
        // 新しいクラスを追加
        if (task.simulationStatus === 'in-progress') {
            element.classList.add('in-progress');
        } else if (task.simulationStatus === 'completed') {
            element.classList.add('completed');
        }
        
        // 進捗バーを追加
        let progressBar = element.querySelector('.progress-indicator');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'progress-indicator';
            element.appendChild(progressBar);
        }
        progressBar.style.width = `${task.progress || 0}%`;
    });
}

// 全タスク完了チェック
function isAllTasksCompleted() {
    const checkTask = (task) => task.simulationStatus !== 'completed';
    
    const hasIncompleteTasks = projectData.pages.some(page => 
        page.tasks.some(checkTask)
    ) || projectData.customTasks.some(checkTask) || projectData.meetings.some(checkTask);
    
    return !hasIncompleteTasks;
}

// ローカルストレージからの読み込み
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('ganttScheduler2Data');
    if (savedData) {
        try {
            const loadedData = JSON.parse(savedData);
            
            // Validate and fix worker skills
            if (loadedData.workers) {
                loadedData.workers.forEach(worker => {
                    // Ensure skills object exists
                    if (!worker.skills || typeof worker.skills !== 'object') {
                        worker.skills = {
                            director: 0.5,
                            designer: 0.5,
                            coder: 0.5
                        };
                    } else {
                        // Ensure all required skill properties exist
                        if (typeof worker.skills.director !== 'number') {
                            worker.skills.director = 0.5;
                        }
                        if (typeof worker.skills.designer !== 'number') {
                            worker.skills.designer = 0.5;
                        }
                        if (typeof worker.skills.coder !== 'number') {
                            worker.skills.coder = 0.5;
                        }
                    }
                    
                    // Ensure other required properties exist
                    if (typeof worker.capacity !== 'number') {
                        worker.capacity = 40;
                    }
                    if (typeof worker.currentLoad !== 'number') {
                        worker.currentLoad = 0;
                    }
                    if (!Array.isArray(worker.assignedTasks)) {
                        worker.assignedTasks = [];
                    }
                    if (!Array.isArray(worker.taskQueue)) {
                        worker.taskQueue = [];
                    }
                });
            }
            
            projectData = loadedData;
            
            // 作業員数を3人に制限
            if (projectData.workers.length > 3) {
                projectData.workers = projectData.workers.slice(0, 3);
            }
            
            // UI更新
            document.getElementById('startDate').value = projectData.startDate;
            document.getElementById('weeks').value = projectData.weeks;
            
            updateTaskQueue();
            updateWorkerList();
            updateCustomTaskList();
            updateMeetingList();
            updatePageSelects();
            updateWeekSelects();
            assignTasksToWorkers();
            renderGanttChart();
        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
        }
    }
}

// サンプルデータの読み込み
function loadSampleData() {
    // サンプルページ
    const samplePages = [
        'トップページ',
        '商品一覧ページ',
        '商品詳細ページ',
        'カートページ',
        '決済ページ',
        'マイページ',
        'お問い合わせページ',
        'ご利用ガイド'
    ];
    
    // サンプルタスクテンプレート
    const sampleTemplate = [
        { name: 'ワイヤーフレーム作成', duration: 2, type: 'pc-design' },
        { name: 'PCデザイン', duration: 3, type: 'pc-design' },
        { name: 'SPデザイン', duration: 3, type: 'sp-design' },
        { name: 'クライアント確認', duration: 2, type: 'client-task' },
        { name: 'コーディング', duration: 4, type: 'coding' },
        { name: '動作確認', duration: 2, type: 'coding' }
    ];
    
    // テキストエリアにサンプルを設定
    document.getElementById('pageList').value = samplePages.join('\n');
    document.getElementById('taskTemplate').value = sampleTemplate
        .map(t => `${t.name},${t.duration},${t.type}`)
        .join('\n');
    
    // サンプル作業員（ディレクター1名、デザイン兼コーダー2名）
    const sampleWorkers = [
        { name: '山田太郎', skills: { director: 0.9, designer: 0.3, coder: 0.1 }, capacity: 40 },
        { name: '佐藤花子', skills: { director: 0.1, designer: 0.8, coder: 0.7 }, capacity: 40 },
        { name: '鈴木一郎', skills: { director: 0.1, designer: 0.7, coder: 0.8 }, capacity: 40 }
    ];
    
    sampleWorkers.forEach(w => {
        projectData.workers.push({
            id: `worker-${Date.now()}-${Math.random()}`,
            name: w.name,
            skills: w.skills,
            capacity: w.capacity,
            currentLoad: 0,
            assignedTasks: []
        });
    });
    
    // サンプルミーティング
    projectData.meetings.push({
        id: `meeting-${Date.now()}`,
        name: '週次進捗会議',
        interval: 'weekly',
        dayOfWeek: 1,
        startWeek: 0,
        owner: 'both',
        type: 'meeting'
    });
    
    // プロジェクト設定を適用
    applySettings();
    
    // サンプルカスタムタスク
    const customTasks = [
        { name: 'デザインシステム構築', startWeek: 0, duration: 2, type: 'pc-design', owner: 'ecbeing' },
        { name: 'コンポーネント設計', startWeek: 1, duration: 2, type: 'coding', owner: 'ecbeing' },
        { name: '最終プレゼンテーション', startWeek: 10, duration: 1, type: 'custom-task', owner: 'ecbeing' }
    ];
    
    customTasks.forEach(t => {
        projectData.customTasks.push({
            id: `custom-${Date.now()}-${Math.random()}`,
            name: t.name,
            startWeek: t.startWeek,
            duration: t.duration,
            type: t.type,
            owner: t.owner,
            pageId: '',
            status: 'pending',
            assignedTo: null
        });
    });
    
    // 更新
    updateTaskQueue();
    assignTasksToWorkers();
    updateWorkerList();
    updateCustomTaskList();
    updateMeetingList();
    renderGanttChart();
    saveToLocalStorage();
}