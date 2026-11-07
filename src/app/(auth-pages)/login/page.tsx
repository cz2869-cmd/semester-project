import Link from "next/link";
import { EmailLoginForm } from "@/components/email-login-form";
import { FormMessage, type Message } from "@/components/form-message";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function Signin(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  const hasFeedback =
    "message" in searchParams ||
    "error" in searchParams ||
    "success" in searchParams;

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pt-16 px-4">
      <Card className="w-full">
        <CardHeader className="space-y-0">
          <CardTitle className="text-2xl text-center pb-2">
            Welcome Back!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasFeedback && (
            <div className="flex justify-center">
              <FormMessage message={searchParams} />
            </div>
          )}
          <EmailLoginForm searchParams={searchParams} />
          <div className="text-center text-sm text-muted-foreground pt-2">
            Don&#39;t have an account?{" "}
            <Link className="text-primary hover:underline" href="/sign-up">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
