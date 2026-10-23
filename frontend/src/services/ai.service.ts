import { AIRiskAssessment, AnomalyAlert } from '@/types';
import { apiClient } from './api/client';
import { MOCK_AI_RISK_ASSESSMENTS, MOCK_ANOMALY_ALERTS } from '@/mock-data/pds-data';

export class AIService {
  static async getRiskAssessments(): Promise<AIRiskAssessment[]> {
    return MOCK_AI_RISK_ASSESSMENTS;
  }

  static async getAnomalyAlerts(): Promise<AnomalyAlert[]> {
    try {
      const res = await apiClient.get('/soc/alerts?limit=20');
      if (res.data?.success && Array.isArray(res.data.alerts)) {
        return res.data.alerts.map((a: any) => ({
          id: a.id,
          entityId: a.affectedUser || a.sourceIp || 'SYS-ENT',
          entityType: 'PDS_TRANSACTION',
          riskScore: a.severity === 'CRITICAL' ? 95 : a.severity === 'HIGH' ? 82 : 45,
          riskLevel: a.severity === 'CRITICAL' ? 'CRITICAL' : a.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
          detectedAt: a.timestamp,
          factors: [
            {
              name: a.title,
              weight: 0.85,
              description: a.description,
              isSuspicious: true,
            },
          ],
          modelDetails: {
            modelVersion: 'PDS-Neural-Anomaly-v2.4',
            confidence: 0.94,
            trainingDate: '2026-08-01',
            inputFeaturesCount: 24,
          },
          status: a.status === 'RESOLVED' ? 'RESOLVED' : a.status === 'INVESTIGATING' ? 'INVESTIGATING' : 'ACTIVE',
        }));
      }
    } catch {}
    return MOCK_ANOMALY_ALERTS;
  }

  static async updateAlertStatus(id: string, status: AnomalyAlert['status']): Promise<AnomalyAlert> {
    const alert = MOCK_ANOMALY_ALERTS.find((a) => a.id === id);
    if (!alert) throw new Error('Alert not found');
    alert.status = status;
    return alert;
  }
}
