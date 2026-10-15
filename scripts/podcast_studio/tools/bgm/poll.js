(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;

  for (let i = 0; i < 40; i++) {          // 最多 ~10 分钟
    await new Promise(r => setTimeout(r, 15000));
    const st = await js(`(() => {
      const body = document.body.innerText;
      const generating = body.includes('生成中') || body.includes('创作中') || body.includes('排队');
      // 作品卡：找带时长文本（mm:ss）的近邻信息
      const cards = [...document.querySelectorAll('[class*=card], [class*=Card], [class*=item]')].slice(0, 6);
      const first = cards[0] ? cards[0].innerText.slice(0, 60).replace(/\\n/g, '|') : '';
      const dur = (body.match(/\\d{2}:\\d{2}/g) || []).slice(0, 3).join(',');
      return JSON.stringify({ generating, durs: dur, first: first });
    })()`);
    console.log(`[${i}] ${st}`);
    if (!st.includes('"generating":true')) {
      console.log('GENERATION-SETTLED');
      break;
    }
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
