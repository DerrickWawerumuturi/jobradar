import {
    ActivityIcon,
    BoxesIcon,
    BrainIcon,
    BugIcon,
    CloudIcon,
    CodeIcon,
    ContainerIcon,
    DatabaseIcon,
    GitBranchIcon,
    HeartHandshakeIcon,
    LightbulbIcon,
    MessagesSquareIcon,
    MonitorIcon,
    PuzzleIcon,
    SearchCodeIcon,
    ServerIcon,
    ShieldIcon,
    TerminalIcon,
    TrendingUpIcon,
    UsersIcon,
    WorkflowIcon,
    WrenchIcon,
    ZapIcon,
    type LucideIcon
} from "lucide-react";

export interface SkillGlyph {
    Icon: LucideIcon;
    /** Solid badge color, app-icon style; white glyph sits on it. */
    color: string;
}

/** Concept skills have no official logo anywhere, so each family gets its own
 * colored badge instead — reads like an app icon, never like a fallback. */
const RULES: [RegExp, LucideIcon, string][] = [
    [/sql|postgres|mysql|mongo|database|redis|sqlite/i, DatabaseIcon, "#0ca678"],
    [/aws|amazon web|azure|gcp|google cloud|cloud/i, CloudIcon, "#0091ff"],
    [/docker|kubernetes|k8s|container/i, ContainerIcon, "#0db7ed"],
    [/git\b|github|gitlab/i, GitBranchIcon, "#f05033"],
    [/machine learning|deep learning|pytorch|tensorflow|llm|nlp|\bai\b|data science/i, BrainIcon, "#d6409f"],
    [/react|vue|angular|svelte|next|frontend|css|html|tailwind|ui\b/i, MonitorIcon, "#00a2c7"],
    [/security|auth|oauth|encryption/i, ShieldIcon, "#6e56cf"],
    [/linux|bash|shell|terminal|unix/i, TerminalIcon, "#687076"],
    [/debug/i, BugIcon, "#e5484d"],
    [/problem solving|troubleshoot/i, PuzzleIcon, "#8e4ec6"],
    [/code review/i, SearchCodeIcon, "#f76b15"],
    [/collaborat|teamwork|communicat/i, UsersIcon, "#3e63dd"],
    [/customer|client|stakeholder/i, HeartHandshakeIcon, "#e54666"],
    [/workflow|automation|pipeline/i, WorkflowIcon, "#f5a524"],
    [/scalab|performance|optimi/i, TrendingUpIcon, "#30a46c"],
    [/reliab|monitor|observab/i, ActivityIcon, "#ffb224"],
    [/agile|scrum|kanban|planning/i, MessagesSquareIcon, "#12a594"],
    [/leadership|mentor|innovat|design thinking/i, LightbulbIcon, "#f76808"],
    [/terraform|ansible|devops|ci\/cd|jenkins|infrastructure|deploy/i, BoxesIcon, "#5746af"],
    [/node|fastapi|django|flask|spring|backend|rest|graphql|api/i, ServerIcon, "#3a5bc7"],
    [/python|typescript|javascript|java|golang|\bgo\b|rust|c\+\+|c#|php|ruby|kotlin|swift/i, CodeIcon, "#5b6ee1"],
    [/fast|real.?time|streaming/i, ZapIcon, "#ad5700"],
];

export function skillGlyph(skill: string): SkillGlyph {
    for (const [pattern, Icon, color] of RULES) {
        if (pattern.test(skill)) return {Icon, color};
    }
    return {Icon: WrenchIcon, color: "#697177"};
}

export function skillIcon(skill: string): LucideIcon {
    return skillGlyph(skill).Icon;
}
