import { discoverKiroModels } from "./src/kiro/discover.ts";
import { streamKiro } from "./src/kiro/stream.ts";

const PROVIDER_ID = "kiro-api-key";
const DEFAULT_REGION = "us-east-1";

function getRegion(): string {
  const raw = globalThis.process?.env?.KIRO_API_REGION;
  const region = typeof raw === "string" ? raw.trim() : "";
  return region || DEFAULT_REGION;
}

function getApiKey(): string {
  const raw = globalThis.process?.env?.KIRO_API_KEY;
  const key = typeof raw === "string" ? raw.trim() : "";
  if (!key) {
    throw new Error(
      "KIRO_API_KEY is not set. The Kiro provider discovers its model list " +
        "from the API at startup and needs the key to do so.",
    );
  }
  return key;
}

// pi passes an ExtensionAPI here. Typed loosely so the package has no build
// step — pi loads this .ts file directly via jiti.
//
// The factory is async: pi awaits it before startup continues, so the model
// list is fetched from Kiro before the provider is registered and is
// available to interactive startup and `pi --list-models` alike.
//
// Discovery is deliberately fail-closed. Models can be scoped to an org or
// entitlement, so a hardcoded fallback list would advertise models this key
// cannot use and omit ones it can. If discovery fails we throw, and pi
// reports an extension load error instead of registering a wrong catalog.
export default async function registerKiroApiKeyProvider(pi: {
  registerProvider: (id: string, config: unknown) => void;
}): Promise<void> {
  const region = getRegion();
  const baseUrl = `https://q.${region}.amazonaws.com/`;
  const apiKey = getApiKey();

  const models = await discoverKiroModels(apiKey, baseUrl);

  pi.registerProvider(PROVIDER_ID, {
    name: "Kiro (API Key)",
    baseUrl,
    // pi resolves a bare env var name here; "$KIRO_API_KEY" is sent literally
    // as the bearer token, so every request 403s after discovery succeeds.
    apiKey: "KIRO_API_KEY",
    api: "kiro-api",
    models,
    streamSimple: streamKiro,
  });
}
