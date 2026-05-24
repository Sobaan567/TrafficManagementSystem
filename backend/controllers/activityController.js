const { executeQuery } = require('../config/database');
const { ensureSystemEventTables } = require('../utils/systemEvents');

exports.getActivityLogs = async (req, res) => {
  try {
    await ensureSystemEventTables();
    const result = await executeQuery(`
      SELECT TOP 80
        ActivityID AS activityId,
        UserID AS userId,
        ActorName AS actorName,
        ActorRole AS actorRole,
        ActionType AS actionType,
        EntityType AS entityType,
        EntityID AS entityId,
        Description AS description,
        CreatedAt AS createdAt
      FROM ActivityLogs
      ORDER BY CreatedAt DESC
    `);

    res.json({ success: true, data: result.recordset || [] });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to load activity logs' });
  }
};
