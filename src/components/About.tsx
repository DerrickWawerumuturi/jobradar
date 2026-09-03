'use client'
import React, {useEffect, useRef} from 'react'
import Image from "next/image";
import {cn} from "@/lib/utils";
import PanelHeader from "@/components/Market/PanelHeader";

const STEPS = [
    {
        step: "01",
        title: "your CV goes in",
        body: "A PDF is enough. Jobradar reads it and pulls out the skills you already have.",
        rotate: "-rotate-2",
        offset: "lg:translate-y-0",
        visual: "upload" as const,
    },
    {
        step: "02",
        title: "we scan live jobs",
        body: "It analyzes current job ads and counts which skills employers actually ask for.",
        rotate: "rotate-1",
        offset: "lg:translate-y-10",
        visual: "scan" as const,
    },
    {
        step: "03",
        title: "you vs the market",
        body: "Colour-coded charts show the market's demand, the skills you cover, and the gaps worth closing.",
        rotate: "-rotate-1",
        offset: "lg:translate-y-2",
        visual: "compare" as const,
    },
    {
        step: "04",
        title: "start with the best fits",
        body: "Every posting is scored against your CV, so you know which jobs to look at first.",
        rotate: "rotate-2",
        offset: "lg:translate-y-12",
        visual: "match" as const,
    }
] as const;

const SNAPSHOTS: Record<string, {src: string; alt: string; imgClass?: string}> = {
    upload: {
        src: "/assets/snapshots/uploading_cv.png",
        alt: "A CV attached and being read",
        imgClass: "scale-[1.45] object-[0%_80%]",
    },
    scan: {
        src: "/assets/snapshots/scanning_market.png",
        alt: "Live job postings being scanned",
        imgClass: "scale-[1.3] object-[5%_65%]",
    },
    compare: {
        src: "/assets/snapshots/skillsvsmarket.png",
        alt: "Your skills plotted against the market",
    },
    match: {
        src: "/assets/snapshots/matches_list.png",
        alt: "Job postings ranked by fit",
        imgClass: "object-[center_30%]",
    },
};

const TABS = [
    {label: "Overview", body: "The headline numbers of your analysis at a glance."},
    {label: "Skills", body: "What the market wants next to what your CV already covers."},
    {label: "Gaps", body: "The missing skills employers ask for the most."},
    {label: "Matches", body: "Live postings ranked by how well they fit you."}
] as const;

/**
 * The plain-words "what does this app do" section on the landing page,
 * dressed in the same editorial green panel as the dashboard's hero chart so
 * visitors see the house style before they ever upload a CV.
 */
const About = () => {
    const listRef = useRef<HTMLOListElement>(null);

    // Mobile wheel: as the strip scrolls, cards drop and tilt away from the
    // center like points on a rim. No-op when the strip isn't scrollable.
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        let raf = 0;

        const update = () => {
            raf = 0;
            const scrollable = el.scrollWidth > el.clientWidth + 8;
            const mid = el.scrollLeft + el.clientWidth / 2;
            for (const child of el.children) {
                const li = child as HTMLElement;
                if (li.tagName !== "LI") continue;
                if (!scrollable) {
                    li.style.transform = "";
                    li.style.opacity = "";
                    continue;
                }
                const delta = (li.offsetLeft + li.offsetWidth / 2 - mid) / el.clientWidth;
                const abs = Math.abs(delta);
                li.style.transform =
                    `translateY(${abs * 46}px) rotate(${delta * 16}deg) scale(${1 - Math.min(abs * 0.15, 0.2)})`;
                li.style.opacity = `${1 - Math.min(abs * 0.5, 0.45)}`;
            }
        };

        const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
        update();
        el.addEventListener("scroll", schedule, {passive: true});
        window.addEventListener("resize", schedule);
        return () => {
            el.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    return (
    <section
        id={"about"}
        aria-label={"About Jobradar"}
        className={"border-b-0"}
    >
        <div className={"mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10 sm:py-12 lg:px-8"}>
        <PanelHeader
            title={"What Jobradar does"}
            qualifier={""}
            lead={"A market report for your career: your CV on one side, live job postings on the other"}
        />

        <ol
            ref={listRef}
            className={"no-scrollbar relative -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[calc(50vw-115px)] pb-16 pt-3 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-10 sm:overflow-visible sm:px-0 sm:pb-6 lg:grid-cols-4 lg:gap-6 lg:pb-14"}
        >
            {/* The dashed trail the snapshots are pinned along */}
            <svg
                aria-hidden
                viewBox={"0 0 1000 120"}
                preserveAspectRatio={"none"}
                className={"pointer-events-none absolute inset-x-0 top-1/2 hidden h-28 w-full -translate-y-1/2 text-primary/35 lg:block"}
            >
                <path
                    d={"M-10 40 C 120 20, 200 90, 340 70 S 560 20, 700 60 S 900 110, 1010 80"}
                    fill={"none"}
                    stroke={"currentColor"}
                    strokeWidth={"2"}
                    strokeDasharray={"7 9"}
                    strokeLinecap={"round"}
                />
            </svg>

            {STEPS.map(({step, title, body, rotate, offset, visual}) => (
                <li
                    key={step}
                    className={`relative z-10 w-[230px] shrink-0 snap-center transition-[rotate] duration-200 ease-out hover:rotate-0 sm:mx-auto sm:w-full sm:max-w-[260px] ${rotate} ${offset}`}
                >
                    <div className={"paper-grain rounded-sm border border-black/10 bg-[#f2efe7] p-2.5 pb-3 text-neutral-900 shadow-xl transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-2 hover:scale-[1.03] hover:shadow-2xl"}>
                        {/* washi tape */}
                        <div className={"absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-2 bg-[#d8d2c4]/80 shadow-sm"} />

                        <div className={"relative aspect-[4/3] overflow-hidden rounded-[3px] border border-black/15 bg-[oklch(0.20_0.02_260)]"}>
                            <Image
                                src={SNAPSHOTS[visual].src}
                                alt={SNAPSHOTS[visual].alt}
                                fill
                                sizes={"260px"}
                                className={cn("object-cover", SNAPSHOTS[visual].imgClass)}
                            />
                        </div>

                        <div className={"mt-2.5 flex items-baseline gap-2 px-1"}>
                            <span className={"font-mono text-[11px] font-bold text-neutral-500"}>{step}</span>
                            <span className={"font-hand text-xl leading-none"}>{title}</span>
                        </div>
                        <p className={"mt-1.5 px-1 text-xs leading-relaxed text-neutral-600"}>{body}</p>
                    </div>
                </li>
            ))}
        </ol>

        <div className={"flex flex-col gap-3"}>
            <h3 className={"text-center font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"}>
                Inside the analysis
            </h3>
            <ul className={"grid gap-x-6 gap-y-2 sm:grid-cols-2"}>
                {TABS.map(({label, body}) => (
                    <li
                        key={label}
                        className={"flex items-baseline gap-3 border-t border-border py-2.5 text-sm"}
                    >
                        <span className={"shrink-0 font-mono text-xs font-bold uppercase tracking-[0.1em] text-accent-lime"}>
                            {label}
                        </span>
                        <span className={"text-muted-foreground"}>{body}</span>
                    </li>
                ))}
            </ul>
        </div>
        </div>
    </section>
    )
}
export default About
