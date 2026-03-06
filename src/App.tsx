import React, { useState } from 'react';
import { QuickCapture } from './components/QuickCapture';
import { DashboardView } from './views/DashboardView';
import { KanbanView } from './views/KanbanView';
import { CalendarView } from './views/CalendarView';
import { SearchView } from './views/SearchView';
import { TaskModal } from './components/TaskModal';
import { SettingsView } from './views/SettingsView';
import { MemosView } from './views/MemosView';
import { Avatar } from './components/Avatar';
import { NotificationDropdown } from './components/NotificationDropdown';
import { LayoutDashboard, KanbanSquare, CalendarDays, Search, Settings, Bell, StickyNote } from 'lucide-react';
import { useTaskStore } from './store/useTaskStore';

type ViewType = 'dashboard' | 'kanban' | 'calendar' | 'memos' | 'search' | 'settings';

const NAV_ITEMS = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
  { id: 'kanban', label: '看板', icon: KanbanSquare },
  { id: 'calendar', label: '日历', icon: CalendarDays },
  { id: 'memos', label: '备忘录', icon: StickyNote },
  { id: 'search', label: '搜索', icon: Search },
];

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const [showNotifications, setShowNotifications] = useState(false);
  const { currentUser, selectedTaskId, setSelectedTaskId, notifications, checkExpiringTasks } = useTaskStore();

  React.useEffect(() => {
    checkExpiringTasks();
  }, [checkExpiringTasks]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'kanban': return <KanbanView />;
      case 'calendar': return <CalendarView />;
      case 'memos': return <MemosView />;
      case 'search': return <SearchView />;
      case 'settings': return <SettingsView />;
      default: return <KanbanView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-20 md:pb-0">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg leading-none">T</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">TaskFlow</span>
            </div>
            
            <nav className="hidden md:flex space-x-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as ViewType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentView === item.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <item.icon size={18} className={currentView === item.id ? 'text-indigo-600' : 'text-slate-400'} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentView('settings')}
              className={`p-2 rounded-full transition-colors ${
                currentView === 'settings' 
                  ? 'text-indigo-600 bg-indigo-50' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="设置"
            >
              <Settings size={20} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-full transition-colors relative ${
                  showNotifications 
                    ? 'text-indigo-600 bg-indigo-50' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              
              {showNotifications && (
                <NotificationDropdown onClose={() => setShowNotifications(false)} />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 md:py-8 ${currentView === 'kanban' || currentView === 'calendar' ? 'max-w-none' : 'max-w-7xl'}`}>
        {currentView !== 'search' && currentView !== 'calendar' && (
          <div className="max-w-7xl mx-auto w-full">
            <QuickCapture />
          </div>
        )}
        
        <div className="mt-4 md:mt-8">
          {renderView()}
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-2 flex justify-around items-center safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id as ViewType)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-full ${
              currentView === item.id
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <item.icon size={24} className={currentView === item.id ? 'text-indigo-600' : 'text-slate-400'} strokeWidth={currentView === item.id ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${currentView === item.id ? 'text-indigo-600' : 'text-slate-500'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {selectedTaskId && (
        <TaskModal 
          taskId={selectedTaskId} 
          onClose={() => setSelectedTaskId(null)} 
        />
      )}
    </div>
  );
}
