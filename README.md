# ISKCON Sadhana Chart

Mobile-first Next.js starter for a Sadhana Chart with:
- Google sign-in
- user-specific data storage in Postgres
- devotee, leader, and superadmin roles
- period-based reporting
- leader dashboard for assigned devotees
- superadmin dashboard for all devotees

## 1. Install locally

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## 2. Google OAuth setup

Create OAuth credentials in Google Cloud and add these redirect URIs:
- `http://localhost:3000/api/auth/callback/google`
- `https://your-app.vercel.app/api/auth/callback/google`

Put the client ID and secret into `.env.local`.

## 3. Create superadmin

Set `SUPERADMIN_EMAIL` to the email that should become superadmin.
After the first deploy, call:

```bash
curl -X POST https://your-app.vercel.app/api/admin/seed-superadmin
```

Or let that email sign in once, since the auth callback already promotes that account.

## 4. Assign leader to devotee users

After devotees have signed in, update their `leaderId` in the database.
Example SQL:

```sql
update "User"
set "leaderId" = 'LEADER_USER_ID'
where email in ('devotee1@example.com', 'devotee2@example.com');

update "User"
set role = 'leader'
where email = 'leader@example.com';
```

## 5. Deploy to Vercel

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Connect a Postgres database such as Neon from the Vercel Marketplace.
4. Add the environment variables from `.env.example`.
5. Deploy.
6. Run migrations against production:

```bash
npx prisma migrate deploy
```

If you use Vercel build settings, set the build command to:

```bash
prisma migrate deploy && next build
```

## 6. Main routes

- `/` sign-in page
- `/dashboard` role-aware dashboard
- `/api/sadhana` save a daily row
- `/api/reports/leader` leader report API
- `/api/reports/superadmin` superadmin report API
- `/api/admin/seed-superadmin` promote or create a superadmin

## 7. Notes

- This starter uses simple CSS to avoid external UI packages.
- Biometric login is left as a scaffold to add later with passkeys/WebAuthn.
- `SadhanaDay` stores one row per user per date.


## 8. Temple version additions

This version adds:
- monthly printable sadhana sheet preview and export
- leader and temple overview cards
- sector-style grouping based on the assigned leader
- WhatsApp summary copy button for weekly/period reports

Note:
- Sector grouping is derived from each devotee's assigned leader. If you want a separate Sector model later, you can extend the Prisma schema.


## Role setup

- `SUPERADMIN_EMAIL` in `.env` defines which Google account becomes superadmin on first sign-in.
- `LEADER_EMAILS` in `.env` can be a comma-separated list of leader emails.
- Festival fields can be shown or hidden from the superadmin dashboard under **System settings**.

Example:
```env
SUPERADMIN_EMAIL="admin@example.com"
LEADER_EMAILS="leader1@example.com,leader2@example.com"
```
