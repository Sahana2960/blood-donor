# BloodConnect (copied to blooddonor folder)

This is the BloodConnect app placed inside your `blooddonor` workspace folder.

Follow the same setup steps as documented below.

## Setup quick start
1. Copy `.env.example` to `.env` in `server` and fill DB credentials.
2. Import `schema.sql` into MySQL.
3. From PowerShell in `server` directory:

   npm install
   npm start

4. Open http://localhost:3000

## Files
- `server/` - Express backend
- `public/` - frontend static files
- `schema.sql` - database schema

