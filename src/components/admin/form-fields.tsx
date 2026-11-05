"use client";

import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import { FormField, formFieldErrorId } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type FieldsContextValue = {
  /** Valor inicial de cada campo, como texto. */
  defaults: Record<string, string>;
  /** Error del servidor por campo. */
  errors: Record<string, string>;
  /** Prefijo de los `id` (`fighter-firstName`): estable entre renders, único por formulario. */
  idPrefix: string;
};

const FieldsContext = createContext<FieldsContextValue>({ defaults: {}, errors: {}, idPrefix: "field" });

/** Campos de un formulario del panel (`TextField`, `TextAreaField`, `SelectField`) con valor inicial y error del servidor. */
export const FormFieldsProvider = FieldsContext.Provider;

type BaseProps = { name: string; label: string; hint?: string; help?: ReactNode };

/** Datos comunes de un campo: id estable, valor inicial y error del servidor junto al input. */
function useField(name: string) {
  const { defaults, errors, idPrefix } = useContext(FieldsContext);
  const id = `${idPrefix}-${name}`;
  const error = errors[name];
  return {
    id,
    error,
    defaultValue: defaults[name] ?? "",
    aria: { "aria-invalid": error ? true : undefined, "aria-describedby": error ? formFieldErrorId(id) : undefined },
  };
}

export function TextField({ name, label, hint, help, ...inputProps }: BaseProps & Omit<ComponentProps<typeof Input>, "name" | "id" | "defaultValue">) {
  const { id, error, defaultValue, aria } = useField(name);
  return (
    <FormField id={id} label={label} error={error} hint={hint} help={help}>
      <Input id={id} name={name} defaultValue={defaultValue} {...aria} {...inputProps} />
    </FormField>
  );
}

export function TextAreaField({ name, label, hint, help, maxLength, onChange, ...props }: BaseProps & Omit<ComponentProps<typeof Textarea>, "name" | "id" | "defaultValue">) {
  const { id, error, defaultValue, aria } = useField(name);
  const [length, setLength] = useState(defaultValue.length);
  return (
    <FormField id={id} label={label} error={error} hint={hint} help={help}>
      <Textarea
        id={id}
        name={name}
        defaultValue={defaultValue}
        maxLength={maxLength}
        onChange={(event) => {
          setLength(event.target.value.length);
          onChange?.(event);
        }}
        {...aria}
        {...props}
      />
      {maxLength ? (
        // Sin aria-live: se anunciaría en cada tecla. El límite ya lo impone `maxLength`.
        <p className={`text-right text-xs ${length >= maxLength ? "text-destructive" : "text-muted-foreground"}`}>
          {length}/{maxLength} caracteres
        </p>
      ) : null}
    </FormField>
  );
}

export function SelectField({
  name,
  label,
  hint,
  children,
  ...props
}: BaseProps & Omit<ComponentProps<typeof NativeSelect>, "name" | "id" | "defaultValue">) {
  const { id, error, defaultValue, aria } = useField(name);
  return (
    <FormField id={id} label={label} error={error} hint={hint}>
      <NativeSelect id={id} name={name} defaultValue={defaultValue} {...aria} {...props}>
        {children}
      </NativeSelect>
    </FormField>
  );
}
