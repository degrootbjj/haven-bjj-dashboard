// ============================================
// Haven BJJ — Dashboard JavaScript
// ============================================

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
const PAGE_TITLES = { dashboard: 'Dashboard', leden: 'Leden', financien: 'Financiën' };

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
        updateCurrentPage();
        closeSidebar();
    });
});

function updateCurrentPage() {
    const ym = monthSelect.value;
    if (currentPage === 'dashboard') updateDashboard(ym);
    else if (currentPage === 'leden') updateLeden(ym);
    else if (currentPage === 'financien') updateFinancien(ym);
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
const selectableMonths = Object.keys(DASHBOARD_DATA)
    .filter(ym => DASHBOARD_DATA[ym].categories)
    .sort();

// --- Month Selector ---
const monthSelect = document.getElementById('monthSelect');
selectableMonths.forEach(ym => {
    const opt = document.createElement('option');
    opt.value = ym;
    const [y, m] = ym.split('-');
    opt.textContent = MONTH_NAMES[m] + ' ' + y;
    monthSelect.appendChild(opt);
});
monthSelect.value = selectableMonths[selectableMonths.length - 1];

// --- Charts (created once, updated on month change) ---
let revenueChart, donutChart, attendanceChart, financeChart, costDonutChart;

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
    const totalLeden = d.total_real || d.total_members_excel || 0;
    const prevLeden = pd ? (pd.total_real || pd.total_members_excel || 0) : null;
    document.getElementById('kpiLeden').textContent = fmt(totalLeden);
    const ledenDiff = prevLeden != null ? totalLeden - prevLeden : null;
    setChange(document.getElementById('kpiLedenChange'), ledenDiff,
        (ledenDiff > 0 ? '+' : '') + ledenDiff + ' vs vorige maand', false);

    // KPI: Maandomzet
    const omzet = d.total_income;
    document.getElementById('kpiOmzet').textContent = omzet != null ? fmtEuro(omzet) : '—';
    const prevOmzet = pd ? pd.total_income : null;
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

    // Revenue chart — trailing 12 months
    const allSorted = Object.keys(DASHBOARD_DATA).sort();
    const idx = allSorted.indexOf(ym);
    const trailing = allSorted.slice(Math.max(0, idx - 11), idx + 1);
    const labels = trailing.map(m => MONTH_ABBR[m.split('-')[1]]);
    const omzetData = trailing.map(m => {
        const md = DASHBOARD_DATA[m];
        return md && md.total_income ? Math.round(md.total_income) : 0;
    });
    const ledenData = trailing.map(m => {
        const md = DASHBOARD_DATA[m];
        return md ? (md.total_members_excel || md.total_real || 0) : 0;
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
        net != null ? `Netto: ${net > 0 ? '+' : ''}${net} lid${Math.abs(net) !== 1 ? 'en' : ''}` : '',
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

    // Finance bar chart — trailing 12 months
    const allSorted = Object.keys(DASHBOARD_DATA).sort();
    const idx = allSorted.indexOf(ym);
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

// --- Init ---
createCharts();
createAttendanceChart();
createFinanceCharts();
updateDashboard(monthSelect.value);

monthSelect.addEventListener('change', () => {
    updateCurrentPage();
});
