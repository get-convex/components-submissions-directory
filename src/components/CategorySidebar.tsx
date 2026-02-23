// Sidebar for filtering components by category
// Reads from admin-managed categories table via listCategories query

interface CategorySidebarProps {
  categories: Array<{
    category: string;
    label: string;
    description: string;
    count: number;
  }>;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export function CategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategorySidebarProps) {
  // Total count across all categories for "All" option
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <nav className="w-full">
      <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 px-2">
        Categories
      </h2>
      <ul className="space-y-0.5">
        {/* All category */}
        <li>
          <button
            onClick={() => onSelectCategory(null)}
            className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
              selectedCategory === null
                ? "bg-text-primary text-white font-medium"
                : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            }`}
          >
            <span className="flex items-center justify-between">
              <span>All</span>
              <span className="text-xs opacity-60">{totalCount}</span>
            </span>
          </button>
        </li>
        {/* Category items from admin-managed table */}
        {categories.map((cat) => (
          <li key={cat.category}>
            <button
              onClick={() => onSelectCategory(cat.category)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedCategory === cat.category
                  ? "bg-text-primary text-white font-medium"
                  : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
              }`}
            >
              <span className="flex items-center justify-between">
                <span>{cat.label}</span>
                <span className="text-xs opacity-60">{cat.count}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
