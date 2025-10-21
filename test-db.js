const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 手动读取.env.local文件
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#') && !key.startsWith(' #')) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.log('⚠️  无法读取.env.local文件:', error.message);
  }
}

// 加载环境变量
loadEnvFile();

async function testDbConnection() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000, // 5秒连接超时
  });

  try {
    console.log('🔍 正在尝试连接数据库...');
    console.log(`📍 主机: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`📊 数据库: ${process.env.DB_NAME}`);
    console.log(`👤 用户: ${process.env.DB_USER}`);

    const client = await pool.connect();
    const result = await client.query('SELECT version();');
    client.release();

    console.log('✅ 数据库连接成功!');
    console.log(`📦 PostgreSQL版本: ${result.rows[0].version}`);

    // 测试一下是否有必要的表
    const client2 = await pool.connect();
    try {
      const tables = await client2.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `);
      console.log(`📋 发现 ${tables.rows.length} 个表:`, tables.rows.map(row => row.tablename));
      client2.release();
    } catch (err) {
      console.log('⚠️  无法查询表列表:', err.message);
      client2.release();
    }

    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败!');
    console.error('🔍 错误详情:', error.message);

    if (error.code) {
      console.error('📝 错误代码:', error.code);
    }

    // 根据错误类型给出具体的诊断建议
    if (error.code === 'ENOTFOUND') {
      console.error('💡 建议: 检查DB_HOST是否正确，或网络连接是否正常');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 建议: PostgreSQL服务可能未启动，或端口配置错误');
    } else if (error.message.includes('password authentication failed')) {
      console.error('💡 建议: 检查DB_USER和DB_PASSWORD是否正确');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('💡 建议: 数据库不存在，请检查DB_NAME或创建数据库');
    }

    return false;
  } finally {
    await pool.end();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testDbConnection()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ 执行测试时出错:', err);
      process.exit(1);
    });
}

module.exports = { testDbConnection };