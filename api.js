/* مكتبة الاتصال بالباك اند — مشتركة بين كل صفحات المنصة */
const Platform = (function () {
  const KEY = 'currentUser';

  function apiErr(code, message, extra) {
    const e = new Error(message); e.code = code; e.extra = extra; return e;
  }

  async function raw(action, data) {
    if (typeof API_URL === 'undefined' || !/^https:\/\/script\.google(usercontent)?\.com\//.test(API_URL)) {
      throw apiErr('CONFIG', 'المنصة لسه مش متوصلة بالباك اند. افتح ملف config.js وحط رابط الـ Web App.');
    }
    let res;
    try {
      // بدون Content-Type مخصص عشان الطلب يبقى "بسيط" ومفيش مشاكل CORS مع Apps Script
      res = await fetch(API_URL, { method: 'POST', redirect: 'follow', body: JSON.stringify(Object.assign({ action: action }, data || {})) });
    } catch (e) { throw apiErr('NETWORK', 'مفيش اتصال بالإنترنت، حاول تاني'); }
    let j;
    try { j = await res.json(); } catch (e) { throw apiErr('SERVER', 'رد غير متوقع من السيرفر، حاول تاني'); }
    if (!j.ok) throw apiErr(j.code || 'ERR', j.error || 'حصل خطأ', j.extra);
    return j;
  }

  function getCode() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setCode(c) { try { localStorage.setItem(KEY, c); } catch (e) {} }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  function logout() { clear(); window.location.href = 'index.html'; }

  // نداء خاص بالطالب: بيبعت الكود تلقائيًا وبيتصرف لو الجلسة اتلغت أو الحساب اتوقف
  async function call(action, data) {
    const code = getCode();
    if (!code) { window.location.href = 'index.html'; throw apiErr('AUTH', 'سجّل الدخول'); }
    try {
      return await raw(action, Object.assign({ code: code }, data || {}));
    } catch (e) {
      if (e.code === 'AUTH' || e.code === 'SUSPENDED') {
        try { sessionStorage.setItem('authMsg', e.message); } catch (x) {}
        clear(); window.location.href = 'index.html';
      }
      throw e;
    }
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // يحوّل رابط الفيديو لطريقة عرض مناسبة
  function videoInfo(url) {
    url = String(url || '').trim();
    if (!/^https:\/\//i.test(url)) return null;
    let m;
    if ((m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/))) {
      return { type: 'iframe', src: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0&modestbranding=1&playsinline=1' };
    }
    if ((m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)) || (m = url.match(/drive\.google\.com\/open\?id=([\w-]+)/))) {
      return { type: 'iframe', src: 'https://drive.google.com/file/d/' + m[1] + '/preview' };
    }
    if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return { type: 'iframe', src: 'https://player.vimeo.com/video/' + m[1] };
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { type: 'video', src: url };
    return { type: 'link', src: url };
  }

  function gradeName(g) { return { '1': 'الأول الثانوي', '2': 'الثاني الثانوي', '3': 'الثالث الثانوي', all: 'كل الصفوف' }[g] || g; }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }
  function waNumber(local) { const d = String(local || '').replace(/\D/g, ''); return d.indexOf('0') === 0 ? '20' + d.slice(1) : d; }

  // يقفل الزرار أثناء الطلب
  async function busy(btn, fn) {
    if (btn.disabled) return;
    const old = btn.innerHTML; btn.disabled = true; btn.style.opacity = '.7'; btn.textContent = 'جاري التنفيذ...';
    try { return await fn(); } finally { btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = old; }
  }

  return { raw: raw, call: call, getCode: getCode, setCode: setCode, clear: clear, logout: logout, esc: esc, videoInfo: videoInfo, gradeName: gradeName, fmtDate: fmtDate, waNumber: waNumber, busy: busy };
})();
