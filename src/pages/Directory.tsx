// Main directory listing page at /components
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ComponentCard } from "../components/ComponentCard";
import { CategorySidebar } from "../components/CategorySidebar";
import { SearchBar } from "../components/SearchBar";
import Header from "../components/Header";
import { FAQSection } from "../components/FAQSection";
import { setPageTitle, setPageDescription } from "../lib/seo";
import { CaretSortIcon, ChevronDownIcon } from "@radix-ui/react-icons";

type SortBy = "newest" | "downloads" | "updated" | "rating";

const getGridColumnCount = (): number => {
  if (typeof window === "undefined") return 4;
  if (window.innerWidth < 640) return 1;
  if (window.innerWidth < 1024) return 2;
  if (window.innerWidth < 1280) return 3;
  return 4;
};

export default function Directory() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("downloads");
  const [sortOpen, setSortOpen] = useState(false);
  const [gridColumns, setGridColumns] = useState<number>(getGridColumnCount);
  const [visibleBySection, setVisibleBySection] = useState<Record<string, number>>({});
  const desktopSortRef = useRef<HTMLDivElement>(null);
  const mobileSortRef = useRef<HTMLDivElement>(null);
  const groupedCardsPerLoad = gridColumns * 2;
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
  }, [selectedCategory, searchTerm, sortBy, gridColumns]);

  // Fetch data from Convex
  const components = useQuery(api.packages.listApprovedComponents, {
    category: selectedCategory ?? undefined,
    sortBy,
  });
  const categories = useQuery(api.packages.listCategories);
  const featured = useQuery(api.packages.getFeaturedComponents);
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

  const loadMoreSection = (sectionKey: string, batchSize: number) => {
    setVisibleBySection((current) => ({
      ...current,
      [sectionKey]: (current[sectionKey] ?? batchSize) + batchSize,
    }));
  };

  // Show featured only when no category and no search
  const showFeatured = !selectedCategory && !searchTerm.trim() && featured && featured.length > 0;
  const directoryCardHoverClass = "hover:bg-[rgb(246_238_219/var(--tw-bg-opacity,1))]";
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory(null);
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
            <div className="sticky top-6">
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
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
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
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === null
                    ? "bg-text-primary text-white"
                    : "bg-bg-secondary text-text-secondary"
                }`}>
                All
              </button>
              {categories?.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === cat.category
                      ? "bg-text-primary text-white"
                      : "bg-bg-secondary text-text-secondary"
                  }`}>
                  {cat.category} ({cat.count})
                </button>
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
                      authorUsername={comp.authorUsername}
                      authorAvatar={comp.authorAvatar}
                      weeklyDownloads={comp.weeklyDownloads}
                      convexVerified={comp.convexVerified}
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
                          authorUsername={comp.authorUsername}
                          authorAvatar={comp.authorAvatar}
                          weeklyDownloads={comp.weeklyDownloads}
                          convexVerified={comp.convexVerified}
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
                  {searchTerm
                    ? "Try a different search term"
                    : "No approved components in this category yet"}
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
            !selectedCategory &&
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
                            authorUsername={comp.authorUsername}
                            authorAvatar={comp.authorAvatar}
                            weeklyDownloads={comp.weeklyDownloads}
                            convexVerified={comp.convexVerified}
                            featured={comp.featured}
                            npmUrl={comp.npmUrl}
                            repositoryUrl={comp.repositoryUrl}
                            className={directoryCardHoverClass}
                          />
                        ))}
                      </div>
                      {hasMore && (
                        <div className="mt-5 flex justify-center">
                          <button
                            onClick={() => loadMoreSection(sectionKey, groupedCardsPerLoad)}
                            className="inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary">
                            Load more
                          </button>
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
                            authorUsername={comp.authorUsername}
                            authorAvatar={comp.authorAvatar}
                            weeklyDownloads={comp.weeklyDownloads}
                            convexVerified={comp.convexVerified}
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
                  {displayComponents
                    .slice(0, visibleBySection["flat"] ?? flatCardsPerLoad)
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
                        authorUsername={comp.authorUsername}
                        authorAvatar={comp.authorAvatar}
                        weeklyDownloads={comp.weeklyDownloads}
                        convexVerified={comp.convexVerified}
                        featured={comp.featured}
                        npmUrl={comp.npmUrl}
                        repositoryUrl={comp.repositoryUrl}
                        className={directoryCardHoverClass}
                      />
                    ))}
                </div>
                {displayComponents.length > (visibleBySection["flat"] ?? flatCardsPerLoad) && (
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

            {/* FAQ Section */}
            <FAQSection />
          </main>
        </div>
      </div>
    </div>
  );
}
