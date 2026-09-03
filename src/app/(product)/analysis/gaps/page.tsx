'use client'

import React from 'react'
import {useAnalysis} from "@/lib/analysis-store";
import SkillGapChart from "@/components/Market/SkillGapChart";
import Annotation from "@/components/Annotation";

export default function DashboardGapsPage() {
    const {analysis} = useAnalysis();
    if (!analysis) return null;

    return (
        <div className={"flex flex-col gap-1"}>
            <Annotation className={"ml-3 self-start"}>everyone has gaps → yours just come with a to-do list</Annotation>
            <SkillGapChart
                gaps={analysis.market.skill_gaps}
                jobsAnalyzed={analysis.market.jobs_analyzed}
            />
        </div>
    )
}
