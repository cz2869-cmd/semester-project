import Link from "next/link";

import { signUpAction } from "@/app/actions/auth";
import { FormMessage, type Message } from "@/components/form-message";
import { SchoolEmailForm } from "@/components/school-email-form";
import { SubmitButton } from "@/components/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function EmailSignUpForm({
  searchParams,
}: {
  searchParams: Message;
}) {
  return (
    <SchoolEmailForm className="flex flex-col gap-6 w-full" action={signUpAction}>
      <div className="grid gap-2 w-full">
        <Label htmlFor="email">Email</Label>
        <Input
          name="email"
          type="email"
          placeholder="you@barnard.edu"
          required
          className="w-full"
        />
      </div>
      <div className="grid gap-2 w-full">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          name="password"
          placeholder="Your password"
          minLength={6}
          required
          className="w-full"
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="terms" name="terms" required />
          <Label htmlFor="terms" className="text-sm">
            I agree to the{" "}
            <Link
              href="/terms-of-service"
              className="text-primary hover:underline"
            >
              Terms and Conditions
            </Link>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="privacy" name="privacy" required />
          <Label htmlFor="privacy" className="text-sm">
            I agree to the{" "}
            <Link
              href="/privacy-policy"
              className="text-primary hover:underline"
            >
              Privacy Policy
            </Link>
          </Label>
        </div>
      </div>
      <SubmitButton pendingText="Signing up...">Sign up</SubmitButton>
      <FormMessage message={searchParams} />
    </SchoolEmailForm>
  );
}
