'use client'
import React, {useState} from 'react'
import {Controller, FieldErrors, useFieldArray, useForm} from "react-hook-form";
import {XIcon} from "lucide-react";
import {formSchema, FormValues} from "@/lib/form";
import {zodResolver} from "@hookform/resolvers/zod";
import {useCv} from "@/lib/cv-store";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Field, FieldError, FieldLabel} from "@/components/ui/field";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {Button} from "@/components/ui/button";
import FormField from "@/components/FormField";
import SkillsInput from "@/components/SkillsInput";
import {toast} from "sonner";

const SECTION_FIELDS: Record<string, (keyof FormValues)[]> = {
    basics: ["name", "title", "location", "experience_level"],
    contact: ["email", "phone_number", "portfolio", "linkedIn"],
    skills: ["skills"],
    summary: ["professional_summary"],
    experience: ["experience"],
    education: ["education"],
};

const CVReviewForm = () => {
    const {cv, saveCv} = useCv()
    const [open, setOpen] = useState<string[]>(["basics"]);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: cv?.name || "",
            title: cv?.title || "",
            professional_summary: cv?.professional_summary || "",
            location: cv?.location || "",
            phone_number: cv?.phone_number || "",
            email: cv?.email || "",
            portfolio: cv?.portfolio || "",
            linkedIn: cv?.linkedIn || "",
            skills: (cv?.skills ?? []).flatMap((s) => (s ? [s] : [])),
            experience: (Array.isArray(cv?.experience) ? cv.experience : []).map((e) => ({
                company: e.company || "",
                role: e.role || "",
                start_date: e.start_date || "",
                end_date: e.end_date || "",
                description: e.description || "",
            })),
            experience_level: cv?.experience_level || "",
            education: (Array.isArray(cv?.education) ? cv.education : []).map((e) => ({
                school_name: e.school_name || "",
                course_title: e.course_title || "",
            }))
        }
    })

    const expArray = useFieldArray({control: form.control, name: "experience"})
    const eduArray = useFieldArray({control: form.control, name: "education"})

    const name = form.watch("name")
    const email = form.watch("email")
    const skills = form.watch("skills")
    const summary = form.watch("professional_summary")

    const hints: Record<string, string> = {
        basics: name || "Add your name",
        contact: email || "No contact info yet",
        skills: skills.length === 1 ? "1 skill" : `${skills.length} skills`,
        summary: summary ? "Written" : "Empty",
        experience: expArray.fields.length === 1 ? "1 position" : `${expArray.fields.length} positions`,
        education: eduArray.fields.length === 1 ? "1 entry" : `${eduArray.fields.length} entries`,
    };

    const onSubmit = ({...values}: FormValues) => {
        saveCv({...values})
        toast.success("CV updated")
    }

    // Errors inside a collapsed section would be invisible — open those sections.
    const onInvalid = (errors: FieldErrors<FormValues>) => {
        const withErrors = Object.keys(SECTION_FIELDS).filter((section) =>
            SECTION_FIELDS[section].some((field) => field in errors)
        );
        setOpen((prev) => [...new Set([...prev, ...withErrors])]);
    }

    const sectionTrigger = (title: string, hint: string) => (
        <AccordionTrigger className={"py-4"}>
            <span className={"flex w-full items-baseline justify-between gap-4 pr-2"}>
                <span className={"text-sm font-medium"}>{title}</span>
                <span className={"font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"}>
                    {hint}
                </span>
            </span>
        </AccordionTrigger>
    );

    return (
        <Card className={"w-full max-w-2xl"}>
            <CardHeader className={"gap-2"}>
                <CardTitle>Your CV :</CardTitle>
                <CardDescription className={"text-xs"}>
                    (Open any section to fix what we got wrong)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    id={"cv-review-form"}
                    onSubmit={form.handleSubmit(onSubmit, onInvalid)}
                >
                    <Accordion value={open} onValueChange={setOpen}>
                        <AccordionItem value={"basics"}>
                            {sectionTrigger("Basics", hints.basics)}
                            <AccordionContent>
                                <div className={"grid gap-5 pb-4 sm:grid-cols-2"}>
                                    <FormField
                                        name={"name"}
                                        title={"Name"}
                                        placeholder={"John Doe..."}
                                        isDescription={false}
                                        control={form.control}
                                    />
                                    <FormField
                                        name={"title"}
                                        title={"Primary Role"}
                                        placeholder={"Software Developer..."}
                                        isDescription={false}
                                        control={form.control}
                                    />
                                    <FormField
                                        name={"location"}
                                        title={"Location"}
                                        placeholder={"Nairobi, Kenya..."}
                                        isDescription={false}
                                        control={form.control}
                                    />
                                    <FormField
                                        name={"experience_level"}
                                        title={"Experience level"}
                                        placeholder={"Entry Level, Mid Level..."}
                                        isDescription={false}
                                        control={form.control}
                                    />
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value={"contact"}>
                            {sectionTrigger("Contact", hints.contact)}
                            <AccordionContent>
                                <div className={"grid gap-5 pb-4 sm:grid-cols-2"}>
                                    <FormField
                                        name={"email"}
                                        title={"Email"}
                                        placeholder={"example@gmail.com..."}
                                        isDescription={false}
                                        control={form.control}
                                    />
                                    <FormField
                                        name={"phone_number"}
                                        title={"Phone number"}
                                        placeholder={"+254..."}
                                        isDescription={false}
                                        control={form.control}
                                    />
                                    <FormField
                                        name={"portfolio"}
                                        title={"Portfolio"}
                                        placeholder={"https://..."}
                                        isDescription={false}
                                        control={form.control}
                                    />
                                    <FormField
                                        name={"linkedIn"}
                                        title={"LinkedIn"}
                                        placeholder={"https://linkedin.com/in/..."}
                                        isDescription={false}
                                        control={form.control}
                                    />
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value={"skills"}>
                            {sectionTrigger("Skills", hints.skills)}
                            <AccordionContent>
                                <div className={"pb-4"}>
                                    <Controller
                                        name={"skills"}
                                        control={form.control}
                                        render={({field, fieldState}) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <SkillsInput
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    invalid={fieldState.invalid}
                                                />
                                                {fieldState.invalid && (
                                                    <FieldError errors={[fieldState.error]} />
                                                )}
                                            </Field>
                                        )}
                                    />
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value={"summary"}>
                            {sectionTrigger("Summary", hints.summary)}
                            <AccordionContent>
                                <div className={"pb-4"}>
                                    <FormField
                                        name={"professional_summary"}
                                        title={"Summary"}
                                        placeholder={"A short professional summary..."}
                                        isDescription={true}
                                        control={form.control}
                                    />
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value={"experience"}>
                            {sectionTrigger("Experience", hints.experience)}
                            <AccordionContent>
                                <div className={"flex flex-col gap-3 pb-4"}>
                                    {expArray.fields.map((entry, i) => (
                                        <div key={entry.id} className={"relative flex flex-col gap-4 rounded-md border border-border p-4"}>
                                            <button
                                                type={"button"}
                                                aria-label={"Remove position"}
                                                onClick={() => expArray.remove(i)}
                                                className={"absolute right-3 top-3 text-muted-foreground hover:text-foreground"}
                                            >
                                                <XIcon className={"size-4"} />
                                            </button>
                                            <div className={"grid gap-4 sm:grid-cols-2"}>
                                                <FormField
                                                    name={`experience.${i}.company`}
                                                    title={"Company"}
                                                    placeholder={"Acme Inc..."}
                                                    isDescription={false}
                                                    control={form.control}
                                                />
                                                <FormField
                                                    name={`experience.${i}.role`}
                                                    title={"Role"}
                                                    placeholder={"Frontend Developer..."}
                                                    isDescription={false}
                                                    control={form.control}
                                                />
                                                <FormField
                                                    name={`experience.${i}.start_date`}
                                                    title={"Start"}
                                                    placeholder={"Jan 2022..."}
                                                    isDescription={false}
                                                    control={form.control}
                                                />
                                                <FormField
                                                    name={`experience.${i}.end_date`}
                                                    title={"End"}
                                                    placeholder={"Present..."}
                                                    isDescription={false}
                                                    control={form.control}
                                                />
                                            </div>
                                            <FormField
                                                name={`experience.${i}.description`}
                                                title={"Description"}
                                                placeholder={"What you did there..."}
                                                isDescription={true}
                                                control={form.control}
                                            />
                                        </div>
                                    ))}
                                    <Button
                                        type={"button"}
                                        variant={"outline"}
                                        onClick={() => expArray.append({company: "", role: "", start_date: "", end_date: "", description: ""})}
                                    >
                                        Add position
                                    </Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value={"education"}>
                            {sectionTrigger("Education", hints.education)}
                            <AccordionContent>
                                <div className={"flex flex-col gap-3 pb-4"}>
                                    {eduArray.fields.map((entry, i) => (
                                        <div key={entry.id} className={"relative rounded-md border border-border p-4"}>
                                            <button
                                                type={"button"}
                                                aria-label={"Remove education"}
                                                onClick={() => eduArray.remove(i)}
                                                className={"absolute right-3 top-3 text-muted-foreground hover:text-foreground"}
                                            >
                                                <XIcon className={"size-4"} />
                                            </button>
                                            <div className={"grid gap-4 sm:grid-cols-2"}>
                                                <FormField
                                                    name={`education.${i}.school_name`}
                                                    title={"School"}
                                                    placeholder={"University of..."}
                                                    isDescription={false}
                                                    control={form.control}
                                                />
                                                <FormField
                                                    name={`education.${i}.course_title`}
                                                    title={"Course"}
                                                    placeholder={"BSc Computer Science..."}
                                                    isDescription={false}
                                                    control={form.control}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <Button
                                        type={"button"}
                                        variant={"outline"}
                                        onClick={() => eduArray.append({school_name: "", course_title: ""})}
                                    >
                                        Add education
                                    </Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <Button type={"submit"} className={"mt-8 w-full sm:w-auto"}>
                        Looks good
                    </Button>
                </form>
            </CardContent>

        </Card>
    )
}
export default CVReviewForm
