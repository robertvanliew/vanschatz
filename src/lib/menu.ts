/**
 * The dinner menu, as printed on the 5x7 card in Menu/.
 *
 * Kept as text rather than the card's image so emails can show it large and
 * readable on a phone, to screen readers, and in mail apps that hide images.
 */
export const MENU = {
  intro: "A choice of five entrées, all served with scalloped potatoes and fresh vegetables",
  entrees: [
    { name: "NY Strip Steak", description: "With peppercorn sauce" },
    {
      name: "Tuscan Chicken",
      description:
        "Breaded chicken breast stuffed with eggplant, Parmesan cheese and herbs, with tomato basil coulis",
    },
    { name: "Salmon Chiang Mai", description: "Grilled, with a light teriyaki sauce and crispy noodles" },
    {
      name: "Shrimp Veracruz",
      description:
        "Baked jumbo shrimp with scallions and a cheddar cheese-cracker crust, with a light citrus butter sauce",
    },
    { name: "Lobster Ravioli", description: "With a smoked salmon vodka cream sauce" },
  ],
} as const;
