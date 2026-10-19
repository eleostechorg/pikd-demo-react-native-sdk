/** Platform runner: local config, pinned install, Metro and private device logs. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const platform = process.argv[2];
const device = process.env.PIKD_DEVICE_ID;
const port = Number(process.env.RCT_METRO_PORT || 8081);
const children = new Set();
let output;
let stopping = false;

function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* Already stopped. */
    }
  }
}
function write(chunk) {
  process.stdout.write(chunk);
  if (output) fs.writeSync(output, chunk);
}
function start(command, args, cwd = root) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.add(child);
  child.stdout.on('data', write);
  child.stderr.on('data', write);
  const done = new Promise(resolve => {
    child.on('error', error => {
      const hint =
        error.code === 'ENOENT' &&
        ['idevice_id', 'idevicesyslog'].includes(command)
          ? 'Install libimobiledevice with `brew install libimobiledevice` and ensure its bin directory is on PATH; see docs/LOCAL_SETUP.md.'
          : 'Check prerequisites and PATH; see docs/LOCAL_SETUP.md.';
      write(`Cannot start ${command}. ${hint}\n`);
      resolve(1);
    });
    child.on('close', code => {
      children.delete(child);
      resolve(code ?? 1);
    });
  });
  return { child, done };
}
async function run(command, args, cwd) {
  const code = await start(command, args, cwd).done;
  if (code !== 0)
    throw Object.assign(new Error(`${command} failed; see the local log.`), {
      code,
    });
}
async function metroReady() {
  return new Promise(resolve => {
    const request = http.get(
      { hostname: '127.0.0.1', port, path: '/status' },
      response => {
        let body = '';
        response.on('data', chunk => {
          body += chunk;
        });
        response.on('end', () =>
          resolve(body.trim() === 'packager-status:running'),
        );
      },
    );
    request.on('error', () => resolve(false));
    request.setTimeout(500, () => request.destroy());
  });
}
async function main() {
  if (!['ios', 'android'].includes(platform))
    throw new Error('Select ios or android.');
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid Metro port.');
  if (platform === 'ios' && !device)
    throw new Error(
      'Set PIKD_DEVICE_ID to a physical iPhone UDID; see docs/LOCAL_SETUP.md.',
    );
  const config =
    process.env.PIKD_DEMO_CONFIG || path.join(root, 'config/pikd.local.json');
  let values;
  try {
    values = JSON.parse(fs.readFileSync(config, 'utf8'));
  } catch {
    throw new Error(
      'Missing/invalid local configuration; copy config/pikd.example.json and fill it in.',
    );
  }
  if (
    ['PIKD_BASE', 'PIKD_SDK_KEY', 'PIKD_USER'].some(
      key =>
        typeof values[key] !== 'string' ||
        !values[key].trim() ||
        /provided-by-pikd|your-opaque/.test(values[key]),
    )
  )
    throw new Error(
      'Fill all three required tenant values before running; no local values are printed.',
    );
  process.env.PIKD_DEMO_CONFIG = path.resolve(config);
  const directory = path.resolve(
    process.env.PIKD_LOG_DIR || path.join(root, 'logs'),
  );
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logfile = path.join(
    directory,
    `${platform}-debug-${stamp}-${process.pid}.log`,
  );
  output = fs.openSync(logfile, 'wx', 0o600);
  write(`Capturing setup, build, Metro and device output to ${logfile}\n`);
  await run(process.execPath, ['tools/prepare-config.cjs']);
  const runtime = JSON.parse(
    fs.readFileSync(path.join(root, 'config/runtime.generated.json'), 'utf8'),
  );
  if (runtime.PIKD_DIAGNOSTICS === true)
    write(
      'PIKD debug diagnostics enabled; filter the log with PIKD_DIAG. Release builds remain silent.\n',
    );
  if (runtime.PIKD_DIAGNOSTICS === true)
    write(
      'CDA live evidence: cdaExchangeReceived sessionValid; cdaProfileReceived field availability/visit counts; cdaDashboardRendered; leaderboardStatisticsRendered count/time availability; AR collect-result hasMessage confirms backend-message availability without logging text.\n',
    );
  if (platform === 'android') {
    const maps = fs.readFileSync(
      path.join(root, 'config/maps.generated.properties'),
      'utf8',
    );
    if (/^GOOGLE_MAPS_API_KEY=\s*$/m.test(maps) || /YOUR_ANDROID/.test(maps))
      throw new Error(
        'Configure the Android Maps key; see docs/LOCAL_SETUP.md.',
      );
    await run('adb', device ? ['-s', device, 'get-state'] : ['get-state']);
  } else {
    const local = path.join(root, 'ios/Config/Local.xcconfig');
    const settings = fs.existsSync(local) ? fs.readFileSync(local, 'utf8') : '';
    const maps = fs.readFileSync(
      path.join(root, 'config/maps.generated.xcconfig'),
      'utf8',
    );
    if (!/^DEVELOPMENT_TEAM\s*=\s*(?!YOUR_)[A-Za-z0-9]+\s*$/m.test(settings))
      throw new Error('Set the iOS signing team in ios/Config/Local.xcconfig.');
    const localMaps = settings.match(
      /^PIKD_GOOGLE_MAPS_API_KEY\s*=\s*(\S+)\s*$/m,
    );
    const selectedMaps = localMaps ? localMaps[0] : maps;
    if (
      !/^PIKD_GOOGLE_MAPS_API_KEY\s*=\s*(?!YOUR_)[A-Za-z0-9_-]+\s*$/m.test(
        selectedMaps,
      )
    )
      throw new Error('Configure the iOS Maps key; see docs/LOCAL_SETUP.md.');
    await run('idevice_id', ['-l']);
    await run('idevicesyslog', ['--version']);
  }
  if (process.env.PIKD_SKIP_INSTALL !== '1') {
    const parent = path.resolve(root, '..');
    const manifest = path.join(parent, 'package.json');
    const internal =
      fs.existsSync(manifest) &&
      JSON.parse(fs.readFileSync(manifest, 'utf8')).name ===
        'pikd-react-native-sdk-workspace';
    if (internal) {
      await run('npm', ['ci'], parent);
      for (const script of [
        'build',
        'build:ar',
        'build:ui',
        'build:experience',
        'build:partner',
      ])
        await run('npm', ['run', script], parent);
    }
    await run('npm', ['ci', '--ignore-scripts']);
    if (platform === 'ios') {
      await run('bundle', ['install']);
      await run('bundle', [
        'exec',
        'pod',
        'install',
        '--project-directory=ios',
      ]);
    }
  }
  if (platform === 'android' && process.env.PIKD_CLEAN === '1')
    await run('./gradlew', ['clean'], path.join(root, 'android'));
  const metro = await metroReady();
  if (metro && process.env.PIKD_CLEAN === '1')
    throw new Error('Stop existing Metro before requesting a clean runner.');
  let metroStopped;
  if (!metro) {
    const args = [
      'node_modules/react-native/cli.js',
      'start',
      '--port',
      String(port),
      '--no-interactive',
      // RN 0.80 otherwise sends JS console output only to DevTools. Keep live
      // diagnostics in this runner's combined log even if iOS syslog is silent.
      '--client-logs',
    ];
    if (process.env.PIKD_CLEAN === '1') args.push('--reset-cache');
    const server = start(process.execPath, args);
    let ready = false;
    for (
      let i = 0;
      i < 120 &&
      !stopping &&
      server.child.exitCode === null &&
      server.child.signalCode === null;
      i++
    ) {
      if (await metroReady()) {
        ready = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error('Metro did not become ready; see local log.');
    metroStopped = server.done.then(status => {
      throw Object.assign(
        new Error(
          'Metro stopped; the debug app cannot load. Restart the runner.',
        ),
        { code: status || 1 },
      );
    });
    // Setup failures also stop Metro before the launch race attaches its handler.
    metroStopped.catch(() => {});
  } else
    write(
      'Using existing Metro; its output belongs to the terminal that started it.\n',
    );
  if (platform === 'android') {
    await run('adb', [
      ...(device ? ['-s', device] : []),
      'reverse',
      `tcp:${port}`,
      `tcp:${port}`,
    ]);
    write(`Android USB connection to Metro established on port ${port}.\n`);
  }
  const log =
    platform === 'android'
      ? start('adb', [
          ...(device ? ['-s', device] : []),
          'logcat',
          '-v',
          'threadtime',
          // Capture new events without replaying historical crash buffers.
          '-T',
          '1',
        ])
      : start('idevicesyslog', ['-u', device]);
  const args = [
    'node_modules/react-native/cli.js',
    `run-${platform}`,
    '--no-packager',
    '--port',
    String(port),
  ];
  // CLI 19 resolves --udid as a simulator before checking physical devices.
  // --device also accepts a physical UDID and keeps this runner on the phone.
  if (device) args.push('--device', device);
  if (platform === 'ios' && process.env.PIKD_CLEAN === '1')
    args.push('--force-pods');
  args.push(...process.argv.slice(3));
  await Promise.race([
    ...(metroStopped ? [metroStopped] : []),
    run(process.execPath, args),
    log.done.then(status => {
      throw Object.assign(
        new Error('Device log capture stopped before launch completed.'),
        { code: status || 1 },
      );
    }),
  ]);
  write(
    'Demo launched. Device logs remain active; press Ctrl+C after testing.\n',
  );
  const status = await Promise.race([
    log.done,
    ...(metroStopped ? [metroStopped] : []),
  ]);
  if (!stopping)
    throw Object.assign(new Error('Device log capture stopped.'), {
      code: status || 1,
    });
}
process.on('SIGINT', () => {
  stop();
  process.exitCode = 130;
});
process.on('SIGTERM', () => {
  stop();
  process.exitCode = 143;
});
process.on('exit', stop);
main()
  .catch(error => {
    if (!stopping) {
      write(`${error.message}\n`);
      process.exitCode = error.code || 1;
    }
  })
  .finally(stop);
