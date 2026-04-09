import { useState } from 'react'
import DraggableModal from './DraggableModal'
import { Organization, UserRole, ColumnKey } from '../types'
import { OrgPermissions, ContractorGrants } from '../utils/permissions'
import { CONTRACTOR_GRANTABLE_COLUMNS } from '../utils/spreadsheetConfigs'

interface Props {
  role: UserRole
  org: Organization
  perms: OrgPermissions
  contractorGrants: ContractorGrants
  onChangeOrg: (org: Organization) => void
  onUpdateContractorGrants: (grants: ContractorGrants) => void
  onClose: () => void
}

/** Human-readable labels for grantable columns */
const COLUMN_LABELS: Record<string, string> = {
  calendarDaysToReview: 'Calendar Days to Review',
  responsibleParty: 'Responsible Party',
  govNotes: "Gov't Internal Notes",
}

export default function PermissionsModal({ role, org, perms, contractorGrants, onChangeOrg, onUpdateContractorGrants, onClose }: Props) {
  const [viewAsOrg, setViewAsOrg] = useState<Organization | null>(null)
  const isGovt = org === 'Government'
  const isContractor = org === 'Contractor'
  const isShipbuilder = org === 'Shipbuilder'

  function toggleGrant(col: ColumnKey) {
    const next = new Set(contractorGrants.grantedColumns)
    if (next.has(col)) {
      next.delete(col)
    } else {
      next.add(col)
    }
    onUpdateContractorGrants({ grantedColumns: next })
  }

  return (
    <DraggableModal className="bg-white border border-border rounded-card shadow-2xl overflow-hidden" defaultWidth={520} onClose={onClose} ariaLabel="Permissions & Access">
      <div>
        {/* Header */}
        <div className="bg-gray-50 border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isGovt ? 'bg-blue-500/15' : isContractor ? 'bg-orange-500/15' : 'bg-purple-500/15'
              }`}>
                <i className={`fas ${
                  isGovt ? 'fa-landmark text-blue-500' : isContractor ? 'fa-hard-hat text-orange-500' : 'fa-industry text-purple-500'
                } text-lg`}></i>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Permissions & Access</h3>
                <p className="text-steel text-xs">{role} · {org}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Current Role & Org */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Access Level</h4>
            <div className="bg-gray-50 border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isGovt ? 'bg-blue-500/15 text-blue-500' : isContractor ? 'bg-orange-500/15 text-orange-500' : 'bg-purple-500/15 text-purple-500'
                }`}>
                  <i className={`fas ${isGovt ? 'fa-landmark' : isContractor ? 'fa-hard-hat' : 'fa-industry'} text-xs`}></i>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{org}</p>
                  <p className="text-[11px] text-steel">{role}</p>
                </div>
              </div>

              {/* Switch Org (simulation) */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-[10px] text-steel uppercase tracking-wide font-semibold">Switch View:</span>
                {(['Government', 'Contractor', 'Shipbuilder'] as Organization[]).map(o => (
                  <button
                    key={o}
                    onClick={() => onChangeOrg(o)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      org === o
                        ? 'bg-accent text-white'
                        : 'bg-white border border-border text-steel hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Spreadsheet Access */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Spreadsheet Access</h4>
            <div className="space-y-2">
              {[
                { label: 'View Deliverables', icon: 'fa-table', enabled: true },
                { label: 'Edit Submission Data', icon: 'fa-edit', enabled: true },
                { label: 'Edit Notes / Comments', icon: 'fa-sticky-note', enabled: true },
                { label: 'View Gov\'t Internal Notes', icon: 'fa-lock', enabled: perms.canViewGovNotes },
                { label: 'Verify / Seal Records', icon: 'fa-shield-alt', enabled: perms.canVerify },
                { label: 'AI Insights', icon: 'fa-brain', enabled: perms.canUseAI },
                { label: 'Generate Reports', icon: 'fa-file-pdf', enabled: perms.canGenerateReport, note: perms.reportRedacted ? 'Redacted' : undefined },
                { label: 'Full Audit Trail', icon: 'fa-history', enabled: perms.canViewFullAudit },
                { label: 'NSERC IDE Sync', icon: 'fa-database', enabled: perms.canSync, note: perms.syncReadOnly ? 'Read-Only' : undefined },
                { label: 'Manage Craft / Hulls', icon: 'fa-ship', enabled: perms.canManageCraft },
                { label: 'Compare to Contract', icon: 'fa-file-contract', enabled: perms.canCompareContract },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <i className={`fas ${item.icon} text-xs w-4 text-center ${item.enabled ? 'text-accent' : 'text-steel/30'}`}></i>
                    <span className={`text-sm ${item.enabled ? 'text-gray-900' : 'text-steel/50 line-through'}`}>{item.label}</span>
                    {item.note && <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600">{item.note}</span>}
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    item.enabled ? 'bg-green-500/15' : 'bg-red-500/10'
                  }`}>
                    <i className={`fas ${item.enabled ? 'fa-check text-green-500' : 'fa-times text-red-400'} text-[9px]`}></i>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gov't: Configure Contractor Access */}
          {isGovt && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <i className="fas fa-cog mr-1"></i>
                Configure Contractor Access
              </h4>
              <p className="text-[11px] text-steel mb-3">Grant or revoke Contractor access to additional columns beyond their base spreadsheet.</p>
              <div className="bg-orange-50/50 border border-orange-200/50 rounded-lg p-3 space-y-2.5">
                {CONTRACTOR_GRANTABLE_COLUMNS.map(col => {
                  const granted = contractorGrants.grantedColumns.has(col)
                  return (
                    <button
                      key={col}
                      onClick={() => toggleGrant(col)}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-border hover:border-orange-300 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <i className="fas fa-columns text-xs text-orange-500 w-4 text-center"></i>
                        <span className="text-sm text-gray-900">{COLUMN_LABELS[col] || col}</span>
                      </div>
                      <div className={`w-9 h-5 rounded-full transition-all flex items-center px-0.5 ${
                        granted ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'
                      }`}>
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm"></div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Gov't: View As Preview */}
          {isGovt && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <i className="fas fa-eye mr-1"></i>
                Preview Other Spreadsheets
              </h4>
              <p className="text-[11px] text-steel mb-3">Preview what Contractor or Shipbuilder sees in their spreadsheet.</p>
              <div className="flex items-center gap-2">
                {(['Contractor', 'Shipbuilder'] as Organization[]).map(o => (
                  <button
                    key={o}
                    onClick={() => setViewAsOrg(viewAsOrg === o ? null : o)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      viewAsOrg === o
                        ? 'bg-accent text-white border-accent'
                        : 'bg-white border-border text-steel hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <i className={`fas ${o === 'Contractor' ? 'fa-hard-hat' : 'fa-industry'} text-xs`}></i>
                    View as {o}
                  </button>
                ))}
                {viewAsOrg && (
                  <span className="text-[10px] text-accent font-semibold animate-pulse">
                    Previewing {viewAsOrg} spreadsheet
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Contractor: Granted Permissions from Gov't */}
          {isContractor && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <i className="fas fa-key mr-1"></i>
                Government-Granted Access
              </h4>
              <p className="text-[11px] text-steel mb-3">Additional columns your Government sponsor has granted access to.</p>
              <div className="bg-blue-50/50 border border-blue-200/50 rounded-lg p-3 space-y-2">
                {CONTRACTOR_GRANTABLE_COLUMNS.map(col => {
                  const granted = contractorGrants.grantedColumns.has(col)
                  return (
                    <div key={col} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white border border-border">
                      <div className="flex items-center gap-2">
                        <i className={`fas fa-columns text-xs w-4 text-center ${granted ? 'text-green-500' : 'text-steel/30'}`}></i>
                        <span className={`text-sm ${granted ? 'text-gray-900' : 'text-steel/50'}`}>{COLUMN_LABELS[col] || col}</span>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        granted ? 'bg-green-500/10 text-green-600' : 'bg-gray-100 text-steel/50'
                      }`}>
                        {granted ? 'Granted' : 'Not Granted'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Shipbuilder: Fixed Access Description */}
          {isShipbuilder && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <i className="fas fa-info-circle mr-1"></i>
                Your Spreadsheet
              </h4>
              <div className="bg-purple-50/50 border border-purple-200/50 rounded-lg p-4">
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-check text-green-500 text-xs w-4 text-center"></i>
                    <span>View all deliverable titles, DI numbers, and due dates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-check text-green-500 text-xs w-4 text-center"></i>
                    <span>Edit submission dates and your notes/comments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-check text-green-500 text-xs w-4 text-center"></i>
                    <span>See status for items you are responsible for</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-check text-green-500 text-xs w-4 text-center"></i>
                    <span>Run AI insights and generate reports</span>
                  </div>
                  <div className="flex items-center gap-2 text-steel/60">
                    <i className="fas fa-lock text-red-400/50 text-xs w-4 text-center"></i>
                    <span>Gov't internal notes are not visible</span>
                  </div>
                  <div className="flex items-center gap-2 text-steel/60">
                    <i className="fas fa-lock text-red-400/50 text-xs w-4 text-center"></i>
                    <span>Gov't review delays shown as "Pending Review"</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Sync Info */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <i className="fas fa-sync mr-1"></i>
              Data Interoperability
            </h4>
            <div className="bg-accent/5 border border-accent/15 rounded-lg p-3">
              <p className="text-xs text-gray-700 leading-relaxed">
                All changes sync across all spreadsheets in real-time. When you edit your data,
                it updates the shared database — visible to other parties per their access level.
                NSERC IDE sync and user edits all converge into one source of truth.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </DraggableModal>
  )
}
