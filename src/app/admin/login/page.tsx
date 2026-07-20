import { loginAction } from "@/app/admin/actions";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        action={loginAction}
        className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 shadow-[0_16px_40px_-24px_rgba(107,79,150,0.35)] backdrop-blur-sm"
      >
        <h1 className="font-display text-center text-3xl italic">Admin</h1>
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          className="mt-6 w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-[#8a6db1]"
        />
        {error && <p className="mt-3 text-sm text-red-700">Wrong password — try again.</p>}
        <button className="mt-6 w-full rounded-xl cursor-pointer bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] px-4 py-3 font-medium text-white">
          Enter
        </button>
      </form>
    </main>
  );
}
