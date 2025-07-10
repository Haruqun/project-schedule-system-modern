// 現在のスケジュールパターン
let currentPattern = "original";

// 初期ロードフラグ
let isInitialLoad = true;

// メイン処理
document.addEventListener("DOMContentLoaded", function () {
  // 初期開始日を設定（今日から次の水曜日）
  const today = new Date();
  const nextWednesday = new Date(today);
  const dayOfWeek = today.getDay();
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7 || 7; // 水曜日は3
  nextWednesday.setDate(today.getDate() + daysUntilWednesday);
  document.getElementById("projectStartDate").value = nextWednesday
    .toISOString()
    .split("T")[0];

  // プロジェクトデータを初期化（テキストエリアから読み込み）
  updateProjectData();

  // 初期データの計算
  calculateInitialStats();

  // 初期日付を設定
  updateScheduleDates();

  // プロジェクト期間を計算・更新
  updateProjectWeeks();
  
  // スケジュール達成可能性をチェック
  checkScheduleFeasibility();

  // グラフの描画
  drawTaskChart();

  // スケジュールの表示
  displaySchedule();

  // 統計情報の初期表示
  updateStats();

  // 初期ロード完了
  isInitialLoad = false;
});

// 第1週開始ページ数が変更されたときにonchangeイベントハンドラとして使用
window.onFirstWeekPagesChange = onFirstWeekPagesChange;

// 初期統計データの計算
function calculateInitialStats() {
  const pages = scheduleData.pages || [];
  const taskCycle = scheduleData.taskCycle || [];
  const projectWeeks = scheduleData.projectWeeks || 18;

  // 総タスク数
  const totalTasks = pages.length * taskCycle.length;

  // ecbeing側とクライアント側のタスク数を計算
  let devTasks = 0;
  let clientTasks = 0;

  taskCycle.forEach((task) => {
    const taskType = getTaskType(task);
    if (taskType === "dev") {
      devTasks += pages.length;
    } else if (taskType === "client") {
      clientTasks += pages.length;
    } else if (taskType === "both") {
      devTasks += pages.length;
      clientTasks += pages.length;
    }
  });

  // 値を更新
  document.getElementById("total-dev-tasks").textContent = devTasks;
  document.getElementById("total-client-tasks").textContent = clientTasks;

  // プロジェクト概要の更新
  document.getElementById("overview-page-count").textContent = pages.length;
  document.getElementById("overview-total-tasks").textContent = totalTasks;
  document.getElementById("overview-week-count").textContent = projectWeeks;

  // 統計カードの更新
  document.querySelector(".stat-card:nth-child(1) .stat-value").textContent =
    pages.length;
  document.querySelector(".stat-card:nth-child(2) .stat-value").textContent =
    projectWeeks;
  document.querySelector(".stat-card:nth-child(3) .stat-value").textContent =
    totalTasks;
}

// 週次タスク量推移グラフの描画
function drawTaskChart() {
  const canvas = document.getElementById("taskChart");
  const ctx = canvas.getContext("2d");

  // キャンバスサイズの設定
  canvas.width = canvas.offsetWidth;
  canvas.height = 400;

  // タスク上限を取得
  const taskLimit = parseInt(document.getElementById("taskLimit")?.value) || 0;
  const firstWeekPages = parseInt(document.getElementById("firstWeekPages")?.value) || 7;
  const totalPages = scheduleData.pages.length;
  const totalWeeks = scheduleData.projectWeeks || 18;

  // タスク上限が設定されている場合は最適化されたページ配分を使用
  let pagesPerWeek;
  if (taskLimit > 0) {
    pagesPerWeek = optimizePageDistribution(totalPages, totalWeeks, firstWeekPages, taskLimit);
  } else {
    // 既存のロジックでページ配分を計算
    const meetings = generateMeetingsForPattern();
    const weeklyDevTasks = meetings.map((meeting, index) => {
      let devCount = 0;
      meeting.meetingTasks.forEach((task) => {
        const taskType = getTaskType(task.process);
        if (taskType === "dev" || taskType === "both") devCount++;
      });
      meeting.weekTasks.forEach((task) => {
        const taskType = getTaskType(task.process);
        if (taskType === "dev" || taskType === "both") devCount++;
      });
      return {
        week: index + 1,
        tasks: devCount,
        meeting: scheduleData.weeklyTasks[index].meeting,
        date: scheduleData.weeklyTasks[index].date,
      };
    });
    
    const data = weeklyDevTasks;
    const maxTasks = Math.max(...data.map((d) => d.tasks));
    const padding = 60;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    const barWidth = (chartWidth / data.length) * 0.6;
    const spacing = chartWidth / data.length;

    // 背景
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド線とY軸ラベル
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.font = "12px Arial";
    ctx.fillStyle = "#666";

    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      const value = Math.round((maxTasks * (5 - i)) / 5);

      // グリッド線
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();

      // Y軸ラベル
      ctx.textAlign = "right";
      ctx.fillText(value, padding - 10, y + 4);
    }

    // バーを描画
    data.forEach((d, index) => {
      const barHeight = (d.tasks / maxTasks) * chartHeight;
      const x = padding + index * spacing + (spacing - barWidth) / 2;
      const y = padding + chartHeight - barHeight;

      // バー
      ctx.fillStyle = "#5B9BD5";
      ctx.fillRect(x, y, barWidth, barHeight);

      // 値ラベル
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.font = "bold 14px Arial";
      ctx.fillText(d.tasks, x + barWidth / 2, y - 5);

      // ピーク値の強調
      if (d.tasks === maxTasks) {
        ctx.fillStyle = "#e74c3c";
        ctx.fillText(`ピーク時`, x + barWidth / 2, y - 25);
        ctx.fillText(`${d.tasks}`, x + barWidth / 2, y - 5);
      }

      // X軸ラベル
      ctx.fillStyle = "#666";
      ctx.font = "11px Arial";
      ctx.save();
      ctx.translate(x + barWidth / 2, padding + chartHeight + 15);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = "right";
      ctx.fillText(d.meeting, 0, 0);
      ctx.restore();
    });

    // タイトル
    ctx.fillStyle = "#333";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "週次ecbeing側タスク数",
      canvas.width / 2,
      canvas.height - 10
    );

    // 最大週次タスク数の表示を更新
    const peakTasks = Math.max(...data.map((d) => d.tasks));
    const peakTaskElement = document.querySelector(
      ".stat-card:nth-child(4) .stat-value"
    );
    if (peakTaskElement) {
      peakTaskElement.textContent = peakTasks;
    }
    
    return;
  }
  
  // タスク上限が設定されている場合、simulateWeeklyTasksを使用して正確な週次タスク数を計算
  const weeklyTasks = simulateWeeklyTasks(pagesPerWeek, totalWeeks, scheduleData.taskCycle.length);
  
  const weeklyDevTasks = weeklyTasks.map((tasks, index) => {
    return {
      week: index + 1,
      tasks: tasks,
      meeting: scheduleData.weeklyTasks[index].meeting,
      date: scheduleData.weeklyTasks[index].date,
    };
  });

  const data = weeklyDevTasks;
  const maxTasks = Math.max(...data.map((d) => d.tasks));
  const padding = 60;
  const chartWidth = canvas.width - 2 * padding;
  const chartHeight = canvas.height - 2 * padding;
  const barWidth = (chartWidth / data.length) * 0.6;
  const spacing = chartWidth / data.length;

  // 背景
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // グリッド線とY軸ラベル
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;
  ctx.font = "12px Arial";
  ctx.fillStyle = "#666";

  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight / 5) * i;
    const value = Math.round((maxTasks * (5 - i)) / 5);

    // グリッド線
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();

    // Y軸ラベル
    ctx.fillText(value, padding - 30, y + 4);
  }

  // バーの描画
  data.forEach((week, index) => {
    const x = padding + index * spacing + (spacing - barWidth) / 2;
    const barHeight = (week.tasks / maxTasks) * chartHeight;
    const y = padding + chartHeight - barHeight;

    // グラデーション
    const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
    gradient.addColorStop(0, "#3498db");
    gradient.addColorStop(1, "#2980b9");

    // バー
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barHeight);

    // タスク数
    ctx.fillStyle = "#2c3e50";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(week.tasks, x + barWidth / 2, y - 5);

    // 週ラベル
    ctx.font = "12px Arial";
    ctx.fillText(week.meeting, x + barWidth / 2, padding + chartHeight + 20);

    // ピーク時のマーク
    if (week.tasks === maxTasks) {
      ctx.fillStyle = "#e74c3c";
      ctx.font = "bold 12px Arial";
      ctx.fillText("ピーク時", x + barWidth / 2, y - 20);
    }
  });

  // 軸ラベル
  ctx.fillStyle = "#2c3e50";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("週次ecbeing側タスク数", canvas.width / 2, canvas.height - 10);
  
  // 最大週次タスク数の表示を更新
  const peakTasks = Math.max(...data.map((d) => d.tasks));
  const peakTaskElement = document.querySelector(
    ".stat-card:nth-child(4) .stat-value"
  );
  if (peakTaskElement) {
    peakTaskElement.textContent = peakTasks;
  }
}

// スケジュールの表示
function displaySchedule() {
  const container = document.getElementById("schedule-container");

  // パターンに応じてミーティングデータを生成
  const meetings = generateMeetingsForPattern();

  // 全ミーティングを表示
  meetings.forEach((meeting) => {
    const section = createMeetingSection(meeting);
    container.appendChild(section);
  });

  // 最終統計情報
  const maxTasks = Math.max(...scheduleData.weeklyTasks.map((d) => d.tasks));
  const avgTasks = Math.round(
    scheduleData.weeklyTasks.reduce((sum, d) => sum + d.tasks, 0) /
      scheduleData.weeklyTasks.length
  );

  // 最終週の進捗状況を取得
  const lastMeeting = meetings[meetings.length - 1];
  const finalCompleted = lastMeeting.progress.completed;
  const finalInProgress = lastMeeting.progress.inProgress;
  const finalTotal =
    finalCompleted + finalInProgress + lastMeeting.progress.notStarted;
  const finalCompletionRate = Math.round((finalCompleted / finalTotal) * 100);

  const finalStats = document.createElement("div");
  finalStats.className = "project-summary-sticky";
  finalStats.style.cssText = `
            position: sticky;
            bottom: 0;
            margin-top: 40px;
            border: none;
            border-radius: 12px 12px 0 0;
            overflow: hidden;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 -4px 16px rgba(0,0,0,0.15);
            z-index: 1000;
        `;

  const statsHeader = document.createElement("div");
  statsHeader.style.cssText = `
            padding: 25px;
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
        `;
  statsHeader.innerHTML = "🎉 プロジェクト完了サマリー";

  const statsContent = document.createElement("div");
  statsContent.style.cssText = `
            background: white;
            padding: 20px 30px 30px;
            max-height: 300px;
            overflow-y: auto;
        `;

  const statsGrid = document.createElement("div");
  statsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        `;

  // 納期達成状況を判定
  const isDeadlineAchieved =
    finalCompletionRate === 100 && finalInProgress === 0;
  const deadlineStatus = isDeadlineAchieved
    ? `<div style="font-size: 36px; font-weight: bold; color: #28a745; margin-bottom: 5px;">✓</div>`
    : `<div style="font-size: 36px; font-weight: bold; color: #dc3545; margin-bottom: 5px;">✗</div>`;
  const deadlineText = isDeadlineAchieved ? "納期達成" : "納期未達成";

  statsGrid.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 36px; font-weight: bold; color: #667eea; margin-bottom: 5px;">${finalCompletionRate}%</div>
                <div style="font-size: 14px; color: #6c757d;">完了率</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                ${deadlineStatus}
                <div style="font-size: 14px; color: #6c757d;">${deadlineText}</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 36px; font-weight: bold; color: #e74c3c; margin-bottom: 5px;">${maxTasks}</div>
                <div style="font-size: 14px; color: #6c757d;">最大週次タスク</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 36px; font-weight: bold; color: #f39c12; margin-bottom: 5px;">${avgTasks}</div>
                <div style="font-size: 14px; color: #6c757d;">平均週次タスク</div>
            </div>
        `;

  const timeline = document.createElement("div");
  timeline.style.cssText = `
            padding: 20px;
            background: linear-gradient(to right, #e3f2fd 0%, #f3e5f5 100%);
            border-radius: 8px;
            text-align: center;
        `;
  timeline.innerHTML = `
            <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 20px;">
                <div>
                    <div style="font-size: 12px; color: #6c757d;">開始</div>
                    <div style="font-weight: bold; color: #1976d2;">${
                      scheduleData.projectInfo?.startDate || "-"
                    }</div>
                </div>
                <div style="font-size: 24px; color: #9c27b0;">→</div>
                <div>
                    <div style="font-size: 12px; color: #6c757d;">納期</div>
                    <div style="font-weight: bold; color: #388e3c;">${
                      scheduleData.projectInfo?.deadline || "-"
                    }</div>
                </div>
                <div style="font-size: 24px; color: #9c27b0;">→</div>
                <div>
                    <div style="font-size: 12px; color: #6c757d;">完了</div>
                    <div style="font-weight: bold; color: #7b1fa2;">${
                      scheduleData.projectInfo?.endDate || "-"
                    }</div>
                </div>
            </div>
        `;

  statsContent.appendChild(statsGrid);
  statsContent.appendChild(timeline);

  // 未完了タスクがある場合は詳細な警告を表示
  if (!isDeadlineAchieved) {
    const warningDiv = document.createElement("div");
    warningDiv.style.cssText = `
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 8px;
        padding: 15px;
        margin-top: 20px;
        color: #721c24;
        font-size: 14px;
        `;

    let warningMessage = "<strong>⚠️ 納期未達成の理由:</strong><br>";

    if (finalInProgress > 0) {
      warningMessage += `• ${finalInProgress}ページが進行中のまま残っています<br>`;
    }

    if (lastMeeting.progress.notStarted > 0) {
      warningMessage += `• ${lastMeeting.progress.notStarted}ページが未着手です<br>`;
    }

    if (finalCompletionRate < 100) {
      warningMessage += `• 完了率が${finalCompletionRate}%で100%に達していません<br>`;
    }

    warningMessage +=
      "<br>最終週にまだ修正依頼提出などの作業が残っているため、プロジェクトが完了していません。";

    warningDiv.innerHTML = warningMessage;
    statsContent.appendChild(warningDiv);
  }

  finalStats.appendChild(statsHeader);
  finalStats.appendChild(statsContent);

  container.appendChild(finalStats);
}

// プロジェクト期間を更新する関数
function updateProjectWeeks() {
  const totalPages = scheduleData.pages.length;
  const firstWeekPages = parseInt(document.getElementById("firstWeekPages")?.value) || 7;
  const taskLimit = parseInt(document.getElementById("taskLimit")?.value) || 0;
  
  // 必要な週数を計算
  const requiredWeeks = calculateRequiredWeeks(totalPages, firstWeekPages, taskLimit);
  
  // scheduleData.projectWeeksを更新
  scheduleData.projectWeeks = requiredWeeks;
  
  // 表示を更新
  const calculatedWeeksElement = document.getElementById("calculatedWeeks");
  if (calculatedWeeksElement) {
    calculatedWeeksElement.textContent = requiredWeeks;
  }
  
  // 統計情報も更新
  const weekCountElements = document.querySelectorAll("#overview-week-count");
  weekCountElements.forEach(element => {
    element.textContent = requiredWeeks;
  });
  
  // プロジェクト期間の表示を更新
  const projectWeeksElement = document.querySelector(".stat-card:nth-child(2) .stat-value");
  if (projectWeeksElement) {
    projectWeeksElement.textContent = requiredWeeks;
  }
  
  // 週次タスクデータも更新
  updateScheduleDates();
}

// 必要なプロジェクト期間を計算する関数
function calculateRequiredWeeks(totalPages, firstWeekPages, taskLimit) {
  const weeksPerPageCompletion = 9; // 1ページ完了に必要な週数
  
  // タスク上限が設定されていない場合
  if (!taskLimit || taskLimit === 0) {
    // デフォルトの期間（18週間）または最小必要週数のいずれか大きい方
    return Math.max(18, weeksPerPageCompletion + Math.ceil(totalPages / 4));
  }
  
  // タスク上限が設定されている場合のシミュレーション
  let testWeeks = weeksPerPageCompletion + 1; // 最小必要週数から開始
  const maxWeeks = 52; // 最大52週間まで試行
  
  while (testWeeks <= maxWeeks) {
    // この週数でページ配分を試みる
    const distribution = optimizePageDistribution(totalPages, testWeeks, firstWeekPages, taskLimit);
    const totalDistributed = distribution.reduce((sum, pages) => sum + pages, 0);
    
    // 全ページが配分できた場合
    if (totalDistributed >= totalPages) {
      // 最後のページが完了するまでの時間を確認
      let lastPageStartWeek = 0;
      for (let i = distribution.length - 1; i >= 0; i--) {
        if (distribution[i] > 0) {
          lastPageStartWeek = i;
          break;
        }
      }
      
      // 最後のページが完了するのに必要な週数
      const requiredWeeks = lastPageStartWeek + weeksPerPageCompletion;
      
      if (requiredWeeks <= testWeeks) {
        return testWeeks;
      }
    }
    
    testWeeks++;
  }
  
  // 52週間でも収まらない場合は52週間を返す
  return maxWeeks;
}

// タスク上限を考慮したページ配分最適化関数
function optimizePageDistribution(
  totalPages,
  totalWeeks,
  firstWeekPages,
  taskLimit
) {
  const weeksPerPageCompletion = 9;
  
  // シンプルな配分から開始
  let distribution = new Array(totalWeeks).fill(0);
  distribution[0] = firstWeekPages;
  let remaining = totalPages - firstWeekPages;
  
  // タスク上限が設定されていない場合は従来の配分
  if (!taskLimit || taskLimit === 0) {
    // プロジェクト全体に分散
    const maxStartWeek = Math.max(totalWeeks - weeksPerPageCompletion, Math.floor(totalWeeks * 0.7));
    const avgPagesPerWeek = remaining / (maxStartWeek - 1);
    
    for (let week = 1; week < maxStartWeek && remaining > 0; week++) {
      const pages = Math.min(Math.ceil(avgPagesPerWeek), remaining);
      distribution[week] = pages;
      remaining -= pages;
    }
    
    return distribution;
  }
  
  // タスク上限が設定されている場合
  // 各週のタスク数をシミュレートして正確な配分を計算
  const pageStates = [];
  
  // 第1週のページを追加
  for (let i = 0; i < firstWeekPages; i++) {
    pageStates.push({
      startWeek: 0,
      currentPhase: 0,
      completedPhases: 0
    });
  }
  
  // 残りのページを順次追加
  for (let week = 1; week < totalWeeks && remaining > 0; week++) {
    // 現在週のecbeingタスク数を正確に計算
    let weekTasks = 0;
    
    // 既存ページのタスクをカウント
    pageStates.forEach(page => {
      const weeksSinceStart = week - page.startWeek;
      
      // 各フェーズ（PC、SP、コーディング）は3週間
      // 0週目: 提出（ecbeingタスク）
      // 1週目: 修正依頼（クライアントタスク）
      // 2週目: 修正版提出（ecbeingタスク）
      for (let phase = 0; phase < 3; phase++) {
        const phaseStartWeek = phase * 3;
        const weekInPhase = weeksSinceStart - phaseStartWeek;
        
        if (weekInPhase === 0 || weekInPhase === 2) {
          // 提出週または修正版提出週
          if (weekInPhase >= 0 && page.completedPhases <= phase) {
            weekTasks++;
            break; // 1ページは1週間に1タスクのみ
          }
        }
      }
    });
    
    // 上限に余裕があれば新規ページを追加
    let newPages = 0;
    while (remaining > 0 && weekTasks + newPages < taskLimit) {
      pageStates.push({
        startWeek: week,
        currentPhase: 0,
        completedPhases: 0
      });
      
      newPages++;
      remaining--;
      weekTasks++; // 新規ページの第1週目は必ず1タスク
      
      if (weekTasks >= taskLimit) break;
    }
    
    distribution[week] = newPages;
  }
  
  // 残りのページがある場合は警告
  if (remaining > 0) {
    console.warn(`タスク上限${taskLimit}の制約により、${remaining}ページが期間内に開始できません`);
  }
  
  return distribution;
}

// 週次タスク数をシミュレート
function simulateWeeklyTasks(pagesPerWeek, totalWeeks, tasksPerPage) {
  const weeklyTasks = new Array(totalWeeks).fill(0);
  const pageStates = [];
  const taskCycle = scheduleData.taskCycle;

  // ページの初期化
  for (let week = 0; week < totalWeeks; week++) {
    for (let i = 0; i < pagesPerWeek[week]; i++) {
      pageStates.push({
        startWeek: week,
        currentStage: 0,
        phase: 0, // 0: PC, 1: SP, 2: Coding
      });
    }
  }

  // 各週のタスクを計算
  for (let week = 0; week < totalWeeks; week++) {
    pageStates.forEach((page) => {
      if (page.currentStage >= tasksPerPage) return;

      const weeksSinceStart = week - page.startWeek;
      const phase = page.phase;

      // 各フェーズのタスク（例：PCデザイン、SPデザイン、コーディング）
      // フェーズごとに3週間（提出→修正依頼→修正版提出&確定）
      if (phase < 3) {
        const phaseWeek = weeksSinceStart - phase * 3;
        
        if (phaseWeek === 0) {
          // 提出週（ecbeingタスク）
          weeklyTasks[week]++;
          page.currentStage++;
        } else if (phaseWeek === 1) {
          // 修正依頼週（クライアントタスク）
          // シミュレーションではecbeingタスクのみカウント
          page.currentStage++;
        } else if (phaseWeek === 2) {
          // 修正版提出&確定週（ecbeingタスク）
          weeklyTasks[week]++;
          page.currentStage++;
          page.phase++; // 次のフェーズへ
        }
      }
    });
  }

  return weeklyTasks;
}

// 分散を計算
function calculateVariance(values) {
  const validValues = values.filter((v) => v > 0);
  if (validValues.length === 0) return 0;

  const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
  const variance =
    validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
    validValues.length;
  return Math.sqrt(variance); // 標準偏差
}

// ミーティングデータを生成
function generateMeetingsForPattern() {
  // 第1週の開始ページ数を取得
  const firstWeekPagesInput = document.getElementById("firstWeekPages");
  const firstWeekPages = firstWeekPagesInput
    ? parseInt(firstWeekPagesInput.value) || 7
    : 7;

  const totalPages = scheduleData.pages.length;
  const totalWeeks = scheduleData.projectWeeks || 18;
  const tasksPerPage = scheduleData.taskCycle.length; // 9工程

  // 1ページあたりの実際の進行速度を考慮
  // PCデザイン(3工程): 3週間、SPデザイン(3工程): 3週間、コーディング(3工程): 3週間 = 計9週間
  const weeksPerPageCompletion = 9;

  // 全ページを完了させるには理論上 35ページ × 9週間 = 315週間分の作業が必要
  // しかし18週間で完了させるには並行作業が必要

  // 最適なページ配分を計算
  let pagesPerWeek = new Array(totalWeeks).fill(0);

  // 18週間をフルに活用するため、ページを段階的に開始
  // 各ページが完了するまで9週間必要なので、最後のページは遅くとも10週目には開始する必要がある
  const latestStartWeek = Math.max(1, totalWeeks - weeksPerPageCompletion);

  // 第1週の開始ページ数を設定
  pagesPerWeek[0] = Math.min(firstWeekPages, totalPages);
  let remainingPages = totalPages - pagesPerWeek[0];

  if (remainingPages > 0) {
    // タスク上限が設定されている場合
    const taskLimit = parseInt(document.getElementById("taskLimit")?.value) || 0;

    if (taskLimit > 0) {
      // タスク上限を考慮したページ配分
      pagesPerWeek = optimizePageDistribution(
        totalPages,
        totalWeeks,
        firstWeekPages,
        taskLimit
      );
    } else {
      // 従来の配分方法
      if (totalWeeks >= 18) {
        // 18週間以上の場合：前半から中盤にかけて多めに配分
        const weeks = [2, 2, 2, 3, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 0, 0, 0];
        for (
          let i = 1;
          i < totalWeeks && i < weeks.length && remainingPages > 0;
          i++
        ) {
          const toAdd = Math.min(weeks[i], remainingPages);
          pagesPerWeek[i] = toAdd;
          remainingPages -= toAdd;
        }

        // まだ残っている場合は中盤に追加
        for (let i = 4; i < 12 && remainingPages > 0; i++) {
          if (pagesPerWeek[i] < 4) {
            const toAdd = Math.min(1, remainingPages);
            pagesPerWeek[i] += toAdd;
            remainingPages -= toAdd;
          }
        }
      } else {
        // 18週間未満の場合：均等に配分
        const weeksToDistribute = Math.min(latestStartWeek, totalWeeks - 1);
        const basePerWeek = Math.floor(remainingPages / weeksToDistribute);
        const extra = remainingPages % weeksToDistribute;

        for (let i = 1; i <= weeksToDistribute && i < totalWeeks; i++) {
          pagesPerWeek[i] = basePerWeek + (i <= extra ? 1 : 0);
        }
        remainingPages = 0;
      }
    }
  }

  // 合計が35ページになるように調整
  let currentTotal = pagesPerWeek.reduce((sum, p) => sum + p, 0);
  remainingPages = totalPages - currentTotal;

  if (remainingPages > 0) {
    // 残りページを中間週に配分
    for (let i = 3; i < latestStartWeek && remainingPages > 0; i++) {
      if (pagesPerWeek[i] < 4) {
        const toAdd = Math.min(remainingPages, 4 - pagesPerWeek[i]);
        pagesPerWeek[i] += toAdd;
        remainingPages -= toAdd;
      }
    }
  } else if (remainingPages < 0) {
    // 多すぎる場合は後半から削減
    for (let i = latestStartWeek - 1; i >= 0 && remainingPages < 0; i--) {
      if (pagesPerWeek[i] > 1) {
        const toRemove = Math.min(pagesPerWeek[i] - 1, -remainingPages);
        pagesPerWeek[i] -= toRemove;
        remainingPages += toRemove;
      }
    }
  }

  console.log("第1週開始ページ数:", firstWeekPages);
  console.log("ページ配分:", pagesPerWeek);
  console.log(
    "合計ページ数:",
    pagesPerWeek.reduce((sum, p) => sum + p, 0)
  );

  return generateScheduleWithPattern(pagesPerWeek);
}

// タスクがecbeing側かクライアント側かを判定
function getTaskType(process) {
  // 修正版提出&確認確定は両方のタスク
  if (process.includes("修正版提出&確認確定")) {
    return "both";
  }
  // クライアント側のタスク
  const clientTasks = ["修正依頼提出", "確定"];
  return clientTasks.some((task) => process.includes(task)) ? "client" : "dev";
}

// ミーティングセクションの作成
function createMeetingSection(meeting) {
  const section = document.createElement("div");
  section.className = "meeting-section";
  section.style.cssText = `
            margin-bottom: 30px;
            border: none;
            border-radius: 12px;
            overflow: hidden;
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.07);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        `;

  section.onmouseover = () => {
    section.style.transform = "translateY(-2px)";
    section.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
  };

  section.onmouseout = () => {
    section.style.transform = "translateY(0)";
    section.style.boxShadow = "0 4px 6px rgba(0,0,0,0.07)";
  };

  const header = document.createElement("div");
  header.className = "meeting-header";
  header.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 25px;
            font-size: 18px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

  const headerLeft = document.createElement("div");
  headerLeft.innerHTML = `<span style="font-size: 24px; margin-right: 10px;">📅</span> 第${meeting.meetingNo}回ミーティング`;

  const headerRight = document.createElement("div");
  headerRight.style.cssText =
    "font-size: 14px; font-weight: normal; opacity: 0.9;";
  headerRight.textContent = meeting.date;

  header.appendChild(headerLeft);
  header.appendChild(headerRight);

  const content = document.createElement("div");
  content.className = "meeting-content";
  content.style.cssText = "padding: 0;";

  // タスク数の集計
  let devCount = 0;
  let clientCount = 0;

  meeting.meetingTasks.forEach((task) => {
    const taskType = getTaskType(task.process);
    if (taskType === "dev") devCount++;
    else if (taskType === "client") clientCount++;
    else if (taskType === "both") {
      devCount++;
      clientCount++;
    }
  });

  meeting.weekTasks.forEach((task) => {
    const taskType = getTaskType(task.process);
    if (taskType === "dev") devCount++;
    else if (taskType === "client") clientCount++;
    else if (taskType === "both") {
      devCount++;
      clientCount++;
    }
  });

  // タスクサマリー
  const summary = document.createElement("div");
  summary.className = "task-summary";
  summary.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            padding: 20px 25px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        `;

  const totalTasks = meeting.meetingTasks.length + meeting.weekTasks.length;
  const completionRate = Math.round((meeting.progress.completed / 35) * 100);

  summary.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #667eea;">${totalTasks}</div>
                <div style="font-size: 14px; color: #6c757d;">今週のタスク</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #e74c3c;">${devCount}</div>
                <div style="font-size: 14px; color: #6c757d;">ecbeing側</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #27ae60;">${clientCount}</div>
                <div style="font-size: 14px; color: #6c757d;">クライアント側</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #f39c12;">${completionRate}%</div>
                <div style="font-size: 14px; color: #6c757d;">完了率</div>
            </div>
        `;
  content.appendChild(summary);

  // タスクコンテナ
  const taskContainer = document.createElement("div");
  taskContainer.style.cssText = "padding: 25px;";

  // ミーティングタスク
  if (meeting.meetingTasks.length > 0) {
    const meetingGroup = document.createElement("div");
    meetingGroup.className = "task-group";
    meetingGroup.style.cssText = "margin-bottom: 25px;";

    const meetingTitle = document.createElement("div");
    meetingTitle.className = "task-group-title";
    meetingTitle.style.cssText = `
                font-weight: 600;
                color: #2c3e50;
                margin-bottom: 15px;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
    meetingTitle.innerHTML = `
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: #667eea; color: white; border-radius: 50%; font-size: 14px;">📋</span>
                ミーティングタスク
                <span style="background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: normal;">${meeting.meetingTasks.length}件</span>
            `;

    const meetingList = document.createElement("div");
    meetingList.style.cssText = "display: grid; gap: 10px;";

    meeting.meetingTasks.forEach((task) => {
      const item = document.createElement("div");
      const taskType = getTaskType(task.process);

      let borderColor = "#667eea";
      if (taskType === "client") borderColor = "#27ae60";
      else if (taskType === "both") borderColor = "#f39c12";

      item.style.cssText = `
                    padding: 15px;
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-left: 4px solid ${borderColor};
                    border-radius: 8px;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                `;

      item.onmouseover = () => {
        item.style.background = "#f8f9fa";
        item.style.transform = "translateX(4px)";
        item.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
      };

      item.onmouseout = () => {
        item.style.background = "white";
        item.style.transform = "translateX(0)";
        item.style.boxShadow = "none";
      };

      if (taskType === "both") {
        // 両方のタスクの場合は2つのラベルを作成
        const labels = document.createElement("div");
        labels.style.cssText = "display: flex; gap: 5px;";

        const devLabel = document.createElement("span");
        devLabel.className = "task-label dev";
        devLabel.style.cssText =
          "padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; background: #e74c3c;";
        devLabel.textContent = "ecbeing";

        const clientLabel = document.createElement("span");
        clientLabel.className = "task-label client";
        clientLabel.style.cssText =
          "padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; background: #27ae60;";
        clientLabel.textContent = "クライアント";

        labels.appendChild(devLabel);
        labels.appendChild(clientLabel);
        item.appendChild(labels);
      } else {
        const label = document.createElement("span");
        label.className = `task-label ${taskType}`;
        const bgColor = taskType === "dev" ? "#e74c3c" : "#27ae60";
        label.style.cssText = `padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; background: ${bgColor};`;
        label.textContent = taskType === "dev" ? "ecbeing" : "クライアント";
        item.appendChild(label);
      }

      const taskInfo = document.createElement("div");
      taskInfo.style.cssText = "flex: 1;";
      taskInfo.innerHTML = `
                    <div style="font-weight: 500; color: #2c3e50;">${task.process}</div>
                    <div style="font-size: 12px; color: #6c757d; margin-top: 2px;">${task.page}</div>
                `;

      const taskNo = document.createElement("span");
      taskNo.style.cssText = "font-size: 12px; color: #adb5bd;";
      taskNo.textContent = `#${task.taskNo}`;

      item.appendChild(taskInfo);
      item.appendChild(taskNo);
      meetingList.appendChild(item);
    });

    meetingGroup.appendChild(meetingTitle);
    meetingGroup.appendChild(meetingList);
    taskContainer.appendChild(meetingGroup);
  }

  // 週内作業
  if (meeting.weekTasks.length > 0) {
    const weekGroup = document.createElement("div");
    weekGroup.className = "task-group";

    const weekTitle = document.createElement("div");
    weekTitle.className = "task-group-title";
    weekTitle.style.cssText = `
                font-weight: 600;
                color: #2c3e50;
                margin-bottom: 15px;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
    weekTitle.innerHTML = `
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: #27ae60; color: white; border-radius: 50%; font-size: 14px;">⏰</span>
                週内作業（3営業日以内）
                <span style="background: #e8f5e9; color: #2e7d32; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: normal;">${meeting.weekTasks.length}件</span>
            `;

    const weekList = document.createElement("div");
    weekList.style.cssText = "display: grid; gap: 10px;";

    meeting.weekTasks.forEach((task) => {
      const item = document.createElement("div");
      const taskType = getTaskType(task.process);

      let borderColor = "#667eea";
      if (taskType === "client") borderColor = "#27ae60";
      else if (taskType === "both") borderColor = "#f39c12";

      item.style.cssText = `
                    padding: 15px;
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    border-left: 4px solid ${borderColor};
                    border-radius: 8px;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                `;

      item.onmouseover = () => {
        item.style.background = "#e6fffa";
        item.style.transform = "translateX(4px)";
        item.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
      };

      item.onmouseout = () => {
        item.style.background = "#f0fdf4";
        item.style.transform = "translateX(0)";
        item.style.boxShadow = "none";
      };

      if (taskType === "both") {
        // 両方のタスクの場合は2つのラベルを作成
        const labels = document.createElement("div");
        labels.style.cssText = "display: flex; gap: 5px;";

        const devLabel = document.createElement("span");
        devLabel.className = "task-label dev";
        devLabel.style.cssText =
          "padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; background: #e74c3c;";
        devLabel.textContent = "ecbeing";

        const clientLabel = document.createElement("span");
        clientLabel.className = "task-label client";
        clientLabel.style.cssText =
          "padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; background: #27ae60;";
        clientLabel.textContent = "クライアント";

        labels.appendChild(devLabel);
        labels.appendChild(clientLabel);
        item.appendChild(labels);
      } else {
        const label = document.createElement("span");
        label.className = `task-label ${taskType}`;
        const bgColor = taskType === "dev" ? "#e74c3c" : "#27ae60";
        label.style.cssText = `padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; background: ${bgColor};`;
        label.textContent = taskType === "dev" ? "ecbeing" : "クライアント";
        item.appendChild(label);
      }

      const taskInfo = document.createElement("div");
      taskInfo.style.cssText = "flex: 1;";
      taskInfo.innerHTML = `
                    <div style="font-weight: 500; color: #2c3e50;">${task.process}</div>
                    <div style="font-size: 12px; color: #6c757d; margin-top: 2px;">${task.page}</div>
                `;

      const taskNo = document.createElement("span");
      taskNo.style.cssText = "font-size: 12px; color: #adb5bd;";
      taskNo.textContent = `#${task.taskNo}`;

      item.appendChild(taskInfo);
      item.appendChild(taskNo);
      weekList.appendChild(item);
    });

    weekGroup.appendChild(weekTitle);
    weekGroup.appendChild(weekList);
    taskContainer.appendChild(weekGroup);
  }

  content.appendChild(taskContainer);

  // 進捗バー
  const progressBar = document.createElement("div");
  progressBar.style.cssText = `
            padding: 20px 25px;
            background: linear-gradient(to right, #f8f9fa 0%, #e9ecef 100%);
            border-top: 1px solid #dee2e6;
        `;

  const progressTitle = document.createElement("div");
  progressTitle.style.cssText =
    "font-size: 14px; color: #6c757d; margin-bottom: 10px;";
  progressTitle.textContent = "プロジェクト進捗";

  const progressBarContainer = document.createElement("div");
  progressBarContainer.style.cssText = `
            background: #e9ecef;
            border-radius: 10px;
            height: 20px;
            overflow: hidden;
            position: relative;
        `;

  const completedPercent = Math.round((meeting.progress.completed / 35) * 100);
  const inProgressPercent = Math.round(
    (meeting.progress.inProgress / 35) * 100
  );

  const progressFill = document.createElement("div");
  progressFill.style.cssText = `
            display: flex;
            height: 100%;
        `;

  if (completedPercent > 0) {
    const completedBar = document.createElement("div");
    completedBar.style.cssText = `
                background: #28a745;
                width: ${completedPercent}%;
                transition: width 0.3s ease;
            `;
    progressFill.appendChild(completedBar);
  }

  if (inProgressPercent > 0) {
    const inProgressBar = document.createElement("div");
    inProgressBar.style.cssText = `
                background: #ffc107;
                width: ${inProgressPercent}%;
                transition: width 0.3s ease;
            `;
    progressFill.appendChild(inProgressBar);
  }

  progressBarContainer.appendChild(progressFill);

  const progressStats = document.createElement("div");
  progressStats.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            font-size: 13px;
        `;
  progressStats.innerHTML = `
            <div><span style="display: inline-block; width: 10px; height: 10px; background: #28a745; border-radius: 2px; margin-right: 5px;"></span>完了: ${meeting.progress.completed}ページ</div>
            <div><span style="display: inline-block; width: 10px; height: 10px; background: #ffc107; border-radius: 2px; margin-right: 5px;"></span>進行中: ${meeting.progress.inProgress}ページ</div>
            <div><span style="display: inline-block; width: 10px; height: 10px; background: #e9ecef; border-radius: 2px; margin-right: 5px;"></span>未着手: ${meeting.progress.notStarted}ページ</div>
        `;

  progressBar.appendChild(progressTitle);
  progressBar.appendChild(progressBarContainer);
  progressBar.appendChild(progressStats);
  content.appendChild(progressBar);

  section.appendChild(header);
  section.appendChild(content);

  return section;
}

// CSVエクスポート機能
function exportToCSV() {
  let csv = "タスク番号,日付,ミーティング回,ページ名,工程,担当,説明\n";

  // 現在のパターンに応じたミーティングデータを取得
  const meetings = generateMeetingsForPattern();

  meetings.forEach((meeting) => {
    meeting.meetingTasks.forEach((task) => {
      const taskType = getTaskType(task.process);
      const responsible =
        taskType === "both"
          ? "ecbeing／クライアント"
          : taskType === "dev"
          ? "ecbeing"
          : "クライアント";
      csv += `${task.taskNo},${meeting.date},第${meeting.meetingNo}回,${task.page},${task.process},${responsible},ミーティングで実施\n`;
    });
    meeting.weekTasks.forEach((task) => {
      const taskType = getTaskType(task.process);
      const responsible =
        taskType === "both"
          ? "ecbeing／クライアント"
          : taskType === "dev"
          ? "ecbeing"
          : "クライアント";
      csv += `${task.taskNo},週内作業,,${task.page},${task.process},${responsible},週内に対応\n`;
    });
  });

  const patternName =
    currentPattern === "balanced"
      ? "平準化"
      : currentPattern === "smooth"
      ? "スムーズ"
      : "現行";
  downloadCSV(csv, `project_schedule_${patternName}.csv`);
}

// 週次タスク量CSVエクスポート
function exportWeeklyTasksCSV() {
  let csv =
    "週,ミーティング,日付,総タスク数,ecbeingタスク数,クライアントタスク数\n";

  const meetings = generateMeetingsForPattern();

  scheduleData.weeklyTasks.forEach((week, index) => {
    let devCount = 0;
    let clientCount = 0;

    if (meetings[index]) {
      meetings[index].meetingTasks.forEach((task) => {
        const taskType = getTaskType(task.process);
        if (taskType === "dev") devCount++;
        else if (taskType === "client") clientCount++;
        else if (taskType === "both") {
          devCount++;
          clientCount++;
        }
      });
      meetings[index].weekTasks.forEach((task) => {
        const taskType = getTaskType(task.process);
        if (taskType === "dev") devCount++;
        else if (taskType === "client") clientCount++;
        else if (taskType === "both") {
          devCount++;
          clientCount++;
        }
      });
    }

    csv += `第${week.week}週,${week.meeting},${week.date},${week.tasks},${devCount},${clientCount}\n`;
  });

  const patternName =
    currentPattern === "balanced"
      ? "平準化"
      : currentPattern === "smooth"
      ? "スムーズ"
      : "現行";
  downloadCSV(csv, `weekly_tasks_${patternName}.csv`);
}

// CSVダウンロード処理
function downloadCSV(csv, filename) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, filename);
  } else {
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
}

// スケジュールパターンの変更
// 第1週開始ページ数が変更されたときの処理
function onFirstWeekPagesChange() {
  const firstWeekPages =
    parseInt(document.getElementById("firstWeekPages").value) || 7;
  const previousFirstWeekPages =
    parseInt(
      document.getElementById("firstWeekPages").getAttribute("data-previous")
    ) || 7;

  // 前回の値を保存
  document
    .getElementById("firstWeekPages")
    .setAttribute("data-previous", firstWeekPages);

  // プロジェクト期間を再計算
  updateProjectWeeks();
  
  // スケジュール達成可能性をチェック
  checkScheduleFeasibility();

  // グラフとスケジュールを更新
  drawTaskChart();
  const container = document.getElementById("schedule-container");
  container.innerHTML = "";
  displaySchedule();
  updateStats();

  // 変更通知を表示
  showFirstWeekChangeMessage(previousFirstWeekPages, firstWeekPages);
}

// スケジュールが納期までに達成可能かチェック
function checkScheduleFeasibility() {
  const firstWeekPages =
    parseInt(document.getElementById("firstWeekPages").value) || 7;
  const totalPages = scheduleData.pages.length;
  const totalWeeks = scheduleData.projectWeeks || 18;
  const taskCycle = scheduleData.taskCycle.length; // 9工程

  // 実際のスケジュールを生成して最終週の進捗を確認
  const meetings = generateMeetingsForPattern();
  const lastMeeting = meetings[meetings.length - 1];
  const finalCompleted = lastMeeting.progress.completed;
  const finalInProgress = lastMeeting.progress.inProgress;
  const finalNotStarted = lastMeeting.progress.notStarted;
  const finalTotal = finalCompleted + finalInProgress + finalNotStarted;
  const finalCompletionRate = Math.round((finalCompleted / finalTotal) * 100);

  // 現在の設定で完了可能かチェック
  const warningDiv = document.getElementById("scheduleWarning");

  if (finalCompletionRate < 100) {
    // 完了率が100%に達しない場合
    const unfinishedPages = finalInProgress + finalNotStarted;
    let recommendedFirstWeek = firstWeekPages;

    // 推奨開始ページ数を計算
    if (firstWeekPages < 5 && unfinishedPages > 0) {
      recommendedFirstWeek = Math.min(
        10,
        firstWeekPages + Math.ceil(unfinishedPages / 3)
      );
    }

    warningDiv.style.display = "block";
    warningDiv.innerHTML = `
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 12px; color: #721c24; font-size: 13px;">
            <strong>⚠️ 警告:</strong> 現在の設定では納期までに100%完了できません。<br>
            <span style="margin-left: 20px;">• 最終完了率: ${finalCompletionRate}%</span><br>
            <span style="margin-left: 20px;">• 未完了: ${unfinishedPages}ページ（進行中: ${finalInProgress}、未着手: ${finalNotStarted}）</span><br>
            <span style="margin-left: 20px;">• 推奨: 第1週の開始数を${recommendedFirstWeek}以上に増やしてください</span>
        </div>
        `;
  } else if (firstWeekPages === 1) {
    // 第1週の開始数が1の場合（完了しても負荷が高い）
    warningDiv.style.display = "block";
    warningDiv.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffeeba; border-radius: 6px; padding: 12px; color: #856404; font-size: 13px;">
            <strong>💡 ヒント:</strong> 第1週の開始ページ数が少ないため、後半の負荷が高くなります。<br>
            <span style="margin-left: 20px;">開始ページ数を3〜4に増やすことをお勧めします。</span>
        </div>
        `;
  } else {
    // 問題ない場合
    warningDiv.style.display = "none";
  }
}

// 古い関数（互換性のため残す）
function changeSchedulePattern(pattern) {
  // 何もしない（パターン選択は廃止）
}

// カスタムパターンの適用
// 削除された関数（カスタムパターンは廃止）

// 削除された関数（カスタムパターンは廃止）

// ミーティングデータを再生成する関数
function regenerateMeetingData(pages, taskCycle, projectWeeks = 18) {
  const totalTasks = pages.length * taskCycle.length;
  const meetingCount = projectWeeks; // プロジェクト週数に基づく
  const tasksPerMeeting = Math.ceil(totalTasks / meetingCount);

  // 全タスクを生成
  const allTasks = [];
  let taskNo = 1;

  pages.forEach((page) => {
    taskCycle.forEach((process) => {
      allTasks.push({
        taskNo: String(taskNo).padStart(3, "0"),
        page: page,
        process: process,
      });
      taskNo++;
    });
  });

  // ミーティングデータを生成
  const meetings = [];
  const baseDate = new Date(2025, 6, 16); // 2025年7月16日

  for (let i = 0; i < meetingCount; i++) {
    const meetingDate = new Date(baseDate);
    meetingDate.setDate(baseDate.getDate() + i * 7);

    const startIndex = i * tasksPerMeeting;
    const endIndex = Math.min(startIndex + tasksPerMeeting, allTasks.length);
    const meetingTasks = allTasks.slice(startIndex, endIndex);

    const meeting = {
      meetingNo: i + 1,
      date: formatDate(meetingDate),
      meetingTasks: meetingTasks,
      weekTasks: [], // 週タスクは空にする（簡略化）
      progress: {
        completed: Math.min(endIndex, allTasks.length),
        total: allTasks.length,
      },
    };

    meetings.push(meeting);
  }

  // scheduleDataを更新
  scheduleData.meetings = meetings;

  // 週次タスクデータも更新
  scheduleData.weeklyTasks = meetings.map((meeting, index) => ({
    week: index + 1,
    tasks: meeting.meetingTasks.length,
    meeting: `第${meeting.meetingNo}回`,
    date: meeting.date,
  }));
}

// 日付フォーマット関数
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const dayName = dayNames[date.getDay()];
  return `${year}/${month}/${day}(${dayName})`;
}

// プロジェクトデータの更新
function updateProjectData() {
  // 変更前のデータを保存
  const previousData = {
    pages: scheduleData.pages ? [...scheduleData.pages] : [],
    taskCycle: scheduleData.taskCycle ? [...scheduleData.taskCycle] : [],
    projectWeeks: scheduleData.projectWeeks || 18,
    totalTasks:
      (scheduleData.pages?.length || 0) * (scheduleData.taskCycle?.length || 0),
    devTasks: calculateTaskCount(
      scheduleData.pages || [],
      scheduleData.taskCycle || [],
      "dev"
    ),
    clientTasks: calculateTaskCount(
      scheduleData.pages || [],
      scheduleData.taskCycle || [],
      "client"
    ),
  };

  // プロジェクト週数は後で自動計算される

  // ページ一覧を取得
  const pageListText = document.getElementById("pageList").value;
  const pages = pageListText
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.trim());

  // タスクサイクルを取得
  const taskCycleText = document.getElementById("taskCycle").value;
  const taskCycle = taskCycleText
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.trim());

  // データを更新
  scheduleData.pages = pages;
  scheduleData.taskCycle = taskCycle;
  
  // プロジェクト期間を自動計算
  updateProjectWeeks();
  
  // ミーティングデータを再生成（更新されたprojectWeeksを使用）
  regenerateMeetingData(pages, taskCycle, scheduleData.projectWeeks);

  // ページ数を更新
  document.querySelector(".stat-card:nth-child(1) .stat-value").textContent =
    pages.length;

  // 総タスク数を更新
  const totalTasks = pages.length * taskCycle.length;
  document.querySelector(".stat-card:nth-child(3) .stat-value").textContent =
    totalTasks;

  // ecbeing側とクライアント側のタスク数を再計算
  let devTasks = 0;
  let clientTasks = 0;

  taskCycle.forEach((task) => {
    const taskType = getTaskType(task);
    if (taskType === "dev") {
      devTasks += pages.length;
    } else if (taskType === "client") {
      clientTasks += pages.length;
    } else if (taskType === "both") {
      devTasks += pages.length;
      clientTasks += pages.length;
    }
  });

  document.getElementById("total-dev-tasks").textContent = devTasks;
  document.getElementById("total-client-tasks").textContent = clientTasks;

  // プロジェクト概要を更新
  updateProjectOverview(pages.length, totalTasks);

  // スケジュールを再生成
  drawTaskChart();
  const container = document.getElementById("schedule-container");
  container.innerHTML = "";
  displaySchedule();

  // 変更後のデータ
  const currentData = {
    pages: pages,
    taskCycle: taskCycle,
    projectWeeks: scheduleData.projectWeeks,
    totalTasks: totalTasks,
    devTasks: devTasks,
    clientTasks: clientTasks,
  };

  // 初期ロード時はトーストを表示しない
  if (!isInitialLoad) {
    // 差分と警告を含む詳細なメッセージを表示
    showDetailedUpdateMessage(previousData, currentData);
  }
}

// タスク数を計算するヘルパー関数
function calculateTaskCount(pages, taskCycle, type) {
  let count = 0;
  taskCycle.forEach((task) => {
    const taskType = getTaskType(task);
    if (type === "dev" && (taskType === "dev" || taskType === "both")) {
      count += pages.length;
    } else if (
      type === "client" &&
      (taskType === "client" || taskType === "both")
    ) {
      count += pages.length;
    }
  });
  return count;
}

// プロジェクト概要の更新
function updateProjectOverview(pageCount, taskCount) {
  const overview = document.querySelector("#project-overview .meeting-content");
  if (overview) {
    const scaleSection = overview.querySelector("div:nth-child(2) div");
    if (scaleSection) {
      scaleSection.innerHTML = `
                    <strong>対象ページ数:</strong> ${pageCount}ページ<br>
                    <strong>総タスク数:</strong> ${taskCount}件<br>
                    <strong>週次ミーティング:</strong> 毎週水曜日<br>
                    <strong>全18回開催</strong>
                `;
    }
  }
}

// プロジェクト開始日の変更処理
function onStartDateChange() {
  const startDateInput = document.getElementById("projectStartDate");
  const meetingDaySelect = document.getElementById("meetingDay");
  const selectedDate = new Date(startDateInput.value);
  const meetingDay = parseInt(meetingDaySelect.value);

  // 選択された日付の曜日を取得
  const selectedDay = selectedDate.getDay();

  // ミーティング曜日に合わせて日付を調整
  if (selectedDay !== meetingDay) {
    // 次のミーティング曜日まで進める
    const daysToAdd = (meetingDay - selectedDay + 7) % 7 || 7;
    selectedDate.setDate(selectedDate.getDate() + daysToAdd);
    startDateInput.value = selectedDate.toISOString().split("T")[0];
  }

  // スケジュールデータを更新
  updateScheduleDates();

  // 通知を表示
  const dateStr = formatDate(selectedDate);
  showSuccessMessage(`📅 プロジェクト開始日を${dateStr}に設定しました`);
}

// スケジュールの日付を更新
function updateScheduleDates() {
  const startDateInput = document.getElementById("projectStartDate");
  const startDate = new Date(startDateInput.value);
  const projectWeeks = scheduleData.projectWeeks || 18;

  // 週次タスクの日付を更新
  scheduleData.weeklyTasks = scheduleData.weeklyTasks || [];
  for (let i = 0; i < projectWeeks; i++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(startDate.getDate() + i * 7);

    if (scheduleData.weeklyTasks[i]) {
      scheduleData.weeklyTasks[i].date = formatDate(weekDate);
    } else {
      scheduleData.weeklyTasks.push({
        week: i + 1,
        tasks: 0,
        meeting: `第${i + 1}回`,
        date: formatDate(weekDate),
      });
    }
  }

  // プロジェクト情報を更新
  scheduleData.projectInfo = scheduleData.projectInfo || {};
  scheduleData.projectInfo.startDate = formatDate(startDate);

  // 終了日を計算
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (projectWeeks - 1) * 7);
  scheduleData.projectInfo.endDate = formatDate(endDate);

  // 納期を計算（終了日の前の月曜日）
  const deadline = new Date(endDate);
  const dayOfWeek = deadline.getDay();
  if (dayOfWeek !== 1) {
    // 月曜日でない場合
    const daysToMonday = (1 - dayOfWeek + 7) % 7 || 7;
    deadline.setDate(deadline.getDate() - (7 - daysToMonday));
  }
  scheduleData.projectInfo.deadline = formatDate(deadline);

  // 概要セクションの日付を更新
  const startDateElement = document.getElementById("project-start-date");
  const deadlineElement = document.getElementById("project-deadline");
  const endDateElement = document.getElementById("project-end-date");
  const durationElement = document.getElementById("project-duration");

  if (startDateElement) startDateElement.textContent = formatDate(startDate);
  if (deadlineElement) deadlineElement.textContent = formatDate(deadline);
  if (endDateElement) endDateElement.textContent = formatDate(endDate);
  if (durationElement) durationElement.textContent = projectWeeks;

  // UIを更新
  drawTaskChart();
  const container = document.getElementById("schedule-container");
  container.innerHTML = "";
  displaySchedule();
  updateStats();
}

// 週次タスク上限の変更処理
function onTaskLimitChange() {
  const taskLimit = parseInt(document.getElementById("taskLimit").value) || 0;
  
  // プロジェクト期間を再計算
  updateProjectWeeks();

  // スケジュールを再生成
  drawTaskChart();
  const container = document.getElementById("schedule-container");
  container.innerHTML = "";
  displaySchedule();
  updateStats();

  // 通知を表示
  const message = taskLimit > 0
    ? `😦 週次タスク上限を${taskLimit}件に設定しました<br>上限を超えるタスクは後続週に分散されます`
    : "⚠️ 週次タスク上限を解除しました<br>従来のスケジュールパターンを使用します";

  showSuccessMessage(message);
}

// 第1週変更時のメッセージ表示
function showFirstWeekChangeMessage(previousValue, currentValue) {
  // 変更がない場合は表示しない
  if (previousValue === currentValue) return;

  // スケジュール分析
  const meetings = generateMeetingsForPattern();
  const weeklyTasks = meetings.map(
    (m) => m.meetingTasks.length + m.weekTasks.length
  );
  const maxTasks = Math.max(...weeklyTasks);
  const avgTasks = Math.round(
    weeklyTasks.reduce((sum, t) => sum + t, 0) / weeklyTasks.length
  );

  // 最終週の状況
  const lastMeeting = meetings[meetings.length - 1];
  const finalCompletionRate = Math.round(
    (lastMeeting.progress.completed / scheduleData.pages.length) * 100
  );

  // メッセージ構築
  let html = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 20px; margin: -20px -30px 15px -30px; border-radius: 8px 8px 0 0;">
        <strong style="font-size: 18px;">✨ 第1週開始ページ数を更新しました</strong>
        </div>
    `;

  // 変更内容
  html += `
        <div style="margin-bottom: 15px;">
        <strong style="color: #2c3e50;">📝 変更内容</strong><br>
        <span style="color: #666;">第1週開始ページ数: ${previousValue} → ${currentValue} ${
    currentValue > previousValue
      ? `(+${currentValue - previousValue})`
      : `(${currentValue - previousValue})`
  }</span>
        </div>
    `;

  // スケジュール影響
  html += `
        <div style="margin-bottom: 15px;">
        <strong style="color: #2c3e50;">📊 スケジュールへの影響</strong><br>
        <span style="color: #666;">• 週平均タスク: ${avgTasks}件</span><br>
        <span style="color: #666;">• 最大週次タスク: ${maxTasks}件</span><br>
        <span style="color: #666;">• 完了率: ${finalCompletionRate}%</span>
        </div>
    `;

  // 警告やアドバイス
  if (finalCompletionRate < 100) {
    html += `
        <div style="background: #fff3cd; border: 1px solid #ffeeba; border-radius: 6px; padding: 10px; margin-bottom: 10px;">
            <strong style="color: #856404;">⚠️ 警告</strong><br>
            <span style="color: #856404;">現在の設定では納期までに完了できません。第1週の開始ページ数を増やすことをお勧めします。</span>
        </div>
        `;
  } else if (maxTasks > 40) {
    html += `
        <div style="background: #fff3cd; border: 1px solid #ffeeba; border-radius: 6px; padding: 10px; margin-bottom: 10px;">
            <strong style="color: #856404;">💡 ヒント</strong><br>
            <span style="color: #856404;">週次タスクが${maxTasks}件と高負荷です。第1週の開始ページ数を増やすと負荷が分散されます。</span>
        </div>
        `;
  } else {
    html += `
        <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 10px; margin-bottom: 10px;">
            <strong style="color: #155724;">✅ 良好</strong><br>
            <span style="color: #155724;">バランスの取れたスケジュールです。納期内に完了可能です。</span>
        </div>
        `;
  }

  // 既存のメッセージを削除
  const existingMessage = document.querySelector(".success-message");
  if (existingMessage) {
    existingMessage.remove();
  }

  // 新しいメッセージを作成
  const messageDiv = document.createElement("div");
  messageDiv.className = "success-message";
  messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        color: #333;
        padding: 20px 30px;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        font-size: 14px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
  messageDiv.innerHTML = html;

  // 閉じるボタンを追加
  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = `
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: white;
        opacity: 0.8;
    `;
  closeBtn.innerHTML = "×";
  closeBtn.onclick = () => messageDiv.remove();
  messageDiv.appendChild(closeBtn);

  document.body.appendChild(messageDiv);

  // 5秒後に自動的に削除
  setTimeout(() => {
    if (document.body.contains(messageDiv)) {
      messageDiv.style.animation = "slideOut 0.3s ease-out";
      setTimeout(() => messageDiv.remove(), 300);
    }
  }, 5000);
}

// 成功メッセージの表示
function showSuccessMessage(message) {
  // 既存のメッセージを削除
  const existingMessage = document.querySelector(".success-message");
  if (existingMessage) {
    existingMessage.remove();
  }

  // 新しいメッセージを作成
  const messageDiv = document.createElement("div");
  messageDiv.className = "success-message";
  messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 20px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 16px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
  messageDiv.innerHTML = message;

  document.body.appendChild(messageDiv);

  // 3秒後に自動的に削除
  setTimeout(() => {
    messageDiv.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => messageDiv.remove(), 300);
  }, 3000);
}

// 詳細な更新メッセージの表示（差分と警告を含む）
function showDetailedUpdateMessage(previousData, currentData) {
  // 既存のメッセージを削除
  const existingMessage = document.querySelector(".update-message");
  if (existingMessage) {
    existingMessage.remove();
  }

  // 差分を計算
  const changes = [];
  const warnings = [];
  const recommendations = [];

  // ページ数の変更
  if (previousData.pages.length !== currentData.pages.length) {
    const diff = currentData.pages.length - previousData.pages.length;
    changes.push({
      icon: diff > 0 ? "📄" : "📉",
      text: `ページ数: ${previousData.pages.length} → ${
        currentData.pages.length
      } (${diff > 0 ? "+" : ""}${diff})`,
      type: diff > 0 ? "increase" : "decrease",
    });

    // ページ数に関する警告
    if (currentData.pages.length > 50) {
      warnings.push(
        "ページ数が50を超えています。スケジュールが厳しくなる可能性があります。"
      );
    }
  }

  // 追加されたページを検出
  const addedPages = currentData.pages.filter(
    (page) => !previousData.pages.includes(page)
  );
  if (addedPages.length > 0) {
    changes.push({
      icon: "➕",
      text: `新規ページ: ${addedPages.slice(0, 3).join(", ")}${
        addedPages.length > 3 ? ` 他${addedPages.length - 3}件` : ""
      }`,
      type: "added",
    });
  }

  // 削除されたページを検出
  const removedPages = previousData.pages.filter(
    (page) => !currentData.pages.includes(page)
  );
  if (removedPages.length > 0) {
    changes.push({
      icon: "➖",
      text: `削除ページ: ${removedPages.slice(0, 3).join(", ")}${
        removedPages.length > 3 ? ` 他${removedPages.length - 3}件` : ""
      }`,
      type: "removed",
    });
  }

  // 工程数の変更
  if (previousData.taskCycle.length !== currentData.taskCycle.length) {
    const diff = currentData.taskCycle.length - previousData.taskCycle.length;
    changes.push({
      icon: diff > 0 ? "🔧" : "⚡",
      text: `工程数: ${previousData.taskCycle.length} → ${
        currentData.taskCycle.length
      } (${diff > 0 ? "+" : ""}${diff})`,
      type: diff > 0 ? "increase" : "decrease",
    });
  }

  // 追加された工程を検出
  const addedTasks = currentData.taskCycle.filter(
    (task) => !previousData.taskCycle.includes(task)
  );
  if (addedTasks.length > 0) {
    changes.push({
      icon: "🆕",
      text: `新規工程: ${addedTasks.slice(0, 2).join(", ")}${
        addedTasks.length > 2 ? ` 他${addedTasks.length - 2}件` : ""
      }`,
      type: "added",
    });
  }

  // 削除された工程を検出
  const removedTasks = previousData.taskCycle.filter(
    (task) => !currentData.taskCycle.includes(task)
  );
  if (removedTasks.length > 0) {
    changes.push({
      icon: "🗑️",
      text: `削除工程: ${removedTasks.slice(0, 2).join(", ")}${
        removedTasks.length > 2 ? ` 他${removedTasks.length - 2}件` : ""
      }`,
      type: "removed",
    });
  }

  // プロジェクト週数の変更
  if (previousData.projectWeeks !== currentData.projectWeeks) {
    const diff = currentData.projectWeeks - previousData.projectWeeks;
    changes.push({
      icon: "📅",
      text: `期間: ${previousData.projectWeeks}週 → ${
        currentData.projectWeeks
      }週 (${diff > 0 ? "+" : ""}${diff})`,
      type: diff > 0 ? "increase" : "decrease",
    });

    // 期間に関する警告
    if (currentData.projectWeeks < 12 && currentData.pages.length > 20) {
      warnings.push(
        "プロジェクト期間が短く、ページ数が多いため、週あたりの負荷が高くなります。"
      );
    }
  }

  // 総タスク数の変更
  if (previousData.totalTasks !== currentData.totalTasks) {
    const diff = currentData.totalTasks - previousData.totalTasks;
    changes.push({
      icon: "📊",
      text: `総タスク数: ${previousData.totalTasks} → ${
        currentData.totalTasks
      } (${diff > 0 ? "+" : ""}${diff})`,
      type: diff > 0 ? "increase" : "decrease",
    });

    // タスク数に関する警告と推奨事項
    const avgTasksPerWeek = Math.ceil(
      currentData.totalTasks / currentData.projectWeeks
    );
    if (avgTasksPerWeek > 40) {
      warnings.push(
        `週平均${avgTasksPerWeek}タスクは高負荷です。チームの負担を考慮してください。`
      );
      recommendations.push(
        "プロジェクト期間の延長または段階的なリリースを検討してください。"
      );
    }
  }

  // ecbeing側タスクの変更
  if (previousData.devTasks !== currentData.devTasks) {
    const diff = currentData.devTasks - previousData.devTasks;
    changes.push({
      icon: "💻",
      text: `ecbeing側: ${previousData.devTasks} → ${currentData.devTasks} (${
        diff > 0 ? "+" : ""
      }${diff})`,
      type: "dev",
    });
  }

  // クライアント側タスクの変更
  if (previousData.clientTasks !== currentData.clientTasks) {
    const diff = currentData.clientTasks - previousData.clientTasks;
    changes.push({
      icon: "👥",
      text: `クライアント側: ${previousData.clientTasks} → ${
        currentData.clientTasks
      } (${diff > 0 ? "+" : ""}${diff})`,
      type: "client",
    });
  }

  // 追加の分析
  const devClientRatio = currentData.devTasks / currentData.clientTasks;
  if (devClientRatio > 3) {
    warnings.push("ecbeing側のタスクがクライアント側に比べて多すぎます。");
    recommendations.push(
      "クライアントの確認工程を適切に配置し、フィードバックの遅延を防ぎましょう。"
    );
  }

  // 第1週の開始ページ数を取得して評価
  const firstWeekPages =
    parseInt(document.getElementById("firstWeekPages").value) || 7;
  const avgPagesPerWeek = currentData.pages.length / currentData.projectWeeks;
  if (firstWeekPages < avgPagesPerWeek * 0.5) {
    recommendations.push(
      `第1週の開始ページ数（${firstWeekPages}）を増やすことで、後半の負荷を軽減できます。`
    );
  }

  // 実際のスケジュールから週次負荷を分析
  const meetings = generateMeetingsForPattern();
  const weeklyTaskCounts = meetings.map(
    (meeting) => meeting.meetingTasks.length + meeting.weekTasks.length
  );
  const maxWeeklyTasks = Math.max(...weeklyTaskCounts);
  const peakWeeks = meetings
    .map((meeting, index) => ({
      week: index + 1,
      tasks: weeklyTaskCounts[index],
    }))
    .filter((week) => week.tasks === maxWeeklyTasks);

  if (maxWeeklyTasks > 50) {
    warnings.push(
      `第${peakWeeks[0].week}週に${maxWeeklyTasks}タスクのピークがあります。負荷分散を検討してください。`
    );
  }

  // 最終週の完了状況を確認
  const lastMeeting = meetings[meetings.length - 1];
  const finalCompletionRate = Math.round(
    (lastMeeting.progress.completed / currentData.pages.length) * 100
  );

  if (finalCompletionRate < 100) {
    const unfinishedPages =
      lastMeeting.progress.inProgress + lastMeeting.progress.notStarted;
    warnings.push(
      `現在の設定では納期までに完了できません（最終完了率: ${finalCompletionRate}%）`
    );
    recommendations.push(
      `第1週の開始ページ数を${Math.min(
        10,
        firstWeekPages + 2
      )}以上に増やすか、プロジェクト期間を延長してください。`
    );
  }

  // メッセージを作成
  const messageDiv = document.createElement("div");
  messageDiv.className = "update-message";
  messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 450px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        overflow: hidden;
    `;

  // ヘッダー
  const header = document.createElement("div");
  header.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        font-weight: bold;
        font-size: 16px;
    `;
  header.innerHTML = "✨ プロジェクトデータを更新しました";

  // コンテンツ
  const content = document.createElement("div");
  content.style.cssText = "padding: 20px;";

  // 変更点セクション
  if (changes.length > 0) {
    const changesSection = document.createElement("div");
    changesSection.style.cssText = "margin-bottom: 15px;";
    changesSection.innerHTML = `
        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 10px; font-size: 14px;">📝 変更内容</div>
        ${changes
          .map(
            (change) => `
            <div style="display: flex; align-items: center; gap: 8px; padding: 8px 0; font-size: 13px; color: #495057;">
            <span style="font-size: 16px;">${change.icon}</span>
            <span>${change.text}</span>
            </div>
        `
          )
          .join("")}
        `;
    content.appendChild(changesSection);
  }

  // 警告セクション
  if (warnings.length > 0) {
    const warningsSection = document.createElement("div");
    warningsSection.style.cssText = `
        background: #fff3cd;
        border: 1px solid #ffeeba;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 15px;
        `;
    warningsSection.innerHTML = `
        <div style="font-weight: 600; color: #856404; margin-bottom: 8px; font-size: 14px;">⚠️ 警告</div>
        ${warnings
          .map(
            (warning) => `
            <div style="font-size: 12px; color: #856404; margin-bottom: 4px;">• ${warning}</div>
        `
          )
          .join("")}
        `;
    content.appendChild(warningsSection);
  }

  // 推奨事項セクション
  if (recommendations.length > 0) {
    const recommendationsSection = document.createElement("div");
    recommendationsSection.style.cssText = `
        background: #d1ecf1;
        border: 1px solid #bee5eb;
        border-radius: 6px;
        padding: 12px;
        `;
    recommendationsSection.innerHTML = `
        <div style="font-weight: 600; color: #0c5460; margin-bottom: 8px; font-size: 14px;">💡 推奨事項</div>
        ${recommendations
          .map(
            (rec) => `
            <div style="font-size: 12px; color: #0c5460; margin-bottom: 4px;">• ${rec}</div>
        `
          )
          .join("")}
        `;
    content.appendChild(recommendationsSection);
  }

  // 変更がない場合
  if (changes.length === 0) {
    content.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #6c757d;">
            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
            <div style="font-size: 14px;">データは正常に更新されました</div>
        </div>
        `;
  }

  // 閉じるボタン
  const closeButton = document.createElement("button");
  closeButton.style.cssText = `
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.2s;
    `;
  closeButton.innerHTML = "×";
  closeButton.onmouseover = () => (closeButton.style.opacity = "1");
  closeButton.onmouseout = () => (closeButton.style.opacity = "0.8");
  closeButton.onclick = () => {
    messageDiv.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => messageDiv.remove(), 300);
  };

  header.appendChild(closeButton);
  messageDiv.appendChild(header);
  messageDiv.appendChild(content);
  document.body.appendChild(messageDiv);

  // 自動的に削除（変更や警告がある場合は長めに表示）
  const displayTime =
    warnings.length > 0 || recommendations.length > 0 ? 8000 : 5000;
  setTimeout(() => {
    if (document.contains(messageDiv)) {
      messageDiv.style.animation = "slideOut 0.3s ease-out";
      setTimeout(() => messageDiv.remove(), 300);
    }
  }, displayTime);
}

// 統計情報の更新
function updateStats() {
  const meetings = generateMeetingsForPattern();
  const weeklyDevTasks = meetings.map((meeting) => {
    let devCount = 0;
    meeting.meetingTasks.forEach((task) => {
      const taskType = getTaskType(task.process);
      if (taskType === "dev" || taskType === "both") devCount++;
    });
    meeting.weekTasks.forEach((task) => {
      const taskType = getTaskType(task.process);
      if (taskType === "dev" || taskType === "both") devCount++;
    });
    return devCount;
  });

  const maxTasks = Math.max(...weeklyDevTasks);
  const avgTasks = Math.round(
    weeklyDevTasks.reduce((sum, d) => sum + d, 0) / weeklyDevTasks.length
  );

  // 最大週次タスク数を更新
  document.querySelector(".stat-card:nth-child(4) .stat-value").textContent =
    maxTasks;

  // ecbeing側とクライアント側のタスク数を動的に計算
  const pages = scheduleData.pages || [];
  const taskCycle = scheduleData.taskCycle || [];

  let totalDevTasks = 0;
  let totalClientTasks = 0;

  taskCycle.forEach((task) => {
    const taskType = getTaskType(task);
    if (taskType === "dev") {
      totalDevTasks += pages.length;
    } else if (taskType === "client") {
      totalClientTasks += pages.length;
    } else if (taskType === "both") {
      totalDevTasks += pages.length;
      totalClientTasks += pages.length;
    }
  });

  // タスク数を更新
  document.getElementById("total-dev-tasks").textContent = totalDevTasks;
  document.getElementById("total-client-tasks").textContent = totalClientTasks;

  // 最終統計の更新
  const finalStats = document.querySelector(
    ".meeting-section:last-child .progress-summary"
  );
  if (finalStats) {
    finalStats.innerHTML = `
                <strong>総タスク数: 630件</strong><br>
                全35ページ × 18工程 = 630件<br>
                ecbeing側: ${totalDevTasks}件 | クライアント側: ${totalClientTasks}件<br>
                進捗率: 100%（プロジェクト完了）<br>
                最大週次タスク数: ${maxTasks}件<br>
                平均週次タスク数: ${avgTasks}件<br>
                納期: 2025/11/03(月) - 達成<br>
                全工程完了: 2025/11/12(水)
            `;
  }
}
