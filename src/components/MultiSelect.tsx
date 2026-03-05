import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Plus, ChevronDown } from 'lucide-react';

interface Option {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

interface MultiSelectProps {
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreate?: (name: string) => void;
  placeholder: string;
  className?: string;
}

export function MultiSelect({ 
  options, 
  selectedIds, 
  onChange, 
  onCreate, 
  placeholder,
  className = ''
}: MultiSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query) {
      e.preventDefault();
      const exactMatch = options.find(opt => opt.name.toLowerCase() === query.toLowerCase());
      if (exactMatch) {
        if (!selectedIds.includes(exactMatch.id)) {
          onChange([...selectedIds, exactMatch.id]);
        }
        setQuery('');
      } else if (onCreate) {
        onCreate(query);
        setQuery('');
      }
    }
    if (e.key === 'Backspace' && !query && selectedIds.length > 0) {
      onChange(selectedIds.slice(0, -1));
    }
  };

  return (
    <div className={`relative min-w-[200px] ${className}`} ref={containerRef}>
      <div 
        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 cursor-text flex flex-wrap gap-1 min-h-[38px]"
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
      >
        {selectedIds.map(id => {
          const opt = options.find(o => o.id === id);
          if (!opt) return null;
          return (
            <span key={id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs border border-indigo-100">
              {opt.icon && <span className="mr-0.5">{opt.icon}</span>}
              {opt.name}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selectedIds.filter(sid => sid !== id));
                }}
                className="hover:text-indigo-900 rounded-full hover:bg-indigo-200 p-0.5"
              >
                <X size={10} />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedIds.length === 0 ? placeholder : ''}
          className="flex-1 bg-transparent border-none outline-none text-sm min-w-[60px] p-0 placeholder:text-slate-400"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown size={14} />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  if (!selectedIds.includes(opt.id)) {
                    onChange([...selectedIds, opt.id]);
                  } else {
                    onChange(selectedIds.filter(id => id !== opt.id));
                  }
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between ${
                  selectedIds.includes(opt.id) ? 'text-indigo-600 bg-indigo-50' : 'text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  {opt.icon}
                  {opt.name}
                </span>
                {selectedIds.includes(opt.id) && <Check size={14} />}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-slate-400 italic">
              {query && onCreate ? '按回车创建...' : '无匹配项'}
            </div>
          )}
          
          {query && onCreate && !filteredOptions.find(o => o.name.toLowerCase() === query.toLowerCase()) && (
            <button
              onClick={() => {
                onCreate(query);
                setQuery('');
              }}
              className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium flex items-center gap-2 border-t border-slate-100"
            >
              <Plus size={14} /> 创建 "{query}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
