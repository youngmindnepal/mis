import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

// Admin emails that should have full access
const ADMIN_EMAILS = ['admin@example.com', 'system@example.com'];

export function usePermissions() {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultPermissions, setDefaultPermissions] = useState([]);

  // Fetch default permissions from database
  const fetchDefaultPermissions = async () => {
    try {
      const response = await fetch('/api/permissions/all');
      if (response.ok) {
        const data = await response.json();
        setDefaultPermissions(data.permissions);
        return data.permissions;
      }
    } catch (error) {
      console.error('Error fetching default permissions:', error);
    }
    return [];
  };

  useEffect(() => {
    async function fetchPermissions() {
      console.log('usePermissions - Status:', status);
      console.log('usePermissions - Session:', session);

      // First, fetch default permissions from database
      const defaults = await fetchDefaultPermissions();
      console.log('Default permissions from DB:', defaults);

      if (status === 'authenticated' && session?.user?.email) {
        try {
          console.log('Fetching permissions for user:', session.user.email);

          // Check if user is admin by email or role
          const isAdminByEmail = ADMIN_EMAILS.includes(session.user.email);
          const isAdminByRole = session.user.role === 'SYSTEM_ADMIN';

          if (isAdminByEmail || isAdminByRole) {
            console.log('Admin user detected, granting full permissions');
            // Use database defaults instead of hardcoded ones
            setPermissions(defaults.length > 0 ? defaults : []);
            setUserRole('SYSTEM_ADMIN');
            setIsLoading(false);
            return;
          }

          const response = await fetch('/api/user/permissions');
          console.log('Permissions API response status:', response.status);

          if (!response.ok) {
            console.warn(
              'Permissions API returned',
              response.status,
              '- using default permissions from DB'
            );
            setPermissions(defaults.length > 0 ? defaults : []);
            setUserRole(session?.user?.role || 'SYSTEM_ADMIN');
            setIsLoading(false);
            return;
          }

          const data = await response.json();
          console.log('Permissions API response data:', data);

          // If no permissions returned, use defaults from DB
          if (!data.permissions || data.permissions.length === 0) {
            console.warn('No permissions returned, using defaults from DB');
            setPermissions(defaults.length > 0 ? defaults : []);
          } else {
            setPermissions(data.permissions);
          }

          setUserRole(data.role || session?.user?.role || 'USER');
          console.log('Final permissions set:', data.permissions || defaults);
          console.log('Final user role set:', data.role || session?.user?.role);
        } catch (error) {
          console.error('Error fetching permissions:', error);
          // Use default permissions from DB on error
          setPermissions(defaults.length > 0 ? defaults : []);
          setUserRole(session?.user?.role || 'SYSTEM_ADMIN');
        } finally {
          setIsLoading(false);
        }
      } else if (status === 'authenticated' && session?.user) {
        // Session exists but no email? Use defaults from DB
        console.log('Session exists but no email, using defaults from DB');
        setPermissions(defaults.length > 0 ? defaults : []);
        setUserRole(session.user.role || 'SYSTEM_ADMIN');
        setIsLoading(false);
      } else if (status === 'unauthenticated') {
        console.log('User is unauthenticated');
        setPermissions([]);
        setUserRole(null);
        setIsLoading(false);
      } else {
        console.log('Loading state, status:', status);
        setIsLoading(true);
      }
    }

    fetchPermissions();
  }, [session, status]);

  const can = (resource, action) => {
    // If user has SYSTEM_ADMIN role, grant all permissions
    if (userRole === 'SYSTEM_ADMIN') {
      console.log(`SYSTEM_ADMIN granted permission for ${resource}:${action}`);
      return true;
    }

    const permissionString = `${resource}:${action}`;
    const hasPermission = permissions.includes(permissionString);
    console.log(`Permission check for ${permissionString}: ${hasPermission}`);
    return hasPermission;
  };

  return {
    permissions,
    userRole,
    isLoading,
    can,
    hasFullAccess:
      userRole === 'SYSTEM_ADMIN' || permissions.includes('system:manage'),
  };
}
