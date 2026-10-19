import React, { useState } from 'react';
import RulesStudio from '../components/studio/RulesStudio';
import StandaloneMasterEditorPortal from './StandaloneMasterEditorPortal';
import { ArrowLeft, Sparkles, Sliders } from 'lucide-react';

export default function MasterRuleEditorScreen({ user, onTabChange }) {
  const [viewMode, setViewMode] = useState('studio'); // 'studio' | 'legacy'

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* Top Floating View Switcher & Exit Banner */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onTabChange) onTabChange('dashboard');
              else window.location.href = '/';
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Counter App</span>
          </button>

          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('studio')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'studio'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Rules Studio V2 (Linear Grade)</span>
            </button>
            <button
              onClick={() => setViewMode('legacy')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'legacy'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Full Dealership Manager</span>
            </button>
          </div>
        </div>

        <span className="font-mono text-slate-400 hidden md:inline">
          White-Label Multi-Tenant Rules Engine v2.0
        </span>
      </div>

      {viewMode === 'studio' ? (
        <RulesStudio user={user} tenantId={user?.tenant_id || 'bellad_and_company'} />
      ) : (
        <StandaloneMasterEditorPortal
          user={user}
          onExitToCounterApp={() => {
            if (onTabChange) onTabChange('dashboard');
            else window.location.href = '/';
          }}
        />
      )}
    </div>
  );
}
