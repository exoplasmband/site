# Deploying exoplasm.net to Vercel

This folder is the complete site — plain HTML, no build step.

```
index.html            the whole site
images/               band photo, logo, product shots
favicon.png           browser tab icon (the logo "e")
apple-touch-icon.png  home-screen icon
```

## 1. Put it on Vercel (free Hobby plan)

**Option A — GitHub (recommended, easiest to update later):**
1. Create a GitHub repo and push this folder to it.
2. Go to vercel.com → Add New → Project → Import that repo.
3. Framework preset: **Other**. Leave build command and output directory empty. Deploy.

**Option B — CLI (no GitHub needed):**
```
cd C:\ExoplasmSite
npx vercel          # log in when prompted, accept defaults
npx vercel --prod
```

Either way you immediately get a live `something.vercel.app` URL to test.

## 2. Point exoplasm.net at it

1. In the Vercel project: Settings → Domains → add `exoplasm.net` and `www.exoplasm.net`.
2. Vercel shows you the exact DNS records. At the registrar where exoplasm.net
   is managed, set:
   - `A` record for `@` → `76.76.21.21`
   - `CNAME` for `www` → `cname.vercel-dns.com`
3. DNS takes minutes to a few hours. HTTPS certificate is automatic.

## 3. IMPORTANT — what happens to the Shopify store

Right now exoplasm.net IS the Shopify store. The moment DNS moves to Vercel,
the store is no longer reachable at exoplasm.net.

That's why every merch link in index.html points to the store's permanent
address instead: **https://1zfeyd-3r.myshopify.com** — that URL always works,
no matter where the domain points.

Later options:
- **Nicer store URL on Shopify:** in Shopify admin add domain `shop.exoplasm.net`
  (registrar: `CNAME` for `shop` → `shops.myshopify.com`), then in index.html
  find-and-replace `1zfeyd-3r.myshopify.com` → `shop.exoplasm.net`.
- **Leaving Shopify** (e.g. for Fourthwall): find-and-replace the store links
  in index.html with the new store's product URLs. They appear 11 times.

## 4. Updating the site

Edit `index.html` (it's one readable file), then either `git push` (Option A —
Vercel redeploys automatically) or run `npx vercel --prod` again (Option B).

Slot for music embeds: search index.html for `embed-slot` — replace that box
with a Spotify/Bandcamp iframe when the first release is out.
