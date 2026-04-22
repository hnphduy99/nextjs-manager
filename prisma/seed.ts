import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Permission definitions ───────────────────────────────────────────────────
const PERMISSIONS = [
  // User management
  { action: "create", subject: "user", description: "Create new users" },
  { action: "read", subject: "user", description: "View user profiles" },
  { action: "update", subject: "user", description: "Update user data" },
  { action: "delete", subject: "user", description: "Delete users" },
  // License management
  { action: "create", subject: "license", description: "Generate license keys" },
  { action: "read", subject: "license", description: "View license details" },
  { action: "update", subject: "license", description: "Update license info" },
  { action: "revoke", subject: "license", description: "Revoke licenses" },
  // Transaction management
  { action: "read", subject: "transaction", description: "View transaction history" },
  { action: "confirm", subject: "transaction", description: "Confirm manual payments" },
  { action: "refund", subject: "transaction", description: "Process refunds" },
  // Role management
  { action: "assign", subject: "role", description: "Assign roles to users" },
  { action: "read", subject: "role", description: "View roles and permissions" },
  // Audit logs
  { action: "read", subject: "auditlog", description: "View audit logs" },
  // Device sessions
  { action: "read", subject: "devicesession", description: "View active device sessions" },
  { action: "delete", subject: "devicesession", description: "Force-deactivate device sessions" },
  // Superadmin
  { action: "manage", subject: "all", description: "Full access to everything" }
] as const;

// ─── Role → Permission mapping ────────────────────────────────────────────────
const ROLES = [
  {
    name: "superadmin",
    description: "Full system access",
    permissions: [{ action: "manage", subject: "all" }]
  },
  {
    name: "admin",
    description: "Manage users, licenses and transactions",
    permissions: [
      { action: "create", subject: "user" },
      { action: "read", subject: "user" },
      { action: "update", subject: "user" },
      { action: "create", subject: "license" },
      { action: "read", subject: "license" },
      { action: "update", subject: "license" },
      { action: "revoke", subject: "license" },
      { action: "read", subject: "transaction" },
      { action: "confirm", subject: "transaction" },
      { action: "refund", subject: "transaction" },
      { action: "assign", subject: "role" },
      { action: "read", subject: "role" },
      { action: "read", subject: "auditlog" },
      { action: "read", subject: "devicesession" },
      { action: "delete", subject: "devicesession" }
    ]
  },
  {
    name: "support",
    description: "Read-only access for customer support",
    permissions: [
      { action: "read", subject: "user" },
      { action: "read", subject: "license" },
      { action: "read", subject: "transaction" },
      { action: "read", subject: "auditlog" },
      { action: "read", subject: "devicesession" }
    ]
  },
  {
    name: "user",
    description: "Regular app user, no dashboard access",
    permissions: []
  }
] as const;

// ─── License plans ────────────────────────────────────────────────────────────
const LICENSE_PLANS = [
  { name: "Trial", description: "7-day free trial", price: 0, currency: "VND", durationDays: 7 },
  { name: "Monthly", description: "30-day subscription", price: 99000, currency: "VND", durationDays: 30 },
  {
    name: "Yearly",
    description: "365-day subscription (best value)",
    price: 799000,
    currency: "VND",
    durationDays: 365
  },
  {
    name: "Lifetime",
    description: "One-time purchase, use forever",
    price: 1990000,
    currency: "VND",
    durationDays: null
  }
];

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── 1. Upsert permissions ──────────────────────────────────────────────────
  console.log("📋 Creating permissions...");
  const permissionMap = new Map<string, string>(); // "action:subject" → id

  for (const perm of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { action_subject: { action: perm.action, subject: perm.subject } },
      update: { description: perm.description },
      create: perm
    });
    permissionMap.set(`${perm.action}:${perm.subject}`, record.id);
  }
  console.log(`   ✅ ${PERMISSIONS.length} permissions ready`);

  // ── 2. Upsert roles + assign permissions ───────────────────────────────────
  console.log("🔑 Creating roles...");
  const roleMap = new Map<string, string>(); // name → id

  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: { name: roleDef.name, description: roleDef.description }
    });
    roleMap.set(roleDef.name, role.id);

    // Sync permissions for this role
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const perm of roleDef.permissions) {
      const permId = permissionMap.get(`${perm.action}:${perm.subject}`);
      if (!permId) continue;
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permId }
      });
    }
  }
  console.log(`   ✅ ${ROLES.length} roles ready`);

  // ── 3. License plans ───────────────────────────────────────────────────────
  console.log("💳 Creating license plans...");
  for (const plan of LICENSE_PLANS) {
    await prisma.licensePlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan
    });
  }
  console.log(`   ✅ ${LICENSE_PLANS.length} license plans ready`);

  // ── 4. Superadmin user (dev only) ─────────────────────────────────────────
  if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    console.log("👤 Creating superadmin user...");
    const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12);

    const admin = await prisma.user.upsert({
      where: { email: process.env.SEED_ADMIN_EMAIL },
      update: {},
      create: {
        email: process.env.SEED_ADMIN_EMAIL,
        name: "Super Admin",
        passwordHash,
        emailVerified: new Date()
      }
    });

    // Assign superadmin role
    const superadminRoleId = roleMap.get("superadmin")!;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: superadminRoleId } },
      update: {},
      create: { userId: admin.id, roleId: superadminRoleId }
    });

    console.log(`   ✅ Superadmin created: ${admin.email}`);
  } else {
    console.log("   ⏭️  Skipping superadmin (set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD in .env)");
  }

  console.log("\n✨ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
