/** Generate ignored runtime/native inputs. Never print local values. */
const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(__dirname, '../config');
const configuredSource = process.argv[2] || process.env.PIKD_DEMO_CONFIG;
const source = configuredSource
  ? path.resolve(configuredSource)
  : path.join(directory, 'pikd.local.json');
if (configuredSource && !fs.existsSync(source))
  throw new Error('Configured input file is missing');
let values = {};
if (fs.existsSync(source)) {
  try {
    values = JSON.parse(fs.readFileSync(source, 'utf8'));
  } catch {
    throw new Error('Local demo configuration must be valid JSON');
  }
}
if (process.env.PIKD_DEMO_COLLECT_RADIUS_M) {
  const radius = Number(process.env.PIKD_DEMO_COLLECT_RADIUS_M);
  if (!Number.isFinite(radius) || radius <= 0)
    throw new Error('Local QA collection radius must be positive');
  values.PIKD_DEMO_COLLECT_RADIUS_M = radius;
}
if (process.env.PIKD_DIAGNOSTICS)
  values.PIKD_DIAGNOSTICS =
    process.env.PIKD_DIAGNOSTICS === '1' ||
    process.env.PIKD_DIAGNOSTICS === 'true';
function property(file, key) {
  if (!fs.existsSync(file)) return '';
  const line = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find(
      value =>
        value.trim().startsWith(`${key}=`) ||
        value.trim().startsWith(`${key} =`),
    );
  return line ? line.slice(line.indexOf('=') + 1).trim() : '';
}
values.GOOGLE_MAPS_ANDROID_API_KEY =
  process.env.MAPS_API_KEY ||
  values.GOOGLE_MAPS_ANDROID_API_KEY ||
  property(
    path.resolve(__dirname, '../android/keys.properties'),
    'MAPS_API_KEY',
  ) ||
  property(
    path.join(
      process.env.GRADLE_USER_HOME ||
        path.join(require('node:os').homedir(), '.gradle'),
      'gradle.properties',
    ),
    'MAPS_API_KEY',
  );
const allowed = [
  'PIKD_DIAGNOSTICS',
  'PIKD_BASE',
  'PIKD_SDK_KEY',
  'PIKD_USER',
  'PIKD_EMAIL',
  'PIKD_THEME',
  'PIKD_FONT_FAMILY',
  'PIKD_UI_LOCALE',
  'PIKD_LANGUAGE_REF',
  'PIKD_DEMO_COLLECT_RADIUS_M',
  'PIKD_PARTNER_LABEL',
  'PIKD_PARTNER_ITEM_BRAND',
  'PIKD_PARTNER_APP_NAME',
];
const runtime = Object.fromEntries(
  allowed
    .filter(key => values[key] !== undefined)
    .map(key => [key, values[key]]),
);
for (const key of ['GOOGLE_MAPS_ANDROID_API_KEY', 'GOOGLE_MAPS_IOS_API_KEY']) {
  if (values[key] && !/^[A-Za-z0-9_-]+$/.test(values[key]))
    throw new Error('Maps key has invalid characters');
}
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(
  path.join(directory, 'runtime.generated.json'),
  JSON.stringify(runtime, null, 2) + '\n',
  { mode: 0o600 },
);
fs.writeFileSync(
  path.join(directory, 'maps.generated.properties'),
  `GOOGLE_MAPS_API_KEY=${values.GOOGLE_MAPS_ANDROID_API_KEY || ''}\n`,
  { mode: 0o600 },
);
fs.writeFileSync(
  path.join(directory, 'maps.generated.xcconfig'),
  `PIKD_GOOGLE_MAPS_API_KEY = ${values.GOOGLE_MAPS_IOS_API_KEY || ''}\n`,
  { mode: 0o600 },
);
for (const name of [
  'runtime.generated.json',
  'maps.generated.properties',
  'maps.generated.xcconfig',
])
  fs.chmodSync(path.join(directory, name), 0o600);
console.log('Demo configuration prepared; local values remain ignored.');
