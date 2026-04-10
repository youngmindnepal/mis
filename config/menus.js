// config/menus.js
export const menuConfig = [
  {
    id: 1,
    name: 'Dashboard',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    permission: { resource: 'dashboard', action: 'read' },
    children: [],
  },
  {
    id: 2,
    name: 'User Management',
    path: '/dashboard/users',
    icon: 'Users',
    permission: { resource: 'users', action: 'read' },
    children: [],
  },
  {
    id: 22,
    name: 'Roles',
    path: '/dashboard/roles',
    icon: 'Shield',
    description: 'Manage user roles and permissions',
    permission: { resource: 'roles', action: 'read' },
  },
  {
    id: 23,
    name: 'Permissions',
    path: '/dashboard/permissions',
    icon: 'Key',
    description: 'Manage system permissions',
    permission: { resource: 'permissions', action: 'read' },
  },
  {
    id: 32,
    name: 'Depatments',
    path: '/dashboard/departments',
    icon: 'Folder',
    description: 'Manage Departments',
    permission: { resource: 'departments', action: 'read' },
  },
  {
    id: 33,
    name: 'Batches',
    path: '/dashboard/batches',
    icon: 'Batch',
    description: 'Manage Batches',
    permission: { resource: 'batches', action: 'read' },
  },
  {
    id: 34,
    name: 'Students',
    path: '/dashboard/students',
    icon: 'Student',
    description: 'Manage Students',
    permission: { resource: 'students', action: 'read' },
  },
  {
    id: 35,
    name: 'Faculty',
    path: '/dashboard/faculty',
    icon: 'Student',
    description: 'Manage Faculty',
    permission: { resource: 'faculty', action: 'read' },
  },
  {
    id: 36,
    name: 'Courses',
    path: '/dashboard/courses',
    icon: 'Student',
    description: 'Manage Courses',
    permission: { resource: 'courses', action: 'read' },
  },
  {
    id: 3,
    name: 'Classroom Management',
    path: '/dashboard/classroom',
    icon: 'School',
    permission: { resource: 'classroom', action: 'read' },
  },
  {
    id: 4,
    name: 'Admission Management',
    path: '#',
    icon: 'UserPlus',
    permission: { resource: 'admission', action: 'read' },
    children: [
      {
        id: 41,
        name: 'All Applications',
        path: '/dashboard/admissions',
        icon: 'FileText',
        description: 'View all admission applications',
        permission: { resource: 'admission', action: 'read' },
      },
      {
        id: 42,
        name: 'New Application',
        path: '/dashboard/admissions/new',
        icon: 'PlusCircle',
        description: 'Create new admission application',
        permission: { resource: 'admission', action: 'create' },
      },
      {
        id: 43,
        name: 'Application Status',
        path: '/dashboard/admissions/status',
        icon: 'ClipboardList',
        description: 'Update application status',
        permission: { resource: 'admission', action: 'manage' },
      },
    ],
  },
  {
    id: 5,
    name: 'Exam Management',
    path: '#',
    icon: 'ClipboardCheck',
    permission: { resource: 'exam', action: 'read' },
    children: [
      {
        id: 51,
        name: 'All Exams',
        path: '/dashboard/exams',
        icon: 'FileSpreadsheet',
        description: 'View all exams',
        permission: { resource: 'exam', action: 'read' },
      },
      {
        id: 52,
        name: 'Create Exam',
        path: '/dashboard/exams/create',
        icon: 'PlusCircle',
        description: 'Create new exam',
        permission: { resource: 'exam', action: 'create' },
      },
      {
        id: 53,
        name: 'Exam Results',
        path: '/dashboard/exams/results',
        icon: 'Award',
        description: 'Manage exam results',
        permission: { resource: 'exam', action: 'manage' },
      },
    ],
  },
  {
    id: 6,
    name: 'Library Management',
    path: '#',
    icon: 'Library',
    permission: { resource: 'library', action: 'read' },
    children: [
      {
        id: 61,
        name: 'Books Catalog',
        path: '/dashboard/library/books',
        icon: 'BookOpen',
        description: 'View all books',
        permission: { resource: 'library', action: 'read' },
      },
      {
        id: 62,
        name: 'Add Book',
        path: '/dashboard/library/add',
        icon: 'PlusCircle',
        description: 'Add new book',
        permission: { resource: 'library', action: 'create' },
      },
      {
        id: 63,
        name: 'Borrowing Records',
        path: '/dashboard/library/borrowings',
        icon: 'BookMarked',
        description: 'Manage book borrowings',
        permission: { resource: 'library', action: 'manage' },
      },
    ],
  },
  {
    id: 7,
    name: 'Inventory Management',
    path: '#',
    icon: 'Package',
    permission: { resource: 'inventory', action: 'read' },
    children: [
      {
        id: 71,
        name: 'All Items',
        path: '/dashboard/inventory',
        icon: 'Boxes',
        description: 'View inventory items',
        permission: { resource: 'inventory', action: 'read' },
      },
      {
        id: 72,
        name: 'Add Item',
        path: '/dashboard/inventory/add',
        icon: 'PlusCircle',
        description: 'Add new inventory item',
        permission: { resource: 'inventory', action: 'create' },
      },
      {
        id: 73,
        name: 'Stock Reports',
        path: '/dashboard/inventory/reports',
        icon: 'BarChart',
        description: 'View stock reports',
        permission: { resource: 'inventory', action: 'read' },
      },
    ],
  },
  {
    id: 8,
    name: 'Marketing',
    path: '#',
    icon: 'Megaphone',
    permission: { resource: 'marketing', action: 'read' },
    children: [
      {
        id: 81,
        name: 'Campaigns',
        path: '/dashboard/marketing/campaigns',
        icon: 'Target',
        description: 'Manage marketing campaigns',
        permission: { resource: 'marketing', action: 'read' },
      },
      {
        id: 82,
        name: 'Analytics',
        path: '/dashboard/marketing/analytics',
        icon: 'TrendingUp',
        description: 'View marketing analytics',
        permission: { resource: 'marketing', action: 'read' },
      },
    ],
  },
  {
    id: 9,
    name: 'IT Resources',
    path: '#',
    icon: 'Computer',
    permission: { resource: 'it_resource', action: 'read' },
    children: [
      {
        id: 91,
        name: 'Hardware',
        path: '/dashboard/it/hardware',
        icon: 'Cpu',
        description: 'Manage hardware assets',
        permission: { resource: 'it_resource', action: 'read' },
      },
      {
        id: 92,
        name: 'Software',
        path: '/dashboard/it/software',
        icon: 'Code',
        description: 'Manage software licenses',
        permission: { resource: 'it_resource', action: 'read' },
      },
    ],
  },
  {
    id: 10,
    name: 'Reports',
    path: '/dashboard/reports',
    icon: 'FileBarChart',
    permission: { resource: 'report', action: 'read' },
    children: [],
  },
  {
    id: 11,
    name: 'Settings',
    path: '#',
    icon: 'Settings',
    permission: { resource: 'settings', action: 'read' },
    children: [
      {
        id: 111,
        name: 'Profile',
        path: '/dashboard/profile',
        icon: 'UserCircle',
        description: 'View and edit your profile',
        permission: { resource: 'own_data', action: 'read' },
      },
      {
        id: 112,
        name: 'Security',
        path: '/dashboard/security',
        icon: 'Lock',
        description: 'Manage security settings',
        permission: { resource: 'settings', action: 'update' },
      },
      {
        id: 113,
        name: 'System Settings',
        path: '/dashboard/system-settings',
        icon: 'Server',
        description: 'Configure system settings',
        permission: { resource: 'system', action: 'manage' },
      },
    ],
  },
];

/**
 * Check if user has permission for a menu item
 * @param {Array} userPermissions - Array of permission strings (e.g., ['users:read', 'roles:create'])
 * @param {Object} menuPermission - Permission object with resource and action
 * @returns {boolean} - True if user has permission
 */
export function hasMenuPermission(userPermissions, menuPermission) {
  if (!menuPermission) return true;
  if (!userPermissions || !Array.isArray(userPermissions)) return false;

  const requiredPermission = `${menuPermission.resource}:${menuPermission.action}`;
  return userPermissions.includes(requiredPermission);
}

/**
 * Filter menu based on user permissions
 * @param {Array} menu - Menu configuration array
 * @param {Array} userPermissions - Array of permission strings
 * @returns {Array} - Filtered menu array
 */
export function filterMenuByPermissions(menu, userPermissions) {
  // Debug logging
  console.log('filterMenuByPermissions called with:', {
    menuLength: menu?.length,
    userPermissions,
  });

  if (!menu || !Array.isArray(menu)) {
    console.log('Menu is not an array');
    return [];
  }

  if (!userPermissions || !Array.isArray(userPermissions)) {
    console.log('User permissions is not an array');
    return [];
  }

  const filtered = menu
    .map((item) => {
      // Create a copy to avoid mutating original
      const itemCopy = { ...item };

      // Check if user has permission for this menu item
      const hasPermission = hasMenuPermission(
        userPermissions,
        itemCopy.permission
      );

      if (!hasPermission) {
        console.log(`User lacks permission for menu: ${itemCopy.name}`);
        return null;
      }

      // If item has children, filter them too
      if (itemCopy.children && itemCopy.children.length > 0) {
        const filteredChildren = itemCopy.children
          .map((child) => {
            const childCopy = { ...child };
            const hasChildPermission = hasMenuPermission(
              userPermissions,
              childCopy.permission
            );
            return hasChildPermission ? childCopy : null;
          })
          .filter(Boolean);

        // Only include parent if it has visible children
        if (filteredChildren.length > 0) {
          return { ...itemCopy, children: filteredChildren };
        }

        // If parent has no accessible children, don't show it
        console.log(`Parent menu ${itemCopy.name} has no accessible children`);
        return null;
      }

      return itemCopy;
    })
    .filter(Boolean);

  console.log(
    'Filtered menus result:',
    filtered.map((m) => m.name)
  );
  return filtered;
}
