#!/usr/bin/env node

'use strict';

// Load env FIRST
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

// ---------------------------------------------------------------------------
// Validate ENV
// ---------------------------------------------------------------------------
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing in .env');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Prisma Adapter Setup
// ---------------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');
  console.log('='.repeat(50));

  // 1. Create Roles
  console.log('\n📝 Creating roles...');
  await createRoles();

  // 2. Create Permissions (based on menuConfig)
  console.log('\n🔐 Creating permissions...');
  await createPermissions();

  // 3. Assign Permissions to Roles
  console.log('\n🔗 Assigning permissions to roles...');
  await assignPermissionsToRoles();

  // 4. Create Users with Roles
  console.log('\n👥 Creating users...');
  await createUsers();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed completed successfully!');
  console.log('='.repeat(50));

  // Display login information
  await displayLoginInfo();
}

// ---------------------------------------------------------------------------
// Create Roles
// ---------------------------------------------------------------------------
async function createRoles() {
  const roles = [
    {
      name: 'SYSTEM_ADMIN',
      description: 'Full system access with all permissions',
    },
    {
      name: 'ADMIN',
      description: 'Administrator with extensive permissions',
    },
    {
      name: 'COORDINATOR',
      description: 'Department coordinator - Manage classrooms and own data',
    },
    {
      name: 'COUNSELOR',
      description: 'Student counselor - Manage pre-admission and admission',
    },
    {
      name: 'TU_ADMIN',
      description: 'TU administrator - Manage internal and external exams',
    },
    {
      name: 'FACILITY_ADMIN',
      description: 'Facility manager - Manage digital marketing and inventory',
    },
    {
      name: 'IT_ADMIN',
      description: 'IT department administrator - Manage IT resources',
    },
    {
      name: 'LIBRARIAN',
      description: 'Library manager - Manage library resources',
    },
    {
      name: 'GENERAL_STAFF',
      description: 'General staff member - Selected limited access',
    },
    {
      name: 'STUDENT',
      description: 'Student user - Limited access to own data',
    },
    {
      name: 'FACULTY',
      description: 'Teaching faculty - Limited access',
    },
    {
      name: 'PARENT',
      description: 'Student parent/guardian - View specific student data',
    },
  ];

  for (const roleData of roles) {
    try {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: { description: roleData.description },
        create: {
          name: roleData.name,
          description: roleData.description,
        },
      });
      console.log(`  ✅ Created/Updated role: ${role.name}`);
    } catch (error) {
      console.error(
        `  ❌ Failed to create role ${roleData.name}:`,
        error.message
      );
    }
  }

  const roleCount = await prisma.role.count();
  console.log(`\n  📊 Total roles in database: ${roleCount}`);
}

// ---------------------------------------------------------------------------
// Create Permissions (Based on Menu Config)
// ---------------------------------------------------------------------------
async function createPermissions() {
  const permissions = [
    // Dashboard
    {
      name: 'dashboard:read',
      resource: 'dashboard',
      action: 'read',
      description: 'View dashboard',
      category: 'Dashboard',
    },

    // User Management
    {
      name: 'users:read',
      resource: 'users',
      action: 'read',
      description: 'View users',
      category: 'User Management',
    },
    {
      name: 'users:create',
      resource: 'users',
      action: 'create',
      description: 'Create users',
      category: 'User Management',
    },
    {
      name: 'users:update',
      resource: 'users',
      action: 'update',
      description: 'Update users',
      category: 'User Management',
    },
    {
      name: 'users:delete',
      resource: 'users',
      action: 'delete',
      description: 'Delete users',
      category: 'User Management',
    },

    // Role Management
    {
      name: 'roles:read',
      resource: 'roles',
      action: 'read',
      description: 'View roles',
      category: 'Role Management',
    },
    {
      name: 'roles:create',
      resource: 'roles',
      action: 'create',
      description: 'Create roles',
      category: 'Role Management',
    },
    {
      name: 'roles:update',
      resource: 'roles',
      action: 'update',
      description: 'Update roles',
      category: 'Role Management',
    },
    {
      name: 'roles:delete',
      resource: 'roles',
      action: 'delete',
      description: 'Delete roles',
      category: 'Role Management',
    },

    // Permission Management
    {
      name: 'permissions:read',
      resource: 'permissions',
      action: 'read',
      description: 'View permissions',
      category: 'Permission Management',
    },
    {
      name: 'permissions:create',
      resource: 'permissions',
      action: 'create',
      description: 'Create permissions',
      category: 'Permission Management',
    },
    {
      name: 'permissions:update',
      resource: 'permissions',
      action: 'update',
      description: 'Update permissions',
      category: 'Permission Management',
    },
    {
      name: 'permissions:delete',
      resource: 'permissions',
      action: 'delete',
      description: 'Delete permissions',
      category: 'Permission Management',
    },

    // Classroom Management
    {
      name: 'classroom:read',
      resource: 'classroom',
      action: 'read',
      description: 'View classrooms',
      category: 'Classroom Management',
    },
    {
      name: 'classroom:create',
      resource: 'classroom',
      action: 'create',
      description: 'Create classrooms',
      category: 'Classroom Management',
    },
    {
      name: 'classroom:update',
      resource: 'classroom',
      action: 'update',
      description: 'Update classrooms',
      category: 'Classroom Management',
    },
    {
      name: 'classroom:delete',
      resource: 'classroom',
      action: 'delete',
      description: 'Delete classrooms',
      category: 'Classroom Management',
    },
    {
      name: 'classroom:schedule',
      resource: 'classroom',
      action: 'manage',
      description: 'Manage class schedules',
      category: 'Classroom Management',
    },

    // Admission Management
    {
      name: 'admission:read',
      resource: 'admission',
      action: 'read',
      description: 'View admissions',
      category: 'Admission Management',
    },
    {
      name: 'admission:create',
      resource: 'admission',
      action: 'create',
      description: 'Create admissions',
      category: 'Admission Management',
    },
    {
      name: 'admission:update',
      resource: 'admission',
      action: 'update',
      description: 'Update admissions',
      category: 'Admission Management',
    },
    {
      name: 'admission:delete',
      resource: 'admission',
      action: 'delete',
      description: 'Delete admissions',
      category: 'Admission Management',
    },
    {
      name: 'admission:status',
      resource: 'admission',
      action: 'manage',
      description: 'Manage application status',
      category: 'Admission Management',
    },

    // Exam Management
    {
      name: 'exam:read',
      resource: 'exam',
      action: 'read',
      description: 'View exams',
      category: 'Exam Management',
    },
    {
      name: 'exam:create',
      resource: 'exam',
      action: 'create',
      description: 'Create exams',
      category: 'Exam Management',
    },
    {
      name: 'exam:update',
      resource: 'exam',
      action: 'update',
      description: 'Update exams',
      category: 'Exam Management',
    },
    {
      name: 'exam:delete',
      resource: 'exam',
      action: 'delete',
      description: 'Delete exams',
      category: 'Exam Management',
    },
    {
      name: 'exam:results',
      resource: 'exam',
      action: 'manage',
      description: 'Manage exam results',
      category: 'Exam Management',
    },

    // Library Management
    {
      name: 'library:read',
      resource: 'library',
      action: 'read',
      description: 'View library items',
      category: 'Library Management',
    },
    {
      name: 'library:create',
      resource: 'library',
      action: 'create',
      description: 'Add library items',
      category: 'Library Management',
    },
    {
      name: 'library:update',
      resource: 'library',
      action: 'update',
      description: 'Update library items',
      category: 'Library Management',
    },
    {
      name: 'library:delete',
      resource: 'library',
      action: 'delete',
      description: 'Delete library items',
      category: 'Library Management',
    },
    {
      name: 'library:borrow',
      resource: 'library',
      action: 'manage',
      description: 'Manage book borrowings',
      category: 'Library Management',
    },

    // Inventory Management
    {
      name: 'inventory:read',
      resource: 'inventory',
      action: 'read',
      description: 'View inventory',
      category: 'Inventory Management',
    },
    {
      name: 'inventory:create',
      resource: 'inventory',
      action: 'create',
      description: 'Create inventory items',
      category: 'Inventory Management',
    },
    {
      name: 'inventory:update',
      resource: 'inventory',
      action: 'update',
      description: 'Update inventory',
      category: 'Inventory Management',
    },
    {
      name: 'inventory:delete',
      resource: 'inventory',
      action: 'delete',
      description: 'Delete inventory items',
      category: 'Inventory Management',
    },
    {
      name: 'inventory:reports',
      resource: 'inventory',
      action: 'read',
      description: 'View stock reports',
      category: 'Inventory Management',
    },

    // Marketing Management
    {
      name: 'marketing:read',
      resource: 'marketing',
      action: 'read',
      description: 'View marketing content',
      category: 'Marketing',
    },
    {
      name: 'marketing:create',
      resource: 'marketing',
      action: 'create',
      description: 'Create marketing campaigns',
      category: 'Marketing',
    },
    {
      name: 'marketing:update',
      resource: 'marketing',
      action: 'update',
      description: 'Update marketing content',
      category: 'Marketing',
    },
    {
      name: 'marketing:delete',
      resource: 'marketing',
      action: 'delete',
      description: 'Delete marketing content',
      category: 'Marketing',
    },
    {
      name: 'marketing:analytics',
      resource: 'marketing',
      action: 'read',
      description: 'View marketing analytics',
      category: 'Marketing',
    },

    // IT Resources
    {
      name: 'it_resource:read',
      resource: 'it_resource',
      action: 'read',
      description: 'View IT resources',
      category: 'IT Resources',
    },
    {
      name: 'it_resource:create',
      resource: 'it_resource',
      action: 'create',
      description: 'Create IT resources',
      category: 'IT Resources',
    },
    {
      name: 'it_resource:update',
      resource: 'it_resource',
      action: 'update',
      description: 'Update IT resources',
      category: 'IT Resources',
    },
    {
      name: 'it_resource:delete',
      resource: 'it_resource',
      action: 'delete',
      description: 'Delete IT resources',
      category: 'IT Resources',
    },

    // Reports
    {
      name: 'report:read',
      resource: 'report',
      action: 'read',
      description: 'View reports',
      category: 'Reports',
    },
    {
      name: 'report:create',
      resource: 'report',
      action: 'create',
      description: 'Create reports',
      category: 'Reports',
    },

    // Settings
    {
      name: 'settings:read',
      resource: 'settings',
      action: 'read',
      description: 'View settings',
      category: 'Settings',
    },
    {
      name: 'settings:update',
      resource: 'settings',
      action: 'update',
      description: 'Update settings',
      category: 'Settings',
    },
    {
      name: 'system:manage',
      resource: 'system',
      action: 'manage',
      description: 'Manage system settings',
      category: 'Settings',
    },

    // Profile/Own Data
    {
      name: 'own_data:read',
      resource: 'own_data',
      action: 'read',
      description: 'View own profile data',
      category: 'Profile',
    },
    {
      name: 'own_data:update',
      resource: 'own_data',
      action: 'update',
      description: 'Update own profile data',
      category: 'Profile',
    },

    // Student Data (for parents)
    {
      name: 'student_data:read',
      resource: 'student_data',
      action: 'read',
      description: 'View student data',
      category: 'Student Data',
    },
  ];

  for (const permData of permissions) {
    try {
      await prisma.permission.upsert({
        where: { name: permData.name },
        update: {
          description: permData.description,
          resource: permData.resource,
          action: permData.action,
          category: permData.category,
        },
        create: {
          name: permData.name,
          description: permData.description,
          resource: permData.resource,
          action: permData.action,
          category: permData.category,
        },
      });
    } catch (error) {
      if (!error.message.includes('Unique constraint')) {
        console.error(
          `  ❌ Failed to create permission ${permData.name}:`,
          error.message
        );
      }
    }
  }

  const permissionCount = await prisma.permission.count();
  console.log(`  ✅ Created/Updated ${permissionCount} permissions`);
}

// ---------------------------------------------------------------------------
// Assign Permissions to Roles
// ---------------------------------------------------------------------------
async function assignPermissionsToRoles() {
  // Get all roles and permissions
  const roles = await prisma.role.findMany();
  const permissions = await prisma.permission.findMany();

  // Create permission maps
  const permissionMap = {};
  permissions.forEach((p) => {
    permissionMap[p.name] = p;
  });

  // Define role permissions based on menuConfig
  const rolePermissions = {
    // Full access roles - can access everything
    SYSTEM_ADMIN: [
      'dashboard:read',
      'users:read',
      'users:create',
      'users:update',
      'users:delete',
      'roles:read',
      'roles:create',
      'roles:update',
      'roles:delete',
      'permissions:read',
      'permissions:create',
      'permissions:update',
      'permissions:delete',
      'classroom:read',
      'classroom:create',
      'classroom:update',
      'classroom:delete',
      'classroom:schedule',
      'admission:read',
      'admission:create',
      'admission:update',
      'admission:delete',
      'admission:status',
      'exam:read',
      'exam:create',
      'exam:update',
      'exam:delete',
      'exam:results',
      'library:read',
      'library:create',
      'library:update',
      'library:delete',
      'library:borrow',
      'inventory:read',
      'inventory:create',
      'inventory:update',
      'inventory:delete',
      'inventory:reports',
      'marketing:read',
      'marketing:create',
      'marketing:update',
      'marketing:delete',
      'marketing:analytics',
      'it_resource:read',
      'it_resource:create',
      'it_resource:update',
      'it_resource:delete',
      'report:read',
      'report:create',
      'settings:read',
      'settings:update',
      'system:manage',
      'own_data:read',
      'own_data:update',
      'student_data:read',
    ],

    ADMIN: [
      'dashboard:read',
      'users:read',
      'users:create',
      'users:update',
      'roles:read',
      'permissions:read',
      'classroom:read',
      'classroom:create',
      'classroom:update',
      'admission:read',
      'admission:update',
      'exam:read',
      'library:read',
      'inventory:read',
      'report:read',
      'settings:read',
      'settings:update',
      'own_data:read',
      'own_data:update',
    ],

    // Coordinator - Classroom management focus
    COORDINATOR: [
      'dashboard:read',
      'classroom:read',
      'classroom:create',
      'classroom:update',
      'classroom:delete',
      'classroom:schedule',
      'report:read',
      'own_data:read',
      'own_data:update',
    ],

    // Counselor - Admission management focus
    COUNSELOR: [
      'dashboard:read',
      'admission:read',
      'admission:create',
      'admission:update',
      'admission:status',
      'report:read',
      'own_data:read',
      'own_data:update',
    ],

    // TU Admin - Exam management focus
    TU_ADMIN: [
      'dashboard:read',
      'exam:read',
      'exam:create',
      'exam:update',
      'exam:delete',
      'exam:results',
      'report:read',
      'report:create',
      'own_data:read',
      'own_data:update',
    ],

    // Facility Admin - Marketing and Inventory focus
    FACILITY_ADMIN: [
      'dashboard:read',
      'inventory:read',
      'inventory:create',
      'inventory:update',
      'inventory:delete',
      'inventory:reports',
      'marketing:read',
      'marketing:create',
      'marketing:update',
      'marketing:delete',
      'marketing:analytics',
      'report:read',
      'own_data:read',
      'own_data:update',
    ],

    // IT Admin - IT Resources focus
    IT_ADMIN: [
      'dashboard:read',
      'it_resource:read',
      'it_resource:create',
      'it_resource:update',
      'it_resource:delete',
      'users:read',
      'users:update',
      'report:read',
      'own_data:read',
      'own_data:update',
    ],

    // Librarian - Library management focus
    LIBRARIAN: [
      'dashboard:read',
      'library:read',
      'library:create',
      'library:update',
      'library:delete',
      'library:borrow',
      'report:read',
      'own_data:read',
      'own_data:update',
    ],

    // General Staff - Basic access
    GENERAL_STAFF: ['dashboard:read', 'own_data:read', 'own_data:update'],

    // Student - Own data only
    STUDENT: ['dashboard:read', 'own_data:read', 'own_data:update'],

    // Faculty - Classroom and own data
    FACULTY: [
      'dashboard:read',
      'classroom:read',
      'own_data:read',
      'own_data:update',
    ],

    // Parent - Student data access
    PARENT: [
      'dashboard:read',
      'student_data:read',
      'own_data:read',
      'own_data:update',
    ],
  };

  // Assign permissions to roles
  for (const role of roles) {
    const permissionsToAssign = rolePermissions[role.name] || [
      'dashboard:read',
      'own_data:read',
    ];

    let assignedCount = 0;
    for (const permissionName of permissionsToAssign) {
      const permission = permissionMap[permissionName];
      if (permission) {
        try {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
          assignedCount++;
        } catch (error) {
          // Skip duplicates
        }
      } else {
        console.warn(
          `  ⚠️ Permission "${permissionName}" not found for role ${role.name}`
        );
      }
    }
    console.log(`  ✅ Assigned ${assignedCount} permissions to ${role.name}`);
  }
}

// ---------------------------------------------------------------------------
// Create Users with Roles
// ---------------------------------------------------------------------------
async function createUsers() {
  const roles = await prisma.role.findMany();
  const roleMap = {};
  roles.forEach((role) => {
    roleMap[role.name] = role;
  });

  const users = [
    {
      name: 'System Administrator',
      email: 'admin@example.com',
      password: 'Admin@123',
      phone: '+1 (555) 000-0001',
      address: '123 Admin Tower, New York, NY 10001',
      profilePicture:
        'https://ui-avatars.com/api/?name=System+Admin&background=6366f1&color=fff',
      status: 'active',
      role: 'SYSTEM_ADMIN',
    },
    {
      name: 'John Coordinator',
      email: 'coordinator@example.com',
      password: 'Coordinator@123',
      phone: '+1 (555) 000-0002',
      address: '200 Academic Hall, Boston, MA 02101',
      profilePicture:
        'https://ui-avatars.com/api/?name=John+Coordinator&background=10b981&color=fff',
      status: 'active',
      role: 'COORDINATOR',
    },
    {
      name: 'Sarah Counselor',
      email: 'counselor@example.com',
      password: 'Counselor@123',
      phone: '+1 (555) 000-0003',
      address: '300 Student Center, Chicago, IL 60601',
      profilePicture:
        'https://ui-avatars.com/api/?name=Sarah+Counselor&background=3b82f6&color=fff',
      status: 'active',
      role: 'COUNSELOR',
    },
    {
      name: 'Robert TU Admin',
      email: 'tuadmin@example.com',
      password: 'TUAdmin@123',
      phone: '+1 (555) 000-0004',
      address: '400 TU Building, Seattle, WA 98101',
      profilePicture:
        'https://ui-avatars.com/api/?name=Robert+TU&background=ef4444&color=fff',
      status: 'active',
      role: 'TU_ADMIN',
    },
    {
      name: 'Jennifer Facility Admin',
      email: 'facilityadmin@example.com',
      password: 'Facility@123',
      phone: '+1 (555) 000-0005',
      address: '500 Facility Center, Denver, CO 80201',
      profilePicture:
        'https://ui-avatars.com/api/?name=Jennifer+Facility&background=f59e0b&color=fff',
      status: 'active',
      role: 'FACILITY_ADMIN',
    },
    {
      name: 'David IT Admin',
      email: 'itadmin@example.com',
      password: 'ITAdmin@123',
      phone: '+1 (555) 000-0006',
      address: '600 IT Building, Portland, OR 97201',
      profilePicture:
        'https://ui-avatars.com/api/?name=David+IT&background=8b5cf6&color=fff',
      status: 'active',
      role: 'IT_ADMIN',
    },
    {
      name: 'Lisa Librarian',
      email: 'librarian@example.com',
      password: 'Librarian@123',
      phone: '+1 (555) 000-0007',
      address: '700 Library, Miami, FL 33101',
      profilePicture:
        'https://ui-avatars.com/api/?name=Lisa+Librarian&background=ec4899&color=fff',
      status: 'active',
      role: 'LIBRARIAN',
    },
    {
      name: 'James Faculty',
      email: 'faculty@example.com',
      password: 'Faculty@123',
      phone: '+1 (555) 000-0008',
      address: '800 Faculty Office, Atlanta, GA 30301',
      profilePicture:
        'https://ui-avatars.com/api/?name=James+Faculty&background=14b8a6&color=fff',
      status: 'active',
      role: 'FACULTY',
    },
    {
      name: 'Mary Student',
      email: 'student@example.com',
      password: 'Student@123',
      phone: '+1 (555) 000-0009',
      address: '900 Dormitory, Las Vegas, NV 89101',
      profilePicture:
        'https://ui-avatars.com/api/?name=Mary+Student&background=6b7280&color=fff',
      status: 'active',
      role: 'STUDENT',
    },
    {
      name: 'David Parent',
      email: 'parent@example.com',
      password: 'Parent@123',
      phone: '+1 (555) 000-0010',
      address: '1000 Family Home, Phoenix, AZ 85001',
      profilePicture:
        'https://ui-avatars.com/api/?name=David+Parent&background=6366f1&color=fff',
      status: 'active',
      role: 'PARENT',
    },
    {
      name: 'Staff User',
      email: 'staff@example.com',
      password: 'Staff@123',
      phone: '+1 (555) 000-0011',
      address: '1100 Staff Office, San Francisco, CA 94101',
      profilePicture:
        'https://ui-avatars.com/api/?name=Staff+User&background=8b5cf6&color=fff',
      status: 'active',
      role: 'GENERAL_STAFF',
    },
  ];

  for (const userData of users) {
    try {
      const role = roleMap[userData.role];
      if (!role) {
        console.error(
          `  ❌ Role ${userData.role} not found for user ${userData.email}`
        );
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create or update user
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          phone: userData.phone,
          address: userData.address,
          profilePicture: userData.profilePicture,
          status: userData.status,
          roleId: role.id,
        },
        create: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          phone: userData.phone,
          address: userData.address,
          profilePicture: userData.profilePicture,
          status: userData.status,
          roleId: role.id,
        },
      });

      console.log(
        `  ✅ Created/Updated user: ${userData.name} (${userData.email}) - Role: ${userData.role} - Status: ${userData.status}`
      );
    } catch (error) {
      console.error(
        `  ❌ Failed to create user ${userData.email}:`,
        error.message
      );
    }
  }

  // Display user count
  const userCount = await prisma.user.count();
  console.log(`\n  📊 Total users in database: ${userCount}`);
}

// ---------------------------------------------------------------------------
// Display Login Information
// ---------------------------------------------------------------------------
async function displayLoginInfo() {
  const users = await prisma.user.findMany({
    include: {
      role: true,
    },
    where: {
      status: 'active',
    },
  });

  console.log('\n📋 Login Information:');
  console.log('-'.repeat(60));

  const roleGroups = {};
  for (const user of users) {
    if (user.role && user.role.name) {
      if (!roleGroups[user.role.name]) {
        roleGroups[user.role.name] = [];
      }
      roleGroups[user.role.name].push({
        email: user.email,
        name: user.name,
      });
    }
  }

  for (const [role, usersList] of Object.entries(roleGroups)) {
    console.log(`\n${role}:`);
    usersList.forEach((user) => {
      console.log(`  → ${user.email} (${user.name})`);
    });
  }

  console.log('\n' + '-'.repeat(60));
  console.log('📝 Default Passwords:');
  console.log('  • System Admin: Admin@123');
  console.log('  • Coordinator: Coordinator@123');
  console.log('  • Counselor: Counselor@123');
  console.log('  • TU Admin: TUAdmin@123');
  console.log('  • Facility Admin: Facility@123');
  console.log('  • IT Admin: ITAdmin@123');
  console.log('  • Librarian: Librarian@123');
  console.log('  • Faculty: Faculty@123');
  console.log('  • Student: Student@123');
  console.log('  • Parent: Parent@123');
  console.log('  • Staff: Staff@123');
  console.log('-'.repeat(60));

  console.log('\n🔐 Permission Format: resource:action');
  console.log('Example: users:read, roles:create, classroom:update');
  console.log(
    '\n💡 Tip: Use the "Manage Permissions" button in the Roles page to assign permissions to roles.'
  );
}

// ---------------------------------------------------------------------------
// Run seed
// ---------------------------------------------------------------------------
main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
