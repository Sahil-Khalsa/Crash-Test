import type { Source } from "./types";

export interface GroundingResult extends Source {
  highlights: string[];
}

const EXA_SEARCH_URL = "https://api.exa.ai/search";

export async function groundSearch(query: string): Promise<GroundingResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(EXA_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: 8,
        contents: { highlights: true },
      }),
    });

    if (!res.ok) return [];

    const body = await res.json();
    const results: unknown[] = Array.isArray(body?.results) ? body.results : [];

    return results
      .filter((r: unknown): r is Record<string, unknown> => {
        const url = (r as Record<string, unknown> | null)?.url;
        return typeof url === "string" && url.length > 0;
      })
      .map((r) => ({
        title: typeof r.title === "string" ? r.title : (r.url as string),
        url: r.url as string,
        highlights: Array.isArray(r.highlights)
          ? r.highlights.filter((h: unknown): h is string => typeof h === "string")
          : [],
      }));
  } catch {
    return [];
  }
}
