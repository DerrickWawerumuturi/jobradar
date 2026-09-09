import {NextRequest} from "next/server";

/*
 * Same-origin logo proxy. Adblockers block third-party favicon hosts
 * (unavatar, etc.) straight from the browser, and unavatar rate-limits a
 * table's worth of parallel requests — so the server fetches instead, and
 * the browser only ever talks to our own domain.
 */

const SOURCES = (q: string) => [
    // DuckDuckGo: reliable domain favicons, honest 404s, no rate limit.
    ...(q.includes(".") ? [`https://icons.duckduckgo.com/ip3/${q}.ico`] : []),
    // unavatar: catches name/handle guesses DDG can't do.
    `https://unavatar.io/${q}?fallback=false`
];

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    if (!/^[a-z0-9][a-z0-9.-]{0,100}$/i.test(q)) return new Response(null, {status: 400});

    for (const url of SOURCES(q)) {
        try {
            const upstream = await fetch(url, {next: {revalidate: 86400}});
            if (!upstream.ok) continue;
            return new Response(upstream.body, {
                headers: {
                    "content-type": upstream.headers.get("content-type") ?? "image/png",
                    "cache-control": "public, max-age=86400, s-maxage=604800"
                }
            });
        } catch { /* try the next source */ }
    }
    return new Response(null, {status: 404});
}
