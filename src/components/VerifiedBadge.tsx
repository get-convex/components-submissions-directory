// Convex Verified badge shown on verified components
import { CheckCircledIcon } from "@radix-ui/react-icons";

interface VerifiedBadgeProps {
  size?: "sm" | "md";
}

export function VerifiedBadge({ size = "sm" }: VerifiedBadgeProps) {
  const styles = size === "sm" ? "text-[11px] px-1.5 py-0.5 gap-0.5" : "text-xs px-2 py-1 gap-1";

  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${styles}`}
      style={{
        backgroundColor: "rgb(203, 237, 182)",
        color: "rgb(34, 137, 9)",
      }}
      title="Verified by Convex team">
      <CheckCircledIcon className={iconSize} />
      Convex Verified
    </span>
  );
}
