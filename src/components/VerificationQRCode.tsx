import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface VerificationQRCodeProps {
  url?: string;
  learnerName?: string;
  admissionNo?: string;
}

export function VerificationQRCode({ url, learnerName, admissionNo }: VerificationQRCodeProps) {
  const [svgString, setSvgString] = useState<string>('');

  useEffect(() => {
    const targetUrl = url || `${window.location.origin}/verify?portal=active&ver=${encodeURIComponent(admissionNo || 'secure')}`;
    QRCode.toString(targetUrl, { type: 'svg', margin: 1, width: 80, color: { dark: '#0f172a', light: '#ffffff' } }, (err, svg) => {
      if (!err && svg) {
        setSvgString(svg);
      }
    });
  }, [url, admissionNo]);

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl print:bg-white print:border-slate-300">
      <div 
        className="w-16 h-16 shrink-0 bg-white p-1 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden"
        dangerouslySetInnerHTML={{ __html: svgString || '<div class="w-12 h-12 bg-slate-200 animate-pulse rounded"></div>' }}
      />
      <div className="space-y-1 text-left">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Official Portal Verification</span>
        <p className="text-[11px] font-bold text-slate-800">Scan to verify authentic report</p>
        <p className="text-[9px] font-mono text-slate-400 truncate max-w-[200px]">
          {url || `${window.location.origin}/verify`}
        </p>
      </div>
    </div>
  );
}
