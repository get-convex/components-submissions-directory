// SEO helpers for document title, meta tags, and JSON-LD structured data

const SITE_NAME = "Convex Components";

// Set the page title
export function setPageTitle(title?: string) {
  document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
}

// Set or create a meta tag
export function setMetaTag(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

// Set page meta description
export function setPageDescription(description: string) {
  setMetaTag("description", description);
}

// Set Open Graph tags for social sharing
export function setOgTags(opts: {
  title: string;
  description: string;
  url?: string;
  image?: string;
}) {
  const setOg = (property: string, content: string) => {
    let meta = document.querySelector(
      `meta[property="${property}"]`,
    ) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", property);
      document.head.appendChild(meta);
    }
    meta.content = content;
  };

  setOg("og:title", opts.title);
  setOg("og:description", opts.description);
  setOg("og:type", "website");
  setOg("og:site_name", SITE_NAME);
  if (opts.url) setOg("og:url", opts.url);
  if (opts.image) {
    setOg("og:image", opts.image);
    setOg("og:image:alt", opts.title);
  }
}

// Set Twitter Card tags for social sharing
export function setTwitterTags(opts: {
  title: string;
  description: string;
  image?: string;
}) {
  setMetaTag("twitter:card", opts.image ? "summary_large_image" : "summary");
  setMetaTag("twitter:title", opts.title);
  setMetaTag("twitter:description", opts.description);
  if (opts.image) {
    setMetaTag("twitter:image", opts.image);
    setMetaTag("twitter:image:alt", opts.title);
  }
}

// Set canonical URL to prevent duplicate content issues
export function setCanonicalUrl(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
}

// Set all SEO tags at once for component detail pages
export function setComponentSeoTags(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
}) {
  setPageTitle(opts.title);
  setPageDescription(opts.description);
  setOgTags(opts);
  setTwitterTags(opts);
  setCanonicalUrl(opts.url);
}

// Inject or update a JSON-LD structured data script tag (for SEO/AEO/GEO)
// Removes any previously injected JSON-LD and replaces with the new data
export function injectJsonLd(data: Record<string, unknown>) {
  const id = "convex-components-jsonld";
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  // Strip undefined values before serializing
  const cleaned = JSON.parse(JSON.stringify(data));
  script.textContent = JSON.stringify(cleaned);
}

// Build a combined JSON-LD @graph with SoftwareSourceCode + optional FAQPage
// Used by ComponentDetail to maximize Google rich results and AI citation
export function buildComponentJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  repositoryUrl?: string;
  npmUrl?: string;
  version?: string;
  license?: string;
  authorName?: string;
  installCommand?: string;
  faq?: { question: string; answer: string }[];
}): Record<string, unknown> {
  const graph: Record<string, unknown>[] = [];

  // SoftwareSourceCode schema
  const softwareSchema: Record<string, unknown> = {
    "@type": "SoftwareSourceCode",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    codeRepository: opts.repositoryUrl,
    programmingLanguage: "TypeScript",
    runtimePlatform: "Convex",
  };

  if (opts.version) {
    softwareSchema.version = opts.version;
  }
  if (opts.license) {
    softwareSchema.license = opts.license;
  }
  if (opts.authorName) {
    softwareSchema.author = {
      "@type": "Organization",
      name: opts.authorName,
    };
  }
  if (opts.installCommand) {
    softwareSchema.installUrl = opts.npmUrl;
  }

  graph.push(softwareSchema);

  // FAQPage schema (only if FAQ data exists)
  if (opts.faq && opts.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: opts.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
