"""Verify original task packets against a regenerated, pinned NMC review queue."""
import argparse
import json
import re
from pathlib import Path


def verify(queue, packets):
    references = {row["referenceId"]: row for row in queue["rows"]}
    if len(references) != len(queue["rows"]):
        raise ValueError("duplicate_queue_reference")
    seen = set()
    counts = {}
    for path in packets:
        packet = json.loads(path.read_text())
        if (packet["sourceEdition"], packet["sourceSha256"]) != (
            queue["sourceEdition"], queue["sourceSha256"]
        ):
            raise ValueError(f"packet_source_mismatch: {path}")
        if packet["status"] != "draft-tasks-awaiting-identity-and-source-review":
            raise ValueError(f"packet_status_invalid: {path}")
        for key in ("clinicalApproval", "sourceAlignmentApproved", "learnerActivation"):
            if packet.get(key) is not False:
                raise ValueError(f"packet_approval_invalid: {path}")
        for row in packet["rows"]:
            reference = references.get(row["referenceId"])
            if reference is None:
                raise ValueError(f"unknown_reference: {path}")
            if row["referenceId"] in seen:
                raise ValueError(f"duplicate_packet_reference: {path}")
            seen.add(row["referenceId"])
            for key in ("code", "subjectId", "page", "rowBBox", "sourceBodySha256"):
                if row.get(key) != reference[key]:
                    raise ValueError(f"row_evidence_mismatch: {path}: {key}")
            if reference["state"] == "source-resolution":
                raise ValueError(f"unresolved_source: {path}")
            if not re.fullmatch(r"[0-9a-f]{64}", row["sourceBodySha256"]):
                raise ValueError(f"row_digest_invalid: {path}")
            if not isinstance(row.get("draftLearningTask"), str) or not row["draftLearningTask"].strip():
                raise ValueError(f"missing_learning_task: {path}")
            if row.get("mode") not in ("knowledge", "performance", "performance-and-knowledge"):
                raise ValueError(f"invalid_assessment_mode: {path}")
            subject = row["subjectId"]
            counts[subject] = counts.get(subject, 0) + 1
    return {"packets": len(packets), "distinctReferences": len(seen), "subjects": counts}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("queue", type=Path, help="Output of build_foundation_review_queue.py")
    parser.add_argument("packets", type=Path, nargs="+", help="Regular draft task JSON files")
    args = parser.parse_args()
    print(json.dumps(verify(json.loads(args.queue.read_text()), args.packets), sort_keys=True))
