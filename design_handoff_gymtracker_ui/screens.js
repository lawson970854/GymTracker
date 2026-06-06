/* GymTracker redesign — screen markup. Visual-only; mirrors real app structure. */

const I = {
  chev:   '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  back:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  more:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
  plus:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  trophy: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v4a6 6 0 0 1-12 0V4Z"/><path d="M6 6H3.5A1.5 1.5 0 0 0 2 7.5C2 10 4 11 6 11M18 6h2.5A1.5 1.5 0 0 1 22 7.5C22 10 20 11 18 11"/><path d="M9 14.5h6M12 14v3M9 20h6M10 17h4"/></svg>',
  dumbbell:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M3.5 9.5 2 11a1.5 1.5 0 0 0 0 2l3 3a1.5 1.5 0 0 0 2 0L8.5 14.5M15.5 9.5 17 8a1.5 1.5 0 0 1 2 0l3 3a1.5 1.5 0 0 1 0 2L20.5 14.5"/></svg>',
  pin:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  home:   '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5"/></svg>',
  tag:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 11 3l9 5v8l-9 5-8-4.5Z"/></svg>',
  chart:  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16M8 16l3.5-4 3 2.5L20 8"/></svg>',
  cal:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>',
  user:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3-5.6 7-5.6s7 2 7 5.6"/></svg>',
  cam:    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3"/></svg>',
  pencil: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5l5 5M4 20l1-4L16 5l3 3L8 19l-4 1Z"/></svg>',
  pencilB:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5l5 5M4 20l1-4L16 5l3 3L8 19l-4 1Z"/></svg>',
  trash:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/></svg>',
  list:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
};

function statusBar(){
  return `<div class="status">
    <span>9:41</span>
    <span class="sig">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.5c2.3 0 4.4.9 6 2.4l-1.4 1.4A6.6 6.6 0 0 0 8 5.4 6.6 6.6 0 0 0 3.4 6.3L2 4.9A8.6 8.6 0 0 1 8 2.5Zm0 3.6c1.3 0 2.5.5 3.4 1.4L8 11 4.6 7.5A4.8 4.8 0 0 1 8 6.1Z"/></svg>
      <svg width="26" height="13" viewBox="0 0 26 13" fill="none"><rect x="1" y="1" width="21" height="11" rx="3" stroke="currentColor" stroke-opacity=".4" stroke-width="1"/><rect x="3" y="3" width="16" height="7" rx="1.5" fill="currentColor"/><rect x="23.5" y="4.5" width="1.6" height="4" rx="1" fill="currentColor" fill-opacity=".5"/></svg>
    </span>
  </div>`;
}

/* ============================================================ MACHINE DETAIL */
const machine = `
<div class="body">
  <div class="nav">
    <div class="nav-back">${I.back}<span>乐刻·中关村</span></div>
    <div class="nav-icon-btn">${I.more}</div>
  </div>
  <div class="scroll" style="-webkit-mask-image:linear-gradient(to bottom,#000 92%,transparent);">
    <div class="page-kicker">器械记录</div>
    <div class="page-title" style="margin-bottom:16px;">高位下拉</div>

    <div class="pr">
      <div class="pr-top">
        <div class="pr-badge">${I.trophy}</div>
        <div class="pr-label">历史最佳</div>
      </div>
      <div class="pr-num">2,040<small>千克·次</small></div>
      <div class="pr-detail">68 千克 × 3 组（10 / 10 / 10 次） · 05-28</div>
    </div>

    <div class="spacer"></div>
    <div class="stat-row accent-num">
      <div class="stat"><b>24</b><span>训练记录</span></div>
      <div class="stat"><b>16</b><span>训练天数</span></div>
      <div class="stat"><b>38,200</b><span>总训练量</span></div>
    </div>

    <div class="spacer-lg"></div>
    <div class="card field-card">
      <div class="section-label" style="margin:0 0 14px;">本次训练</div>

      <div class="field-row" style="border-bottom:1px solid var(--hair-2); padding-bottom:14px;">
        <span class="field-label" style="margin:0;">日期</span>
        <span class="chip" style="background:var(--accent-soft);border-color:transparent;color:var(--accent-ink);">今天 · 06-06</span>
      </div>

      <div class="field-label" style="margin-top:16px;">重量（千克）</div>
      <div class="stepper-input">
        <span class="val">70</span>
        <span class="arrow" style="color:var(--faint);">▾</span>
      </div>

      <div class="field-label" style="margin-top:16px; display:flex; justify-content:space-between; align-items:center;">
        <span>每组次数</span>
        <span style="display:flex;align-items:center;gap:10px;">
          <button class="round-btn" style="width:34px;height:34px;font-size:18px;">−</button>
          <b style="font-family:var(--font-num);color:var(--ink);font-size:14px;">3 组</b>
          <button class="round-btn" style="width:34px;height:34px;font-size:18px;">+</button>
        </span>
      </div>
      <div class="set-row"><span class="set-name">第 1 组</span><div class="set-pill"><b>10</b><span class="arrow">▾</span></div></div>
      <div class="set-row"><span class="set-name">第 2 组</span><div class="set-pill"><b>10</b><span class="arrow">▾</span></div></div>
      <div class="set-row"><span class="set-name">第 3 组</span><div class="set-pill"><b>10</b><span class="arrow">▾</span></div></div>

      <div style="text-align:center; font-size:12.5px; color:var(--accent-ink); font-weight:600; margin:12px 0 4px;">
        预计训练量 2,100 千克·次
      </div>
      <button class="btn btn-primary" style="margin-top:10px;">保存记录</button>
    </div>

    <div class="spacer-lg"></div>
    <div class="card chart-card">
      <div class="chart-head">
        <div class="chart-title">单项趋势</div>
        <div class="chart-meta">最近 8 次</div>
      </div>
      ${lineChart('m')}
    </div>

    <div class="spacer-lg"></div>
    <div class="card field-card">
      <div class="section-label" style="margin:0 0 6px;">历史记录</div>
      ${[['06-04','2,040','68 千克 × 3 组（10 / 10 / 10 次）'],
         ['06-01','1,920','64 千克 × 3 组（10 / 10 / 10 次）'],
         ['05-28','1,860','62 千克 × 3 组（10 / 10 / 10 次）'],
         ['05-24','1,750','58 千克 × 3 组（10 / 10 / 10 次）']]
        .map(([d,v,det])=>`<div class="hist"><div class="hist-top"><span class="hist-date">${d}</span><span class="hist-vol">${v} 千克·次</span></div><div class="hist-detail">${det}</div></div>`).join('')}
    </div>
    <div style="height:24px;"></div>
  </div>
</div>`;

/* ============================================================ HOME / GYM LIST */
const home = `
<div class="body">
  <div class="scroll pad-bottom">
    <div style="padding:6px 2px 16px;">
      <div class="page-title">我的健身房</div>
    </div>

    ${gymRow(I.pin,'乐刻运动 · 中关村','8 个器械','3 天前')}
    ${gymRow(I.pin,'威尔仕 · 国贸店','12 个器械','昨天')}

    <!-- swipe demo row -->
    <div class="swipe-demo">
      <div class="swipe-actions">
        <button class="swipe-act edit">${I.pencilB}<span>编辑</span></button>
        <button class="swipe-act del">${I.trash}<span>删除</span></button>
      </div>
      <div class="row swipe-card">
        <div class="row-icon">${I.pin}</div>
        <div class="row-main">
          <div class="row-title">出差 · 汉庭酒店健身房</div>
          <div class="row-sub">3 个器械 <span class="dot"></span> 上周</div>
        </div>
      </div>
    </div>

    ${gymRow(I.pin,'超级猩猩 · 望京','6 个器械','5 天前')}
    <div style="text-align:center; font-size:11.5px; color:var(--faint); margin-top:14px; letter-spacing:.3px;">← 左滑任意一项可编辑或删除</div>
  </div>

  <div class="fab-bar">
    <button class="btn btn-primary">${I.plus}添加健身房</button>
  </div>

  ${tabbar('rec')}
</div>`;

function gymRow(icon, title, sub, when){
  return `<div class="row">
    <div class="row-icon">${icon}</div>
    <div class="row-main">
      <div class="row-title">${title}</div>
      <div class="row-sub">${sub} <span class="dot"></span> ${when}</div>
    </div>
    ${I.chev}
  </div>`;
}

function tabbar(active){
  const tabs = [['rec','记录',I.list],['cat','分类',I.tag],['cal','日历',I.cal],['me','我的',I.user]];
  return `<div class="tabbar">${tabs.map(([k,label,icon])=>
    `<div class="tab ${k===active?'on':''}">${icon}<span>${label}</span></div>`).join('')}</div>`;
}

/* simple svg area line chart matching app's InteractiveLineChart look */
function lineChart(id, opts){
  opts = opts || {};
  const w = 318, h = 188, padL = 44, padR = 8, padT = 12, padB = 26;
  const data = opts.data || [1750,1860,1920,1810,1980,1900,2010,2040];
  const labels = opts.labels || ['05-12','','05-20','','05-28','','06-04',''];
  const cW = w-padL-padR, cH = h-padT-padB;
  const mn = Math.min(...data), mx = Math.max(...data), rg = (mx-mn)||1;
  const X = i => padL + (i/(data.length-1))*cW;
  const Y = v => padT + cH - ((v-mn)/rg)*cH;
  let line='', area='';
  data.forEach((v,i)=>{ const c=`${i?'L':'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)} `; line+=c; });
  area = line + `L${X(data.length-1).toFixed(1)},${padT+cH} L${padL},${padT+cH} Z`;
  const dots = data.map((v,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="2.6" fill="var(--accent)"/>`).join('');
  const grids = [mn, mn+rg/2, mx].map(v=>{
    const y=Y(v).toFixed(1);
    const lab = v>=1000 ? v.toLocaleString() : Math.round(v);
    return `<line x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="var(--hair)" stroke-width="1"/>
            <text x="${padL-6}" y="${(+y+3).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--faint)" font-family="var(--font-num)">${lab}</text>`;
  }).join('');
  const xlabs = labels.map((l,i)=> l?`<text x="${X(i).toFixed(1)}" y="${h-8}" text-anchor="middle" font-size="9" fill="var(--faint)" font-family="var(--font-num)">${l}</text>`:'').join('');
  // highlight last point
  const lv=data[data.length-1];
  const hl=`<circle cx="${X(data.length-1).toFixed(1)}" cy="${Y(lv).toFixed(1)}" r="5" fill="var(--accent)" stroke="var(--card)" stroke-width="2.5"/>`;
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" style="display:block;">
    <defs><linearGradient id="g_${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--accent)" stop-opacity="0.26"/>
      <stop offset="1" stop-color="var(--accent)" stop-opacity="0.01"/>
    </linearGradient></defs>
    ${grids}
    <path d="${area}" fill="url(#g_${id})"/>
    <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}${hl}${xlabs}
  </svg>`;
}

/* ============================================================ AUTH / LOGIN */
const auth = `
<div class="body">
  <div class="scroll" style="display:flex; flex-direction:column; justify-content:center; padding:0 34px;">
    <div style="text-align:center; margin-bottom:38px;">
      <div style="width:84px; height:84px; border-radius:24px; margin:0 auto 20px; background:linear-gradient(150deg,var(--accent),var(--accent-press)); display:grid; place-items:center; color:var(--on-accent); box-shadow:0 16px 34px -12px var(--accent-glow);">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M3.5 9.5 2 11a1.5 1.5 0 0 0 0 2l3 3a1.5 1.5 0 0 0 2 0L8.5 14.5M15.5 9.5 17 8a1.5 1.5 0 0 1 2 0l3 3a1.5 1.5 0 0 1 0 2L20.5 14.5"/></svg>
      </div>
      <div style="font-family:var(--font-num); font-size:30px; font-weight:700; letter-spacing:-.6px;">GymTracker</div>
      <div style="font-size:15px; color:var(--muted); margin-top:6px;">登录账号</div>
    </div>

    <div class="auth-field"><span class="muted">邮箱</span></div>
    <div class="auth-field" style="display:flex; align-items:center; justify-content:space-between;">
      <span style="letter-spacing:4px; color:var(--ink);">••••••••</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
    </div>

    <button class="btn btn-primary" style="margin-top:8px;">登录</button>
    <div style="text-align:center; margin-top:22px;">
      <span style="font-size:14px; color:var(--accent-ink); font-weight:600;">没有账号？点此注册</span>
    </div>
  </div>
</div>`;

/* ============================================================ GYM (machine list) */
const gym = `
<div class="body">
  <div class="nav">
    <div class="nav-back">${I.back}<span>我的健身房</span></div>
    <div class="nav-icon-btn">${I.more}</div>
  </div>
  <div class="scroll pad-bottom">
    <div style="padding:0 2px 14px;">
      <div class="page-title" style="font-size:26px;">乐刻运动 · 中关村</div>
      <div class="muted" style="font-size:13px; margin-top:5px;">8 个器械</div>
    </div>
    ${machineRow('高位下拉','最佳 2,040 千克·次')}
    ${machineRow('坐姿划船','最佳 2,400 千克·次')}
    ${machineRow('杠铃卧推','最佳 1,950 千克·次')}
    ${machineRow('史密斯深蹲','最佳 3,600 千克·次')}
    ${machineRow('腿举','暂无记录', true)}

    <!-- inline add card (新增器械 + 归类) -->
    <div class="card" style="padding:14px; margin-top:14px;">
      <input class="inline-input" placeholder="器械名称，如：高位下拉" />
      <div style="margin-top:12px; display:flex; align-items:center; justify-content:space-between;">
        <span class="chip on">${I.tag}<span>胸推</span></span>
        <div style="display:flex; gap:8px;">
          <button class="mini-btn ghost">取消</button>
          <button class="mini-btn">确认</button>
        </div>
      </div>
    </div>
  </div>
  <div class="fab-bar">
    <button class="btn btn-primary">${I.plus}添加器械</button>
  </div>
</div>`;

function machineRow(name, best, empty){
  return `<div class="row">
    <div class="row-icon">${I.dumbbell}</div>
    <div class="row-main">
      <div class="row-title">${name}</div>
      <div class="row-sub"><span class="${empty?'':'row-best'}">${best}</span></div>
    </div>
    ${I.chev}
  </div>`;
}

/* ============================================================ CATEGORY LIST */
const catList = `
<div class="body">
  <div class="scroll pad-bottom">
    <div style="padding:6px 2px 16px;">
      <div class="page-title">分类</div>
    </div>
    ${catRow('胸推','4 个器械')}
    ${catRow('背阔下拉','3 个器械')}
    ${catRow('深蹲','2 个器械')}
    ${catRow('肩推','3 个器械')}
    <div style="text-align:center; font-size:11.5px; color:var(--faint); margin-top:14px; letter-spacing:.3px;">把不同健身房的同类器械归到一个分类，统一看进步</div>
  </div>
  <div class="fab-bar">
    <button class="btn btn-primary">${I.plus}新建分类</button>
  </div>
  ${tabbar('cat')}
</div>`;

function catRow(name, sub){
  return `<div class="row">
    <div class="row-icon">${I.tag}</div>
    <div class="row-main">
      <div class="row-title">${name}</div>
      <div class="row-sub"><span class="row-best">${sub}</span></div>
    </div>
    ${I.chev}
  </div>`;
}

/* ============================================================ CATEGORY DETAIL */
const category = `
<div class="body">
  <div class="nav">
    <div class="nav-back">${I.back}<span>分类</span></div>
    <div class="nav-icon-btn">${I.more}</div>
  </div>
  <div class="scroll pad-bottom">
    <div style="padding:0 2px 12px;">
      <div class="page-title" style="font-size:26px;">胸推</div>
    </div>

    <div class="pr">
      <div class="pr-top"><div class="pr-badge">${I.trophy}</div><div class="pr-label">同类历史最佳</div></div>
      <div class="pr-num">3,200<small>千克·次</small></div>
      <div class="pr-detail">80 千克 × 4 组（10 / 10 / 10 / 10 次） · 05-30</div>
      <div style="font-size:12px; color:var(--gold); font-weight:600; margin-top:8px;">威尔仕 · 国贸店 · 杠铃卧推</div>
    </div>

    <div class="spacer"></div>
    <div class="stat-row accent-num">
      <div class="stat"><b>31</b><span>训练记录</span></div>
      <div class="stat"><b>18</b><span>训练天数</span></div>
      <div class="stat"><b>52,800</b><span>总训练量</span></div>
    </div>

    <div class="spacer-lg"></div>
    <div class="card chart-card">
      <div class="chart-head"><div class="chart-title">同类趋势</div><div class="chart-meta">跨 2 个健身房</div></div>
      ${lineChart('cat', {data:[2600,2800,2700,2950,3050,2900,3100,3200], labels:['05-08','','05-16','','05-24','','05-30','']})}
    </div>

    <div class="spacer-lg"></div>
    <div class="card field-card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
        <div class="section-label" style="margin:0;">关联器械</div>
        <button class="mini-btn">＋ 添加</button>
      </div>
      ${catItem('杠铃卧推','威尔仕 · 国贸店 · 12 条记录','最佳 3,200 千克·次')}
      ${catItem('史密斯卧推','乐刻运动 · 中关村 · 9 条记录','最佳 2,640 千克·次')}
      ${catItem('坐姿推胸','超级猩猩 · 望京 · 6 条记录','最佳 2,100 千克·次')}
    </div>
  </div>
</div>`;

function catItem(name, src, best){
  return `<div class="cat-item">
    <div class="cat-item-name">${name}</div>
    <div class="cat-item-src">${src}</div>
    <div class="cat-item-best">${best}</div>
  </div>`;
}

/* ============================================================ CALENDAR */
const calendar = `
<div class="body">
  <div class="scroll pad-bottom">
    <div style="padding:6px 2px 14px;"><div class="page-title">日历</div></div>

    <div class="card" style="padding:16px 16px 18px;">
      ${monthGrid()}
    </div>

    <div class="spacer"></div>
    <div class="hero-fill">
      <div class="hf-top"><span class="hf-label">当日总训练量</span><span class="hf-unit">千克·次</span></div>
      <div class="hf-num">6,180</div>
      <div class="hf-sub">3 条记录</div>
    </div>

    <div class="spacer"></div>
    <div class="card field-card">
      <div class="cal-gym-title">乐刻运动 · 中关村</div>
      <div class="cal-machine">
        <div class="cal-machine-name">高位下拉</div>
        <div class="cal-rec"><span>68 千克 × 3 组（10 / 10 / 10 次）</span><b>2,040 千克·次</b></div>
      </div>
      <div class="cal-machine" style="border-top:1px solid var(--hair-2); margin-top:10px; padding-top:10px;">
        <div class="cal-machine-name">坐姿划船</div>
        <div class="cal-rec"><span>60 千克 × 4 组（10 / 10 / 10 / 10 次）</span><b>2,400 千克·次</b></div>
      </div>
    </div>

    <div class="spacer"></div>
    <div class="card field-card">
      <div class="cal-gym-title">威尔仕 · 国贸店</div>
      <div class="cal-machine">
        <div class="cal-machine-name">杠铃卧推</div>
        <div class="cal-rec"><span>56 千克 × 3 组（10 / 10 / 10 次）</span><b>1,740 千克·次</b></div>
      </div>
    </div>

    <div class="spacer"></div>
    <div class="card chart-card">
      <div class="chart-head"><div class="chart-title">每日训练量趋势</div></div>
      ${lineChart('cal', {data:[4200,5100,4600,6180,5400,5900,6180,5700], labels:['05-26','','05-30','','06-02','','06-06','']})}
    </div>
  </div>
  ${tabbar('cal')}
</div>`;

function monthGrid(){
  const head = ['一','二','三','四','五','六','日'].map(d=>`<span class="cal-h">${d}</span>`).join('');
  // June 2026 starts Monday=1
  const trained = {2:1,4:1,6:1,9:1,11:1,13:1,16:1,18:1};
  const sel = 6;
  let cells='';
  for(let d=1; d<=30; d++){
    const cls = d===sel ? 'cal-d sel' : (trained[d] ? 'cal-d has' : 'cal-d');
    cells += `<span class="${cls}">${d}<i></i></span>`;
  }
  return `<div class="cal-top"><span class="cal-month">2026 年 6 月</span>
    <span class="cal-nav">${I.back}<span style="transform:rotate(180deg);display:inline-flex;">${I.back}</span></span></div>
    <div class="cal-grid">${head}${cells}</div>`;
}

/* ============================================================ PROFILE */
const profile = `
<div class="body">
  <div class="scroll pad-bottom">
    <div style="padding:24px 0 8px;">
      <div class="avatar">L<div class="cam">${I.cam}</div></div>
      <div class="profile-name">Lawson</div>
      <div class="profile-sub">男 · 北京</div>
      <div style="text-align:center;"><span class="edit-pill">${I.pencil}编辑资料</span></div>
    </div>

    <div class="hl-row" style="margin-top:18px;">
      <div class="hl">
        <div class="hl-top"><span class="hl-label">总训练量</span><span class="hl-unit">千克·次</span></div>
        <div class="hl-num">486,200</div>
        <div class="hl-sub">自 2025-11-03 起</div>
      </div>
      <div class="hl">
        <div class="hl-top"><span class="hl-label">单日最佳</span><span class="hl-unit">千克·次</span></div>
        <div class="hl-num">8,640</div>
        <div class="hl-sub">乐刻·中关村 · 05-30</div>
      </div>
    </div>

    <div class="spacer"></div>
    <div class="card grid2">
      <div class="cell"><b>248</b><span>训练记录</span></div>
      <div class="cell"><b>96</b><span>训练天数</span></div>
      <div class="cell"><b>4</b><span>健身房</span></div>
      <div class="cell"><b>29</b><span>器械</span></div>
    </div>

    <div class="spacer"></div>
    <div class="card field-card">
      <div class="section-label" style="margin:0 0 8px;">健身房排行</div>
      ${rankRow(1,'乐刻运动 · 中关村','142 条记录','198,400')}
      ${rankRow(2,'威尔仕 · 国贸店','78 条记录','164,200')}
      ${rankRow(3,'超级猩猩 · 望京','28 条记录','123,600')}
    </div>

    <div class="spacer"></div>
    <div class="card field-card">
      <div class="section-label" style="margin:0 0 12px;">外观</div>
      <div style="font-size:12.5px; color:var(--muted); margin-bottom:8px;">主题</div>
      <div class="seg"><button class="on">明亮</button><button>深色</button></div>
      <div style="font-size:12.5px; color:var(--muted); margin:16px 0 10px;">配色方案</div>
      <div class="scheme-picker">
        ${['emerald','blue','indigo','coral','pink','graphite'].map((s,i)=>`<span class="scheme-dot ${i===0?'on':''}" data-c="${s}"></span>`).join('')}
      </div>
    </div>

    <div class="spacer"></div>
    <button class="btn btn-ghost" style="border-color:var(--danger-line,#F0C0C0); color:#E5484D;">清除所有数据</button>
    <div class="spacer"></div>
    <button class="btn btn-ghost">退出登录</button>
  </div>
  ${tabbar('me')}
</div>`;

function rankRow(n, name, sub, vol){
  return `<div class="rank-row">
    <div class="rank-badge ${n===1?'gold':''}">${n}</div>
    <div class="rank-main"><div class="rank-name">${name}</div><div class="rank-sub">${sub}</div></div>
    <div class="rank-vol">${vol}</div>
  </div>`;
}

const SCREENS = { auth, home, gym, machine, catList, category, calendar, profile };

/* ============================================================ MODAL / INTERACTION STATES */
const MODALS = {
  // 历史最佳奖杯
  trophy: `<div class="scrim center">
    <div class="m-card trophy-card">
      <div class="trophy-ico">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v4a6 6 0 0 1-12 0V4Z"/><path d="M6 6H3.5A1.5 1.5 0 0 0 2 7.5C2 10 4 11 6 11M18 6h2.5A1.5 1.5 0 0 1 22 7.5C22 10 20 11 18 11"/><path d="M9 14.5h6M12 14v3M9 20h6M10 17h4"/></svg>
      </div>
      <div class="m-title">历史最高记录！</div>
      <div class="m-sub">突破个人记录，太厉害了！</div>
    </div>
  </div>`,

  // 重量 / 次数选择器
  picker: `<div class="scrim center">
    <div class="m-card picker-card">
      <div class="picker-title">选择重量（千克）</div>
      <div class="picker-list">
        <div class="picker-opt">66</div>
        <div class="picker-opt">68</div>
        <div class="picker-opt on">70<span>✓</span></div>
        <div class="picker-opt">72</div>
        <div class="picker-opt">74</div>
      </div>
    </div>
  </div>`,

  // 编辑记录 底部弹层
  edit: `<div class="scrim end">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">编辑记录</div>
      <div class="field-row" style="border-bottom:1px solid var(--hair-2); padding-bottom:14px;">
        <span class="field-label" style="margin:0;">日期</span>
        <span class="chip">2026-06-04</span>
      </div>
      <div class="field-label" style="margin-top:16px;">重量（千克）</div>
      <div class="stepper-input"><span class="val">68</span><span class="arrow" style="color:var(--faint);">▾</span></div>
      <div class="field-label" style="margin-top:16px; display:flex; justify-content:space-between; align-items:center;">
        <span>每组次数</span>
        <span style="display:flex;align-items:center;gap:10px;">
          <button class="round-btn" style="width:34px;height:34px;font-size:18px;">−</button>
          <b style="font-family:var(--font-num);color:var(--ink);font-size:14px;">3 组</b>
          <button class="round-btn" style="width:34px;height:34px;font-size:18px;">+</button>
        </span>
      </div>
      <div class="set-row"><span class="set-name">第 1 组</span><div class="set-pill"><b>10</b><span class="arrow">▾</span></div></div>
      <div class="set-row"><span class="set-name">第 2 组</span><div class="set-pill"><b>10</b><span class="arrow">▾</span></div></div>
      <div class="set-row"><span class="set-name">第 3 组</span><div class="set-pill"><b>10</b><span class="arrow">▾</span></div></div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" style="flex:1;">取消</button>
        <button class="btn btn-primary" style="flex:2;">保存</button>
      </div>
    </div>
  </div>`,

  // 分类添加器械（两步选择 · 第二步）
  catAdd: `<div class="scrim end">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <span class="sheet-back">${I.back}返回</span>
        <b>威尔仕 · 国贸店</b>
        <span class="sheet-close">关闭</span>
      </div>
      <div class="pick-opt"><span>杠铃卧推</span><span class="pick-add">＋</span></div>
      <div class="pick-opt"><span>上斜哑铃卧推</span><span class="pick-add">＋</span></div>
      <div class="pick-opt dim"><span>坐姿推胸</span><span class="pick-tag">已关联</span></div>
      <div class="pick-opt"><span>蝴蝶机夹胸</span><span class="pick-add">＋</span></div>
      <div class="pick-opt"><span>双杠臂屈伸</span><span class="pick-add">＋</span></div>
    </div>
  </div>`,
};

window.SCREENS = SCREENS;
window.MODALS = MODALS;
window.statusBar = statusBar;
window.I = I;
window.lineChart = lineChart;
window.tabbar = tabbar;
