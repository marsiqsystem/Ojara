# GTM + GA4 setup checklist (owner)

Everything in this file is clicked in the Google Tag Manager / GA4 UI — none of it
lives in the repo. The code side is already deployed and pushing the events these
tags consume.

Containers and IDs:

| Thing | ID |
| --- | --- |
| GTM (live) | `GTM-PNFF2ML6` |
| GTM (orphan, delete) | `GTM-MW62RPRV` |
| GA4 | `G-57CEYFDY0D` |
| Meta Pixel | `2452187828628652` |

> **Note:** there is no Meta Pixel tag inside GTM, and there must not be one. The
> pixel is installed directly in the site code. Adding one in GTM would
> double-count every event.

---

## Phase 2 — GTM cleanup (~5 min)

1. **Delete the "Google Analytics GA4 Event" tag** in `GTM-PNFF2ML6`.
   It carries three triggers at once (All Pages + Initialization + Consent
   Initialization) and duplicates what the Google tag already does on its own —
   roughly 7 events per user, about 25K events against 3.5K users. Deleting it
   does not stop GA4 traffic reporting; the Google tag handles that.
2. **Delete the orphan container `GTM-MW62RPRV`** (it sits in a separate
   account). Nothing in the codebase references it, so nothing can break.
3. In GTM, open **Admin → "See untagged pages"** and confirm nothing important
   is listed.
4. **Submit + Publish** the container.

---

## Phase 3 (GTM half) — GA4 ecommerce

The site now pushes four GA4-shaped events onto `dataLayer`, each with a nested
`ecommerce` object (`currency`, `value`, `items[]`, plus `transaction_id` on
purchase). GA4 currently shows **0 key events** because nothing forwards them.

### 3a. Four triggers

For each row: **Triggers → New → Custom Event**, with *Event name* exactly as
written and "This trigger fires on: All Custom Events".

| Trigger name | Event name |
| --- | --- |
| CE - view_item | `view_item` |
| CE - add_to_cart | `add_to_cart` |
| CE - begin_checkout | `begin_checkout` |
| CE - purchase | `purchase` |

### 3b. One Data Layer variable

**Variables → New → Data Layer Variable**, name it `DLV - ecommerce`, with data
layer variable name `ecommerce`. Version 2.

### 3c. Four tags

For each row: **Tags → New → Google Analytics: GA4 Event**, Measurement ID
`G-57CEYFDY0D`.

| Tag name | Event Name | Trigger |
| --- | --- | --- |
| GA4 - view_item | `view_item` | CE - view_item |
| GA4 - add_to_cart | `add_to_cart` | CE - add_to_cart |
| GA4 - begin_checkout | `begin_checkout` | CE - begin_checkout |
| GA4 - purchase | `purchase` | CE - purchase |

In **each** tag, tick **"Send Ecommerce data"** and set the data source to
**Data Layer**. That is what maps `items[]`, `value` and `currency` across — a
GA4 event tag without it sends the event name and nothing else.

### 3d. Mark purchase as a Key event

In **GA4 → Admin → Events**, wait for `purchase` to appear (it only shows up
after the first one fires), then toggle **Mark as key event**.

### 3e. Verify

Use **GTM Preview** on https://www.ojara.co.in and walk a product page → add to
cart → checkout. Each step should show the custom event firing its tag, with the
`ecommerce` object populated. Then check **GA4 → Reports → Realtime**.

---

## After deploying the code changes — Meta checks

Two events could not be verified locally because they need a real order to be
placed. Confirm both in **Events Manager → Test Events** (or wait for the next
live order) after deploy:

- **Purchase** should arrive **twice with the same `event_id`**
  (`purchase-<orderId>`) — once from the browser, once server-side from
  `/api/checkout` — and Events Manager should show them **deduplicated into one
  conversion**. If it shows two separate purchases, the dedupe is broken.
- **AddPaymentInfo** should now fire on *Place Order*, not on reaching the
  delivery form.

Also worth checking:

- **PageView should now be higher than ViewContent**, reversing the old
  10.2K vs 6.8K anomaly.
- **AddToCart, InitiateCheckout and AddPaymentInfo should now differ from each
  other.** They previously all read exactly 6 because one Buy Now click fired
  four events.
- **Event Match Quality should climb** — events now carry `external_id`,
  `91`-prefixed phone numbers, an `fbclid`-derived `_fbc`, and full address
  fields on Purchase.
- In **Commerce Manager**, confirm the Wix product feed is keyed on the same
  Wix catalog item id the site now sends in `content_ids`. If the feed uses a
  different id, dynamic product ads still will not match.

---

## Known permanent zeros (do not chase)

Wix Analytics cannot be integrated with self-managed Wix Headless sites, so these
stay 0 on the Wix dashboard no matter what: **site sessions, unique visitors,
page views, post views, blog engagement, conversion rate**. GA4 is the traffic
source of truth.

Wix **revenue** also reads ₹0 by design: `orderTransactions.addPayments` only
runs for prepaid orders, and the store is COD-only while `PREPAID_ENABLED` is
`false`. Orders, sales, customers, items sold and AOV do flow correctly.
