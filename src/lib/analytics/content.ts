// Catalogue identifiers for Meta commerce events.
//
// `content_ids` used to carry our own product slug, which matches NOTHING in the
// Wix product feed Meta ingests — so dynamic product ads, catalogue attribution
// and "products viewed" reporting were all dead. The Wix catalog item id is the
// id that feed is keyed on, so prefer it and fall back to the slug only for the
// mock products that have no Wix counterpart.

type CatalogItem = {
  id: string;
  wixCatalogItemId?: string;
};

/** The id Meta's catalogue knows this product by. */
export const contentId = (item: CatalogItem): string =>
  item.wixCatalogItemId || item.id;

export const contentIds = (items: CatalogItem[]): string[] =>
  items.map(contentId);

type ContentLine = CatalogItem & {
  price: number;
  quantity?: number;
};

/**
 * Meta's `contents` array — the quantity/price-aware counterpart to
 * `content_ids`. Sending both is what lets Meta value a 3-unit order correctly
 * instead of assuming one of each.
 */
export const toContents = (lines: ContentLine[]) =>
  lines.map((l) => ({
    id: contentId(l),
    quantity: l.quantity ?? 1,
    item_price: l.price,
  }));

/** GA4's `ecommerce.items` entry — a different shape from Meta's `contents`. */
export type Ga4Item = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
};

/**
 * GA4 wants `items: [{ item_id, item_name, price, quantity }]` — same facts as
 * Meta's `contents`, different key names, plus the product name. Built from the
 * same call-site data so the two platforms can never disagree about an order.
 */
export const toGa4Items = (
  lines: (ContentLine & { name: string })[],
): Ga4Item[] =>
  lines.map((l) => ({
    item_id: contentId(l),
    item_name: l.name,
    price: l.price,
    quantity: l.quantity ?? 1,
  }));
