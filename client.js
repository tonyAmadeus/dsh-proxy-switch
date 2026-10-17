window.__ModuleLoader__.load({
  id: 'dsh-proxy-switch',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const dictionaries = {
      zh: {
        entry: '代理',
        title: '出站代理开关',
        auto: '自动',
        direct: '直连',
        clash: '走 Clash',
        autoHint: 'Clash 在线就走 Clash，不在线就直连',
        directHint: '一律直连（Clash 关着时用这个）',
        clashHint: '一律走 Clash（不自动回退）',
        clashUp: 'Clash 在线',
        clashDown: 'Clash 未运行',
        routerUp: '路由器在线',
        routerDown: '路由器离线',
        close: '关闭',
        failed: '切换失败',
      },
      en: {
        entry: 'Proxy',
        title: 'Outbound proxy switch',
        auto: 'Auto',
        direct: 'Direct',
        clash: 'Via Clash',
        autoHint: 'Use Clash when reachable, direct otherwise',
        directHint: 'Always connect directly',
        clashHint: 'Always go through Clash (no fallback)',
        clashUp: 'Clash online',
        clashDown: 'Clash not running',
        routerUp: 'Router online',
        routerDown: 'Router offline',
        close: 'Close',
        failed: 'Switch failed',
      },
    };
    return {
      inject: ['slots', 'locale', 'connection'],
      apply(ctx) {
        const lifetime = new AbortController();
        ctx.effect(() => () => lifetime.abort());
        const call = async (method, payload = {}) => {
          const reply = await ctx.connection.rpc.call('/proxy-switch', method, payload, lifetime.signal);
          if (!reply.ok) throw new Error(reply.error?.message || 'proxy switch failed');
          return reply.value;
        };

        function ProxySwitchDock(props) {
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
            } catch (err) {
              if (mounted.current) setError(err.message);
            }
          };

          React.useEffect(() => {
            if (!open) return undefined;
            refresh();
            const timer = setInterval(refresh, 3000);
            return () => clearInterval(timer);
          }, [open]);

          const choose = async (next) => {
            if (busy) return;
            setBusy(true);
            setError('');
            try {
              const result = await call('setMode', { mode: next });
              if (!mounted.current) return;
              setStatus(result);
              setMode(result.mode);
            } catch (err) {
              if (mounted.current) setError(err.message || props.t('failed'));
            } finally {
              if (mounted.current) setBusy(false);
            }
          };

          const button = {
            border: '1px solid var(--dsw-alias-border-primary, #686b73)',
            borderRadius: 6,
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            cursor: 'pointer',
            padding: '3px 8px',
          };
          const modeButton = (value, label, hint) => h('button',
            {
              type: 'button',
              key: value,
              disabled: busy,
              onClick: () => choose(value),
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
            `${mode === value ? '● ' : '○ '}${label}`,
            h('span', { style: { display: 'block', fontSize: 10, color: 'var(--dsw-alias-label-tertiary)', marginTop: 2 } }, hint));

          const label = { auto: props.t('auto'), direct: props.t('direct'), clash: props.t('clash') }[mode] || mode;

          return h('span', {
            'data-proxy-switch': 'entry',
            style: { position: 'relative', display: 'inline-flex', alignItems: 'center', fontSize: 11, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap' },
          },
            h('button', {
              type: 'button',
              onClick: () => setOpen(!open),
              'aria-expanded': open,
              'aria-label': props.t('title'),
              style: { ...button, border: 0, padding: '1px 6px' },
            }, '🌐 ', label),
            open ? h('section', {
              'aria-label': props.t('title'),
              style: {
                position: 'absolute', bottom: 28, right: 0, width: 250, boxSizing: 'border-box',
                maxWidth: 'calc(100vw - 32px)', whiteSpace: 'normal', padding: 14,
                border: '1px solid var(--dsw-alias-border-primary, #686b73)', borderRadius: 12,
                background: 'var(--dsw-alias-background-primary, #202124)', color: 'var(--dsw-alias-label-primary, #eee)',
                boxShadow: '0 8px 28px #0005', zIndex: 30,
              },
            },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 } },
                h('strong', null, props.t('title')),
                h('button', { type: 'button', onClick: () => setOpen(false), style: button, 'aria-label': props.t('close') }, '×')),
              modeButton('auto', props.t('auto'), props.t('autoHint')),
              modeButton('direct', props.t('direct'), props.t('directHint')),
              modeButton('clash', props.t('clash'), props.t('clashHint')),
              h('p', { style: { margin: '10px 0 0', fontSize: 10, color: 'var(--dsw-alias-label-tertiary)' } },
                `${status?.clashUp ? props.t('clashUp') : props.t('clashDown')} · ${status?.routerUp ? props.t('routerUp') : props.t('routerDown')}`),
              error ? h('p', { role: 'alert', style: { color: '#ee9b8e', margin: '6px 0 0' } }, error) : null,
            ) : null);
        }

        ctx.effect(() => ctx.locale.register('dshProxySwitch', dictionaries));
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'dsh-proxy-switch',
          order: 31,
          locale: 'dshProxySwitch',
        }, ProxySwitchDock));
      },
    };
  },
});
