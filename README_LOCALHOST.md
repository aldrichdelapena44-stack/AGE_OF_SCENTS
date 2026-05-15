# AGE OF SCENT - localhost run guide

This ZIP contains the full replacement website:

- `backend/` - Express backend on `http://localhost:4000`
- `frontend/` - Next.js frontend on `http://localhost:3000`

## Replace folders

Copy the `backend` and `frontend` folders from this ZIP into:

`C:\Users\aldrich\OneDrive\AgeOfScentWeb\`

Replace the old folders completely.

## Clean old frontend cache

Open PowerShell:

```powershell
cd C:\Users\aldrich\OneDrive\AgeOfScentWeb\frontend
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
```

## Start backend

Terminal 1:

```powershell
cd C:\Users\aldrich\OneDrive\AgeOfScentWeb\backend
npm.cmd install
npm.cmd run dev
```

Test backend in Chrome:

`http://localhost:4000/api/health`

## Start frontend

Terminal 2:

```powershell
cd C:\Users\aldrich\OneDrive\AgeOfScentWeb\frontend
npm.cmd install
npm.cmd run dev
```

Open:

`http://localhost:3000`

## Create admin

To make the first registered account an admin, delete local data before registering:

```powershell
cd C:\Users\aldrich\OneDrive\AgeOfScentWeb\backend
Remove-Item -Recurse -Force data -ErrorAction SilentlyContinue
```

Then start backend again, register a new account at `http://localhost:3000/register`, and open:

`http://localhost:3000/admin`

## Admin menu

The Admin link appears in the top navigation only after an admin user logs in.

## Notes

The backend may print `DATABASE_URL is missing`. That is okay for localhost because this version uses local JSON files in `backend/data`.
