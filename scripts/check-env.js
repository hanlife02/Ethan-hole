#!/usr/bin/env node

const requiredEnvVars = [
  "PORT",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "ACCESS_KEY",
  "CASDOOR_ENDPOINT",
  "CASDOOR_CLIENT_ID",
  "CASDOOR_CLIENT_SECRET",
  "CASDOOR_APP_NAME",
  "CASDOOR_ORGANIZATION_NAME",
];

console.log("🔍 Checking environment variables...\n");

const missingVars = [];

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  if (!value) {
    missingVars.push(varName);
    console.log(`❌ ${varName}: Missing`);
  } else {
    // 对于敏感信息，只显示前几个字符
    const displayValue = [
      "DB_PASSWORD",
      "ACCESS_KEY",
      "CASDOOR_CLIENT_SECRET",
    ].includes(varName)
      ? value.substring(0, 3) + "***"
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

console.log("\n" + "=".repeat(50));

if (missingVars.length > 0) {
  console.log(
    `❌ Missing ${missingVars.length} required environment variables:`
  );
  missingVars.forEach((varName) => {
    console.log(`   - ${varName}`);
  });
  console.log("\nPlease check your .env.local file.");
  process.exit(1);
} else {
  console.log("✅ All environment variables are configured!");

  // 测试数据库连接
  console.log("\n🔗 Testing database connection...");

  const { Pool } = require("pg");
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  pool
    .query("SELECT 1")
    .then(() => {
      console.log("✅ Database connection successful!");
      pool.end();
    })
    .catch((err) => {
      console.log("❌ Database connection failed:", err.message);
      pool.end();
      process.exit(1);
    });
}
