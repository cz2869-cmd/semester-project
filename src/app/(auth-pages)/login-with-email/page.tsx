import Link from "next/link";
import { EmailLoginForm } from "@/components/email-login-form";
import { FormMessage, type Message } from "@/components/form-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginWithEmail(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center h-screen
                      sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] 
         w-full px-4 py-4 -mt-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Login with Email</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailLoginForm searchParams={searchParams} />
          <div className="mt-4 text-center text-sm">
            Don&#39;t have an account?{" "}
            <Link className="underline underline-offset-4" href="/sign-up">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
