import { describe, expect, test } from "vitest";
import {
  cleanGiftTitle,
  giftList,
  planThankYou,
  THANKS_KEY,
  thankYouEmail,
  type ThanksGuest,
} from "@/lib/thank-you";

const guest = (id: string, extra: Partial<ThanksGuest> = {}): ThanksGuest => ({
  id,
  name: `Guest ${id}`,
  email: `${id}@example.com`,
  rsvpStatus: "YES",
  reminders: [],
  giftClaims: [],
  ...extra,
});

describe("planThankYou", () => {
  test("only guests who said yes, with an email", () => {
    const { sends, skipped } = planThankYou([
      guest("yes"),
      guest("pending", { rsvpStatus: "PENDING" }),
      guest("no", { rsvpStatus: "NO" }),
      guest("noemail", { email: null }),
    ]);
    expect(sends.map((s) => s.guestId)).toEqual(["yes"]);
    expect(skipped.map((s) => s.reason)).toEqual(["not attending", "not attending", "no-email"]);
  });

  test("anyone the couple leaves out is skipped", () => {
    const { sends } = planThankYou([guest("a"), guest("b")], ["b"]);
    expect(sends.map((s) => s.guestId)).toEqual(["a"]);
  });

  test("nobody is thanked twice", () => {
    const g = guest("a", { reminders: [{ scheduleKey: THANKS_KEY, channel: "email", simulated: false }] });
    expect(planThankYou([g]).sends).toHaveLength(0);
  });

  test("carries the gifts each guest claimed", () => {
    const g = guest("a", {
      giftClaims: [{ gift: { title: "Bamboo sheets" } }, { gift: { title: "Waterless Aroma Diffuser," } }],
    });
    expect(planThankYou([g]).sends[0].gifts).toEqual(["Bamboo sheets", "Waterless Aroma Diffuser"]);
  });
});

describe("gift wording", () => {
  test("cleans stray punctuation from retailer titles", () => {
    expect(cleanGiftTitle("Waterless Aroma Diffuser, ")).toBe("Waterless Aroma Diffuser");
  });
  test("reads naturally for one, two or three gifts", () => {
    expect(giftList(["A"])).toBe("the A");
    expect(giftList(["A", "B"])).toBe("the A and the B");
    expect(giftList(["A", "B", "C"])).toBe("the A, the B and the C");
  });
});

describe("thankYouEmail", () => {
  const base = { name: "May", gifts: [] as string[], photoUrl: null, songRequests: 38, siteUrl: "https://thevanschatz.com" };
  test("names their gifts only when they gave some", () => {
    const withGift = thankYouEmail({ ...base, gifts: ["Bamboo sheets"] });
    expect(withGift.html).toContain(">Bamboo sheets</div>");
    expect(withGift.html).toContain("Your gift");
    expect(withGift.text).toContain("Thank you so much for the Bamboo sheets");
    const without = thankYouEmail({ ...base });
    expect(without.html).not.toContain("Your gift");
  });

  test("shows the photo when there is one", () => {
    expect(thankYouEmail({ ...base, photoUrl: "https://x/p.jpg" }).html).toContain(
      'src="https://x/p.jpg"'
    );
    expect(thankYouEmail({ ...base }).html).not.toContain("<img");
  });

  test("a name or gift title can't inject markup", () => {
    const { html } = thankYouEmail({ ...base, name: "<b>x</b>", gifts: ["<script>"] });
    expect(html).not.toContain("<b>x");
    expect(html).not.toContain("<script>");
  });
});

describe("the day in numbers", () => {
  const base = { name: "May", gifts: [] as string[], photoUrl: null, siteUrl: "https://thevanschatz.com" };
  test("shows the real song-request count", () => {
    expect(thankYouEmail({ ...base, songRequests: 38 }).html).toContain(">38</div>");
  });
  test("leaves songs out when nobody requested any", () => {
    expect(thankYouEmail({ ...base, songRequests: 0 }).html).not.toContain("Song requests");
  });
});
