import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useTaskStore } from '../store/useTaskStore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { User, Column, PriorityOption, MediumOption, CustomFieldDefinition, CustomFieldType, FieldConfig } from '../types/task';
import { Plus, Trash2, Edit2, Save, X, Smile, Download, Upload, Eye, EyeOff, GripVertical, ChevronUp, ChevronDown, Check, Search, Loader2 } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { MultiSelect } from '../components/MultiSelect';
import { nanoid } from 'nanoid';
import { getSupabaseClient } from '../lib/supabase';

const COMMON_EMOJIS = ['📝', '🚀', '👀', '✅', '⏸️', '🔽', '⏺️', '🔼', '🔥', '💬', '📧', '💼', '📍', '📌', '💡', '🐛', '📅', '📎', '⭐', '⚡'];

function IconPicker({ value, onChange }: { value?: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, left: rect.left });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-lg hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500"
      >
        {value || <Smile size={18} className="text-slate-400" />}
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="fixed z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-64" style={{ top: position.top, left: position.left }}>
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
    users, columns, priorities, mediums, entities, positions,
    addUser, updateUser, deleteUser, 
    addColumn, updateColumn, deleteColumn,
    addPriority, updatePriority, deletePriority,
    addMedium, updateMedium, deleteMedium, setMediums,
    addEntity, updateEntity, deleteEntity,
    addPosition, updatePosition, deletePosition,
    customFieldDefinitions, addCustomFieldDefinition, updateCustomFieldDefinition, deleteCustomFieldDefinition,
    fieldOrder, setFieldOrder,
    setAllData,
    fetchVersions, restoreVersion
  } = useTaskStore();

  useEffect(() => {
    if (!fieldOrder.find(f => f.id === 'project-info')) {
      setFieldOrder([...fieldOrder, { id: 'project-info', name: '项目信息', isCustom: false, isVisible: true }]);
    }
  }, [fieldOrder, setFieldOrder]);
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<Partial<User>>({});
  
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnForm, setEditColumnForm] = useState<Partial<Column>>({});

  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [editPriorityForm, setEditPriorityForm] = useState<Partial<PriorityOption>>({});

  const [editingMediumId, setEditingMediumId] = useState<string | null>(null);
  const [editMediumForm, setEditMediumForm] = useState<Partial<MediumOption>>({});

  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editEntityForm, setEditEntityForm] = useState<{ name?: string }>({});

  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<string | null>(null);

  const handleRestoreVersion = (versionId: string) => {
    setVersionToRestore(versionId);
    setIsRestoreModalOpen(true);
  };

  const confirmRestoreVersion = async () => {
    if (!versionToRestore) return;
    await restoreVersion(versionToRestore);
    showMessage('版本还原成功！');
    setIsRestoreModalOpen(false);
    setVersionToRestore(null);
  };

  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editPositionForm, setEditPositionForm] = useState<{ name?: string }>({});

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldForm, setEditFieldForm] = useState<Partial<CustomFieldDefinition>>({});

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);
  const [deletingPriorityId, setDeletingPriorityId] = useState<string | null>(null);
  const [deletingMediumId, setDeletingMediumId] = useState<string | null>(null);
  const [deletingEntityId, setDeletingEntityId] = useState<string | null>(null);
  const [deletingPositionId, setDeletingPositionId] = useState<string | null>(null);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showDecrementConfirm, setShowDecrementConfirm] = useState(false);
  const [isIncrementalImport, setIsIncrementalImport] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Team member filters
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userEntityFilter, setUserEntityFilter] = useState<{ ids: string[], isExclude: boolean }>({ ids: [], isExclude: false });
  const [userPositionFilter, setUserPositionFilter] = useState<{ ids: string[], isExclude: boolean }>({ ids: [], isExclude: false });
  
  // Log export state
  const [logStartDate, setLogStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [logEndDate, setLogEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Decremental export state
  const [decrementStartDate, setDecrementStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [decrementEndDate, setDecrementEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [versions, setVersions] = useState<{ id: string; created_at: string }[]>([]);
  const [isFetchingVersions, setIsFetchingVersions] = useState(false);
  const [isVersionsTableMissing, setIsVersionsTableMissing] = useState(false);

  useEffect(() => {
    const loadVersions = async () => {
      setIsFetchingVersions(true);
      setIsVersionsTableMissing(false);
      try {
        const v = await fetchVersions();
        setVersions(v);
      } catch (err: any) {
        console.error('Failed to load versions:', err);
        if (err.message === 'TABLE_NOT_FOUND') {
          setIsVersionsTableMissing(true);
        }
      } finally {
        setIsFetchingVersions(false);
      }
    };
    loadVersions();
  }, [fetchVersions]);

  // Cloud Sync state
  const [syncStatus, setSyncStatus] = useState<{
    isChecking: boolean;
    cloudTimestamp: string | null;
    localTimestamp: string | null;
    cloudData: any | null;
    showModal: 'cloud-to-local' | 'local-to-cloud' | null;
  }>({
    isChecking: false,
    cloudTimestamp: null,
    localTimestamp: null,
    cloudData: null,
    showModal: null,
  });

  const checkSyncStatus = async (action: 'cloud-to-local' | 'local-to-cloud') => {
    setSyncStatus(prev => ({ ...prev, isChecking: true }));
    try {
      const state = useTaskStore.getState();
      const supabase = getSupabaseClient(state.supabaseConfig.url, state.supabaseConfig.anonKey);
      if (!supabase) {
        showMessage('Supabase 客户端未初始化，请检查配置', 'error');
        setSyncStatus(prev => ({ ...prev, isChecking: false }));
        return;
      }

      const { data, error } = await supabase
        .from('taskflow_app_data')
        .select('state, updated_at')
        .eq('id', 'default_user')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const localTs = localStorage.getItem('taskflow-storage-updated-at');
      
      setSyncStatus({
        isChecking: false,
        cloudTimestamp: data?.updated_at || null,
        localTimestamp: localTs || null,
        cloudData: data?.state || null,
        showModal: action,
      });
    } catch (err) {
      console.error(err);
      showMessage('检查同步状态失败', 'error');
      setSyncStatus(prev => ({ ...prev, isChecking: false }));
    }
  };

  const handleCloudToLocal = () => {
    if (syncStatus.cloudData) {
      setAllData(syncStatus.cloudData);
      showMessage('已使用云端数据覆盖本地');
    } else {
      showMessage('云端没有可用数据', 'error');
    }
    setSyncStatus(prev => ({ ...prev, showModal: null }));
  };

  const handleLocalToCloud = async () => {
    try {
      const state = useTaskStore.getState();
      const supabase = getSupabaseClient(state.supabaseConfig.url, state.supabaseConfig.anonKey);
      if (!supabase) throw new Error('No Supabase client');

      const stateStr = localStorage.getItem('taskflow-storage');
      if (stateStr) {
        const parsedValue = JSON.parse(stateStr);
        await supabase
          .from('taskflow_app_data')
          .upsert({ 
            id: 'default_user', 
            state: parsedValue,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        showMessage('已将本地数据同步至云端');
      }
    } catch (err) {
      console.error(err);
      showMessage('同步至云端失败', 'error');
    }
    setSyncStatus(prev => ({ ...prev, showModal: null }));
  };

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveUser = (id: string) => {
    if (id === 'new') {
      addUser({
        id: nanoid(),
        name: editUserForm.name || '新用户',
        entityIds: editUserForm.entityIds,
        positionIds: editUserForm.positionIds,
        notes: editUserForm.notes,
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

  const handleSaveEntity = (id: string) => {
    if (id === 'new') {
      addEntity({
        id: nanoid(),
        name: editEntityForm.name || '新实体',
      });
    } else {
      updateEntity(id, editEntityForm);
    }
    setEditingEntityId(null);
  };

  const handleSavePosition = (id: string) => {
    if (id === 'new') {
      addPosition({
        id: nanoid(),
        name: editPositionForm.name || '新岗位',
      });
    } else {
      updatePosition(id, editPositionForm);
    }
    setEditingPositionId(null);
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

  const moveMedium = (index: number, direction: 'up' | 'down') => {
    const newMediums = [...mediums];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newMediums.length) return;
    [newMediums[index], newMediums[targetIndex]] = [newMediums[targetIndex], newMediums[index]];
    setMediums(newMediums);
  };

  const handleExportExcel = () => {
    const state = useTaskStore.getState();
    
    // Prepare tasks data with project names
    const tasksWithProjectNames = state.tasks.map(task => {
      const project = state.projects.find(p => p.id === task.projectId);
      const assigneeNames = task.assigneeIds?.map(id => state.users.find(u => u.id === id)?.name).filter(Boolean).join(', ') || '';
      const reporterNames = task.reporterIds?.map(id => state.users.find(u => u.id === id)?.name).filter(Boolean).join(', ') || '';
      
      return {
        'ID': task.id,
        '标题': task.title,
        '描述': task.description || '',
        '状态': state.columns.find(c => c.id === task.state)?.title || task.state,
        '优先级': state.priorities.find(p => p.id === task.priority)?.label || task.priority,
        '项目': project?.name || '无',
        '进度': `${task.progress}%`,
        '负责人': assigneeNames,
        '审核人': reporterNames,
        '开始日期': task.startDate || '',
        '截止日期': task.dueDate || '',
        '创建时间': new Date(task.createdAt).toLocaleString(),
        '更新时间': new Date(task.updatedAt).toLocaleString(),
      };
    });

    // Prepare projects data
    const projectsData = state.projects.map(project => ({
      'ID': project.id,
      '项目名称': project.name,
      '描述': project.description || '',
      '状态': project.status === 'active' ? '进行中' : project.status === 'completed' ? '已完成' : '已归档',
      '进度': `${project.progress}%`,
      '创建时间': new Date(project.createdAt).toLocaleString(),
      '更新时间': new Date(project.updatedAt).toLocaleString(),
    }));

    const workbook = XLSX.utils.book_new();
    
    const tasksWorksheet = XLSX.utils.json_to_sheet(tasksWithProjectNames);
    XLSX.utils.book_append_sheet(workbook, tasksWorksheet, 'Tasks');
    
    const projectsWorksheet = XLSX.utils.json_to_sheet(projectsData);
    XLSX.utils.book_append_sheet(workbook, projectsWorksheet, 'Projects');
    
    XLSX.writeFile(workbook, `taskflow-data-${new Date().toISOString().split('T')[0]}.xlsx`);
    showMessage('数据已导出至 Excel');
  };

  const handleExportLogs = () => {
    const state = useTaskStore.getState();
    const start = new Date(logStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(logEndDate);
    end.setHours(23, 59, 59, 999);

    const filteredLogs = state.activityLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= start && logDate <= end;
    });

    if (filteredLogs.length === 0) {
      showMessage('该日期范围内没有日志数据', 'error');
      return;
    }

    const exportData = filteredLogs.map(log => {
      const task = state.tasks.find(t => t.id === log.taskId);
      const user = state.users.find(u => u.id === log.userId);
      return {
        '时间': new Date(log.timestamp).toLocaleString(),
        '用户': user?.name || '未知用户',
        '任务标题': task?.title || '已删除任务',
        '动作': log.action,
        '详情': log.details,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Logs');
    XLSX.writeFile(workbook, `taskflow-logs-${logStartDate}-to-${logEndDate}.xlsx`);
    showMessage('日志导出成功！');
  };

  const handleExport = () => {
    const state = useTaskStore.getState();
    const data = {
      tasks: state.tasks,
      users: state.users,
      columns: state.columns,
      priorities: state.priorities,
      mediums: state.mediums,
      entities: state.entities,
      positions: state.positions,
      currentUser: state.currentUser,
      activityLogs: state.activityLogs,
      notifications: state.notifications,
      customFieldDefinitions: state.customFieldDefinitions,
      fieldOrder: state.fieldOrder,
      memos: state.memos,
      projects: state.projects,
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>, isIncremental: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setPendingImportData(data);
        setIsIncrementalImport(isIncremental);
        setShowImportConfirm(true);
      } catch (error) {
        showMessage('导入失败：无效的 JSON 文件', 'error');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const confirmImport = () => {
    if (pendingImportData) {
      if (isIncrementalImport) {
        useTaskStore.getState().mergeData(pendingImportData);
        showMessage('增量数据导入成功！');
      } else {
        setAllData(pendingImportData);
        showMessage('全量数据导入成功！');
      }
      setPendingImportData(null);
      setShowImportConfirm(false);
      setIsIncrementalImport(false);
    }
  };

  const handleDecrementExport = () => {
    const start = new Date(decrementStartDate);
    const end = new Date(decrementEndDate);
    
    if (start > end) {
      showMessage('开始日期不能晚于结束日期', 'error');
      return;
    }

    setShowDecrementConfirm(true);
  };

  const confirmDecrementExport = () => {
    const exportedData = useTaskStore.getState().exportAndDeleteByDateRange(decrementStartDate, decrementEndDate);
    
    const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow-decremental-export-${decrementStartDate}-to-${decrementEndDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowDecrementConfirm(false);
    showMessage(`成功导出并删除选定范围内的数据！`);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                         (user.notes || '').toLowerCase().includes(userSearchTerm.toLowerCase());
    
    const matchesEntity = userEntityFilter.ids.length === 0 || (
      userEntityFilter.isExclude 
        ? !user.entityIds?.some(id => userEntityFilter.ids.includes(id))
        : user.entityIds?.some(id => userEntityFilter.ids.includes(id))
    );

    const matchesPosition = userPositionFilter.ids.length === 0 || (
      userPositionFilter.isExclude
        ? !user.positionIds?.some(id => userPositionFilter.ids.includes(id))
        : user.positionIds?.some(id => userPositionFilter.ids.includes(id))
    );

    return matchesSearch && matchesEntity && matchesPosition;
  });

  return (
    <div className="flex gap-8 max-w-6xl mx-auto pb-12 relative">
      {/* Sidebar Outline */}
      <div className="hidden lg:block w-48 shrink-0">
        <div className="sticky top-8 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">设置大纲</h3>
          <nav className="space-y-2">
            {[
              { id: 'team-members', label: '团队成员' },
              { id: 'entities', label: '实体管理' },
              { id: 'positions', label: '岗位管理' },
              { id: 'kanban-columns', label: '看板列设置' },
              { id: 'priorities', label: '优先级设置' },
              { id: 'medium-tags', label: '媒介标签设置' },
              { id: 'custom-fields', label: '自定义字段' },
              { id: 'field-order', label: '字段排序与显示' },
              { id: 'cloud-sync', label: '云端同步 (Supabase)' },
              { id: 'data-management', label: '数据管理' },
              { id: 'performance-test', label: '性能测试' },
            ].map(item => (
              <a 
                key={item.id} 
                href={`#${item.id}`} 
                className="block text-sm text-slate-600 hover:text-indigo-600 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-12">
        {message && (
          <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-xl border animate-in fade-in slide-in-from-top-4 duration-300 ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            <div className="flex items-center gap-2 font-medium">
              {message.type === 'success' ? <Save size={18} /> : <X size={18} />}
              {message.text}
            </div>
          </div>
        )}
          <section id="team-members" className="scroll-mt-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800">团队成员</h2>
            <button 
              onClick={() => {
                setEditingUserId('new');
                setEditUserForm({ name: '', entityIds: [], positionIds: [], notes: '' });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <Plus size={16} /> 添加成员
            </button>
          </div>

          {/* User Filters */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">搜索姓名/备注</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="输入关键词..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">按实体筛选</label>
                <MultiSelect
                  options={entities}
                  selectedIds={userEntityFilter.ids}
                  isExclude={userEntityFilter.isExclude}
                  onChange={(ids, isExclude) => setUserEntityFilter({ ids, isExclude: isExclude || false })}
                  placeholder="选择实体..."
                  showExcludeOption
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">按岗位筛选</label>
                <MultiSelect
                  options={positions}
                  selectedIds={userPositionFilter.ids}
                  isExclude={userPositionFilter.isExclude}
                  onChange={(ids, isExclude) => setUserPositionFilter({ ids, isExclude: isExclude || false })}
                  placeholder="选择岗位..."
                  showExcludeOption
                />
              </div>
            </div>
            {(userSearchTerm || userEntityFilter.ids.length > 0 || userPositionFilter.ids.length > 0) && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setUserSearchTerm('');
                    setUserEntityFilter({ ids: [], isExclude: false });
                    setUserPositionFilter({ ids: [], isExclude: false });
                  }}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  清除所有筛选
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500">姓名</th>
                  <th className="px-4 py-3 font-medium text-slate-500">实体</th>
                  <th className="px-4 py-3 font-medium text-slate-500">岗位</th>
                  <th className="px-4 py-3 font-medium text-slate-500">备注</th>
                  <th className="px-4 py-3 font-medium text-slate-500 w-24">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    {editingUserId === user.id ? (
                      <>
                        <td className="px-4 py-3 align-top">
                          <input 
                            type="text" 
                            value={editUserForm.name || ''} 
                            onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                            placeholder="姓名"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <MultiSelect
                            options={entities}
                            selectedIds={editUserForm.entityIds || []}
                            onChange={ids => setEditUserForm({ ...editUserForm, entityIds: ids })}
                            onCreate={name => {
                              const newId = nanoid();
                              addEntity({ id: newId, name });
                              setEditUserForm({ ...editUserForm, entityIds: [...(editUserForm.entityIds || []), newId] });
                            }}
                            placeholder="选择实体..."
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <MultiSelect
                            options={positions}
                            selectedIds={editUserForm.positionIds || []}
                            onChange={ids => setEditUserForm({ ...editUserForm, positionIds: ids })}
                            onCreate={name => {
                              const newId = nanoid();
                              addPosition({ id: newId, name });
                              setEditUserForm({ ...editUserForm, positionIds: [...(editUserForm.positionIds || []), newId] });
                            }}
                            placeholder="选择岗位..."
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input 
                            type="text" 
                            value={editUserForm.notes || ''} 
                            onChange={e => setEditUserForm({ ...editUserForm, notes: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                            placeholder="备注"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleSaveUser(user.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={16} /></button>
                            <button onClick={() => setEditingUserId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={user.name} className="w-8 h-8 border border-slate-200 text-xs" />
                            <span className="font-medium text-slate-700">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {user.entityIds?.map(id => {
                              const ent = entities.find(e => e.id === id);
                              return ent ? <span key={id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{ent.name}</span> : null;
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {user.positionIds?.map(id => {
                              const pos = positions.find(p => p.id === id);
                              return pos ? <span key={id} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{pos.name}</span> : null;
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-sm max-w-xs truncate" title={user.notes}>
                          {user.notes}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {deletingUserId === user.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => { deleteUser(user.id); setDeletingUserId(null); }} className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"><Check size={14} /></button>
                                <button onClick={() => setDeletingUserId(null)} className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200"><X size={14} /></button>
                              </div>
                            ) : (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditingUserId(user.id);
                                    setEditUserForm(user);
                                  }} 
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => setDeletingUserId(user.id)} 
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {editingUserId === 'new' && (
                  <tr className="bg-indigo-50/30">
                    <td className="px-4 py-3 align-top">
                      <input 
                        type="text" 
                        value={editUserForm.name || ''} 
                        onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="新用户姓名"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <MultiSelect
                        options={entities}
                        selectedIds={editUserForm.entityIds || []}
                        onChange={ids => setEditUserForm({ ...editUserForm, entityIds: ids })}
                        onCreate={name => {
                          const newId = nanoid();
                          addEntity({ id: newId, name });
                          setEditUserForm({ ...editUserForm, entityIds: [...(editUserForm.entityIds || []), newId] });
                        }}
                        placeholder="选择实体..."
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <MultiSelect
                        options={positions}
                        selectedIds={editUserForm.positionIds || []}
                        onChange={ids => setEditUserForm({ ...editUserForm, positionIds: ids })}
                        onCreate={name => {
                          const newId = nanoid();
                          addPosition({ id: newId, name });
                          setEditUserForm({ ...editUserForm, positionIds: [...(editUserForm.positionIds || []), newId] });
                        }}
                        placeholder="选择岗位..."
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input 
                        type="text" 
                        value={editUserForm.notes || ''} 
                        onChange={e => setEditUserForm({ ...editUserForm, notes: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="备注"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleSaveUser('new')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={16} /></button>
                        <button onClick={() => setEditingUserId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      {/* Entity Management */}
      <section id="entities" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">实体管理</h2>
          <button 
            onClick={() => {
              setEditingEntityId('new');
              setEditEntityForm({ name: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} /> 添加实体
          </button>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {entities.map(entity => (
              <div key={entity.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                {editingEntityId === entity.id ? (
                  <div className="flex-1 flex items-center gap-4">
                    <input 
                      type="text" 
                      value={editEntityForm.name || ''} 
                      onChange={e => setEditEntityForm({ ...editEntityForm, name: e.target.value })}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="实体名称"
                    />
                    <div className="flex items-center gap-2 px-2">
                      <button onClick={() => handleSaveEntity(entity.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                      <button onClick={() => setEditingEntityId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-slate-700">{entity.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletingEntityId === entity.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { deleteEntity(entity.id); setDeletingEntityId(null); }} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"><Check size={16} /></button>
                          <button onClick={() => setDeletingEntityId(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X size={16} /></button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingEntityId(entity.id);
                              setEditEntityForm(entity);
                            }} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeletingEntityId(entity.id)} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {editingEntityId === 'new' && (
              <div className="p-4 bg-indigo-50/30 flex items-center gap-4">
                <input 
                  type="text" 
                  value={editEntityForm.name || ''} 
                  onChange={e => setEditEntityForm({ ...editEntityForm, name: e.target.value })}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="新实体名称"
                  autoFocus
                />
                <div className="flex items-center gap-2 px-2">
                  <button onClick={() => handleSaveEntity('new')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                  <button onClick={() => setEditingEntityId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Position Management */}
      <section id="positions" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">岗位管理</h2>
          <button 
            onClick={() => {
              setEditingPositionId('new');
              setEditPositionForm({ name: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} /> 添加岗位
          </button>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {positions.map(position => (
              <div key={position.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                {editingPositionId === position.id ? (
                  <div className="flex-1 flex items-center gap-4">
                    <input 
                      type="text" 
                      value={editPositionForm.name || ''} 
                      onChange={e => setEditPositionForm({ ...editPositionForm, name: e.target.value })}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="岗位名称"
                    />
                    <div className="flex items-center gap-2 px-2">
                      <button onClick={() => handleSavePosition(position.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                      <button onClick={() => setEditingPositionId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-slate-700">{position.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletingPositionId === position.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { deletePosition(position.id); setDeletingPositionId(null); }} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"><Check size={16} /></button>
                          <button onClick={() => setDeletingPositionId(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X size={16} /></button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingPositionId(position.id);
                              setEditPositionForm(position);
                            }} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeletingPositionId(position.id)} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {editingPositionId === 'new' && (
              <div className="p-4 bg-indigo-50/30 flex items-center gap-4">
                <input 
                  type="text" 
                  value={editPositionForm.name || ''} 
                  onChange={e => setEditPositionForm({ ...editPositionForm, name: e.target.value })}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="新岗位名称"
                  autoFocus
                />
                <div className="flex items-center gap-2 px-2">
                  <button onClick={() => handleSavePosition('new')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                  <button onClick={() => setEditingPositionId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="kanban-columns" className="scroll-mt-24">
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
                      {deletingColumnId === column.id ? (
                        <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                          <span className="text-xs font-medium text-red-600">确定删除？</span>
                          <button onClick={() => { deleteColumn(column.id); setDeletingColumnId(null); }} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors">确认</button>
                          <button onClick={() => setDeletingColumnId(null)} className="px-2 py-1 bg-white text-slate-500 text-[10px] font-bold rounded border border-slate-200 hover:bg-slate-50 transition-colors">取消</button>
                        </div>
                      ) : (
                        <>
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
                            onClick={() => setDeletingColumnId(column.id)} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
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
      <section id="priorities" className="scroll-mt-24">
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
                      {deletingPriorityId === priority.id ? (
                        <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                          <span className="text-xs font-medium text-red-600">确定删除？</span>
                          <button onClick={() => { deletePriority(priority.id); setDeletingPriorityId(null); }} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors">确认</button>
                          <button onClick={() => setDeletingPriorityId(null)} className="px-2 py-1 bg-white text-slate-500 text-[10px] font-bold rounded border border-slate-200 hover:bg-slate-50 transition-colors">取消</button>
                        </div>
                      ) : (
                        <>
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
                            onClick={() => setDeletingPriorityId(priority.id)} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
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
      <section id="medium-tags" className="scroll-mt-24">
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
            {mediums.map((medium, index) => (
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
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => moveMedium(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button 
                          onClick={() => moveMedium(index, 'down')}
                          disabled={index === mediums.length - 1}
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      {deletingMediumId === medium.id ? (
                        <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                          <span className="text-xs font-medium text-red-600">确定删除？</span>
                          <button onClick={() => { deleteMedium(medium.id); setDeletingMediumId(null); }} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors">确认</button>
                          <button onClick={() => setDeletingMediumId(null)} className="px-2 py-1 bg-white text-slate-500 text-[10px] font-bold rounded border border-slate-200 hover:bg-slate-50 transition-colors">取消</button>
                        </div>
                      ) : (
                        <>
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
                            onClick={() => setDeletingMediumId(medium.id)} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
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
      <section id="custom-fields" className="scroll-mt-24">
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
                      {deletingFieldId === field.id ? (
                        <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                          <span className="text-xs font-medium text-red-600">确定删除？</span>
                          <button onClick={() => { deleteCustomFieldDefinition(field.id); setDeletingFieldId(null); }} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors">确认</button>
                          <button onClick={() => setDeletingFieldId(null)} className="px-2 py-1 bg-white text-slate-500 text-[10px] font-bold rounded border border-slate-200 hover:bg-slate-50 transition-colors">取消</button>
                        </div>
                      ) : (
                        <>
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
                            onClick={() => setDeletingFieldId(field.id)} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
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
      <section id="field-order" className="scroll-mt-24">
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
      <section id="data-management" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">数据管理</h2>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4">全量数据备份</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  <Upload size={18} /> 导出任务为 Excel
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  <Upload size={18} /> 导出全量数据 (JSON)
                </button>
                
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleImport(e, false)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium w-full"
                  >
                    <Download size={18} /> 导入数据 (覆盖)
                  </button>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                您可以导出所有数据进行备份，或者导入之前备份的数据。导入数据将替换当前的所有数据，请谨慎操作。
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-4">增量导入与减量导出</h3>
              <div className="flex flex-col sm:flex-row items-end gap-4 mb-4">
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleImport(e, true)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                  >
                    <Download size={18} /> 增量导入 (合并)
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">开始日期</label>
                  <input 
                    type="date" 
                    value={decrementStartDate}
                    onChange={(e) => setDecrementStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">结束日期</label>
                  <input 
                    type="date" 
                    value={decrementEndDate}
                    onChange={(e) => setDecrementEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={handleDecrementExport}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                >
                  <Upload size={18} /> 减量导出并删除
                </button>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                <span className="font-medium text-slate-600">增量导入：</span>保留现有数据，仅合并新数据。<br/>
                <span className="font-medium text-slate-600">减量导出：</span>导出指定日期范围内的数据（任务、日志、通知等），并在导出成功后从当前数据库中永久删除这些数据。
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-4">日志导出</h3>
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">开始日期</label>
                  <input 
                    type="date" 
                    value={logStartDate}
                    onChange={(e) => setLogStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">结束日期</label>
                  <input 
                    type="date" 
                    value={logEndDate}
                    onChange={(e) => setLogEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={handleExportLogs}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  <Download size={18} /> 导出选定范围日志
                </button>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                导出指定日期范围内的任务操作日志，包含任务标题、操作人、操作内容及时间。
              </p>
              
              <div className="mt-6 pt-6 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">垃圾清理</h4>
                    <p className="text-xs text-slate-500">清理两个月前的旧日志和通知，优化数据结构以减小备份体积。</p>
                  </div>
                  <button
                    onClick={() => {
                      const start = performance.now();
                      useTaskStore.getState().compressDatabase();
                      const end = performance.now();
                      showMessage(`垃圾清理完成！已移除两个月前的日志及冗余数据，耗时 ${(end - start).toFixed(2)}ms`);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm"
                    title="清理两个月前的旧日志和通知，优化数据结构"
                  >
                    <Trash2 size={16} /> 立即清理
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cloud Sync Section */}
      <section id="cloud-sync" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">云端同步 (Supabase)</h2>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              配置您的 Supabase 项目信息以启用云端数据同步。这允许您在多台设备之间同步任务数据。
              如果留空，系统将尝试使用环境变量中的默认配置。
            </p>
            
            <div className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Supabase URL</label>
                <input
                  type="text"
                  value={useTaskStore.getState().supabaseConfig?.url || ''}
                  onChange={(e) => {
                    const currentConfig = useTaskStore.getState().supabaseConfig || { url: '', anonKey: '' };
                    useTaskStore.getState().setSupabaseConfig({ ...currentConfig, url: e.target.value });
                  }}
                  onBlur={() => showMessage('Supabase URL 已更新')}
                  placeholder="https://your-project-id.supabase.co"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Supabase Anon Key</label>
                <input
                  type="password"
                  value={useTaskStore.getState().supabaseConfig?.anonKey || ''}
                  onChange={(e) => {
                    const currentConfig = useTaskStore.getState().supabaseConfig || { url: '', anonKey: '' };
                    useTaskStore.getState().setSupabaseConfig({ ...currentConfig, anonKey: e.target.value });
                  }}
                  onBlur={() => showMessage('Supabase Anon Key 已更新')}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                />
              </div>
            </div>
            
            <div className="pt-4 flex items-center gap-3">
              <button
                onClick={() => {
                  // Force a re-save to trigger sync with new credentials
                  const state = useTaskStore.getState();
                  useTaskStore.setState({ ...state });
                  showMessage('已应用同步配置并尝试连接');
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
              >
                应用并测试连接
              </button>
              <button
                onClick={() => {
                  useTaskStore.getState().setSupabaseConfig({ url: '', anonKey: '' });
                  showMessage('已清除自定义同步配置，将使用默认环境变量');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
              >
                清除配置
              </button>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4">手动同步数据</h3>
              <p className="text-sm text-slate-500 mb-4">
                如果数据出现不一致，您可以手动选择使用云端数据覆盖本地，或者将本地数据强制同步至云端。
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => checkSyncStatus('cloud-to-local')}
                  disabled={syncStatus.isChecking}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  <Download size={16} /> 云端数据覆盖本地
                </button>
                <button
                  onClick={() => checkSyncStatus('local-to-cloud')}
                  disabled={syncStatus.isChecking}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  <Upload size={16} /> 保留本地数据 (覆盖云端)
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">历史版本还原</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setIsFetchingVersions(true);
                      try {
                        await useTaskStore.getState().saveVersionToCloud();
                        const v = await fetchVersions();
                        setVersions(v);
                        setIsVersionsTableMissing(false);
                        showMessage('已保存当前版本并刷新列表');
                      } catch (err: any) {
                        console.error(err);
                        if (err.message === 'TABLE_NOT_FOUND') {
                          setIsVersionsTableMissing(true);
                          showMessage('请先在 Supabase 中创建 taskflow_app_versions 表', 'error');
                        } else {
                          showMessage('保存或刷新失败', 'error');
                        }
                      } finally {
                        setIsFetchingVersions(false);
                      }
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> 保存当前版本
                  </button>
                  <button
                    onClick={async () => {
                      setIsFetchingVersions(true);
                      try {
                        const v = await fetchVersions();
                        setVersions(v);
                        setIsVersionsTableMissing(false);
                        showMessage('已刷新版本列表');
                      } catch (err: any) {
                        console.error(err);
                        if (err.message === 'TABLE_NOT_FOUND') {
                          setIsVersionsTableMissing(true);
                          showMessage('请先在 Supabase 中创建 taskflow_app_versions 表', 'error');
                        } else {
                          showMessage('刷新失败', 'error');
                        }
                      } finally {
                        setIsFetchingVersions(false);
                      }
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  >
                    <Loader2 size={14} className={isFetchingVersions ? 'animate-spin' : ''} /> 刷新列表
                  </button>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                {isVersionsTableMissing ? (
                  <div className="text-sm text-slate-600 space-y-3">
                    <p className="text-red-600 font-medium">⚠️ 缺少历史版本数据表或权限不足</p>
                    <p>请在您的 Supabase SQL Editor 中运行以下代码来创建表并配置权限：</p>
                    <pre className="bg-slate-800 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs font-mono">
{`create table if not exists public.taskflow_app_versions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  state jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_taskflow_app_versions_user_id on public.taskflow_app_versions(user_id);

-- 允许匿名访问 (因为应用目前使用 anon key)
alter table public.taskflow_app_versions enable row level security;

create policy "Allow all operations for anon" 
on public.taskflow_app_versions 
for all 
using (true) 
with check (true);`}
                    </pre>
                  </div>
                ) : isFetchingVersions ? (
                  <p className="text-sm text-slate-500">加载中...</p>
                ) : versions.length === 0 ? (
                  <p className="text-sm text-slate-500">暂无历史版本</p>
                ) : (
                  <div className="space-y-2">
                    {versions.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                        <span className="text-sm text-slate-700 font-mono">{new Date(v.created_at).toLocaleString()}</span>
                        <button 
                          onClick={() => handleRestoreVersion(v.id)}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors text-xs font-medium"
                        >
                          还原
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Test Section */}
      <section id="performance-test" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">性能测试</h2>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-medium text-slate-800 mb-2">当前状态</h3>
            <div className="text-sm text-slate-600">
              当前任务总数：<span className="font-bold text-indigo-600 text-lg">{useTaskStore.getState().tasks.length}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-slate-800">生成测试数据</h3>
            <p className="text-sm text-slate-500">
              您可以生成大量随机任务来测试应用的性能表现。
              <br />
              <span className="text-amber-600">注意：生成大量数据可能会导致页面短暂卡顿。</span>
            </p>
            
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  const start = performance.now();
                  useTaskStore.getState().generateTestTasks(50);
                  const end = performance.now();
                  showMessage(`成功生成 50 个任务，耗时 ${(end - start).toFixed(2)}ms`);
                }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium text-sm"
              >
                + 生成 50 个任务
              </button>
              <button
                onClick={() => {
                  const start = performance.now();
                  useTaskStore.getState().generateTestTasks(300);
                  const end = performance.now();
                  showMessage(`成功生成 300 个任务，耗时 ${(end - start).toFixed(2)}ms`);
                }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium text-sm"
              >
                + 生成 300 个任务
              </button>
              
              <div className="ml-auto">
                {isConfirmingClear ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                    <span className="text-xs font-bold text-red-600 mr-2">确定清空？</span>
                    <button
                      onClick={() => {
                        useTaskStore.getState().clearTasks();
                        setIsConfirmingClear(false);
                        showMessage('所有任务已清空');
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-sm shadow-sm"
                    >
                      确认
                    </button>
                    <button
                      onClick={() => setIsConfirmingClear(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingClear(true)}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                  >
                    清空所有任务
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-medium text-slate-800 mb-2">性能参考</h3>
            <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
              <li><span className="font-medium text-slate-700">100 任务以下：</span> 非常流畅，无明显延迟。</li>
              <li><span className="font-medium text-slate-700">100 - 500 任务：</span> 操作可能开始有轻微延迟（~100-300ms）。</li>
              <li><span className="font-medium text-slate-700">500 - 1000 任务：</span> 切换视图和渲染可能会有明显卡顿（~500ms+）。</li>
              <li><span className="font-medium text-slate-700">1000 任务以上：</span> 可能会出现超过 1 秒的延迟，建议清理旧任务。</li>
            </ul>
          </div>
        </div>
      </section>

      </div>
      {showImportConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">确认导入数据？</h3>
            <p className="text-slate-600 text-sm mb-6">
              导入数据将<span className="text-red-600 font-bold">覆盖当前所有数据</span>（包括任务、成员、设置等）。此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportConfirm(false);
                  setPendingImportData(null);
                }}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmImport}
                className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}

      {syncStatus.showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {syncStatus.showModal === 'cloud-to-local' ? '确认使用云端数据覆盖本地？' : '确认将本地数据同步至云端？'}
            </h3>
            
            <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">云端数据时间：</span>
                <span className="font-medium text-slate-800">
                  {syncStatus.cloudTimestamp ? new Date(syncStatus.cloudTimestamp).toLocaleString() : '无数据'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">本地数据时间：</span>
                <span className="font-medium text-slate-800">
                  {syncStatus.localTimestamp ? new Date(syncStatus.localTimestamp).toLocaleString() : '无数据'}
                </span>
              </div>
            </div>

            <p className="text-slate-600 text-sm mb-6">
              {syncStatus.showModal === 'cloud-to-local' 
                ? '此操作将使用云端的最新数据完全替换您当前设备上的本地数据。未同步的本地更改将会丢失。' 
                : '此操作将强制使用您当前设备的本地数据覆盖云端数据。云端原有的数据将被替换。'}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSyncStatus(prev => ({ ...prev, showModal: null }))}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={syncStatus.showModal === 'cloud-to-local' ? handleCloudToLocal : handleLocalToCloud}
                className={`px-6 py-2 text-white font-bold rounded-xl transition-colors shadow-sm ${
                  syncStatus.showModal === 'cloud-to-local' 
                    ? 'bg-amber-600 hover:bg-amber-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {syncStatus.showModal === 'cloud-to-local' ? '确认覆盖本地' : '确认覆盖云端'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={isRestoreModalOpen}
        title="还原版本"
        message="确定要还原到此版本吗？这将覆盖当前本地数据。"
        onConfirm={confirmRestoreVersion}
        onCancel={() => setIsRestoreModalOpen(false)}
      />

      {showDecrementConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">确认导出并删除数据？</h3>
            <p className="text-slate-600 text-sm mb-6">
              您即将导出并删除 <span className="font-bold text-slate-800">{decrementStartDate}</span> 至 <span className="font-bold text-slate-800">{decrementEndDate}</span> 期间的所有数据。<br/><br/>
              <span className="text-red-600 font-bold">此操作不可撤销</span>，删除后的数据将无法在系统中恢复（除非您重新导入）。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDecrementConfirm(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDecrementExport}
                className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
              >
                确认导出并删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
