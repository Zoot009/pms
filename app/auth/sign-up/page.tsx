import { SignUpForm } from "@/components/auth/sign-up-form";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = await createClient()
  const user = await supabase.auth.getUser(); 
  const isAdmin = user.data.user?.id === "57ed09d9-5ab7-470e-bf8e-b7f94408b11a"

  if (!isAdmin) redirect("/")
    
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  )
}
