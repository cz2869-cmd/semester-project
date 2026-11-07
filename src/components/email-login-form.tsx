import Link from "next/link";

import { signInAction } from "@/app/actions/auth";
import { FormMessage, type Message } from "@/components/form-message";
import { SchoolEmailForm } from "@/components/school-email-form";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function EmailLoginForm({
  searchParams,
}: {
  searchParams: Message;
}) {
  return (
    <SchoolEmailForm className="flex flex-col gap-6" action={signInAction}>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          name="email"
          type="email"
          placeholder="you@barnard.edu"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput name="password" placeholder="Your password" required />
        <Link
          className="text-xs text-foreground underline underline-offset-4"
          href="/forgot-password"
        >
          Forgot Password?
        </Link>
      </div>
      <SubmitButton pendingText="Logging in...">Login</SubmitButton>
      <FormMessage message={searchParams} />
    </SchoolEmailForm>
  );
}
