// ==========================================
// ADVANCED STRUCTURAL SIMULATION ENGINE
// ==========================================
// Simulating a 10-story building with 50 columns per floor
const TOTAL_ELEMENTS = 500;
const COLUMNS_PER_FLOOR = 50;

const columnData = Array.from({ length: TOTAL_ELEMENTS }, (_, i) => {
    const elementId = i + 1;
    // Lower floors (1-3) experience much higher stress, increasing degradation risk
    const floorLevel = Math.ceil(elementId / COLUMNS_PER_FLOOR); 
    
    // Base concrete grade: C30/37 (Nominal 30 MPa target strength)
    let baseStrength = 30;
    
    // Introduce structural environmental degradation factors
    if (floorLevel <= 3) {
        baseStrength -= (Math.random() * 14); // Higher probability of critical stress/moisture damage
    } else if (floorLevel <= 7) {
        baseStrength -= (Math.random() * 8);  // Moderate variance
    } else {
        baseStrength += (Math.random() * 6 - 3); // Top floors remain closest to nominal design limits
    }
    
    const strength = +baseStrength.toFixed(1);

    // Determine Status & Introduce Sensor Telemetry Anomalies
    let status;
    const anomalyRoll = Math.random();

    if (anomalyRoll > 0.98) { 
        // 2% chance of a hardware transducer fault (Essential real-world edge case)
        status = "Anomaly";
    } else if (strength < 20) {
        status = "Critical"; // Extreme degradation or structural overloading
    } else if (strength < 26) {
        status = "Warning";  // Early micro-cracking / minor carbonation depth issues
    } else {
        status = "Safe";     // Performance operating within nominal design limits
    }

    // Dynamic physical dimensions for capacity calculation ($A_g$ in mm^2)
    // Lower floors have larger columns to resist cumulative axial loads
    const columnWidth = floorLevel <= 3 ? 500 : floorLevel <= 7 ? 400 : 300; 
    const grossArea = columnWidth * columnWidth; 
    const steelRatio = 0.02; // 2% longitudinal reinforcement area ratio ($A_st$)

    return {
        id: `C-${elementId}`,
        floor: floorLevel,
        type: `${columnWidth}x${columnWidth}mm RC Column Core`,
        strength: status === "Anomaly" ? -1.0 : strength, // Flag faulty sensor data with negative telemetry
        status,
        dimensions: { width: columnWidth, grossArea, steelRatio },
        timestamp: new Date().toLocaleString()
    };
});

// ==========================================
// STATE MANAGEMENT (CORE ENGINE)
// ==========================================
let currentFilter = "all";
let currentPage = 1;
const itemsPerPage = 15;
let healthChartInstance = null;

const reportContainer = document.getElementById("report-list");
const searchInput = document.getElementById("searchInput");
const detailPanel = document.getElementById("detailPanel");
const detailContent = document.getElementById("detailContent");
const closePanelBtn = document.getElementById("closePanel");

// ==========================================
// ENGINEERING NOTES ENGINE
// ==========================================
function getEngineeringNote(status) {
    switch(status) {
        case "Critical":
            return "CRITICAL LOAD ALERT: Element operating below design limit state ($f'_c < 20\\text{ MPa}$). High probability of micro-fissure coalescing or structural buckling. Order immediate load-shedding and ultrasonic pulse velocity testing.";
        case "Warning":
            return "MONITORING LOG: Mild compressive strength deviation detected ($20 \\le f'_c < 26\\text{ MPa}$). Suspected structural fatigue or carbonation. Schedule core extraction test and structural review within the current quarter.";
        case "Anomaly":
            return "HARDWARE FAULT DETECTED: Telemetry output out of logical physical boundaries (Negative Strength logged). Transducer error or structural sensor misalignment. Calibrate data logger hardware immediately.";
        default:
            return "NOMINAL DESIGN STATE: Compressive capacity meets structural safety factors. Continue routine automated instrumentation scans.";
    }
}

// ==========================================
// CAPACITY FORMULA CALCULATOR (ACI 318 CODE)
// ==========================================
function calculateAxialCapacity(column) {
    if (column.status === "Anomaly") return "N/A (Sensor Fault)";
    
    // Formula: P_n = 0.85 * f'c * (A_g - A_st) + f_y * A_st
    // Assuming Grade 400 Steel ($f_y = 400 MPa$)
    const fc = column.strength;
    const fy = 400;
    const Ag = column.dimensions.grossArea;
    const Ast = Ag * column.dimensions.steelRatio;
    
    const Pn_Newtons = 0.85 * fc * (Ag - Ast) + (fy * Ast);
    const Pn_kiloNewtons = Pn_Newtons / 1000; // Convert to kN for clear structural reporting
    
    return `${Pn_kiloNewtons.toLocaleString(undefined, {maximumFractionDigits: 1})} kN`;
}

// ==========================================
// UI COMPLIANCE & COUNTERS
// ==========================================
function updateMetricCounters() {
    const counts = columnData.reduce((acc, col) => {
        acc.total++;
        acc[col.status.toLowerCase()]++;
        return acc;
    }, { total: 0, safe: 0, warning: 0, critical: 0, anomaly: 0 });

    document.getElementById("total-count").textContent = counts.total;
    document.getElementById("safe-count").textContent = counts.safe;
    document.getElementById("warning-count").textContent = counts.warning;
    document.getElementById("critical-count").textContent = counts.critical;
}

function setActiveButton(activeId) {
    const buttons = ["btnAll", "btnSafe", "btnWarning", "btnCritical", "btnAnomaly"];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove("active");
    });
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) activeBtn.classList.add("active");
}

function highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, `<mark>$1</mark>`);
}

function updatePaginationUI(totalPages) {
    document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages || 1}`;
    document.getElementById("prevBtn").disabled = currentPage === 1;
    document.getElementById("nextBtn").disabled = currentPage === totalPages || totalPages === 0;
}

// ==========================================
// ANALYTICS INTEGRATION (CHART.JS)
// ==========================================
function updateChartData(filteredData) {
    const counts = filteredData.reduce((acc, col) => {
        acc[col.status]++;
        return acc;
    }, { Safe: 0, Warning: 0, Critical: 0, Anomaly: 0 });

    const ctx = document.getElementById("healthChart").getContext("2d");

    if (healthChartInstance) {
        healthChartInstance.data.datasets[0].data = [counts.Safe, counts.Warning, counts.Critical, counts.Anomaly];
        healthChartInstance.update();
    } else {
        healthChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Safe', 'Warning', 'Critical', 'Hardware Anomaly'],
                datasets: [{
                    data: [counts.Safe, counts.Warning, counts.Critical, counts.Anomaly],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#a855f7'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { weight: '600' }, color: '#0f172a' }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

// ==========================================
// MAIN RENDER ENGINE
// ==========================================
function getFilteredData() {
    const searchText = searchInput.value.toLowerCase().trim();
    return columnData.filter(column => {
        const matchesFilter = currentFilter === "all" || column.status === currentFilter;
        const matchesSearch = searchText === "" || column.id.toLowerCase().includes(searchText);
        return matchesFilter && matchesSearch;
    });
}

function renderReport() {
    const filteredData = getFilteredData();
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    if (currentPage > totalPages) currentPage = totalPages || 1;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedData = filteredData.slice(start, end);

    reportContainer.innerHTML = "";

    if (paginatedData.length === 0) {
        reportContainer.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #64748b; font-weight: 500;">
                No structural records match query boundaries.
            </div>
        `;
        updatePaginationUI(0);
        updateChartData([]);
        return;
    }

    const fragment = document.createDocumentFragment();
    const query = searchInput.value.toLowerCase().trim();

    paginatedData.forEach(column => {
        const li = document.createElement("li");
        li.className = `border-${column.status.toLowerCase()}`;

        const dynamicStrengthText = column.status === "Anomaly" ? "ERR" : `${column.strength} MPa`;

        li.innerHTML = `
            <span><strong>${highlightText(column.id, query)}</strong> (FL ${column.floor})</span>
            <span style="color: #334155; font-weight: 600;">${dynamicStrengthText}</span>
            <div><span class="badge badge-${column.status.toLowerCase()}">${column.status}</span></div>
            <span style="color: #64748b; font-size: 13px;">${column.type}</span>
            <span style="color: #94a3b8; font-size: 12px; text-align: right;">${column.timestamp.split(',')[1] || column.timestamp}</span>
        `;

        li.addEventListener("click", () => openDetailPanel(column));
        fragment.appendChild(li);
    });

    reportContainer.appendChild(fragment);
    updatePaginationUI(totalPages);
    updateChartData(filteredData);
}

// ==========================================
// DETAIL PANEL OVERLAY (ENGINEERING REPORT)
// ==========================================
function openDetailPanel(column) {
    const calculatedPn = calculateAxialCapacity(column);
    const strengthDisplay = column.status === "Anomaly" ? "ERR (Out of bounds)" : `${column.strength} MPa`;

    detailContent.innerHTML = `
        <div class="detail-item">
            <div class="detail-label">Element Tracking Tag</div>
            <div class="detail-value" style="font-size: 18px; font-weight: 700; color: #38bdf8;">${column.id} (Floor ${column.floor})</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Structural Dimensions</div>
            <div class="detail-value">${column.type}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Measured Concrete Compressive Strength ($f'_c$)</div>
            <div class="detail-value" style="font-weight:700; color: ${column.status === 'Critical' ? '#f87171' : column.status === 'Warning' ? '#fbbf24' : column.status === 'Anomaly' ? '#c084fc' : '#34d399'};">
                ${strengthDisplay}
            </div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Nominal Ultimate Axial Capacity ($P_n$)</div>
            <div class="detail-value" style="font-weight:700; color: #f8fafc; font-family: monospace; background: #1e293b; padding: 6px 10px; border-radius: 4px; width: fit-content;">
                ${calculatedPn}
            </div>
            <small style="color:#64748b; font-size:11px; display:block; margin-top:4px;">
                Calculated via $P_n = 0.85f'_c(A_g - A_{st}) + f_yA_{st}$
            </small>
        </div>
        <div class="detail-item">
            <div class="detail-label">Risk State Category</div>
            <div class="detail-value"><span class="badge badge-${column.status.toLowerCase()}">${column.status}</span></div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Telemetry Log Date</div>
            <div class="detail-value" style="font-size: 13px; color: #94a3b8;">${column.timestamp}</div>
        </div>
        <div class="detail-item" style="border-top: 1px solid #334155; padding-top: 15px; margin-top: 15px;">
            <div class="detail-label" style="color: #f1f5f9; font-weight: 600; margin-bottom: 6px;">Diagnostic Field Action Note</div>
            <div class="detail-value" style="font-size: 13px; line-height: 1.6; color: #cbd5e1; background: #1e293b; padding: 12px; border-radius: 6px; border-left: 3px solid #2563eb;">
                ${getEngineeringNote(column.status)}
            </div>
        </div>
    `;

    detailPanel.classList.add("open");
    document.body.classList.add("panel-open");
}

closePanelBtn.addEventListener("click", () => {
    detailPanel.classList.remove("open");
    document.body.classList.remove("panel-open");
});

// ==========================================
// FILTER ACTIONS
// ==========================================
function setFilter(type, btnId) {
    currentFilter = type;
    currentPage = 1;
    setActiveButton(btnId);
    renderReport();
}

// ==========================================
// HANDLERS
// ==========================================
searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderReport();
});

document.getElementById("nextBtn").addEventListener("click", () => {
    const totalPages = Math.ceil(getFilteredData().length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderReport();
    }
});

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderReport();
    }
});

document.getElementById("btnAll").onclick = () => setFilter("all", "btnAll");
document.getElementById("btnSafe").onclick = () => setFilter("Safe", "btnSafe");
document.getElementById("btnWarning").onclick = () => setFilter("Warning", "btnWarning");
document.getElementById("btnCritical").onclick = () => setFilter("Critical", "btnCritical");
document.getElementById("btnAnomaly").onclick = () => setFilter("Anomaly", "btnAnomaly");
document.getElementById("exportBtn").addEventListener("click", exportToCSV);

// ==========================================
// CSV REPORT GENERATOR
// ==========================================
function exportToCSV() {
    const filteredData = getFilteredData();
    let csvContent = "ID,Floor Level,Component Dimensions,Strength (MPa),Nominal Axial Capacity Pn (kN),Structural Status,Timestamp\n";

    filteredData.forEach(item => {
        const strengthVal = item.status === "Anomaly" ? "ERROR" : item.strength;
        
        // Simulating the structural check for the spreadsheet output lines
        let capacityVal = "ERR";
        if (item.status !== "Anomaly") {
            const Ag = item.dimensions.grossArea;
            const Ast = Ag * item.dimensions.steelRatio;
            capacityVal = ((0.85 * item.strength * (Ag - Ast) + (400 * Ast)) / 1000).toFixed(1);
        }

        csvContent += `"${item.id}",${item.floor},"${item.type}",${strengthVal},${capacityVal},"${item.status}","${item.timestamp}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    
    a.href = url;
    a.download = `SHM_Advanced_Asset_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================
// SYSTEM BOOTSTRAP
// ==========================================
updateMetricCounters();
setActiveButton("btnAll");
renderReport();