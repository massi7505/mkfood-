import mysql from 'mysql2/promise';

const cfg = {
  host: '193.203.168.3',
  port: 3306,
  user: 'u447186562_adbddclient',
  password: 'PasswordAa1204beeaaaaasde',
  database: 'u447186562_bddclient',
  connectTimeout: 15000,
};

const conn = await mysql.createConnection(cfg);
const [result] = await conn.execute(
  'UPDATE User SET thirdpartyId = ? WHERE email = ?',
  [1, 'benaissoumassinissa@gmail.com']
);
console.log('Update result:', result);
const [users] = await conn.query('SELECT id, email, name, thirdpartyId FROM User');
console.table(users);
await conn.end();
