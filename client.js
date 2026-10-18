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
        desc: 'DSH 的代理地址在启动时固定为本地路由器（127.0.0.1:17897），这里选择路由器把流量发到哪里。切换即时生效，不需要重启。',
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
        failed: '切换失败',
        current: '当前',
      },
      en: {
        nav: 'Proxy',
        title: 'Outbound proxy',
        desc: 'DSH pins its proxy to a local router (127.0.0.1:17897) at startup. Choose where that router sends traffic. Changes apply immediately, no restart.',
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
        failed: 'Switch failed',
        current: 'Current',
      },
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

        function ProxySwitchSection(props) {
          const tr = props.t || t;
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
            refresh();
            const timer = setInterval(refresh, 3000);
            return () => clearInterval(timer);
          }, []);

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
              if (mounted.current) setError(err.message || tr('failed'));
            } finally {
              if (mounted.current) setBusy(false);
            }
          };

          const button = {
            border: '1px solid var(--dsw-alias-border-primary, #686b73)',
            borderRadius: 8,
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            cursor: 'pointer',
            padding: '8px 14px',
            textAlign: 'left',
            minWidth: 190,
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
                fontWeight: mode === value ? 600 : 400,
                borderColor: mode === value ? 'var(--dsw-alias-border-accent, #4b9cd3)' : 'var(--dsw-alias-border-primary, #686b73)',
                background: mode === value ? 'var(--dsw-alias-background-primary, #2a2b2f)' : 'transparent',
                opacity: busy ? 0.6 : 1,
              },
            },
            `${mode === value ? '● ' : '○ '}${label}`,
            h('span', { style: { display: 'block', fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', marginTop: 3 } }, hint));

          return h('section', { style: { padding: '8px 0 24px', maxWidth: 760 } },
            h('h2', { style: { margin: '0 0 6px', fontSize: 16, fontWeight: 600 } }, tr('title')),
            h('p', { style: { margin: '0 0 16px', fontSize: 12, lineHeight: 1.6, color: 'var(--dsw-alias-label-secondary)' } }, tr('desc')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10 } },
              modeButton('auto', tr('auto'), tr('autoHint')),
              modeButton('direct', tr('direct'), tr('directHint')),
              modeButton('clash', tr('clash'), tr('clashHint'))),
            h('div', {
              style: {
                marginTop: 16,
                padding: '10px 14px',
                border: '1px solid var(--dsw-alias-border-primary, #686b73)',
                borderRadius: 10,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px 18px',
                fontSize: 11,
                color: 'var(--dsw-alias-label-tertiary)',
              },
            },
              h('span', null, `${tr('current')}: ${mode}`),
              h('span', null, status?.clashUp ? tr('clashUp') : tr('clashDown')),
              h('span', null, status?.routerUp ? tr('routerUp') : tr('routerDown')),
              status?.modeFile ? h('span', { style: { wordBreak: 'break-all' } }, status.modeFile) : null),
            error ? h('p', { role: 'alert', style: { color: '#ee9b8e', margin: '10px 0 0', fontSize: 12 } }, error) : null);
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
      },
    };
  },
});
