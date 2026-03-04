/**
 * AgentInstallSection.tsx
 * "Use with agents and CLI" block for ComponentDetail page.
 * Provides a single copy prompt optimized for AI agents.
 * Includes multi-platform MCP install options (Cursor, Claude Desktop, ChatGPT).
 */

import { useState, useMemo } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { generateClaudePrompt } from "../lib/promptComposer";
import {
  isMcpReady,
  generateGlobalCursorInstallLink,
  generateComponentCursorInstallLink,
  generateClaudeDesktopConfig,
  generateChatGPTConnectorConfig,
  CLAUDE_DESKTOP_CONFIG_PATHS,
} from "../lib/mcpProfile";
import { AGENT_INSTALL_SECTION_ENABLED, MCP_BADGES_ENABLED, MCP_ENABLED } from "../lib/featureFlags";

type McpPlatform = "cursor" | "claude" | "chatgpt";

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
  const [mcpCopied, setMcpCopied] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<McpPlatform>("cursor");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

  // Check MCP readiness
  const mcpReady = useMemo(() => isMcpReady(component as Parameters<typeof isMcpReady>[0]), [component]);

  // Generate single agent prompt (Claude style is best for agents)
  const agentPrompt = useMemo(
    () => generateClaudePrompt(component, origin, convexUrl),
    [component, origin, convexUrl]
  );

  // Generate platform-specific configs
  const globalCursorLink = useMemo(() => generateGlobalCursorInstallLink(), []);
  const componentCursorLink = useMemo(
    () => generateComponentCursorInstallLink(component as Parameters<typeof generateComponentCursorInstallLink>[0]),
    [component]
  );
  const claudeDesktopConfig = useMemo(
    () => generateClaudeDesktopConfig(component as Parameters<typeof generateClaudeDesktopConfig>[0]),
    [component]
  );
  const chatgptConfig = useMemo(
    () => generateChatGPTConnectorConfig(component as Parameters<typeof generateChatGPTConnectorConfig>[0]),
    [component]
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

  // Copy MCP config helper (platform-aware)
  const handleCopyMcpConfig = async () => {
    try {
      let textToCopy = "";
      if (selectedPlatform === "cursor") {
        const config = componentCursorLink?.config || globalCursorLink.config;
        textToCopy = JSON.stringify(config, null, 2);
      } else if (selectedPlatform === "claude") {
        textToCopy = JSON.stringify(claudeDesktopConfig.config, null, 2);
      } else if (selectedPlatform === "chatgpt") {
        textToCopy = chatgptConfig.url;
      }
      await navigator.clipboard.writeText(textToCopy);
      setMcpCopied(true);
      setTimeout(() => setMcpCopied(false), 2000);
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

        {/* Multi-Platform MCP Install Section */}
        {MCP_ENABLED && mcpReady && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-secondary capitalize tracking-wider">
                MCP Install
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyMcpConfig}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-bg-hover transition-colors"
                  title={mcpCopied ? "Copied" : "Copy config"}>
                  {mcpCopied ? (
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
                {selectedPlatform === "cursor" && (
                  <a
                    href={componentCursorLink?.installLink || globalCursorLink.installLink}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] transition-colors"
                    title="Open in Cursor">
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                    <span>Install</span>
                  </a>
                )}
              </div>
            </div>

            {/* Platform Toggle Tabs */}
            <div className="flex gap-1 mb-3 p-1 bg-bg-secondary rounded-lg border border-border">
              <button
                onClick={() => setSelectedPlatform("cursor")}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedPlatform === "cursor"
                    ? "bg-[#1a1a1a] text-white"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }`}>
                Cursor
              </button>
              <button
                onClick={() => setSelectedPlatform("claude")}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedPlatform === "claude"
                    ? "bg-[#1a1a1a] text-white"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }`}>
                Claude
              </button>
              <button
                onClick={() => setSelectedPlatform("chatgpt")}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedPlatform === "chatgpt"
                    ? "bg-[#1a1a1a] text-white"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }`}>
                ChatGPT
              </button>
            </div>

            {/* Platform-Specific Content */}
            <div className="rounded-lg bg-bg-secondary border border-border p-3">
              {selectedPlatform === "cursor" && (
                <>
                  <p className="text-xs text-text-secondary mb-2">
                    Click "Install" to add the Convex Components MCP server to Cursor, or copy the config below.
                  </p>
                  <pre className="px-2 py-1.5 text-[10px] font-mono whitespace-pre-wrap rounded border border-border bg-[#1a1a1a] text-gray-200 max-h-24 overflow-y-auto">
                    {JSON.stringify(componentCursorLink?.config || globalCursorLink.config, null, 2)}
                  </pre>
                </>
              )}

              {selectedPlatform === "claude" && (
                <>
                  <p className="text-xs text-text-secondary mb-2">
                    Add to your <code className="px-1 py-0.5 bg-bg-primary rounded text-[10px]">claude_desktop_config.json</code> file, then restart Claude Desktop.
                  </p>
                  <div className="text-[10px] text-text-tertiary mb-2 space-y-0.5">
                    <p><strong>macOS:</strong> <code className="px-1 py-0.5 bg-bg-primary rounded">{CLAUDE_DESKTOP_CONFIG_PATHS.macos}</code></p>
                    <p><strong>Windows:</strong> <code className="px-1 py-0.5 bg-bg-primary rounded">{CLAUDE_DESKTOP_CONFIG_PATHS.windows}</code></p>
                  </div>
                  <pre className="px-2 py-1.5 text-[10px] font-mono whitespace-pre-wrap rounded border border-border bg-[#1a1a1a] text-gray-200 max-h-28 overflow-y-auto">
                    {JSON.stringify(claudeDesktopConfig.config, null, 2)}
                  </pre>
                </>
              )}

              {selectedPlatform === "chatgpt" && (
                <>
                  <p className="text-xs text-text-secondary mb-2">
                    Go to Settings &gt; Apps &amp; Connectors &gt; Create, then paste the URL as the connector endpoint.
                  </p>
                  <div className="text-[10px] text-text-tertiary mb-2 space-y-0.5">
                    <p>1. Enable Developer mode in Advanced settings</p>
                    <p>2. Click "Create" and paste the URL below</p>
                  </div>
                  <div className="text-[10px] text-amber-600 mb-2">
                    Requires ChatGPT Plus, Pro, or Team subscription.
                  </div>
                  <pre className="px-2 py-1.5 text-[10px] font-mono whitespace-pre-wrap rounded border border-border bg-[#1a1a1a] text-gray-200 break-all">
                    {chatgptConfig.url}
                  </pre>
                </>
              )}
            </div>
          </div>
        )}

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
