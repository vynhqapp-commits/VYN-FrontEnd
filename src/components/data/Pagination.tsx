import { Button } from "@/components/ui/button";
import { type PaginationMeta } from "@/lib/api";

export function Pagination({
  meta,
  onPageChange,
  className,
}: {
  meta: PaginationMeta | null;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (!meta) return null;
  const canPrev = meta.current_page > 1;
  const canNext = meta.current_page < meta.last_page;

  return (
    <div className={className ?? "flex items-center justify-between gap-3"}>
      <div className="text-xs text-muted-foreground">
        Page <span className="font-medium text-foreground">{meta.current_page}</span> of{" "}
        <span className="font-medium text-foreground">{meta.last_page}</span> ·{" "}
        <span className="font-medium text-foreground">{meta.total}</span> items
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(meta.current_page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(meta.current_page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

