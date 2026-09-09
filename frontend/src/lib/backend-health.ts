'use client'

import {useCallback, useEffect, useRef, useState} from 'react';
import {API_BASE_URL} from "@/lib/api";

export type BackendHealth = "checking" | "online" | "offline";

/**
 * Long enough to outlast a container waking from zero replicas — a cold
 * /health has been measured at ~29s. A short timeout here reported "offline"
 * for a service that was merely asleep, which is both wrong and alarming.
 */
const REQUEST_TIMEOUT_MS = 45_000;

/** Past this, the request is almost certainly a cold start rather than a stall. */
const SLOW_AFTER_MS = 4_000;

/** Focus re-checks are throttled so tab-switching does not hammer the API. */
const MIN_RECHECK_GAP_MS = 60_000;

/**
 * Reports whether the analysis API is reachable.
 *
 * Deliberately does NOT poll on an interval. The container scales to zero, and
 * a request every few seconds would hold a replica open permanently — turning
 * a status indicator into a billing decision, and competing for the single
 * replica an analysis needs. It checks on mount and when the tab regains
 * focus, and exposes `recheck` for callers that want a fresh answer.
 */
export function useBackendHealth() {
    const [health, setHealth] = useState<BackendHealth>("checking");
    const [slow, setSlow] = useState(false);
    const lastCheckedAt = useRef(0);
    const inFlight = useRef(false);

    const check = useCallback(async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        lastCheckedAt.current = Date.now();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);

        try {
            const response = await fetch(`${API_BASE_URL}/health`, {
                signal: controller.signal,
                cache: "no-store"
            });
            setHealth(response.ok ? "online" : "offline");
        } catch {
            // Network failure, CORS rejection and timeout are indistinguishable
            // from the user's point of view: unreachable.
            setHealth("offline");
        } finally {
            clearTimeout(timeout);
            clearTimeout(slowTimer);
            setSlow(false);
            inFlight.current = false;
        }
    }, []);

    useEffect(() => {
        void check();

        const onFocus = () => {
            if (Date.now() - lastCheckedAt.current > MIN_RECHECK_GAP_MS) void check();
        };

        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [check]);

    return {health, slow, recheck: check};
}
