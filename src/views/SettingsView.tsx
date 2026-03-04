import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { User, Column, PriorityOption, MediumOption, CustomFieldDefinition, CustomFieldType, FieldConfig } from '../types/task';
import { Plus, Trash2, Edit2, Save, X, Smile, Download, Upload, Eye, EyeOff, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { nanoid } from 'nanoid';

const COMMON_EMOJIS = ['📝', '🚀', '👀', '✅', '⏸️', '🔽', '⏺️', '🔼', '🔥', '💬', '📧', '💼', '📍', '📌', '💡', '🐛', '📅', '📎', '⭐', '⚡'];

function IconPicker({ value, onChange }: { value?: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-lg hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500"
      >
        {value || <Smile size={18} className="text-slate-400" />}
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-12 left-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-64">
            <div className="mb-2">
              <input 
                type="text" 
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="输入 Emoji 或文本..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs font-medium text-slate-500 mb-2">常用图标</div>
            <div className="grid grid-cols-5 gap-1">
              {COMMON_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onChange(emoji);
                    setIsOpen(false);
                  }}
                  className="w-10 h-10 flex items-center justify-center text-lg hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function SettingsView() {
  const { 
    users, columns, priorities, mediums,
    addUser, updateUser, deleteUser, 
    addColumn, updateColumn, deleteColumn,
    addPriority, updatePriority, deletePriority,
    addMedium, updateMedium, deleteMedium,
    customFieldDefinitions, addCustomFieldDefinition, updateCustomFieldDefinition, deleteCustomFieldDefinition,
    fieldOrder, setFieldOrder,
    setAllData
  } = useTaskStore();
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<Partial<User>>({});
  
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnForm, setEditColumnForm] = useState<Partial<Column>>({});

  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [editPriorityForm, setEditPriorityForm] = useState<Partial<PriorityOption>>({});

  const [editingMediumId, setEditingMediumId] = useState<string | null>(null);
  const [editMediumForm, setEditMediumForm] = useState<Partial<MediumOption>>({});

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldForm, setEditFieldForm] = useState<Partial<CustomFieldDefinition>>({});

  const handleSaveUser = (id: string) => {
    if (id === 'new') {
      addUser({
        id: nanoid(),
        name: editUserForm.name || '新用户',
      });
    } else {
      updateUser(id, editUserForm);
    }
    setEditingUserId(null);
  };

  const handleSaveColumn = (id: string) => {
    if (id === 'new') {
      addColumn({
        id: editColumnForm.id || nanoid(),
        title: editColumnForm.title || '新列',
        color: editColumnForm.color || 'bg-slate-100',
        icon: editColumnForm.icon,
        isHidden: editColumnForm.isHidden || false,
      });
    } else {
      updateColumn(id, editColumnForm);
    }
    setEditingColumnId(null);
  };

  const handleSavePriority = (id: string) => {
    if (id === 'new') {
      addPriority({
        id: editPriorityForm.id || nanoid(),
        label: editPriorityForm.label || '新优先级',
        color: editPriorityForm.color || 'bg-slate-100 text-slate-700',
        icon: editPriorityForm.icon,
      });
    } else {
      updatePriority(id, editPriorityForm);
    }
    setEditingPriorityId(null);
  };

  const handleSaveMedium = (id: string) => {
    if (id === 'new') {
      addMedium({
        id: editMediumForm.id || nanoid(),
        label: editMediumForm.label || '新媒介',
        icon: editMediumForm.icon,
      });
    } else {
      updateMedium(id, editMediumForm);
    }
    setEditingMediumId(null);
  };

  const handleSaveField = (id: string) => {
    if (id === 'new') {
      const fieldId = nanoid();
      addCustomFieldDefinition({
        id: fieldId,
        name: editFieldForm.name || '新字段',
        type: editFieldForm.type || 'text',
        options: editFieldForm.options || [],
      });
    } else {
      updateCustomFieldDefinition(id, editFieldForm);
    }
    setEditingFieldId(null);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...fieldOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setFieldOrder(newOrder);
  };

  const toggleFieldVisibility = (id: string) => {
    const newOrder = fieldOrder.map(f => 
      f.id === id ? { ...f, isVisible: !f.isVisible } : f
    );
    setFieldOrder(newOrder);
  };

  const moveOption = (fieldId: string, optionIndex: number, direction: 'up' | 'down') => {
    const field = customFieldDefinitions.find(f => f.id === fieldId);
    if (!field || !field.options) return;

    const newOptions = [...field.options];
    const targetIndex = direction === 'up' ? optionIndex - 1 : optionIndex + 1;
    if (targetIndex < 0 || targetIndex >= newOptions.length) return;

    [newOptions[optionIndex], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[optionIndex]];
    updateCustomFieldDefinition(fieldId, { options: newOptions });
  };

  const moveTempOption = (optionIndex: number, direction: 'up' | 'down') => {
    if (!editFieldForm.options) return;
    const newOptions = [...editFieldForm.options];
    const targetIndex = direction === 'up' ? optionIndex - 1 : optionIndex + 1;
    if (targetIndex < 0 || targetIndex >= newOptions.length) return;

    [newOptions[optionIndex], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[optionIndex]];
    setEditFieldForm({ ...editFieldForm, options: newOptions });
  };

  const handleExport = () => {
    const state = useTaskStore.getState();
    const data = {
      tasks: state.tasks,
      users: state.users,
      columns: state.columns,
      priorities: state.priorities,
      mediums: state.mediums,
      currentUser: state.currentUser,
      activityLogs: state.activityLogs,
      notifications: state.notifications,
      customFieldDefinitions: state.customFieldDefinitions,
      fieldOrder: state.fieldOrder,
      memos: state.memos,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('导入数据将覆盖当前所有数据，确定要继续吗？')) {
          setAllData(data);
          alert('数据导入成功！');
        }
      } catch (error) {
        alert('导入失败：无效的 JSON 文件');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-12">
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">团队成员</h2>
          <button 
            onClick={() => {
              setEditingUserId('new');
              setEditUserForm({ name: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} /> 添加成员
          </button>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {users.map(user => (
              <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                {editingUserId === user.id ? (
                  <div className="flex-1 flex items-center gap-4">
                    <input 
                      type="text" 
                      value={editUserForm.name || ''} 
                      onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="姓名"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSaveUser(user.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                      <button onClick={() => setEditingUserId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <Avatar name={user.name} className="w-10 h-10 border border-slate-200 text-lg" />
                      <span className="font-medium text-slate-700">{user.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingUserId(user.id);
                          setEditUserForm(user);
                        }} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('确定要删除这个用户吗？')) deleteUser(user.id);
                        }} 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {editingUserId === 'new' && (
              <div className="p-4 flex items-center gap-4 bg-indigo-50/50">
                <input 
                  type="text" 
                  value={editUserForm.name || ''} 
                  onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="新用户姓名"
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSaveUser('new')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                  <button onClick={() => setEditingUserId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">看板列设置</h2>
          <button 
            onClick={() => {
              setEditingColumnId('new');
              setEditColumnForm({ id: '', title: '', color: 'bg-slate-100', icon: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} /> 添加列
          </button>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {columns.map(column => (
              <div key={column.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                {editingColumnId === column.id ? (
                  <div className="flex-1 flex items-center gap-4">
                    <IconPicker 
                      value={editColumnForm.icon} 
                      onChange={(val) => setEditColumnForm({ ...editColumnForm, icon: val })} 
                    />
                    <input 
                      type="text" 
                      value={editColumnForm.id || ''} 
                      onChange={e => setEditColumnForm({ ...editColumnForm, id: e.target.value })}
                      className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="ID (例如 todo)"
                      disabled={column.id !== 'new'}
                    />
                    <input 
                      type="text" 
                      value={editColumnForm.title || ''} 
                      onChange={e => setEditColumnForm({ ...editColumnForm, title: e.target.value })}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="标题"
                    />
                    <div className="flex items-center gap-2 px-2">
                      <button
                        type="button"
                        onClick={() => setEditColumnForm({ ...editColumnForm, isHidden: !editColumnForm.isHidden })}
                        className={`p-2 rounded-lg transition-colors ${editColumnForm.isHidden ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}
                        title={editColumnForm.isHidden ? '已隐藏' : '显示中'}
                      >
                        {editColumnForm.isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={editColumnForm.color || ''} 
                      onChange={e => setEditColumnForm({ ...editColumnForm, color: e.target.value })}
                      className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="颜色类名"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSaveColumn(column.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                      <button onClick={() => setEditingColumnId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      {column.icon && <span className="text-lg">{column.icon}</span>}
                      <div className={`w-4 h-4 rounded-full ${column.color} border border-slate-200`}></div>
                      <span className={`font-medium ${column.isHidden ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {column.title}
                      </span>
                      {column.isHidden && (
                        <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium uppercase">
                          <EyeOff size={10} /> 已隐藏
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">ID: {column.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingColumnId(column.id);
                          setEditColumnForm(column);
                        }} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('确定要删除这一列吗？该列中的任务可能无法正常显示。')) deleteColumn(column.id);
                        }} 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {editingColumnId === 'new' && (
              <div className="p-4 flex items-center gap-4 bg-indigo-50/50">
                <IconPicker 
                  value={editColumnForm.icon} 
                  onChange={(val) => setEditColumnForm({ ...editColumnForm, icon: val })} 
                />
                <input 
                  type="text" 
                  value={editColumnForm.id || ''} 
                  onChange={e => setEditColumnForm({ ...editColumnForm, id: e.target.value })}
                  className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="ID (例如 new_col)"
                />
                <input 
                  type="text" 
                  value={editColumnForm.title || ''} 
                  onChange={e => setEditColumnForm({ ...editColumnForm, title: e.target.value })}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="列标题"
                />
                <div className="flex items-center gap-2 px-2">
                  <button
                    type="button"
                    onClick={() => setEditColumnForm({ ...editColumnForm, isHidden: !editColumnForm.isHidden })}
                    className={`p-2 rounded-lg transition-colors ${editColumnForm.isHidden ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}
                    title={editColumnForm.isHidden ? '已隐藏' : '显示中'}
                  >
                    {editColumnForm.isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <input 
                  type="text" 
                  value={editColumnForm.color || ''} 
                  onChange={e => setEditColumnForm({ ...editColumnForm, color: e.target.value })}
                  className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="颜色 (例如 bg-red-50)"
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSaveColumn('new')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                  <button onClick={() => setEditingColumnId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Priorities Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">优先级设置</h2>
          <button 
            onClick={() => {
              setEditingPriorityId('new');
              setEditPriorityForm({ id: '', label: '', color: 'bg-slate-100 text-slate-700', icon: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} /> 添加优先级
          </button>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {priorities.map(priority => (
              <div key={priority.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                {editingPriorityId === priority.id ? (
                  <div className="flex-1 flex items-center gap-4">
                    <IconPicker 
                      value={editPriorityForm.icon} 
                      onChange={(val) => setEditPriorityForm({ ...editPriorityForm, icon: val })} 
                    />
                    <input 
                      type="text" 
                      value={editPriorityForm.id || ''} 
                      onChange={e => setEditPriorityForm({ ...editPriorityForm, id: e.target.value })}
                      className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="ID"
                      disabled={priority.id !== 'new'}
                    />
                    <input 
                      type="text" 
                      value={editPriorityForm.label || ''} 
                      onChange={e => setEditPriorityForm({ ...editPriorityForm, label: e.target.value })}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="标签"
                    />
                    <input 
                      type="text" 
                      value={editPriorityForm.color || ''} 
                      onChange={e => setEditPriorityForm({ ...editPriorityForm, color: e.target.value })}
                      className="w-48 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="颜色类名"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSavePriority(priority.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                      <button onClick={() => setEditingPriorityId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      {priority.icon && <span className="text-lg">{priority.icon}</span>}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${priority.color}`}>{priority.label}</span>
                      <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">ID: {priority.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingPriorityId(priority.id);
                          setEditPriorityForm(priority);
                        }} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('确定要删除这个优先级吗？')) deletePriority(priority.id);
                        }} 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {editingPriorityId === 'new' && (
              <div className="p-4 flex items-center gap-4 bg-indigo-50/50">
                <IconPicker 
                  value={editPriorityForm.icon} 
                  onChange={(val) => setEditPriorityForm({ ...editPriorityForm, icon: val })} 
                />
                <input 
                  type="text" 
                  value={editPriorityForm.id || ''} 
                  onChange={e => setEditPriorityForm({ ...editPriorityForm, id: e.target.value })}
                  className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="ID"
                />
                <input 
                  type="text" 
                  value={editPriorityForm.label || ''} 
                  onChange={e => setEditPriorityForm({ ...editPriorityForm, label: e.target.value })}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="标签"
                />
                <input 
                  type="text" 
                  value={editPriorityForm.color || ''} 
                  onChange={e => setEditPriorityForm({ ...editPriorityForm, color: e.target.value })}
                  className="w-48 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="颜色类名"
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSavePriority('new')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                  <button onClick={() => setEditingPriorityId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mediums Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">媒介标签设置</h2>
          <button 
            onClick={() => {
              setEditingMediumId('new');
              setEditMediumForm({ id: '', label: '', icon: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} /> 添加媒介标签
          </button>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {mediums.map(medium => (
              <div key={medium.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                {editingMediumId === medium.id ? (
                  <div className="flex-1 flex items-center gap-4">
                    <IconPicker 
                      value={editMediumForm.icon} 
                      onChange={(val) => setEditMediumForm({ ...editMediumForm, icon: val })} 
                    />
                    <input 
                      type="text" 
                      value={editMediumForm.id || ''} 
                      onChange={e => setEditMediumForm({ ...editMediumForm, id: e.target.value })}
                      className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="ID"
                      disabled={medium.id !== 'new'}
                    />
                    <input 
                      type="text" 
                      value={editMediumForm.label || ''} 
                      onChange={e => setEditMediumForm({ ...editMediumForm, label: e.target.value })}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="标签"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSaveMedium(medium.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                      <button onClick={() => setEditingMediumId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      {medium.icon && <span className="text-lg">{medium.icon}</span>}
                      <span className="font-medium text-slate-700">{medium.label}</span>
                      <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">ID: {medium.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingMediumId(medium.id);
                          setEditMediumForm(medium);
                        }} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('确定要删除这个媒介标签吗？')) deleteMedium(medium.id);
                        }} 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {editingMediumId === 'new' && (
              <div className="p-4 flex items-center gap-4 bg-indigo-50/50">
                <IconPicker 
                  value={editMediumForm.icon} 
                  onChange={(val) => setEditMediumForm({ ...editMediumForm, icon: val })} 
                />
                <input 
                  type="text" 
                  value={editMediumForm.id || ''} 
                  onChange={e => setEditMediumForm({ ...editMediumForm, id: e.target.value })}
                  className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="ID"
                />
                <input 
                  type="text" 
                  value={editMediumForm.label || ''} 
                  onChange={e => setEditMediumForm({ ...editMediumForm, label: e.target.value })}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="标签"
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSaveMedium('new')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                  <button onClick={() => setEditingMediumId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Custom Fields Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">自定义字段</h2>
          <button 
            onClick={() => {
              setEditingFieldId('new');
              setEditFieldForm({ name: '', type: 'text', options: [] });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} /> 添加字段
          </button>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {customFieldDefinitions.map(field => (
              <div key={field.id} className="p-4 flex flex-col gap-4 hover:bg-slate-50 transition-colors">
                {editingFieldId === field.id ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <input 
                        type="text" 
                        value={editFieldForm.name || ''} 
                        onChange={e => setEditFieldForm({ ...editFieldForm, name: e.target.value })}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="字段名称"
                      />
                      <select
                        value={editFieldForm.type || 'text'}
                        onChange={e => setEditFieldForm({ ...editFieldForm, type: e.target.value as CustomFieldType })}
                        className="w-40 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="text">文本</option>
                        <option value="number">数字</option>
                        <option value="date">日期</option>
                        <option value="select">单选</option>
                        <option value="multi-select">多选</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleSaveField(field.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                        <button onClick={() => setEditingFieldId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                      </div>
                    </div>
                    
                    {(editFieldForm.type === 'select' || editFieldForm.type === 'multi-select') && (
                      <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                        <label className="text-xs font-semibold text-slate-500 uppercase">选项 (可排序)</label>
                        <div className="flex flex-wrap gap-2">
                          {editFieldForm.options?.map((opt, idx) => (
                            <div key={opt.id} className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-1">
                              <div className="flex flex-col">
                                <button 
                                  onClick={() => moveTempOption(idx, 'up')}
                                  disabled={idx === 0}
                                  className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                                >
                                  <ChevronUp size={10} />
                                </button>
                                <button 
                                  onClick={() => moveTempOption(idx, 'down')}
                                  disabled={idx === (editFieldForm.options?.length || 0) - 1}
                                  className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                                >
                                  <ChevronDown size={10} />
                                </button>
                              </div>
                              <input 
                                type="text" 
                                value={opt.label}
                                onChange={(e) => {
                                  const newOpts = [...(editFieldForm.options || [])];
                                  newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                                  setEditFieldForm({ ...editFieldForm, options: newOpts });
                                }}
                                className="border-none p-0 text-xs focus:ring-0 w-20"
                              />
                              <button 
                                onClick={() => {
                                  const newOpts = (editFieldForm.options || []).filter((_, i) => i !== idx);
                                  setEditFieldForm({ ...editFieldForm, options: newOpts });
                                }}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newOpts = [...(editFieldForm.options || []), { id: nanoid(), label: '新选项' }];
                              setEditFieldForm({ ...editFieldForm, options: newOpts });
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 px-2 py-1"
                          >
                            <Plus size={14} /> 添加选项
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-slate-700">{field.name}</span>
                      <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                        {field.type === 'text' && '文本'}
                        {field.type === 'number' && '数字'}
                        {field.type === 'date' && '日期'}
                        {field.type === 'select' && '单选'}
                        {field.type === 'multi-select' && '多选'}
                      </span>
                      {(field.type === 'select' || field.type === 'multi-select') && (
                        <div className="flex gap-1">
                          {field.options.map((opt, idx) => (
                            <div key={opt.id} className="flex items-center gap-0.5 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              <span className="text-[10px]">{opt.label}</span>
                              <div className="flex flex-col">
                                <button 
                                  onClick={() => moveOption(field.id, idx, 'up')}
                                  disabled={idx === 0}
                                  className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                                >
                                  <ChevronUp size={8} />
                                </button>
                                <button 
                                  onClick={() => moveOption(field.id, idx, 'down')}
                                  disabled={idx === field.options.length - 1}
                                  className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                                >
                                  <ChevronDown size={8} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingFieldId(field.id);
                          setEditFieldForm(field);
                        }} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('确定要删除这个自定义字段吗？')) deleteCustomFieldDefinition(field.id);
                        }} 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {editingFieldId === 'new' && (
              <div className="p-4 bg-indigo-50/50 space-y-4">
                <div className="flex items-center gap-4">
                  <input 
                    type="text" 
                    value={editFieldForm.name || ''} 
                    onChange={e => setEditFieldForm({ ...editFieldForm, name: e.target.value })}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="新字段名称"
                  />
                  <select
                    value={editFieldForm.type || 'text'}
                    onChange={e => setEditFieldForm({ ...editFieldForm, type: e.target.value as CustomFieldType })}
                    className="w-40 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="text">文本</option>
                    <option value="number">数字</option>
                    <option value="date">日期</option>
                    <option value="select">单选</option>
                    <option value="multi-select">多选</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSaveField('new')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                    <button onClick={() => setEditingFieldId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                  </div>
                </div>
                
                {(editFieldForm.type === 'select' || editFieldForm.type === 'multi-select') && (
                  <div className="space-y-2 pl-4 border-l-2 border-indigo-200">
                    <label className="text-xs font-semibold text-indigo-600 uppercase">选项</label>
                    <div className="flex flex-wrap gap-2">
                      {editFieldForm.options?.map((opt, idx) => (
                        <div key={opt.id} className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-1">
                          <input 
                            type="text" 
                            value={opt.label}
                            onChange={(e) => {
                              const newOpts = [...(editFieldForm.options || [])];
                              newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                              setEditFieldForm({ ...editFieldForm, options: newOpts });
                            }}
                            className="border-none p-0 text-xs focus:ring-0 w-20"
                          />
                          <button 
                            onClick={() => {
                              const newOpts = (editFieldForm.options || []).filter((_, i) => i !== idx);
                              setEditFieldForm({ ...editFieldForm, options: newOpts });
                            }}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const newOpts = [...(editFieldForm.options || []), { id: nanoid(), label: '新选项' }];
                          setEditFieldForm({ ...editFieldForm, options: newOpts });
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 px-2 py-1"
                      >
                        <Plus size={14} /> 添加选项
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Field Order Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">字段排序与显示</h2>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {fieldOrder.map((field, index) => (
              <div key={field.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button 
                      onClick={() => moveField(index, 'down')}
                      disabled={index === fieldOrder.length - 1}
                      className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <GripVertical size={18} className="text-slate-300" />
                  <div>
                    <span className="font-medium text-slate-700">{field.name}</span>
                    {field.isCustom && (
                      <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium uppercase">自定义</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleFieldVisibility(field.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    field.isVisible
                      ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                      : 'text-slate-400 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {field.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                  {field.isVisible ? '显示' : '隐藏'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Management Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">数据管理</h2>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              <Download size={18} /> 导出数据 (JSON)
            </button>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium w-full"
              >
                <Upload size={18} /> 导入数据 (JSON)
              </button>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            您可以导出所有数据进行备份，或者导入之前备份的数据。导入数据将覆盖当前的所有数据，请谨慎操作。
          </p>
        </div>
      </section>
    </div>
  );
}
