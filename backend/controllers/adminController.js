const { executeQuery } = require('../config/database');
const { ensureSystemEventTables } = require('../utils/systemEvents');
const bcrypt = require('bcryptjs');

const normalizeRegistration = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '');
const normalizeNic = (value) => String(value || '').replace(/\D/g, '');

const ensurePublicProfileTable = async () => {
  await executeQuery(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PublicUserProfiles')
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

exports.getAdminOverview = async (req, res) => {
  try {
    await ensureSystemEventTables();
    const [users, challans, appeals, traffic, activity, challanHistory, recentChallans, violationTypes] = await Promise.all([
      executeQuery(`SELECT Role, COUNT(*) AS Count FROM Users GROUP BY Role`),
      executeQuery(`SELECT PaymentStatus, COUNT(*) AS Count, SUM(FineAmount) AS Amount FROM Challans GROUP BY PaymentStatus`),
      executeQuery(`SELECT Status, COUNT(*) AS Count FROM PublicChallanAppeals GROUP BY Status`),
      executeQuery(`SELECT TrafficLevel, COUNT(*) AS Count FROM TrafficSituations GROUP BY TrafficLevel`),
      executeQuery(`SELECT TOP 12 ActionType, Description, CreatedAt FROM ActivityLogs ORDER BY CreatedAt DESC`),
      executeQuery(`
        SELECT TOP 14
          CONVERT(date, IssueDateTime) AS ReportDate,
          COUNT(*) AS Total,
          SUM(CASE WHEN PaymentStatus = 'Paid' THEN 1 ELSE 0 END) AS Paid,
          SUM(CASE WHEN PaymentStatus <> 'Paid' THEN 1 ELSE 0 END) AS Unpaid,
          SUM(FineAmount) AS FineAmount,
          SUM(CASE WHEN PaymentStatus = 'Paid' THEN ISNULL(PaidAmount, FineAmount) ELSE 0 END) AS Collected
        FROM Challans
        GROUP BY CONVERT(date, IssueDateTime)
        ORDER BY ReportDate DESC
      `),
      executeQuery(`
        SELECT TOP 12
          c.ChallanID,
          c.ChallanNumber,
          c.IssueDateTime,
          c.FineAmount,
          c.PaidAmount,
          c.PaymentStatus,
          c.ChallanStatus,
          c.ViolationType,
          c.OwnerName,
          v.RegistrationNumber
        FROM Challans c
        LEFT JOIN Vehicles v ON v.VehicleID = c.VehicleID
        ORDER BY c.IssueDateTime DESC
      `),
      executeQuery(`
        SELECT TOP 8
          COALESCE(c.ViolationType, 'Other') AS ViolationType,
          COUNT(*) AS Count,
          SUM(c.FineAmount) AS Amount
        FROM Challans c
        GROUP BY COALESCE(c.ViolationType, 'Other')
        ORDER BY Count DESC
      `),
    ]);

    res.json({
      success: true,
      data: {
        users: users.recordset || [],
        challans: challans.recordset || [],
        appeals: appeals.recordset || [],
        traffic: traffic.recordset || [],
        activity: activity.recordset || [],
        challanHistory: (challanHistory.recordset || []).reverse(),
        recentChallans: recentChallans.recordset || [],
        violationTypes: violationTypes.recordset || [],
      },
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to load admin overview' });
  }
};

exports.globalSearch = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, data: [] });
    const like = `%${q}%`;

    const [users, vehicles, challans, appeals, locations] = await Promise.all([
      executeQuery(
        `SELECT TOP 6 'User' AS type, Username AS title, Email AS subtitle, CAST(UserID AS NVARCHAR(50)) AS id FROM Users WHERE Username LIKE @like OR Email LIKE @like OR FirstName LIKE @like OR LastName LIKE @like`,
        { like }
      ),
      executeQuery(
        `SELECT TOP 6 'Vehicle' AS type, RegistrationNumber AS title, OwnerName AS subtitle, CAST(VehicleID AS NVARCHAR(50)) AS id FROM Vehicles WHERE RegistrationNumber LIKE @like OR OwnerName LIKE @like`,
        { like }
      ),
      executeQuery(
        `SELECT TOP 6 'Challan' AS type, ChallanNumber AS title, PaymentStatus AS subtitle, CAST(ChallanID AS NVARCHAR(50)) AS id FROM Challans WHERE ChallanNumber LIKE @like OR OwnerName LIKE @like OR ViolationType LIKE @like`,
        { like }
      ),
      executeQuery(
        `SELECT TOP 6 'Appeal' AS type, ChallanNumber AS title, Status AS subtitle, CAST(AppealID AS NVARCHAR(50)) AS id FROM PublicChallanAppeals WHERE ChallanNumber LIKE @like OR VehicleRegistrationNumber LIKE @like OR Reason LIKE @like`,
        { like }
      ),
      executeQuery(
        `SELECT TOP 6 'Location' AS type, LocationName AS title, CityName AS subtitle, CAST(LocationID AS NVARCHAR(50)) AS id FROM Locations WHERE LocationName LIKE @like OR CityName LIKE @like`,
        { like }
      ),
    ]);

    res.json({
      success: true,
      data: [...users.recordset, ...vehicles.recordset, ...challans.recordset, ...appeals.recordset, ...locations.recordset],
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

exports.getManagedUsers = async (req, res) => {
  try {
    await ensurePublicProfileTable();
    const result = await executeQuery(`
      SELECT
        u.UserID AS userId,
        u.Username AS username,
        u.Email AS email,
        u.FirstName AS firstName,
        u.LastName AS lastName,
        u.PhoneNumber AS phoneNumber,
        u.Role AS role,
        u.IsActive AS isActive,
        u.CreatedAt AS createdAt,
        o.OfficerID AS officerId,
        o.BadgeNumber AS badgeNumber,
        o.Rank AS rank,
        o.Department AS department,
        o.AssignedZone AS assignedZone,
        p.PublicProfileID AS publicProfileId,
        p.NICNumber AS nicNumber,
        p.VehicleRegistrationNumber AS vehicleNumber
      FROM Users u
      LEFT JOIN Officers o ON o.UserID = u.UserID
      LEFT JOIN PublicUserProfiles p ON p.UserID = u.UserID
      ORDER BY u.CreatedAt DESC
    `);
    res.json({ success: true, data: result.recordset || [] });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
};

exports.createManagedUser = async (req, res) => {
  try {
    await ensurePublicProfileTable();
    const {
      username, email, password, firstName, lastName, phoneNumber, role,
      badgeNumber, rank, department, assignedZone, nicNumber, vehicleNumber,
    } = req.body;

    const allowedRoles = ['Admin', 'Officer', 'Public', 'Supervisor'];
    if (!username || !email || !password || !allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Username, email, password, and valid role are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    if (role === 'Officer' && !badgeNumber) {
      return res.status(400).json({ success: false, message: 'Badge number is required for officers' });
    }

    const cleanNic = normalizeNic(nicNumber);
    const cleanVehicle = normalizeRegistration(vehicleNumber);
    if (role === 'Public' && (!cleanNic || !cleanVehicle)) {
      return res.status(400).json({ success: false, message: 'NIC and vehicle number are required for citizens' });
    }

    const existing = await executeQuery(
      `SELECT UserID FROM Users WHERE Username = @username OR Email = @email`,
      { username, email }
    );
    if (existing.recordset.length) {
      return res.status(400).json({ success: false, message: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertUser = await executeQuery(
      `
      INSERT INTO Users (Username, Email, PasswordHash, FirstName, LastName, PhoneNumber, Role, IsActive)
      VALUES (@username, @email, @passwordHash, @firstName, @lastName, @phoneNumber, @role, 1);
      SELECT SCOPE_IDENTITY() AS UserID;
      `,
      {
        username,
        email,
        passwordHash,
        firstName: firstName || '',
        lastName: lastName || '',
        phoneNumber: phoneNumber || '',
        role,
      }
    );

    const userId = insertUser.recordset[0].UserID;

    if (role === 'Officer') {
      await executeQuery(
        `
        INSERT INTO Officers (UserID, BadgeNumber, Rank, Department, AssignedZone, IsOnDuty)
        VALUES (@userId, @badgeNumber, @rank, @department, @assignedZone, 0)
        `,
        {
          userId,
          badgeNumber,
          rank: rank || 'Traffic Police Officer',
          department: department || 'Traffic Management',
          assignedZone: assignedZone || '',
        }
      );
    }

    if (role === 'Public') {
      await executeQuery(
        `
        INSERT INTO PublicUserProfiles (UserID, NICNumber, VehicleRegistrationNumber)
        VALUES (@userId, @nicNumber, @vehicleNumber)
        `,
        { userId, nicNumber: cleanNic, vehicleNumber: cleanVehicle }
      );
    }

    res.status(201).json({ success: true, message: 'User created', userId });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

exports.updateManagedUser = async (req, res) => {
  try {
    await ensurePublicProfileTable();
    const userId = Number(req.params.userId);
    const {
      username, email, firstName, lastName, phoneNumber, role, isActive, password,
      badgeNumber, rank, department, assignedZone, nicNumber, vehicleNumber,
    } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const existing = await executeQuery(`SELECT Role FROM Users WHERE UserID = @userId`, { userId });
    if (!existing.recordset.length) return res.status(404).json({ success: false, message: 'User not found' });

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    await executeQuery(
      `
      UPDATE Users
      SET Username = @username,
          Email = @email,
          FirstName = @firstName,
          LastName = @lastName,
          PhoneNumber = @phoneNumber,
          Role = @role,
          IsActive = @isActive,
          UpdatedAt = GETDATE()
          ${passwordHash ? ', PasswordHash = @passwordHash' : ''}
      WHERE UserID = @userId
      `,
      {
        userId,
        username,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        phoneNumber: phoneNumber || '',
        role,
        isActive: isActive ? 1 : 0,
        passwordHash,
      }
    );

    if (role === 'Officer') {
      await executeQuery(
        `
        IF EXISTS (SELECT 1 FROM Officers WHERE UserID = @userId)
          UPDATE Officers SET BadgeNumber = @badgeNumber, Rank = @rank, Department = @department, AssignedZone = @assignedZone, UpdatedAt = GETDATE() WHERE UserID = @userId;
        ELSE
          INSERT INTO Officers (UserID, BadgeNumber, Rank, Department, AssignedZone, IsOnDuty)
          VALUES (@userId, @badgeNumber, @rank, @department, @assignedZone, 0);
        `,
        {
          userId,
          badgeNumber: badgeNumber || `ADM-${userId}`,
          rank: rank || 'Traffic Police Officer',
          department: department || 'Traffic Management',
          assignedZone: assignedZone || '',
        }
      );
    }

    if (role === 'Public') {
      const cleanNic = normalizeNic(nicNumber);
      const cleanVehicle = normalizeRegistration(vehicleNumber);
      if (!cleanNic || !cleanVehicle) {
        return res.status(400).json({ success: false, message: 'NIC and vehicle number are required for citizens' });
      }
      await executeQuery(
        `
        IF EXISTS (SELECT 1 FROM PublicUserProfiles WHERE UserID = @userId)
          UPDATE PublicUserProfiles SET NICNumber = @nicNumber, VehicleRegistrationNumber = @vehicleNumber, UpdatedAt = GETDATE() WHERE UserID = @userId;
        ELSE
          INSERT INTO PublicUserProfiles (UserID, NICNumber, VehicleRegistrationNumber)
          VALUES (@userId, @nicNumber, @vehicleNumber);
        `,
        { userId, nicNumber: cleanNic, vehicleNumber: cleanVehicle }
      );
    }

    res.json({ success: true, message: 'User updated' });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

exports.setManagedUserActive = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const isActive = req.body.isActive ? 1 : 0;
    await executeQuery(
      `UPDATE Users SET IsActive = @isActive, UpdatedAt = GETDATE() WHERE UserID = @userId`,
      { userId, isActive }
    );
    res.json({ success: true, message: isActive ? 'User activated' : 'User deactivated' });
  } catch (error) {
    console.error('Admin active toggle error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
};
