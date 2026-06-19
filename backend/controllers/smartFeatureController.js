const { executeQuery } = require('../config/database');
const { createNotification, createRoleNotifications, logActivity } = require('../utils/systemEvents');

const DEMERIT_LIMIT = 100;
const TRAINING_REDUCTION_POINTS = 10;

const clean = (value, fallback = '') => String(value || fallback).trim();
const normalizeRegistration = (value) => clean(value).toUpperCase().replace(/\s+/g, '');
const normalizeLevel = (value) => {
  const level = clean(value, 'Medium');
  return ['Low', 'Medium', 'High', 'Critical'].includes(level) ? level : 'Medium';
};

const getDemeritStatus = (points) => {
  const total = Number(points || 0);
  if (total >= DEMERIT_LIMIT) return 'License Cancelled';
  if (total >= 90) return 'Final Warning';
  if (total >= 60) return 'Probation';
  if (total >= 30) return 'Watch';
  return 'Clear';
};

const getRiskFromCount = (count) => {
  if (count >= 12) return 'Critical';
  if (count >= 7) return 'High';
  if (count >= 3) return 'Medium';
  return 'Low';
};

const getSmartFeatureSuiteData = async () => {
  await ensureSmartFeatureTables();
  await seedParkingZones();

  const [
    hotZones,
    officers,
    repeatOffenders,
    receiptHistory,
    revenueRows,
    appealRows,
    violationRows,
    monthlyRows,
    closures,
    parking,
  ] = await Promise.all([
    executeQuery(`
      SELECT TOP 8
        COALESCE(l.LocationName, c.Location, 'Unknown') AS LocationName,
        COUNT(*) AS ViolationCount
      FROM Challans c
      LEFT JOIN Violations v ON v.ViolationID = c.ViolationID
      LEFT JOIN Locations l ON l.LocationID = v.LocationID
      GROUP BY COALESCE(l.LocationName, c.Location, 'Unknown')
      ORDER BY ViolationCount DESC
    `),
    executeQuery(`
      SELECT TOP 8
        o.OfficerID,
        CONCAT(u.FirstName, ' ', u.LastName) AS OfficerName,
        o.BadgeNumber,
        o.AssignedZone,
        o.IsOnDuty,
        COUNT(c.ChallanID) AS RecentChallans
      FROM Officers o
      INNER JOIN Users u ON u.UserID = o.UserID
      LEFT JOIN Challans c ON c.IssuedByOfficerID = o.OfficerID
      GROUP BY o.OfficerID, u.FirstName, u.LastName, o.BadgeNumber, o.AssignedZone, o.IsOnDuty
      ORDER BY o.IsOnDuty DESC, RecentChallans ASC
    `),
    executeQuery(`
      SELECT TOP 8
        ve.RegistrationNumber,
        ve.OwnerName,
        COUNT(c.ChallanID) AS ChallanCount,
        SUM(ISNULL(dl.Points, 0)) AS DemeritPoints,
        MAX(c.IssueDateTime) AS LastViolationAt
      FROM Vehicles ve
      INNER JOIN Challans c ON c.VehicleID = ve.VehicleID
      LEFT JOIN DriverDemeritLedger dl ON dl.ChallanID = c.ChallanID
      GROUP BY ve.RegistrationNumber, ve.OwnerName
      ORDER BY COUNT(c.ChallanID) DESC, SUM(ISNULL(dl.Points, 0)) DESC
    `),
    executeQuery(`
      SELECT TOP 8
        c.ChallanNumber,
        ve.RegistrationNumber,
        c.OwnerName,
        c.FineAmount,
        c.PaidAmount,
        c.TransactionID,
        c.PaymentDate,
        c.PaymentMethod
      FROM Challans c
      INNER JOIN Vehicles ve ON ve.VehicleID = c.VehicleID
      WHERE c.PaymentStatus = 'Paid'
      ORDER BY c.PaymentDate DESC, c.UpdatedAt DESC
    `),
    executeQuery(`
      SELECT
        PaymentStatus,
        COUNT(*) AS Count,
        SUM(ISNULL(FineAmount, 0)) AS TotalFine,
        SUM(ISNULL(PaidAmount, 0)) AS PaidAmount,
        SUM(ISNULL(RemainingAmount, FineAmount)) AS RemainingAmount
      FROM Challans
      GROUP BY PaymentStatus
    `),
    executeQuery(`SELECT Status, COUNT(*) AS Count FROM PublicChallanAppeals GROUP BY Status`),
    executeQuery(`
      SELECT TOP 8
        v.ViolationType,
        COUNT(*) AS Count,
        SUM(ISNULL(c.FineAmount, 0)) AS Amount
      FROM Challans c
      INNER JOIN Violations v ON v.ViolationID = c.ViolationID
      GROUP BY v.ViolationType
      ORDER BY Count DESC
    `),
    executeQuery(`
      SELECT
        COUNT(*) AS TotalChallans,
        SUM(CASE WHEN PaymentStatus = 'Paid' THEN 1 ELSE 0 END) AS PaidChallans,
        SUM(CASE WHEN PaymentStatus <> 'Paid' THEN 1 ELSE 0 END) AS OpenChallans,
        SUM(ISNULL(FineAmount, 0)) AS TotalFine,
        SUM(ISNULL(PaidAmount, 0)) AS Collected
      FROM Challans
      WHERE IssueDateTime >= DATEADD(DAY, -30, GETDATE())
    `),
    executeQuery(`SELECT TOP 8 * FROM SmartRoadClosures WHERE IsActive = 1 ORDER BY CreatedAt DESC`),
    executeQuery(`SELECT TOP 8 * FROM SmartParkingZones ORDER BY AvailableSpaces ASC`),
  ]);

  const zones = (hotZones.recordset || []).map((row) => ({
    locationName: row.LocationName,
    count: Number(row.ViolationCount || 0),
    risk: getRiskFromCount(Number(row.ViolationCount || 0)),
  }));
  const topZone = zones[0] || { locationName: 'No hot zone yet', count: 0, risk: 'Low' };
  const officerRows = officers.recordset || [];

  return {
    trafficOps: {
      congestionPrediction: zones.map((zone) => ({
        ...zone,
        predictedDelayMinutes: Math.min(50, 5 + zone.count * 4),
        forecast: zone.risk === 'Critical' ? 'Heavy pressure expected' : zone.risk === 'High' ? 'Delay likely' : 'Stable',
      })),
      signalTiming: zones.slice(0, 6).map((zone) => ({
        locationName: zone.locationName,
        greenSeconds: Math.min(120, 45 + zone.count * 6),
        priority: zone.risk,
      })),
      nearestOfficerDispatch: zones.slice(0, 6).map((zone, index) => {
        const officer = officerRows[index % Math.max(officerRows.length, 1)] || {};
        return {
          locationName: zone.locationName,
          officerName: officer.OfficerName || 'Nearest unit pending',
          badgeNumber: officer.BadgeNumber || '-',
          assignedZone: officer.AssignedZone || zone.locationName,
          suggestedUnits: zone.risk === 'Critical' ? 4 : zone.risk === 'High' ? 3 : 1,
          reason: `${zone.count} recent violations make this a ${zone.risk.toLowerCase()} risk area.`,
        };
      }),
      roadClosures: closures.recordset || [],
      emergencyRoutes: zones.slice(0, 4).map((zone, index) => ({
        routeName: `Priority corridor ${index + 1}`,
        from: 'Nearest response unit',
        to: zone.locationName,
        status: zone.risk === 'Critical' ? 'Priority clear' : 'Monitor',
        guidance: zone.risk === 'Critical' ? 'Clear signal path and assign escort unit.' : 'Keep route visible for response teams.',
      })),
    },
    eChallan: {
      repeatOffenders: (repeatOffenders.recordset || []).map((row) => ({
        registrationNumber: row.RegistrationNumber,
        ownerName: row.OwnerName,
        challanCount: Number(row.ChallanCount || 0),
        demeritPoints: Number(row.DemeritPoints || 0),
        score: Math.min(100, Number(row.ChallanCount || 0) * 12 + Number(row.DemeritPoints || 0)),
        lastViolationAt: row.LastViolationAt,
      })),
      receiptHistory: receiptHistory.recordset || [],
      notificationChannels: [
        { channel: 'SMS', status: 'Ready', usage: 'Challan notices and due reminders' },
        { channel: 'Email', status: 'Ready', usage: 'Receipts, appeal updates, and monthly reports' },
        { channel: 'In-app', status: 'Live', usage: 'Role notifications and citizen updates' },
      ],
    },
    publicPortal: {
      parkingAvailability: parking.recordset || [],
      safetyInsights: zones.slice(0, 6).map((zone) => ({
        title: `${zone.locationName} safety watch`,
        level: zone.risk,
        advice: zone.risk === 'Critical' ? 'Avoid this area during peak time and follow officer diversions.' : 'Drive carefully and watch for signal enforcement.',
      })),
      anonymousDrivingReports: {
        status: 'Open',
        moderation: 'Duplicate reports are merged by location and category.',
      },
    },
    adminAnalytics: {
      violationHeatmaps: zones,
      revenueAnalytics: revenueRows.recordset || [],
      officerPerformance: officerRows,
      appealTrends: appealRows.recordset || [],
      violationTypes: violationRows.recordset || [],
      monthlyAutoReport: {
        ...(monthlyRows.recordset?.[0] || {}),
        generatedAt: new Date().toISOString(),
        summary: `${monthlyRows.recordset?.[0]?.TotalChallans || 0} challans in the last 30 days with Rs.${Number(monthlyRows.recordset?.[0]?.Collected || 0).toLocaleString()} collected.`,
      },
    },
  };
};

const ensureSmartFeatureTables = async () => {
  await executeQuery(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SmartTrafficIncidents')
    BEGIN
      CREATE TABLE SmartTrafficIncidents (
        IncidentID INT PRIMARY KEY IDENTITY(1,1),
        Source NVARCHAR(60) NOT NULL DEFAULT 'Officer',
        Category NVARCHAR(80) NOT NULL,
        Priority NVARCHAR(40) NOT NULL DEFAULT 'Medium',
        LocationName NVARCHAR(180) NOT NULL,
        CityName NVARCHAR(120) NOT NULL DEFAULT 'Karachi',
        Latitude FLOAT NULL,
        Longitude FLOAT NULL,
        Description NVARCHAR(1400) NOT NULL,
        EvidenceFileName NVARCHAR(255) NULL,
        Status NVARCHAR(40) NOT NULL DEFAULT 'Open',
        AssignedOfficerID INT NULL,
        CreatedByUserID INT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SmartRoadClosures')
    BEGIN
      CREATE TABLE SmartRoadClosures (
        ClosureID INT PRIMARY KEY IDENTITY(1,1),
        RoadName NVARCHAR(180) NOT NULL,
        CityName NVARCHAR(120) NOT NULL DEFAULT 'Karachi',
        Reason NVARCHAR(500) NOT NULL,
        DiversionRoute NVARCHAR(700) NULL,
        Severity NVARCHAR(40) NOT NULL DEFAULT 'Medium',
        StartsAt DATETIME NULL,
        EndsAt DATETIME NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedByUserID INT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SmartPaymentPlans')
    BEGIN
      CREATE TABLE SmartPaymentPlans (
        PlanID INT PRIMARY KEY IDENTITY(1,1),
        ChallanID INT NOT NULL,
        Installments INT NOT NULL DEFAULT 3,
        MonthlyAmount DECIMAL(12,2) NOT NULL DEFAULT 0,
        NextDueDate DATE NULL,
        Status NVARCHAR(40) NOT NULL DEFAULT 'Active',
        CreatedByUserID INT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SmartSavedRoutes')
    BEGIN
      CREATE TABLE SmartSavedRoutes (
        RouteID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NULL,
        RouteName NVARCHAR(120) NOT NULL,
        StartArea NVARCHAR(150) NOT NULL,
        EndArea NVARCHAR(150) NOT NULL,
        AlertLevel NVARCHAR(40) NOT NULL DEFAULT 'Medium',
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SmartParkingZones')
    BEGIN
      CREATE TABLE SmartParkingZones (
        ParkingZoneID INT PRIMARY KEY IDENTITY(1,1),
        ZoneName NVARCHAR(150) NOT NULL,
        AreaName NVARCHAR(150) NOT NULL,
        TotalSpaces INT NOT NULL DEFAULT 0,
        AvailableSpaces INT NOT NULL DEFAULT 0,
        Status NVARCHAR(40) NOT NULL DEFAULT 'Open',
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SmartVoiceChallanDrafts')
    BEGIN
      CREATE TABLE SmartVoiceChallanDrafts (
        DraftID INT PRIMARY KEY IDENTITY(1,1),
        Transcript NVARCHAR(1600) NOT NULL,
        VehicleRegistrationNumber NVARCHAR(50) NULL,
        ViolationType NVARCHAR(120) NULL,
        LocationName NVARCHAR(180) NULL,
        FineAmount DECIMAL(12,2) NULL,
        CreatedByUserID INT NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DriverDemeritLedger')
    BEGIN
      CREATE TABLE DriverDemeritLedger (
        DemeritID INT PRIMARY KEY IDENTITY(1,1),
        VehicleID INT NULL,
        RegistrationNumber NVARCHAR(50) NOT NULL,
        ChallanID INT NULL,
        Points INT NOT NULL,
        Reason NVARCHAR(220) NOT NULL,
        StatusAfter NVARCHAR(60) NOT NULL,
        CreatedByUserID INT NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PublicChallanAppeals')
    BEGIN
      CREATE TABLE PublicChallanAppeals (
        AppealID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NULL,
        ChallanID INT NULL,
        ChallanNumber NVARCHAR(50) NULL,
        VehicleRegistrationNumber NVARCHAR(50) NULL,
        Reason NVARCHAR(1000) NULL,
        Status NVARCHAR(40) NOT NULL DEFAULT 'Pending Review',
        OfficerNote NVARCHAR(1000) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DemeritReductionRequests')
    BEGIN
      CREATE TABLE DemeritReductionRequests (
        RequestID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NULL,
        RegistrationNumber NVARCHAR(50) NOT NULL,
        RequestedPoints INT NOT NULL DEFAULT 5,
        Reason NVARCHAR(1000) NOT NULL,
        Status NVARCHAR(40) NOT NULL DEFAULT 'Pending Review',
        OfficerNote NVARCHAR(1000) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        ReviewedByUserID INT NULL
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DriverSafetyCourses')
    BEGIN
      CREATE TABLE DriverSafetyCourses (
        CourseID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NULL,
        RegistrationNumber NVARCHAR(50) NOT NULL,
        CourseName NVARCHAR(180) NOT NULL,
        Score INT NOT NULL DEFAULT 0,
        Status NVARCHAR(40) NOT NULL DEFAULT 'Completed',
        PointsReduced INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE()
      );
    END
  `);
};

const seedParkingZones = async () => {
  await executeQuery(`
    IF NOT EXISTS (SELECT 1 FROM SmartParkingZones)
    BEGIN
      INSERT INTO SmartParkingZones (ZoneName, AreaName, TotalSpaces, AvailableSpaces, Status)
      VALUES
        ('Saddar Civic Parking', 'Saddar', 220, 64, 'Open'),
        ('Shahrah-e-Faisal Block A', 'Shahrah-e-Faisal', 180, 28, 'Busy'),
        ('University Road East', 'University Road', 140, 51, 'Open'),
        ('Clifton Service Lane', 'Clifton', 96, 12, 'Limited');
    END
  `);
};

const addDemeritEntry = async ({ registrationNumber, challanId, vehicleId, points, reason, userId }) => {
  await ensureSmartFeatureTables();
  const current = await executeQuery(
    `SELECT SUM(Points) AS TotalPoints FROM DriverDemeritLedger WHERE RegistrationNumber = @registrationNumber`,
    { registrationNumber }
  );
  const currentTotal = Math.max(0, Number(current.recordset[0]?.TotalPoints || 0));
  const requestedPoints = Number(points || 0);
  const effectivePoints = requestedPoints < 0 ? Math.max(requestedPoints, -currentTotal) : requestedPoints;
  const totalAfter = Math.max(0, currentTotal + effectivePoints);
  const statusAfter = getDemeritStatus(totalAfter);

  if (effectivePoints !== 0) {
    await executeQuery(
      `INSERT INTO DriverDemeritLedger (VehicleID, RegistrationNumber, ChallanID, Points, Reason, StatusAfter, CreatedByUserID)
       VALUES (@vehicleId, @registrationNumber, @challanId, @points, @reason, @statusAfter, @userId)`,
      { vehicleId: vehicleId || null, registrationNumber, challanId: challanId || null, points: effectivePoints, reason, statusAfter, userId: userId || null }
    );
  }

  return { totalPoints: totalAfter, adjustedPoints: effectivePoints, status: statusAfter, limit: DEMERIT_LIMIT };
};

const getLicenseAction = (profile) => {
  if (!profile) return { label: 'Unknown', requiredAction: 'Lookup driver profile' };
  if (profile.licenseCancelled) return { label: 'License Cancelled', requiredAction: 'Block renewal and require administrative reinstatement review.' };
  if (profile.totalPoints >= 90) return { label: 'Final Warning', requiredAction: 'Send final warning notice and assign safety course.' };
  if (profile.totalPoints >= 60) return { label: 'Probation', requiredAction: 'Monitor driver and require clean driving period.' };
  if (profile.totalPoints >= 30) return { label: 'Watch', requiredAction: 'Show warning on citizen portal.' };
  return { label: 'Clear', requiredAction: 'No enforcement action required.' };
};

const getDemeritProfileByRegistration = async (registrationValue) => {
  await ensureSmartFeatureTables();
  const registrationNumber = normalizeRegistration(registrationValue);
  if (!registrationNumber) return null;

  const ledger = await executeQuery(
    `SELECT TOP 50 * FROM DriverDemeritLedger WHERE RegistrationNumber = @registrationNumber ORDER BY CreatedAt DESC`,
    { registrationNumber }
  );
  const totalPoints = (ledger.recordset || []).reduce((sum, row) => sum + Number(row.Points || 0), 0);

  return {
    registrationNumber,
    totalPoints,
    remainingUntilCancellation: Math.max(0, DEMERIT_LIMIT - totalPoints),
    status: getDemeritStatus(totalPoints),
    licenseCancelled: totalPoints >= DEMERIT_LIMIT,
    licenseAction: getLicenseAction({ totalPoints, licenseCancelled: totalPoints >= DEMERIT_LIMIT }),
    limit: DEMERIT_LIMIT,
    ledger: ledger.recordset || [],
  };
};

exports.addDemeritEntry = addDemeritEntry;
exports.ensureSmartFeatureTables = ensureSmartFeatureTables;
exports.getDemeritProfileByRegistration = getDemeritProfileByRegistration;

exports.getSmartOverview = async (req, res) => {
  try {
    await ensureSmartFeatureTables();
    await seedParkingZones();

    const [
      incidentCounts,
      closures,
      parking,
      violationsByLocation,
      challanStats,
      appealStats,
      officerStats,
      demeritLeaders,
    ] = await Promise.all([
      executeQuery(`SELECT Priority, COUNT(*) AS Count FROM SmartTrafficIncidents WHERE Status <> 'Resolved' GROUP BY Priority`),
      executeQuery(`SELECT TOP 8 * FROM SmartRoadClosures WHERE IsActive = 1 ORDER BY CreatedAt DESC`),
      executeQuery(`SELECT TOP 8 * FROM SmartParkingZones ORDER BY AvailableSpaces ASC`),
      executeQuery(`
        SELECT TOP 8
          COALESCE(l.LocationName, c.Location, 'Unknown') AS LocationName,
          COUNT(*) AS ViolationCount
        FROM Challans c
        LEFT JOIN Violations v ON v.ViolationID = c.ViolationID
        LEFT JOIN Locations l ON l.LocationID = v.LocationID
        GROUP BY COALESCE(l.LocationName, c.Location, 'Unknown')
        ORDER BY ViolationCount DESC
      `),
      executeQuery(`
        SELECT
          COUNT(*) AS TotalChallans,
          SUM(CASE WHEN PaymentStatus = 'Paid' THEN ISNULL(PaidAmount, FineAmount) ELSE 0 END) AS Collected,
          SUM(CASE WHEN PaymentStatus <> 'Paid' THEN 1 ELSE 0 END) AS OpenChallans,
          SUM(FineAmount) AS TotalFine
        FROM Challans
      `),
      executeQuery(`SELECT Status, COUNT(*) AS Count FROM PublicChallanAppeals GROUP BY Status`),
      executeQuery(`
        SELECT TOP 8
          o.OfficerID,
          CONCAT(u.FirstName, ' ', u.LastName) AS OfficerName,
          COUNT(c.ChallanID) AS ChallansIssued,
          SUM(CASE WHEN c.PaymentStatus = 'Paid' THEN 1 ELSE 0 END) AS PaidCount
        FROM Officers o
        INNER JOIN Users u ON u.UserID = o.UserID
        LEFT JOIN Challans c ON c.IssuedByOfficerID = o.OfficerID
        GROUP BY o.OfficerID, u.FirstName, u.LastName
        ORDER BY ChallansIssued DESC
      `),
      executeQuery(`
        SELECT TOP 8
          RegistrationNumber,
          SUM(Points) AS TotalPoints,
          MAX(StatusAfter) AS StatusAfter
        FROM DriverDemeritLedger
        GROUP BY RegistrationNumber
        ORDER BY TotalPoints DESC
      `),
    ]);

    const hotZones = (violationsByLocation.recordset || []).map((row) => ({
      locationName: row.LocationName,
      count: row.ViolationCount,
      risk: getRiskFromCount(Number(row.ViolationCount || 0)),
    }));

    const totalActiveIncidents = (incidentCounts.recordset || []).reduce((sum, item) => sum + Number(item.Count || 0), 0);
    const highRiskZones = hotZones.filter((zone) => ['High', 'Critical'].includes(zone.risk)).length;
    const topHotZone = hotZones[0]?.locationName || 'No hot zone yet';
    const stats = challanStats.recordset[0] || {};

    return res.json({
      success: true,
      data: {
        summary: {
          activeIncidents: totalActiveIncidents,
          highRiskZones,
          openChallans: stats.OpenChallans || 0,
          collected: stats.Collected || 0,
          topHotZone,
          demeritLimit: DEMERIT_LIMIT,
        },
        congestionPredictions: hotZones.map((zone) => ({
          ...zone,
          predictedDelayMinutes: Math.min(45, 4 + zone.count * 3),
          recommendation: zone.risk === 'Critical' ? 'Deploy officers and activate diversion route' : zone.risk === 'High' ? 'Increase signal cycle and patrol visibility' : 'Monitor',
        })),
        signalRecommendations: hotZones.slice(0, 5).map((zone, index) => ({
          locationName: zone.locationName,
          suggestedGreenSeconds: Math.min(120, 45 + zone.count * 6),
          priority: index === 0 ? 'Immediate' : zone.risk,
        })),
        deploymentRecommendations: hotZones.slice(0, 6).map((zone) => ({
          locationName: zone.locationName,
          suggestedUnits: zone.risk === 'Critical' ? 4 : zone.risk === 'High' ? 3 : 1,
          reason: `${zone.count} recent violations make this a ${zone.risk.toLowerCase()} risk zone.`,
        })),
        incidentCounts: incidentCounts.recordset || [],
        closures: closures.recordset || [],
        parkingZones: parking.recordset || [],
        heatmap: hotZones,
        appealTrends: appealStats.recordset || [],
        officerPerformance: officerStats.recordset || [],
        demeritLeaders: demeritLeaders.recordset || [],
        dailyBriefing: [
          `${totalActiveIncidents} active smart incidents are waiting for action.`,
          `${highRiskZones} violation hot zones need command attention.`,
          `${stats.OpenChallans || 0} challans are still open for payment or review.`,
          topHotZone !== 'No hot zone yet' ? `${topHotZone} is the top deployment recommendation today.` : 'No deployment hot zone has enough data yet.',
        ],
      },
    });
  } catch (error) {
    console.error('Smart overview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load smart feature overview' });
  }
};

exports.getFeatureSuite = async (req, res) => {
  try {
    const data = await getSmartFeatureSuiteData();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Feature suite error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load feature suite' });
  }
};

exports.broadcastSmartNotification = async (req, res) => {
  try {
    const title = clean(req.body.title, 'Traffic alert').slice(0, 160);
    const body = clean(req.body.body).slice(0, 1000);
    const roles = Array.isArray(req.body.roles) && req.body.roles.length ? req.body.roles : ['Public', 'Officer', 'Admin'];
    const type = clean(req.body.type, 'info').slice(0, 40);

    if (!body) return res.status(400).json({ success: false, message: 'Notification body is required' });

    await createRoleNotifications({ roles, title, body, type });
    await logActivity({
      user: req.user,
      actionType: 'Smart Notification Broadcast',
      entityType: 'Notification',
      description: `${title}: ${body}`,
    });

    return res.status(201).json({
      success: true,
      message: 'SMS, email, and in-app notification queued',
      data: { title, body, roles, type, queuedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Smart notification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to queue notification' });
  }
};

exports.createAnonymousDrivingReport = async (req, res) => {
  try {
    await ensureSmartFeatureTables();
    const locationName = clean(req.body.locationName).slice(0, 180);
    const description = clean(req.body.description).slice(0, 1400);
    const category = clean(req.body.category, 'Dangerous Driving').slice(0, 80);
    const priority = normalizeLevel(req.body.priority || 'High');

    if (!locationName || description.length < 8) {
      return res.status(400).json({ success: false, message: 'Location and report details are required' });
    }

    const duplicate = await executeQuery(
      `SELECT TOP 1 IncidentID
       FROM SmartTrafficIncidents
       WHERE Source = 'Anonymous'
         AND LocationName = @locationName
         AND Category = @category
         AND CreatedAt >= DATEADD(HOUR, -2, GETDATE())
       ORDER BY CreatedAt DESC`,
      { locationName, category }
    );

    const result = await executeQuery(
      `INSERT INTO SmartTrafficIncidents
        (Source, Category, Priority, LocationName, CityName, Description, Status, CreatedByUserID)
       OUTPUT INSERTED.*
       VALUES ('Anonymous', @category, @priority, @locationName, @cityName, @description, @status, NULL)`,
      {
        category,
        priority,
        locationName,
        cityName: clean(req.body.cityName, 'Karachi').slice(0, 120),
        description,
        status: duplicate.recordset.length ? 'In Review' : 'Open',
      }
    );

    await createRoleNotifications({
      roles: ['Officer', 'Admin', 'Supervisor'],
      title: 'Anonymous driving report',
      body: `${category} reported near ${locationName}.`,
      type: priority === 'Critical' ? 'danger' : 'warning',
    });

    return res.status(201).json({
      success: true,
      message: duplicate.recordset.length ? 'Anonymous report merged for moderation' : 'Anonymous driving report created',
      data: result.recordset[0],
    });
  } catch (error) {
    console.error('Anonymous driving report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create anonymous driving report' });
  }
};

exports.generateMonthlySmartReport = async (req, res) => {
  try {
    const suite = await getSmartFeatureSuiteData();
    return res.json({
      success: true,
      message: 'Monthly smart report generated',
      data: {
        reportId: `TMS-MONTH-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        ...suite.adminAnalytics.monthlyAutoReport,
        topHotZones: suite.adminAnalytics.violationHeatmaps.slice(0, 5),
        revenueAnalytics: suite.adminAnalytics.revenueAnalytics,
        appealTrends: suite.adminAnalytics.appealTrends,
        officerPerformance: suite.adminAnalytics.officerPerformance.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Monthly smart report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate monthly report' });
  }
};

exports.createIncident = async (req, res) => {
  try {
    await ensureSmartFeatureTables();
    const category = clean(req.body.category, 'Incident').slice(0, 80);
    const priority = normalizeLevel(req.body.priority);
    const locationName = clean(req.body.locationName).slice(0, 180);
    const cityName = clean(req.body.cityName, 'Karachi').slice(0, 120);
    const description = clean(req.body.description).slice(0, 1400);
    const source = clean(req.body.source, req.user?.role || 'Officer').slice(0, 60);

    if (!locationName || description.length < 8) {
      return res.status(400).json({ success: false, message: 'Location and description are required' });
    }

    const result = await executeQuery(
      `INSERT INTO SmartTrafficIncidents
        (Source, Category, Priority, LocationName, CityName, Latitude, Longitude, Description, EvidenceFileName, CreatedByUserID)
       OUTPUT INSERTED.*
       VALUES (@source, @category, @priority, @locationName, @cityName, @latitude, @longitude, @description, @evidenceFileName, @userId)`,
      {
        source,
        category,
        priority,
        locationName,
        cityName,
        latitude: req.body.latitude || null,
        longitude: req.body.longitude || null,
        description,
        evidenceFileName: clean(req.body.evidenceFileName).slice(0, 255),
        userId: req.user?.userId || null,
      }
    );

    return res.status(201).json({ success: true, message: 'Incident saved', data: result.recordset[0] });
  } catch (error) {
    console.error('Create smart incident error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create incident' });
  }
};

exports.createRoadClosure = async (req, res) => {
  try {
    await ensureSmartFeatureTables();
    const roadName = clean(req.body.roadName).slice(0, 180);
    const reason = clean(req.body.reason).slice(0, 500);
    if (!roadName || !reason) return res.status(400).json({ success: false, message: 'Road name and reason are required' });

    const result = await executeQuery(
      `INSERT INTO SmartRoadClosures
        (RoadName, CityName, Reason, DiversionRoute, Severity, StartsAt, EndsAt, CreatedByUserID)
       OUTPUT INSERTED.*
       VALUES (@roadName, @cityName, @reason, @diversionRoute, @severity, @startsAt, @endsAt, @userId)`,
      {
        roadName,
        cityName: clean(req.body.cityName, 'Karachi').slice(0, 120),
        reason,
        diversionRoute: clean(req.body.diversionRoute).slice(0, 700),
        severity: normalizeLevel(req.body.severity),
        startsAt: req.body.startsAt || null,
        endsAt: req.body.endsAt || null,
        userId: req.user?.userId || null,
      }
    );

    return res.status(201).json({ success: true, message: 'Road closure published', data: result.recordset[0] });
  } catch (error) {
    console.error('Create road closure error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create road closure' });
  }
};

exports.createPaymentPlan = async (req, res) => {
  try {
    await ensureSmartFeatureTables();
    const challanId = Number(req.body.challanId);
    const installments = Math.min(Math.max(Number(req.body.installments) || 3, 2), 12);
    if (!challanId) return res.status(400).json({ success: false, message: 'challanId is required' });

    const challan = await executeQuery(`SELECT FineAmount, RemainingAmount FROM Challans WHERE ChallanID = @challanId`, { challanId });
    if (!challan.recordset.length) return res.status(404).json({ success: false, message: 'Challan not found' });

    const remaining = Number(challan.recordset[0].RemainingAmount ?? challan.recordset[0].FineAmount ?? 0);
    const monthlyAmount = Math.ceil((remaining / installments) * 100) / 100;
    const result = await executeQuery(
      `INSERT INTO SmartPaymentPlans (ChallanID, Installments, MonthlyAmount, NextDueDate, CreatedByUserID)
       OUTPUT INSERTED.*
       VALUES (@challanId, @installments, @monthlyAmount, DATEADD(MONTH, 1, GETDATE()), @userId)`,
      { challanId, installments, monthlyAmount, userId: req.user?.userId || null }
    );

    await executeQuery(`UPDATE Challans SET PaymentStatus = 'Partial', UpdatedAt = GETDATE() WHERE ChallanID = @challanId`, { challanId });
    return res.status(201).json({ success: true, message: 'Payment plan created', data: result.recordset[0] });
  } catch (error) {
    console.error('Create payment plan error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create payment plan' });
  }
};

exports.createSavedRoute = async (req, res) => {
  try {
    await ensureSmartFeatureTables();
    const routeName = clean(req.body.routeName).slice(0, 120);
    const startArea = clean(req.body.startArea).slice(0, 150);
    const endArea = clean(req.body.endArea).slice(0, 150);
    if (!routeName || !startArea || !endArea) {
      return res.status(400).json({ success: false, message: 'Route name, start area, and end area are required' });
    }

    const result = await executeQuery(
      `INSERT INTO SmartSavedRoutes (UserID, RouteName, StartArea, EndArea, AlertLevel)
       OUTPUT INSERTED.*
       VALUES (@userId, @routeName, @startArea, @endArea, @alertLevel)`,
      { userId: req.user?.userId || null, routeName, startArea, endArea, alertLevel: normalizeLevel(req.body.alertLevel) }
    );

    return res.status(201).json({ success: true, message: 'Saved route alert created', data: result.recordset[0] });
  } catch (error) {
    console.error('Create saved route error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save route' });
  }
};

exports.recognizePlate = async (req, res) => {
  try {
    const sampleText = clean(req.body.imageText || req.body.fileName || req.body.registrationHint).toUpperCase();
    const match = sampleText.match(/[A-Z]{2,4}[-\s]?\d{3,5}/);
    const registrationNumber = normalizeRegistration(match?.[0] || req.body.registrationHint || '');
    if (!registrationNumber) {
      return res.status(400).json({ success: false, message: 'No plate pattern found. Add a registration hint or OCR text.' });
    }

    const vehicle = await executeQuery(`SELECT TOP 1 * FROM Vehicles WHERE RegistrationNumber = @registrationNumber`, { registrationNumber });
    return res.json({
      success: true,
      data: {
        registrationNumber,
        confidence: match ? 0.92 : 0.68,
        vehicle: vehicle.recordset[0] || null,
      },
    });
  } catch (error) {
    console.error('Plate recognition error:', error);
    return res.status(500).json({ success: false, message: 'Failed to recognize plate' });
  }
};

exports.createVoiceChallanDraft = async (req, res) => {
  try {
    await ensureSmartFeatureTables();
    const transcript = clean(req.body.transcript).slice(0, 1600);
    if (transcript.length < 8) return res.status(400).json({ success: false, message: 'Transcript is required' });

    const plate = normalizeRegistration(transcript.match(/[A-Z]{2,4}[-\s]?\d{3,5}/i)?.[0] || '');
    const lower = transcript.toLowerCase();
    const violationType = lower.includes('speed') ? 'Overspeeding' : lower.includes('signal') ? 'Signal Violation' : lower.includes('parking') ? 'Illegal Parking' : 'General Violation';
    const amount = lower.includes('speed') ? 2500 : lower.includes('signal') ? 3000 : 1500;
    const locationMatch = transcript.match(/(?:at|near|on)\s+([a-z0-9\s-]{4,60})/i);
    const locationName = clean(locationMatch?.[1], 'Unspecified location').slice(0, 180);

    const result = await executeQuery(
      `INSERT INTO SmartVoiceChallanDrafts
        (Transcript, VehicleRegistrationNumber, ViolationType, LocationName, FineAmount, CreatedByUserID)
       OUTPUT INSERTED.*
       VALUES (@transcript, @plate, @violationType, @locationName, @amount, @userId)`,
      { transcript, plate, violationType, locationName, amount, userId: req.user?.userId || null }
    );

    return res.status(201).json({ success: true, message: 'Voice challan draft created', data: result.recordset[0] });
  } catch (error) {
    console.error('Voice challan draft error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create voice draft' });
  }
};

exports.getDemeritProfile = async (req, res) => {
  try {
    const data = await getDemeritProfileByRegistration(req.params.registrationNumber || req.query.registrationNumber);
    if (!data) return res.status(400).json({ success: false, message: 'registrationNumber is required' });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Demerit profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load demerit profile' });
  }
};

exports.addManualDemerit = async (req, res) => {
  try {
    const registrationNumber = normalizeRegistration(req.body.registrationNumber);
    const points = Math.max(-DEMERIT_LIMIT, Math.min(Number(req.body.points) || 0, DEMERIT_LIMIT));
    if (!registrationNumber) return res.status(400).json({ success: false, message: 'registrationNumber is required' });
    if (points === 0) return res.status(400).json({ success: false, message: 'points must be a positive or negative number' });

    const vehicle = await executeQuery(`SELECT TOP 1 VehicleID FROM Vehicles WHERE RegistrationNumber = @registrationNumber`, { registrationNumber });
    const adjustment = await addDemeritEntry({
      registrationNumber,
      vehicleId: vehicle.recordset[0]?.VehicleID || null,
      points,
      reason: clean(req.body.reason, 'Manual demerit adjustment').slice(0, 220),
      userId: req.user?.userId || null,
    });
    const profile = await getDemeritProfileByRegistration(registrationNumber);
    const isReduction = points < 0;
    const message = isReduction && adjustment.adjustedPoints === 0
      ? 'Driver already has 0 demerit points'
      : isReduction
        ? 'Demerit points reduced'
        : 'Demerit points added';

    return res.status(201).json({
      success: true,
      message,
      data: { adjustment, profile },
    });
  } catch (error) {
    console.error('Manual demerit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add demerit points' });
  }
};

exports.getDemeritReductionRequests = async (req, res) => {
  try {
    await ensureSmartFeatureTables();
    const result = await executeQuery(`
      SELECT TOP 100
        r.RequestID AS requestId,
        r.UserID AS userId,
        r.RegistrationNumber AS registrationNumber,
        r.RequestedPoints AS requestedPoints,
        r.Reason AS reason,
        r.Status AS status,
        r.OfficerNote AS officerNote,
        r.CreatedAt AS createdAt,
        r.UpdatedAt AS updatedAt,
        r.ReviewedByUserID AS reviewedByUserId,
        u.Username AS username,
        CONCAT(u.FirstName, ' ', u.LastName) AS citizenName
      FROM DemeritReductionRequests r
      LEFT JOIN Users u ON u.UserID = r.UserID
      ORDER BY
        CASE WHEN r.Status = 'Pending Review' THEN 0 ELSE 1 END,
        r.CreatedAt DESC
    `);
    return res.json({ success: true, data: result.recordset || [] });
  } catch (error) {
    console.error('Demerit reduction requests error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load demerit reduction requests' });
  }
};

exports.createDemeritReductionRequest = async (req, res) => {
  try {
    await ensureSmartFeatureTables();
    const registrationNumber = normalizeRegistration(req.body.registrationNumber);
    const requestedPoints = Math.min(Math.max(Number(req.body.requestedPoints) || 5, 1), 25);
    const reason = clean(req.body.reason).slice(0, 1000);

    if (!registrationNumber || reason.length < 8) {
      return res.status(400).json({ success: false, message: 'Registration number and reason are required' });
    }

    const result = await executeQuery(
      `INSERT INTO DemeritReductionRequests (UserID, RegistrationNumber, RequestedPoints, Reason)
       OUTPUT
        INSERTED.RequestID AS requestId,
        INSERTED.RegistrationNumber AS registrationNumber,
        INSERTED.RequestedPoints AS requestedPoints,
        INSERTED.Reason AS reason,
        INSERTED.Status AS status,
        INSERTED.CreatedAt AS createdAt
       VALUES (@userId, @registrationNumber, @requestedPoints, @reason)`,
      { userId: req.user?.userId || null, registrationNumber, requestedPoints, reason }
    );

    await createRoleNotifications({
      roles: ['Officer', 'Admin', 'Supervisor'],
      title: 'Demerit reduction request',
      body: `${registrationNumber} requested a ${requestedPoints} point reduction.`,
      type: 'warning',
    });
    await logActivity({
      user: req.user,
      actionType: 'Demerit Reduction Requested',
      entityType: 'Demerit',
      entityId: result.recordset[0]?.requestId,
      description: `${registrationNumber} requested ${requestedPoints} point reduction`,
    });

    return res.status(201).json({ success: true, message: 'Demerit reduction request submitted', data: result.recordset[0] });
  } catch (error) {
    console.error('Create demerit reduction request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit demerit reduction request' });
  }
};

exports.updateDemeritReductionRequest = async (req, res) => {
  try {
    await ensureSmartFeatureTables();
    const requestId = Number(req.params.requestId);
    const status = clean(req.body.status, 'Pending Review');
    const officerNote = clean(req.body.officerNote).slice(0, 1000);
    const allowedStatuses = ['Pending Review', 'Approved', 'Rejected', 'Need More Info'];

    if (!requestId) return res.status(400).json({ success: false, message: 'requestId is required' });
    if (!allowedStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid request status' });

    const requestResult = await executeQuery(
      `SELECT TOP 1 * FROM DemeritReductionRequests WHERE RequestID = @requestId`,
      { requestId }
    );
    const request = requestResult.recordset[0];
    if (!request) return res.status(404).json({ success: false, message: 'Reduction request not found' });

    let adjustment = null;
    if (status === 'Approved' && request.Status !== 'Approved') {
      adjustment = await addDemeritEntry({
        registrationNumber: request.RegistrationNumber,
        points: -Math.abs(Number(request.RequestedPoints || 0)),
        reason: `Approved reduction request #${requestId}: ${officerNote || request.Reason}`.slice(0, 220),
        userId: req.user?.userId || null,
      });
    }

    const result = await executeQuery(
      `UPDATE DemeritReductionRequests
       SET Status = @status,
           OfficerNote = @officerNote,
           ReviewedByUserID = @reviewedByUserId,
           UpdatedAt = GETDATE()
       OUTPUT
        INSERTED.RequestID AS requestId,
        INSERTED.RegistrationNumber AS registrationNumber,
        INSERTED.RequestedPoints AS requestedPoints,
        INSERTED.Status AS status,
        INSERTED.OfficerNote AS officerNote,
        INSERTED.UpdatedAt AS updatedAt
       WHERE RequestID = @requestId`,
      { requestId, status, officerNote, reviewedByUserId: req.user?.userId || null }
    );

    if (request.UserID) {
      await createNotification({
        userId: request.UserID,
        title: `Demerit request ${status}`,
        body: `Your ${request.RequestedPoints} point reduction request for ${request.RegistrationNumber} is ${status}.`,
        type: status === 'Approved' ? 'success' : status === 'Rejected' ? 'danger' : 'info',
      });
    }
    await logActivity({
      user: req.user,
      actionType: `Demerit Request ${status}`,
      entityType: 'DemeritReductionRequest',
      entityId: requestId,
      description: `${request.RegistrationNumber} reduction request marked ${status}`,
    });

    return res.json({
      success: true,
      message: `Demerit reduction request ${status.toLowerCase()}`,
      data: {
        request: result.recordset[0],
        adjustment,
        profile: await getDemeritProfileByRegistration(request.RegistrationNumber),
      },
    });
  } catch (error) {
    console.error('Update demerit reduction request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update demerit reduction request' });
  }
};

exports.completeSafetyCourse = async (req, res) => {
  try {
    await ensureSmartFeatureTables();
    const registrationNumber = normalizeRegistration(req.body.registrationNumber);
    const score = Math.min(Math.max(Number(req.body.score) || 80, 0), 100);
    const courseName = clean(req.body.courseName, 'Defensive Driving Course').slice(0, 180);
    if (!registrationNumber) return res.status(400).json({ success: false, message: 'registrationNumber is required' });

    const recentCourse = await executeQuery(
      `SELECT TOP 1 CourseID, CreatedAt
       FROM DriverSafetyCourses
       WHERE RegistrationNumber = @registrationNumber
         AND Status = 'Completed'
         AND PointsReduced > 0
         AND CreatedAt >= DATEADD(DAY, -30, GETDATE())
       ORDER BY CreatedAt DESC`,
      { registrationNumber }
    );

    if (recentCourse.recordset.length && score >= 70) {
      return res.status(409).json({
        success: false,
        message: 'Safety course reduction is already used for this vehicle within the last 30 days',
      });
    }

    const eligibleReduction = score >= 70 ? TRAINING_REDUCTION_POINTS : 0;
    const adjustment = eligibleReduction
      ? await addDemeritEntry({
        registrationNumber,
        points: -eligibleReduction,
        reason: `${courseName} completed with ${score}% score`,
        userId: req.user?.userId || null,
      })
      : { adjustedPoints: 0, totalPoints: (await getDemeritProfileByRegistration(registrationNumber))?.totalPoints || 0 };

    const result = await executeQuery(
      `INSERT INTO DriverSafetyCourses (UserID, RegistrationNumber, CourseName, Score, Status, PointsReduced)
       OUTPUT
        INSERTED.CourseID AS courseId,
        INSERTED.RegistrationNumber AS registrationNumber,
        INSERTED.CourseName AS courseName,
        INSERTED.Score AS score,
        INSERTED.Status AS status,
        INSERTED.PointsReduced AS pointsReduced,
        INSERTED.CreatedAt AS createdAt
       VALUES (@userId, @registrationNumber, @courseName, @score, @status, @pointsReduced)`,
      {
        userId: req.user?.userId || null,
        registrationNumber,
        courseName,
        score,
        status: score >= 70 ? 'Completed' : 'Failed',
        pointsReduced: Math.abs(Number(adjustment.adjustedPoints || 0)),
      }
    );

    return res.status(201).json({
      success: true,
      message: score >= 70 ? 'Safety course completed and demerit points reduced' : 'Safety course recorded, but score is too low for reduction',
      data: {
        course: result.recordset[0],
        adjustment,
        profile: await getDemeritProfileByRegistration(registrationNumber),
      },
    });
  } catch (error) {
    console.error('Safety course error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record safety course' });
  }
};

exports.getLicenseReview = async (req, res) => {
  try {
    const profile = await getDemeritProfileByRegistration(req.params.registrationNumber);
    if (!profile) return res.status(400).json({ success: false, message: 'registrationNumber is required' });
    return res.json({
      success: true,
      data: {
        ...profile,
        licenseAction: getLicenseAction(profile),
      },
    });
  } catch (error) {
    console.error('License review error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load license review' });
  }
};
