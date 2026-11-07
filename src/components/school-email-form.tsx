"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import {
  isAllowedSchoolEmail,
  SCHOOL_EMAIL_REQUIREMENT_MESSAGE,
} from "@/utils/domain";

type SchoolEmailFormProps = {
  children: ReactNode;
  className?: string;
  action?: (formData: FormData) => void | Promise<void>;
};

export function SchoolEmailForm({
  children,
  className,
  action,
}: SchoolEmailFormProps) {
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const email = new FormData(event.currentTarget).get("email");
    if (!isAllowedSchoolEmail(typeof email === "string" ? email : "")) {
      event.preventDefault();
      setError(SCHOOL_EMAIL_REQUIREMENT_MESSAGE);
      return;
    }
    setError(null);
  };

  return (
    <form className={className} action={action} onSubmit={onSubmit} noValidate>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
