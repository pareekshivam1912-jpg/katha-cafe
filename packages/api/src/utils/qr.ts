import crypto from 'node:crypto';
import QRCode from 'qrcode';

export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashQrToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export async function generateQrDataUrl(url: string): Promise<string> {
  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#063B27', // Katha forest green
      light: '#FFFDF7', // Katha paper surface
    },
  });
}

export async function generateQrSvg(url: string): Promise<string> {
  return await QRCode.toString(url, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#063B27',
      light: '#FFFDF7',
    },
  });
}
