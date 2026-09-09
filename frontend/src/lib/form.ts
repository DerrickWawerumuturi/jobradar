import * as z from "zod"

export const formSchema = z.object({
    name: z
        .string()
        .max(32, "Title is too long")
        .min(5, "Title is too short")
    ,
    title: z.string(),
    professional_summary: z.string(),
    location: z.string(),
    phone_number: z.string(),
    email: z.string(),
    portfolio: z.string(),
    linkedIn: z.string(),
    skills: z.array(z.string()),
    experience: z.array(z.object({
        company: z.string(),
        role: z.string(),
        start_date: z.string(),
        end_date: z.string(),
        description: z.string(),
    })),
    experience_level: z.string(),
    education: z.array(z.object({
        school_name: z.string(),
        course_title: z.string(),
    }))
})

export type FormValues = z.infer<typeof formSchema>

