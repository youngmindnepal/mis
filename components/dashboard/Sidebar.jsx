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

// Constants
const STORAGE_KEYS = {
  OPEN_MENUS: 'sidebar_open_menus',
  COLLAPSED: 'sidebar_collapsed',
};

// Initialize state from localStorage
const getInitialOpenMenus = () => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.OPEN_MENUS);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const getInitialCollapsed = () => {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.COLLAPSED);
    return saved ? JSON.parse(saved) : false;
  } catch {
    return false;
  }
};

export default function Sidebar({ session: propSession }) {
  const { data: clientSession, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const {
    permissions,
    userRole,
    isLoading: permissionsLoading,
  } = usePermissions();
  const session = propSession || clientSession;

  // UI States with localStorage persistence
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const [isMedium, setIsMedium] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openMenus, setOpenMenus] = useState(getInitialOpenMenus);

  // Scroll position ref to maintain scroll position
  const scrollContainerRef = useRef(null);
  const scrollPositionRef = useRef(0);

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
  const prevPathnameRef = useRef(pathname);
  const isInitialMount = useRef(true);

  // Save openMenus to localStorage
  useEffect(() => {
    if (mounted && !isInitialMount.current) {
      localStorage.setItem(STORAGE_KEYS.OPEN_MENUS, JSON.stringify(openMenus));
    }
  }, [openMenus, mounted]);

  // Save collapsed state
  useEffect(() => {
    if (mounted && !isInitialMount.current) {
      localStorage.setItem(STORAGE_KEYS.COLLAPSED, JSON.stringify(collapsed));
    }
  }, [collapsed, mounted]);

  // Mark initial mount complete
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // Filter menus based on permissions
  const filteredMenus = useMemo(() => {
    if (permissionsLoading || !permissions || permissions.length === 0)
      return [];
    if (userRole === 'SYSTEM_ADMIN') return menuConfig;
    return filterMenuByPermissions(menuConfig, permissions);
  }, [permissions, permissionsLoading, userRole]);

  // Handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Screen size detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsMedium(width >= 768 && width < 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close sidebar on escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isSidebarOpen && (isMobile || isMedium)) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isMobile, isMedium, isSidebarOpen]);

  // Body scroll lock for mobile
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

  // Auto-open parent menu on navigation - only OPEN, never close
  useEffect(() => {
    if (!mounted || filteredMenus.length === 0) return;
    if (prevPathnameRef.current === pathname) return;

    prevPathnameRef.current = pathname;

    setOpenMenus((prev) => {
      const updated = { ...prev };
      let changed = false;

      filteredMenus.forEach((menu) => {
        if (menu.children?.length > 0) {
          const isActive = menu.children.some(
            (child) =>
              pathname === child.path || pathname.startsWith(child.path + '/')
          );
          if (isActive && !updated[menu.id]) {
            updated[menu.id] = true;
            changed = true;
          }
        }
      });

      return changed ? updated : prev;
    });
  }, [pathname, mounted, filteredMenus]);

  // Save scroll position before unmount/update
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  }, []);

  // Restore scroll position after render
  useEffect(() => {
    if (scrollContainerRef.current && scrollPositionRef.current > 0) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  });

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

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
    return Icon ? (
      <Icon size={size} strokeWidth={1.5} />
    ) : (
      <Icons.Circle size={size} />
    );
  }, []);

  const calculateSubmenuPosition = useCallback((menuElement) => {
    if (!menuElement) return { top: 0, left: 0 };
    const rect = menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const submenuHeight = 400;

    let leftPosition = rect.right + 12;
    let topPosition = rect.top - 8;

    if (leftPosition + 280 > viewportWidth - 10) {
      leftPosition = rect.left - 280 - 12;
    }
    if (topPosition + submenuHeight > viewportHeight - 20) {
      topPosition = viewportHeight - submenuHeight - 20;
    }
    if (topPosition < 10) topPosition = 10;

    return { top: topPosition, left: leftPosition };
  }, []);

  const calculateTooltipPosition = useCallback(
    (element, tooltipWidth, tooltipHeight) => {
      if (!element) return { top: 0, left: 0 };
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      let leftPosition = rect.right + 12;
      let topPosition = rect.top + rect.height / 2 - tooltipHeight / 2;

      if (leftPosition + tooltipWidth > window.innerWidth - 10) {
        leftPosition = rect.left - tooltipWidth - 12;
      }
      if (topPosition + tooltipHeight > viewportHeight - 10) {
        topPosition = viewportHeight - tooltipHeight - 10;
      }
      if (topPosition < 10) topPosition = 10;

      return { top: topPosition, left: leftPosition };
    },
    []
  );

  const handleMouseEnter = useCallback(
    (menuId) => {
      if (collapsed && !isMobile && !isMedium) {
        clearTimeout(timeoutRef.current);
        const menuElement = menuRefs.current[menuId];
        if (menuElement) {
          setSubmenuPosition(calculateSubmenuPosition(menuElement));
          setHoveredMenu(menuId);
        }
      }
    },
    [collapsed, isMobile, isMedium, calculateSubmenuPosition]
  );

  const handleMouseLeave = useCallback(() => {
    if (collapsed && !isMobile && !isMedium) {
      timeoutRef.current = setTimeout(() => setHoveredMenu(null), 200);
    }
  }, [collapsed, isMobile, isMedium]);

  const handleSubmenuMouseEnter = useCallback(
    () => clearTimeout(timeoutRef.current),
    []
  );
  const handleSubmenuMouseLeave = useCallback(() => setHoveredMenu(null), []);

  const handleProfileMouseEnter = useCallback(() => {
    if (collapsed && !isMobile && !isMedium && bottomProfileRef.current) {
      clearTimeout(bottomTimeoutRef.current);
      setBottomTooltipPosition(
        calculateTooltipPosition(bottomProfileRef.current, 224, 200)
      );
      setHoveredBottomItem('profile');
    }
  }, [collapsed, isMobile, isMedium, calculateTooltipPosition]);

  const handleLogoutMouseEnter = useCallback(() => {
    if (collapsed && !isMobile && !isMedium && bottomLogoutRef.current) {
      clearTimeout(bottomTimeoutRef.current);
      setBottomTooltipPosition(
        calculateTooltipPosition(bottomLogoutRef.current, 192, 140)
      );
      setHoveredBottomItem('logout');
    }
  }, [collapsed, isMobile, isMedium, calculateTooltipPosition]);

  const handleBottomMouseLeave = useCallback(() => {
    if (collapsed && !isMobile && !isMedium) {
      bottomTimeoutRef.current = setTimeout(
        () => setHoveredBottomItem(null),
        200
      );
    }
  }, [collapsed, isMobile, isMedium]);

  const handleTooltipMouseEnter = useCallback(
    () => clearTimeout(bottomTimeoutRef.current),
    []
  );
  const handleTooltipMouseLeave = useCallback(
    () => setHoveredBottomItem(null),
    []
  );

  const handleNavigation = useCallback(
    (path) => {
      saveScrollPosition();
      if (isMobile || isMedium) setIsSidebarOpen(false);
      router.push(path);
    },
    [isMobile, isMedium, router, saveScrollPosition]
  );

  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || 'user@example.com';
  const userProfilePicture = session?.user?.profilePicture;

  const isLargeScreen = !isMobile && !isMedium;
  const isOverlayMode = isMobile || isMedium;
  const sidebarWidth = collapsed && isLargeScreen ? 80 : 280;

  // Loading state
  if (!mounted || status === 'loading' || permissionsLoading) {
    return (
      <div
        className="h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex flex-col"
        style={{ width: isLargeScreen ? (collapsed ? 80 : 280) : 280 }}
      >
        <div className="p-4">
          <div className="animate-pulse bg-white/10 h-10 w-32 rounded-xl" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-white/10 h-10 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Logo Section
  const LogoSection = () => (
    <div className="flex items-center justify-between p-4 border-b border-white/10">
      {(!collapsed || !isLargeScreen) && (
        <div
          className="cursor-pointer flex items-center gap-3"
          onClick={() => handleNavigation('/dashboard')}
        >
          <div className="relative w-12 h-12 flex-shrink-0">
            <Image
              src="/admissionguru.png"
              alt="Logo"
              fill
              className="rounded-xl object-contain"
              priority
            />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              AdmissionGuru
            </span>
            <p className="text-xs text-white/40">Admin Panel</p>
          </div>
        </div>
      )}
      {isLargeScreen && (
        <button
          onClick={handleToggleCollapse}
          className={`p-2 rounded-xl hover:bg-white/10 transition-all duration-200 ${
            collapsed ? 'mx-auto' : ''
          }`}
        >
          {collapsed ? (
            <Icons.ChevronRight size={20} className="text-white/70" />
          ) : (
            <Icons.ChevronLeft size={20} className="text-white/70" />
          )}
        </button>
      )}
    </div>
  );

  // Menu Item Component
  const MenuItem = ({ menu }) => {
    const hasChildren = menu.children?.length > 0;
    const isActive = !hasChildren && pathname === menu.path;
    const isParentActive =
      hasChildren &&
      menu.children.some(
        (child) =>
          pathname === child.path || pathname.startsWith(child.path + '/')
      );
    const isOpen = openMenus[menu.id];

    return (
      <div>
        <div
          ref={(el) => {
            if (el) menuRefs.current[menu.id] = el;
          }}
          onMouseEnter={() => handleMouseEnter(menu.id)}
          onMouseLeave={handleMouseLeave}
          className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
            isActive || (isParentActive && !collapsed)
              ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white shadow-lg border border-white/10'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
          onClick={() => {
            if (!collapsed || !isLargeScreen) {
              hasChildren ? toggleMenu(menu.id) : handleNavigation(menu.path);
            }
          }}
        >
          {(isActive || (isParentActive && !collapsed)) && (
            <motion.div
              layoutId={`active-${menu.id}`}
              className="absolute left-0 w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-r-full"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
            />
          )}
          <div className="transition-transform duration-200 group-hover:scale-110 flex-shrink-0">
            {renderIcon(menu.icon, 20)}
          </div>
          {(!collapsed || !isLargeScreen) && (
            <>
              <span className="text-sm font-medium flex-1 truncate">
                {menu.name}
              </span>
              {hasChildren && (
                <motion.div
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icons.ChevronRight size={16} className="text-white/40" />
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Submenu */}
        <AnimatePresence>
          {(!collapsed || !isLargeScreen) && isOpen && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-9 mt-1 space-y-1 overflow-hidden"
            >
              {menu.children.map((child) => {
                const isChildActive = pathname === child.path;
                return (
                  <div
                    key={child.id}
                    onClick={() => handleNavigation(child.path)}
                    className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      isChildActive
                        ? 'text-purple-400 bg-purple-500/10'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {renderIcon(child.icon, 16)}
                    <span className="text-sm truncate">{child.name}</span>
                    {isChildActive && (
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full ml-auto flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Sidebar Content
  const SidebarContent = () => (
    <motion.aside
      ref={sidebarRef}
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col shadow-2xl overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-pink-500/5" />
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px),
            repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px)
          `,
          }}
        />
      </div>

      {/* Role Badge */}
      {!collapsed && userRole && (
        <div className="px-4 py-2 mx-4 mt-2 rounded-lg bg-white/5 border border-white/10 flex-shrink-0">
          <div className="text-xs text-white/40">Role</div>
          <div className="text-sm font-medium text-white truncate">
            {userRole.replace(/_/g, ' ')}
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="relative z-10 flex-shrink-0">
        <LogoSection />
      </div>

      {/* Menu Items - Scrollable */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 relative z-10 custom-scrollbar"
      >
        {filteredMenus.length === 0 ? (
          <div className="text-center py-8">
            <Icons.Lock size={40} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No accessible menus</p>
          </div>
        ) : (
          filteredMenus.map((menu) => <MenuItem key={menu.id} menu={menu} />)
        )}
      </div>

      {/* User Profile - Fixed at bottom */}
      <div className="relative z-10 flex-shrink-0 border-t border-white/10 p-4">
        {!collapsed || !isLargeScreen ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-gradient-to-r from-white/5 to-white/0">
              <div className="relative flex-shrink-0">
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
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-slate-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-white/40 truncate">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-2 rounded-xl bg-red-500/10 text-red-400 hover:text-red-300 transition-all duration-200"
            >
              <Icons.LogOut size={18} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
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
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-slate-900" />
            </div>
            <div
              ref={bottomLogoutRef}
              onMouseEnter={handleLogoutMouseEnter}
              onMouseLeave={handleBottomMouseLeave}
            >
              <button
                onClick={handleLogout}
                className="w-full p-2 rounded-xl bg-red-500/10 text-red-400 hover:text-red-300 transition-all duration-200 flex justify-center"
              >
                <Icons.LogOut size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );

  return (
    <>
      {/* Mobile Toggle */}
      {isOverlayMode && !isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-2xl"
        >
          <Icons.ChevronRight size={20} className="text-white" />
        </button>
      )}

      {/* Desktop Sidebar */}
      {isLargeScreen && <SidebarContent />}

      {/* Mobile/Tablet Overlay */}
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
            style={{ top: submenuPosition.top, left: submenuPosition.left }}
            onMouseEnter={handleSubmenuMouseEnter}
            onMouseLeave={handleSubmenuMouseLeave}
          >
            <div className="bg-gradient-to-br from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    {renderIcon(
                      filteredMenus.find((m) => m.id === hoveredMenu)?.icon,
                      20
                    )}
                  </div>
                  <p className="font-bold text-white">
                    {filteredMenus.find((m) => m.id === hoveredMenu)?.name}
                  </p>
                </div>
              </div>
              <div className="py-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {filteredMenus
                  .find((m) => m.id === hoveredMenu)
                  ?.children?.map((child) => {
                    const isChildActive = pathname === child.path;
                    return (
                      <Link key={child.id} href={child.path}>
                        <div
                          className={`mx-2 my-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                            isChildActive
                              ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {renderIcon(child.icon, 18)}
                          <span className="text-sm font-medium">
                            {child.name}
                          </span>
                          {isChildActive && (
                            <span className="w-2 h-2 bg-purple-400 rounded-full ml-auto" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
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
            className="fixed z-[100] w-56"
            style={{
              top: bottomTooltipPosition.top,
              left: bottomTooltipPosition.left,
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10">
                <span className="text-xs font-semibold text-white/70">
                  User Profile
                </span>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div>
                  <p className="text-xs text-white/40">Name</p>
                  <p className="text-sm font-medium text-white">{userName}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Email</p>
                  <p className="text-xs text-white/70">{userEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Role</p>
                  <p className="text-xs font-medium text-purple-400">
                    {userRole?.replace(/_/g, ' ')}
                  </p>
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
            className="fixed z-[100] w-48"
            style={{
              top: bottomTooltipPosition.top,
              left: bottomTooltipPosition.left,
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div className="bg-gradient-to-br from-slate-900 to-red-900/50 rounded-xl shadow-2xl border border-red-500/20 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-red-600/20 to-red-500/20 border-b border-red-500/10">
                <span className="text-xs font-semibold text-red-400">
                  Logout
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-white/60 mb-3">
                  Are you sure you want to logout?
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded-lg"
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
