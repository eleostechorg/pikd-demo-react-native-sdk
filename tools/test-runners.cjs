// Isolated fake toolchains: no builds, credentials or real device connections.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pikd-runner-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of [
    'tools',
    'config',
    'android',
    'ios/Config',
    'bin',
    'gradle',
    'node_modules/react-native',
  ])
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  for (const file of ['run-demo.cjs', 'prepare-config.cjs'])
    fs.copyFileSync(path.join(__dirname, file), path.join(root, 'tools', file));
  const values = {
    PIKD_BASE: 'https://example.test/api/sdk/v1',
    PIKD_SDK_KEY: 'fixture-client-key',
    PIKD_USER: 'fixture-member-ref',
    GOOGLE_MAPS_ANDROID_API_KEY: 'fixture_android_map',
    GOOGLE_MAPS_IOS_API_KEY: 'fixture_ios_map',
  };
  fs.writeFileSync(
    path.join(root, 'config/pikd.local.json'),
    JSON.stringify(values),
  );
  fs.writeFileSync(
    path.join(root, 'ios/Config/Local.xcconfig'),
    'DEVELOPMENT_TEAM = FIXTURE123\n',
  );
  const common = `const fs=require('node:fs'); fs.appendFileSync('commands.jsonl',JSON.stringify({command:process.argv[1],args:process.argv.slice(2),pid:process.pid})+'\\n'); process.on('SIGTERM',()=>{fs.appendFileSync('stopped.jsonl',String(process.pid)+'\\n');process.exit(0);});\n`;
  for (const command of ['npm', 'adb', 'bundle', 'idevice_id', 'idevicesyslog'])
    fs.writeFileSync(
      path.join(root, 'bin', command),
      `#!${process.execPath}\n` +
        common +
        `if(process.argv.includes('reverse') && process.env.FIXTURE_REVERSE_STATUS) process.exit(Number(process.env.FIXTURE_REVERSE_STATUS)); if(process.argv.includes('logcat') || (process.argv[1].endsWith('idevicesyslog') && !process.argv.includes('--version'))) { console.log('fixture device log'); setInterval(()=>{},1000); } else console.log('fixture tool ready');`,
      { mode: 0o755 },
    );
  fs.writeFileSync(
    path.join(root, 'node_modules/react-native/cli.js'),
    common +
      `if(process.argv[2]==='start') { require('node:http').createServer((req,res)=>res.end('packager-status:running')).listen(Number(process.argv[process.argv.indexOf('--port')+1]),'127.0.0.1'); console.log('fixture Metro log'); if(process.env.FIXTURE_METRO_EXIT) setTimeout(()=>process.exit(17),2000); } else { console.log('fixture native build'); process.exit(Number(process.env.FIXTURE_BUILD_STATUS||0)); }`,
  );
  const env = {
    ...process.env,
    PATH: path.join(root, 'bin') + ':' + process.env.PATH,
    GRADLE_USER_HOME: path.join(root, 'gradle'),
    RCT_METRO_PORT: String(40000 + Math.floor(Math.random() * 15000)),
    PIKD_DEVICE_ID: 'fixture-device',
    PIKD_DEMO_CONFIG: path.join(root, 'config/pikd.local.json'),
    PIKD_DEMO_COLLECT_RADIUS_M: '',
    PIKD_LOG_DIR: path.join(root, 'logs'),
    PIKD_SKIP_INSTALL: '',
    PIKD_CLEAN: '',
    MAPS_API_KEY: '',
    FIXTURE_BUILD_STATUS: '',
    FIXTURE_REVERSE_STATUS: '',
    FIXTURE_METRO_EXIT: '',
  };
  return { root, env, values };
}
function execute(root, env, platform, terminate = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tools/run-demo.cjs', platform], {
      cwd: root,
      env,
    });
    let output = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Runner test timed out'));
    }, 15000);
    child.stdout.on('data', chunk => {
      output += chunk;
      if (terminate && output.includes('Demo launched.')) child.kill('SIGINT');
    });
    child.stderr.on('data', chunk => {
      output += chunk;
    });
    child.on('close', code => {
      clearTimeout(timeout);
      resolve({ code, output });
    });
    child.on('error', reject);
  });
}
for (const platform of ['android', 'ios'])
  test(`${platform}: install/device/logs and Ctrl+C child cleanup`, async t => {
    const { root, env, values } = fixture(t);
    const result = await execute(
      root,
      { ...env, PIKD_DIAGNOSTICS: '1' },
      platform,
      true,
    );
    assert.equal(result.code, 130, result.output);
    const logs = fs.readdirSync(path.join(root, 'logs'));
    assert.equal(logs.length, 1);
    const filename = path.join(root, 'logs', logs[0]);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    const output = fs.readFileSync(filename, 'utf8');
    for (const text of [
      'fixture tool ready',
      'fixture Metro log',
      'fixture device log',
      'fixture native build',
      'Demo launched.',
      'PIKD debug diagnostics enabled; filter the log with PIKD_DIAG.',
      'CDA live evidence: cdaExchangeReceived sessionValid;',
      'cdaDashboardRendered; leaderboardStatisticsRendered',
    ])
      assert.ok(output.includes(text), text);
    for (const value of Object.values(values))
      assert.ok(!output.includes(value), 'No fixture credentials in logs');
    const commands = fs
      .readFileSync(path.join(root, 'commands.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map(JSON.parse);
    assert.ok(commands.some(c => c.args.join(' ') === 'ci --ignore-scripts'));
    const metro = commands.find(c => c.args[0] === 'start');
    assert.ok(
      metro.args.includes('--client-logs'),
      'Capture live JS diagnostics',
    );
    assert.ok(
      commands.some(
        c =>
          c.args.includes('--device') &&
          !c.args.includes('--udid') &&
          c.args.includes('fixture-device'),
      ),
    );
    if (platform === 'ios')
      assert.ok(
        commands.some(
          c => c.args.join(' ') === 'exec pod install --project-directory=ios',
        ),
      );
    if (platform === 'android') {
      const capture = commands.find(c => c.args.includes('logcat'));
      assert.deepEqual(capture.args.slice(-2), ['-T', '1']);
      const reverse = commands.findIndex(c => c.args.includes('reverse'));
      assert.ok(reverse >= 0);
      assert.deepEqual(commands[reverse].args, [
        '-s',
        'fixture-device',
        'reverse',
        `tcp:${env.RCT_METRO_PORT}`,
        `tcp:${env.RCT_METRO_PORT}`,
      ]);
      assert.ok(
        reverse < commands.findIndex(c => c.args.includes('run-android')),
      );
    }
    const stopped = fs.readFileSync(path.join(root, 'stopped.jsonl'), 'utf8');
    for (const c of commands.filter(
      c =>
        c.args.includes('start') ||
        c.args.includes('logcat') ||
        (c.command.endsWith('idevicesyslog') && !c.args.includes('--version')),
    ))
      assert.ok(stopped.includes(String(c.pid)), 'Owned process stopped');
  });
test('USB forwarding failure prevents Android launch', async t => {
  const { root, env } = fixture(t);
  const result = await execute(
    root,
    { ...env, FIXTURE_REVERSE_STATUS: '19' },
    'android',
  );
  assert.equal(result.code, 19, result.output);
  assert.ok(!result.output.includes('fixture native build'));
  assert.ok(!result.output.includes('Demo launched.'));
});
test('owned Metro exit stops the runner with a useful failure', async t => {
  const { root, env } = fixture(t);
  const result = await execute(
    root,
    { ...env, FIXTURE_METRO_EXIT: '1' },
    'android',
  );
  assert.equal(result.code, 17, result.output);
  assert.ok(
    result.output.includes('Metro stopped; the debug app cannot load.'),
  );
});
test('build failure preserves exit code and cleans owned streams', async t => {
  const { root, env } = fixture(t);
  const result = await execute(
    root,
    { ...env, FIXTURE_BUILD_STATUS: '23' },
    'android',
  );
  assert.equal(result.code, 23, result.output);
  assert.ok(result.output.includes('fixture native build'));
  assert.ok(!result.output.includes('Demo launched.'));
  assert.equal(
    fs.readFileSync(path.join(root, 'stopped.jsonl'), 'utf8').trim().split('\n')
      .length,
    2,
  );
});
test('malformed tenant input fails before native tools without printing values', async t => {
  const { root, env } = fixture(t);
  fs.writeFileSync(
    env.PIKD_DEMO_CONFIG,
    '{"PIKD_SDK_KEY":"fixture-client-key", broken',
  );
  const result = await execute(root, env, 'android');
  assert.equal(result.code, 1);
  assert.ok(!result.output.includes('fixture-client-key'));
  assert.ok(!fs.existsSync(path.join(root, 'commands.jsonl')));
});
test('external config/native Maps/environment/QA overrides retain original input', t => {
  const { root, env } = fixture(t);
  const config = path.join(root, 'external.json');
  const original = JSON.stringify({ PIKD_USER: 'fixture-member-ref' });
  fs.writeFileSync(config, original);
  fs.writeFileSync(
    path.join(root, 'android/keys.properties'),
    'MAPS_API_KEY=retained_android_key\n',
  );
  let result = spawnSync(process.execPath, ['tools/prepare-config.cjs'], {
    cwd: root,
    env: {
      ...env,
      PIKD_DEMO_CONFIG: config,
      PIKD_DEMO_COLLECT_RADIUS_M: '1000',
      PIKD_DIAGNOSTICS: '1',
    },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(config, 'utf8'), original);
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(root, 'config/runtime.generated.json')),
    ).PIKD_DEMO_COLLECT_RADIUS_M,
    1000,
  );
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(root, 'config/runtime.generated.json')),
    ).PIKD_DIAGNOSTICS,
    true,
  );
  assert.ok(
    fs
      .readFileSync(path.join(root, 'config/maps.generated.properties'), 'utf8')
      .includes('retained_android_key'),
  );
  result = spawnSync(process.execPath, ['tools/prepare-config.cjs'], {
    cwd: root,
    env: { ...env, MAPS_API_KEY: 'environment_key' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.ok(
    fs
      .readFileSync(path.join(root, 'config/maps.generated.properties'), 'utf8')
      .includes('environment_key'),
  );
});

test('iOS missing log tools reports the install command before native build', async t => {
  const { root, env } = fixture(t);
  fs.unlinkSync(path.join(root, 'bin/idevice_id'));
  const result = await execute(
    root,
    { ...env, PATH: path.join(root, 'bin') },
    'ios',
  );
  assert.equal(result.code, 1);
  assert.match(result.output, /brew install libimobiledevice/);
  assert.ok(!result.output.includes('fixture native build'));
});
