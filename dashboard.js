// ============================================
// Haven BJJ — Dashboard JavaScript (Online Version)
// ============================================

// --- CSRF Token ---
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

// --- Data (loaded from API) ---
let DASHBOARD_DATA = {};
let MAILCHIMP_DATA = {};

async function loadData() {
    const [dashResp, mcResp] = await Promise.all([
        fetch('api/data.php?type=dashboard'),
        fetch('api/data.php?type=mailchimp')
    ]);
    if (!dashResp.ok || !mcResp.ok) throw new Error('Data laden mislukt');
    DASHBOARD_DATA = await dashResp.json();
    MAILCHIMP_DATA = await mcResp.json();
}

// --- Sidebar Toggle (Mobile) ---
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
}

menuBtn.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// --- Nav Links & Page Switching ---
let currentPage = 'dashboard';
const PAGE_TITLES = { dashboard: 'Dashboard', leden: 'Leden', financien: 'Financiën', marketing: 'Marketing', nieuwsbrief: 'Crew Briefing', uploads: 'Uploads', simulator: 'Prijssimulator', account: 'Account' };

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (!document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1))) return;
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1));
        if (pageEl) pageEl.classList.add('active');
        document.querySelector('.page-title').textContent = PAGE_TITLES[page] || page;
        currentPage = page;
        document.getElementById('btnPdfRapport').style.display = (page === 'dashboard') ? 'inline-flex' : 'none';
        updateCurrentPage();
        closeSidebar();
    });
});

function updateCurrentPage() {
    const ym = monthSelect.value;
    if (currentPage === 'dashboard') updateDashboard(ym);
    else if (currentPage === 'leden') updateLeden(ym);
    else if (currentPage === 'financien') updateFinancien(ym);
    else if (currentPage === 'marketing') updateMarketing(ym);
    else if (currentPage === 'nieuwsbrief') updateNieuwsbrief();
    else if (currentPage === 'uploads') updateUploads(ym);
    else if (currentPage === 'simulator') updateSimulator(ym);
    else if (currentPage === 'account') { /* static page, no data update needed */ }
}

// --- Chart.js Config ---
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#64748b';

// --- Helpers ---
const MONTH_ABBR = {
    '01': 'Jan', '02': 'Feb', '03': 'Mrt', '04': 'Apr', '05': 'Mei', '06': 'Jun',
    '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Dec'
};
const MONTH_NAMES = {
    '01': 'januari', '02': 'februari', '03': 'maart', '04': 'april',
    '05': 'mei', '06': 'juni', '07': 'juli', '08': 'augustus',
    '09': 'september', '10': 'oktober', '11': 'november', '12': 'december'
};
const CAT_COLORS = {
    'Yearly': '#6366f1', 'Monthly': '#06b6d4', 'Yearly Student': '#f59e0b',
    'Monthly Student': '#10b981', 'Yearly U18': '#ec4899', 'Monthly U18': '#f97316'
};
const CAT_LABELS = {
    'Yearly': 'Incl. Founding Members', 'Monthly': 'Maandabonnement',
    'Yearly Student': 'Incl. Founding Student/U18', 'Monthly Student': 'Maand studentenabo',
    'Yearly U18': 'Jaarabonnement jeugd', 'Monthly U18': 'Maandabonnement jeugd'
};

function fmt(n) { return n != null ? Math.round(n).toLocaleString('nl-NL') : '—'; }
function fmtEuro(n) { return n != null ? '€' + fmt(n) : '—'; }
function fmtPct(n) { return n != null ? (n * 100).toFixed(1).replace('.', ',') + '%' : '—'; }

function prevYm(ym) {
    const [y, m] = ym.split('-').map(Number);
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    return py + '-' + String(pm).padStart(2, '0');
}

function setChange(el, diff, suffix, invert) {
    if (diff == null || isNaN(diff)) { el.className = 'kpi-change'; el.innerHTML = ''; return; }
    const pos = diff > 0;
    const neg = diff < 0;
    const cls = invert ? (pos ? 'negative' : neg ? 'positive' : '') : (pos ? 'positive' : neg ? 'negative' : '');
    const arrow = pos
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>'
        : neg
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>'
        : '';
    el.className = 'kpi-change ' + cls;
    el.innerHTML = arrow + suffix;
}

// --- Selectable months (only those with Grib data) ---
let selectableMonths = [];
const monthSelect = document.getElementById('monthSelect');

function populateMonths() {
    selectableMonths = Object.keys(DASHBOARD_DATA)
        .filter(ym => DASHBOARD_DATA[ym].categories)
        .sort();
    monthSelect.innerHTML = '';
    selectableMonths.forEach(ym => {
        const opt = document.createElement('option');
        opt.value = ym;
        const [y, m] = ym.split('-');
        opt.textContent = MONTH_NAMES[m] + ' ' + y;
        monthSelect.appendChild(opt);
    });
    monthSelect.value = selectableMonths[selectableMonths.length - 1];
}

// --- Charts (created once, updated on month change) ---
let revenueChart, donutChart, attendanceChart, financeChart, costDonutChart, mkLeadsChart, mkSourceDonut, mkGrowthChart, simMembersChart, simRevenueChart, simCurveChart;

function createCharts() {
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    revenueChart = new Chart(revenueCtx, {
        type: 'bar',
        data: { labels: [], datasets: [
            {
                label: 'Omzet (€)', data: [], backgroundColor: '#6366f1',
                borderRadius: 6, borderSkipped: false, barPercentage: 0.5, categoryPercentage: 0.8, yAxisID: 'y',
            },
            {
                label: 'Leden', data: [], type: 'line', borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3,
                pointRadius: 4, pointBackgroundColor: '#10b981', borderWidth: 2.5, yAxisID: 'y1',
            }
        ]},
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 12, weight: '500' } } },
                tooltip: {
                    backgroundColor: '#0f172a', titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 8,
                    callbacks: {
                        label: ctx => ctx.dataset.yAxisID === 'y1'
                            ? ctx.dataset.label + ': ' + ctx.raw
                            : ctx.dataset.label + ': €' + (ctx.raw || 0).toLocaleString('nl-NL')
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11, weight: '500' } } },
                y: { position: 'left', grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: { size: 11 }, callback: v => '€' + (v / 1000) + 'k' } },
                y1: { position: 'right', grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    });

    const membersCtx = document.getElementById('membersChart').getContext('2d');
    donutChart = new Chart(membersCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(CAT_COLORS),
            datasets: [{ data: [0,0,0,0,0,0], backgroundColor: Object.values(CAT_COLORS), borderWidth: 0, spacing: 3, borderRadius: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '68%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12, weight: '500' } } },
                tooltip: {
                    backgroundColor: '#0f172a', titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 8,
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = Math.round((ctx.raw / total) * 100);
                            return ctx.label + ': ' + ctx.raw + ' leden (' + pct + '%)';
                        }
                    }
                }
            }
        }
    });
}

// --- Update Dashboard ---
function updateDashboard(ym) {
    const d = DASHBOARD_DATA[ym];
    if (!d) return;
    const pym = prevYm(ym);
    const pd = DASHBOARD_DATA[pym];
    const [year, month] = ym.split('-');
    const monthName = MONTH_NAMES[month];

    // Subtitle
    document.querySelector('.page-subtitle').textContent = 'Haven BJJ — ' + monthName + ' ' + year;

    // KPI: Actieve Leden
    const totalLeden = d.total_6cat || d.total_members_excel || 0;
    const prevLeden = pd ? (pd.total_6cat || pd.total_members_excel || 0) : null;
    document.getElementById('kpiLeden').textContent = fmt(totalLeden);
    const ledenDiff = prevLeden != null ? totalLeden - prevLeden : null;
    setChange(document.getElementById('kpiLedenChange'), ledenDiff,
        (ledenDiff > 0 ? '+' : '') + ledenDiff + ' vs vorige maand', false);

    // KPI: Maandomzet (Jortt revenue preferred over Excel)
    const omzet = (d.jortt && d.jortt.revenue) || d.total_income;
    document.getElementById('kpiOmzet').textContent = omzet != null ? fmtEuro(omzet) : '—';
    const prevOmzet = pd ? ((pd.jortt && pd.jortt.revenue) || pd.total_income) : null;
    if (omzet != null && prevOmzet != null && prevOmzet > 0) {
        const pctChange = ((omzet - prevOmzet) / prevOmzet * 100);
        const sign = pctChange > 0 ? '+' : '';
        setChange(document.getElementById('kpiOmzetChange'), pctChange,
            sign + pctChange.toFixed(1).replace('.', ',') + '% vs vorige maand', false);
    } else {
        setChange(document.getElementById('kpiOmzetChange'), null, '', false);
    }

    // KPI: Trials
    const trials = d.trials;
    document.getElementById('kpiTrials').textContent = trials != null ? fmt(trials) : '—';
    const prevTrials = pd ? pd.trials : null;
    if (trials != null && prevTrials != null && prevTrials > 0) {
        const pctChange = ((trials - prevTrials) / prevTrials * 100);
        const sign = pctChange > 0 ? '+' : '';
        setChange(document.getElementById('kpiTrialsChange'), pctChange,
            sign + pctChange.toFixed(1).replace('.', ',') + '% vs vorige maand', false);
    } else {
        setChange(document.getElementById('kpiTrialsChange'), null, '', false);
    }

    // KPI: Attrition
    const attrition = d.attrition;
    document.getElementById('kpiAttrition').textContent = attrition != null ? fmtPct(attrition) : '—';
    const prevAttrition = pd ? pd.attrition : null;
    if (attrition != null && prevAttrition != null) {
        const ppChange = (attrition - prevAttrition) * 100;
        const sign = ppChange > 0 ? '+' : '';
        setChange(document.getElementById('kpiAttritionChange'), ppChange,
            sign + ppChange.toFixed(1).replace('.', ',') + 'pp vs vorige maand', true);
    } else {
        setChange(document.getElementById('kpiAttritionChange'), null, '', false);
    }

    // KPI: Customer LTV = (gem. omzet per lid over 12 maanden) / gem. attrition over 12 maanden
    const allKeys = Object.keys(DASHBOARD_DATA).sort();
    const curIdx = allKeys.indexOf(ym);
    const t12 = allKeys.slice(Math.max(0, curIdx - 11), curIdx + 1);
    let sumOmzetPerLid = 0, countOpl = 0, sumAttr = 0, countAttr = 0;
    t12.forEach(m => {
        const md = DASHBOARD_DATA[m];
        const mOmzet = (md.jortt && md.jortt.revenue) || md.total_income;
        const mLeden = md.total_6cat || md.total_members_excel || 0;
        if (mOmzet != null && mLeden > 0) { sumOmzetPerLid += mOmzet / mLeden; countOpl++; }
        if (md.attrition != null && md.attrition > 0) { sumAttr += md.attrition; countAttr++; }
    });
    const avgOmzetPerLid = countOpl > 0 ? sumOmzetPerLid / countOpl : null;
    const avgAttrition = countAttr > 0 ? sumAttr / countAttr : null;
    const ltv = (avgOmzetPerLid != null && avgAttrition != null) ? avgOmzetPerLid / avgAttrition : null;
    document.getElementById('kpiLTV').textContent = ltv != null ? fmtEuro(ltv) : '—';
    // Compare with previous 12-month window (shifted 1 month back)
    const t12prev = allKeys.slice(Math.max(0, curIdx - 12), curIdx);
    let sumOplP = 0, countOplP = 0, sumAttrP = 0, countAttrP = 0;
    t12prev.forEach(m => {
        const md = DASHBOARD_DATA[m];
        const mOmzet = (md.jortt && md.jortt.revenue) || md.total_income;
        const mLeden = md.total_6cat || md.total_members_excel || 0;
        if (mOmzet != null && mLeden > 0) { sumOplP += mOmzet / mLeden; countOplP++; }
        if (md.attrition != null && md.attrition > 0) { sumAttrP += md.attrition; countAttrP++; }
    });
    const prevAvgOpl = countOplP > 0 ? sumOplP / countOplP : null;
    const prevAvgAttr = countAttrP > 0 ? sumAttrP / countAttrP : null;
    const prevLtv = (prevAvgOpl != null && prevAvgAttr != null) ? prevAvgOpl / prevAvgAttr : null;
    if (ltv != null && prevLtv != null && prevLtv > 0) {
        const pctChange = ((ltv - prevLtv) / prevLtv * 100);
        const sign = pctChange > 0 ? '+' : '';
        setChange(document.getElementById('kpiLTVChange'), pctChange,
            sign + pctChange.toFixed(1).replace('.', ',') + '% vs vorige maand', false);
    } else {
        setChange(document.getElementById('kpiLTVChange'), null, '', false);
    }

    // Revenue chart — trailing 12 months
    const allSorted = Object.keys(DASHBOARD_DATA).sort();
    const idx = allSorted.indexOf(ym);
    const trailing = allSorted.slice(Math.max(0, idx - 11), idx + 1);
    const labels = trailing.map(m => MONTH_ABBR[m.split('-')[1]]);
    const omzetData = trailing.map(m => {
        const md = DASHBOARD_DATA[m];
        return md ? Math.round((md.jortt && md.jortt.revenue) || md.total_income || 0) : 0;
    });
    const ledenData = trailing.map(m => {
        const md = DASHBOARD_DATA[m];
        return md ? (md.total_6cat || md.total_members_excel || 0) : 0;
    });
    revenueChart.data.labels = labels;
    revenueChart.data.datasets[0].data = omzetData;
    revenueChart.data.datasets[1].data = ledenData;
    revenueChart.update();

    // Donut chart
    if (d.categories) {
        const catKeys = ['Yearly', 'Monthly', 'Yearly Student', 'Monthly Student', 'Yearly U18', 'Monthly U18'];
        donutChart.data.datasets[0].data = catKeys.map(k => d.categories[k] || 0);
        donutChart.update();
    }

    // Abonnementen list
    if (d.categories) {
        const catKeys = ['Yearly', 'Monthly', 'Yearly Student', 'Monthly Student', 'Yearly U18', 'Monthly U18']
            .sort((a, b) => (d.categories[b] || 0) - (d.categories[a] || 0));
        const total6 = catKeys.reduce((s, k) => s + (d.categories[k] || 0), 0);
        const maxCat = Math.max(...catKeys.map(k => d.categories[k] || 0));
        let html = '';
        catKeys.forEach(k => {
            const count = d.categories[k] || 0;
            const pct = total6 > 0 ? Math.round(count / total6 * 100) : 0;
            html += `<div class="membership-item">
                <div class="membership-info">
                    <div class="membership-dot" style="background: ${CAT_COLORS[k]}"></div>
                    <div>
                        <div class="membership-name">${k}</div>
                        <div class="membership-price">${CAT_LABELS[k]}</div>
                    </div>
                </div>
                <div class="membership-stats">
                    <span class="membership-count">${count}</span>
                    <div class="membership-bar">
                        <div class="membership-bar-fill" style="width: ${pct}%; background: ${CAT_COLORS[k]}"></div>
                    </div>
                </div>
            </div>`;
        });
        document.getElementById('membershipList').innerHTML = html;
        const overig = d.categories['Overig'] || 0;
        const totalAll = total6 + overig;
        document.getElementById('membershipNote').textContent =
            `+ ${overig} overig (Sponsored, Women's Comp, Coach) — Totaal: ${totalAll} abonnementen`;
    }

    // Kerncijfers
    const shortMonth = monthName.substring(0, 3);
    document.getElementById('kerncijfersTitle').textContent = 'Kerncijfers ' + monthName;
    let kcHtml = '';

    // New members
    const newM = d.new_members;
    const prevNewM = pd ? pd.new_members : null;
    kcHtml += activityItem('new-member',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
        `<strong>${newM != null ? newM : '—'} nieuwe leden</strong> in ${monthName}`,
        prevNewM != null ? `vs ${prevNewM} vorige maand` : '',
        shortMonth + ' ' + year
    );

    // Lost members
    const lostM = d.lost_members;
    const net = (newM != null && lostM != null) ? newM - lostM : null;
    kcHtml += activityItem('cancel',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        `<strong>${lostM != null ? lostM : '—'} opzeggingen</strong> in ${monthName}`,
        net != null ? `Netto: ${net > 0 ? '+' : ''}${net} ${Math.abs(net) === 1 ? 'lid' : 'leden'}` : '',
        shortMonth + ' ' + year
    );

    // Biggest category
    if (d.categories) {
        const catKeys = ['Yearly', 'Monthly', 'Yearly Student', 'Monthly Student', 'Yearly U18', 'Monthly U18'];
        const total6 = catKeys.reduce((s, k) => s + (d.categories[k] || 0), 0);
        let biggest = catKeys[0], biggestVal = 0;
        catKeys.forEach(k => { if ((d.categories[k] || 0) > biggestVal) { biggest = k; biggestVal = d.categories[k]; } });
        const bigPct = total6 > 0 ? Math.round(biggestVal / total6 * 100) : 0;
        kcHtml += activityItem('class-event',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
            `<strong>${biggest}: ${biggestVal}</strong> — grootste groep`,
            `${bigPct}% van alle abonnementen`,
            shortMonth + ' ' + year
        );
    }

    // Income per member
    const ipm = d.income_per_member;
    kcHtml += activityItem('payment',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
        `Omzet per lid: <strong>${ipm != null ? '€' + ipm.toFixed(2).replace('.', ',') : '—'}</strong>`,
        d.trial_to_member != null ? `Trial-to-member: ${(d.trial_to_member * 100).toFixed(0)}%` : '',
        shortMonth + ' ' + year
    );

    // Zettle
    if (d.zettle != null) {
        kcHtml += activityItem('expense',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
            `Zettle: <strong>${fmtEuro(d.zettle)}</strong>`,
            '',
            shortMonth + ' ' + year
        );
    }

    document.getElementById('kerncijfersList').innerHTML = kcHtml;
}

// --- Attendance Chart (Leden page) ---
function createAttendanceChart() {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [
            {
                label: 'Bezoeken', data: [], backgroundColor: '#6366f1',
                borderRadius: 6, borderSkipped: false, barPercentage: 0.5, categoryPercentage: 0.8, yAxisID: 'y',
            },
            {
                label: 'Gem. per les', data: [], type: 'line', borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.3,
                pointRadius: 4, pointBackgroundColor: '#f59e0b', borderWidth: 2.5, yAxisID: 'y1',
            }
        ]},
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 12, weight: '500' } } },
                tooltip: {
                    backgroundColor: '#0f172a', titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 8,
                    callbacks: {
                        label: ctx => ctx.dataset.yAxisID === 'y1'
                            ? ctx.dataset.label + ': ' + (ctx.raw || 0).toFixed(1).replace('.', ',')
                            : ctx.dataset.label + ': ' + (ctx.raw || 0).toLocaleString('nl-NL')
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11, weight: '500' } } },
                y: { position: 'left', grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: { size: 11 } } },
                y1: { position: 'right', grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    });
}

// --- Update Leden Page ---
function updateLeden(ym) {
    const d = DASHBOARD_DATA[ym];
    if (!d) return;
    const pym = prevYm(ym);
    const pd = DASHBOARD_DATA[pym];
    const [year, month] = ym.split('-');
    const monthName = MONTH_NAMES[month];
    const shortMonth = monthName.substring(0, 3);

    document.querySelector('.page-subtitle').textContent = 'Haven BJJ — ' + monthName + ' ' + year;

    // KPI: Totale Bezoeken
    const participants = d.participants;
    const prevParticipants = pd ? pd.participants : null;
    document.getElementById('kpiParticipants').textContent = participants != null ? fmt(participants) : '—';
    if (participants != null && prevParticipants != null && prevParticipants > 0) {
        const pct = ((participants - prevParticipants) / prevParticipants * 100);
        const sign = pct > 0 ? '+' : '';
        setChange(document.getElementById('kpiParticipantsChange'), pct,
            sign + pct.toFixed(1).replace('.', ',') + '% vs vorige maand', false);
    } else {
        setChange(document.getElementById('kpiParticipantsChange'), null, '', false);
    }

    // KPI: Gem. per Les
    const pps = d.participants_per_session;
    const prevPps = pd ? pd.participants_per_session : null;
    document.getElementById('kpiPPS').textContent = pps != null ? pps.toFixed(1).replace('.', ',') : '—';
    if (pps != null && prevPps != null) {
        const diff = pps - prevPps;
        const sign = diff > 0 ? '+' : '';
        setChange(document.getElementById('kpiPPSChange'), diff,
            sign + diff.toFixed(1).replace('.', ',') + ' vs vorige maand', false);
    } else {
        setChange(document.getElementById('kpiPPSChange'), null, '', false);
    }

    // KPI: Sessies per Lid
    const spm = d.sessions_per_member;
    const prevSpm = pd ? pd.sessions_per_member : null;
    document.getElementById('kpiSPM').textContent = spm != null ? spm.toFixed(1).replace('.', ',') : '—';
    if (spm != null && prevSpm != null) {
        const diff = spm - prevSpm;
        const sign = diff > 0 ? '+' : '';
        setChange(document.getElementById('kpiSPMChange'), diff,
            sign + diff.toFixed(1).replace('.', ',') + ' vs vorige maand', false);
    } else {
        setChange(document.getElementById('kpiSPMChange'), null, '', false);
    }

    // KPI: Totaal Sessies
    const sessions = d.sessions;
    const prevSessions = pd ? pd.sessions : null;
    document.getElementById('kpiSessions').textContent = sessions != null ? fmt(sessions) : '—';
    if (sessions != null && prevSessions != null && prevSessions > 0) {
        const pct = ((sessions - prevSessions) / prevSessions * 100);
        const sign = pct > 0 ? '+' : '';
        setChange(document.getElementById('kpiSessionsChange'), pct,
            sign + pct.toFixed(1).replace('.', ',') + '% vs vorige maand', false);
    } else {
        setChange(document.getElementById('kpiSessionsChange'), null, '', false);
    }

    // KPI: Trial → Lid %
    const trialConv = d.trial_to_member;
    document.getElementById('kpiTrialConversion').textContent = trialConv != null ? fmtPct(trialConv) : '—';
    const prevTrialConv = pd ? pd.trial_to_member : null;
    if (trialConv != null && prevTrialConv != null) {
        const ppChange = (trialConv - prevTrialConv) * 100;
        const sign = ppChange > 0 ? '+' : '';
        setChange(document.getElementById('kpiTrialConversionChange'), ppChange,
            sign + ppChange.toFixed(1).replace('.', ',') + 'pp vs vorige maand', false);
    } else {
        setChange(document.getElementById('kpiTrialConversionChange'), null, '', false);
    }

    // KPI: Nieuwe Leden
    const newMem = d.new_members;
    document.getElementById('kpiNewMembers').textContent = newMem != null ? fmt(newMem) : '—';
    const prevNewMem = pd ? pd.new_members : null;
    const newMemDiff = (newMem != null && prevNewMem != null) ? newMem - prevNewMem : null;
    setChange(document.getElementById('kpiNewMembersChange'), newMemDiff,
        newMemDiff != null ? (newMemDiff > 0 ? '+' : '') + newMemDiff + ' vs vorige maand' : '', false);

    // KPI: Verloren Leden
    const lostMem = d.lost_members;
    document.getElementById('kpiLostMembers').textContent = lostMem != null ? fmt(lostMem) : '—';
    const prevLostMem = pd ? pd.lost_members : null;
    const lostMemDiff = (lostMem != null && prevLostMem != null) ? lostMem - prevLostMem : null;
    setChange(document.getElementById('kpiLostMembersChange'), lostMemDiff,
        lostMemDiff != null ? (lostMemDiff > 0 ? '+' : '') + lostMemDiff + ' vs vorige maand' : '', true);

    // KPI: Length of Engagement (1 / attrition, over 12 maanden)
    const allKeysLeg = Object.keys(DASHBOARD_DATA).sort();
    const idxLeg = allKeysLeg.indexOf(ym);
    const t12Leg = allKeysLeg.slice(Math.max(0, idxLeg - 11), idxLeg + 1);
    let sumAttrLeg = 0, countAttrLeg = 0;
    t12Leg.forEach(m => {
        const md = DASHBOARD_DATA[m];
        if (md.attrition != null && md.attrition > 0) { sumAttrLeg += md.attrition; countAttrLeg++; }
    });
    const avgAttrLeg = countAttrLeg > 0 ? sumAttrLeg / countAttrLeg : null;
    const leg = avgAttrLeg != null && avgAttrLeg > 0 ? 1 / avgAttrLeg : null;
    document.getElementById('kpiLEG').textContent = leg != null ? leg.toFixed(1).replace('.', ',') + ' mnd' : '—';
    // Compare with previous 12-month window
    const t12LegP = allKeysLeg.slice(Math.max(0, idxLeg - 23), Math.max(0, idxLeg - 11));
    let sumAttrLegP = 0, countAttrLegP = 0;
    t12LegP.forEach(m => {
        const md = DASHBOARD_DATA[m];
        if (md.attrition != null && md.attrition > 0) { sumAttrLegP += md.attrition; countAttrLegP++; }
    });
    const avgAttrLegP = countAttrLegP > 0 ? sumAttrLegP / countAttrLegP : null;
    const prevLeg = avgAttrLegP != null && avgAttrLegP > 0 ? 1 / avgAttrLegP : null;
    if (leg != null && prevLeg != null) {
        const diff = leg - prevLeg;
        const sign = diff > 0 ? '+' : '';
        setChange(document.getElementById('kpiLEGChange'), diff,
            sign + diff.toFixed(1).replace('.', ',') + ' mnd vs vorige 12 mnd', false);
    } else { setChange(document.getElementById('kpiLEGChange'), null, '', false); }

    // Attendance chart — trailing 12 months
    const allSorted = Object.keys(DASHBOARD_DATA).sort();
    const idx = allSorted.indexOf(ym);
    const trailing = allSorted.slice(Math.max(0, idx - 11), idx + 1);
    const labels = trailing.map(m => MONTH_ABBR[m.split('-')[1]]);
    const partData = trailing.map(m => {
        const md = DASHBOARD_DATA[m];
        return md && md.participants ? md.participants : 0;
    });
    const ppsData = trailing.map(m => {
        const md = DASHBOARD_DATA[m];
        return md && md.participants_per_session ? parseFloat(md.participants_per_session.toFixed(1)) : 0;
    });
    attendanceChart.data.labels = labels;
    attendanceChart.data.datasets[0].data = partData;
    attendanceChart.data.datasets[1].data = ppsData;
    attendanceChart.update();

    // Kerncijfers
    document.getElementById('ledenKerncijfersTitle').textContent = 'Lesstatistieken ' + monthName;
    let html = '';

    // Income per session
    const ips = d.income_per_session;
    const prevIps = pd ? pd.income_per_session : null;
    html += activityItem('payment',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
        `Omzet per sessie: <strong>${ips != null ? '€' + ips.toFixed(2).replace('.', ',') : '—'}</strong>`,
        prevIps != null && ips != null ? `vs €${prevIps.toFixed(2).replace('.', ',')} vorige maand` : '',
        shortMonth + ' ' + year
    );

    // Gross profit per session
    const gps = d.gross_profit_per_session;
    html += activityItem('expense',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
        `Gross profit per sessie: <strong>${gps != null ? (gps * 100).toFixed(1).replace('.', ',') + '%' : '—'}</strong>`,
        '',
        shortMonth + ' ' + year
    );

    // Session income per member
    const sipm = d.session_income_per_member;
    html += activityItem('class-event',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        `Sessie-omzet per lid: <strong>${sipm != null ? '€' + sipm.toFixed(2).replace('.', ',') : '—'}</strong>`,
        '',
        shortMonth + ' ' + year
    );

    // Total sessions & participants summary
    html += activityItem('new-member',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
        `<strong>${fmt(sessions)} lessen</strong> gegeven`,
        `${fmt(participants)} totale deelnames`,
        shortMonth + ' ' + year
    );

    document.getElementById('ledenKerncijfersList').innerHTML = html;
}

// --- Finance Charts ---
const COST_COLORS = {
    'Onderhoud': '#ef4444', 'Andere kosten': '#f97316', 'Huisvesting': '#6366f1',
    'Uitbesteed werk': '#3b82f6', 'Personeel': '#8b5cf6', 'Afschrijvingen': '#64748b',
    'Auto & transport': '#06b6d4', 'Inkoop': '#f59e0b', 'Verkoopkosten': '#14b8a6',
    'Financieel': '#9ca3af'
};

function createFinanceCharts() {
    const ctx = document.getElementById('financeChart').getContext('2d');
    financeChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [
            { label: 'Omzet', data: [], backgroundColor: '#10b981', borderRadius: 6, borderSkipped: false, barPercentage: 0.6, categoryPercentage: 0.8 },
            { label: 'Kosten', data: [], backgroundColor: '#ef4444', borderRadius: 6, borderSkipped: false, barPercentage: 0.6, categoryPercentage: 0.8 },
            { label: 'Winst', data: [], type: 'line', borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#6366f1', borderWidth: 2.5 }
        ]},
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 12, weight: '500' } } },
                tooltip: {
                    backgroundColor: '#0f172a', titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 8,
                    callbacks: { label: ctx => ctx.dataset.label + ': €' + (ctx.raw || 0).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
                }
            },
            scales: {
                x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11, weight: '500' } } },
                y: { grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: { size: 11 }, callback: v => '€' + (v / 1000) + 'k' } }
            }
        }
    });

    const donutCtx = document.getElementById('costDonutChart').getContext('2d');
    costDonutChart = new Chart(donutCtx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0, spacing: 3, borderRadius: 4 }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '68%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11, weight: '500' } } },
                tooltip: {
                    backgroundColor: '#0f172a', titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 8,
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = Math.round((ctx.raw / total) * 100);
                            return ctx.label + ': €' + Math.round(ctx.raw).toLocaleString('nl-NL') + ' (' + pct + '%)';
                        }
                    }
                }
            }
        }
    });
}

// --- Update Financiën Page ---
function updateFinancien(ym) {
    const d = DASHBOARD_DATA[ym];
    if (!d) return;
    const pym = prevYm(ym);
    const pd = DASHBOARD_DATA[pym];
    const [year, month] = ym.split('-');
    const monthName = MONTH_NAMES[month];
    const shortMonth = monthName.substring(0, 3);
    const j = d.jortt;
    const pj = pd ? pd.jortt : null;

    document.querySelector('.page-subtitle').textContent = 'Haven BJJ — ' + monthName + ' ' + year;

    // KPI: Omzet
    document.getElementById('kpiRevenue').textContent = j ? fmtEuro(j.revenue) : '—';
    if (j && pj) {
        const pct = ((j.revenue - pj.revenue) / pj.revenue * 100);
        setChange(document.getElementById('kpiRevenueChange'), pct, (pct > 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + '% vs vorige maand', false);
    } else { setChange(document.getElementById('kpiRevenueChange'), null, '', false); }

    // KPI: Kosten
    document.getElementById('kpiCosts').textContent = j ? fmtEuro(j.costs) : '—';
    if (j && pj) {
        const pct = ((j.costs - pj.costs) / pj.costs * 100);
        setChange(document.getElementById('kpiCostsChange'), pct, (pct > 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + '% vs vorige maand', true);
    } else { setChange(document.getElementById('kpiCostsChange'), null, '', false); }

    // KPI: Payroll
    document.getElementById('kpiPayroll').textContent = j ? fmtEuro(j.payroll) : '—';
    if (j && pj) {
        const pct = ((j.payroll - pj.payroll) / pj.payroll * 100);
        setChange(document.getElementById('kpiPayrollChange'), pct, (pct > 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + '% vs vorige maand', true);
    } else { setChange(document.getElementById('kpiPayrollChange'), null, '', false); }

    // KPI: Winst
    document.getElementById('kpiProfit').textContent = j ? fmtEuro(j.profit) : '—';
    if (j && pj) {
        const pct = ((j.profit - pj.profit) / Math.abs(pj.profit) * 100);
        setChange(document.getElementById('kpiProfitChange'), pct, (pct > 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + '% vs vorige maand', false);
    } else { setChange(document.getElementById('kpiProfitChange'), null, '', false); }

    // Helper: calculate EBITDA from jortt data
    function calcEbitda(jortt) {
        if (!jortt) return null;
        const afschr = (jortt.cost_categories && jortt.cost_categories['Afschrijvingen']) || 0;
        const fin = (jortt.cost_categories && jortt.cost_categories['Financieel']) || 0;
        return jortt.profit + afschr + fin;
    }

    // KPI: EBITDA (maand)
    const ebitda = j ? calcEbitda(j) : null;
    document.getElementById('kpiEbitda').textContent = ebitda != null ? fmtEuro(ebitda) : '—';
    const prevEbitda = pj ? calcEbitda(pj) : null;
    if (ebitda != null && prevEbitda != null && Math.abs(prevEbitda) > 0) {
        const pct = ((ebitda - prevEbitda) / Math.abs(prevEbitda) * 100);
        setChange(document.getElementById('kpiEbitdaChange'), pct, (pct > 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + '% vs vorige maand', false);
    } else { setChange(document.getElementById('kpiEbitdaChange'), null, '', false); }

    // KPI: EBITDA (12 maanden)
    const allSorted = Object.keys(DASHBOARD_DATA).sort();
    const idx = allSorted.indexOf(ym);
    const t12 = allSorted.slice(Math.max(0, idx - 11), idx + 1);
    let sumEbitda = 0, countEbitda = 0;
    t12.forEach(m => {
        const md = DASHBOARD_DATA[m];
        if (md && md.jortt) { const e = calcEbitda(md.jortt); if (e != null) { sumEbitda += e; countEbitda++; } }
    });
    document.getElementById('kpiEbitda12').textContent = countEbitda > 0 ? fmtEuro(sumEbitda) : '—';
    // Compare with previous 12 months
    const t12prev = allSorted.slice(Math.max(0, idx - 23), Math.max(0, idx - 11));
    let sumEbitdaP = 0, countEbitdaP = 0;
    t12prev.forEach(m => {
        const md = DASHBOARD_DATA[m];
        if (md && md.jortt) { const e = calcEbitda(md.jortt); if (e != null) { sumEbitdaP += e; countEbitdaP++; } }
    });
    if (countEbitda > 0 && countEbitdaP > 0 && Math.abs(sumEbitdaP) > 0) {
        const pct = ((sumEbitda - sumEbitdaP) / Math.abs(sumEbitdaP) * 100);
        setChange(document.getElementById('kpiEbitda12Change'), pct, (pct > 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + '% vs vorige 12 mnd', false);
    } else { setChange(document.getElementById('kpiEbitda12Change'), null, '', false); }

    // Finance bar chart — trailing 12 months
    const trailing = allSorted.slice(Math.max(0, idx - 11), idx + 1);
    const labels = trailing.map(m => MONTH_ABBR[m.split('-')[1]]);
    const revData = trailing.map(m => { const md = DASHBOARD_DATA[m]; return md && md.jortt ? Math.round(md.jortt.revenue) : 0; });
    const costData = trailing.map(m => { const md = DASHBOARD_DATA[m]; return md && md.jortt ? Math.round(md.jortt.costs) : 0; });
    const profitData = trailing.map(m => { const md = DASHBOARD_DATA[m]; return md && md.jortt ? Math.round(md.jortt.profit) : 0; });
    financeChart.data.labels = labels;
    financeChart.data.datasets[0].data = revData;
    financeChart.data.datasets[1].data = costData;
    financeChart.data.datasets[2].data = profitData;
    financeChart.update();

    // Cost donut chart
    if (j && j.cost_categories) {
        const cats = Object.entries(j.cost_categories).sort((a, b) => b[1] - a[1]);
        // Show top 6, group rest as "Overig"
        const top = cats.slice(0, 6);
        const rest = cats.slice(6).reduce((s, c) => s + c[1], 0);
        const donutLabels = top.map(c => c[0]);
        const donutData = top.map(c => c[1]);
        const donutColors = top.map(c => COST_COLORS[c[0]] || '#94a3b8');
        if (rest > 0) { donutLabels.push('Overig'); donutData.push(rest); donutColors.push('#cbd5e1'); }
        costDonutChart.data.labels = donutLabels;
        costDonutChart.data.datasets[0].data = donutData;
        costDonutChart.data.datasets[0].backgroundColor = donutColors;
        costDonutChart.update();
    }

    // Cost breakdown list
    if (j && j.cost_categories) {
        const cats = Object.entries(j.cost_categories).sort((a, b) => b[1] - a[1]);
        const maxVal = cats[0][1];
        let html = '';
        cats.forEach(([name, val]) => {
            const pct = maxVal > 0 ? Math.round(val / maxVal * 100) : 0;
            const color = COST_COLORS[name] || '#94a3b8';
            html += `<div class="membership-item">
                <div class="membership-info">
                    <div class="membership-dot" style="background: ${color}"></div>
                    <div><div class="membership-name">${name}</div></div>
                </div>
                <div class="membership-stats">
                    <span class="membership-count" style="width: 70px;">€${Math.round(val).toLocaleString('nl-NL')}</span>
                    <div class="membership-bar">
                        <div class="membership-bar-fill" style="width: ${pct}%; background: ${color}"></div>
                    </div>
                </div>
            </div>`;
        });
        document.getElementById('costBreakdownList').innerHTML = html;
    } else {
        document.getElementById('costBreakdownList').innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Geen Jortt data voor deze maand</p>';
    }

    // Kerncijfers
    document.getElementById('finKerncijfersTitle').textContent = 'Financiële kerncijfers ' + monthName;
    let kcHtml = '';
    if (j) {
        // Winstmarge
        const marge = j.revenue > 0 ? (j.profit / j.revenue * 100) : 0;
        kcHtml += activityItem('payment',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
            `Winstmarge: <strong>${marge.toFixed(1).replace('.', ',')}%</strong>`,
            `€${fmt(j.profit)} van €${fmt(j.revenue)} omzet`,
            shortMonth + ' ' + year
        );

        // Payroll % of revenue
        const payrollPct = j.revenue > 0 ? (j.payroll / j.revenue * 100) : 0;
        kcHtml += activityItem('new-member',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
            `Payroll: <strong>${payrollPct.toFixed(1).replace('.', ',')}%</strong> van omzet`,
            `€${fmt(j.payroll)} uitbesteed werk`,
            shortMonth + ' ' + year
        );

        // Expenses excl payroll
        const expExPayroll = j.costs - j.payroll;
        const expPct = j.revenue > 0 ? (expExPayroll / j.revenue * 100) : 0;
        kcHtml += activityItem('expense',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
            `Overige kosten: <strong>${fmtEuro(expExPayroll)}</strong>`,
            `${expPct.toFixed(1).replace('.', ',')}% van omzet`,
            shortMonth + ' ' + year
        );

        // Revenue breakdown
        if (j.revenue_categories) {
            const revCats = Object.entries(j.revenue_categories).sort((a, b) => b[1] - a[1]);
            const topRev = revCats[0];
            const topPct = j.revenue > 0 ? (topRev[1] / j.revenue * 100) : 0;
            kcHtml += activityItem('class-event',
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
                `${topRev[0]}: <strong>${fmtEuro(topRev[1])}</strong>`,
                `${topPct.toFixed(0)}% van totale omzet`,
                shortMonth + ' ' + year
            );
        }
    } else {
        kcHtml = '<p style="color: var(--text-muted); font-size: 14px; padding: 12px 0;">Geen Jortt data voor deze maand</p>';
    }
    document.getElementById('finKerncijfersList').innerHTML = kcHtml;
}

function activityItem(iconClass, svg, text, detail, time) {
    return `<div class="activity-item">
        <div class="activity-icon ${iconClass}">${svg}</div>
        <div class="activity-info">
            <span class="activity-text">${text}</span>
            ${detail ? `<span class="activity-detail">${detail}</span>` : ''}
        </div>
        <span class="activity-time">${time}</span>
    </div>`;
}

// === MARKETING ===

function createMarketingCharts() {
    const ctx1 = document.getElementById('mkLeadsChart');
    const ctx2 = document.getElementById('mkSourceDonut');
    const ctx3 = document.getElementById('mkGrowthChart');
    if (!ctx1 || !ctx2 || !ctx3) return;

    mkLeadsChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                { label: 'E-book', data: [], backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4, stack: 'leads' },
                { label: 'Trials', data: [], backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 4, stack: 'leads' },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 16 } } },
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true }
            }
        }
    });

    mkSourceDonut = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['E-book', 'Trials'],
            datasets: [{ data: [0, 0], backgroundColor: ['#10b981', '#6366f1'], borderWidth: 0, hoverOffset: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14 } } }
        }
    });

    mkGrowthChart = new Chart(ctx3, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Totaal Subscribers', data: [], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', fill: true, tension: 0.3, pointRadius: 3 },
                { label: 'Nieuwe Signups', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.3, pointRadius: 3, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 16 } } },
            scales: {
                y: { beginAtZero: false, title: { display: true, text: 'Totaal' } },
                y1: { position: 'right', beginAtZero: true, title: { display: true, text: 'Nieuw' }, grid: { drawOnChartArea: false } },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateMarketing(ym) {
    if (!mkLeadsChart) createMarketingCharts();

    const d = DASHBOARD_DATA[ym];
    const mc = MAILCHIMP_DATA[ym] || {};

    // Leads from Mailchimp (excluding members = already customers)
    const leads = (mc.signups || 0) - (mc.member || 0);
    const ebookCount = mc.ebook || 0;
    // Trials from DASHBOARD_DATA (Excel source)
    const trialCount = d ? (d.trials || 0) : 0;

    // Trial → Lid % from DASHBOARD_DATA
    const trialConv = d && d.trial_to_member != null ? d.trial_to_member : null;

    // Previous month for change
    const prevYm = getPrevYm(ym);
    const prevMc = MAILCHIMP_DATA[prevYm] || {};
    const prevD = DASHBOARD_DATA[prevYm];
    const prevLeads = (prevMc.signups || 0) - (prevMc.member || 0);
    const prevTrials = prevD ? (prevD.trials || 0) : 0;

    // Cumulative subscribers calculation
    const allYms = Object.keys(MAILCHIMP_DATA).sort();
    let cumSubs = 0;
    for (const m of allYms) {
        const md = MAILCHIMP_DATA[m];
        cumSubs += (md.signups || 0) - (md.unsubscribes || 0) - (md.cleaned || 0);
        if (m === ym) break;
    }
    // Prev month cumulative
    let prevCumSubs = 0;
    for (const m of allYms) {
        if (m === ym) break;
        const md = MAILCHIMP_DATA[m];
        prevCumSubs += (md.signups || 0) - (md.unsubscribes || 0) - (md.cleaned || 0);
    }

    // KPIs
    setText('mkKpiLeads', leads);
    setChange('mkKpiLeadsChange', leads, prevLeads);
    setText('mkKpiEbook', ebookCount);
    setChange('mkKpiEbookChange', ebookCount, prevMc.ebook || 0);
    setText('mkKpiTrials', trialCount);
    setChange('mkKpiTrialsChange', trialCount, prevTrials);
    setText('mkKpiConversion', trialConv != null ? (trialConv * 100).toFixed(1).replace('.', ',') + '%' : '—');
    if (trialConv != null) {
        const prevConv = prevD && prevD.trial_to_member != null ? prevD.trial_to_member : null;
        if (prevConv != null) {
            const ppDiff = (trialConv - prevConv) * 100;
            setChangeRaw('mkKpiConversionChange', ppDiff, ppDiff.toFixed(1).replace('.', ',') + 'pp');
        } else {
            document.getElementById('mkKpiConversionChange').textContent = '';
        }
    }
    setText('mkKpiSubscribers', fmt(cumSubs));
    setChange('mkKpiSubscribersChange', cumSubs, prevCumSubs);

    // Leads stacked bar chart — last 12 months
    const months12 = getLast12(ym);
    const labels12 = months12.map(m => MONTH_ABBR[m.slice(5)]);
    const ebookData = months12.map(m => (MAILCHIMP_DATA[m] || {}).ebook || 0);
    const trialData = months12.map(m => (DASHBOARD_DATA[m] || {}).trials || 0);

    mkLeadsChart.data.labels = labels12;
    mkLeadsChart.data.datasets[0].data = ebookData;
    mkLeadsChart.data.datasets[1].data = trialData;
    mkLeadsChart.update();

    // Source donut
    mkSourceDonut.data.datasets[0].data = [ebookCount, trialCount];
    mkSourceDonut.update();

    // Growth chart — cumulative subscribers + signups per month
    const cumData = [];
    const signupData = [];
    let running = 0;
    for (const m of allYms) {
        if (m > ym) break;
        const md = MAILCHIMP_DATA[m];
        running += (md.signups || 0) - (md.unsubscribes || 0) - (md.cleaned || 0);
        // Only show last 12 months in chart
        if (months12.includes(m)) {
            cumData.push(running);
            signupData.push(md.signups || 0);
        }
    }
    mkGrowthChart.data.labels = labels12;
    mkGrowthChart.data.datasets[0].data = cumData;
    mkGrowthChart.data.datasets[1].data = signupData;
    mkGrowthChart.update();

    // Source detail list
    const sourceList = document.getElementById('mkSourceList');
    const totalLeads = ebookCount + trialCount;
    const sources = [
        { name: 'E-book Downloads', count: ebookCount, color: '#10b981' },
        { name: 'Trials', count: trialCount, color: '#6366f1' },
    ];
    sourceList.innerHTML = sources.map(s => {
        const pct = totalLeads > 0 ? ((s.count / totalLeads) * 100) : 0;
        return `<div class="membership-item">
            <div class="membership-info">
                <div class="membership-dot" style="background:${s.color}"></div>
                <div><div class="membership-name">${s.name}</div><div class="membership-price">${pct.toFixed(0)}% van leads</div></div>
            </div>
            <div class="membership-stats">
                <span class="membership-count">${s.count}</span>
                <div class="membership-bar"><div class="membership-bar-fill" style="width:${pct}%; background:${s.color}"></div></div>
            </div>
        </div>`;
    }).join('');

    // Marketing kerncijfers
    const mkList = document.getElementById('mkKerncijfersList');
    // 12-month averages
    const avg12Leads = months12.reduce((s, m) => s + ((MAILCHIMP_DATA[m] || {}).signups || 0) - ((MAILCHIMP_DATA[m] || {}).member || 0), 0) / months12.length;
    const avg12Ebook = months12.reduce((s, m) => s + ((MAILCHIMP_DATA[m] || {}).ebook || 0), 0) / months12.length;
    const avg12Trial = months12.reduce((s, m) => s + ((DASHBOARD_DATA[m] || {}).trials || 0), 0) / months12.length;
    // Conversion averages from DASHBOARD_DATA
    const convValues = months12.map(m => (DASHBOARD_DATA[m] || {}).trial_to_member).filter(v => v != null);
    const avg12Conv = convValues.length > 0 ? convValues.reduce((a, b) => a + b, 0) / convValues.length : null;
    // New members & lost members from DASHBOARD_DATA
    const newMembers = d ? (d.new_members_excel || 0) : 0;
    const lostMembers = d ? (d.lost || 0) : 0;
    const items = [
        { icon: 'new-member', label: 'Gem. leads/mnd (12m)', value: avg12Leads.toFixed(0) },
        { icon: 'payment', label: 'Gem. e-book/mnd (12m)', value: avg12Ebook.toFixed(0) },
        { icon: 'class-event', label: 'Gem. trials/mnd (12m)', value: avg12Trial.toFixed(0) },
        { icon: 'new-member', label: 'Gem. conversie (12m)', value: avg12Conv != null ? (avg12Conv * 100).toFixed(1).replace('.', ',') + '%' : '—' },
        { icon: 'payment', label: 'Nieuwe leden deze maand', value: newMembers },
        { icon: 'cancel', label: 'Verloren leden deze maand', value: lostMembers },
    ];
    mkList.innerHTML = items.map(i => `<div class="activity-item">
        <div class="activity-icon ${i.icon}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></div>
        <div class="activity-info"><span class="activity-text">${i.label}</span></div>
        <span class="activity-time">${i.value}</span>
    </div>`).join('');
}

// Helper: get previous month ym
function getPrevYm(ym) {
    const [y, m] = ym.split('-').map(Number);
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    return `${py}-${String(pm).padStart(2, '0')}`;
}

// Helper: set text
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// Helper: set change badge
function setChange(id, cur, prev) {
    const el = document.getElementById(id);
    if (!el) return;
    if (prev === 0 && cur === 0) { el.textContent = ''; return; }
    const diff = cur - prev;
    const sign = diff > 0 ? '+' : '';
    el.textContent = `${sign}${diff} vs vorige maand`;
    el.className = 'kpi-change ' + (diff > 0 ? 'positive' : diff < 0 ? 'negative' : '');
}

// Helper: set change with custom text
function setChangeRaw(id, diff, text) {
    const el = document.getElementById(id);
    if (!el) return;
    const sign = diff > 0 ? '+' : '';
    el.textContent = `${sign}${text} vs vorige maand`;
    el.className = 'kpi-change ' + (diff > 0 ? 'positive' : diff < 0 ? 'negative' : '');
}

// Helper: get last 12 months as array of ym strings
function getLast12(ym) {
    const allYms = Object.keys(DASHBOARD_DATA).sort();
    const idx = allYms.indexOf(ym);
    if (idx < 0) return allYms.slice(-12);
    const start = Math.max(0, idx - 11);
    return allYms.slice(start, idx + 1);
}

// === SIMULATOR ===

const SIM_SCENARIOS = {
    optimistic: { elasticity: -0.10, churnSens: 0.05, slowdown: 0.03 },
    realistic:    { elasticity: -0.20, churnSens: 0.10, slowdown: 0.05 },
    pessimistic:   { elasticity: -0.35, churnSens: 0.20, slowdown: 0.10 }
};

const SIM_PRICES = {
    'Monthly': 99, 'Yearly': 73,
    'Monthly Student': 87, 'Yearly Student': 59,
    'Monthly U18': 87, 'Yearly U18': 59
};

let simCurrentScenario = 'realistic';
let simInitialized = false;

function createSimulatorCharts() {
    if (simMembersChart) return;
    // Revenue vs Price curve chart
    simCurveChart = new Chart(document.getElementById('simCurveChart').getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'Omzet', data: [], borderColor: '#6366f1', backgroundColor: '#6366f118', borderWidth: 2, pointRadius: 4, fill: true, tension: 0.3, yAxisID: 'y' },
            { label: 'Leden', data: [], borderColor: '#10b981', backgroundColor: '#10b98118', borderWidth: 2, pointRadius: 4, fill: false, tension: 0.3, yAxisID: 'y1' }
        ]},
        options: { responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } },
            scales: {
                y: { position: 'left', title: { display: true, text: 'Omzet (€)' }, ticks: { callback: v => '€' + Math.round(v).toLocaleString('nl-NL') } },
                y1: { position: 'right', title: { display: true, text: 'Leden' }, grid: { drawOnChartArea: false } }
            }
        }
    });
    const baseDS = (label, color, dash) => ({
        label, data: [], borderColor: color, backgroundColor: color + '18',
        borderWidth: 2, borderDash: dash || [], pointRadius: 2, fill: false, tension: 0.3
    });
    simMembersChart = new Chart(document.getElementById('simMembersChart').getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [
            baseDS('Baseline', '#94a3b8', [5, 5]),
            baseDS('Optimistic', '#10b981'),
            baseDS('Realistic', '#6366f1'),
            baseDS('Pessimistic', '#ef4444')
        ]},
        options: { responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: false, title: { display: true, text: 'Leden' } } }
        }
    });
    simRevenueChart = new Chart(document.getElementById('simRevenueChart').getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [
            baseDS('Baseline', '#94a3b8', [5, 5]),
            baseDS('Optimistic', '#10b981'),
            baseDS('Realistic', '#6366f1'),
            baseDS('Pessimistic', '#ef4444')
        ]},
        options: { responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: false, title: { display: true, text: 'Omzet (€)' },
                ticks: { callback: v => '€' + Math.round(v).toLocaleString('nl-NL') } } }
        }
    });
}

function calcWeightedPrice(categories) {
    if (!categories) return 73;
    let totalMembers = 0, totalWeighted = 0;
    for (const [cat, count] of Object.entries(categories)) {
        if (cat === 'Overig' || !SIM_PRICES[cat]) continue;
        totalMembers += count;
        totalWeighted += count * SIM_PRICES[cat];
    }
    return totalMembers > 0 ? totalWeighted / totalMembers : 73;
}

function runScenario(params, scenario) {
    const { currentMembers, currentPrice, currentRevenue, currentChurn, newMembersPerMonth, fixedCosts, varCost, priceInc, scope } = params;
    const { elasticity, churnSens, slowdown } = scenario;

    const newPrice = currentPrice * (1 + priceInc / 100);

    // Scope multiplier: "all" = full impact, "new_only" = 20% impact, "phased" = 50% impact
    const scopeMultiplier = scope === 'new_only' ? 0.2 : scope === 'phased' ? 0.5 : 1.0;

    // Immediate member change from elasticity ONLY (no churn double-counting)
    const expectedMemberChangePct = elasticity * (priceInc / 100) * scopeMultiplier;
    const expectedMembersAfter = Math.max(0, Math.round(currentMembers * (1 + expectedMemberChangePct)));
    const expectedLost = currentMembers - expectedMembersAfter;

    // Revenue: use blended price for phased/new_only
    const effectivePrice = scope === 'new_only' ? currentPrice : scope === 'phased' ? currentPrice * (1 + priceInc / 200) : newPrice;
    const projRevenue = expectedMembersAfter * effectivePrice;
    const revDelta = projRevenue - currentRevenue;
    const revDeltaPct = currentRevenue > 0 ? (revDelta / currentRevenue) * 100 : 0;

    // Churn is for forecast only, not immediate
    const additionalChurn = currentChurn * churnSens * (priceInc / 10) * scopeMultiplier;
    const projChurn = currentChurn + additionalChurn;
    const projNewMembers = Math.max(0, Math.round(newMembersPerMonth * (1 - slowdown * (priceInc / 10))));

    // Break-even: max members lost before revenue drops
    const memberRevenue = currentMembers * currentPrice;
    const breakEvenMembers = memberRevenue / effectivePrice;
    const maxLostBeforeDrop = currentMembers - breakEvenMembers;
    const maxLostPct = currentMembers > 0 ? (maxLostBeforeDrop / currentMembers) * 100 : 0;

    // 12-month forecast (churn applied here, NOT in immediate calc)
    const forecast = [];
    let members = expectedMembersAfter;
    // For phased: price gradually shifts to newPrice over 12 months
    for (let i = 0; i < 12; i++) {
        const lost = members * (projChurn / 100);
        members = Math.max(0, members - lost + projNewMembers);
        const monthPrice = scope === 'phased' ? currentPrice + (newPrice - currentPrice) * ((i + 1) / 12) : scope === 'new_only' ? currentPrice + (newPrice - currentPrice) * Math.min(1, (i + 1) * projNewMembers / members) : newPrice;
        const rev = members * monthPrice;
        const costs = fixedCosts + members * varCost;
        forecast.push({ month: i + 1, members: Math.round(members), revenue: Math.round(rev), costs: Math.round(costs), profit: Math.round(rev - costs) });
    }

    return { newPrice, effectivePrice, expectedLost, expectedMembersAfter, projRevenue, revDelta, revDeltaPct, projChurn, projNewMembers, breakEvenMembers: Math.round(breakEvenMembers), maxLostBeforeDrop: Math.round(maxLostBeforeDrop), maxLostPct, forecast };
}

function runBaseline(params) {
    const { currentMembers, currentPrice, currentRevenue, currentChurn, newMembersPerMonth, fixedCosts, varCost } = params;
    const forecast = [];
    let members = currentMembers;
    for (let i = 0; i < 12; i++) {
        const lost = members * (currentChurn / 100);
        members = Math.max(0, members - lost + newMembersPerMonth);
        const rev = members * currentPrice;
        forecast.push({ month: i + 1, members: Math.round(members), revenue: Math.round(rev) });
    }
    return { forecast };
}

function getSimParams() {
    const members = parseFloat(document.getElementById('simMembers').value) || 0;
    const price = parseFloat(document.getElementById('simPrice').value) || 0;
    const revenue = Math.round(members * price);
    // Update the read-only revenue field
    document.getElementById('simRevenue').value = '€' + revenue.toLocaleString('nl-NL');
    return {
        currentMembers: members,
        currentPrice: price,
        currentRevenue: revenue,
        currentChurn: parseFloat(document.getElementById('simChurn').value) || 0,
        newMembersPerMonth: parseFloat(document.getElementById('simNewMembers').value) || 0,
        fixedCosts: parseFloat(document.getElementById('simFixedCosts').value) || 0,
        varCost: parseFloat(document.getElementById('simVarCost').value) || 0,
        priceInc: parseFloat(document.getElementById('simPriceInc').value) || 0,
        scope: document.querySelector('input[name="simScope"]:checked').value
    };
}

function getScenarioParams() {
    if (simCurrentScenario === 'custom') {
        return {
            elasticity: parseFloat(document.getElementById('simElasticity').value) || -0.20,
            churnSens: parseFloat(document.getElementById('simChurnSens').value) || 0.10,
            slowdown: parseFloat(document.getElementById('simSlowdown').value) || 0.05
        };
    }
    return SIM_SCENARIOS[simCurrentScenario];
}

function recalcSimulator() {
    const params = getSimParams();
    const scenario = getScenarioParams();
    const result = runScenario(params, scenario);
    const baseline = runBaseline(params);
    const allResults = {};
    for (const [name, sc] of Object.entries(SIM_SCENARIOS)) {
        allResults[name] = runScenario(params, sc);
    }

    // Update slider label
    document.getElementById('simPriceIncLabel').textContent = params.priceInc + '%';

    // KPI cards
    document.getElementById('simKpiNewPrice').textContent = '€' + result.newPrice.toFixed(2).replace('.', ',');
    setChange(document.getElementById('simKpiNewPriceChange'), params.priceInc, '+' + params.priceInc + '% vs huidig', false);

    document.getElementById('simKpiLost').textContent = fmt(result.expectedLost);
    const lostPct = params.currentMembers > 0 ? (result.expectedLost / params.currentMembers * 100).toFixed(1).replace('.', ',') : '0';
    setChange(document.getElementById('simKpiLostChange'), -result.expectedLost, lostPct + '% van leden', true);

    document.getElementById('simKpiRevenue').textContent = fmtEuro(result.projRevenue);
    const sign = result.revDeltaPct > 0 ? '+' : '';
    setChange(document.getElementById('simKpiRevenueChange'), result.revDeltaPct, sign + result.revDeltaPct.toFixed(1).replace('.', ',') + '% vs huidig', false);

    document.getElementById('simKpiChurn').textContent = result.projChurn.toFixed(1).replace('.', ',') + '%';
    const churnDiff = result.projChurn - params.currentChurn;
    setChange(document.getElementById('simKpiChurnChange'), churnDiff, '+' + churnDiff.toFixed(1).replace('.', ',') + 'pp vs huidig', true);

    document.getElementById('simKpiBreakeven').textContent = fmt(result.maxLostBeforeDrop) + ' leden';
    setChange(document.getElementById('simKpiBreakevenChange'), null, 'max ' + result.maxLostPct.toFixed(1).replace('.', ',') + '% voordat omzet daalt', false);

    // Warnings
    const warnings = [];
    if (result.revDeltaPct < 0) warnings.push('Omzet daalt met ' + Math.abs(result.revDeltaPct).toFixed(1).replace('.', ',') + '% bij dit scenario');
    if (result.projChurn > params.currentChurn * 2) warnings.push('Churn rate verdubbelt (van ' + params.currentChurn.toFixed(1) + '% naar ' + result.projChurn.toFixed(1) + '%)');
    if (result.expectedLost > result.maxLostBeforeDrop) warnings.push('Verwacht ledenverlies (' + result.expectedLost + ') overschrijdt break-even punt (' + result.maxLostBeforeDrop + ')');
    const warnEl = document.getElementById('simWarnings');
    warnEl.innerHTML = warnings.map(w =>
        '<div class="sim-warning"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' + w + '</div>'
    ).join('');

    // Scenario table
    document.getElementById('simTableSubtitle').textContent = 'Bij ' + params.priceInc + '% prijsverhoging';
    const rows = [
        ['Nieuwe prijs', '€' + params.currentPrice.toFixed(2).replace('.', ','), ...['optimistic', 'realistic', 'pessimistic'].map(s => '€' + allResults[s].newPrice.toFixed(2).replace('.', ','))],
        ['Ledenverlies', '0', ...['optimistic', 'realistic', 'pessimistic'].map(s => fmt(allResults[s].expectedLost))],
        ['Leden na verhoging', fmt(params.currentMembers), ...['optimistic', 'realistic', 'pessimistic'].map(s => fmt(allResults[s].expectedMembersAfter))],
        ['Maandomzet', fmtEuro(params.currentRevenue), ...['optimistic', 'realistic', 'pessimistic'].map(s => fmtEuro(allResults[s].projRevenue))],
        ['Omzet verschil', '—', ...['optimistic', 'realistic', 'pessimistic'].map(s => {
            const d = allResults[s].revDeltaPct;
            const cls = d >= 0 ? 'positive' : 'negative';
            return '<span class="' + cls + '">' + (d > 0 ? '+' : '') + d.toFixed(1).replace('.', ',') + '%</span>';
        })],
        ['Churn rate', params.currentChurn.toFixed(1).replace('.', ',') + '%', ...['optimistic', 'realistic', 'pessimistic'].map(s => allResults[s].projChurn.toFixed(1).replace('.', ',') + '%')],
        ['Nieuwe leden/mnd', fmt(params.newMembersPerMonth), ...['optimistic', 'realistic', 'pessimistic'].map(s => fmt(allResults[s].projNewMembers))],
        ['Leden na 12 mnd', fmt(baseline.forecast[11].members), ...['optimistic', 'realistic', 'pessimistic'].map(s => fmt(allResults[s].forecast[11].members))],
        ['Omzet mnd 12', fmtEuro(baseline.forecast[11].revenue), ...['optimistic', 'realistic', 'pessimistic'].map(s => fmtEuro(allResults[s].forecast[11].revenue))]
    ];
    document.getElementById('simTableBody').innerHTML = rows.map(r =>
        '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td><td>' + r[4] + '</td></tr>'
    ).join('');

    // Charts
    const labels = Array.from({ length: 12 }, (_, i) => 'Mnd ' + (i + 1));
    simMembersChart.data.labels = labels;
    simMembersChart.data.datasets[0].data = baseline.forecast.map(f => f.members);
    simMembersChart.data.datasets[1].data = allResults.optimistic.forecast.map(f => f.members);
    simMembersChart.data.datasets[2].data = allResults.realistic.forecast.map(f => f.members);
    simMembersChart.data.datasets[3].data = allResults.pessimistic.forecast.map(f => f.members);
    simMembersChart.update();

    simRevenueChart.data.labels = labels;
    simRevenueChart.data.datasets[0].data = baseline.forecast.map(f => f.revenue);
    simRevenueChart.data.datasets[1].data = allResults.optimistic.forecast.map(f => f.revenue);
    simRevenueChart.data.datasets[2].data = allResults.realistic.forecast.map(f => f.revenue);
    simRevenueChart.data.datasets[3].data = allResults.pessimistic.forecast.map(f => f.revenue);
    simRevenueChart.update();

    // Revenue vs Price curve
    const curveSteps = [0, 2, 5, 7, 10, 12, 15, 20, 25, 30];
    const curveLabels = curveSteps.map(s => '+' + s + '%');
    const curveRevenue = [];
    const curveMembers = [];
    curveSteps.forEach(inc => {
        const p = { ...params, priceInc: inc };
        const r = runScenario(p, scenario);
        curveRevenue.push(Math.round(r.projRevenue));
        curveMembers.push(r.expectedMembersAfter);
    });
    simCurveChart.data.labels = curveLabels;
    simCurveChart.data.datasets[0].data = curveRevenue;
    simCurveChart.data.datasets[1].data = curveMembers;
    simCurveChart.update();
}

function updateSimulator(ym) {
    const d = DASHBOARD_DATA[ym];
    if (!d) return;
    const [year, month] = ym.split('-');
    const monthName = MONTH_NAMES[month];
    document.querySelector('.page-subtitle').textContent = 'Haven BJJ — ' + monthName + ' ' + year;

    createSimulatorCharts();

    // Trailing 12 months for averages
    const allKeys = Object.keys(DASHBOARD_DATA).sort();
    const curIdx = allKeys.indexOf(ym);
    const t12 = allKeys.slice(Math.max(0, curIdx - 11), curIdx + 1);

    // All inputs based on 12-month averages for consistency
    let sumPrice = 0, countPrice = 0;
    let sumChurn = 0, countChurn = 0;
    let sumNewMem = 0, countNewMem = 0;
    let sumCosts = 0, countCosts = 0;
    let sumMembers = 0, countMembers = 0;
    t12.forEach(m => {
        const md = DASHBOARD_DATA[m];
        if (md.categories) { sumPrice += calcWeightedPrice(md.categories); countPrice++; }
        if (md.attrition != null && md.attrition > 0) { sumChurn += md.attrition * 100; countChurn++; }
        if (md.new_members != null) { sumNewMem += md.new_members; countNewMem++; }
        if (md.jortt && md.jortt.costs) { sumCosts += md.jortt.costs; countCosts++; }
        const mMembers = md.total_6cat || md.total_members_excel || 0;
        if (mMembers > 0) { sumMembers += mMembers; countMembers++; }
    });
    const avgPrice = countPrice > 0 ? sumPrice / countPrice : 73;
    const churn = countChurn > 0 ? sumChurn / countChurn : 5;
    const newMem = countNewMem > 0 ? Math.round(sumNewMem / countNewMem) : 30;
    const avgCosts = countCosts > 0 ? sumCosts / countCosts : 0;
    const avgMembers = countMembers > 0 ? Math.round(sumMembers / countMembers) : 300;
    const fixedCosts = avgCosts > 0 ? Math.round(avgCosts * 0.7) : 10000;
    const varCost = (avgCosts > 0 && avgMembers > 0) ? Math.round(avgCosts * 0.3 / avgMembers * 100) / 100 : 5;
    // Revenue = members × price (consistent baseline)
    const avgRevenue = Math.round(avgMembers * avgPrice);

    document.getElementById('simMembers').value = avgMembers;
    document.getElementById('simPrice').value = avgPrice.toFixed(2);
    document.getElementById('simChurn').value = churn.toFixed(1);
    document.getElementById('simNewMembers').value = newMem;
    document.getElementById('simFixedCosts').value = fixedCosts;
    document.getElementById('simVarCost').value = varCost;

    recalcSimulator();
}

// Simulator event listeners
document.getElementById('simPriceInc').addEventListener('input', recalcSimulator);
['simMembers', 'simPrice', 'simChurn', 'simNewMembers', 'simFixedCosts', 'simVarCost'].forEach(id => {
    document.getElementById(id).addEventListener('input', recalcSimulator);
});
['simElasticity', 'simChurnSens', 'simSlowdown'].forEach(id => {
    document.getElementById(id).addEventListener('input', recalcSimulator);
});
document.querySelectorAll('input[name="simScope"]').forEach(r => {
    r.addEventListener('change', recalcSimulator);
});

document.querySelectorAll('.sim-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.sim-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        simCurrentScenario = tab.dataset.scenario;
        document.getElementById('simCustomParams').style.display = simCurrentScenario === 'custom' ? '' : 'none';
        recalcSimulator();
    });
});

// === PDF RAPPORT ===

function generatePDFReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const ym = monthSelect.value;
    const d = DASHBOARD_DATA[ym];
    if (!d) return;

    const pym = prevYm(ym);
    const pd = DASHBOARD_DATA[pym];
    const [year, month] = ym.split('-');
    const monthName = MONTH_NAMES[month];
    const margin = 15;
    const pageW = 210;
    const contentW = pageW - 2 * margin;
    let y = margin;

    // Disable button during generation
    const btn = document.getElementById('btnPdfRapport');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Genereren...';

    // --- Helpers ---
    function checkPage(needed) {
        if (y + needed > 280) {
            doc.addPage();
            y = 20;
        }
    }

    function sectionTitle(text) {
        checkPage(14);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 102, 241); // indigo
        doc.text(text, margin, y);
        y += 2;
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + contentW, y);
        y += 7;
        doc.setTextColor(15, 23, 42); // dark
    }

    function valOrDash(v, prefix, suffix) {
        if (v == null || isNaN(v)) return '—';
        return (prefix || '') + Math.round(v).toLocaleString('nl-NL') + (suffix || '');
    }

    // --- HEADER ---
    // Logo square
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(margin, y, 14, 14, 3, 3, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('H', margin + 4.8, y + 10);

    // Title
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Haven BJJ', margin + 18, y + 6);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Maandrapport', margin + 18, y + 12);

    // Right side: month + date
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const titleRight = monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' ' + year;
    doc.text(titleRight, pageW - margin, y + 6, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    const now = new Date();
    doc.text('Gegenereerd: ' + now.toLocaleDateString('nl-NL') + ' ' + now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }), pageW - margin, y + 12, { align: 'right' });

    y += 18;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
    y += 8;

    // --- KPI SUMMARY ---
    sectionTitle('Kerngetallen');

    const totalLeden = d.total_6cat || d.total_members_excel || 0;
    const prevLeden = pd ? (pd.total_6cat || pd.total_members_excel || 0) : null;
    const omzet = (d.jortt && d.jortt.revenue) || d.total_income;
    const prevOmzet = pd ? ((pd.jortt && pd.jortt.revenue) || pd.total_income) : null;
    const trials = d.trials;
    const prevTrials = pd ? pd.trials : null;
    const attrition = d.attrition;
    const prevAttrition = pd ? pd.attrition : null;

    // LTV calculation
    const allKeys = Object.keys(DASHBOARD_DATA).sort();
    const curIdx = allKeys.indexOf(ym);
    const t12 = allKeys.slice(Math.max(0, curIdx - 11), curIdx + 1);
    let sumOpl = 0, cOpl = 0, sumAttr = 0, cAttr = 0;
    t12.forEach(m => {
        const md = DASHBOARD_DATA[m];
        const mOmzet = (md.jortt && md.jortt.revenue) || md.total_income;
        const mLeden = md.total_6cat || md.total_members_excel || 0;
        if (mOmzet != null && mLeden > 0) { sumOpl += mOmzet / mLeden; cOpl++; }
        if (md.attrition != null && md.attrition > 0) { sumAttr += md.attrition; cAttr++; }
    });
    const ltv = (cOpl > 0 && cAttr > 0) ? (sumOpl / cOpl) / (sumAttr / cAttr) : null;

    function changeText(cur, prev, suffix, pct) {
        if (cur == null || prev == null) return '—';
        if (pct && prev > 0) {
            const ch = ((cur - prev) / prev * 100);
            return (ch > 0 ? '+' : '') + ch.toFixed(1).replace('.', ',') + '%';
        }
        const diff = cur - prev;
        return (diff > 0 ? '+' : '') + Math.round(diff).toLocaleString('nl-NL') + (suffix || '');
    }

    const kpiData = [
        ['Actieve Leden', fmt(totalLeden), changeText(totalLeden, prevLeden, '')],
        ['Maandomzet', valOrDash(omzet, '€'), changeText(omzet, prevOmzet, '', true)],
        ['Trials', trials != null ? fmt(trials) : '—', changeText(trials, prevTrials, '', true)],
        ['Attrition Rate', attrition != null ? (attrition * 100).toFixed(1).replace('.', ',') + '%' : '—',
            attrition != null && prevAttrition != null ? ((attrition - prevAttrition) * 100 > 0 ? '+' : '') + ((attrition - prevAttrition) * 100).toFixed(1).replace('.', ',') + 'pp' : '—'],
        ['Customer LTV', ltv != null ? valOrDash(ltv, '€') : '—', '—']
    ];

    doc.autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [['KPI', 'Waarde', 'Verandering']],
        body: kpiData,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], font: 'helvetica', fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { font: 'helvetica', fontSize: 10, textColor: [15, 23, 42] },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { halign: 'right', cellWidth: 50 },
            2: { halign: 'right', cellWidth: 50 }
        },
        styles: { cellPadding: 4 }
    });
    y = doc.lastAutoTable.finalY + 10;

    // --- REVENUE CHART ---
    sectionTitle('Omzet & Leden — Laatste 12 maanden');

    try {
        const revCanvas = document.getElementById('revenueChart');
        const revImg = revCanvas.toDataURL('image/png');
        checkPage(70);
        doc.addImage(revImg, 'PNG', margin, y, contentW, 60);
        y += 64;
    } catch (e) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('Chart niet beschikbaar', margin, y + 5);
        y += 12;
    }

    // Revenue data table (for AI readability)
    checkPage(50);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Ruwe data (voor analyse):', margin, y);
    y += 4;

    const trailing = allKeys.slice(Math.max(0, curIdx - 11), curIdx + 1);
    const trendBody = trailing.map(m => {
        const md = DASHBOARD_DATA[m];
        const mOmzet = (md.jortt && md.jortt.revenue) || md.total_income;
        const mLeden = md.total_6cat || md.total_members_excel || 0;
        const [ty, tm] = m.split('-');
        return [MONTH_ABBR[tm] + ' ' + ty, valOrDash(mOmzet, '€'), fmt(mLeden)];
    });

    doc.autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Maand', 'Omzet', 'Leden']],
        body: trendBody,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [100, 116, 139], font: 'helvetica', fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { font: 'helvetica', fontSize: 8, textColor: [15, 23, 42], cellPadding: 2.5 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
    });
    y = doc.lastAutoTable.finalY + 10;

    // --- PAGE 2: MEMBERSHIP ---
    doc.addPage();
    y = 20;

    sectionTitle('Ledenverdeling per Abonnement');

    // Donut chart
    try {
        const donutCanvas = document.getElementById('membersChart');
        const donutImg = donutCanvas.toDataURL('image/png');
        checkPage(65);
        const imgW = 90;
        doc.addImage(donutImg, 'PNG', margin + (contentW - imgW) / 2, y, imgW, 55);
        y += 59;
    } catch (e) {
        y += 5;
    }

    // Membership breakdown table
    if (d.categories) {
        const cats = d.categories;
        const catTotal = Object.values(cats).reduce((a, b) => a + b, 0);
        const catBody = Object.entries(cats).map(([name, count]) => {
            const pct = catTotal > 0 ? ((count / catTotal) * 100).toFixed(1).replace('.', ',') + '%' : '—';
            return [name, String(count), pct];
        });

        doc.autoTable({
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Categorie', 'Aantal', 'Percentage']],
            body: catBody,
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241], font: 'helvetica', fontStyle: 'bold', fontSize: 10 },
            bodyStyles: { font: 'helvetica', fontSize: 10, textColor: [15, 23, 42] },
            alternateRowStyles: { fillColor: [241, 245, 249] },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
            styles: { cellPadding: 4 }
        });
        y = doc.lastAutoTable.finalY + 10;
    }

    // --- KERNCIJFERS ---
    sectionTitle('Kerncijfers');

    const newMem = d.new_members != null ? d.new_members : (d.new_members_excel || null);
    const lostMem = d.lost_members != null ? d.lost_members : (d.lost || null);
    const nettoGroei = (newMem != null && lostMem != null) ? newMem - lostMem : null;
    const trialConv = d.trial_to_member;
    const omzetPerLid = d.income_per_member || (omzet && totalLeden > 0 ? omzet / totalLeden : null);
    const zettle = d.zettle;

    // Biggest category
    let bigCat = '—', bigCount = 0;
    if (d.categories) {
        Object.entries(d.categories).forEach(([name, cnt]) => {
            if (cnt > bigCount) { bigCat = name; bigCount = cnt; }
        });
    }

    const kcData = [
        ['Nieuwe leden', newMem != null ? fmt(newMem) : '—'],
        ['Opzeggingen', lostMem != null ? fmt(lostMem) : '—'],
        ['Netto groei', nettoGroei != null ? (nettoGroei > 0 ? '+' : '') + fmt(nettoGroei) : '—'],
        ['Grootste categorie', bigCat + (bigCount > 0 ? ' (' + bigCount + ')' : '')],
        ['Omzet per lid', valOrDash(omzetPerLid, '€')],
        ['Trial → lid conversie', trialConv != null ? trialConv.toFixed(1).replace('.', ',') + '%' : '—'],
        ['Zettle omzet', valOrDash(zettle, '€')]
    ];

    doc.autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Metriek', 'Waarde']],
        body: kcData,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], font: 'helvetica', fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { font: 'helvetica', fontSize: 10, textColor: [15, 23, 42] },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right' } },
        styles: { cellPadding: 4 }
    });
    y = doc.lastAutoTable.finalY + 10;

    // --- 12-MONTH TREND TABLE (AI readable) ---
    sectionTitle('Trenddata — Laatste 12 maanden');

    const fullTrendBody = trailing.map(m => {
        const md = DASHBOARD_DATA[m];
        const mOmzet = (md.jortt && md.jortt.revenue) || md.total_income;
        const mLeden = md.total_6cat || md.total_members_excel || 0;
        const mTrials = md.trials;
        const mAttr = md.attrition;
        const mNew = md.new_members != null ? md.new_members : (md.new_members_excel || null);
        const mLost = md.lost_members != null ? md.lost_members : (md.lost || null);
        const [ty, tm] = m.split('-');
        return [
            MONTH_ABBR[tm] + ' ' + ty,
            fmt(mLeden),
            valOrDash(mOmzet, '€'),
            mTrials != null ? fmt(mTrials) : '—',
            mAttr != null ? (mAttr * 100).toFixed(1).replace('.', ',') + '%' : '—',
            mNew != null ? fmt(mNew) : '—',
            mLost != null ? fmt(mLost) : '—'
        ];
    });

    doc.autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Maand', 'Leden', 'Omzet', 'Trials', 'Attrition', 'Nieuw', 'Verloren']],
        body: fullTrendBody,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], font: 'helvetica', fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { font: 'helvetica', fontSize: 8, textColor: [15, 23, 42], cellPadding: 2.5 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } }
    });

    // --- FOOTERS ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Haven BJJ — Maandrapport ' + monthName + ' ' + year, margin, 290);
        doc.text('Pagina ' + i + ' van ' + totalPages, pageW - margin, 290, { align: 'right' });
    }

    // --- SAVE ---
    const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    doc.save('Haven_BJJ_Rapport_' + capMonth + '_' + year + '.pdf');

    // Re-enable button
    btn.disabled = false;
    btn.querySelector('span').textContent = 'PDF Rapport';
}

// --- Init (async — loads data from API first) ---
monthSelect.addEventListener('change', () => {
    updateCurrentPage();
});

loadData().then(() => {
    populateMonths();
    createCharts();
    createAttendanceChart();
    createFinanceCharts();
    updateDashboard(monthSelect.value);
}).catch(err => {
    console.error('Failed to load data:', err);
    document.querySelector('.main-content').innerHTML =
        '<div style="padding:40px;text-align:center;color:#dc2626;">Data laden mislukt. Probeer de pagina te herladen.</div>';
});

// =============================================
// === NIEUWSBRIEF ASSISTENT ===
// =============================================

const NB_PROXY = (typeof NOTION_CONFIG !== 'undefined') ? NOTION_CONFIG.PROXY_URL : 'http://localhost:3002';
const NB_PAGES = (typeof NOTION_CONFIG !== 'undefined') ? NOTION_CONFIG.PAGES : {};

// State
let nbCurrentWeekOffset = 0; // 0 = this week, -1 = last week, +1 = next week
let nbCache = { themes: null, coaches: null, balie: null };
let nbDataLoaded = false;

// Column headers for themes table
const NB_THEME_COLS = ['Week', 'Fundamentals main', 'Fundamentals revisit', 'Mixed levels main', 'Mixed levels standing', 'Kids main', 'Kids standing'];

// Get Monday of a given week offset from today
function nbGetWeekMonday(offset) {
    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1 - day); // Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff + (offset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function nbFormatDate(d) {
    return d.getDate() + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

function nbGetWeekTitle(offset) {
    const monday = nbGetWeekMonday(offset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekNum = nbGetISOWeek(monday);
    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    return `Week ${weekNum} — ${monday.getDate()} t/m ${sunday.getDate()} ${months[monday.getMonth()]} ${monday.getFullYear()}`;
}

function nbGetISOWeek(d) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Fetch blocks from Notion proxy
async function nbFetchBlocks(blockId) {
    const resp = await fetch(`${NB_PROXY}?path=blocks/${blockId}/children`);
    if (!resp.ok) throw new Error('Notion fetch failed: ' + resp.status);
    const data = await resp.json();
    return data.results || [];
}

// Parse table rows from Notion blocks
function nbParseTable(blocks) {
    return blocks.filter(b => b.type === 'table_row').map(b => {
        return b.table_row.cells.map(cell =>
            cell.map(t => t.plain_text).join('').trim()
        );
    });
}

// Fetch all Notion data
async function nbFetchAllData() {
    if (nbDataLoaded && nbCache.themes && nbCache.coaches && nbCache.balie) return;

    // Fetch all three pages in parallel
    const [themesBlocks, coachBlocks, balieBlocks] = await Promise.all([
        nbFetchBlocks(NB_PAGES.THEMES),
        nbFetchBlocks(NB_PAGES.COACHES),
        nbFetchBlocks(NB_PAGES.BALIE)
    ]);

    // Parse themes: collect table block IDs with labels, then fetch all table rows in parallel
    const tableEntries = [];
    let currentLabel = '';
    for (const block of themesBlocks) {
        if (block.type === 'paragraph') {
            const text = (block.paragraph.rich_text || []).map(t => t.plain_text).join('').trim();
            if (text) currentLabel = text;
        } else if (block.type === 'table' && block.has_children) {
            tableEntries.push({ label: currentLabel, id: block.id });
        }
    }
    const tableRows = await Promise.all(tableEntries.map(e => nbFetchBlocks(e.id)));
    nbCache.themes = tableEntries.map((e, i) => ({ label: e.label, rows: nbParseTable(tableRows[i]) }));

    // Coaches & balie pages
    nbCache.coachPages = coachBlocks.filter(b => b.type === 'child_page');
    nbCache.coaches = {};
    nbCache.baliePages = balieBlocks.filter(b => b.type === 'child_page');
    nbCache.balie = {};

    nbDataLoaded = true;
}

// Find the right month page for coaches/balie
const MONTH_MAP = { 0: 'Jan', 1: 'Feb', 2: 'March', 3: 'April', 4: 'May', 5: 'June', 6: 'July', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec' };
const MONTH_ALIASES = {
    'jan': 'jan', 'january': 'jan', 'januari': 'jan',
    'feb': 'feb', 'february': 'feb', 'februari': 'feb',
    'march': 'march', 'mar': 'march', 'maart': 'march',
    'april': 'april', 'apr': 'april',
    'may': 'may', 'mei': 'may',
    'june': 'june', 'jun': 'june', 'juni': 'june',
    'july': 'july', 'jul': 'july', 'juli': 'july',
    'aug': 'aug', 'august': 'aug', 'augustus': 'aug',
    'sep': 'sep', 'september': 'sep',
    'oct': 'oct', 'october': 'oct', 'oktober': 'oct',
    'nov': 'nov', 'november': 'nov',
    'dec': 'dec', 'december': 'dec'
};

async function nbFetchMonthSchedule(cache, pages, cacheKey, monthName) {
    const key = monthName.toLowerCase();
    if (cache[key]) return cache[key];

    // Find matching page
    const page = pages.find(p => {
        const title = p.child_page.title.toLowerCase();
        return title === key || MONTH_ALIASES[title] === MONTH_ALIASES[key];
    });
    if (!page) return null;

    // Fetch page content, then all table rows in parallel
    const blocks = await nbFetchBlocks(page.id);
    const tableBlocks = blocks.filter(b => b.type === 'table' && b.has_children);
    const allRows = await Promise.all(tableBlocks.map(b => nbFetchBlocks(b.id)));
    const tables = allRows.map(rows => nbParseTable(rows)).filter(t => t.length > 0 && t[0].length > 1);
    cache[key] = tables;
    return tables;
}

// Match a week's dates to a schedule table (coaches/balie)
function nbFindWeekInSchedule(tables, monday) {
    if (!tables) return null;
    const monDate = nbFormatDate(monday); // e.g. "16/03"
    const monDateAlt = monday.getDate().toString().padStart(2, '0') + '-' + String(monday.getMonth() + 1).padStart(2, '0'); // "16-03"
    const monDay = monday.getDate().toString(); // "16"

    for (const table of tables) {
        // Each table has weekly blocks separated by empty rows
        // The first row of each block has dates, e.g. ['', '16/03', '17/03', ...]
        for (let i = 0; i < table.length; i++) {
            const row = table[i];
            // Check if any cell matches the Monday date
            const dateMatch = row.some(cell => {
                const c = cell.trim();
                return c === monDate || c === monDateAlt ||
                       c === monDate.replace(/^0/, '') || c === monDateAlt.replace(/^0/, '') ||
                       (c.includes('/') && c.split('/')[0] === monDay && parseInt(c.split('/')[1]) === monday.getMonth() + 1) ||
                       (c.includes('-') && c.split('-')[0] === monDay && parseInt(c.split('-')[1]) === monday.getMonth() + 1);
            });

            if (dateMatch) {
                // Collect rows until empty row or end
                const weekRows = [];
                for (let j = i; j < table.length; j++) {
                    const r = table[j];
                    if (j > i && r.every(c => !c.trim())) break;
                    weekRows.push(r);
                }
                return weekRows;
            }
        }
    }
    return null;
}

// Find theme for the current week
function nbFindThemeForWeek(monday) {
    if (!nbCache.themes) return null;
    const weekNum = nbGetISOWeek(monday);
    const month = monday.getMonth(); // 0-indexed
    const year = monday.getFullYear();

    // Determine month name and approximate week within month
    const monthNames = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mName = monthNames[month].toLowerCase();

    // Calculate week of month (1-based)
    const firstOfMonth = new Date(year, month, 1);
    const firstMonday = new Date(firstOfMonth);
    const dayOfWeek = firstOfMonth.getDay();
    firstMonday.setDate(firstOfMonth.getDate() + (dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek));
    const weekOfMonth = Math.ceil((monday.getDate() - firstMonday.getDate() + firstMonday.getDate()) / 7);
    const actualWeekNum = Math.floor((monday.getDate() - 1) / 7) + 1;

    // Search through all theme tables
    for (const table of nbCache.themes) {
        for (const row of table.rows) {
            const label = row[0].toLowerCase().trim();
            // Match patterns like "march week 3", "feb week 1", "april week 2"
            const match = label.match(/(\w+)\s+week\s+(\d+)/);
            if (match) {
                const tMonth = match[1].toLowerCase();
                const tWeek = parseInt(match[2]);
                if ((tMonth === mName || tMonth === mName.substring(0, 3)) && tWeek === actualWeekNum) {
                    return { label: row[0], cols: row.slice(1) };
                }
            }
        }
    }
    return null;
}

// Render the Nieuwsbrief page
async function updateNieuwsbrief() {
    const title = document.getElementById('nbWeekTitle');
    const loading = document.getElementById('nbLoading');
    const themesCard = document.getElementById('nbThemesCard');
    const coachCard = document.getElementById('nbCoachCard');
    const balieCard = document.getElementById('nbBalieCard');
    const previewCard = document.getElementById('nbPreviewCard');

    title.textContent = nbGetWeekTitle(nbCurrentWeekOffset);

    // Show loading
    loading.style.display = 'flex';
    themesCard.style.display = 'none';
    coachCard.style.display = 'none';
    balieCard.style.display = 'none';
    previewCard.style.display = 'none';

    try {
        await nbFetchAllData();

        const monday = nbGetWeekMonday(nbCurrentWeekOffset);
        const monthNames = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const mName = monthNames[monday.getMonth()];

        // Themes
        const theme = nbFindThemeForWeek(monday);
        if (theme) {
            const grid = document.getElementById('nbThemesGrid');
            const labels = NB_THEME_COLS.slice(1); // Skip 'Week'
            grid.innerHTML = theme.cols.map((val, i) => `
                <div class="nb-theme-item">
                    <div class="nb-theme-label">${labels[i] || 'Slot ' + (i + 1)}</div>
                    <div class="nb-theme-value">${val || '—'}</div>
                </div>
            `).join('');
            document.getElementById('nbThemeWeekLabel').textContent = theme.label;
            themesCard.style.display = '';
        }

        // Coaches & Balie in parallel
        const [coachTables, balieTables] = await Promise.all([
            nbFetchMonthSchedule(nbCache.coaches, nbCache.coachPages || [], 'coaches', mName),
            nbFetchMonthSchedule(nbCache.balie, nbCache.baliePages || [], 'balie', mName)
        ]);
        const coachWeek = nbFindWeekInSchedule(coachTables, monday);
        if (coachWeek && coachWeek.length > 1) {
            nbRenderScheduleTable('nbCoachHead', 'nbCoachBody', coachWeek, monday);
            document.getElementById('nbCoachWeekLabel').textContent = nbFormatDate(monday) + ' t/m ' + nbFormatDate(new Date(monday.getTime() + 6 * 86400000));
            coachCard.style.display = '';
        }

        const balieWeek = nbFindWeekInSchedule(balieTables, monday);
        if (balieWeek && balieWeek.length > 1) {
            nbRenderScheduleTable('nbBalieHead', 'nbBalieBody', balieWeek, monday);
            document.getElementById('nbBalieWeekLabel').textContent = nbFormatDate(monday) + ' t/m ' + nbFormatDate(new Date(monday.getTime() + 6 * 86400000));
            balieCard.style.display = '';
        }

        // Generate newsletter preview
        nbGeneratePreview(theme, coachWeek, balieWeek, monday);
        previewCard.style.display = '';

    } catch (err) {
        console.error('Nieuwsbrief error:', err);
        loading.innerHTML = `<p style="color: var(--danger);">Fout bij ophalen data: ${err.message}</p>
            <p style="font-size: 13px; color: var(--text-secondary);">Zorg dat de Notion proxy draait: <code>python3 notion-proxy.py</code></p>`;
        return;
    }

    loading.style.display = 'none';
}

function nbRenderScheduleTable(headId, bodyId, rows, monday) {
    const thead = document.getElementById(headId);
    const tbody = document.getElementById(bodyId);

    // First row is dates, second is days
    const dateRow = rows[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build header (dates + days combined)
    let headerHtml = '<tr><th></th>';
    const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
    for (let i = 1; i < dateRow.length; i++) {
        if (!dateRow[i].trim()) continue;
        headerHtml += `<th>${dateRow[i]}</th>`;
    }
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;

    // Body rows (skip date row and day-name row)
    let bodyHtml = '';
    for (let r = 2; r < rows.length; r++) {
        const row = rows[r];
        if (row.every(c => !c.trim())) continue;
        bodyHtml += '<tr>';
        for (let c = 0; c < row.length; c++) {
            if (c >= dateRow.length) continue;
            if (c > 0 && !dateRow[c].trim()) continue;
            if (c === 0) {
                bodyHtml += `<td>${row[c]}</td>`;
            } else {
                bodyHtml += `<td>${row[c] || '—'}</td>`;
            }
        }
        bodyHtml += '</tr>';
    }
    tbody.innerHTML = bodyHtml;
}

// Build an HTML table from schedule week data
function nbBuildScheduleHtml(weekData) {
    if (!weekData || weekData.length < 3) return '';
    const dateRow = weekData[0];
    const dayRow = weekData[1];
    const ts = 'style="border-collapse:collapse;width:100%;font-family:Inter,sans-serif;font-size:13px;"';
    const ths = 'style="padding:8px 10px;background:#f1f5f9;border:1px solid #e2e8f0;font-weight:600;text-align:center;font-size:12px;"';
    const tds = 'style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;"';
    const td1s = 'style="padding:8px 10px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc;"';

    let t = `<table ${ts}><thead><tr><th ${ths}></th>`;
    for (let c = 1; c < dateRow.length; c++) {
        if (!dateRow[c].trim()) continue;
        const day = dayRow[c] || '';
        t += `<th ${ths}>${day}<br>${dateRow[c]}</th>`;
    }
    t += '</tr></thead><tbody>';
    for (let r = 2; r < weekData.length; r++) {
        const row = weekData[r];
        if (row.every(c => !c.trim())) continue;
        t += `<tr><td ${td1s}>${row[0]}</td>`;
        for (let c = 1; c < dateRow.length; c++) {
            if (!dateRow[c].trim()) continue;
            t += `<td ${tds}>${row[c] || '—'}</td>`;
        }
        t += '</tr>';
    }
    t += '</tbody></table>';
    return t;
}

function nbGeneratePreview(theme, coachWeek, balieWeek, monday) {
    const preview = document.getElementById('nbPreview');
    const sun = new Date(monday);
    sun.setDate(monday.getDate() + 6);
    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

    let html = `<h3>Haven BJJ — Weekupdate</h3>`;
    html += `<p>Week ${nbGetISOWeek(monday)} | ${monday.getDate()} t/m ${sun.getDate()} ${months[monday.getMonth()]} ${monday.getFullYear()}</p>`;

    html += `<hr class="nb-section-divider">`;
    html += `<h3>Desk Announcement</h3>`;
    html += `<p style="color:#64748b;font-style:italic;">Important for the desk</p>`;

    html += `<hr class="nb-section-divider">`;
    html += `<h3>Coaches Announcement</h3>`;
    html += `<p style="color:#64748b;font-style:italic;">Important for the coaches</p>`;

    if (theme) {
        html += `<hr class="nb-section-divider">`;
        html += `<h3>Thema's van de Week</h3>`;
        const labels = NB_THEME_COLS.slice(1);
        html += '<table style="border-collapse:collapse;font-family:Inter,sans-serif;font-size:13px;">';
        theme.cols.forEach((val, i) => {
            if (val) html += `<tr><td style="padding:4px 12px 4px 0;font-weight:600;color:#64748b;">${labels[i] || 'Slot ' + (i+1)}</td><td style="padding:4px 0;">${val}</td></tr>`;
        });
        html += '</table>';
    }

    if (coachWeek && coachWeek.length > 2) {
        html += `<hr class="nb-section-divider">`;
        html += `<h3>Coach Rooster</h3>`;
        html += nbBuildScheduleHtml(coachWeek);
    }

    if (balieWeek && balieWeek.length > 2) {
        html += `<hr class="nb-section-divider">`;
        html += `<h3>Balie Rooster</h3>`;
        html += nbBuildScheduleHtml(balieWeek);
    }

    // Class structure templates
    if (theme) {
        const mixedMain = theme.cols[2] || '—';
        const mixedStanding = theme.cols[3] || '—';
        const kidsMain = theme.cols[4] || '—';
        const kidsStanding = theme.cols[5] || '—';

        html += `<hr class="nb-section-divider">`;
        html += `<h3>Example of a Mixed Class</h3>`;
        html += `<p>${mixedStanding} 1: Show how to defend and counter the front headlock position<br>`;
        html += `${mixedMain} 1:<br>`;
        html += `${mixedMain} 2:<br>`;
        html += `${mixedMain} 3:</p>`;
        html += `<p>Rest of the class: Free sparring, start seated vs standing OR standing vs standing for advanced students if there is enough space.</p>`;

        html += `<hr class="nb-section-divider">`;
        html += `<h3>Example Kids Class</h3>`;
        html += `<p><strong>Warm-up</strong><br>`;
        html += `- Movement drills in lines (rolls, animal movements)<br>`;
        html += `- Shadow wrestling<br>`;
        html += `- Getting on top drills</p>`;
        html += `<p><strong>Technique</strong><br>`;
        html += `- ${kidsStanding} game:<br>`;
        html += `- ${kidsMain} technique<br>`;
        html += `- ${kidsMain} game</p>`;
        html += `<p>Free sparring<br>Stretching</p>`;
    }

    html += `<hr class="nb-section-divider">`;
    html += `<h3>Birthdays</h3>`;
    html += `<p>Every member that comes to train on their birthday gets a free drink of their choice. Coffee, protein shake, pre-workout shot, isotonic, Beer with Benefits, whatever they want. Also, make sure to congratulate them when you see them</p>`;

    preview.innerHTML = html;
}

// Week nav buttons
document.getElementById('nbPrevWeek')?.addEventListener('click', () => {
    nbCurrentWeekOffset--;
    updateNieuwsbrief();
});
document.getElementById('nbNextWeek')?.addEventListener('click', () => {
    nbCurrentWeekOffset++;
    updateNieuwsbrief();
});

// Copy button
document.getElementById('nbCopyBtn')?.addEventListener('click', () => {
    const preview = document.getElementById('nbPreview');
    const html = preview.innerHTML;
    const text = preview.innerText;
    const blob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([text], { type: 'text/plain' });
    navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob })
    ]).then(() => {
        const btn = document.getElementById('nbCopyBtn');
        btn.querySelector('span').textContent = 'Gekopieerd!';
        setTimeout(() => btn.querySelector('span').textContent = 'Kopieer', 2000);
    });
});

// ===================== UPLOADS =====================
const uploadState = {};

function updateUploads(ym) {
    renderUploadPreview(ym);
}

// Generic CSV parser: text → array of objects (header row = keys)
function csvToRows(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    // Handle both comma and semicolon delimiters
    const delim = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).filter(l => l.trim()).map(line => {
        const vals = line.split(delim).map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => obj[h] = vals[i] || '');
        return obj;
    });
}

// Parse a number from Dutch format: "1.234,56" or "1234.56"
function parseDutchNum(s) {
    if (!s) return 0;
    s = s.toString().trim().replace(/[€\s]/g, '');
    // If contains both . and , → Dutch format (1.234,56)
    if (s.includes('.') && s.includes(',')) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',') && !s.includes('.')) {
        s = s.replace(',', '.');
    }
    return parseFloat(s) || 0;
}

// Setup file upload handlers
const UPLOAD_CONFIGS = [
    { id: 'Mailchimp', dropId: 'dropMailchimp', statusId: 'statusMailchimp', key: 'mailchimp' },
    { id: 'Jortt', dropId: 'dropJortt', statusId: 'statusJortt', key: 'jortt' },
    { id: 'GribLeden', dropId: 'dropGribLeden', statusId: 'statusGribLeden', key: 'gribLeden' },
    { id: 'GribNieuw', dropId: 'dropGribNieuw', statusId: 'statusGribNieuw', key: 'gribNieuw' },
    { id: 'GribVerloren', dropId: 'dropGribVerloren', statusId: 'statusGribVerloren', key: 'gribVerloren' },
    { id: 'GribProeflessen', dropId: 'dropGribProeflessen', statusId: 'statusGribProeflessen', key: 'gribProeflessen' },
];

UPLOAD_CONFIGS.forEach(cfg => {
    const dropzone = document.getElementById(cfg.dropId);
    if (!dropzone) return;
    const fileInput = dropzone.querySelector('input[type="file"]');
    const filenameEl = dropzone.querySelector('.upload-filename');
    const statusEl = document.getElementById(cfg.statusId);

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        filenameEl.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        dropzone.classList.add('has-file');
        dropzone.classList.remove('has-error');

        const ext = file.name.split('.').pop().toLowerCase();

        try {
            if (ext === 'zip') {
                // ZIP file (Mailchimp export) — extract CSV inside
                const buf = await file.arrayBuffer();
                const zip = await JSZip.loadAsync(buf);
                const csvName = Object.keys(zip.files).find(f => f.endsWith('.csv'));
                if (!csvName) throw new Error('Geen CSV gevonden in ZIP');
                const text = await zip.files[csvName].async('string');
                uploadState[cfg.key] = { text, filename: file.name, type: 'csv' };
            } else if (ext === 'xlsx' || ext === 'xls') {
                // Excel file (Grib exports) — parse with SheetJS
                const buf = await file.arrayBuffer();
                const wb = XLSX.read(buf, { type: 'array' });
                // Read ALL sheets and combine rows
                let rows = [];
                wb.SheetNames.forEach(name => {
                    const sheet = wb.Sheets[name];
                    const sheetRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                    rows = rows.concat(sheetRows);
                });
                uploadState[cfg.key] = { rows, filename: file.name, type: 'xlsx' };
            } else {
                // CSV file — read as text
                const text = await file.text();
                uploadState[cfg.key] = { text, filename: file.name, type: 'csv' };
            }
            statusEl.textContent = '✓';
            statusEl.style.color = 'var(--green)';
            renderUploadPreview(monthSelect.value);
        } catch (err) {
            console.error('Upload parse error:', err);
            statusEl.textContent = '✗';
            statusEl.style.color = 'var(--red)';
            dropzone.classList.add('has-error');
            dropzone.classList.remove('has-file');
        }
    });

    // Drag & drop
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--accent)'; });
    dropzone.addEventListener('dragleave', () => { if (!dropzone.classList.contains('has-file')) dropzone.style.borderColor = ''; });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        }
    });
});

// Manual input listeners
['inputZettle', 'inputSessions', 'inputParticipants'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => renderUploadPreview(monthSelect.value));
});

// Build the data.js entry from all available data
function renderUploadPreview(ym) {
    const output = document.getElementById('uploadOutput');
    if (!output) return;

    const [y, m] = ym.split('-');
    const label = MONTH_NAMES[m] + ' ' + y;
    const prevData = DASHBOARD_DATA[prevYm(ym)];

    // Gather raw parsed data
    let mailchimp = null;
    if (uploadState.mailchimp) {
        mailchimp = parseMailchimpCSV(uploadState.mailchimp.text, ym);
    }

    let jortt = null;
    if (uploadState.jortt) {
        jortt = parseJorttCSV(uploadState.jortt.text);
    }

    let gribLeden = null;
    if (uploadState.gribLeden) {
        const data = uploadState.gribLeden.type === 'xlsx' ? uploadState.gribLeden.rows : csvToRows(uploadState.gribLeden.text);
        gribLeden = parseGribLeden(data);
    }

    let gribNieuw = null;
    if (uploadState.gribNieuw) {
        const rows = uploadState.gribNieuw.type === 'xlsx' ? uploadState.gribNieuw.rows : csvToRows(uploadState.gribNieuw.text);
        // Filter on startDate matching selected month (YYYY-MM)
        const filtered = rows.filter(row => {
            const d = (row['startDate'] || row['startdate'] || row['StartDate'] || '').toString();
            return d.startsWith(ym);
        });
        gribNieuw = { new_members: filtered.length, new_members_excel: filtered.length };
    }

    let gribVerloren = null;
    if (uploadState.gribVerloren) {
        const rows = uploadState.gribVerloren.type === 'xlsx' ? uploadState.gribVerloren.rows : csvToRows(uploadState.gribVerloren.text);
        // Filter on endDate matching selected month (YYYY-MM)
        const filtered = rows.filter(row => {
            const d = (row['endDate'] || row['enddate'] || row['EndDate'] || '').toString();
            return d.startsWith(ym);
        });
        gribVerloren = { lost: filtered.length, lost_members: filtered.length };
    }

    let gribProeflessen = null;
    if (uploadState.gribProeflessen) {
        const rows = uploadState.gribProeflessen.type === 'xlsx' ? uploadState.gribProeflessen.rows : csvToRows(uploadState.gribProeflessen.text);
        // Proeflessen file is already exported per month, count all rows
        gribProeflessen = { trials: rows.length };
    }

    const zettle = parseFloat(document.getElementById('inputZettle')?.value) || null;
    const sessions = parseInt(document.getElementById('inputSessions')?.value) || null;
    const participants = parseInt(document.getElementById('inputParticipants')?.value) || null;

    // Build the entry
    const totalMembers = gribLeden?.total_members || null;
    const trials = gribProeflessen?.trials || null;
    const trialsU18 = null;
    const lost = gribVerloren?.lost || null;
    const newMembers = gribNieuw?.new_members || null;
    const newMembersExcel = gribNieuw?.new_members_excel || null;
    const totalIncome = jortt?.revenue || null;

    // Calculated fields
    const trialToMember = (trials && newMembers) ? newMembers / trials : null;
    const incomePerMember = (totalIncome && totalMembers) ? totalIncome / totalMembers : null;
    const prevMembers = prevData?.total_members;
    const attrition = (lost && prevMembers) ? lost / prevMembers : null;
    const participantsPerSession = (participants && sessions) ? participants / sessions : null;
    const sessionsPerMember = (sessions && totalMembers) ? sessions / totalMembers : null;
    const sessionIncomePerMember = (incomePerMember && sessionsPerMember) ? incomePerMember / sessionsPerMember : null;
    const incomePerSession = (totalIncome && sessions) ? totalIncome / sessions : null;

    let grossProfitPerSession = null;
    if (jortt && sessions) {
        grossProfitPerSession = (jortt.revenue - jortt.costs) / jortt.revenue;
    }

    const entry = {
        label,
        ym,
        total_members: totalMembers,
        trials,
        trials_u18: trialsU18,
        lost,
        new_members_excel: newMembersExcel,
        trial_to_member: trialToMember,
        total_income: totalIncome,
        income_per_member: incomePerMember,
        attrition,
        zettle,
        sessions,
        participants,
        participants_per_session: participantsPerSession,
        sessions_per_member: sessionsPerMember,
        session_income_per_member: sessionIncomePerMember,
        income_per_session: incomePerSession,
        gross_profit_per_session: grossProfitPerSession,
    };

    if (gribLeden?.categories) {
        entry.categories = gribLeden.categories;
        entry.total_real = gribLeden.total_real;
        entry.total_6cat = gribLeden.total_6cat;
        entry.overig = gribLeden.overig;
    }

    if (gribNieuw) entry.new_members = gribNieuw.new_members;
    if (gribVerloren) entry.lost_members = gribVerloren.lost_members;

    if (jortt) {
        entry.jortt = {
            revenue: jortt.revenue,
            costs: jortt.costs,
            profit: jortt.profit,
            payroll: jortt.payroll,
            cost_categories: jortt.cost_categories,
            revenue_categories: jortt.revenue_categories
        };
    }

    // Store for submit button
    window._lastUploadEntry = { ym, entry };

    // Format as JSON
    const json = JSON.stringify({ [ym]: entry }, null, 2);
    // Make it look like a data.js snippet
    output.textContent = '  ' + json.slice(2, -2).trim();
}

// Mailchimp parser — counts trials by OPTIN_TIME matching selected month
function parseMailchimpCSV(text, ym) {
    const rows = csvToRows(text);
    let trials = 0;

    rows.forEach(row => {
        // Use OPTIN_TIME or CONFIRM_TIME to match the selected month
        const optinTime = row['OPTIN_TIME'] || row['CONFIRM_TIME'] || '';
        if (optinTime.startsWith(ym)) {
            trials++;
        }
    });

    return { trials, trials_u18: null, total_subscribers: rows.length };
}

// Jortt W&V parser — handles hierarchical P&L format
// CSV structure: label in col 0, amount depth shown by empty columns
// Level 0: "Label,amount" (top-level sections)
// Level 1: "Label,,amount" (sub-categories)
// Level 2: "Label,,,amount" (detail items)
function parseJorttCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const delim = lines[0].includes(';') ? ';' : ',';

    let revenue = 0, costs = 0, depreciation = 0, financialCosts = 0, payroll = 0;
    const costCats = {};
    const revCats = {};
    let section = null;

    for (const line of lines) {
        const cells = line.split(delim).map(c => c.trim().replace(/^"|"$/g, ''));

        // Find label (first non-empty cell, always in col 0 for this format)
        const label = cells[0]?.trim() || '';
        if (!label) continue;

        // Find amount and its column depth
        let amount = 0, amountCol = -1;
        for (let i = 1; i < cells.length; i++) {
            if (cells[i] && cells[i] !== '') {
                const num = parseDutchNum(cells[i]);
                if (num !== 0) { amount = num; amountCol = i; break; }
            }
        }

        const ll = label.toLowerCase();

        // Top-level sections: amount in column 1 (directly after label)
        if (amountCol === 1) {
            if (ll === 'opbrengsten') { section = 'revenue'; revenue = amount; continue; }
            if (ll === 'kosten') { section = 'costs'; costs = amount; continue; }
            if (ll === 'afschrijvingen') { section = 'depreciation'; depreciation = amount; continue; }
            if (ll.startsWith('financi')) { section = 'financial'; financialCosts = amount; continue; }
        }

        // Sub-categories: amount in column 2 (one level deep)
        if (amountCol === 2 && amount > 0) {
            if (section === 'revenue') revCats[label] = amount;
            if (section === 'costs') {
                costCats[label] = amount;
                if (ll.includes('personeel') || ll.includes('loon') || ll.includes('salaris')) payroll += amount;
            }
            if (section === 'depreciation') costCats[label] = amount;
            if (section === 'financial') costCats[label] = amount;
        }

        // Detail items: amount in column 3 (two levels deep)
        if (amountCol === 3 && amount > 0) {
            if (section === 'revenue') revCats[label] = amount;
        }
    }

    const totalCosts = costs + depreciation + financialCosts;

    return {
        revenue: Math.round(revenue * 100) / 100,
        costs: Math.round(totalCosts * 100) / 100,
        profit: Math.round((revenue - totalCosts) * 100) / 100,
        payroll: Math.round(payroll * 100) / 100,
        cost_categories: costCats,
        revenue_categories: revCats
    };
}

// Grib leden parser — handles both XLSX rows and CSV text
// Column: naam_abonnement with English membership names
function parseGribLeden(data) {
    const rows = Array.isArray(data) ? data : csvToRows(data);
    const catMap = { 'Yearly': 0, 'Monthly': 0, 'Yearly Student': 0, 'Monthly Student': 0, 'Yearly U18': 0, 'Monthly U18': 0 };

    rows.forEach(row => {
        const sub = (row['naam_abonnement'] || row['Abonnement'] || row['Subscription'] || row['Type'] || '').toString().toLowerCase();
        if (!sub) return; // Skip rows without subscription (e.g. strippenkaart only)

        const isMonthly = sub.includes('monthly') || sub.includes('maand');
        const isU18 = sub.includes('under 18') || sub.includes('u18');
        const isStudent = sub.includes('student');

        // Priority: U18 > Student > Regular. "Founding Member Student / Under 18" → U18
        if (isU18) {
            catMap[isMonthly ? 'Monthly U18' : 'Yearly U18']++;
        } else if (isStudent) {
            catMap[isMonthly ? 'Monthly Student' : 'Yearly Student']++;
        } else if (isMonthly) {
            catMap['Monthly']++;
        } else if (sub.includes('yearly') || sub.includes('jaar') || sub.includes('membership')) {
            catMap['Yearly']++;
        }
        // Sponsored, Single Class, etc. → not counted in 6 categories → goes to Overig
    });

    const total6cat = Object.values(catMap).reduce((a, b) => a + b, 0);
    const overig = rows.length - total6cat;

    return {
        total_members: rows.length,
        categories: { ...catMap, 'Overig': overig },
        total_real: rows.length,
        total_6cat: total6cat,
        overig
    };
}

// Copy button for upload output
document.getElementById('uploadCopyBtn')?.addEventListener('click', () => {
    const output = document.getElementById('uploadOutput');
    const text = output.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('uploadCopyBtn');
        btn.querySelector('span').textContent = 'Gekopieerd!';
        setTimeout(() => btn.querySelector('span').textContent = 'Kopieer', 2000);
    });
});

// Verzend button — POST data to server and update data.js
document.getElementById('uploadSubmitBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('uploadSubmitBtn');
    const spanEl = btn.querySelector('span');

    if (!window._lastUploadEntry || !window._lastUploadEntry.ym) {
        spanEl.textContent = 'Geen data!';
        setTimeout(() => spanEl.textContent = 'Verzend', 2000);
        return;
    }

    const { ym, entry } = window._lastUploadEntry;

    // Strip null values — server merges, so we only send what we have
    const cleanEntry = {};
    for (const [k, v] of Object.entries(entry)) {
        if (v !== null && v !== undefined) cleanEntry[k] = v;
    }

    // Check if there's any real data to send
    const dataKeys = Object.keys(cleanEntry).filter(k => !['label', 'ym'].includes(k));
    if (dataKeys.length === 0) {
        spanEl.textContent = 'Geen data!';
        setTimeout(() => spanEl.textContent = 'Verzend', 2000);
        return;
    }

    // Confirm before sending
    if (!confirm(`Data voor ${entry.label} verzenden naar dashboard?\n\nVelden: ${dataKeys.join(', ')}`)) return;

    spanEl.textContent = 'Verzenden...';
    btn.disabled = true;

    try {
        const resp = await fetch('api/data.php?type=dashboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ ym, entry: cleanEntry })
        });

        const result = await resp.json();

        if (resp.ok && result.ok) {
            spanEl.textContent = 'Verzonden! ✓';
            btn.style.background = 'var(--green)';

            // Reload page after short delay to pick up new data.js
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            throw new Error(result.error || 'Server error');
        }
    } catch (err) {
        console.error('Submit error:', err);
        spanEl.textContent = 'Fout!';
        btn.style.background = 'var(--red)';
        alert('Verzenden mislukt: ' + err.message);
        setTimeout(() => {
            spanEl.textContent = 'Verzend';
            btn.style.background = 'var(--accent)';
            btn.disabled = false;
        }, 2000);
    }
});

// ═══════════════════════════════════════════════════════
// ACCOUNT & SETTINGS
// ═══════════════════════════════════════════════════════

// --- Avatar Upload ---
const avatarInput = document.getElementById('avatarInput');
if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('Bestand is te groot (max 5MB)');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const resp = await fetch('api/account.php?action=avatar', {
                method: 'POST',
                headers: { 'X-CSRF-Token': csrfToken },
                body: formData
            });

            const result = await resp.json();
            if (resp.ok && result.ok) {
                // Update avatar in account page
                const accountAvatar = document.getElementById('accountAvatar');
                const wrapper = accountAvatar.parentElement;
                const img = document.createElement('img');
                img.src = result.avatarUrl;
                img.alt = 'Profielfoto';
                img.className = 'account-avatar';
                img.id = 'accountAvatar';
                accountAvatar.replaceWith(img);

                // Update sidebar avatar
                const sidebarAvatar = document.getElementById('sidebarAvatar');
                if (sidebarAvatar) {
                    const sImg = document.createElement('img');
                    sImg.src = result.avatarUrl;
                    sImg.alt = '';
                    sImg.className = 'sidebar-avatar';
                    sImg.id = 'sidebarAvatar';
                    sidebarAvatar.replaceWith(sImg);
                }
            } else {
                alert(result.error || 'Upload mislukt');
            }
        } catch (err) {
            console.error('Avatar upload error:', err);
            alert('Upload mislukt: ' + err.message);
        }
    });
}

// --- Password Change ---
const savePasswordBtn = document.getElementById('savePasswordBtn');
if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', async () => {
        const currentPw = document.getElementById('currentPassword').value;
        const newPw = document.getElementById('newPassword').value;
        const confirmPw = document.getElementById('confirmPassword').value;
        const msgEl = document.getElementById('passwordMessage');

        msgEl.textContent = '';
        msgEl.className = 'account-message';

        if (!currentPw || !newPw || !confirmPw) {
            msgEl.textContent = 'Vul alle velden in';
            msgEl.classList.add('error');
            return;
        }

        if (newPw !== confirmPw) {
            msgEl.textContent = 'Nieuwe wachtwoorden komen niet overeen';
            msgEl.classList.add('error');
            return;
        }

        if (newPw.length < 6) {
            msgEl.textContent = 'Nieuw wachtwoord moet minimaal 6 tekens zijn';
            msgEl.classList.add('error');
            return;
        }

        savePasswordBtn.disabled = true;
        savePasswordBtn.textContent = 'Opslaan...';

        try {
            const resp = await fetch('api/account.php?action=password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({ current: currentPw, new: newPw })
            });

            const result = await resp.json();
            if (resp.ok && result.ok) {
                msgEl.textContent = 'Wachtwoord gewijzigd!';
                msgEl.classList.add('success');
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } else {
                msgEl.textContent = result.error || 'Fout bij opslaan';
                msgEl.classList.add('error');
            }
        } catch (err) {
            msgEl.textContent = 'Fout: ' + err.message;
            msgEl.classList.add('error');
        }

        savePasswordBtn.disabled = false;
        savePasswordBtn.textContent = 'Wachtwoord opslaan';
    });
}

// --- Theme Toggle ---
document.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', async () => {
        const theme = btn.dataset.themeValue;
        if (!theme) return;

        // Update UI immediately
        document.documentElement.dataset.theme = theme;
        document.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Save to server
        try {
            await fetch('api/account.php?action=theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({ theme })
            });
        } catch (err) {
            console.error('Theme save error:', err);
        }
    });
});
