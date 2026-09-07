import type {MetadataRoute} from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const base = "https://jobradar-frontend-pearl.vercel.app";
    return [
        {url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1},
        {url: `${base}/sign-in`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5},
    ];
}
