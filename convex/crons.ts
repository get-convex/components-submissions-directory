import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at 3 AM UTC to check for stale packages.
// Actual refresh execution is still gated by:
// - autoRefreshEnabled
// - refreshIntervalDays (staleness window)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
crons.cron(
  "check-and-refresh-packages",
  "0 3 * * *",
  internal.packages.scheduledRefreshCheck as any,
  {},
);

// Run weekly on Sundays at 4 AM UTC to clean up failed thumbnail jobs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
crons.cron(
  "cleanup-old-thumbnail-jobs",
  "0 4 * * 0",
  internal.thumbnails._cleanupOldThumbnailJobs as any,
  {},
);

// Run daily at 2 AM UTC to clean up packages marked for deletion
// Actual deletion is gated by:
// - autoDeleteMarkedPackages setting
// - deleteIntervalDays (waiting period before permanent deletion)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
crons.cron(
  "cleanup-marked-for-deletion",
  "0 2 * * *",
  internal.packages.scheduledDeletionCleanup as any,
  {},
);

export default crons;
