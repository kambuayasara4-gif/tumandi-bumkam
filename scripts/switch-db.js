// scripts/switch-db.js
// Mengubah provider database di prisma/schema.prisma antara sqlite dan postgresql

const fs = require('fs');
const path = require('path');

const target = (process.argv[2] || '').toLowerCase();
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

if (!['sqlite', 'postgresql', 'postgres'].includes(target)) {
  console.log('Penggunaan: node scripts/switch-db.js [sqlite|postgresql]');
  process.exit(1);
}

let content = fs.readFileSync(schemaPath, 'utf-8');

if (target === 'sqlite') {
  content = content.replace(
    /datasource\s+db\s+\{[\s\S]*?\}/,
    `datasource db {\n  provider = "sqlite"\n  url      = "file:./dev.db"\n}`
  );
  console.log('✅ Skema diubah ke mode: SQLite (Lokal)');
} else {
  content = content.replace(
    /datasource\s+db\s+\{[\s\S]*?\}/,
    `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}`
  );
  console.log('✅ Skema diubah ke mode: PostgreSQL (Cloud - Neon / Supabase / Vercel)');
}

fs.writeFileSync(schemaPath, content, 'utf-8');
