import { CvBreakdown, JobRadarAnalysis } from "@/types/jobradar";

export const API_BASE_URL = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:7456"
).replace(/\/+$/, "");


const ANALYZE_TIMEOUT_MS = 240_000;
const CV_TIMEOUT_MS = 120_000;
const SAVE_TIMEOUT_MS = 20_000;

let apiToken : {token: string, expiresAt: number} | null = null;

export async function getApiToken(): Promise<string> {
    if (apiToken && Date.now() < apiToken.expiresAt) return apiToken.token;

    const res = await fetch("/api/token")
    if (!res.ok) throw new Error("Not signed in")

    const { token } = await res.json()
    apiToken = { token, expiresAt: Date.now() + 14 * 60000};
    return token
}

export class ApiError extends Error {
    constructor(message: string, public status: number) {
        super(message)
    }
}

async function request<T>(path: string, init: RequestInit, timeoutMs: number, label: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...init,
            signal: controller.signal,
        });

        if (!response.ok) {
            const detail = await response.json().then((b) => b?.detail).catch(() => null);
            throw new ApiError(detail || `${label} failed: ${response.status}`, response.status)
        }

        return await response.json();
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new Error(`${label} timed out. The API may be starting up — try again.`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

function postFile<T>(path: string, file: File, timeoutMs: number, label: string): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);
    return request<T>(path, { method: "POST", body: formData }, timeoutMs, label);
}

async function getJson<T>(path: string, timeoutMs: number, label: string): Promise<T> {
    return request<T>(path, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getApiToken()}`,
        },
    }, timeoutMs, label);
}
async function putJson<T>(path: string, payload: unknown, timeoutMs: number, label: string): Promise<T> {
    return request<T>(path, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getApiToken()}`,
        },
        body: JSON.stringify(payload),
    }, timeoutMs, label);
}

export function ProcessCv(file: File): Promise<CvBreakdown> {
    return postFile<CvBreakdown>("/cv/parse", file, CV_TIMEOUT_MS, "CV breakdown");
}

export default function Analyze(file: File): Promise<JobRadarAnalysis> {
    return postFile<JobRadarAnalysis>("/analyze", file, ANALYZE_TIMEOUT_MS, "Analysis");
}

export function StoreCV(cv: CvBreakdown): Promise<CvBreakdown> {
    return putJson<CvBreakdown>("/cv", cv, SAVE_TIMEOUT_MS, "CV save");
}

export async  function GetCV(): Promise<CvBreakdown | null> {
   try {
       return await getJson<CvBreakdown>("/cv", CV_TIMEOUT_MS, "CV breakdown");
   } catch (err) {
       if (err instanceof ApiError && err.status === 404) return null
       throw err
   }
}