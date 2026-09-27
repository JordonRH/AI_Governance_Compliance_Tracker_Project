# Prototype security configuration and verification

## Account access

Passwords use salted scrypt hashes. Administrator resets revoke existing sessions and require the affected user to choose a new password before accessing protected workflows. Users can change their own password from **My password**; current-password verification is required and all sessions are then revoked. Administrators can inspect recent account changes in **Accounts**. Audit records never contain passwords.

Failed login attempts are throttled per connection address and login identifier (default 10 attempts per 15 minutes). Configure `AITRACE_LOGIN_MAX_ATTEMPTS` and `AITRACE_LOGIN_WINDOW_MS`. This prototype limiter is in memory and resets when the process restarts; a shared persistent limiter is needed for multiple application processes.

## TLS

Set both `AITRACE_TLS_CERT_PATH` and `AITRACE_TLS_KEY_PATH` to readable PEM files outside the repository, then start the server. With TLS configured, the app uses HTTPS, accepts same-origin HTTPS requests and sets Secure session cookies. Missing/invalid file contents cause startup to fail. Without both settings, it remains a loopback-only HTTP development instance. A temporary self-signed certificate can now be staged by an Administrator. Neither a trusted certificate nor a production deployment has been provisioned by this work.

Verification: configuration tests require both paths and check HTTPS mode; authenticate over the configured HTTPS origin, inspect the session cookie for Secure/HttpOnly/SameSite=Strict, and verify that another origin is rejected. Certificate trust must be verified on each demonstration device. Never commit a private key. Production scripts keep a strict script CSP; the development server explicitly permits its required Vite inline preamble.

## Storage encryption and recovery plan

SQLite database contents, policy blobs, session metadata and audit history are NOT application-encrypted by this implementation. Hashed passwords do not change that fact. To meet encrypted-storage acceptance for a pilot, the operator must place the database and its WAL/SHM files on an encrypted volume with restricted operating-system access. Include backups and exported reports in the same protection and retention policy. Document the actual encryption status, key/recovery ownership and restore test before claiming this requirement complete. An encrypted SQLite distribution is an alternative future architecture decision, not an enabled feature here.

Do not enable or repartition machine-wide encryption automatically from the app. A machine owner must choose the protected location and preserve recovery keys independently. Set `DATABASE_PATH` to that approved location, stop the app before file-level backups, copy the complete database consistently, and verify a restore in an isolated directory using fictional data. Restrict file access to the operator account. A repository clone does not include operational data or passwords.

## Document and export safeguards

Uploads allow PDF signatures or UTF-8 text only, with 1 MiB decoded limit, bounded metadata and safe attachment filenames. Download routes enforce organisation scope and force attachment disposition. This is not malware scanning; use synthetic/de-identified files for demonstrations. Reports neutralise spreadsheet formula prefixes and wrap PDF text. The bundled report font covers Latin characters; broader scripts need additional licensed fonts.

## Remaining acceptance evidence

Operator-verified encrypted storage and certificate trust, representative user acceptance, retention/deletion policy, and independent security review remain explicit human/operational tasks. No legal compliance certification is asserted. No real client data is needed to complete prototype testing.

## Administrator certificate staging

Administrators can use **Certificates** to generate a 30-day self-signed development pair or upload a matching PEM certificate chain/key. Local certificates must cover both `localhost` and `127.0.0.1`. Invalid, expired, not-yet-valid or mismatched replacements are rejected before changing the staged file. The page shows expiry and whether the staged fingerprint matches the running server. A staged certificate can be replaced after expiry.

Each organisation has a separate bundle under `AITRACE_CERTIFICATES_DIR` (default: ignored `data/certificates/`). The API returns metadata and the activation path, never the private key. Writes use temporary files and an atomic rename, with owner-only Unix modes. On Windows, restrict the directory ACL to the server account/authorised operators; Unix modes do not establish a Windows ACL. Treat the bundle as a secret: no Git, shared attachments or ordinary backups. The application does not encrypt private keys at rest.

To activate, set `AITRACE_TLS_BUNDLE_PATH` to the displayed bundle path, clear `AITRACE_TLS_CERT_PATH` and `AITRACE_TLS_KEY_PATH`, and restart the server. Configuration is read from the process environment; `.env` is an example/local storage convention, not automatically loaded by the current scripts. A certificate replacement takes effect on restart. The operator chooses the active organisation bundle because TLS is server-wide; an organisation administrator cannot silently change transport for other organisations.

Self-signed development certificates encrypt the connection but are not publicly trusted. No certificate is installed in an operating-system trust store automatically. Use HTTPS before sending a real replacement private key. Replace the temporary pair with an appropriately issued local certificate and verify trust separately. The server remains restricted to loopback; external deployment/hostnames need their own deployment review.

Certificate generation uses [selfsigned](https://github.com/jfromaniello/selfsigned) with SHA-256 and a new RSA key on each generation. Automated tests perform an HTTPS handshake trusting only the generated test certificate, without disabling TLS validation globally.
