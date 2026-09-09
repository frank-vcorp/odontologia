"use client";

import { useEffect, useState } from "react";

type Option = { id: string; label: string; sublabel?: string };

export function EntitySearchSelect({
  label,
  value,
  onChange,
  fetchUrl,
  mapItem,
  required,
  placeholder = "Buscar…",
}: {
  label: string;
  value: string;
  onChange: (id: string, item?: Option) => void;
  fetchUrl: string;
  mapItem: (item: Record<string, unknown>) => Option;
  required?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const url = query ? `${fetchUrl}?q=${encodeURIComponent(query)}` : fetchUrl;
      const res = await fetch(url);
      setLoading(false);
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.patients ?? data.services ?? data.items ?? []) as Record<string, unknown>[];
      setOptions(list.map(mapItem));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, fetchUrl, mapItem]);

  const selected = options.find((o) => o.id === value);

  return (
    <div className="field">
      <label>{label}{required ? " *" : ""}</label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      {loading && <p className="field-hint">Buscando…</p>}
      {selected && value && (
        <p className="text-sm text-[var(--text-secondary)]">
          Seleccionado: <strong>{selected.label}</strong>
          {selected.sublabel ? ` · ${selected.sublabel}` : ""}
        </p>
      )}
      {options.length > 0 && (
        <div className="panel max-h-40 overflow-auto">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-2)]${value === opt.id ? " bg-[var(--accent-soft)]" : ""}`}
              onClick={() => {
                onChange(opt.id, opt);
                setQuery(opt.label);
              }}
            >
              {opt.label}
              {opt.sublabel ? <span className="text-[var(--muted)]"> · {opt.sublabel}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
