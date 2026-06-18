import https from 'node:https';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'https://urbanflow-mvp.vercel.app';

function request(pathOrUrl) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${baseUrl}${pathOrUrl}`;

  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const chunks = [];

        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks);
          resolve({
            status: response.statusCode ?? 0,
            contentType: response.headers['content-type'] ?? '',
            body,
            url,
          });
        });
      })
      .on('error', reject);
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const home = await request('/');
  assert(home.status === 200, `Homepage returned ${home.status}`);
  assert(home.body.toString('utf8').includes('Team Urbanflow'), 'Homepage did not include Team Urbanflow content');

  const model = await request('/model/model.json');
  assert(model.status === 200, `Model JSON returned ${model.status}`);
  assert(model.contentType.includes('application/json'), 'Model JSON content type was unexpected');

  const weights = await request('/model/weights.bin');
  assert(weights.status === 200, `Model weights returned ${weights.status}`);
  assert(weights.body.length > 100_000, 'Model weights response was unexpectedly small');

  const inspections = await request('/api/inspections');
  assert(inspections.status === 200, `Inspections API returned ${inspections.status}`);

  const payload = JSON.parse(inspections.body.toString('utf8'));
  assert(payload.configured === true, 'Inspections API is not configured');

  const records = Array.isArray(payload.records) ? payload.records : [];
  const imageRecord = records.find((record) => record.imageUrl);

  if (imageRecord) {
    const image = await request(imageRecord.imageUrl);
    assert(image.status === 200, `Sample image returned ${image.status}`);
    assert(String(image.contentType).startsWith('image/'), 'Sample image content type was unexpected');
  }

  console.log(`Smoke check passed for ${baseUrl}`);
  console.log(`Records found: ${records.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
