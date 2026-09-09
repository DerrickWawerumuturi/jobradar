import type {MetadataRoute} from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Private, thin, or design-reference pages add nothing to search.
            disallow: ["/dashboard", "/api/", "/onboarding", "/analysis", "/designs/"],
        },
        sitemap: "https://jobradar-frontend-pearl.vercel.app/sitemap.xml",
    };
}
