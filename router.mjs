// dsh-proxy-switch router
//
// A tiny local HTTP proxy. It reads the requested mode from a file on every
// connection, so changing that file takes effect immediately.
//
//   auto   : try Clash; if it refuses, connect directly
//   direct : always connect directly
//   clash  : always forward to Clash (no fallback)
//
// Environment (all optional):
//   PROXY_ROUTER_PORT        default 17897
//   PROXY_ROUTER_CLASH       default 127.0.0.1:7897
//   PROXY_ROUTER_MODE_FILE   default $DSH_HOME/proxy-mode.txt
//   PROXY_ROUTER_LOG         default $DSH_HOME/dsh-proxy-switch.log
//   PROXY_ROUTER_PARENT_PID  exit when this pid disappears
//   PROXY_ROUTER_PARENT_FILE owner pid written by the plugin (launcher case)
//
// The router is spawned by the plugin via ELECTRON_RUN_AS_NODE, so it runs on
// the same Node runtime as DSH and adds no external dependency.

import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
const PORT = Number(process.env.PROXY_ROUTER_PORT || 17897);
const CLASH = process.env.PROXY_ROUTER_CLASH || '127.0.0.1:7897';
const CLASH_HOST = CLASH.split(':')[0];
const CLASH_PORT = Number(CLASH.split(':')[1] || 7897);
const MODE_FILE = process.env.PROXY_ROUTER_MODE_FILE || path.join(DSH_HOME, 'proxy-mode.txt');
const LOG_FILE = process.env.PROXY_ROUTER_LOG || path.join(DSH_HOME, 'dsh-proxy-switch.log');
const PARENT_FILE = process.env.PROXY_ROUTER_PARENT_FILE || path.join(DSH_HOME, 'proxy-router-parent.txt');

const VALID_MODES = new Set(['auto', 'direct', 'clash']);

function log(line) {
  try {
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${line}\n`);
    const st = fs.statSync(LOG_FILE);
    if (st.size > 512 * 1024) fs.truncateSync(LOG_FILE, 0);
  } catch { /* logging must never break the router */ }
}

function readMode() {
  try {
    const raw = fs.readFileSync(MODE_FILE, 'utf8').trim().toLowerCase();
    return VALID_MODES.has(raw) ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

let probeCache = { at: 0, up: false };

function probeClash(timeoutMs = 400) {
  const now = Date.now();
  if (now - probeCache.at < 1000) return Promise.resolve(probeCache.up);
  return new Promise((resolve) => {
    const socket = net.connect({ host: CLASH_HOST, port: CLASH_PORT });
    let settled = false;
    const finish = (up) => {
      if (settled) return;
      settled = true;
      probeCache = { at: Date.now(), up };
      socket.destroy();
      resolve(up);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

async function decide() {
  const mode = readMode();
  if (mode === 'direct') return { mode, route: 'direct' };
  if (mode === 'clash') return { mode, route: 'clash' };
  const up = await probeClash();
  return { mode, route: up ? 'clash' : 'direct' };
}

function splitHostPort(authority) {
  const trimmed = authority.trim();
  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    return {
      host: trimmed.slice(1, end),
      port: Number(trimmed.slice(end + 1).replace(/^:/, '')) || 443,
    };
  }
  const idx = trimmed.lastIndexOf(':');
  if (idx < 0) return { host: trimmed, port: 443 };
  return { host: trimmed.slice(0, idx), port: Number(trimmed.slice(idx + 1)) || 443 };
}

function pipeBoth(a, b) {
  a.on('error', () => b.destroy());
  b.on('error', () => a.destroy());
  a.pipe(b);
  b.pipe(a);
}

const server = http.createServer((req, res) => {
  let target;
  try {
    target = new URL(req.url);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' });
    res.end('dsh-proxy-switch: absolute-form URL required');
    return;
  }

  decide()
    .then(({ route, mode }) => {
      const headers = { ...req.headers, host: target.host };
      const upstream = route === 'clash'
        ? http.request({
            host: CLASH_HOST,
            port: CLASH_PORT,
            method: req.method,
            path: req.url, // absolute form, as a proxy expects
            headers,
          })
        : http.request({
            host: target.hostname,
            port: Number(target.port) || 80,
            method: req.method,
            path: `${target.pathname}${target.search}`,
            headers,
          });
      upstream.on('response', (upRes) => {
        res.writeHead(upRes.statusCode || 502, upRes.headers);
        upRes.pipe(res);
      });
      upstream.on('error', (error) => {
        log(`http ${req.method} ${target.href} via ${route}/${mode} failed: ${error.message}`);
        if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
        res.end('dsh-proxy-switch: upstream error');
      });
      req.pipe(upstream);
    })
    .catch((error) => {
      log(`http decide failed: ${error.message}`);
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('dsh-proxy-switch: internal error');
    });
});

server.on('connect', (req, clientSocket, head) => {
  const { host, port } = splitHostPort(req.url || '');
  decide()
    .then(({ route, mode }) => {
      const upstream = route === 'clash'
        ? net.connect({ host: CLASH_HOST, port: CLASH_PORT })
        : net.connect({ host, port });

      upstream.once('connect', () => {
        if (route === 'clash') {
          // Forward our own CONNECT to Clash; it expects the authority form.
          upstream.write(`CONNECT ${req.url} HTTP/1.1\r\nHost: ${req.url}\r\n\r\n`);
        } else {
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        }
        if (head && head.length) upstream.write(head);
        pipeBoth(clientSocket, upstream);
        log(`connect ${req.url} via ${route}/${mode}`);
      });
      upstream.once('error', (error) => {
        log(`connect ${req.url} via ${route}/${mode} failed: ${error.message}`);
        try { clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); } catch { /* ignore */ }
      });
    })
    .catch((error) => {
      log(`connect decide failed: ${error.message}`);
      try { clientSocket.end('HTTP/1.1 500 Internal Error\r\n\r\n'); } catch { /* ignore */ }
    });
  clientSocket.on('error', () => { /* client vanished */ });
});

server.on('error', (error) => {
  log(`server error: ${error.message}`);
  // Another router instance owns the port; let it serve and exit quietly.
  if (error.code === 'EADDRINUSE') process.exit(0);
});

server.listen(PORT, '127.0.0.1', () => {
  log(`router listening on 127.0.0.1:${PORT} (clash ${CLASH_HOST}:${CLASH_PORT}, mode file ${MODE_FILE})`);
});

process.on('uncaughtException', (error) => log(`uncaught: ${error.stack || error.message}`));
process.on('unhandledRejection', (reason) => log(`unhandled: ${String(reason)}`));

// Self-supervision: exit when the DSH host process that owns us is gone, so
// the router never outlives the harness and never blocks a restart.
const PARENT_PID = Number(process.env.PROXY_ROUTER_PARENT_PID || 0);

function ownerPid() {
  if (PARENT_PID > 0) return PARENT_PID;
  try {
    const value = Number(fs.readFileSync(PARENT_FILE, 'utf8').trim());
    return Number.isInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

setInterval(() => {
  const pid = ownerPid();
  if (!pid) return;
  try {
    process.kill(pid, 0);
  } catch {
    log(`owner process ${pid} gone, exiting`);
    process.exit(0);
  }
}, 2000).unref();

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    log(`received ${signal}, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  });
}
