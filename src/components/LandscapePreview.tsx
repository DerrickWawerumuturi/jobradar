'use client'

import React from 'react'
import SkillLandscape from "@/components/Market/SkillLandscape";
import {SkillStat} from "@/types/jobradar";

/*
 * Hand-written sample of a frontend job market (~120 postings) so the landing
 * page can show the real landscape chart before anyone uploads a CV. Purely
 * illustrative — clearly tagged as sample data in the UI.
 */
const SAMPLE_MINE: SkillStat[] = [
    {skill: "React", frequency: 0.78, job_count: 94},
    {skill: "TypeScript", frequency: 0.69, job_count: 83},
    {skill: "JavaScript", frequency: 0.64, job_count: 77},
    {skill: "CSS", frequency: 0.41, job_count: 49},
    {skill: "Git", frequency: 0.38, job_count: 46},
    {skill: "Node.js", frequency: 0.33, job_count: 40},
    {skill: "REST APIs", frequency: 0.27, job_count: 32},
    {skill: "Jest", frequency: 0.18, job_count: 22},
    {skill: "Figma", frequency: 0.12, job_count: 14},
    {skill: "Redux", frequency: 0.08, job_count: 10}
];

const SAMPLE_GAPS: SkillStat[] = [
    {skill: "Next.js", frequency: 0.52, job_count: 62},
    {skill: "Tailwind CSS", frequency: 0.44, job_count: 53},
    {skill: "GraphQL", frequency: 0.37, job_count: 37},
    {skill: "Docker", frequency: 0.26, job_count: 31},
    {skill: "AWS", frequency: 0.22, job_count: 26},
    {skill: "CI/CD", frequency: 0.21, job_count: 25}
];

/** The real landscape chart, fed sample data, as a landing-page showcase. */
const LandscapePreview = () => (
    <div className={"mx-auto flex w-full max-w-5xl flex-col gap-3 px-5"}>
        <p className={"text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"}>
            <span className={"font-bold text-accent-lime"}>Preview</span>
            {" "}· sample data — upload your CV to see your own market
        </p>
        <SkillLandscape userSkills={SAMPLE_MINE} gaps={SAMPLE_GAPS} />
    </div>
)
export default LandscapePreview
