import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/library";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/history", "/submit"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
