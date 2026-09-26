# Prototype security configuration and verification

## Account access

Passwords use salted scrypt hashes. Administrator resets revoke existing sessions and require the affected user to choose a new password before accessing protected workflows. Users can change their own password from **My password**; current-password verification is required and all sessions are then revoked. Administrators can inspect recent account changes in **Accounts**. Audit records never contain passwords.

Failed login attempts are throttled per connection address and login identifier (default 10 attempts per 15 minutes). Configure `AITRACE_LOGIN_MAX_ATTEMPTS` and `AITRACE_LOGIN_WINDOW_MS`. This prototype limiter is in memory and resets when the process restarts; a shared persistent limiter is needed for multiple application processes.

## TLS

Set both `AITRACE_TLS_CERT_PATH` and `AITRACE_TLS_KEY_PATH` to readable PEM files outside the repository, then start the server. With TLS configured, the app uses HTTPS, accepts same-origin HTTPS requests and sets Secure session cookies. Missing/invalid file contents cause startup to fail. Without both settings, it remains a loopback-only HTTP development instance. Neither a trusted certificate nor a production deployment has been provisioned by this work.

Verification: configuration tests require both paths and check HTTPS mode; authenticate over the configured HTTPS origin, inspect the session cookie for Secure/HttpOnly/SameSite=Strict, and verify that another origin is rejected. Certificate trust must be verified on each demonstration device. Never commit a private key. Production scripts keep a strict script CSP; the development server explicitly permits its required Vite inline preamble.

## Storage encryption and recovery plan

SQLite database contents, policy blobs, session metadata and audit history are NOT application-encrypted by this implementation. Hashed passwords do not change that fact. To meet encrypted-storage acceptance for a pilot, the operator must place the database and its WAL/SHM files on an encrypted volume with restricted operating-system access. Include backups and exported reports in the same protection and retention policy. Document the actual encryption status, key/recovery ownership and restore test before claiming this requirement complete. An encrypted SQLite distribution is an alternative future architecture decision, not an enabled feature here.

Do not enable or repartition machine-wide encryption automatically from the app. A machine owner must choose the protected location and preserve recovery keys independently. Set `DATABASE_PATH` to that approved location, stop the app before file-level backups, copy the complete database consistently, and verify a restore in an isolated directory using fictional data. Restrict file access to the operator account. A repository clone does not include operational data or passwords.

## Document and export safeguards

Uploads allow PDF signatures or UTF-8 text only, with 1 MiB decoded limit, bounded metadata and safe attachment filenames. Download routes enforce organisation scope and force attachment disposition. This is not malware scanning; use synthetic/de-identified files for demonstrations. Reports neutralise spreadsheet formula prefixes and wrap PDF text. The bundled report font covers Latin characters; broader scripts need additional licensed fonts.

## Remaining acceptance evidence

Operator-verified encrypted storage and certificate trust, representative user acceptance, retention/deletion policy, and independent security review remain explicit human/operational tasks. No legal compliance certification is asserted. No real client data is needed to complete prototype testing.
