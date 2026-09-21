import { GithubLogo, GitlabLogo, LinkSimple } from "@phosphor-icons/react";
import type { IconProps } from "@phosphor-icons/react";
import { parseRepoUrl } from "../../shared/repoUrl";

interface RepoHostIconProps extends IconProps {
  /** Repository URL. The host decides which logo renders. */
  repositoryUrl?: string | null;
}

// Picks the GitHub or GitLab logo from a repository URL. Falls back to a
// generic link icon for unknown or missing hosts. Header and Footer keep their
// own GithubLogo for the Convex org link on purpose.
export function RepoHostIcon({ repositoryUrl, ...iconProps }: RepoHostIconProps) {
  const parsed = parseRepoUrl(repositoryUrl);
  if (parsed?.provider === "gitlab") return <GitlabLogo {...iconProps} />;
  if (parsed?.provider === "github") return <GithubLogo {...iconProps} />;
  return <LinkSimple {...iconProps} />;
}
