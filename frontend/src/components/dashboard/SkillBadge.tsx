'use client'

import React, {useState} from 'react'
import {cn} from "@/lib/utils";
import {skillGlyph} from "@/lib/skill-icons";

/**
 * Official multicolor logos, vendored into /public/skills so no adblocker or
 * CDN outage can strip them. Concept skills (SQL, Machine Learning, REST...)
 * have no brand mark and fall back to the icon circle.
 */
const FILES: [RegExp, string][] = [
    [/\bpython\b/i, "python"],
    [/\btypescript\b/i, "typescript"],
    [/\bjavascript\b/i, "javascript"],
    [/\bjava\b/i, "java"],
    [/c#|csharp/i, "csharp"],
    [/react/i, "react"],
    [/\bnext\.?js\b/i, "nextjs"],
    [/\bvue\b/i, "vuejs"],
    [/angular/i, "angular"],
    [/svelte/i, "svelte"],
    [/node/i, "nodejs"],
    [/jquery/i, "jquery"],
    [/\bdocker\b/i, "docker"],
    [/kubernetes|k8s/i, "kubernetes"],
    [/postgres/i, "postgresql"],
    [/\bmysql\b/i, "mysql"],
    [/mongo/i, "mongodb"],
    [/redis/i, "redis"],
    [/\bgit\b(?!hub|lab)/i, "git"],
    [/github/i, "github"],
    [/gitlab/i, "gitlab"],
    [/graphql/i, "graphql"],
    [/fastapi/i, "fastapi"],
    [/django/i, "django"],
    [/flask/i, "flask"],
    [/spring/i, "spring"],
    [/laravel/i, "laravel"],
    [/\bphp\b/i, "php"],
    [/\bruby\b/i, "ruby"],
    [/^go(lang)?$|\bgolang\b/i, "go"],
    [/\brust\b/i, "rust"],
    [/kotlin/i, "kotlin"],
    [/swift/i, "swift"],
    [/pandas/i, "pandas"],
    [/numpy/i, "numpy"],
    [/pytorch/i, "pytorch"],
    [/tensorflow/i, "tensorflow"],
    [/tailwind/i, "tailwindcss"],
    [/\bhtml5?\b/i, "html5"],
    [/\bcss3?\b/i, "css3"],
    [/linux/i, "linux"],
    [/terraform/i, "terraform"],
    [/jenkins/i, "jenkins"],
    [/firebase/i, "firebase"],
    [/supabase/i, "supabase"],
    [/aws|amazon web/i, "amazonwebservices"],
    [/azure/i, "azure"],
    [/gcp|google cloud/i, "googlecloud"],
];

function fileFor(skill: string): string | null {
    // SkillNer canonical names carry suffixes: "Python (Programming Language)".
    const clean = skill.replace(/\(.*?\)/g, "").trim();
    for (const [pattern, file] of FILES) {
        if (pattern.test(clean)) return file;
    }
    return null;
}

interface SkillBadgeProps {
    skill: string;
    tone: "have" | "gap";
    className?: string;
}

/** Real brand logo where one exists, the mapped icon circle everywhere else. */
export default function SkillBadge({skill, tone, className}: SkillBadgeProps) {
    const [failed, setFailed] = useState(false);
    const file = fileFor(skill);
    const {Icon, color} = skillGlyph(skill);
    const useImage = file !== null && !failed;

    return (
        <span
            style={useImage ? undefined : {backgroundColor: color}}
            className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full",
                useImage
                    ? "bg-white shadow-[0_0_0_1px_oklch(1_0_0/12%)]"
                    : "text-white shadow-[0_0_0_1px_oklch(1_0_0/10%)]",
                className
            )}
        >
            {useImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={`/skills/${file}.svg`}
                    alt=""
                    width={17}
                    height={17}
                    loading={"lazy"}
                    onError={() => setFailed(true)}
                    className={"size-[17px]"}
                />
            ) : (
                <Icon className={"size-3.5"} />
            )}
        </span>
    )
}
