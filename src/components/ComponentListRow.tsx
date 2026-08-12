// Compact horizontal row for the directory list view. Shares the same props
// shape as ComponentCard; thumbnail (when enabled) renders on the right.
import { DownloadIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import type { CuratedBadge } from "./ComponentCard";

interface ComponentListRowProps {
  name: string;
  componentName?: string;
  slug?: string;
  shortDescription?: string;
  description: string;
  category?: string;
  thumbnailUrl?: string;
  // Global list-view thumbnail toggle from admin settings
  showThumbnail?: boolean;
  authorUsername?: string;
  authorAvatar?: string;
  weeklyDownloads: number;
  allTimeDownloads?: number;
  // Downloads display mode from admin settings (defaults match current behavior)
  showWeeklyDownloads?: boolean;
  showAllTimeDownloads?: boolean;
  convexVerified?: boolean;
  communitySubmitted?: boolean;
  curatedBadges?: CuratedBadge[];
  featured?: boolean;
  npmUrl: string;
  repositoryUrl?: string;
  className?: string;
}

export function ComponentListRow({
  name,
  componentName,
  slug,
  shortDescription,
  description,
  thumbnailUrl,
  showThumbnail = false,
  authorUsername,
  authorAvatar,
  weeklyDownloads,
  allTimeDownloads,
  showWeeklyDownloads = true,
  showAllTimeDownloads = false,
  convexVerified,
  communitySubmitted,
  curatedBadges,
  npmUrl,
  className,
}: ComponentListRowProps) {
  const curatedBadgeImages = (curatedBadges ?? []).filter((b) => b.badgeUrl);
  const displayName = componentName || name;
  const displayDescription = shortDescription || description;
  const shouldShowThumbnail = Boolean(thumbnailUrl && showThumbnail);

  // Use the base path for navigation (matches ComponentCard)
  const basePath = window.location.pathname.startsWith("/components")
    ? "/components"
    : "";
  const href = slug ? `${basePath}/${slug}` : npmUrl;

  // Format download count (B tier keeps huge all-time numbers compact)
  const formatDownloads = (count: number): string => {
    if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}B`;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const downloadParts: Array<string> = [];
  if (showWeeklyDownloads) {
    downloadParts.push(`${formatDownloads(weeklyDownloads)}/wk`);
  }
  if (showAllTimeDownloads && allTimeDownloads !== undefined) {
    downloadParts.push(`${formatDownloads(allTimeDownloads)} total`);
  }
  const downloadsText = downloadParts.join(" \u00b7 ");

  return (
    <a
      href={href}
      className={`group flex items-center gap-4 px-3 py-3 transition-colors hover:bg-bg-hover ${className ?? ""}`}
    >
      {/* Left: name, description, meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-medium leading-tight text-neutral-n12">
            {curatedBadgeImages.map((badge) => (
              <img
                key={badge.categorySlug}
                src={badge.badgeUrl}
                alt={badge.label}
                title={badge.label}
                className="mr-1.5 inline-block h-4 w-auto max-w-[80px] object-contain align-[-2px]"
                loading="lazy"
              />
            ))}
            {displayName}
          </h3>
          {convexVerified && (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: "rgb(203, 237, 182)",
                color: "rgb(34, 137, 9)",
              }}
              title="Verified by Convex team"
            >
              <CheckCircledIcon className="w-3 h-3" />
              Verified
            </span>
          )}
          {communitySubmitted && (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: "#E9DDC2",
                color: "rgb(87, 74, 48)",
              }}
              title="Community submitted"
            >
              Community
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-[rgb(41_41_41/var(--tw-text-opacity,1))]">
          {displayDescription}
        </p>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-text-primary">
          {authorUsername && (
            <span className="flex min-w-0 items-center gap-1.5">
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt={authorUsername}
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded-full object-cover"
                  loading="lazy"
                />
              ) : null}
              <span className="truncate max-w-[170px] font-medium">
                {authorUsername}
              </span>
            </span>
          )}
          {downloadsText && (
            <span className="flex shrink-0 items-center gap-1 font-normal">
              <DownloadIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{downloadsText}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: optional thumbnail (fixed size so rows never shift) */}
      {shouldShowThumbnail && (
        <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-bg-secondary sm:w-32">
          <img
            src={thumbnailUrl}
            alt={displayName}
            width={1536}
            height={864}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
      )}
    </a>
  );
}
