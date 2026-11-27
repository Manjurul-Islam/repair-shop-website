# Repair Shop — Customer Website

Customer-facing booking website for **Dhanmondi Mobile Care**, built on the Benchly repair-shop workspace.
No build step: plain HTML, CSS and JavaScript.

## Pages
| Page | Path |
|---|---|
| Home (hero assistant, how it works, booking, popular repairs, trust, tracking, reviews, guides, FAQ, visit) | `site/index.html` |
| Repairs & prices (filters, search, sort, price board) | `site/repairs.html` |
| Repair details (device, part grade, hand-off, tabs) | `site/repair.html?id=screen` |
| Checkout | `site/checkout.html` |
| Sign in / sign up | `site/signin.html` |
| Customer account (bookings, devices, profile) | `site/account.html` |

## How it works
- `js/` holds the shared workspace contract (`shopcfg.js`) and core helpers used by the owner portal.
  Prices, services, warranty, hours, branches, reviews and homepage content all come from it.
- Bookings, quote approvals and reviews are written into the workspace in the browser (`localStorage`), so this is a working demo with no server.
- Owner portal: [repair-shop-owner-portal](https://github.com/Manjurul-Islam/repair-shop-owner-portal). Served from the same origin, the two stay in sync live.

## Run locally
```bash
python3 -m http.server 8844
# open http://localhost:8844/site/
```

## Credits
Icons: [Hugeicons](https://hugeicons.com) (MIT). Fonts: General Sans (Fontshare), Inter.
