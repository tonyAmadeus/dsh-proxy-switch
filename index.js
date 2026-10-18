// @local/dsh-proxy-switch — host side
//
// Keeps a local proxy router alive and exposes a small RPC surface so the web
// client can flip between auto / direct / clash without restarting DSH.
//
// The router reads the mode file on every connection, so switching is instant.
//
// Resilience notes (learned the hard way):
// - The plugin fiber can be disposed right after apply() during some boot
//   phases. Killing the child there would leave DSH without its outbound
//   proxy, so the router supervises itself instead: it watches the host pid
//   and exits when that process is gone.
// - If the port is already open, an existing router is adopted rather than
//   duplicated (a duplicate would die on EADDRINUSE anyway).

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

export const name = 'dsh-proxy-switch';
export const inject = ['connection', 'webServer'];

const ROUTER_SCRIPT = fileURLToPath(new URL('./router.mjs', import.meta.url));
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');

export function apply(ctx, config = {}) {
  const options = {
    routerPort: Number(config.routerPort ?? 17897),
    clashPort: Number(config.clashPort ?? 7897),
    modeFile: String(config.modeFile ?? path.join(DSH_HOME, 'proxy-mode.txt')),
    logFile: String(config.logFile ?? path.join(DSH_HOME, 'dsh-proxy-switch.log')),
    parentFile: String(config.parentFile ?? path.join(DSH_HOME, 'proxy-router-parent.txt')),
    uiFile: String(config.uiFile ?? path.join(DSH_HOME, 'proxy-ui.json')),
  };

  const log = (line) => {
    try {
      fs.appendFileSync(options.logFile, `${new Date().toISOString()} [plugin:${process.pid}] ${line}\n`);
    } catch { /* ignore */ }
  };

  log(`apply() entered (dshHome=${DSH_HOME})`);

  // Publish this process as the router's owner. A router started by an
  // external launcher (before DSH exists) has no parent pid; it watches this
  // file instead and exits when this process disappears. Delayed so a
  // short-lived boot worker does not claim ownership of the router.
  const publishOwner = () => {
    try {
      fs.writeFileSync(options.parentFile, String(process.pid), 'utf8');
    } catch { /* ignore */ }
  };
  setTimeout(publishOwner, 3000).unref?.();
  setInterval(publishOwner, 30000).unref?.();

  try {
    fs.mkdirSync(options.modeFile.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
    if (!fs.existsSync(options.modeFile)) fs.writeFileSync(options.modeFile, 'auto\n', 'utf8');
    if (!fs.existsSync(options.uiFile)) fs.writeFileSync(options.uiFile, JSON.stringify({ dock: true }, null, 2), 'utf8');
  } catch (error) {
    log(`could not seed state files: ${error.message}`);
  }

  const readUi = () => {
    try {
      const parsed = JSON.parse(fs.readFileSync(options.uiFile, 'utf8'));
      return { dock: parsed?.dock !== false };
    } catch {
      return { dock: true };
    }
  };

  const writeUi = (patch) => {
    const next = { ...readUi(), ...patch };
    try {
      fs.writeFileSync(options.uiFile, JSON.stringify(next, null, 2), 'utf8');
    } catch (error) {
      log(`could not write ui state: ${error.message}`);
    }
    return next;
  };

  let child;
  let stopped = false;

  const spawnRouter = () => {
    if (stopped) return;
    const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', PROXY_ROUTER_PARENT_PID: String(process.pid) };
    // The router must never inherit a proxy pointing at itself.
    for (const key of [
      'http_proxy', 'https_proxy', 'all_proxy',
      'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY',
      'NODE_USE_ENV_PROXY',
    ]) {
      delete env[key];
    }
    env.PROXY_ROUTER_PORT = String(options.routerPort);
    env.PROXY_ROUTER_CLASH = `127.0.0.1:${options.clashPort}`;
    env.PROXY_ROUTER_MODE_FILE = options.modeFile;
    env.PROXY_ROUTER_LOG = options.logFile;
    env.PROXY_ROUTER_PARENT_FILE = options.parentFile;

    child = spawn(process.execPath, [ROUTER_SCRIPT], {
      env,
      stdio: 'ignore',
      windowsHide: true,
    });
    log(`router spawned pid=${child.pid}`);

    child.on('exit', (code, signal) => {
      log(`router exited code=${code} signal=${signal}`);
      child = undefined;
      // The periodic monitor decides whether to respawn; respawning here too
      // would race with it and can spawn duplicates on fast crashes.
    });
    child.on('error', (error) => log(`router spawn error: ${error.message}`));
  };

  const probe = (port, timeoutMs = 400) => new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (up) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(up);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.connect({ host: '127.0.0.1', port });
  });

  const readMode = () => {
    try {
      const raw = fs.readFileSync(options.modeFile, 'utf8').trim().toLowerCase();
      return ['auto', 'direct', 'clash'].includes(raw) ? raw : 'auto';
    } catch {
      return 'auto';
    }
  };

  const status = async () => ({
    mode: readMode(),
    dock: readUi().dock,
    routerPort: options.routerPort,
    clashPort: options.clashPort,
    routerUp: await probe(options.routerPort),
    clashUp: await probe(options.clashPort),
    modeFile: options.modeFile,
    uiFile: options.uiFile,
  });

  // Start (or adopt) the router without tying its lifetime to this fiber:
  // a spuriously disposed fiber must not take DSH's outbound path down.
  const monitor = async () => {
    if (stopped) return;
    const up = await probe(options.routerPort, 250);
    if (up) {
      if (!child) log('router healthy (port listening)');
      return;
    }
    if (child) {
      log('router child present but port not listening yet');
      return;
    }
    spawnRouter();
  };

  ctx.effect(() => {
    monitor().catch((error) => log(`monitor failed: ${error.message}`));
    const timer = setInterval(() => {
      monitor().catch((error) => log(`monitor tick failed: ${error.message}`));
    }, 3000);
    timer.unref?.();
    return () => {
      // Intentionally do not kill the router. It exits when this host process
      // disappears (parent-pid watchdog), so a disposed fiber stays harmless.
      log('fiber disposed (router left running, self-supervising)');
    };
  });

  try {
    ctx.connection.register(ctx, '/proxy-switch', async (endpoint, payload = {}) => {
      try {
        if (endpoint === 'status') return { ok: true, value: await status() };
        if (endpoint === 'setMode') {
          const mode = String(payload?.mode ?? '').toLowerCase();
          if (!['auto', 'direct', 'clash'].includes(mode)) {
            return { ok: false, error: { code: 'invalid-mode', message: '模式必须是 auto / direct / clash' } };
          }
          fs.writeFileSync(options.modeFile, `${mode}\n`, 'utf8');
          await new Promise((resolve) => setTimeout(resolve, 120));
          return { ok: true, value: await status() };
        }
        if (endpoint === 'setDock') {
          if (typeof payload?.dock !== 'boolean') {
            return { ok: false, error: { code: 'invalid-dock', message: 'dock 必须是布尔值' } };
          }
          writeUi({ dock: payload.dock });
          return { ok: true, value: await status() };
        }
        return { ok: false, error: { code: 'unknown-operation', message: `未知操作：${endpoint}` } };
      } catch (error) {
        return { ok: false, error: { code: 'proxy-switch-failed', message: String(error?.message || error) } };
      }
    });
    log('rpc /proxy-switch registered');
  } catch (error) {
    log(`rpc registration failed: ${error.stack || error.message}`);
  }
}
