import { AuthForm } from "@/components/auth/auth-form";

export default function BusinessLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-4xl">
        <p className="mb-4 text-center font-label-md text-label-md uppercase tracking-wider text-secondary">
          Business manager sign in
        </p>
        <AuthForm mode="login" redirect="/business" />
      </div>
    </div>
  );
}
