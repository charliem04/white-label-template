#!/usr/bin/env bash
#
# Apply the retention policy to the résumé bucket.
#
# This exists as a committed script rather than a command somebody ran
# once, because a retention period that lives only in a shell history is
# a retention period nobody can audit. Run it after creating the bucket,
# and again any time the number changes.
#
# THREE PLACES MUST AGREE. Change one, change all three:
#   1. RETENTION_DAYS below
#   2. RETENTION_DAYS in src/index.ts (stamped on each object as
#      `retainUntil`, so an object says when it should be gone)
#   3. the "How long we keep it" section of the site's privacy policy,
#      in client-site/app/privacy/page.tsx
#
# The site tells applicants a number. This is what makes it true.

set -euo pipefail

BUCKET="${BUCKET:-client-resumes}"
RETENTION_DAYS="${RETENTION_DAYS:-365}"

echo "Bucket:    $BUCKET"
echo "Retention: $RETENTION_DAYS days"
echo

# Applications expire on their own. R2 does the deleting, so it happens
# whether or not anybody remembers it should.
npx wrangler r2 bucket lifecycle add "$BUCKET" \
  retain-applications \
  applications/ \
  --expire-days "$RETENTION_DAYS" \
  --force

# An abandoned multipart upload is charged for and belongs to nobody.
npx wrangler r2 bucket lifecycle add "$BUCKET" \
  abort-stale-multipart \
  "" \
  --abort-multipart-days 7 \
  --force

echo
echo "Applied. Current rules:"
npx wrangler r2 bucket lifecycle list "$BUCKET"

cat <<'NOTE'

Note: a lifecycle rule applies going forward. Objects already in the
bucket are covered too — R2 evaluates age from each object's own upload
time — but nothing is deleted retroactively faster than the rule says.

The raw submitting IP is handled separately and expires sooner. It is
written to KV with a 30-day TTL (IP_RETENTION_DAYS), never onto the
object; the object carries only a salted hash. See hashIp() in
src/index.ts.
NOTE
