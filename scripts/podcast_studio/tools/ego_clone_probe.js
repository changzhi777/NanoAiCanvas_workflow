(async () => {
  await globalThis.useOrCreateTaskSpace('bgm');
  const { js } = globalThis.ego.helpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  await js(`location.href = 'https://www.minimax.cn/audio/voice-mall'`);
  await sleep(8000);
  const st = await js(`(() => {
    const b = document.body.innerText;
    const clean = b.split(String.fromCharCode(10)).join(' | ');
    return JSON.stringify({
      url: location.href,
      hasClone: b.includes('克隆') || b.includes('复刻'),
      uploadHint: b.includes('上传') || b.includes('录音'),
      sample: clean.slice(0, 400),
    });
  })()`);
  console.log(st);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
