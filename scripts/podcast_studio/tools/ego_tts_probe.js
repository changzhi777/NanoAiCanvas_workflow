(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  await js(`location.href = 'https://www.minimax.cn/audio'`);
  await sleep(8000);
  const st = await js(`(() => {
    const b = document.body.innerText;
    const clean = b.split(String.fromCharCode(10)).join(' | ');
    return JSON.stringify({
      url: location.href,
      loggedIn: !b.includes('登录获得免费积分'),
      tabs: ['语音合成', '音色库', '音乐创作', '声音克隆', '人声提取'].filter(t => b.includes(t)),
      sample: clean.slice(0, 260),
    });
  })()`);
  console.log(st);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
