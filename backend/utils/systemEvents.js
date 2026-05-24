const { executeQuery } = require('../config/database');

const ensureSystemEventTables = async () => {
  await executeQuery(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Notifications')
    BEGIN
      CREATE TABLE Notifications (
        NotificationID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NOT NULL,
        Title NVARCHAR(160) NOT NULL,
        Body NVARCHAR(1000) NOT NULL,
        Type NVARCHAR(40) NOT NULL DEFAULT 'info',
        IsRead BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
      );
    END

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ActivityLogs')
    BEGIN
      CREATE TABLE ActivityLogs (
        ActivityID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NULL,
        ActorName NVARCHAR(180) NULL,
        ActorRole NVARCHAR(50) NULL,
        ActionType NVARCHAR(80) NOT NULL,
        EntityType NVARCHAR(80) NULL,
        EntityID NVARCHAR(80) NULL,
        Description NVARCHAR(1000) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
      );
    END
  `);
};

const createNotification = async ({ userId, title, body, type = 'info' }) => {
  if (!userId || !title || !body) return;
  await ensureSystemEventTables();
  await executeQuery(
    `
    INSERT INTO Notifications (UserID, Title, Body, Type)
    VALUES (@userId, @title, @body, @type)
    `,
    { userId, title, body, type }
  );
};

const createRoleNotifications = async ({ roles = [], title, body, type = 'info' }) => {
  if (!roles.length || !title || !body) return;
  await ensureSystemEventTables();
  const roleList = roles.map((role) => `'${String(role).replace(/'/g, "''")}'`).join(',');
  await executeQuery(
    `
    INSERT INTO Notifications (UserID, Title, Body, Type)
    SELECT UserID, @title, @body, @type
    FROM Users
    WHERE Role IN (${roleList}) AND IsActive = 1
    `,
    { title, body, type }
  );
};

const logActivity = async ({ user, actionType, entityType = '', entityId = '', description }) => {
  if (!actionType || !description) return;
  await ensureSystemEventTables();
  const actorName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || null;
  await executeQuery(
    `
    INSERT INTO ActivityLogs (UserID, ActorName, ActorRole, ActionType, EntityType, EntityID, Description)
    VALUES (@userId, @actorName, @actorRole, @actionType, @entityType, @entityId, @description)
    `,
    {
      userId: user?.userId || null,
      actorName,
      actorRole: user?.role || null,
      actionType,
      entityType,
      entityId: String(entityId || ''),
      description,
    }
  );
};

module.exports = {
  ensureSystemEventTables,
  createNotification,
  createRoleNotifications,
  logActivity,
};
