import React, { useEffect, useMemo, useState } from "react";

/**
 * セキュリティ体験ミニWebアプリ（単一ファイル）
 * - ワーク①: パスワード組み合わせ感覚トレーナー
 * - ワーク②: 攻撃シミュレーター（架空アカウント×攻撃手法 → 成否/理由）
 * - ワーク③: RSAラボ（与えられる情報を段階的に減らし“難しさ”を体感）
 *
 * 注意: すべて教育目的のダミー。実在サービスや実パスワードは扱いません。
 */

// ---------- 共通UI ----------
const Card = ({ title, children, footer }) => (
  <div className="rounded-2xl shadow p-6 bg-white border border-gray-100">
    {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
    <div className="space-y-4">{children}</div>
    {footer && <div className="pt-4 border-t mt-4">{footer}</div>}
  </div>
);

const Section = ({ title, subtitle, children }) => (
  <section className="max-w-6xl mx-auto w-full">
    <div className="mb-4">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const Pill = ({ children }) => (
  <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{children}</span>
);

// ---------- ユーティリティ ----------
const LOG10 = {
  26: Math.log10(26),
  52: Math.log10(52),
  62: Math.log10(62),
  95: Math.log10(95),
};
function formatSciByLog10(log10N) {
  const e = Math.floor(log10N);
  const mant = Math.pow(10, log10N - e);
  return `${mant.toFixed(2)} × 10^${e}`;
}
function formatSecondsByLog10(log10Sec) {
  const sec = Math.pow(10, log10Sec);
  if (!isFinite(sec) || log10Sec > 20) return `約 ${formatSciByLog10(log10Sec)} 秒（とてつもなく長い）`;
  if (sec < 60) return `${sec.toFixed(1)} 秒`;
  const min = sec / 60; if (min < 60) return `${min.toFixed(1)} 分`;
  const hr = min / 60; if (hr < 48) return `${hr.toFixed(1)} 時間`;
  const d = hr / 24; if (d < 365*2) return `${d.toFixed(1)} 日`;
  const y = d / 365; if (y < 1e4) return `${y.toFixed(1)} 年`;
  const ty = y / 1e12; if (ty >= 1) return `${ty.toFixed(2)} 兆年`;
  return `${y.toExponential(2)} 年`;
}

const WORK_KEYS = ["1", "2", "3"];
const WORK_KEY_SET = new Set(WORK_KEYS);
const DEFAULT_WORK_ID = "all";

function getNormalizedBasePath() {
  const base = import.meta.env.BASE_URL ?? "/";
  const withoutTrailingSlash = base.endsWith("/") ? base.slice(0, -1) : base;
  if (!withoutTrailingSlash) return "";
  return withoutTrailingSlash.startsWith("/") ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
}

function stripBaseFromPath(pathname) {
  const normalizedBase = getNormalizedBasePath();
  if (!normalizedBase) return pathname.replace(/^\/+/, "");
  if (pathname.startsWith(normalizedBase)) {
    const remainder = pathname.slice(normalizedBase.length);
    return remainder.replace(/^\/+/, "");
  }
  return pathname.replace(/^\/+/, "");
}

function parseWorkId(pathname) {
  if (!pathname) return DEFAULT_WORK_ID;
  const remainder = stripBaseFromPath(pathname);
  if (!remainder) return DEFAULT_WORK_ID;
  const [firstSegment] = remainder.split("/").filter(Boolean);
  if (firstSegment && WORK_KEY_SET.has(firstSegment)) return firstSegment;
  return DEFAULT_WORK_ID;
}

function buildPathFromWorkId(workId) {
  const normalizedBase = getNormalizedBasePath();
  if (workId === DEFAULT_WORK_ID) return normalizedBase || "/";
  const prefix = normalizedBase || "";
  return `${prefix}/${workId}`;
}

function useWorkRoute(defaultWorkId = DEFAULT_WORK_ID) {
  const getInitial = () => {
    if (typeof window === "undefined") return defaultWorkId;
    return parseWorkId(window.location.pathname);
  };
  const [workId, setWorkId] = useState(getInitial);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopstate = () => {
      setWorkId(parseWorkId(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopstate);
    return () => {
      window.removeEventListener("popstate", handlePopstate);
    };
  }, []);

  const navigate = (nextId) => {
    if (typeof window === "undefined") return;
    const normalized = WORK_KEY_SET.has(nextId) ? nextId : DEFAULT_WORK_ID;
    const nextPath = buildPathFromWorkId(normalized);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setWorkId(normalized);
  };

  return [workId, navigate];
}

// ---------- ワーク①: 通り数トレーナー ----------
function WorkPasswordCombinations() {
  const [charset, setCharset] = useState(62);
  const [length, setLength] = useState(8);
  const log10Comb = useMemo(() => LOG10[charset] * length, [charset, length]);
  const rates = [
    { label: "1,000万/秒（10^7/s）", log10: 7 },
    { label: "10億/秒（10^9/s）", log10: 9 },
  ];
  return (
    <Card
      title="ワーク①: パスワードの通り数（暗算で桁感）"
      footer={<div className="text-sm text-gray-500">ポイント: <b>長さ × 管理 × 2要素(MFA)</b> が再現性のある強さ。</div>}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="block">
            <div className="text-sm text-gray-600 mb-1">文字種</div>
            <select className="w-full rounded-xl border-gray-200" value={charset} onChange={(e)=>setCharset(Number(e.target.value))}>
              <option value={26}>英小のみ（26）</option>
              <option value={52}>英大小（52）</option>
              <option value={62}>英大小+数字（62）</option>
              <option value={95}>印字可能全般（95）</option>
            </select>
          </label>
          <label className="block">
            <div className="text-sm text-gray-600 mb-1">桁数</div>
            <input type="range" min={4} max={24} value={length} onChange={(e)=>setLength(Number(e.target.value))} className="w-full" />
            <div className="mt-1 text-sm"><b>{length}</b> 文字</div>
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-gray-100" onClick={()=>{setCharset(62); setLength(8);}}>Q1: 62^8</button>
            <button className="px-3 py-1.5 rounded-lg bg-gray-100" onClick={()=>{setCharset(26); setLength(12);}}>Q2: 26^12</button>
            <button className="px-3 py-1.5 rounded-lg bg-gray-100" onClick={()=>{setCharset(95); setLength(20);}}>Q3: 95^20</button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-xl">
            <div className="text-sm text-gray-500">通り数（概算）</div>
            <div className="text-2xl font-bold">{formatSciByLog10(log10Comb)}</div>
            <div className="text-xs text-gray-500 mt-1">log10 = {(log10Comb).toFixed(2)}</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {rates.map((r,i)=>{
              const log10Sec = log10Comb - r.log10;
              return (
                <div key={i} className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-500">総当たり時間（{r.label}）</div>
                  <div className="font-semibold">{formatSecondsByLog10(log10Sec)}</div>
                </div>
              );
            })}
          </div>
          <div className="text-sm text-gray-600"><Pill>ヒント</Pill> 短く複雑より<b>長いフレーズ</b>が桁で勝つ。</div>
        </div>
      </div>
    </Card>
  );
}

// ---------- ワーク②: 攻撃シミュレーター ----------
const demoAccounts = [
  { id:'userA', label:'Aさん（大学メール）', username:'u123456@univ.ac.jp', password:'Tennis2024', vulns:{reused:true,weakPattern:true,phishable:true,exposedEmail:true}, controls:{mfa:false, pm:false} },
  { id:'userB', label:'Bさん（クラブSNS）', username:'club_b', password:'Mar14rally!', vulns:{reused:false,weakPattern:true,phishable:true,exposedEmail:false}, controls:{mfa:true, pm:false} },
  { id:'userC', label:'Cさん（個人ブログ）', username:'c_blog', password:'V7t9-kp3Q-ax4M', vulns:{reused:false,weakPattern:false,phishable:false,exposedEmail:true}, controls:{mfa:true, pm:true} },
];
const attackMethods = [
  { key:'leak', name:'漏洩流用', description:'既知の漏洩リストからID/パスを試す。コスト最小。', exploits:['reused'], blockedBy:['mfa'] },
  { key:'phish', name:'フィッシング', description:'偽ログインで入力させる。急がせ/罰・報酬の心理を利用。', exploits:['phishable'], blockedBy:['mfa'] },
  { key:'guess', name:'推測（辞書/個人情報）', description:'趣味+年、誕生日、口癖など“人間らしさ”を推測。', exploits:['weakPattern'], blockedBy:[] },
  { key:'social', name:'ソーシャルエンジニアリング', description:'メール公開や在籍情報を足掛かりに再設定誘導。', exploits:['exposedEmail'], blockedBy:['mfa'] },
];
function simulateAttack(account, method){
  const hitVuln = method.exploits.some(v=>account.vulns[v]);
  if(!hitVuln) return {success:false, reason:'選んだ手法は、このアカウントの弱点に刺さりません。'};
  if(method.blockedBy.some(b=>account.controls[b])) return {success:false, reason:'脆弱性はあったが、MFA等の対策で阻止されました。'};
  return {success:true, reason:'脆弱性に一致、かつ決定的な対策なし。不正ログイン成立。'};
}
function WorkAttackSim(){
  const [targetId, setTargetId] = useState('userA');
  const [methodKey, setMethodKey] = useState('leak');
  const [result, setResult] = useState(null);
  const target = demoAccounts.find(a=>a.id===targetId);
  const method = attackMethods.find(a=>a.key===methodKey);
  return (
    <Card title="ワーク②: 攻撃シミュレーター（成否と理由を表示）">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="text-sm text-gray-600">① 攻撃対象（架空アカウント）</div>
          <div className="space-y-2">
            {demoAccounts.map(acc=> (
              <label key={acc.id} className={`flex items-start gap-3 p-3 rounded-xl border ${acc.id===targetId? 'border-black':'border-gray-200'}`}>
                <input type="radio" name="acc" checked={acc.id===targetId} onChange={()=>setTargetId(acc.id)} />
                <div>
                  <div className="font-semibold">{acc.label}</div>
                  <div className="text-xs text-gray-500">ID: {acc.username}</div>
                  <div className="text-xs text-gray-500">コントロール: {acc.controls.mfa? 'MFA有':'MFA無'} / {acc.controls.pm? 'PM利用':'PM未利用'}</div>
                  <div className="text-xs text-gray-500">脆弱性: {Object.entries(acc.vulns).filter(([,v])=>v).map(([k])=>k).join(', ') || '特になし'}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="text-sm text-gray-600">② 攻撃手法の選択</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {attackMethods.map(m=> (
              <button key={m.key} onClick={()=>setMethodKey(m.key)} className={`text-left p-3 rounded-xl border ${methodKey===m.key? 'border-black bg-gray-50':'border-gray-200'}`}>
                <div className="font-semibold">{m.name}</div>
                <div className="text-xs text-gray-500">{m.description}</div>
                <div className="text-[10px] text-gray-400 mt-1">突く脆弱性: {m.exploits.join(', ')} / 防がれる対策: {m.blockedBy.join(', ')||'—'}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={()=>setResult(simulateAttack(target, method))}>この手法で攻撃！</button>
            <button className="px-4 py-2 rounded-xl bg-gray-100" onClick={()=>setResult(null)}>リセット</button>
          </div>
          {result && (
            <div className={`p-3 rounded-xl border ${result.success? 'bg-rose-50 border-rose-200':'bg-emerald-50 border-emerald-200'}`}>
              <div className="font-semibold">{result.success? '不正ログイン 成立':'ブロック 成功'}</div>
              <div className="text-sm mt-1">{result.reason}</div>
              <div className="text-xs text-gray-500 mt-2">学び: 守りの順番は <b>PMで使い回し断つ → MFA → 主ドメイン確認</b>。攻撃の最短順は <b>漏洩→釣り→推測→ソーシャル</b>。</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------- ワーク③: RSAラボ（段階的難易度） ----------
function egcd(a,b){ if(b===0) return {g:a,x:1,y:0}; const {g,x:y1,y:x1}=egcd(b,a%b); return {g,x:x1,y:y1-Math.floor(a/b)*x1}; }
function modInv(a,m){ const {g,x}=egcd((a%m+m)%m,m); if(g!==1) return null; return (x%m+m)%m; }
function trialFactor(n){ for(let i=2;i*i<=n;i++){ if(n%i===0) return [i,n/i]; } return null; }
const rsaLevels = [
  { key:'L1', title:'L1: p,q,e が与えられている（計算は面倒だが機械的）', given:{p:17,q:23,e:3}, ask:'n, φ(n), d を計算' },
  { key:'L2', title:'L2: n,e と小さな p,q が与えられている（素因数から d を計算）', given:{n:437,e:5,p:19,q:23}, ask:'d を計算' },
  { key:'L3', title:'L3: n,e のみ（2桁×2桁の素因数分解が必要）', given:{n:667,e:7}, ask:'p,q を見つけて d を計算' }, // 23*29=667
];
function RSALevel({def}){
  const [p,setP]=useState(def.given.p??'');
  const [q,setQ]=useState(def.given.q??'');
  const [n,setN]=useState(def.given.n??'');
  const [e,setE]=useState(def.given.e??'');
  const [d,setD]=useState(''); // 任意入力欄（検算用）
  const [hint,setHint]=useState('');
  const [out,setOut]=useState(null);
  function compute(){
    try{
      let P=p?Number(p):null; let Q=q?Number(q):null; let N=n?Number(n):null; const E=e?Number(e):null;
      if(P&&Q) N=P*Q; if((!P||!Q) && N){ const fac=trialFactor(N); if(fac){ P=fac[0]; Q=fac[1]; } }
      if(!P||!Q||!N) throw new Error('p,q,n のいずれかが未確定です');
      const phi=(P-1)*(Q-1);
      const D=modInv(E, phi);
      setOut({N,phi,D,P,Q});
    }catch(err){ setOut({error: err.message}); }
  }
  function giveHint(){
    if(def.key==='L3'){ const N=def.given.n; setHint(`√n ≈ ${Math.sqrt(N).toFixed(1)}。近い素数を試すと 23×29=667。`); }
    else if(def.key==='L2'){ setHint('φ(n)=(p-1)(q-1)。d は e の逆元（mod φ(n)）。'); }
    else { setHint('φ(n)=(p-1)(q-1)、d≡e^{-1} (mod φ)。拡張ユークリッドで逆元を求める。'); }
  }
  return (
    <Card title={def.title}>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">p<input className="w-full rounded-xl border-gray-200 font-mono" value={p} onChange={e=>setP(e.target.value)} placeholder={def.given.p??''} /></label>
            <label className="block text-sm">q<input className="w-full rounded-xl border-gray-200 font-mono" value={q} onChange={e=>setQ(e.target.value)} placeholder={def.given.q??''} /></label>
            <label className="block text-sm">n<input className="w-full rounded-xl border-gray-200 font-mono" value={n} onChange={e=>setN(e.target.value)} placeholder={def.given.n??''} /></label>
            <label className="block text-sm">e<input className="w-full rounded-xl border-gray-200 font-mono" value={e} onChange={e=>setE(e.target.value)} placeholder={def.given.e??''} /></label>
            <label className="block text-sm">d<input className="w-full rounded-xl border-gray-200 font-mono" value={d} onChange={e=>setD(e.target.value)} placeholder="（自分で計算して入力可・任意）" /></label>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={compute}>計算 / 検証</button>
            <button className="px-4 py-2 rounded-xl bg-gray-100" onClick={giveHint}>ヒント</button>
          </div>
          {hint && <div className="text-xs text-gray-500">{hint}</div>}
        </div>
        <div className="space-y-3">
          {out?.error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm">{out.error}</div>}
          {out && !out.error && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
              <div>n = <b className="font-mono">{out.N}</b>, φ(n) = <b className="font-mono">{out.phi}</b></div>
              <div>d = e^{-1} mod φ(n) → <b className="font-mono">{out.D ?? '逆元なし'}</b></div>
              <div className="text-xs text-gray-500 mt-1">（教育用に小さな素数。実運用のRSA鍵（2048bit等）は桁が違い、現実的な素因数分解は困難）</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
function WorkRSALab(){
  return (
    <Card title="ワーク③: RSAラボ（与えられる情報を減らしながら体験）" footer={<div className="text-sm text-gray-500">注意: すべて教育目的のスモールナンバー。実データの解析や実攻撃は扱いません。</div>}>
      <div className="space-y-4">{rsaLevels.map(def=> <RSALevel key={def.key} def={def} />)}</div>
    </Card>
  );
}

const WORK_SECTIONS = [
  {
    id: "1",
    navLabel: "ワーク①",
    title: "ワーク①: パスワード組み合わせ",
    subtitle: "“短く複雑”より“長く覚えやすい”。10の何乗で直感を掴む。",
    Component: WorkPasswordCombinations,
  },
  {
    id: "2",
    navLabel: "ワーク②",
    title: "ワーク②: 攻撃シミュレーター",
    subtitle: "架空アカウント×攻撃手法。成否と“なぜ”を即時フィードバック。",
    Component: WorkAttackSim,
  },
  {
    id: "3",
    navLabel: "ワーク③",
    title: "ワーク③: RSAを解く計算をしよう",
    subtitle: "与えられる数字を減らしながら、RSAの“難しさ”を体感。",
    Component: WorkRSALab,
  },
];

// ---------- ルート ----------
export default function App(){
  const [activeWorkId, navigate] = useWorkRoute(DEFAULT_WORK_ID);
  const activeWork = WORK_SECTIONS.find((work) => work.id === activeWorkId);
  const ActiveWorkComponent = activeWork?.Component;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">セキュリティ体験ハンズオン</h1>
        <p className="text-gray-600 mt-1">30分発表用: 体験→理解→持ち帰り をこの1画面で。実データは一切使いません。</p>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          {[
            { id: DEFAULT_WORK_ID, label: "全ワーク" },
            ...WORK_SECTIONS.map(({ id, navLabel }) => ({ id, label: navLabel })),
          ].map((item) => {
            const isActive = activeWorkId === item.id;
            return (
              <button
                key={item.id}
                className={`px-3 py-1.5 rounded-full border ${
                  isActive ? "bg-black text-white border-black" : "bg-white border-gray-300 text-gray-700"
                }`}
                onClick={() => navigate(item.id)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 pb-12 space-y-8">
        {activeWorkId === DEFAULT_WORK_ID && WORK_SECTIONS.map(({ id, title, subtitle, Component }) => (
          <Section key={id} title={title} subtitle={subtitle}>
            <Component />
          </Section>
        ))}
        {activeWorkId !== DEFAULT_WORK_ID && ActiveWorkComponent && (
          <Section title={activeWork.title} subtitle={activeWork.subtitle}>
            <ActiveWorkComponent />
          </Section>
        )}
        {activeWorkId !== DEFAULT_WORK_ID && !activeWork && (
          <Section title="指定されたワークが見つかりません" subtitle="URL を確認するか、全ワークに戻ってください。">
            <Card>
              <div className="space-y-2 text-sm">
                <p>指定された URL に対応するワークがありません。</p>
                <button
                  type="button"
                  onClick={() => navigate(DEFAULT_WORK_ID)}
                  className="px-4 py-2 rounded-xl bg-black text-white"
                >
                  全ワークに戻る
                </button>
              </div>
            </Card>
          </Section>
        )}
      </main>
      <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-gray-500">© 2025 体験重視セキュリティワーク. 教育目的のデモ。実サービス・実パスワードの入力は行いません。</footer>
    </div>
  );
}
