import type { MetadataRoute } from "next";
import {
  fetchApprovedSubmissions,
  buildPromptUrl,
  SITE_URL,
} from "./lib/library";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/gallery`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/prompt`, changeFrequency: "daily", priority: 0.8 },
  ];

  // On fetch failure this returns [], so the sitemap degrades to static routes.
  const submissions = await fetchApprovedSubmissions(1000);
  const promptRoutes: MetadataRoute.Sitemap = submissions.map((s) => ({
    url: buildPromptUrl(s),
    lastModified: new Date(s.submitted_at),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...promptRoutes];
}
