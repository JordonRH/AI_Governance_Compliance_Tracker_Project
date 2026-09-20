import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { finding, freeze, nonEmptyText as nonEmpty } from './validation.js';
function signatureBytes(hex) {
  if (typeof hex !== 'string' || hex.length < 2 || hex.length % 2 || !/^[0-9a-f]+$/i.test(hex)) return null;
  return Buffer.from(hex, 'hex');
}

function validatePolicy(policy) {
  const findings = [];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return [finding('INVALID_POLICY', 'Evidence policy must be an object.', 'policy')];
  if (!nonEmpty(policy.id)) findings.push(finding('INVALID_POLICY_ID', 'Policy id is required.', 'policy.id'));
  if (!nonEmpty(policy.version)) findings.push(finding('INVALID_POLICY_VERSION', 'Policy version is required.', 'policy.version'));
  if (policy.status !== 'approved') findings.push(finding('POLICY_NOT_APPROVED', 'Only an approved evidence policy can accept a file.', 'policy.status'));
  if (!Number.isSafeInteger(policy.maxBytes) || policy.maxBytes < 1) findings.push(finding('INVALID_SIZE_LIMIT', 'maxBytes must be a positive integer.', 'policy.maxBytes'));
  if (!Array.isArray(policy.allowedTypes) || policy.allowedTypes.length === 0) {
    findings.push(finding('MISSING_ALLOWED_TYPES', 'At least one allowed file type is required.', 'policy.allowedTypes'));
    return findings;
  }
  const mediaTypes = new Set();
  for (const [index, type] of policy.allowedTypes.entries()) {
    const path = `policy.allowedTypes[${index}]`;
    if (!nonEmpty(type?.mediaType) || mediaTypes.has(type.mediaType)) findings.push(finding('INVALID_MEDIA_TYPE_POLICY', 'Media types must be present and unique.', `${path}.mediaType`));
    else mediaTypes.add(type.mediaType);
    if (!Array.isArray(type?.extensions) || type.extensions.length === 0 || new Set(type.extensions).size !== type.extensions.length || type.extensions.some(extension => !/^\.[a-z0-9]+$/.test(extension))) {
      findings.push(finding('INVALID_EXTENSION_POLICY', 'Extensions must be unique lowercase values beginning with a dot.', `${path}.extensions`));
    }
    if (!Array.isArray(type?.signatures) || type.signatures.length === 0 || type.signatures.some(signature => !signatureBytes(signature))) {
      findings.push(finding('INVALID_SIGNATURE_POLICY', 'Each allowed type requires valid hexadecimal file signatures.', `${path}.signatures`));
    }
  }
  return findings;
}

function validateFile(policy, file, link) {
  const findings = [];
  if (!file || typeof file !== 'object' || Array.isArray(file)) return [finding('INVALID_FILE', 'File input must be an object.', 'file')];
  if (!nonEmpty(file.originalName) || file.originalName.length > 255 || file.originalName.includes('/') || file.originalName.includes('\\') || file.originalName.includes('\0')) {
    findings.push(finding('UNSAFE_FILE_NAME', 'A plain file name of at most 255 characters is required.', 'file.originalName'));
  }
  if (!nonEmpty(file.mediaType)) findings.push(finding('MISSING_MEDIA_TYPE', 'A media type is required.', 'file.mediaType'));
  if (!(file.bytes instanceof Uint8Array)) findings.push(finding('INVALID_FILE_BYTES', 'File bytes must be a Uint8Array.', 'file.bytes'));
  else {
    if (file.bytes.length === 0) findings.push(finding('EMPTY_FILE', 'Empty files are not accepted.', 'file.bytes'));
    if (file.bytes.length > policy.maxBytes) findings.push(finding('FILE_TOO_LARGE', `File exceeds the configured ${policy.maxBytes}-byte limit.`, 'file.bytes'));
  }
  if (!link || typeof link !== 'object' || !nonEmpty(link.assessmentId) || !nonEmpty(link.itemId)) findings.push(finding('INVALID_EVIDENCE_LINK', 'assessmentId and itemId are required.', 'link'));

  const allowed = policy.allowedTypes.find(type => type.mediaType === file?.mediaType);
  if (nonEmpty(file?.mediaType) && !allowed) findings.push(finding('MEDIA_TYPE_NOT_ALLOWED', 'The declared media type is not permitted.', 'file.mediaType'));
  if (allowed && nonEmpty(file?.originalName)) {
    const extension = extname(file.originalName).toLowerCase();
    if (!allowed.extensions.includes(extension)) findings.push(finding('EXTENSION_MISMATCH', 'The file extension does not match the declared media type.', 'file.originalName'));
    if (file.bytes instanceof Uint8Array && file.bytes.length > 0 && !allowed.signatures.some(signature => {
      const expected = signatureBytes(signature);
      return file.bytes.length >= expected.length && expected.every((byte, index) => file.bytes[index] === byte);
    })) findings.push(finding('SIGNATURE_MISMATCH', 'File content does not match an allowed signature.', 'file.bytes'));
  }
  return findings;
}

export function inspectEvidenceFile(policy, file, link) {
  const policyFindings = validatePolicy(policy);
  if (policyFindings.length) return freeze({ status: 'invalid', findings: policyFindings });
  const fileFindings = validateFile(policy, file, link);
  if (fileFindings.length) return freeze({ status: 'invalid', findings: fileFindings });
  return freeze({
    status: 'accepted',
    policy: { id: policy.id, version: policy.version },
    file: {
      originalName: file.originalName,
      mediaType: file.mediaType,
      sizeBytes: file.bytes.length,
      sha256: createHash('sha256').update(file.bytes).digest('hex')
    },
    link: { assessmentId: link.assessmentId, itemId: link.itemId },
    reviewStatus: 'pending'
  });
}
