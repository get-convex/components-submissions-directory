// Convex component review criteria. Order matters: the AI returns results in
// this order and parseReviewResponse maps critical flags by index.
// Must stay in sync with REVIEW_CRITERIA in convex/aiReview.ts until that file
// imports this list.
export type ReviewCriterionDefinition = {
  name: string;
  check: string;
  critical: boolean;
};

export const REVIEW_CRITERIA: Array<ReviewCriterionDefinition> = [
  {
    name: "Has convex.config.ts with defineComponent()",
    check:
      "Check for a convex.config.ts file in the identified component source directory that exports defineComponent()",
    critical: true,
  },
  {
    name: "Package exports required component entry points",
    check:
      "Check the nearest package.json for component entry points. For a publishable component package, exports should include ./convex.config.js and ./_generated/component.js. ./test is strongly recommended and should be noted when present or missing.",
    critical: true,
  },
  {
    name: "Has component functions",
    check:
      "Check for TypeScript component source files with queries, mutations, or actions in the identified component source directory",
    critical: true,
  },
  {
    name: "Component functions import builders from ./_generated/server",
    check:
      "Check that component functions import query, mutation, action, and internal* builders from the component's own ./_generated/server, not an app-level generated server path",
    critical: true,
  },
  {
    name: "Functions use object-style syntax",
    check:
      "Check for query({ ... }), mutation({ ... }), action({ ... }), internalQuery({ ... }), internalMutation({ ... }), or internalAction({ ... }) object-style definitions",
    critical: true,
  },
  {
    name: "Public component functions have args validators",
    check:
      "Check that exported public query, mutation, and action functions have explicit args validators. Missing returns validators are advisory only and tracked separately.",
    critical: true,
  },
  {
    name: "Uses v.null() for void returns",
    check:
      "If a function declares a returns validator for a void result, it should use v.null() rather than undefined. Missing returns validators belong in criterion 14, not here.",
    critical: true,
  },
  {
    name: "Does not use ctx.auth in component code",
    check:
      "Check that component implementation does not call ctx.auth. Components must receive auth-derived identifiers from the app instead.",
    critical: true,
  },
  {
    name: "Cross-boundary visibility uses public vs internal correctly",
    check:
      "Functions called by app code or wrapper classes across the component boundary must be public query/mutation/action. Functions used only inside the same component should use internalQuery/internalMutation/internalAction.",
    critical: true,
  },
  {
    name: "Queries prefer withIndex() over filter()",
    check:
      "Use withIndex() when the query pattern clearly calls for an index; avoid filter() when an index-based query is the better fit",
    critical: false,
  },
  {
    name: "Has clear TypeScript types and validator-driven shapes",
    check:
      "Types, validators, and return shapes should be clear and consistent. Prefer validator-driven contracts and avoid loose typing when stronger types are visible from the repo.",
    critical: false,
  },
  {
    name: "Uses auth callback or app-side auth wrapper when needed",
    check:
      "If auth is needed for app-facing or re-exported APIs, prefer an app-side wrapper or auth callback pattern. If auth is not relevant, mark this as passed with a note saying it is not applicable.",
    critical: false,
  },
  {
    name: "Client wrappers or helpers follow component usage patterns",
    check:
      "When visible in the repo, React hooks, classes, helper functions, or makeXXXAPI wrappers should run in the app or browser environment and call public component functions across the boundary. Do not treat helper code as direct browser access to component functions.",
    critical: false,
  },
  {
    name: "Public component functions have returns validators",
    check:
      "Check whether exported public query, mutation, and action functions include returns validators for type safety. This is advisory only and should not fail the review.",
    critical: false,
  },
];

const CRITICAL_COUNT = REVIEW_CRITERIA.filter((c) => c.critical).length;

// Name match first so custom prompts that reorder criteria still classify
// correctly; fall back to position for renamed criteria.
export function isCriticalCriterion(name: string, index: number): boolean {
  const byName = REVIEW_CRITERIA.find(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase(),
  );
  if (byName) return byName.critical;
  return index < CRITICAL_COUNT;
}
