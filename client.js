window.__ModuleLoader__.load({
  id: 'dsh-proxy-switch',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'dshProxySwitch';

    const dictionaries = {
      zh: {
        nav: '代理',
        title: '出站代理',
        desc: 'DSH 的代理地址在启动时固定为本地路由器（127.0.0.1:17897）。这里选择路由器把流量发到哪里，切换即时生效，不需要重启。',
        modeLabel: '出口模式',
        auto: '自动',
        direct: '直连',
        clash: '走 Clash',
        autoHint: 'Clash 在线就走 Clash，不在线就直连',
        directHint: '一律直连（Clash 关着时用这个）',
        clashHint: '一律走 Clash（不自动回退）',
        statusLabel: '运行状态',
        current: '当前',
        clashUp: 'Clash 在线',
        clashDown: 'Clash 未运行',
        routerUp: '路由器在线',
        routerDown: '路由器离线',
        dockToggle: '在聊天框下方显示插件按钮',
        dockToggleHint: '关闭后聊天区不再显示 🌐 按钮，只保留设置里的这一页。',
        failed: '操作失败',
      },
      en: {
        nav: 'Proxy',
        title: 'Outbound proxy',
        desc: 'DSH pins its proxy to a local router (127.0.0.1:17897) at startup. Choose where that router sends traffic; changes apply immediately, no restart.',
        modeLabel: 'Exit mode',
        auto: 'Auto',
        direct: 'Direct',
        clash: 'Via Clash',
        autoHint: 'Use Clash when reachable, direct otherwise',
        directHint: 'Always connect directly',
        clashHint: 'Always go through Clash (no fallback)',
        statusLabel: 'Status',
        current: 'Current',
        clashUp: 'Clash online',
        clashDown: 'Clash not running',
        routerUp: 'Router online',
        routerDown: 'Router offline',
        dockToggle: 'Show plugin button under the composer',
        dockToggleHint: 'When off, the 🌐 button disappears from the chat area and only this settings page remains.',
        failed: 'Operation failed',
      },
    };

    // Shared UI state across the two slots (settings section + composer dock).
    // The host persists `dock` in $DSH_HOME/proxy-ui.json.
    const uiState = { ready: false, dock: true };
    const subscribers = new Set();
    const publish = (patch) => {
      Object.assign(uiState, patch);
      const snapshot = { ...uiState };
      for (const notify of [...subscribers]) notify(snapshot);
    };
    const useUiState = () => {
      const [state, setState] = React.useState({ ...uiState });
      React.useEffect(() => {
        const notify = (snapshot) => setState(snapshot);
        subscribers.add(notify);
        return () => subscribers.delete(notify);
      }, []);
      return state;
    };

    return {
      inject: ['slots', 'locale', 'connection'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, dictionaries));
        const t = ctx.locale.bind(NS);
        const lifetime = new AbortController();
        ctx.effect(() => () => lifetime.abort());
        const call = async (method, payload = {}) => {
          const reply = await ctx.connection.rpc.call('/proxy-switch', method, payload, lifetime.signal);
          if (!reply.ok) throw new Error(reply.error?.message || 'proxy switch failed');
          return reply.value;
        };

        const styles = {
          field: { display: 'flex', flexDirection: 'column', gap: 6 },
          label: { fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-label-primary, #eee)' },
          hint: { fontSize: 11, lineHeight: 1.6, color: 'var(--dsw-alias-label-tertiary)' },
          row: { display: 'flex', flexWrap: 'wrap', gap: 8 },
          modeButton: {
            border: '1px solid var(--dsw-alias-border-primary, #686b73)',
            borderRadius: 8,
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            cursor: 'pointer',
            padding: '8px 16px',
            textAlign: 'left',
            minWidth: 170,
          },
          pill: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 999,
            border: '1px solid var(--dsw-alias-border-primary, #686b73)',
            fontSize: 11,
            color: 'var(--dsw-alias-label-secondary)',
          },
          dot: (up) => ({
            width: 6,
            height: 6,
            borderRadius: 999,
            background: up ? '#4ade80' : '#f87171',
            flex: '0 0 auto',
          }),
          divider: { height: 1, background: 'var(--dsw-alias-border-primary, #686b73)', opacity: 0.35, margin: '18px 0' },
          switchTrack: (on) => ({
            position: 'relative',
            width: 38,
            height: 22,
            borderRadius: 999,
            border: '1px solid var(--dsw-alias-border-primary, #686b73)',
            background: on ? 'var(--dsw-alias-accent-primary, #4b9cd3)' : 'transparent',
            cursor: 'pointer',
            padding: 0,
            flex: '0 0 auto',
          }),
          switchKnob: (on) => ({
            position: 'absolute',
            top: 2,
            left: on ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: on ? '#fff' : 'var(--dsw-alias-label-tertiary, #999)',
            transition: 'left 120ms ease',
          }),
        };

        function ModeGroup(props) {
          const tr = props.t;
          const mode = props.mode;
          const onPick = props.onPick;
          const busy = props.busy;
          const item = (value, label, hint) => h('button',
            {
              type: 'button',
              key: value,
              disabled: busy,
              onClick: () => onPick(value),
              title: hint,
              style: {
                ...styles.modeButton,
                fontWeight: mode === value ? 600 : 400,
                borderColor: mode === value ? 'var(--dsw-alias-border-accent, #4b9cd3)' : 'var(--dsw-alias-border-primary, #686b73)',
                background: mode === value ? 'var(--dsw-alias-background-primary, #2a2b2f)' : 'transparent',
                opacity: busy ? 0.6 : 1,
              },
            },
            `${mode === value ? '● ' : '○ '}${label}`,
            h('span', { style: { ...styles.hint, display: 'block', marginTop: 3 } }, hint));
          return h('div', { style: styles.row },
            item('auto', tr('auto'), tr('autoHint')),
            item('direct', tr('direct'), tr('directHint')),
            item('clash', tr('clash'), tr('clashHint')));
        }

        function StatusRow(props) {
          const tr = props.t;
          const status = props.status;
          if (!status) return null;
          return h('div', { style: styles.row },
            h('span', { style: styles.pill }, h('span', { style: styles.dot(status.clashUp) }), status.clashUp ? tr('clashUp') : tr('clashDown')),
            h('span', { style: styles.pill }, h('span', { style: styles.dot(status.routerUp) }), status.routerUp ? tr('routerUp') : tr('routerDown')));
        }

        // ---------- Settings section ----------
        function ProxySwitchSection(props) {
          const tr = props.t || t;
          const ui = useUiState();
          const [mode, setMode] = React.useState('auto');
          const [status, setStatus] = React.useState(null);
          const [error, setError] = React.useState('');
          const [busy, setBusy] = React.useState(false);
          const [savingDock, setSavingDock] = React.useState(false);
          const mounted = React.useRef(true);
          React.useEffect(() => {
            mounted.current = true;
            return () => { mounted.current = false; };
          }, []);

          const refresh = async () => {
            try {
              const next = await call('status');
              if (!mounted.current) return;
              setStatus(next);
              setMode(next.mode);
              setError('');
              publish({ ready: true, dock: next.dock !== false });
            } catch (err) {
              if (mounted.current) setError(err.message);
            }
          };

          React.useEffect(() => {
            refresh();
          }, []);

          const pickMode = async (next) => {
            if (busy) return;
            setBusy(true);
            setError('');
            try {
              const result = await call('setMode', { mode: next });
              if (!mounted.current) return;
              setStatus(result);
              setMode(result.mode);
            } catch (err) {
              if (mounted.current) setError(err.message || tr('failed'));
            } finally {
              if (mounted.current) setBusy(false);
            }
          };

          const toggleDock = async () => {
            if (savingDock) return;
            const next = !ui.dock;
            publish({ dock: next });
            setSavingDock(true);
            setError('');
            try {
              await call('setDock', { dock: next });
            } catch (err) {
              publish({ dock: !next });
              if (mounted.current) setError(err.message || tr('failed'));
            } finally {
              if (mounted.current) setSavingDock(false);
            }
          };

          return h('section', { style: { padding: '8px 0 28px', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 } },
            h('header', null,
              h('h2', { style: { margin: '0 0 6px', fontSize: 16, fontWeight: 600 } }, tr('title')),
              h('p', { style: { margin: 0, fontSize: 12, lineHeight: 1.7, color: 'var(--dsw-alias-label-secondary)' } }, tr('desc'))),
            h('div', { style: styles.field },
              h('span', { style: styles.label }, tr('modeLabel')),
              h(ModeGroup, { t: tr, mode, busy, onPick: pickMode })),
            h('div', { style: styles.field },
              h('span', { style: styles.label }, tr('statusLabel')),
              h(StatusRow, { t: tr, status })),
            h('div', { style: styles.divider }),
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 } },
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                h('span', { style: styles.label }, tr('dockToggle')),
                h('span', { style: styles.hint }, tr('dockToggleHint'))),
              h('button', {
                type: 'button',
                role: 'switch',
                'aria-checked': ui.dock,
                'aria-label': tr('dockToggle'),
                disabled: savingDock,
                onClick: toggleDock,
                style: styles.switchTrack(ui.dock),
              }, h('span', { style: styles.switchKnob(ui.dock) }))),
            error ? h('p', { role: 'alert', style: { color: '#ee9b8e', margin: 0, fontSize: 12 } }, error) : null);
        }

        // ---------- Composer dock (optional floating switch) ----------
        function ProxySwitchDock(props) {
          const tr = props.t || t;
          const ui = useUiState();
          const [open, setOpen] = React.useState(false);
          const [mode, setMode] = React.useState('auto');
          const [status, setStatus] = React.useState(null);
          const [error, setError] = React.useState('');
          const [busy, setBusy] = React.useState(false);
          const mounted = React.useRef(true);
          React.useEffect(() => {
            mounted.current = true;
            return () => { mounted.current = false; };
          }, []);

          const refresh = async () => {
            try {
              const next = await call('status');
              if (!mounted.current) return;
              setStatus(next);
              setMode(next.mode);
              setError('');
              publish({ ready: true, dock: next.dock !== false });
            } catch (err) {
              if (mounted.current) setError(err.message);
            }
          };

          React.useEffect(() => {
            refresh();
          }, []);

          React.useEffect(() => {
            if (!open) return undefined;
            const timer = setInterval(refresh, 3000);
            return () => clearInterval(timer);
          }, [open]);

          const pickMode = async (next) => {
            if (busy) return;
            setBusy(true);
            setError('');
            try {
              const result = await call('setMode', { mode: next });
              if (!mounted.current) return;
              setStatus(result);
              setMode(result.mode);
            } catch (err) {
              if (mounted.current) setError(err.message || tr('failed'));
            } finally {
              if (mounted.current) setBusy(false);
            }
          };

          if (!ui.ready || !ui.dock) return null;

          const button = {
            border: '1px solid var(--dsw-alias-border-primary, #686b73)',
            borderRadius: 6,
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            cursor: 'pointer',
            padding: '3px 8px',
          };
          const label = { auto: tr('auto'), direct: tr('direct'), clash: tr('clash') }[mode] || mode;
          const entry = (value, text, hint) => h('button',
            {
              type: 'button',
              key: value,
              disabled: busy,
              onClick: () => pickMode(value),
              title: hint,
              style: {
                ...button,
                display: 'block',
                width: '100%',
                textAlign: 'left',
                marginTop: 6,
                padding: '6px 10px',
                fontWeight: mode === value ? 600 : 400,
                background: mode === value ? 'var(--dsw-alias-background-secondary, #2a2b2f)' : 'transparent',
                opacity: busy ? 0.6 : 1,
              },
            },
            `${mode === value ? '● ' : '○ '}${text}`,
            h('span', { style: { display: 'block', fontSize: 10, color: 'var(--dsw-alias-label-tertiary)', marginTop: 2 } }, hint));

          return h('span', {
            'data-proxy-switch': 'entry',
            style: { position: 'relative', display: 'inline-flex', alignItems: 'center', fontSize: 11, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap' },
          },
            h('button', {
              type: 'button',
              onClick: () => setOpen(!open),
              'aria-expanded': open,
              'aria-label': tr('title'),
              style: { ...button, border: 0, padding: '1px 6px' },
            }, '🌐 ', label),
            open ? h('section', {
              'aria-label': tr('title'),
              style: {
                position: 'absolute', bottom: 28, right: 0, width: 252, boxSizing: 'border-box',
                maxWidth: 'calc(100vw - 32px)', whiteSpace: 'normal', padding: 14,
                border: '1px solid var(--dsw-alias-border-primary, #686b73)', borderRadius: 12,
                background: 'var(--dsw-alias-background-primary, #202124)', color: 'var(--dsw-alias-label-primary, #eee)',
                boxShadow: '0 8px 28px #0005', zIndex: 30,
              },
            },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 } },
                h('strong', null, tr('title')),
                h('button', { type: 'button', onClick: () => setOpen(false), style: button, 'aria-label': 'close' }, '×')),
              entry('auto', tr('auto'), tr('autoHint')),
              entry('direct', tr('direct'), tr('directHint')),
              entry('clash', tr('clash'), tr('clashHint')),
              h('div', { style: { margin: '10px 0 0' } }, h(StatusRow, { t: tr, status })),
              error ? h('p', { role: 'alert', style: { color: '#ee9b8e', margin: '6px 0 0', fontSize: 11 } }, error) : null) : null);
        }

        ctx.slots.inject('settings.section', function* () {
          yield ctx.slots.register({
            name: 'settings.section',
            id: 'local-proxy-switch',
            order: 60,
            label: () => t('nav'),
            inject: () => ({ t }),
          }, ProxySwitchSection);
        });

        ctx.slots.inject('conversation.composer.dock', function* () {
          yield ctx.slots.register({
            name: 'conversation.composer.dock',
            id: 'local-proxy-switch-dock',
            order: 31,
            inject: () => ({ t }),
          }, ProxySwitchDock);
        });
      },
    };
  },
});
