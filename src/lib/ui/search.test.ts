import { describe, expect, it, vi } from "vitest";

import { debounce } from "@/lib/ui/debounce";

describe("search debounce functionality", () => {
  it("properly debounces rapid character inputs and emits only the final search string", async () => {
    const emitted: string[] = [];
    const debouncedSearch = debounce((query: string) => {
      emitted.push(query);
    }, 50);

    // Simulate rapid typing: "U", "Us", "Use", "User" (10ms between keystrokes)
    debouncedSearch("U");
    expect(debouncedSearch.pending()).toBe(true);

    await new Promise((r) => setTimeout(r, 10));
    debouncedSearch("Us");

    await new Promise((r) => setTimeout(r, 10));
    debouncedSearch("Use");

    await new Promise((r) => setTimeout(r, 10));
    debouncedSearch("User");

    // Before debounce duration elapses, nothing should be emitted
    expect(emitted).toEqual([]);

    // Wait for the debounce interval to finish
    await new Promise((r) => setTimeout(r, 70));

    // Only the final typed string must be emitted
    expect(emitted).toEqual(["User"]);
    expect(debouncedSearch.pending()).toBe(false);
  });

  it("immediately flushes queued search query when flush() is invoked", () => {
    const fn = vi.fn();
    const debouncedSearch = debounce(fn, 100);

    debouncedSearch("Diamond");
    expect(fn).not.toHaveBeenCalled();

    debouncedSearch.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("Diamond");
    expect(debouncedSearch.pending()).toBe(false);
  });

  it("cancels pending search when cancel() is called", async () => {
    const fn = vi.fn();
    const debouncedSearch = debounce(fn, 50);

    debouncedSearch("Kapan-101");
    expect(debouncedSearch.pending()).toBe(true);

    debouncedSearch.cancel();
    expect(debouncedSearch.pending()).toBe(false);

    await new Promise((r) => setTimeout(r, 70));
    expect(fn).not.toHaveBeenCalled();
  });

  it("handles empty query strings cleanly", async () => {
    const emitted: string[] = [];
    const debouncedSearch = debounce((query: string) => {
      emitted.push(query);
    }, 30);

    debouncedSearch("");
    await new Promise((r) => setTimeout(r, 50));
    expect(emitted).toEqual([""]);
  });
});
