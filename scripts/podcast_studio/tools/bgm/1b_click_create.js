(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;

  // 点「创作」按钮（含声贝数字的那个）
  const r = await js(`(() => {
    const btns = [...document.querySelectorAll('button')];
    const target = btns.find(b => (b.innerText || '').includes('创作'));
    if (!target) return 'no-create-btn';
    const before = document.body.innerText.includes('作品');
    const o = {bubbles:true, cancelable:true, view:window, button:0};
    target.dispatchEvent(new PointerEvent('pointerdown', o));
    target.dispatchEvent(new MouseEvent('mousedown', o));
    target.dispatchEvent(new PointerEvent('pointerup', o));
    target.dispatchEvent(new MouseEvent('mouseup', o));
    target.dispatchEvent(new MouseEvent('click', o));
    return JSON.stringify({clicked: true, btnText: target.innerText.slice(0, 20)});
  })()`);
  console.log('click:', r);

  await new Promise(r2 => setTimeout(r2, 4000));
  const state = await js(`(() => {
    const body = document.body.innerText;
    return JSON.stringify({
      needLogin: body.includes('立即登录'),
      needAgree: body.includes('使用须知') || body.includes('同意'),
      generating: body.includes('生成中') || body.includes('创作中') || body.includes('排队'),
      hasWorks: body.includes('作品'),
      tail: body.slice(-260).replace(/\\n+/g, ' | '),
    });
  })()`);
  console.log('after-click:', state);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
