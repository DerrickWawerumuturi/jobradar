'use client'

import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {JobRadarAnalysis} from "@/types/jobradar";

const STORAGE_KEY = "jobradar";

export type AnalysisStatus = "idle" | "analyzing" | "ready" | "error";

interface AnalysisContextValue {
    analysis: JobRadarAnalysis | null;
    status: AnalysisStatus;
    /** False until localStorage has been read — routes must not redirect before this. */
    hydrated: boolean;
    fileName: string | null;
    save: (analysis: JobRadarAnalysis, fileName: string) => void;
    setStatus: (status: AnalysisStatus) => void;
    clear: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

function isAnalysis(value: unknown): value is JobRadarAnalysis {
    const candidate = value as JobRadarAnalysis | null;
    return Boolean(
        candidate?.market?.skill_coverage && Array.isArray(candidate.ranked_jobs)
    );
}

/**
 * Holds the analysis for the whole app. It lives here rather than in a page
 * component because every analysis route reads it, and a 5-minute analysis
 * must survive navigation between them.
 */
export function AnalysisProvider({children}: { children: React.ReactNode }) {
    const [analysis, setAnalysis] = useState<JobRadarAnalysis | null>(null);
    const [status, setStatus] = useState<AnalysisStatus>("idle");
    const [fileName, setFileName] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                const parsed: unknown = JSON.parse(cached);
                // A response cached from an older backend shape would crash the
                // dashboard on mount, so anything unrecognised is discarded.
                if (isAnalysis(parsed)) {
                    setAnalysis(parsed);
                    setStatus("ready");
                    setFileName(localStorage.getItem(`${STORAGE_KEY}:file`));
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        } catch (e) {
            console.error("Discarding unreadable cached analysis:", e);
            localStorage.removeItem(STORAGE_KEY);
        } finally {
            setHydrated(true);
        }
    }, []);

    const save = useCallback((next: JobRadarAnalysis, name: string) => {
        setAnalysis(next);
        setFileName(name);
        setStatus("ready");
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            localStorage.setItem(`${STORAGE_KEY}:file`, name);
        } catch (e) {
            // Quota or private-mode failures must not lose the in-memory result.
            console.error("Could not cache analysis:", e);
        }
    }, []);

    const clear = useCallback(() => {
        setAnalysis(null);
        setFileName(null);
        setStatus("idle");
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(`${STORAGE_KEY}:file`);
    }, []);

    const value = useMemo<AnalysisContextValue>(
        () => ({analysis, status, hydrated, fileName, save, setStatus, clear}),
        [analysis, status, hydrated, fileName, save, clear]
    );

    return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
    const context = useContext(AnalysisContext);
    if (!context) {
        throw new Error("useAnalysis must be used inside <AnalysisProvider>");
    }
    return context;
}
