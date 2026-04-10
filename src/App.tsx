import React, { useState } from 'react';
import { QuickCapture } from './components/QuickCapture';
import { DashboardView } from './views/DashboardView';
import { KanbanView } from './views/KanbanView';
import { CalendarView } from './views/CalendarView';
import { SearchView } from './views/SearchView';
import { ModalStack } from './components/ModalStack';
import { SettingsView } from './views/SettingsView';
import { MemosView } from './views/MemosView';
import { Avatar } from './components/Avatar';
import { NotificationDropdown } from './components/NotificationDropdown';
import { ToastContainer, useToast } from './components/Toast';
import { LayoutDashboard, KanbanSquare, CalendarDays, Search, Settings, Bell, StickyNote, CloudUpload, Loader2, GitMerge, CheckCircle2, AlertCircle, CloudOff, Plus, X } from 'lucide-react';
import { useTaskStore } from './store/useTaskStore';
import { ProjectView } from './views/ProjectView';
import { QuickMemoWidget } from './components/QuickMemoWidget';

import { LifeWorkspace } from './views/LifeWorkspace';

type ViewType = 'dashboard' | 'kanban' | 'calendar' | 'memos' | 'search' | 'settings' | 'projects';

const NAV_ITEMS = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
  { id: 'kanban', label: '看板', icon: KanbanSquare },
  { id: 'projects', label: '项目', icon: GitMerge },
  { id: 'calendar', label: '日历', icon: CalendarDays },
  { id: 'memos', label: '备忘录', icon: StickyNote },
  { id: 'search', label: '搜索', icon: Search },
];

export default function App() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showMobileQuickCapture, setShowMobileQuickCapture] = useState(false);
  const { 
    currentUser, 
    notifications, 
    checkExpiringTasks,
    currentView,
    setCurrentView,
    navItemsConfig,
    systemMode,
    toggleSystemMode,
    syncStatus,
    isSyncEnabled,
    setSyncStatus
  } = useTaskStore();
  const { toasts, addToast } = useToast();

  const visibleNavItems = navItemsConfig
    .filter(config => config.isVisible)
    .map(config => NAV_ITEMS.find(item => item.id === config.id))
    .filter(Boolean) as typeof NAV_ITEMS;

  React.useEffect(() => {
    useTaskStore.getState().migrateMemos();
    checkExpiringTasks();

    const handleRemoteSync = (event: CustomEvent) => {
      const remoteState = event.detail;
      if (remoteState && remoteState.state) {
        // Zustand persist wraps the state in { state: { ... }, version: 0 }
        useTaskStore.setState(remoteState.state);
        addToast('云端数据已同步', 'success');
        setSyncStatus('synced');
      }
    };

    window.addEventListener('taskflow-remote-sync', handleRemoteSync as EventListener);
    
    // Save version every 30 minutes
    const interval = setInterval(() => {
      useTaskStore.getState().saveVersionToCloud();
    }, 30 * 60 * 1000);

    // Check if we need to save immediately on load (if > 30 mins since last save)
    const lastSync = useTaskStore.getState().lastCloudSyncTimestamp;
    if (!lastSync || Date.now() - lastSync > 30 * 60 * 1000) {
      useTaskStore.getState().saveVersionToCloud();
    }
    
    // Save version on browser close
    const handleBeforeUnload = () => {
      useTaskStore.getState().saveVersionToCloud();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('taskflow-remote-sync', handleRemoteSync as EventListener);
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [checkExpiringTasks, addToast, setSyncStatus]);

  React.useEffect(() => {
    if (!isSyncEnabled || syncStatus === 'syncing' || syncStatus === 'error') return;

    const checkSync = () => {
      const lastSync = useTaskStore.getState().lastCloudSyncTimestamp;
      const localUpdatedStr = localStorage.getItem('task-storage-updated-at');
      const localUpdated = localUpdatedStr ? new Date(localUpdatedStr).getTime() : 0;
      
      if (lastSync && localUpdated > lastSync) {
        if (syncStatus !== 'unsynced') setSyncStatus('unsynced');
      } else if (syncStatus === 'unsynced') {
        setSyncStatus('synced');
      }
    };

    const interval = setInterval(checkSync, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [isSyncEnabled, syncStatus, setSyncStatus]);

  const handleManualSync = async () => {
    if (!isSyncEnabled) return;
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      await useTaskStore.getState().saveVersionToCloud();
      addToast('同步成功', 'success');
      setSyncStatus('synced');
    } catch (error) {
      addToast('同步失败', 'error');
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'projects': return <ProjectView />;
      case 'kanban': return <KanbanView />;
      case 'calendar': return <CalendarView />;
      case 'memos': return <MemosView />;
      case 'search': return <SearchView />;
      case 'settings': return <SettingsView />;
      default: return <KanbanView />;
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'synced': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'syncing': return <Loader2 size={16} className="text-amber-500 animate-spin" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'disabled': return <CloudOff size={16} className="text-slate-400" />;
      case 'unsynced': return <CloudUpload size={16} className="text-amber-500" />;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'synced': return '已同步';
      case 'syncing': return '同步中...';
      case 'error': return '同步失败';
      case 'disabled': return '未开启';
      case 'unsynced': return '有未同步更改';
    }
  };

  if (systemMode === 'life') {
    return <LifeWorkspace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-20 md:pb-0 transition-colors duration-500">
      <ToastContainer toasts={toasts} />
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div 
                className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 transition-transform"
                onDoubleClick={toggleSystemMode}
                title="双击切换到生活模式"
              >
                <span className="text-white font-bold text-lg leading-none">T</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">TaskFlow</span>
            </div>
            
            <nav className="hidden md:flex space-x-1">
              {visibleNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as ViewType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentView === item.id
                      ? 'bg-slate-100 text-indigo-700'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon size={18} className={currentView === item.id ? 'text-indigo-600' : 'text-slate-400'} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                {getSyncStatusIcon()}
                {getSyncStatusText()}
              </div>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !isSyncEnabled}
              className="p-2 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              title="手动同步到云端"
            >
              {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <CloudUpload size={20} />}
            </button>
            <button 
              onClick={() => setCurrentView('settings')}
              className={`p-2 rounded-lg transition-colors ${
                currentView === 'settings' 
                  ? 'text-indigo-600 bg-slate-100' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="设置"
            >
              <Settings size={20} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg transition-colors relative ${
                  showNotifications 
                    ? 'text-indigo-600 bg-slate-100' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
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
      <main className={`flex-1 mx-auto w-full ${currentView === 'projects' ? 'px-0 py-0 md:px-6 md:py-8' : 'px-4 sm:px-6 lg:px-8 py-4 md:py-8'} ${currentView === 'kanban' || currentView === 'calendar' || currentView === 'projects' ? 'max-w-none' : 'max-w-7xl'}`}>
        {currentView !== 'search' && currentView !== 'calendar' && currentView !== 'projects' && currentView !== 'dashboard' && (
          <div className="hidden md:block max-w-7xl mx-auto w-full">
            <QuickCapture />
          </div>
        )}
        
        <div className={currentView === 'projects' ? 'mt-0 md:mt-8' : 'mt-4 md:mt-8'}>
          {renderView()}
        </div>
      </main>

      {/* Mobile FAB for Quick Capture */}
      <button
        onClick={() => setShowMobileQuickCapture(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-40"
      >
        <Plus size={24} />
      </button>

      {/* Mobile Quick Capture Modal */}
      {showMobileQuickCapture && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowMobileQuickCapture(false)} />
          <div className="relative bg-slate-50 rounded-t-2xl shadow-2xl p-4 pb-8 animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">快速记录</h3>
              <button onClick={() => setShowMobileQuickCapture(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div>
              <QuickCapture onCapture={() => setShowMobileQuickCapture(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-2 flex justify-around items-center safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {visibleNavItems.map((item) => (
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

      <QuickMemoWidget />
      <ModalStack />
    </div>
  );
}
