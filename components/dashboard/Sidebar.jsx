// components/dashboard/Sidebar.jsx
'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { menuConfig, filterMenuByPermissions } from '@/config/menus';

export default function Sidebar({ session: propSession }) {
  const { data: clientSession, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const {
    permissions,
    userRole,
    isLoading: permissionsLoading,
  } = usePermissions();

  // Use prop session if available, otherwise use client session
  const session = propSession || clientSession;

  // UI States
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMedium, setIsMedium] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  // Hover states for collapsed mode
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [hoveredBottomItem, setHoveredBottomItem] = useState(null);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
  const [bottomTooltipPosition, setBottomTooltipPosition] = useState({
    top: 0,
    left: 0,
  });

  // Refs
  const menuRefs = useRef({});
  const bottomProfileRef = useRef(null);
  const bottomLogoutRef = useRef(null);
  const timeoutRef = useRef(null);
  const bottomTimeoutRef = useRef(null);
  const sidebarRef = useRef(null);

  // Filter menus based on user permissions
  const filteredMenus = useMemo(() => {
    // Don't filter if permissions are still loading
    if (permissionsLoading || !permissions || permissions.length === 0) {
      return [];
    }

    // For SYSTEM_ADMIN, return all menus without filtering
    if (userRole === 'SYSTEM_ADMIN') {
      return menuConfig;
    }

    // Otherwise filter based on permissions
    return filterMenuByPermissions(menuConfig, permissions);
  }, [permissions, permissionsLoading, userRole]);

  // Handle mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!permissionsLoading && permissions) {
      console.log('Current user role:', userRole);
      console.log('User permissions:', permissions);
      console.log(
        'Filtered menus:',
        filteredMenus.map((m) => m.name)
      );
    }
  }, [permissions, permissionsLoading, userRole, filteredMenus]);
  // Check for screen sizes
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const isMobileScreen = width < 768;
      const isMediumScreen = width >= 768 && width < 1024;

      setIsMobile(isMobileScreen);
      setIsMedium(isMediumScreen);

      if (isMobileScreen || isMediumScreen) {
        setCollapsed(false);
        setIsSidebarOpen(false);
      } else {
        setCollapsed(false);
        setIsSidebarOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isSidebarOpen && (isMobile || isMedium)) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isMobile, isMedium, isSidebarOpen]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen && (isMobile || isMedium)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen, isMobile, isMedium]);

  // Auto-open menus based on current path
  useEffect(() => {
    if (mounted && filteredMenus.length > 0) {
      const newOpenMenus = {};

      filteredMenus.forEach((menu) => {
        if (menu.children && menu.children.length > 0) {
          const hasActiveChild = menu.children.some(
            (child) =>
              pathname === child.path || pathname.startsWith(child.path + '/')
          );
          if (hasActiveChild) {
            newOpenMenus[menu.id] = true;
          }
        }
      });

      setOpenMenus(newOpenMenus);
    }
  }, [pathname, mounted, filteredMenus]);

  const toggleMenu = useCallback((menuId) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut({ redirect: false });
    router.push('/login');
  }, [router]);

  const renderIcon = useCallback((iconName, size = 20) => {
    if (!iconName) return <Icons.Circle size={size} />;
    const Icon = Icons[iconName];
    if (!Icon) return <Icons.Circle size={size} />;
    return <Icon size={size} strokeWidth={1.5} />;
  }, []);

  const calculateSubmenuPosition = useCallback((menuElement) => {
    if (!menuElement) return { top: 0, left: 0 };

    const rect = menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const submenuWidth = 280;
    const submenuHeight = 400;

    let leftPosition = rect.right + 12;
    let topPosition = rect.top - 8;

    if (leftPosition + submenuWidth > viewportWidth - 10) {
      leftPosition = rect.left - submenuWidth - 12;
    }

    if (topPosition + submenuHeight > viewportHeight - 20) {
      topPosition = viewportHeight - submenuHeight - 20;
    }

    if (topPosition < 10) {
      topPosition = 10;
    }

    return { top: topPosition, left: leftPosition };
  }, []);

  const calculateTooltipPosition = useCallback(
    (element, tooltipWidth, tooltipHeight) => {
      if (!element) return { top: 0, left: 0 };

      const rect = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let leftPosition = rect.right + 12;
      let topPosition = rect.top + rect.height / 2 - tooltipHeight / 2;

      if (leftPosition + tooltipWidth > viewportWidth - 10) {
        leftPosition = rect.left - tooltipWidth - 12;
      }

      if (topPosition + tooltipHeight > viewportHeight - 10) {
        topPosition = viewportHeight - tooltipHeight - 10;
      }

      if (topPosition < 10) {
        topPosition = 10;
      }

      return { top: topPosition, left: leftPosition };
    },
    []
  );

  const handleMouseEnter = useCallback(
    (menuId) => {
      if (collapsed && !isMobile && !isMedium) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        const menuElement = menuRefs.current[menuId];
        if (menuElement) {
          const position = calculateSubmenuPosition(menuElement);
          setSubmenuPosition(position);
          setHoveredMenu(menuId);
        }
      }
    },
    [collapsed, isMobile, isMedium, calculateSubmenuPosition]
  );

  const handleMouseLeave = useCallback(() => {
    if (collapsed && !isMobile && !isMedium) {
      timeoutRef.current = setTimeout(() => {
        setHoveredMenu(null);
      }, 200);
    }
  }, [collapsed, isMobile, isMedium]);

  const handleSubmenuMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleSubmenuMouseLeave = useCallback(() => {
    setHoveredMenu(null);
  }, []);

  const handleProfileMouseEnter = useCallback(() => {
    if (collapsed && !isMobile && !isMedium) {
      if (bottomTimeoutRef.current) {
        clearTimeout(bottomTimeoutRef.current);
      }

      const element = bottomProfileRef.current;
      if (element) {
        const position = calculateTooltipPosition(element, 224, 200);
        setBottomTooltipPosition(position);
        setHoveredBottomItem('profile');
      }
    }
  }, [collapsed, isMobile, isMedium, calculateTooltipPosition]);

  const handleLogoutMouseEnter = useCallback(() => {
    if (collapsed && !isMobile && !isMedium) {
      if (bottomTimeoutRef.current) {
        clearTimeout(bottomTimeoutRef.current);
      }

      const element = bottomLogoutRef.current;
      if (element) {
        const position = calculateTooltipPosition(element, 192, 140);
        setBottomTooltipPosition(position);
        setHoveredBottomItem('logout');
      }
    }
  }, [collapsed, isMobile, isMedium, calculateTooltipPosition]);

  const handleBottomMouseLeave = useCallback(() => {
    if (collapsed && !isMobile && !isMedium) {
      bottomTimeoutRef.current = setTimeout(() => {
        setHoveredBottomItem(null);
      }, 200);
    }
  }, [collapsed, isMobile, isMedium]);

  const handleTooltipMouseEnter = useCallback(() => {
    if (bottomTimeoutRef.current) {
      clearTimeout(bottomTimeoutRef.current);
    }
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    setHoveredBottomItem(null);
  }, []);

  const handleNavigation = useCallback(
    (path) => {
      if (isMobile || isMedium) {
        setIsSidebarOpen(false);
      }
      router.push(path);
    },
    [isMobile, isMedium, router]
  );

  // User information
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || 'user@example.com';
  const userProfilePicture = session?.user?.profilePicture;
  const userStatus = session?.user?.status;

  // Sidebar behavior
  const isLargeScreen = !isMobile && !isMedium;
  const isOverlayMode = isMobile || isMedium;
  const sidebarWidth = collapsed && isLargeScreen ? 80 : 280;

  // Loading state
  if (!mounted || status === 'loading' || permissionsLoading) {
    return (
      <div
        className="h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex flex-col"
        style={{
          width: isLargeScreen ? (collapsed ? '80px' : '280px') : '280px',
        }}
      >
        <div className="p-4">
          <div className="animate-pulse bg-white/10 h-10 w-32 rounded-xl"></div>
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-white/10 h-10 rounded-xl"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Sidebar content component
  const SidebarContent = () => (
    <motion.aside
      ref={sidebarRef}
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col shadow-2xl overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-pink-500/5" />
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 59px,
                rgba(255, 255, 255, 0.03) 59px,
                rgba(255, 255, 255, 0.03) 60px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 59px,
                rgba(255, 255, 255, 0.03) 59px,
                rgba(255, 255, 255, 0.03) 60px
              )
            `,
          }}
        />
      </div>

      {/* Role Badge */}
      {!collapsed && userRole && (
        <div className="px-4 py-2 mx-4 mt-2 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-white/40">Role</div>
          <div className="text-sm font-medium text-white truncate">
            {userRole.replace(/_/g, ' ')}
          </div>
        </div>
      )}

      {/* Header - Logo */}
      <div className="relative z-10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          {(!collapsed || !isLargeScreen) && (
            <motion.div
              whileHover={isLargeScreen ? { scale: 1.02 } : {}}
              whileTap={isLargeScreen ? { scale: 0.98 } : {}}
              className="cursor-pointer"
              onClick={() => handleNavigation('/dashboard')}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12">
                  <Image
                    src="/admissionguru.png"
                    alt="Logo"
                    fill
                    className="rounded-xl object-contain"
                    priority
                  />
                </div>
                {(!collapsed || !isLargeScreen) && (
                  <div>
                    <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      AdmissionGuru
                    </span>
                    <p className="text-xs text-white/40">Admin Panel</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {isLargeScreen ? (
            <motion.button
              onClick={() => setCollapsed(!collapsed)}
              whileHover={{
                scale: 1.05,
                backgroundColor: 'rgba(255,255,255,0.1)',
              }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-xl hover:bg-white/10 relative group transition-all duration-200 ${
                collapsed ? 'mx-auto' : ''
              }`}
            >
              {collapsed ? (
                <Icons.ChevronRight size={20} className="text-white/70" />
              ) : (
                <Icons.ChevronLeft size={20} className="text-white/70" />
              )}
            </motion.button>
          ) : (
            <motion.button
              onClick={() => setIsSidebarOpen(false)}
              whileHover={{
                scale: 1.05,
                backgroundColor: 'rgba(255,255,255,0.1)',
              }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <Icons.X size={20} className="text-white/70" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 relative z-10 custom-scrollbar">
        {filteredMenus.length === 0 ? (
          <div className="text-center py-8">
            <Icons.Lock size={40} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No accessible menus</p>
            <p className="text-white/20 text-xs mt-1">Contact administrator</p>
          </div>
        ) : (
          filteredMenus.map((menu) => {
            const hasChildren = menu.children && menu.children.length > 0;
            const isActive = !hasChildren && pathname === menu.path;
            const isParentActive =
              hasChildren &&
              menu.children.some(
                (child) =>
                  pathname === child.path ||
                  pathname.startsWith(child.path + '/')
              );

            return (
              <div key={menu.id}>
                <div
                  ref={(el) => {
                    if (el) menuRefs.current[menu.id] = el;
                  }}
                  onMouseEnter={() => handleMouseEnter(menu.id)}
                  onMouseLeave={handleMouseLeave}
                  className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                    isActive || (isParentActive && !collapsed)
                      ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white shadow-lg border border-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => {
                    if (!collapsed || !isLargeScreen) {
                      if (hasChildren) {
                        toggleMenu(menu.id);
                      } else {
                        handleNavigation(menu.path);
                      }
                    }
                  }}
                >
                  {(isActive || (isParentActive && !collapsed)) && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-r-full"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}

                  <div className="transition-transform duration-200 group-hover:scale-110">
                    {renderIcon(menu.icon, 20)}
                  </div>

                  <AnimatePresence mode="wait">
                    {(!collapsed || !isLargeScreen) && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="text-sm font-medium flex-1"
                      >
                        {menu.name}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {(!collapsed || !isLargeScreen) && hasChildren && (
                    <motion.div
                      animate={{ rotate: openMenus[menu.id] ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Icons.ChevronRight size={16} className="text-white/40" />
                    </motion.div>
                  )}
                </div>

                <AnimatePresence>
                  {(!collapsed || !isLargeScreen) &&
                    openMenus[menu.id] &&
                    hasChildren && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-9 mt-2 space-y-1 overflow-hidden"
                      >
                        {menu.children.map((child) => {
                          const isChildActive = pathname === child.path;
                          return (
                            <motion.div
                              key={child.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div
                                onClick={() => handleNavigation(child.path)}
                                className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                  isChildActive
                                    ? 'text-purple-400 bg-purple-500/10'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <div className="transition-transform duration-200 group-hover:scale-105">
                                  {renderIcon(child.icon, 16)}
                                </div>
                                <span className="text-sm truncate flex-1">
                                  {child.name}
                                </span>
                                {isChildActive && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-1.5 h-1.5 bg-purple-400 rounded-full"
                                  />
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Footer - User Profile */}
      <div className="relative z-10 mt-auto border-t border-white/10 p-4">
        {!collapsed || !isLargeScreen ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 p-2 rounded-xl bg-gradient-to-r from-white/5 to-white/0 backdrop-blur-sm">
              <motion.div whileHover={{ scale: 1.05 }} className="relative">
                {userProfilePicture ? (
                  <img
                    src={userProfilePicture}
                    alt={userName}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-semibold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-slate-900"
                />
              </motion.div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-white/40 truncate">{userEmail}</p>
                {userStatus && (
                  <span
                    className={`text-xs ${
                      userStatus === 'active'
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {userStatus}
                  </span>
                )}
              </div>
            </div>

            <motion.button
              whileHover={{
                scale: 1.02,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
              }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-2 rounded-xl bg-red-500/10 text-red-400 hover:text-red-300 transition-all duration-200 group"
            >
              <Icons.LogOut
                size={18}
                className="group-hover:rotate-12 transition-transform"
              />
              <span className="text-sm font-medium">Logout</span>
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <div
              ref={bottomProfileRef}
              className="relative w-12 h-12 mx-auto cursor-pointer"
              onMouseEnter={handleProfileMouseEnter}
              onMouseLeave={handleBottomMouseLeave}
            >
              {userProfilePicture ? (
                <img
                  src={userProfilePicture}
                  alt={userName}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-semibold text-lg mx-auto">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-slate-900"
              />
            </div>

            <div
              ref={bottomLogoutRef}
              onMouseEnter={handleLogoutMouseEnter}
              onMouseLeave={handleBottomMouseLeave}
            >
              <motion.button
                whileHover={{
                  scale: 1.05,
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="w-full p-2 rounded-xl bg-red-500/10 text-red-400 hover:text-red-300 transition-all duration-200 flex justify-center"
              >
                <Icons.LogOut size={18} />
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      {isOverlayMode && !isSidebarOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-2xl hover:shadow-lg transition-all duration-200 group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Icons.ChevronRight size={20} className="text-white" />
          <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      )}

      {/* Desktop Sidebar */}
      {isLargeScreen && <SidebarContent />}

      {/* Mobile/Tablet Overlay Sidebar */}
      {isOverlayMode && (
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              />

              <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                className="fixed left-0 top-0 h-screen z-50 shadow-2xl"
                style={{ width: 280 }}
              >
                <SidebarContent />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* Hover Submenu for Collapsed Mode */}
      <AnimatePresence>
        {collapsed && isLargeScreen && hoveredMenu !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed w-80 z-[100]"
            style={{
              top: submenuPosition.top,
              left: submenuPosition.left,
            }}
            onMouseEnter={handleSubmenuMouseEnter}
            onMouseLeave={handleSubmenuMouseLeave}
          >
            <div className="relative bg-gradient-to-br from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 opacity-20 rounded-2xl" />

              <div className="relative px-5 py-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    {renderIcon(
                      filteredMenus.find((m) => m.id === hoveredMenu)?.icon,
                      20
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      {filteredMenus.find((m) => m.id === hoveredMenu)?.name}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {filteredMenus.find((m) => m.id === hoveredMenu)?.children
                        ?.length || 0}{' '}
                      options available
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative py-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {filteredMenus
                  .find((m) => m.id === hoveredMenu)
                  ?.children?.map((child, idx) => {
                    const isChildActive = pathname === child.path;
                    return (
                      <Link key={child.id} href={child.path}>
                        <motion.div
                          className={`group relative mx-2 my-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                            isChildActive
                              ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                          whileHover={{ x: 4 }}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          {isChildActive && (
                            <motion.div
                              layoutId="submenuActiveIndicator"
                              className="absolute left-0 w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-r-full"
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                            />
                          )}

                          <div
                            className={`transition-all duration-200 group-hover:scale-110 ${
                              isChildActive
                                ? 'text-purple-400'
                                : 'text-white/50 group-hover:text-white'
                            }`}
                          >
                            {renderIcon(child.icon, 18)}
                          </div>

                          <div className="flex-1">
                            <div
                              className={`text-sm font-medium ${
                                isChildActive ? 'text-purple-400' : ''
                              }`}
                            >
                              {child.name}
                            </div>
                            {child.description && (
                              <div className="text-xs text-white/30 group-hover:text-white/50 transition-colors">
                                {child.description}
                              </div>
                            )}
                          </div>

                          <motion.div
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            initial={{ x: -5 }}
                            animate={{ x: 0 }}
                          >
                            <Icons.ArrowRight
                              size={14}
                              className="text-white/40"
                            />
                          </motion.div>

                          {isChildActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 bg-purple-400 rounded-full shadow-lg shadow-purple-500/50"
                            />
                          )}
                        </motion.div>
                      </Link>
                    );
                  })}
              </div>

              <div className="relative px-5 py-3 bg-white/5 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-white/30">
                  <span>Press ESC to close</span>
                  <span className="flex items-center gap-2">
                    <Icons.CornerDownLeft size={12} />
                    <span>Click to navigate</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Tooltip */}
      <AnimatePresence>
        {collapsed && isLargeScreen && hoveredBottomItem === 'profile' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -5 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -5 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[100]"
            style={{
              top: bottomTooltipPosition.top,
              left: bottomTooltipPosition.left,
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-xl shadow-2xl border border-white/20 overflow-hidden w-56">
              <div className="px-4 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Icons.UserCircle size={16} className="text-purple-400" />
                  <span className="text-xs font-semibold text-white/70">
                    User Profile
                  </span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div>
                  <p className="text-xs text-white/40">Name</p>
                  <p className="text-sm font-medium text-white">{userName}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Email</p>
                  <p className="text-xs text-white/70 break-words">
                    {userEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Role</p>
                  <p className="text-xs font-medium text-purple-400">
                    {userRole?.replace(/_/g, ' ')}
                  </p>
                </div>
                {userStatus && (
                  <div>
                    <p className="text-xs text-white/40">Status</p>
                    <p
                      className={`text-xs font-medium ${
                        userStatus === 'active'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {userStatus}
                    </p>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={() => router.push('/dashboard/profile')}
                    className="w-full text-xs text-purple-400 hover:text-purple-300 transition-colors text-center"
                  >
                    View Full Profile →
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Tooltip */}
      <AnimatePresence>
        {collapsed && isLargeScreen && hoveredBottomItem === 'logout' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -5 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -5 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[100]"
            style={{
              top: bottomTooltipPosition.top,
              left: bottomTooltipPosition.left,
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div className="bg-gradient-to-br from-slate-900 to-red-900/50 rounded-xl shadow-2xl border border-red-500/20 overflow-hidden w-48">
              <div className="px-4 py-3 bg-gradient-to-r from-red-600/20 to-red-500/20 border-b border-red-500/10">
                <div className="flex items-center gap-2">
                  <Icons.LogOut size={16} className="text-red-400" />
                  <span className="text-xs font-semibold text-red-400">
                    Logout
                  </span>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-white/60 mb-3">
                  Are you sure you want to logout?
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded-lg transition-all duration-200"
                >
                  Confirm Logout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.8);
        }
      `}</style>
    </>
  );
}
