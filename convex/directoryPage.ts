import { v } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { internalQuery } from "./_generated/server";
import { api } from "./_generated/api";

// Sort modes accepted by /api/directory-page. Keep in sync with
// directorySortValidator below and listApprovedComponents in packages.ts.
export const DIRECTORY_SORTS = [
  "newest",
  "downloads",
  "updated",
  "rating",
  "verified",
] as const;
export type DirectorySort = (typeof DIRECTORY_SORTS)[number];

const directorySortValidator = v.union(
  v.literal("newest"),
  v.literal("downloads"),
  v.literal("updated"),
  v.literal("rating"),
  v.literal("verified"),
);

type DirectoryPageData = {
  components: FunctionReturnType<typeof api.packages.listApprovedComponents>;
  categories: FunctionReturnType<typeof api.packages.listCategories>;
  featured: FunctionReturnType<
    typeof api.packages.getFeaturedComponents
  > | null;
  downloadsDisplay: FunctionReturnType<
    typeof api.packages.getDownloadsDisplaySettings
  >;
  listViewSettings: FunctionReturnType<
    typeof api.packages.getListViewSettings
  > | null;
  categoryData: FunctionReturnType<
    typeof api.packages.getCategoryBySlug
  > | null;
};

// Everything the directory and category pages render, read in one query so
// the component list, category counts and featured row all come from the same
// snapshot. Served by the /api/directory-page HTTP action in http.ts.
export const _getDirectoryPageData = internalQuery({
  args: {
    sortBy: directorySortValidator,
    category: v.optional(v.string()),
  },
  // Explicit return type: runQuery on api.* is otherwise circular for tsc
  handler: async (ctx, { sortBy, category }): Promise<DirectoryPageData> => {
    const [
      components,
      categories,
      featured,
      downloadsDisplay,
      listViewSettings,
      categoryData,
    ] = await Promise.all([
      ctx.runQuery(api.packages.listApprovedComponents, { category, sortBy }),
      ctx.runQuery(api.packages.listCategories, {}),
      category ? null : ctx.runQuery(api.packages.getFeaturedComponents, {}),
      ctx.runQuery(api.packages.getDownloadsDisplaySettings, {}),
      category ? null : ctx.runQuery(api.packages.getListViewSettings, {}),
      category
        ? ctx.runQuery(api.packages.getCategoryBySlug, { slug: category })
        : null,
    ]);
    return {
      components,
      categories,
      featured,
      downloadsDisplay,
      listViewSettings,
      categoryData,
    };
  },
});
