"use client";

import { useMemo, useState } from "react";

import { CloseIcon } from "@/components/ui/icons";
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

  function clear() {
    emit.cancel();
    setDraft("");
    onValueChange("");
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
      {draft ? (
        <button type="button" className="ui-search-clear" aria-label="Clear search" onClick={clear}>
          <CloseIcon width={14} height={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
