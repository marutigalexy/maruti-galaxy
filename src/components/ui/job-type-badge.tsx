type JobTypeBadgeProps = {
  type: string;
};

const TONES: Record<string, "sarin" | "dropping" | "galaxy" | "completed"> = {
  Sarin: "sarin",
  Dropping: "dropping",
  Galaxy: "galaxy",
  Completed: "completed",
};

export function JobTypeBadge({ type }: JobTypeBadgeProps) {
  const tone = TONES[type] ?? (type.toLowerCase() === "completed" ? "completed" : "sarin");

  return (
    <span className={`ui-badge ui-badge-${tone}`}>
      {type}
    </span>
  );
}
