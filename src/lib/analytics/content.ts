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
