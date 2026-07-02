# Route List

**Project**: {PROJECT_NAME}
**Generated**: {DATE}

## Backend Routes

> **Completeness Contract:** emit exactly ONE row per leaf route (HTTP method + concrete path). Expand framework resource macros (Rails `resources :x` → 7 RESTful rows). FORBIDDEN: resource-summary tables (`| Resource | Actions |`), approximation markers (`~N`, `(+nhiều)`, `see routes.rb`, `etc.`), wildcard paths (`/x/*`). Scout counts are estimates, not authority.

{POPULATED_BY_FRAGMENTS}

### File: {ROUTE_FILE}

| Method | Path | Handler | Middleware |
|--------|------|---------|------------|
| GET | /api/resource | ResourceController@index | auth |
| POST | /api/resource | ResourceController@store | auth |
| GET | /api/resource/:id | ResourceController@show | auth |
| PUT | /api/resource/:id | ResourceController@update | auth |
| DELETE | /api/resource/:id | ResourceController@destroy | auth |

## Frontend Routes/Pages

### File: {PAGE_FILE}

| Path | Component | Route Name |
|------|-----------|------------|
| / | HomePage | home |
| /resource | ResourceListPage | resource-list |
| /resource/:id | ResourceDetailPage | resource-detail |

## Summary

| Category | Count |
|----------|-------|
| Backend Routes | {N} |
| Frontend Pages | {N} |
| Total | {N} |
