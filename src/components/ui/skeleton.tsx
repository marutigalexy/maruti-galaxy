type SkeletonProps = {
  lines?: number;
};

export function Skeleton({ lines = 3 }: SkeletonProps) {
  return (
    <div className="ui-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="ui-skeleton-line" />
      ))}
    </div>
  );
}
