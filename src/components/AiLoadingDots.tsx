import { DotsNine } from "@phosphor-icons/react";

export default function AiLoadingDots({ size = 16 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <DotsNine size={size} weight="bold" className="animate-pulse" />
      <span className="text-inherit animate-pulse">AI is working</span>
    </span>
  );
}
