// Category landing page at /components/categories/:slug
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ComponentCard } from "../components/ComponentCard";
import { CategorySidebar } from "../components/CategorySidebar";
import { SearchBar } from "../components/SearchBar";
import Header from "../components/Header";
import { setPageTitle, setPageDescription } from "../lib/seo";
import { CaretSortIcon, ChevronDownIcon, ChevronLeftIcon } from "@radix-ui/react-icons";

type SortBy = "newest" | "downloads" | "updated" | "rating" | "verified";

const DIRECTORY_ROOT_HREF = "/components/";

interface CategoryPageProps {
  categorySlug: string;
}

const getGridColumnCount = (): number => {
  if (typeof window === "undefined") return 4;
  if (window.innerWidth < 640) return 1;
  if (window.innerWidth < 1024) return 2;
  if (window.innerWidth < 1280) return 3;
  return 4;
};

const ITEMS_PER_PAGE = 24;

export default function CategoryPage({ categorySlug }: CategoryPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("downloads");
  const [sortOpen, setSortOpen] = useState(false);
  const [gridColumns, setGridColumns] = useState<number>(getGridColumnCount);
  const [currentPage, setCurrentPage] = useState(1);
  const desktopSortRef = useRef<HTMLDivElement>(null);
  const mobileSortRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const onResize = () => setGridColumns(getGridColumnCount());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Reset page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  // Fetch category metadata
  const categoryData = useQuery(api.packages.getCategoryBySlug, { slug: categorySlug });
  const categories = useQuery(api.packages.listCategories);

  // Fetch components for this category
  const components = useQuery(api.packages.listApprovedComponents, {
    category: categorySlug,
    sortBy,
  });

  // Set page SEO based on category
  useEffect(() => {
    if (categoryData) {
      setPageTitle(`${categoryData.label} Components`);
      setPageDescription(
        categoryData.description || `Browse ${categoryData.label} components for Convex.`
      );
    }
  }, [categoryData]);

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

  // Pagination
  const totalPages = Math.ceil(filteredComponents.length / ITEMS_PER_PAGE);
  const paginatedComponents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredComponents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredComponents, currentPage]);

  const directoryCardHoverClass = "hover:bg-[rgb(246_238_219/var(--tw-bg-opacity,1))]";

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Handle category not found
  if (categoryData === null) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
          <div className="text-center py-16">
            <h1 className="text-2xl font-semibold text-text-primary mb-2">Category not found</h1>
            <p className="text-sm text-text-secondary mb-6">
              The category you're looking for doesn't exist or has been disabled.
            </p>
            <a
              href={DIRECTORY_ROOT_HREF}
              className="inline-flex items-center gap-2 text-sm font-medium text-text-primary hover:text-text-secondary transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Back to Components
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex items-center gap-2 text-sm">
          <a
            href={DIRECTORY_ROOT_HREF}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            Components
          </a>
          <span className="text-text-tertiary">/</span>
          <span className="text-text-primary font-medium">
            {categoryData?.label || categorySlug}
          </span>
        </nav>
      </div>

      {/* Page header */}
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-4">
          <h1 className="text-2xl font-semibold text-text-primary mb-1">
            {categoryData?.label || categorySlug}
          </h1>
          <p className="text-sm text-text-secondary">
            {categoryData?.description || "Browse components in this category."}
          </p>
          {categoryData && (
            <p className="text-xs text-text-tertiary mt-2">
              {categoryData.count} {categoryData.count === 1 ? "component" : "components"}
              {categoryData.verifiedCount > 0 && (
                <span> · {categoryData.verifiedCount} verified</span>
              )}
            </p>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-52 shrink-0 lg:pt-4">
            <div className="sticky top-20">
              {/* Back to all */}
              <div className="pb-6">
                <a
                  href={DIRECTORY_ROOT_HREF}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  All Components
                </a>
              </div>

              {/* Search (scoped to this category) */}
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={`Search in ${categoryData?.label || "category"}...`}
                inputClassName="bg-white border border-border"
              />

              {/* Sort */}
              <div className="mt-3" ref={desktopSortRef}>
                <div className="relative">
                  <button
                    onClick={() => setSortOpen(!sortOpen)}
                    className="w-full flex items-center justify-between gap-2 text-sm bg-bg-primary rounded-md px-3 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-button cursor-pointer border border-border transition-colors"
                  >
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
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Other categories */}
              <div className="mt-5">
                {categories && (
                  <CategorySidebar
                    categories={categories}
                    selectedCategory={categorySlug}
                    onSelectCategory={(cat) => {
                      if (cat === null) {
                        window.location.href = DIRECTORY_ROOT_HREF;
                      } else {
                        window.location.href = `/components/categories/${cat}`;
                      }
                    }}
                    linkMode={true}
                  />
                )}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Mobile: search + sort row */}
            <div className="lg:hidden flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="w-full sm:w-auto flex items-center gap-2">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={`Search in ${categoryData?.label || "category"}...`}
                />
              </div>
              <div ref={mobileSortRef} className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-2 text-sm bg-bg-primary rounded-md px-3 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-button cursor-pointer border border-transparent hover:border-border transition-colors"
                >
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
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile category chips */}
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 -mx-1 px-1">
              <a
                href={DIRECTORY_ROOT_HREF}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors bg-bg-secondary text-text-secondary"
              >
                All
              </a>
              {categories?.map((cat) => (
                <a
                  key={cat.category}
                  href={`/components/categories/${cat.category}`}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    categorySlug === cat.category
                      ? "bg-text-primary text-white"
                      : "bg-bg-secondary text-text-secondary"
                  }`}
                >
                  {cat.label} ({cat.count})
                </a>
              ))}
            </div>

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

            {/* No results */}
            {components && filteredComponents.length === 0 && (
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
                    onClick={clearSearch}
                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}

            {/* Component grid */}
            {components && paginatedComponents.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {paginatedComponents.map((comp) => (
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm rounded-md border border-border bg-white text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-secondary transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-text-secondary px-3">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm rounded-md border border-border bg-white text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-secondary transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
