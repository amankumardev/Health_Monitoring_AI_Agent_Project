import { useState } from 'react';
import { Plus, Trash2, X, Save } from 'lucide-react';

export type BatchFieldType = 'text' | 'number' | 'date' | 'datetime-local' | 'select';

export interface BatchField {
  key: string;
  label: string;
  type: BatchFieldType;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  step?: string;
  width?: string;
}

export type BatchRow = Record<string, any>;

interface BatchAddFormProps {
  title: string;
  fields: BatchField[];
  defaultRow: () => BatchRow;
  validate?: (row: BatchRow) => string | null;
  onSubmit: (rows: BatchRow[]) => Promise<void> | void;
  onError?: (message: string) => void;
  onClose: () => void;
  submitLabel?: string;
  helperText?: string;
  initialRows?: number;
  initialRowData?: BatchRow[];
  isRowEmptyOverride?: (row: BatchRow) => boolean;
}

function isRowEmpty(row: BatchRow, fields: BatchField[]): boolean {
  return fields.every(f => {
    const v = row[f.key];
    return v === undefined || v === null || String(v).trim() === '';
  });
}

export default function BatchAddForm({
  title,
  fields,
  defaultRow,
  validate,
  onSubmit,
  onError,
  onClose,
  submitLabel = 'Save All',
  helperText,
  initialRows = 3,
  initialRowData,
  isRowEmptyOverride,
}: BatchAddFormProps) {
  const make = () => initialRowData?.map(row => ({ ...row })) ?? Array.from({ length: initialRows }, () => defaultRow());
  const [rows, setRows] = useState<BatchRow[]>(make);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const updateCell = (rowIdx: number, key: string, value: any) => {
    setRows(prev => prev.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r)));
    setErrors(prev => {
      if (!prev[rowIdx]) return prev;
      const next = { ...prev };
      delete next[rowIdx];
      return next;
    });
  };

  const addRow = () => setRows(prev => [...prev, defaultRow()]);

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
    setErrors(prev => {
      if (!prev[idx]) return prev;
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const reset = () => {
    setRows(make());
    setErrors({});
    setGlobalError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setGlobalError(null);
    const emptyRow = (row: BatchRow) => isRowEmptyOverride ? isRowEmptyOverride(row) : isRowEmpty(row, fields);
    const filled = rows.filter(row => !emptyRow(row));
    if (filled.length === 0) {
      setGlobalError('Please fill in at least one row before saving.');
      return;
    }
    const nextErrors: Record<number, string> = {};
    filled.forEach((row) => {
      const originalIdx = rows.indexOf(row);
      if (validate) {
        const err = validate(row);
        if (err) nextErrors[originalIdx] = err;
      } else {
        for (const f of fields) {
          if (f.required && (row[f.key] === undefined || row[f.key] === null || String(row[f.key]).trim() === '')) {
            nextErrors[originalIdx] = `${f.label} is required`;
            break;
          }
        }
      }
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setGlobalError('Please fix the highlighted rows.');
      return;
    }
    try {
      setSaving(true);
      await onSubmit(filled);
      reset();
    } catch (e: any) {
      const message = e?.message || 'Could not save. Please try again.';
      setGlobalError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm w-full focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none';

  const renderInput = (f: BatchField, row: BatchRow, idx: number) => {
    const widthStyle = f.width ? { maxWidth: f.width } : undefined;
    if (f.type === 'select') {
      return (
        <select
          value={(row[f.key] as string) ?? ''}
          onChange={(e) => updateCell(idx, f.key, e.target.value)}
          className={inputClass}
          style={widthStyle}
        >
          <option value="">Select…</option>
          {f.options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={f.type}
        step={f.step}
        required={f.required}
        placeholder={f.placeholder}
        value={(row[f.key] as any) ?? ''}
        onChange={(e) => updateCell(idx, f.key, e.target.value)}
        className={inputClass}
        style={widthStyle}
      />
    );
  };

  const filledCount = rows.filter(row => !(isRowEmptyOverride ? isRowEmptyOverride(row) : isRowEmpty(row, fields))).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
      <div className="w-full max-w-5xl rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            {helperText && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div
            className="mb-3 hidden md:grid gap-2"
            style={{ gridTemplateColumns: `auto repeat(${fields.length}, minmax(0, 1fr)) auto` }}
          >
            <div />
            {fields.map(f => (
              <div key={f.key} className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {f.label}{f.required ? ' *' : ''}
              </div>
            ))}
            <div />
          </div>

          <div className="space-y-3">
            {rows.map((row, idx) => {
              const rowError = errors[idx];
              return (
                <div
                  key={idx}
                  className={`rounded-xl border bg-slate-50/50 dark:bg-slate-900/30 px-3 py-3 ${
                    rowError ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div
                    className="grid items-start gap-2"
                    style={{ gridTemplateColumns: `auto repeat(${fields.length}, minmax(0, 1fr)) auto` }}
                  >
                    <div className="hidden md:flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40 text-xs font-bold text-teal-700 dark:text-teal-300 mt-1">
                      {idx + 1}
                    </div>
                    {fields.map(f => (
                      <div key={f.key}>
                        <label className="mb-1 block md:hidden text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {f.label}{f.required ? ' *' : ''}
                        </label>
                        {renderInput(f, row, idx)}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition disabled:opacity-30"
                      disabled={rows.length === 1}
                      aria-label="Remove row"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {rowError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">{rowError}</p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="mt-4 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300"
          >
            <Plus size={15} /> Add another row
          </button>

          {globalError && (
            <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-300">
              {globalError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filledCount} of {rows.length} row(s) filled. Empty rows are skipped.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              <Save size={15} />
              {saving ? 'Saving…' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
