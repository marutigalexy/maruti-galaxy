import { SAFE_INTERNAL_MESSAGE } from "@/lib/api/result";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  description = SAFE_INTERNAL_MESSAGE,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="ui-error" role="alert">
      <h2>{title}</h2>
      <p>{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
