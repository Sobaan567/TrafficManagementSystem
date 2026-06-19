import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import './ChallanQrCode.css';

const ChallanQrCode = ({ challan, vehicleNumber = '', size = 118 }) => {
  const [qrSrc, setQrSrc] = useState('');
  const challanNumber = challan?.challanNumber || challan?.ChallanNumber || challan?.id || challan?.ChallanID || '';
  const registrationNumber = vehicleNumber || challan?.vehicleRegistrationNumber || challan?.RegistrationNumber || '';

  const qrValue = useMemo(() => {
    const params = new URLSearchParams();
    const tokenSource = `${challanNumber}|${registrationNumber}`;
    const token = typeof window !== 'undefined'
      ? window.btoa(unescape(encodeURIComponent(tokenSource)))
      : '';
    if (vehicleNumber) params.set('vehicle', vehicleNumber);
    if (challanNumber) params.set('challan', challanNumber);
    if (challanNumber && registrationNumber && token) params.set('verify', token);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/public/challan-tracker?${params.toString()}`;
  }, [challanNumber, registrationNumber, vehicleNumber]);

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(qrValue, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 6,
      color: {
        dark: '#09090B',
        light: '#fffdf4',
      },
    })
      .then((src) => {
        if (mounted) setQrSrc(src);
      })
      .catch(() => {
        if (mounted) setQrSrc('');
      });

    return () => {
      mounted = false;
    };
  }, [qrValue]);

  return (
    <div className="challan-qr-card" style={{ '--qr-size': `${size}px` }}>
      <span>Scan Verify</span>
      {qrSrc ? <img src={qrSrc} alt={`QR code for ${challanNumber || 'challan'}`} /> : <div className="challan-qr-fallback" />}
      <strong>{challanNumber || 'TMS'}</strong>
    </div>
  );
};

export default ChallanQrCode;
