export type DebouncedFn<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
};

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): DebouncedFn<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Args | undefined;

  const debounced = ((...args: Args) => {
    lastArgs = args;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      const currentArgs = lastArgs;
      lastArgs = undefined;
      if (currentArgs) {
        fn(...currentArgs);
      }
    }, waitMs);
  }) as DebouncedFn<Args>;

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    lastArgs = undefined;
  };

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
      const currentArgs = lastArgs;
      lastArgs = undefined;
      if (currentArgs) {
        fn(...currentArgs);
      }
    }
  };

  debounced.pending = () => timer !== undefined;

  return debounced;
}
