(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const st = await js(`(() => {
    const out = {textareas: [], selects: [], voiceBtns: [], tabs: []};
    document.querySelectorAll('textarea').forEach((t, i) => out.textareas.push({i, ph: (t.placeholder||'').slice(0,30), len: t.value.length}));
    document.querySelectorAll('[role=combobox], .ant-select').forEach((s, i) => out.selects.push({i, txt: (s.innerText||'').slice(0,30)}));
    document.querySelectorAll('button').forEach(b => {
      const t = (b.innerText || '').trim();
      if (t && t.length < 12 && !out.voiceBtns.includes(t)) out.voiceBtns.push(t);
    });
    const tabs = [...document.querySelectorAll('[class*=tab], [role=tab]')].map(e => (e.innerText||'').slice(0,15)).filter(t => t);
    out.tabs = [...new Set(tabs)].slice(0, 12);
    return JSON.stringify(out);
  })()`);
  console.log(st);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
