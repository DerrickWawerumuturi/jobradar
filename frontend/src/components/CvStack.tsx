import React from 'react'

/**
 * The hero illustration: a folder of CVs with the top one already read.
 * Pure CSS — paper cards on the dark grid, in the postcard spirit.
 */
const CvStack = () => (
    <div
        role={"img"}
        aria-label={"An analyzed CV on top of a folder of uploaded CVs"}
        className={"relative mx-auto h-[400px] w-full max-w-[480px] select-none sm:h-[440px]"}
    >
        {/* The folder everything lives in */}
        {/*<div className={"absolute inset-x-4 bottom-2 top-24 rotate-1 rounded-xl border border-white/10 bg-[oklch(0.30_0.06_158)] shadow-2xl"}>*/}
        {/*    <div className={"absolute -top-7 left-6 h-7 w-36 rounded-t-lg border border-b-0 border-white/10 bg-[oklch(0.30_0.06_158)]"} />*/}
        {/*    <span className={"absolute -top-5 left-10 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50"}>*/}
        {/*        Your CVs*/}
        {/*    </span>*/}
        {/*</div>*/}

        {/* The bottom of the pile — barely peeking, punch-holes and all */}
        <div className={"absolute right-44 top-44 anim-rise sm:right-60"} style={{animationDelay: "0.3s"}}>
            <div className={"anim-bob"} style={{animationDelay: "1.7s"}}>
                <div className={"paper-grain relative h-60 w-48 -rotate-[17deg] rounded-[1px] border border-black/10 bg-[#ddd7c9] p-4 pl-7 text-neutral-800 shadow-md"}>
                    <div className={"absolute inset-y-3 left-2 flex flex-col justify-between"}>
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className={"size-2 rounded-full bg-[oklch(0.17_0.004_260)]"} />
                        ))}
                    </div>
                    <p className={"font-mono text-[8px] uppercase tracking-[0.16em] text-neutral-500"}>
                        cv_2024_old.pdf
                    </p>
                    <h3 className={"mt-1.5 font-heading text-lg font-bold uppercase leading-none tracking-tight"}>
                        Kofi<br/>Mensah
                    </h3>
                    <p className={"mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500"}>
                        Data Analyst · Accra
                    </p>
                    <div className={"my-3 border-t border-dashed border-neutral-400"} />
                    <div className={"flex flex-wrap gap-1"}>
                        {["Excel", "SQL"].map((skill) => (
                            <span
                                key={skill}
                                className={"rounded-[1px] border border-neutral-600 px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]"}
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                    <div className={"mt-3 flex flex-col gap-1.5"}>
                        {[26, 32, 20].map((w, i) => (
                            <div key={i} className={"h-1.5 rounded-[1px] bg-neutral-400/40"} style={{width: `${w * 4}px`}} />
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* An unread CV tucked behind the read one, waiting its turn */}
        <div className={"absolute right-28 top-32 anim-rise sm:right-40"} style={{animationDelay: "0.15s"}}>
            <div className={"anim-bob"} style={{animationDelay: "1.2s"}}>
                <div className={"paper-grain h-64 w-52 -rotate-[10deg] rounded-[1px] border border-black/10 bg-[#e7e3d8] p-4 text-neutral-800 shadow-lg"}>
                    <p className={"font-mono text-[8px] uppercase tracking-[0.16em] text-neutral-500"}>
                        lena_cv_2025.pdf
                    </p>
                    <h3 className={"mt-1.5 font-heading text-xl font-bold uppercase leading-none tracking-tight"}>
                        Lena<br/>Njeri
                    </h3>
                    <p className={"mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500"}>
                        UX Designer · Mombasa
                    </p>
                    <div className={"my-3 border-t border-dashed border-neutral-400"} />
                    <div className={"flex flex-wrap gap-1"}>
                        {["Figma", "Research", "HTML"].map((skill) => (
                            <span
                                key={skill}
                                className={"rounded-[1px] border border-neutral-600 px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]"}
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                    <div className={"mt-3 flex flex-col gap-1.5"}>
                        {[30, 24, 34, 18].map((w, i) => (
                            <div key={i} className={"h-1.5 rounded-[1px] bg-neutral-400/50"} style={{width: `${w * 4}px`}} />
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* The read one, front and center */}
        <div className={"absolute right-1 top-6 anim-rise sm:right-6"}>
        <div className={"anim-bob"}>
        <div className={"paper-grain w-64 rotate-3 rounded-[1px] border border-black/10 bg-[#f2efe7] p-5 text-neutral-900 shadow-2xl sm:w-72"}>
            {/* rubber stamp: the radar has been here */}
            <div className={"absolute right-3 top-3 -rotate-12 opacity-75"}>
                <svg viewBox={"0 0 64 64"} className={"anim-stamp size-16 text-[oklch(0.48_0.14_150)]"}>
                    <defs>
                        <path id={"stamp-arc"} d={"M 32 7 A 25 25 0 1 1 31.99 7"} fill={"none"} />
                    </defs>
                    <circle cx={"32"} cy={"32"} r={"30"} fill={"none"} stroke={"currentColor"} strokeWidth={"1.5"} />
                    <circle cx={"32"} cy={"32"} r={"20"} fill={"none"} stroke={"currentColor"} strokeWidth={"1"} />
                    <text className={"font-mono"} fontSize={"6.2"} letterSpacing={"1.6"} fill={"currentColor"}>
                        <textPath href={"#stamp-arc"}>JOBRADAR · READ · JOBRADAR ·</textPath>
                    </text>
                    {/* radar sweep */}
                    <circle cx={"32"} cy={"32"} r={"13"} fill={"none"} stroke={"currentColor"} strokeWidth={"0.75"} opacity={"0.6"} />
                    <circle cx={"32"} cy={"32"} r={"7"} fill={"none"} stroke={"currentColor"} strokeWidth={"0.75"} opacity={"0.6"} />
                    <g className={"anim-radar"}>
                        <path d={"M32 32 L32 19 A13 13 0 0 1 42.5 25.5 Z"} fill={"currentColor"} opacity={"0.35"} />
                        <line x1={"32"} y1={"32"} x2={"32"} y2={"19"} stroke={"currentColor"} strokeWidth={"1"} />
                    </g>
                    <circle cx={"27"} cy={"37"} r={"1.4"} fill={"currentColor"} />
                    <circle cx={"38"} cy={"36"} r={"1.4"} fill={"currentColor"} />
                </svg>
            </div>

            <p className={"font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-500"}>
                cv_final_v3.pdf
            </p>
            <h3 className={"mt-2 font-heading text-2xl font-bold uppercase leading-none tracking-tight"}>
                Amara<br/>Okafor
            </h3>
            <p className={"mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500"}>
                Product Engineer · Nairobi
            </p>

            <div className={"my-4 border-t border-dashed border-neutral-400"} />

            <div className={"flex flex-wrap gap-1.5"}>
                {["React", "Python", "SQL", "Figma"].map((skill) => (
                    <span
                        key={skill}
                        className={"rounded-sm border border-neutral-700 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]"}
                    >
                        {skill}
                    </span>
                ))}
            </div>

            <div className={"mt-4 flex flex-col gap-2"}>
                {[44, 36, 40].map((w, i) => (
                    <div key={i} className={"h-1.5 rounded-sm bg-neutral-300"} style={{width: `${w * 4}px`}} />
                ))}
            </div>

            <div className={"mt-5 flex items-center justify-between"}>
                <span className={"-rotate-6 rounded-sm border-2 border-[oklch(0.55_0.14_150)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[oklch(0.45_0.14_150)]"}>
                    Read · 98% match
                </span>
                <span className={"font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500"}>
                    43 sec
                </span>
            </div>
        </div>
        </div>
        </div>
    </div>
)
export default CvStack
