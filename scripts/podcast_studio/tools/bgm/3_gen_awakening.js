(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  await js(`location.reload()`);
  await sleep(7000);

  // 1. 开纯音乐（完整指针序列）
  let r = await js(`(() => {
    const sws = [...document.querySelectorAll('[role=switch]')];
    let T = null;
    for (const el of sws) {
      let p = el.parentElement, ctx = '';
      for (let k = 0; k < 5 && p; k++) { p = p.parentElement; if (p && p.innerText.includes('纯音乐')) { ctx = p.innerText; break; } }
      if (ctx.includes('纯音乐')) { T = el; break; }
    }
    if (!T) return 'no-switch';
    const o = {bubbles:true, cancelable:true, view:window, button:0};
    T.dispatchEvent(new PointerEvent('pointerdown', o));
    T.dispatchEvent(new MouseEvent('mousedown', o));
    T.dispatchEvent(new PointerEvent('pointerup', o));
    T.dispatchEvent(new MouseEvent('mouseup', o));
    T.dispatchEvent(new MouseEvent('click', o));
    return 'sw=' + T.getAttribute('aria-checked');
  })()`);
  console.log('1.switch:', r);
  await sleep(2000);

  // 2. 填 BGM 设计 prompt（按文案情绪弧线定制）
  const PROMPT = '纪录片配乐，情绪弧线从冷到暖：开头极简电子氛围与低频脉冲（机器时代感），中段渐入古琴与空灵箫声（转向内省），后段弦乐渐暖转向明亮希望，结尾温暖收束有余韵。慢速，无鼓点，极简克制，深沉而安静，纯音乐无人声，时长约4分钟';
  r = await js(`(() => {
    const ta = document.querySelector('textarea');
    if (!ta) return 'no-ta';
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, ${JSON.stringify(PROMPT)});
    ta.dispatchEvent(new Event('input', {bubbles:true}));
    ta.dispatchEvent(new Event('change', {bubbles:true}));
    ta.blur();
    return 'len=' + ta.value.length;
  })()`);
  console.log('2.fill:', r);
  await sleep(2500);

  // 3. 点创作
  r = await js(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => (b.innerText || '').includes('创作'));
    if (!btn) return 'no-btn';
    const o = {bubbles:true, cancelable:true, view:window, button:0};
    btn.dispatchEvent(new PointerEvent('pointerdown', o));
    btn.dispatchEvent(new MouseEvent('mousedown', o));
    btn.dispatchEvent(new PointerEvent('pointerup', o));
    btn.dispatchEvent(new MouseEvent('mouseup', o));
    btn.dispatchEvent(new MouseEvent('click', o));
    return 'clicked:' + btn.innerText.slice(0, 10).replace(/\n/g, ' ');
  })()`);
  console.log('3.create:', r);
  await sleep(5000);
  r = await js(`JSON.stringify({gen: document.body.innerText.includes('生成中') || document.body.innerText.includes('创作中')})`);
  console.log('4.after:', r);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
