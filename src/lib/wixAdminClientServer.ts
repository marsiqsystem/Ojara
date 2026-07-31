import "server-only";

import { ApiKeyStrategy, createClient } from "@wix/sdk";
import {
  checkout,
  orders,
  orderTransactions,
  draftOrders,
  totalsCalculator,
} from "@wix/ecom";
import { contacts, labels } from "@wix/crm";

// Privileged client: can read and write ANYONE's data. The "server-only" import
// above turns an accidental import from a "use client" file into a build error
// rather than a leaked API key. Always filter its queries by a member id you
// resolved from wixClientServer().
export const wixAdminClientServer = () => {
  const apiKey = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_SITE_ID;
  const accountId = process.env.WIX_ACCOUNT_ID;

  if (!apiKey || (!siteId && !accountId)) {
    throw new Error(
      "Wix API key auth not configured. Set WIX_API_KEY and WIX_SITE_ID or WIX_ACCOUNT_ID.",
    );
  }

  return createClient({
    modules: {
      checkout,
      orders,
      orderTransactions,
      draftOrders,
      totalsCalculator,
      contacts,
      labels,
    },
    auth: ApiKeyStrategy({
      apiKey,
      ...(siteId ? { siteId } : { accountId: accountId! }),
    }),
  });
};
