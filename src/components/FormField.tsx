'use client'
import React from 'react'
import {Controller} from "react-hook-form";
import {Field, FieldError, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {InputGroup, InputGroupTextarea} from "@/components/ui/input-group";
import {FormFieldParams} from "@/types/jobradar"

const FormField = (
    {name, title, control, placeholder, isDescription}: FormFieldParams
) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({field, fieldState}) => (
                <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{title}</FieldLabel>
                    {isDescription ?
                        (
                            <InputGroup>
                                <InputGroupTextarea
                                    {...field}
                                    placeholder={placeholder}
                                    aria-invalid={fieldState.invalid}
                                />

                            </InputGroup>
                        )
                            :
                        (
                                <Input
                                {...field}
                                aria-invalid={fieldState.invalid}
                                placeholder={placeholder}
                            />
                        )
                    }

                    {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                    )}
                </Field>
            )}
        />
    )
}
export default FormField
