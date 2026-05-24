const { executeQuery } = require('../config/database');

exports.getChallans = async (req, res) => {
  try {
    const { status, paymentStatus, vehicleId, locationId } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    let query = `
      SELECT
        c.*,
        v.RegistrationNumber,
        v.VehicleType,
        v.Make,
        v.Model,
        v.Color,
        COALESCE(c.ViolationType, vi.ViolationType) AS DisplayViolationType,
        l.LocationName,
        l.CityName
      FROM Challans c
      LEFT JOIN Vehicles v ON v.VehicleID = c.VehicleID
      LEFT JOIN Violations vi ON vi.ViolationID = c.ViolationID
      LEFT JOIN Locations l ON l.LocationID = vi.LocationID
      WHERE 1=1
    `;
    const params = {};

    if (status) { query += ` AND c.ChallanStatus = @status`; params.status = status; }
    if (paymentStatus) { query += ` AND c.PaymentStatus = @paymentStatus`; params.paymentStatus = paymentStatus; }
    if (vehicleId) { query += ` AND c.VehicleID = @vehicleId`; params.vehicleId = vehicleId; }
    if (locationId) { query += ` AND vi.LocationID = @locationId`; params.locationId = locationId; }

    query += ` ORDER BY c.IssueDateTime DESC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

    const result = await executeQuery(query, params);
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (error) {
    console.error('Get challans error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch challans' });
  }
};

exports.getChallanDetails = async (req, res) => {
  try {
    const { challanId } = req.params;
    const result = await executeQuery(`SELECT * FROM Challans WHERE ChallanID = @challanId`, { challanId });

    if (result.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Challan not found' });

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Get challan details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch challan details' });
  }
};

exports.createChallan = async (req, res) => {
  try {
    const { violationId, vehicleId, ownerName, ownerEmail, ownerPhone, violationType, location, fineAmount, description, dueDate } = req.body;
    const challanNumber = `CH-${new Date().getFullYear()}-${Date.now()}`;

    const result = await executeQuery(
      `INSERT INTO Challans (
        ChallanNumber, ViolationID, VehicleID, OwnerName, OwnerEmail, OwnerPhone,
        IssuedByOfficerID, ViolationType, Location, FineAmount, Description,
        DueDate, ChallanStatus, PaymentStatus, CreatedAt
      ) VALUES (
        @challanNumber, @violationId, @vehicleId, @ownerName, @ownerEmail, @ownerPhone,
        @officerId, @violationType, @location, @fineAmount, @description,
        @dueDate, 'Issued', 'Unpaid', GETDATE()
      );
      SELECT SCOPE_IDENTITY() as ChallanID`,
      { challanNumber, violationId, vehicleId, ownerName, ownerEmail, ownerPhone, officerId: req.user.userId, violationType, location, fineAmount, description, dueDate }
    );

    res.status(201).json({ success: true, message: 'Challan created successfully', challanId: result.recordset[0].ChallanID, challanNumber });
  } catch (error) {
    console.error('Create challan error:', error);
    res.status(500).json({ success: false, message: 'Failed to create challan' });
  }
};

exports.updateChallan = async (req, res) => {
  try {
    const { challanId } = req.params;
    const { status, description, fineAmount } = req.body;

    await executeQuery(
      `UPDATE Challans SET ChallanStatus = @status, Description = @description, FineAmount = @fineAmount, UpdatedAt = GETDATE() WHERE ChallanID = @challanId`,
      { challanId, status, description, fineAmount }
    );

    res.json({ success: true, message: 'Challan updated successfully' });
  } catch (error) {
    console.error('Update challan error:', error);
    res.status(500).json({ success: false, message: 'Failed to update challan' });
  }
};

exports.deleteChallan = async (req, res) => {
  try {
    const { challanId } = req.params;
    await executeQuery(`DELETE FROM Challans WHERE ChallanID = @challanId`, { challanId });
    res.json({ success: true, message: 'Challan deleted successfully' });
  } catch (error) {
    console.error('Delete challan error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete challan' });
  }
};

exports.payChallan = async (req, res) => {
  try {
    const { challanId } = req.params;
    const { amount, paymentMethod, transactionId } = req.body;

    const challanResult = await executeQuery(`SELECT FineAmount, PaidAmount FROM Challans WHERE ChallanID = @challanId`, { challanId });

    if (challanResult.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Challan not found' });

    const challan = challanResult.recordset[0];
    const totalPaid = (challan.PaidAmount || 0) + amount;
    const remaining = challan.FineAmount - totalPaid;
    const paymentStatus = remaining <= 0 ? 'Paid' : 'Partial';

    await executeQuery(
      `UPDATE Challans SET PaidAmount = @totalPaid, RemainingAmount = @remaining, PaymentStatus = @paymentStatus, PaymentMethod = @paymentMethod, TransactionID = @transactionId, PaymentDate = GETDATE(), UpdatedAt = GETDATE() WHERE ChallanID = @challanId`,
      { challanId, totalPaid, remaining: Math.max(remaining, 0), paymentStatus, paymentMethod, transactionId }
    );

    res.json({ success: true, message: 'Payment processed successfully', paymentStatus });
  } catch (error) {
    console.error('Pay challan error:', error);
    res.status(500).json({ success: false, message: 'Failed to process payment' });
  }
};

exports.generateChallanPDF = async (req, res) => {
  try {
    const { challanId } = req.params;
    const result = await executeQuery(`SELECT * FROM Challans WHERE ChallanID = @challanId`, { challanId });

    if (result.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Challan not found' });

    res.json({ success: true, message: 'PDF generation in progress' });
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

exports.sendChallanNotification = async (req, res) => {
  try {
    const { challanId } = req.params;
    const result = await executeQuery(`SELECT * FROM Challans WHERE ChallanID = @challanId`, { challanId });

    if (result.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Challan not found' });

    await executeQuery(`UPDATE Challans SET NotificationSent = 1, NotificationDate = GETDATE() WHERE ChallanID = @challanId`, { challanId });
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
};

exports.appealChallan = async (req, res) => {
  try {
    const { challanId } = req.params;
    const { appealReason } = req.body;

    await executeQuery(
      `UPDATE Challans SET AppealReason = @appealReason, AppealStatus = 'Pending', AppealDate = GETDATE() WHERE ChallanID = @challanId`,
      { challanId, appealReason }
    );

    res.json({ success: true, message: 'Appeal submitted successfully' });
  } catch (error) {
    console.error('Appeal challan error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit appeal' });
  }
};

exports.getChallanStats = async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT
        COUNT(*) as TotalChallans,
        SUM(CASE WHEN PaymentStatus = 'Paid' THEN 1 ELSE 0 END) as PaidCount,
        SUM(CASE WHEN PaymentStatus = 'Unpaid' THEN 1 ELSE 0 END) as UnpaidCount,
        SUM(CASE WHEN PaymentStatus = 'Partial' THEN 1 ELSE 0 END) as PartialCount,
        SUM(CASE WHEN PaymentStatus = 'Paid' THEN PaidAmount ELSE 0 END) as TotalCollected,
        SUM(FineAmount) as TotalFineAmount
       FROM Challans
       WHERE IssueDateTime >= DATEADD(MONTH, -1, GETDATE())`
    );

    res.json({ success: true, stats: result.recordset[0] });
  } catch (error) {
    console.error('Get challan stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};

// Public endpoint - no auth required
exports.getPublicChallans = async (req, res) => {
  try {
    const { registrationNumber } = req.params;

    const result = await executeQuery(
      `SELECT
        c.ChallanID, c.ChallanNumber, c.IssueDateTime,
        c.ViolationType, c.FineAmount, c.PaidAmount, c.PaymentStatus
       FROM Challans c
       INNER JOIN Vehicles v ON c.VehicleID = v.VehicleID
       WHERE v.RegistrationNumber = @registrationNumber
       ORDER BY c.IssueDateTime DESC`,
      { registrationNumber }
    );

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Public challan search error:', error);
    res.status(500).json({ success: false, message: 'Failed to search challans' });
  }
};
