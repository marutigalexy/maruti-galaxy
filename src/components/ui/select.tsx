"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

type OptionItem = {
  value: string;
  label: string;
  disabled: boolean;
};

function flattenLabel(node: ReactNode): string {
  if (node == null || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(flattenLabel).join("");
  }
  return "";
}

function readOptions(children: ReactNode): OptionItem[] {
  const items: OptionItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)) {
      return;
    }
    if (child.type !== "option") {
      return;
    }
    items.push({
      value: child.props.value == null ? "" : String(child.props.value),
      label: flattenLabel(child.props.children).trim(),
      disabled: Boolean(child.props.disabled),
    });
  });
  return items;
}

function nextEnabledIndex(options: OptionItem[], from: number, step: 1 | -1) {
  if (options.length === 0) {
    return -1;
  }
  let index = from;
  for (let i = 0; i < options.length; i += 1) {
    index = (index + step + options.length) % options.length;
    if (!options[index]?.disabled) {
      return index;
    }
  }
  return from;
}

export function Select({
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  id,
  name,
  required,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  ...props
}: SelectProps) {
  const isControlled = value !== undefined;
  const options = useMemo(() => readOptions(children), [children]);
  const [internalValue, setInternalValue] = useState(() =>
    defaultValue == null ? "" : String(defaultValue),
  );
  const current = isControlled ? String(value ?? "") : internalValue;
  const selectedIndex = options.findIndex((option) => option.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : options[0];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const nativeRef = useRef<HTMLSelectElement>(null);
  const skipNativeChange = useRef(false);
  const listId = useId();

  function commit(next: string) {
    if (next !== current) {
      if (!isControlled) {
        setInternalValue(next);
      }
      const native = nativeRef.current;
      if (native) {
        skipNativeChange.current = true;
        native.value = next;
        native.dispatchEvent(new Event("change", { bubbles: true }));
        skipNativeChange.current = false;
      }
      onChange?.({
        target: native ?? { value: next, name: name ?? "" },
        currentTarget: native ?? { value: next, name: name ?? "" },
      } as ChangeEvent<HTMLSelectElement>);
    }
    setOpen(false);
    triggerRef.current?.focus();
  }

  function positionMenu() {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const maxHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
    const height = Math.min(maxHeight, Math.max(120, openUp ? spaceAbove - 8 : spaceBelow - 8));
    menu.style.width = `${rect.width}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.maxHeight = `${height}px`;
    if (openUp) {
      menu.style.top = "auto";
      menu.style.bottom = `${window.innerHeight - rect.top + gap}px`;
    } else {
      menu.style.bottom = "auto";
      menu.style.top = `${rect.bottom + gap}px`;
    }
  }

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const menu = menuRef.current;
    if (menu && typeof menu.showPopover === "function" && !menu.matches(":popover-open")) {
      menu.showPopover();
    }
    positionMenu();
  }, [open, options.length]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    menuRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onReposition() {
      positionMenu();
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  function highlightedIndex() {
    return selectedIndex >= 0 ? selectedIndex : nextEnabledIndex(options, -1, 1);
  }

  function openMenu() {
    setActiveIndex(highlightedIndex());
    setOpen(true);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setActiveIndex((currentIndex) =>
        nextEnabledIndex(options, currentIndex, event.key === "ArrowDown" ? 1 : -1),
      );
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const item = options[activeIndex];
      if (item && !item.disabled) {
        commit(item.value);
      }
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className={["ui-select-wrap", className].filter(Boolean).join(" ")}>
      <select
        {...props}
        ref={nativeRef}
        className="ui-select-native sr-only"
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        required={required}
        disabled={disabled}
        value={current}
        onChange={(event) => {
          if (skipNativeChange.current) {
            return;
          }
          if (!isControlled) {
            setInternalValue(event.target.value);
          }
          onChange?.(event);
        }}
        onInvalid={() => triggerRef.current?.focus()}
      >
        {children}
      </select>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={["ui-select", "ui-select-trigger", open ? "is-open" : "", className]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onClick={() => {
          if (disabled) {
            return;
          }
          if (open) {
            setOpen(false);
          } else {
            openMenu();
          }
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="ui-select-value">{selected?.label || "\u00a0"}</span>
        <ChevronDownIcon className="ui-select-chevron" width={16} height={16} />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={listId}
          popover="manual"
          className="ui-select-menu"
          role="listbox"
          aria-labelledby={id}
          onToggle={(event) => {
            if (event.newState === "closed") {
              setOpen(false);
            }
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === current;
            return (
              <div
                key={`${option.value}-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                className={[
                  "ui-select-option",
                  isSelected ? "is-selected" : "",
                  index === activeIndex ? "is-active" : "",
                  option.disabled ? "is-disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => {
                  if (!option.disabled) {
                    setActiveIndex(index);
                  }
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (!option.disabled) {
                    commit(option.value);
                  }
                }}
              >
                <span className="ui-select-option-label">{option.label}</span>
                {isSelected ? <CheckIcon className="ui-select-check" width={16} height={16} /> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
