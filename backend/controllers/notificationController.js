const { executeQuery } = require('../config/database');
const { ensureSystemEventTables } = require('../utils/systemEvents');

exports.getNotifications = async (req, res) => {
  try {
    await ensureSystemEventTables();
    const result = await executeQuery(
      `
      SELECT TOP 30
        NotificationID AS notificationId,
        Title AS title,
        Body AS body,
        Type AS type,
        IsRead AS isRead,
        CreatedAt AS createdAt
      FROM Notifications
      WHERE UserID = @userId
      ORDER BY CreatedAt DESC
      `,
      { userId: req.user.userId }
    );

    res.json({ success: true, data: result.recordset || [] });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    await ensureSystemEventTables();
    await executeQuery(
      `UPDATE Notifications SET IsRead = 1 WHERE UserID = @userId`,
      { userId: req.user.userId }
    );
    res.json({ success: true, message: 'Notifications marked read' });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
};
