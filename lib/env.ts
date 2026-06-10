const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";

export function getOpenAiApiKey(): string | undefined {
  const value = process.env[OPENAI_API_KEY_ENV];
  return value?.trim() || undefined;
}

export function isOpenAiApiKeyConfigured(): boolean {
  return Boolean(getOpenAiApiKey());
}
