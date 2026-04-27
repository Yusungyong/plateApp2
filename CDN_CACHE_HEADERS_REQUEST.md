# CDN Cache Headers Request

## Goal
Enable CDN caching for static assets (videos/images/thumbnails) to reduce S3 traffic and latency.

---

## Recommended Cache-Control

### 1) Versioned/UUID file paths (recommended for current structure)
```
Cache-Control: public, max-age=31536000, immutable
```
- 1 year cache
- Safe when file names are unique/immutable

### 2) Overwriteable paths
```
Cache-Control: public, max-age=3600
```
- 1 hour cache
- Use if files are overwritten with same name

---

## Apply Methods

### A) S3 object metadata
Set `Cache-Control` on upload (SDK/CLI).

### B) CloudFront Response Headers Policy
Force `Cache-Control` from CloudFront regardless of origin headers.

---

## Target Paths (example)
- `/foodvideos/*`
- `/foodimages/*`
- `/FeedImages/*`
- `/foodimages/thumbnails/*`

---

## Verification
Check response headers in browser:
```
Cache-Control: public, max-age=31536000, immutable
```

