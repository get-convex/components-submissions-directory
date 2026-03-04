/**
 * AgentInstallSection.tsx
 * "Use with agents and CLI" block for ComponentDetail page.
 * Provides a single copy prompt optimized for AI agents.
 */

import { useState, useMemo } from "react";
import { CheckIcon, CopyIcon } from "@radix-ui/react-icons";
import { generateClaudePrompt } from "../lib/promptComposer";
import { isMcpReady } from "../lib/mcpProfile";
import { AGENT_INSTALL_SECTION_ENABLED, MCP_BADGES_ENABLED } from "../lib/featureFlags";

interface ComponentData {
  _id: string;
  name: string;
  componentName?: string;
  description: string;
  shortDescription?: string;
  longDescription?: string;
  installCommand: string;
  repositoryUrl?: string;
  npmUrl: string;
  demoUrl?: string;
  videoUrl?: string;
  version: string;
  weeklyDownloads: number;
  lastPublish?: string;
  category?: string;
  tags?: string[];
  slug?: string;
  authorUsername?: string;
  convexVerified?: boolean;
  skillMd?: string;
  seoValueProp?: string;
  seoBenefits?: string[];
  seoUseCases?: { query: string; answer: string }[];
  seoFaq?: { question: string; answer: string }[];
  seoGenerationStatus?: string;
}

interface AgentInstallSectionProps {
  component: ComponentData;
}

export function AgentInstallSection({ component }: AgentInstallSectionProps) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

  // Check MCP readiness
  const mcpReady = useMemo(() => isMcpReady(component as Parameters<typeof isMcpReady>[0]), [component]);

  // Generate single agent prompt (Claude style is best for agents)
  const agentPrompt = useMemo(
    () => generateClaudePrompt(component, origin, convexUrl),
    [component, origin, convexUrl]
  );

  // Copy helper
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(agentPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  };

  // Feature flag check (after all hooks)
  if (!AGENT_INSTALL_SECTION_ENABLED) {
    return null;
  }

  return (
    <div className="border border-border rounded-lg bg-bg-secondary/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">Use with agents and CLI</span>
          {MCP_BADGES_ENABLED && mcpReady && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              MCP ready
            </span>
          )}
        </div>
      </div>

      {/* Content always visible */}
      <div className="px-4 pb-4 pt-4 space-y-4">
        {/* Copy prompt section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary capitalize tracking-wider">
              Copy prompt
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-bg-hover transition-colors"
              title={copied ? "Copied" : "Copy to clipboard"}>
              {copied ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-600">Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-3.5 h-3.5 text-text-secondary" />
                  <span className="text-text-secondary">Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="px-3 py-2 text-[11px] font-mono whitespace-pre-wrap rounded-lg border border-border bg-[#1a1a1a] text-gray-200 max-h-32 overflow-y-auto">
            {agentPrompt}
          </pre>
        </div>

        {/* Agent friendly summary */}
        <div className="rounded-lg bg-bg-secondary border border-border p-3">
          <span className="text-xs font-medium text-text-primary block mb-2">
            Agent friendly summary
          </span>
          <div className="space-y-2 text-xs text-text-secondary">
            <p>
              <strong>Package:</strong> {component.name}
            </p>
            <p>
              <strong>Install:</strong>{" "}
              <code className="px-1 py-0.5 bg-bg-primary rounded">{component.installCommand}</code>
            </p>
            {component.category && (
              <p>
                <strong>Category:</strong> {component.category}
              </p>
            )}
            <div>
              <strong>Setup steps:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-0.5">
                <li>Run the install command</li>
                <li>Follow component documentation</li>
                <li>Configure environment variables if needed</li>
                <li>Import and use in your Convex functions</li>
              </ol>
            </div>
            <div>
              <strong>Verification:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Package appears in node_modules</li>
                <li>TypeScript types resolve correctly</li>
                <li>
                  No errors in{" "}
                  <code className="px-1 py-0.5 bg-bg-primary rounded">npx convex dev</code>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
