(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;

  // 1. 覆盖式填 culture prompt
  const r1 = await js(`(() => {
    const ta = document.querySelector('textarea');
    if (!ta) return 'no-textarea';
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, '中国传统古风配乐：古琴与箫为主，空灵悠远，慢板，安静内省，书卷气与山河意境，留白呼吸感，纯音乐无人声，时长约60秒');
    ta.dispatchEvent(new Event('input', {bubbles:true}));
    return JSON.stringify({len: ta.value.length, head: ta.value.slice(0, 20)});
  })()`);
  console.log('fill:', r1);
  await new Promise(r => setTimeout(r, 1000));

  // 2. 点创作
  const r2 = await js(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => (b.innerText || '').includes('创作'));
    if (!btn) return 'no-btn';
    const o = {bubbles:true, cancelable:true, view:window, button:0};
    btn.dispatchEvent(new PointerEvent('pointerdown', o));
    btn.dispatchEvent(new MouseEvent('mousedown', o));
    btn.dispatchEvent(new PointerEvent('pointerup', o));
    btn.dispatchEvent(new MouseEvent('mouseup', o));
    btn.dispatchEvent(new MouseEvent('click', o));
    return 'clicked:' + btn.innerText.slice(0, 12).replace(/\\n/g, ' ');
  })()`);
  console.log('create:', r2);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
