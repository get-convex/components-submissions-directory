import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at 3 AM UTC to check for stale packages
// The actual refresh logic checks admin settings for:
// - Whether auto-refresh is enabled
// - The interval setting (3/5/7 days) to determine staleness
crons.daily(
  "check-and-refresh-packages",
  { hourUTC: 3, minuteUTC: 0 },
  internal.packages.scheduledRefreshCheck,
);

export default crons;
