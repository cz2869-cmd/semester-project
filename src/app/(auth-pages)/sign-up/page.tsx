import Link from "next/link";
import { FormMessage, type Message } from "@/components/form-message";
import { EmailSignUpForm } from "@/components/email-sign-up-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SCHOOL_EMAIL_APEX_DOMAINS } from "@/utils/domain";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  if ("success" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center justify-center min-h-[70vh] px-4">
        <div className="w-full max-w-md">
          <FormMessage message={searchParams} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm sm:max-w-md 
                    md:max-w-lg lg:max-w-xl mx-auto px-4 mt-20">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            Create an account with a Barnard or Columbia email. Google sign-in
            is not enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="w-full">
          <EmailSignUpForm searchParams={searchParams} />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="text-primary hover:underline" href="/login">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground w-full border-l-4
                      border-muted pl-4 py-2 bg-muted/5 rounded-r">
        <p className="font-medium mb-2">
          We&apos;re currently only accepting sign-ups from the following
          domains:
        </p>
        <ul className="list-disc list-inside space-y-1">
          {SCHOOL_EMAIL_APEX_DOMAINS.map((domain) => (
            <li key={domain}>{domain}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
