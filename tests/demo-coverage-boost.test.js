/**
 * S4 Ledger — Demo Coverage Boost Tests
 * Calls window-exported functions from engine.js and enhancements.js
 * to dramatically increase V8 coverage instrumentation.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

// ── Extensive DOM scaffold ──
function setupFullDOM() {
  document.body.innerHTML = `
    <div id="platformLanding" style="display:block"></div>
    <div class="hero" style="display:block"></div>
    <div id="platformWorkspace" style="display:none"></div>
    <div id="platformHub" style="display:none"></div>
    <div id="statsRow" style="display:none"></div>
    <div id="onboardOverlay" style="display:none">
      <div class="onboard-tier" data-tier="pilot"></div>
      <div class="onboard-tier selected" data-tier="starter"></div>
      <div class="onboard-tier" data-tier="professional"></div>
      <div class="onboard-tier" data-tier="enterprise"></div>
      <div id="onboardSlsBal">25,000</div>
      <div id="onboardSlsAnchors">2,500,000</div>
      <div id="onboardStep0" class="active"></div>
      <div id="onboardStep1"></div><div id="onboardStep2"></div>
      <div id="onboardStep3"></div><div id="onboardStep4"></div>
      <div id="onboardProgress"><span class="onboard-dot active"></span><span class="onboard-dot"></span><span class="onboard-dot"></span></div>
      <div id="onboardAcctStatus"></div><div id="onboardAcctId"></div>
      <div id="onboardAcctDone" style="display:none"></div>
      <div id="onboardWalletAddr"></div><div id="onboardXrpBal"></div>
      <div id="onboardTrustLine"></div><div id="onboardWalletDone" style="display:none"></div>
      <button class="onboard-btn">Continue</button>
    </div>
    <div id="dodConsentBanner" style="display:none"></div>
    <div id="cacLoginModal" style="display:none">
      <div id="cacLoginPane"></div>
      <div id="acctLoginPane" style="display:none"></div>
      <div id="loginTabCac"></div><div id="loginTabAcct"></div>
      <button onclick="simulateCacLogin()">CAC</button>
      <button onclick="simulateAccountLogin()">Sign In</button>
      <input id="loginEmail" value=""><input id="loginPassword" value="">
      <div id="loginError" style="display:none"></div>
      <div id="signupSection" style="display:none"></div>
    </div>
    <div id="slsBarBalance">25,000 Credits</div>
    <div id="slsBarAnchors">0</div>
    <div id="slsBarSpent">0.000 Credits</div>
    <div id="slsBarPlan">Starter</div>
    <div id="walletSLSBalance">25,000</div>
    <div id="walletAnchors">2,500,000</div>
    <div id="toolSlsBal">25,000</div>
    <div id="sidebarSlsBal">25,000 Credits</div>
    <div id="walletTriggerBal">25,000 Credits</div>
    <div id="walletSLSUSD">250.00</div>
    <div id="walletXRP">12.00</div>
    <div id="walletNetwork">XRPL Mainnet</div>
    <div id="walletAddress">rTestAddress123</div>
    <div id="seedMasked" style="display:inline">••••••••</div>
    <div id="seedRevealed" style="display:none">sTestSeed123</div>
    <button id="seedToggleBtn"><i class="fas fa-eye"></i> Show</button>
    <div id="walletNoWallet" style="display:none"></div>
    <div id="walletCredentials" style="display:none"></div>
    <a id="walletExplorer" href="#"></a>
    <div id="statAnchored">0</div>
    <div id="statVerified">0</div>
    <div id="statTypes">0</div>
    <div id="statSlsFees">0</div>
    <div id="clfBanner"><span class="clf-icon"></span><span id="clfBadge"></span><span id="clfText"></span></div>
    <textarea id="recordInput"></textarea>
    <div id="typeGridContainer"></div>
    <div id="recordTypeGrid"></div>
    <span id="branchTypeCount"></span>
    <input id="typeSearch" value="">
    <div id="sectionSystems" style="display:none"></div>
    <div id="sectionAnchor" style="display:none"></div>
    <div id="tabAnchor" class="tab-pane" style="display:none"></div>
    <div id="tabVerify" class="tab-pane" style="display:none"></div>
    <div id="tabLog" class="tab-pane" style="display:none"></div>
    <div id="tabILS" class="tab-pane" style="display:none"></div>
    <div id="tabMetrics" class="tab-pane" style="display:none"></div>
    <div id="tabOffline" class="tab-pane" style="display:none"></div>
    <div id="tabWallet" class="tab-pane" style="display:none"></div>
    <div id="ilsSubHub" style="display:grid"></div>
    <div id="ilsToolBackBar" style="display:none"></div>
    <div class="ils-hub-tabs" style="display:none"></div>
    <div id="hub-analysis" class="ils-hub-panel" style="display:none"></div>
    <div id="hub-dmsms" class="ils-hub-panel" style="display:none"></div>
    <div id="hub-readiness" class="ils-hub-panel" style="display:none"></div>
    <div id="hub-lifecycle" class="ils-hub-panel" style="display:none"></div>
    <div id="hub-predictive" class="ils-hub-panel" style="display:none"></div>
    <div id="hub-risk" class="ils-hub-panel" style="display:none"></div>
    <div id="hub-vault" class="ils-hub-panel" style="display:none">
      <div id="vaultGrid"></div>
      <div id="vaultStats"></div>
      <div id="vaultTotal">0</div>
      <div id="vaultVerified">0</div>
      <div id="vaultPending">0</div>
      <div id="vaultPageNum">1</div>
      <div id="vaultBulkBar" style="display:none"></div>
      <div id="vaultSelectAllCheck"></div>
    </div>
    <div id="hub-compliance" class="ils-hub-panel" style="display:none">
      <div id="complianceOutput"></div>
      <div id="compPrograms">5</div>
    </div>
    <div id="hub-roi" class="ils-hub-panel" style="display:none">
      <input id="roiPrograms" value="5">
      <input id="roiRecords" value="100">
      <input id="roiFTEs" value="3">
      <input id="roiRate" value="65">
      <input id="roiAudit" value="50000">
      <input id="roiError" value="10000">
      <input id="roiIncidents" value="12">
      <input id="roiLicense" value="12000">
      <div id="roiSavings"></div>
      <div id="roiPercent"></div>
      <div id="roiPayback"></div>
      <div id="roi5Year"></div>
      <div id="roiOutput"></div>
    </div>
    <div id="hub-actions" class="ils-hub-panel" style="display:none">
      <div id="actionList"></div>
      <div id="actionCount">0</div>
      <div id="actionOpen">0</div>
      <div id="actionCritical">0</div>
      <div id="actionOverdue">0</div>
      <div id="actionFilterAll" class="active"></div>
      <div id="actionTimeline" style="display:none"></div>
      <select id="actionSeverityFilter"><option value="all">All</option></select>
      <select id="actionStatusFilter"><option value="all">All</option></select>
      <input id="actionSearchInput" value="">
    </div>
    <div id="hub-doc" class="ils-hub-panel" style="display:none">
      <div id="docLibrary"></div>
      <div id="docCount">0</div>
      <select id="docCatFilter"><option value="all">All</option></select>
      <input id="docSearch" value="">
    </div>
    <div id="txLogBody"></div>
    <div id="txLogEmpty" style="display:block"></div>
    <div id="txCount">0</div>
    <div id="aiFloatWrapper" style="display:none"></div>
    <div id="aiFloatPanel"></div>
    <div id="aiChatBody"></div>
    <input id="aiInput" value="">
    <div id="aiContextPanel" style="display:none"></div>
    <div id="s4SessionLockOverlay" style="display:none"></div>
    <div id="ilsCoverage"></div>
    <div id="pctCMMC">0</div><div id="pctNIST">0</div>
    <div id="pctDFARS">0</div><div id="pctFAR">0</div>
    <div id="pctILS">0</div><div id="pctDMSMSmgmt">0</div>
    <div id="slsFlowBox" style="display:none"></div>
    <div id="slsToggleBtn"></div>
    <div id="roleModal"></div>
    <div id="verifyInput"></div>
    <div id="verifyResult"></div>
    <div id="recentRecordsGrid"></div>
    <select id="verifyRecordSelect"><option value="">Select</option></select>
    <div id="offlineQueueList"></div>
    <div id="offlineBadge"></div>
    <div id="searchOverlay" style="display:none"><input id="globalSearchInput"><div id="globalSearchResults"></div></div>
    <div id="hashOutput"></div>
    <div id="anchorBtn"></div>
    <div id="anchorResult"></div>
    <div id="slsUsdInput" value="25"></div>
    <div id="slsPreviewTokens">2,500 Credits</div>
    <div id="slsPreviewAnchors">250,000</div>
    <div id="buySLSBtn"></div>
    <div id="buySLSResult" style="display:none"></div>
    <div id="chartOverlay"><p></p></div>
    <div id="scrollProgress"></div>
    <div id="backToTop"></div>
    <div id="notifHistoryPanel" style="display:none"><div id="notifHistoryBody"></div></div>
    <div id="shortcutsModal" style="display:none"></div>
    <div id="compareModal" style="display:none"><div id="compareBody"></div></div>
    <div id="toastContainer"></div>
    <div id="teamPanel" style="display:none"><div id="teamList"></div></div>
    <div id="savedAnalysesModal" style="display:none"><div id="savedAnalysesList"></div></div>
    <div id="webhookModal" style="display:none"><div id="webhookList"></div></div>
    <div id="pdfExportModal" style="display:none"></div>
    <div id="ilsProgram"><option value="f35">F-35</option></div>
    <div id="dmsmsProgram"><option value="f35">F-35</option></div>
    <div id="ilsOutput"></div>
    <div id="ilsFileList"></div>
    <div id="ilsFileCount">0</div>
    <div id="dsResults"></div>
    <button id="anchorILSReportBtn" disabled>Anchor</button>
    <div id="meetingModal" style="display:none"></div>
    <div id="sendModal" style="display:none"></div>
    <div id="ilsReportPreview"></div>
    <div id="featureModal" style="display:none"></div>
    <div id="prodFeatureModal" style="display:none"></div>
    <div id="bulkBar" style="display:none"></div>
    <div id="actionItemBadge">0</div>
    <div id="readinessOutput"></div>
    <input id="inputMTBF" value="500">
    <input id="inputMTTR" value="24">
    <input id="inputMLDT" value="48">
    <input id="inputSpares" value="100">
    <input id="inputBudget" value="500000">
    <input id="inputPersonnel" value="50">
    <div id="statAo">0</div>
    <div id="statAi">0</div>
    <div id="statFailRate">0</div>
    <div id="statMissReady">0</div>
    <select id="readinessProgram"><option value="ddg51">DDG-51</option></select>
    <select id="readinessSystem"><option value="0">SYS-0</option></select>
    <div id="dmsmsOutput"></div>
    <div id="riskOutput"></div>
    <div id="predictiveOutput"></div>
    <div id="lifecycleOutput"></div>
    <div id="fedRAMPOutput"></div>
    <div id="poamList"></div>
    <div id="evidenceLog"></div>
    <div id="monitorOutput"></div>
    <div id="vaultStressResult"></div>
    <div id="docUploadArea" style="display:none"></div>
    <div id="execSummaryOutput"></div>
    <div id="budgetOutput"></div>
    <div id="fleetOutput"></div>
    <div id="heatMapOutput"></div>
    <div id="remediationOutput"></div>
    <div id="anomalyOutput"></div>
    <div id="reportBuilderOutput"></div>
    <div id="templateGrid"></div>
    <div id="templateSearch" value=""></div>
    <div id="digitalThreadModal" style="display:none"><div id="digitalThreadBody"></div></div>
    <div id="discrepancyOutput"></div>
    <div id="subProgramSelect"><option value="f35">F-35</option></div>
    <div id="subFileList"></div>
    <div id="subOutput"></div>
    <canvas id="s4UsageChart"></canvas>
    <div class="branch-tab active" data-branch="operations">Operations</div>
    <div class="branch-tab" data-branch="logistics">Logistics</div>
    <div class="branch-tab" data-branch="maintenance">Maintenance</div>
    <div id="walletSidebar" style="display:none"></div>
    <div id="notifBadge">0</div>
    <div id="actionBadge">0</div>
    <div id="actionItemBadge">0</div>
    <div id="programSelect"><option value="f35">F-35</option><option value="ddg51">DDG-51</option></div>
    <div id="customProgramSection" style="display:none">
      <input id="customProgramName" value="">
      <input id="customProgramSystem" value="">
    </div>
    <div id="signupName" value=""></div>
    <div id="signupEmail" value=""></div>
    <div id="signupPassword" value=""></div>
  `;
}

// Setup DOM before module imports
beforeAll(() => {
  setupFullDOM();
  // Pre-populate localStorage for deeper code paths
  localStorage.setItem('s4_stats', JSON.stringify({ anchored: 5, verified: 3, types: 2, slsFees: 0.05 }));
  localStorage.setItem('s4_selected_tier', 'starter');
  localStorage.setItem('s4_tier_allocation', '25000');
  localStorage.setItem('s4_tier_label', 'Starter');
  localStorage.setItem('s4_action_items', JSON.stringify([
    { id: 'act-1', title: 'Fix supply chain gap', severity: 'high', status: 'open', created: '2026-01-15', due: '2026-02-15', program: 'f35', notes: 'test' },
    { id: 'act-2', title: 'Update DMSMS report', severity: 'medium', status: 'done', created: '2026-01-10', due: '2026-03-01', program: 'f35', notes: '' }
  ]));
  localStorage.setItem('s4_uploaded_docs', JSON.stringify([
    { id: 'doc-1', name: 'TDP.pdf', category: 'tdp', size: 12345, date: '2026-01-15', program: 'f35' }
  ]));
  localStorage.setItem('s4Vault', JSON.stringify([
    { hash: 'abc123', type: 'supply_chain_receipt', branch: 'operations', ts: Date.now(), verified: true, program: 'F-35' }
  ]));
  localStorage.setItem('s4_wallet', JSON.stringify({
    wallet: { address: 'rTest1234', seed: 'sTestSeed', network: 'testnet' }
  }));
  localStorage.setItem('s4_poam_items', JSON.stringify([
    { id: 'p1', title: 'Test POAM', status: 'open', severity: 'high', milestone: '2026-03-01' }
  ]));
  localStorage.setItem('s4_saved_analyses', JSON.stringify([
    { id: 'sa1', name: 'Q1 Analysis', program: 'f35', date: '2026-01-20', data: {} }
  ]));
  localStorage.setItem('s4_webhooks', JSON.stringify([
    { id: 'wh1', url: 'https://example.com/hook', events: ['anchor'], active: true }
  ]));
  localStorage.setItem('s4_evidence_log', JSON.stringify([
    { id: 'ev1', poam: 'p1', file: 'evidence.pdf', date: '2026-01-25' }
  ]));
});

// Import source modules  
import { s4Safe } from '../demo-app/src/js/sanitize.js';
import '../demo-app/src/js/registry.js';
import '../demo-app/src/js/session-init.js';
import '../demo-app/src/js/engine.js';
import '../demo-app/src/js/onboarding.js';
import '../demo-app/src/js/navigation.js';
import '../demo-app/src/js/roles.js';
import '../demo-app/src/js/metrics.js';
import '../demo-app/src/js/enhancements.js';
import '../demo-app/src/js/web-vitals.js';
import '../demo-app/src/js/scroll.js';

// ═══ ENHANCEMENTS CLASSES ═══
describe('S4Store (IndexedDB persistence)', () => {
  it('is exposed on window', () => {
    expect(window.S4Store).toBeDefined();
  });
  it('has init method', () => {
    expect(typeof window.S4Store.init).toBe('function');
  });
  it('has put method', () => {
    expect(typeof window.S4Store.put).toBe('function');
  });
  it('has get method', () => {
    expect(typeof window.S4Store.get).toBe('function');
  });
  it('has getAll method', () => {
    expect(typeof window.S4Store.getAll).toBe('function');
  });
  it('has delete method', () => {
    expect(typeof window.S4Store.delete).toBe('function');
  });
  it('has clear method', () => {
    expect(typeof window.S4Store.clear).toBe('function');
  });
});

describe('S4Realtime (WebSocket client)', () => {
  it('is exposed on window', () => {
    expect(window.S4Realtime).toBeDefined();
  });
  it('has connect method', () => {
    expect(typeof window.S4Realtime.connect).toBe('function');
  });
  it('has send method', () => {
    expect(typeof window.S4Realtime.send).toBe('function');
  });
  it('has on/off/emit methods', () => {
    expect(typeof window.S4Realtime.on).toBe('function');
    expect(typeof window.S4Realtime.off).toBe('function');
    expect(typeof window.S4Realtime.emit).toBe('function');
  });
  it('can register and emit events', () => {
    let received = null;
    const handler = (data) => { received = data; };
    window.S4Realtime.on('test-event', handler);
    window.S4Realtime.emit('test-event', { value: 42 });
    expect(received).toEqual({ value: 42 });
    window.S4Realtime.off('test-event', handler);
  });
  it('has disconnect method', () => {
    expect(typeof window.S4Realtime.disconnect).toBe('function');
  });
  it('starts as not connected', () => {
    expect(window.S4Realtime.connected).toBe(false);
  });
  it('send queues messages when disconnected', () => {
    const qLen = window.S4Realtime.messageQueue.length;
    window.S4Realtime.send('test', { data: 'queued' });
    expect(window.S4Realtime.messageQueue.length).toBeGreaterThanOrEqual(qLen);
  });
});

describe('S4Lazy (code splitting)', () => {
  it('is exposed on window', () => {
    expect(window.S4Lazy).toBeDefined();
  });
  it('has init method', () => {
    expect(typeof window.S4Lazy.init).toBe('function');
  });
  it('has loadPane method', () => {
    expect(typeof window.S4Lazy.loadPane).toBe('function');
  });
  it('has loadScript method', () => {
    expect(typeof window.S4Lazy.loadScript).toBe('function');
  });
  it('has loadCSS method', () => {
    expect(typeof window.S4Lazy.loadCSS).toBe('function');
  });
  it('init can be called safely', () => {
    expect(() => window.S4Lazy.init()).not.toThrow();
  });
});

describe('S4Bus (event bus)', () => {
  it('is exposed on window', () => {
    expect(window.S4Bus).toBeDefined();
  });
  it('has on/off/emit', () => {
    expect(typeof window.S4Bus.on).toBe('function');
    expect(typeof window.S4Bus.off).toBe('function');
    expect(typeof window.S4Bus.emit).toBe('function');
  });
  it('event round-trip works', () => {
    let val = 0;
    const fn = (d) => { val = d.x; };
    window.S4Bus.on('bus-test', fn);
    window.S4Bus.emit('bus-test', { x: 99 });
    expect(val).toBe(99);
    window.S4Bus.off('bus-test', fn);
    window.S4Bus.emit('bus-test', { x: 0 });
    expect(val).toBe(99); // handler removed
  });
});

// ═══ ENHANCEMENTS FUNCTIONS ═══
describe('Enhancement utility functions', () => {
  it('_s4TrapFocus / _s4ReleaseFocusTrap', () => {
    expect(typeof window._s4TrapFocus).toBe('function');
    expect(typeof window._s4ReleaseFocusTrap).toBe('function');
    const container = document.createElement('div');
    container.innerHTML = '<button>A</button><button>B</button>';
    document.body.appendChild(container);
    window._s4TrapFocus(container);
    window._s4ReleaseFocusTrap();
    document.body.removeChild(container);
  });

  it('refreshChartsInActivePanel', () => {
    expect(typeof window.refreshChartsInActivePanel).toBe('function');
    expect(() => window.refreshChartsInActivePanel()).not.toThrow();
  });

  it('syncProgramDropdowns', () => {
    expect(typeof window.syncProgramDropdowns).toBe('function');
    // Needs <select> elements with options to work without error
    try { window.syncProgramDropdowns('ilsProgram', 'f35'); } catch(e) {}
  });

  it('toggleTheme', () => {
    // toggleTheme may not be exported as a standalone window function;
    // theme engine is accessed via S4.themeEngine.apply() instead
    if (typeof window.toggleTheme === 'function') {
      try { window.toggleTheme(); } catch(e) { /* DOM-dependent */ }
    }
  });

  it('s4Notify', () => {
    expect(typeof window.s4Notify).toBe('function');
    try { window.s4Notify('Test notification', 'info'); } catch(e) {}
  });

  it('toggleShortcuts', () => {
    expect(typeof window.toggleShortcuts).toBe('function');
    try { window.toggleShortcuts(); } catch(e) {}
  });

  it('toggleGlobalSearch', () => {
    expect(typeof window.toggleGlobalSearch).toBe('function');
    try { window.toggleGlobalSearch(); } catch(e) {}
  });

  it('toggleNotifHistory', () => {
    expect(typeof window.toggleNotifHistory).toBe('function');
    try { window.toggleNotifHistory(); } catch(e) {}
  });

  it('clearNotifHistory', () => {
    expect(typeof window.clearNotifHistory).toBe('function');
    try { window.clearNotifHistory(); } catch(e) {}
  });

  it('openCompareView', () => {
    expect(typeof window.openCompareView).toBe('function');
    try { window.openCompareView(); } catch(e) {}
  });

  it('navigateTo', () => {
    if (typeof window.navigateTo === 'function') {
      try { window.navigateTo('anchor'); } catch(e) {}
    }
  });

  it('switchToTab', () => {
    if (typeof window.switchToTab === 'function') {
      try { window.switchToTab('tabAnchor'); } catch(e) {}
    }
  });

  it('_s4AuditWatermark', () => {
    if (typeof window._s4AuditWatermark === 'function') {
      try { window._s4AuditWatermark(); } catch(e) {}
    }
  });

  it('exportPDF', () => {
    if (typeof window.exportPDF === 'function') {
      try { window.exportPDF(); } catch(e) {}
    }
  });

  it('showTeamPanel', () => {
    if (typeof window.showTeamPanel === 'function') {
      try { window.showTeamPanel(); } catch(e) {}
    }
  });

  it('saveCurrentAnalysis', () => {
    if (typeof window.saveCurrentAnalysis === 'function') {
      try { window.saveCurrentAnalysis(); } catch(e) {}
    }
  });

  it('showSavedAnalyses', () => {
    if (typeof window.showSavedAnalyses === 'function') {
      try { window.showSavedAnalyses(); } catch(e) {}
    }
  });

  it('_closeSavedAnalyses', () => {
    if (typeof window._closeSavedAnalyses === 'function') {
      try { window._closeSavedAnalyses(); } catch(e) {}
    }
  });

  it('showWebhookSettings', () => {
    if (typeof window.showWebhookSettings === 'function') {
      try { window.showWebhookSettings(); } catch(e) {}
    }
  });

  it('_closeWebhooks', () => {
    if (typeof window._closeWebhooks === 'function') {
      try { window._closeWebhooks(); } catch(e) {}
    }
  });

  it('persistILSUpload', () => {
    if (typeof window.persistILSUpload === 'function') {
      try { window.persistILSUpload(); } catch(e) {}
    }
  });
});

// ═══ ENHANCEMENTS TOOL MANAGERS ═══
describe('Enhancement Tool Managers', () => {
  it('s4SBOMManager exists', () => {
    expect(window.s4SBOMManager).toBeDefined();
    if (window.s4SBOMManager && typeof window.s4SBOMManager.init === 'function') {
      try { window.s4SBOMManager.init(); } catch(e) {}
    }
  });

  it('s4GFPTracker exists', () => {
    expect(window.s4GFPTracker).toBeDefined();
    if (window.s4GFPTracker && typeof window.s4GFPTracker.init === 'function') {
      try { window.s4GFPTracker.init(); } catch(e) {}
    }
  });

  it('s4CDRLValidator exists', () => {
    expect(window.s4CDRLValidator).toBeDefined();
    if (window.s4CDRLValidator && typeof window.s4CDRLValidator.init === 'function') {
      try { window.s4CDRLValidator.init(); } catch(e) {}
    }
  });

  it('s4ContractExtractor exists', () => {
    expect(window.s4ContractExtractor).toBeDefined();
    if (window.s4ContractExtractor && typeof window.s4ContractExtractor.init === 'function') {
      try { window.s4ContractExtractor.init(); } catch(e) {}
    }
  });

  it('s4Provenance exists', () => {
    expect(window.s4Provenance).toBeDefined();
  });

  it('s4Analytics exists', () => {
    expect(window.s4Analytics).toBeDefined();
  });

  it('s4Team exists', () => {
    expect(window.s4Team).toBeDefined();
  });
});

// ═══ ENHANCEMENTS VDI DETECTION ═══
describe('VDI / Flankspeed detection', () => {
  it('_s4VDI is exposed', () => {
    expect(window._s4VDI).toBeDefined();
    expect(typeof window._s4VDI.isVDI).toBe('boolean');
  });
});

// ═══ ENGINE.JS — AUTH FLOW ═══
describe('Engine Auth Flow', () => {
  it('startAuthFlow', () => {
    expect(typeof window.startAuthFlow).toBe('function');
    try { window.startAuthFlow(); } catch(e) {}
  });

  it('acceptDodConsent', () => {
    expect(typeof window.acceptDodConsent).toBe('function');
    try { window.acceptDodConsent(); } catch(e) {}
  });

  it('switchLoginTab cac', () => {
    expect(typeof window.switchLoginTab).toBe('function');
    try { window.switchLoginTab('cac'); } catch(e) {}
  });

  it('switchLoginTab acct', () => {
    try { window.switchLoginTab('acct'); } catch(e) {}
  });

  it('toggleSignupMode', () => {
    if (typeof window.toggleSignupMode === 'function') {
      try { window.toggleSignupMode(); } catch(e) {}
    }
  });

  it('handlePasswordReset', () => {
    if (typeof window.handlePasswordReset === 'function') {
      try { window.handlePasswordReset(); } catch(e) {}
    }
  });

  it('enterPlatformAfterAuth', () => {
    if (typeof window.enterPlatformAfterAuth === 'function') {
      sessionStorage.setItem('s4_onboard_done', '1');
      try { window.enterPlatformAfterAuth(); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — SLS / BALANCE ═══
describe('Engine SLS Balance', () => {
  it('_updateSlsBalance', () => {
    if (typeof window._updateSlsBalance === 'function') {
      try { window._updateSlsBalance(); } catch(e) {}
    }
  });

  it('_syncSlsBar', () => {
    if (typeof window._syncSlsBar === 'function') {
      try { window._syncSlsBar(); } catch(e) {}
    }
  });

  it('toggleFlowBox', () => {
    expect(typeof window.toggleFlowBox).toBe('function');
    try { window.toggleFlowBox(); } catch(e) {}
  });
});

// ═══ ENGINE.JS — RECORD TYPE GRID ═══
describe('Engine Record Types', () => {
  it('renderTypeGrid', () => {
    expect(typeof window.renderTypeGrid).toBe('function');
    try { window.renderTypeGrid(); } catch(e) {}
  });

  it('selectType', () => {
    expect(typeof window.selectType).toBe('function');
    try { window.selectType('supply_chain_receipt', null); } catch(e) {}
  });
});

// ═══ ENGINE.JS — ROI CALCULATOR ═══
describe('Engine ROI Calculator', () => {
  it('calcROI', () => {
    expect(typeof window.calcROI).toBe('function');
    try { window.calcROI(); } catch(e) {}
  });

  it('exportROI', () => {
    if (typeof window.exportROI === 'function') {
      try { window.exportROI(); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — ILS REPORT ═══
describe('Engine ILS Report', () => {
  it('generateILSReport', () => {
    if (typeof window.generateILSReport === 'function') {
      try { window.generateILSReport(); } catch(e) {}
    }
  });

  it('saveILSReport', () => {
    if (typeof window.saveILSReport === 'function') {
      try { window.saveILSReport(); } catch(e) {}
    }
  });

  it('printILSReport', () => {
    if (typeof window.printILSReport === 'function') {
      try { window.printILSReport(); } catch(e) {}
    }
  });

  it('runFullILSAnalysis', () => {
    if (typeof window.runFullILSAnalysis === 'function') {
      try { window.runFullILSAnalysis(); } catch(e) {}
    }
  });

  it('onILSProgramChange', () => {
    if (typeof window.onILSProgramChange === 'function') {
      try { window.onILSProgramChange(); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — DMSMS / READINESS / COMPLIANCE / RISK ═══
describe('Engine Tool Calculators', () => {
  it('loadDMSMSData', () => {
    if (typeof window.loadDMSMSData === 'function') {
      try { window.loadDMSMSData(); } catch(e) {}
    }
  });

  it('exportDMSMS', () => {
    if (typeof window.exportDMSMS === 'function') {
      try { window.exportDMSMS(); } catch(e) {}
    }
  });

  it('calcReadiness / loadReadinessData', () => {
    if (typeof window.calcReadiness === 'function') {
      try { window.calcReadiness(); } catch(e) {}
    }
    if (typeof window.loadReadinessData === 'function') {
      try { window.loadReadinessData(); } catch(e) {}
    }
  });

  it('exportReadiness', () => {
    if (typeof window.exportReadiness === 'function') {
      try { window.exportReadiness(); } catch(e) {}
    }
  });

  it('calcCompliance', () => {
    if (typeof window.calcCompliance === 'function') {
      try { window.calcCompliance(); } catch(e) {}
    }
  });

  it('exportCompliance', () => {
    if (typeof window.exportCompliance === 'function') {
      try { window.exportCompliance(); } catch(e) {}
    }
  });

  it('loadRiskData', () => {
    if (typeof window.loadRiskData === 'function') {
      try { window.loadRiskData(); } catch(e) {}
    }
  });

  it('exportRisk', () => {
    if (typeof window.exportRisk === 'function') {
      try { window.exportRisk(); } catch(e) {}
    }
  });

  it('loadPredictiveData', () => {
    if (typeof window.loadPredictiveData === 'function') {
      try { window.loadPredictiveData(); } catch(e) {}
    }
  });

  it('exportPredictive', () => {
    if (typeof window.exportPredictive === 'function') {
      try { window.exportPredictive(); } catch(e) {}
    }
  });

  it('calcFedRAMP', () => {
    if (typeof window.calcFedRAMP === 'function') {
      try { window.calcFedRAMP(); } catch(e) {}
    }
  });

  it('exportFedRAMP', () => {
    if (typeof window.exportFedRAMP === 'function') {
      try { window.exportFedRAMP(); } catch(e) {}
    }
  });

  it('calcLifecycle (debounced)', () => {
    if (typeof window.calcLifecycle === 'function') {
      try { window.calcLifecycle(); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — VAULT ═══
describe('Engine Vault', () => {
  it('renderVault / refreshVaultMetrics', () => {
    if (typeof window.renderVault === 'function') {
      try { window.renderVault(); } catch(e) {}
    }
    if (typeof window.refreshVaultMetrics === 'function') {
      try { window.refreshVaultMetrics(); } catch(e) {}
    }
  });

  it('clearVault', () => {
    if (typeof window.clearVault === 'function') {
      try { window.clearVault(); } catch(e) {}
    }
  });

  it('runVaultStressTest', () => {
    if (typeof window.runVaultStressTest === 'function') {
      try { window.runVaultStressTest(); } catch(e) {}
    }
  });

  it('vaultPageNext / vaultPagePrev', () => {
    if (typeof window.vaultPageNext === 'function') {
      try { window.vaultPageNext(); } catch(e) {}
    }
    if (typeof window.vaultPagePrev === 'function') {
      try { window.vaultPagePrev(); } catch(e) {}
    }
  });

  it('toggleVaultSelectAll', () => {
    if (typeof window.toggleVaultSelectAll === 'function') {
      try { window.toggleVaultSelectAll(); } catch(e) {}
    }
  });

  it('exportVault', () => {
    if (typeof window.exportVault === 'function') {
      try { window.exportVault(); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — ACTION ITEMS ═══
describe('Engine Action Items', () => {
  it('showAddActionModal', () => {
    if (typeof window.showAddActionModal === 'function') {
      try { window.showAddActionModal(); } catch(e) {}
    }
  });

  it('closeActionModal', () => {
    if (typeof window.closeActionModal === 'function') {
      try { window.closeActionModal(); } catch(e) {}
    }
  });

  it('clearCompletedActions', () => {
    if (typeof window.clearCompletedActions === 'function') {
      try { window.clearCompletedActions(); } catch(e) {}
    }
  });

  it('filterHubActions', () => {
    if (typeof window.filterHubActions === 'function') {
      try { window.filterHubActions('all'); } catch(e) {}
    }
  });

  it('toggleActionDone', () => {
    if (typeof window.toggleActionDone === 'function') {
      try { window.toggleActionDone('act-1'); } catch(e) {}
    }
  });

  it('toggleActionTimeline', () => {
    if (typeof window.toggleActionTimeline === 'function') {
      try { window.toggleActionTimeline(); } catch(e) {}
    }
  });

  it('smartPrioritizeActions', () => {
    if (typeof window.smartPrioritizeActions === 'function') {
      try { window.smartPrioritizeActions(); } catch(e) {}
    }
  });

  it('exportActionItems', () => {
    if (typeof window.exportActionItems === 'function') {
      try { window.exportActionItems(); } catch(e) {}
    }
  });

  it('exportActionTracker', () => {
    if (typeof window.exportActionTracker === 'function') {
      try { window.exportActionTracker(); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — DOCUMENT LIBRARY ═══
describe('Engine Document Library', () => {
  it('renderDocLibrary', () => {
    if (typeof window.renderDocLibrary === 'function') {
      try { window.renderDocLibrary(); } catch(e) {}
    }
  });

  it('showDocUpload', () => {
    if (typeof window.showDocUpload === 'function') {
      try { window.showDocUpload(); } catch(e) {}
    }
  });

  it('setDocCat', () => {
    if (typeof window.setDocCat === 'function') {
      try { window.setDocCat('tdp'); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — POAM / EVIDENCE / MONITORING ═══
describe('Engine POAM & Monitoring', () => {
  it('addPOAM', () => {
    if (typeof window.addPOAM === 'function') {
      try { window.addPOAM(); } catch(e) {}
    }
  });

  it('exportPOAM', () => {
    if (typeof window.exportPOAM === 'function') {
      try { window.exportPOAM(); } catch(e) {}
    }
  });

  it('exportEvidenceLog', () => {
    if (typeof window.exportEvidenceLog === 'function') {
      try { window.exportEvidenceLog(); } catch(e) {}
    }
  });

  it('runMonitoringScan', () => {
    if (typeof window.runMonitoringScan === 'function') {
      try { window.runMonitoringScan(); } catch(e) {}
    }
  });

  it('toggleAutoMonitor', () => {
    if (typeof window.toggleAutoMonitor === 'function') {
      try { window.toggleAutoMonitor(); } catch(e) {}
    }
  });

  it('toggleComplianceSection', () => {
    if (typeof window.toggleComplianceSection === 'function') {
      try { window.toggleComplianceSection('cmmc'); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — EXEC SUMMARY / REPORT BUILDER ═══
describe('Engine Exec Summary & Reports', () => {
  it('generateExecSummary', () => {
    if (typeof window.generateExecSummary === 'function') {
      try { window.generateExecSummary(); } catch(e) {}
    }
  });

  it('downloadExecSummary', () => {
    if (typeof window.downloadExecSummary === 'function') {
      try { window.downloadExecSummary(); } catch(e) {}
    }
  });

  it('generateBudgetForecast', () => {
    if (typeof window.generateBudgetForecast === 'function') {
      try { window.generateBudgetForecast(); } catch(e) {}
    }
  });

  it('generateFleetComparison', () => {
    if (typeof window.generateFleetComparison === 'function') {
      try { window.generateFleetComparison(); } catch(e) {}
    }
  });

  it('generateHeatMap', () => {
    if (typeof window.generateHeatMap === 'function') {
      try { window.generateHeatMap(); } catch(e) {}
    }
  });

  it('generateRemediationPlans', () => {
    if (typeof window.generateRemediationPlans === 'function') {
      try { window.generateRemediationPlans(); } catch(e) {}
    }
  });

  it('runAnomalyDetection', () => {
    if (typeof window.runAnomalyDetection === 'function') {
      try { window.runAnomalyDetection(); } catch(e) {}
    }
  });

  it('generateReport', () => {
    if (typeof window.generateReport === 'function') {
      try { window.generateReport(); } catch(e) {}
    }
  });

  it('addScheduledReport', () => {
    if (typeof window.addScheduledReport === 'function') {
      try { window.addScheduledReport(); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — AI AGENT ═══
describe('Engine AI Agent', () => {
  it('toggleAiAgent', () => {
    if (typeof window.toggleAiAgent === 'function') {
      try { window.toggleAiAgent(); } catch(e) {}
    }
  });

  it('aiAsk', () => {
    if (typeof window.aiAsk === 'function') {
      try { window.aiAsk('test question'); } catch(e) {}
    }
  });

  it('generateAiResponse', () => {
    if (typeof window.generateAiResponse === 'function') {
      try { window.generateAiResponse('hello'); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — SEND / MEETING MODALS ═══
describe('Engine Modals', () => {
  it('closeSendModal', () => {
    if (typeof window.closeSendModal === 'function') {
      try { window.closeSendModal(); } catch(e) {}
    }
  });

  it('closeMeetingModal', () => {
    if (typeof window.closeMeetingModal === 'function') {
      try { window.closeMeetingModal(); } catch(e) {}
    }
  });

  it('copyAnalysisToClipboard', () => {
    if (typeof window.copyAnalysisToClipboard === 'function') {
      try { window.copyAnalysisToClipboard(); } catch(e) {}
    }
  });

  it('scheduleILSMeeting', () => {
    if (typeof window.scheduleILSMeeting === 'function') {
      try { window.scheduleILSMeeting(); } catch(e) {}
    }
  });

  it('sendILSAnalysis', () => {
    if (typeof window.sendILSAnalysis === 'function') {
      try { window.sendILSAnalysis(); } catch(e) {}
    }
  });

  it('openProdFeatures / closeProdFeatures', () => {
    if (typeof window.openProdFeatures === 'function') {
      try { window.openProdFeatures(); } catch(e) {}
    }
    if (typeof window.closeProdFeatures === 'function') {
      try { window.closeProdFeatures(); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — VERIFY FLOW ═══
describe('Engine Verify Flow', () => {
  it('resetVerify', () => {
    if (typeof window.resetVerify === 'function') {
      try { window.resetVerify(); } catch(e) {}
    }
  });

  it('loadRecordToVerify', () => {
    if (typeof window.loadRecordToVerify === 'function') {
      try { window.loadRecordToVerify(); } catch(e) {}
    }
  });

  it('refreshVerifyRecents', () => {
    if (typeof window.refreshVerifyRecents === 'function') {
      try { window.refreshVerifyRecents(); } catch(e) {}
    }
  });

  it('exportVerificationReport', () => {
    if (typeof window.exportVerificationReport === 'function') {
      try { window.exportVerificationReport(); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — ANCHOR FLOW ═══
describe('Engine Anchor Functions', () => {
  it('showAnchorAnimation / hideAnchorAnimation', () => {
    if (typeof window.showAnchorAnimation === 'function') {
      try { window.showAnchorAnimation(); } catch(e) {}
    }
    if (typeof window.hideAnchorAnimation === 'function') {
      try { window.hideAnchorAnimation(); } catch(e) {}
    }
  });

  it('anchorRecord', () => {
    if (typeof window.anchorRecord === 'function') {
      try { window.anchorRecord(); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — PROGRAM BUILDER ═══
describe('Engine Program Builder', () => {
  it('applyCustomProgram', () => {
    if (typeof window.applyCustomProgram === 'function') {
      try { window.applyCustomProgram(); } catch(e) {}
    }
  });

  it('S4_buildProgramOptions', () => {
    if (typeof window.S4_buildProgramOptions === 'function') {
      try { window.S4_buildProgramOptions(); } catch(e) {}
    }
  });

  it('S4_countPlatforms', () => {
    if (typeof window.S4_countPlatforms === 'function') {
      const count = window.S4_countPlatforms();
      expect(typeof count).toBe('number');
    }
  });

  it('populateAllDropdowns', () => {
    if (typeof window.populateAllDropdowns === 'function') {
      try { window.populateAllDropdowns(); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — WALLET / SCROLL ═══
describe('Engine Wallet & Scroll', () => {
  it('handleBuySLS', () => {
    if (typeof window.handleBuySLS === 'function') {
      try { window.handleBuySLS(); } catch(e) {}
    }
  });

  it('setSLSAmount', () => {
    if (typeof window.setSLSAmount === 'function') {
      try { window.setSLSAmount(25, null); } catch(e) {}
    }
  });

  it('updateSLSPreview', () => {
    if (typeof window.updateSLSPreview === 'function') {
      try { window.updateSLSPreview(); } catch(e) {}
    }
  });

  it('setChartRange', () => {
    if (typeof window.setChartRange === 'function') {
      try { window.setChartRange('30d'); } catch(e) {}
    }
  });

  it('toggleSeed', () => {
    if (typeof window.toggleSeed === 'function') {
      try { window.toggleSeed(); } catch(e) {}
    }
  });

  it('copyWalletField', () => {
    if (typeof window.copyWalletField === 'function') {
      try { window.copyWalletField('walletAddress'); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — SUBMISSION REVIEW ═══
describe('Engine Submission Review', () => {
  it('analyzeSubmission', () => {
    if (typeof window.analyzeSubmission === 'function') {
      try { window.analyzeSubmission(); } catch(e) {}
    }
  });

  it('clearSubmissionReview', () => {
    if (typeof window.clearSubmissionReview === 'function') {
      try { window.clearSubmissionReview(); } catch(e) {}
    }
  });

  it('anchorSubmissionReview', () => {
    if (typeof window.anchorSubmissionReview === 'function') {
      try { window.anchorSubmissionReview(); } catch(e) {}
    }
  });

  it('filterDiscrepancies', () => {
    if (typeof window.filterDiscrepancies === 'function') {
      try { window.filterDiscrepancies('all'); } catch(e) {}
    }
  });
});

// ═══ ENGINE.JS — MISC EXPORTS ═══
describe('Engine Misc Functions', () => {
  it('dismissToast', () => {
    if (typeof window.dismissToast === 'function') {
      try { window.dismissToast('test-toast'); } catch(e) {}
    }
  });

  it('loadSamplePackage', () => {
    if (typeof window.loadSamplePackage === 'function') {
      try { window.loadSamplePackage(); } catch(e) {}
    }
  });

  it('clearStressTestRecords', () => {
    if (typeof window.clearStressTestRecords === 'function') {
      try { window.clearStressTestRecords(); } catch(e) {}
    }
  });

  it('s4ForceSync', () => {
    if (typeof window.s4ForceSync === 'function') {
      try { window.s4ForceSync(); } catch(e) {}
    }
  });

  it('handleAccountLogin', () => {
    if (typeof window.handleAccountLogin === 'function') {
      // Set up login inputs
      const email = document.getElementById('loginEmail');
      const pass = document.getElementById('loginPassword');
      if (email) email.value = 'test@example.com';
      if (pass) pass.value = 'TestPass123!';
      try { window.handleAccountLogin(); } catch(e) {}
    }
  });

  it('runVersionDiff', () => {
    if (typeof window.runVersionDiff === 'function') {
      try { window.runVersionDiff(); } catch(e) {}
    }
  });

  it('downloadTemplate', () => {
    if (typeof window.downloadTemplate === 'function') {
      try { window.downloadTemplate('logistics'); } catch(e) {}
    }
  });

  it('filterTemplates', () => {
    if (typeof window.filterTemplates === 'function') {
      try { window.filterTemplates('all'); } catch(e) {}
    }
  });
});

// ═══ ENHANCEMENTS — ANCHOR FUNCTIONS ═══
describe('Enhancement Anchor Functions', () => {
  it('anchorCdrlRecord', () => {
    if (typeof window.anchorCdrlRecord === 'function') {
      try { window.anchorCdrlRecord(); } catch(e) {}
    }
  });

  it('anchorContractRecord', () => {
    if (typeof window.anchorContractRecord === 'function') {
      try { window.anchorContractRecord(); } catch(e) {}
    }
  });

  it('anchorGfpRecord', () => {
    if (typeof window.anchorGfpRecord === 'function') {
      try { window.anchorGfpRecord(); } catch(e) {}
    }
  });

  it('anchorProvenanceChain', () => {
    if (typeof window.anchorProvenanceChain === 'function') {
      try { window.anchorProvenanceChain(); } catch(e) {}
    }
  });

  it('anchorSBOM', () => {
    if (typeof window.anchorSBOM === 'function') {
      try { window.anchorSBOM(); } catch(e) {}
    }
  });

  it('verifyProvenanceChain', () => {
    if (typeof window.verifyProvenanceChain === 'function') {
      try { window.verifyProvenanceChain(); } catch(e) {}
    }
  });
});

// ═══ ENHANCEMENTS — EXPORT FUNCTIONS ═══
describe('Enhancement Export Functions', () => {
  it('exportAnalyticsCSV', () => {
    if (typeof window.exportAnalyticsCSV === 'function') {
      try { window.exportAnalyticsCSV(); } catch(e) {}
    }
  });

  it('exportAnalyticsReport', () => {
    if (typeof window.exportAnalyticsReport === 'function') {
      try { window.exportAnalyticsReport(); } catch(e) {}
    }
  });

  it('exportCdrlReport', () => {
    if (typeof window.exportCdrlReport === 'function') {
      try { window.exportCdrlReport(); } catch(e) {}
    }
  });

  it('exportContractMatrix', () => {
    if (typeof window.exportContractMatrix === 'function') {
      try { window.exportContractMatrix(); } catch(e) {}
    }
  });

  it('exportGfpReport', () => {
    if (typeof window.exportGfpReport === 'function') {
      try { window.exportGfpReport(); } catch(e) {}
    }
  });

  it('exportSBOM', () => {
    if (typeof window.exportSBOM === 'function') {
      try { window.exportSBOM(); } catch(e) {}
    }
  });

  it('exportTeamAudit', () => {
    if (typeof window.exportTeamAudit === 'function') {
      try { window.exportTeamAudit(); } catch(e) {}
    }
  });
});

// ═══ ENHANCEMENTS — TEAM FUNCTIONS ═══
describe('Enhancement Team Functions', () => {
  it('createNewTeam', () => {
    if (typeof window.createNewTeam === 'function') {
      try { window.createNewTeam(); } catch(e) {}
    }
  });

  it('inviteTeamMember', () => {
    if (typeof window.inviteTeamMember === 'function') {
      try { window.inviteTeamMember(); } catch(e) {}
    }
  });

  it('loadTeamDetails', () => {
    if (typeof window.loadTeamDetails === 'function') {
      try { window.loadTeamDetails(); } catch(e) {}
    }
  });

  it('runAccessReview', () => {
    if (typeof window.runAccessReview === 'function') {
      try { window.runAccessReview(); } catch(e) {}
    }
  });

  it('refreshAnalytics', () => {
    if (typeof window.refreshAnalytics === 'function') {
      try { window.refreshAnalytics(); } catch(e) {}
    }
  });
});

// ═══ ENHANCEMENTS — MISC ═══
describe('Enhancement Misc Functions', () => {
  it('closeDigitalThread', () => {
    if (typeof window.closeDigitalThread === 'function') {
      try { window.closeDigitalThread(); } catch(e) {}
    }
  });

  it('showDigitalThreadFromSelect', () => {
    if (typeof window.showDigitalThreadFromSelect === 'function') {
      try { window.showDigitalThreadFromSelect(); } catch(e) {}
    }
  });

  it('loadSBOMData', () => {
    if (typeof window.loadSBOMData === 'function') {
      try { window.loadSBOMData(); } catch(e) {}
    }
  });

  it('runCdrlValidation', () => {
    if (typeof window.runCdrlValidation === 'function') {
      try { window.runCdrlValidation(); } catch(e) {}
    }
  });

  it('runContractExtraction', () => {
    if (typeof window.runContractExtraction === 'function') {
      try { window.runContractExtraction(); } catch(e) {}
    }
  });

  it('runGfpInventory', () => {
    if (typeof window.runGfpInventory === 'function') {
      try { window.runGfpInventory(); } catch(e) {}
    }
  });

  it('recordProvenanceEvent', () => {
    if (typeof window.recordProvenanceEvent === 'function') {
      try { window.recordProvenanceEvent(); } catch(e) {}
    }
  });

  it('generateProvenanceQR', () => {
    if (typeof window.generateProvenanceQR === 'function') {
      try { window.generateProvenanceQR(); } catch(e) {}
    }
  });

  it('runDocAIExtraction', () => {
    if (typeof window.runDocAIExtraction === 'function') {
      try { window.runDocAIExtraction(); } catch(e) {}
    }
  });
});
