const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'TrafficManagementSystem',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || '',
    },
  },
  options: {
    encrypt: false, 
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
    enableKeepAlive: true,
    datefirst: 1,
  },
};

let pool = null;

const initializePool = async () => {
  try {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Database pool connected successfully');
    return pool;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
};

const closePool = async () => {
  if (pool) {
    await pool.close();
    console.log('Database pool closed');
  }
};

const executeQuery = async (query, inputs = {}) => {
  const pool = getPool();
  try {
    const request = pool.request();

    
    Object.keys(inputs).forEach((key) => {
      request.input(key, inputs[key]);
    });

    const result = await request.query(query);
    return result;
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
};

const executeProcedure = async (procedureName, inputs = {}) => {
  const pool = getPool();
  try {
    const request = pool.request();

    
    Object.keys(inputs).forEach((key) => {
      request.input(key, inputs[key]);
    });

    const result = await request.execute(procedureName);
    return result;
  } catch (error) {
    console.error('Procedure execution error:', error);
    throw error;
  }
};

module.exports = {
  sql,
  config,
  initializePool,
  getPool,
  closePool,
  executeQuery,
  executeProcedure,
};
