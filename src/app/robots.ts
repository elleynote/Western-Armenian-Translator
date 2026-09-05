import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/privacy", "/terms"],
        disallow: ["/admin/", "/dashboard/", "/auth/", "/login", "/signup", "/forgot-password", "/reset-password"]
      }
    ],
    sitemap: "https://translatearmenian.com/sitemap.xml"
  };
}
