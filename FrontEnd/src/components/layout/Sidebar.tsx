import * as React from 'react';
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
  User as UserIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';
import { useTaskStore } from '../../store/useTaskStore';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { ProfileModal } from '@/features/profile/components/ProfileModal';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { lists } = useTaskStore();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const navItems = [
    { icon: Inbox, label: 'Inbox', path: '/tasks/inbox', count: 12 },
    { icon: Calendar, label: 'Today', path: '/tasks/today', count: 5 },
    { icon: CalendarDays, label: 'Upcoming', path: '/tasks/upcoming' },
    { icon: Target, label: 'Focus Mode', path: '/focus' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  ];

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-screen sticky top-0 text-slate-600 select-none">
      
      {/* User Session */}
      <div className="relative" ref={dropdownRef}>
        <div 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            "m-4 p-3 bg-white rounded-2xl border flex items-center justify-between group cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all",
            isDropdownOpen ? "border-blue-300 ring-4 ring-blue-50" : "border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 ring-2 ring-white">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 leading-none truncate">{user?.name}</span>
              <span className="text-[10px] text-slate-400 capitalize leading-none mt-1 font-bold tracking-wider">
                {user?.plan} Plan
              </span>
            </div>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-slate-300 group-hover:text-slate-400 transition-transform duration-200",
            isDropdownOpen && "rotate-180 text-blue-500"
          )} />
        </div>

        {/* Floating Premium Popover Menu */}
        {isDropdownOpen && (
          <div className="absolute top-[80px] left-4 right-4 z-40 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/80 p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-top-3 duration-200">
            <button
              onClick={() => {
                setIsProfileOpen(true);
                setIsDropdownOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors w-full text-left"
            >
              <UserIcon className="h-4 w-4 text-slate-400" />
              Profile Settings
            </button>
            
            <Separator className="bg-slate-100 my-0.5" />
            
            <button
              onClick={() => {
                logout();
                setIsDropdownOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        )}
      </div>

      {/* Search Trigger */}
      <div className="px-4 py-2 mb-2">
        <button className="flex items-center justify-between w-full px-3 py-2 bg-white border border-slate-200 hover:border-blue-200 rounded-xl text-slate-400 text-xs transition-all group shadow-sm">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <span className="font-semibold">Quick search...</span>
          </div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-6">
        {/* Main Nav */}
        <section>
          <div className="px-3 py-1 mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Application</span>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "sidebar-item text-slate-500 hover:text-slate-900 hover:bg-white",
                  isActive && "sidebar-item-active text-white bg-blue-600"
                )}
              >
                <item.icon className={cn("h-4 w-4", !item.path.includes(location.pathname) && item.label === 'Focus Mode' && 'text-blue-600')} />
                <span className="flex-1">{item.label}</span>
                {item.count !== undefined && (
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors",
                    location.pathname === item.path ? "bg-blue-700/50 text-white" : "bg-slate-100 text-slate-400"
                  )}>{item.count}</span>
                )}
              </NavLink>
            ))}
          </nav>
        </section>

        {/* Lists */}
        <section>
          <div className="px-3 py-1 flex items-center justify-between group mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Workspace</span>
            <Button variant="ghost" size="icon" className="h-5 w-5 bg-white hover:bg-slate-100 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 border border-slate-200">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <nav className="space-y-1">
            {lists.filter(l => !['inbox', 'today', 'upcoming'].includes(l.id)).map((list) => (
              <NavLink
                key={list.id}
                to={`/tasks/list/${list.id}`}
                className={({ isActive }) => cn(
                  "sidebar-item text-slate-500 hover:text-slate-900 hover:bg-white",
                  isActive && "sidebar-item-active text-white bg-blue-600"
                )}
              >
                <div 
                  className="h-2 w-2 rounded-full ring-2 ring-white shrink-0" 
                  style={{ backgroundColor: list.color || '#64748b' }} 
                />
                <span className="flex-1 truncate font-semibold">{list.name}</span>
              </NavLink>
            ))}
          </nav>
        </section>

        {/* Tags */}
        <section>
          <div className="px-3 py-1 flex items-center justify-between group mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Labels</span>
            <ChevronDown className="h-3 w-3 text-slate-300" />
          </div>
          <nav className="space-y-1">
            {['marketing', 'research', 'design', 'urgent'].map((tag) => (
              <NavLink
                key={tag}
                to={`/tasks/tag/${tag}`}
                className="sidebar-item text-slate-500 hover:text-slate-900 hover:bg-white"
              >
                <Hash className="h-4 w-4 text-slate-300" />
                <span className="flex-1 truncate capitalize font-semibold">{tag}</span>
              </NavLink>
            ))}
          </nav>
        </section>
      </div>

      {/* Render ProfileModal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </aside>
  );
}
