'use client'

import React, {useState} from 'react'
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import Analyze, {ProcessCv} from "@/lib/api";
import {useAnalysis} from "@/lib/analysis-store";
import {useCv} from "@/lib/cv-store";
import {PageBar} from "@/components/dashboard/bits";
import FileUpload from "@/components/ui/FileUpload";
import AnalysisProgress from "@/components/AnalysisProgress";

/** Run a scan without leaving the workspace. */
export default function ScanPage() {
    const router = useRouter();
    const {status, setStatus, save} = useAnalysis();
    const {saveCv} = useCv();
    const [file, setFile] = useState<File | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isAnalyzing = status === "analyzing";

    const runScan = async (upload: File) => {
        setErrorMessage(null);
        setStatus("analyzing");
        try {
            const analysisPromise = Analyze(upload);
            ProcessCv(upload).then(saveCv).catch((e) => {
                console.error("CV breakdown error:", e);
                toast.error(e instanceof Error ? e.message : "Failed to process CV");
            });

            const result = await analysisPromise;
            save(result, upload.name);
            router.push("/dashboard/opportunities");
        } catch (e) {
            console.error("Scan error:", e);
            setStatus("error");
            const detail = e instanceof Error ? e.message : null;
            setErrorMessage(detail);
            toast.error(detail ?? "Scan failed");
        }
    };

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar title={"New scan"} meta={"one PDF in, your market out"} />

            <div className={"mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10 sm:px-6"}>
                {isAnalyzing ? (
                    <AnalysisProgress />
                ) : (
                    <>
                        <div>
                            <h2 className={"text-lg font-bold"}>Scan the market with your latest CV</h2>
                            <p className={"mt-1 text-sm text-muted-foreground"}>
                                A scan takes about a minute: live postings are pulled, ranked against
                                your CV, and land in Opportunities. It replaces your previous scan.
                            </p>
                        </div>
                        <FileUpload Cv={file} setHandleCv={setFile} onUploadComplete={runScan} />
                        {errorMessage && (
                            <p className={"rounded-md border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm"}>
                                {errorMessage}
                            </p>
                        )}
                        <p aria-hidden className={"-rotate-1 self-start font-hand text-lg text-primary/80"}>
                            fresh CV → fresh matches, it&apos;s that direct
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
