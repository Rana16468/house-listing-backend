const systemArtc = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thikana — Platform Health</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Hind+Siliguri:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #e9edef;
            --paper: #f7f9fa;
            --ink: #16232e;
            --ink-2: #4a5b69;
            --ink-3: #70808d;
            --line: #d3dbe0;
            --blue: #2f5d7c;
            --blue-soft: #6fa3c4;
            --lit: #f2b53a;
            --ok: #2f8060;
            --warn: #b7791f;
            --bad: #b4432f;
            --facade: #16232e;
            --facade-glass: #1f3244;
            --display: 'Bricolage Grotesque', 'Hind Siliguri', system-ui, sans-serif;
            --body: 'Hind Siliguri', system-ui, -apple-system, 'Segoe UI', sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background: var(--bg);
            color: var(--ink);
            font-family: var(--body);
            font-size: 1rem;
            line-height: 1.5;
            min-height: 100vh;
        }

        :focus-visible { outline: 3px solid var(--blue); outline-offset: 2px; }

        .page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 2rem 4rem;
        }

        /* ── Header ── */
        .masthead {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            flex-wrap: wrap;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--line);
            margin-bottom: 1.75rem;
        }

        .wordmark { display: flex; align-items: baseline; gap: 0.75rem; }

        .wordmark-en {
            font-family: var(--display);
            font-weight: 700;
            font-size: 1.9rem;
            letter-spacing: -0.02em;
        }

        .wordmark-bn {
            font-size: 1.15rem;
            font-weight: 500;
            color: var(--ink-3);
        }

        .status {
            display: flex;
            align-items: center;
            gap: 0.7rem;
            background: var(--paper);
            border: 1px solid var(--line);
            border-radius: 100px;
            padding: 0.5rem 1.1rem 0.5rem 0.9rem;
            max-width: 100%;
        }

        .status-dot {
            width: 10px; height: 10px;
            border-radius: 50%;
            background: var(--ink-3);
            flex: none;
        }
        .status.ok   .status-dot { background: var(--ok); }
        .status.warn .status-dot { background: var(--warn); }
        .status.bad  .status-dot { background: var(--bad); }

        .status-text { font-weight: 500; font-size: 0.95rem; }
        .status-time { color: var(--ink-3); font-size: 0.85rem; white-space: nowrap; }

        /* ── Panels ── */
        .panel {
            background: var(--paper);
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 1.5rem;
        }

        .panel h2 {
            font-family: var(--display);
            font-weight: 700;
            font-size: 1.1rem;
            letter-spacing: -0.01em;
            margin-bottom: 1rem;
        }

        .grid { display: grid; gap: 1.25rem; }
        .hero { grid-template-columns: 1.4fr 1fr; margin-bottom: 1.25rem; }
        .pair { grid-template-columns: 1fr 1fr; margin-top: 1.25rem; }

        /* ── Building (listings) ── */
        .facade {
            background: var(--facade);
            border-color: var(--facade);
            color: #f2f5f7;
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 220px);
            grid-template-areas:
                "head head"
                "building legend";
            gap: 1.25rem 2rem;
            align-items: end;
        }

        .facade h2 { color: #f2f5f7; margin-bottom: 0.25rem; }
        .facade-head { grid-area: head; }
        .facade-head p { color: #a9b8c4; font-size: 0.95rem; }
        .facade-head strong {
            font-family: var(--display);
            font-size: 2.6rem;
            font-weight: 700;
            color: #fff;
            letter-spacing: -0.02em;
            margin-right: 0.35rem;
        }

        .building { grid-area: building; }

        .windows {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 8px;
            padding: 18px;
            background: var(--facade-glass);
            border-radius: 10px 10px 0 0;
        }

        .w {
            aspect-ratio: 3 / 4;
            border-radius: 3px;
            background: rgba(255,255,255,0.06);
            transition: background 0.5s ease, box-shadow 0.5s ease;
            transition-delay: calc(var(--k) * 22ms);
        }
        .windows.settled .w { transition-delay: 0ms; }

        .w.rented    { background: var(--lit); box-shadow: 0 0 14px rgba(242,181,58,0.45); }
        .w.available { background: transparent; box-shadow: inset 0 0 0 2px var(--blue-soft); }
        .w.pending   { background: repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0 3px, transparent 3px 7px); }

        .door {
            width: 46px; height: 58px;
            margin: 0 auto;
            background: var(--blue);
            border-radius: 23px 23px 0 0;
        }

        .legend { grid-area: legend; list-style: none; display: grid; gap: 0.85rem; }

        .legend li {
            display: grid;
            grid-template-columns: 22px 1fr auto;
            align-items: center;
            gap: 0.6rem;
            font-size: 0.95rem;
            color: #c9d4dc;
        }

        .legend b {
            font-family: var(--display);
            font-size: 1.15rem;
            font-weight: 700;
            color: #fff;
        }

        .sw { width: 16px; height: 20px; border-radius: 3px; display: block; }
        .sw.rented    { background: var(--lit); }
        .sw.available { box-shadow: inset 0 0 0 2px var(--blue-soft); }
        .sw.pending   { background: repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 3px, transparent 3px 7px); }

        /* ── Today ── */
        .today { display: flex; flex-direction: column; }
        .today-list { display: grid; gap: 0; flex: 1; }

        .today-item {
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 1.1rem 0;
            border-bottom: 1px solid var(--line);
        }
        .today-item:first-child { padding-top: 0; }
        .today-item:last-child  { border-bottom: none; padding-bottom: 0; }

        .big {
            font-family: var(--display);
            font-weight: 700;
            font-size: 2.6rem;
            letter-spacing: -0.02em;
            line-height: 1.05;
        }
        .today-label { color: var(--ink-2); font-size: 0.95rem; }

        /* ── Server meters ── */
        .meters { display: grid; grid-template-columns: repeat(4, 1fr); }

        .meter { padding: 0 1.5rem; border-left: 1px solid var(--line); }
        .meter:first-child { padding-left: 0; border-left: none; }
        .meter:last-child  { padding-right: 0; }

        .meter-label { color: var(--ink-2); font-size: 0.9rem; }

        .meter-value {
            font-family: var(--display);
            font-weight: 700;
            font-size: 1.9rem;
            letter-spacing: -0.02em;
            line-height: 1.2;
            margin-top: 0.15rem;
        }

        .meter-sub {
            color: var(--ink-3);
            font-size: 0.85rem;
            margin-top: 0.15rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .bar {
            height: 6px;
            background: var(--line);
            border-radius: 3px;
            margin-top: 0.8rem;
            overflow: hidden;
        }
        .bar > div {
            height: 100%;
            width: 0%;
            background: var(--blue);
            border-radius: 3px;
            transition: width 0.8s ease, background 0.3s;
        }
        .bar > div.warn { background: var(--warn); }
        .bar > div.bad  { background: var(--bad); }

        /* ── Definition rows ── */
        .rows { display: grid; }

        .rows > div {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 1rem;
            padding: 0.75rem 0;
            border-bottom: 1px solid var(--line);
        }
        .rows > div:first-child { padding-top: 0; }
        .rows > div:last-child  { border-bottom: none; padding-bottom: 0; }

        .rows dt { color: var(--ink-2); }
        .rows dd {
            font-family: var(--display);
            font-weight: 700;
            font-size: 1.15rem;
        }
        .rows dd.ok  { color: var(--ok); }
        .rows dd.bad { color: var(--bad); }

        /* ── People split bar ── */
        .split {
            display: flex;
            height: 10px;
            border-radius: 5px;
            overflow: hidden;
            background: var(--line);
            margin: 0.25rem 0 1.25rem;
        }
        .split > div { height: 100%; transition: width 0.8s ease; }
        .split .tenants   { background: var(--blue); }
        .split .landlords { background: var(--lit); }

        .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 0.5rem; }
        .dot.tenants   { background: var(--blue); }
        .dot.landlords { background: var(--lit); }

        footer {
            margin-top: 2.5rem;
            color: var(--ink-3);
            font-size: 0.85rem;
            text-align: center;
        }

        /* ── Responsive ── */
        @media (max-width: 960px) {
            .hero, .pair { grid-template-columns: 1fr; }
            .meters { grid-template-columns: 1fr 1fr; row-gap: 1.75rem; }
            .meter:nth-child(3) { padding-left: 0; border-left: none; }
        }

        @media (max-width: 640px) {
            .page { padding: 1.25rem 1rem 3rem; }
            .facade {
                grid-template-columns: 1fr;
                grid-template-areas: "head" "building" "legend";
            }
            .meters { grid-template-columns: 1fr; }
            .meter { padding: 1rem 0 0; border-left: none; border-top: 1px solid var(--line); }
            .meter:first-child { padding-top: 0; border-top: none; }
            .status { border-radius: 14px; flex-wrap: wrap; }
        }

        @media (prefers-reduced-motion: reduce) {
            .w, .bar > div, .split > div { transition: none; }
        }
    </style>
</head>
<body>
    <div class="page">

        <header class="masthead">
            <div class="wordmark">
                <span class="wordmark-en">Thikana</span>
                <span class="wordmark-bn" lang="bn">ঠিকানা</span>
            </div>
            <div class="status" id="status" role="status" aria-live="polite">
                <span class="status-dot"></span>
                <span class="status-text" id="status-text">Connecting to the server…</span>
                <span class="status-time" id="status-time"></span>
            </div>
        </header>

        <!-- Listings + today -->
        <div class="grid hero">

            <section class="panel facade" aria-labelledby="h-listings">
                <div class="facade-head">
                    <h2 id="h-listings">Listings</h2>
                    <p><strong id="l-total">—</strong>active homes on Thikana</p>
                </div>

                <div class="building">
                    <div class="windows" id="windows" role="img" aria-label="Listings overview"></div>
                    <div class="door"></div>
                </div>

                <ul class="legend">
                    <li><i class="sw available"></i><span>Active listings</span><b id="l-available">—</b></li>
                    <li><i class="sw rented"></i><span>Rented status</span><b id="l-rented">—</b></li>
                    <li><i class="sw pending"></i><span>Approval status</span><b id="l-pending">—</b></li>
                </ul>
            </section>

            <section class="panel today" aria-labelledby="h-today">
                <h2 id="h-today">Today</h2>
                <div class="today-list">
                    <div class="today-item">
                        <div class="big" id="b-inquiries">—</div>
                        <div class="today-label">New listings today</div>
                    </div>
                    <div class="today-item">
                        <div class="big" id="b-visits">—</div>
                        <div class="today-label">Tenant inquiries</div>
                    </div>
                </div>
            </section>
        </div>

        <!-- Server -->
        <section class="panel" aria-labelledby="h-server">
            <h2 id="h-server">Server</h2>
            <div class="meters">
                <div class="meter">
                    <div class="meter-label">Memory</div>
                    <div class="meter-value" id="ram-val">—</div>
                    <div class="meter-sub" id="ram-sub">Loading…</div>
                    <div class="bar"><div id="ram-bar"></div></div>
                </div>
                <div class="meter">
                    <div class="meter-label">Disk</div>
                    <div class="meter-value" id="storage-val">—</div>
                    <div class="meter-sub" id="storage-sub">Loading…</div>
                    <div class="bar"><div id="storage-bar"></div></div>
                </div>
                <div class="meter">
                    <div class="meter-label">Processor load (1 min)</div>
                    <div class="meter-value" id="cpu-val">—</div>
                    <div class="meter-sub" id="cpu-sub" title="">Loading…</div>
                    <div class="bar"><div id="cpu-bar"></div></div>
                </div>
                <div class="meter">
                    <div class="meter-label">Running for</div>
                    <div class="meter-value" id="uptime-val">—</div>
                    <div class="meter-sub" id="os-platform">—</div>
                </div>
            </div>
        </section>

        <div class="grid pair">

            <!-- API -->
            <section class="panel" aria-labelledby="h-api">
                <h2 id="h-api">API traffic and health</h2>
                <dl class="rows">
                    <div><dt>Requests this minute</dt><dd id="hits-min">—</dd></div>
                    <div><dt>Requests this hour</dt><dd id="hits-hour">—</dd></div>
                    <div><dt>Average response time</dt><dd id="health-latency">—</dd></div>
                    <div><dt>Successful requests</dt><dd id="health-success">—</dd></div>
                    <div><dt>Failed requests this hour</dt><dd id="health-errors">—</dd></div>
                </dl>
            </section>

            <!-- People -->
            <section class="panel" aria-labelledby="h-people">
                <h2 id="h-people">Tenants and landlords</h2>
                <div class="split" id="split" role="img" aria-label="Share of tenants and landlords">
                    <div class="tenants" id="split-tenants"></div>
                    <div class="landlords" id="split-landlords"></div>
                </div>
                <dl class="rows">
                    <div><dt><span class="dot tenants"></span>Tenants</dt><dd id="u-tenants">Not connected</dd></div>
                    <div><dt><span class="dot landlords"></span>Landlords</dt><dd id="u-landlords">Not connected</dd></div>
                    <div><dt>All accounts</dt><dd id="u-total">Not connected</dd></div>
                    <div><dt>Verified accounts</dt><dd class="ok" id="u-verified">Not connected</dd></div>
                </dl>
            </section>
        </div>

        <footer>Thikana platform health. Metrics load when this page opens.</footer>
    </div>

    <script>
        var ENDPOINT = '/api/v1/monitor/metrics';
        var COLS = 8, ROWS = 6, TOTAL_WINDOWS = COLS * ROWS;

        var windowsEl = document.getElementById('windows');
        var windowEls = [];
        var firstRender = true;

        function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
        function hasNum(v) { return typeof v === 'number' && isFinite(v); }
        function fmt(v) { return num(v).toLocaleString('en-US'); }
        function fmtOptional(v) { return hasNum(v) ? fmt(v) : 'Not connected'; }
        function set(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }

        function buildWindows() {
            for (var i = 0; i < TOTAL_WINDOWS; i++) {
                var row = Math.floor(i / COLS);
                var col = i % COLS;
                var k = (ROWS - 1 - row) * COLS + col; // lights up from the bottom floor
                var w = document.createElement('span');
                w.className = 'w';
                w.style.setProperty('--k', k);
                w.dataset.k = k;
                windowsEl.appendChild(w);
                windowEls.push(w);
            }
        }

        function renderWindows(l) {
            var total = num(l.total);
            var rented = 0, avail = 0, pend = 0;
            if (total > 0) {
                rented = Math.round(num(l.rented) / total * TOTAL_WINDOWS);
                avail  = Math.round(num(l.available) / total * TOTAL_WINDOWS);
                pend   = Math.round(num(l.pending) / total * TOTAL_WINDOWS);
                while (rented + avail + pend > TOTAL_WINDOWS) {
                    if (avail > 0) avail--; else if (rented > 0) rented--; else pend--;
                }
            }
            windowEls.forEach(function (w) {
                var k = Number(w.dataset.k);
                var cls = 'w';
                if (k < rented) cls += ' rented';
                else if (k < rented + avail) cls += ' available';
                else if (k < rented + avail + pend) cls += ' pending';
                w.className = cls;
            });
            windowsEl.setAttribute('aria-label',
                fmtOptional(l.rented) + ' rented, ' + fmtOptional(l.available) + ' active and ' +
                fmtOptional(l.pending) + ' awaiting approval, out of ' + fmt(l.total) + ' listings');

            if (firstRender) {
                setTimeout(function () { windowsEl.classList.add('settled'); }, 1600);
            }
        }

        function setBar(id, percent) {
            var el = document.getElementById(id);
            if (!el) return;
            var p = Math.max(0, Math.min(100, num(percent)));
            el.style.width = p + '%';
            el.className = p >= 90 ? 'bad' : p >= 75 ? 'warn' : '';
        }

        function setStatus(state, text) {
            document.getElementById('status').className = 'status ' + state;
            set('status-text', text);
            set('status-time', 'Updated ' + new Date().toLocaleTimeString());
        }

        function evaluateHealth(d) {
            var issues = [];
            if (num(d.ram.percent) >= 85) issues.push('memory is above 85%');
            if (num(d.storage.percent) >= 90) issues.push('disk is above 90%');
            var cores = num(d.cpu.cores) || 1;
            if (num(d.cpu.load1m) / cores > 1) issues.push('processor is overloaded');
            if (num(d.health.successRatePercent) < 98) issues.push('more than 2% of requests are failing');

            if (issues.length === 0) {
                setStatus('ok', 'Everything is running normally');
            } else {
                var first = issues[0].charAt(0).toUpperCase() + issues[0].slice(1);
                var extra = issues.length > 1 ? ' (+' + (issues.length - 1) + ' more)' : '';
                setStatus('warn', first + extra);
            }
        }

        function render(d) {
            var l = d.listings || {};
            var u = d.users || {};
            var b = d.bookings || {};
            var h = d.health || {};
            d.ram = d.ram || {}; d.storage = d.storage || {}; d.cpu = d.cpu || {}; d.health = h;

            // Listings
            set('l-total', fmt(l.total));
            set('l-rented', fmtOptional(l.rented));
            set('l-available', fmtOptional(l.available));
            set('l-pending', fmtOptional(l.pending));
            renderWindows(l);

            // Today
            set('b-inquiries', fmt(l.today));
            set('b-visits', fmtOptional(b.inquiriesToday));

            // Server
            set('ram-val', num(d.ram.usedGB) + ' GB');
            set('ram-sub', num(d.ram.usedGB) + ' of ' + num(d.ram.totalGB) + ' GB in use');
            setBar('ram-bar', d.ram.percent);

            set('storage-val', num(d.storage.usedGB) + ' GB');
            set('storage-sub', num(d.storage.usedGB) + ' of ' + num(d.storage.totalGB) + ' GB in use');
            setBar('storage-bar', d.storage.percent);

            var cores = num(d.cpu.cores) || 1;
            set('cpu-val', num(d.cpu.load1m).toFixed(2));
            set('cpu-sub', (d.cpu.model || 'Unknown processor') + (d.cpu.cores ? ' (' + d.cpu.cores + ' cores)' : ''));
            document.getElementById('cpu-sub').title = d.cpu.model || '';
            setBar('cpu-bar', num(d.cpu.load1m) / cores * 100);

            var hrs = num(d.uptimeHours);
            set('uptime-val', hrs >= 48 ? Math.floor(hrs / 24) + ' days' : hrs + ' hours');
            set('os-platform', d.osPlatform || '—');

            // API
            set('hits-min', fmt(t.hitsMin));
            set('hits-hour', fmt(t.hitsHour));
            set('health-latency', num(h.avgLatencyMs) + ' ms');
            set('health-success', num(h.successRatePercent) + '%');
            set('health-errors', fmt(h.errorCount));
            var errEl = document.getElementById('health-errors');
            errEl.className = num(h.errorCount) > 0 ? 'bad' : 'ok';

            // People
            var tenants = num(u.tenants), landlords = num(u.landlords);
            var total = num(u.total) || (tenants + landlords);
            set('u-tenants', fmtOptional(u.tenants));
            set('u-landlords', fmtOptional(u.landlords));
            set('u-total', fmtOptional(u.total));
            set('u-verified', fmtOptional(u.verified));
            var denom = (tenants + landlords) || 1;
            document.getElementById('split-tenants').style.width = (tenants / denom * 100) + '%';
            document.getElementById('split-landlords').style.width = (landlords / denom * 100) + '%';

            evaluateHealth(d);
            firstRender = false;
        }

        async function fetchMetrics() {
            try {
                var res = await fetch(ENDPOINT, { headers: { 'Accept': 'application/json' } });
                if (!res.ok) {
                    setStatus('bad', 'Metrics request failed (' + res.status + '). Reload the page to retry.');
                    return;
                }
                render(await res.json());
            } catch (err) {
                console.error('Failed to fetch diagnostics:', err);
                setStatus('bad', 'Cannot reach the server. Reload the page to retry.');
            }
        }

        buildWindows();
        fetchMetrics();
    </script>
</body>
</html>`
}

export default systemArtc