"use server";

import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { makeToken } from "@/lib/tokens";
import { validateRsvp } from "@/lib/rsvp";
import { runManualReminders, runScheduledReminders } from "@/lib/reminders";

function sessionValue(): string {
  return createHash("sha256").update(process.env.ADMIN_PASSWORD ?? "").digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  const jar = await cookies();
  return jar.get("admin_session")?.value === sessionValue();
}

async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function loginAction(formData: FormData): Promise<void> {
  if (!process.env.ADMIN_PASSWORD) redirect("/admin/login?error=1");
  const password = String(formData.get("password") ?? "");
  if (password !== process.env.ADMIN_PASSWORD) redirect("/admin/login?error=1");
  const jar = await cookies();
  jar.set("admin_session", sessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect("/admin");
}

export async function addGuestAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  await db.guest.create({ data: { name, email, phone, token: makeToken() } });
  revalidatePath("/admin");
}

export async function deleteGuestAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await db.guest.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin");
}

export async function setRsvpAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const attending = formData.get("attending") === "yes";
  const adults = Number(formData.get("adults") ?? 1);
  const children = Number(formData.get("children") ?? 0);
  const result = validateRsvp({ attending, adults, children });
  if (!result.ok) return;
  await db.guest.update({
    where: { id },
    data: {
      rsvpStatus: result.status,
      adults: result.adults,
      children: result.children,
      partySize: result.partySize,
      respondedAt: new Date(),
    },
  });
  revalidatePath("/admin");
}

export async function manualRemindersAction(): Promise<void> {
  await requireAdmin();
  await runManualReminders(new Date());
  revalidatePath("/admin");
}

export async function scheduledRemindersAction(): Promise<void> {
  await requireAdmin();
  await runScheduledReminders(new Date());
  revalidatePath("/admin");
}
