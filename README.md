# Family Trailer Booking Calendar (Flask + Docker)

Mehrmonats‑Belegungsplan für Familien‑Anhänger. Bearbeiten per PIN (ACCESS_CODE).

## Lokal starten (optional)
```bash
docker compose up -d --build
# http://localhost:8080
```

**ENV Variablen**
- `ACCESS_CODE` (Pflicht)
- `MONTHS_AHEAD` (Default 12)

## Deploy auf Render (empfohlen)
- `render.yaml` im Repo lassen
- render.com → New → Blueprint → Repo wählen → Deploy
- Im Dashboard `ACCESS_CODE` setzen
- Healthcheck: `/health`

## API (kurz)
- `GET /api/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /api/bookings` → `{name,start,end,note,code}`
- `DELETE /api/bookings/:id?code=...`
