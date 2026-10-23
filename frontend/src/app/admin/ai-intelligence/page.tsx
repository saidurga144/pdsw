'use client';

import React, { useState } from 'react';
import { MOCK_AI_RISK_ASSESSMENTS } from '@/mock-data/pds-data';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { Cpu, ShieldCheck } from 'lucide-react';
import { AIRiskAssessment } from '@/types';

export default function AIIntelligencePage() {
  const [assessments] = useState<AIRiskAssessment[]>(MOCK_AI_RISK_ASSESSMENTS);
  const [selectedEntity, setSelectedEntity] = useState<AIRiskAssessment | null>(
    MOCK_AI_RISK_ASSESSMENTS.length > 0 ? MOCK_AI_RISK_ASSESSMENTS[0] : null
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          AI Anomaly & Risk Intelligence Dashboard
        </h1>
        <p className="text-xs text-slate-400">Machine learning behavioral risk analysis and explainable anomaly detection engine</p>
      </div>

      {assessments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="p-3 bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center mx-auto border border-slate-700">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="empty-state-title text-slate-200">No Anomalies Detected</h2>
            <p className="empty-state-description text-slate-400 mt-1">
              No high-risk entities or suspicious behavioral patterns are currently flagged by the AI engine.
              All incoming transactions and access events are monitored continuously.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Analyzed Entities ({assessments.length})</h2>
            {assessments.map((item) => (
              <button
                key={item.entityId}
                onClick={() => setSelectedEntity(item)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedEntity?.entityId === item.entityId
                    ? 'bg-slate-900 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                    : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-bold text-cyan-400">{item.entityId}</span>
                  <RiskIndicator score={item.riskScore} level={item.riskLevel} showDetails={false} />
                </div>
                <p className="text-xs font-bold text-slate-200">{item.entityName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Type: {item.entityType}</p>
              </button>
            ))}
          </div>

          {selectedEntity && (
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <span className="font-mono text-xs font-bold text-cyan-400">{selectedEntity.entityId}</span>
                  <h2 className="text-base font-bold text-slate-100 mt-0.5">{selectedEntity.entityName}</h2>
                </div>
                <RiskIndicator score={selectedEntity.riskScore} level={selectedEntity.riskLevel} />
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Explainable Anomaly Factors</h3>
                <div className="space-y-2">
                  {selectedEntity.explainableFactors.map((f, idx) => (
                    <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-200">{f.factor}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{f.description}</p>
                      </div>
                      <span className={`shrink-0 self-start px-2.5 py-0.5 rounded text-[10px] font-bold ${f.impact === 'HIGH' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'}`}>
                        {f.impact} IMPACT
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg">
                  Mark False Positive
                </button>
                <button className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm">
                  Restrict Access & Trigger SOC Probe
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
