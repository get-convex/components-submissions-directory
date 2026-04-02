/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiProviderFallback from "../aiProviderFallback.js";
import type * as aiReview from "../aiReview.js";
import type * as aiSettings from "../aiSettings.js";
import type * as apiKeys from "../apiKeys.js";
import type * as auth from "../auth.js";
import type * as contentGenerationLimits from "../contentGenerationLimits.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as packages from "../packages.js";
import type * as payments from "../payments.js";
import type * as paymentsDb from "../paymentsDb.js";
import type * as preflight from "../preflight.js";
import type * as router from "../router.js";
import type * as securityScan from "../securityScan.js";
import type * as seed from "../seed.js";
import type * as slack from "../slack.js";
import type * as seoContent from "../seoContent.js";
import type * as seoContentDb from "../seoContentDb.js";
import type * as thumbnailGenerator from "../thumbnailGenerator.js";
import type * as thumbnails from "../thumbnails.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiProviderFallback: typeof aiProviderFallback;
  aiReview: typeof aiReview;
  aiSettings: typeof aiSettings;
  apiKeys: typeof apiKeys;
  auth: typeof auth;
  contentGenerationLimits: typeof contentGenerationLimits;
  crons: typeof crons;
  http: typeof http;
  packages: typeof packages;
  payments: typeof payments;
  paymentsDb: typeof paymentsDb;
  preflight: typeof preflight;
  router: typeof router;
  securityScan: typeof securityScan;
  seed: typeof seed;
  slack: typeof slack;
  seoContent: typeof seoContent;
  seoContentDb: typeof seoContentDb;
  thumbnailGenerator: typeof thumbnailGenerator;
  thumbnails: typeof thumbnails;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
