'use client'

import React, {createContext, useCallback, useContext, useMemo, useState, useEffect} from "react";
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
    const [cv, setCv] = useState<CvBreakdown | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function hydrate() {
            const remote = await GetCV().catch(() => null)
            if (cancelled) return
            if (remote) {
                setCv(remote);
                localStorage.setItem(CVKEY, JSON.stringify(remote));
                return
            }

            try {
                const cached = localStorage.getItem(CVKEY)
                if (cached) setCv(JSON.parse(cached))
            } catch {
                localStorage.removeItem(CVKEY)
            }
        }

        hydrate()
        return () => { cancelled = true }
    }, []);


    const getCv = useCallback(() => {
        try {
            GetCV().then((cv) => {
                setCv(cv)
            }).catch((err) => console.error(err));
        } catch (e) {
            console.error("No cv saved yet:", e);
        }
    }, [])

    const saveCv = useCallback((next: CvBreakdown) => {
        setCv(next)

        try {
            localStorage.setItem(CVKEY, JSON.stringify(next))
            StoreCV(next).catch((error) => {
                console.log("Error storing cv:", error);
            })
        } catch (error) {
            console.error("Error saving cv to storage",error)
        }
    }, [cv])

    const clear = useCallback(
        () => {
            setCv(null)
            localStorage.removeItem("cv-store")
        }, [])

    const value = useMemo<CvContextProps>(() =>
        ({cv, saveCv, clear})
    , [cv, setCv, saveCv, setCv])

    return <CvContext.Provider value={value}>{children}</CvContext.Provider>
}

export function useCv() {
    const context = useContext(CvContext)

    if (!context) {
        throw new Error("useCv must be used within <CVProvider>")
    }

    return context;
}