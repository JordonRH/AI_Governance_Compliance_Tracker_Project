# Policy and evidence handling design

Status: Partial implementation for GitHub issue #16
Prepared: 20 September 2026
Decision state: Intake validation seam implemented; storage, retrieval, permissions, retention and review metadata remain unapproved.

## Current boundary

`server/domain/evidence-intake.js` inspects candidate evidence entirely in memory. It accepts a file only when an approved, versioned policy explicitly permits its declared media type, lowercase extension, byte limit and leading hexadecimal signature. Accepted output retains the policy version, original name, media type, size, SHA-256 digest and the supplied assessment/item link. Review status starts as `pending`.

The module does not write files, choose a storage path, serve downloads, scan for malware, authorise a user or claim that a file is safe. Signature checks detect simple type mismatches; they are not content disarm, antivirus scanning or semantic document validation.

## Interface

```js
inspectEvidenceFile(policy, file, link) -> accepted descriptor | validation findings
```

The caller supplies:

- an approved policy with a stable id/version, maximum byte count and explicit media-type/extension/signature rules;
- a plain original filename, declared media type and `Uint8Array` bytes;
- stable assessment and checklist-item identifiers.

The module returns immutable data. It never returns a server filesystem path or uses the original filename as a storage key.

## Security invariants

1. Draft, missing or internally inconsistent policies fail closed.
2. Empty or oversized files are rejected before storage.
3. Paths, traversal sequences and null characters are rejected in original names.
4. Media type, extension and configured byte signature must agree.
5. Every accepted descriptor includes a SHA-256 digest and exact policy version.
6. Evidence review state does not imply approval, authenticity, safety or compliance.
7. Storage, retrieval and access control remain outside this pure module.

## Decisions required before upload or retrieval

1. Approve permitted demonstration formats and byte limits.
2. Choose local/database/object storage and encryption expectations.
3. Define malware scanning and document-content controls.
4. Approve which roles may add, view, replace, review and delete evidence.
5. Define required review metadata, retention, deletion and legal-hold rules.
6. Define assessment/checklist identifiers and whether links may change.
7. Decide audit events, download headers and browser rendering restrictions.

No HTTP upload/download route or database migration should be added until these decisions and authentication boundaries are approved.
