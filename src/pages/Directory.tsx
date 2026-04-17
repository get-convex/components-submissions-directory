// Main directory listing page at /components
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ComponentCard } from "../components/ComponentCard";
import { CategorySidebar } from "../components/CategorySidebar";
import { SearchBar } from "../components/SearchBar";
import Header from "../components/Header";
import { FAQSection } from "../components/FAQSection";
import { AuthoringBanner } from "../components/AuthoringBanner";
import { setPageTitle, setPageDescription } from "../lib/seo";
import { CaretSortIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { Robot, FileText, ArrowSquareOut } from "@phosphor-icons/react";

type SortBy = "newest" | "downloads" | "updated" | "rating" | "verified";

const DIRECTORY_ROOT_HREF = "/components/";

const getGridColumnCount = (): number => {
  if (typeof window === "undefined") return 4;
  if (window.innerWidth < 640) return 1;
  if (window.innerWidth < 1024) return 2;
  if (window.innerWidth < 1280) return 3;
  return 4;
};

export default function Directory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("downloads");
  const [sortOpen, setSortOpen] = useState(false);
  const [gridColumns, setGridColumns] = useState<number>(getGridColumnCount);
  const [visibleBySection, setVisibleBySection] = useState<Record<string, number>>({});
  const desktopSortRef = useRef<HTMLDivElement>(null);
  const mobileSortRef = useRef<HTMLDivElement>(null);
  const groupedCardsPerLoad = 12;
  const flatCardsPerLoad = gridColumns * 3;
  const featuredFirstRowCount = 3;
  const featuredExtraPerLoad = 8;
  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedOutsideDesktop =
        !desktopSortRef.current || !desktopSortRef.current.contains(target);
      const clickedOutsideMobile =
        !mobileSortRef.current || !mobileSortRef.current.contains(target);
      if (clickedOutsideDesktop && clickedOutsideMobile) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keep "two rows at a time" aligned with responsive grid breakpoints.
  useEffect(() => {
    const onResize = () => setGridColumns(getGridColumnCount());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Reset section paging when major directory controls change.
  useEffect(() => {
    setVisibleBySection({});
    if (searchTerm) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [searchTerm, sortBy, gridColumns]);

  // One-shot fetches for public catalog data (no reactive subscription overhead)
  const convex = useConvex();
  const [components, setComponents] = useState<any[] | undefined>(undefined);
  const [categories, setCategories] = useState<any[] | undefined>(undefined);
  const [featured, setFeatured] = useState<any[] | undefined>(undefined);

  const fetchGeneration = useRef(0);
  const fetchData = useCallback(async () => {
    const gen = ++fetchGeneration.current;
    const [comp, cats, feat] = await Promise.all([
      convex.query(api.packages.listApprovedComponents, { sortBy }),
      convex.query(api.packages.listCategories, {}),
      convex.query(api.packages.getFeaturedComponents, {}),
    ]);
    if (gen !== fetchGeneration.current) return;
    setComponents(comp);
    setCategories(cats);
    setFeatured(feat);
  }, [convex, sortBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    // Keep one-shot fetches lightweight, but refetch when the page becomes active again
    // so recently refreshed npm counts show up without restoring a live subscription.
    const handleFocus = () => {
      void fetchData();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchData();
      }
    };
    const handlePageShow = () => {
      void fetchData();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData]);

  const categoryItems = categories ?? [];

  // Set page SEO
  useEffect(() => {
    setPageTitle();
    setPageDescription(
      "Browse open-source Convex components: AI agents, auth, database tools, workflows, and more. Install with npm and start building."
    );
  }, []);

  // Client-side search filtering
  const filteredComponents = useMemo(() => {
    if (!components) return [];
    if (!searchTerm.trim()) return components;

    const term = searchTerm.toLowerCase();
    return components.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        (c.shortDescription && c.shortDescription.toLowerCase().includes(term)) ||
        (c.tags && c.tags.some((t) => t.toLowerCase().includes(term))) ||
        (c.authorUsername && c.authorUsername.toLowerCase().includes(term))
    );
  }, [components, searchTerm]);

  // Preserve backend sort order so selected sort mode is always authoritative.
  const displayComponents = useMemo(() => {
    return filteredComponents;
  }, [filteredComponents]);

  const flatVisibleCount = visibleBySection["flat"] ?? flatCardsPerLoad;
  const hasMoreFlatResults = displayComponents.length > flatVisibleCount;

  const loadMoreSection = (sectionKey: string, batchSize: number) => {
    setVisibleBySection((current) => ({
      ...current,
      [sectionKey]: (current[sectionKey] ?? batchSize) + batchSize,
    }));
  };

  const showFeatured = !searchTerm.trim() && featured && featured.length > 0;
  const directoryCardHoverClass = "hover:bg-[rgb(246_238_219/var(--tw-bg-opacity,1))]";
  const clearFilters = () => {
    setSearchTerm("");
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Global header with auth */}
      <Header />

      {/* Page header */}
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <h1 className="text-2xl font-semibold text-text-primary mb-1">Components</h1>
          <p className="text-sm text-text-secondary">
            Open-source building blocks for your Convex app
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Two-column layout: sticky sidebar + scrollable content */}
        <div className="flex gap-8">
          {/* Sidebar: search + categories, sticky on desktop */}
          <aside className="hidden lg:block w-52 shrink-0 lg:pt-12">
            <div className="sticky top-20">
              {/* Submit link */}
              <div className="pb-6">
                <a
                  href={
                    window.location.pathname.startsWith("/components")
                      ? "/components/submit?submit=true"
                      : "/submit?submit=true"
                  }
                  className="inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-4 py-2 transition-colors"
                  style={{
                    backgroundColor: "rgb(243, 176, 28)",
                    color: "rgb(42, 40, 37)",
                  }}>
                  Submit a component
                </a>
              </div>

              {/* Search */}
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search..."
                inputClassName="bg-white border border-border"
              />

              {/* Desktop sort */}
              <div className="mt-3" ref={desktopSortRef}>
                <div className="relative">
                  <button
                    onClick={() => setSortOpen(!sortOpen)}
                    className="w-full flex items-center justify-between gap-2 text-sm bg-bg-primary rounded-md px-3 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-button cursor-pointer border border-border transition-colors">
                    <span className="inline-flex items-center gap-2">
                      <CaretSortIcon className="w-4 h-4 text-text-secondary" />
                      <span>
                        {sortBy === "downloads"
                          ? "Most downloads"
                          : sortBy === "newest"
                            ? "Newest"
                            : sortBy === "verified"
                              ? "Verified"
                            : sortBy === "rating"
                              ? "Highest rated"
                              : "Recently updated"}
                      </span>
                    </span>
                    <ChevronDownIcon
                      className={`w-3.5 h-3.5 text-text-secondary transition-transform ${sortOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {sortOpen && (
                    <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-border bg-white shadow-lg py-1 z-30">
                      {[
                        { value: "downloads" as const, label: "Most downloads" },
                        { value: "newest" as const, label: "Newest" },
                        { value: "verified" as const, label: "Verified" },
                        { value: "updated" as const, label: "Recently updated" },
                        { value: "rating" as const, label: "Highest rated" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value);
                            setSortOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-bg-hover ${
                            sortBy === opt.value
                              ? "text-text-primary font-medium"
                              : "text-text-secondary"
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="mt-5">
                {categories && (
                  <CategorySidebar
                    categories={categories}
                    selectedCategory={null}
                    onSelectCategory={() => {}}
                    linkMode={true}
                  />
                )}
              </div>
            </div>
          </aside>

          {/* Main content: featured + grid */}
          <main className="flex-1 min-w-0">
            {/* Mobile: search + sort row */}
            <div className="lg:hidden flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="w-full sm:w-auto flex items-center gap-2">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search components..."
                  inputClassName="bg-white border border-border"
                />
              </div>
              <div ref={mobileSortRef} className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-2 text-sm bg-bg-primary rounded-md px-3 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-button cursor-pointer border border-transparent hover:border-border transition-colors">
                  <CaretSortIcon className="w-4 h-4 text-text-secondary" />
                  <span>
                    {sortBy === "downloads"
                      ? "Most downloads"
                      : sortBy === "newest"
                        ? "Newest"
                        : sortBy === "verified"
                          ? "Verified"
                        : sortBy === "rating"
                          ? "Highest rated"
                          : "Recently updated"}
                  </span>
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 text-text-secondary transition-transform ${sortOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-white shadow-lg py-1 z-30">
                    {[
                      { value: "downloads" as const, label: "Most downloads" },
                      { value: "newest" as const, label: "Newest" },
                      { value: "verified" as const, label: "Verified" },
                      { value: "updated" as const, label: "Recently updated" },
                      { value: "rating" as const, label: "Highest rated" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSortBy(opt.value);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-bg-hover ${
                          sortBy === opt.value
                            ? "text-text-primary font-medium"
                            : "text-text-secondary"
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile category pills */}
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 -mx-1 px-1">
              <a
                href={DIRECTORY_ROOT_HREF}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors bg-text-primary text-white">
                All
              </a>
              {categories?.map((cat) => (
                <a
                  key={cat.category}
                  href={`/components/categories/${cat.category}`}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors bg-bg-secondary text-text-secondary hover:bg-bg-hover">
                  {cat.label} ({cat.count})
                </a>
              ))}
            </div>

            {/* Featured section (3 columns) */}
            {showFeatured && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-text-primary mb-1">Featured</h2>
                <p className="text-sm text-text-secondary mb-4">
                  Bring out the latest and greatest with our featured components.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {featured!.slice(0, featuredFirstRowCount).map((comp) => (
                    <ComponentCard
                      key={comp._id}
                      name={comp.name}
                      componentName={comp.componentName}
                      slug={comp.slug}
                      shortDescription={comp.shortDescription}
                      description={comp.description}
                      category={comp.category}
                      thumbnailUrl={comp.thumbnailUrl}
                      showThumbnail={true}
                      authorUsername={comp.authorUsername}
                      authorAvatar={comp.authorAvatar}
                      weeklyDownloads={comp.weeklyDownloads}
                      convexVerified={comp.convexVerified}
                      communitySubmitted={comp.communitySubmitted}
                      featured={comp.featured}
                      npmUrl={comp.npmUrl}
                      repositoryUrl={comp.repositoryUrl}
                      className={directoryCardHoverClass}
                    />
                  ))}
                </div>
                {featured!.slice(featuredFirstRowCount).length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {featured!
                      .slice(featuredFirstRowCount)
                      .slice(0, visibleBySection["featured"] ?? featuredExtraPerLoad)
                      .map((comp) => (
                        <ComponentCard
                          key={comp._id}
                          name={comp.name}
                          componentName={comp.componentName}
                          slug={comp.slug}
                          shortDescription={comp.shortDescription}
                          description={comp.description}
                          category={comp.category}
                          thumbnailUrl={comp.thumbnailUrl}
                          showThumbnail={true}
                          authorUsername={comp.authorUsername}
                          authorAvatar={comp.authorAvatar}
                          weeklyDownloads={comp.weeklyDownloads}
                          convexVerified={comp.convexVerified}
                          communitySubmitted={comp.communitySubmitted}
                          featured={comp.featured}
                          npmUrl={comp.npmUrl}
                          repositoryUrl={comp.repositoryUrl}
                          className={directoryCardHoverClass}
                        />
                      ))}
                  </div>
                )}
                {featured!.slice(featuredFirstRowCount).length >
                  (visibleBySection["featured"] ?? featuredExtraPerLoad) && (
                  <div className="mt-5 flex justify-center">
                    <button
                      onClick={() => loadMoreSection("featured", featuredExtraPerLoad)}
                      className="inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary">
                      Load more
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Loading state */}
            {!components && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-lg bg-white p-4 animate-pulse">
                    <div className="h-4 bg-bg-secondary rounded w-3/4 mb-2" />
                    <div className="h-3 bg-bg-secondary rounded w-full mb-1" />
                    <div className="h-3 bg-bg-secondary rounded w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {components && displayComponents.length === 0 && (
              <div className="text-center py-16 text-text-secondary">
                <p className="text-lg mb-1">No components found</p>
                <p className="text-sm">
                  {searchTerm ? "Try a different search term" : "No approved components found yet"}
                </p>
                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800">
                    Clear filter
                  </button>
                )}
              </div>
            )}

            {/* Grouped by category when no search/filter, otherwise flat grid */}
            {components &&
            displayComponents.length > 0 &&
            !searchTerm.trim() ? (
              <>
                {categoryItems.map((cat) => {
                  const catComponents = displayComponents.filter(
                    (c) => c.category === cat.category,
                  );
                  if (catComponents.length === 0) return null;
                  const sectionKey = `category:${cat.category}`;
                  const visibleCount = visibleBySection[sectionKey] ?? groupedCardsPerLoad;
                  const visibleComponents = catComponents.slice(0, visibleCount);
                  const hasMore = catComponents.length > visibleCount;
                  return (
                    <section key={cat.category} className="mb-10">
                      <h2 className="text-lg font-semibold text-text-primary mb-1">{cat.label}</h2>
                      <p className="text-sm text-text-secondary mb-4">{cat.description}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {visibleComponents.map((comp) => (
                          <ComponentCard
                            key={comp._id}
                            name={comp.name}
                            componentName={comp.componentName}
                            slug={comp.slug}
                            shortDescription={comp.shortDescription}
                            description={comp.description}
                            category={comp.category}
                            thumbnailUrl={comp.thumbnailUrl}
                            showThumbnail={!comp.hideThumbnailInCategory}
                            authorUsername={comp.authorUsername}
                            authorAvatar={comp.authorAvatar}
                            weeklyDownloads={comp.weeklyDownloads}
                            convexVerified={comp.convexVerified}
                            communitySubmitted={comp.communitySubmitted}
                            featured={comp.featured}
                            npmUrl={comp.npmUrl}
                            repositoryUrl={comp.repositoryUrl}
                            className={directoryCardHoverClass}
                          />
                        ))}
                      </div>
                      {hasMore && (
                        <div className="mt-5 flex justify-center">
                          <a
                            href={`/components/categories/${cat.category}`}
                            className="inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary">
                            View all {cat.label}
                          </a>
                        </div>
                      )}
                    </section>
                  );
                })}
                {/* Uncategorized components */}
                {displayComponents.filter(
                  (c) =>
                    !c.category ||
                    !categoryItems.find((cat) => cat.category === c.category)
                ).length > 0 && (
                  <section className="mb-10">
                    <h2 className="text-lg font-semibold text-text-primary mb-1">Other</h2>
                    <p className="text-sm text-text-secondary mb-4">
                      Additional community components.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {displayComponents
                        .filter(
                          (c) =>
                            !c.category ||
                            !categoryItems.find((cat) => cat.category === c.category)
                        )
                        .slice(0, visibleBySection["category:__other__"] ?? groupedCardsPerLoad)
                        .map((comp) => (
                          <ComponentCard
                            key={comp._id}
                            name={comp.name}
                            componentName={comp.componentName}
                            slug={comp.slug}
                            shortDescription={comp.shortDescription}
                            description={comp.description}
                            category={comp.category}
                            thumbnailUrl={comp.thumbnailUrl}
                            showThumbnail={!comp.hideThumbnailInCategory}
                            authorUsername={comp.authorUsername}
                            authorAvatar={comp.authorAvatar}
                            weeklyDownloads={comp.weeklyDownloads}
                            convexVerified={comp.convexVerified}
                            communitySubmitted={comp.communitySubmitted}
                            featured={comp.featured}
                            npmUrl={comp.npmUrl}
                            repositoryUrl={comp.repositoryUrl}
                            className={directoryCardHoverClass}
                          />
                        ))}
                    </div>
                    {displayComponents.filter(
                      (c) => !c.category || !categoryItems.find((cat) => cat.category === c.category),
                    ).length > (visibleBySection["category:__other__"] ?? groupedCardsPerLoad) && (
                      <div className="mt-5 flex justify-center">
                        <button
                          onClick={() => loadMoreSection("category:__other__", groupedCardsPerLoad)}
                          className="inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary">
                          Load more
                        </button>
                      </div>
                    )}
                  </section>
                )}
              </>
            ) : components && displayComponents.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {displayComponents.slice(0, flatVisibleCount).map((comp) => (
                      <ComponentCard
                        key={comp._id}
                        name={comp.name}
                        componentName={comp.componentName}
                        slug={comp.slug}
                        shortDescription={comp.shortDescription}
                        description={comp.description}
                        category={comp.category}
                        thumbnailUrl={comp.thumbnailUrl}
                        showThumbnail={!comp.hideThumbnailInCategory}
                        authorUsername={comp.authorUsername}
                        authorAvatar={comp.authorAvatar}
                        weeklyDownloads={comp.weeklyDownloads}
                        convexVerified={comp.convexVerified}
                        communitySubmitted={comp.communitySubmitted}
                        featured={comp.featured}
                        npmUrl={comp.npmUrl}
                        repositoryUrl={comp.repositoryUrl}
                        className={directoryCardHoverClass}
                      />
                    ))}
                </div>
                {hasMoreFlatResults && (
                  <div className="mt-5 flex justify-center">
                    <button
                      onClick={() => loadMoreSection("flat", flatCardsPerLoad)}
                      className="inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary">
                      Load more
                    </button>
                  </div>
                )}
              </>
            ) : null}

            {/* Authoring Banner */}
            <AuthoringBanner className="mt-12 mb-10" />

            {/* FAQ Section */}
            <FAQSection />

            {/* For Agents Section */}
            <section className="mt-12 pt-8 border-t border-border">
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                For Agents
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                AI agents and coding assistants can consume the Convex Components Directory
                through machine-readable content endpoints. These files auto-update as new
                components are approved and listed.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/components/llms.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <Robot size={16} />
                  llms.txt
                  <ArrowSquareOut size={14} className="text-text-tertiary" />
                </a>
                <a
                  href="/components/components.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <FileText size={16} />
                  components.md
                  <ArrowSquareOut size={14} className="text-text-tertiary" />
                </a>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
