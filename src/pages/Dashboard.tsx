import { useState, useMemo, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth";
import Header from "../components/Header";
import {
  Package,
  UsersThree,
  ShieldCheck,
  CalendarCheck,
  DownloadSimple,
  ClockCounterClockwise,
  ArrowsClockwise,
  FunnelSimple,
  SortAscending,
  MagnifyingGlass,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  X,
  CalendarBlank,
  Info,
  CaretDown,
} from "@phosphor-icons/react";

function useBasePath() {
  return "/components";
}

// Oct 1, 2025 00:00:00 UTC
const OCT_2025_EPOCH = new Date("2025-10-01T00:00:00Z").getTime();

// Same heuristic as backend
function isConvexTeamPackage(pkg: {
  name: string;
  collaborators: Array<{ name: string; avatar: string }>;
  convexVerified?: boolean;
  communitySubmitted?: boolean;
}): boolean {
  if (pkg.name.startsWith("@convex-dev/")) return true;
  const teamUsernames = ["convex", "get-convex", "convex-dev"];
  if (pkg.collaborators.some((c) => teamUsernames.includes(c.name.toLowerCase()))) {
    return true;
  }
  if (pkg.convexVerified && !pkg.communitySubmitted) return true;
  return false;
}

function resolveAuthor(pkg: {
  authorUsername?: string;
  collaborators: Array<{ name: string; avatar: string }>;
}): string {
  if (pkg.authorUsername) return pkg.authorUsername;
  if (pkg.collaborators.length > 0) return pkg.collaborators[0].name;
  return "Unknown";
}

function resolveAvatar(pkg: {
  authorAvatar?: string;
  collaborators: Array<{ name: string; avatar: string }>;
}): string {
  if (pkg.authorAvatar) return pkg.authorAvatar;
  if (pkg.collaborators.length > 0) return pkg.collaborators[0].avatar;
  return "";
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

type SortField = "name" | "author" | "downloads" | "submittedAt" | "lastPublish";
type SortDir = "asc" | "desc";
type TypeFilter = "all" | "community" | "convex-team";
type DateFilter = "all" | "pre-oct-2025" | "oct-2025-plus" | "custom";

// ─── Stat Card ──────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  sublabel,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-text-secondary">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-light text-text-primary">{typeof value === "number" ? formatNumber(value) : value}</div>
      {sublabel && <span className="text-xs text-text-secondary">{sublabel}</span>}
    </div>
  );
}

// ─── Author Summary Row ─────────────────────────────────────────────
function AuthorRow({
  author,
  avatar,
  count,
  downloads,
  isConvexTeam,
}: {
  author: string;
  avatar: string;
  count: number;
  downloads: number;
  isConvexTeam: boolean;
}) {
  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-gray-50/50 transition-colors">
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          {avatar ? (
            <img src={avatar} alt={author} className="w-5 h-5 rounded-full" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-200" />
          )}
          <span className="text-sm text-text-primary font-medium">{author}</span>
        </div>
      </td>
      <td className="py-2 px-3 text-sm text-text-primary text-right">{count}</td>
      <td className="py-2 px-3 text-sm text-text-primary text-right">{formatNumber(downloads)}</td>
      <td className="py-2 px-3">
        {isConvexTeam ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
            <ShieldCheck size={12} weight="fill" /> get-convex
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">
            <UsersThree size={12} weight="fill" /> Community
          </span>
        )}
      </td>
    </tr>
  );
}

// ─── Monthly Timeline Bar ───────────────────────────────────────────
function MonthBar({
  month,
  count,
  communityCount,
  convexTeamCount,
  maxCount,
}: {
  month: string;
  count: number;
  communityCount: number;
  convexTeamCount: number;
  maxCount: number;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const teamPct = count > 0 ? (convexTeamCount / count) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary w-16 shrink-0 text-right font-mono">{month}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative">
        <div
          className="h-full flex rounded"
          style={{ width: `${Math.max(pct, 2)}%` }}
        >
          <div
            className="h-full bg-blue-400"
            style={{ width: `${teamPct}%` }}
            title={`get-convex: ${convexTeamCount}`}
          />
          <div
            className="h-full bg-green-400"
            style={{ width: `${100 - teamPct}%` }}
            title={`Community: ${communityCount}`}
          />
        </div>
      </div>
      <span className="text-xs text-text-primary font-medium w-8 text-right">{count}</span>
    </div>
  );
}

// ─── Sort Header ────────────────────────────────────────────────────
function SortHeader({
  label,
  field,
  currentSort,
  currentDir,
  onSort,
  align,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDir: SortDir;
  onSort: (f: SortField) => void;
  align?: "right";
}) {
  const active = currentSort === field;
  return (
    <th
      className={`py-2 px-3 text-xs font-medium text-text-secondary uppercase tracking-wide cursor-pointer select-none hover:text-text-primary transition-colors ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          currentDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
        ) : null}
      </span>
    </th>
  );
}

// ─── Redirect non-admin ─────────────────────────────────────────────
function RedirectToProfile() {
  const basePath = useBasePath();
  useEffect(() => {
    window.location.replace(`${basePath}/profile`);
  }, [basePath]);
  return (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-button" />
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────
export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const isAdmin = useQuery(api.auth.isAdmin);

  const stats = useQuery(api.dashboard.getDashboardStats);
  const allPackages = useQuery(api.packages.getAllPackages);
  const triggerRefreshAll = useAction(api.packages.triggerManualRefreshAll);

  const isLoading =
    authLoading || (isAuthenticated && (loggedInUser === undefined || isAdmin === undefined));

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [excludedAuthors, setExcludedAuthors] = useState<Set<string>>(new Set());
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("downloads");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Refresh npm data for all packages
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const result = await triggerRefreshAll();
      setRefreshResult(`Queued ${result.packagesQueued} packages for refresh`);
    } catch {
      setRefreshResult("Refresh failed. Try again.");
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshResult(null), 5000);
    }
  };

  // Parse custom date range into epoch timestamps
  const customFromTs = useMemo(() => {
    if (!customDateFrom) return 0;
    return new Date(customDateFrom + "T00:00:00Z").getTime();
  }, [customDateFrom]);
  const customToTs = useMemo(() => {
    if (!customDateTo) return Infinity;
    return new Date(customDateTo + "T23:59:59Z").getTime();
  }, [customDateTo]);

  // Active (non-archived, non-deleted) packages for the table
  const activePackages = useMemo(() => {
    if (!allPackages) return [];
    return allPackages.filter(
      (p) => p.visibility !== "archived" && !p.markedForDeletion,
    );
  }, [allPackages]);

  // Unique authors for filter dropdown
  const authorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const pkg of activePackages) {
      set.add(resolveAuthor(pkg));
    }
    return Array.from(set).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [activePackages]);

  // Filtered + sorted packages
  const filteredPackages = useMemo(() => {
    let list = activePackages;

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.componentName && p.componentName.toLowerCase().includes(q)) ||
          resolveAuthor(p).toLowerCase().includes(q),
      );
    }

    // Type
    if (typeFilter === "community") {
      list = list.filter((p) => !isConvexTeamPackage(p));
    } else if (typeFilter === "convex-team") {
      list = list.filter((p) => isConvexTeamPackage(p));
    }

    // Date
    if (dateFilter === "pre-oct-2025") {
      list = list.filter((p) => (p.submittedAt || p._creationTime) < OCT_2025_EPOCH);
    } else if (dateFilter === "oct-2025-plus") {
      list = list.filter((p) => (p.submittedAt || p._creationTime) >= OCT_2025_EPOCH);
    } else if (dateFilter === "custom") {
      list = list.filter((p) => {
        const ts = p.submittedAt || p._creationTime;
        return ts >= customFromTs && ts <= customToTs;
      });
    }

    // Author exclusion
    if (excludedAuthors.size > 0) {
      list = list.filter((p) => !excludedAuthors.has(resolveAuthor(p)));
    }

    // Sort
    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "author":
          return dir * resolveAuthor(a).localeCompare(resolveAuthor(b));
        case "downloads":
          return dir * (a.weeklyDownloads - b.weeklyDownloads);
        case "submittedAt":
          return dir * ((a.submittedAt || a._creationTime) - (b.submittedAt || b._creationTime));
        case "lastPublish":
          return dir * (new Date(a.lastPublish).getTime() - new Date(b.lastPublish).getTime());
        default:
          return 0;
      }
    });

    return list;
  }, [activePackages, search, typeFilter, dateFilter, customFromTs, customToTs, excludedAuthors, sortField, sortDir]);

  // Author summary from stats query
  const authorSummary = useMemo(() => {
    if (!stats) return [];
    let authors = stats.byAuthor;
    if (typeFilter === "community") {
      authors = authors.filter((a) => !a.isConvexTeam);
    } else if (typeFilter === "convex-team") {
      authors = authors.filter((a) => a.isConvexTeam);
    }
    if (excludedAuthors.size > 0) {
      authors = authors.filter((a) => !excludedAuthors.has(a.author));
    }
    return authors;
  }, [stats, typeFilter, excludedAuthors]);

  // Timeline from stats
  const timeline = useMemo(() => {
    if (!stats) return [];
    return stats.byMonth;
  }, [stats]);
  const maxMonthCount = useMemo(() => {
    return timeline.reduce((max, m) => Math.max(max, m.count), 0);
  }, [timeline]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" || field === "author" ? "asc" : "desc");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-button" />
          </div>
        ) : !isAuthenticated ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Package size={48} className="text-text-secondary" />
            <p className="text-text-secondary text-sm">Sign in with a @convex.dev email to access the dashboard.</p>
            <button
              onClick={() => {
                localStorage.setItem("authReturnPath", window.location.pathname);
                signIn();
              }}
              className="px-5 py-2 rounded-full text-sm font-medium bg-button-dark text-white hover:bg-button-dark-hover transition-colors"
            >
              Sign in
            </button>
          </div>
        ) : !isAdmin ? (
          <RedirectToProfile />
        ) : (
          <>
            {/* Title bar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-text-primary">Component Analytics</h1>
                <p className="text-sm text-text-secondary mt-0.5">
                  Stats for the team
                </p>
              </div>
              <div className="flex items-center gap-2">
                {refreshResult && (
                  <span className="text-xs text-green-700 bg-green-50 rounded-full px-2.5 py-1">
                    {refreshResult}
                  </span>
                )}
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${showFilters ? "bg-button text-white border-button" : "bg-white text-text-secondary border-border hover:border-gray-400"}`}
                >
                  <FunnelSimple size={14} />
                  Filters
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border bg-white text-text-secondary hover:border-gray-400 transition-colors disabled:opacity-50"
                >
                  <ArrowsClockwise size={14} className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? "Refreshing..." : "Refresh npm data"}
                </button>
              </div>
            </div>

            {/* Live data note */}
            <div className="flex items-center gap-2 text-xs text-text-secondary mb-4 bg-white rounded-lg border border-border px-3 py-2">
              <Info size={14} className="shrink-0" />
              <span>
                Data updates in real time via Convex reactive queries. Download counts reflect the latest stored npm weekly downloads.
                After a fresh deploy, click "Refresh npm data" to pull updated download numbers from npm.
              </span>
            </div>

            {/* ── Stat Cards ─────────────────────────────────────── */}
            {stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <StatCard
                  label="Total Components"
                  value={stats.total}
                  icon={<Package size={14} />}
                  sublabel={`${stats.approved} approved`}
                />
                <StatCard
                  label="Community"
                  value={stats.community}
                  icon={<UsersThree size={14} />}
                  sublabel={`${formatNumber(stats.communityDownloads)} wk downloads`}
                />
                <StatCard
                  label="get-convex"
                  value={stats.convexTeam}
                  icon={<ShieldCheck size={14} />}
                  sublabel={`${formatNumber(stats.convexTeamDownloads)} wk downloads`}
                />
                <StatCard
                  label="get-convex Oct 25+"
                  value={stats.convexTeamSinceOct2025}
                  icon={<CalendarCheck size={14} />}
                  sublabel="Since October 2025"
                />
                <StatCard
                  label="Total Downloads"
                  value={stats.totalDownloads}
                  icon={<DownloadSimple size={14} />}
                  sublabel="Weekly (npm)"
                />
                <StatCard
                  label="Pre-Oct 2025"
                  value={stats.preOct2025}
                  icon={<ClockCounterClockwise size={14} />}
                  sublabel="Submitted before Oct 2025"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border bg-white p-4 h-24 animate-pulse" />
                ))}
              </div>
            )}

            {/* ── Filters Bar ────────────────────────────────────── */}
            {showFilters && (
              <div className="rounded-lg border border-border bg-white p-4 mb-6 flex flex-wrap items-end gap-4">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-text-secondary mb-1">Search</label>
                  <div className="relative">
                    <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Component name or author..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-1 focus:ring-button"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                    className="px-3 py-1.5 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-1 focus:ring-button"
                  >
                    <option value="all">All</option>
                    <option value="community">Community</option>
                    <option value="convex-team">get-convex</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Date Range</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      const val = e.target.value as DateFilter;
                      setDateFilter(val);
                      if (val !== "custom") {
                        setCustomDateFrom("");
                        setCustomDateTo("");
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-1 focus:ring-button"
                  >
                    <option value="all">All time</option>
                    <option value="pre-oct-2025">Pre-Oct 2025</option>
                    <option value="oct-2025-plus">Oct 2025+</option>
                    <option value="custom">Custom range...</option>
                  </select>
                </div>

                {/* Custom date pickers (visible when "custom" selected) */}
                {dateFilter === "custom" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">From</label>
                      <div className="relative">
                        <CalendarBlank size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                        <input
                          type="date"
                          value={customDateFrom}
                          onChange={(e) => setCustomDateFrom(e.target.value)}
                          className="pl-8 pr-2 py-1.5 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-1 focus:ring-button"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">To</label>
                      <div className="relative">
                        <CalendarBlank size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                        <input
                          type="date"
                          value={customDateTo}
                          onChange={(e) => setCustomDateTo(e.target.value)}
                          className="pl-8 pr-2 py-1.5 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-1 focus:ring-button"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Author multi-exclude dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-text-secondary mb-1">Authors</label>
                  <button
                    onClick={() => setAuthorDropdownOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm bg-white hover:border-gray-400 transition-colors min-w-[180px] justify-between"
                  >
                    <span className="truncate">
                      {excludedAuthors.size === 0
                        ? "All authors"
                        : `${authorOptions.length - excludedAuthors.size} of ${authorOptions.length} shown`}
                    </span>
                    <CaretDown size={12} className={`shrink-0 transition-transform ${authorDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {authorDropdownOpen && (
                    <>
                      {/* Click-away overlay */}
                      <div className="fixed inset-0 z-40" onClick={() => setAuthorDropdownOpen(false)} />
                      <div className="absolute top-full left-0 mt-1 z-50 w-64 max-h-72 overflow-y-auto rounded-lg border border-border bg-white shadow-lg py-1">
                        {/* Bulk actions */}
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                          <button
                            onClick={() => setExcludedAuthors(new Set())}
                            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Show all
                          </button>
                          <button
                            onClick={() => setExcludedAuthors(new Set(authorOptions))}
                            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Hide all
                          </button>
                        </div>
                        {authorOptions.map((author) => {
                          const excluded = excludedAuthors.has(author);
                          return (
                            <label
                              key={author}
                              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={!excluded}
                                onChange={() => {
                                  setExcludedAuthors((prev) => {
                                    const next = new Set(prev);
                                    if (excluded) next.delete(author);
                                    else next.add(author);
                                    return next;
                                  });
                                }}
                                className="rounded border-border text-button focus:ring-button h-3.5 w-3.5"
                              />
                              <span className={`text-sm truncate ${excluded ? "text-text-secondary line-through" : "text-text-primary"}`}>
                                {author}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Clear */}
                {(search || typeFilter !== "all" || dateFilter !== "all" || excludedAuthors.size > 0) && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setTypeFilter("all");
                      setDateFilter("all");
                      setCustomDateFrom("");
                      setCustomDateTo("");
                      setExcludedAuthors(new Set());
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <X size={12} />
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* ── Components Table ───────────────────────────────── */}
            <div className="rounded-lg border border-border bg-white overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">
                  Components
                  <span className="ml-2 text-xs font-normal text-text-secondary">
                    {filteredPackages.length} {filteredPackages.length === 1 ? "result" : "results"}
                  </span>
                </h2>
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <SortAscending size={12} />
                  Click column headers to sort
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-border bg-gray-50/60">
                    <tr>
                      <SortHeader label="Name" field="name" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Author" field="author" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                      <th className="py-2 px-3 text-xs font-medium text-text-secondary uppercase tracking-wide">Type</th>
                      <SortHeader label="Submitted" field="submittedAt" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Wk Downloads" field="downloads" currentSort={sortField} currentDir={sortDir} onSort={handleSort} align="right" />
                      <SortHeader label="Last Published" field="lastPublish" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                      <th className="py-2 px-3 text-xs font-medium text-text-secondary uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPackages.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-text-secondary">
                          No components match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPackages.map((pkg) => {
                        const isTeam = isConvexTeamPackage(pkg);
                        const author = resolveAuthor(pkg);
                        const avatar = resolveAvatar(pkg);
                        return (
                          <tr key={pkg._id} className="border-b border-border last:border-b-0 hover:bg-gray-50/50 transition-colors">
                            <td className="py-2 px-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-text-primary">{pkg.componentName || pkg.name}</span>
                                {pkg.componentName && pkg.componentName !== pkg.name && (
                                  <span className="text-xs text-text-secondary font-mono">{pkg.name}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                {avatar ? (
                                  <img src={avatar} alt={author} className="w-4 h-4 rounded-full" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-gray-200" />
                                )}
                                <span className="text-sm text-text-primary">{author}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              {isTeam ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
                                  <ShieldCheck size={10} weight="fill" /> get-convex
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                                  <UsersThree size={10} weight="fill" /> Community
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-sm text-text-secondary">
                              {formatDate(pkg.submittedAt || pkg._creationTime)}
                            </td>
                            <td className="py-2 px-3 text-sm text-text-primary text-right font-mono">
                              {formatNumber(pkg.weeklyDownloads)}
                            </td>
                            <td className="py-2 px-3 text-sm text-text-secondary">
                              {new Date(pkg.lastPublish).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </td>
                            <td className="py-2 px-3">
                              {pkg.reviewStatus === "approved" ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                  <CheckCircle size={12} weight="fill" /> Approved
                                </span>
                              ) : (
                                <span className="text-xs text-text-secondary capitalize">{pkg.reviewStatus || "pending"}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Two column: Author Summary + Timeline ───────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Author Summary */}
              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-text-primary">Downloads by Author</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-border bg-gray-50/60">
                      <tr>
                        <th className="py-2 px-3 text-xs font-medium text-text-secondary uppercase tracking-wide">Author</th>
                        <th className="py-2 px-3 text-xs font-medium text-text-secondary uppercase tracking-wide text-right">Components</th>
                        <th className="py-2 px-3 text-xs font-medium text-text-secondary uppercase tracking-wide text-right">Wk Downloads</th>
                        <th className="py-2 px-3 text-xs font-medium text-text-secondary uppercase tracking-wide">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {authorSummary.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-sm text-text-secondary">
                            {stats ? "No authors match filters." : "Loading..."}
                          </td>
                        </tr>
                      ) : (
                        authorSummary.map((a) => (
                          <AuthorRow
                            key={a.author}
                            author={a.author}
                            avatar={a.avatar}
                            count={a.count}
                            downloads={a.downloads}
                            isConvexTeam={a.isConvexTeam}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-text-primary">Components by Month</h2>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> get-convex</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400" /> Community</span>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  {timeline.length === 0 ? (
                    <div className="py-6 text-center text-sm text-text-secondary">
                      {stats ? "No timeline data." : "Loading..."}
                    </div>
                  ) : (
                    timeline.map((m) => (
                      <MonthBar
                        key={m.month}
                        month={m.month}
                        count={m.count}
                        communityCount={m.communityCount}
                        convexTeamCount={m.convexTeamCount}
                        maxCount={maxMonthCount}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
