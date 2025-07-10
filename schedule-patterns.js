// スケジュールパターンのデータ生成
function generateBalancedSchedule() {
    // 平準化パターン: 負荷を分散させて週次タスクを均等に
    const totalPages = scheduleData.pages.length;
    const totalWeeks = scheduleData.projectWeeks || 18;
    let pagesPerWeek = new Array(totalWeeks).fill(0);
    
    // 1ページ完了に必要な週数: 9週（工程数9 ÷ 週1タスク進行）
    const weeksPerPageCompletion = 9;
    
    // 最後のページが確実に完了するための最遅開始週
    const latestStartWeek = Math.max(1, totalWeeks - weeksPerPageCompletion);
    
    // 理想的な週次タスク数を計算（総タスク数を週数で割る）
    const totalTasks = totalPages * scheduleData.taskCycle.length;
    const idealTasksPerWeek = Math.ceil(totalTasks / totalWeeks);
    
    // 平準化パターン：ページを均等に開始し、週次タスクを平準化
    // 35ページを9週間で開始する（週4ページずつ）
    const pagesPerStartWeek = Math.ceil(totalPages / latestStartWeek);
    let remainingPages = totalPages;
    
    for (let week = 0; week < latestStartWeek && remainingPages > 0; week++) {
        if (week < 8) {
            // 最初の8週間は4ページずつ
            pagesPerWeek[week] = Math.min(4, remainingPages);
        } else {
            // 残りを配分
            pagesPerWeek[week] = remainingPages;
        }
        remainingPages -= pagesPerWeek[week];
    }
    
    console.log('平準化パターンのページ配分:', pagesPerWeek);
    console.log('合計ページ数:', pagesPerWeek.reduce((sum, p) => sum + p, 0));
    console.log('理想的な週次タスク数:', idealTasksPerWeek);
    return generateScheduleWithPattern(pagesPerWeek);
}

function generateSmoothSchedule() {
    // スムーズパターン: 余裕を持たせた進行（最大35タスク程度）
    const totalPages = scheduleData.pages.length;
    const totalWeeks = scheduleData.projectWeeks || 18;
    let pagesPerWeek = new Array(totalWeeks).fill(0);
    let remainingPages = totalPages;
    
    // 重要: 1ページが完了するのに必要な実際の週数
    // 工程数9を1週間に1-2タスク進行すると仮定
    const weeksPerPageCompletion = 9;
    
    // 確実に完了させるため、最後のページは遅くとも (totalWeeks - weeksPerPageCompletion) 週目に開始する必要がある
    const absoluteLatestStart = totalWeeks - weeksPerPageCompletion;
    
    // スムーズパターンでは余裕を持たせるため、遅くとも必要な週数前には開始
    const targetCompletionWeek = totalWeeks; // 最終週まで使う
    const latestStartWeek = Math.max(1, targetCompletionWeek - weeksPerPageCompletion - 1);
    
    // 全ページを確実に開始するための週数を計算
    // スムーズパターンは余裕を持たせるため、週1-2ページのペースで進める
    const idealPagesPerWeek = 1.5;
    const neededWeeks = Math.ceil(totalPages / idealPagesPerWeek);
    
    // 実際に使用する開始週数（最大限週数を使う）
    const actualStartWeeks = Math.min(neededWeeks, latestStartWeek);
    
    // ページを配分
    if (actualStartWeeks > 0) {
        const basePagesPerWeek = Math.floor(totalPages / actualStartWeeks);
        const extraPages = totalPages % actualStartWeeks;
        
        for (let week = 0; week < actualStartWeeks && week < totalWeeks; week++) {
            // 基本配分 + 余りを最初の週に配分
            pagesPerWeek[week] = basePagesPerWeek + (week < extraPages ? 1 : 0);
            remainingPages -= pagesPerWeek[week];
        }
    }
    
    // 念のため、もし残りページがある場合は最初の利用可能な週に配分
    if (remainingPages > 0) {
        console.warn('スムーズパターン: 残りページを再配分:', remainingPages);
        for (let i = 0; i < totalWeeks && remainingPages > 0; i++) {
            if (i <= latestStartWeek) {
                pagesPerWeek[i] += remainingPages;
                remainingPages = 0;
                break;
            }
        }
    }
    
    console.log('スムーズパターンのページ配分:', pagesPerWeek);
    console.log('合計ページ数:', pagesPerWeek.reduce((sum, p) => sum + p, 0));
    console.log('開始週数:', actualStartWeeks, '最遅開始週:', latestStartWeek);
    
    return generateScheduleWithPattern(pagesPerWeek);
}

function generateCustomSchedule() {
    // 週次タスク数に基づいて動的にページ配分を計算
    const weeklyTasks = scheduleData.weeklyTasks;
    const totalPages = 35;
    let pagesPerWeek = new Array(18).fill(0);
    let remainingPages = totalPages;
    
    // まず、各週の目標タスク数から必要な新規ページ開始数を逆算
    const targetTasksPerWeek = weeklyTasks.map(w => w.tasks);
    
    // シミュレーションで最適なページ配分を見つける
    let bestPagesPerWeek = null;
    let bestDifference = Infinity;
    
    // いくつかの開始パターンを試す
    for (let startWeeks = 4; startWeeks <= 8; startWeeks++) {
        let testPagesPerWeek = new Array(18).fill(0);
        let testRemainingPages = totalPages;
        
        // ページを開始週に配分
        for (let i = 0; i < startWeeks && testRemainingPages > 0; i++) {
            const pagesThisWeek = Math.floor(totalPages / startWeeks);
            testPagesPerWeek[i] = Math.min(pagesThisWeek, testRemainingPages);
            testRemainingPages -= testPagesPerWeek[i];
        }
        
        // 残りページを最初の週に追加
        for (let i = 0; i < startWeeks && testRemainingPages > 0; i++) {
            testPagesPerWeek[i]++;
            testRemainingPages--;
        }
        
        // このパターンでスケジュールを生成し、タスク数を計算
        const testMeetings = generateScheduleWithPattern(testPagesPerWeek);
        let totalDifference = 0;
        
        for (let week = 0; week < 18; week++) {
            const actualTasks = testMeetings[week].meetingTasks.length + testMeetings[week].weekTasks.length;
            const targetTasks = targetTasksPerWeek[week];
            totalDifference += Math.abs(actualTasks - targetTasks);
        }
        
        if (totalDifference < bestDifference) {
            bestDifference = totalDifference;
            bestPagesPerWeek = testPagesPerWeek;
        }
    }
    
    // 最適なパターンをさらに調整
    pagesPerWeek = bestPagesPerWeek;
    
    // 微調整: 目標に近づけるためにページ配分を調整
    for (let iteration = 0; iteration < 10; iteration++) {
        const testMeetings = generateScheduleWithPattern(pagesPerWeek);
        let improved = false;
        
        for (let week = 0; week < 10; week++) {
            const actualTasks = testMeetings[week].meetingTasks.length + testMeetings[week].weekTasks.length;
            const targetTasks = targetTasksPerWeek[week];
            
            if (actualTasks > targetTasks + 2 && week < 17) {
                // タスクが多すぎる場合、ページを後の週に移動
                for (let i = week; i >= 0; i--) {
                    if (pagesPerWeek[i] > 0) {
                        pagesPerWeek[i]--;
                        pagesPerWeek[Math.min(week + 1, 17)]++;
                        improved = true;
                        break;
                    }
                }
            } else if (actualTasks < targetTasks - 2 && week > 0) {
                // タスクが少なすぎる場合、ページを前の週に移動
                for (let i = week + 1; i < 18; i++) {
                    if (pagesPerWeek[i] > 0) {
                        pagesPerWeek[i]--;
                        pagesPerWeek[week]++;
                        improved = true;
                        break;
                    }
                }
            }
        }
        
        if (!improved) break;
    }
    
    console.log('カスタムパターンのページ配分:', pagesPerWeek);
    console.log('合計ページ数:', pagesPerWeek.reduce((sum, p) => sum + p, 0));
    console.log('週次タスク目標:', weeklyTasks.map(w => w.tasks));
    
    return generateScheduleWithPattern(pagesPerWeek);
}

function generateScheduleWithPattern(pagesPerWeek) {
    const pages = scheduleData.pages;
    const meetings = [];
    let taskNo = 1;
    let pageIndex = 0;
    
    // 各ページの進捗状況を管理
    const pageProgress = pages.map(page => ({
        page: page,
        currentStage: 0, // 0:未着手, 1:PC設計提出済, 2:PC設計確定済, 3:SP設計提出済, 4:SP設計確定済, 5:PCデザイン提出済, 6:PCデザイン確定済, 7:SPデザイン提出済, 8:SPデザイン確定済, 9:PCコーディング提出済, 10:PCコーディング確定済, 11:SPコーディング提出済, 12:SPコーディング確定済
        lastMeetingAction: 0
    }));
    
    // プロジェクト週数分のミーティングを生成
    const totalWeeks = scheduleData.projectWeeks || 18;
    for (let week = 0; week < totalWeeks; week++) {
        const meetingTasks = [];
        const weekTasks = [];
        
        // 新規ページの開始
        const newPagesCount = pagesPerWeek[week] || 0;
        const taskCycle = scheduleData.taskCycle || [
            "PCデザイン提出", "PCデザイン修正依頼提出", "PCデザイン修正版提出&確認確定",
            "SPデザイン提出", "SPデザイン修正依頼提出", "SPデザイン修正版提出&確認確定",
            "PC/SPコーディング提出", "PC/SPコーディング修正依頼提出", "PC/SPコーディング修正版提出&確認確定"
        ];
        
        for (let i = 0; i < newPagesCount && pageIndex < pages.length; i++) {
            const page = pageProgress[pageIndex];
            
            // 最初のタスク
            if (taskCycle.length > 0) {
                meetingTasks.push({
                    taskNo: String(taskNo++).padStart(3, '0'),
                    page: page.page,
                    process: taskCycle[0]
                });
                page.currentStage = 1;
                page.lastMeetingAction = week + 1;
                
                // 次が修正依頼提出の場合は同じ週内に追加（3営業日以内ルール）
                if (taskCycle.length > 1 && taskCycle[1].includes("修正依頼提出")) {
                    weekTasks.push({
                        taskNo: String(taskNo++).padStart(3, '0'),
                        page: page.page,
                        process: taskCycle[1]
                    });
                    page.currentStage = 2;
                }
            }
            
            pageIndex++;
        }
        
        // 既存ページの進行
        for (let idx = 0; idx < pageProgress.length; idx++) {
            const page = pageProgress[idx];
            if (page.currentStage === 0) continue; // 未着手
            
            const weeksSinceLastAction = (week + 1) - page.lastMeetingAction;
            
            // タスクサイクルから適切なプロセスを取得
            const taskCycle = scheduleData.taskCycle || [
                "PC設計提出", "PC設計修正依頼提出", "PC設計修正版提出&確認確定",
                "SP設計提出", "SP設計修正依頼提出", "SP設計修正版提出&確認確定",
                "PCデザイン提出", "PCデザイン修正依頼提出", "PCデザイン修正版提出&確認確定",
                "SPデザイン提出", "SPデザイン修正依頼提出", "SPデザイン修正版提出&確認確定",
                "PCコーディング提出", "PCコーディング修正依頼提出", "PCコーディング修正版提出&確認確定",
                "SPコーディング提出", "SPコーディング修正依頼提出", "SPコーディング修正版提出&確認確定"
            ];
            
            // 現在のタスクを確認
            if (page.currentStage < taskCycle.length) {
                const currentProcess = taskCycle[page.currentStage];
                
                // 修正依頼提出タスクは案提出後3営業日以内（同週内）に追加
                if (currentProcess.includes("修正依頼提出")) {
                    // 前のタスクが提出済みなら、同じ週に修正依頼提出を追加
                    if (page.lastMeetingAction === week + 1) {
                        weekTasks.push({
                            taskNo: String(taskNo++).padStart(3, '0'),
                            page: page.page,
                            process: currentProcess
                        });
                        page.currentStage++;
                    }
                }
                // 1週間後の処理
                else if (weeksSinceLastAction === 1) {
                    // タスクを追加
                    meetingTasks.push({
                        taskNo: String(taskNo++).padStart(3, '0'),
                        page: page.page,
                        process: currentProcess
                    });
                    
                    page.currentStage++;
                    page.lastMeetingAction = week + 1;
                    
                    // 次のタスクが修正依頼提出なら同じ週に追加
                    if (page.currentStage < taskCycle.length) {
                        const nextProcess = taskCycle[page.currentStage];
                        if (nextProcess.includes("修正依頼提出")) {
                            weekTasks.push({
                                taskNo: String(taskNo++).padStart(3, '0'),
                                page: page.page,
                                process: nextProcess
                            });
                            page.currentStage++;
                        }
                    }
                }
            }
            
            // 2週間以上経過している場合の処理
            if (weeksSinceLastAction >= 2 && page.currentStage < taskCycle.length) {
                const currentProcess = taskCycle[page.currentStage];
                
                // 修正依頼提出タスクは週内作業に追加
                if (currentProcess.includes("修正依頼提出")) {
                    weekTasks.push({
                        taskNo: String(taskNo++).padStart(3, '0'),
                        page: page.page,
                        process: currentProcess
                    });
                } else {
                    // それ以外はミーティングタスクに追加
                    meetingTasks.push({
                        taskNo: String(taskNo++).padStart(3, '0'),
                        page: page.page,
                        process: currentProcess
                    });
                }
                
                page.currentStage++;
                page.lastMeetingAction = week + 1;
                
                // 次のタスクが修正依頼提出なら同じ週に追加
                if (page.currentStage < taskCycle.length) {
                    const nextProcess = taskCycle[page.currentStage];
                    if (nextProcess.includes("修正依頼提出")) {
                        weekTasks.push({
                            taskNo: String(taskNo++).padStart(3, '0'),
                            page: page.page,
                            process: nextProcess
                        });
                        page.currentStage++;
                    }
                }
            }
        }
        
        // 進捗計算
        const totalStages = taskCycle.length;
        const completed = pageProgress.filter(p => p.currentStage >= totalStages).length;
        const inProgress = pageProgress.filter(p => p.currentStage > 0 && p.currentStage < totalStages).length;
        const notStarted = pageProgress.filter(p => p.currentStage === 0).length;
        
        meetings.push({
            meetingNo: week + 1,
            date: scheduleData.weeklyTasks && scheduleData.weeklyTasks[week] ? scheduleData.weeklyTasks[week].date : `第${week + 1}週`,
            meetingTasks: meetingTasks,
            weekTasks: weekTasks,
            progress: { completed, inProgress, notStarted }
        });
    }
    
    return meetings;
}

// グローバルスコープに公開
window.generateBalancedSchedule = generateBalancedSchedule;
window.generateSmoothSchedule = generateSmoothSchedule;
window.generateCustomSchedule = generateCustomSchedule;
window.generateScheduleWithPattern = generateScheduleWithPattern;