<?php
require_once __DIR__ . '/includes/session.php';
requireAuth();
$csrfToken = getCsrfToken();
$gymName = GYM_NAME;
$currentUser = $_SESSION['user'];

// Load user preferences (theme, avatar)
$prefsFile = DATA_DIR . 'preferences.json';
$userPrefs = [];
if (file_exists($prefsFile)) {
    $allPrefs = json_decode(file_get_contents($prefsFile), true) ?: [];
    $userPrefs = $allPrefs[$currentUser] ?? [];
}
$userTheme = $userPrefs['theme'] ?? 'light';

// Check for avatar
$avatarUrl = '';
$avatarDir = DATA_DIR . 'avatars/';
foreach (['jpg', 'jpeg', 'png', 'webp'] as $ext) {
    $avatarPath = $avatarDir . $currentUser . '.' . $ext;
    if (file_exists($avatarPath)) {
        $avatarUrl = 'data/avatars/' . $currentUser . '.' . $ext . '?t=' . filemtime($avatarPath);
        break;
    }
}
?>
<!DOCTYPE html>
<html lang="nl" data-theme="<?= htmlspecialchars($userTheme) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="<?= htmlspecialchars($csrfToken) ?>">
    <title><?= htmlspecialchars($gymName) ?> — Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css?v=30">
</head>
<body>
    <!-- Sidebar / Mobile Nav -->
    <nav class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <div class="logo">
                <div class="logo-icon">H</div>
                <span class="logo-text">Haven BJJ</span>
            </div>
            <button class="sidebar-close" id="sidebarClose" aria-label="Sluit menu">✕</button>
        </div>
        <ul class="nav-links">
            <li><a href="#" class="nav-link active" data-page="dashboard">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                Dashboard
            </a></li>
            <li><a href="#" class="nav-link" data-page="leden">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Leden
            </a></li>
            <li><a href="#" class="nav-link" data-page="financien">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Financiën
            </a></li>
            <li><a href="#" class="nav-link" data-page="lessen">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Lessen
            </a></li>
            <li><a href="#" class="nav-link" data-page="marketing">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                Marketing
            </a></li>
            <li><a href="#" class="nav-link" data-page="nieuwsbrief">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Crew Briefing
            </a></li>
            <li><a href="#" class="nav-link" data-page="mailnewsletter">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                Newsletter
            </a></li>
            <li><a href="#" class="nav-link" data-page="uploads">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Uploads
            </a></li>
            <li><a href="#" class="nav-link" data-page="simulator">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                Simulator
            </a></li>
            <li><a href="#" class="nav-link" data-page="rooster">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="22"/><line x1="15" y1="4" x2="15" y2="22"/><line x1="3" y1="16" x2="21" y2="16"/></svg>
                Rooster
            </a></li>
            <li><a href="#" class="nav-link" data-page="gyminfo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Gym Info
            </a></li>
        </ul>
        <div class="sidebar-bottom">
            <a href="#" class="nav-link sidebar-account-link" data-page="account">
                <?php if ($avatarUrl): ?>
                    <img src="<?= htmlspecialchars($avatarUrl) ?>" alt="" class="sidebar-avatar" id="sidebarAvatar">
                <?php else: ?>
                    <div class="sidebar-avatar sidebar-avatar-placeholder" id="sidebarAvatar"><?= htmlspecialchars(strtoupper(substr($currentUser, 0, 1))) ?></div>
                <?php endif; ?>
                <span><?= htmlspecialchars(ucfirst($currentUser)) ?></span>
            </a>
            <a href="logout.php" class="sidebar-logout-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Uitloggen
            </a>
        </div>
    </nav>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>

    <!-- Main Content -->
    <main class="main">
        <!-- Top Bar -->
        <header class="topbar">
            <button class="menu-btn" id="menuBtn" aria-label="Open menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div class="topbar-content">
                <div>
                    <h1 class="page-title">Dashboard</h1>
                    <p class="page-subtitle">Haven BJJ — maart 2026</p>
                </div>
                <div class="topbar-actions">
                    <button class="btn-pdf" id="btnPdfRapport" onclick="generatePDFReport()" title="Download PDF rapport">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                        <span>PDF Rapport</span>
                    </button>
                    <select class="period-select" id="monthSelect"></select>
                </div>
            </div>
        </header>

        <!-- === PAGE: Dashboard === -->
        <div class="page active" id="pageDashboard">

        <!-- KPI Cards -->
        <section class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Actieve Leden</span>
                    <div class="kpi-icon blue">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiLeden">—</div>
                <div class="kpi-change" id="kpiLedenChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Maandomzet</span>
                    <div class="kpi-icon green">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiOmzet">—</div>
                <div class="kpi-change" id="kpiOmzetChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Trials</span>
                    <div class="kpi-icon red">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiTrials">—</div>
                <div class="kpi-change" id="kpiTrialsChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Attrition Rate</span>
                    <div class="kpi-icon purple">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiAttrition">—</div>
                <div class="kpi-change" id="kpiAttritionChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Customer LTV</span>
                    <div class="kpi-icon green">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiLTV">—</div>
                <div class="kpi-change" id="kpiLTVChange"></div>
            </div>
        </section>

        <!-- Charts Row -->
        <section class="charts-grid">
            <div class="card chart-card">
                <div class="card-header">
                    <h2 class="card-title">Omzet & Leden</h2>
                    <span class="card-subtitle">Laatste 12 maanden</span>
                </div>
                <div class="chart-container">
                    <canvas id="revenueChart"></canvas>
                </div>
            </div>

            <div class="card chart-card">
                <div class="card-header">
                    <h2 class="card-title">Ledenverdeling</h2>
                    <span class="card-subtitle">Per abonnement</span>
                </div>
                <div class="chart-container chart-container-donut">
                    <canvas id="membersChart"></canvas>
                </div>
            </div>
        </section>

        <!-- Bottom Row -->
        <section class="bottom-grid">
            <!-- Membership Breakdown -->
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Abonnementen</h2>
                </div>
                <div class="membership-list" id="membershipList"></div>
                <p class="card-note" id="membershipNote" style="margin-top: 16px; font-size: 12px; color: #94a3b8;"></p>
            </div>

            <!-- Kerncijfers -->
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title" id="kerncijfersTitle">Kerncijfers</h2>
                </div>
                <div class="activity-list" id="kerncijfersList"></div>
            </div>
        </section>
        </div><!-- /pageDashboard -->

        <!-- === PAGE: Leden === -->
        <div class="page" id="pageLeden">

        <!-- Leden KPI Cards -->
        <section class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Totale Bezoeken</span>
                    <div class="kpi-icon blue">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiParticipants">—</div>
                <div class="kpi-change" id="kpiParticipantsChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Gem. per Les</span>
                    <div class="kpi-icon green">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiPPS">—</div>
                <div class="kpi-change" id="kpiPPSChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Sessies per Lid</span>
                    <div class="kpi-icon purple">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiSPM">—</div>
                <div class="kpi-change" id="kpiSPMChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Totaal Sessies</span>
                    <div class="kpi-icon red">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiSessions">—</div>
                <div class="kpi-change" id="kpiSessionsChange"></div>
            </div>
        </section>

        <!-- Leden KPI Cards Row 2 -->
        <section class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Trial → Lid %</span>
                    <div class="kpi-icon green">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiTrialConversion">—</div>
                <div class="kpi-change" id="kpiTrialConversionChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Nieuwe Leden</span>
                    <div class="kpi-icon blue">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiNewMembers">—</div>
                <div class="kpi-change" id="kpiNewMembersChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Verloren Leden</span>
                    <div class="kpi-icon red">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="11" x2="23" y2="11"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiLostMembers">—</div>
                <div class="kpi-change" id="kpiLostMembersChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Gem. LEG</span>
                    <div class="kpi-icon purple">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiLEG">—</div>
                <div class="kpi-change" id="kpiLEGChange"></div>
            </div>
        </section>

        <!-- Leden Chart -->
        <section class="charts-grid">
            <div class="card chart-card" style="grid-column: 1 / -1;">
                <div class="card-header">
                    <h2 class="card-title">Bezoeken & Gem. per Les</h2>
                    <span class="card-subtitle">Laatste 12 maanden</span>
                </div>
                <div class="chart-container">
                    <canvas id="attendanceChart"></canvas>
                </div>
            </div>
        </section>

        <!-- Leden Kerncijfers -->
        <section class="bottom-grid">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title" id="ledenKerncijfersTitle">Lesstatistieken</h2>
                </div>
                <div class="activity-list" id="ledenKerncijfersList"></div>
            </div>
        </section>
        </div><!-- /pageLeden -->

        <!-- === PAGE: Financiën === -->
        <div class="page" id="pageFinancien">

        <!-- Financiën KPI Cards -->
        <section class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Omzet</span>
                    <div class="kpi-icon green">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiRevenue">—</div>
                <div class="kpi-change" id="kpiRevenueChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Kosten</span>
                    <div class="kpi-icon red">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiCosts">—</div>
                <div class="kpi-change" id="kpiCostsChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Payroll</span>
                    <div class="kpi-icon blue">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiPayroll">—</div>
                <div class="kpi-change" id="kpiPayrollChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Winst</span>
                    <div class="kpi-icon purple">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiProfit">—</div>
                <div class="kpi-change" id="kpiProfitChange"></div>
            </div>
        </section>

        <!-- EBITDA KPI Cards -->
        <section class="kpi-grid kpi-grid-2">
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">EBITDA (maand)</span>
                    <div class="kpi-icon green">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiEbitda">—</div>
                <div class="kpi-change" id="kpiEbitdaChange"></div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">EBITDA (12 mnd)</span>
                    <div class="kpi-icon purple">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="kpiEbitda12">—</div>
                <div class="kpi-change" id="kpiEbitda12Change"></div>
            </div>
        </section>

        <!-- Financiën Charts -->
        <section class="charts-grid">
            <div class="card chart-card">
                <div class="card-header">
                    <h2 class="card-title">Omzet, Kosten & Winst</h2>
                    <span class="card-subtitle">Laatste 12 maanden</span>
                </div>
                <div class="chart-container">
                    <canvas id="financeChart"></canvas>
                </div>
            </div>

            <div class="card chart-card">
                <div class="card-header">
                    <h2 class="card-title">Kostenverdeling</h2>
                    <span class="card-subtitle">Per categorie</span>
                </div>
                <div class="chart-container chart-container-donut">
                    <canvas id="costDonutChart"></canvas>
                </div>
            </div>
        </section>

        <!-- Financiën Bottom -->
        <section class="bottom-grid">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Kostenoverzicht</h2>
                </div>
                <div class="membership-list" id="costBreakdownList"></div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title" id="finKerncijfersTitle">Financiële kerncijfers</h2>
                </div>
                <div class="activity-list" id="finKerncijfersList"></div>
            </div>
        </section>
        </div><!-- /pageFinancien -->

        <!-- === PAGE: Marketing === -->
        <div class="page" id="pageMarketing">

        <!-- Marketing KPI Cards -->
        <section class="kpi-grid kpi-grid-5">
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Nieuwe Leads</span>
                    <div class="kpi-icon blue">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="mkKpiLeads">—</div>
                <div class="kpi-change" id="mkKpiLeadsChange"></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">E-book Downloads</span>
                    <div class="kpi-icon green">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="mkKpiEbook">—</div>
                <div class="kpi-change" id="mkKpiEbookChange"></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Trials</span>
                    <div class="kpi-icon purple">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="mkKpiTrials">—</div>
                <div class="kpi-split" id="mkKpiTrialsSplit"></div>
                <div class="kpi-change" id="mkKpiTrialsChange"></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Trial → Lid %</span>
                    <div class="kpi-icon green">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="mkKpiConversion">—</div>
                <div class="kpi-change" id="mkKpiConversionChange"></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Totaal Subscribers</span>
                    <div class="kpi-icon red">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="mkKpiSubscribers">—</div>
                <div class="kpi-change" id="mkKpiSubscribersChange"></div>
            </div>
        </section>

        <!-- Marketing Charts -->
        <section class="charts-grid">
            <div class="card chart-card">
                <div class="card-header">
                    <h2 class="card-title">Leads per Maand</h2>
                    <span class="card-subtitle">Laatste 12 maanden</span>
                </div>
                <div class="chart-container">
                    <canvas id="mkLeadsChart"></canvas>
                </div>
            </div>
            <div class="card chart-card">
                <div class="card-header">
                    <h2 class="card-title">Lead Bronnen</h2>
                    <span class="card-subtitle">Verdeling deze maand</span>
                </div>
                <div class="chart-container chart-container-donut">
                    <canvas id="mkSourceDonut"></canvas>
                </div>
            </div>
        </section>

        <!-- Funnel Chart -->
        <section class="charts-grid">
            <div class="card chart-card" style="grid-column: 1 / -1;">
                <div class="card-header">
                    <h2 class="card-title">Marketing Funnel</h2>
                    <span class="card-subtitle">Subscriber groei over tijd</span>
                </div>
                <div class="chart-container">
                    <canvas id="mkGrowthChart"></canvas>
                </div>
            </div>
        </section>

        <!-- Marketing Bottom -->
        <section class="bottom-grid">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Lead Bronnen Detail</h2>
                </div>
                <div class="membership-list" id="mkSourceList"></div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title" id="mkKerncijfersTitle">Marketing Kerncijfers</h2>
                </div>
                <div class="activity-list" id="mkKerncijfersList"></div>
            </div>
        </section>
        </div><!-- /pageMarketing -->

        <!-- === PAGE: Nieuwsbrief === -->
        <div class="page" id="pageNieuwsbrief">

        <!-- Week Selector -->
        <section class="nb-week-nav">
            <button class="nb-week-btn" id="nbPrevWeek" title="Vorige week">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 class="nb-week-title" id="nbWeekTitle">Week 12 — 16 t/m 22 maart 2026</h2>
            <button class="nb-week-btn" id="nbNextWeek" title="Volgende week">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
        </section>

        <!-- Loading state -->
        <div class="nb-loading" id="nbLoading">
            <div class="nb-spinner"></div>
            <p>Notion data ophalen...</p>
        </div>

        <!-- Themes of the Week -->
        <section class="card nb-card" id="nbThemesCard" style="display:none;">
            <div class="card-header">
                <h2 class="card-title">Thema's van de Week</h2>
                <span class="card-subtitle" id="nbThemeWeekLabel"></span>
            </div>
            <div class="nb-themes-grid" id="nbThemesGrid"></div>
        </section>

        <!-- Coach Rooster -->
        <section class="card nb-card" id="nbCoachCard" style="display:none;">
            <div class="card-header">
                <h2 class="card-title">Coach Rooster</h2>
                <span class="card-subtitle" id="nbCoachWeekLabel"></span>
            </div>
            <div class="nb-table-wrap">
                <table class="nb-schedule-table" id="nbCoachTable">
                    <thead id="nbCoachHead"></thead>
                    <tbody id="nbCoachBody"></tbody>
                </table>
            </div>
        </section>

        <!-- Balie Rooster -->
        <section class="card nb-card" id="nbBalieCard" style="display:none;">
            <div class="card-header">
                <h2 class="card-title">Balie Rooster</h2>
                <span class="card-subtitle" id="nbBalieWeekLabel"></span>
            </div>
            <div class="nb-table-wrap">
                <table class="nb-schedule-table" id="nbBalieTable">
                    <thead id="nbBalieHead"></thead>
                    <tbody id="nbBalieBody"></tbody>
                </table>
            </div>
        </section>

        <!-- Newsletter Preview -->
        <section class="card nb-card" id="nbPreviewCard" style="display:none;">
            <div class="card-header">
                <h2 class="card-title">Crew Briefing Preview</h2>
                <div class="nb-preview-actions">
                    <button class="btn-pdf nb-copy-btn" id="nbCopyBtn" title="Kopieer naar klembord">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        <span>Kopieer</span>
                    </button>
                </div>
            </div>
            <div class="nb-preview" id="nbPreview"></div>
        </section>

        </div><!-- /pageNieuwsbrief -->

        <!-- === PAGE: Newsletter (Mailchimp) === -->
        <div class="page" id="pageMailnewsletter">

            <!-- Progress Steps -->
            <div class="nl-steps">
                <div class="nl-step active" data-step="1"><span class="nl-step-num">1</span><span class="nl-step-label">Ophalen</span></div>
                <div class="nl-step-line"></div>
                <div class="nl-step" data-step="2"><span class="nl-step-num">2</span><span class="nl-step-label">Bewerken</span></div>
                <div class="nl-step-line"></div>
                <div class="nl-step" data-step="3"><span class="nl-step-num">3</span><span class="nl-step-label">Details</span></div>
                <div class="nl-step-line"></div>
                <div class="nl-step" data-step="4"><span class="nl-step-num">4</span><span class="nl-step-label">Publiceren</span></div>
                <div class="nl-step-line"></div>
                <div class="nl-step" data-step="5"><span class="nl-step-num">5</span><span class="nl-step-label">Blog</span></div>
            </div>

            <!-- Step 1: Fetch -->
            <div class="nl-panel" id="nlStep1">
                <div class="card">
                    <div class="card-header"><h2 class="card-title">📬 Laatste nieuwsbrief ophalen</h2></div>
                    <div class="card-body">
                        <p style="color:var(--text-secondary);margin-bottom:20px;">Klik op de knop om de laatste NL nieuwsbrief van Mailchimp op te halen als basis voor de nieuwe editie.</p>
                        <div id="nlFetchInfo" style="display:none;margin-bottom:20px;padding:16px;background:var(--bg);border-radius:8px;">
                            <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;">
                                <span style="color:var(--text-secondary);font-weight:500;">Laatste:</span><span id="nlLastTitle"></span>
                                <span style="color:var(--text-secondary);font-weight:500;">Onderwerp:</span><span id="nlLastSubject"></span>
                                <span style="color:var(--text-secondary);font-weight:500;">Verzonden:</span><span id="nlLastDate"></span>
                                <span style="color:var(--text-secondary);font-weight:500;">Volgende:</span><span id="nlNextNumber" style="font-weight:700;color:var(--accent);"></span>
                            </div>
                        </div>
                        <button class="btn-primary" id="nlFetchBtn" style="padding:12px 32px;font-size:15px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Ophalen van Mailchimp
                        </button>
                        <div id="nlFetchLoading" style="display:none;margin-top:16px;color:var(--text-secondary);">
                            <div class="nb-spinner" style="display:inline-block;width:20px;height:20px;margin-right:8px;vertical-align:middle;"></div>
                            Ophalen...
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 2: Visual Edit -->
            <div class="nl-panel" id="nlStep2" style="display:none;">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">✏️ Nieuwsbrief bewerken</h2>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <button class="btn-secondary" id="nlToggleCode" style="font-size:12px;padding:4px 12px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                                HTML
                            </button>
                        </div>
                    </div>
                    <!-- Visual editor toolbar -->
                    <div class="nl-toolbar">
                        <span style="font-size:12px;color:var(--text-muted);margin-right:auto;">Klik op tekst om te bewerken · Selecteer een afbeelding voor opties</span>
                        <button class="nl-toolbar-btn" id="nlUploadBtn" title="Afbeelding uploaden of vervangen">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            Afbeelding
                        </button>
                        <button class="nl-toolbar-btn" id="nlLinkBtn" title="Link toevoegen aan geselecteerde afbeelding">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            Link
                        </button>
                        <button class="nl-toolbar-btn" id="nlUndo" title="Ongedaan maken">↩️</button>
                        <button class="nl-toolbar-btn" id="nlRedo" title="Opnieuw">↪️</button>
                        <input type="file" id="nlFileInput" accept="image/jpeg,image/png,image/gif,image/webp" hidden>
                    </div>
                    <!-- Upload progress -->
                    <div class="nl-upload-bar" id="nlUploadBar" style="display:none;">
                        <div class="nb-spinner" style="display:inline-block;width:16px;height:16px;margin-right:8px;vertical-align:middle;"></div>
                        <span id="nlUploadStatus">Uploaden naar Mailchimp...</span>
                    </div>
                    <!-- Visual WYSIWYG editor -->
                    <div class="card-body" style="padding:0;position:relative;">
                        <iframe id="nlVisualEditor" class="nl-visual-editor"></iframe>
                        <!-- Hidden HTML editor -->
                        <textarea id="nlEditor" class="nl-editor nl-code-hidden" spellcheck="false"></textarea>
                    </div>
                    <div class="card-footer" style="display:flex;justify-content:space-between;padding:16px 24px;border-top:1px solid var(--border);">
                        <button class="btn-secondary" id="nlBackTo1">← Terug</button>
                        <button class="btn-primary" id="nlToStep3">Volgende →</button>
                    </div>
                </div>
            </div>

            <!-- Step 3: Details -->
            <div class="nl-panel" id="nlStep3" style="display:none;">
                <div class="card">
                    <div class="card-header"><h2 class="card-title">📋 Nieuwsbrief details</h2></div>
                    <div class="card-body">
                        <div class="nl-form">
                            <div class="nl-form-group">
                                <label for="nlNumber">Nummer</label>
                                <input type="number" id="nlNumber" class="nl-input" placeholder="bijv. 161">
                            </div>
                            <div class="nl-form-group">
                                <label for="nlSubjectNL">Onderwerp (NL)</label>
                                <input type="text" id="nlSubjectNL" class="nl-input" placeholder="bijv. Training Tips + Wedstrijdresultaten">
                            </div>
                            <div class="nl-form-group">
                                <label for="nlSubjectEN">Onderwerp (EN)</label>
                                <input type="text" id="nlSubjectEN" class="nl-input" placeholder="bijv. Training Tips + Competition Results">
                            </div>
                            <div class="nl-form-group">
                                <label for="nlPreviewNL">Preview tekst (NL)</label>
                                <input type="text" id="nlPreviewNL" class="nl-input" placeholder="Korte preview die in de inbox zichtbaar is">
                            </div>
                            <div class="nl-form-group">
                                <label for="nlPreviewEN">Preview tekst (EN)</label>
                                <input type="text" id="nlPreviewEN" class="nl-input" placeholder="Short preview text visible in inbox">
                            </div>
                        </div>
                    </div>
                    <div class="card-footer" style="display:flex;justify-content:space-between;padding:16px 24px;border-top:1px solid var(--border);">
                        <button class="btn-secondary" id="nlBackTo2">← Terug</button>
                        <button class="btn-primary" id="nlToStep4" style="padding:12px 32px;font-size:15px;">🚀 Publiceren</button>
                    </div>
                </div>
            </div>

            <!-- Step 4: Publishing -->
            <div class="nl-panel" id="nlStep4" style="display:none;">
                <div class="card">
                    <div class="card-header"><h2 class="card-title">🚀 Publiceren</h2></div>
                    <div class="card-body">
                        <!-- Overall progress bar -->
                        <div class="nl-overall-progress" id="nlOverallProgress">
                            <div class="nl-overall-bar">
                                <div class="nl-overall-fill" id="nlOverallFill"></div>
                            </div>
                            <div class="nl-overall-text" id="nlOverallText">Stap 1 van 3...</div>
                            <div class="nl-overall-timer" id="nlOverallTimer">0:00</div>
                        </div>

                        <div class="nl-progress-list">
                            <div class="nl-progress-item" id="nlProg1">
                                <div class="nl-progress-icon">⏳</div>
                                <div style="flex:1;">
                                    <div class="nl-progress-title">Spelling & grammatica controleren</div>
                                    <div class="nl-progress-sub" id="nlProg1Sub">Wachten...</div>
                                    <div class="nl-item-bar" id="nlProg1Bar" style="display:none;"><div class="nl-item-bar-fill"></div></div>
                                </div>
                            </div>
                            <div class="nl-progress-item" id="nlProg2">
                                <div class="nl-progress-icon">⏳</div>
                                <div style="flex:1;">
                                    <div class="nl-progress-title">Vertalen naar Engels</div>
                                    <div class="nl-progress-sub" id="nlProg2Sub">Wachten...</div>
                                    <div class="nl-item-bar" id="nlProg2Bar" style="display:none;"><div class="nl-item-bar-fill"></div></div>
                                </div>
                            </div>
                            <div class="nl-progress-item" id="nlProg3">
                                <div class="nl-progress-icon">⏳</div>
                                <div style="flex:1;">
                                    <div class="nl-progress-title">Campagnes aanmaken in Mailchimp</div>
                                    <div class="nl-progress-sub" id="nlProg3Sub">Wachten...</div>
                                    <div class="nl-item-bar" id="nlProg3Bar" style="display:none;"><div class="nl-item-bar-fill"></div></div>
                                </div>
                            </div>
                        </div>

                        <div id="nlSuccess" style="display:none;margin-top:24px;padding:24px;background:var(--green-light);border-radius:12px;text-align:center;">
                            <div style="font-size:48px;margin-bottom:12px;">🎉</div>
                            <h3 style="margin-bottom:16px;color:var(--text);">Nieuwsbrief staat klaar!</h3>
                            <p style="color:var(--text-secondary);margin-bottom:20px;">Controleer de campagnes in Mailchimp en druk op verzenden.</p>
                            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                                <a id="nlLinkNL" href="#" target="_blank" class="btn-primary" style="padding:12px 24px;text-decoration:none;">🇳🇱 Open NL campagne</a>
                                <a id="nlLinkEN" href="#" target="_blank" class="btn-primary" style="padding:12px 24px;text-decoration:none;background:var(--blue);">🇬🇧 Open EN campagne</a>
                            </div>
                            <button class="btn-primary" id="nlToBlog" style="margin-top:16px;padding:12px 24px;background:var(--green);">📝 Secties als blogpost plaatsen</button>
                            <button class="btn-secondary" id="nlRestart" style="margin-top:16px;">↩️ Nieuwe nieuwsbrief</button>
                        </div>

                        <div id="nlError" style="display:none;margin-top:16px;padding:16px;background:var(--red-light);border-radius:8px;color:var(--red);"></div>
                    </div>
                </div>
            </div>

            <!-- Step 5: Blog -->
            <div class="nl-panel" id="nlStep5" style="display:none;">
                <div class="card">
                    <div class="card-header"><h2 class="card-title">📝 Secties publiceren als blogposts</h2></div>
                    <div class="card-body">
                        <p style="color:var(--text-secondary);margin-bottom:20px;">Selecteer welke secties je als blogpost op havenbjj.nl wilt plaatsen.</p>

                        <!-- Section selection -->
                        <div id="nlBlogSections" style="margin-bottom:24px;"></div>

                        <div style="display:flex;gap:12px;align-items:center;">
                            <button class="btn-primary" id="nlBlogGenerate" style="padding:12px 32px;font-size:15px;" disabled>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                Blogposts genereren
                            </button>
                            <span id="nlBlogCount" style="color:var(--text-secondary);font-size:14px;">0 geselecteerd</span>
                        </div>

                        <!-- Progress -->
                        <div id="nlBlogProgress" style="display:none;margin-top:24px;">
                            <div class="nl-overall-progress">
                                <div class="nl-overall-bar"><div class="nl-overall-fill" id="nlBlogProgressFill"></div></div>
                                <div class="nl-overall-text" id="nlBlogProgressText">Verwerken...</div>
                            </div>
                            <div id="nlBlogProgressLog" style="margin-top:12px;font-size:13px;color:var(--text-secondary);"></div>
                        </div>

                        <!-- Success: Download -->
                        <div id="nlBlogSuccess" style="display:none;margin-top:24px;padding:24px;background:var(--green-light);border-radius:12px;text-align:center;">
                            <div style="font-size:48px;margin-bottom:12px;">🎉</div>
                            <h3 style="margin-bottom:8px;color:var(--text);">Importbestand klaar!</h3>
                            <p style="color:var(--text-secondary);margin-bottom:20px;" id="nlBlogSuccessInfo"></p>
                            <button class="btn-primary" id="nlBlogDownload" style="padding:12px 32px;font-size:15px;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Download XML
                            </button>
                            <p style="color:var(--text-secondary);margin-top:16px;font-size:13px;">Upload dit bestand via wp-admin → Extra → Importeren → WordPress.<br>Vink "Download en importeer bestandsbijlagen" aan.</p>
                        </div>

                        <div id="nlBlogError" style="display:none;margin-top:16px;padding:16px;background:var(--red-light);border-radius:8px;color:var(--red);"></div>
                    </div>
                    <div class="card-footer" style="display:flex;justify-content:space-between;padding:16px 24px;border-top:1px solid var(--border);">
                        <button class="btn-secondary" id="nlBlogBack">← Terug</button>
                        <button class="btn-secondary" id="nlBlogRestart">↩️ Nieuwe nieuwsbrief</button>
                    </div>
                </div>
            </div>

        </div><!-- /pageMailnewsletter -->

        <!-- === PAGE: Simulator === -->
        <!-- === PAGE: Uploads === -->
        <div class="page" id="pageUploads">

            <div class="upload-grid">
                <!-- Mailchimp -->
                <div class="card upload-card" id="uploadMailchimp">
                    <div class="card-header">
                        <div><h3>Mailchimp CSV <span class="info-tooltip" title="Mailchimp → Audience → Export Audience">ⓘ</span></h3><span class="card-subtitle">E-mail subscribers</span></div>
                        <span class="upload-status" id="statusMailchimp"></span>
                    </div>
                    <label class="upload-dropzone" id="dropMailchimp">
                        <input type="file" accept=".csv,.zip" hidden>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span class="upload-label">Klik of sleep CSV of ZIP hier</span>
                        <span class="upload-filename"></span>
                    </label>
                </div>

                <!-- Jortt -->
                <div class="card upload-card" id="uploadJortt">
                    <div class="card-header">
                        <div><h3>Jortt Winst & Verlies <span class="info-tooltip" title="Jortt → Rapporten → Winst & Verlies → Selecteer 1 maand → Exporteer">ⓘ</span></h3><span class="card-subtitle">Omzet, kosten, winst</span></div>
                        <span class="upload-status" id="statusJortt"></span>
                    </div>
                    <label class="upload-dropzone" id="dropJortt">
                        <input type="file" accept=".csv" hidden>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span class="upload-label">Klik of sleep CSV hier</span>
                        <span class="upload-filename"></span>
                    </label>
                </div>

                <!-- Grib Leden -->
                <div class="card upload-card" id="uploadGribLeden">
                    <div class="card-header">
                        <div><h3>Grib Leden <span class="info-tooltip" title="Grib → Club Intelligence → Leden">ⓘ</span></h3><span class="card-subtitle">Totaal leden & abonnementen</span></div>
                        <span class="upload-status" id="statusGribLeden"></span>
                    </div>
                    <label class="upload-dropzone" id="dropGribLeden">
                        <input type="file" accept=".csv,.xlsx,.xls" hidden>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span class="upload-label">Klik of sleep CSV of XLSX hier</span>
                        <span class="upload-filename"></span>
                    </label>
                </div>

                <!-- Grib Nieuwe Leden -->
                <div class="card upload-card" id="uploadGribNieuw">
                    <div class="card-header">
                        <div><h3>Grib Nieuwe Leden <span class="info-tooltip" title="Grib → Club Intelligence → Abonnementsgroei → Nieuwe abonnementen">ⓘ</span></h3><span class="card-subtitle">Nieuwe aanmeldingen</span></div>
                        <span class="upload-status" id="statusGribNieuw"></span>
                    </div>
                    <label class="upload-dropzone" id="dropGribNieuw">
                        <input type="file" accept=".csv,.xlsx,.xls" hidden>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span class="upload-label">Klik of sleep CSV of XLSX hier</span>
                        <span class="upload-filename"></span>
                    </label>
                </div>

                <!-- Grib Verloren Leden -->
                <div class="card upload-card" id="uploadGribVerloren">
                    <div class="card-header">
                        <div><h3>Grib Verloren Leden <span class="info-tooltip" title="Grib → Club Intelligence → Abonnementsgroei → Gestopte abonnementen">ⓘ</span></h3><span class="card-subtitle">Opzeggingen</span></div>
                        <span class="upload-status" id="statusGribVerloren"></span>
                    </div>
                    <label class="upload-dropzone" id="dropGribVerloren">
                        <input type="file" accept=".csv,.xlsx,.xls" hidden>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span class="upload-label">Klik of sleep CSV of XLSX hier</span>
                        <span class="upload-filename"></span>
                    </label>
                </div>

                <!-- Handmatige invoer -->
                <div class="card upload-card" id="uploadManual">
                    <div class="card-header">
                        <div><h3>Handmatige Invoer</h3><span class="card-subtitle">Zettle, lessen & deelnemers</span></div>
                    </div>
                    <div class="manual-inputs">
                        <div class="sim-input-group">
                            <label for="inputZettle">Zettle omzet (€) <span class="info-tooltip" title="Zettle → Omzet → Rapport">ⓘ</span></label>
                            <input type="number" class="sim-input" id="inputZettle" placeholder="bijv. 2450.50" step="0.01">
                        </div>
                        <div class="sim-input-group">
                            <label for="inputSessions">Aantal lessen <span class="info-tooltip" title="Grib → Reserveringen → Tellen">ⓘ</span></label>
                            <input type="number" class="sim-input" id="inputSessions" placeholder="bijv. 85">
                        </div>
                        <div class="sim-input-group">
                            <label for="inputParticipants">Totaal deelnemers <span class="info-tooltip" title="Grib → Club Intelligence → Bezoek">ⓘ</span></label>
                            <input type="number" class="sim-input" id="inputParticipants" placeholder="bijv. 1200">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Output -->
            <div class="card upload-output-card">
                <div class="card-header">
                    <div><h3>Data Preview</h3><span class="card-subtitle">Controleer de data en verzend naar dashboard</span></div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn-pdf" id="uploadCopyBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            <span>Kopieer</span>
                        </button>
                        <button class="btn-pdf" id="uploadSubmitBtn" style="background:var(--accent);color:white;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
                            <span>Verzend</span>
                        </button>
                    </div>
                </div>
                <pre class="upload-output" id="uploadOutput">Upload bestanden en vul velden in om een preview te genereren...</pre>
            </div>

        </div><!-- /pageUploads -->

        <div class="page" id="pageSimulator">

        <!-- Simulator Inputs -->
        <section class="card sim-card">
            <div class="card-header">
                <h2 class="card-title">Prijsverhoging instellen</h2>
            </div>
            <div class="sim-inputs-grid">
                <div class="sim-input-group">
                    <label>Huidige leden</label>
                    <input type="number" id="simMembers" class="sim-input" value="400">
                </div>
                <div class="sim-input-group">
                    <label>Gem. prijs per lid (€/mnd)</label>
                    <input type="number" id="simPrice" class="sim-input" step="0.01" value="73">
                </div>
                <div class="sim-input-group">
                    <label>Maandomzet (€)</label>
                    <input type="text" id="simRevenue" class="sim-input" value="—" readonly style="background: var(--border); cursor: default;">
                </div>
                <div class="sim-input-group">
                    <label>Maandelijkse churn (%)</label>
                    <input type="number" id="simChurn" class="sim-input" step="0.1" value="5">
                </div>
                <div class="sim-input-group">
                    <label>Nieuwe leden / maand</label>
                    <input type="number" id="simNewMembers" class="sim-input" value="30">
                </div>
                <div class="sim-input-group">
                    <label>Vaste kosten / maand (€)</label>
                    <input type="number" id="simFixedCosts" class="sim-input" value="10000">
                </div>
                <div class="sim-input-group">
                    <label>Variabele kosten / lid (€)</label>
                    <input type="number" id="simVarCost" class="sim-input" step="0.01" value="5">
                </div>
            </div>
            <div class="sim-slider-section">
                <label class="sim-slider-label">Prijsverhoging: <strong id="simPriceIncLabel">10%</strong></label>
                <input type="range" id="simPriceInc" class="sim-range" min="0" max="50" step="1" value="10">
                <div class="sim-range-labels"><span>0%</span><span>25%</span><span>50%</span></div>
            </div>
            <div class="sim-scope-section">
                <label class="sim-slider-label">Toepassen op:</label>
                <div class="sim-scope-options">
                    <label class="sim-scope-option"><input type="radio" name="simScope" value="all" checked> <span>Alle leden</span></label>
                    <label class="sim-scope-option"><input type="radio" name="simScope" value="new_only"> <span>Alleen nieuwe leden</span></label>
                    <label class="sim-scope-option"><input type="radio" name="simScope" value="phased"> <span>Gefaseerd (12 mnd)</span></label>
                </div>
            </div>
        </section>

        <!-- Scenario Tabs -->
        <section class="sim-scenarios">
            <button class="sim-tab" data-scenario="optimistic">Optimistic</button>
            <button class="sim-tab active" data-scenario="realistic">Realistic</button>
            <button class="sim-tab" data-scenario="pessimistic">Pessimistic</button>
            <button class="sim-tab" data-scenario="custom">Custom</button>
        </section>

        <!-- Custom Parameters (hidden by default) -->
        <section class="card sim-card sim-custom-params" id="simCustomParams" style="display:none;">
            <div class="card-header">
                <h2 class="card-title">Custom parameters</h2>
            </div>
            <div class="sim-inputs-grid">
                <div class="sim-input-group">
                    <label>Price Elasticity</label>
                    <input type="number" id="simElasticity" class="sim-input" step="0.05" value="-0.20">
                    <span class="sim-hint">Negatief: hogere prijs → minder leden</span>
                </div>
                <div class="sim-input-group">
                    <label>Churn Sensitivity</label>
                    <input type="number" id="simChurnSens" class="sim-input" step="0.05" value="0.10">
                    <span class="sim-hint">Hoeveel extra churn per 10% prijsverhoging</span>
                </div>
                <div class="sim-input-group">
                    <label>New Member Slowdown</label>
                    <input type="number" id="simSlowdown" class="sim-input" step="0.05" value="0.05">
                    <span class="sim-hint">Daling nieuwe leden per 10% prijsverhoging</span>
                </div>
            </div>
        </section>

        <!-- Warnings -->
        <div id="simWarnings"></div>

        <!-- Simulator KPI Cards -->
        <section class="kpi-grid kpi-grid-5">
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Nieuwe Prijs</span>
                    <div class="kpi-icon green">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="simKpiNewPrice">—</div>
                <div class="kpi-change" id="simKpiNewPriceChange"></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Verwacht Ledenverlies</span>
                    <div class="kpi-icon red">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="11" x2="23" y2="11"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="simKpiLost">—</div>
                <div class="kpi-change" id="simKpiLostChange"></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Nieuwe Omzet</span>
                    <div class="kpi-icon blue">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="simKpiRevenue">—</div>
                <div class="kpi-change" id="simKpiRevenueChange"></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Nieuwe Churn</span>
                    <div class="kpi-icon purple">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="simKpiChurn">—</div>
                <div class="kpi-change" id="simKpiChurnChange"></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Break-even Verlies</span>
                    <div class="kpi-icon red">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                </div>
                <div class="kpi-value" id="simKpiBreakeven">—</div>
                <div class="kpi-change" id="simKpiBreakevenChange"></div>
            </div>
        </section>

        <!-- Scenario Comparison Table -->
        <section class="card sim-card">
            <div class="card-header">
                <h2 class="card-title">Scenario Vergelijking</h2>
                <span class="card-subtitle" id="simTableSubtitle">Bij 10% prijsverhoging</span>
            </div>
            <div class="sim-table-wrap">
                <table class="sim-table" id="simTable">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Baseline</th>
                            <th>Optimistic</th>
                            <th>Realistic</th>
                            <th>Pessimistic</th>
                        </tr>
                    </thead>
                    <tbody id="simTableBody"></tbody>
                </table>
            </div>
        </section>

        <!-- Simulator Charts -->
        <section class="charts-grid">
            <div class="card chart-card">
                <div class="card-header">
                    <h2 class="card-title">12-maands Leden Forecast</h2>
                    <span class="card-subtitle">Baseline vs scenario</span>
                </div>
                <div class="chart-container">
                    <canvas id="simMembersChart"></canvas>
                </div>
            </div>
            <div class="card chart-card">
                <div class="card-header">
                    <h2 class="card-title">12-maands Omzet Forecast</h2>
                    <span class="card-subtitle">Baseline vs scenario</span>
                </div>
                <div class="chart-container">
                    <canvas id="simRevenueChart"></canvas>
                </div>
            </div>
        </section>

        <!-- Revenue vs Price Curve -->
        <section class="card sim-card">
            <div class="card-header">
                <h2 class="card-title">Omzet vs Prijsverhoging</h2>
                <span class="card-subtitle">Optimale prijspunt vinden</span>
            </div>
            <div class="chart-container">
                <canvas id="simCurveChart"></canvas>
            </div>
        </section>

        <div class="sim-disclaimer">
            Price elasticity models estimate behavior based on assumptions. Real outcomes depend on communication, perceived value, and competition.
        </div>

        </div><!-- /pageSimulator -->

        <!-- ═══ Gym Info ═══ -->
        <div class="page" id="pageGyminfo">
            <div class="gyminfo-grid">
                <div class="card">
                    <h3 class="card-title">Bedrijfsgegevens</h3>
                    <div class="gyminfo-list">
                        <div class="gyminfo-item">
                            <span class="gyminfo-label">KVK Nummer</span>
                            <span class="gyminfo-value" id="infoKvk">—</span>
                            <button class="gyminfo-copy" data-copy="infoKvk" title="Kopieer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                        </div>
                        <div class="gyminfo-item">
                            <span class="gyminfo-label">BTW Nummer</span>
                            <span class="gyminfo-value" id="infoBtw">—</span>
                            <button class="gyminfo-copy" data-copy="infoBtw" title="Kopieer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                        </div>
                        <div class="gyminfo-item">
                            <span class="gyminfo-label">Bankrekening</span>
                            <span class="gyminfo-value" id="infoBank">—</span>
                            <button class="gyminfo-copy" data-copy="infoBank" title="Kopieer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                        </div>
                        <div class="gyminfo-item">
                            <span class="gyminfo-label">Telefoonnummer</span>
                            <span class="gyminfo-value" id="infoTelefoon">—</span>
                            <button class="gyminfo-copy" data-copy="infoTelefoon" title="Kopieer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <h3 class="card-title">Huisstijl</h3>
                    <div class="gyminfo-list">
                        <div class="gyminfo-item">
                            <span class="gyminfo-label">Haven lichtblauw</span>
                            <span class="gyminfo-value gyminfo-color">
                                <span class="gyminfo-swatch" id="swatchLight"></span>
                                <span id="infoColorLight">—</span>
                            </span>
                            <button class="gyminfo-copy" data-copy="infoColorLight" title="Kopieer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2-2v1"/></svg>
                            </button>
                        </div>
                        <div class="gyminfo-item">
                            <span class="gyminfo-label">Oceaan donkerblauw</span>
                            <span class="gyminfo-value gyminfo-color">
                                <span class="gyminfo-swatch" id="swatchDark"></span>
                                <span id="infoColorDark">—</span>
                            </span>
                            <button class="gyminfo-copy" data-copy="infoColorDark" title="Kopieer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                        </div>
                        <div class="gyminfo-item">
                            <span class="gyminfo-label">Main font</span>
                            <span class="gyminfo-value" id="infoFontMain">—</span>
                            <button class="gyminfo-copy" data-copy="infoFontMain" title="Kopieer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                        </div>
                        <div class="gyminfo-item">
                            <span class="gyminfo-label">Secondary font</span>
                            <span class="gyminfo-value" id="infoFontSecondary">—</span>
                            <button class="gyminfo-copy" data-copy="infoFontSecondary" title="Kopieer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card gyminfo-suppliers-card">
                    <h3 class="card-title">Leveranciers</h3>
                    <div class="gyminfo-suppliers">
                        <div class="supplier-item" data-supplier="verzekeringen">
                            <div class="supplier-header">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                <span>Verzekeringen Algemeen</span>
                                <svg class="supplier-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                            <div class="supplier-details">
                                <div class="supplier-contact">Bobby</div>
                                <div class="supplier-company">Schagen Assurantiën</div>
                                <div class="supplier-info" id="supplierVerzekeringen"></div>
                            </div>
                        </div>
                        <div class="supplier-item" data-supplier="aansprakelijkheid">
                            <div class="supplier-header">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                <span>Verzekering Bedrijfsaansprakelijkheid</span>
                                <svg class="supplier-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                            <div class="supplier-details">
                                <div class="supplier-company">Everion</div>
                                <div class="supplier-info" id="supplierAansprakelijkheid"></div>
                            </div>
                        </div>
                        <div class="supplier-item" data-supplier="schoonmaak">
                            <div class="supplier-header">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                <span>Schoonmaak</span>
                                <svg class="supplier-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                            <div class="supplier-details">
                                <div class="supplier-contact">Gio</div>
                                <div class="supplier-company">Trust Clean with care</div>
                                <div class="supplier-info" id="supplierSchoonmaak"></div>
                            </div>
                        </div>
                        <div class="supplier-item" data-supplier="matten">
                            <div class="supplier-header">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                                <span>Matten</span>
                                <svg class="supplier-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                            <div class="supplier-details">
                                <div class="supplier-info" id="supplierMatten"></div>
                            </div>
                        </div>
                        <div class="supplier-item" data-supplier="rashguards">
                            <div class="supplier-header">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2 12 5 8 2 3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47c.1.6.51 1.1 1.05 1.36L12 15l8.09-4.48a2 2 0 0 0 1.05-1.36l.58-3.47a2 2 0 0 0-1.34-2.23z"/><path d="M12 15v7"/></svg>
                                <span>Rashguards</span>
                                <svg class="supplier-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                            <div class="supplier-details">
                                <div class="supplier-info" id="supplierRashguards"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div><!-- /pageGyminfo -->

        <!-- ═══ Rooster Tool ═══ -->
        <div class="page" id="pageRooster">

            <!-- Top Bar -->
            <div class="rooster-topbar">
                <div class="rooster-topbar-left">
                    <div class="rooster-field">
                        <label>Maand</label>
                        <select id="roosterMonth" class="rooster-select">
                            <option value="1">Januari</option>
                            <option value="2">Februari</option>
                            <option value="3">Maart</option>
                            <option value="4">April</option>
                            <option value="5">Mei</option>
                            <option value="6">Juni</option>
                            <option value="7">Juli</option>
                            <option value="8">Augustus</option>
                            <option value="9">September</option>
                            <option value="10">Oktober</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                        </select>
                    </div>
                    <div class="rooster-field">
                        <label>Jaar</label>
                        <select id="roosterYear" class="rooster-select">
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                        </select>
                    </div>
                </div>
                <div class="rooster-topbar-actions">
                    <button class="btn-secondary" id="roosterLoadNotionBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Laden uit Notion
                    </button>
                    <button class="btn-primary" id="roosterSaveBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                        Opslaan
                    </button>
                    <div class="rooster-status" id="roosterStatus">
                        <span class="rooster-status-dot"></span>
                        <span class="rooster-status-text">Geen concept</span>
                    </div>
                </div>
            </div>

            <!-- Loading/Error -->
            <div class="rooster-loading" id="roosterLoading" style="display:none;">
                <div class="nb-spinner"></div>
                <span>Rooster ophalen uit Notion...</span>
            </div>
            <div class="rooster-error" id="roosterError" style="display:none;"></div>

            <!-- Toast notification -->
            <div class="rooster-toast" id="roosterToast" style="display:none;"></div>

            <!-- Workspace layout -->
            <div class="rooster-workspace" id="roosterWorkspace" style="display:none;">
                <!-- Tab bar -->
                <div class="rooster-tabs">
                    <button class="rooster-tab active" data-tab="coaches" id="roosterTabCoaches">Coaches Rooster</button>
                    <button class="rooster-tab" data-tab="balie" id="roosterTabBalie">Balie Rooster</button>
                    <button class="rooster-sidebar-toggle" id="roosterSidebarToggle" title="Zijpaneel openen/sluiten">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                    </button>
                </div>

                <div class="rooster-main-layout">
                    <!-- Main content area -->
                    <div class="rooster-content">
                        <!-- Coaches tab -->
                        <div class="rooster-tab-panel active" id="roosterPanelCoaches">
                            <div class="rooster-grid-wrap" id="roosterCoachGrid">
                                <p class="rooster-empty">Klik op "Laden uit Notion" of selecteer een maand met een opgeslagen concept.</p>
                            </div>
                        </div>
                        <!-- Balie tab -->
                        <div class="rooster-tab-panel" id="roosterPanelBalie" style="display:none;">
                            <div class="rooster-grid-wrap" id="roosterBalieGrid">
                                <p class="rooster-empty">Klik op "Laden uit Notion" of selecteer een maand met een opgeslagen concept.</p>
                            </div>
                            <!-- Uren overzicht below balie grid -->
                            <section class="card rooster-hours-card" id="roosterHoursCard" style="display:none;">
                                <div class="card-header">
                                    <h2 class="card-title">Uren Overzicht</h2>
                                </div>
                                <div class="rooster-hours-wrap" id="roosterHoursTable"></div>
                            </section>
                        </div>
                    </div>

                    <!-- Right sidebar -->
                    <div class="rooster-sidebar" id="roosterSidebar">
                        <!-- AI Chat section -->
                        <div class="rooster-sidebar-section rooster-sidebar-chat" id="roosterSidebarChat" style="display:none;">
                            <h3 class="rooster-sidebar-title">🤖 AI Assistent</h3>
                            <div class="rooster-chat-messages" id="roosterChatMessages">
                                <div class="rooster-chat-msg rooster-chat-ai">
                                    Hoi! Vertel me wat je wilt wijzigen, bijv:<br>
                                    <em>"Daniel geeft dinsdag en donderdag Evening 1"</em>
                                </div>
                            </div>
                            <div class="rooster-chat-input-row">
                                <input type="text" id="roosterChatInput" placeholder="Typ een instructie..." class="rooster-chat-input">
                                <button id="roosterChatSend" class="rooster-chat-send">➤</button>
                            </div>
                        </div>

                        <!-- Acties section -->
                        <div class="rooster-sidebar-section">
                            <h3 class="rooster-sidebar-title">Acties</h3>
                            <div class="rooster-sidebar-actions">
                                <button class="btn-secondary rooster-action-btn" id="roosterCopyHtml">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    Kopieer HTML
                                </button>
                                <button class="btn-secondary rooster-action-btn" id="roosterSendNotion">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                    Verzend naar Notion
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cell Edit Dropdown (hidden, positioned absolutely) -->
            <div class="rooster-dropdown" id="roosterDropdown" style="display:none;">
                <div class="rooster-dropdown-header">Vervanging kiezen</div>
                <div class="rooster-dropdown-list" id="roosterDropdownList"></div>
                <div class="rooster-dropdown-custom">
                    <input type="text" id="roosterDropdownInput" placeholder="Andere naam...">
                    <button class="btn-primary btn-sm" id="roosterDropdownSave">OK</button>
                </div>
            </div>


        </div><!-- /pageRooster -->

        <!-- ═══ Account & Settings ═══ -->
        <div class="page" id="pageAccount">
            <div class="account-grid">
                <!-- Profile Section -->
                <div class="card account-card">
                    <h3 class="account-card-title">Profiel</h3>
                    <div class="account-avatar-section">
                        <div class="account-avatar-wrapper">
                            <?php if ($avatarUrl): ?>
                                <img src="<?= htmlspecialchars($avatarUrl) ?>" alt="Profielfoto" class="account-avatar" id="accountAvatar">
                            <?php else: ?>
                                <div class="account-avatar account-avatar-placeholder" id="accountAvatar"><?= htmlspecialchars(strtoupper(substr($currentUser, 0, 1))) ?></div>
                            <?php endif; ?>
                            <label class="account-avatar-upload" for="avatarInput" title="Foto wijzigen">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            </label>
                            <input type="file" id="avatarInput" accept="image/jpeg,image/png,image/webp" style="display:none">
                        </div>
                        <div class="account-user-info">
                            <div class="account-username"><?= htmlspecialchars(ucfirst($currentUser)) ?></div>
                            <div class="account-role">Beheerder</div>
                        </div>
                    </div>
                </div>

                <!-- Password Section -->
                <div class="card account-card">
                    <h3 class="account-card-title">Wachtwoord wijzigen</h3>
                    <div class="account-form" id="passwordForm">
                        <div class="account-field">
                            <label for="currentPassword">Huidig wachtwoord</label>
                            <input type="password" id="currentPassword" autocomplete="current-password">
                        </div>
                        <div class="account-field">
                            <label for="newPassword">Nieuw wachtwoord</label>
                            <input type="password" id="newPassword" autocomplete="new-password">
                        </div>
                        <div class="account-field">
                            <label for="confirmPassword">Bevestig nieuw wachtwoord</label>
                            <input type="password" id="confirmPassword" autocomplete="new-password">
                        </div>
                        <div class="account-message" id="passwordMessage"></div>
                        <button class="btn-primary" id="savePasswordBtn">Wachtwoord opslaan</button>
                    </div>
                </div>

                <!-- Theme Section -->
                <div class="card account-card">
                    <h3 class="account-card-title">Weergave</h3>
                    <div class="account-theme-section">
                        <p class="account-theme-label">Thema</p>
                        <div class="theme-toggle-group">
                            <button class="theme-option <?= $userTheme === 'light' ? 'active' : '' ?>" data-theme-value="light">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                                Licht
                            </button>
                            <button class="theme-option <?= $userTheme === 'dark' ? 'active' : '' ?>" data-theme-value="dark">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                                Donker
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div><!-- /pageAccount -->

    </main>

    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script src="jspdf.umd.min.js"></script>
    <script src="jspdf.plugin.autotable.min.js"></script>
    <!-- Data loaded via API in dashboard.js -->
    <!-- Notion config embedded by PHP -->
    <script>
    const NOTION_CONFIG = {
        API_KEY: '', // Not needed client-side, proxy handles auth
        PROXY_URL: 'api/notion-proxy.php',
        PAGES: <?= json_encode(NOTION_PAGES) ?>
    };
    </script>
    <script src="dashboard.js?v=30"></script>
</body>
</html>
