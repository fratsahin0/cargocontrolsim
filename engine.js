// ==========================================
// CARGO CONTROL SIMULATOR - ENGINE.JS
// ==========================================

const SimEngine = {
    isRunning: false, missionId: 1, 
    shipList: 0, shipTrim: 0, linePressure: 0, manifoldPressure: 0,
    bmPct: 0, bmType: "SAFE", sfPct: 0, draftFwd: 0, draftAft: 0,
    bmArr: [0,0,0], sfArr: [0,0,0], // For Chart
    gm: 0, gz: 0, kg: 0, // NEW STABILITY METRICS
    manifold: false, currentAlarms: [], hasUnacknowledgedAlarms: false,
    targetOperationVolume: 0, targetOperationMass: 0,
    initialTotalVolume: 0, initialTotalMass: 0,
    b_v1: false, b_v2: false, b_v3: false, b_v4: false, b_v5: false, b_v6: false, b_v7: false, b_v8: false,
    b_v9: false, b_v10: false, 
    bpPortOn: false, bpStbdOn: false, bpPortSpeed: 0, bpStbdSpeed: 0,

    // ================= YENİ: KARGO VERİTABANI VE RENK PALETİ =================
    cargoList: [
        { id: "p1", name: "Gasoline", dens15: 0.740, vcf: 0.0012, color: "#FFD54F" },
        { id: "p2", name: "Diesel / Gasoil", dens15: 0.840, vcf: 0.0008, color: "#FFB300" },
        { id: "p3", name: "Crude Oil (Light)", dens15: 0.820, vcf: 0.0009, color: "#8D6E63" },
        { id: "p4", name: "Crude Oil (Heavy)", dens15: 0.920, vcf: 0.0007, color: "#4E342E" },
        { id: "p5", name: "Fuel Oil (380 CST)", dens15: 0.990, vcf: 0.0006, color: "#424242" },
        { id: "c1", name: "MTBE", dens15: 0.745, vcf: 0.0011, color: "#E1BEE7" },
        { id: "c2", name: "Methanol", dens15: 0.795, vcf: 0.0012, color: "#81D4FA" },
        { id: "c3", name: "Ethanol", dens15: 0.790, vcf: 0.0011, color: "#80CBC4" },
        { id: "c4", name: "Benzene", dens15: 0.885, vcf: 0.0010, color: "#C5E1A5" },
        { id: "c5", name: "Toluene", dens15: 0.870, vcf: 0.0009, color: "#E6EE9C" },
        { id: "c6", name: "Xylene", dens15: 0.865, vcf: 0.0009, color: "#FFE082" },
        { id: "c7", name: "Styrene Monomer", dens15: 0.910, vcf: 0.0008, color: "#FFAB91" },
        { id: "c8", name: "Acetone", dens15: 0.792, vcf: 0.0013, color: "#F48FB1" },
        { id: "c9", name: "Hexane", dens15: 0.660, vcf: 0.0014, color: "#CE93D8" },
        { id: "c10", name: "Caustic Soda (50%)", dens15: 1.520, vcf: 0.0005, color: "#ECEFF1" },
        { id: "c11", name: "Sulfuric Acid (98%)", dens15: 1.840, vcf: 0.0006, color: "#B0BEC5" },
        { id: "c12", name: "Phosphoric Acid", dens15: 1.685, vcf: 0.0005, color: "#90A4AE" },
        { id: "c13", name: "Palm Oil", dens15: 0.890, vcf: 0.0007, color: "#FFF59D" },
        { id: "c14", name: "Ethylene Glycol (MEG)", dens15: 1.115, vcf: 0.0007, color: "#A5D6A7" },
        { id: "c15", name: "Acetic Acid", dens15: 1.050, vcf: 0.0010, color: "#EF9A9A" }
    ],
    activeCargoId: "p2", // Genel varsayılan

    // Artık tanka özel kargo hesabı yapıyoruz
    getCargoDensity: function(temp, specificCargoId = null) {
        let targetId = specificCargoId ? specificCargoId : this.activeCargoId;
        let cargo = this.cargoList.find(c => c.id === targetId) || this.cargoList[0];
        let dens = cargo.dens15 - ((temp - 15.0) * cargo.vcf);
        return dens > 0 ? dens : 0.001;
    },

    tanks: [
        { id: "1P", isPort: true, isFwd: true, cap: 1061.145, height: 14.35, u978: 1.17, vol: 0, temp: 0, rate: 0, press: 20, pv: "CLOSED", pOn: false, pSpd: 0, vDisch: false, vDrop: false, vColl: false, hl: false, hhl: false, hlAck: false, hhlAck: false, overfill: false, cargoId: "p2" },
        { id: "2P", isPort: true, isFwd: true, cap: 1284.356, height: 14.38, u978: 1.19, vol: 0, temp: 0, rate: 0, press: 20, pv: "CLOSED", pOn: false, pSpd: 0, vDisch: false, vDrop: false, vColl: false, hl: false, hhl: false, hlAck: false, hhlAck: false, overfill: false, cargoId: "p2" },
        { id: "3P", isPort: true, isFwd: false, cap: 1284.254, height: 14.41, u978: 1.16, vol: 0, temp: 0, rate: 0, press: 20, pv: "CLOSED", pOn: false, pSpd: 0, vDisch: false, vDrop: false, vColl: false, hl: false, hhl: false, hlAck: false, hhlAck: false, overfill: false, cargoId: "p2" },
        { id: "4P", isPort: true, isFwd: false, cap: 1058.691, height: 14.45, u978: 1.14, vol: 0, temp: 0, rate: 0, press: 20, pv: "CLOSED", pOn: false, pSpd: 0, vDisch: false, vDrop: false, vColl: false, hl: false, hhl: false, hlAck: false, hhlAck: false, overfill: false, cargoId: "p2" },
        { id: "1S", isPort: false, isFwd: true, cap: 1060.838, height: 14.34, u978: 1.14, vol: 0, temp: 0, rate: 0, press: 20, pv: "CLOSED", pOn: false, pSpd: 0, vDisch: false, vDrop: false, vColl: false, hl: false, hhl: false, hlAck: false, hhlAck: false, overfill: false, cargoId: "p2" },
        { id: "2S", isPort: false, isFwd: true, cap: 1283.845, height: 14.39, u978: 1.18, vol: 0, temp: 0, rate: 0, press: 20, pv: "CLOSED", pOn: false, pSpd: 0, vDisch: false, vDrop: false, vColl: false, hl: false, hhl: false, hlAck: false, hhlAck: false, overfill: false, cargoId: "p2" },
        { id: "3S", isPort: false, isFwd: false, cap: 1282.924, height: 14.41, u978: 1.18, vol: 0, temp: 0, rate: 0, press: 20, pv: "CLOSED", pOn: false, pSpd: 0, vDisch: false, vDrop: false, vColl: false, hl: false, hhl: false, hlAck: false, hhlAck: false, overfill: false, cargoId: "p2" },
        { id: "4S", isPort: false, isFwd: false, cap: 1058.793, height: 14.46, u978: 1.16, vol: 0, temp: 0, rate: 0, press: 20, pv: "CLOSED", pOn: false, pSpd: 0, vDisch: false, vDrop: false, vColl: false, hl: false, hhl: false, hlAck: false, hhlAck: false, overfill: false, cargoId: "p2" }
    ],
    
    ballastTanks: [
        { id: "WB1P", isPort: true, isFwd: true, cap: 600, vol: 0, rate: 0, vOpen: false },
        { id: "WB2P", isPort: true, isFwd: true, cap: 800, vol: 0, rate: 0, vOpen: false },
        { id: "WB3P", isPort: true, isFwd: false, cap: 800, vol: 0, rate: 0, vOpen: false },
        { id: "WB4P", isPort: true, isFwd: false, cap: 600, vol: 0, rate: 0, vOpen: false },
        { id: "WB1S", isPort: false, isFwd: true, cap: 600, vol: 0, rate: 0, vOpen: false },
        { id: "WB2S", isPort: false, isFwd: true, cap: 800, vol: 0, rate: 0, vOpen: false },
        { id: "WB3S", isPort: false, isFwd: false, cap: 800, vol: 0, rate: 0, vOpen: false },
        { id: "WB4S", isPort: false, isFwd: false, cap: 600, vol: 0, rate: 0, vOpen: false }
    ],

    initTanks: function(id) {
        this.missionId = id;
        this.b_v1 = false; this.b_v2 = false; this.b_v3 = false; this.b_v4 = false;
        this.b_v5 = false; this.b_v6 = false; this.b_v7 = false; this.b_v8 = false;
        this.b_v9 = false; this.b_v10 = false;
        this.bpPortOn = false; this.bpStbdOn = false;
        this.manifold = false;

        this.tanks.forEach(t => { t.temp = (20.0 + Math.random() * 3.0).toFixed(1); t.pSpd = 0; t.pOn = false; t.hlAck = false; t.hhlAck = false; });

        if (id === 1) {
            this.tanks.forEach(t => { t.vol = t.cap * 0.978; t.press = Math.floor(Math.random() * 36) + 5; t.pv = "CLOSED"; });
            this.ballastTanks.forEach(t => { t.vol = 0; t.vOpen = false; });
        } else if (id === 2 || id === 5) {
            this.tanks.forEach(t => { t.vol = 0; t.press = Math.floor(Math.random() * 36) + 5; t.pv = "CLOSED"; });
            this.ballastTanks.forEach(t => { t.vol = t.cap * 0.98; t.vOpen = false; });
        } else if (id === 3 || id === 6) { 
            let fill = (id === 6) ? 0.6 : (0.5 + Math.random() * 0.35);
            for(let i=0; i<4; i++) {
                let f = fill; if(i === 2 || i === 3) f += 0.08; if(f > 0.98) f = 0.98;
                let pT = this.tanks.find(t => t.id === `${i+1}P`); let sT = this.tanks.find(t => t.id === `${i+1}S`);
                pT.vol = pT.cap * f; pT.press = Math.floor(Math.random() * 36) + 5; pT.pv = "CLOSED";
                sT.vol = sT.cap * f; sT.press = Math.floor(Math.random() * 36) + 5; sT.pv = "CLOSED";
            }
            this.ballastTanks.forEach(t => { t.vol = 0; t.vOpen = false; });
        } else if (id === 4) {
            this.tanks.forEach(t => { t.vol = 0; t.press = Math.floor(Math.random() * 36) + 5; t.pv = "CLOSED"; });
            let bfill = 0.5 + Math.random() * 0.3;
            for(let i=0; i<4; i++) {
                let f = bfill; if(i === 2 || i === 3) f += 0.15; if(f > 0.98) f = 0.98;
                let bP = this.ballastTanks.find(t => t.id === `WB${i+1}P`); let bS = this.ballastTanks.find(t => t.id === `WB${i+1}S`);
                bP.vol = bP.cap * f; bS.vol = bS.cap * f;
            }
        }

        let startVol = 0;
        let startMass = 0;
        this.tanks.forEach(t => { 
            startVol += t.vol; 
            startMass += t.vol * this.getCargoDensity(t.temp, t.cargoId);
        });
        
        this.initialTotalVolume = startVol;
        this.initialTotalMass = startMass;

        if (id === 3) { 
            let maxD = startVol > 1500 ? startVol - 200 : 1000;
            this.targetOperationVolume = Math.floor(Math.random() * (maxD - 800) + 800);
        } else if (id === 4) { 
            this.targetOperationVolume = Math.floor(Math.random() * (8000 - 2000) + 2000);
        } else {
            this.targetOperationVolume = 0;
        }

        let baseDens = this.getCargoDensity(20);
        this.targetOperationMass = this.targetOperationVolume * baseDens;
    },

    triggerGameOver: function(reason) {
        this.isRunning = false;
        document.getElementById('game-over-reason').innerHTML = reason;
        document.getElementById('game-over-modal').style.display = 'flex';
        document.getElementById('audio-hl').pause();
        document.getElementById('audio-hhl').pause();
    },

    buzzerStop: function() {
        this.tanks.forEach(t => {
            if (t.hl) t.hlAck = true;
            if (t.hhl) t.hhlAck = true;
        });
    },

    updatePhysics: function() {
        if(!this.isRunning) return; 
        for(let step = 0; step < currentSpeed; step++) {
            this.updatePhysicsStep(1); 
            if(!this.isRunning) break; 
        }
    },

    updatePhysicsStep: function(scale) {
        let totalPumpRate = 0;
        let outRates = Array(8).fill(0);
        let rawRates = Array(8).fill(0);
        let activeAlarms = [];
        let activePumpsCount = 0;
        
        let isLoadMission = (this.missionId === 2 || this.missionId === 4 || this.missionId === 5);

        let dropTankCount = 0;
        this.tanks.forEach(t => {
            if(t.vDrop && t.vColl) dropTankCount++;
        });

        let rawPumpTotal = 0;
        this.tanks.forEach((t, i) => {
            t.rate = 0;
            if(t.pOn && t.pSpd > 0 && t.vol > 0) {
                activePumpsCount++;
                if(t.vDisch && t.vColl) {
                    if (this.manifold || dropTankCount > 0) {
                        rawRates[i] = 1000 * (t.pSpd / 100); 
                        rawPumpTotal += rawRates[i];
                    }
                }
            }
        });

        if (!isLoadMission && activePumpsCount > 4) {
            this.triggerGameOver("CRITICAL VIOLATION:<br>MAX 4 CARGO PUMPS ALLOWED!"); return;
        }

        if(rawPumpTotal > 2000) {
            let scaleFactor = 2000 / rawPumpTotal;
            for(let i=0; i<8; i++) rawRates[i] *= scaleFactor;
        }

        for(let i=0; i<8; i++) {
            if(rawRates[i] > 0) {
                outRates[i] = rawRates[i] * (0.95 + Math.random() * 0.05);
                totalPumpRate += outRates[i];
            }
        }

        let targetLinePress = 0;
        let targetManiPress = 0;
        let shoreInflowRate = 0;
        let reliefFactor = dropTankCount > 0 ? (1 / (dropTankCount + 1)) : 1; 

        if (this.manifold) {
            if (isLoadMission) {
                if (dropTankCount === 0) {
                    targetManiPress = 1.5 + (Math.random() * 0.5); 
                    targetLinePress = targetManiPress;
                } else if (dropTankCount === 1) {
                    targetManiPress = 1.5 + (Math.random() * 0.5); 
                    targetLinePress = targetManiPress;
                    shoreInflowRate = 1200 + (Math.random() * 100); 
                } else if (dropTankCount === 2) {
                    targetManiPress = 0.3 + (Math.random() * 0.2); 
                    targetLinePress = targetManiPress;
                    shoreInflowRate = 1800 + (Math.random() * 100); 
                } else {
                    targetManiPress = 0.0 + (Math.random() * 0.1); 
                    targetLinePress = targetManiPress;
                    shoreInflowRate = 2000; 
                }
            } else {
                if (totalPumpRate > 0) {
                    let flowUnits = dropTankCount + 2;
                    let flowPerUnit = totalPumpRate / flowUnits;
                    let shoreOutflow = flowPerUnit * 2;
                    
                    targetLinePress = ((totalPumpRate / 2000) * 10.5 * reliefFactor) + (Math.random() * 0.2);
                    targetManiPress = targetLinePress - ((shoreOutflow / 2000) * 1.2);
                }
            }
        } else {
            if (totalPumpRate > 0) {
                targetLinePress = dropTankCount > 0 ? ((totalPumpRate / 2000) * 6 * reliefFactor) + (Math.random() * 0.2) : 16 + (Math.random() * 0.5);
            }
        }

        this.linePressure += (targetLinePress - this.linePressure) * 0.1;
        this.manifoldPressure += (targetManiPress - this.manifoldPressure) * 0.1;

        if (!isLoadMission && this.manifoldPressure > 10.0) {
            this.triggerGameOver("PIPE BURST:<br>MANIFOLD PRESSURE EXCEEDED 10.0 BAR!"); return;
        }

        let hasUnackHHL = false;
        let hasUnackHL = false;

        this.tanks.forEach((t, i) => {
            let netFlow = 0;
            if (outRates[i] > 0) netFlow -= outRates[i];
            
            if (t.vDrop && t.vColl) {
                if (isLoadMission && this.manifold) {
                    netFlow += (shoreInflowRate / dropTankCount) * (0.95 + Math.random() * 0.1);
                } else if (!isLoadMission && dropTankCount > 0 && totalPumpRate > 0) {
                    let flowPerUnit = totalPumpRate / (dropTankCount + (this.manifold ? 2 : 0));
                    netFlow += flowPerUnit * (0.92 + Math.random() * 0.10);
                }
            }

            t.rate = Math.abs(netFlow);

            if (netFlow !== 0) {
                let volChange = ((netFlow / 3600) / 10) * scale;
                t.vol += volChange;
                if (t.vol <= 0) { t.vol = 0; t.rate = 0; }
                let emptyVol = Math.max(10, t.cap - t.vol); 
                let pressChangeRate = (netFlow / emptyVol) * 0.4 * scale; 
                if(t.pv === "CLOSED") { t.press += pressChangeRate; }
            } else {
                if(t.pv === "CLOSED") { t.press += (20 - t.press) * 0.02 * scale; }
            }

            if (t.pv === "CLOSED") {
                if (t.press >= 215) t.pv = "OPEN (PRESS)";
                else if (t.press <= -39) t.pv = "OPEN (VACUUM)";
            } 
            if (t.pv === "OPEN (PRESS)") {
                t.press -= 2.0 * scale; if (t.press <= 110) t.pv = "CLOSED"; 
            } else if (t.pv === "OPEN (VACUUM)") {
                t.press += 1.5 * scale; if (t.press >= -36) t.pv = "CLOSED"; 
            }
            if (t.press < -45) t.press = -45;
            if (t.press > 240) t.press = 240; 

            let pct = (t.vol / t.cap) * 100;
            if (pct >= 100) {
                this.triggerGameOver(`CARGO SPILLED:<br>TANK ${t.id} OVERFILLED!`); return;
            } else if (pct >= 98) {
                if (!t.hhl) { t.hhlAck = false; } // YENİ ALARM
                t.hhl = true; t.overfill = false; t.hl = false;
                if (!t.hhlAck) hasUnackHHL = true;
                activeAlarms.push(`HHL (98%) IN ${t.id}`);
            } else if (pct >= 95) {
                if (!t.hl) { t.hlAck = false; } // YENİ ALARM
                t.hl = true; t.hhl = false; t.overfill = false; 
                t.hhlAck = false; // Seviye düştüğünde HHL ACK resetle
                if (!t.hlAck) hasUnackHL = true;
                activeAlarms.push(`HL (95%) IN ${t.id}`);
            } else {
                t.hl = false; t.hhl = false; t.overfill = false;
                t.hlAck = false; t.hhlAck = false;
            }
        });

        this.currentAlarms = activeAlarms;
        this.hasUnacknowledgedAlarms = hasUnackHHL || hasUnackHL;

        const audioHL = document.getElementById('audio-hl');
        const audioHHL = document.getElementById('audio-hhl');
        
        if (hasUnackHHL) {
            if(!alarmStateHHL) { if(audioHHL) audioHHL.play(); alarmStateHHL = true; }
            if(alarmStateHL) { if(audioHL) audioHL.pause(); alarmStateHL = false; }
        } else if (hasUnackHL) {
            if(alarmStateHHL) { if(audioHHL) audioHHL.pause(); alarmStateHHL = false; }
            if(!alarmStateHL) { if(audioHL) audioHL.play(); alarmStateHL = true; }
        } else {
            if(alarmStateHL) { if(audioHL){ audioHL.pause(); audioHL.currentTime = 0; } alarmStateHL = false; }
            if(alarmStateHHL) { if(audioHHL){ audioHHL.pause(); audioHHL.currentTime = 0; } alarmStateHHL = false; }
        }

        let pRate = this.bpPortOn ? (this.bpPortSpeed / 100) * 850 : 0;
        let sRate = this.bpStbdOn ? (this.bpStbdSpeed / 100) * 850 : 0;

        let pTanksOpen = this.ballastTanks.filter(t => t.isPort && t.vOpen);
        let sTanksOpen = this.ballastTanks.filter(t => !t.isPort && t.vOpen);
        let pTankCount = pTanksOpen.length;
        let sTankCount = sTanksOpen.length;

        let portNetFlow = 0; 
        let stbdNetFlow = 0; 

        if (this.b_v5) {
            let totalIn = 0;
            let totalOut = 0;
            
            if (pRate > 0) {
                if (this.b_v1 && this.b_v2 && this.b_v9) totalIn += pRate; 
                if (this.b_v3 && this.b_v4) totalOut += pRate; 
            }
            if (sRate > 0) {
                if (this.b_v1 && this.b_v6 && this.b_v10) totalIn += sRate; 
                if (this.b_v7 && this.b_v8) totalOut += sRate; 
            }

            if (pRate > 0 && this.b_v3 && this.b_v9) {
                if (sTankCount > 0 && pTankCount > 0) {
                    portNetFlow -= pRate;
                    stbdNetFlow += pRate;
                }
            }
            if (sRate > 0 && this.b_v7 && this.b_v10) {
                if (pTankCount > 0 && sTankCount > 0) {
                    stbdNetFlow -= sRate;
                    portNetFlow += sRate;
                }
            }

            let totalTanks = pTankCount + sTankCount;
            if (totalTanks > 0) {
                portNetFlow += (totalIn - totalOut) * (pTankCount / totalTanks);
                stbdNetFlow += (totalIn - totalOut) * (sTankCount / totalTanks);
            }

        } else {
            if (pRate > 0) {
                if (this.b_v1 && this.b_v2 && this.b_v9) portNetFlow += pRate;
                if (this.b_v3 && this.b_v4) portNetFlow -= pRate;
            }
            if (sRate > 0) {
                if (this.b_v1 && this.b_v6 && this.b_v10) stbdNetFlow += sRate;
                if (this.b_v7 && this.b_v8) stbdNetFlow -= sRate;
            }
        }

        this.ballastTanks.forEach(t => {
            t.rate = 0;
            if (t.vOpen) {
                let netFlow = 0;
                if (t.isPort && pTankCount > 0) netFlow = portNetFlow / pTankCount;
                if (!t.isPort && sTankCount > 0) netFlow = stbdNetFlow / sTankCount;

                if (netFlow !== 0) {
                    netFlow *= (0.95 + Math.random() * 0.05); 
                    t.rate = Math.abs(netFlow);
                    
                    let change = ((netFlow / 3600) / 10) * scale;
                    if(change > 0) {
                        if(t.vol + change <= t.cap) t.vol += change; else { t.vol = t.cap; t.rate = 0; }
                    } else if (change < 0) {
                        if(t.vol >= Math.abs(change)) t.vol += change; else { t.vol = 0; t.rate = 0; }
                    }
                }
            }
        });

        // --- STABILITY & DRAFT CALCULATION ---
        let wPort = 0, wStbd = 0, wFwd = 0, wAft = 8.3333; 
        
        let totalCargoMass = 0;
        let totalBallastMass = 0;

        this.tanks.forEach(t => {
            let dens = this.getCargoDensity(t.temp, t.cargoId);
            let wCargo = t.vol * dens;
            
            totalCargoMass += wCargo; 
            
            if(t.isPort) wPort += wCargo; else wStbd += wCargo;
            if(t.isFwd) wFwd += wCargo; else wAft += wCargo;
        });
        
        this.ballastTanks.forEach(t => {
            let wBallast = t.vol * 1.025;
            
            totalBallastMass += wBallast; 
            
            if(t.isPort) wPort += wBallast; else wStbd += wBallast;
            if(t.isFwd) wFwd += wBallast; else wAft += wBallast;
        });

        this.shipList = (wStbd - wPort) * 0.008;
        this.shipTrim = (wAft - wFwd) * 0.003;

        let totalWeightFwd = 0;
        let totalWeightMid = 0;
        let totalWeightAft = 0;

        let totalMomentZ = 0; 
        let totalWeight = 12000; 
        let totalFSM = 0; 

        totalMomentZ += 12000 * 9.0; 
        
        this.tanks.forEach(t => {
            let dens = this.getCargoDensity(t.temp, t.cargoId);
            let wCargo = t.vol * dens;
            
            if (t.id.includes("1")) totalWeightFwd += wCargo;
            if (t.id.includes("2") || t.id.includes("3")) totalWeightMid += wCargo;
            if (t.id.includes("4")) totalWeightAft += wCargo;

            let hLiquid = (t.vol / t.cap) * 14.0;
            let vcgCargo = 2.0 + (hLiquid / 2.0); 
            totalWeight += wCargo;
            totalMomentZ += wCargo * vcgCargo;

            let fillPct = t.vol / t.cap;
            if (fillPct > 0.02 && fillPct < 0.98) {
                totalFSM += 3500 * dens; 
            }
        });

        this.ballastTanks.forEach(t => {
            let wBallast = t.vol * 1.025; 
            
            if (t.id.includes("1")) totalWeightFwd += wBallast;
            if (t.id.includes("2") || t.id.includes("3")) totalWeightMid += wBallast;
            if (t.id.includes("4")) totalWeightAft += wBallast;

            let hLiquid = (t.vol / t.cap) * 2.0;
            let vcgBallast = 0.0 + (hLiquid / 2.0);
            totalWeight += wBallast;
            totalMomentZ += wBallast * vcgBallast;

            let fillPct = t.vol / t.cap;
            if (fillPct > 0.02 && fillPct < 0.98) {
                totalFSM += 1500 * 1.025; 
            }
        });

        let meanDraft = 2.00 + ((totalWeight - 12000) / 1250.0); 
        this.draftAft = meanDraft + (this.shipTrim / 2);
        this.draftFwd = meanDraft - (this.shipTrim / 2);

        let KM = 13.5 - (1.0 * meanDraft) + (0.08 * meanDraft * meanDraft); 
        
        this.kg = totalMomentZ / totalWeight;
        let FSC = totalFSM / totalWeight; 
        
        let solidGM = KM - this.kg;
        this.gm = solidGM - FSC; 
        
        this.gz = this.gm * Math.sin(10 * Math.PI / 180);

        if (this.gm < 0) { 
            this.triggerGameOver(`CAPSIZED:<br>NEGATIVE GM DETECTED (STABILITY LOST)!<br>Slack Tanks caused FSE to drop GM to ${this.gm.toFixed(3)}m`); 
            return; 
        }

        let cargoFill = totalCargoMass / 9500.0;
        let ballastFill = totalBallastMass / 5740.0;

        let baseBm = 5 + (cargoFill * 10) + (ballastFill * 40);
        let endWeight = totalWeightFwd + totalWeightAft;
        let midWeight = totalWeightMid;
        let stressDiff = (endWeight * 1.21) - midWeight; 

        let calculatedBm = baseBm + (Math.abs(stressDiff) * 0.045);
        
        if (calculatedBm < 0) calculatedBm = 0; 
        if (calculatedBm > 120) calculatedBm = 120; 

        this.bmPct = calculatedBm;
        this.sfPct = this.bmPct * 0.85;

        if (stressDiff > 200) {
            this.bmType = "SAGGING";
        } else if (stressDiff < -200) {
            this.bmType = "HOGGING";
        } else {
            this.bmType = "SAFE";
        }

        if (this.bmType === "SAGGING") {
            this.bmArr = [this.bmPct * 0.4, this.bmPct, this.bmPct * 0.4];
            this.sfArr = [this.sfPct * 0.6, -this.sfPct * 0.2, -this.sfPct * 0.6];
        } else {
            this.bmArr = [-this.bmPct * 0.4, -this.bmPct, -this.bmPct * 0.4];
            this.sfArr = [-this.sfPct * 0.6, this.sfPct * 0.2, this.sfPct * 0.6];
        }

        if (Math.abs(this.shipList) > 1.0) { this.triggerGameOver(`CAPSIZED:<br>LIST EXCEEDED 1.0° (CURRENT: ${Math.abs(this.shipList).toFixed(2)}°)`); return; }
        if (Math.abs(this.shipTrim) > 3.0) { this.triggerGameOver(`STRUCTURAL DAMAGE:<br>TRIM EXCEEDED 3.0m (CURRENT: ${Math.abs(this.shipTrim).toFixed(2)}m)`); return; }
        if (this.bmPct > 100.0) { this.triggerGameOver(`HULL BREACH:<br>BENDING MOMENT EXCEEDED 100%`); return; }
        if (this.sfPct > 100.0) { this.triggerGameOver(`HULL BREACH:<br>SHEAR FORCE EXCEEDED 100%`); return; }
        if (this.draftFwd < 3.00 || this.draftAft < 3.00) { this.triggerGameOver(`MINIMUM DRAFT VIOLATION:<br>DRAFT DROPPED BELOW 3.00m!<br>(FWD: ${this.draftFwd.toFixed(2)}m, AFT: ${this.draftAft.toFixed(2)}m)`); return; }
    },

    predictStability: function(cargoVols, ballastVols) {
        let wPort = 0, wStbd = 0, wFwd = 0, wAft = 8.3333;
        
        let totalCargoMass = 0;
        let totalBallastMass = 0;
        
        let totalMomentZ = 12000 * 9.0;
        let totalWeight = 12000;
        let totalFSM = 0;
        let totalWeightFwd = 0, totalWeightMid = 0, totalWeightAft = 0;

        this.tanks.forEach((t, i) => {
            let vol = cargoVols[i] !== undefined ? cargoVols[i] : t.vol;
            let dens = this.getCargoDensity(t.temp, t.cargoId);
            let wCargo = vol * dens;

            totalCargoMass += wCargo; 
            if(t.isPort) wPort += wCargo; else wStbd += wCargo;
            if(t.isFwd) wFwd += wCargo; else wAft += wCargo;

            if (t.id.includes("1")) totalWeightFwd += wCargo;
            if (t.id.includes("2") || t.id.includes("3")) totalWeightMid += wCargo;
            if (t.id.includes("4")) totalWeightAft += wCargo;

            let hLiquid = (vol / t.cap) * 14.0;
            let vcgCargo = 2.0 + (hLiquid / 2.0);
            totalWeight += wCargo;
            totalMomentZ += wCargo * vcgCargo;

            let fillPct = vol / t.cap;
            if (fillPct > 0.02 && fillPct < 0.98) totalFSM += 3500 * dens;
        });

        this.ballastTanks.forEach((t, i) => {
            let vol = ballastVols[i] !== undefined ? ballastVols[i] : t.vol;
            let wBallast = vol * 1.025;
            
            totalBallastMass += wBallast; 
            if(t.isPort) wPort += wBallast; else wStbd += wBallast;
            if(t.isFwd) wFwd += wBallast; else wAft += wBallast;

            if (t.id.includes("1")) totalWeightFwd += wBallast;
            if (t.id.includes("2") || t.id.includes("3")) totalWeightMid += wBallast;
            if (t.id.includes("4")) totalWeightAft += wBallast;

            let hLiquid = (vol / t.cap) * 2.0;
            let vcgBallast = 0.0 + (hLiquid / 2.0);
            totalWeight += wBallast;
            totalMomentZ += wBallast * vcgBallast;

            let fillPct = vol / t.cap;
            if (fillPct > 0.02 && fillPct < 0.98) totalFSM += 1500 * 1.025;
        });

        let predList = (wStbd - wPort) * 0.008;
        let predTrim = (wAft - wFwd) * 0.003;

        let meanDraft = 2.00 + ((totalWeight - 12000) / 1250.0);
        let predDraftAft = meanDraft + (predTrim / 2);
        let predDraftFwd = meanDraft - (predTrim / 2);

        let KM = 13.5 - (1.0 * meanDraft) + (0.08 * meanDraft * meanDraft);
        let kg = totalMomentZ / totalWeight;
        let FSC = totalFSM / totalWeight;
        let predGm = (KM - kg) - FSC;

        let cargoFill = totalCargoMass / 9500.0;
        let ballastFill = totalBallastMass / 5740.0;
        let baseBm = 5 + (cargoFill * 10) + (ballastFill * 40);
        
        let endWeight = totalWeightFwd + totalWeightAft;
        let stressDiff = (endWeight * 1.21) - totalWeightMid;
        let calculatedBm = baseBm + (Math.abs(stressDiff) * 0.045);
        
        if (calculatedBm < 0) calculatedBm = 0;
        if (calculatedBm > 120) calculatedBm = 120;
        let predSf = calculatedBm * 0.85;

        return {
            list: predList, trim: predTrim, draftFwd: predDraftFwd, draftAft: predDraftAft,
            gm: predGm, bm: calculatedBm, sf: predSf
        };
    }
};