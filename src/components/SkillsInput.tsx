'use client'
import React, {useMemo, useState} from 'react'
import {XIcon} from "lucide-react";
import {Input} from "@/components/ui/input";
import {SKILL_SUGGESTIONS} from "@/lib/skills";

interface SkillsInputProps {
    value: string[]
    onChange: (skills: string[]) => void
    onBlur?: () => void
    invalid?: boolean
}

const SkillsInput = ({value, onChange, onBlur, invalid}: SkillsInputProps) => {
    const [query, setQuery] = useState("")

    const suggestions = useMemo(() => {
        if (!query.trim()) return []
        const q = query.trim().toLowerCase()
        return SKILL_SUGGESTIONS
            .filter((s) => s.toLowerCase().includes(q))
            .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
            .slice(0, 6)
    }, [query, value])

    const add = (skill: string) => {
        const trimmed = skill.trim()
        if (!trimmed) return
        if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return
        onChange([...value, trimmed])
        setQuery("")
    }

    const remove = (skill: string) => onChange(value.filter((v) => v !== skill))

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault()
            add(query)
        } else if (e.key === "Backspace" && !query && value.length) {
            remove(value[value.length - 1])
        }
    }

    return (
        <div className={"flex flex-col gap-2"}>
            {value.length > 0 && (
                <div className={"flex flex-wrap gap-2"}>
                    {value.map((skill) => (
                        <span
                            key={skill}
                            className={"inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-primary-foreground"}
                        >
                            {skill}
                            <button
                                type={"button"}
                                aria-label={`Remove ${skill}`}
                                onClick={() => remove(skill)}
                                className={"text-muted-foreground hover:text-foreground"}
                            >
                                <XIcon className={"size-3"} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className={"relative"}>
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={onBlur}
                    aria-invalid={invalid}
                    placeholder={"React, Javascript, Python..."}
                />
                {suggestions.length > 0 && (
                    <ul className={"absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md"}>
                        {suggestions.map((s) => (
                            <li key={s}>
                                <button
                                    type={"button"}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => add(s)}
                                    className={"w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"}
                                >
                                    {s}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
export default SkillsInput
