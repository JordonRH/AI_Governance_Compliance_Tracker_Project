import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectEvidenceFile } from '../../server/domain/evidence-intake.js';

const pdfBytes = Buffer.from('%PDF-1.7\nSynthetic test document.');
function policy(overrides = {}) {
  return {
    id: 'synthetic-evidence-policy', version: 'test-v1', status: 'approved', maxBytes: 1024,
    allowedTypes: [{ mediaType: 'application/pdf', extensions: ['.pdf'], signatures: ['25504446'] }],
    ...overrides
  };
}
const file = { originalName: 'fictional-evidence.pdf', mediaType: 'application/pdf', bytes: pdfBytes };
const link = { assessmentId: 'synthetic-assessment', itemId: 'synthetic-item' };

test('accepts a file only against an approved explicit policy', () => {
  const result = inspectEvidenceFile(policy(), file, link);
  assert.equal(result.status, 'accepted');
  assert.deepEqual(result.policy, { id: 'synthetic-evidence-policy', version: 'test-v1' });
  assert.deepEqual(result.link, link);
  assert.equal(result.file.originalName, file.originalName);
  assert.equal(result.file.sizeBytes, pdfBytes.length);
  assert.match(result.file.sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.reviewStatus, 'pending');
  assert.equal('storagePath' in result.file, false);
  assert.ok(Object.isFrozen(result));
});

test('digest and output are deterministic without mutating bytes', () => {
  const before = Buffer.from(pdfBytes);
  const first = inspectEvidenceFile(policy(), file, link);
  const second = inspectEvidenceFile(policy(), { ...file, bytes: Buffer.from(pdfBytes) }, link);
  assert.equal(first.file.sha256, second.file.sha256);
  assert.deepEqual(pdfBytes, before);
});

test('draft policy fails closed before file evaluation', () => {
  const result = inspectEvidenceFile(policy({ status: 'draft' }), file, link);
  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.findings.map(item => item.code), ['POLICY_NOT_APPROVED']);
  assert.equal('file' in result, false);
});

test('size, media type, extension and signature checks reject invalid files', () => {
  const cases = [
    [{ ...file, bytes: Buffer.alloc(1025) }, 'FILE_TOO_LARGE'],
    [{ ...file, mediaType: 'application/zip' }, 'MEDIA_TYPE_NOT_ALLOWED'],
    [{ ...file, originalName: 'fictional-evidence.txt' }, 'EXTENSION_MISMATCH'],
    [{ ...file, bytes: Buffer.from('not a pdf') }, 'SIGNATURE_MISMATCH']
  ];
  for (const [candidate, code] of cases) {
    const result = inspectEvidenceFile(policy(), candidate, link);
    assert.equal(result.status, 'invalid');
    assert.ok(result.findings.some(item => item.code === code));
  }
});

test('unsafe names, empty files and missing links are rejected', () => {
  const result = inspectEvidenceFile(policy(), { ...file, originalName: '../evidence.pdf', bytes: Buffer.alloc(0) }, {});
  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.findings.map(item => item.code), ['UNSAFE_FILE_NAME', 'EMPTY_FILE', 'INVALID_EVIDENCE_LINK']);
});

test('inconsistent policy definitions fail closed', () => {
  const result = inspectEvidenceFile(policy({ allowedTypes: [{ mediaType: 'application/pdf', extensions: ['PDF'], signatures: ['not-hex'] }] }), file, link);
  assert.equal(result.status, 'invalid');
  assert.ok(result.findings.some(item => item.code === 'INVALID_EXTENSION_POLICY'));
  assert.ok(result.findings.some(item => item.code === 'INVALID_SIGNATURE_POLICY'));
});
