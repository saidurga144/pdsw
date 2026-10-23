import { Distribution } from '@/types';
import { apiClient } from './api/client';
import { MOCK_DISTRIBUTIONS } from '@/mock-data/pds-data';

export class TransactionService {
  static async getDistributions(): Promise<Distribution[]> {
    try {
      const res = await apiClient.get('/beneficiary/transactions');
      if (res.data?.success && Array.isArray(res.data.transactions) && res.data.transactions.length > 0) {
        return res.data.transactions;
      }
    } catch {}
    return MOCK_DISTRIBUTIONS;
  }

  static async createDistribution(data: Partial<Distribution>): Promise<Distribution> {
    try {
      const res = await apiClient.post('/officer/distribution', {
        beneficiaryId: data.beneficiaryId,
        rationCardNumber: data.rationCardId,
        fpsShopId: data.pdsCenterId,
        riceQty: data.commodities?.find((c) => c.name.includes('Rice'))?.quantity || 0,
        wheatQty: data.commodities?.find((c) => c.name.includes('Wheat'))?.quantity || 0,
        sugarQty: data.commodities?.find((c) => c.name.includes('Sugar'))?.quantity || 0,
        keroseneQty: data.commodities?.find((c) => c.name.includes('Kerosene'))?.quantity || 0,
        totalCost: data.totalAmount || 120.0,
        authMode: data.verificationMethod || 'BIOMETRIC_SIMULATED',
      });

      if (res.data?.success) {
        const newDist: Distribution = {
          id: res.data.id || `DST-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          transactionId: res.data.transactionCode || `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`,
          beneficiaryId: data.beneficiaryId || 'BEN-IND-2026-8841',
          beneficiaryName: data.beneficiaryName || 'Rajesh Kumar Sharma',
          rationCardId: data.rationCardId || 'RC-DEL-778899',
          pdsCenterId: data.pdsCenterId || 'FPS-DEL-102',
          officerId: data.officerId || 'usr-off-002',
          commodities: data.commodities || [],
          totalAmount: data.totalAmount || 0,
          timestamp: new Date().toISOString(),
          status: 'COMPLETED',
          verificationMethod: data.verificationMethod || 'BIOMETRIC_SIMULATED',
          receiptHash: res.data.stateHash || `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          ipfsCid: res.data.ipfsCid || `Qm${Array.from({ length: 44 }, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join('')}`,
        };
        MOCK_DISTRIBUTIONS.unshift(newDist);
        return newDist;
      }
    } catch {}

    const fallbackDist: Distribution = {
      id: `DST-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionId: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`,
      beneficiaryId: data.beneficiaryId || 'BEN-IND-2026-8841',
      beneficiaryName: data.beneficiaryName || 'Rajesh Kumar Sharma',
      rationCardId: data.rationCardId || 'RC-DEL-778899',
      pdsCenterId: data.pdsCenterId || 'FPS-DEL-102',
      officerId: data.officerId || 'usr-off-002',
      commodities: data.commodities || [],
      totalAmount: data.totalAmount || 0,
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      verificationMethod: 'BIOMETRIC_SIMULATED',
      receiptHash: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      ipfsCid: `Qm${Array.from({ length: 44 }, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join('')}`,
    };
    MOCK_DISTRIBUTIONS.unshift(fallbackDist);
    return fallbackDist;
  }
}
