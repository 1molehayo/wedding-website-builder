# Gift registry

Open **Registry** to manage gifts, bank details, and guest transfers.

The app does not take card payments. Guests send money by bank transfer, and admins check whether the transfer arrived.

## Understand the three tabs

- **Gift items** — the gifts guests can choose.
- **Cash accounts** — the bank accounts guests can pay into.
- **Transfers** — guest contributions that need to be checked.

## Add a gift

1. Open **Gift items**.
2. Select **Add gift**.
3. Enter a clear **Title** (required).
4. Description, product link, Amazon link, and photo are all optional.
5. If guests should buy on Amazon, add the **Amazon link** using the steps below.
6. Enter a **Price** (required): one amount in a currency that matches an
   **enabled** bank account. Guests can still pay in another account currency;
   the app converts with a live rate.
7. Enter the **Desired qty**. This is how many you want.
8. Keep **Claimed qty** at zero for a new gift.
9. Choose a status:
    - **Available**
    - **Reserved**
    - **Purchased**
10. Keep **Visible on public registry** ticked if guests should see it.
11. Select **Add gift**.

On the public gift card:

- **Buy on Amazon** appears when an Amazon link is saved.
- **Send money** appears when the gift has a price and is still open.
- Both can appear together. Amazon opens the wedding list; the card reminds
  guests to find the gift by title.

You can list multiple bank accounts, including more than one in the same
currency. When a guest chooses that currency, they pick which account to use.

## Add an Amazon link to a gift

The Amazon field is **not** a normal product page. It must be an **amazon.com wedding registry** link so shipping uses the couple’s registry address. The app opens the **whole wedding list** (Amazon does not expose a reliable per-item deep link we can use).

### What to paste

Accepted examples:

- `https://www.amazon.com/wedding/share/...`
- `https://www.amazon.com/wedding/registry/...`
- `https://www.amazon.com/wedding/guest-view/...`

Rejected examples:

- `https://www.amazon.com/dp/...` (normal product page)
- amazon.es / amazon.co.uk / other country sites

### How to get the link

1. Sign in to **amazon.com** as the registry **owner** (guest-view also works for the paste if that is the link you share).
2. Open your wedding registry.
3. Add the gifts there first, if they are not already on the list.
4. Click **Share**, or copy the registry / guest-view URL from the address bar.
5. In Ìgbéyàwówa → **Registry** → edit the gift → paste into **Amazon link**.
6. Save the gift.

That same Share / registry / guest-view link can be reused on each gift that should show **Buy on Amazon**. Guests leave your site, open the Amazon wedding list, find the gift by title, then buy or contribute there.

### What you will usually see on Amazon

Amazon’s guest list often shows **Contribute** / **Buying options** instead of a clean product URL. That is normal for Group Gifts. You do **not** need to hunt for a product `dp` link for this app.

### After someone buys on Amazon

The app does not import Amazon orders automatically. Record the purchase under **Transfers → Record Amazon**.

::: warning Gift status does not stop payments
Changing **Status** to Reserved or Purchased does not by itself remove the **Send money** option. To stop new contributions, untick **Visible on public registry** or make sure the gift is fully funded.
:::

## Edit or hide a gift

1. Find the gift under **Gift items**.
2. Select **Edit**.
3. Make the changes.
4. Untick **Visible on public registry** if you want to hide it without deleting it.
5. Select **Save gift**.

The claimed quantity cannot be higher than the desired quantity.

## Delete a gift

1. Find the gift.
2. Select **Delete**.
3. Confirm the deletion.

This removes the gift and its reservation history. A gift cannot be deleted after a contribution refers to it; hide it instead.

## Add a bank account

Guests need at least one visible account to make a bank contribution.

1. Open **Cash accounts**.
2. Select **Add account**.
3. Enter a **Display label**, such as “NGN account”.
4. Add the bank name.
5. Choose the account currency.
6. Enter the account name and account number.
7. Add a routing number, sort code, or IBAN if required.
8. Add any instructions guests need.
9. Keep **Visible on public registry** ticked.
10. Select **Add account**.

The supported currencies are USD, EUR, GBP, and NGN.

::: warning Bank details are public
When **Visible on public registry** is ticked, the account name, number, and other payment details can be seen by anyone who has the public wedding website link. Add only an account intended for guest contributions.
:::

## Edit, hide, or delete a bank account

- Select **Edit** to change the details.
- Untick **Visible on public registry** to hide it temporarily.
- Select **Delete** only when guests should no longer use it.

Check bank details very carefully before making an account visible.

An account cannot be deleted after a contribution refers to it. Hide it instead.

## Check a guest transfer

A transfer appears after a guest starts a contribution on the public registry.

1. Open **Transfers**.
2. Find the guest and select **Audit**.
3. Compare the name, amount, currency, and payment reference with the bank account.
4. If the guest sent a different amount, change **Amount** and select **Save amount**.
5. Select:
   - **Received** if the money arrived;
   - **Not received** if it did not arrive; or
   - **Back to pending** if it still needs checking.

Mark a payment as received only after checking the bank account.

If a transfer is marked **Not received**, the app offers email and WhatsApp follow-up options where contact details are available.

## Understand transfer wording

- **Awaiting guest confirm** — the guest has not yet confirmed that they sent the transfer.
- **Guest confirmed** — the guest says it was sent; the admin must still check the bank.
- **Pending** — the admin has not completed the check.
- **Received** — the admin confirmed the money arrived.
- **Not received** — the admin could not find the payment.

The app locks the exchange rate when a guest starts a transfer so the contribution value does not keep changing.

## Record an Amazon purchase

Use this when someone bought a listed gift on Amazon and the app did not receive that purchase automatically.

1. Make sure the gift has an Amazon wedding-registry link.
2. Open **Transfers**.
3. Select **Record Amazon**.
4. Choose the gift.
5. Enter the amount and currency.
6. Enter the buyer's name and email.
7. Add their phone number and order reference if available.
8. Select **Record purchase**.

This updates the amount remaining for that gift.
