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
  Trash2,
  X,
  Sparkles,
  MoreHorizontal,
  Edit2
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';
import { useTaskStore } from '../../store/useTaskStore';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { ProfileModal } from '@/features/profile/components/ProfileModal';
import { SearchModal } from '@/features/search/components/SearchModal';
import { CategoryTagModal } from '@/components/shared/CategoryTagModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTheme } from '../theme-provider';
import { Sun, Moon } from 'lucide-react';

/* ── Category colour palette ──────────────────────────────────────────── */
const COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];


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
    deleteCategory,
    deleteTag,
  } = useTaskStore();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isListsCollapsed, setIsListsCollapsed] = useState(false);
  const [isTagsCollapsed, setIsTagsCollapsed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

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

  /* Modal state */
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    type: 'tag' | 'category';
    initialData?: { id: number; name: string; color?: string };
  }>({ isOpen: false, mode: 'create', type: 'category' });

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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
    <aside className="w-60 bg-background border-r border-border flex flex-col h-screen sticky top-0 text-foreground select-none shrink-0">

      {/* ── User section with Collapse trigger ─────────────────────── */}
      <div className="relative flex items-center justify-between px-3 pt-3" ref={dropdownRef}>
        <div
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            'flex-1 p-2 bg-card rounded-xl border flex items-center justify-between cursor-pointer hover:border-border hover:shadow-sm dark:shadow-none transition-all min-w-0',
            isDropdownOpen ? 'border-primary/50 ring-4 ring-primary/10' : 'border-border'
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-7 w-7 ring-2 ring-background shrink-0">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                {user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-foreground truncate overflow-hidden">{user?.name}</span>
              
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0',
              isDropdownOpen && 'rotate-180 text-primary'
            )}
          />
        </div>

        {/* Sidebar Collapse Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="ml-2 h-11 w-11 bg-card border border-border hover:border-destructive/50 hover:text-destructive rounded-xl shadow-2xs dark:shadow-none flex items-center justify-center shrink-0 cursor-pointer text-muted-foreground transition-all active:scale-95"
          title="Collapse Sidebar"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-[52px] left-3 right-12 z-50 bg-card border border-border rounded-xl shadow-xl dark:shadow-none p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => { setIsProfileOpen(true); setIsDropdownOpen(false); }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left"
            >
              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Profile Settings
            </button>
            <button
              onClick={() => {
                setTheme(theme === "dark" ? "light" : "dark");
                setIsDropdownOpen(false);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-muted-foreground" /> : <Moon className="h-3.5 w-3.5 text-muted-foreground" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <Separator className="my-0.5" />
            <button
              onClick={() => { logout(); setIsDropdownOpen(false); }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-500 hover:bg-destructive/50 transition-colors w-full text-left"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out
            </button>
          </div>
        )}
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="px-3 pb-2 mt-4">
        <button 
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center justify-between w-full px-3 py-2 bg-card border border-border hover:border-primary/50 rounded-xl text-muted-foreground text-xs font-semibold transition-all shadow-sm dark:shadow-none group"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            <span>Quick search...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground border border-border rounded font-sans font-bold group-hover:bg-accent transition-colors">
            ctrl + k
          </kbd>
        </button>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 space-y-5 pb-4">

        {/* Main nav */}
        <section>
          <div className="px-2 py-1 mb-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Navigation</span>
          </div>
          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'sidebar-item text-muted-foreground hover:text-foreground hover:bg-accent',
                    isActive && 'sidebar-item-active text-primary-foreground bg-primary'
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
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
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
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Lists</span>
              <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform duration-150", isListsCollapsed && "-rotate-90")} />
            </div>
            <button
              onClick={() => {
                setIsListsCollapsed(false);
                setModalState({ isOpen: true, mode: 'create', type: 'category' });
              }}
              className="h-5 w-5 flex items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/50 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {!isListsCollapsed && (
            <>

              <nav className="space-y-0.5">
                {categoryLists.map((list) => {
                  const cat = categories.find((c) => String(c.id) === list.id);
                  const catId = cat?.id ?? -1;
                  const taskCount = tasks.filter((t) => t.categoryId === catId && t.status !== 2 && t.status !== 3).length;

                  return (
                    <div
                      key={list.id}
                      className="relative group/cat"
                    >
                      <NavLink
                        to={`/tasks/list/${list.id}`}
                        className={({ isActive }) =>
                          cn(
                            'sidebar-item text-muted-foreground hover:text-foreground hover:bg-accent group/cat pr-8',
                            isActive && 'sidebar-item-active text-primary-foreground bg-primary'
                          )
                        }
                      >
                        <div
                          className="h-2 w-2 rounded-full ring-1 ring-white/60 shrink-0"
                          style={{ backgroundColor: list.color || COLORS[catId % COLORS.length] }}
                        />
                        <span className="flex-1 truncate">{list.name}</span>
                      </NavLink>
                        
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-end shrink-0 z-10 opacity-0 group-hover/cat:opacity-100 focus-within:opacity-100 transition-opacity">
                        <DropdownMenu onOpenChange={(open) => setOpenDropdownId(open ? `cat-${catId}` : null)}>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors bg-background/50 backdrop-blur-sm"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 bg-popover border-border">
                            <DropdownMenuItem onClick={() => setModalState({ isOpen: true, mode: 'edit', type: 'category', initialData: { id: catId, name: list.name, color: cat?.color } })}>
                              <Edit2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteCategory(catId)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Task Count (Hidden when menu is open or hovered) */}
                      {taskCount > 0 && openDropdownId !== `cat-${catId}` && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-end shrink-0 z-0 pointer-events-none group-hover/cat:opacity-0 transition-opacity">
                          <span className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                            location.pathname.includes(list.id)
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            {taskCount}
                          </span>
                        </div>
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
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Tags</span>
              <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform duration-150", isTagsCollapsed && "-rotate-90")} />
            </div>
            <button
              onClick={() => {
                setIsTagsCollapsed(false);
                setModalState({ isOpen: true, mode: 'create', type: 'tag' });
              }}
              className="h-5 w-5 flex items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/50 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          {!isTagsCollapsed && (
            <>

              <nav className="space-y-0.5">
                {tags.map((tag) => {
                  const tagTaskCount = tasks.filter(
                    (t) => t.tags?.includes(tag.name) && t.status !== 2 && t.status !== 3
                  ).length;

                  return (
                    <div
                      key={tag.id}
                      className="relative group/tag"
                    >
                      <NavLink
                        to={`/tasks/tag/${tag.id}`}
                        className={({ isActive }) =>
                          cn(
                            'sidebar-item text-muted-foreground hover:text-foreground hover:bg-accent pr-8',
                            isActive && 'sidebar-item-active text-primary-foreground bg-primary'
                          )
                        }
                      >
                        <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" style={{ color: tag.color }} />
                        <span className="flex-1 truncate capitalize">{tag.name}</span>
                      </NavLink>
                        
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-end shrink-0 z-10 opacity-0 group-hover/tag:opacity-100 focus-within:opacity-100 transition-opacity">
                        <DropdownMenu onOpenChange={(open) => setOpenDropdownId(open ? `tag-${tag.id}` : null)}>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors bg-background/50 backdrop-blur-sm"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 bg-popover border-border">
                            <DropdownMenuItem onClick={() => setModalState({ isOpen: true, mode: 'edit', type: 'tag', initialData: { id: tag.id, name: tag.name, color: tag.color } })}>
                              <Edit2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteTag(tag.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {tagTaskCount > 0 && openDropdownId !== `tag-${tag.id}` && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-end shrink-0 z-0 pointer-events-none group-hover/tag:opacity-0 transition-opacity">
                          <span className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                            location.pathname.includes(String(tag.id))
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            {tagTaskCount}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </>
          )}
        </section>
      </div>

      <CategoryTagModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        mode={modalState.mode}
        type={modalState.type}
        initialData={modalState.initialData}
      />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </aside>
  );
}
