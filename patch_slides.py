#!/usr/bin/env python3
"""Patch program-schedule/index.html:
1. Replace Add Slide dropdown with template picker modal button
2. Add template modal HTML before </body>
3. Add CSS for modal
4. Replace sePopulateAddMenu JS with seOpenTemplateModal helpers
"""

with open('program-schedule/index.html', 'r') as f:
    html = f.read()

# ── 1. CSS: replace #se-add-menu block with modal CSS ──────────────────────
OLD_CSS = """#se-add-wrap { position:relative; }
#se-add-menu {
  display:none; position:absolute; top:calc(100% + 5px); left:0;
  background:var(--surface); border:1px solid var(--border);
  border-radius:9px; padding:4px 0; min-width:210px;
  box-shadow:var(--shadow-lg); z-index:9700;
}
.se-add-item {
  display:flex; align-items:center; gap:8px;
  padding:7px 14px; font-size:12px; cursor:pointer; color:var(--text); white-space:nowrap;
}
.se-add-item:hover { background:rgba(0,122,255,.07); color:var(--accent); }
.se-add-sep { height:1px; background:var(--border); margin:3px 0; }"""

NEW_CSS = """#se-add-wrap { position:relative; }
/* template modal */
#se-tpl-modal {
  display:none; position:fixed; inset:0;
  background:rgba(0,0,0,.55); z-index:9800;
  align-items:center; justify-content:center;
}
#se-tpl-modal.open { display:flex; }
#se-tpl-box {
  background:#f5f5f5; border-radius:8px; padding:22px 24px 18px;
  width:780px; max-width:96vw; max-height:90vh; overflow-y:auto;
  box-shadow:0 12px 40px rgba(0,0,0,.35);
  font-family:inherit; position:relative;
}
#se-tpl-box h3 {
  margin:0 0 6px; font-size:16px; color:#1c3a5f; font-weight:700;
  display:flex; align-items:center; justify-content:space-between;
}
.se-tpl-section { margin-top:16px; }
.se-tpl-section-label {
  font-size:10px; font-weight:700; color:#666; text-transform:uppercase;
  letter-spacing:.08em; margin-bottom:10px; padding-bottom:4px;
  border-bottom:1px solid #ddd;
}
.se-tpl-grid {
  display:flex; flex-wrap:wrap; gap:12px;
}
.se-tpl-card {
  width:120px; cursor:pointer; border-radius:5px; padding:6px 6px 8px;
  background:#fff; border:2px solid #ddd; text-align:center;
  transition:border-color .15s, box-shadow .15s;
}
.se-tpl-card:hover {
  border-color:#0078d4; box-shadow:0 2px 8px rgba(0,120,212,.22);
}
.se-tpl-card svg {
  width:108px; height:81px; display:block; margin:0 auto 5px;
  border-radius:2px; overflow:hidden;
}
.se-tpl-label {
  font-size:10px; color:#333; font-weight:600; line-height:1.25;
}"""

if OLD_CSS in html:
    html = html.replace(OLD_CSS, NEW_CSS)
    print('CSS replaced OK')
else:
    print('WARNING: OLD_CSS not found exactly')

# ── 2. Button HTML: replace the whole se-add-wrap block ────────────────────
OLD_BTN = """      <div id="se-add-wrap">
        <button class="abtn btn-o" onclick="seToggleAddMenu(event)" style="font-size:11px;padding:4px 10px">
          <i class="fas fa-plus fa-xs"></i> Add Slide
          <i class="fas fa-chevron-down" style="font-size:8px;margin-left:2px"></i>
        </button>
        <div id="se-add-menu">
          <div id="se-add-type-items"></div>
          <div class="se-add-sep"></div>
          <div class="se-add-item" onclick="seAddSlide('acq');seCloseAddMenu()">
            <i class="fas fa-chart-gantt fa-xs" style="color:#af52de"></i> Acquisition Events Template
          </div>
          <div class="se-add-sep"></div>
          <div class="se-add-item" onclick="seAddSlide('blank');seCloseAddMenu()">
            <i class="fas fa-file fa-xs" style="color:var(--steel)"></i> Blank Slide
          </div>
        </div>
      </div>"""

NEW_BTN = """      <div id="se-add-wrap">
        <button class="abtn btn-o" onclick="seOpenTemplateModal()" style="font-size:11px;padding:4px 10px">
          <i class="fas fa-plus fa-xs"></i> New Slide
        </button>
      </div>"""

if OLD_BTN in html:
    html = html.replace(OLD_BTN, NEW_BTN)
    print('Button HTML replaced OK')
else:
    print('WARNING: OLD_BTN not found exactly')

# ── 3. Modal HTML: insert before </body> ───────────────────────────────────
MODAL_HTML = """
<!-- ══ Add-Slide Template Picker Modal ══════════════════════════════════ -->
<div id="se-tpl-modal" onclick="if(event.target===this)seCloseTemplateModal()">
  <div id="se-tpl-box">
    <h3>New Slide <span onclick="seCloseTemplateModal()" style="cursor:pointer;font-size:17px;color:#888;font-weight:400">&times;</span></h3>

    <!-- PowerPoint standard layouts -->
    <div class="se-tpl-section">
      <div class="se-tpl-section-label">PowerPoint Layouts</div>
      <div class="se-tpl-grid" id="se-ppt-grid"></div>
    </div>

    <!-- S4 Program Schedule templates -->
    <div class="se-tpl-section">
      <div class="se-tpl-section-label">S4 Program Schedule Slides</div>
      <div class="se-tpl-grid" id="se-prog-grid"></div>
    </div>

    <!-- S4 Acquisition templates -->
    <div class="se-tpl-section">
      <div class="se-tpl-section-label">S4 Acquisition Slides</div>
      <div class="se-tpl-grid" id="se-acq-grid"></div>
    </div>
  </div>
</div>

"""

if '</body>' in html:
    html = html.replace('</body>', MODAL_HTML + '</body>')
    print('Modal HTML inserted before </body>')
else:
    print('WARNING: </body> not found')

# ── 4. JS: replace sePopulateAddMenu + add modal functions ─────────────────
OLD_JS = """/* ── Populate the Add Slide dropdown with current types ── */
function sePopulateAddMenu() {
  var el = document.getElementById('se-add-type-items'); if (!el) return;
  var types = [];
  vessels.forEach(function(v){ if(!types.includes(v.type)) types.push(v.type); });
  var icons = { APL:'fa-ship', YRBM:'fa-anchor', YFB:'fa-water', YTB:'fa-ferry' };
  el.innerHTML = types.map(function(t){
    var icon = icons[t]||'fa-ship';
    var col  = (VT[t]&&VT[t].color)||'var(--accent)';
    return '<div class="se-add-item" onclick="seAddSlide(\\'prog_'+t+'\\');seCloseAddMenu()">'
      +'<i class="fas '+icon+' fa-xs" style="color:'+col+'"></i> '
      +esc(seTypeLabel(t))+' Program Slide</div>'
      +'<div class="se-add-item" onclick="seAddSlide(\\'oneslide_'+t+'\\');seCloseAddMenu()">'
      +'<i class="fas fa-table fa-xs" style="color:#c9a84c"></i> '
      +esc(seTypeLabel(t))+' Acquisition One Slide</div>';
  }).join('')
  + '<div class="se-add-item" onclick="seAddSlide(\\'acq\\');seCloseAddMenu()">'
  + '<i class="fas fa-calendar-alt fa-xs" style="color:#C9A000"></i> Acquisition Milestone Schedule</div>';
}"""

# Since we can't easily predict exact escaping, search differently
import re as _re

OLD_JS_PATTERN = r"/\* ── Populate the Add Slide dropdown with current types ── \*/\nfunction sePopulateAddMenu\(\) \{[\s\S]*?\n\}"

NEW_JS = """/* ── Template Modal ── */
window.seOpenTemplateModal = function() {
  sePopulateTemplateModal();
  var m = document.getElementById('se-tpl-modal');
  if (m) { m.classList.add('open'); }
};
window.seCloseTemplateModal = function() {
  var m = document.getElementById('se-tpl-modal');
  if (m) m.classList.remove('open');
};

function seTplCard(tpl, label, svgBody) {
  return '<div class="se-tpl-card" onclick="seAddSlideFromTpl(\\''+tpl+'\\')">'
    +'<svg viewBox="0 0 108 81" xmlns="http://www.w3.org/2000/svg">'+svgBody+'</svg>'
    +'<div class="se-tpl-label">'+label+'</div>'
    +'</div>';
}

function sePptSvg_title() {
  return '<rect width="108" height="81" fill="#1c3a5f"/>'
    +'<rect x="10" y="28" width="88" height="6" rx="1" fill="#C9A000"/>'
    +'<rect x="22" y="38" width="64" height="3" rx="1" fill="rgba(255,255,255,.5)"/>'
    +'<rect x="32" y="44" width="44" height="2" rx="1" fill="rgba(255,255,255,.3)"/>';
}
function sePptSvg_titleContent() {
  return '<rect width="108" height="81" fill="#f0f4f8"/>'
    +'<rect x="0" y="0" width="108" height="14" fill="#1c3a5f"/>'
    +'<rect x="6" y="3" width="60" height="4" rx="1" fill="rgba(255,255,255,.7)"/>'
    +'<rect x="4" y="17" width="100" height="60" rx="2" fill="#fff" stroke="#ddd" stroke-width=".5"/>'
    +'<rect x="8" y="21" width="50" height="3" rx="1" fill="#1c3a5f"/>'
    +'<rect x="8" y="27" width="88" height="2" rx="1" fill="#ccc"/>'
    +'<rect x="8" y="32" width="70" height="2" rx="1" fill="#ccc"/>'
    +'<rect x="8" y="37" width="80" height="2" rx="1" fill="#ccc"/>'
    +'<rect x="8" y="42" width="55" height="2" rx="1" fill="#ccc"/>';
}
function sePptSvg_sectionHeader() {
  return '<rect width="108" height="81" fill="#1c3a5f"/>'
    +'<rect x="0" y="35" width="108" height="3" fill="#C9A000"/>'
    +'<rect x="15" y="22" width="78" height="5" rx="1" fill="#fff"/>'
    +'<rect x="25" y="43" width="58" height="3" rx="1" fill="rgba(255,255,255,.5)"/>';
}
function sePptSvg_twoContent() {
  return '<rect width="108" height="81" fill="#f0f4f8"/>'
    +'<rect x="0" y="0" width="108" height="13" fill="#1c3a5f"/>'
    +'<rect x="5" y="3" width="55" height="4" rx="1" fill="rgba(255,255,255,.7)"/>'
    +'<rect x="4" y="16" width="47" height="58" rx="2" fill="#fff" stroke="#ddd" stroke-width=".5"/>'
    +'<rect x="8" y="20" width="35" height="3" rx="1" fill="#1c3a5f"/>'
    +'<rect x="8" y="26" width="38" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="8" y="30" width="32" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="57" y="16" width="47" height="58" rx="2" fill="#fff" stroke="#ddd" stroke-width=".5"/>'
    +'<rect x="61" y="20" width="35" height="3" rx="1" fill="#1c3a5f"/>'
    +'<rect x="61" y="26" width="38" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="61" y="30" width="32" height="1.5" rx="1" fill="#ccc"/>';
}
function sePptSvg_comparison() {
  return '<rect width="108" height="81" fill="#f0f4f8"/>'
    +'<rect x="0" y="0" width="108" height="12" fill="#1c3a5f"/>'
    +'<rect x="5" y="2.5" width="55" height="4" rx="1" fill="rgba(255,255,255,.7)"/>'
    +'<rect x="4" y="13" width="47" height="10" rx="1" fill="#1c3a5f"/>'
    +'<rect x="57" y="13" width="47" height="10" rx="1" fill="#C9A000"/>'
    +'<rect x="4" y="26" width="47" height="49" rx="1" fill="#fff" stroke="#ddd" stroke-width=".5"/>'
    +'<rect x="57" y="26" width="47" height="49" rx="1" fill="#fff" stroke="#ddd" stroke-width=".5"/>';
}
function sePptSvg_titleOnly() {
  return '<rect width="108" height="81" fill="#f0f4f8"/>'
    +'<rect x="0" y="0" width="108" height="18" fill="#1c3a5f"/>'
    +'<rect x="6" y="5" width="70" height="5" rx="1" fill="rgba(255,255,255,.8)"/>'
    +'<rect x="6" y="12" width="45" height="2.5" rx="1" fill="rgba(255,255,255,.4)"/>';
}
function sePptSvg_blank() {
  return '<rect width="108" height="81" fill="#fff" stroke="#ddd" stroke-width="1"/>';
}
function sePptSvg_contentCaption() {
  return '<rect width="108" height="81" fill="#f0f4f8"/>'
    +'<rect x="0" y="0" width="108" height="12" fill="#1c3a5f"/>'
    +'<rect x="5" y="2.5" width="55" height="4" rx="1" fill="rgba(255,255,255,.7)"/>'
    +'<rect x="4" y="15" width="30" height="62" rx="1" fill="#fff" stroke="#ddd" stroke-width=".5"/>'
    +'<rect x="6" y="18" width="22" height="3" rx="1" fill="#1c3a5f"/>'
    +'<rect x="6" y="24" width="24" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="6" y="28" width="20" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="37" y="15" width="67" height="62" rx="1" fill="#fff" stroke="#ddd" stroke-width=".5"/>'
    +'<rect x="41" y="20" width="32" height="3" rx="1" fill="#1c3a5f"/>'
    +'<rect x="41" y="26" width="55" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="41" y="30" width="48" height="1.5" rx="1" fill="#ccc"/>';
}
function sePptSvg_pictureCaption() {
  return '<rect width="108" height="81" fill="#f0f4f8"/>'
    +'<rect x="0" y="0" width="108" height="12" fill="#1c3a5f"/>'
    +'<rect x="4" y="15" width="64" height="62" rx="1" fill="#dde" stroke="#bbb" stroke-width=".5"/>'
    +'<text x="36" y="51" font-size="14" fill="#aaa" text-anchor="middle">&#128247;</text>'
    +'<rect x="71" y="15" width="33" height="62" rx="1" fill="#fff" stroke="#ddd" stroke-width=".5"/>'
    +'<rect x="74" y="19" width="24" height="3" rx="1" fill="#1c3a5f"/>'
    +'<rect x="74" y="25" width="26" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="74" y="29" width="22" height="1.5" rx="1" fill="#ccc"/>';
}

/* S4 thumbnails */
function sePptSvg_prog(col) {
  col = col || '#1c3a5f';
  return '<rect width="108" height="81" fill="#f0f4f8"/>'
    +'<rect x="0" y="0" width="108" height="11" fill="'+col+'"/>'
    +'<rect x="3" y="2.5" width="55" height="3.5" rx="1" fill="rgba(255,255,255,.8)"/>'
    +'<rect x="3" y="12" width="108" height="8" fill="#e0e6ee"/>'
    +'<rect x="3" y="21" width="108" height="7" fill="#f5f7fa"/>'
    +'<rect x="3" y="29" width="108" height="7" fill="#e8eef5"/>'
    +'<rect x="3" y="37" width="108" height="7" fill="#f5f7fa"/>'
    +'<rect x="3" y="45" width="108" height="7" fill="#e8eef5"/>'
    +'<rect x="2" y="12" width="26" height="40" fill="rgba(28,58,95,.09)"/>'
    +'<rect x="60" y="14" width="40" height="5" rx="1" fill="'+col+'" opacity=".3"/>'
    +'<rect x="28" y="22" width="70" height="3" rx="1" fill="#C9A000" opacity=".7"/>'
    +'<rect x="28" y="31" width="50" height="3" rx="1" fill="'+col+'" opacity=".5"/>'
    +'<rect x="28" y="40" width="60" height="3" rx="1" fill="'+col+'" opacity=".5"/>';
}
function sePptSvg_oneSlide(col) {
  col = col || '#1c3a5f';
  return '<rect width="108" height="81" fill="#fff"/>'
    +'<rect x="0" y="0" width="108" height="11" fill="'+col+'"/>'
    +'<rect x="3" y="2.5" width="55" height="3.5" rx="1" fill="rgba(255,255,255,.8)"/>'
    +'<rect x="3" y="14" width="48" height="32" rx="1" fill="#f0f4f8" stroke="#ddd" stroke-width=".5"/>'
    +'<rect x="6" y="18" width="36" height="2.5" rx="1" fill="'+col+'"/>'
    +'<rect x="6" y="23" width="40" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="6" y="27" width="32" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="6" y="31" width="38" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="57" y="14" width="47" height="62" rx="1" fill="#f0f4f8" stroke="#ddd" stroke-width=".5"/>'
    +'<rect x="60" y="18" width="35" height="3" rx="1" fill="'+col+'"/>'
    +'<rect x="60" y="24" width="38" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="60" y="28" width="32" height="1.5" rx="1" fill="#ccc"/>'
    +'<rect x="3" y="50" width="48" height="26" rx="1" fill="#f0f4f8" stroke="#ddd" stroke-width=".5"/>'
    +'<rect x="6" y="54" width="28" height="2.5" rx="1" fill="'+col+'"/>'
    +'<rect x="6" y="59" width="38" height="1.5" rx="1" fill="#ccc"/>';
}
function sePptSvg_acq() {
  return '<rect width="108" height="81" fill="#f0f4f8"/>'
    +'<rect x="0" y="0" width="108" height="11" fill="#1c3a5f"/>'
    +'<rect x="3" y="2.5" width="70" height="3" rx="1" fill="rgba(255,255,255,.8)"/>'
    +'<rect x="3" y="12" width="25" height="60" fill="rgba(28,58,95,.08)"/>'
    +'<rect x="29" y="12" width="76" height="7" fill="#e0e6ee"/>'
    +'<rect x="29" y="20" width="76" height="7" fill="#f5f7fa"/>'
    +'<rect x="29" y="28" width="76" height="7" fill="#e8eef5"/>'
    +'<rect x="29" y="36" width="76" height="7" fill="#f5f7fa"/>'
    +'<rect x="29" y="44" width="76" height="7" fill="#e8eef5"/>'
    +'<rect x="29" y="52" width="76" height="7" fill="#f5f7fa"/>'
    +'<circle cx="45" cy="16" r="2.5" fill="#5ac8fa"/>'
    +'<circle cx="58" cy="24" r="2.5" fill="#34c759"/>'
    +'<circle cx="72" cy="32" r="2.5" fill="#ff9500"/>'
    +'<circle cx="50" cy="40" r="2.5" fill="#5ac8fa"/>'
    +'<circle cx="65" cy="48" r="2.5" fill="#34c759"/>'
    +'<circle cx="80" cy="56" r="2.5" fill="#ff9500"/>';
}

function sePopulateTemplateModal() {
  var types = [];
  vessels.forEach(function(v){ if(!types.includes(v.type)) types.push(v.type); });
  var icons = { APL:'fa-ship', YRBM:'fa-anchor', YFB:'fa-water', YTB:'fa-ferry' };

  /* PowerPoint layouts */
  var pptLayouts = [
    { id:'ppt_title',          label:'Title Slide',           svg:sePptSvg_title() },
    { id:'ppt_titleContent',   label:'Title and Content',     svg:sePptSvg_titleContent() },
    { id:'ppt_sectionHeader',  label:'Section Header',        svg:sePptSvg_sectionHeader() },
    { id:'ppt_twoContent',     label:'Two Content',           svg:sePptSvg_twoContent() },
    { id:'ppt_comparison',     label:'Comparison',            svg:sePptSvg_comparison() },
    { id:'ppt_titleOnly',      label:'Title Only',            svg:sePptSvg_titleOnly() },
    { id:'blank',              label:'Blank',                 svg:sePptSvg_blank() },
    { id:'ppt_contentCaption', label:'Content with Caption',  svg:sePptSvg_contentCaption() },
    { id:'ppt_pictureCaption', label:'Picture with Caption',  svg:sePptSvg_pictureCaption() },
  ];
  var pptGrid = document.getElementById('se-ppt-grid');
  if (pptGrid) pptGrid.innerHTML = pptLayouts.map(function(l){ return seTplCard(l.id, l.label, l.svg); }).join('');

  /* S4 Program Schedule */
  var progGrid = document.getElementById('se-prog-grid');
  if (progGrid) {
    progGrid.innerHTML = types.map(function(t){
      var col = (VT[t]&&VT[t].color)||'#1c3a5f';
      return seTplCard('prog_'+t, seTypeLabel(t)+' Program Schedule', sePptSvg_prog(col));
    }).join('');
  }

  /* S4 Acquisition */
  var acqGrid = document.getElementById('se-acq-grid');
  if (acqGrid) {
    acqGrid.innerHTML = types.map(function(t){
      var col = (VT[t]&&VT[t].color)||'#1c3a5f';
      return seTplCard('oneslide_'+t, seTypeLabel(t)+' One Slide', sePptSvg_oneSlide(col));
    }).join('')
    + seTplCard('acq', 'Milestone Schedule', sePptSvg_acq());
  }
}

window.seAddSlideFromTpl = function(tpl) {
  seCloseTemplateModal();
  seAddSlide(tpl);
};

/* Legacy aliases — kept so any old code still works */
window.seToggleAddMenu = function(){ seOpenTemplateModal(); };
window.seCloseAddMenu  = function(){ seCloseTemplateModal(); };
function sePopulateAddMenu() { /* no-op — replaced by sePopulateTemplateModal */ }"""

# Find and replace the sePopulateAddMenu function block
match = _re.search(
    r'/\* ── Populate the Add Slide dropdown with current types ── \*/\nfunction sePopulateAddMenu\(\) \{[\s\S]*?\n\}',
    html
)
if match:
    html = html[:match.start()] + NEW_JS + html[match.end():]
    print('JS sePopulateAddMenu replaced OK')
else:
    # Try to find it another way
    idx = html.find('function sePopulateAddMenu()')
    if idx >= 0:
        # Find the matching closing brace
        depth = 0
        i = idx
        while i < len(html):
            if html[i] == '{': depth += 1
            elif html[i] == '}':
                depth -= 1
                if depth == 0:
                    old_block = html[idx:i+1]
                    # Also grab the comment line before it
                    comment_start = html.rfind('\n', 0, idx) + 1
                    if '/* ──' in html[comment_start:idx]:
                        old_block = html[comment_start:i+1]
                        html = html[:comment_start] + NEW_JS + html[i+1:]
                    else:
                        html = html[:idx] + NEW_JS + html[i+1:]
                    print('JS sePopulateAddMenu replaced OK (fallback)')
                    break
            i += 1
    else:
        print('WARNING: sePopulateAddMenu not found')

# ── 5. Save ────────────────────────────────────────────────────────────────
with open('program-schedule/index.html', 'w') as f:
    f.write(html)
print('Saved.')
print(f'Total lines: {html.count(chr(10))}')
