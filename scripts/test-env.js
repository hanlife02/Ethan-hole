#!/usr/bin/env node

// 测试环境变量读取，特别是包含空格的值

console.log("🧪 测试环境变量读取...\n");

const testVars = [
  "CASDOOR_ORGANIZATION_NAME",
  "CASDOOR_APP_NAME",
  "CASDOOR_CLIENT_ID",
  "CASDOOR_ENDPOINT",
];

testVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: "${value}"`);

    // 特别检查组织名称是否包含空格
    if (varName === "CASDOOR_ORGANIZATION_NAME" && value.includes(" ")) {
      console.log(`   📝 包含空格的组织名称读取正确`);
    }
  } else {
    console.log(`❌ ${varName}: 未设置`);
  }
});

console.log(
  "\n💡 提示：如果组织名称包含空格，请确保在 .env.local 中使用双引号："
);
console.log('   CASDOOR_ORGANIZATION_NAME="Ethan Club"');
