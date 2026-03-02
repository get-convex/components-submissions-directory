/**
 * Metadata Quality Scoring v1
 * Scores component metadata completeness and provides confidence notes.
 */

/**
 * Component data for scoring
 */
interface ScoringComponentData {
  componentName?: string;
  shortDescription?: string;
  longDescription?: string;
  installCommand: string;
  repositoryUrl?: string;
  npmUrl: string;
  demoUrl?: string;
  videoUrl?: string;
  category?: string;
  tags?: string[];
  version: string;
  weeklyDownloads: number;
  lastPublish?: string;
  authorUsername?: string;
  skillMd?: string;
  seoValueProp?: string;
  seoBenefits?: string[];
  seoUseCases?: string;
  seoFaq?: string;
  convexVerified?: boolean;
}

/**
 * Scoring result with field breakdown
 */
export interface MetadataScore {
  total: number;
  maxPossible: number;
  percentage: number;
  grade: "A" | "B" | "C" | "D" | "F";
  fieldScores: Record<string, { score: number; maxScore: number; present: boolean }>;
  confidenceNotes: string[];
  missingRecommendations: string[];
}

/**
 * Field scoring weights
 */
const FIELD_WEIGHTS: Record<string, { weight: number; critical: boolean; description: string }> = {
  componentName: { weight: 10, critical: true, description: "Display name" },
  shortDescription: { weight: 15, critical: true, description: "Short description" },
  longDescription: { weight: 10, critical: false, description: "Long description" },
  installCommand: { weight: 20, critical: true, description: "Install command" },
  repositoryUrl: { weight: 10, critical: false, description: "Repository URL" },
  npmUrl: { weight: 10, critical: true, description: "npm URL" },
  demoUrl: { weight: 5, critical: false, description: "Demo URL" },
  videoUrl: { weight: 5, critical: false, description: "Video URL" },
  category: { weight: 5, critical: false, description: "Category" },
  tags: { weight: 5, critical: false, description: "Tags" },
  skillMd: { weight: 15, critical: false, description: "SKILL.md content" },
  seoContent: { weight: 10, critical: false, description: "AI SEO content" },
  convexVerified: { weight: 5, critical: false, description: "Convex verified" },
};

/**
 * Calculate metadata quality score for a component.
 */
export function calculateMetadataScore(component: ScoringComponentData): MetadataScore {
  const fieldScores: Record<string, { score: number; maxScore: number; present: boolean }> = {};
  const confidenceNotes: string[] = [];
  const missingRecommendations: string[] = [];
  let totalScore = 0;
  let maxPossibleScore = 0;

  // Score each field
  for (const [field, config] of Object.entries(FIELD_WEIGHTS)) {
    const maxScore = config.weight;
    maxPossibleScore += maxScore;

    let present = false;
    let score = 0;

    switch (field) {
      case "componentName":
        present = Boolean(component.componentName && component.componentName.trim());
        break;
      case "shortDescription":
        present = Boolean(component.shortDescription && component.shortDescription.length >= 10);
        break;
      case "longDescription":
        present = Boolean(component.longDescription && component.longDescription.length >= 50);
        break;
      case "installCommand":
        present = Boolean(component.installCommand && component.installCommand.trim());
        break;
      case "repositoryUrl":
        present = Boolean(component.repositoryUrl);
        break;
      case "npmUrl":
        present = Boolean(component.npmUrl);
        break;
      case "demoUrl":
        present = Boolean(component.demoUrl);
        break;
      case "videoUrl":
        present = Boolean(component.videoUrl);
        break;
      case "category":
        present = Boolean(component.category);
        break;
      case "tags":
        present = Boolean(component.tags && component.tags.length > 0);
        break;
      case "skillMd":
        present = Boolean(component.skillMd);
        break;
      case "seoContent":
        present = Boolean(component.seoValueProp || component.seoBenefits);
        break;
      case "convexVerified":
        present = component.convexVerified === true;
        break;
    }

    score = present ? maxScore : 0;
    totalScore += score;
    fieldScores[field] = { score, maxScore, present };

    // Build confidence notes for missing critical fields
    if (config.critical && !present) {
      confidenceNotes.push(`Missing ${config.description} (critical)`);
      missingRecommendations.push(`Add ${config.description.toLowerCase()} to improve install confidence`);
    } else if (!present) {
      missingRecommendations.push(`Consider adding ${config.description.toLowerCase()}`);
    }
  }

  // Calculate percentage and grade
  const percentage = Math.round((totalScore / maxPossibleScore) * 100);
  let grade: "A" | "B" | "C" | "D" | "F";

  if (percentage >= 90) {
    grade = "A";
  } else if (percentage >= 80) {
    grade = "B";
  } else if (percentage >= 70) {
    grade = "C";
  } else if (percentage >= 60) {
    grade = "D";
  } else {
    grade = "F";
  }

  // Add confidence notes based on overall score
  if (percentage >= 90) {
    confidenceNotes.unshift("Complete metadata. High confidence for agent installation.");
  } else if (percentage >= 70) {
    confidenceNotes.unshift("Good metadata coverage. Agent installation should work well.");
  } else if (percentage >= 50) {
    confidenceNotes.unshift("Basic metadata present. Agent may need to fetch additional info.");
  } else {
    confidenceNotes.unshift("Incomplete metadata. Manual review recommended.");
  }

  // Add freshness note based on lastPublish
  if (component.lastPublish) {
    const publishDate = new Date(component.lastPublish);
    const now = new Date();
    const daysSincePublish = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSincePublish <= 30) {
      confidenceNotes.push("Recently updated (within 30 days)");
    } else if (daysSincePublish <= 180) {
      confidenceNotes.push(`Last updated ${daysSincePublish} days ago`);
    } else {
      confidenceNotes.push(`Not updated in ${daysSincePublish} days. Check for compatibility.`);
    }
  } else {
    confidenceNotes.push("Publish date unknown");
  }

  // Add popularity note based on downloads
  if (component.weeklyDownloads >= 10000) {
    confidenceNotes.push("High popularity (10k+ weekly downloads)");
  } else if (component.weeklyDownloads >= 1000) {
    confidenceNotes.push("Good adoption (1k+ weekly downloads)");
  } else if (component.weeklyDownloads >= 100) {
    confidenceNotes.push("Moderate adoption");
  } else {
    confidenceNotes.push("Lower adoption. May be newer or niche.");
  }

  return {
    total: totalScore,
    maxPossible: maxPossibleScore,
    percentage,
    grade,
    fieldScores,
    confidenceNotes,
    missingRecommendations,
  };
}

/**
 * Get a simple trust level based on score.
 */
export function getTrustLevel(
  score: MetadataScore,
): "high" | "medium" | "low" {
  if (score.percentage >= 80) return "high";
  if (score.percentage >= 60) return "medium";
  return "low";
}

/**
 * Get badge text based on score.
 */
export function getScoreBadgeText(score: MetadataScore): string {
  switch (score.grade) {
    case "A":
      return "Excellent";
    case "B":
      return "Good";
    case "C":
      return "Fair";
    case "D":
      return "Basic";
    case "F":
      return "Incomplete";
  }
}

/**
 * Get badge color class based on score.
 */
export function getScoreBadgeColor(score: MetadataScore): string {
  switch (score.grade) {
    case "A":
      return "bg-green-100 text-green-800";
    case "B":
      return "bg-blue-100 text-blue-800";
    case "C":
      return "bg-yellow-100 text-yellow-800";
    case "D":
      return "bg-orange-100 text-orange-800";
    case "F":
      return "bg-red-100 text-red-800";
  }
}
