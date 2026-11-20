"""Load MedMCQA rows into public.dataset_question_staging (ADR-145).

Runs in GitHub Actions (the agent workspace cannot reach the dataset CDN). Repository logs are public,
so this script prints counts and checksums only, never question text.

Usage: python3 scripts/load-dataset-staging.py <train.parquet> <validation.parquet> <out.csv> [per_subject_train]
Then: psql "$SUPABASE_DB_URL" -f the generated SQL (see .github/workflows/load-dataset-staging.yml).
"""
import csv, hashlib, json, random, sys
import pyarrow.parquet as pq

DATASET_ID = 'medmcqa'
DATASET_VERSION = 'openlifescienceai/medmcqa@hf'
FIELDS = ['id', 'question', 'opa', 'opb', 'opc', 'opd', 'cop', 'choice_type', 'exp', 'subject_name', 'topic_name']

def rows(path, split):
    table = pq.read_table(path)
    names = set(table.column_names)
    missing = [f for f in FIELDS if f not in names]
    if missing:
        raise SystemExit(f'{split}: missing columns {missing}')
    for r in table.to_pylist():
        payload = {k: r.get(k) for k in FIELDS}
        yield split, payload

def main():
    train_path, val_path, out_path = sys.argv[1:4]
    per_subject = int(sys.argv[4]) if len(sys.argv) > 4 else 1000
    selected = list(rows(val_path, 'validation'))
    by_subject = {}
    for split, p in rows(train_path, 'train'):
        by_subject.setdefault(p['subject_name'] or '', []).append((split, p))
    rng = random.Random(20261120)  # fixed seed: the same rows on every run
    for subject in sorted(by_subject):
        group = sorted(by_subject[subject], key=lambda t: t[1]['id'])
        rng.shuffle(group)
        selected.extend(group[:per_subject])
    seen = set()
    with open(out_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        for split, p in selected:
            if not p['id'] or p['id'] in seen:
                continue
            seen.add(p['id'])
            body = json.dumps(p, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
            w.writerow([DATASET_ID, DATASET_VERSION, split, p['id'], p['subject_name'], p['topic_name'], p['choice_type'], body,
                        hashlib.sha256(body.encode('utf-8')).hexdigest()])
    counts = {}
    for split, p in selected:
        counts[split] = counts.get(split, 0) + 1
    print(json.dumps({'rows': len(seen), 'bySplit': counts, 'trainSubjects': len(by_subject), 'perSubjectTrain': per_subject}))

if __name__ == '__main__':
    main()
