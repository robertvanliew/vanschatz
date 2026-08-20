"use server";

import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { makeToken } from "@/lib/tokens";
import { validateRsvp } from "@/lib/rsvp";
import { runManualReminders, runScheduledReminders } from "@/lib/reminders";
import { sendInviteToGuest, sendAllInvites } from "@/lib/invites";
import { writeSettings } from "@/lib/settings";
import { SHIPPING_KEYS } from "@/lib/shipping";

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

export async function sendInviteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await sendInviteToGuest(String(formData.get("id")));
  revalidatePath("/admin");
}

export async function sendAllInvitesAction(): Promise<void> {
  await requireAdmin();
  await sendAllInvites();
  revalidatePath("/admin");
}

/* ---------------------------------------------------------------- shipping */

/**
 * Save where gifts should be sent. Stored in the database rather than the
 * repository — it is a home address, and it is only ever served to pages
 * reached with a valid invite token.
 *
 * Clearing both fields removes the address from the site entirely.
 */
export async function saveShippingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await writeSettings({
    [SHIPPING_KEYS.recipient]: String(formData.get("recipient") ?? "").trim(),
    [SHIPPING_KEYS.address]: String(formData.get("address") ?? "").trim(),
    [SHIPPING_KEYS.arriveBy]: String(formData.get("arriveBy") ?? "").trim(),
  });
  revalidatePath("/admin");
  // Every guest's registry shows the address, so they all need rebuilding.
  revalidatePath("/invite/[token]/registry", "page");
  // Come back with a flag so the page can confirm it saved. Without this the
  // form re-renders looking identical and there is no way to tell it worked.
  redirect("/admin?saved=shipping");
}

/* ---------------------------------------------------------------- registry */

/** Dollars as typed ("129.99", "$130", "") into integer cents, or null. */
function parsePriceCents(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

/** A slug that stays readable and stable, from the gift's title. */
function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `gift-${Date.now()}`
  );
}

export async function addGiftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!title || !url) return;

  // A double-submitted form once added the same steamer three times, 0.2s
  // apart. The same product link twice is never intended on a registry, so the
  // link is the guard — this also covers adding a duplicate weeks later by
  // accident, not just a stuttering button.
  if (await db.gift.findFirst({ where: { url } })) {
    revalidatePath("/admin");
    return;
  }

  // Keep slugs unique without surprising the couple with an error page.
  const base = slugify(title);
  let slug = base;
  for (let n = 2; await db.gift.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;

  const last = await db.gift.findFirst({ orderBy: { sortOrder: "desc" } });

  await db.gift.create({
    data: {
      slug,
      title,
      url,
      retailer: String(formData.get("retailer") ?? "").trim() || "Shop",
      note: String(formData.get("note") ?? "").trim() || null,
      image: String(formData.get("image") ?? "").trim() || null,
      priceCents: parsePriceCents(String(formData.get("price") ?? "")),
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/registry");
}

export async function updateGiftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!id || !title || !url) return;

  await db.gift.update({
    where: { id },
    data: {
      title,
      url,
      retailer: String(formData.get("retailer") ?? "").trim() || "Shop",
      note: String(formData.get("note") ?? "").trim() || null,
      image: String(formData.get("image") ?? "").trim() || null,
      priceCents: parsePriceCents(String(formData.get("price") ?? "")),
    },
  });
  revalidatePath("/admin");
  revalidatePath("/registry");
}

/** Hide or show a gift without deleting it — and without losing its claim. */
export async function toggleGiftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const gift = await db.gift.findUnique({ where: { id } });
  if (!gift) return;
  await db.gift.update({ where: { id }, data: { active: !gift.active } });
  revalidatePath("/admin");
  revalidatePath("/registry");
}

export async function deleteGiftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await db.gift.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin");
  revalidatePath("/registry");
}

/** Release a claim on a guest's behalf — for "I actually bought that instead". */
export async function releaseClaimAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await db.giftClaim.deleteMany({ where: { giftId: String(formData.get("id")) } });
  revalidatePath("/admin");
  revalidatePath("/registry");
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
