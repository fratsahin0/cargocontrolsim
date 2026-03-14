// ==========================================
// CARGO CONTROL SIMULATOR - APP.JS
// ==========================================

let currentMissionId = 1;
let tutStep = 0; 
let stressChartObj = null; 
let alarmStateHL = false;
let alarmStateHHL = false;
let currentSpeed = 1;
let renderInterval = null;

// EVENT LISTENERS
document.addEventListener("DOMContentLoaded", () => {
    // BALLAST PUMP VE BORU RENKLERİ İÇİN CSS EKLENTİSİ
    if (!document.getElementById('pump-fix-style')) {
        let style = document.createElement('style');
        style.id = 'pump-fix-style';
        style.innerHTML = `
            @keyframes pump-spin-ballast {
                from { transform: translate(-50%, -50%) rotate(0deg); }
                to { transform: translate(-50%, -50%) rotate(360deg); }
            }
            .pump-spinning-ballast {
                animation: pump-spin-ballast var(--pump-anim-speed, 1s) linear infinite !important;
            }
            .pipe-empty { background-color: #555 !important; }
            .pipe-filled-b { background-color: #0077ff !important; }
            .flow-b-right, .flow-b-left, .flow-b-up, .flow-b-down { background-color: #00aaff !important; }
        `;
        document.head.appendChild(style);
    }

    document.getElementById("btn-abort-main").addEventListener("click", () => { 
        document.getElementById("override-modal").style.display = "flex"; 
    });
    
    document.getElementById("btn-complete-main").addEventListener("click", evaluateMissionComplete);
    
    // YENİ E-STOP BUTONU İŞLEVİ
    document.getElementById("btn-estop").addEventListener("click", () => {
        if (SimEngine.isRunning) executeEmergencyStop();
    });

    // YENİ BUZZER STOP BUTONU İŞLEVİ
    document.getElementById("btn-buzzer-stop").addEventListener("click", () => {
        if (SimEngine.isRunning) SimEngine.buzzerStop();
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Enter') {
            let noteInput = document.getElementById("note-input");
            if (document.activeElement === noteInput) {
                addNote();
            }
        }
    });
});

// TEMA DEĞİŞTİRME FONKSİYONU
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    let isLight = document.body.classList.contains('light-theme');
    let btn = document.getElementById('btn-theme');
    
    if (isLight) {
        btn.innerText = "🌙 DARK";
        btn.style.color = "#333";
    } else {
        btn.innerText = "☀️ LIGHT";
        btn.style.color = "#FFB300";
    }

    // Chart.js renklerini güncelle
    if (stressChartObj) {
        let textColor = isLight ? '#2B261C' : 'white';
        let gridColor = isLight ? '#D6CFC1' : '#333';
        
        stressChartObj.options.scales.x.grid.color = gridColor;
        stressChartObj.options.scales.x.ticks.color = textColor;
        stressChartObj.options.scales.y.grid.color = gridColor;
        stressChartObj.options.scales.y.ticks.color = textColor;
        stressChartObj.options.plugins.legend.labels.color = textColor;
        
        stressChartObj.update();
    }
}

// UI FUNCTIONS
function setFlow(element, flowClass) {
    if (!element) return;
    element.classList.remove('flow-c-right', 'flow-c-left', 'flow-c-up', 'flow-c-down', 'flow-b-right', 'flow-b-left', 'flow-b-up', 'flow-b-down', 'pipe-empty', 'pipe-filled-b');
    if (flowClass) element.classList.add(flowClass);
}

function setFlows(elementIds, flowClass) {
    elementIds.forEach(id => {
        let el = document.getElementById(id);
        if(el) setFlow(el, flowClass);
    });
}

function navigate(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('sim-container').style.display = 'none';
    document.getElementById(screenId).classList.add('active');
}

function openBriefing(missionId) {
    currentMissionId = missionId;
    let titleStr = "";
    let isLoad = (missionId === 2 || missionId === 4 || missionId === 5);

    if(missionId === 1) titleStr = "DISCHARGING OPERATION";
    else if(missionId === 2) titleStr = "LOADING OPERATION";
    else if(missionId === 3) titleStr = "DYNAMIC DISCHARGE (RANDOM)";
    else if(missionId === 4) titleStr = "DYNAMIC LOAD (RANDOM)";
    else if(missionId === 5) titleStr = "LOADING TUTORIAL";
    else if(missionId === 6) titleStr = "DISCHARGING TUTORIAL";
    
    document.getElementById('br-main-title').innerText = titleStr + " BRIEFING";

    let constraintsText = document.getElementById('br-constraints-text');
    if (isLoad) {
        constraintsText.innerHTML = "• Maximum List: 1.0°<br>• Maximum Trim: 3.0m<br>• Minimum Draft: 3.0m<br>• Minimum GM: 0.15m";
    } else {
        constraintsText.innerHTML = "• Maximum List: 1.0°<br>• Maximum Trim: 3.0m<br>• Minimum Draft: 3.0m<br>• Minimum GM: 0.15m<br>• Max 4 Cargo Pumps running simultaneously<br>• Max Manifold Pressure: 10.0 bar";
    }

    navigate('screen-briefing');
}

function startSimulation() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('sim-container').style.display = 'flex';
    
    SimEngine.initTanks(currentMissionId); 
    
    let objText = "";
    if(currentMissionId === 1) { objText = "MISSION: DISCHARGE ALL CARGO TO SHORE"; } 
    else if(currentMissionId === 2) { objText = "MISSION: LOAD CARGO FROM SHORE"; } 
    else if(currentMissionId === 3) {
        let targetRobMt = SimEngine.initialTotalMass - SimEngine.targetOperationMass;
        objText = `MISSION: DISCHARGE ${Math.round(SimEngine.targetOperationMass)} MT (TARGET ROB: ${targetRobMt.toFixed(1)} MT)`;
    } else if(currentMissionId === 4) {
        let targetRobMt = SimEngine.initialTotalMass + SimEngine.targetOperationMass;
        objText = `MISSION: LOAD ${Math.round(SimEngine.targetOperationMass)} MT (TARGET ROB: ${targetRobMt.toFixed(1)} MT)`;
    } else if(currentMissionId === 5) { objText = "TUTORIAL: LOAD CARGO"; } 
    else if(currentMissionId === 6) { objText = "TUTORIAL: DISCHARGE CARGO"; }
    
    document.getElementById('tv-objective').innerText = objText;

    tutStep = 0;
    document.getElementById('tut-overlay').style.display = (currentMissionId === 5 || currentMissionId === 6) ? 'block' : 'none';

    initUI();
    initChart();
    
    SimEngine.isRunning = true;
    if(renderInterval) clearInterval(renderInterval);
    renderInterval = setInterval(updateScreen, 100);
}

function switchTab(viewId, btnElement) {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn:not(#btn-theme)').forEach(b => b.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    btnElement.classList.add('active');
    
    if (viewId === 'view-loadicator') {
        initLoadicatorValues();
    }
    
    if (viewId === 'view-stability' && stressChartObj) {
        stressChartObj.resize();
    }
}

function toggleSpeed() {
    const btn = document.getElementById('btn-speed');
    if(currentSpeed === 1) { currentSpeed = 10; btn.innerText = "10X SPEED"; btn.style.color = "#FFD700"; }
    else if(currentSpeed === 10) { currentSpeed = 50; btn.innerText = "50X SPEED"; btn.style.color = "#FF4500"; }
    else { currentSpeed = 1; btn.innerText = "1X SPEED"; btn.style.color = ""; }
}

function initChart() {
    const ctx = document.getElementById('stressChart').getContext('2d');
    if (stressChartObj) stressChartObj.destroy();
    
    let isLight = document.body.classList.contains('light-theme');
    let textColor = isLight ? '#2B261C' : 'white';
    let gridColor = isLight ? '#D6CFC1' : '#333';

    stressChartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Aft', 'Frame 1', 'Frame 2', 'Frame 3', 'Fwd'],
            datasets: [
                { label: 'Bending Moment (%)', data: [0,0,0,0,0], borderColor: 'orange', borderWidth: 2, tension: 0.4 },
                { label: 'Shear Force (%)', data: [0,0,0,0,0], borderColor: 'cyan', borderWidth: 2, tension: 0.4 },
                { label: '+100% Limit', data: [100,100,100,100,100], borderColor: 'red', borderDash: [5,5], borderWidth: 1, pointRadius: 0 },
                { label: '-100% Limit', data: [-100,-100,-100,-100,-100], borderColor: 'red', borderDash: [5,5], borderWidth: 1, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { 
                y: { min: -120, max: 120, grid: { color: gridColor }, ticks: { color: textColor } }, 
                x: { grid: { color: gridColor }, ticks: { color: textColor } } 
            },
            plugins: { legend: { labels: { color: textColor, font: { size: 10 } } } }
        }
    });
}

function executeEmergencyStop() {
    SimEngine.tanks.forEach(t => { t.pOn = false; t.pSpd = 0; });
    SimEngine.bpPortOn = false;
    SimEngine.bpStbdOn = false;
    SimEngine.manifold = false;
    
    let banner = document.getElementById('alarm-banner');
    banner.style.display = "block";
    banner.classList.add("estop-active");
    banner.innerText = "🚨 EMERGENCY STOP ACTIVATED 🚨 PUMPS SHUT DOWN!";
    
    setTimeout(() => { banner.classList.remove("estop-active"); }, 3000);
}

function toggleEngineState(tankId, prop) {
    if(currentSpeed > 1) return; 
    if(tankId == null) { SimEngine[prop] = !SimEngine[prop]; } 
    else { let t = SimEngine.tanks.find(x => x.id === tankId); if(t) t[prop] = !t[prop]; }
}

function buildMimicRow(portTank, stbdTank) {
    return `
        <div class="m-row" style="display:flex; width:100%; height:130px; align-items:center; position:relative; z-index:2; margin-bottom: 20px;">
            <div class="m-port-side" style="flex:1; display:flex; align-items:center; justify-content:flex-end; padding-right:0;">
                <div class="m-tank-container" style="display:flex; flex-direction:column; align-items:center; margin-right:-4px; z-index:5;">
                    <div class="m-tank">${portTank.id}</div>
                    <div id="tv-pspd-${portTank.id}" style="font-size:10px; color:yellow; margin-top:4px;">0%</div>
                    <input type="range" class="slider" id="sb-pspd-${portTank.id}" min="0" max="100" value="0" style="width:50px; margin:0; cursor:pointer;">
                </div>
                
                <div id="m-pipe-port-${portTank.id}" style="width:140px; min-width:140px; height:60px; position:relative; z-index:2;">
                    <div id="pipe-p-top-${portTank.id}" class="pid-pipe" style="top:0; left:0; width:140px; height:8px; border-radius:4px; transition:0.3s;"></div>
                    <div id="pipe-p-bot-${portTank.id}" class="pid-pipe" style="bottom:0; left:0; width:140px; height:8px; border-radius:4px; transition:0.3s;"></div>
                    <div id="pipe-p-vert-${portTank.id}" class="pid-pipe" style="top:0; right:0; width:8px; height:60px; border-radius:4px; transition:0.3s;"></div>
                    
                    <div class="m-valve" id="mimic-vDrop-${portTank.id}" style="position:absolute; bottom:-10px; right:35px;"></div>
                    <div class="m-label" style="position:absolute; bottom:-30px; right:30px; text-align:center; width:40px;">DROP</div>
                    
                    <div class="m-valve" id="mimic-vDisch-${portTank.id}" style="position:absolute; top:-8px; right:15px;"></div>
                    <div class="m-label" style="position:absolute; top:-28px; right:10px; text-align:center; width:40px;">DISCH</div>
                    
                    <div class="m-pump" id="mimic-pOn-${portTank.id}" style="position:absolute; top:-9px; left:10px; font-size:18px;">✺</div>
                    <div class="m-label" style="position:absolute; top:-27px; left:5px; text-align:center; width:40px;">PUMP</div>
                </div>
                
                <div id="m-pipe-coll-container-${portTank.id}" style="flex-grow:1; height:8px; border-radius:4px; background:#555; position:relative; display:flex; align-items:center; justify-content:center; min-width:50px;">
                    <div id="m-pipe-coll-tank-${portTank.id}" class="pid-pipe" style="position:absolute; left:0; width:50%; height:100%; border-radius:4px 0 0 4px; background:transparent; transition:0.3s;"></div>
                    <div id="m-pipe-coll-mani-${portTank.id}" class="pid-pipe" style="position:absolute; right:0; width:50%; height:100%; border-radius:0 4px 4px 0; background:transparent; transition:0.3s;"></div>
                    <div class="m-valve" id="mimic-vColl-${portTank.id}" style="z-index:3;"></div>
                    <div class="m-label" style="position:absolute; top:-25px; white-space:nowrap; z-index:4;">${portTank.id} COLL</div>
                </div>
            </div>
            
            <div style="width:16px; background: transparent;"></div> 
            <div class="m-stbd-side" style="flex:1; display:flex; align-items:center; justify-content:flex-start; padding-left:0;">
                
                <div id="m-pipe-coll-container-${stbdTank.id}" style="flex-grow:1; height:8px; border-radius:4px; background:#555; position:relative; display:flex; align-items:center; justify-content:center; min-width:50px;">
                    <div id="m-pipe-coll-mani-${stbdTank.id}" class="pid-pipe" style="position:absolute; left:0; width:50%; height:100%; border-radius:4px 0 0 4px; background:transparent; transition:0.3s;"></div>
                    <div id="m-pipe-coll-tank-${stbdTank.id}" class="pid-pipe" style="position:absolute; right:0; width:50%; height:100%; border-radius:0 4px 4px 0; background:transparent; transition:0.3s;"></div>
                    <div class="m-valve" id="mimic-vColl-${stbdTank.id}" style="z-index:3;"></div>
                    <div class="m-label" style="position:absolute; top:-25px; white-space:nowrap; z-index:4;">${stbdTank.id} COLL</div>
                </div>
                
                <div id="m-pipe-stbd-${stbdTank.id}" style="width:140px; min-width:140px; height:60px; position:relative; z-index:2;">
                    <div id="pipe-s-top-${stbdTank.id}" class="pid-pipe" style="top:0; left:0; width:140px; height:8px; border-radius:4px; transition:0.3s;"></div>
                    <div id="pipe-s-bot-${stbdTank.id}" class="pid-pipe" style="bottom:0; left:0; width:140px; height:8px; border-radius:4px; transition:0.3s;"></div>
                    <div id="pipe-s-vert-${stbdTank.id}" class="pid-pipe" style="top:0; left:0; width:8px; height:60px; border-radius:4px; transition:0.3s;"></div>
                    
                    <div class="m-pump" id="mimic-pOn-${stbdTank.id}" style="position:absolute; top:-9px; right:10px; font-size:18px;">✺</div>
                    <div class="m-label" style="position:absolute; top:-27px; right:5px; text-align:center; width:40px;">PUMP</div>
                    
                    <div class="m-valve" id="mimic-vDisch-${stbdTank.id}" style="position:absolute; top:-8px; left:15px;"></div>
                    <div class="m-label" style="position:absolute; top:-28px; left:10px; text-align:center; width:40px;">DISCH</div>
                    
                    <div class="m-valve" id="mimic-vDrop-${stbdTank.id}" style="position:absolute; bottom:-10px; left:35px;"></div>
                    <div class="m-label" style="position:absolute; bottom:-30px; left:30px; text-align:center; width:40px;">DROP</div>
                </div>
                
                <div class="m-tank-container" style="display:flex; flex-direction:column; align-items:center; margin-left:-4px; z-index:5;">
                    <div class="m-tank">${stbdTank.id}</div>
                    <div id="tv-pspd-${stbdTank.id}" style="font-size:10px; color:yellow; margin-top:4px;">0%</div>
                    <input type="range" class="slider" id="sb-pspd-${stbdTank.id}" min="0" max="100" value="0" style="width:50px; margin:0; cursor:pointer;">
                </div>
            </div>
        </div>
    `;
}

function changeCargo() {
    let el = document.getElementById("cargo-select");
    SimEngine.activeCargoId = el.value;
    updateCargoDisplay();
    runLoadicator();
}

function updateCargoDisplay() {
    let cargo = SimEngine.cargoList.find(c => c.id === SimEngine.activeCargoId) || SimEngine.cargoList[0];
    document.getElementById("cargo-density-display").innerText = `DENSITY @ 15°C: ${cargo.dens15.toFixed(3)} t/m3`;
}

function initUI() {
    let cargoSelect = document.getElementById("cargo-select");
    if(cargoSelect && cargoSelect.options.length === 0) {
        SimEngine.cargoList.forEach(c => {
            let opt = document.createElement("option");
            opt.value = c.id;
            opt.innerText = c.name;
            if (c.id === SimEngine.activeCargoId) opt.selected = true;
            cargoSelect.appendChild(opt);
        });
        updateCargoDisplay();
    }

    const ovPort = document.getElementById('ov-row-port'); const ovStbd = document.getElementById('ov-row-stbd');
    ovPort.innerHTML = ""; ovStbd.innerHTML = ""; 

    const portTanksReversed = [...SimEngine.tanks.filter(t => t.isPort)].reverse();
    const stbdTanksReversed = [...SimEngine.tanks.filter(t => !t.isPort)].reverse();

    const markersHTML = `<div class="tank-markers">` + 
        [90,80,70,60,50,40,30,20,10].map(m => `<div class="marker-line" style="bottom:${m}%">${m}</div>`).join('') + `</div>`;

    portTanksReversed.forEach(t => {
        let currentCargoOpts = SimEngine.cargoList.map(c => `<option value="${c.id}" ${t.cargoId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
        ovPort.innerHTML += `
            <div class="tank-box">
                <div class="tank-name">
                    ${t.id} 
                    <select class="tank-cargo-select" data-tankid="${t.id}">${currentCargoOpts}</select>
                    <span class="val-temp" id="ov-temp-${t.id}" style="margin-left:5px; font-size:10px;">${t.temp}°C</span>
                </div>
                <div class="tank-frame" id="frame-${t.id}">
                    <div id="ov-liq-${t.id}" class="liquid" style="height:0%;"></div>
                    ${markersHTML}
                </div>
                <div class="tank-info val-vol" id="ov-vol-${t.id}">0.0 m3</div>
                <div class="tank-info val-mt" id="ov-mt-${t.id}">0.0 MT</div>
                <div class="tank-info val-ullage" id="ov-ull-${t.id}">ULL: 0.00 m</div>
                <div class="tank-info val-rate" id="ov-rate-${t.id}">0 m3/h</div>
                <div class="tank-info val-press" id="ov-press-${t.id}">0 mbar</div>
                <div class="tank-info" id="ov-pv-${t.id}" style="color: gray; font-weight: bold; margin-top: 2px;">PV: CLOSED</div>
            </div>`;
    });

    stbdTanksReversed.forEach(t => {
        let currentCargoOpts = SimEngine.cargoList.map(c => `<option value="${c.id}" ${t.cargoId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
        ovStbd.innerHTML += `
            <div class="tank-box">
                <div class="tank-name">
                    ${t.id} 
                    <select class="tank-cargo-select" data-tankid="${t.id}">${currentCargoOpts}</select>
                    <span class="val-temp" id="ov-temp-${t.id}" style="margin-left:5px; font-size:10px;">${t.temp}°C</span>
                </div>
                <div class="tank-frame" id="frame-${t.id}">
                    <div id="ov-liq-${t.id}" class="liquid" style="height:0%;"></div>
                    ${markersHTML}
                </div>
                <div class="tank-info val-vol" id="ov-vol-${t.id}">0.0 m3</div>
                <div class="tank-info val-mt" id="ov-mt-${t.id}">0.0 MT</div>
                <div class="tank-info val-ullage" id="ov-ull-${t.id}">ULL: 0.00 m</div>
                <div class="tank-info val-rate" id="ov-rate-${t.id}">0 m3/h</div>
                <div class="tank-info val-press" id="ov-press-${t.id}">0 mbar</div>
                <div class="tank-info" id="ov-pv-${t.id}" style="color: gray; font-weight: bold; margin-top: 2px;">PV: CLOSED</div>
            </div>`;
    });

    document.querySelectorAll('.tank-cargo-select').forEach(sel => {
        sel.addEventListener('change', function() {
            let tid = this.getAttribute('data-tankid');
            let t = SimEngine.tanks.find(x => x.id === tid);
            if (t) {
                t.cargoId = this.value;
                updateScreen();
            }
        });
    });

    let mimicRowsHtml = "";
    for(let i=1; i<=4; i++) {
        let pTank = SimEngine.tanks.find(t => t.id === `${i}P`);
        let sTank = SimEngine.tanks.find(t => t.id === `${i}S`);
        mimicRowsHtml += buildMimicRow(pTank, sTank);
    }
    document.getElementById('mimic-rows-container').innerHTML = mimicRowsHtml;

    document.getElementById('mimic-mani-val').onclick = function() { toggleEngineState(null, 'manifold'); };

    setTimeout(() => {
        SimEngine.tanks.forEach(t => {
            document.getElementById(`mimic-vDrop-${t.id}`).onclick = function(){ toggleEngineState(t.id, 'vDrop'); };
            document.getElementById(`mimic-vDisch-${t.id}`).onclick = function(){ toggleEngineState(t.id, 'vDisch'); };
            document.getElementById(`mimic-vColl-${t.id}`).onclick = function(){ toggleEngineState(t.id, 'vColl'); };
            document.getElementById(`mimic-pOn-${t.id}`).onclick = function(){ toggleEngineState(t.id, 'pOn'); };
            
            let slider = document.getElementById(`sb-pspd-${t.id}`);
            if(slider) {
                slider.oninput = function() {
                    if(currentSpeed > 1) { this.value = t.pSpd; return; }
                    if(t.pOn) {
                        t.pSpd = this.value;
                        document.getElementById(`tv-pspd-${t.id}`).innerText = `${this.value}%`;
                    } else {
                        this.value = 0;
                    }
                };
            }
        });
    }, 100);

    const blRowAll = document.getElementById('bl-row-all');
    const blValvesP = document.getElementById('bl-valves-port'); const blValvesS = document.getElementById('bl-valves-stbd');
    blRowAll.innerHTML = ""; blValvesP.innerHTML = ""; blValvesS.innerHTML = ""; 
    
    const blOrder = ["WB4P", "WB4S", "WB3P", "WB3S", "WB2P", "WB2S", "WB1P", "WB1S"];
    blOrder.forEach(id => {
        let t = SimEngine.ballastTanks.find(x => x.id === id);
        blRowAll.innerHTML += `
            <div class="tank-box" style="margin:2px; padding:5px;">
                <div class="tank-name" style="font-size:11px;">${t.id}</div>
                <div class="tank-frame">
                    <div id="bl-liq-${t.id}" class="liquid liquid-ballast" style="height:0%;"></div>
                    ${markersHTML}
                </div>
                <div class="tank-info val-vol" id="bl-vol-${t.id}">0.0 m3</div>
                <div class="tank-info val-rate" id="bl-rate-${t.id}" style="color: #00FF00;">0 m3/h</div>
            </div>`;
    });

    SimEngine.ballastTanks.filter(t => t.isPort).reverse().forEach(t => { blValvesP.innerHTML += `<button id="btn-bvalve-${t.id}" class="btn-toggle" style="margin:2px; padding:5px; font-size:10px;">${t.id}</button>`; });
    SimEngine.ballastTanks.filter(t => !t.isPort).reverse().forEach(t => { blValvesS.innerHTML += `<button id="btn-bvalve-${t.id}" class="btn-toggle" style="margin:2px; padding:5px; font-size:10px;">${t.id}</button>`; });

    setTimeout(() => {
        SimEngine.ballastTanks.forEach(t => {
            document.getElementById(`btn-bvalve-${t.id}`).onclick = function(){ 
                if(currentSpeed > 1) return;
                t.vOpen = !t.vOpen; 
                this.classList.toggle('on');
            };
        });
        
        for(let i=1; i<=10; i++) { 
            let vId = 'v' + i; 
            let el = document.getElementById(vId);
            if(el) {
                el.onclick = function() { 
                    if(currentSpeed > 1) return; 
                    SimEngine['b_' + vId] = !SimEngine['b_' + vId]; 
                }; 
            }
        }

        document.getElementById('pP').onclick = function(){ if(currentSpeed > 1) return; SimEngine.bpPortOn = !SimEngine.bpPortOn; }
        document.getElementById('pS').onclick = function(){ if(currentSpeed > 1) return; SimEngine.bpStbdOn = !SimEngine.bpStbdOn; }

        document.getElementById('sb-bp-port').oninput = function() { if(currentSpeed > 1) { this.value = SimEngine.bpPortSpeed; return; } SimEngine.bpPortSpeed = this.value; document.getElementById('tv-bp-port-spd').innerText = `${this.value}%`; };
        document.getElementById('sb-bp-stbd').oninput = function() { if(currentSpeed > 1) { this.value = SimEngine.bpStbdSpeed; return; } SimEngine.bpStbdSpeed = this.value; document.getElementById('tv-bp-stbd-spd').innerText = `${this.value}%`; };
        
    }, 500);

    let loadCargoHtml = "";
    const cargoOrder = ["1P", "1S", "2P", "2S", "3P", "3S", "4P", "4S"];
    cargoOrder.forEach(id => {
        let t = SimEngine.tanks.find(x => x.id === id);
        if(t) {
            loadCargoHtml += `
                <div class="input-row">
                    <label>${t.id} (Max: ${t.cap.toFixed(0)})</label>
                    <input type="number" id="in-cargo-${t.id}" value="0" min="0" max="${t.cap}">
                </div>
            `;
        }
    });
    document.getElementById("loadicator-cargo-inputs").innerHTML = loadCargoHtml;

    let loadBallastHtml = "";
    const ballastOrder = ["WB1P", "WB1S", "WB2P", "WB2S", "WB3P", "WB3S", "WB4P", "WB4S"];
    ballastOrder.forEach(id => {
        let t = SimEngine.ballastTanks.find(x => x.id === id);
        if(t) {
            loadBallastHtml += `
                <div class="input-row">
                    <label>${t.id} (Max: ${t.cap.toFixed(0)})</label>
                    <input type="number" id="in-ballast-${t.id}" value="0" min="0" max="${t.cap}">
                </div>
            `;
        }
    });
    document.getElementById("loadicator-ballast-inputs").innerHTML = loadBallastHtml;
}

function initLoadicatorValues() {
    SimEngine.tanks.forEach(t => {
        let el = document.getElementById(`in-cargo-${t.id}`);
        if(el) el.value = t.vol.toFixed(1);
    });
    SimEngine.ballastTanks.forEach(t => {
        let el = document.getElementById(`in-ballast-${t.id}`);
        if(el) el.value = t.vol.toFixed(1);
    });
    
    runLoadicator();
}

function runLoadicator() {
    let cargoInputs = [];
    SimEngine.tanks.forEach((t, i) => {
        let val = parseFloat(document.getElementById(`in-cargo-${t.id}`).value) || 0;
        if(val < 0) val = 0; if(val > t.cap) val = t.cap;
        cargoInputs[i] = val;
    });

    let ballastInputs = [];
    SimEngine.ballastTanks.forEach((t, i) => {
        let val = parseFloat(document.getElementById(`in-ballast-${t.id}`).value) || 0;
        if(val < 0) val = 0; if(val > t.cap) val = t.cap;
        ballastInputs[i] = val;
    });

    let pred = SimEngine.predictStability(cargoInputs, ballastInputs);

    let lText = pred.list > 0 ? "STARBOARD" : (pred.list < 0 ? "PORT" : "");
    let tText = pred.trim > 0 ? "AFT" : (pred.trim < 0 ? "FWD" : "");

    document.getElementById("pred-draft").innerText = `DRAFT FWD: ${pred.draftFwd.toFixed(2)} m | AFT: ${pred.draftAft.toFixed(2)} m`;
    document.getElementById("pred-trim").innerText = `TRIM: ${Math.abs(pred.trim).toFixed(2)} m ${tText}`;
    document.getElementById("pred-list").innerText = `LIST: ${Math.abs(pred.list).toFixed(2)}° ${lText}`;
    
    let elBm = document.getElementById("pred-bm"); 
    elBm.innerText = `BM: ${pred.bm.toFixed(1)}%`; 
    elBm.className = pred.bm > 85 ? "text-danger" : (pred.bm > 60 ? "text-warn" : "text-safe");
    
    let elSf = document.getElementById("pred-sf"); 
    elSf.innerText = `SF: ${pred.sf.toFixed(1)}%`; 
    elSf.className = pred.sf > 85 ? "text-danger" : (pred.sf > 60 ? "text-warn" : "text-safe");
    
    let elGm = document.getElementById("pred-gm"); 
    elGm.innerText = `GM: ${pred.gm.toFixed(3)} m`; 
    elGm.className = pred.gm < 0.15 ? "text-danger" : (pred.gm < 0.5 ? "text-warn" : "text-safe");

    let meanDraft = (pred.draftFwd + pred.draftAft) / 2;
    let draftRatio = (meanDraft - 3.0) / 8.5; if(draftRatio > 1) draftRatio = 1; if(draftRatio < 0) draftRatio = 0;
    
    const maxRise = 40; 
    let currentBottom = 10 + ((1 - draftRatio) * maxRise);
    const listDeg = pred.list * 1.5; 
    const trimDeg = -pred.trim * 2;
    const miniBackOffset = 5;

    const iPredBack = document.getElementById("img-pred-back"); 
    const iPredSide = document.getElementById("img-pred-side");
    
    if(iPredBack) { 
        iPredBack.style.transform = `rotate(${listDeg}deg)`; 
        iPredBack.style.bottom = `${(currentBottom/3) - miniBackOffset}px`; 
    }
    if(iPredSide) { 
        iPredSide.style.transform = `rotate(${trimDeg}deg)`; 
        iPredSide.style.bottom = `${currentBottom/3}px`; 
    }
}

// CHECKLIST FONKSİYONLARI
let noteIdCounter = 0;
function addNote() {
    let inputEl = document.getElementById("note-input");
    let text = inputEl.value.trim();
    if(text === "") return;
    
    noteIdCounter++;
    let noteId = "note-" + noteIdCounter;
    
    let listEl = document.getElementById("note-list");
    let noteDiv = document.createElement('div');
    noteDiv.className = "checklist-item";
    noteDiv.id = noteId;
    
    noteDiv.innerHTML = `
        <span style="flex-grow:1; margin-right: 10px; word-break: break-word;">${text}</span>
        <div style="display:flex; gap: 5px;">
            <button class="btn-check" onclick="toggleNote('${noteId}')">✔</button>
            <button class="btn-del" onclick="deleteNote('${noteId}')">✖</button>
        </div>
    `;
    
    listEl.appendChild(noteDiv);
    inputEl.value = "";
}

function toggleNote(id) {
    let el = document.getElementById(id);
    if(el) el.classList.toggle('done');
}
function deleteNote(id) {
    let el = document.getElementById(id);
    if(el) el.remove();
}

function updateTutorial() {
    if (currentMissionId !== 5 && currentMissionId !== 6) return;
    let title = document.getElementById('tut-title'); let msg = document.getElementById('tut-msg'); let activeTab = document.querySelector('.view-panel.active').id;

    if (currentMissionId === 5) {
        if (tutStep === 0) {
            title.innerText = "TUTORIAL: STEP 1/13"; msg.innerHTML = "Welcome to Loading Operations! Before we touch any valves, let's plan ahead. Switch to the <span class='tut-hl'>LOADICATOR</span> tab from the bottom menu.";
            if (activeTab === 'view-loadicator') tutStep++;
        } else if (tutStep === 1) {
            title.innerText = "TUTORIAL: STEP 2/13"; msg.innerHTML = "This is your planning tool. Pick your cargo, type target volumes (e.g. 500 for 1P and 1S), then click <span class='tut-hl'>CALCULATE ESTIMATE</span>.";
            let elDraft = document.getElementById("pred-draft").innerText;
            if (elDraft !== "DRAFT FWD: -- | AFT: --") tutStep++;
        } else if (tutStep === 2) {
            title.innerText = "TUTORIAL: STEP 3/13"; msg.innerHTML = "Great! You can see how the ship will behave. Now, write a reminder in the Checklist (e.g., 'Load 1W') and click <span class='tut-hl'>ADD</span>.";
            if (document.querySelectorAll('.checklist-item').length > 0) tutStep++;
        } else if (tutStep === 3) {
            title.innerText = "TUTORIAL: STEP 4/13"; msg.innerHTML = "Perfect! You can tick it off later. Now, let's execute the plan. Switch to the <span class='tut-hl'>CARGO SYSTEM</span> tab.";
            if (activeTab === 'view-cargo') tutStep++;
        } else if (tutStep === 4) {
            title.innerText = "TUTORIAL: STEP 5/13"; msg.innerHTML = "To start loading, first open the <span class='tut-hl'>DROP</span> valve for any empty tank.";
            if (SimEngine.tanks.some(t => t.vDrop)) tutStep++;
        } else if (tutStep === 5) {
            title.innerText = "TUTORIAL: STEP 6/13"; msg.innerHTML = "Next, open the <span class='tut-hl'>COLL</span> (Collector) valve for the same tank so it connects to the main line.";
            if (SimEngine.tanks.some(t => t.vColl)) tutStep++;
        } else if (tutStep === 6) {
            title.innerText = "TUTORIAL: STEP 7/13"; msg.innerHTML = "Finally, click the <span class='tut-hl'>COMMON MANIFOLD</span> valve (the red circle at the top) to let the shore cargo flow into the ship.";
            if (SimEngine.manifold) tutStep++;
        } else if (tutStep === 7) {
            title.innerText = "TUTORIAL: STEP 8/13"; msg.innerHTML = "Cargo is flowing! As cargo enters, the ship gets heavier, so we must DISCHARGE ballast. Switch to the <span class='tut-hl'>BALLAST SYSTEM</span> tab.";
            if (activeTab === 'view-ballast') tutStep++;
        } else if (tutStep === 8) {
            title.innerText = "TUTORIAL: STEP 9/13"; msg.innerHTML = "To pump ballast overboard, open a Port Tank valve (like WB4P) on the right, then open <span class='tut-hl'>V3 (Tank Suction)</span> and <span class='tut-hl'>V4 (Overboard)</span>.";
            let tOpen = SimEngine.ballastTanks.some(t => t.vOpen && t.isPort);
            if (SimEngine.b_v3 && SimEngine.b_v4 && tOpen) tutStep++;
        } else if (tutStep === 9) {
            title.innerText = "TUTORIAL: STEP 10/13"; msg.innerHTML = "Now turn on the <span class='tut-hl'>Port Pump (P)</span> and move its slider slightly to the right to pump the water out to sea.";
            if (SimEngine.bpPortOn && SimEngine.bpPortSpeed > 0) tutStep++;
        } else if (tutStep === 10) {
            title.innerText = "TUTORIAL: STEP 11/13"; msg.innerHTML = "Excellent! Let's check the ship's safety limits. Switch to the <span class='tut-hl'>STABILITY & STRESS</span> tab.";
            if (activeTab === 'view-stability') tutStep++;
        } else if (tutStep === 11) {
            title.innerText = "TUTORIAL: STEP 12/13"; msg.innerHTML = "CRITICAL METRIC: <span class='tut-hl'>GM (Metacentric Height)</span> must NEVER be negative! If GM is negative, the ship capsizes! <span class='tut-hl'>BM & SF</span> must stay below 100%.";
            setTimeout(() => { tutStep++; }, 8000);
        } else if (tutStep === 12) {
            title.innerText = "TUTORIAL: STEP 13/13"; msg.innerHTML = "You are fully in control! Use the <span class='tut-hl'>1X SPEED</span> button at the bottom to fast forward. Switch to LOADICATOR anytime to check off your notes. Good luck!";
        }
    } else if (currentMissionId === 6) {
        if (tutStep === 0) {
            title.innerText = "TUTORIAL: STEP 1/16"; msg.innerHTML = "Welcome to Discharging Operations! Before pumping out, switch to the <span class='tut-hl'>LOADICATOR</span> tab.";
            if (activeTab === 'view-loadicator') tutStep++;
        } else if (tutStep === 1) {
            title.innerText = "TUTORIAL: STEP 2/16"; msg.innerHTML = "Set the cargo inputs to 0 to simulate an empty ship, but add some ballast water (e.g. 800 in WB2P/S), then <span class='tut-hl'>CALCULATE ESTIMATE</span>.";
            let elDraft = document.getElementById("pred-draft").innerText;
            if (elDraft !== "DRAFT FWD: -- | AFT: --") tutStep++;
        } else if (tutStep === 2) {
            title.innerText = "TUTORIAL: STEP 3/16"; msg.innerHTML = "Write a note in the Checklist (e.g., 'Discharge all cargo, load ballast') and click <span class='tut-hl'>ADD</span>.";
            if (document.querySelectorAll('.checklist-item').length > 0) tutStep++;
        } else if (tutStep === 3) {
            title.innerText = "TUTORIAL: STEP 4/16"; msg.innerHTML = "Plan ready! Switch to the <span class='tut-hl'>CARGO SYSTEM</span> tab to begin.";
            if (activeTab === 'view-cargo') tutStep++;
        } else if (tutStep === 4) {
            title.innerText = "TUTORIAL: STEP 5/16"; msg.innerHTML = "First, start the <span class='tut-hl'>PUMP (▶)</span> for any of the loaded tanks.";
            if (SimEngine.tanks.some(t => t.pOn)) tutStep++;
        } else if (tutStep === 5) {
            title.innerText = "TUTORIAL: STEP 6/16"; msg.innerHTML = "Now open the <span class='tut-hl'>DISCH</span> valve for that tank to let the pump push the cargo out.";
            if (SimEngine.tanks.some(t => t.vDisch && t.pOn)) tutStep++;
        } else if (tutStep === 6) {
            title.innerText = "TUTORIAL: STEP 7/16"; msg.innerHTML = "Set the pump speed slider to around <span class='tut-hl'>30%</span> to safely build up initial pressure before opening the line.";
            if (SimEngine.tanks.some(t => t.pSpd >= 25 && t.pOn)) tutStep++;
        } else if (tutStep === 7) {
            title.innerText = "TUTORIAL: STEP 8/16"; msg.innerHTML = "Open the <span class='tut-hl'>COLL</span> (Collector) valve to release the cargo into the main collector line.";
            if (SimEngine.tanks.some(t => t.vColl)) tutStep++;
        } else if (tutStep === 8) {
            title.innerText = "TUTORIAL: STEP 9/16"; msg.innerHTML = "Open the <span class='tut-hl'>COMMON MANIFOLD</span> to start sending cargo to the shore facility.";
            if (SimEngine.manifold) tutStep++;
        } else if (tutStep === 9) {
            title.innerText = "TUTORIAL: STEP 10/16"; msg.innerHTML = "Slowly increase the pump speed to <span class='tut-hl'>100%</span>. <br><br><span style='color:red;'>Watch the Manifold Pressure (right panel) carefully! It must not exceed 10.0 BAR!</span>";
            if (SimEngine.tanks.some(t => t.pSpd >= 90)) tutStep++;
        } else if (tutStep === 10) {
            title.innerText = "TUTORIAL: STEP 11/16"; msg.innerHTML = "Cargo is leaving the ship and it's getting lighter! We must take on ballast water to keep it stable. Switch to the <span class='tut-hl'>BALLAST SYSTEM</span> tab.";
            if (activeTab === 'view-ballast') tutStep++;
        } else if (tutStep === 11) {
            title.innerText = "TUTORIAL: STEP 12/16"; msg.innerHTML = "To start taking ballast, open <span class='tut-hl'>V1 (Sea Chest)</span>, <span class='tut-hl'>V2 (Port Suction)</span>, <span class='tut-hl'>V9 (Port Main)</span>, and at least one Port Tank valve (like WB4P).";
            let tOpen = SimEngine.ballastTanks.some(t => t.vOpen && t.isPort);
            if (SimEngine.b_v1 && SimEngine.b_v2 && SimEngine.b_v9 && tOpen) tutStep++;
        } else if (tutStep === 12) {
            title.innerText = "TUTORIAL: STEP 13/16"; msg.innerHTML = "Turn on the <span class='tut-hl'>Port Pump (P)</span> and move its slider slightly to the right to start loading ballast water.";
            if (SimEngine.bpPortOn && SimEngine.bpPortSpeed > 0) tutStep++;
        } else if (tutStep === 13) {
            title.innerText = "TUTORIAL: STEP 14/16"; msg.innerHTML = "Great! Let's check our structural limits. Open the <span class='tut-hl'>STABILITY & STRESS</span> tab.";
            if (activeTab === 'view-stability') tutStep++;
        } else if (tutStep === 14) {
            title.innerText = "TUTORIAL: STEP 15/16"; msg.innerHTML = "Remember the golden rules: <span class='tut-hl'>BM/SF < 100%</span>, <span class='tut-hl'>Trim < 3.0m</span>, and <span class='tut-hl'>List < 1.0°</span>! Exceeding these fails the mission.";
            setTimeout(() => { tutStep++; }, 8000);
        } else if (tutStep === 15) {
            title.innerText = "TUTORIAL: STEP 16/16"; msg.innerHTML = "You're all set! Use the <span class='tut-hl'>1X SPEED</span> button to fast-forward. Empty the tanks to complete the mission!";
        }
    }
}

function updateScreen() {
    if(!SimEngine.isRunning) return; 

    SimEngine.updatePhysics();
    updateTutorial();
    
    let banner = document.getElementById('alarm-banner');
    if(SimEngine.currentAlarms.length > 0) {
        if(!banner.classList.contains("estop-active")) {
            banner.style.display = "block";
            let muteStr = SimEngine.hasUnacknowledgedAlarms ? "" : " (MUTED)";
            banner.innerText = "🚨 ALARMS: " + SimEngine.currentAlarms.join(" | ") + muteStr;
        }
    } else {
        if(!banner.classList.contains("estop-active")) banner.style.display = "none";
    }

    let maniVal = document.getElementById('mimic-mani-val');
    let maniPipe = document.getElementById('mimic-mani-pipe');
    let mainVertPipe = document.getElementById('mimic-main-vert-pipe');

    if(maniVal) { if(SimEngine.manifold) maniVal.classList.add('on'); else maniVal.classList.remove('on'); }

    let anyPushingToColl = false;
    SimEngine.tanks.forEach(t => {
        if(t.pOn && t.pSpd > 0 && t.vDisch && t.vColl && t.vol > 0) anyPushingToColl = true;
    });

    let isLoad = (SimEngine.missionId === 2 || SimEngine.missionId === 4 || SimEngine.missionId === 5);
    let shoreInward = isLoad && SimEngine.manifold;

    let collectorPressurized = shoreInward || anyPushingToColl;

    let maniFlow = "";
    let mainVertFlow = "";

    if (shoreInward) {
        maniFlow = 'flow-c-left';
        mainVertFlow = 'flow-c-down';
    } else if (anyPushingToColl) {
        mainVertFlow = 'flow-c-up'; 
        if (SimEngine.manifold) {
            maniFlow = 'flow-c-right'; 
        }
    }

    let totalRobVol = 0;
    let totalRobMt = 0;
    
    SimEngine.tanks.forEach(t => {
        let dens = SimEngine.getCargoDensity(t.temp, t.cargoId);
        let mass = t.vol * dens;
        
        totalRobVol += t.vol;
        totalRobMt += mass;
        
        let volPct = t.vol / t.cap; let pct = Math.max(0, Math.min(100, volPct * 100));
        
        let cargoInfo = SimEngine.cargoList.find(c => c.id === t.cargoId) || SimEngine.cargoList[0];
        let liq = document.getElementById(`ov-liq-${t.id}`); 
        if(liq) {
            liq.style.height = pct + "%";
            liq.style.background = `linear-gradient(to right, #111 0%, ${cargoInfo.color} 50%, #111 100%)`;
            liq.style.borderTopColor = cargoInfo.color;
        }

        let vol = document.getElementById(`ov-vol-${t.id}`); if(vol) vol.innerText = `${t.vol.toFixed(1)} m3 (${pct.toFixed(1)}%)`; 
        let mtDisplay = document.getElementById(`ov-mt-${t.id}`); if(mtDisplay) mtDisplay.innerText = `${mass.toFixed(1)} MT`;
        
        let ullage = 0.00;
        if (volPct >= 0.978) { ullage = (1 - volPct) * (t.u978 / 0.022); } else { ullage = t.u978 + (0.978 - volPct) * ((t.height - t.u978) / 0.978); }
        if (ullage < 0) ullage = 0;

        let ull = document.getElementById(`ov-ull-${t.id}`); if(ull) ull.innerText = `ULL: ${ullage.toFixed(2)} m`;
        let rate = document.getElementById(`ov-rate-${t.id}`); if(rate) rate.innerText = `Rate: ${Math.floor(Math.abs(t.rate))} m3/h`;
        let press = document.getElementById(`ov-press-${t.id}`); if(press) press.innerText = `${Math.floor(t.press)} mbar`;

        let pv = document.getElementById(`ov-pv-${t.id}`);
        if(pv) { 
            pv.innerText = `PV: ${t.pv}`; 
            pv.className = t.pv === "CLOSED" ? "tank-info pv-closed" : "tank-info pv-open"; 
        }

        let frame = document.getElementById(`frame-${t.id}`);
        if(frame) {
            frame.classList.remove('alarm-hl', 'alarm-hhl', 'alarm-overfill');
            if(t.overfill) frame.classList.add('alarm-overfill'); else if(t.hhl) frame.classList.add('alarm-hhl'); else if(t.hl) frame.classList.add('alarm-hl');
        }

        let mVDrop = document.getElementById(`mimic-vDrop-${t.id}`); if(mVDrop) { if(t.vDrop) mVDrop.classList.add('on'); else mVDrop.classList.remove('on'); }
        let mVDisch = document.getElementById(`mimic-vDisch-${t.id}`); if(mVDisch) { if(t.vDisch) mVDisch.classList.add('on'); else mVDisch.classList.remove('on'); }
        let mVColl = document.getElementById(`mimic-vColl-${t.id}`); if(mVColl) { if(t.vColl) mVColl.classList.add('on'); else mVColl.classList.remove('on'); }
        
        let mPOn = document.getElementById(`mimic-pOn-${t.id}`); 
        if(mPOn) { 
            if(t.pOn) {
                mPOn.classList.add('on'); 
                let spinSpeed = t.pSpd > 0 ? (20 / t.pSpd).toFixed(2) : 0;
                if(spinSpeed > 0) {
                    mPOn.style.setProperty('--pump-anim-speed', `${spinSpeed}s`);
                    mPOn.classList.add('pump-spinning');
                } else {
                    mPOn.classList.remove('pump-spinning');
                }
            } else { 
                mPOn.classList.remove('on', 'pump-spinning'); 
            } 
        }

        let tvSpd = document.getElementById(`tv-pspd-${t.id}`); if(tvSpd) tvSpd.innerText = `${t.pSpd}%`;

        let pTopDir = "", pBotDir = "", pVertDir = "", pCollTankDir = "", pCollManiDir = "";
        let isPumping = t.pOn && t.pSpd > 0 && t.vol > 0;

        if (isPumping) {
            pTopDir = t.isPort ? 'flow-c-right' : 'flow-c-left';
            if (t.vDisch) {
                pVertDir = 'flow-c-down'; 
                pCollTankDir = t.isPort ? 'flow-c-right' : 'flow-c-left'; 
                if (t.vColl) {
                    pCollManiDir = t.isPort ? 'flow-c-right' : 'flow-c-left'; 
                }
            }
        } else {
            if (collectorPressurized) {
                pCollManiDir = t.isPort ? 'flow-c-left' : 'flow-c-right'; 
                if (t.vColl) {
                    pCollTankDir = t.isPort ? 'flow-c-left' : 'flow-c-right';
                    pVertDir = 'flow-c-up';
                    
                    if (t.vDrop) {
                        pBotDir = t.isPort ? 'flow-c-left' : 'flow-c-right';
                    }
                    if (t.vDisch) {
                        pTopDir = t.isPort ? 'flow-c-left' : 'flow-c-right';
                    }
                }
            }
        }

        setFlow(document.getElementById(t.isPort ? `pipe-p-top-${t.id}` : `pipe-s-top-${t.id}`), pTopDir);
        setFlow(document.getElementById(t.isPort ? `pipe-p-bot-${t.id}` : `pipe-s-bot-${t.id}`), pBotDir);
        setFlow(document.getElementById(t.isPort ? `pipe-p-vert-${t.id}` : `pipe-s-vert-${t.id}`), pVertDir);
        
        setFlow(document.getElementById(`m-pipe-coll-tank-${t.id}`), pCollTankDir);
        setFlow(document.getElementById(`m-pipe-coll-mani-${t.id}`), pCollManiDir);
    });

    setFlow(maniPipe, maniFlow); 
    setFlow(mainVertPipe, mainVertFlow);

    SimEngine.ballastTanks.forEach(t => {
        let pct = Math.max(0, Math.min(100, (t.vol / t.cap) * 100));
        let liq = document.getElementById(`bl-liq-${t.id}`); if(liq) liq.style.height = pct + "%";
        let vol = document.getElementById(`bl-vol-${t.id}`); if(vol) vol.innerText = `${t.vol.toFixed(1)} m3 (${pct.toFixed(1)}%)`;
        let rate = document.getElementById(`bl-rate-${t.id}`); if(rate) rate.innerText = `Rate: ${Math.floor(Math.abs(t.rate))} m3/h`;
    });

    const allBallastPipes = [
        'p-sea-1', 'p-sea-2', 'p-sea-vert-p', 'p-sea-vert-s',
        'p-m-p1', 'p-m-p2', 'p-m-p3', 'p-m-p4', 'p-m-p5', 'p-m-p6', 'p-m-p7', 'p-tank-p',
        'p-bp-up-p', 'p-bp-p1', 'p-bp-p2', 'p-bp-dn-p', 'p-ovb-p1', 'p-ovb-p2',
        'p-m-s1', 'p-m-s2', 'p-m-s3', 'p-m-s4', 'p-m-s5', 'p-m-s6', 'p-m-s7', 'p-tank-s',
        'p-bp-dn-s', 'p-bp-s1', 'p-bp-s2', 'p-bp-up-s', 'p-ovb-s1', 'p-ovb-s2', 'p-cross-tie'
    ];
    setFlows(allBallastPipes, "pipe-empty");

    let bV1 = SimEngine.b_v1, bV2 = SimEngine.b_v2, bV3 = SimEngine.b_v3, bV4 = SimEngine.b_v4;
    let bV5 = SimEngine.b_v5, bV6 = SimEngine.b_v6, bV7 = SimEngine.b_v7, bV8 = SimEngine.b_v8;
    let bV9 = SimEngine.b_v9, bV10 = SimEngine.b_v10;
    
    let pTankOpen = SimEngine.ballastTanks.some(t => t.isPort && t.vOpen);
    let sTankOpen = SimEngine.ballastTanks.some(t => !t.isPort && t.vOpen);

    if (bV1) {
        setFlows(['p-sea-1', 'p-sea-2'], "pipe-filled-b");
        if (bV2) setFlows(['p-sea-vert-p', 'p-m-p1', 'p-m-p2'], "pipe-filled-b");
    }
    
    if (pTankOpen) {
        setFlows(['p-tank-p', 'p-m-p7', 'p-m-p6', 'p-bp-dn-p'], "pipe-filled-b"); 
        if (bV9) setFlows(['p-m-p5', 'p-m-p4'], "pipe-filled-b"); 
        if (bV3) setFlows(['p-bp-p2', 'p-bp-p1', 'p-bp-up-p', 'p-m-p3'], "pipe-filled-b"); 
    }

    if (SimEngine.bpPortOn && SimEngine.bpPortSpeed > 0) {
        if (bV1 && bV2 && bV9 && pTankOpen) {
            setFlows(['p-sea-1', 'p-sea-2'], "flow-b-right");
            setFlows(['p-sea-vert-p'], "flow-b-up");
            setFlows(['p-m-p1', 'p-m-p2', 'p-m-p3', 'p-m-p4', 'p-m-p5', 'p-m-p6', 'p-m-p7', 'p-tank-p'], "flow-b-right");
        } 
        else if (bV3 && bV4 && pTankOpen) {
            setFlows(['p-tank-p', 'p-m-p7', 'p-m-p6'], "flow-b-left");
            setFlows(['p-bp-dn-p'], "flow-b-down");
            setFlows(['p-bp-p2', 'p-bp-p1'], "flow-b-left");
            setFlows(['p-bp-up-p'], "flow-b-up");
            setFlows(['p-m-p3', 'p-m-p4', 'p-m-p5'], "flow-b-right");
            setFlows(['p-ovb-p1', 'p-ovb-p2'], "flow-b-up");
        }
    }

    if (bV1) {
        setFlows(['p-sea-1'], "pipe-filled-b"); 
        if (bV6) setFlows(['p-sea-vert-s', 'p-m-s1', 'p-m-s2'], "pipe-filled-b");
    }
    if (sTankOpen) {
        setFlows(['p-tank-s', 'p-m-s7', 'p-m-s6', 'p-bp-up-s'], "pipe-filled-b");
        if (bV10) setFlows(['p-m-s5', 'p-m-s4'], "pipe-filled-b"); 
        if (bV7) setFlows(['p-bp-s2', 'p-bp-s1', 'p-bp-dn-s', 'p-m-s3'], "pipe-filled-b");
    }

    if (SimEngine.bpStbdOn && SimEngine.bpStbdSpeed > 0) {
        if (bV1 && bV6 && bV10 && sTankOpen) {
            setFlows(['p-sea-1'], "flow-b-right");
            setFlows(['p-sea-vert-s'], "flow-b-down");
            setFlows(['p-m-s1', 'p-m-s2', 'p-m-s3', 'p-m-s4', 'p-m-s5', 'p-m-s6', 'p-m-s7', 'p-tank-s'], "flow-b-right");
        } 
        else if (bV7 && bV8 && sTankOpen) {
            setFlows(['p-tank-s', 'p-m-s7', 'p-m-s6'], "flow-b-left");
            setFlows(['p-bp-up-s'], "flow-b-up");
            setFlows(['p-bp-s2', 'p-bp-s1'], "flow-b-left");
            setFlows(['p-bp-dn-s'], "flow-b-down");
            setFlows(['p-m-s3', 'p-m-s4', 'p-m-s5'], "flow-b-right");
            setFlows(['p-ovb-s1', 'p-ovb-s2'], "flow-b-down");
        }
    }

    for(let i=1; i<=10; i++) { 
        let el = document.getElementById('v' + i); 
        if(el) { 
            if(SimEngine['b_v' + i]) el.classList.add('on'); 
            else el.classList.remove('on'); 
        } 
    }

    let elPP = document.getElementById('pP'); 
    if(elPP) { 
        if(SimEngine.bpPortOn) {
            elPP.classList.add('on');
            if (SimEngine.bpPortSpeed > 0) {
                elPP.style.setProperty('--pump-anim-speed', `${(20 / SimEngine.bpPortSpeed).toFixed(2)}s`);
                elPP.classList.add('pump-spinning-ballast');
            } else {
                elPP.classList.remove('pump-spinning-ballast');
            }
        } else { elPP.classList.remove('on', 'pump-spinning-ballast'); } 
    }
    
    let elPS = document.getElementById('pS'); 
    if(elPS) { 
        if(SimEngine.bpStbdOn) {
            elPS.classList.add('on');
            if (SimEngine.bpStbdSpeed > 0) {
                elPS.style.setProperty('--pump-anim-speed', `${(20 / SimEngine.bpStbdSpeed).toFixed(2)}s`);
                elPS.classList.add('pump-spinning-ballast');
            } else {
                elPS.classList.remove('pump-spinning-ballast');
            }
        } else { elPS.classList.remove('on', 'pump-spinning-ballast'); } 
    }

    document.getElementById("tv-rob").innerHTML = `ROB:<br>${totalRobVol.toFixed(1)} m3<br>${totalRobMt.toFixed(1)} MT`;
    document.getElementById("tv-line-press").innerText = `${SimEngine.linePressure.toFixed(1)} BAR`;
    document.getElementById("tv-mani-press").innerText = `${SimEngine.manifoldPressure.toFixed(1)} BAR`;

    let tvDraftFwd = document.getElementById("tv-draft-fwd"); if(tvDraftFwd) tvDraftFwd.innerText = SimEngine.draftFwd.toFixed(2) + " m";
    let tvDraftAft = document.getElementById("tv-draft-aft"); if(tvDraftAft) tvDraftAft.innerText = SimEngine.draftAft.toFixed(2) + " m";

    let listText = SimEngine.shipList > 0 ? "STARBOARD" : (SimEngine.shipList < 0 ? "PORT" : "");
    let trimText = SimEngine.shipTrim > 0 ? "AFT" : (SimEngine.shipTrim < 0 ? "FWD" : "");
    let listTextFull = `${Math.abs(SimEngine.shipList).toFixed(2)} deg ${listText}`;
    let trimTextFull = `${Math.abs(SimEngine.shipTrim).toFixed(2)} m ${trimText}`;

    document.getElementById("tv-list").innerText = `LIST: ${listTextFull}`; document.getElementById("tv-trim").innerText = `TRIM: ${trimTextFull}`;
    let bigValTrim = document.getElementById("big-val-trim"); if(bigValTrim) bigValTrim.innerText = trimTextFull;
    let bigValList = document.getElementById("big-val-list"); if(bigValList) bigValList.innerText = listTextFull;

    let tvBm = document.getElementById("tv-bm"); 
    if(tvBm) { 
        tvBm.innerText = `BM: ${SimEngine.bmPct.toFixed(1)}% (${SimEngine.bmType})`; 
        tvBm.className = SimEngine.bmPct > 85 ? "val-stability text-danger" : (SimEngine.bmPct > 60 ? "val-stability text-warn" : "val-stability text-safe");
    }
    
    let tvSf = document.getElementById("tv-sf"); 
    if(tvSf) { 
        tvSf.innerText = `SF: ${SimEngine.sfPct.toFixed(1)}%`; 
        tvSf.className = SimEngine.sfPct > 85 ? "val-stability text-danger" : (SimEngine.sfPct > 60 ? "val-stability text-warn" : "val-stability text-safe");
    }
    
    let tvGm = document.getElementById("tv-gm"); 
    if(tvGm) { 
        tvGm.innerText = `GM: ${SimEngine.gm.toFixed(3)} m`; 
        tvGm.className = SimEngine.gm < 0.15 ? "val-stability text-danger" : (SimEngine.gm < 0.5 ? "val-stability text-warn" : "val-stability text-safe");
    }
    
    let tvGz = document.getElementById("tv-gz"); if(tvGz) { tvGz.innerText = `GZ (10°): ${SimEngine.gz.toFixed(3)} m`; }

    if (stressChartObj && document.getElementById('view-stability').classList.contains('active')) {
        stressChartObj.data.datasets[0].data = [0, SimEngine.bmArr[0], SimEngine.bmArr[1], SimEngine.bmArr[2], 0];
        stressChartObj.data.datasets[1].data = [0, SimEngine.sfArr[0], SimEngine.sfArr[1], SimEngine.sfArr[2], 0];
        stressChartObj.update();
    }

    let meanDraft = (SimEngine.draftFwd + SimEngine.draftAft) / 2;
    let draftRatio = (meanDraft - 3.0) / 8.5; if(draftRatio > 1) draftRatio = 1; if(draftRatio < 0) draftRatio = 0;
    
    const maxRise = 40; let currentBottom = 10 + ((1 - draftRatio) * maxRise);
    const listDeg = SimEngine.shipList * 1.5; const trimDeg = -SimEngine.shipTrim * 2;
    const backOffset = 15; const miniBackOffset = 5;

    const iMiniBack = document.getElementById("img-mini-back"); const iMiniSide = document.getElementById("img-mini-side");
    if(iMiniBack) { iMiniBack.style.transform = `rotate(${listDeg}deg)`; iMiniBack.style.bottom = `${(currentBottom/3) - miniBackOffset}px`; }
    if(iMiniSide) { iMiniSide.style.transform = `rotate(${trimDeg}deg)`; iMiniSide.style.bottom = `${currentBottom/3}px`; }

    const iStabBack = document.getElementById("img-stab-back"); const iStabSide = document.getElementById("img-stab-side");
    if(iStabBack) { iStabBack.style.transform = `rotate(${listDeg}deg)`; iStabBack.style.bottom = `${currentBottom - backOffset}px`; }
    if(iStabSide) { iStabSide.style.transform = `rotate(${trimDeg}deg)`; iStabSide.style.bottom = `${currentBottom}px`; }
}

function closeAbortModal() { document.getElementById("override-modal").style.display = "none"; }
function executeAbort() { closeAbortModal(); alert("MISSION ABORTED!"); location.reload(); }

function evaluateMissionComplete() {
    if (!SimEngine.isRunning) return;
    SimEngine.isRunning = false; 
    
    document.getElementById('audio-hl').pause();
    document.getElementById('audio-hhl').pause();

    let currentVol = 0;
    let currentMass = 0;
    SimEngine.tanks.forEach(t => {
        currentVol += t.vol;
        currentMass += t.vol * SimEngine.getCargoDensity(t.temp, t.cargoId); 
    });
    
    let isLoad = (currentMissionId === 2 || currentMissionId === 4 || currentMissionId === 5);
    let actualMassChange = isLoad ? (currentMass - SimEngine.initialTotalMass) : (SimEngine.initialTotalMass - currentMass);
    if (actualMassChange < 0) actualMassChange = 0;

    let discrepancy = actualMassChange - SimEngine.targetOperationMass;
    let absDiscrepancy = Math.abs(discrepancy);
    
    let margin = SimEngine.targetOperationMass * 0.003; 
    let isSuccess = false;

    if (currentMissionId === 3 || currentMissionId === 4) { isSuccess = absDiscrepancy <= margin; } 
    else { isSuccess = absDiscrepancy <= 50; }

    document.getElementById("complete-modal").style.display = "flex";
    let header = document.getElementById("complete-header");
    let box = document.getElementById("complete-box");
    
    if (isSuccess) {
        header.innerText = "/// OPERATION SUCCESSFUL ///";
        header.style.backgroundColor = "#00FF00"; header.style.color = "black"; box.style.borderColor = "#00FF00";
    } else {
        header.innerText = "/// MISSION FAILED ///";
        header.style.backgroundColor = "red"; header.style.color = "white"; box.style.borderColor = "red";
    }

    let typeStr = isLoad ? "Loaded" : "Discharged";
    
    let msgHTML = `
        <div style="font-family: monospace; font-size: 16px; line-height: 1.8; text-align: left;">
            <span style="color:cyan;">TARGET ${typeStr.toUpperCase()}:</span> ${SimEngine.targetOperationMass.toFixed(1)} MT<br>
            <span style="color:cyan;">ACTUAL ${typeStr.toUpperCase()}:</span> ${actualMassChange.toFixed(1)} MT<br>
            <hr style="border-color:#333;">
            <span style="color:yellow;">CURRENT ROB:</span> ${currentVol.toFixed(1)} m3 | ${currentMass.toFixed(1)} MT<br>
            <hr style="border-color:#333;">
            <span style="color:#AAA;">DISCREPANCY:</span> ${(discrepancy > 0 ? "+" : "")}${discrepancy.toFixed(1)} MT<br>
            <span style="color:#AAA;">TOLERANCE (0.3%):</span> &plusmn;${margin.toFixed(1)} MT<br>
        </div>
        <div style="margin-top:20px; font-size:18px; font-weight:bold;">
            RESULT: ${isSuccess ? "<span style='color:#00FF00;'>PASSED ALIGNED WITH TOLERANCE</span>" : "<span style='color:red;'>FAILED DISCREPANCY LIMIT</span>"}
        </div>
    `;
    document.getElementById("complete-msg").innerHTML = msgHTML;
}