// components/RoleMenusModal.js
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function RoleMenusModal({
  isOpen,
  onClose,
  role,
  onUpdateMenus,
}) {
  const [menus, setMenus] = useState([]);
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMenus, setExpandedMenus] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && role) {
      fetchMenus();
      fetchRoleMenus();
    }
  }, [isOpen, role]);

  const fetchMenus = async () => {
    try {
      const response = await fetch('/api/menus?all=true');
      if (!response.ok) throw new Error('Failed to fetch menus');
      const data = await response.json();
      console.log('All menus fetched:', data.menus);
      setMenus(data.menus);
    } catch (error) {
      console.error('Error fetching menus:', error);
      setError('Failed to load menus');
    }
  };
  // components/RoleMenusModal.js - Add debugging
  const fetchRoleMenus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Debug: Log the role object
      console.log('Role object in modal:', role);
      console.log('Role ID:', role?.id);
      console.log('Role ID type:', typeof role?.id);

      if (!role || !role.id) {
        console.error('Role or role.id is missing:', role);
        setError('Invalid role data');
        setLoading(false);
        return;
      }

      const roleId = role.id;
      console.log(`Fetching menus for role ${roleId}...`);

      const response = await fetch(`/api/roles/${roleId}/menus`);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(
          errorData.error || `Failed to fetch role menus: ${response.status}`
        );
      }

      const data = await response.json();
      console.log('Role menus data received:', data);

      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error('Received non-array data:', data);
        setSelectedMenus([]);
        return;
      }

      // Convert to selected menus format
      const selected = data.map((menu) => ({
        id: menu.id,
        accessLevel: menu.accessLevel || 'VIEW',
      }));

      console.log('Selected menus formatted:', selected);
      setSelectedMenus(selected);
    } catch (error) {
      console.error('Error fetching role menus:', error);
      setError('Failed to load role menus: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const toggleMenuSelection = (menuId) => {
    setSelectedMenus((prev) => {
      const exists = prev.find((m) => m.id === menuId);
      if (exists) {
        console.log(`Removing menu ${menuId} from selection`);
        return prev.filter((m) => m.id !== menuId);
      } else {
        console.log(`Adding menu ${menuId} to selection`);
        return [...prev, { id: menuId, accessLevel: 'VIEW' }];
      }
    });
  };

  const updateAccessLevel = (menuId, accessLevel) => {
    console.log(`Updating access level for menu ${menuId} to ${accessLevel}`);
    setSelectedMenus((prev) =>
      prev.map((menu) => (menu.id === menuId ? { ...menu, accessLevel } : menu))
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      console.log('Saving menus:', selectedMenus);
      await onUpdateMenus(role.id, selectedMenus);
      onClose();
    } catch (error) {
      console.error('Error saving menus:', error);
      setError('Failed to save menu assignments');
    } finally {
      setSaving(false);
    }
  };

  const getAccessLevelColor = (level) => {
    const colors = {
      MANAGE: 'bg-purple-100 text-purple-700',
      EDIT: 'bg-blue-100 text-blue-700',
      VIEW: 'bg-green-100 text-green-700',
    };
    return colors[level] || colors.VIEW;
  };

  const getIcon = (iconName) => {
    if (!iconName) return Icons.Circle;
    const Icon = Icons[iconName];
    return Icon || Icons.Circle;
  };

  const isMenuSelected = (menuId) => {
    return selectedMenus.some((m) => m.id === menuId);
  };

  const getSelectedMenuAccess = (menuId) => {
    const menu = selectedMenus.find((m) => m.id === menuId);
    return menu?.accessLevel || 'VIEW';
  };

  const filterMenus = (items) => {
    if (!searchTerm) return items;

    const filtered = [];
    for (const item of items) {
      const matches =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.path.toLowerCase().includes(searchTerm.toLowerCase());

      const filteredChildren =
        item.children?.length > 0 ? filterMenus(item.children) : [];

      if (matches || filteredChildren.length > 0) {
        filtered.push({
          ...item,
          children: filteredChildren,
        });
      }
    }
    return filtered;
  };

  const renderMenuTree = (menuItems, level = 0) => {
    const filteredItems = filterMenus(menuItems);
    const rootMenus = filteredItems.filter((m) => !m.parentId);
    const getChildren = (parentId) =>
      filteredItems.filter((m) => m.parentId === parentId);

    const renderMenu = (menu, currentLevel) => {
      const children = getChildren(menu.id);
      const hasChildren = children.length > 0;
      const isExpanded = expandedMenus[menu.id];
      const isSelected = isMenuSelected(menu.id);
      const selectedAccessLevel = getSelectedMenuAccess(menu.id);
      const IconComponent = getIcon(menu.icon);

      return (
        <div key={menu.id} className="mb-2">
          <div
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              isSelected
                ? 'bg-indigo-50 border border-indigo-200'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
            style={{ marginLeft: `${currentLevel * 24}px` }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleMenuSelection(menu.id)}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />

            <div className="flex items-center gap-2 flex-1">
              <IconComponent size={18} className="text-gray-500" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{menu.name}</span>
                  <span className="text-xs text-gray-400 font-mono">
                    {menu.path}
                  </span>
                </div>
                {menu.description && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {menu.description}
                  </p>
                )}
              </div>
            </div>

            {isSelected && (
              <select
                value={selectedAccessLevel}
                onChange={(e) => updateAccessLevel(menu.id, e.target.value)}
                className={`px-2 py-1 text-xs rounded border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${getAccessLevelColor(
                  selectedAccessLevel
                )}`}
              >
                <option value="VIEW">👁️ View</option>
                <option value="EDIT">✏️ Edit</option>
                <option value="MANAGE">⚙️ Manage</option>
              </select>
            )}

            {hasChildren && (
              <button
                onClick={() => toggleMenu(menu.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <Icons.ChevronDown
                  size={16}
                  className={`transform transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}
          </div>

          {hasChildren && isExpanded && (
            <div className="mt-1">
              {children.map((child) => renderMenu(child, currentLevel + 1))}
            </div>
          )}
        </div>
      );
    };

    return rootMenus.map((menu) => renderMenu(menu, level));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Manage Menus for Role: {role?.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Select which menus this role can access and set access levels
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.X size={20} />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Icons.Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search menus by name or path..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Stats */}
            <div className="mt-3 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Icons.Menu size={14} className="text-gray-400" />
                <span className="text-gray-600">
                  Total Menus: {menus.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icons.CheckCircle size={14} className="text-green-500" />
                <span className="text-gray-600">
                  Selected: {selectedMenus.length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Icons.Loader2
                  className="animate-spin text-indigo-600"
                  size={32}
                />
              </div>
            ) : menus.length === 0 ? (
              <div className="text-center py-12">
                <Icons.Menu size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No menus available</p>
              </div>
            ) : (
              <div className="space-y-1">{renderMenuTree(menus)}</div>
            )}
          </div>

          <div className="p-6 border-t flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Icons.Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icons.Save size={18} />
                  Save Menu Assignments
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
