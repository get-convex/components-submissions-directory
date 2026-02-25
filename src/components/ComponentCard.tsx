// Card component for the directory grid listing
import { DownloadIcon, CheckCircledIcon } from "@radix-ui/react-icons";
interface ComponentCardProps {
  name: string;
  componentName?: string;
  slug?: string;
  shortDescription?: string;
  description: string;
  category?: string;
  thumbnailUrl?: string;
  // Override to hide thumbnail even if URL exists (used for category listings)
  showThumbnail?: boolean;
  authorUsername?: string;
  authorAvatar?: string;
  weeklyDownloads: number;
  convexVerified?: boolean;
  featured?: boolean;
  npmUrl: string;
  repositoryUrl?: string;
  className?: string;
}

export function ComponentCard({
  name,
  componentName,
  slug,
  shortDescription,
  description,
  thumbnailUrl,
  showThumbnail = true,
  authorUsername,
  authorAvatar,
  weeklyDownloads,
  convexVerified,
  featured,
  npmUrl,
  className,
}: ComponentCardProps) {
  const displayName = componentName || name;
  const rawDescription = shortDescription || description;
  const displayDescription =
    rawDescription.length > 113 ? `${rawDescription.slice(0, 113).trimEnd()}...` : rawDescription;
  // Only show thumbnail if URL exists AND showThumbnail is true
  const shouldShowThumbnail = thumbnailUrl && showThumbnail;
  const cardHeightClass = featured || shouldShowThumbnail ? "h-full" : "h-[190px]";
  const descriptionHeightClass = featured || shouldShowThumbnail ? "" : "min-h-[3rem]";

  // Use the base path for navigation
  const basePath = window.location.pathname.startsWith("/components") ? "/components" : "";
  const href = slug ? `${basePath}/${slug}` : npmUrl;

  // Format download count
  const formatDownloads = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <a
      href={href}
      className={`group flex ${cardHeightClass} flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${className ?? ""}`}>
      {/* Thumbnail */}
      {shouldShowThumbnail && (
        <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-bg-secondary">
          <img
            src={thumbnailUrl}
            alt={displayName}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
            loading="lazy"
          />
        </div>
      )}

      {/* Card body: flex-col so footer pins to bottom */}
      <div className="p-3 flex flex-col flex-1">
        {/* Header row: name */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="truncate text-lg font-medium leading-tight text-neutral-n12 md:text-lg">
            {displayName}
          </h3>
        </div>

        {/* Description */}
        <p
          className={`mb-3 line-clamp-3 text-xs leading-4 text-[rgb(41_41_41/var(--tw-text-opacity,1))] ${descriptionHeightClass}`}>
          {displayDescription}
        </p>

        {/* Spacer pushes footer content to bottom */}
        <div className="mt-auto">
          {/* Footer: author row, then downloads left and verified right */}
          <div className="text-xs text-text-primary">
            {authorUsername && (
              <div className="flex items-center gap-2.5">
                {authorAvatar ? (
                  <img
                    src={authorAvatar}
                    alt={authorUsername}
                    className="w-6 h-6 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : null}
                <span className="truncate max-w-[170px] text-base font-medium leading-tight md:text-sm">
                  {authorUsername}
                </span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 font-normal">
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>{formatDownloads(weeklyDownloads)}/wk</span>
              </div>
              {convexVerified && (
                <span
                  className="inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "rgb(203, 237, 182)",
                    color: "rgb(34, 137, 9)",
                  }}
                  title="Verified by Convex team">
                  <CheckCircledIcon className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
