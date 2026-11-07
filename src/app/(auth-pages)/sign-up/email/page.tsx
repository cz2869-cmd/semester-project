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

export default async function SignupEmail(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  if ("success" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center h-screen
                      lg:max-w-xl justify-center gap-4 p-20">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-2 w-full max-w-sm sm:max-w-md 
                    md:max-w-lg lg:max-w-xl mx-auto px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Sign up with Email</CardTitle>
          <CardDescription>
            Use a Barnard or Columbia email (@barnard.edu or @columbia.edu).
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
    </div>
  );
}
