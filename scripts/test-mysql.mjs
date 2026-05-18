import mysql from 'mysql2/promise';

const cfg = {
  host: 'srv1048.hstgr.io',
  port: 3306,
  user: 'u447186562_adbddclient',
  password: 'PasswordAa1204beeaaaaasde',
  database: 'u447186562_bddclient',
  connectTimeout: 15000,
};

console.log('Connecting to', cfg.host, 'as', cfg.user, '->', cfg.database);
try {
  const conn = await mysql.createConnection(cfg);
  console.log('OK: connected');
  const [rows] = await conn.query('SELECT CURRENT_USER() as u, @@hostname as h, DATABASE() as d');
  console.log(rows);
  await conn.end();
} catch (e) {
  console.error('FAIL:', e.code, '-', e.errno, '-', e.sqlState);
  console.error(e.message);
}
