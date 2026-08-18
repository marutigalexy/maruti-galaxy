"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type PageTitleContextValue = {
  title?: string;
  description?: string;
  setTitle: (title: string | undefined) => void;
  setDescription: (description: string | undefined) => void;
};

const PageTitleContext = createContext<PageTitleContextValue>({
  setTitle: () => undefined,
  setDescription: () => undefined,
});

const ActionsSlotContext = createContext<HTMLElement | null>(null);
const SetActionsSlotContext = createContext<(node: HTMLElement | null) => void>(() => undefined);
const StatusSlotContext = createContext<HTMLElement | null>(null);
const SetStatusSlotContext = createContext<(node: HTMLElement | null) => void>(() => undefined);

export function PageChromeProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | undefined>();
  const [description, setDescription] = useState<string | undefined>();
  const [actionsEl, setActionsEl] = useState<HTMLElement | null>(null);
  const [statusEl, setStatusEl] = useState<HTMLElement | null>(null);
  const titleValue = useMemo(
    () => ({ title, description, setTitle, setDescription }),
    [title, description],
  );

  return (
    <PageTitleContext.Provider value={titleValue}>
      <SetStatusSlotContext.Provider value={setStatusEl}>
        <StatusSlotContext.Provider value={statusEl}>
          <SetActionsSlotContext.Provider value={setActionsEl}>
            <ActionsSlotContext.Provider value={actionsEl}>{children}</ActionsSlotContext.Provider>
          </SetActionsSlotContext.Provider>
        </StatusSlotContext.Provider>
      </SetStatusSlotContext.Provider>
    </PageTitleContext.Provider>
  );
}

export function usePageTitleValue() {
  return useContext(PageTitleContext).title;
}

export function usePageDescriptionValue() {
  return useContext(PageTitleContext).description;
}

export function useSetActionsSlot() {
  return useContext(SetActionsSlotContext);
}

export function useSetStatusSlot() {
  return useContext(SetStatusSlotContext);
}

export function useRecordTitle(title: string, description?: string) {
  const { setTitle, setDescription } = useContext(PageTitleContext);

  useLayoutEffect(() => {
    setTitle(title);
    setDescription(description);
    return () => {
      setTitle(undefined);
      setDescription(undefined);
    };
  }, [description, setDescription, setTitle, title]);
}

export function TopbarActions({ children }: { children: ReactNode }) {
  const slot = useContext(ActionsSlotContext);
  if (!slot) {
    return null;
  }
  return createPortal(children, slot);
}

export function TopbarStatus({ children }: { children: ReactNode }) {
  const slot = useContext(StatusSlotContext);
  if (!slot) {
    return null;
  }
  return createPortal(children, slot);
}
