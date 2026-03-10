// Sayfa yüklendiğinde çalışacak kodlar
document.addEventListener("DOMContentLoaded", () => {
    
    // Abort Butonu Tıklama
    document.getElementById("btn-abort").addEventListener("click", () => {
        // O efsanevi köşeli terminal uyarı kutusunu buraya JS ile çizeceğiz!
        alert("MANUAL OVERRIDE: INITIATING ABORT SEQUENCE!"); 
        // İleride buraya kendi köşeli HTML Div'imizi açtırtacağız.
    });

    // SimEngine'den gelen güncellemeleri ekrana yansıt
    window.onUpdateListener = () => {
        document.getElementById("objective-text").innerText = "OBJECTIVE: " + SimEngine.dynamicObjective;
        
        // Resimleri eğip bükme işlemi (Trim ve List'e göre)
        document.getElementById("img-back").style.transform = `rotate(${SimEngine.shipList}deg)`;
        
        // Trim metre cinsinden olduğu için, görseli çok hafif eğmek adına bir çarpan ekliyoruz
        let trimAngle = SimEngine.shipTrim * 0.5; 
        document.getElementById("img-side").style.transform = `rotate(${trimAngle}deg)`;
    };

    // Motoru Başlat
    SimEngine.startSimulation();
});