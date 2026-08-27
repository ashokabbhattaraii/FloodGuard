/**
 * fg-image-process — triggered by S3 ObjectCreated:* on the reports/ prefix
 *
 * The original diagram drew S3 as a passive sink with no arrow into any function.
 * An S3 event notification is the cheapest genuinely event-driven integration
 * available here, so it is wired up properly: uploading a photo IS the trigger.
 *
 * Presigned PUTs are inherently only as trustworthy as the client. The URL pins a
 * Content-Type, but S3 does not verify the bytes match it. This function is the
 * server-side check: it reads the file's magic number, tags the object with the
 * verdict, and tells the monolith whether the photo may be shown to admins.
 */
import { S3Client, HeadObjectCommand, GetObjectCommand,
         PutObjectTaggingCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { internalFetch, logJson } from './common.mjs';

const s3 = new S3Client({});
const MAX_BYTES = 10 * 1024 * 1024;   // 10 MB

/** Magic-number signatures — the actual bytes, not the client's claimed type. */
const SIGNATURES = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png',  bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  { type: 'image/heic', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
];

function sniff(buf) {
  for (const sig of SIGNATURES) {
    const off = sig.offset ?? 0;
    if (sig.bytes.every((b, i) => buf[off + i] === b)) return sig.type;
  }
  return null;
}

async function processOne(bucket, key) {
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));

  if (head.ContentLength > MAX_BYTES) {
    // Oversized objects are removed: they cost storage and can never be served.
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    logJson('warn', 'oversized upload deleted', { key, bytes: head.ContentLength });
    return { key, verdict: 'rejected', reason: 'too_large' };
  }

  // Range-GET only the header bytes — no need to pull a 10 MB object to read 12.
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: 'bytes=0-31' }));
  const detected = sniff(Buffer.from(await obj.Body.transformToByteArray()));

  const verdict = detected ? 'verified' : 'rejected';
  await s3.send(new PutObjectTaggingCommand({
    Bucket: bucket, Key: key,
    Tagging: { TagSet: [
      { Key: 'verification', Value: verdict },
      { Key: 'detectedType', Value: detected ?? 'unknown' },
    ]},
  }));

  if (!detected) {
    logJson('warn', 'upload failed content sniff', { key, claimed: head.ContentType });
  }

  await internalFetch('/api/internal/uploads/verified', {
    method: 'POST',
    body: { key, verdict, detectedType: detected, bytes: head.ContentLength },
  });

  logJson('info', 'image processed', { key, verdict, detectedType: detected });
  return { key, verdict, detectedType: detected };
}

export const handler = async (event) => {
  const out = [];
  for (const rec of event.Records ?? []) {
    const bucket = rec.s3.bucket.name;
    // S3 URL-encodes keys in event notifications; spaces arrive as '+'.
    const key = decodeURIComponent(rec.s3.object.key.replace(/\+/g, ' '));
    try {
      out.push(await processOne(bucket, key));
    } catch (err) {
      logJson('error', 'image processing failed', { key, error: String(err?.message ?? err) });
      throw err;   // let Lambda retry, then the function-level DLQ captures it
    }
  }
  return { processed: out };
};
