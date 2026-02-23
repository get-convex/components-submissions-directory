// Copy-to-clipboard install command component
import { useState } from "react";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";

interface InstallCommandProps {
  command: string;
}

export function InstallCommand({ command }: InstallCommandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text for manual copy
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#1a1a1a] px-4 py-3 font-mono text-sm text-white">
      <code className="flex-1 overflow-x-auto whitespace-nowrap">
        {command}
      </code>
      <button
        onClick={handleCopy}
        className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        title={copied ? "Copied" : "Copy to clipboard"}
      >
        {copied ? (
          <CheckIcon className="w-4 h-4 text-green-400" />
        ) : (
          <CopyIcon className="w-4 h-4 text-gray-400" />
        )}
      </button>
    </div>
  );
}
