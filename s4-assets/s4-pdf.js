/* ============================================================
   S4 Ledger — PDF & CSV Export Engine
   v3.9.17 — Context-aware export for every ILS Workspace tool
   Uses html2canvas approach (no external deps) + native print API
   ============================================================ */

const S4PDF = (() => {

    // ── Tool export routing map ──
    const TOOL_MAP = {
        'hub-analysis':    { label: 'Gap Analysis',        csv: 'generateILSReport',  hasCSV: true },
        'hub-actions':     { label: 'Action Items',        csv: 'exportActionItems',  hasCSV: true },
        'hub-calendar':    { label: 'Calendar',            csv: null,                 hasCSV: false },
        'hub-dmsms':       { label: 'DMSMS',               csv: 'exportDMSMS',        hasCSV: true },
        'hub-readiness':   { label: 'Readiness',           csv: 'exportReadiness',    hasCSV: true },
        'hub-parts':       { label: 'Parts',               csv: 'exportParts',        hasCSV: true },
        'hub-roi':         { label: 'ROI',                 csv: 'exportROI',          hasCSV: true },
        'hub-lifecycle':   { label: 'Lifecycle',           csv: 'exportLifecycle',    hasCSV: true },
        'hub-warranty':    { label: 'Warranty',            csv: 'exportWarranty',     hasCSV: true },
        'hub-vault':       { label: 'Audit Vault',         csv: 'exportVault',        hasCSV: true },
        'hub-docs':        { label: 'Doc Library',         csv: null,                 hasCSV: false },
        'hub-compliance':  { label: 'Compliance',          csv: 'exportCompliance',   hasCSV: true },
        'hub-provisioning':{ label: 'Provisioning',        csv: 'exportProvisioning', hasCSV: true },
        'hub-risk':        { label: 'Supply Chain Risk',   csv: 'exportRisk',         hasCSV: true },
        'hub-reports':     { label: 'Audit Reports',       csv: 'downloadReport',     hasCSV: true },
        'hub-contracts':   { label: 'Contracts',           csv: 'exportContracts',    hasCSV: true },
        'hub-thread':      { label: 'Digital Thread',      csv: 'exportThread',       hasCSV: true },
        'hub-predictive':  { label: 'Predictive Maint',    csv: 'exportPredictive',   hasCSV: true },
        'hub-dbimport':    { label: 'Defense DB Import',   csv: 'exportDbImport',     hasCSV: true }
    };

    // ── Detect Active Tool ──
    function getActiveToolId() {
        const active = document.querySelector('.ils-hub-panel.active');
        return active ? active.id : 'hub-analysis';
    }

    // ── Context-Aware CSV Export ──
    function exportActiveToolCSV() {
        const toolId = getActiveToolId();
        const tool = TOOL_MAP[toolId];
        if (!tool) { alert('Unknown tool.'); return; }
        if (!tool.hasCSV || !tool.csv) {
            alert(tool.label + ' does not have tabular data to export as CSV.');
            return;
        }
        // Call the tool's existing export function
        if (typeof window[tool.csv] === 'function') {
            window[tool.csv]();
        } else {
            alert('Export function not available for ' + tool.label);
        }
    }

    // ── Context-Aware PDF Export ──
    function exportActiveToolPDF() {
        const toolId = getActiveToolId();
        const tool = TOOL_MAP[toolId];
        if (!tool) { exportCurrentAnalysis(); return; }

        // For Gap Analysis, use the original detailed report
        if (toolId === 'hub-analysis') { exportCurrentAnalysis(); return; }

        // For all other tools, capture the panel content as a styled PDF
        exportToolPanelPDF(toolId, tool.label);
    }

    // ── Universal Panel-to-PDF Export ──
    function exportToolPanelPDF(panelId, toolLabel) {
        const panel = document.getElementById(panelId);
        if (!panel) { alert('No content to export.'); return; }

        const now = new Date();
        const timestamp = now.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
        const user = typeof S4Auth !== 'undefined' ? S4Auth.getSession() : null;
        const program = document.getElementById('programSelect')?.selectedOptions?.[0]?.text || 'Unknown Program';

        // Extract tables from the panel for structured rendering
        const tables = panel.querySelectorAll('table');
        let tableHTML = '';
        tables.forEach((tbl, idx) => {
            const clone = tbl.cloneNode(true);
            // Strip onclick handlers and inline dark-mode colors for print
            clone.querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));
            clone.querySelectorAll('[style]').forEach(el => {
                const s = el.style;
                if (s.color && (s.color.includes('fff') || s.color.includes('rgb(255'))) s.color = '#1a1a2e';
                if (s.background && s.background.includes('rgba')) s.background = 'transparent';
            });
            tableHTML += '<div class="section"><div class="section-title">' + toolLabel + (tables.length > 1 ? ' — Table ' + (idx + 1) : ' — Data') + '</div>' + clone.outerHTML + '</div>';
        });

        // Extract stat cards / metric values
        const stats = [];
        panel.querySelectorAll('.stat-value, .metric-val, [data-metric]').forEach(el => {
            const label = el.nextElementSibling?.textContent || el.parentElement?.querySelector('.stat-label, small')?.textContent || '';
            stats.push({ value: el.textContent.trim(), label: label.trim() });
        });

        // Extract key text content if no tables
        let contentHTML = '';
        if (!tables.length) {
            // Capture visible text content
            const blocks = panel.querySelectorAll('.card, .result-card, [class*="output"], [class*="result"], [class*="breakdown"]');
            if (blocks.length) {
                blocks.forEach(b => {
                    const clone = b.cloneNode(true);
                    clone.querySelectorAll('[style]').forEach(el => {
                        const s = el.style;
                        if (s.color && (s.color.includes('fff') || s.color.includes('rgb(255'))) s.color = '#1a1a2e';
                    });
                    contentHTML += '<div class="card" style="margin-bottom:8px">' + clone.innerHTML + '</div>';
                });
            } else {
                contentHTML = '<div class="card"><div style="white-space:pre-wrap;font-family:monospace;font-size:10px">' +
                    (panel.innerText || 'No content available').substring(0, 5000) + '</div></div>';
            }
        }

        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>S4 Ledger — ${toolLabel} Report</title>
<style>
    @page { size: A4; margin: 20mm 15mm; }
    @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, sans-serif; color: #1a1a2e; font-size: 11px; line-height: 1.6; background: #fff; }
    .header { background: linear-gradient(135deg, #050810, #0a1628); color: #fff; padding: 30px; margin: -20mm -15mm 20px; page-break-inside: avoid; }
    .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .header .subtitle { color: #00aaff; font-size: 13px; font-weight: 600; }
    .header .meta { display: flex; gap: 20px; margin-top: 12px; font-size: 10px; color: #8ea4b8; }
    .clf-banner { background: #006400; color: #fff; text-align: center; padding: 4px; font-size: 9px; font-weight: 700; letter-spacing: 2px; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 14px; font-weight: 700; color: #0a1628; border-bottom: 2px solid #00aaff; padding-bottom: 4px; margin-bottom: 12px; }
    .card { border: 1px solid #dee2e6; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0; }
    .stat-box { text-align: center; padding: 12px; border: 1px solid #dee2e6; border-radius: 8px; }
    .stat-value { font-size: 20px; font-weight: 800; color: #00aaff; }
    .stat-label { font-size: 9px; color: #6c757d; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f8f9fa; color: #333; font-weight: 700; text-align: left; padding: 8px 6px; border-bottom: 2px solid #dee2e6; }
    td { padding: 6px; border-bottom: 1px solid #f0f0f0; color: #1a1a2e; }
    tr:nth-child(even) { background: #fafbfc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-weight: 600; font-size: 9px; }
    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #dee2e6; text-align: center; color: #adb5bd; font-size: 9px; }
    .watermark { position: fixed; bottom: 10mm; right: 15mm; font-size: 8px; color: #d0d0d0; }
    i.fas, i.fab { display: none; } /* Hide FA icons in print */
</style></head><body>
<div class="clf-banner">UNCLASSIFIED // FOR OFFICIAL USE ONLY</div>
<div class="header">
    <h1>S4 Ledger — ${toolLabel} Report</h1>
    <div class="subtitle">${program}</div>
    <div class="meta">
        <span>Generated: ${timestamp}</span>
        ${user ? '<span>Analyst: ' + user.name + '</span>' : ''}
        <span>Tool: ${toolLabel}</span>
        <span>Classification: UNCLASSIFIED</span>
    </div>
</div>
${stats.length ? '<div class="section"><div class="section-title">Summary Metrics</div><div class="stats-grid">' +
    stats.slice(0, 8).map(s => '<div class="stat-box"><div class="stat-value">' + s.value + '</div><div class="stat-label">' + s.label + '</div></div>').join('') +
    '</div></div>' : ''}
${tableHTML}
${contentHTML ? '<div class="section"><div class="section-title">' + toolLabel + ' Details</div>' + contentHTML + '</div>' : ''}
<div class="footer">
    <div>S4 Ledger — Hash-Verified Defense Logistics Platform</div>
    <div>Report ID: RPT-${Date.now().toString(36).toUpperCase()} | Powered by XRPL</div>
    <div style="margin-top:4px">&copy; 2026 S4 Ledger. All Rights Reserved. | s4ledger.com</div>
</div>
<div class="clf-banner" style="position:fixed;bottom:0;left:0;right:0">UNCLASSIFIED // FOR OFFICIAL USE ONLY</div>
<div class="watermark">S4 Ledger v3.9.17</div>
</body></html>`;

        const printWindow = window.open('', '_blank', 'width=800,height=1100');
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
    }
    // ── Core Export Function ──
    function exportReport(options = {}) {
        const {
            title = 'S4 Ledger — ILS Analysis Report',
            program = 'Unknown Program',
            platform = '',
            readiness = 0,
            gaps = [],
            findings = [],
            actionItems = [],
            vaultRecords = [],
            includeTimestamp = true,
            includeClassification = true
        } = options;

        const now = new Date();
        const timestamp = now.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
        const user = typeof S4Auth !== 'undefined' ? S4Auth.getSession() : null;

        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
    @page { size: A4; margin: 20mm 15mm; }
    @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, sans-serif; color: #1a1a2e; font-size: 11px; line-height: 1.6; background: #fff; }
    .header { background: linear-gradient(135deg, #050810, #0a1628); color: #fff; padding: 30px; margin: -20mm -15mm 20px; page-break-inside: avoid; }
    .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .header .subtitle { color: #00aaff; font-size: 13px; font-weight: 600; }
    .header .meta { display: flex; gap: 20px; margin-top: 12px; font-size: 10px; color: #8ea4b8; }
    .header .meta span { display: inline-flex; align-items: center; gap: 4px; }
    .clf-banner { background: #006400; color: #fff; text-align: center; padding: 4px; font-size: 9px; font-weight: 700; letter-spacing: 2px; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 14px; font-weight: 700; color: #0a1628; border-bottom: 2px solid #00aaff; padding-bottom: 4px; margin-bottom: 12px; }
    .readiness-bar { height: 24px; background: #e9ecef; border-radius: 12px; overflow: hidden; margin: 8px 0; }
    .readiness-fill { height: 100%; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; color: #fff; }
    .card { border: 1px solid #dee2e6; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
    .gap-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
    .gap-icon { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; }
    .gap-critical { background: #dc3545; }
    .gap-warning { background: #ffc107; color: #333; }
    .gap-ok { background: #28a745; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f8f9fa; color: #333; font-weight: 700; text-align: left; padding: 8px 6px; border-bottom: 2px solid #dee2e6; }
    td { padding: 6px; border-bottom: 1px solid #f0f0f0; }
    tr:nth-child(even) { background: #fafbfc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-weight: 600; font-size: 9px; }
    .badge-critical { background: #ffeaee; color: #dc3545; }
    .badge-high { background: #fff3e0; color: #e65100; }
    .badge-medium { background: #fff8e1; color: #f57f17; }
    .badge-low { background: #e8f5e9; color: #2e7d32; }
    .badge-open { background: #e3f2fd; color: #1565c0; }
    .badge-closed { background: #e8f5e9; color: #2e7d32; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0; }
    .stat-box { text-align: center; padding: 12px; border: 1px solid #dee2e6; border-radius: 8px; }
    .stat-value { font-size: 20px; font-weight: 800; color: #00aaff; }
    .stat-label { font-size: 9px; color: #6c757d; margin-top: 2px; }
    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #dee2e6; text-align: center; color: #adb5bd; font-size: 9px; }
    .footer img { height: 20px; margin-bottom: 4px; }
    .watermark { position: fixed; bottom: 10mm; right: 15mm; font-size: 8px; color: #d0d0d0; }
</style>
</head>
<body>
${includeClassification ? '<div class="clf-banner">UNCLASSIFIED // FOR OFFICIAL USE ONLY</div>' : ''}

<div class="header">
    <h1>${title}</h1>
    <div class="subtitle">${program}${platform ? ' — ' + platform : ''}</div>
    <div class="meta">
        ${includeTimestamp ? `<span>Generated: ${timestamp}</span>` : ''}
        ${user ? `<span>Analyst: ${user.name} (${user.email})</span>` : ''}
        <span>Classification: UNCLASSIFIED</span>
    </div>
</div>

<div class="section">
    <div class="section-title">Executive Summary</div>
    <div class="stats-grid">
        <div class="stat-box">
            <div class="stat-value">${readiness}%</div>
            <div class="stat-label">Readiness Score</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${gaps.filter(g => g.severity === 'critical').length}</div>
            <div class="stat-label">Critical Gaps</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${actionItems.length}</div>
            <div class="stat-label">Action Items</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${findings.length}</div>
            <div class="stat-label">Findings</div>
        </div>
    </div>
    <div class="readiness-bar">
        <div class="readiness-fill" style="width:${readiness}%;background:${readiness >= 80 ? '#28a745' : readiness >= 60 ? '#ffc107' : '#dc3545'}">${readiness}%</div>
    </div>
</div>

${gaps.length ? `
<div class="section">
    <div class="section-title">Gap Analysis (${gaps.length} items)</div>
    ${gaps.map(g => `
        <div class="gap-item">
            <div class="gap-icon ${g.severity === 'critical' ? 'gap-critical' : g.severity === 'warning' ? 'gap-warning' : 'gap-ok'}">${g.severity === 'critical' ? '!' : g.severity === 'warning' ? '?' : '✓'}</div>
            <div style="flex:1">
                <div style="font-weight:600">${g.id || ''} — ${g.title || g.name || ''}</div>
                ${g.description ? `<div style="color:#6c757d;font-size:10px">${g.description}</div>` : ''}
            </div>
            <span class="badge badge-${g.severity || 'medium'}">${(g.severity || 'medium').toUpperCase()}</span>
        </div>
    `).join('')}
</div>` : ''}

${actionItems.length ? `
<div class="section">
    <div class="section-title">Action Items (${actionItems.length})</div>
    <table>
        <thead><tr><th>#</th><th>Title</th><th>Priority</th><th>Assignee</th><th>Due Date</th><th>Status</th></tr></thead>
        <tbody>
        ${actionItems.map((a, i) => `
            <tr>
                <td>${i + 1}</td>
                <td style="font-weight:500">${a.title || ''}</td>
                <td><span class="badge badge-${a.priority || 'medium'}">${(a.priority || 'MEDIUM').toUpperCase()}</span></td>
                <td>${a.assignee || 'Unassigned'}</td>
                <td>${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</td>
                <td><span class="badge badge-${a.status === 'closed' ? 'closed' : 'open'}">${(a.status || 'OPEN').toUpperCase()}</span></td>
            </tr>
        `).join('')}
        </tbody>
    </table>
</div>` : ''}

${vaultRecords.length ? `
<div class="section">
    <div class="section-title">Anchored Records (${vaultRecords.length})</div>
    <table>
        <thead><tr><th>Timestamp</th><th>Type</th><th>Branch</th><th>SHA-256 Hash</th></tr></thead>
        <tbody>
        ${vaultRecords.slice(0, 20).map(v => `
            <tr>
                <td>${v.timestamp ? new Date(v.timestamp).toLocaleString() : ''}</td>
                <td style="font-weight:500">${v.label || v.type || ''}</td>
                <td>${v.branch || ''}</td>
                <td style="font-family:monospace;font-size:9px">${(v.hash || '').substring(0, 32)}...</td>
            </tr>
        `).join('')}
        </tbody>
    </table>
    ${vaultRecords.length > 20 ? `<div style="text-align:center;color:#adb5bd;font-size:10px;margin-top:4px">+ ${vaultRecords.length - 20} more records</div>` : ''}
</div>` : ''}

<div class="footer">
    <div>S4 Ledger — Hash-Verified Defense Logistics Platform</div>
    <div>Report ID: RPT-${Date.now().toString(36).toUpperCase()} | Powered by XRPL</div>
    <div style="margin-top:4px">&copy; 2026 S4 Ledger. All Rights Reserved. | s4ledger.com</div>
</div>

${includeClassification ? '<div class="clf-banner" style="position:fixed;bottom:0;left:0;right:0">UNCLASSIFIED // FOR OFFICIAL USE ONLY</div>' : ''}

<div class="watermark">S4 Ledger v3.9.17</div>
</body>
</html>`;

        // Open in new window and trigger print
        const printWindow = window.open('', '_blank', 'width=800,height=1100');
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
        
        return true;
    }

    // ── Quick Export Current View ──
    function exportCurrentAnalysis() {
        // Gather data from the current ILS workspace state
        const program = document.getElementById('programSelect')?.selectedOptions?.[0]?.text || 'Unknown';
        const platform = document.getElementById('platformInput')?.value || '';
        
        // Try to get readiness from the display
        const readinessEl = document.querySelector('.readiness-score, .gauge-value, [data-readiness]');
        const readiness = readinessEl ? parseInt(readinessEl.textContent || readinessEl.dataset.readiness || '0') : 0;
        
        // Gather action items from DOM
        const actionItems = [];
        document.querySelectorAll('.action-item, .ai-item, [data-action-item]').forEach(el => {
            actionItems.push({
                title: el.querySelector('.ai-title, h5, strong')?.textContent || '',
                priority: el.dataset.priority || 'medium',
                status: el.dataset.status || 'open',
                assignee: el.querySelector('.ai-assignee, [data-assignee]')?.textContent || 'Unassigned'
            });
        });

        exportReport({ program, platform, readiness, actionItems });
    }

    // ── Export Vault to CSV ──
    function exportVaultCSV(records) {
        if (!records || !records.length) {
            alert('No records to export.');
            return;
        }
        const headers = ['Timestamp', 'Type', 'Branch', 'Label', 'Hash', 'TX Hash', 'Source'];
        const rows = records.map(r => [
            r.timestamp ? new Date(r.timestamp).toISOString() : '',
            r.type || '', r.branch || '', r.label || '',
            r.hash || '', r.txHash || '', r.source || ''
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
        downloadFile(csv, 's4_vault_export_' + Date.now() + '.csv', 'text/csv');
    }

    // ── Export Action Items to CSV ──
    function exportActionItemsCSV(items) {
        if (!items || !items.length) {
            alert('No action items to export.');
            return;
        }
        const headers = ['Title', 'Priority', 'Status', 'Assignee', 'Due Date', 'Created'];
        const rows = items.map(i => [
            i.title || '', i.priority || '', i.status || '',
            i.assignee || '', i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '',
            i.created ? new Date(i.created).toLocaleDateString() : ''
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
        downloadFile(csv, 's4_action_items_' + Date.now() + '.csv', 'text/csv');
    }

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return { exportReport, exportCurrentAnalysis, exportVaultCSV, exportActionItemsCSV, exportActiveToolPDF, exportActiveToolCSV, getActiveToolId, TOOL_MAP };
})();
