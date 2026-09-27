'use client';

import { CalendarDays, ChevronLeft, ChevronRight, Crosshair, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MONTHS_LONG, toDateInputValue } from '@/lib/format';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const YEAR_WINDOW = 4;

function formatLabel(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  return `${day} ${MONTHS_LONG[month - 1]} ${year}`;
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Pemilih tanggal ringkas: bulan/tahun + kalender, tanpa dependensi luar. */
export default function DatePicker({
  value,
  onChange,
  label = 'Tanggal',
  required = true,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}) {
  const today = useMemo(() => new Date(), []);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(value, today));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setView(startOfMonth(value, today));
  }, [value, today]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const todayValue = toDateInputValue(today);
  const minYear = today.getFullYear() - (YEAR_WINDOW - 1);
  const years = Array.from({ length: YEAR_WINDOW }, (_, index) => String(today.getFullYear() - index));

  const cells = useMemo(() => {
    const leading = (new Date(year, month, 1).getDay() + 6) % 7;
    const total = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: leading + total }, (_, index) =>
      index < leading ? null : index - leading + 1,
    );
  }, [year, month]);

  const pick = (day: number) => {
    onChange(iso(year, month, day));
    setOpen(false);
  };

  return (
    <div className="form-field date-picker" ref={rootRef}>
      <span>
        {label} {required && <b>*</b>}
      </span>

      <button
        type="button"
        className={`date-trigger${value ? ' has-value' : ''}`}
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarDays aria-hidden="true" />
        <span>{value ? formatLabel(value) : 'Pilih tanggal'}</span>
        <span className="date-tools">
          {value && (
            <span
              className="date-clear"
              role="button"
              tabIndex={0}
              aria-label="Kosongkan tanggal"
              onClick={event => {
                event.stopPropagation();
                onChange('');
                setOpen(false);
              }}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange('');
                  setOpen(false);
                }
              }}
            >
              <X aria-hidden="true" />
            </span>
          )}
          <ChevronRight aria-hidden="true" className="date-caret" />
        </span>
      </button>

      {open && (
        <div className="date-panel" role="dialog" aria-label="Pilih tanggal">
          <div className="date-panel-head">
            <span className="ico">
              <CalendarDays aria-hidden="true" />
            </span>
            <span>
              <small>Pilih tanggal</small>
              <strong>{value ? formatLabel(value) : 'Laporan lapangan'}</strong>
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup kalender">
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="date-period">
            <select
              className="mini-select"
              value={month}
              onChange={event => setView(new Date(year, Number(event.target.value), 1))}
              aria-label="Pilih bulan"
            >
              {MONTHS_LONG.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="date-step"
              disabled={year === minYear && month === 0}
              onClick={() => setView(new Date(year, month - 1, 1))}
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <select
              className="mini-select"
              value={year}
              onChange={event => setView(new Date(Number(event.target.value), month, 1))}
              aria-label="Pilih tahun"
            >
              {years.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="date-grid dow">
            {WEEKDAYS.map(day => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="date-grid day">
            {cells.map((day, index) =>
              day ? (
                <button
                  key={day}
                  type="button"
                  className={`${value === iso(year, month, day) ? 'picked ' : ''}${
                    iso(year, month, day) === todayValue ? 'today' : ''
                  }`}
                  onClick={() => pick(day)}
                >
                  {day}
                </button>
              ) : (
                <span key={`blank-${index}`} />
              ),
            )}
          </div>

          <div className="date-panel-foot">
            <button
              type="button"
              className="date-today"
              onClick={() => {
                onChange(todayValue);
                setView(startOfMonth(todayValue, today));
                setOpen(false);
              }}
            >
              <Crosshair aria-hidden="true" /> Hari ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function startOfMonth(value: string, fallback: Date): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }
  return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
}
