import { readFile } from "node:fs/promises";

const snapshotUrl = new URL("../../site/data/snapshot.json", import.meta.url);

export default async () => {
  const fallback = JSON.parse(await readFile(snapshotUrl, "utf8"));
  const liveUrl = process.env.MLA_SHEET_FEED_URL;

  if (liveUrl) {
    try {
      const response = await fetch(liveUrl, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Feed returned ${response.status}`);
      const live = await response.json();
      live.meta = {
        ...live.meta,
        source: "google-sheets",
        fetchedAt: new Date().toISOString(),
      };
      return Response.json(live, {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
        },
      });
    } catch (error) {
      fallback.meta.feedError = error.message;
    }
  }

  fallback.meta = {
    ...fallback.meta,
    source: "deployed-snapshot",
    fetchedAt: new Date().toISOString(),
  };
  return Response.json(fallback, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
    },
  });
};
