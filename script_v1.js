// 心理旋转实验 - 修复版
// 基于 Cooper & Shepard (1973) 的实验范式

// 实验配置
const EXPERIMENT_CONFIG = {
    characters: ['R', 'J', 'G', '2', '5', '7'],
    angles: [0, 60, 120, 180, 240, 300],
    
    // 各阶段试次配置 - 减少后的版本
    stages: {
        practice: {
            name: '练习阶段',
            trials: 6,  // 从12减少到6
            conditions: ['N']
        },
        stage1: {
            name: '阶段1: 基础条件',
            trials: 40,  // 从72减少到40
            conditions: ['N', 'I', 'O', 'C', 'B-1000'],
            trialsPerCondition: 8  // 从12减少到8
        },
        stage2: {
            name: '阶段2: B条件持续时间',
            trials: 36,  // 从72减少到36
            conditions: ['B-100', 'B-400', 'B-700', 'B-1000'],
            trialsPerCondition: 9  // 从18减少到9
        }
    },
    
    // 时间参数（毫秒）
    timing: {
        fixation: 500,
        identityInfo: 2000,
        orientationInfo: 1000,
        combinedInfo: 2000,
        blankField: 1000,
        maxResponse: 3000,
        feedback: 500
    },
    
    keys: {
        normal: 'f',
        mirror: 'j'
    }
};

// 实验状态
let experimentState = {
    currentStage: 'practice',
    currentTrial: 0,
    totalTrials: 0,
    trials: [],
    startTime: null,
    isRunning: false,
    isPaused: false,
    stateLock: false,
    stimulusStartTime: null,
    
    // 统计数据
    correctCount: 0,
    totalRT: 0,
    data: [],
    
    // 计时器
    timers: {
        fixation: null,
        identity: null,
        orientation: null,
        combined: null,
        blank: null,
        response: null,
        feedback: null
    },
    
    // 当前试次
    currentTrialData: null
};

// 图表实例
let rtChart, conditionChart, accuracyChart;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('心理旋转实验初始化完成');
    
    // 绑定按钮事件
    document.getElementById('start-experiment').addEventListener('click', startExperiment);
    document.getElementById('pause-btn').addEventListener('click', pauseExperiment);
    document.getElementById('quit-btn').addEventListener('click', showPauseModal);
    document.getElementById('resume-btn').addEventListener('click', resumeExperiment);
    document.getElementById('confirm-quit-btn').addEventListener('click', quitExperiment);
    
    // 结果页面按钮
    document.getElementById('download-btn').addEventListener('click', downloadData);
    document.getElementById('restart-btn').addEventListener('click', restartExperiment);
    
    // 数据筛选按钮
    document.getElementById('show-all-btn').addEventListener('click', () => filterData('all'));
    document.getElementById('show-errors-btn').addEventListener('click', () => filterData('errors'));
    
    // 键盘事件
    document.addEventListener('keydown', handleKeyPress);
    
    // 初始化图表
    initCharts();
});

// 初始化实验状态
function initExperimentState() {
    experimentState = {
        currentStage: 'practice',
        currentTrial: 0,
        totalTrials: 0,
        trials: [],
        startTime: Date.now(),
        isRunning: false,
        isPaused: false,
        stateLock: false,
        stimulusStartTime: null,
        
        correctCount: 0,
        totalRT: 0,
        data: [],
        
        timers: {
            fixation: null,
            identity: null,
            orientation: null,
            combined: null,
            blank: null,
            response: null,
            feedback: null
        },
        
        currentTrialData: null
    };
}

// 开始实验
function startExperiment() {
    if (!confirm('实验即将开始！\n\n本实验包含3个阶段，总共82个试次，预计需要5-10分钟。\n\n请确保您有足够的时间完成整个实验。\n\n准备好后点击"确定"开始练习阶段。')) {  // 修改提示信息
        return;
    }
    
    // 切换到实验页面
    showPage('experiment');
    
    // 初始化状态
    initExperimentState();
    
    // 生成练习试次
    generateTrials('practice');
    
    // 更新UI
    updateUI();
    
    // 开始第一个试次
    setTimeout(() => {
        experimentState.isRunning = true;
        startTrial();
    }, 1000);
}

// 生成试次
function generateTrials(stage) {
    experimentState.trials = [];
    
    const stageConfig = EXPERIMENT_CONFIG.stages[stage];
    const trialsPerCondition = stageConfig.trialsPerCondition || Math.floor(stageConfig.trials / stageConfig.conditions.length);
    
    let allTrials = [];
    
    // 为每个条件生成试次
    stageConfig.conditions.forEach(condition => {
        let conditionType = condition;
        let orientationDuration = null;
        
        // 解析B条件
        if (condition.startsWith('B-')) {
            conditionType = 'B';
            orientationDuration = parseInt(condition.split('-')[1]);
        }
        
        // 生成该条件的所有可能组合
        const conditionTrials = [];
        EXPERIMENT_CONFIG.characters.forEach(char => {
            EXPERIMENT_CONFIG.angles.forEach(angle => {
                ['normal', 'mirror'].forEach(version => {
                    conditionTrials.push({
                        character: char,
                        angle: angle,
                        version: version,
                        condition: conditionType,
                        orientationDuration: orientationDuration,
                        stage: stage
                    });
                });
            });
        });
        
        // 随机选择指定数量的试次
        const selectedTrials = [];
        const shuffled = [...conditionTrials].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < trialsPerCondition && i < shuffled.length; i++) {
            selectedTrials.push(shuffled[i]);
        }
        
        allTrials = allTrials.concat(selectedTrials);
    });
    
    // 打乱所有试次
    allTrials.sort(() => Math.random() - 0.5);
    
    // 创建试次对象
    allTrials.forEach((trial, index) => {
        experimentState.trials.push({
            trialNumber: index + 1,
            stage: stage,
            character: trial.character,
            angle: trial.angle,
            version: trial.version,
            condition: trial.condition,
            orientationDuration: trial.orientationDuration,
            response: null,
            responseTime: null,
            isCorrect: null,
            timestamp: null
        });
    });
    
    experimentState.totalTrials = experimentState.trials.length;
}

// 开始一个试次
function startTrial() {
    if (experimentState.currentTrial >= experimentState.totalTrials) {
        finishStage();
        return;
    }
    
    // 清除所有计时器
    clearAllTimers();
    
    // 重置状态锁
    experimentState.stateLock = false;
    experimentState.stimulusStartTime = null;
    
    // 更新试次计数
    experimentState.currentTrial++;
    
    // 获取当前试次数据
    const trial = experimentState.trials[experimentState.currentTrial - 1];
    experimentState.currentTrialData = trial;
    
    // 更新UI
    updateTrialInfo();
    updateProgress();
    
    // 根据条件开始试次
    switch(trial.condition) {
        case 'N':
            startConditionN();
            break;
        case 'I':
            startConditionI();
            break;
        case 'O':
            startConditionO();
            break;
        case 'B':
            startConditionB();
            break;
        case 'C':
            startConditionC();
            break;
    }
}

// 条件N：无先验信息
function startConditionN() {
    showDisplay('fixation');
    
    experimentState.timers.fixation = setTimeout(() => {
        if (!experimentState.isPaused) {
            showStimulus();
        }
    }, EXPERIMENT_CONFIG.timing.fixation);
}

// 条件I：只提供身份信息
function startConditionI() {
    showDisplay('fixation');
    
    experimentState.timers.fixation = setTimeout(() => {
        if (!experimentState.isPaused) {
            showIdentityInfo();
        }
    }, EXPERIMENT_CONFIG.timing.fixation);
}

// 条件O：只提供方向信息
function startConditionO() {
    showDisplay('fixation');
    
    experimentState.timers.fixation = setTimeout(() => {
        if (!experimentState.isPaused) {
            showOrientationInfo();
        }
    }, EXPERIMENT_CONFIG.timing.fixation);
}

// 条件B：同时提供身份和方向信息
function startConditionB() {
    showDisplay('fixation');
    
    experimentState.timers.fixation = setTimeout(() => {
        if (!experimentState.isPaused) {
            showIdentityInfo();
        }
    }, EXPERIMENT_CONFIG.timing.fixation);
}

// 条件C：提供已旋转的完整模板
function startConditionC() {
    showDisplay('fixation');
    
    experimentState.timers.fixation = setTimeout(() => {
        if (!experimentState.isPaused) {
            showCombinedInfo();
        }
    }, EXPERIMENT_CONFIG.timing.fixation);
}

// 显示身份信息
function showIdentityInfo() {
    if (experimentState.stateLock) return;
    
    const trial = experimentState.currentTrialData;
    
    showDisplay('identity-info');
    
    // 显示正立字符
    const display = document.getElementById('identity-char');
    display.textContent = trial.character;
    display.style.transform = 'rotate(0deg)';
    
    // 设置计时器
    experimentState.timers.identity = setTimeout(() => {
        if (!experimentState.isPaused) {
            if (trial.condition === 'I') {
                showStimulus();
            } else if (trial.condition === 'B') {
                showOrientationInfo();
            }
        }
    }, EXPERIMENT_CONFIG.timing.identityInfo);
}

// 显示方向信息
function showOrientationInfo() {
    if (experimentState.stateLock) return;
    
    const trial = experimentState.currentTrialData;
    
    showDisplay('orientation-info');
    
    // 显示方向箭头
    const arrow = document.getElementById('orientation-arrow');
    arrow.style.transform = `rotate(${trial.angle}deg)`;
    
    // 确定持续时间
    let duration;
    if (trial.condition === 'O') {
        duration = EXPERIMENT_CONFIG.timing.orientationInfo;
    } else if (trial.condition === 'B') {
        duration = trial.orientationDuration || EXPERIMENT_CONFIG.timing.orientationInfo;
    }
    
    // 设置计时器
    experimentState.timers.orientation = setTimeout(() => {
        if (!experimentState.isPaused) {
            showStimulus();
        }
    }, duration);
}

// 显示完整模板信息
function showCombinedInfo() {
    if (experimentState.stateLock) return;
    
    const trial = experimentState.currentTrialData;
    
    showDisplay('combined-info');
    
    // 显示已旋转的字符（总是正常版本）
    const display = document.getElementById('combined-char');
    display.textContent = trial.character;
    display.style.transform = `rotate(${trial.angle}deg)`;
    
    // 设置计时器
    experimentState.timers.combined = setTimeout(() => {
        if (!experimentState.isPaused) {
            showBlankField();
        }
    }, EXPERIMENT_CONFIG.timing.combinedInfo);
}

// 显示空白场
function showBlankField() {
    showDisplay('blank-field');
    
    experimentState.timers.blank = setTimeout(() => {
        if (!experimentState.isPaused) {
            showStimulus();
        }
    }, EXPERIMENT_CONFIG.timing.blankField);
}

// 显示刺激
function showStimulus() {
    if (experimentState.stateLock) return;
    
    const trial = experimentState.currentTrialData;
    
    showDisplay('stimulus');
    
    // 显示测试刺激
    const display = document.getElementById('character-display');
    display.textContent = trial.character;
    
    // 应用变换
    let transform = '';
    if (trial.version === 'mirror') {
        transform += 'scaleX(-1) ';
    }
    transform += `rotate(${trial.angle}deg)`;
    display.style.transform = transform;
    
    // 记录刺激开始时间
    experimentState.stimulusStartTime = Date.now();
    
    // 设置反应超时计时器
    experimentState.timers.response = setTimeout(() => {
        if (!experimentState.stateLock) {
            recordResponse(null);
        }
    }, EXPERIMENT_CONFIG.timing.maxResponse);
}

// 处理按键
function handleKeyPress(event) {
    // 如果实验暂停或没有运行，不处理按键
    if (!experimentState.isRunning || experimentState.isPaused) {
        return;
    }
    
    // 如果状态被锁定，不处理按键
    if (experimentState.stateLock) {
        return;
    }
    
    // 检查当前是否处于刺激呈现阶段
    const stimulusDisplay = document.getElementById('stimulus');
    if (!stimulusDisplay || stimulusDisplay.style.display === 'none') {
        return;
    }
    
    const key = event.key.toLowerCase();
    let response = null;
    
    if (key === EXPERIMENT_CONFIG.keys.normal) {
        response = 'normal';
    } else if (key === EXPERIMENT_CONFIG.keys.mirror) {
        response = 'mirror';
    } else {
        return;
    }
    
    // 锁定状态，防止重复处理
    experimentState.stateLock = true;
    
    // 清除响应超时计时器
    if (experimentState.timers.response) {
        clearTimeout(experimentState.timers.response);
        experimentState.timers.response = null;
    }
    
    // 记录响应
    recordResponse(response);
}

// 记录响应
function recordResponse(response) {
    const trial = experimentState.currentTrialData;
    
    // 计算反应时间
    let responseTime = 0;
    if (experimentState.stimulusStartTime) {
        responseTime = Date.now() - experimentState.stimulusStartTime;
    }
    
    // 确保反应时间至少为50ms
    responseTime = Math.max(50, responseTime);
    
    // 确定是否正确
    const isCorrect = (response === trial.version);
    
    // 确保response不为null
    response = response || 'timeout';
    
    // 更新试次数据
    trial.response = response;
    trial.responseTime = responseTime;
    trial.isCorrect = isCorrect;
    trial.timestamp = new Date().toISOString();
    
    // 更新统计
    if (isCorrect && response !== 'timeout') {
        experimentState.correctCount++;
        experimentState.totalRT += responseTime;
    }
    
    // 保存到数据数组
    experimentState.data.push({
        trial: experimentState.currentTrial,
        stage: trial.stage,
        character: trial.character,
        angle: trial.angle,
        version: trial.version,
        condition: trial.condition === 'B' && trial.orientationDuration ? 
            `B-${trial.orientationDuration}` : trial.condition,
        response: response,
        responseTime: responseTime,
        isCorrect: isCorrect,
        timestamp: trial.timestamp
    });
    
    // 更新UI
    updateAccuracy();
    
    // 显示反馈
    showFeedback(isCorrect, responseTime);
}

// 显示反馈
function showFeedback(isCorrect, responseTime) {
    showDisplay('feedback');
    
    const icon = document.getElementById('feedback-icon');
    const message = document.getElementById('feedback-message');
    const rtDisplay = document.getElementById('reaction-time-display');
    
    if (isCorrect) {
        icon.textContent = '✓';
        icon.style.color = '#000000';
        message.textContent = '正确！';
        message.style.color = '#000000';
    } else {
        icon.textContent = '✗';
        icon.style.color = '#666666';
        message.textContent = '错误';
        message.style.color = '#666666';
    }
    
    rtDisplay.textContent = `反应时: ${responseTime}ms`;
    
    // 设置反馈计时器
    experimentState.timers.feedback = setTimeout(() => {
        startTrial();
    }, EXPERIMENT_CONFIG.timing.feedback);
}

// 完成当前阶段
function finishStage() {
    experimentState.isRunning = false;
    experimentState.stateLock = false;
    clearAllTimers();
    
    // 确定下一个阶段
    let nextStage;
    switch(experimentState.currentStage) {
        case 'practice':
            nextStage = 'stage1';
            break;
        case 'stage1':
            nextStage = 'stage2';
            break;
        case 'stage2':
            // 所有阶段完成
            showResults();
            return;
    }
    
    // 询问是否继续
    const stageName = EXPERIMENT_CONFIG.stages[nextStage].name;
    const stageTrials = EXPERIMENT_CONFIG.stages[nextStage].trials;
    
    if (confirm(`${stageName}即将开始！\n\n本阶段包含${stageTrials}个试次\n\n您准备好开始了吗？`)) {
        // 切换到下一个阶段
        experimentState.currentStage = nextStage;
        experimentState.currentTrial = 0;
        
        // 生成新阶段试次
        generateTrials(nextStage);
        
        // 更新UI
        updateUI();
        
        // 开始新阶段
        setTimeout(() => {
            experimentState.isRunning = true;
            startTrial();
        }, 1000);
    } else {
        quitExperiment();
    }
}

// 显示结果页面
function showResults() {
    showPage('results');
    
    // 计算统计数据
    const totalTrials = experimentState.data.length;
    const correctTrials = experimentState.data.filter(t => t.isCorrect).length;
    const accuracy = totalTrials > 0 ? Math.round((correctTrials / totalTrials) * 100) : 0;
    
    const correctResponses = experimentState.data.filter(t => t.isCorrect && t.responseTime);
    const avgRT = correctResponses.length > 0 ? 
        Math.round(correctResponses.reduce((sum, t) => sum + t.responseTime, 0) / correctResponses.length) : 0;
    
    const duration = Math.floor((Date.now() - experimentState.startTime) / 1000);
    
    // 更新结果页面
    document.getElementById('final-accuracy').textContent = `${accuracy}%`;
    document.getElementById('final-avg-rt').textContent = `${avgRT}ms`;
    document.getElementById('total-trials').textContent = totalTrials;
    document.getElementById('experiment-time').textContent = `${duration}秒`;
    document.getElementById('completion-time').textContent = new Date().toLocaleString();
    
    // 填充数据表格
    filterData('all');
    
    // 更新图表
    updateCharts();
}

// 填充数据表格
function filterData(type) {
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '';
    
    let filteredData = experimentState.data;
    
    if (type === 'errors') {
        filteredData = filteredData.filter(trial => !trial.isCorrect);
    }
    
    filteredData.forEach((trial, index) => {
        const row = document.createElement('tr');
        row.className = trial.isCorrect ? 'correct' : 'error';
        
        const stageName = {
            practice: '练习',
            stage1: '阶段1',
            stage2: '阶段2'
        }[trial.stage] || trial.stage;
        
        row.innerHTML = `
            <td>${trial.trial}</td>
            <td>${stageName}</td>
            <td>${trial.character}</td>
            <td>${trial.angle}°</td>
            <td>${trial.version === 'normal' ? '正常' : '镜像'}</td>
            <td>${trial.condition}</td>
            <td>${trial.response ? (trial.response === 'normal' ? '正常' : '镜像') : '超时'}</td>
            <td>${trial.isCorrect ? '✓' : '✗'}</td>
            <td>${trial.responseTime ? `${trial.responseTime}ms` : '超时'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 下载数据
function downloadData() {
    const headers = [
        '试次', '阶段', '字符', '角度', '版本', '条件', 
        '反应', '正确', '反应时(ms)', '时间戳'
    ];
    
    const rows = experimentState.data.map(trial => [
        trial.trial,
        trial.stage,
        trial.character,
        trial.angle,
        trial.version,
        trial.condition,
        trial.response || '无反应',
        trial.isCorrect ? '正确' : '错误',
        trial.responseTime || '',
        trial.timestamp
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    
    downloadFile(csvContent, `心理旋转实验_${new Date().toISOString().slice(0, 10)}.csv`);
}

// 通用下载函数
function downloadFile(content, filename) {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 暂停实验
function pauseExperiment() {
    experimentState.isPaused = true;
    clearAllTimers();
    document.getElementById('pause-modal').style.display = 'flex';
}

function showPauseModal() {
    pauseExperiment();
}

// 继续实验
function resumeExperiment() {
    experimentState.isPaused = false;
    document.getElementById('pause-modal').style.display = 'none';
    
    if (experimentState.isRunning) {
        startTrial();
    }
}

// 退出实验
function quitExperiment() {
    if (confirm('确定要退出实验吗？所有数据将丢失。')) {
        clearAllTimers();
        showPage('instructions');
    }
}

// 重新开始实验
function restartExperiment() {
    if (confirm('确定要重新开始实验吗？当前数据将丢失。')) {
        clearAllTimers();
        showPage('instructions');
    }
}

// 清除所有计时器
function clearAllTimers() {
    Object.values(experimentState.timers).forEach(timer => {
        if (timer) clearTimeout(timer);
    });
    
    experimentState.timers = {
        fixation: null,
        identity: null,
        orientation: null,
        combined: null,
        blank: null,
        response: null,
        feedback: null
    };
}

// 显示指定页面
function showPage(pageName) {
    document.getElementById('instructions-page').classList.remove('active');
    document.getElementById('experiment-page').classList.remove('active');
    document.getElementById('results-page').classList.remove('active');
    
    document.getElementById(`${pageName}-page`).classList.add('active');
}

// 显示指定显示区域
function showDisplay(displayName) {
    const displays = ['fixation', 'identity-info', 'orientation-info', 'combined-info', 'blank-field', 'stimulus', 'feedback'];
    displays.forEach(name => {
        document.getElementById(name).style.display = name === displayName ? 'flex' : 'none';
    });
}

// 更新UI
function updateUI() {
    updateTrialInfo();
    updatePhaseIndicator();
    updateAccuracy();
    updateProgress();
}

function updateTrialInfo() {
    const trial = experimentState.currentTrialData;
    if (!trial) return;
    
    document.getElementById('trial-counter').textContent = 
        `${experimentState.currentTrial}/${experimentState.totalTrials}`;
    
    document.getElementById('current-phase').textContent = 
        getStageName(experimentState.currentStage);
    
    let conditionText = trial.condition;
    if (trial.condition === 'B' && trial.orientationDuration) {
        conditionText = `B-${trial.orientationDuration}`;
    }
    
    document.getElementById('current-condition').textContent = conditionText;
    document.getElementById('condition-indicator').textContent = conditionText;
    
    const durationIndicator = document.getElementById('duration-indicator');
    const durationValue = document.getElementById('duration-value');
    
    if (trial.condition === 'B' && trial.orientationDuration) {
        durationValue.textContent = trial.orientationDuration;
        durationIndicator.style.display = 'inline';
    } else {
        durationIndicator.style.display = 'none';
    }
    
    // 更新监控面板
    document.getElementById('completed-trials').textContent = experimentState.currentTrial - 1;
    document.getElementById('current-duration').textContent = 
        (trial.condition === 'B' && trial.orientationDuration) ? `${trial.orientationDuration}ms` : '-';
}

function updatePhaseIndicator() {
    const stageName = EXPERIMENT_CONFIG.stages[experimentState.currentStage].name;
    document.getElementById('phase-indicator').textContent = stageName;
}

function updateAccuracy() {
    // 只计算当前阶段的数据
    const currentStage = experimentState.currentStage;
    const stageData = experimentState.data.filter(trial => trial.stage === currentStage);
    
    const total = stageData.length;
    const correct = stageData.filter(t => t.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    const correctResponses = stageData.filter(t => t.isCorrect && t.responseTime);
    const avgRT = correctResponses.length > 0 ? 
        Math.round(correctResponses.reduce((sum, t) => sum + t.responseTime, 0) / correctResponses.length) : 0;
    
    document.getElementById('accuracy-display').textContent = `${accuracy}%`;
    document.getElementById('average-rt').textContent = `${avgRT}ms`;
}

function updateProgress() {
    const progress = (experimentState.currentTrial / experimentState.totalTrials) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-percent').textContent = Math.round(progress);
    document.getElementById('progress-trials').textContent = `(${experimentState.currentTrial}/${experimentState.totalTrials} 试次)`;
}

// 获取阶段名称的辅助函数
function getStageName(stage) {
    switch(stage) {
        case 'practice': return '练习';
        case 'stage1': return '阶段1';
        case 'stage2': return '阶段2';
        default: return stage;
    }
}

// 初始化图表
function initCharts() {
    // 反应时与角度关系图
    const rtCtx = document.getElementById('rt-chart').getContext('2d');
    rtChart = new Chart(rtCtx, {
        type: 'line',
        data: {
            labels: EXPERIMENT_CONFIG.angles,
            datasets: []
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '反应时 (ms)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '旋转角度 (°)'
                    }
                }
            }
        }
    });
    
    // 条件对比图
    const conditionCtx = document.getElementById('condition-chart').getContext('2d');
    conditionChart = new Chart(conditionCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '平均反应时 (ms)',
                data: [],
                backgroundColor: [
                    '#333333', '#666666', '#999999', '#cccccc', '#333333'
                ]
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '反应时 (ms)'
                    }
                }
            }
        }
    });
    
    // 正确率对比图
    const accuracyCtx = document.getElementById('accuracy-chart').getContext('2d');
    accuracyChart = new Chart(accuracyCtx, {
        type: 'bar',
        data: {
            labels: ['正常版本', '镜像版本'],
            datasets: [{
                label: '正确率 (%)',
                data: [0, 0],
                backgroundColor: ['#333333', '#666666']
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '正确率 (%)'
                    }
                }
            }
        }
    });
}

// 更新图表
function updateCharts() {
    // 1. 反应时与角度关系图
    const conditionData = {};
    const conditions = ['N', 'I', 'O', 'C', 'B-1000'];
    
    conditions.forEach(cond => {
        conditionData[cond] = EXPERIMENT_CONFIG.angles.map(angle => ({
            sum: 0,
            count: 0
        }));
    });
    
    // 收集数据（只使用正式实验数据）
    experimentState.data.forEach(trial => {
        if (trial.isCorrect && trial.responseTime && trial.stage !== 'practice') {
            let conditionKey = trial.condition;
            // 只显示B-1000条件
            if (trial.condition === 'B' && trial.orientationDuration === 1000) {
                conditionKey = 'B-1000';
            }
            
            if (conditionData[conditionKey]) {
                const angleIndex = EXPERIMENT_CONFIG.angles.indexOf(trial.angle);
                if (angleIndex !== -1) {
                    conditionData[conditionKey][angleIndex].sum += trial.responseTime;
                    conditionData[conditionKey][angleIndex].count++;
                }
            }
        }
    });
    
    // 更新数据集
    const rtDatasets = conditions.map((cond, index) => {
        const colors = ['#000000', '#333333', '#666666', '#999999', '#cccccc'];
        const rtData = conditionData[cond].map(data => 
            data.count > 0 ? Math.round(data.sum / data.count) : 0
        );
        
        return {
            label: `条件${cond}`,
            data: rtData,
            borderColor: colors[index],
            backgroundColor: colors[index] + '20',
            borderWidth: 2,
            fill: true,
            tension: 0.3
        };
    });
    
    rtChart.data.datasets = rtDatasets;
    rtChart.update();
    
    // 2. 条件对比图
    const conditionStats = {};
    
    // 计算各条件平均反应时
    conditions.forEach(cond => {
        const trials = experimentState.data.filter(t => 
            t.stage !== 'practice' && t.isCorrect && t.responseTime
        );
        
        const conditionTrials = trials.filter(t => {
            if (cond === 'B-1000') {
                return t.condition === 'B' && t.orientationDuration === 1000;
            }
            return t.condition === cond;
        });
        
        if (conditionTrials.length > 0) {
            const totalRT = conditionTrials.reduce((sum, t) => sum + t.responseTime, 0);
            conditionStats[cond] = Math.round(totalRT / conditionTrials.length);
        } else {
            conditionStats[cond] = 0;
        }
    });
    
    conditionChart.data.labels = conditions;
    conditionChart.data.datasets[0].data = conditions.map(cond => conditionStats[cond] || 0);
    conditionChart.update();
    
    // 3. 正确率对比图
    const versionData = { normal: { correct: 0, total: 0 }, mirror: { correct: 0, total: 0 } };
    
    // 只计算正式实验数据
    const formalTrials = experimentState.data.filter(t => t.stage !== 'practice');
    
    formalTrials.forEach(trial => {
        versionData[trial.version].total++;
        if (trial.isCorrect) {
            versionData[trial.version].correct++;
        }
    });
    
    const normalAccuracy = versionData.normal.total > 0 ? 
        Math.round((versionData.normal.correct / versionData.normal.total) * 100) : 0;
    const mirrorAccuracy = versionData.mirror.total > 0 ? 
        Math.round((versionData.mirror.correct / versionData.mirror.total) * 100) : 0;
    
    accuracyChart.data.datasets[0].data = [normalAccuracy, mirrorAccuracy];
    accuracyChart.update();
}