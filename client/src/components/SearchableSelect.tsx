import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Search…', className, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = query
    ? options
        .map(o => ({ ...o, score: o.label.toLowerCase().indexOf(query.toLowerCase()) }))
        .filter(o => o.score >= 0 || o.label.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.score - b.score)
    : options;

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) { if (e.key !== 'Tab') setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted].value);
    }
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  }

  function select(val: string) {
    onChange(val);
    setQuery('');
    setOpen(false);
  }

  function handleFocus() {
    setQuery('');
    setOpen(true);
  }

  function handleBlur() {
    // small delay so click on option registers before blur hides list
    setTimeout(() => setOpen(false), 150);
  }

  const displayValue = open ? query : (selected?.label ?? '');

  return (
    <div className={`relative ${className ?? ''}`} ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="input pr-8"
        />
        {/* Dropdown arrow */}
        <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
        {/* Clear button */}
        {value && !open && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onChange(''); }}
            className="absolute right-7 top-1/2 -translate-y-1/2 text-muted hover:text-primary leading-none text-lg"
          >×</button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-theme rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto animate-slide-up">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted text-center">
              {query ? `No match for "${query}"` : 'No options'}
            </p>
          ) : (
            filtered.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={() => select(opt.value)}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                  i === highlighted ? 'bg-green-500/15 text-green-400' : 'hover:bg-input text-primary'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {opt.sublabel && <span className="text-xs text-muted flex-shrink-0">{opt.sublabel}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
