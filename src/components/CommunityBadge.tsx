// Community badge shown on community-submitted components
import { PersonIcon } from "@radix-ui/react-icons";

interface CommunityBadgeProps {
  size?: "sm" | "md";
}

export function CommunityBadge({ size = "sm" }: CommunityBadgeProps) {
  const styles = size === "sm" ? "text-[11px] px-1.5 py-0.5 gap-0.5" : "text-xs px-2 py-1 gap-1";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${styles}`}
      style={{
        backgroundColor: "#E9DDC2",
        color: "rgb(87, 74, 48)",
      }}
      title="Community submitted">
      <PersonIcon className={iconSize} />
      Community
    </span>
  );
}
