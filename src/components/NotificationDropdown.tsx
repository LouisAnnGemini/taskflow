import React from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { format, parseISO } from 'date-fns';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { Avatar } from './Avatar';
import { cn } from '../utils/cn';

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    clearNotifications,
    openTaskModal 
  } = useTaskStore();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (id: string, taskId?: string) => {
    markNotificationAsRead(id);
    if (taskId) {
      openTaskModal(taskId);
    }
    onClose();
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800">通知</h3>
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {notifications.length > 0 && (
            <button 
              onClick={markAllNotificationsAsRead}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="全部标记为已读"
            >
              <Check size={16} />
            </button>
          )}
          <button 
            onClick={clearNotifications}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="清空全部"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
              <Bell size={24} />
            </div>
            <p className="text-sm text-slate-500">暂无通知</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                onClick={() => handleNotificationClick(notification.id, notification.taskId)}
                className={cn(
                  "p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 relative group",
                  !notification.isRead && "bg-indigo-50/30"
                )}
              >
                {!notification.isRead && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-full" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={cn(
                      "text-sm font-semibold",
                      notification.isRead ? "text-slate-700" : "text-slate-900"
                    )}>
                      {notification.title}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {format(parseISO(notification.timestamp), 'MM月dd日, HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {notification.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
          <button 
            onClick={onClose}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}
