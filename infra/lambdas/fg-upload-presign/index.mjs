/**
 * fg-upload-presign — API Gateway POST /uploads/presign
 *
 * Direct extraction of backend/src/uploads/uploads.service.ts. That service already
 * used @aws-sdk/client-s3 + s3-request-presigner and touched no database, which
 * makes it the lowest-risk microservice extraction in the codebase — the logic
 * moves unchanged and only the transport differs.
 *
 * The browser then PUTs straight to S3, so the upload bytes never traverse
 * Elastic Beanstalk at all. That removes large multipart bodies from the EB
 * request path entirely (the original diagram's arrow 5 still showed EB doing this).
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { apiResponse, logJson, requireEnv } from './common.mjs';

const s3 = new S3Client({});
const URL_TTL_SECONDS = 300;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export const handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return apiResponse(400, { error: 'body must be valid JSON' });
  }

  const { filename, contentType } = body;
  if (!filename || !contentType) {
    return apiResponse(400, { error: 'filename and contentType are required' });
  }
  if (!ALLOWED.includes(contentType)) {
    return apiResponse(415, { error: `contentType must be one of ${ALLOWED.join(', ')}` });
  }

  // Strip any path component: a filename of "../../etc/passwd" must not escape
  // the reports/ prefix once interpolated into the object key.
  const safeName = filename.replace(/[^\w.-]/g, '_').slice(-100);
  const key = `reports/${randomUUID()}-${safeName}`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: requireEnv('UPLOADS_BUCKET'),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: URL_TTL_SECONDS },
  );

  logJson('info', 'presigned upload issued', { key, contentType });
  return apiResponse(200, { url, key, expiresIn: URL_TTL_SECONDS });
};
