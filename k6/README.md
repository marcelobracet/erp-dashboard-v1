# k6 load tests

## Prereqs

Install k6 locally (macOS):

- `brew install k6`

Or run with Docker:

- `docker run --rm -i grafana/k6 run - < k6/erp-smoke.js` (then pass env vars with `-e`)

## Smoke test (login + list endpoints)

This script logs in and calls:
- `GET /api/v1/clients`
- `GET /api/v1/products`
- `GET /api/v1/quotes`

### Local k6

```bash
API_URL="https://api.onmarmoraria.com.br" \
USER_EMAIL="celso@onmarmoraria.com.br" \
USER_PASSWORD="admin123" \
VUS=1 DURATION="30s" SLEEP=1 \
k6 run k6/erp-smoke.js
```

### Docker k6

```bash
docker run --rm -i \
  -e API_URL="http://host.docker.internal:8080" \
  -e USER_EMAIL="seu@email.com" \
  -e USER_PASSWORD="sua_senha" \
  -e VUS=2 \
  -e DURATION="1m" \
  grafana/k6 run - < k6/erp-smoke.js
```

## Notes

- If you test HTTPS with self-signed certs: set `K6_INSECURE_TLS=true`.
- If your API requires a tenant header, you can set `TENANT_ID` (sent as `X-Tenant-Id`).
