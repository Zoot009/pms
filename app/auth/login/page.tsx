import { LoginForm } from "@/components/auth/login-form";
import { featureFlags } from "@/lib/feature-flags";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm showSignupLink={featureFlags.enablePublicSignup} />
      </div>
    </div>
  );
}
