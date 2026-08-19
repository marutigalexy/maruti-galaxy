type JobTypeBadgeProps = {
  type: string;
};

const TONES: Record<string, "sarin" | "dropping" | "galaxy"> = {
  Sarin: "sarin",
  Dropping: "dropping",
  Galaxy: "galaxy",
};

export function JobTypeBadge({ type }: JobTypeBadgeProps) {
  const tone = TONES[type] ?? "sarin";

  return (
    <span className={`ui-badge ui-badge-${tone}`}>
      {type}
    </span>
  );
}
