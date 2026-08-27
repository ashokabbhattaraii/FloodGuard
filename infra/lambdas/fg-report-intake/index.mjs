/**
 * fg-report-intake — API Gateway POST /reports
 *
 * The public flood-report intake path, extracted out of the monolith. This is the
 * endpoint the relocated API Gateway actually fronts.
 *
 * Why extract THIS one: report submission is spiky and untrusted (it is the only
 * unauthenticated write in the system). Running it on Lambda means a flood event
 * traffic spike scales the intake independently instead of consuming EB request
 * threads that authenticated dashboard users also need.
 */
import { internalFetch, apiResponse, logJson } from './common.mjs';

const MAX_DESCRIPTION = 2000;
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

function validate(payload) {
  const errors = [];
  const { regionId, description, latitude, longitude, severity, photoKey, reporterName } = payload;

  if (!regionId || typeof regionId !== 'string') errors.push('regionId is required');
  if (!description || typeof description !== 'string') errors.push('description is required');
  else if (description.length > MAX_DESCRIPTION) errors.push(`description exceeds ${MAX_DESCRIPTION} chars`);

  const lat = Number(latitude), lon = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push('latitude must be -90..90');
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.push('longitude must be -180..180');

  if (severity && !VALID_SEVERITIES.includes(severity)) {
    errors.push(`severity must be one of ${VALID_SEVERITIES.join(', ')}`);
  }
  if (photoKey && !/^reports\/[\w.-]+$/.test(photoKey)) {
    // Reject anything outside the reports/ prefix so a caller cannot claim an
    // arbitrary object elsewhere in the bucket as their report photo.
    errors.push('photoKey must be a key under reports/');
  }
  return { errors, clean: { regionId, description, latitude: lat, longitude: lon,
                            severity: severity ?? 'medium', photoKey, reporterName } };
}

export const handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body ?? '{}');
  } catch {
    return apiResponse(400, { error: 'body must be valid JSON' });
  }

  const { errors, clean } = validate(payload);
  if (errors.length) {
    logJson('warn', 'report rejected', { errors });
    return apiResponse(400, { error: 'validation failed', details: errors });
  }

  try {
    const created = await internalFetch('/api/internal/reports', { method: 'POST', body: clean });
    logJson('info', 'report accepted', { reportId: created?.id, regionId: clean.regionId });
    return apiResponse(201, { id: created?.id, status: 'pending_review' });
  } catch (err) {
    logJson('error', 'report intake failed', { error: String(err?.message ?? err) });
    return apiResponse(502, { error: 'could not record report, please retry' });
  }
};
