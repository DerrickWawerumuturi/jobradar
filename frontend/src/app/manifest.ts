import type {MetadataRoute} from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "JobRadar",
        short_name: "JobRadar",
        description: "Your CV vs the live job market: matches explained, gaps counted, applications tracked.",
        start_url: "/dashboard",
        display: "standalone",
        background_color: "#131316",
        theme_color: "#131316",
        icons: [
            {src: "/icons/icon-192.png", sizes: "192x192", type: "image/png"},
            {src: "/icons/icon-512.png", sizes: "512x512", type: "image/png"},
            {src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable"}
        ]
    };
}
