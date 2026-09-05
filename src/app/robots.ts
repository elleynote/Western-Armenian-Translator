import type { MetadataRoute } from "next";

const SITE_URL = "https://translatearmenian.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/privacy", "/terms"],
        disallow: ["/admin/", "/dashboard/", "/auth/", "/login", "/signup", "/forgot-password", "/reset-password"]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
