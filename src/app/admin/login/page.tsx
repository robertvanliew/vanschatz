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
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
      >
        <h1 className="font-display text-center text-3xl italic">Admin</h1>
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          className="mt-6 w-full rounded-xl border border-white/20 bg-transparent px-4 py-3 outline-none focus:border-white/50"
        />
        {error && <p className="mt-3 text-sm text-red-300">Wrong password — try again.</p>}
        <button className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#7c6cf0] to-[#47c3ff] px-4 py-3 font-medium text-white">
          Enter
        </button>
      </form>
    </main>
  );
}
