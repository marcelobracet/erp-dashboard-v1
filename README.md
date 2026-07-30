This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

## Environment variables

- Local development uses `.env.local` (ignored by git).
- Production uses the template `.env.production.example` (fill values on your VPS or in Vercel settings).

Required:

- `NEXT_PUBLIC_API_URL` (public; used by browser to reach the API)

If you use NextAuth endpoints (`/api/auth/*`):

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Optional feature flags (public):

- `NEXT_PUBLIC_AUTH_DISABLED`
- `NEXT_PUBLIC_PRODUCTS_LOCAL`
- `NEXT_PUBLIC_QUOTES_LOCAL`

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deploy de produção (TCC)

1. Na Vercel, configure `NEXT_PUBLIC_API_URL` apontando para a API pública (veja `.env.production.example`).
2. Não habilite `NEXT_PUBLIC_AUTH_DISABLED`, `NEXT_PUBLIC_PRODUCTS_LOCAL` nem `NEXT_PUBLIC_QUOTES_LOCAL` em produção.
3. A API (Go) sobe na GCP (Compute Engine) conforme `erp-api/deployments/gcp/README.md`.
4. Domínios sugeridos: `app.onmarmoraria.com.br` (painel) e `api.onmarmoraria.com.br` (API).
