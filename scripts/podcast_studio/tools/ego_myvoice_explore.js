(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // 1. 找显示"沉稳高管"的音色选择控件并点击展开
  const r = await js(`(() => {
    const els = [...document.querySelectorAll('.ant-select, [role=combobox], [class*=select]')];
    const target = els.find(el => (el.innerText || '').includes('沉稳高管'));
    if (!target) return 'no-voice-select, sels=' + els.length;
    const o = {bubbles:true, cancelable:true, view:window, button:0};
    target.dispatchEvent(new PointerEvent('pointerdown', o));
    target.dispatchEvent(new MouseEvent('mousedown', o));
    target.dispatchEvent(new PointerEvent('pointerup', o));
    target.dispatchEvent(new MouseEvent('mouseup', o));
    target.dispatchEvent(new MouseEvent('click', o));
    return 'opened:' + (target.innerText || '').slice(0, 20);
  })()`);
  console.log('open:', r);
  await sleep(2500);

  // 2. 枚举展开的列表：分组标题 + 音色项（找"我的音色"组）
  const list = await js(`(() => {
    const groups = [];
    document.querySelectorAll('[class*=group], [class*=Group], [class*=section-title], [class*=category]').forEach(el => {
      const t = (el.innerText || '').trim();
      if (t && t.length < 20 && !groups.includes(t)) groups.push(t);
    });
    const items = [...document.querySelectorAll('.ant-select-item-option, [class*=option], [class*=voice-item], [class*=VoiceItem]')];
    const voices = [];
    items.forEach(el => {
      const t = (el.innerText || '').split(String.fromCharCode(10)).join(' ').trim();
      if (t && t.length < 50 && !voices.some(v => v.t === t)) voices.push({t: t.slice(0, 45)});
    });
    // 我的音色关键词搜索
    const b = document.body.innerText;
    const myVoiceIdx = b.indexOf('我的音色');
    const myVoiceCtx = myVoiceIdx >= 0 ? b.slice(myVoiceIdx, myVoiceIdx + 150).split(String.fromCharCode(10)).join(' | ') : 'not-found';
    return JSON.stringify({groups, voiceCount: voices.length, voices: voices.slice(0, 25), myVoiceCtx});
  })()`);
  console.log(list);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
