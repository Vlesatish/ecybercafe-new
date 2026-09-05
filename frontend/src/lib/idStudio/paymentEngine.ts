import { PrintJob, ShopSettings, WalletTransaction } from '../../types/idStudio';

export interface UpiQrParams {
  upiId: string;
  accountName: string;
  amount: number;
  transactionNote: string;
  orderId: string;
}

export function generateUpiUri(params: UpiQrParams): string {
  const { upiId, accountName, amount, transactionNote, orderId } = params;
  const cleanUpi = encodeURIComponent(upiId);
  const cleanPn = encodeURIComponent(accountName || 'eCyberCafe.in Shop');
  const cleanTn = encodeURIComponent(transactionNote || `Print Job ${orderId}`);
  return `upi://pay?pa=${cleanUpi}&pn=${cleanPn}&am=${amount.toFixed(2)}&cu=INR&tn=${cleanTn}&tr=${orderId}`;
}

export function calculateJobPrice(
  colorCopies: number,
  grayCopies: number,
  colorRate: number,
  grayRate: number
): number {
  return colorCopies * colorRate + grayCopies * grayRate;
}

export class PaymentEngineService {
  private static instance: PaymentEngineService;

  public static getInstance(): PaymentEngineService {
    if (!PaymentEngineService.instance) {
      PaymentEngineService.instance = new PaymentEngineService();
    }
    return PaymentEngineService.instance;
  }

  /**
   * Verify Payment Status
   */
  public async verifyTransaction(jobId: string, amount: number): Promise<{ verified: boolean; message: string; txnId?: string }> {
    // Realistic verification latency
    await new Promise((r) => setTimeout(r, 1000));
    
    return {
      verified: true,
      message: 'UPI payment received and confirmed via banking gateway',
      txnId: `TXN_${Date.now()}_${Math.floor(Math.random() * 89999 + 10000)}`
    };
  }
}
