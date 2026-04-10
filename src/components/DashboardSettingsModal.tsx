import React, { useState } from 'react';
import { X, GripVertical, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { DashboardWidgetConfig } from '../types/task';
import { nanoid } from 'nanoid';

interface Props {
  onClose: () => void;
}

export function DashboardSettingsModal({ onClose }: Props) {
  const { dashboardWidgets, updateDashboardWidgets } = useTaskStore();
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(dashboardWidgets);
  
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);

  const { columns, priorities, users } = useTaskStore();

  const handleSave = () => {
    updateDashboardWidgets(widgets);
    onClose();
  };

  const toggleVisibility = (id: string) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, isVisible: !w.isVisible } : w));
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newWidgets = [...widgets];
      [newWidgets[index - 1], newWidgets[index]] = [newWidgets[index], newWidgets[index - 1]];
      newWidgets.forEach((w, i) => w.order = i);
      setWidgets(newWidgets);
    } else if (direction === 'down' && index < widgets.length - 1) {
      const newWidgets = [...widgets];
      [newWidgets[index + 1], newWidgets[index]] = [newWidgets[index], newWidgets[index + 1]];
      newWidgets.forEach((w, i) => w.order = i);
      setWidgets(newWidgets);
    }
  };

  const addCustomWidget = () => {
    const newWidget: DashboardWidgetConfig = {
      id: nanoid(),
      type: 'custom',
      title: '自定义视图',
      isVisible: true,
      order: widgets.length,
      filterRule: {}
    };
    setWidgets([...widgets, newWidget]);
    setEditingWidgetId(newWidget.id);
    setEditTitle(newWidget.title);
    setExpandedWidgetId(newWidget.id);
  };

  const deleteWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id).map((w, i) => ({ ...w, order: i })));
  };

  const saveEdit = (id: string) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, title: editTitle } : w));
    setEditingWidgetId(null);
  };

  const updateFilterRule = (id: string, ruleUpdates: Partial<DashboardWidgetConfig['filterRule']>) => {
    setWidgets(widgets.map(w => {
      if (w.id === id && w.type === 'custom') {
        return {
          ...w,
          filterRule: { ...w.filterRule, ...ruleUpdates }
        };
      }
      return w;
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">自定义仪表盘</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">调整模块顺序、可见性，或添加自定义模块。</p>
            <button onClick={addCustomWidget} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              <Plus size={16} /> 添加自定义
            </button>
          </div>

          <div className="space-y-2">
            {widgets.map((widget, index) => (
              <div key={widget.id} className="flex flex-col bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveWidget(index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-30">
                      <GripVertical size={14} className="rotate-90" />
                    </button>
                    <button onClick={() => moveWidget(index, 'down')} disabled={index === widgets.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-30">
                      <GripVertical size={14} className="rotate-90" />
                    </button>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {editingWidgetId === widget.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          autoFocus
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          onKeyDown={e => e.key === 'Enter' && saveEdit(widget.id)}
                        />
                        <button onClick={() => saveEdit(widget.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700 truncate">{widget.title}</span>
                        {widget.type === 'custom' && (
                          <button onClick={() => { setEditingWidgetId(widget.id); setEditTitle(widget.title); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded">
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{widget.type === 'custom' ? '自定义规则' : '系统内置'}</span>
                      {widget.type === 'custom' && (
                        <button 
                          onClick={() => setExpandedWidgetId(expandedWidgetId === widget.id ? null : widget.id)}
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          {expandedWidgetId === widget.id ? '收起配置' : '配置规则'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={widget.isVisible}
                        onChange={() => toggleVisibility(widget.id)}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    
                    {widget.type === 'custom' && (
                      <button onClick={() => deleteWidget(widget.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {widget.type === 'custom' && expandedWidgetId === widget.id && (
                  <div className="p-4 bg-white border-t border-slate-100 space-y-4 text-sm">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">状态过滤</label>
                      <div className="flex flex-wrap gap-2">
                        {columns.map(col => (
                          <label key={col.id} className="flex items-center gap-1">
                            <input 
                              type="checkbox"
                              checked={widget.filterRule?.state?.includes(col.id) || false}
                              onChange={(e) => {
                                const currentState = widget.filterRule?.state || [];
                                const newState = e.target.checked 
                                  ? [...currentState, col.id]
                                  : currentState.filter(id => id !== col.id);
                                updateFilterRule(widget.id, { state: newState });
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-slate-700">{col.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">优先级过滤</label>
                      <div className="flex flex-wrap gap-2">
                        {priorities.map(p => (
                          <label key={p.id} className="flex items-center gap-1">
                            <input 
                              type="checkbox"
                              checked={widget.filterRule?.priority?.includes(p.id) || false}
                              onChange={(e) => {
                                const currentPriority = widget.filterRule?.priority || [];
                                const newPriority = e.target.checked 
                                  ? [...currentPriority, p.id]
                                  : currentPriority.filter(id => id !== p.id);
                                updateFilterRule(widget.id, { priority: newPriority });
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-slate-700">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">负责人过滤</label>
                      <div className="flex flex-wrap gap-2">
                        {users.map(u => (
                          <label key={u.id} className="flex items-center gap-1">
                            <input 
                              type="checkbox"
                              checked={widget.filterRule?.assigneeIds?.includes(u.id) || false}
                              onChange={(e) => {
                                const currentAssignees = widget.filterRule?.assigneeIds || [];
                                const newAssignees = e.target.checked 
                                  ? [...currentAssignees, u.id]
                                  : currentAssignees.filter(id => id !== u.id);
                                updateFilterRule(widget.id, { assigneeIds: newAssignees });
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-slate-700">{u.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          checked={widget.filterRule?.isOverdue || false}
                          onChange={(e) => updateFilterRule(widget.id, { isOverdue: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-slate-700 font-medium">仅显示已逾期</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 font-medium">截止日期在</span>
                        <input 
                          type="number"
                          min="0"
                          value={widget.filterRule?.daysToDue ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                            updateFilterRule(widget.id, { daysToDue: val });
                          }}
                          className="w-16 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="天数"
                        />
                        <span className="text-slate-700 font-medium">天内</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors">
            取消
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors">
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
