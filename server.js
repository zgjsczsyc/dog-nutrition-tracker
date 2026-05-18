const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== 数据库抽象层：自动检测 PostgreSQL / SQLite =====
let db; // 数据库实例
let dbType; // 'pg' | 'sqlite'

// Promise 封装（统一接口）
const dbRun = (sql, params = []) => {
  if (dbType === 'pg') {
    return db.query(sql, params).then(res => ({ lastID: res.rows[0]?.id || res.rowCount, changes: res.rowCount }));
  }
  return new Promise((res, rej) =>
    db.run(sql, params, function(err) { err ? rej(err) : res(this); })
  );
};
const dbGet = (sql, params = []) => {
  if (dbType === 'pg') {
    return db.query(sql, params).then(res => res.rows[0] || null);
  }
  return new Promise((res, rej) =>
    db.get(sql, params, (err, row) => { err ? rej(err) : res(row); })
  );
};
const dbAll = (sql, params = []) => {
  if (dbType === 'pg') {
    return db.query(sql, params).then(res => res.rows);
  }
  return new Promise((res, rej) =>
    db.all(sql, params, (err, rows) => { err ? rej(err) : res(rows); })
  );
};

// ===== 数据库初始化 =====
async function initDb() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (DATABASE_URL) {
    // ---- PostgreSQL 模式（Supabase / Zeabur PostgreSQL 等） ----
    console.log('🐘 检测到 DATABASE_URL，使用 PostgreSQL');
    const { Pool } = require('pg');
    db = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Supabase Free Tier 最多 60 个直连，保险起见池上限设为 5
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    dbType = 'pg';

    // 测试连接
    const client = await db.connect();
    console.log('✅ PostgreSQL 连接成功');
    client.release();
  } else {
    // ---- SQLite 模式（本地开发） ----
    console.log('📦 未检测到 DATABASE_URL，使用 SQLite（本地模式）');
    const sqlite3 = require('sqlite3').verbose();
    const DB_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    const DB_PATH = path.join(DB_DIR, 'nutrition.db');
    db = new sqlite3.Database(DB_PATH);
    dbType = 'sqlite';
  }

  // ===== 建表 =====
  if (dbType === 'pg') {
    await dbRun(`CREATE TABLE IF NOT EXISTS ingredients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      protein REAL NOT NULL DEFAULT 0,
      calories REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      phosphorus REAL NOT NULL DEFAULT 0,
      calcium REAL NOT NULL DEFAULT 0,
      potassium REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
      updated_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
    )`);
    await dbRun(`CREATE TABLE IF NOT EXISTS diet_records (
      id SERIAL PRIMARY KEY,
      record_date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      ingredient_id INTEGER NOT NULL,
      ingredient_name TEXT NOT NULL,
      amount REAL NOT NULL,
      protein REAL NOT NULL DEFAULT 0,
      calories REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      phosphorus REAL NOT NULL DEFAULT 0,
      calcium REAL NOT NULL DEFAULT 0,
      potassium REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
    )`);
    await dbRun(`CREATE TABLE IF NOT EXISTS nutrition_limits (
      id SERIAL PRIMARY KEY,
      dog_weight REAL DEFAULT 7.2,
      protein_limit REAL DEFAULT 20.16,
      calories_limit REAL DEFAULT 576,
      fat_limit REAL DEFAULT 10.8,
      phosphorus_limit REAL DEFAULT 432,
      calcium_limit REAL DEFAULT 864,
      potassium_limit REAL DEFAULT 1440,
      updated_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
    )`);
  } else {
    await dbRun(`CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      protein REAL NOT NULL DEFAULT 0,
      calories REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      phosphorus REAL NOT NULL DEFAULT 0,
      calcium REAL NOT NULL DEFAULT 0,
      potassium REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`);
    await dbRun(`CREATE TABLE IF NOT EXISTS diet_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      ingredient_id INTEGER NOT NULL,
      ingredient_name TEXT NOT NULL,
      amount REAL NOT NULL,
      protein REAL NOT NULL DEFAULT 0,
      calories REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      phosphorus REAL NOT NULL DEFAULT 0,
      calcium REAL NOT NULL DEFAULT 0,
      potassium REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`);
    await dbRun(`CREATE TABLE IF NOT EXISTS nutrition_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dog_weight REAL DEFAULT 7.2,
      protein_limit REAL DEFAULT 20.16,
      calories_limit REAL DEFAULT 576,
      fat_limit REAL DEFAULT 10.8,
      phosphorus_limit REAL DEFAULT 432,
      calcium_limit REAL DEFAULT 864,
      potassium_limit REAL DEFAULT 1440,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`);
  }

  // 默认营养上限
  const limitRow = await dbGet('SELECT id FROM nutrition_limits LIMIT 1');
  if (!limitRow) {
    await dbRun(`INSERT INTO nutrition_limits (dog_weight, protein_limit, calories_limit, fat_limit, phosphorus_limit, calcium_limit, potassium_limit)
               VALUES (7.2, 20.16, 576, 10.8, 432, 864, 1440)`);
  }

  // 初始食材数据
  const countRow = await dbGet(dbType === 'pg'
    ? 'SELECT COUNT(*) as cnt FROM ingredients'
    : 'SELECT COUNT(*) as cnt FROM ingredients');
  if (countRow.cnt === 0) {
    const INITIAL_INGREDIENTS = [
      { name: "鸡胸肉（去皮）", protein: 0.22, calories: 3.4, fat: 0.06, phosphorus: 6.8, calcium: 9.5, potassium: 4.3 },
      { name: "鸡腿肉（去皮）", protein: 0.12, calories: 4.2, fat: 0.14, phosphorus: 3.0, calcium: 6.0, potassium: 5.0 },
      { name: "鸡里脊/鸡柳", protein: 0.065, calories: 0.85, fat: 0.025, phosphorus: 1.4, calcium: 1.5, potassium: 1.3 },
      { name: "鸭胸肉kd友好", protein: 0.036, calories: 0.9, fat: 0.055, phosphorus: 0.6, calcium: 1.7, potassium: 1.4 },
      { name: "猪里脊/猪瘦肉", protein: 0.225, calories: 3.94, fat: 0.16, phosphorus: 5.0, calcium: 8.0, potassium: 5.9 },
      { name: "猪颈肉/猪肩肉", protein: 0.054, calories: 1.59, fat: 0.09, phosphorus: 1.1, calcium: 1.7, potassium: 2.8 },
      { name: "牛里脊（瘦）", protein: 0.26, calories: 1.65, fat: 0.036, phosphorus: 2.4, calcium: 0.12, potassium: 3.4 },
      { name: "牛腿肉/牛腱子", protein: 0.25, calories: 1.55, fat: 0.025, phosphorus: 2.0, calcium: 0.1, potassium: 2.4 },
      { name: "牛肩肉/牛夹心", protein: 0.24, calories: 1.85, fat: 0.07, phosphorus: 2.1, calcium: 0.11, potassium: 2.6 },
      { name: "牛臀肉/牛霖肉", protein: 0.26, calories: 1.7, fat: 0.07, phosphorus: 2.1, calcium: 0.12, potassium: 2.7 },
      { name: "羊腿肉", protein: 0.25, calories: 1.55, fat: 0.06, phosphorus: 2.2, calcium: 0.09, potassium: 2.5 },
      { name: "兔肉", protein: 0.25, calories: 1.73, fat: 0.06, phosphorus: 2.1, calcium: 0.15, potassium: 2.8 },
      { name: "猪后腿瘦肉", protein: 0.29, calories: 1.65, fat: 0.045, phosphorus: 2.0, calcium: 0.12, potassium: 2.6 },
      { name: "鸡胸绞肉/碎肉", protein: 0.25, calories: 1.85, fat: 0.08, phosphorus: 2.3, calcium: 0.15, potassium: 2.7 },
      { name: "鳕鱼/鳕鱼片", protein: 0.2, calories: 1.5, fat: 0.03, phosphorus: 3.0, calcium: 5.0, potassium: 2.8 },
      { name: "鲈鱼/石斑鱼", protein: 0.16, calories: 1.2, fat: 0.01, phosphorus: 2.4, calcium: 0.5, potassium: 2.6 },
      { name: "鲑鱼", protein: 0.18, calories: 0.82, fat: 0.009, phosphorus: 2.0, calcium: 0.16, potassium: 2.7 },
      { name: "鲈鱼/花鲈鱼片", protein: 0.22, calories: 1.35, fat: 0.026, phosphorus: 2.1, calcium: 0.18, potassium: 2.9 },
      { name: "鸡蛋（全蛋）", protein: 0.1, calories: 0.52, fat: 0.002, phosphorus: 0.17, calcium: 0.07, potassium: 1.6 },
      { name: "豆腐", protein: 0.13, calories: 1.43, fat: 0.1, phosphorus: 2.0, calcium: 0.5, potassium: 1.6 },
      { name: "土豆/马铃薯（熟）", protein: 0.024, calories: 1.22, fat: 0.003, phosphorus: 0.4, calcium: 0.02, potassium: 0.26 },
      { name: "白米饭", protein: 0.032, calories: 1.15, fat: 0.01, phosphorus: 0.85, calcium: 0.07, potassium: 0.8 },
      { name: "白米（生，煮熟折算）", protein: 0.005, calories: 1.15, fat: 0.002, phosphorus: 0.15, calcium: 0.02, potassium: 0.1 },
      { name: "燕麦片（煮熟）", protein: 0.043, calories: 1.2, fat: 0.005, phosphorus: 0.4, calcium: 0.07, potassium: 0.3 },
      { name: "红薯/地瓜（熟）", protein: 0.05, calories: 1.35, fat: 0.01, phosphorus: 0.6, calcium: 0.15, potassium: 0.35 },
      { name: "南瓜（蒸熟）", protein: 0.005, calories: 0.6, fat: 0.002, phosphorus: 0.2, calcium: 0.05, potassium: 0.15 },
      { name: "藜麦（煮熟）", protein: 0.065, calories: 2.3, fat: 0.012, phosphorus: 0.8, calcium: 0.1, potassium: 0.7 },
      { name: "山药（熟）", protein: 0.02, calories: 0.87, fat: 0.001, phosphorus: 0.44, calcium: 0.05, potassium: 3.8 },
      { name: "西蓝花（熟）", protein: 0.016, calories: 0.9, fat: 0.002, phosphorus: 0.3, calcium: 0.3, potassium: 3.3 },
      { name: "卷心菜（熟）", protein: 0.015, calories: 0.9, fat: 0.002, phosphorus: 0.34, calcium: 0.2, potassium: 2.0 },
      { name: "芋头", protein: 0.05, calories: 1.4, fat: 0.01, phosphorus: 0.55, calcium: 0.12, potassium: 0.35 },
      { name: "小米粥（Farina）", protein: 0.04, calories: 0.9, fat: 0.01, phosphorus: 0.5, calcium: 0.1, potassium: 0.2 },
      { name: "橄榄油", protein: 0.01, calories: 3.5, fat: 0.0, phosphorus: 0.2, calcium: 0.05, potassium: 0.2 },
      { name: "水", protein: 0.01, calories: 0.2, fat: 0.001, phosphorus: 0.25, calcium: 0.21, potassium: 3.0 },
      { name: "胡萝卜", protein: 0.024, calories: 0.35, fat: 0.004, phosphorus: 0.67, calcium: 0.22, potassium: 1.92 },
      { name: "黄瓜", protein: 0.008, calories: 0.35, fat: 0.002, phosphorus: 0.24, calcium: 0.33, potassium: 2.56 },
      { name: "冬瓜", protein: 0.012, calories: 0.19, fat: 0.003, phosphorus: 0.38, calcium: 0.16, potassium: 2.08 },
      { name: "白菜", protein: 0.013, calories: 0.23, fat: 0.001, phosphorus: 0.23, calcium: 0.4, potassium: 1.84 },
      { name: "莴苣", protein: 0.012, calories: 0.13, fat: 0.002, phosphorus: 0.29, calcium: 0.77, potassium: 1.6 },
      { name: "芹菜", protein: 0.007, calories: 0.15, fat: 0.001, phosphorus: 0.24, calcium: 0.16, potassium: 1.2 },
      { name: "生菜", protein: 0.022, calories: 0.22, fat: 0.002, phosphorus: 0.52, calcium: 0.24, potassium: 1.6 },
      { name: "菠菜", protein: 0.016, calories: 0.43, fat: 0.002, phosphorus: 0.4, calcium: 0.16, potassium: 2.56 },
      { name: "丝瓜", protein: 0.018, calories: 0.23, fat: 0.003, phosphorus: 0.44, calcium: 0.22, potassium: 1.92 },
      { name: "苦瓜", protein: 0.007, calories: 0.16, fat: 0.002, phosphorus: 0.24, calcium: 0.4, potassium: 2.08 },
      { name: "花椰菜", protein: 0.03, calories: 0.35, fat: 0.005, phosphorus: 0.55, calcium: 1.5, potassium: 3.3 },
      { name: "茭白", protein: 0.02, calories: 0.35, fat: 0.002, phosphorus: 0.38, calcium: 0.37, potassium: 1.68 },
      { name: "莲藕片", protein: 0.025, calories: 0.45, fat: 0.004, phosphorus: 0.66, calcium: 1.87, potassium: 3.0 },
      { name: "芦笋", protein: 0.03, calories: 0.36, fat: 0.008, phosphorus: 0.58, calcium: 1.38, potassium: 4.0 },
      { name: "豆芽", protein: 0.01, calories: 0.15, fat: 0.002, phosphorus: 0.29, calcium: 0.36, potassium: 1.52 },
      { name: "番茄", protein: 0.009, calories: 0.18, fat: 0.002, phosphorus: 0.24, calcium: 0.1, potassium: 1.92 },
      { name: "青椒", protein: 0.009, calories: 0.2, fat: 0.001, phosphorus: 0.3, calcium: 0.2, potassium: 1.84 },
      { name: "茄子", protein: 0.005, calories: 0.13, fat: 0.001, phosphorus: 0.12, calcium: 0.19, potassium: 0.624 },
      { name: "平菇", protein: 0.003, calories: 0.52, fat: 0.002, phosphorus: 0.11, calcium: 0.06, potassium: 1.1 },
      { name: "金针菇", protein: 0.007, calories: 0.57, fat: 0.003, phosphorus: 0.12, calcium: 0.06, potassium: 0.8 },
      { name: "海鲜菇", protein: 0.004, calories: 0.46, fat: 0.001, phosphorus: 0.11, calcium: 0.08, potassium: 0.9 },
      { name: "香菇", protein: 0.008, calories: 0.6, fat: 0.002, phosphorus: 0.14, calcium: 0.11, potassium: 1.7 },
      { name: "木耳", protein: 0.006, calories: 0.43, fat: 0.001, phosphorus: 0.1, calcium: 0.2, potassium: 1.8 },
      { name: "海带丝", protein: 0.035, calories: 0.6, fat: 0.01, phosphorus: 0.9, calcium: 1.2, potassium: 1.5 },
      { name: "黄豆", protein: 0.016, calories: 0.95, fat: 0.002, phosphorus: 0.35, calcium: 0.25, potassium: 3.2 },
      { name: "绿豆芽（熟）", protein: 0.009, calories: 0.18, fat: 0.002, phosphorus: 0.24, calcium: 0.1, potassium: 1.9 },
      { name: "豌豆", protein: 0.012, calories: 0.13, fat: 0.002, phosphorus: 0.23, calcium: 0.18, potassium: 1.3 },
      { name: "鸡蛋（整蛋煮）", protein: 0.08, calories: 0.75, fat: 0.045, phosphorus: 1.0, calcium: 1.7, potassium: 1.2 },
      { name: "鸭蛋", protein: 0.047, calories: 0.51, fat: 0.0049, phosphorus: 0.49, calcium: 0.3, potassium: 2.55 },
      { name: "鹌鹑蛋（熟）", protein: 0.032, calories: 0.43, fat: 0.013, phosphorus: 0.45, calcium: 0.61, potassium: 1.81 }
    ];

    for (const ing of INITIAL_INGREDIENTS) {
      await dbRun(
        `INSERT INTO ingredients (name, protein, calories, fat, phosphorus, calcium, potassium) VALUES (?,?,?,?,?,?,?)
         ON CONFLICT (name) DO NOTHING`,
        [ing.name, ing.protein, ing.calories, ing.fat, ing.phosphorus, ing.calcium, ing.potassium]
      );
    }
  }

  console.log(`数据库初始化完成 (${dbType === 'pg' ? 'PostgreSQL' : 'SQLite'})`);
}

// ============ 食材 API ============
app.get('/api/ingredients', async (req, res) => {
  try {
    const search = req.query.search || '';
    let rows;
    if (search) {
      rows = await dbAll("SELECT * FROM ingredients WHERE name LIKE ? ORDER BY name", [`%${search}%`]);
    } else {
      rows = await dbAll("SELECT * FROM ingredients ORDER BY name");
    }
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/ingredients', async (req, res) => {
  try {
    const { name, protein, calories, fat, phosphorus, calcium, potassium } = req.body;
    if (!name) return res.status(400).json({ success: false, error: '食材名称不能为空' });
    const result = await dbRun(
      `INSERT INTO ingredients (name, protein, calories, fat, phosphorus, calcium, potassium) VALUES (?,?,?,?,?,?,?)`,
      [name, protein || 0, calories || 0, fat || 0, phosphorus || 0, calcium || 0, potassium || 0]
    );
    res.json({ success: true, id: result.lastID });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      res.status(400).json({ success: false, error: '食材名称已存在' });
    } else {
      res.status(500).json({ success: false, error: e.message });
    }
  }
});

app.put('/api/ingredients/:id', async (req, res) => {
  try {
    const { name, protein, calories, fat, phosphorus, calcium, potassium } = req.body;
    const nowExpr = dbType === 'pg' ? "to_char(now(), 'YYYY-MM-DD HH24:MI:SS')" : "datetime('now','localtime')";
    await dbRun(
      `UPDATE ingredients SET name=?, protein=?, calories=?, fat=?, phosphorus=?, calcium=?, potassium=?, updated_at=${nowExpr} WHERE id=?`,
      [name, protein || 0, calories || 0, fat || 0, phosphorus || 0, calcium || 0, potassium || 0, req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM ingredients WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============ 饮食记录 API ============
app.get('/api/diet/:date', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT * FROM diet_records WHERE record_date=$1 ORDER BY meal_type, id`,
      [req.params.date]
    );
    const MEAL_TYPES = ['早饭', '午饭', '晚饭', '夜宵', '加餐/零食'];
    const grouped = {};
    MEAL_TYPES.forEach(m => { grouped[m] = []; });
    rows.forEach(r => {
      if (!grouped[r.meal_type]) grouped[r.meal_type] = [];
      grouped[r.meal_type].push(r);
    });
    res.json({ success: true, data: grouped, raw: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/diet', async (req, res) => {
  try {
    const { record_date, meal_type, ingredient_id, amount } = req.body;
    if (!record_date || !meal_type || !ingredient_id || !amount) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    const ing = await dbGet('SELECT * FROM ingredients WHERE id=$1', [ingredient_id]);
    if (!ing) return res.status(400).json({ success: false, error: '食材不存在' });
    const a = parseFloat(amount);
    const result = await dbRun(
      `INSERT INTO diet_records (record_date, meal_type, ingredient_id, ingredient_name, amount, protein, calories, fat, phosphorus, calcium, potassium)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [record_date, meal_type, ingredient_id, ing.name, a,
       +(ing.protein * a).toFixed(4), +(ing.calories * a).toFixed(4),
       +(ing.fat * a).toFixed(4), +(ing.phosphorus * a).toFixed(4),
       +(ing.calcium * a).toFixed(4), +(ing.potassium * a).toFixed(4)]
    );
    res.json({ success: true, id: result.lastID });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/diet/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM diet_records WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.put('/api/diet/:id', async (req, res) => {
  try {
    const { amount } = req.body;
    const record = await dbGet(
      `SELECT dr.*, i.protein as ip, i.calories as ic, i.fat as iF, i.phosphorus as iph, i.calcium as ica, i.potassium as ipo
       FROM diet_records dr JOIN ingredients i ON dr.ingredient_id=i.id WHERE dr.id=$1`,
      [req.params.id]
    );
    if (!record) return res.status(404).json({ success: false, error: '记录不存在' });
    const a = parseFloat(amount);
    await dbRun(
      `UPDATE diet_records SET amount=$1, protein=$2, calories=$3, fat=$4, phosphorus=$5, calcium=$6, potassium=$7 WHERE id=$8`,
      [a, +(record.ip*a).toFixed(4), +(record.ic*a).toFixed(4), +(record.iF*a).toFixed(4),
       +(record.iph*a).toFixed(4), +(record.ica*a).toFixed(4), +(record.ipo*a).toFixed(4), req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============ 营养上限 API ============
app.get('/api/limits', async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM nutrition_limits ORDER BY id DESC LIMIT 1');
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.put('/api/limits', async (req, res) => {
  try {
    const { dog_weight, protein_limit, calories_limit, fat_limit, phosphorus_limit, calcium_limit, potassium_limit } = req.body;
    const nowExpr = dbType === 'pg' ? "to_char(now(), 'YYYY-MM-DD HH24:MI:SS')" : "datetime('now','localtime')";
    await dbRun(
      `UPDATE nutrition_limits SET dog_weight=$1, protein_limit=$2, calories_limit=$3, fat_limit=$4, phosphorus_limit=$5, calcium_limit=$6, potassium_limit=$7, updated_at=${nowExpr}
       WHERE id=(SELECT id FROM nutrition_limits ORDER BY id DESC LIMIT 1)`,
      [dog_weight, protein_limit, calories_limit, fat_limit, phosphorus_limit, calcium_limit, potassium_limit]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============ 历史记录 API ============
app.get('/api/history', async (req, res) => {
  try {
    const { month, start_date, end_date } = req.query;
    let rows;
    if (start_date && end_date) {
      rows = await dbAll(
        `SELECT record_date, SUM(protein) as total_protein, SUM(calories) as total_calories,
         SUM(fat) as total_fat, SUM(phosphorus) as total_phosphorus,
         SUM(calcium) as total_calcium, SUM(potassium) as total_potassium,
         COUNT(*) as item_count
         FROM diet_records WHERE record_date BETWEEN $1 AND $2 GROUP BY record_date ORDER BY record_date`,
        [start_date, end_date]
      );
    } else if (month) {
      rows = await dbAll(
        `SELECT record_date, SUM(protein) as total_protein, SUM(calories) as total_calories,
         SUM(fat) as total_fat, SUM(phosphorus) as total_phosphorus,
         SUM(calcium) as total_calcium, SUM(potassium) as total_potassium,
         COUNT(*) as item_count
         FROM diet_records WHERE record_date LIKE $1 GROUP BY record_date ORDER BY record_date`,
        [`${month}%`]
      );
    } else {
      rows = await dbAll(
        `SELECT record_date, SUM(protein) as total_protein, SUM(calories) as total_calories,
         SUM(fat) as total_fat, SUM(phosphorus) as total_phosphorus,
         SUM(calcium) as total_calcium, SUM(potassium) as total_potassium,
         COUNT(*) as item_count
         FROM diet_records GROUP BY record_date ORDER BY record_date DESC LIMIT 30`
      );
    }
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 历史记录 - 获取有记录的日期列表
app.get('/api/history/dates', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT DISTINCT record_date FROM diet_records ORDER BY record_date DESC`
    );
    res.json({ success: true, data: rows.map(r => r.record_date) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 历史记录 - 获取某日的详细记录（含每餐分组）
app.get('/api/history/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const rows = await dbAll(
      `SELECT * FROM diet_records WHERE record_date=$1 ORDER BY meal_type, id`,
      [date]
    );
    const MEAL_TYPES = ['早饭', '午饭', '晚饭', '夜宵', '加餐/零食'];
    const grouped = {};
    MEAL_TYPES.forEach(m => { grouped[m] = []; });
    rows.forEach(r => {
      if (!grouped[r.meal_type]) grouped[r.meal_type] = [];
      grouped[r.meal_type].push(r);
    });
    const totals = rows.reduce((acc, r) => ({
      protein: acc.protein + (r.protein || 0),
      calories: acc.calories + (r.calories || 0),
      fat: acc.fat + (r.fat || 0),
      phosphorus: acc.phosphorus + (r.phosphorus || 0),
      calcium: acc.calcium + (r.calcium || 0),
      potassium: acc.potassium + (r.potassium || 0),
    }), { protein: 0, calories: 0, fat: 0, phosphorus: 0, calcium: 0, potassium: 0 });

    res.json({ success: true, data: { meals: grouped, totals, records: rows } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 前端路由（SPA）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== 启动 =====
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🐾 狗狗营养监控服务已启动: http://localhost:${PORT} [${dbType === 'pg' ? '🐘 PostgreSQL' : '📦 SQLite'}]`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
