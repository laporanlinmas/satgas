'use client';

import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface SearchableSelectProps {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/** Dropdown dengan kotak pencarian — cepat dipakai di perangkat kecil. */
export default function SearchableSelect({
  label,
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onPointer);
    inputRef.current?.focus();
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle ? options.filter(option => option.toLowerCase().includes(needle)) : options;
    return list.slice(0, 40);
  }, [options, query]);

  const select = (option: string) => {
    onChange(option);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="form-field searchable" ref={rootRef}>
      <span>
        {label} <b>*</b>
      </span>

      {open && !disabled ? (
        <>
          <div className="searchable-input-wrap">
            <Search aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              placeholder={`Cari ${label.toLowerCase()}`}
              autoComplete="off"
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && filtered[0]) {
                  event.preventDefault();
                  select(filtered[0]);
                }
                if (event.key === 'Escape') {
                  setOpen(false);
                  setQuery('');
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setQuery('');
              }}
              aria-label="Tutup pencarian"
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="searchable-panel" role="listbox">
            {filtered.length ? (
              filtered.map(option => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={value === option}
                  className={value === option ? 'is-active' : ''}
                  onClick={() => select(option)}
                >
                  <span>{option}</span>
                  {value === option && <Check aria-hidden="true" />}
                </button>
              ))
            ) : (
              <p className="searchable-empty">Tidak ditemukan</p>
            )}
          </div>
        </>
      ) : (
        <button
          type="button"
          className={`searchable-trigger${value ? ' has-value' : ''}`}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <span>{value || placeholder}</span>
          <span className="searchable-tools">
            {value && (
              <span
                className="date-clear"
                role="button"
                tabIndex={0}
                aria-label={`Kosongkan ${label.toLowerCase()}`}
                onClick={event => {
                  event.stopPropagation();
                  onChange('');
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onChange('');
                  }
                }}
              >
                <X aria-hidden="true" />
              </span>
            )}
            <ChevronDown aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}
