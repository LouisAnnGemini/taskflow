import React, { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { Plus, Trash2, Edit3, Check, X, StickyNote, Maximize2, Minimize2, Send, Save, FileText, MessageSquarePlus, CornerDownLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { nanoid } from 'nanoid';

export function MemosView() {
  const { 
    currentSessionMessages, 
    currentDraftId, 
    savedDrafts, 
    addMemoMessage, 
    updateMemoMessage, 
    saveMemoDraft, 
    updateMemoDraft, 
    loadMemoDraft, 
    clearMemoSession, 
    deleteMemoDraft,
    tasks,
    users
  } = useTaskStore();

  const [inputValue, setInputValue] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorIndex, setMentionCursorIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Edit & Insert State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [insertValue, setInsertValue] = useState('');
  
  // Rename Draft State
  const [renamingDraftId, setRenamingDraftId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete Draft State
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (!editingId && insertIndex === null) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSessionMessages.length]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    addMemoMessage(inputValue.trim());
    setInputValue('');
    setIsFullscreen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null) {
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
      // Basic mention navigation could be added here
    }

    if (!isFullscreen) {
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
        // Allow newline
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/@(\S*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setMentionCursorIndex(cursorPosition - match[1].length - 1);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (id: string, name: string, type: 'task' | 'user') => {
    if (mentionCursorIndex === -1) return;
    const before = inputValue.slice(0, mentionCursorIndex);
    const after = inputValue.slice(inputRef.current?.selectionStart || mentionCursorIndex);
    const mentionText = `[@${name}](${type}:${id}) `;
    setInputValue(before + mentionText + after);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleSaveDraft = () => {
    if (currentDraftId) {
      updateMemoDraft();
    } else {
      saveMemoDraft();
    }
  };

  const handleSaveAsNew = () => {
    saveMemoDraft();
  };

  // Filter mentions
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes((mentionQuery || '').toLowerCase())).slice(0, 5);
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes((mentionQuery || '').toLowerCase())).slice(0, 5);

  return (
    <div className="w-full h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar: Drafts */}
      <div className="w-64 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Save size={18} className="text-indigo-500" />
            保存区
          </h2>
          <button 
            onClick={clearMemoSession}
            className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
            title="新会话"
          >
            <MessageSquarePlus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {savedDrafts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              暂无保存的草稿
            </div>
          ) : (
            savedDrafts.map(draft => (
              <div 
                key={draft.id}
                onClick={() => loadMemoDraft(draft.id)}
                className={`p-3 rounded-xl cursor-pointer group transition-all ${currentDraftId === draft.id ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-slate-50 border-transparent'} border`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {renamingDraftId === draft.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => {
                          if (renameValue.trim()) useTaskStore.getState().renameMemoDraft(draft.id, renameValue.trim());
                          setRenamingDraftId(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            if (renameValue.trim()) useTaskStore.getState().renameMemoDraft(draft.id, renameValue.trim());
                            setRenamingDraftId(null);
                          } else if (e.key === 'Escape') {
                            setRenamingDraftId(null);
                          }
                        }}
                        className="w-full text-sm font-medium text-slate-700 bg-white border border-indigo-300 rounded px-1 outline-none"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="text-sm font-medium text-slate-700 truncate">{draft.title}</h3>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">{format(parseISO(draft.updatedAt), 'MM-dd HH:mm')}</p>
                  </div>
                  <div className={`flex items-center transition-opacity ${deletingDraftId === draft.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {deletingDraftId === draft.id ? (
                      <div className="flex items-center gap-0.5 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                        <span className="text-[10px] text-red-600 font-medium mr-1">确认删除?</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMemoDraft(draft.id); setDeletingDraftId(null); }}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="确认"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingDraftId(null); }}
                          className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                          title="取消"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setRenamingDraftId(draft.id); 
                            setRenameValue(draft.title); 
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-500"
                          title="重命名"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingDraftId(draft.id); }}
                          className="p-1 text-slate-400 hover:text-red-500"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <StickyNote className="text-indigo-600" size={20} />
            <span className="font-semibold text-slate-700">
              {currentDraftId ? savedDrafts.find(d => d.id === currentDraftId)?.title : '新会话'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentSessionMessages.length > 0 && (
              <>
                <button onClick={handleSaveDraft} className="text-sm px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors">
                  <Save size={14} /> {currentDraftId ? '更新草稿' : '保存草稿'}
                </button>
                {currentDraftId && (
                  <button onClick={handleSaveAsNew} className="text-sm px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors">
                    <FileText size={14} /> 另存为
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {currentSessionMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <MessageSquarePlus size={48} className="text-slate-200" />
              <p>开始记录您的想法，像聊天一样简单</p>
            </div>
          ) : (
            currentSessionMessages.map((msg, index) => (
              <div key={msg.id} className="relative group">
                {/* Insert Above Button */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={() => setInsertIndex(index)} className="bg-indigo-100 text-indigo-600 rounded-full p-1 hover:bg-indigo-200 shadow-sm">
                    <Plus size={14} />
                  </button>
                </div>

                {/* Insert Input */}
                {insertIndex === index && (
                  <div className="mb-4 bg-white border-2 border-indigo-200 rounded-2xl p-3 shadow-sm flex gap-2">
                    <textarea
                      autoFocus
                      value={insertValue}
                      onChange={(e) => setInsertValue(e.target.value)}
                      className="flex-1 resize-none outline-none text-sm p-2 bg-slate-50 rounded-xl"
                      placeholder="插入新记录..."
                      rows={2}
                    />
                    <div className="flex flex-col gap-2 justify-end">
                      <button onClick={() => {
                        if (insertValue.trim()) addMemoMessage(insertValue.trim(), index);
                        setInsertIndex(null);
                        setInsertValue('');
                      }} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        <Check size={16} />
                      </button>
                      <button onClick={() => { setInsertIndex(null); setInsertValue(''); }} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Bubble */}
                <div className="flex flex-col items-end">
                  <div className="text-[11px] text-slate-400 mb-1 mr-1">
                    {format(parseISO(msg.timestamp), 'MM-dd HH:mm')}
                  </div>
                  <div className="max-w-[85%] bg-white border border-slate-200 rounded-2xl rounded-tr-sm p-4 shadow-sm relative group/msg">
                    {editingId === msg.id ? (
                      <div className="w-full min-w-[300px]">
                        <textarea
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full resize-none outline-none text-sm p-2 bg-slate-50 rounded-xl border border-slate-200"
                          rows={4}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">取消</button>
                          <button onClick={() => {
                            if (editValue.trim()) updateMemoMessage(msg.id, editValue.trim());
                            setEditingId(null);
                          }} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">保存</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="prose prose-sm prose-slate max-w-none markdown-body">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({node, ...props}) => {
                                if (props.href?.startsWith('task:') || props.href?.startsWith('user:')) {
                                  return (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-medium text-xs border border-indigo-100 mx-0.5">
                                      {props.children}
                                    </span>
                                  );
                                }
                                return <a {...props} />;
                              }
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        
                        {/* Message Actions */}
                        <div className="absolute -left-10 top-2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex flex-col gap-1">
                          <button onClick={() => { setEditingId(msg.id); setEditValue(msg.content); }} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded-lg shadow-sm border border-slate-100" title="编辑">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => useTaskStore.getState().deleteMemoMessage(msg.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-white rounded-lg shadow-sm border border-slate-100" title="删除">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 relative">
          {/* Mention Popover */}
          {mentionQuery !== null && (filteredTasks.length > 0 || filteredUsers.length > 0) && (
            <div className="absolute bottom-full left-4 mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="p-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">关联任务或人员</div>
              <div className="max-h-60 overflow-y-auto p-1">
                {filteredTasks.length > 0 && (
                  <div className="mb-1">
                    <div className="px-2 py-1 text-[10px] text-slate-400 uppercase">任务</div>
                    {filteredTasks.map(t => (
                      <button key={t.id} onClick={() => insertMention(t.id, t.title, 'task')} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 rounded-lg truncate">
                        {t.title}
                      </button>
                    ))}
                  </div>
                )}
                {filteredUsers.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] text-slate-400 uppercase">人员</div>
                    {filteredUsers.map(u => (
                      <button key={u.id} onClick={() => insertMention(u.id, u.name, 'user')} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 rounded-lg truncate">
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={`relative flex gap-2 transition-all ${isFullscreen ? 'fixed inset-4 z-50 bg-white rounded-2xl shadow-2xl p-6 flex-col' : 'w-full'}`}>
            {isFullscreen && (
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800">全屏编辑模式 (Markdown)</h3>
                <button onClick={() => setIsFullscreen(false)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                  <Minimize2 size={20} />
                </button>
              </div>
            )}
            
            <div className={`flex gap-2 ${isFullscreen ? 'flex-1 h-full' : 'w-full'}`}>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={isFullscreen ? "支持 Markdown 语法，Enter 换行..." : "输入记录... (Enter 发送, Ctrl+Enter 换行, @关联)"}
                className={`flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${isFullscreen ? 'h-full text-base' : 'min-h-[80px] pb-12'}`}
              />
              
              {isFullscreen && (
                <div className="flex-1 h-full bg-slate-50 rounded-xl border border-slate-200 p-6 overflow-y-auto prose prose-slate max-w-none markdown-body">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({node, ...props}) => {
                        if (props.href?.startsWith('task:') || props.href?.startsWith('user:')) {
                          return (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-medium text-xs border border-indigo-100 mx-0.5">
                              {props.children}
                            </span>
                          );
                        }
                        return <a {...props} />;
                      }
                    }}
                  >
                    {inputValue || '*预览区*'}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            <div className={`flex items-center justify-between ${isFullscreen ? 'mt-4' : 'absolute right-2 bottom-2'}`}>
              {!isFullscreen && (
                <button onClick={() => setIsFullscreen(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors mr-2">
                  <Maximize2 size={18} />
                </button>
              )}
              
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isFullscreen ? 'px-8 py-3 text-base font-medium gap-2' : 'w-10 h-10'}`}
              >
                {isFullscreen ? <><Send size={18} /> 发送记录</> : <Send size={16} className="-ml-0.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
