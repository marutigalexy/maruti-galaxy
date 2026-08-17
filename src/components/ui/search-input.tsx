"use client";

import { useMemo, useState } from "react";

import { debounce } from "@/lib/ui/debounce";

type SearchInputProps = {
  id?: string;
  label?: string;
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
};

export function SearchInput({
  id = "search",
  label = "Search",
  value,
  placeholder = "Search",
  onValueChange,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const [seenValue, setSeenValue] = useState(value);
  const emit = useMemo(() => debounce(onValueChange, 300), [onValueChange]);

  if (value !== seenValue) {
    setSeenValue(value);
    setDraft(value);
  }

  return (
    <div className="ui-search-wrap">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        className="ui-search"
        type="search"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          emit(next);
        }}
      />
    </div>
  );
}
