import { Plus, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from './ui';

/** Editable list of short strings (inclusions, exclusions...). */
export function ListInput({
  label,
  values,
  onChange,
  placeholder,
  max = 12,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || values.length >= max || values.includes(v)) return;
    onChange([...values, v]);
    setDraft('');
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      {values.length > 0 && (
        <ul className="flex flex-col gap-1">
          {values.map((v, i) => (
            <li key={v + i} className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm">
              <span className="flex-1">{v}</span>
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="inline-flex size-6 items-center justify-center rounded-md hover:bg-black/5"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          className="input"
          value={draft}
          placeholder={placeholder}
          maxLength={120}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="outline" onClick={add} disabled={!draft.trim() || values.length >= max} icon={<Plus className="size-4" aria-hidden="true" />}>
          Add
        </Button>
      </div>
    </div>
  );
}
