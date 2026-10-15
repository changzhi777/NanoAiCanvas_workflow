(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;

  // —— 第 1 步：枚举所有 switch 找到"纯音乐"那个 ——
  const info = await js(`(() => {
    const sws = [...document.querySelectorAll('[role=switch]')];
    return JSON.stringify(sws.map((el, i) => {
      let ctx = el.parentElement ? el.parentElement.innerText : '';
      if (!ctx.includes('纯音乐')) {
        let p = el.parentElement;
        for (let k = 0; k < 4 && p; k++) { p = p.parentElement; if (p && p.innerText.includes('纯音乐')) { ctx = p.innerText; break; } }
      }
      return { i, checked: el.getAttribute('aria-checked'), ctx: ctx.slice(0, 30).replace(/\\n/g, '|') };
    }));
  })()`);
  console.log('switches:', info);

  // —— 第 2 步：点开纯音乐（helpers.click 需要 ref；这里用元素坐标 + CDP? 退而求其次用原生 click）——
  const r = await js(`(() => {
    const sws = [...document.querySelectorAll('[role=switch]')];
    let target = null;
    for (const el of sws) {
      let p = el.parentElement, ctx = '';
      for (let k = 0; k < 5 && p; k++) { p = p.parentElement; if (p && p.innerText.includes('纯音乐')) { ctx = p.innerText; break; } }
      if (ctx.includes('纯音乐')) { target = el; break; }
    }
    if (!target) return 'no-target';
    const before = target.getAttribute('aria-checked');
    const o = {bubbles:true, cancelable:true, view:window, button:0};
    target.dispatchEvent(new PointerEvent('pointerdown', o));
    target.dispatchEvent(new MouseEvent('mousedown', o));
    target.dispatchEvent(new PointerEvent('pointerup', o));
    target.dispatchEvent(new MouseEvent('mouseup', o));
    target.dispatchEvent(new MouseEvent('click', o));
    return JSON.stringify({before, after: target.getAttribute('aria-checked')});
  })()`);
  console.log('switch toggle:', r);

  await new Promise(r2 => setTimeout(r2, 1200));
  const chk = await js(`(() => {
    const body = document.body.innerText;
    return JSON.stringify({
      lyrUnavail: body.includes('歌词不可用'),
      styleLen: (document.querySelector('textarea') || {}).value ? document.querySelector('textarea').value.length : 0,
    });
  })()`);
  console.log('verify:', chk);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
