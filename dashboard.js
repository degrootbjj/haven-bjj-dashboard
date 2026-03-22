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
const PAGE_TITLES = { dashboard: 'Dashboard', leden: 'Leden', financien: 'Financiën', marketing: 'Marketing', coachdashboard: 'Mijn Lessen', nieuwsbrief: 'Crew Briefing', mailnewsletter: 'Newsletter', uploads: 'Uploads', simulator: 'Prijssimulator', rooster: 'Rooster', gyminfo: 'Gym Info', account: 'Account' };

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (!document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1))) return;
        // Check page access (account page always allowed)
        if (typeof USER_CONFIG !== 'undefined' && page !== 'account' && !USER_CONFIG.pages.includes(page)) return;
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1));
        if (pageEl) pageEl.classList.add('active');
        document.querySelector('.page-title').textContent = PAGE_TITLES[page] || page;
        currentPage = page;
        document.getElementById('btnPdfRapport').style.display = (page === 'dashboard') ? 'inline-flex' : 'none';
        // Hide month selector on pages that don't use it
        const hideMonthPages = ['mailnewsletter', 'rooster', 'gyminfo', 'account', 'nieuwsbrief', 'coachdashboard'];
        document.getElementById('monthSelect').style.display = hideMonthPages.includes(page) ? 'none' : '';
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
    else if (currentPage === 'coachdashboard') updateCoachDashboard();
    else if (currentPage === 'rooster') { /* rooster has its own flow */ }
    else if (currentPage === 'gyminfo') loadGymInfo();
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

    // KPI: Trials (adults + u18)
    const trials = (d.trials != null || d.trials_u18 != null) ? (d.trials || 0) + (d.trials_u18 || 0) : null;
    document.getElementById('kpiTrials').textContent = trials != null ? fmt(trials) : '—';
    const prevTrials = (pd && (pd.trials != null || pd.trials_u18 != null)) ? (pd.trials || 0) + (pd.trials_u18 || 0) : null;
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
    const trialCount = d ? (d.trials || 0) + (d.trials_u18 || 0) : 0;

    // Trial → Lid % from DASHBOARD_DATA
    const trialConv = d && d.trial_to_member != null ? d.trial_to_member : null;

    // Previous month for change
    const prevYm = getPrevYm(ym);
    const prevMc = MAILCHIMP_DATA[prevYm] || {};
    const prevD = DASHBOARD_DATA[prevYm];
    const prevLeads = (prevMc.signups || 0) - (prevMc.member || 0);
    const prevTrials = prevD ? (prevD.trials || 0) + (prevD.trials_u18 || 0) : 0;

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
    const splitEl = document.getElementById('mkKpiTrialsSplit');
    if (splitEl && d) {
        const adults = d.trials || 0;
        const u18 = d.trials_u18 || 0;
        splitEl.textContent = (adults || u18) ? `Adults: ${adults} · U18: ${u18}` : '';
    }
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
    const trialData = months12.map(m => { const dd = DASHBOARD_DATA[m] || {}; return (dd.trials || 0) + (dd.trials_u18 || 0); });

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
    const avg12Trial = months12.reduce((s, m) => { const dd = DASHBOARD_DATA[m] || {}; return s + (dd.trials || 0) + (dd.trials_u18 || 0); }, 0) / months12.length;
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
    const trials = (d.trials != null || d.trials_u18 != null) ? (d.trials || 0) + (d.trials_u18 || 0) : null;
    const prevTrials = (pd && (pd.trials != null || pd.trials_u18 != null)) ? (pd.trials || 0) + (pd.trials_u18 || 0) : null;
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
        const mTrials = (md.trials != null || md.trials_u18 != null) ? (md.trials || 0) + (md.trials_u18 || 0) : null;
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

    let html = `<h3>Coach & Desk Briefing</h3>`;
    html += `<p>Week ${nbGetISOWeek(monday)} | ${monday.getDate()} t/m ${sun.getDate()} ${months[monday.getMonth()]} ${monday.getFullYear()}</p>`;

    html += `<hr class="nb-section-divider">`;
    html += `<h3>Desk Announcement</h3>`;
    html += `<p style="color:#000;">Important for the desk</p>`;

    html += `<hr class="nb-section-divider">`;
    html += `<h3>Coaches Announcement</h3>`;
    html += `<p style="color:#000;">Important for the coaches</p>`;

    if (theme) {
        html += `<hr class="nb-section-divider">`;
        html += `<h3>Thema's van de Week</h3>`;
        const labels = NB_THEME_COLS.slice(1);
        theme.cols.forEach((val, i) => {
            if (val) html += `<p style="margin:2px 0;"><strong>${labels[i] || 'Slot ' + (i+1)}:</strong> ${val}</p>`;
        });
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
        html += `<p>${mixedStanding} 1:<br>`;
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

    // Helper: convert Excel date (serial number, Date object, or string) to "YYYY-MM" string
    function toYM(val) {
        if (!val && val !== 0) return '';
        if (val instanceof Date) return val.toISOString().slice(0, 7);
        if (typeof val === 'number') {
            // Excel serial date → JS Date
            const d = new Date((val - 25569) * 86400000);
            return d.toISOString().slice(0, 7);
        }
        return val.toString().slice(0, 7);
    }

    // Subscription classification — only real paying memberships
    const REAL_MEMBERSHIP_TYPES = [
        'monthly membership', 'yearly membership', 'yearly membership student',
        'yearly membership under 18', 'monthly membership student', 'monthly membership under 18',
        'yearly membership founding member', 'yearly membership founding member student / under 18'
    ];
    const TRIAL_ADULT_TYPES = ['free trial', 'free trial advanced', 'free trial women'];
    const TRIAL_U18_TYPES = ['trial week kids'];

    function getSubType(row) {
        return (row['subscription'] || row['Subscription'] || '').toString().toLowerCase().trim();
    }

    let gribNieuw = null;
    let gribTrialsAdults = null;
    let gribTrialsU18 = null;
    if (uploadState.gribNieuw) {
        const rows = uploadState.gribNieuw.type === 'xlsx' ? uploadState.gribNieuw.rows : csvToRows(uploadState.gribNieuw.text);
        // Filter by month first
        const monthRows = rows.filter(row => {
            const d = row['startDate'] ?? row['startdate'] ?? row['StartDate'] ?? '';
            return toYM(d) === ym;
        });
        // Split into categories
        const realMembers = monthRows.filter(r => REAL_MEMBERSHIP_TYPES.includes(getSubType(r)));
        const trialsAdult = monthRows.filter(r => TRIAL_ADULT_TYPES.includes(getSubType(r)));
        const trialsU18 = monthRows.filter(r => TRIAL_U18_TYPES.includes(getSubType(r)));

        gribNieuw = { new_members: realMembers.length, new_members_excel: realMembers.length };
        gribTrialsAdults = trialsAdult.length;
        gribTrialsU18 = trialsU18.length;

        // DEBUG
        const debugNieuw = {};
        monthRows.forEach(r => { const s = r['subscription'] || '?'; debugNieuw[s] = (debugNieuw[s] || 0) + 1; });
        window._debugGribNieuw = { month: ym, realMembers: realMembers.length, trialsAdults: trialsAdult.length, trialsU18: trialsU18.length, allTypes: debugNieuw };
    }

    let gribVerloren = null;
    if (uploadState.gribVerloren) {
        const rows = uploadState.gribVerloren.type === 'xlsx' ? uploadState.gribVerloren.rows : csvToRows(uploadState.gribVerloren.text);
        // Filter on endDate matching selected month AND real memberships only
        const monthRows = rows.filter(row => {
            const d = row['endDate'] ?? row['enddate'] ?? row['EndDate'] ?? '';
            return toYM(d) === ym;
        });
        const realLost = monthRows.filter(r => REAL_MEMBERSHIP_TYPES.includes(getSubType(r)));

        // DEBUG
        const debugVerl = {};
        monthRows.forEach(r => { const s = r['subscription'] || '?'; debugVerl[s] = (debugVerl[s] || 0) + 1; });
        window._debugGribVerloren = { month: ym, realLost: realLost.length, allTypes: debugVerl };
        gribVerloren = { lost: realLost.length, lost_members: realLost.length };
    }

    function readInt(id) { const v = document.getElementById(id)?.value; return v !== '' && v != null ? parseInt(v, 10) : null; }
    function readFloat(id) { const v = document.getElementById(id)?.value; return v !== '' && v != null ? parseFloat(v) : null; }

    const zettle = readFloat('inputZettle');
    const sessions = readInt('inputSessions');
    const participants = readInt('inputParticipants');

    // Build the entry
    const totalMembers = gribLeden?.total_members || null;
    const trials = gribTrialsAdults || null;
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
        trials_u18: gribTrialsU18 || null,
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
    let debugInfo = '';
    if (window._debugGribNieuw) debugInfo += '\n\n--- DEBUG Grib Nieuw types ---\n' + JSON.stringify(window._debugGribNieuw, null, 2);
    if (window._debugGribVerloren) debugInfo += '\n\n--- DEBUG Grib Verloren types ---\n' + JSON.stringify(window._debugGribVerloren, null, 2);
    output.textContent = '  ' + json.slice(2, -2).trim() + debugInfo;
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
// GYM INFO
// ═══════════════════════════════════════════════════════

const GYM_INFO = {
    kvk: '70098840',
    btw: 'NL002308595B21',
    bank: 'NL72KNAB0404019129',
    telefoon: '0681653564',
    colorLight: '#A3D9FF',
    colorDark: '#141F5C',
    fontMain: 'Avenir Next Condensed Bold (always all caps)',
    fontSecondary: 'Roboto'
};

function loadGymInfo() {
    document.getElementById('infoKvk').textContent = GYM_INFO.kvk || '—';
    document.getElementById('infoBtw').textContent = GYM_INFO.btw || '—';
    document.getElementById('infoBank').textContent = GYM_INFO.bank || '—';
    document.getElementById('infoTelefoon').textContent = GYM_INFO.telefoon || '—';
    document.getElementById('infoColorLight').textContent = GYM_INFO.colorLight || '—';
    document.getElementById('infoColorDark').textContent = GYM_INFO.colorDark || '—';
    document.getElementById('infoFontMain').textContent = GYM_INFO.fontMain || '—';
    document.getElementById('infoFontSecondary').textContent = GYM_INFO.fontSecondary || '—';

    const swatchLight = document.getElementById('swatchLight');
    const swatchDark = document.getElementById('swatchDark');
    if (GYM_INFO.colorLight) swatchLight.style.backgroundColor = GYM_INFO.colorLight;
    if (GYM_INFO.colorDark) swatchDark.style.backgroundColor = GYM_INFO.colorDark;
}

// Supplier accordion
document.querySelectorAll('.supplier-header').forEach(header => {
    header.addEventListener('click', () => {
        const item = header.closest('.supplier-item');
        const wasOpen = item.classList.contains('open');
        // Close all
        document.querySelectorAll('.supplier-item.open').forEach(el => el.classList.remove('open'));
        // Toggle clicked
        if (!wasOpen) item.classList.add('open');
    });
});

// Copy buttons
document.querySelectorAll('.gyminfo-copy').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.copy;
        const text = document.getElementById(targetId)?.textContent;
        if (text && text !== '—') {
            navigator.clipboard.writeText(text).then(() => {
                btn.classList.add('copied');
                setTimeout(() => btn.classList.remove('copied'), 1500);
            });
        }
    });
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

// ============================================
// Admin: User Management
// ============================================
if (typeof USER_CONFIG !== 'undefined' && USER_CONFIG.isAdmin) {
(function userManagementInit() {
    const listEl = document.getElementById('userManagementList');
    const addBtn = document.getElementById('addUserBtn');
    if (!listEl) return;

    let usersData = [];

    async function loadUsers() {
        try {
            const resp = await fetch('api/account.php?action=users');
            if (!resp.ok) throw new Error('Laden mislukt');
            usersData = await resp.json();
            renderUsers();
        } catch (err) {
            listEl.innerHTML = '<p style="color:var(--red)">Kon gebruikers niet laden.</p>';
        }
    }

    function renderUsers() {
        let html = '';
        for (const u of usersData) {
            const isCurrentUser = u.username === USER_CONFIG.username;
            const roleLabel = u.role === 'admin' ? 'Beheerder' : 'Gebruiker';
            const pageChips = u.role === 'admin'
                ? '<span class="um-chip um-chip-admin">Alle pagina\'s</span>'
                : (u.pages || []).map(p => `<span class="um-chip">${USER_CONFIG.pageLabels[p] || p}</span>`).join('');

            html += `<div class="um-user-card" data-username="${u.username}">
                <div class="um-user-header">
                    <div class="um-user-info">
                        <span class="um-user-name">${ucfirst(u.username)}</span>
                        <span class="um-user-role um-role-${u.role}">${roleLabel}</span>
                    </div>
                    <div class="um-user-actions">
                        <button class="btn-sm btn-secondary um-edit-btn" data-user="${u.username}">Bewerken</button>
                        ${!isCurrentUser ? `<button class="btn-sm um-delete-btn" data-user="${u.username}">Verwijderen</button>` : ''}
                    </div>
                </div>
                <div class="um-pages-row">${pageChips}</div>
            </div>`;
        }
        listEl.innerHTML = html;

        // Bind edit buttons
        listEl.querySelectorAll('.um-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openUserModal(btn.dataset.user));
        });
        listEl.querySelectorAll('.um-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteUser(btn.dataset.user));
        });
    }

    function ucfirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    // Modal
    function openUserModal(editUsername) {
        const isNew = !editUsername;
        const existing = editUsername ? usersData.find(u => u.username === editUsername) : null;
        const title = isNew ? 'Nieuwe gebruiker' : `Bewerk ${ucfirst(editUsername)}`;

        const overlay = document.createElement('div');
        overlay.className = 'um-modal-overlay';

        const allPages = USER_CONFIG.allPages;
        const currentPages = existing ? (existing.pages || []) : [];
        const currentRole = existing ? existing.role : 'user';

        let pagesHtml = '';
        for (const p of allPages) {
            const checked = currentRole === 'admin' || currentPages.includes(p) ? 'checked' : '';
            const label = USER_CONFIG.pageLabels[p] || p;
            pagesHtml += `<label class="um-page-check"><input type="checkbox" value="${p}" ${checked}> ${label}</label>`;
        }

        overlay.innerHTML = `<div class="um-modal">
            <h3 class="um-modal-title">${title}</h3>
            <div class="um-modal-form">
                <div class="account-field">
                    <label>Gebruikersnaam</label>
                    <input type="text" id="umUsername" value="${editUsername || ''}" ${!isNew ? 'disabled' : ''} placeholder="bijv. savage" autocomplete="off">
                </div>
                <div class="account-field">
                    <label>${isNew ? 'Wachtwoord' : 'Nieuw wachtwoord (leeg = ongewijzigd)'}</label>
                    <input type="password" id="umPassword" placeholder="${isNew ? 'Minimaal 6 tekens' : 'Laat leeg om niet te wijzigen'}" autocomplete="new-password">
                </div>
                <div class="account-field">
                    <label>Rol</label>
                    <div class="um-role-toggle">
                        <button class="um-role-btn ${currentRole === 'user' ? 'active' : ''}" data-role="user">Gebruiker</button>
                        <button class="um-role-btn ${currentRole === 'admin' ? 'active' : ''}" data-role="admin">Beheerder</button>
                    </div>
                </div>
                <div class="account-field um-pages-section" id="umPagesSection" style="${currentRole === 'admin' ? 'display:none' : ''}">
                    <label>Paginatoegang</label>
                    <div class="um-pages-grid">${pagesHtml}</div>
                </div>
                <div class="um-modal-msg" id="umModalMsg"></div>
                <div class="um-modal-actions">
                    <button class="btn-secondary" id="umCancel">Annuleren</button>
                    <button class="btn-primary" id="umSave">Opslaan</button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(overlay);

        // Role toggle
        let selectedRole = currentRole;
        overlay.querySelectorAll('.um-role-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.um-role-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedRole = btn.dataset.role;
                document.getElementById('umPagesSection').style.display = selectedRole === 'admin' ? 'none' : '';
            });
        });

        // Close
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.getElementById('umCancel').addEventListener('click', () => overlay.remove());

        // Save
        document.getElementById('umSave').addEventListener('click', async () => {
            const uname = document.getElementById('umUsername').value.trim().toLowerCase();
            const pw = document.getElementById('umPassword').value;
            const pages = [];
            overlay.querySelectorAll('.um-pages-grid input[type=checkbox]:checked').forEach(cb => pages.push(cb.value));
            const msgEl = document.getElementById('umModalMsg');

            try {
                const resp = await fetch('api/account.php?action=user-save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                    body: JSON.stringify({ username: uname, password: pw, role: selectedRole, pages, isNew })
                });
                const data = await resp.json();
                if (!resp.ok) {
                    msgEl.textContent = data.error || 'Fout bij opslaan';
                    msgEl.style.color = 'var(--red)';
                    return;
                }
                overlay.remove();
                loadUsers();
            } catch (err) {
                msgEl.textContent = 'Netwerkfout';
                msgEl.style.color = 'var(--red)';
            }
        });
    }

    async function deleteUser(uname) {
        if (!confirm(`Weet je zeker dat je "${ucfirst(uname)}" wilt verwijderen?`)) return;
        try {
            const resp = await fetch('api/account.php?action=user-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                body: JSON.stringify({ username: uname })
            });
            const data = await resp.json();
            if (!resp.ok) { alert(data.error || 'Fout'); return; }
            loadUsers();
        } catch (err) {
            alert('Netwerkfout');
        }
    }

    addBtn?.addEventListener('click', () => openUserModal(null));

    // Load on init
    loadUsers();
})();
}

// ============================================
// Newsletter (Mailchimp) Page
// ============================================

let nlCurrentHtml = '';
let nlNextNumber = null;

function nlGoToStep(step) {
    document.querySelectorAll('.nl-panel').forEach(p => p.style.display = 'none');
    const stepEl = document.getElementById('nlStep' + step);
    if (stepEl) stepEl.style.display = '';
    document.querySelectorAll('.nl-step').forEach(s => {
        const sNum = parseInt(s.dataset.step);
        s.classList.toggle('active', sNum === step);
        s.classList.toggle('done', sNum < step);
    });
}

// Step 1: Fetch
document.getElementById('nlFetchBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('nlFetchBtn');
    const loading = document.getElementById('nlFetchLoading');
    btn.disabled = true;
    loading.style.display = 'block';

    try {
        const resp = await fetch('api/newsletter.php?action=fetch');
        if (!resp.ok) { const e = await resp.json(); throw new Error(e.error || 'Fetch mislukt'); }
        const data = await resp.json();

        document.getElementById('nlLastTitle').textContent = data.title;
        document.getElementById('nlLastSubject').textContent = data.subject_line;
        document.getElementById('nlLastDate').textContent = data.send_time;
        document.getElementById('nlNextNumber').textContent = '#' + data.next_number;
        document.getElementById('nlFetchInfo').style.display = 'block';

        nlCurrentHtml = data.html;
        nlNextNumber = data.next_number;
        document.getElementById('nlNumber').value = data.next_number;
        document.getElementById('nlEditor').value = data.html;

        setTimeout(() => {
            nlGoToStep(2);
            nlLoadVisualEditor(data.html);
        }, 600);
    } catch (err) {
        alert('Fout: ' + err.message);
    } finally {
        btn.disabled = false;
        loading.style.display = 'none';
    }
});

// Step 2: Visual WYSIWYG editor
let nlCodeVisible = false;

function nlLoadVisualEditor(html) {
    const iframe = document.getElementById('nlVisualEditor');
    if (!iframe) return;

    iframe.srcdoc = html;
    iframe.onload = () => {
        const doc = iframe.contentDocument;
        // Enable editing
        doc.designMode = 'on';

        // Click on image to select it — show info in toolbar hint
        doc.addEventListener('click', (e) => {
            // Deselect previous
            doc.querySelectorAll('img').forEach(img => img.style.outline = '');
            nlSelectedImg = null;

            // Update toolbar buttons state
            const linkBtn = document.getElementById('nlLinkBtn');

            if (e.target.tagName === 'IMG') {
                e.target.style.outline = '3px solid #6366f1';
                nlSelectedImg = e.target;

                // Show link status
                const parentLink = e.target.closest('a');
                if (linkBtn) {
                    if (parentLink) {
                        linkBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Link ✓';
                        linkBtn.style.borderColor = '#6366f1';
                        linkBtn.style.color = '#6366f1';
                    } else {
                        linkBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Link';
                        linkBtn.style.borderColor = '';
                        linkBtn.style.color = '';
                    }
                }
                e.preventDefault();
            } else {
                // Reset link button
                if (linkBtn) {
                    linkBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Link';
                    linkBtn.style.borderColor = '';
                    linkBtn.style.color = '';
                }
            }
        });

        // Double-click image to upload replacement directly
        doc.addEventListener('dblclick', (e) => {
            if (e.target.tagName === 'IMG') {
                e.target.style.outline = '3px solid #6366f1';
                nlSelectedImg = e.target;
                document.getElementById('nlFileInput').click();
            }
        });

        // Add hover effect on images
        const style = doc.createElement('style');
        style.textContent = `
            img:hover { outline: 2px dashed #6366f1; outline-offset: 2px; cursor: pointer; }
            img { transition: outline 0.15s; }
        `;
        doc.head.appendChild(style);
    };
}

function nlGetVisualHtml() {
    const iframe = document.getElementById('nlVisualEditor');
    if (!iframe || !iframe.contentDocument) return document.getElementById('nlEditor').value;
    const doc = iframe.contentDocument;
    // Remove editor styles before extracting
    const editorStyles = doc.querySelectorAll('style');
    editorStyles.forEach(s => { if (s.textContent.includes('dashed #6366f1')) s.remove(); });
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

// Toggle code view
document.getElementById('nlToggleCode')?.addEventListener('click', () => {
    const editor = document.getElementById('nlEditor');
    const visual = document.getElementById('nlVisualEditor');
    nlCodeVisible = !nlCodeVisible;

    if (nlCodeVisible) {
        // Sync visual → code
        editor.value = nlGetVisualHtml();
        editor.classList.remove('nl-code-hidden');
        editor.classList.add('nl-code-visible');
        visual.style.display = 'none';
        document.getElementById('nlToggleCode').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Visueel';
    } else {
        // Sync code → visual
        nlLoadVisualEditor(editor.value);
        editor.classList.add('nl-code-hidden');
        editor.classList.remove('nl-code-visible');
        visual.style.display = 'block';
        document.getElementById('nlToggleCode').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> HTML';
    }
});

// Image upload
let nlSelectedImg = null;

document.getElementById('nlUploadBtn')?.addEventListener('click', () => {
    document.getElementById('nlFileInput').click();
});

document.getElementById('nlFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const bar = document.getElementById('nlUploadBar');
    const status = document.getElementById('nlUploadStatus');
    bar.style.display = 'block';
    status.textContent = `"${file.name}" uploaden naar Mailchimp...`;

    try {
        const formData = new FormData();
        formData.append('image', file);

        const resp = await fetch('api/newsletter.php?action=upload', {
            method: 'POST',
            headers: { 'X-CSRF-Token': csrfToken },
            body: formData
        });

        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Upload mislukt');
        }

        const data = await resp.json();
        status.textContent = '✅ Geüpload!';

        const doc = document.getElementById('nlVisualEditor')?.contentDocument;
        if (doc) {
            if (nlSelectedImg) {
                // Replace selected image
                nlSelectedImg.src = data.url;
                nlSelectedImg = null;
            } else {
                // Insert at cursor position
                doc.execCommand('insertImage', false, data.url);
            }
        }

        setTimeout(() => { bar.style.display = 'none'; }, 2000);
    } catch (err) {
        status.textContent = '❌ ' + err.message;
        setTimeout(() => { bar.style.display = 'none'; }, 4000);
    }

    // Reset file input
    e.target.value = '';
});

// Link button — add/edit/remove link on selected image
document.getElementById('nlLinkBtn')?.addEventListener('click', () => {
    const doc = document.getElementById('nlVisualEditor')?.contentDocument;
    if (!doc) return;

    if (!nlSelectedImg) {
        alert('Selecteer eerst een afbeelding door erop te klikken.');
        return;
    }

    // Check if image already has a link (parent <a>)
    const parentLink = nlSelectedImg.closest('a');
    const currentUrl = parentLink ? parentLink.href : '';

    const newUrl = prompt(
        currentUrl ? 'Link bewerken (leeg laten om te verwijderen):' : 'Link URL toevoegen:',
        currentUrl
    );

    // User cancelled
    if (newUrl === null) return;

    let url = newUrl.trim();

    if (url === '') {
        // Remove link — unwrap image from <a> tag
        if (parentLink) {
            parentLink.replaceWith(nlSelectedImg);
        }
    } else {
        // Auto-add https:// if no protocol specified
        if (url && !url.match(/^https?:\/\//i) && !url.startsWith('mailto:')) {
            url = 'https://' + url;
        }

        if (parentLink) {
            parentLink.href = url;
            parentLink.setAttribute('target', '_blank');
        } else {
            const link = doc.createElement('a');
            link.href = url;
            link.setAttribute('target', '_blank');
            nlSelectedImg.parentNode.insertBefore(link, nlSelectedImg);
            link.appendChild(nlSelectedImg);
        }
    }
});

// Undo/Redo in visual editor
document.getElementById('nlUndo')?.addEventListener('click', () => {
    const doc = document.getElementById('nlVisualEditor')?.contentDocument;
    if (doc) doc.execCommand('undo');
});
document.getElementById('nlRedo')?.addEventListener('click', () => {
    const doc = document.getElementById('nlVisualEditor')?.contentDocument;
    if (doc) doc.execCommand('redo');
});

// Navigation
document.getElementById('nlBackTo1')?.addEventListener('click', () => nlGoToStep(1));
document.getElementById('nlToStep3')?.addEventListener('click', () => {
    // Get HTML from whichever editor is active
    nlCurrentHtml = nlCodeVisible
        ? document.getElementById('nlEditor').value
        : nlGetVisualHtml();
    nlGoToStep(3);
});
document.getElementById('nlBackTo2')?.addEventListener('click', () => nlGoToStep(2));

// Step 4: Publish with progress tracking
let nlTimer = null;
let nlStartTime = 0;

function nlStartTimer() {
    nlStartTime = Date.now();
    const timerEl = document.getElementById('nlOverallTimer');
    nlTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - nlStartTime) / 1000);
        const min = Math.floor(elapsed / 60);
        const sec = String(elapsed % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = min + ':' + sec;
    }, 1000);
}

function nlStopTimer() {
    if (nlTimer) { clearInterval(nlTimer); nlTimer = null; }
}

function nlSetOverall(pct, text) {
    const fill = document.getElementById('nlOverallFill');
    const txt = document.getElementById('nlOverallText');
    if (fill) fill.style.width = pct + '%';
    if (txt) txt.textContent = text;
}

function nlSetStep(id, icon, sub, active) {
    const item = document.getElementById(id);
    const iconEl = item?.querySelector('.nl-progress-icon');
    const subEl = document.getElementById(id + 'Sub');
    const bar = document.getElementById(id + 'Bar');
    if (iconEl) iconEl.textContent = icon;
    if (subEl) subEl.textContent = sub;
    if (item) item.classList.toggle('active', !!active);
    if (bar) bar.style.display = active ? '' : 'none';
}

document.getElementById('nlToStep4')?.addEventListener('click', async () => {
    const number = document.getElementById('nlNumber').value;
    const subjectNL = document.getElementById('nlSubjectNL').value.trim();
    const subjectEN = document.getElementById('nlSubjectEN').value.trim();
    const previewNL = document.getElementById('nlPreviewNL').value.trim();
    const previewEN = document.getElementById('nlPreviewEN').value.trim();

    if (!number || !subjectNL || !subjectEN) {
        alert('Vul alle velden in!');
        return;
    }

    nlGoToStep(4);
    const errorEl = document.getElementById('nlError');
    errorEl.style.display = 'none';
    document.getElementById('nlOverallProgress').style.display = '';
    nlStartTimer();

    try {
        // Stap 1: Spellcheck
        nlSetOverall(5, 'Stap 1 van 3 — Spelling controleren...');
        nlSetStep('nlProg1', '🔄', 'Claude controleert spelling & grammatica... (±30 sec)', true);

        const spellResp = await fetch('api/newsletter.php?action=spellcheck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ html: nlCurrentHtml })
        });
        if (!spellResp.ok) {
            let errMsg = 'Spellcheck mislukt';
            try { const e = await spellResp.json(); errMsg = e.error || errMsg; } catch(x) {}
            throw new Error(errMsg);
        }
        const spellData = await spellResp.json();
        const htmlNlChecked = spellData.html;
        const corCount = spellData.corrections || 0;
        nlSetStep('nlProg1', '✅', corCount > 0 ? corCount + ' correctie(s) toegepast' : 'Geen fouten gevonden!', false);
        nlSetOverall(33, 'Stap 2 van 3 — Vertalen...');

        // Stap 2: Translate
        nlSetStep('nlProg2', '🔄', 'Claude vertaalt naar Engels... (±45 sec)', true);

        const transResp = await fetch('api/newsletter.php?action=translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ html: htmlNlChecked })
        });
        if (!transResp.ok) {
            let errMsg = 'Vertaling mislukt';
            try { const e = await transResp.json(); errMsg = e.error || errMsg; } catch(x) {}
            throw new Error(errMsg);
        }
        const transData = await transResp.json();
        const htmlEn = transData.html;
        nlSetStep('nlProg2', '✅', 'Klaar!', false);
        nlSetOverall(66, 'Stap 3 van 3 — Campagnes aanmaken...');

        // Stap 3: Create campaigns
        nlSetStep('nlProg3', '🔄', 'Campagnes aanmaken in Mailchimp... (±10 sec)', true);

        const createResp = await fetch('api/newsletter.php?action=create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({
                number: parseInt(number),
                subject_nl: subjectNL,
                subject_en: subjectEN,
                preview_nl: previewNL,
                preview_en: previewEN,
                html_nl: htmlNlChecked,
                html_en: htmlEn
            })
        });
        if (!createResp.ok) {
            let errMsg = 'Campagne aanmaken mislukt';
            try { const e = await createResp.json(); errMsg = e.error || errMsg; } catch(x) {}
            throw new Error(errMsg);
        }
        const createData = await createResp.json();
        nlSetStep('nlProg3', '✅', 'Klaar!', false);
        nlSetOverall(100, 'Alles klaar!');
        nlStopTimer();

        // Show success
        document.getElementById('nlLinkNL').href = createData.nl_url;
        document.getElementById('nlLinkEN').href = createData.en_url;
        document.getElementById('nlSuccess').style.display = '';

    } catch (err) {
        nlStopTimer();
        // Mark current active step as failed
        document.querySelectorAll('.nl-progress-item.active').forEach(item => {
            const icon = item.querySelector('.nl-progress-icon');
            if (icon) icon.textContent = '❌';
            item.classList.remove('active');
            const bar = item.querySelector('.nl-item-bar');
            if (bar) bar.style.display = 'none';
        });
        nlSetOverall(0, 'Mislukt');
        errorEl.textContent = '❌ Fout: ' + err.message;
        errorEl.style.display = '';
    }
});

// Restart
function nlResetAll() {
    nlCurrentHtml = '';
    nlCodeVisible = false;
    document.getElementById('nlEditor').value = '';
    document.getElementById('nlEditor').classList.add('nl-code-hidden');
    document.getElementById('nlEditor').classList.remove('nl-code-visible');
    const vis = document.getElementById('nlVisualEditor');
    if (vis) { vis.style.display = 'block'; vis.srcdoc = ''; }
    document.getElementById('nlNumber').value = '';
    document.getElementById('nlSubjectNL').value = '';
    document.getElementById('nlSubjectEN').value = '';
    document.getElementById('nlPreviewNL').value = '';
    document.getElementById('nlPreviewEN').value = '';
    document.getElementById('nlFetchInfo').style.display = 'none';
    document.getElementById('nlSuccess').style.display = 'none';
    document.getElementById('nlError').style.display = 'none';
    document.getElementById('nlBlogSections').innerHTML = '';
    document.getElementById('nlBlogProgress').style.display = 'none';
    document.getElementById('nlBlogSuccess').style.display = 'none';
    document.getElementById('nlBlogError').style.display = 'none';
    nlStopTimer();
    ['nlProg1', 'nlProg2', 'nlProg3'].forEach(id => {
        nlSetStep(id, '⏳', 'Wachten...', false);
    });
    const fill = document.getElementById('nlOverallFill');
    if (fill) fill.style.width = '0%';
    const timer = document.getElementById('nlOverallTimer');
    if (timer) timer.textContent = '0:00';
    nlGoToStep(1);
}
document.getElementById('nlRestart')?.addEventListener('click', nlResetAll);
document.getElementById('nlBlogRestart')?.addEventListener('click', nlResetAll);

// ─── Step 5: Blog ─────────────────────────────────────────────────────────

let nlBlogSectionsData = [];
let nlBlogWxrContent = '';

// Go to blog step
document.getElementById('nlToBlog')?.addEventListener('click', async () => {
    const sectionsEl = document.getElementById('nlBlogSections');
    const errorEl = document.getElementById('nlBlogError');
    sectionsEl.innerHTML = '<div style="color:var(--text-secondary);"><div class="nb-spinner" style="display:inline-block;width:20px;height:20px;margin-right:8px;vertical-align:middle;"></div>Secties analyseren...</div>';
    errorEl.style.display = 'none';
    document.getElementById('nlBlogSuccess').style.display = 'none';
    document.getElementById('nlBlogProgress').style.display = 'none';

    nlGoToStep(5);

    try {
        const resp = await fetch('api/newsletter.php?action=sections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ html: nlCurrentHtml })
        });
        if (!resp.ok) {
            const e = await resp.json().catch(() => ({}));
            throw new Error(e.error || 'Secties ophalen mislukt');
        }
        const data = await resp.json();
        nlBlogSectionsData = data.sections;

        if (!nlBlogSectionsData.length) {
            sectionsEl.innerHTML = '<p style="color:var(--text-secondary);">Geen secties gevonden in de nieuwsbrief.</p>';
            return;
        }

        // Render checkboxes
        let html = '';
        nlBlogSectionsData.forEach((s, i) => {
            const checked = !s.skip ? 'checked' : '';
            const dimStyle = s.skip ? 'opacity:0.5;' : '';
            html += `<label style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:8px;cursor:pointer;border:1px solid var(--border);margin-bottom:8px;${dimStyle}transition:all 0.15s;">
                <input type="checkbox" class="nl-blog-cb" data-index="${i}" ${checked} style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer;">
                <span style="flex:1;font-weight:500;">${s.title}</span>
                ${s.skip ? '<span style="font-size:12px;color:var(--text-muted);background:var(--bg);padding:2px 8px;border-radius:4px;">Overgeslagen</span>' : ''}
            </label>`;
        });
        // Select all / none
        html += `<div style="margin-top:12px;display:flex;gap:8px;">
            <button class="btn-secondary" id="nlBlogSelectAll" style="font-size:12px;padding:4px 12px;">Alles selecteren</button>
            <button class="btn-secondary" id="nlBlogSelectNone" style="font-size:12px;padding:4px 12px;">Niets selecteren</button>
        </div>`;
        sectionsEl.innerHTML = html;

        // Update count
        nlBlogUpdateCount();

        // Checkbox change handlers
        sectionsEl.querySelectorAll('.nl-blog-cb').forEach(cb => {
            cb.addEventListener('change', nlBlogUpdateCount);
        });
        document.getElementById('nlBlogSelectAll')?.addEventListener('click', () => {
            sectionsEl.querySelectorAll('.nl-blog-cb').forEach(cb => { cb.checked = true; });
            nlBlogUpdateCount();
        });
        document.getElementById('nlBlogSelectNone')?.addEventListener('click', () => {
            sectionsEl.querySelectorAll('.nl-blog-cb').forEach(cb => { cb.checked = false; });
            nlBlogUpdateCount();
        });

    } catch (err) {
        sectionsEl.innerHTML = '';
        errorEl.textContent = '❌ ' + err.message;
        errorEl.style.display = '';
    }
});

function nlBlogUpdateCount() {
    const checked = document.querySelectorAll('.nl-blog-cb:checked').length;
    document.getElementById('nlBlogCount').textContent = checked + ' geselecteerd';
    document.getElementById('nlBlogGenerate').disabled = checked === 0;
}

// Back to step 4
document.getElementById('nlBlogBack')?.addEventListener('click', () => nlGoToStep(4));

// Generate blog posts
document.getElementById('nlBlogGenerate')?.addEventListener('click', async () => {
    const errorEl = document.getElementById('nlBlogError');
    const progressEl = document.getElementById('nlBlogProgress');
    const progressFill = document.getElementById('nlBlogProgressFill');
    const progressText = document.getElementById('nlBlogProgressText');
    const progressLog = document.getElementById('nlBlogProgressLog');

    errorEl.style.display = 'none';
    document.getElementById('nlBlogSuccess').style.display = 'none';
    progressEl.style.display = '';
    progressLog.innerHTML = '';

    // Get selected sections
    const selected = [];
    document.querySelectorAll('.nl-blog-cb:checked').forEach(cb => {
        selected.push(nlBlogSectionsData[parseInt(cb.dataset.index)]);
    });

    if (!selected.length) return;

    document.getElementById('nlBlogGenerate').disabled = true;
    const today = new Date().toISOString().split('T')[0];
    const articles = [];

    try {
        for (let i = 0; i < selected.length; i++) {
            const section = selected[i];
            const pct = Math.round(((i) / selected.length) * 100);
            progressFill.style.width = pct + '%';
            progressText.textContent = `Sectie ${i + 1} van ${selected.length} opschonen...`;
            progressLog.innerHTML += `<div>🔄 ${section.title}...</div>`;

            const resp = await fetch('api/newsletter.php?action=blog-clean', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                body: JSON.stringify({ html: section.html, title: section.title })
            });
            if (!resp.ok) {
                const e = await resp.json().catch(() => ({}));
                throw new Error(e.error || `Opschonen mislukt: ${section.title}`);
            }
            const data = await resp.json();

            // Generate slug
            const slug = section.title.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();

            articles.push({
                title: section.title,
                slug: slug,
                date: today,
                content: data.html
            });

            progressLog.lastChild.innerHTML = `✅ ${section.title}`;
        }

        progressFill.style.width = '100%';
        progressText.textContent = 'WXR bestand genereren...';

        // Generate WXR XML client-side
        nlBlogWxrContent = nlGenerateWXR(articles);

        progressText.textContent = 'Klaar!';

        // Show success
        const imgCount = (nlBlogWxrContent.match(/<wp:post_type>attachment<\/wp:post_type>/g) || []).length;
        document.getElementById('nlBlogSuccessInfo').textContent = `${articles.length} artikelen en ${imgCount} afbeeldingen klaar voor import.`;
        document.getElementById('nlBlogSuccess').style.display = '';

    } catch (err) {
        errorEl.textContent = '❌ ' + err.message;
        errorEl.style.display = '';
    } finally {
        document.getElementById('nlBlogGenerate').disabled = false;
    }
});

// Download WXR
document.getElementById('nlBlogDownload')?.addEventListener('click', () => {
    if (!nlBlogWxrContent) return;
    const number = document.getElementById('nlNumber').value || 'nieuwsbrief';
    const blob = new Blob([nlBlogWxrContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blog-import-${number}.xml`;
    a.click();
    URL.revokeObjectURL(url);
});

// Generate WXR XML from articles array
function nlGenerateWXR(articles) {
    let items = '';
    let attachmentId = 9000;
    const seenUrls = new Set();

    articles.forEach((art, i) => {
        const postId = 8000 + i;
        const postDate = art.date + ' 09:00:00';
        const d = new Date(art.date + 'T09:00:00Z');
        const pubDate = d.toUTCString();

        items += `    <item>
        <title><![CDATA[${art.title}]]></title>
        <link>https://havenbjj.nl/${art.slug}/</link>
        <pubDate>${pubDate}</pubDate>
        <dc:creator><![CDATA[web2858]]></dc:creator>
        <guid isPermaLink="false">https://havenbjj.nl/?p=${postId}</guid>
        <description></description>
        <content:encoded><![CDATA[${art.content}]]></content:encoded>
        <excerpt:encoded><![CDATA[]]></excerpt:encoded>
        <wp:post_id>${postId}</wp:post_id>
        <wp:post_date>${postDate}</wp:post_date>
        <wp:post_date_gmt>${postDate}</wp:post_date_gmt>
        <wp:post_modified>${postDate}</wp:post_modified>
        <wp:post_modified_gmt>${postDate}</wp:post_modified_gmt>
        <wp:comment_status>closed</wp:comment_status>
        <wp:ping_status>closed</wp:ping_status>
        <wp:post_name>${art.slug}</wp:post_name>
        <wp:status>publish</wp:status>
        <wp:post_parent>0</wp:post_parent>
        <wp:menu_order>0</wp:menu_order>
        <wp:post_type>post</wp:post_type>
        <wp:post_password></wp:post_password>
        <wp:is_sticky>0</wp:is_sticky>
        <category domain="category" nicename="nieuwsbrief"><![CDATA[Nieuwsbrief]]></category>
    </item>\n`;

        // Extract images and create attachment items
        const imgRegex = /<img[^>]+src="([^"]+)"/g;
        let match;
        while ((match = imgRegex.exec(art.content)) !== null) {
            const url = match[1];
            if (seenUrls.has(url)) continue;
            seenUrls.add(url);
            const filename = url.split('?')[0].split('/').pop();
            const imgTitle = filename.split('.')[0];
            items += `    <item>
        <title><![CDATA[${imgTitle}]]></title>
        <link>${url}</link>
        <pubDate></pubDate>
        <dc:creator><![CDATA[web2858]]></dc:creator>
        <guid isPermaLink="false">${url}</guid>
        <description></description>
        <content:encoded><![CDATA[]]></content:encoded>
        <excerpt:encoded><![CDATA[]]></excerpt:encoded>
        <wp:post_id>${attachmentId}</wp:post_id>
        <wp:post_date>${postDate}</wp:post_date>
        <wp:post_date_gmt>${postDate}</wp:post_date_gmt>
        <wp:post_modified>${postDate}</wp:post_modified>
        <wp:post_modified_gmt>${postDate}</wp:post_modified_gmt>
        <wp:comment_status>closed</wp:comment_status>
        <wp:ping_status>closed</wp:ping_status>
        <wp:post_name>${imgTitle}</wp:post_name>
        <wp:status>inherit</wp:status>
        <wp:post_parent>${postId}</wp:post_parent>
        <wp:menu_order>0</wp:menu_order>
        <wp:post_type>attachment</wp:post_type>
        <wp:post_password></wp:post_password>
        <wp:is_sticky>0</wp:is_sticky>
        <wp:attachment_url>${url}</wp:attachment_url>
    </item>\n`;
            attachmentId++;
        }
    });

    return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
    xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
    xmlns:content="http://purl.org/rss/1.0/modules/content/"
    xmlns:wfw="http://wellformedweb.org/CommentAPI/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:wp="http://wordpress.org/export/1.2/"
>
<channel>
    <title>Haven BJJ</title>
    <link>https://havenbjj.nl</link>
    <description>Haven BJJ Rotterdam Nieuwsbrief Artikelen</description>
    <language>nl</language>
    <wp:wxr_version>1.2</wp:wxr_version>
    <wp:base_site_url>https://havenbjj.nl</wp:base_site_url>
    <wp:base_blog_url>https://havenbjj.nl</wp:base_blog_url>

    <wp:author>
        <wp:author_id>1</wp:author_id>
        <wp:author_login>web2858</wp:author_login>
        <wp:author_email>info@havenbjj.nl</wp:author_email>
        <wp:author_display_name><![CDATA[Daniel de Groot]]></wp:author_display_name>
    </wp:author>

    <wp:category>
        <wp:term_id>4</wp:term_id>
        <wp:category_nicename>nieuwsbrief</wp:category_nicename>
        <wp:category_parent></wp:category_parent>
        <wp:cat_name><![CDATA[Nieuwsbrief]]></wp:cat_name>
    </wp:category>

${items}
</channel>
</rss>`;
}

// ============================================
// COACH DASHBOARD — Mijn Lessen
// ============================================

const CD_SLOT_HOURS = { 'Morning': 1.5, 'Noon': 1, 'Kids': 1, 'Fundamentals': 1, 'Evening 1': 1.5, 'Evening 2': 1 };
const CD_MONTHS_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const CD_DAYS_NL = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
const CD_DAYS_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

let cdMonth = null;
let cdYear = null;
let cdData = null; // loaded rooster draft

(function cdInit() {
    const now = new Date();
    cdMonth = now.getMonth() + 1;
    cdYear = now.getFullYear();

    document.getElementById('cdPrevMonth')?.addEventListener('click', () => { cdChangeMonth(-1); });
    document.getElementById('cdNextMonth')?.addEventListener('click', () => { cdChangeMonth(1); });
})();

function cdChangeMonth(dir) {
    cdMonth += dir;
    if (cdMonth > 12) { cdMonth = 1; cdYear++; }
    if (cdMonth < 1) { cdMonth = 12; cdYear--; }
    updateCoachDashboard();
}

function cdGetCoachName() {
    if (typeof USER_CONFIG === 'undefined') return 'Daniel';
    const u = USER_CONFIG.username;
    // Map usernames to known coach display names
    const nameMap = {};
    ROOSTER_KNOWN_COACHES.forEach(n => { nameMap[n.toLowerCase().replace(/[\s.]/g, '')] = n; });
    // Direct match
    if (nameMap[u]) return nameMap[u];
    // ucfirst match
    const uc = u.charAt(0).toUpperCase() + u.slice(1);
    if (ROOSTER_KNOWN_COACHES.includes(uc)) return uc;
    return uc;
}

async function updateCoachDashboard() {
    const loading = document.getElementById('cdLoading');
    const empty = document.getElementById('cdEmpty');
    const content = document.getElementById('cdContent');
    const monthLabel = document.getElementById('cdMonthLabel');

    if (!loading || !content) return;

    const monthKey = cdYear + '-' + String(cdMonth).padStart(2, '0');
    monthLabel.textContent = CD_MONTHS_NL[cdMonth - 1] + ' ' + cdYear;

    loading.style.display = 'flex';
    empty.style.display = 'none';
    content.style.display = 'none';

    try {
        // Load rooster draft
        const resp = await fetch('api/rooster.php?action=load&month=' + monthKey);
        if (!resp.ok) throw new Error('Laden mislukt');
        const result = await resp.json();

        if (!result.data) {
            loading.style.display = 'none';
            empty.style.display = '';
            content.style.display = '';
            // Still show month nav
            document.getElementById('cdHoursRow').style.display = 'none';
            document.getElementById('cdThemesCard').style.display = 'none';
            document.getElementById('cdScheduleContent').innerHTML = '<p class="cd-empty-text">Er is nog geen rooster voor deze maand.</p>';
            return;
        }

        cdData = result.data;
        loading.style.display = 'none';
        content.style.display = '';
        document.getElementById('cdHoursRow').style.display = '';

        const coachName = cdGetCoachName();
        cdRenderSchedule(coachName);
        cdRenderHours(coachName);
        await cdRenderThemes();

    } catch (err) {
        loading.style.display = 'none';
        empty.style.display = '';
        empty.querySelector('p').textContent = 'Kon rooster niet laden: ' + err.message;
    }
}

function cdRenderSchedule(coachName) {
    const wrap = document.getElementById('cdScheduleContent');
    if (!cdData || !cdData.coaches) { wrap.innerHTML = '<p class="cd-empty-text">Geen data.</p>'; return; }

    // Collect all dates where this coach is scheduled
    const myLessons = []; // { date, slot, dateObj }
    for (const [dateStr, slots] of Object.entries(cdData.coaches)) {
        for (const [slot, name] of Object.entries(slots)) {
            if (name && name.toLowerCase() === coachName.toLowerCase()) {
                myLessons.push({ date: dateStr, slot, dateObj: new Date(dateStr + 'T00:00:00') });
            }
        }
    }

    if (myLessons.length === 0) {
        wrap.innerHTML = '<p class="cd-empty-text">Je bent deze maand niet ingepland.</p>';
        return;
    }

    // Sort by date
    myLessons.sort((a, b) => a.dateObj - b.dateObj);

    // Group by week (ISO week starting Monday)
    const weeks = [];
    let currentWeek = [];
    let lastMondayStr = null;
    for (const lesson of myLessons) {
        const d = lesson.dateObj;
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const mStr = monday.toISOString().slice(0, 10);
        if (lastMondayStr !== null && mStr !== lastMondayStr) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
        currentWeek.push(lesson);
        lastMondayStr = mStr;
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    let html = '';
    weeks.forEach((weekLessons, wi) => {
        // Group by date within the week
        const byDate = {};
        for (const l of weekLessons) {
            if (!byDate[l.date]) byDate[l.date] = [];
            byDate[l.date].push(l);
        }

        html += `<div class="cd-week">`;
        html += `<div class="cd-week-title">Week ${wi + 1}</div>`;

        for (const [dateStr, lessons] of Object.entries(byDate)) {
            const d = new Date(dateStr + 'T00:00:00');
            const dayName = CD_DAYS_NL[d.getDay()];
            const dateLabel = d.getDate() + ' ' + CD_MONTHS_NL[d.getMonth()];
            const hours = lessons.reduce((sum, l) => sum + (CD_SLOT_HOURS[l.slot] || 1), 0);

            html += `<div class="cd-day-row">
                <div class="cd-day-info">
                    <span class="cd-day-name">${dayName}</span>
                    <span class="cd-day-date">${dateLabel}</span>
                </div>
                <div class="cd-day-slots">
                    ${lessons.map(l => `<span class="cd-slot-chip cd-slot-${l.slot.toLowerCase().replace(/\s+/g, '')}">${l.slot}</span>`).join('')}
                </div>
                <div class="cd-day-hours">${hours}u</div>
            </div>`;
        }
        html += `</div>`;
    });

    wrap.innerHTML = html;
}

function cdRenderHours(coachName) {
    if (!cdData || !cdData.coaches) return;

    let totalLessons = 0;
    let totalHours = 0;

    for (const [dateStr, slots] of Object.entries(cdData.coaches)) {
        for (const [slot, name] of Object.entries(slots)) {
            if (name && name.toLowerCase() === coachName.toLowerCase()) {
                totalLessons++;
                totalHours += (CD_SLOT_HOURS[slot] || 1);
            }
        }
    }

    document.getElementById('cdTotalLessons').textContent = totalLessons;
    document.getElementById('cdTotalHours').textContent = totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1);
}

async function cdRenderThemes() {
    const card = document.getElementById('cdThemesCard');
    const content = document.getElementById('cdThemesContent');

    // Reuse Notion data from Crew Briefing
    try {
        if (!nbDataLoaded) {
            await nbFetchAllData();
        }

        const monday = nbGetWeekMonday(0); // this week
        const theme = nbFindThemeForWeek(monday);

        if (!theme) {
            card.style.display = 'none';
            return;
        }

        card.style.display = '';
        const cols = NB_THEME_COLS.slice(1); // skip 'Week' column
        let html = '<div class="cd-themes-grid">';
        for (let i = 0; i < cols.length && i < theme.cols.length; i++) {
            if (!theme.cols[i]) continue;
            html += `<div class="cd-theme-item">
                <div class="cd-theme-label">${cols[i]}</div>
                <div class="cd-theme-value">${theme.cols[i]}</div>
            </div>`;
        }
        html += '</div>';
        content.innerHTML = html;
    } catch (err) {
        card.style.display = 'none';
    }
}

// ============================================
// ROOSTER TOOL — Persistent Workspace/Editor
// ============================================

const ROOSTER_MONTHS_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const ROOSTER_MONTHS_EN = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];
const ROOSTER_DAYS_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const ROOSTER_BALIE_HOURS = { 1: 4.5, 2: 3.5, 3: 4.5, 4: 4.75, 5: 3.5, 0: 3, 6: 0 };
const ROOSTER_KNOWN_COACHES = ['Harry', 'Ashley', 'Noel', 'Young Kev', 'Old Kev', 'Savage', 'K.K.R.', 'Joran', 'Rodney', 'Kamen', 'Daniel', 'Jivi', 'Django', 'Kostas', 'Bryan'];
const ROOSTER_KNOWN_BALIE = ['Milou', 'Annika', 'Polina', 'Sarah', 'Jaden'];
const ROOSTER_COACH_SLOTS = ['Morning', 'Noon', 'Kids', 'Fundamentals', 'Evening 1', 'Evening 2'];
const ROOSTER_COACH_DAYS = [1, 2, 3, 4, 5, 6]; // Mon-Sat
const ROOSTER_BALIE_DAYS = [1, 2, 3, 4, 5, 0]; // Mon-Fri + Sun

let roosterState = {
    month: null,
    year: null,
    coaches: {},       // dateStr -> { slot -> name }
    balie: {},         // dateStr -> name
    absences: {},      // name -> [dateStr, ...]
    absenceTexts: {},  // name -> raw input text
    allCoaches: [...ROOSTER_KNOWN_COACHES],
    allBalie: [...ROOSTER_KNOWN_BALIE],
    coachSlots: [...ROOSTER_COACH_SLOTS],
    slotHistory: {},   // slot -> Set of names
    status: 'none',    // none, concept, saved, unsaved
    loaded: false
};

let roosterAutoSaveTimer = null;
let roosterActiveTab = 'coaches';

// --- Initialize default month/year ---
(function roosterInit() {
    const now = new Date();
    // Default to next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const mSel = document.getElementById('roosterMonth');
    const ySel = document.getElementById('roosterYear');
    if (mSel) mSel.value = String(nextMonth.getMonth() + 1);
    if (ySel) ySel.value = String(nextMonth.getFullYear());

    // Try loading saved draft for default month
    roosterTryLoadDraft();

    // Month/year change listeners
    mSel?.addEventListener('change', () => roosterTryLoadDraft());
    ySel?.addEventListener('change', () => roosterTryLoadDraft());
})();

// --- Month key helper ---
function roosterMonthKey() {
    const m = document.getElementById('roosterMonth')?.value;
    const y = document.getElementById('roosterYear')?.value;
    if (!m || !y) return null;
    return y + '-' + String(m).padStart(2, '0');
}

// --- Status indicator ---
function roosterUpdateStatus(status, text) {
    roosterState.status = status;
    const el = document.getElementById('roosterStatus');
    if (!el) return;
    const dot = el.querySelector('.rooster-status-dot');
    const txt = el.querySelector('.rooster-status-text');
    el.className = 'rooster-status rooster-status-' + status;
    txt.textContent = text || {
        'none': 'Geen concept',
        'concept': 'Concept',
        'saved': 'Opgeslagen',
        'unsaved': 'Niet opgeslagen',
        'saving': 'Opslaan...'
    }[status] || status;
}

// --- Toast notifications ---
function roosterToast(msg, type) {
    const el = document.getElementById('roosterToast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'rooster-toast rooster-toast-' + (type || 'info');
    el.style.display = '';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// --- API: Load draft ---
async function roosterLoadDraft(monthKey) {
    try {
        const resp = await fetch('api/rooster.php?action=load&month=' + encodeURIComponent(monthKey));
        if (!resp.ok) return null;
        const data = await resp.json();
        return data;
    } catch (e) {
        console.error('Rooster load draft error:', e);
        return null;
    }
}

// --- API: Save draft ---
async function roosterSaveDraft() {
    const monthKey = roosterMonthKey();
    if (!monthKey || !roosterState.loaded) return;
    roosterUpdateStatus('saving', 'Opslaan...');
    try {
        const payload = {
            month: monthKey,
            data: {
                coaches: roosterState.coaches,
                balie: roosterState.balie,
                absences: roosterState.absences,
                absenceTexts: roosterState.absenceTexts,
                allCoaches: roosterState.allCoaches,
                allBalie: roosterState.allBalie,
                coachSlots: roosterState.coachSlots,
                slotHistory: {},
                status: 'concept',
                savedAt: new Date().toISOString()
            }
        };
        // Convert slotHistory Sets to arrays for JSON
        for (const [slot, names] of Object.entries(roosterState.slotHistory)) {
            payload.data.slotHistory[slot] = names instanceof Set ? [...names] : (names || []);
        }
        const resp = await fetch('api/rooster.php?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('Save failed');
        roosterUpdateStatus('saved', 'Opgeslagen');
    } catch (e) {
        console.error('Rooster save error:', e);
        roosterUpdateStatus('unsaved', 'Opslaan mislukt');
        roosterToast('Fout bij opslaan: ' + e.message, 'error');
    }
}

// --- Auto-save (debounced) ---
function roosterScheduleAutoSave() {
    if (!roosterState.loaded) return;
    roosterUpdateStatus('unsaved', 'Niet opgeslagen');
    clearTimeout(roosterAutoSaveTimer);
    roosterAutoSaveTimer = setTimeout(() => roosterSaveDraft(), 2000);
}

// --- Try loading a draft for current month selection ---
async function roosterTryLoadDraft() {
    const monthKey = roosterMonthKey();
    if (!monthKey) return;
    const data = await roosterLoadDraft(monthKey);
    if (data && data.coaches) {
        roosterRestoreFromDraft(data, monthKey);
        roosterShowWorkspace();
        roosterRenderAll();
        roosterUpdateStatus('saved', 'Opgeslagen');
        roosterToast('Concept geladen voor ' + ROOSTER_MONTHS_NL[parseInt(monthKey.split('-')[1]) - 1], 'success');
    } else {
        roosterState.loaded = false;
        document.getElementById('roosterWorkspace').style.display = 'none';
        roosterUpdateStatus('none', 'Geen concept');
    }
}

function roosterRestoreFromDraft(data, monthKey) {
    const parts = monthKey.split('-');
    roosterState.month = parseInt(parts[1]);
    roosterState.year = parseInt(parts[0]);
    roosterState.coaches = data.coaches || {};
    roosterState.balie = data.balie || {};
    roosterState.absences = data.absences || {};
    roosterState.absenceTexts = data.absenceTexts || {};
    roosterState.allCoaches = data.allCoaches || [...ROOSTER_KNOWN_COACHES];
    roosterState.allBalie = data.allBalie || [...ROOSTER_KNOWN_BALIE];
    roosterState.coachSlots = data.coachSlots || [...ROOSTER_COACH_SLOTS];
    roosterState.slotHistory = {};
    // Restore slotHistory as Sets
    if (data.slotHistory) {
        for (const [slot, names] of Object.entries(data.slotHistory)) {
            roosterState.slotHistory[slot] = new Set(names);
        }
    }
    roosterState.loaded = true;
}

// --- Show workspace ---
function roosterShowWorkspace() {
    document.getElementById('roosterWorkspace').style.display = '';
    document.getElementById('roosterLoading').style.display = 'none';
    document.getElementById('roosterError').style.display = 'none';
    const sidebarChat = document.getElementById('roosterSidebarChat');
    if (sidebarChat) sidebarChat.style.display = '';
}

// --- Load from Notion ---
document.getElementById('roosterLoadNotionBtn')?.addEventListener('click', async () => {
    const month = parseInt(document.getElementById('roosterMonth').value);
    const year = parseInt(document.getElementById('roosterYear').value);
    const monthKey = roosterMonthKey();

    // Warn if draft already exists
    if (roosterState.loaded) {
        if (!confirm('Er is al een concept voor deze maand. Overschrijven met data uit Notion?')) return;
    }

    const loading = document.getElementById('roosterLoading');
    const errorEl = document.getElementById('roosterError');
    loading.style.display = 'flex';
    errorEl.style.display = 'none';

    try {
        await nbFetchAllData();
        const mName = ROOSTER_MONTHS_EN[month - 1];
        const [coachTables, balieTables] = await Promise.all([
            nbFetchMonthSchedule(nbCache.coaches, nbCache.coachPages || [], 'coaches', mName),
            nbFetchMonthSchedule(nbCache.balie, nbCache.baliePages || [], 'balie', mName)
        ]);

        if (!coachTables && !balieTables) {
            loading.style.display = 'none';
            // Show option to create empty or copy from previous month
            roosterShowNoNotionOptions(month, year);
            return;
        }

        roosterParseNotionData(coachTables, balieTables, month, year);
        loading.style.display = 'none';
        roosterShowWorkspace();
        roosterRenderAll();
        roosterUpdateStatus('unsaved', 'Niet opgeslagen');
        roosterToast('Rooster geladen uit Notion', 'success');
        // Auto-save immediately
        roosterSaveDraft();
    } catch (err) {
        loading.style.display = 'none';
        // Network/other errors also show options
        roosterShowNoNotionOptions(month, year, err.message);
        console.error('Rooster load error:', err);
    }
});

// --- Show options when Notion has no data for this month ---
async function roosterShowNoNotionOptions(month, year, errMsg) {
    const errorEl = document.getElementById('roosterError');
    const loading = document.getElementById('roosterLoading');
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevName = ROOSTER_MONTHS_NL[prevMonth - 1] + ' ' + prevYear;
    const monthName = ROOSTER_MONTHS_NL[month - 1] + ' ' + year;

    // First: try loading previous month from Notion automatically
    loading.style.display = 'flex';
    loading.querySelector('span').textContent = 'Vorige maand laden uit Notion als basis...';
    errorEl.style.display = 'none';

    try {
        const prevMName = ROOSTER_MONTHS_EN[prevMonth - 1];
        const [prevCoachTables, prevBalieTables] = await Promise.all([
            nbFetchMonthSchedule(nbCache.coaches, nbCache.coachPages || [], 'coaches', prevMName),
            nbFetchMonthSchedule(nbCache.balie, nbCache.baliePages || [], 'balie', prevMName)
        ]);

        if (prevCoachTables || prevBalieTables) {
            // Parse previous month data into a temporary state
            const tmpState = { ...roosterState };
            roosterParseNotionData(prevCoachTables, prevBalieTables, prevMonth, prevYear);
            const prevData = {
                coaches: roosterState.coaches,
                balie: roosterState.balie,
                allCoaches: roosterState.allCoaches,
                allBalie: roosterState.allBalie,
                coachSlots: roosterState.coachSlots,
                slotHistory: roosterState.slotHistory
            };
            // Convert slotHistory Sets to arrays for copy function
            const prevDraftForCopy = { ...prevData };
            const sh = {};
            for (const [slot, names] of Object.entries(prevData.slotHistory || {})) {
                sh[slot] = names instanceof Set ? [...names] : (names || []);
            }
            prevDraftForCopy.slotHistory = sh;

            // Now copy to new month
            roosterCopyFromPrevMonth(prevDraftForCopy, month, year);
            loading.style.display = 'none';
            roosterShowWorkspace();
            roosterRenderAll();
            roosterUpdateStatus('unsaved', 'Niet opgeslagen');
            roosterToast(monthName + ' aangemaakt op basis van ' + prevName, 'success');
            roosterSaveDraft();
            return;
        }
    } catch (e) {
        console.log('Previous month also not found in Notion:', e);
    }

    loading.style.display = 'none';

    // Fallback: show manual options
    let html = `<div style="text-align:center;padding:24px;">
        <div style="font-size:48px;margin-bottom:12px;">📋</div>
        <h3 style="margin:0 0 8px;">Geen Notion-data voor ${monthName} of ${prevName}</h3>
        <p style="color:var(--text-secondary);margin:0 0 20px;">Maak een leeg rooster aan en vul het handmatig in.</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button class="btn-primary" id="roosterCreateEmpty" style="padding:10px 20px;">
                ➕ Leeg rooster maken
            </button>
        </div></div>`;

    errorEl.innerHTML = html;
    errorEl.style.display = '';

    document.getElementById('roosterCreateEmpty')?.addEventListener('click', () => {
        roosterCreateEmpty(month, year);
        errorEl.style.display = 'none';
        roosterShowWorkspace();
        roosterRenderAll();
        roosterUpdateStatus('unsaved', 'Niet opgeslagen');
        roosterToast('Leeg rooster aangemaakt', 'success');
        roosterSaveDraft();
    });
}

// --- Helper: get all Date objects for a month ---
function roosterAllDatesInMonth(month, year) {
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(year, month - 1, day));
    }
    return dates;
}

// --- Copy from previous month (shift dates to new month) ---
function roosterCopyFromPrevMonth(prevDraft, month, year) {
    roosterState.month = month;
    roosterState.year = year;
    roosterState.allCoaches = prevDraft.allCoaches || [...ROOSTER_KNOWN_COACHES];
    roosterState.allBalie = prevDraft.allBalie || [...ROOSTER_KNOWN_BALIE];
    roosterState.coachSlots = prevDraft.coachSlots || [...ROOSTER_COACH_SLOTS];
    roosterState.absences = {};
    roosterState.absenceTexts = {};

    const prevCoaches = prevDraft.coaches || {};
    const prevBalie = prevDraft.balie || {};

    // Build a template: for each day-of-week + slot, find the most common assignment
    const coachTemplate = {};
    const balieTemplate = {};
    for (const [dateStr, slots] of Object.entries(prevCoaches)) {
        const d = new Date(dateStr + 'T00:00:00');
        const dow = d.getDay();
        if (!coachTemplate[dow]) coachTemplate[dow] = {};
        if (typeof slots === 'object' && slots) {
            for (const [slot, name] of Object.entries(slots)) {
                if (!name) continue;
                if (!coachTemplate[dow][slot]) coachTemplate[dow][slot] = {};
                coachTemplate[dow][slot][name] = (coachTemplate[dow][slot][name] || 0) + 1;
            }
        }
    }
    for (const [dateStr, name] of Object.entries(prevBalie)) {
        if (!name) continue;
        const d = new Date(dateStr + 'T00:00:00');
        const dow = d.getDay();
        if (!balieTemplate[dow]) balieTemplate[dow] = {};
        balieTemplate[dow][name] = (balieTemplate[dow][name] || 0) + 1;
    }

    // Apply template to new month
    roosterState.coaches = {};
    roosterState.balie = {};
    const allDates = roosterAllDatesInMonth(month, year);
    for (const d of allDates) {
        const dateStr = roosterDateStr(d);
        const dow = d.getDay();
        // Coaches
        if (ROOSTER_COACH_DAYS.includes(dow)) {
            roosterState.coaches[dateStr] = {};
            if (coachTemplate[dow]) {
                for (const slot of roosterState.coachSlots) {
                    if (coachTemplate[dow][slot]) {
                        const best = Object.entries(coachTemplate[dow][slot]).sort((a, b) => b[1] - a[1])[0];
                        if (best) roosterState.coaches[dateStr][slot] = best[0];
                    }
                }
            }
        }
        // Balie
        if (ROOSTER_BALIE_DAYS.includes(dow)) {
            if (balieTemplate[dow]) {
                const best = Object.entries(balieTemplate[dow]).sort((a, b) => b[1] - a[1])[0];
                roosterState.balie[dateStr] = best ? best[0] : '';
            } else {
                roosterState.balie[dateStr] = '';
            }
        }
    }

    roosterState.slotHistory = {};
    if (prevDraft.slotHistory) {
        for (const [slot, names] of Object.entries(prevDraft.slotHistory)) {
            roosterState.slotHistory[slot] = new Set(Array.isArray(names) ? names : []);
        }
    }
    roosterState.loaded = true;
}

// --- Create empty roster ---
function roosterCreateEmpty(month, year) {
    roosterState.month = month;
    roosterState.year = year;
    roosterState.coaches = {};
    roosterState.balie = {};
    roosterState.absences = {};
    roosterState.absenceTexts = {};
    roosterState.allCoaches = [...ROOSTER_KNOWN_COACHES];
    roosterState.allBalie = [...ROOSTER_KNOWN_BALIE];
    roosterState.coachSlots = [...ROOSTER_COACH_SLOTS];
    roosterState.slotHistory = {};

    const allDates = roosterAllDatesInMonth(month, year);
    for (const d of allDates) {
        const dateStr = roosterDateStr(d);
        const dow = d.getDay();
        if (ROOSTER_COACH_DAYS.includes(dow)) {
            roosterState.coaches[dateStr] = {};
        }
        if (ROOSTER_BALIE_DAYS.includes(dow)) {
            roosterState.balie[dateStr] = '';
        }
    }
    roosterState.loaded = true;
}

// --- Manual save button ---
document.getElementById('roosterSaveBtn')?.addEventListener('click', () => {
    if (!roosterState.loaded) {
        roosterToast('Geen rooster om op te slaan', 'error');
        return;
    }
    clearTimeout(roosterAutoSaveTimer);
    roosterSaveDraft();
});

// --- Parse Notion tables into roosterState ---
function roosterParseNotionData(coachTables, balieTables, month, year) {
    roosterState.month = month;
    roosterState.year = year;
    roosterState.coaches = {};
    roosterState.balie = {};
    roosterState.absences = {};
    roosterState.absenceTexts = {};
    roosterState.loaded = true;

    const allCoachNames = new Set(ROOSTER_KNOWN_COACHES);
    const allBalieNames = new Set(ROOSTER_KNOWN_BALIE);
    const slotOrder = [];
    const slotHistoryMap = {};

    if (coachTables) {
        for (const table of coachTables) {
            let i = 0;
            while (i < table.length) {
                const row = table[i];
                const dates = [];
                for (let c = 1; c < row.length; c++) {
                    const cell = (row[c] || '').trim();
                    if (!cell) continue;
                    const parsed = roosterParseDateCell(cell, month, year);
                    if (parsed) dates.push({ col: c, date: parsed });
                }
                if (dates.length === 0) { i++; continue; }
                i++; // skip day name row
                if (i >= table.length) break;
                i++;
                while (i < table.length) {
                    const slotRow = table[i];
                    if (slotRow.every(c => !(c || '').trim())) { i++; break; }
                    const slotName = (slotRow[0] || '').trim();
                    if (slotName && !slotOrder.includes(slotName)) slotOrder.push(slotName);
                    if (slotName && !slotHistoryMap[slotName]) slotHistoryMap[slotName] = new Set();
                    for (const { col, date } of dates) {
                        const name = (slotRow[col] || '').trim();
                        if (name && slotName) {
                            const dateStr = roosterDateStr(date);
                            if (!roosterState.coaches[dateStr]) roosterState.coaches[dateStr] = {};
                            roosterState.coaches[dateStr][slotName] = name;
                            allCoachNames.add(name);
                            slotHistoryMap[slotName].add(name);
                        }
                    }
                    i++;
                }
            }
        }
    }

    if (balieTables) {
        for (const table of balieTables) {
            let i = 0;
            while (i < table.length) {
                const row = table[i];
                const dates = [];
                for (let c = 1; c < row.length; c++) {
                    const cell = (row[c] || '').trim();
                    if (!cell) continue;
                    const parsed = roosterParseDateCell(cell, month, year);
                    if (parsed) dates.push({ col: c, date: parsed });
                }
                if (dates.length === 0) { i++; continue; }
                i++; // skip day name row
                if (i >= table.length) break;
                i++;
                if (i < table.length) {
                    const personRow = table[i];
                    for (const { col, date } of dates) {
                        const name = (personRow[col] || '').trim();
                        if (name) {
                            const dateStr = roosterDateStr(date);
                            roosterState.balie[dateStr] = name;
                            allBalieNames.add(name);
                        }
                    }
                    i++;
                }
                if (i < table.length && table[i].every(c => !(c || '').trim())) i++;
            }
        }
    }

    roosterState.allCoaches = [...allCoachNames].sort();
    roosterState.allBalie = [...allBalieNames].sort();
    roosterState.coachSlots = slotOrder.length > 0 ? slotOrder : [...ROOSTER_COACH_SLOTS];
    roosterState.slotHistory = slotHistoryMap;
}

function roosterParseDateCell(cell, month, year) {
    const m = cell.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (m) {
        const day = parseInt(m[1]);
        const mon = parseInt(m[2]);
        if (mon === month) return new Date(year, month - 1, day);
    }
    return null;
}

function roosterDateStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function roosterFormatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.getDate() + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

function roosterGetDayName(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return ROOSTER_DAYS_SHORT[d.getDay()];
}

// --- Get all dates for the month, grouped by week ---
function roosterGetMonthDates(daysOfWeek) {
    if (!roosterState.month || !roosterState.year) return [];
    const year = roosterState.year;
    const month = roosterState.month;
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month - 1, day);
        if (daysOfWeek.includes(d.getDay())) {
            dates.push(roosterDateStr(d));
        }
    }
    return dates;
}

// Build full calendar weeks with fixed columns per day-of-week.
// Each week is an array of {date, dow} where date is null if outside the month.
// daysOfWeek is sorted as columns should appear (e.g. [1,2,3,4,5,6] for Mon-Sat).
function roosterGetFullWeeks(daysOfWeek) {
    if (!roosterState.month || !roosterState.year) return [];
    const year = roosterState.year;
    const month = roosterState.month; // 1-based
    const daysInMonth = new Date(year, month, 0).getDate();

    // Sort daysOfWeek in Mon-first order: 1,2,3,4,5,6,0
    const sortOrder = [1, 2, 3, 4, 5, 6, 0];
    const sortedDows = [...daysOfWeek].sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b));

    // Find all calendar weeks that overlap with this month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month - 1, daysInMonth);

    // Get Monday of the week containing the 1st
    const firstMonday = new Date(firstDay);
    const dow1 = firstDay.getDay();
    firstMonday.setDate(firstDay.getDate() - ((dow1 + 6) % 7));

    // Get Monday of the week containing the last day
    const lastMonday = new Date(lastDay);
    const dowLast = lastDay.getDay();
    lastMonday.setDate(lastDay.getDate() - ((dowLast + 6) % 7));

    const weeks = [];
    let monday = new Date(firstMonday);

    while (monday <= lastMonday) {
        const week = [];
        for (const dow of sortedDows) {
            // Calculate the date for this day-of-week in this week
            const offset = (dow + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
            const d = new Date(monday);
            d.setDate(monday.getDate() + offset);

            if (d.getMonth() === month - 1 && d.getFullYear() === year) {
                week.push({ date: roosterDateStr(d), dow });
            } else {
                week.push({ date: null, dow });
            }
        }
        // Only include week if at least one day is in the month
        if (week.some(w => w.date !== null)) {
            weeks.push(week);
        }
        monday.setDate(monday.getDate() + 7);
    }
    return weeks;
}

function roosterGroupByWeek(dates) {
    const weeks = [];
    let currentWeek = [];
    let lastMonday = null;
    for (const d of dates) {
        const date = new Date(d + 'T00:00:00');
        const day = date.getDay();
        const monday = new Date(date);
        monday.setDate(date.getDate() - ((day + 6) % 7));
        const mondayStr = roosterDateStr(monday);
        if (lastMonday !== null && mondayStr !== lastMonday) {
            if (currentWeek.length > 0) weeks.push(currentWeek);
            currentWeek = [];
        }
        currentWeek.push(d);
        lastMonday = mondayStr;
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);
    return weeks;
}

function roosterGetWeekNumber(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d - jan1) / 86400000);
    return Math.ceil((days + jan1.getDay() + 1) / 7);
}

// --- Render everything ---
function roosterRenderAll() {
    roosterRenderCoachGrid();
    roosterRenderBalieGrid();
    roosterCalcHours();
    roosterBuildAbsenceList();
}

// --- Tab switching ---
document.getElementById('roosterTabCoaches')?.addEventListener('click', () => roosterSwitchTab('coaches'));
document.getElementById('roosterTabBalie')?.addEventListener('click', () => roosterSwitchTab('balie'));

function roosterSwitchTab(tab) {
    roosterActiveTab = tab;
    document.querySelectorAll('.rooster-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('roosterPanelCoaches').style.display = tab === 'coaches' ? '' : 'none';
    document.getElementById('roosterPanelBalie').style.display = tab === 'balie' ? '' : 'none';
}

// --- Sidebar toggle ---
document.getElementById('roosterSidebarToggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('roosterSidebar');
    sidebar.classList.toggle('collapsed');
});

// --- Coaches Grid ---
function roosterRenderCoachGrid() {
    const wrap = document.getElementById('roosterCoachGrid');
    if (!roosterState.loaded) return;

    const weeks = roosterGetFullWeeks(ROOSTER_COACH_DAYS);

    if (weeks.length === 0) {
        wrap.innerHTML = '<p class="rooster-empty">Geen data voor deze maand</p>';
        return;
    }

    let html = '';
    weeks.forEach((weekSlots, wi) => {
        const activeDates = weekSlots.filter(s => s.date).map(s => s.date);
        const weekLabel = 'Week ' + (wi + 1);
        const dateRange = activeDates.length > 0
            ? roosterFormatDateShort(activeDates[0]) + ' - ' + roosterFormatDateShort(activeDates[activeDates.length - 1])
            : '';

        html += `<div class="rooster-week-block">
            <div class="rooster-week-header"><span class="rooster-week-label">${weekLabel}</span><span class="rooster-week-range">${dateRange}</span></div>
            <div class="rooster-grid-wrap"><table class="rooster-table"><thead><tr><th class="rooster-th-slot">Slot</th>`;

        for (const s of weekSlots) {
            if (s.date) {
                html += `<th class="rooster-th-date"><div>${roosterGetDayName(s.date)}</div><div>${roosterFormatDateShort(s.date)}</div></th>`;
            } else {
                html += `<th class="rooster-th-date rooster-th-disabled"><div>${ROOSTER_DAYS_SHORT[s.dow]}</div><div>—</div></th>`;
            }
        }
        html += '</tr></thead><tbody>';

        for (const slot of roosterState.coachSlots) {
            html += `<tr><td class="rooster-td-slot">${slot}</td>`;
            for (const s of weekSlots) {
                if (s.date) {
                    const name = (roosterState.coaches[s.date] || {})[slot] || '';
                    const absent = name && roosterIsAbsent(name, s.date);
                    const empty = !name;
                    let cls = 'rooster-cell';
                    if (absent) cls += ' rooster-cell-absent';
                    else if (empty) cls += ' rooster-cell-empty';
                    else cls += ' rooster-cell-ok';
                    html += `<td class="${cls}" data-date="${s.date}" data-slot="${slot}" data-type="coach">${name || ''}</td>`;
                } else {
                    html += `<td class="rooster-cell rooster-cell-disabled"></td>`;
                }
            }
            html += '</tr>';
        }
        html += '</tbody></table></div></div>';
    });

    wrap.innerHTML = html;

    // Bind click on cells (only active ones)
    wrap.querySelectorAll('.rooster-cell:not(.rooster-cell-disabled)').forEach(cell => {
        cell.addEventListener('click', (e) => { e.stopPropagation(); roosterCellClick(cell); });
    });
}

// --- Balie Grid ---
function roosterRenderBalieGrid() {
    const wrap = document.getElementById('roosterBalieGrid');
    if (!roosterState.loaded) return;

    const weeks = roosterGetFullWeeks(ROOSTER_BALIE_DAYS);

    if (weeks.length === 0) {
        wrap.innerHTML = '<p class="rooster-empty">Geen data voor deze maand</p>';
        return;
    }

    let html = '';
    weeks.forEach((weekSlots, wi) => {
        const activeDates = weekSlots.filter(s => s.date).map(s => s.date);
        const weekLabel = 'Week ' + (wi + 1);
        const dateRange = activeDates.length > 0
            ? roosterFormatDateShort(activeDates[0]) + ' - ' + roosterFormatDateShort(activeDates[activeDates.length - 1])
            : '';

        html += `<div class="rooster-week-block">
            <div class="rooster-week-header"><span class="rooster-week-label">${weekLabel}</span><span class="rooster-week-range">${dateRange}</span></div>
            <div class="rooster-grid-wrap"><table class="rooster-table"><thead><tr>`;

        for (const s of weekSlots) {
            if (s.date) {
                html += `<th class="rooster-th-date"><div>${roosterGetDayName(s.date)}</div><div>${roosterFormatDateShort(s.date)}</div></th>`;
            } else {
                html += `<th class="rooster-th-date rooster-th-disabled"><div>${ROOSTER_DAYS_SHORT[s.dow]}</div><div>—</div></th>`;
            }
        }
        html += '</tr></thead><tbody><tr>';

        for (const s of weekSlots) {
            if (s.date) {
                const name = roosterState.balie[s.date] || '';
                const absent = name && roosterIsAbsent(name, s.date);
                const empty = !name;
                let cls = 'rooster-cell';
                if (absent) cls += ' rooster-cell-absent';
                else if (empty) cls += ' rooster-cell-empty';
                else cls += ' rooster-cell-ok';
                html += `<td class="${cls}" data-date="${s.date}" data-type="balie">${name || ''}</td>`;
            } else {
                html += `<td class="rooster-cell rooster-cell-disabled"></td>`;
            }
        }

        html += '</tr></tbody></table></div></div>';
    });

    wrap.innerHTML = html;

    wrap.querySelectorAll('.rooster-cell:not(.rooster-cell-disabled)').forEach(cell => {
        cell.addEventListener('click', (e) => { e.stopPropagation(); roosterCellClick(cell); });
    });

    // Show hours card
    const hoursCard = document.getElementById('roosterHoursCard');
    if (hoursCard) hoursCard.style.display = '';
}

// --- Cell Edit Dropdown ---
function roosterCellClick(cell) {
    const dropdown = document.getElementById('roosterDropdown');
    const list = document.getElementById('roosterDropdownList');
    const input = document.getElementById('roosterDropdownInput');
    const dateStr = cell.dataset.date;
    const slot = cell.dataset.slot;
    const type = cell.dataset.type;

    let suggestions = [];
    if (type === 'coach' && slot) {
        const history = roosterState.slotHistory[slot];
        if (history) suggestions = [...history].sort();
        for (const c of roosterState.allCoaches) {
            if (!suggestions.includes(c)) suggestions.push(c);
        }
    } else {
        suggestions = [...roosterState.allBalie];
    }

    suggestions = suggestions.map(name => ({
        name,
        absent: roosterIsAbsent(name, dateStr),
        current: cell.textContent.trim() === name
    }));

    list.innerHTML = suggestions.map(s => {
        const cls = s.current ? 'rooster-dd-item current' : (s.absent ? 'rooster-dd-item absent' : 'rooster-dd-item');
        const badge = s.absent ? ' <span class="rooster-dd-absent-badge">afwezig</span>' : '';
        return `<div class="${cls}" data-name="${s.name}">${s.name}${badge}</div>`;
    }).join('');

    // Also add "Leeg" option to clear cell
    list.innerHTML = `<div class="rooster-dd-item rooster-dd-clear" data-name="">— Leeg —</div>` + list.innerHTML;

    const rect = cell.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const dropdownH = 320;
    // Position below or above depending on space
    if (rect.bottom + dropdownH > viewportH) {
        dropdown.style.top = (rect.top + window.scrollY - dropdownH - 4) + 'px';
    } else {
        dropdown.style.top = (rect.bottom + window.scrollY + 4) + 'px';
    }
    dropdown.style.left = Math.max(0, rect.left + window.scrollX) + 'px';
    dropdown.style.display = '';
    input.value = '';
    dropdown._targetCell = cell;

    list.querySelectorAll('.rooster-dd-item').forEach(item => {
        item.addEventListener('click', () => {
            roosterApplyCellEdit(cell, item.dataset.name);
            dropdown.style.display = 'none';
        });
    });
}

document.getElementById('roosterDropdownSave')?.addEventListener('click', () => {
    const dropdown = document.getElementById('roosterDropdown');
    const input = document.getElementById('roosterDropdownInput');
    const cell = dropdown._targetCell;
    if (cell && input.value.trim()) {
        roosterApplyCellEdit(cell, input.value.trim());
    }
    dropdown.style.display = 'none';
});

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('roosterDropdown');
    if (dropdown && dropdown.style.display !== 'none') {
        if (!dropdown.contains(e.target) && !e.target.classList.contains('rooster-cell')) {
            dropdown.style.display = 'none';
        }
    }
});

// Close dropdown on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const dropdown = document.getElementById('roosterDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
});

function roosterApplyCellEdit(cell, newName) {
    const dateStr = cell.dataset.date;
    const slot = cell.dataset.slot;
    const type = cell.dataset.type;

    if (type === 'coach' && slot) {
        if (!roosterState.coaches[dateStr]) roosterState.coaches[dateStr] = {};
        if (newName) {
            roosterState.coaches[dateStr][slot] = newName;
        } else {
            delete roosterState.coaches[dateStr][slot];
        }
    } else if (type === 'balie') {
        if (newName) {
            roosterState.balie[dateStr] = newName;
        } else {
            delete roosterState.balie[dateStr];
        }
    }

    cell.textContent = newName || '';
    const absent = newName && roosterIsAbsent(newName, dateStr);
    cell.className = 'rooster-cell';
    if (absent) cell.classList.add('rooster-cell-absent');
    else if (!newName) cell.classList.add('rooster-cell-empty');
    else cell.classList.add('rooster-cell-ok');

    // Recalculate hours if balie changed
    if (type === 'balie') roosterCalcHours();

    roosterScheduleAutoSave();
}

// --- Absence helpers ---
function roosterIsAbsent(name, dateStr) {
    return (roosterState.absences[name] || []).includes(dateStr);
}

function roosterParseAbsenceText(text, month, year) {
    if (!text) return [];
    const dates = [];
    const monthStr = ROOSTER_MONTHS_NL[month - 1];
    let cleaned = text.toLowerCase()
        .replace(new RegExp(monthStr, 'g'), '')
        .replace(/januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december/g, '');
    cleaned = cleaned.replace(/\ben\b/g, ',');
    const numbers = cleaned.match(/\d+/g);
    if (numbers) {
        for (const num of numbers) {
            const day = parseInt(num);
            if (day >= 1 && day <= 31) {
                const d = new Date(year, month - 1, day);
                if (d.getMonth() === month - 1) {
                    dates.push(roosterDateStr(d));
                }
            }
        }
    }
    const datePatterns = text.match(/(\d{1,2})[\/\-](\d{1,2})/g);
    if (datePatterns) {
        for (const pat of datePatterns) {
            const m = pat.match(/(\d{1,2})[\/\-](\d{1,2})/);
            if (m) {
                const day = parseInt(m[1]);
                const mon = parseInt(m[2]);
                if (mon === month && day >= 1 && day <= 31) {
                    const dateStr = roosterDateStr(new Date(year, month - 1, day));
                    if (!dates.includes(dateStr)) dates.push(dateStr);
                }
            }
        }
    }
    return [...new Set(dates)].sort();
}

// --- Sidebar: Absence list ---
function roosterBuildAbsenceList() {
    const wrap = document.getElementById('roosterAbsenceList');
    if (!wrap) return;

    let html = '<div class="rooster-absence-group"><h4 class="rooster-absence-group-title">Coaches</h4>';
    for (const name of roosterState.allCoaches) {
        html += roosterAbsenceRow(name, 'coach');
    }
    html += '</div><div class="rooster-absence-group"><h4 class="rooster-absence-group-title">Balie</h4>';
    for (const name of roosterState.allBalie) {
        html += roosterAbsenceRow(name, 'balie');
    }
    html += '</div>';
    wrap.innerHTML = html;

    // Restore text values and bind events
    wrap.querySelectorAll('.rooster-absence-input').forEach(input => {
        const name = input.dataset.name;
        if (roosterState.absenceTexts[name]) {
            input.value = roosterState.absenceTexts[name];
            roosterUpdateAbsencePills(input);
        }
        input.addEventListener('input', () => {
            roosterState.absenceTexts[name] = input.value;
            roosterUpdateAbsencePills(input);
            // Re-render grids to show absence highlighting
            roosterRenderCoachGrid();
            roosterRenderBalieGrid();
            roosterScheduleAutoSave();
        });
    });
}

function roosterAbsenceRow(name, type) {
    const id = 'absence_' + type + '_' + name.replace(/[^a-zA-Z0-9]/g, '_');
    return `<div class="rooster-absence-row">
        <div class="rooster-absence-name">${name}</div>
        <div class="rooster-absence-field">
            <input type="text" class="rooster-absence-input" id="${id}" data-name="${name}"
                   placeholder="bijv. 3 en 7, of 5, 12, 19">
            <div class="rooster-absence-pills" id="${id}_pills"></div>
        </div>
    </div>`;
}

function roosterUpdateAbsencePills(input) {
    const name = input.dataset.name;
    const text = input.value.trim();
    const pillsEl = document.getElementById(input.id + '_pills');
    if (!pillsEl) return;
    const dates = roosterParseAbsenceText(text, roosterState.month, roosterState.year);
    roosterState.absences[name] = dates;
    pillsEl.innerHTML = dates.map(d => {
        return `<span class="rooster-pill">${roosterGetDayName(d)} ${roosterFormatDateShort(d)}</span>`;
    }).join('');
}

// --- Hours Calculation ---
function roosterCalcHours() {
    const wrap = document.getElementById('roosterHoursTable');
    if (!wrap) return;
    const hours = {};

    for (const [dateStr, name] of Object.entries(roosterState.balie)) {
        if (!name) continue;
        if (!hours[name]) hours[name] = { total: 0, days: {} };
        const d = new Date(dateStr + 'T00:00:00');
        const dow = d.getDay();
        const h = ROOSTER_BALIE_HOURS[dow] || 0;
        hours[name].total += h;
        hours[name].days[dow] = (hours[name].days[dow] || 0) + 1;
    }

    const dayLabels = { 1: 'Ma', 2: 'Di', 3: 'Wo', 4: 'Do', 5: 'Vr', 0: 'Zo', 6: 'Za' };
    const activeDays = [1, 2, 3, 4, 5, 0];

    let html = '<table class="rooster-table rooster-hours-table"><thead><tr><th>Naam</th>';
    for (const dow of activeDays) {
        html += `<th>${dayLabels[dow]} (${ROOSTER_BALIE_HOURS[dow]}u)</th>`;
    }
    html += '<th class="rooster-hours-total">Totaal</th></tr></thead><tbody>';

    const sorted = Object.entries(hours).sort((a, b) => a[0].localeCompare(b[0]));
    if (sorted.length === 0) {
        html += '<tr><td colspan="' + (activeDays.length + 2) + '" style="text-align:center;color:var(--text-muted);">Nog geen balie data</td></tr>';
    }
    for (const [name, data] of sorted) {
        html += `<tr><td class="rooster-td-slot">${name}</td>`;
        for (const dow of activeDays) {
            const count = data.days[dow] || 0;
            html += `<td>${count > 0 ? count + 'x' : ''}</td>`;
        }
        html += `<td class="rooster-hours-total"><strong>${data.total.toFixed(1)} uur</strong></td></tr>`;
    }

    html += '</tbody></table>';
    wrap.innerHTML = html;
}

// --- HTML Export ---
function roosterGenerateHtml() {
    const mName = ROOSTER_MONTHS_NL[roosterState.month - 1];
    const title = 'Rooster ' + mName + ' ' + roosterState.year;

    let html = `<!DOCTYPE html><html><head><style>
body { font-family: 'Inter', Arial, sans-serif; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 20px; }
h2 { text-align: center; color: #1e293b; }
h3 { color: #334155; margin-top: 24px; margin-bottom: 8px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center; }
th { background: #f1f5f9; font-weight: 600; color: #334155; }
td:first-child { text-align: left; font-weight: 500; }
</style></head><body>`;

    html += `<h2>${title}</h2>`;

    // Coaches
    const coachDates = roosterGetMonthDates(ROOSTER_COACH_DAYS);
    if (coachDates.length > 0) {
        html += '<h3>Coaches</h3>';
        const weeks = roosterGroupByWeek(coachDates);
        for (const weekDates of weeks) {
            html += '<table><thead><tr><th></th>';
            for (const d of weekDates) html += `<th>${roosterGetDayName(d)} ${roosterFormatDateShort(d)}</th>`;
            html += '</tr></thead><tbody>';
            for (const slot of roosterState.coachSlots) {
                const hasData = weekDates.some(d => (roosterState.coaches[d] || {})[slot]);
                if (!hasData) continue;
                html += `<tr><td>${slot}</td>`;
                for (const d of weekDates) html += `<td>${(roosterState.coaches[d] || {})[slot] || ''}</td>`;
                html += '</tr>';
            }
            html += '</tbody></table>';
        }
    }

    // Balie
    const balieDates = roosterGetMonthDates(ROOSTER_BALIE_DAYS);
    if (balieDates.length > 0) {
        html += '<h3>Balie</h3>';
        const weeks = roosterGroupByWeek(balieDates);
        for (const weekDates of weeks) {
            html += '<table><thead><tr>';
            for (const d of weekDates) html += `<th>${roosterGetDayName(d)} ${roosterFormatDateShort(d)}</th>`;
            html += '</tr></thead><tbody><tr>';
            for (const d of weekDates) html += `<td>${roosterState.balie[d] || ''}</td>`;
            html += '</tr></tbody></table>';
        }
    }

    // Hours
    html += '<h3>Balie Uren</h3>';
    const hours = {};
    for (const [dateStr, name] of Object.entries(roosterState.balie)) {
        if (!name) continue;
        if (!hours[name]) hours[name] = 0;
        const d = new Date(dateStr + 'T00:00:00');
        hours[name] += ROOSTER_BALIE_HOURS[d.getDay()] || 0;
    }
    html += '<table><thead><tr><th>Naam</th><th>Uren</th></tr></thead><tbody>';
    for (const [name, total] of Object.entries(hours).sort((a, b) => a[0].localeCompare(b[0]))) {
        html += `<tr><td>${name}</td><td>${total.toFixed(1)}</td></tr>`;
    }
    html += '</tbody></table></body></html>';
    return html;
}

// Copy HTML button
document.getElementById('roosterCopyHtml')?.addEventListener('click', () => {
    if (!roosterState.loaded) { roosterToast('Geen rooster om te kopieren', 'error'); return; }
    const html = roosterGenerateHtml();
    navigator.clipboard.writeText(html).then(() => {
        roosterToast('HTML gekopieerd naar klembord', 'success');
    }).catch(() => {
        roosterToast('Kopieer mislukt', 'error');
    });
});

// Send to Notion (placeholder)
document.getElementById('roosterSendNotion')?.addEventListener('click', () => {
    roosterToast('Rooster verzenden naar Notion is nog niet beschikbaar', 'info');
});

// --- ROOSTER AI CHAT ---
(function roosterChatInit() {
    const roosterChatMessages = document.getElementById('roosterChatMessages');
    const roosterChatInput = document.getElementById('roosterChatInput');
    const roosterChatSendBtn = document.getElementById('roosterChatSend');

    if (!roosterChatMessages || !roosterChatInput) return;

    // Conversation history for context
    let chatHistory = [];

    function roosterChatAddMsg(text, type) {
        const div = document.createElement('div');
        div.className = 'rooster-chat-msg rooster-chat-' + type.split(' ')[0];
        if (type.includes('typing')) div.classList.add('rooster-chat-typing');
        if (type.includes('error')) div.classList.add('rooster-chat-error');
        div.innerHTML = text.replace(/\n/g, '<br>');
        roosterChatMessages.appendChild(div);
        roosterChatMessages.scrollTop = roosterChatMessages.scrollHeight;
        return div;
    }

    // Map Dutch weekday names to JS day numbers (0=Sun, 1=Mon, ...)
    const WEEKDAY_MAP = {
        'maandag': 1, 'dinsdag': 2, 'woensdag': 3, 'donderdag': 4,
        'vrijdag': 5, 'zaterdag': 6, 'zondag': 0
    };

    // Get all dates in the month for a given day-of-week
    function getDatesForWeekday(dow) {
        if (!roosterState.month || !roosterState.year) return [];
        const dates = [];
        const daysInMonth = new Date(roosterState.year, roosterState.month, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const dt = new Date(roosterState.year, roosterState.month - 1, d);
            if (dt.getDay() === dow) {
                dates.push(roosterDateStr(dt));
            }
        }
        return dates;
    }

    // Get date string for a specific day number in the month
    function getDateForDayNum(dayNum) {
        if (!roosterState.month || !roosterState.year) return null;
        const dt = new Date(roosterState.year, roosterState.month - 1, dayNum);
        if (dt.getMonth() === roosterState.month - 1) return roosterDateStr(dt);
        return null;
    }

    // Build a weekday summary of the current roster for context
    function buildWeekdaySummary() {
        const days = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
        let summary = '';
        for (const day of days) {
            const dow = WEEKDAY_MAP[day];
            const sampleDates = getDatesForWeekday(dow);
            if (sampleDates.length === 0) continue;
            const sampleDate = sampleDates[0];
            const slots = roosterState.coaches[sampleDate];
            if (!slots) continue;
            summary += day.charAt(0).toUpperCase() + day.slice(1) + ': ';
            const parts = [];
            for (const [slot, name] of Object.entries(slots)) {
                if (name) parts.push(slot + '=' + name);
            }
            summary += parts.join(', ') + '\n';
        }
        // Balie
        const balieDays = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zondag'];
        summary += '\nBalie:\n';
        for (const day of balieDays) {
            const dow = WEEKDAY_MAP[day];
            const sampleDates = getDatesForWeekday(dow);
            if (sampleDates.length === 0) continue;
            const name = roosterState.balie[sampleDates[0]];
            if (name) summary += day.charAt(0).toUpperCase() + day.slice(1) + ': ' + name + '\n';
        }
        return summary;
    }

    // Apply AI changes (weekday-based) to actual dates
    function applyAiChanges(changes) {
        let count = 0;
        for (const change of changes) {
            let targetDates = [];

            if (change.scope === 'specific' && change.dates) {
                // Specific day numbers
                for (const dayNum of change.dates) {
                    const ds = getDateForDayNum(dayNum);
                    if (ds) targetDates.push(ds);
                }
            } else {
                // All matching weekdays in the month
                for (const dayName of (change.days || [])) {
                    const dow = WEEKDAY_MAP[dayName.toLowerCase()];
                    if (dow !== undefined) {
                        targetDates.push(...getDatesForWeekday(dow));
                    }
                }
            }

            for (const dateStr of targetDates) {
                if (change.type === 'coaches' && change.slot) {
                    if (!roosterState.coaches[dateStr]) roosterState.coaches[dateStr] = {};
                    roosterState.coaches[dateStr][change.slot] = change.name || '';
                    count++;
                } else if (change.type === 'balie') {
                    roosterState.balie[dateStr] = change.name || '';
                    count++;
                }
            }
        }
        return count;
    }

    async function roosterChatSend() {
        const msg = roosterChatInput.value.trim();
        if (!msg || !roosterState.loaded) {
            if (!roosterState.loaded) roosterChatAddMsg('Laad eerst een rooster voordat je instructies geeft.', 'ai');
            return;
        }

        roosterChatAddMsg(msg, 'user');
        roosterChatInput.value = '';

        const typing = roosterChatAddMsg('Even denken...', 'ai typing');

        try {
            const resp = await fetch('api/rooster-ai.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                body: JSON.stringify({
                    message: msg,
                    roster: { coaches: roosterState.coaches, balie: roosterState.balie },
                    month: roosterMonthKey(),
                    slots: roosterState.coachSlots,
                    allCoaches: roosterState.allCoaches,
                    allBalie: roosterState.allBalie,
                    weekdaySummary: buildWeekdaySummary(),
                    history: chatHistory.slice(-10)
                })
            });

            typing.remove();

            if (!resp.ok) {
                const errData = await resp.json().catch(() => null);
                throw new Error(errData?.error || 'API fout: ' + resp.status);
            }
            const data = await resp.json();

            if (data.error) {
                roosterChatAddMsg('Fout: ' + data.error, 'ai error');
                return;
            }

            chatHistory.push({ role: 'user', content: msg });

            if (data.changes && data.changes.length > 0) {
                const changeCount = applyAiChanges(data.changes);

                roosterRenderAll();
                roosterScheduleAutoSave();

                const aiMsg = data.message + '\n\n✅ ' + changeCount + ' cel(len) aangepast.';
                roosterChatAddMsg(aiMsg, 'ai');
                chatHistory.push({ role: 'assistant', content: data.message });
            } else {
                roosterChatAddMsg(data.message || 'Geen wijzigingen gemaakt.', 'ai');
                chatHistory.push({ role: 'assistant', content: data.message });
            }
        } catch (e) {
            if (typing.parentNode) typing.remove();
            roosterChatAddMsg('Er ging iets mis: ' + e.message, 'ai error');
        }
    }

    roosterChatSendBtn?.addEventListener('click', roosterChatSend);
    roosterChatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); roosterChatSend(); }
    });
})();
