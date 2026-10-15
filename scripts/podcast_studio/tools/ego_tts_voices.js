(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // 点开音色选择器（第二个 ant-select）
  let r = await js(`(() => {
    const sels = [...document.querySelectorAll('.ant-select')];
    if (sels.length < 2) return 'no-select2';
    const o = {bubbles:true, cancelable:true, view:window, button:0};
    sels[1].dispatchEvent(new PointerEvent('pointerdown', o));
    sels[1].dispatchEvent(new MouseEvent('mousedown', o));
    sels[1].dispatchEvent(new PointerEvent('pointerup', o));
    sels[1].dispatchEvent(new MouseEvent('mouseup', o));
    sels[1].dispatchEvent(new MouseEvent('click', o));
    return 'opened';
  })()`);
  console.log('open:', r);
  await sleep(2000);

  // 枚举下拉列表项（含男声关键词）
  const list = await js(`(() => {
    const items = [...document.querySelectorAll('.ant-select-item-option, [class*=option]')];
    const out = [];
    items.forEach(el => {
      const t = (el.innerText || '').split(String.fromCharCode(10)).join(' ').trim();
      if (t && t.length < 40 && !out.some(x => x.t === t)) out.push({t, cls: (el.className||'').slice(0,30)});
    });
    return JSON.stringify(out.slice(0, 40));
  })()`);
  console.log('voices:', list);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
