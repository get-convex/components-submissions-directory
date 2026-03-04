export type AiProvider = "anthropic" | "openai" | "gemini";

export type AiProviderSource = "admin-active" | "admin-backup" | "env";

export type ProviderSettingsForFallback = {
  provider: AiProvider;
  apiKey?: string;
  model?: string;
  isEnabled: boolean;
};

export type ProviderCandidate = {
  provider: AiProvider;
  apiKey: string;
  model: string;
  source: AiProviderSource;
};

type BuildCandidatesInput = {
  adminProviders: ProviderSettingsForFallback[];
  envKeys: {
    anthropic?: string;
    openai?: string;
    gemini?: string;
  };
  defaultEnvModels: Record<AiProvider, string>;
};

type ExecuteWithFallbackInput<T> = {
  candidates: ProviderCandidate[];
  run: (candidate: ProviderCandidate) => Promise<T>;
};

function hasValue(value: string | undefined): value is string {
  return Boolean(value && value.trim());
}

function sanitize(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function buildProviderCandidates(
  input: BuildCandidatesInput,
): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = [];
  const seen = new Set<string>();

  const pushCandidate = (candidate: ProviderCandidate) => {
    const key = `${candidate.provider}:${candidate.apiKey}:${candidate.model}`;
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(candidate);
    }
  };

  // Custom admin provider order:
  // 1) currently enabled provider
  // 2) other configured providers as backups
  const active = input.adminProviders.filter(
    (p) => p.isEnabled && hasValue(p.apiKey) && hasValue(p.model),
  );
  const backups = input.adminProviders.filter(
    (p) => !p.isEnabled && hasValue(p.apiKey) && hasValue(p.model),
  );

  for (const setting of active) {
    pushCandidate({
      provider: setting.provider,
      apiKey: sanitize(setting.apiKey)!,
      model: sanitize(setting.model)!,
      source: "admin-active",
    });
  }

  for (const setting of backups) {
    pushCandidate({
      provider: setting.provider,
      apiKey: sanitize(setting.apiKey)!,
      model: sanitize(setting.model)!,
      source: "admin-backup",
    });
  }

  // Environment fallback order: Anthropic -> OpenAI -> Gemini
  const envOrder: AiProvider[] = ["anthropic", "openai", "gemini"];
  for (const provider of envOrder) {
    const envKey = sanitize(input.envKeys[provider]);
    if (!envKey) continue;
    pushCandidate({
      provider,
      apiKey: envKey,
      model: input.defaultEnvModels[provider],
      source: "env",
    });
  }

  return candidates;
}

export async function executeWithProviderFallback<T>(
  input: ExecuteWithFallbackInput<T>,
): Promise<{
  result: T;
  usedProvider: AiProvider;
  usedModel: string;
  usedSource: AiProviderSource;
}> {
  if (input.candidates.length === 0) {
    throw new Error(
      "No AI provider configured. Set ANTHROPIC_API_KEY or CONVEX_OPENAI_API_KEY, or configure a provider in Admin Settings.",
    );
  }

  const errors: string[] = [];

  for (const candidate of input.candidates) {
    try {
      const result = await input.run(candidate);
      return {
        result,
        usedProvider: candidate.provider,
        usedModel: candidate.model,
        usedSource: candidate.source,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${candidate.provider} (${candidate.source}): ${message}`);
    }
  }

  throw new Error(`All AI providers failed. ${errors.join(" | ")}`);
}
