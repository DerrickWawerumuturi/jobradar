'use client'

import React, {useState} from 'react'
import {useRouter} from "next/navigation";
import {FileTextIcon, XIcon} from "lucide-react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {
    Attachment, AttachmentAction, AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle
} from "@/components/ui/attachment";
import FileUpload from "@/components/ui/FileUpload";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import {useAnalysis} from "@/lib/analysis-store";
import AnalysisProgress from "@/components/AnalysisProgress";
import {useCv} from "@/lib/cv-store";
import Analyze, {ProcessCv} from "@/lib/api";
import Annotation from "@/components/Annotation";
import CvStack from "@/components/CvStack";

const Hero = () => {
    const router = useRouter();
    const {analysis, status, setStatus, save, clear} = useAnalysis();
    const {saveCv, clear: clearCv} = useCv()

    const [cv, setCv] = useState<File | null>(null);
    const [open, setOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isAnalyzing = status === "analyzing";

    /**
     * Analysis is started explicitly by the Upload button rather than as a
     * side effect of the dialog closing, so dismissing the dialog can never
     * kick off a five-minute request the user didn't ask for.
     */
    const handleUploadComplete = async (file: File) => {
        setOpen(false);
        setErrorMessage(null);
        setStatus("analyzing");

        try {
            const analysisPromise = Analyze(file);
            const cvPromise = ProcessCv(file);

            cvPromise
                .then(saveCv)
                .catch((e) => {
                    console.error("CV breakdown error:", e);
                    toast.error(e instanceof Error ? e.message : "Failed to process CV");
                });

            const analysis_data = await analysisPromise;
            save(analysis_data, file.name)

            router.push("/analysis");
        } catch (e) {
            console.error("Backend analysis error:", e);
            setStatus("error");
            // The API's own message is more useful than a generic failure —
            // a timeout and a rejected origin need different responses from
            // the user, and "try again" only helps for one of them.
            const detail = e instanceof Error ? e.message : null;
            setErrorMessage(detail ? `${detail}` : null);
            toast.error(detail ?? "Failed to analyze CV");
        }
    };

    const handleRemoveCv = () => {
        setCv(null);
        clearCv()
        clear();
    };

    const points = [
        "Which skills this market asks for — ranked by how often they appear.",
        "Which of your skills carry weight, and which never come up.",
        "The specific gaps worth closing next, ordered by demand."
    ];


    return (
        <section id={"upload"} className={"overflow-x-clip"}>
            <div className={"mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-10 px-5 py-12 sm:py-14 lg:flex-row lg:gap-16 lg:px-8 lg:py-16"}>
                <div className={"max-w-xl"}>
                    <div className={"flex flex-col gap-6"}>
                        <p className={"font-mono text-[11px] uppercase tracking-[0.2em] text-primary"}>
                            Job-hunt intelligence
                        </p>
                        <h1 className={"font-heading text-4xl font-bold uppercase leading-[1.02] tracking-tight sm:text-5xl"}>
                            See where you<br/>actually stand.
                        </h1>
                        <p className={"text-base text-muted-foreground"}>
                            Upload your CV and we&apos;ll scan live job postings, pull out
                            what the market is really asking for, and show you the gap.
                        </p>
                        <ol className={"mt-2 flex flex-col"}>
                            {points.map((point, index) => (
                                <li
                                    key={point}
                                    className={"flex items-baseline gap-4 border-t border-border py-3 last:border-b"}
                                >
                                    <span className={"shrink-0 font-mono text-xs font-medium text-primary"}>
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                    <span className={"text-sm text-foreground/90"}>{point}</span>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className={"mt-8 flex flex-col gap-4"}>
                        {!analysis && !isAnalyzing && (
                            <Annotation flip className={"-mb-2 ml-10 self-start"}>
                                start here → it takes about a minute
                            </Annotation>
                        )}
                        <div className={"flex flex-wrap items-center gap-3"}>
                            <Dialog open={open} onOpenChange={setOpen}>
                                <DialogTrigger render={(props) => (
                                    <Button {...props} disabled={isAnalyzing} className={"px-6 py-5 font-semibold"}>
                                        {isAnalyzing ? "Analyzing…" : "Upload your CV"}
                                    </Button>
                                )} />
                                <DialogContent>
                                    <FileUpload
                                        Cv={cv}
                                        setHandleCv={setCv}
                                        onUploadComplete={handleUploadComplete}
                                    />
                                </DialogContent>
                            </Dialog>

                            {analysis && !isAnalyzing && (
                                <Button variant={"outline"} onClick={() => router.push("/analysis")}>
                                    View last analysis
                                </Button>
                            )}
                        </div>

                        <p className={"font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"}>
                            PDF only · takes about a minute
                        </p>

                        {cv && (
                            <Attachment>
                                <AttachmentMedia>
                                    <FileTextIcon />
                                </AttachmentMedia>
                                <AttachmentContent>
                                    <AttachmentTitle>{cv.name}</AttachmentTitle>
                                    <AttachmentDescription>
                                        {cv.type} - {(cv.size / 1024).toFixed(2)} KB
                                    </AttachmentDescription>
                                </AttachmentContent>
                                <AttachmentActions>
                                    <AttachmentAction aria-label="Remove cv" onClick={handleRemoveCv}>
                                        <XIcon />
                                    </AttachmentAction>
                                </AttachmentActions>
                            </Attachment>
                        )}

                        {isAnalyzing && <AnalysisProgress />}

                        {status === "error" && (
                            <p className={"text-sm text-destructive"}>
                                {errorMessage ?? "Analysis failed. Try again."}
                            </p>
                        )}
                    </div>
                </div>

                <div className={"relative w-full max-w-[500px] shrink lg:w-auto"}>
                    <CvStack />
                    {/*<Annotation flip className={"absolute -bottom-2 right-4"}>*/}
                    {/*    your CV, after we&apos;ve read it*/}
                    {/*</Annotation>*/}
                </div>
            </div>
        </section>
    )
}
export default Hero
