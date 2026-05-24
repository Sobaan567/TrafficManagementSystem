import React, { useMemo, useState } from 'react';
import './ChallanList.css';

const formatCurrency = (value) => `Rs.${Number(value || 0).toLocaleString()}`;

const getField = (challan, ...keys) => {
  for (const key of keys) {
    if (challan?.[key] !== undefined && challan?.[key] !== null && challan?.[key] !== '') {
      return challan[key];
    }
  }
  return '';
};

const normalizeChallan = (challan) => {
  const paymentStatus = getField(challan, 'PaymentStatus', 'paymentStatus', 'status') || 'Unpaid';
  const challanStatus = getField(challan, 'ChallanStatus', 'challanStatus') || paymentStatus;
  return {
    id: getField(challan, 'ChallanID', 'challanId', 'id'),
    challanNumber: getField(challan, 'ChallanNumber', 'challanNumber') || '-',
    vehicleNumber: getField(challan, 'RegistrationNumber', 'vehicleNumber', 'VehicleID') || '-',
    violationType: getField(challan, 'DisplayViolationType', 'ViolationType', 'violationType') || '-',
    fineAmount: Number(getField(challan, 'FineAmount', 'fineAmount') || 0),
    paymentStatus,
    challanStatus,
    issueDate: getField(challan, 'IssueDateTime', 'issuedDate', 'CreatedAt', 'createdAt') || new Date().toISOString(),
    ownerName: getField(challan, 'OwnerName', 'ownerName') || '-',
    ownerPhone: getField(challan, 'OwnerPhone', 'ownerPhone') || '-',
    location: getField(challan, 'LocationName', 'Location', 'locationName') || '-',
    dueDate: getField(challan, 'DueDate', 'dueDate') || '',
    remainingAmount: Number(getField(challan, 'RemainingAmount', 'remainingAmount') || 0),
  };
};

const statusClass = (status) => String(status || 'default').toLowerCase().replace(/\s+/g, '-');

const printChallan = (challan) => {
  const html = `
    <html>
      <head>
        <title>${challan.challanNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; color: #111; }
          .ticket { border: 3px solid #111; padding: 24px; max-width: 760px; margin: 0 auto; }
          h1 { margin: 0 0 8px; font-size: 34px; text-transform: uppercase; }
          .sub { margin-bottom: 24px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; }
          td { border-bottom: 1px solid #ddd; padding: 12px 8px; }
          td:first-child { font-weight: 800; width: 220px; }
          .amount { font-size: 26px; font-weight: 900; }
          .footer { margin-top: 26px; font-size: 12px; color: #555; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <h1>Traffic Challan</h1>
          <div class="sub">Traffic Management System</div>
          <table>
            <tr><td>Challan Number</td><td>${challan.challanNumber}</td></tr>
            <tr><td>Vehicle</td><td>${challan.vehicleNumber}</td></tr>
            <tr><td>Owner</td><td>${challan.ownerName}</td></tr>
            <tr><td>Phone</td><td>${challan.ownerPhone}</td></tr>
            <tr><td>Violation</td><td>${challan.violationType}</td></tr>
            <tr><td>Location</td><td>${challan.location}</td></tr>
            <tr><td>Issue Date</td><td>${new Date(challan.issueDate).toLocaleString()}</td></tr>
            <tr><td>Payment Status</td><td>${challan.paymentStatus}</td></tr>
            <tr><td>Challan Status</td><td>${challan.challanStatus}</td></tr>
            <tr><td>Fine Amount</td><td class="amount">${formatCurrency(challan.fineAmount)}</td></tr>
          </table>
          <div class="footer">Generated on ${new Date().toLocaleString()}</div>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `;
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
};

const downloadReceipt = (challan) => {
  const content = [
    'TRAFFIC MANAGEMENT SYSTEM',
    'CHALLAN RECEIPT',
    '',
    `Challan Number: ${challan.challanNumber}`,
    `Vehicle: ${challan.vehicleNumber}`,
    `Owner: ${challan.ownerName}`,
    `Phone: ${challan.ownerPhone}`,
    `Violation: ${challan.violationType}`,
    `Location: ${challan.location}`,
    `Issue Date: ${new Date(challan.issueDate).toLocaleString()}`,
    `Payment Status: ${challan.paymentStatus}`,
    `Challan Status: ${challan.challanStatus}`,
    `Fine Amount: ${formatCurrency(challan.fineAmount)}`,
    `Remaining: ${formatCurrency(challan.remainingAmount)}`,
    '',
    `Generated: ${new Date().toLocaleString()}`,
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${challan.challanNumber || 'challan'}-receipt.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

const ChallanList = ({ challans = [] }) => {
  const [selectedChallan, setSelectedChallan] = useState(null);
  const rows = useMemo(() => challans.map(normalizeChallan), [challans]);

  return (
    <div className="challan-list">
      <div className="challan-list-heading">
        <div>
          <h3>RECENT CHALLANS</h3>
          <p>{rows.length} live record{rows.length === 1 ? '' : 's'} from the backend</p>
        </div>
      </div>

      <div className="challans-table-wrapper">
        <table className="challans-table">
          <thead>
            <tr>
              <th>Challan #</th>
              <th>Vehicle</th>
              <th>Violation</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="no-data">
                <td colSpan="7">No challans found. Add a violation or refresh the officer dashboard.</td>
              </tr>
            ) : (
              rows.map((challan) => (
                <tr key={challan.id || challan.challanNumber} className={`challan-row ${statusClass(challan.paymentStatus)}`}>
                  <td className="challan-id">{challan.challanNumber}</td>
                  <td>{challan.vehicleNumber}</td>
                  <td>{challan.violationType}</td>
                  <td className="amount">{formatCurrency(challan.fineAmount)}</td>
                  <td>
                    <span className={`status-badge ${statusClass(challan.paymentStatus)}`}>
                      {challan.paymentStatus}
                    </span>
                  </td>
                  <td>{new Date(challan.issueDate).toLocaleDateString()}</td>
                  <td className="actions">
                    <button type="button" className="btn-action view" onClick={() => setSelectedChallan(challan)}>View</button>
                    <button type="button" className="btn-action print" onClick={() => printChallan(challan)}>Print</button>
                    <button type="button" className="btn-action print" onClick={() => downloadReceipt(challan)}>Download</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedChallan && (
        <div className="challan-modal-backdrop" onClick={() => setSelectedChallan(null)}>
          <section className="challan-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="challan-modal-close" onClick={() => setSelectedChallan(null)}>x</button>
            <span className="modal-kicker">Challan Detail</span>
            <h2>{selectedChallan.challanNumber}</h2>
            <div className="challan-detail-grid">
              <div><span>Vehicle</span><strong>{selectedChallan.vehicleNumber}</strong></div>
              <div><span>Owner</span><strong>{selectedChallan.ownerName}</strong></div>
              <div><span>Phone</span><strong>{selectedChallan.ownerPhone}</strong></div>
              <div><span>Violation</span><strong>{selectedChallan.violationType}</strong></div>
              <div><span>Location</span><strong>{selectedChallan.location}</strong></div>
              <div><span>Issue Date</span><strong>{new Date(selectedChallan.issueDate).toLocaleString()}</strong></div>
              <div><span>Payment</span><strong>{selectedChallan.paymentStatus}</strong></div>
              <div><span>Challan</span><strong>{selectedChallan.challanStatus}</strong></div>
              <div><span>Fine</span><strong>{formatCurrency(selectedChallan.fineAmount)}</strong></div>
              <div><span>Remaining</span><strong>{formatCurrency(selectedChallan.remainingAmount)}</strong></div>
            </div>
            <div className="challan-modal-actions">
              <button type="button" onClick={() => printChallan(selectedChallan)}>Print Challan</button>
              <button type="button" onClick={() => downloadReceipt(selectedChallan)}>Download Receipt</button>
              <button type="button" onClick={() => setSelectedChallan(null)}>Close</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ChallanList;
