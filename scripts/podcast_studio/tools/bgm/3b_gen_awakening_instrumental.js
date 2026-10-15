(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  await js(`location.reload()`);
  await sleep(8000);

  const readSw = () => js(`(() => {
    const sws = [...document.querySelectorAll('[role=switch]')];
    for (const el of sws) {
      let p = el.parentElement;
      for (let k = 0; k < 5 && p; k++) { p = p.parentElement; if (p && p.innerText.includes('纯音乐')) return el.getAttribute('aria-checked'); }
    }
    return 'no-switch';
  })()`);

  const clickSw = () => js(`(() => {
    const sws = [...document.querySelectorAll('[role=switch]')];
    for (const el of sws) {
      let p = el.parentElement, hit = false;
      for (let k = 0; k < 5 && p; k++) { p = p.parentElement; if (p && p.innerText.includes('纯音乐')) { hit = true; break; } }
      if (hit) {
        const o = {bubbles:true, cancelable:true, view:window, button:0};
        el.dispatchEvent(new PointerEvent('pointerdown', o));
        el.dispatchEvent(new MouseEvent('mousedown', o));
        el.dispatchEvent(new PointerEvent('pointerup', o));
        el.dispatchEvent(new MouseEvent('mouseup', o));
        el.dispatchEvent(new MouseEvent('click', o));
        return 'clicked';
      }
    }
    return 'no-switch';
  })()`);

  // 开关轮询：直到确认为 true（最多 5 轮点击）
  let state = 'unknown';
  for (let i = 0; i < 5; i++) {
    state = await readSw();
    console.log(`sw-check[${i}]: ${state}`);
    if (state === 'true') break;
    await clickSw();
    await sleep(1500);
  }
  if (state !== 'true') { console.log('ABORT: 纯音乐开关无法开启'); process.exit(2); }

  // 填词
  const PROMPT = '纪录片配乐，纯器乐：开头极简电子氛围与低频脉冲（机器时代感），中段渐入古琴与空灵箫声（转向内省），后段弦乐渐暖转向明亮希望，结尾温暖收束有余韵。慢速，无鼓点，极简克制，深沉安静，纯音乐无人声，时长约4分钟';
  const fill = await js(`(() => {
    const ta = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, ${JSON.stringify(PROMPT)});
    ta.dispatchEvent(new Event('input', {bubbles:true}));
    ta.dispatchEvent(new Event('change', {bubbles:true}));
    ta.blur();
    return 'len=' + ta.value.length;
  })()`);
  console.log('fill:', fill);
  await sleep(2500);

  // 提交前再验开关（防填词过程重置）
  const finalSw = await readSw();
  console.log('sw-before-submit:', finalSw);
  if (finalSw !== 'true') { console.log('ABORT: 提交前开关非 true'); process.exit(2); }

  const r = await js(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => (b.innerText || '').includes('创作'));
    if (!btn) return 'no-btn';
    const o = {bubbles:true, cancelable:true, view:window, button:0};
    btn.dispatchEvent(new PointerEvent('pointerdown', o));
    btn.dispatchEvent(new MouseEvent('mousedown', o));
    btn.dispatchEvent(new PointerEvent('pointerup', o));
    btn.dispatchEvent(new MouseEvent('mouseup', o));
    btn.dispatchEvent(new MouseEvent('click', o));
    return 'clicked';
  })()`);
  console.log('create:', r);
  await sleep(5000);
  const after = await js(`JSON.stringify({gen: document.body.innerText.includes('生成中') || document.body.innerText.includes('创作中') || document.body.innerText.includes('排队')})`);
  console.log('after:', after);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
