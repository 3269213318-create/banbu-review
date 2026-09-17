/* Stable, version-independent workspace. Old localStorage data migrates on first use. */
window.banbuStorage = (() => {
  const keys = ['banbu-cqsr-project', 'banbu-cqsr-library-v2', 'banbu-cqsr-corpus-v1', 'banbu-writing-desk-v1'];
  const values = new Map();
  let db, pending = Promise.resolve(), failed = false;
  const status = message => {
    const el = document.getElementById('storageStatus');
    if (el) el.textContent = message;
  };
  const transaction = (mode, action) => new Promise((resolve, reject) => {
    const tx = db.transaction('workspace', mode);
    action(tx.objectStore('workspace'));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('保存中断'));
  });
  const ready = (async () => {
    for (const key of keys) {
      try { const value = localStorage.getItem(key); if (value !== null) values.set(key, value); } catch {}
    }
    try {
      db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('banbu-cqsr-workspace', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('workspace');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('数据库被其他窗口占用'));
      });
      const stored = new Map();
      await transaction('readonly', store => {
        for (const key of keys) {
          const req = store.get(key);
          req.onsuccess = () => { if (typeof req.result === 'string') stored.set(key, req.result); };
        }
      });
      await transaction('readwrite', store => {
        for (const [key, value] of values) if (!stored.has(key)) store.put(value, key);
      });
      for (const [key, value] of stored) values.set(key, value);
      status('本地数据库已就绪 · 同一网址升级保留资料');
    } catch (error) {
      db = null;
      status('当前使用浏览器备用存储，请定期备份到电脑');
    }
  })();
  return {
    ready,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) {
      value = String(value);
      if (!db) {
        try { localStorage.setItem(key, value); }
        catch (error) { status('保存失败：请立即备份到电脑，勿关闭页面'); throw error; }
      }
      values.set(key, value);
      if (db) {
        status('正在保存到本地…');
        pending = pending.then(async () => {
          try {
            await transaction('readwrite', store => store.put(value, key));
            failed = false;
            status('已保存到本地 · ' + new Date().toLocaleTimeString());
          } catch (error) {
            failed = true;
            status('本地数据库保存失败：请立即备份到电脑，勿关闭页面');
          }
        });
      }
    },
    async flush() { await pending; return !failed; },
    async protect() {
      await ready;
      const granted = await navigator.storage?.persist?.().catch(() => false);
      status(granted ? '已开启持久存储 · 仍建议定期备份到电脑' : '浏览器未授予持久存储 · 请定期备份到电脑');
    }
  };
})();
