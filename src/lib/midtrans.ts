import { postApi } from './api';

let sdkLoad: Promise<void> | undefined;
export function loadMidtransSnap(): Promise<void> {
  if (window.snap?.pay) return Promise.resolve();
  if (sdkLoad) return sdkLoad;
  const key = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
  if (!key) return Promise.reject(new Error('Client key pembayaran belum dikonfigurasi.'));
  sdkLoad = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true'
      ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.dataset.clientKey = key;
    const timer = setTimeout(() => fail(), 15000);
    function fail() {
      clearTimeout(timer);
      script.remove();
      sdkLoad = undefined;
      reject(new Error('Layanan pembayaran belum dapat dimuat.'));
    }
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (window.snap?.pay) resolve(); else fail();
    };
    document.head.appendChild(script);
  });
  return sdkLoad;
}

export type SnapTransactionParams = { kind: 'fine'; borrowId: string };

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
  orderId: string;
}

export function createSnapTransaction(params: SnapTransactionParams): Promise<SnapTransactionResult> {
  return postApi('create-snap', params);
}

export function confirmPayment(orderId: string): Promise<{
  paid: boolean; orderId: string; method?: string; transactionId?: string;
}> {
  return postApi('confirm-payment', { orderId });
}
