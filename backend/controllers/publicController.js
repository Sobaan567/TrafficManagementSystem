const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const { createNotification, createRoleNotifications, logActivity } = require('../utils/systemEvents');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

const normalizeRegistration = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

const normalizeChallanNumber = (value) => String(value || '').trim().toUpperCase();

const normalizeNic = (value) => String(value || '').replace(/\D/g, '');

const last4 = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : '';
};

const getPublicPaymentStatus = (paymentStatus, challanStatus, remainingAmount) => {
  if (challanStatus === 'Cancelled' && Number(remainingAmount || 0) === 0) return 'Waived';
  return paymentStatus;
};

const ensurePublicProfileTable = async () => {
  await executeQuery(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.tables WHERE name = 'PublicUserProfiles'
    )
    BEGIN
      CREATE TABLE PublicUserProfiles (
        PublicProfileID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NOT NULL UNIQUE,
        NICNumber NVARCHAR(30) NOT NULL UNIQUE,
        VehicleRegistrationNumber NVARCHAR(50) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
      );
    END
  `);
};

const ensurePublicFeatureTables = async () => {
  await ensurePublicProfileTable();

  await executeQuery(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.tables WHERE name = 'PublicChallanAppeals'
    )
    BEGIN
      CREATE TABLE PublicChallanAppeals (
        AppealID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NOT NULL,
        ChallanID INT NULL,
        ChallanNumber NVARCHAR(50) NULL,
        VehicleRegistrationNumber NVARCHAR(50) NOT NULL,
        Reason NVARCHAR(1000) NOT NULL,
        Status NVARCHAR(40) NOT NULL DEFAULT 'Pending Review',
        OfficerNote NVARCHAR(1000) NULL,
        EvidenceFileName NVARCHAR(255) NULL,
        EvidenceDataUrl NVARCHAR(MAX) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
      );
    END

    IF COL_LENGTH('PublicChallanAppeals', 'EvidenceFileName') IS NULL
      ALTER TABLE PublicChallanAppeals ADD EvidenceFileName NVARCHAR(255) NULL;

    IF COL_LENGTH('PublicChallanAppeals', 'EvidenceDataUrl') IS NULL
      ALTER TABLE PublicChallanAppeals ADD EvidenceDataUrl NVARCHAR(MAX) NULL;

    IF NOT EXISTS (
      SELECT 1 FROM sys.tables WHERE name = 'PublicAlertSubscriptions'
    )
    BEGIN
      CREATE TABLE PublicAlertSubscriptions (
        SubscriptionID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NOT NULL,
        AreaName NVARCHAR(150) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
        CONSTRAINT UQ_PublicAlertSubscriptions_UserArea UNIQUE (UserID, AreaName)
      );
    END
  `);
};

const getPublicProfileForUser = async (userId) => {
  await ensurePublicProfileTable();

  const result = await executeQuery(
    `
    SELECT
      p.NICNumber,
      p.VehicleRegistrationNumber,
      u.UserID,
      u.Username,
        u.Email,
        u.FirstName,
        u.LastName,
        u.PhoneNumber,
        u.Role
    FROM PublicUserProfiles p
    INNER JOIN Users u ON u.UserID = p.UserID
    WHERE p.UserID = @userId
      AND u.Role = 'Public'
      AND u.IsActive = 1
    `,
    { userId }
  );

  return result.recordset[0] || null;
};

const mapVehicleDashboard = (vehicle, rows) => {
  const challans = rows.map((r) => ({
    challanId: r.ChallanID,
    challanNumber: r.ChallanNumber,
    issueDateTime: r.IssueDateTime,
    fineAmount: r.FineAmount,
    paidAmount: r.PaidAmount,
    remainingAmount: r.RemainingAmount,
    ownerName: r.OwnerName || vehicle.OwnerName,
    paymentStatus: getPublicPaymentStatus(r.PaymentStatus, r.ChallanStatus, r.RemainingAmount),
    challanStatus: r.ChallanStatus,
    violation: {
      violationId: r.ViolationID,
      violationType: r.ViolationType,
      severity: r.Severity,
      violationDateTime: r.ViolationDateTime,
    },
    location: {
      locationName: r.LocationName,
      cityName: r.CityName,
      stateName: r.StateName,
      latitude: r.Latitude,
      longitude: r.Longitude,
      mapsUrl:
        r.Latitude != null && r.Longitude != null
          ? `https://www.google.com/maps?q=${r.Latitude},${r.Longitude}`
          : null,
    },
  }));

  const totals = challans.reduce(
    (acc, challan) => {
      const status = String(challan.paymentStatus || '').toLowerCase();
      acc.totalChallans += 1;
      acc.totalFine += Number(challan.fineAmount || 0);
      acc.remainingAmount += Number(challan.remainingAmount ?? challan.fineAmount ?? 0);
      if (status === 'paid' || status === 'waived') acc.paidCount += 1;
      if (status === 'unpaid') acc.unpaidCount += 1;
      if (status === 'partial') acc.partialCount += 1;
      return acc;
    },
    { totalChallans: 0, paidCount: 0, unpaidCount: 0, partialCount: 0, totalFine: 0, remainingAmount: 0 }
  );

  return {
    vehicle: {
      vehicleId: vehicle.VehicleID,
      registrationNumber: vehicle.RegistrationNumber,
      vehicleType: vehicle.VehicleType,
      make: vehicle.Make,
      model: vehicle.Model,
      color: vehicle.Color,
      ownerName: vehicle.OwnerName,
    },
    totals,
    challans,
  };
};

exports.registerPublicCitizen = async (req, res) => {
  try {
    await ensurePublicProfileTable();

    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      nicNumber,
      vehicleNumber,
    } = req.body;

    const normalizedNic = normalizeNic(nicNumber);
    const registrationNumber = normalizeRegistration(vehicleNumber);

    if (!username || !email || !password || !normalizedNic || !registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, NIC number, and vehicle number are required',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    if (normalizedNic.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'NIC number is too short',
      });
    }

    const existingUser = await executeQuery(
      `SELECT UserID FROM Users WHERE Username = @username OR Email = @email`,
      { username, email }
    );

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists',
      });
    }

    const existingProfile = await executeQuery(
      `SELECT PublicProfileID FROM PublicUserProfiles WHERE NICNumber = @nicNumber`,
      { nicNumber: normalizedNic }
    );

    if (existingProfile.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'NIC number is already registered',
      });
    }

    const vehicleResult = await executeQuery(
      `
      SELECT TOP 1 VehicleID, RegistrationNumber
      FROM Vehicles
      WHERE RegistrationNumber = @registrationNumber
      `,
      { registrationNumber }
    );

    if (!vehicleResult.recordset.length) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle number was not found in traffic records',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertUser = await executeQuery(
      `
      BEGIN TRANSACTION;

      BEGIN TRY
        INSERT INTO Users (Username, Email, PasswordHash, FirstName, LastName, PhoneNumber, Role, IsActive)
        VALUES (@username, @email, @password, @firstName, @lastName, @phoneNumber, 'Public', 1);

        DECLARE @newUserId INT = SCOPE_IDENTITY();

        INSERT INTO PublicUserProfiles (UserID, NICNumber, VehicleRegistrationNumber)
        VALUES (@newUserId, @nicNumber, @registrationNumber);

        COMMIT TRANSACTION;
        SELECT @newUserId AS UserID;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
      END CATCH
      `,
      {
        username,
        email,
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
        phoneNumber: phoneNumber || '',
        nicNumber: normalizedNic,
        registrationNumber,
      }
    );

    const userId = insertUser.recordset[0].UserID;

    const token = jwt.sign({ userId, username, role: 'Public' }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    return res.status(201).json({
      success: true,
      token,
      user: {
        userId,
        username,
        email,
        role: 'Public',
        firstName,
        lastName,
        nicNumber: normalizedNic,
        vehicleNumber: registrationNumber,
      },
    });
  } catch (error) {
    console.error('Public citizen registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Public registration failed',
    });
  }
};

exports.getPublicCitizenDashboard = async (req, res) => {
  try {
    const profile = await getPublicProfileForUser(req.user.userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Public user profile was not found',
      });
    }

    const vehicleResult = await executeQuery(
      `
      SELECT TOP 1
        VehicleID,
        RegistrationNumber,
        VehicleType,
        Make,
        Model,
        Color,
        OwnerName
      FROM Vehicles
      WHERE RegistrationNumber = @registrationNumber
      `,
      { registrationNumber: profile.VehicleRegistrationNumber }
    );

    const vehicle = vehicleResult.recordset[0];
    let vehicleDashboard = {
      vehicle: {
        registrationNumber: profile.VehicleRegistrationNumber,
      },
      totals: { totalChallans: 0, paidCount: 0, unpaidCount: 0, partialCount: 0, totalFine: 0, remainingAmount: 0 },
      challans: [],
    };

    if (vehicle) {
      const challansResult = await executeQuery(
        `
        SELECT TOP 50
          c.ChallanID,
          c.ChallanNumber,
          c.IssueDateTime,
          c.FineAmount,
          c.PaidAmount,
          c.RemainingAmount,
          c.OwnerName,
          c.PaymentStatus,
          c.ChallanStatus,
          v.ViolationID,
          v.ViolationType,
          v.Severity,
          v.ViolationDateTime,
          l.LocationName,
          l.CityName,
          l.StateName,
          l.Latitude,
          l.Longitude
        FROM Challans c
        INNER JOIN Violations v ON v.ViolationID = c.ViolationID
        INNER JOIN Locations l ON l.LocationID = v.LocationID
        WHERE c.VehicleID = @vehicleId
        ORDER BY c.IssueDateTime DESC
        `,
        { vehicleId: vehicle.VehicleID }
      );

      vehicleDashboard = mapVehicleDashboard(vehicle, challansResult.recordset || []);
    }

    return res.json({
      success: true,
      data: {
        user: {
          userId: profile.UserID,
          username: profile.Username,
          email: profile.Email,
          firstName: profile.FirstName,
          lastName: profile.LastName,
          phoneNumber: profile.PhoneNumber,
          role: profile.Role,
          nicNumber: profile.NICNumber,
        },
        ...vehicleDashboard,
      },
    });
  } catch (error) {
    console.error('Public citizen dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load public dashboard',
    });
  }
};

exports.updatePublicCitizenProfile = async (req, res) => {
  try {
    const profile = await getPublicProfileForUser(req.user.userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Public user profile was not found' });
    }

    const { firstName, lastName, email, phoneNumber, password } = req.body;
    const params = {
      userId: req.user.userId,
      firstName: firstName || '',
      lastName: lastName || '',
      email: email || profile.Email,
      phoneNumber: phoneNumber || '',
    };

    let passwordSql = '';
    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      params.passwordHash = await bcrypt.hash(password, 10);
      passwordSql = ', PasswordHash = @passwordHash';
    }

    await executeQuery(
      `
      UPDATE Users
      SET FirstName = @firstName,
          LastName = @lastName,
          Email = @email,
          PhoneNumber = @phoneNumber,
          UpdatedAt = GETDATE()
          ${passwordSql}
      WHERE UserID = @userId AND Role = 'Public'
      `,
      params
    );

    await logActivity({
      user: req.user,
      actionType: 'Citizen Profile Updated',
      entityType: 'PublicUser',
      entityId: req.user.userId,
      description: `Citizen profile updated for ${profile.VehicleRegistrationNumber}`,
    });

    return res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Public profile update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

/**
 * Public challan lookup by challan number + registration number.
 * This prevents enumerating challans by number alone.
 */
exports.getPublicChallanByNumber = async (req, res) => {
  try {
    const challanNumber = normalizeChallanNumber(req.params.challanNumber);
    const registrationNumber = normalizeRegistration(req.query.registrationNumber);

    if (!challanNumber || !registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'challanNumber and registrationNumber are required',
      });
    }

    const result = await executeQuery(
      `
      SELECT
        c.ChallanID,
        c.ChallanNumber,
        c.IssueDateTime,
        c.FineAmount,
        c.OwnerName,
        c.OwnerPhone,
        c.PaidAmount,
        c.RemainingAmount,
        c.PaymentStatus,
        c.ChallanStatus,
        c.DueDate,
        c.Description,
        v.ViolationID,
        v.ViolationType,
        v.Severity,
        v.ViolationDateTime,
        v.Speed,
        v.SpeedLimit,
        v.Status AS ViolationStatus,
        l.LocationID,
        l.LocationName,
        l.CityName,
        l.StateName,
        l.Latitude,
        l.Longitude,
        ve.VehicleID,
        ve.RegistrationNumber,
        ve.VehicleType,
        ve.Make,
        ve.Model,
        ve.Color,
        ve.OwnerName AS VehicleOwnerName
      FROM Challans c
      INNER JOIN Vehicles ve ON ve.VehicleID = c.VehicleID
      INNER JOIN Violations v ON v.ViolationID = c.ViolationID
      INNER JOIN Locations l ON l.LocationID = v.LocationID
      WHERE c.ChallanNumber = @challanNumber
        AND ve.RegistrationNumber = @registrationNumber
      `,
      { challanNumber, registrationNumber }
    );

    await createRoleNotifications({
      roles: ['Officer', 'Admin'],
      title: 'New citizen appeal',
      body: `${vehicleRegistrationNumber} submitted an appeal for ${challanNumber || 'a challan'}.`,
      type: 'appeal',
    });
    await logActivity({
      user: req.user,
      actionType: 'Appeal Submitted',
      entityType: 'Appeal',
      entityId: result.recordset[0]?.AppealID,
      description: `Citizen submitted appeal for ${challanNumber || vehicleRegistrationNumber}`,
    });

    if (!result.recordset?.length) {
      return res.status(404).json({
        success: false,
        message: 'No challan found for the provided details',
      });
    }

    const row = result.recordset[0];
    const mapsUrl =
      row.Latitude != null && row.Longitude != null
        ? `https://www.google.com/maps?q=${row.Latitude},${row.Longitude}`
        : null;

    return res.json({
      success: true,
      data: {
        challan: {
          challanId: row.ChallanID,
          challanNumber: row.ChallanNumber,
          issueDateTime: row.IssueDateTime,
          fineAmount: row.FineAmount,
          paidAmount: row.PaidAmount,
          remainingAmount: row.RemainingAmount,
          paymentStatus: getPublicPaymentStatus(row.PaymentStatus, row.ChallanStatus, row.RemainingAmount),
          challanStatus: row.ChallanStatus,
          dueDate: row.DueDate,
          description: row.Description,
          ownerName: row.OwnerName || row.VehicleOwnerName,
          ownerPhone: row.OwnerPhone,
        },
        vehicle: {
          vehicleId: row.VehicleID,
          registrationNumber: row.RegistrationNumber,
          vehicleType: row.VehicleType,
          make: row.Make,
          model: row.Model,
          color: row.Color,
          ownerName: row.VehicleOwnerName || row.OwnerName,
        },
        violation: {
          violationId: row.ViolationID,
          violationType: row.ViolationType,
          severity: row.Severity,
          violationDateTime: row.ViolationDateTime,
          speed: row.Speed,
          speedLimit: row.SpeedLimit,
          status: row.ViolationStatus,
        },
        location: {
          locationId: row.LocationID,
          locationName: row.LocationName,
          cityName: row.CityName,
          stateName: row.StateName,
          latitude: row.Latitude,
          longitude: row.Longitude,
          mapsUrl,
        },
      },
    });
  } catch (error) {
    console.error('Public challan lookup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to lookup challan',
    });
  }
};

/**
 * Public vehicle summary by registration number.
 * Optionally requires last4 of phone to reduce enumeration.
 */
exports.getPublicVehicleSummary = async (req, res) => {
  try {
    const registrationNumber = normalizeRegistration(req.params.registrationNumber);
    const ownerPhoneLast4 = String(req.query.ownerPhoneLast4 || '').trim();

    if (!registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'registrationNumber is required',
      });
    }

    // Fetch basic vehicle row
    const vehicleResult = await executeQuery(
      `
      SELECT TOP 1
        VehicleID,
        RegistrationNumber,
        VehicleType,
        Make,
        Model,
        Color,
        OwnerName,
        OwnerPhone
      FROM Vehicles
      WHERE RegistrationNumber = @registrationNumber
      `,
      { registrationNumber }
    );

    if (!vehicleResult.recordset?.length) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    const vehicle = vehicleResult.recordset[0];

    // Optional verification: if provided, must match last4 of vehicle owner phone OR any challan owner phone
    if (ownerPhoneLast4) {
      const vehiclePhoneLast4 = last4(vehicle.OwnerPhone);
      let challanPhoneLast4 = '';

      const phoneFromChallanResult = await executeQuery(
        `
        SELECT TOP 1 OwnerPhone
        FROM Challans
        WHERE VehicleID = @vehicleId
          AND OwnerPhone IS NOT NULL
        ORDER BY IssueDateTime DESC
        `,
        { vehicleId: vehicle.VehicleID }
      );
      if (phoneFromChallanResult.recordset?.length) {
        challanPhoneLast4 = last4(phoneFromChallanResult.recordset[0].OwnerPhone);
      }

      if (ownerPhoneLast4 !== vehiclePhoneLast4 && ownerPhoneLast4 !== challanPhoneLast4) {
        // Don’t reveal whether the plate exists when verification fails
        return res.status(404).json({
          success: false,
          message: 'No records found for the provided details',
        });
      }
    }

    // Recent challans + locations for map markers
    const challansResult = await executeQuery(
      `
      SELECT TOP 20
        c.ChallanID,
        c.ChallanNumber,
        c.IssueDateTime,
        c.FineAmount,
        c.OwnerName,
        c.PaymentStatus,
        c.ChallanStatus,
        v.ViolationID,
        v.ViolationType,
        v.Severity,
        v.ViolationDateTime,
        l.LocationName,
        l.CityName,
        l.StateName,
        l.Latitude,
        l.Longitude
      FROM Challans c
      INNER JOIN Violations v ON v.ViolationID = c.ViolationID
      INNER JOIN Locations l ON l.LocationID = v.LocationID
      WHERE c.VehicleID = @vehicleId
      ORDER BY c.IssueDateTime DESC
      `,
      { vehicleId: vehicle.VehicleID }
    );

    const rows = challansResult.recordset || [];

    const totals = rows.reduce(
      (acc, r) => {
        acc.totalChallans += 1;
        acc.totalFine += Number(r.FineAmount || 0);
        const publicStatus = getPublicPaymentStatus(r.PaymentStatus, r.ChallanStatus, 0);
        if (String(publicStatus).toLowerCase() === 'paid' || String(publicStatus).toLowerCase() === 'waived') acc.paidCount += 1;
        if (String(publicStatus).toLowerCase() === 'unpaid') acc.unpaidCount += 1;
        if (String(publicStatus).toLowerCase() === 'partial') acc.partialCount += 1;
        return acc;
      },
      { totalChallans: 0, paidCount: 0, unpaidCount: 0, partialCount: 0, totalFine: 0 }
    );

    return res.json({
      success: true,
      data: {
        vehicle: {
          vehicleId: vehicle.VehicleID,
          registrationNumber: vehicle.RegistrationNumber,
          vehicleType: vehicle.VehicleType,
          make: vehicle.Make,
          model: vehicle.Model,
          color: vehicle.Color,
          ownerName: vehicle.OwnerName,
        },
        totals,
        challans: rows.map((r) => ({
          challanId: r.ChallanID,
          challanNumber: r.ChallanNumber,
          issueDateTime: r.IssueDateTime,
          fineAmount: r.FineAmount,
          ownerName: r.OwnerName || vehicle.OwnerName,
          paymentStatus: getPublicPaymentStatus(r.PaymentStatus, r.ChallanStatus, 0),
          challanStatus: r.ChallanStatus,
          violation: {
            violationId: r.ViolationID,
            violationType: r.ViolationType,
            severity: r.Severity,
            violationDateTime: r.ViolationDateTime,
          },
          location: {
            locationName: r.LocationName,
            cityName: r.CityName,
            stateName: r.StateName,
            latitude: r.Latitude,
            longitude: r.Longitude,
            mapsUrl:
              r.Latitude != null && r.Longitude != null
                ? `https://www.google.com/maps?q=${r.Latitude},${r.Longitude}`
                : null,
          },
        })),
      },
    });
  } catch (error) {
    console.error('Public vehicle lookup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to lookup vehicle',
    });
  }
};

exports.createPublicChallanAppeal = async (req, res) => {
  try {
    await ensurePublicFeatureTables();

    const profile = await getPublicProfileForUser(req.user.userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Public user profile was not found' });
    }

    let challanNumber = normalizeChallanNumber(req.body.challanNumber);
    let challanId = req.body.challanId ? Number(req.body.challanId) : null;
    const reason = String(req.body.reason || '').trim();
    const evidenceFileName = String(req.body.evidenceFileName || '').trim();
    const evidenceDataUrl = String(req.body.evidenceDataUrl || '').trim();
    const vehicleRegistrationNumber = normalizeRegistration(req.body.vehicleRegistrationNumber || profile.VehicleRegistrationNumber);

    if (!reason || reason.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Please enter an appeal reason with at least 12 characters',
      });
    }

    if (vehicleRegistrationNumber !== normalizeRegistration(profile.VehicleRegistrationNumber)) {
      return res.status(403).json({
        success: false,
        message: 'You can only appeal challans for your registered vehicle',
      });
    }

    if (challanNumber || challanId) {
      const challanResult = await executeQuery(
        `
        SELECT TOP 1 c.ChallanID, c.ChallanNumber
        FROM Challans c
        INNER JOIN Vehicles v ON v.VehicleID = c.VehicleID
        WHERE v.RegistrationNumber = @registrationNumber
          AND (@challanId IS NULL OR c.ChallanID = @challanId)
          AND (@challanNumber = '' OR c.ChallanNumber = @challanNumber)
        `,
        {
          registrationNumber: vehicleRegistrationNumber,
          challanId,
          challanNumber: challanNumber || '',
        }
      );

      if (!challanResult.recordset.length) {
        return res.status(404).json({
          success: false,
          message: 'Challan was not found for your registered vehicle',
        });
      }

      challanId = challanResult.recordset[0].ChallanID;
      challanNumber = challanResult.recordset[0].ChallanNumber;
    }

    const result = await executeQuery(
      `
      INSERT INTO PublicChallanAppeals
        (UserID, ChallanID, ChallanNumber, VehicleRegistrationNumber, Reason, EvidenceFileName, EvidenceDataUrl)
      OUTPUT INSERTED.AppealID, INSERTED.Status, INSERTED.CreatedAt
      VALUES
        (@userId, @challanId, @challanNumber, @registrationNumber, @reason, @evidenceFileName, @evidenceDataUrl)
      `,
      {
        userId: req.user.userId,
        challanId,
        challanNumber,
        registrationNumber: vehicleRegistrationNumber,
        reason,
        evidenceFileName,
        evidenceDataUrl,
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Appeal submitted',
      data: result.recordset[0],
    });
  } catch (error) {
    console.error('Public appeal create error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit appeal',
    });
  }
};

exports.getPublicChallanAppeals = async (req, res) => {
  try {
    await ensurePublicFeatureTables();

    const result = await executeQuery(
      `
      SELECT
        AppealID AS appealId,
        ChallanID AS challanId,
        ChallanNumber AS challanNumber,
        VehicleRegistrationNumber AS vehicleRegistrationNumber,
        Reason AS reason,
        EvidenceFileName AS evidenceFileName,
        EvidenceDataUrl AS evidenceDataUrl,
        Status AS status,
        OfficerNote AS officerNote,
        CreatedAt AS createdAt,
        UpdatedAt AS updatedAt
      FROM PublicChallanAppeals
      WHERE UserID = @userId
      ORDER BY CreatedAt DESC
      `,
      { userId: req.user.userId }
    );

    return res.json({ success: true, data: result.recordset || [] });
  } catch (error) {
    console.error('Public appeals list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load appeals',
    });
  }
};

exports.getOfficerPublicAppeals = async (req, res) => {
  try {
    await ensurePublicFeatureTables();

    const result = await executeQuery(`
      SELECT
        a.AppealID AS appealId,
        a.ChallanID AS challanId,
        a.ChallanNumber AS challanNumber,
        a.VehicleRegistrationNumber AS vehicleRegistrationNumber,
        a.Reason AS reason,
        a.EvidenceFileName AS evidenceFileName,
        a.EvidenceDataUrl AS evidenceDataUrl,
        a.Status AS status,
        a.OfficerNote AS officerNote,
        a.CreatedAt AS createdAt,
        a.UpdatedAt AS updatedAt,
        u.FirstName AS firstName,
        u.LastName AS lastName,
        u.Username AS username,
        u.Email AS email,
        p.NICNumber AS nicNumber,
        CASE
          WHEN c.ChallanStatus = 'Cancelled' AND ISNULL(c.RemainingAmount, 0) = 0 THEN 'Waived'
          ELSE c.PaymentStatus
        END AS paymentStatus,
        c.ChallanStatus AS challanStatus,
        c.FineAmount AS fineAmount
      FROM PublicChallanAppeals a
      INNER JOIN Users u ON u.UserID = a.UserID
      LEFT JOIN PublicUserProfiles p ON p.UserID = a.UserID
      LEFT JOIN Challans c ON c.ChallanID = a.ChallanID
      ORDER BY
        CASE WHEN a.Status = 'Pending Review' THEN 0 ELSE 1 END,
        a.CreatedAt DESC
    `);

    return res.json({ success: true, data: result.recordset || [] });
  } catch (error) {
    console.error('Officer public appeals list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load public appeals',
    });
  }
};

exports.updateOfficerPublicAppeal = async (req, res) => {
  try {
    await ensurePublicFeatureTables();

    const appealId = Number(req.params.appealId);
    const status = String(req.body.status || '').trim();
    const officerNote = String(req.body.officerNote || '').trim();
    const allowedStatuses = ['Pending Review', 'Approved', 'Rejected', 'Need More Info'];

    if (!appealId) {
      return res.status(400).json({ success: false, message: 'appealId is required' });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appeal status',
      });
    }

    const result = await executeQuery(
      `
      UPDATE PublicChallanAppeals
      SET Status = @status,
          OfficerNote = @officerNote,
          UpdatedAt = GETDATE()
      OUTPUT
        INSERTED.AppealID AS appealId,
        INSERTED.Status AS status,
        INSERTED.OfficerNote AS officerNote,
        INSERTED.UpdatedAt AS updatedAt
      WHERE AppealID = @appealId
      `,
      { appealId, status, officerNote }
    );

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'Appeal not found' });
    }

    const appealResult = await executeQuery(
      `
      SELECT UserID, ChallanID, ChallanNumber, VehicleRegistrationNumber
      FROM PublicChallanAppeals
      WHERE AppealID = @appealId
      `,
      { appealId }
    );

    const appeal = appealResult.recordset[0];
    if (appeal && status === 'Approved') {
      await executeQuery(
        `
        UPDATE c
        SET
          c.PaidAmount = 0,
          c.RemainingAmount = 0,
          c.PaymentStatus = 'Paid',
          c.ChallanStatus = 'Cancelled',
          c.UpdatedAt = GETDATE()
        FROM Challans c
        INNER JOIN Vehicles v ON v.VehicleID = c.VehicleID
        WHERE v.RegistrationNumber = @registrationNumber
          AND (
            (@challanId IS NOT NULL AND c.ChallanID = @challanId)
            OR (@challanNumber <> '' AND c.ChallanNumber = @challanNumber)
          )
        `,
        {
          registrationNumber: appeal.VehicleRegistrationNumber,
          challanId: appeal.ChallanID || null,
          challanNumber: appeal.ChallanNumber || '',
        }
      );
    }

    if (appeal && status === 'Rejected') {
      await executeQuery(
        `
        UPDATE c
        SET
          c.ChallanStatus = 'Appealed',
          c.UpdatedAt = GETDATE()
        FROM Challans c
        INNER JOIN Vehicles v ON v.VehicleID = c.VehicleID
        WHERE v.RegistrationNumber = @registrationNumber
          AND (
            (@challanId IS NOT NULL AND c.ChallanID = @challanId)
            OR (@challanNumber <> '' AND c.ChallanNumber = @challanNumber)
          )
        `,
        {
          registrationNumber: appeal.VehicleRegistrationNumber,
          challanId: appeal.ChallanID || null,
          challanNumber: appeal.ChallanNumber || '',
        }
      );
    }

    if (appeal) {
      await createNotification({
        userId: appeal.UserID,
        title: `Appeal ${status}`,
        body: `Your appeal for ${appeal.ChallanNumber || 'your challan'} is now ${status}.`,
        type: status === 'Approved' ? 'success' : status === 'Rejected' ? 'danger' : 'info',
      });
      await logActivity({
        user: req.user,
        actionType: `Appeal ${status}`,
        entityType: 'Appeal',
        entityId: appealId,
        description: `Officer marked appeal ${appeal.ChallanNumber || appealId} as ${status}`,
      });
    }

    return res.json({
      success: true,
      message: 'Appeal updated',
      data: result.recordset[0],
    });
  } catch (error) {
    console.error('Officer public appeal update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update appeal',
    });
  }
};

exports.getPublicAlertSubscriptions = async (req, res) => {
  try {
    await ensurePublicFeatureTables();

    const result = await executeQuery(
      `
      SELECT
        SubscriptionID AS subscriptionId,
        AreaName AS areaName,
        IsActive AS isActive,
        CreatedAt AS createdAt,
        UpdatedAt AS updatedAt
      FROM PublicAlertSubscriptions
      WHERE UserID = @userId
        AND IsActive = 1
      ORDER BY AreaName
      `,
      { userId: req.user.userId }
    );

    return res.json({ success: true, data: result.recordset || [] });
  } catch (error) {
    console.error('Public subscriptions list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load subscriptions',
    });
  }
};

exports.createPublicAlertSubscription = async (req, res) => {
  try {
    await ensurePublicFeatureTables();

    const areaName = String(req.body.areaName || '').trim();
    if (areaName.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Area name is required',
      });
    }

    const result = await executeQuery(
      `
      IF EXISTS (
        SELECT 1 FROM PublicAlertSubscriptions
        WHERE UserID = @userId AND AreaName = @areaName
      )
      BEGIN
        UPDATE PublicAlertSubscriptions
        SET IsActive = 1, UpdatedAt = GETDATE()
        WHERE UserID = @userId AND AreaName = @areaName;
      END
      ELSE
      BEGIN
        INSERT INTO PublicAlertSubscriptions (UserID, AreaName)
        VALUES (@userId, @areaName);
      END

      SELECT TOP 1
        SubscriptionID AS subscriptionId,
        AreaName AS areaName,
        IsActive AS isActive,
        CreatedAt AS createdAt,
        UpdatedAt AS updatedAt
      FROM PublicAlertSubscriptions
      WHERE UserID = @userId AND AreaName = @areaName;
      `,
      { userId: req.user.userId, areaName }
    );

    return res.status(201).json({
      success: true,
      message: 'Subscription saved',
      data: result.recordset[0],
    });
  } catch (error) {
    console.error('Public subscription create error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save subscription',
    });
  }
};

exports.deletePublicAlertSubscription = async (req, res) => {
  try {
    await ensurePublicFeatureTables();

    const subscriptionId = Number(req.params.subscriptionId);
    if (!subscriptionId) {
      return res.status(400).json({ success: false, message: 'subscriptionId is required' });
    }

    await executeQuery(
      `
      UPDATE PublicAlertSubscriptions
      SET IsActive = 0, UpdatedAt = GETDATE()
      WHERE UserID = @userId AND SubscriptionID = @subscriptionId
      `,
      { userId: req.user.userId, subscriptionId }
    );

    return res.json({ success: true, message: 'Subscription removed' });
  } catch (error) {
    console.error('Public subscription delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove subscription',
    });
  }
};

exports.payPublicVehicleChallans = async (req, res) => {
  try {
    const registrationNumber = normalizeRegistration(req.params.registrationNumber);

    if (!registrationNumber) {
      return res.status(400).json({
        success: false,
        message: 'registrationNumber is required',
      });
    }

    const transactionId = `FAKE-${Date.now()}`;

    const result = await executeQuery(
      `
      UPDATE c
      SET
        c.PaidAmount = c.FineAmount,
        c.RemainingAmount = 0,
        c.PaymentStatus = 'Paid',
        c.PaymentMethod = 'Fake Card',
        c.TransactionID = @transactionId,
        c.PaymentDate = GETDATE(),
        c.UpdatedAt = GETDATE()
      FROM Challans c
      INNER JOIN Vehicles v ON v.VehicleID = c.VehicleID
      WHERE v.RegistrationNumber = @registrationNumber
        AND c.PaymentStatus NOT IN ('Paid', 'Waived')
      `,
      { registrationNumber, transactionId }
    );

    return res.json({
      success: true,
      message: 'Payment complete',
      data: {
        transactionId,
        rowsAffected: result.rowsAffected?.[0] || 0,
      },
    });
  } catch (error) {
    console.error('Public fake payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete payment',
    });
  }
};
