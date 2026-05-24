import React, { useState } from 'react';
import GoogleMapReact from 'google-map-react';
import api from '../../services/api';

const inputStyle = {
  padding: '12px',
  border: '2px solid #09090B',
  fontSize: '16px',
  fontFamily: 'Space Grotesk, monospace'
};

const primaryButtonStyle = {
  padding: '12px 30px',
  backgroundColor: '#D2E823',
  color: '#09090B',
  border: '2px solid #09090B',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  backgroundColor: '#F8F4E8'
};

const isSettledPayment = (status) => ['paid', 'waived'].includes(String(status || '').toLowerCase());

const safeDistanceToMouse = (point, mouse) => {
  if (!point || !mouse) return Number.MAX_SAFE_INTEGER;
  return Math.hypot(point.x - mouse.x, point.y - mouse.y);
};

const MapMarker = ({ label }) => (
  <div style={{
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: '#D2E823',
    color: '#09090B',
    border: '2px solid #09090B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    boxShadow: '3px 3px 0 #09090B',
    transform: 'translate(-50%, -50%)'
  }}>
    {label}
  </div>
);

const ChallanMap = ({ challans }) => {
  const firstLocationName = challans.find((challan) => challan.location?.locationName)?.location?.locationName;
  const markers = challans
    .map((challan, index) => ({
      id: challan.challanId || challan.challanNumber || index,
      label: index + 1,
      lat: Number(challan.location?.latitude),
      lng: Number(challan.location?.longitude),
      title: challan.location?.locationName || challan.challanNumber
    }))
    .filter((marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng) && (marker.lat !== 0 || marker.lng !== 0));

  if (markers.length === 0) {
    if (firstLocationName) {
      return (
        <div style={{ height: '360px', border: '2px solid #09090B', borderRadius: '8px', overflow: 'hidden' }}>
          <iframe
            title="Violation location map"
            src={`https://www.google.com/maps?q=${encodeURIComponent(firstLocationName)}&output=embed`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      );
    }

    return (
      <div style={{
        height: '360px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F4E8',
        border: '2px dashed #09090B',
        borderRadius: '8px',
        color: '#555',
        fontWeight: 'bold'
      }}>
        No map locations available for these challans.
      </div>
    );
  }

  const center = { lat: markers[0].lat, lng: markers[0].lng };

  return (
    <div style={{ height: '360px', border: '2px solid #09090B', borderRadius: '8px', overflow: 'hidden' }}>
      <GoogleMapReact
        bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_MAPS_API_KEY }}
        defaultCenter={center}
        center={center}
        defaultZoom={12}
        distanceToMouse={safeDistanceToMouse}
        yesIWantToUseGoogleMapApiInternals
      >
        {markers.map((marker) => (
          <MapMarker
            key={marker.id}
            lat={marker.lat}
            lng={marker.lng}
            label={marker.label}
            title={marker.title}
          />
        ))}
      </GoogleMapReact>
    </div>
  );
};

export default function ChallanTracker() {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoadingId, setAiLoadingId] = useState('');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: ''
  });

  const searchChallans = async () => {
    if (!registrationNumber.trim()) {
      alert('Please enter vehicle registration number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/public/vehicle/${registrationNumber}`);
      if (response.data.success) {
        const data = response.data.data?.challans || [];
        setChallans(Array.isArray(data) ? data : []);
        setPaymentComplete(false);
        setShowPaymentForm(false);
      } else {
        setChallans([]);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Vehicle not found. Please check the registration number.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      setChallans([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const getTotalAmount = () => {
    return challans.reduce((total, challan) => {
      return total + Number(challan.fineAmount || 0);
    }, 0);
  };

  const getPendingCount = () => {
    return challans.filter(c => !isSettledPayment(c.paymentStatus)).length;
  };

  const updateCardDetails = (field, value) => {
    setCardDetails((details) => ({
      ...details,
      [field]: value
    }));
  };

  const completeFakePayment = async (event) => {
    event.preventDefault();
    setPaymentLoading(true);
    setPaymentError('');

    try {
      await api.post(`/public/vehicle/${registrationNumber}/payment`, {
        paymentMethod: 'Fake Card',
        cardLast4: cardDetails.cardNumber.replace(/\D/g, '').slice(-4)
      });

      setChallans((currentChallans) =>
        currentChallans.map((challan) => ({
          ...challan,
          paymentStatus: 'Paid',
          paidAmount: challan.fineAmount,
          remainingAmount: 0
        }))
      );
      setPaymentComplete(true);
      setShowPaymentForm(false);
      setCardDetails({
        cardNumber: '',
        cardName: '',
        expiry: '',
        cvv: ''
      });
    } catch (err) {
      setPaymentError('Payment could not be saved. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const explainChallan = async (challan) => {
    setAiLoadingId(challan.challanId || challan.challanNumber);
    setAiExplanation('');
    try {
      const response = await api.post('/chatbot/ask', {
        message: `Explain this traffic challan for a citizen in simple words. Include violation meaning, fine amount, status, payment steps, and appeal guidance. Challan data: ${JSON.stringify(challan)}`,
        history: [],
        context: {
          path: '/public/challan-tracker',
          role: 'Public',
          vehicleNumber: registrationNumber,
        },
      });
      setAiExplanation(response.data?.data?.reply || 'No explanation was generated.');
    } catch (err) {
      setAiExplanation(err.response?.data?.message || 'The AI helper could not respond right now. You can still use the challan details, payment status, and appeal options.');
    } finally {
      setAiLoadingId('');
    }
  };

  const generatePaymentReceipt = () => {
    const receiptWindow = window.open('', '_blank', 'width=900,height=700');
    if (!receiptWindow) return;

    const paidDate = new Date().toLocaleString();
    const verificationCode = `TMS-${registrationNumber}-${Date.now()}`;
    const rows = challans.map((challan) => `
      <tr>
        <td>${challan.challanNumber || '-'}</td>
        <td>${challan.ownerName || '-'}</td>
        <td>${challan.violation?.violationType || '-'}</td>
        <td>${challan.location?.locationName || '-'}</td>
        <td>Rs.${challan.fineAmount || 0}</td>
        <td>${challan.paymentStatus || '-'}</td>
      </tr>
    `).join('');

    receiptWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
            .receipt { border: 3px solid #111; padding: 24px; }
            h1 { margin: 0 0 8px; }
            .muted { color: #555; margin: 0 0 24px; }
            .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
            .box { border: 1px solid #111; padding: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #111; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #D2E823; }
            .paid { margin-top: 24px; padding: 14px; border: 2px solid #111; background: #D2E823; font-weight: bold; }
            .verify { display: grid; grid-template-columns: 140px 1fr; gap: 18px; align-items: center; margin-top: 24px; }
            .qr { width: 120px; height: 120px; border: 2px solid #111; display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(5, 1fr); gap: 4px; padding: 8px; }
            .qr span { background: #111; }
            @media print { button { display: none; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <h1>Traffic Management System</h1>
            <p class="muted">Payment Receipt</p>
            <div class="summary">
              <div class="box"><strong>Vehicle:</strong><br>${registrationNumber}</div>
              <div class="box"><strong>Paid On:</strong><br>${paidDate}</div>
              <div class="box"><strong>Total Amount:</strong><br>Rs.${getTotalAmount()}</div>
              <div class="box"><strong>Payment Method:</strong><br>Fake Card</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>User Name</th>
                  <th>Violation</th>
                  <th>Location</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="verify">
              <div class="qr">
                ${Array.from({ length: 25 }, (_, index) => `<span style="opacity:${(verificationCode.charCodeAt(index % verificationCode.length) + index) % 3 === 0 ? 1 : 0}"></span>`).join('')}
              </div>
              <div>
                <h3>Receipt Verification</h3>
                <p><strong>Verification Code:</strong> ${verificationCode}</p>
                <p>This code confirms the demo payment record generated by the Traffic Management System.</p>
              </div>
            </div>
            <div class="paid">Payment complete. This receipt can be saved as PDF from the print dialog.</div>
            <button onclick="window.print()" style="margin-top: 24px; padding: 12px 24px; font-weight: bold;">Print / Save PDF</button>
          </div>
        </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.focus();
  };

  const allChallansPaid = challans.length > 0 && challans.every((challan) => isSettledPayment(challan.paymentStatus));

  return (
    <div style={{ padding: '30px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', color: '#09090B' }}>Check Your Challans</h1>

      <div style={{
        backgroundColor: '#F8F4E8',
        padding: '30px',
        border: '2px solid #09090B',
        marginBottom: '30px',
        borderRadius: '8px'
      }}>
        <p style={{ marginBottom: '15px', fontWeight: 'bold' }}>Enter Vehicle Registration Number</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="e.g., ABC123"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && searchChallans()}
            style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
          />
          <button
            onClick={searchChallans}
            disabled={loading}
            style={{
              ...primaryButtonStyle,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {searched && (
        <>
          {error ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#fff0f0',
              border: '2px solid red',
              borderRadius: '8px'
            }}>
              <h2 style={{ marginBottom: '10px' }}>Error: {error}</h2>
            </div>
          ) : challans.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#F8F4E8',
              border: '2px solid #09090B',
              borderRadius: '8px'
            }}>
              <h2 style={{ marginBottom: '10px' }}>No Challans Found</h2>
              <p>No active challans found for this vehicle registration number.</p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
              }}>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#D2E823',
                  border: '2px solid #09090B',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '12px', marginBottom: '5px' }}>TOTAL FINE</p>
                  <h2 style={{ fontSize: '32px', color: '#09090B', margin: 0 }}>Rs.{getTotalAmount()}</h2>
                </div>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#F8F4E8',
                  border: '2px solid #09090B',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '12px', marginBottom: '5px' }}>PENDING CHALLANS</p>
                  <h2 style={{ fontSize: '32px', color: '#09090B', margin: 0 }}>{getPendingCount()}</h2>
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '2px solid #09090B', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#F8F4E8' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#D2E823', borderBottom: '2px solid #09090B' }}>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Challan #</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>User Name</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Date</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Violation</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Location</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Amount</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>AI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challans.map((challan) => (
                      <tr key={challan.challanId} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '12px' }}>{challan.challanNumber}</td>
                        <td style={{ padding: '12px' }}>{challan.ownerName || '-'}</td>
                        <td style={{ padding: '12px' }}>{new Date(challan.issueDateTime).toLocaleDateString()}</td>
                        <td style={{ padding: '12px' }}>{challan.violation?.violationType || '-'}</td>
                        <td style={{ padding: '12px' }}>{challan.location?.locationName || '-'}</td>
                        <td style={{ padding: '12px' }}>Rs.{challan.fineAmount}</td>
                        <td style={{
                          padding: '12px',
                          fontWeight: 'bold',
                          color: isSettledPayment(challan.paymentStatus) ? 'green' : 'red'
                        }}>
                          {challan.paymentStatus}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => explainChallan(challan)}
                            disabled={aiLoadingId === (challan.challanId || challan.challanNumber)}
                            style={{ ...secondaryButtonStyle, padding: '8px 12px', fontSize: '12px' }}
                          >
                            {aiLoadingId === (challan.challanId || challan.challanNumber) ? 'Explaining...' : 'Explain'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {aiExplanation && (
                <div style={{
                  marginTop: '20px',
                  padding: '18px',
                  backgroundColor: '#09090B',
                  color: '#F8F4E8',
                  border: '2px solid #D2E823',
                  borderRadius: '8px',
                  whiteSpace: 'pre-wrap',
                  fontWeight: 700
                }}>
                  <strong style={{ color: '#D2E823', display: 'block', marginBottom: '8px' }}>AI Challan Explanation</strong>
                  {aiExplanation}
                </div>
              )}

              <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#F8F4E8',
                border: '2px solid #09090B',
                borderRadius: '8px'
              }}>
                <h3 style={{ marginTop: 0 }}>Violation Map</h3>
                <ChallanMap challans={challans} />
              </div>

              <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#F8F4E8',
                border: '2px solid #09090B',
                borderRadius: '8px'
              }}>
                <h3 style={{ marginTop: 0 }}>Payment</h3>
                {paymentComplete ? (
                  <>
                    <div style={{
                      padding: '18px',
                      backgroundColor: '#D2E823',
                      border: '2px solid #09090B',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      marginBottom: '12px'
                    }}>
                      Payment complete.
                    </div>
                    <button onClick={generatePaymentReceipt} style={primaryButtonStyle}>
                      Print / Save PDF Receipt
                    </button>
                  </>
                ) : showPaymentForm ? (
                  <form onSubmit={completeFakePayment} style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
                    {paymentError && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#fff0f0',
                        border: '2px solid red',
                        color: 'red',
                        fontWeight: 'bold'
                      }}>
                        {paymentError}
                      </div>
                    )}
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Fake card number"
                      value={cardDetails.cardNumber}
                      onChange={(e) => updateCardDetails('cardNumber', e.target.value)}
                      required
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      placeholder="Cardholder name"
                      value={cardDetails.cardName}
                      onChange={(e) => updateCardDetails('cardName', e.target.value)}
                      required
                      style={inputStyle}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardDetails.expiry}
                        onChange={(e) => updateCardDetails('expiry', e.target.value)}
                        required
                        style={{ ...inputStyle, minWidth: 0 }}
                      />
                      <input
                        type="password"
                        inputMode="numeric"
                        placeholder="CVV"
                        value={cardDetails.cvv}
                        onChange={(e) => updateCardDetails('cvv', e.target.value)}
                        required
                        style={{ ...inputStyle, minWidth: 0 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="submit"
                        disabled={paymentLoading}
                        style={{
                          ...primaryButtonStyle,
                          cursor: paymentLoading ? 'not-allowed' : 'pointer',
                          opacity: paymentLoading ? 0.6 : 1
                        }}
                      >
                        {paymentLoading ? 'Processing...' : 'Complete Payment'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPaymentForm(false)}
                        disabled={paymentLoading}
                        style={{
                          ...secondaryButtonStyle,
                          cursor: paymentLoading ? 'not-allowed' : 'pointer',
                          opacity: paymentLoading ? 0.6 : 1
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {allChallansPaid && (
                      <button onClick={generatePaymentReceipt} style={{ ...secondaryButtonStyle, marginRight: '10px' }}>
                        Print / Save PDF Receipt
                      </button>
                    )}
                    {!allChallansPaid && (
                      <button onClick={() => setShowPaymentForm(true)} style={primaryButtonStyle}>
                        Pay Now
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
