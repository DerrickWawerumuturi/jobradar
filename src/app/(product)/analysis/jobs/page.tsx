'use client'

import React from 'react'
import {useAnalysis} from "@/lib/analysis-store";
import JobMatches from "@/components/Market/JobMatches";
import Annotation from "@/components/Annotation";

export default function DashboardJobsPage() {
    const {analysis} = useAnalysis();
    if (!analysis) return null;

    return (
        <div className={"flex flex-col gap-1"}>
            <Annotation className={"ml-3 self-start"}>real postings, live right now → and they fit you</Annotation>
            <JobMatches
                jobs={analysis.ranked_jobs}
                userSkills={analysis.market.user_skill_presence}
            />
        </div>
    )
}
