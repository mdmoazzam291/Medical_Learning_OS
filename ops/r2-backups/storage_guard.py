"""Bounded R2 inventory, upload gate and read-only retention plan (stdlib only)."""
import argparse
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re
import subprocess

WARN_BYTES = 5_000_000_000
STOP_BYTES = 7_000_000_000
MAX_ARCHIVE_BYTES = 250_000_000
PINNED = 'supabase/2026/09/25/20260925T191515Z'
KEY = re.compile(r'^(supabase/(\d{4}/\d{2}/\d{2})/(\d{8}T\d{6}Z))/(backup\.tar\.gz(?:\.sha256)?)$')


def inventory():
    bucket, endpoint = os.environ['R2_BUCKET'], os.environ['R2_ENDPOINT']
    if not re.fullmatch(r'https://[a-zA-Z0-9.-]+\.r2\.cloudflarestorage\.com', endpoint):
        raise ValueError('Invalid R2 endpoint')
    objects, seen, token = [], set(), None
    for _ in range(100):
        command = ['aws', 's3api', 'list-objects-v2', '--bucket', bucket,
                   '--endpoint-url', endpoint, '--max-keys', '1000',
                   '--no-paginate', '--output', 'json']
        if token:
            command += ['--continuation-token', token]
        result = subprocess.run(command, capture_output=True, text=True, timeout=60)
        if result.returncode:
            raise ValueError('R2 inventory failed; uploads blocked')
        page = json.loads(result.stdout)
        if not isinstance(page.get('Contents', []), list):
            raise ValueError('Malformed inventory')
        objects.extend(page.get('Contents', []))
        if page.get('IsTruncated') is False:
            return objects
        if page.get('IsTruncated') is not True:
            raise ValueError('Inventory completeness unknown')
        token = page.get('NextContinuationToken')
        if not isinstance(token, str) or not token or token in seen:
            raise ValueError('Invalid inventory pagination')
        seen.add(token)
    raise ValueError('Inventory page ceiling reached; uploads blocked')


def plan(objects, now):
    total, seen, groups = 0, set(), {}
    for obj in objects:
        key, size = obj['Key'], obj['Size']
        if not isinstance(key, str) or key in seen or type(size) is not int or size < 0:
            raise ValueError('Invalid or duplicate inventory object')
        seen.add(key)
        total += size  # Includes unknown keys and unrelated objects in this bucket.
        match = KEY.fullmatch(key)
        if not match or not size:
            continue
        prefix, day, timestamp, filename = match.groups()
        try:
            created = datetime.strptime(timestamp, '%Y%m%dT%H%M%SZ').replace(tzinfo=timezone.utc)
            modified = datetime.fromisoformat(obj['LastModified'].replace('Z', '+00:00'))
            if modified.tzinfo is None or created.strftime('%Y/%m/%d') != day:
                continue
        except (ValueError, KeyError, AttributeError):
            continue  # Unrecognized objects are retained, never cleanup candidates.
        group = groups.setdefault(prefix, {'created': created, 'modified': modified, 'files': set(), 'bytes': 0})
        group['modified'] = max(group['modified'], modified)
        group['files'].add(filename)
        group['bytes'] += size
    complete = {k: v for k, v in groups.items()
                if v['files'] == {'backup.tar.gz', 'backup.tar.gz.sha256'}}
    newest = set(sorted(complete, key=lambda k: complete[k]['created'], reverse=True)[:7])
    candidates = [k for k, v in complete.items() if k not in newest and k != PINNED
                  and max(v['created'], v['modified']) < now - timedelta(days=30)]
    return {'bucket_bytes': total, 'object_count': len(objects),
            'complete_snapshots': len(complete), 'protected_verified_snapshot_present': PINNED in complete,
            'retention_candidate_count': len(candidates),
            'retention_candidate_bytes': sum(complete[k]['bytes'] for k in candidates),
            'retention_candidates': sorted(candidates), 'mode': 'report-only'}


def upload_allowed(report, archive_bytes, checksum_bytes):
    if not 0 < archive_bytes <= MAX_ARCHIVE_BYTES or not 0 < checksum_bytes <= 4096:
        return False
    return report['bucket_bytes'] + archive_bytes + checksum_bytes < STOP_BYTES


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path)
    parser.add_argument('--checksum', type=Path)
    args = parser.parse_args()
    if bool(args.archive) != bool(args.checksum):
        parser.error('archive and checksum must be supplied together')
    try:
        report = plan(inventory(), datetime.now(timezone.utc))
        incoming = 0
        allowed = report['bucket_bytes'] < STOP_BYTES
        if args.archive:
            archive_bytes, checksum_bytes = args.archive.stat().st_size, args.checksum.stat().st_size
            incoming = archive_bytes + checksum_bytes
            allowed = upload_allowed(report, archive_bytes, checksum_bytes)
        report['projected_bytes'] = report['bucket_bytes'] + incoming
        report['upload_allowed'] = allowed
        # Keep object paths out of logs and workflow summaries.
        report.pop('retention_candidates')
        print(json.dumps(report, sort_keys=True))
        if report['projected_bytes'] >= WARN_BYTES:
            print('::warning::Backup bucket projected usage is at least 5 GB.')
        if not allowed:
            print('::error::Upload blocked by backup storage or per-archive limit.')
        return 0 if allowed else 1
    except (ValueError, KeyError, TypeError, OSError, subprocess.SubprocessError):
        print('::error::Inventory or local file validation failed; upload blocked.')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
