import { Skeleton } from "@bitcredit/ui-library";

export function KeysetLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
