(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;
  const KEY = '苏格兰风笛史诗配乐';

  // 1. 等生成完成（最多 ~9 分钟）
  for (let i = 0; i < 36; i++) {
    await new Promise(r => setTimeout(r, 15000));
    const g = await js(`(() => {
      const b = document.body.innerText;
      return JSON.stringify({
        generating: b.includes('生成中') || b.includes('创作中') || b.includes('排队'),
        hasTrack: b.includes('${KEY}'),
      });
    })()`);
    console.log(`[${i}] ${g}`);
    if (!g.includes('"generating":true') && g.includes('"hasTrack":true')) {
      console.log('SETTLED');
      break;
    }
  }

  // 2. 定位风笛曲卡并派发完整指针序列点封面
  const r1 = await js(`(() => {
    const all = [...document.querySelectorAll('div')];
    let card = null;
    for (const el of all) {
      const t = el.innerText || '';
      if (t.includes('${KEY}') && t.length < 400) { card = el; break; }
    }
    if (!card) return 'no-card';
    const cover = card.querySelector('img, [class*=cover], [class*=play], canvas') || card;
    const o = {bubbles:true, cancelable:true, view:window, button:0};
    cover.dispatchEvent(new PointerEvent('pointerdown', o));
    cover.dispatchEvent(new MouseEvent('mousedown', o));
    cover.dispatchEvent(new PointerEvent('pointerup', o));
    cover.dispatchEvent(new MouseEvent('mouseup', o));
    cover.dispatchEvent(new MouseEvent('click', o));
    return 'clicked-cover:' + (cover.tagName || '') + (cover.className||'').toString().slice(0,30);
  })()`);
  console.log(r1);
  await new Promise(r => setTimeout(r, 3000));

  // 3. 读音频 URL
  const r2 = await js(`(() => {
    const a = document.querySelector('audio');
    return a ? (a.currentSrc || a.src || 'no-src') : 'no-audio';
  })()`);
  console.log('AUDIO_URL:', r2);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
