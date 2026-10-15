(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const r = await js(`(() => {
    const els = [...document.querySelectorAll('a, div, span, li')];
    const nav = els.find(el => (el.innerText || '').trim() === '声音克隆' && el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().height < 60);
    if (!nav) return 'no-nav-el';
    const o = {bubbles:true, cancelable:true, view:window, button:0};
    nav.dispatchEvent(new PointerEvent('pointerdown', o));
    nav.dispatchEvent(new MouseEvent('mousedown', o));
    nav.dispatchEvent(new PointerEvent('pointerup', o));
    nav.dispatchEvent(new MouseEvent('mouseup', o));
    nav.dispatchEvent(new MouseEvent('click', o));
    return 'clicked';
  })()`);
  console.log('nav:', r);
  await sleep(6000);
  const st = await js(`(() => {
    const b = document.body.innerText;
    const clean = b.split(String.fromCharCode(10)).join(' | ');
    return JSON.stringify({url: location.href, sample: clean.slice(0, 500)});
  })()`);
  console.log(st);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
