import React from 'react'
import {SkillStat} from "@/types/jobradar";
import SkillBarChart from "@/components/Market/SkillBarChart";
import PanelHeader from "@/components/Market/PanelHeader";
import PanelNote from "@/components/Market/PanelNote";

interface SkillDemandChartProps {
    skills: SkillStat[];
}

/** Answers: "what skills are most commonly requested by the jobs analyzed?" */
const SkillDemandChart = ({skills}: SkillDemandChartProps) => {
    if (!skills?.length) return null;

    return (
        <section className={"chart-panel chart-panel-green flex flex-col gap-6 px-5 py-7 sm:px-8"}>
            <PanelHeader
                title={"Market skill demand"}
                qualifier={"most requested"}
                lead={"The skills that appear most often in the job postings we analyzed"}
            />
            <SkillBarChart skills={skills} />

            <PanelNote
                points={[
                    <>Each bar is one skill — the longer it is, the more jobs have it as a requirement.</>,
                    <>The number at the end is the exact share: 40% means 4 in 10 postings ask for that skill.</>,
                    <>Yellow bars are requested less often; the closer to red, the hotter the skill is in this market.</>,
                    <>Hover a bar to see the actual number of job postings behind it.</>
                ]}
            />
        </section>
    )
}
export default SkillDemandChart
