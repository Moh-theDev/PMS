import { NavLink, useLocation } from 'react-router-dom';
import {
  Inbox,
  Calendar,
  CalendarDays,
  Target,
  BarChart3,
  Hash,
  Search,
  Plus,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Pencil,
  Trash2,
  Check,
  X,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';
import { useTaskStore } from '../../store/useTaskStore';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { ProfileModal } from '@/features/profile/components/ProfileModal';
import { SearchModal } from '@/features/search/components/SearchModal';

/* ── Category colour palette ──────────────────────────────────────────── */
const COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

/* ── Inline editor for category or tag name ──────────────────────────── */
function InlineNameEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (val: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const commit = () => { if (value.trim() && value.trim() !== initial) onSave(value.trim()); else onCancel(); };

  return (
    <form
      className="flex items-center gap-1 flex-1"
      onSubmit={(e) => { e.preventDefault(); commit(); }}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        className="flex-1 h-6 px-1.5 text-xs font-semibold text-slate-900 bg-white border border-blue-400 rounded-md outline-none focus:ring-2 focus:ring-blue-500/20 min-w-0"
      />
      <button type="submit" className="text-emerald-600 hover:text-emerald-700 shrink-0">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

/* ── Inline new category / tag input ─────────────────────────────────── */
function InlineCreate({
  placeholder,
  onSave,
  onCancel,
}: {
  placeholder: string;
  onSave: (val: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <form
      className="flex items-center gap-1 px-2 py-1.5"
      onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSave(value.trim()); }}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        placeholder={placeholder}
        className="flex-1 h-6 px-2 text-xs font-semibold text-slate-900 bg-white border border-blue-400 rounded-md outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 min-w-0"
      />
      <button type="submit" disabled={!value.trim()} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-30 shrink-0">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

interface SidebarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ sidebarOpen: _sidebarOpen, toggleSidebar }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const {
    lists,
    tasks,
    categories,
    tags,
    getTasksByList,
    addCategory,
    updateCategory,
    deleteCategory,
    addTag,
    updateTag,
    deleteTag,
  } = useTaskStore();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isListsCollapsed, setIsListsCollapsed] = useState(false);
  const [isTagsCollapsed, setIsTagsCollapsed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Global keyboard listener for search modal toggling */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* inline creation state */
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);

  /* editing state */
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);

  /* hover state for actions */
  const [hoveredCatId, setHoveredCatId] = useState<number | null>(null);
  const [hoveredTagId, setHoveredTagId] = useState<number | null>(null);

  /* close dropdown on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isDropdownOpen]);

  const inboxCount = tasks.filter((t) => t.status !== 2 && t.status !== 3 && (!t.categoryId || t.categoryId === 0)).length;
  const todayCount = getTasksByList('today').filter((t) => t.status !== 2 && t.status !== 3).length;
  const upcomingCount = getTasksByList('upcoming').filter((t) => t.status !== 2 && t.status !== 3).length;

  const navItems = [
    { icon: Inbox, label: 'Inbox', path: '/tasks/inbox', count: inboxCount },
    { icon: Calendar, label: 'Today', path: '/tasks/today', count: todayCount },
    { icon: CalendarDays, label: 'Upcoming', path: '/tasks/upcoming', count: upcomingCount },
    { icon: Target, label: 'Focus Mode', path: '/focus' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Sparkles, label: 'AI Assistant', path: '/ai-assistant' },
  ];

  const categoryLists = lists.filter((l) => !['inbox', 'today', 'upcoming'].includes(l.id));

  return (
    <aside className="w-60 bg-slate-50 border-r border-slate-200 flex flex-col h-screen sticky top-0 text-slate-600 select-none shrink-0">

      {/* ── User section with Collapse trigger ─────────────────────── */}
      <div className="relative flex items-center justify-between px-3 pt-3" ref={dropdownRef}>
        <div
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            'flex-1 p-2 bg-white rounded-xl border flex items-center justify-between cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all min-w-0',
            isDropdownOpen ? 'border-blue-300 ring-4 ring-blue-50' : 'border-slate-200'
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-7 w-7 ring-2 ring-white shrink-0">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px] font-bold">
                {user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 leading-none truncate">{user?.name}</span>
              <span className="text-[10px] text-slate-400 capitalize leading-none mt-0.5 font-semibold">
                {user?.plan} Plan
              </span>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-slate-300 transition-transform duration-200 shrink-0',
              isDropdownOpen && 'rotate-180 text-blue-500'
            )}
          />
        </div>

        {/* Sidebar Collapse Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="ml-2 h-9 w-9 bg-white border border-slate-200 hover:border-blue-200 hover:text-blue-600 rounded-xl shadow-2xs flex items-center justify-center shrink-0 cursor-pointer text-slate-400 hover:bg-slate-50 transition-all active:scale-95"
          title="Collapse Sidebar"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-[52px] left-3 right-12 z-50 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/60 p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => { setIsProfileOpen(true); setIsDropdownOpen(false); }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors w-full text-left"
            >
              <UserIcon className="h-3.5 w-3.5 text-slate-400" />
              Profile Settings
            </button>
            <Separator className="my-0.5" />
            <button
              onClick={() => { logout(); setIsDropdownOpen(false); }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out
            </button>
          </div>
        )}
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="px-3 pb-2">
        <button 
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center justify-between w-full px-3 py-2 bg-white border border-slate-200 hover:border-blue-200 rounded-xl text-slate-400 text-xs font-semibold transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors" />
            <span>Quick search...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center text-[9px] px-1.5 py-0.5 bg-slate-50 text-slate-400 border border-slate-100 rounded font-sans font-bold group-hover:bg-slate-100 transition-colors">
            ctrl + k
          </kbd>
        </button>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 space-y-5 pb-4">

        {/* Main nav */}
        <section>
          <div className="px-2 py-1 mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">Navigation</span>
          </div>
          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'sidebar-item text-slate-500 hover:text-slate-900 hover:bg-white',
                    isActive && 'sidebar-item-active text-white bg-blue-600'
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                      location.pathname === item.path
                        ? 'bg-blue-700/50 text-white'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </section>

        {/* ── Categories ──────────────────────────────── */}
        <section>
          <div className="px-2 py-1 mb-1 flex items-center justify-between group">
            <div 
              onClick={() => setIsListsCollapsed(!isListsCollapsed)}
              className="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">Lists</span>
              <ChevronDown className={cn("h-3 w-3 text-slate-400 transition-transform duration-150", isListsCollapsed && "-rotate-90")} />
            </div>
            <button
              onClick={() => setCreatingCategory(true)}
              className="h-5 w-5 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {!isListsCollapsed && (
            <>
              {/* Inline create */}
              {creatingCategory && (
                <InlineCreate
                  placeholder="Category name..."
                  onSave={(name) => { addCategory(name); setCreatingCategory(false); }}
                  onCancel={() => setCreatingCategory(false)}
                />
              )}

              <nav className="space-y-0.5">
                {categoryLists.map((list) => {
                  const cat = categories.find((c) => String(c.id) === list.id);
                  const catId = cat?.id ?? -1;
                  const taskCount = tasks.filter((t) => t.categoryId === catId && t.status !== 2 && t.status !== 3).length;
                  const isEditing = editingCategoryId === catId;

                  return (
                    <div
                      key={list.id}
                      className="relative"
                      onMouseEnter={() => setHoveredCatId(catId)}
                      onMouseLeave={() => setHoveredCatId(null)}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <FolderOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <InlineNameEditor
                            initial={list.name}
                            onSave={(val) => { updateCategory(catId, val); setEditingCategoryId(null); }}
                            onCancel={() => setEditingCategoryId(null)}
                          />
                        </div>
                      ) : (
                        <NavLink
                          to={`/tasks/list/${list.id}`}
                          className={({ isActive }) =>
                            cn(
                              'sidebar-item text-slate-500 hover:text-slate-900 hover:bg-white group/cat',
                              isActive && 'sidebar-item-active text-white bg-blue-600'
                            )
                          }
                        >
                          <div
                            className="h-2 w-2 rounded-full ring-1 ring-white/60 shrink-0"
                            style={{ backgroundColor: list.color || COLORS[catId % COLORS.length] }}
                          />
                          <span className="flex-1 truncate">{list.name}</span>
                          {taskCount > 0 && (
                            <span className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0',
                              location.pathname.includes(list.id)
                                ? 'bg-blue-700/50 text-white'
                                : 'bg-slate-100 text-slate-500'
                            )}>
                              {taskCount}
                            </span>
                          )}
                          {/* Action buttons — show on row hover */}
                          {hoveredCatId === catId && (
                            <div className="flex items-center gap-0.5 ml-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingCategoryId(catId); }}
                                className="h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteCategory(catId); }}
                                className="h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </NavLink>
                      )}
                    </div>
                  );
                })}
              </nav>
            </>
          )}
        </section>

        {/* ── Tags ───────────────────────────────────────── */}
        <section>
          <div className="px-2 py-1 mb-1 flex items-center justify-between group">
            <div 
              onClick={() => setIsTagsCollapsed(!isTagsCollapsed)}
              className="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">Tags</span>
              <ChevronDown className={cn("h-3 w-3 text-slate-400 transition-transform duration-150", isTagsCollapsed && "-rotate-90")} />
            </div>
            <button
              onClick={() => setCreatingTag(true)}
              className="h-5 w-5 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          {!isTagsCollapsed && (
            <>
              {creatingTag && (
                <InlineCreate
                  placeholder="Label name..."
                  onSave={(name) => { addTag(name); setCreatingTag(false); }}
                  onCancel={() => setCreatingTag(false)}
                />
              )}

              <nav className="space-y-0.5">
                {tags.map((tag) => {
                  const tagTaskCount = tasks.filter(
                    (t) => t.tags?.includes(tag.name) && t.status !== 2 && t.status !== 3
                  ).length;
                  const isEditing = editingTagId === tag.id;

                  return (
                    <div
                      key={tag.id}
                      className="relative"
                      onMouseEnter={() => setHoveredTagId(tag.id)}
                      onMouseLeave={() => setHoveredTagId(null)}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <InlineNameEditor
                            initial={tag.name}
                            onSave={(val) => { updateTag(tag.id, val); setEditingTagId(null); }}
                            onCancel={() => setEditingTagId(null)}
                          />
                        </div>
                      ) : (
                        <NavLink
                          to={`/tasks/tag/${tag.id}`}
                          className={({ isActive }) =>
                            cn(
                              'sidebar-item text-slate-500 hover:text-slate-900 hover:bg-white',
                              isActive && 'sidebar-item-active text-white bg-blue-600'
                            )
                          }
                        >
                          <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="flex-1 truncate capitalize">{tag.name}</span>
                          {tagTaskCount > 0 && (
                            <span className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0',
                              location.pathname.includes(String(tag.id))
                                ? 'bg-blue-700/50 text-white'
                                : 'bg-slate-100 text-slate-500'
                            )}>
                              {tagTaskCount}
                            </span>
                          )}
                          {hoveredTagId === tag.id && (
                            <div className="flex items-center gap-0.5 ml-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingTagId(tag.id); }}
                                className="h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteTag(tag.id); }}
                                className="h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </NavLink>
                      )}
                    </div>
                  );
                })}
              </nav>
            </>
          )}
        </section>
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </aside>
  );
}
