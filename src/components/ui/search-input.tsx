"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";

import { CloseIcon } from "@/components/ui/icons";
import { debounce } from "@/lib/ui/debounce";

type SearchInputProps = {
  id?: string;
  label?: string;
  value: string;
  placeholder?: string;
  debounceMs?: number;
  onValueChange: (value: string) => void;
};

export function SearchInput({
  id = "search",
  label = "Search",
  value,
  placeholder = "Search",
  debounceMs = 300,
  onValueChange,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);

  // Keep a fresh reference to onValueChange so debouncing never calls a stale closure
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  // Track the latest value emitted by this component
  const latestEmittedRef = useRef<string | null>(null);

  // Stable debounced emitter that does NOT recreate when parent re-renders
  const emit = useMemo(() => {
    return debounce((nextValue: string) => {
      latestEmittedRef.current = nextValue;
      onValueChangeRef.current(nextValue);
    }, debounceMs);
  }, [debounceMs]);

  // Clean up any pending timer on unmount
  useEffect(() => {
    return () => {
      emit.cancel();
    };
  }, [emit]);

  // Synchronize draft only when value changes externally (e.g. Reset button or URL change)
  useEffect(() => {
    if (latestEmittedRef.current !== null && value === latestEmittedRef.current) {
      latestEmittedRef.current = null;
      return;
    }

    emit.cancel();
    latestEmittedRef.current = null;
    setDraft(value);
  }, [value, emit]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setDraft(next);
    emit(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      emit.cancel();
      latestEmittedRef.current = draft;
      onValueChangeRef.current(draft);
    } else if (event.key === "Escape") {
      event.preventDefault();
      clear();
    }
  }

  function clear() {
    emit.cancel();
    latestEmittedRef.current = "";
    setDraft("");
    onValueChangeRef.current("");
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
        autoComplete="off"
        spellCheck={false}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {draft ? (
        <button
          type="button"
          className="ui-search-clear"
          aria-label="Clear search"
          onClick={clear}
        >
          <CloseIcon width={14} height={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
