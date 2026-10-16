(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;

  // 1. 覆盖式填风笛 prompt
  const r1 = await js(`(() => {
    const ta = document.querySelector('textarea');
    if (!ta) return 'no-textarea';
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, '苏格兰风笛史诗配乐：高地风笛主题悠扬苍凉，军鼓轻点行进感，弦乐铺底温暖深沉，慢板，辽阔苏格兰高地意境，适合历史人文纪录片，纯音乐无人声，时长约60秒');
    ta.dispatchEvent(new Event('input', {bubbles:true}));
    return JSON.stringify({len: ta.value.length, head: ta.value.slice(0, 20)});
  })()`);
  console.log('fill:', r1);
  await new Promise(r => setTimeout(r, 1000));

  // 2. 点创作（React 受控组件需完整指针序列）
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
