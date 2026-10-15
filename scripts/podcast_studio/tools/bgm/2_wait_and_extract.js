(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;

  // 1. 等生成完成（最多 ~9 分钟）
  for (let i = 0; i < 36; i++) {
    await new Promise(r => setTimeout(r, 15000));
    const g = await js(`(() => {
      const b = document.body.innerText;
      return JSON.stringify({
        generating: b.includes('生成中') || b.includes('创作中') || b.includes('排队'),
        hasCultureTrack: b.includes('中国传统古风配乐：古琴与箫为主'),
      });
    })()`);
    console.log(`[${i}] ${g}`);
    if (!g.includes('"generating":true') && g.includes('"hasCultureTrack":true')) {
      console.log('SETTLED-WITH-CULTURE-TRACK');
      break;
    }
  }

  // 2. 定位 culture 新曲卡并播放
  const r1 = await js(`(() => {
    const all = [...document.querySelectorAll('div')];
    let card = null;
    for (const el of all) {
      const t = el.innerText || '';
      if (t.includes('中国传统古风配乐：古琴与箫为主') && t.length < 400) { card = el; break; }
    }
    if (!card) return 'no-card';
    const dur = (card.innerText.match(/\\d{2}:\\d{2}/) || ['?'])[0];
    const tgt = card.querySelector('img') || card;
    const o = {bubbles:true, cancelable:true, view:window, button:0};
    tgt.dispatchEvent(new PointerEvent('pointerdown', o));
    tgt.dispatchEvent(new MouseEvent('mousedown', o));
    tgt.dispatchEvent(new PointerEvent('pointerup', o));
    tgt.dispatchEvent(new MouseEvent('mouseup', o));
    tgt.dispatchEvent(new MouseEvent('click', o));
    return JSON.stringify({clicked: true, dur, head: card.innerText.slice(0, 60).replace(/\\n/g, '|')});
  })()`);
  console.log('card:', r1);

  // 3. 读 audio src（等播放器挂载）
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const src = await js(`(() => {
      const a = document.querySelector('audio');
      return a ? (a.currentSrc || a.src || '') : 'no-audio-el';
    })()`);
    if (String(src).startsWith('http')) { console.log('AUDIO-URL:', src); break; }
    console.log(`audio[${i}]:`, src);
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
