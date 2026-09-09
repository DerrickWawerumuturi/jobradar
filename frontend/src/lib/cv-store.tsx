'use client'

import React, {createContext, useCallback, useContext, useMemo, useState, useEffect} from "react";
import {useSession} from "next-auth/react";
import { CvBreakdown } from "@/types/jobradar"
import {GetCV, StoreCV} from "@/lib/api";

interface CvContextProps {
    cv: CvBreakdown | null
    saveCv: (cv: CvBreakdown) => void
    clear: () => void
}

const CVKEY = "cv-store";
const CvContext = createContext<CvContextProps | null>(null)


export default function CVProvider({children}: { children: React.ReactNode }) {
    const {status: authStatus} = useSession();
    const [cv, setCv] = useState<CvBreakdown | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function hydrate() {
            // Local cache paints immediately — the server round-trip must
            // never leave the app looking empty while it's in flight.
            let cached: CvBreakdown | null = null;
            try {
                const raw = localStorage.getItem(CVKEY)
                if (raw) cached = JSON.parse(raw)
            } catch {
                try { localStorage.removeItem(CVKEY) } catch {}
            }
            if (cached && !cancelled) setCv(cached)

            if (authStatus !== "authenticated") return

            // undefined = request failed (keep the cache), null = server has none.
            const remote = await GetCV().catch(() => undefined)
            if (cancelled) return
            if (remote) {
                setCv(remote)
                try { localStorage.setItem(CVKEY, JSON.stringify(remote)) } catch {}
            } else if (remote === null && cached) {
                // Signed in, server empty, local draft exists — migrate it up
                // so this account owns the CV from now on.
                StoreCV(cached).catch((error) => console.error("Migrating local CV failed:", error))
            }
        }

        hydrate()
        return () => { cancelled = true }
    }, [authStatus]);

    const saveCv = useCallback((next: CvBreakdown) => {
        setCv(next)
        // The server save must never depend on localStorage cooperating.
        StoreCV(next).catch((error) => console.error("Error storing cv:", error))
        try {
            localStorage.setItem(CVKEY, JSON.stringify(next))
        } catch (error) {
            console.error("Error caching cv:", error)
        }
    }, [])

    const clear = useCallback(
        () => {
            setCv(null)
            localStorage.removeItem("cv-store")
        }, [])

    const value = useMemo<CvContextProps>(() =>
        ({cv, saveCv, clear})
    , [cv, saveCv, clear])

    return <CvContext.Provider value={value}>{children}</CvContext.Provider>
}

export function useCv() {
    const context = useContext(CvContext)

    if (!context) {
        throw new Error("useCv must be used within <CVProvider>")
    }

    return context;
}