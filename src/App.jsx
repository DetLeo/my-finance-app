import { useState, useMemo, useEffect, useRef } from "react";
import {
  Home, Wallet, UtensilsCrossed, ReceiptText, TrendingUp,
  Landmark, BarChart2, DollarSign, ArrowLeftRight,
  ArrowDownCircle, ArrowUpCircle, CalendarMinus, CalendarPlus,
  Camera, ClipboardList, Save, ChevronRight,
  Sun, Palmtree, HardDrive, Upload, Download, Lightbulb
} from "lucide-react";

const SAGE = "var(--sage)";
const SAGE_DARK = "var(--sage-dark)";
const BG = "var(--bg)";
const CARD = "var(--card)";
const RED = "var(--red)";
const GOLD = "var(--gold)";
const BLUE = "var(--blue)";
const PURPLE = "var(--purple)";

const PAGES = ["overview", "assets", "food", "accounts", "forecast"];
const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

const ASSET_TYPES = [
  { key: "cash",    label: "現金／存款", icon: <Landmark size={18} />,      color: SAGE,   colorBg: "var(--green-soft)" },
  { key: "stock",   label: "股票／基金", icon: <BarChart2 size={18} />,      color: BLUE,   colorBg: "var(--blue-soft)" },
  { key: "ustock",  label: "美股持倉",   icon: <DollarSign size={18} />,     color: PURPLE, colorBg: "var(--purple-soft)" },
  { key: "foreign", label: "外幣資產",   icon: <ArrowLeftRight size={18} />, color: GOLD,   colorBg: "var(--gold-soft)" },
];

const DEFAULT_RATES = { TWD: 1, USD: 32.5, JPY: 0.22 };
const CURRENCY_LABELS = { TWD: "NT$", USD: "US$", JPY: "¥" };

const DEFAULT_ASSETS = { cash: [], stock: [], ustock: [], foreign: [] };
const DEFAULT_EXPENSES = [];
const DEFAULT_INCOME = [];
const DEFAULT_ONETIME = [];
const DEFAULT_ONETIME_INCOME = [];
const DEFAULT_SNAPSHOTS = [];
const DEFAULT_FOOD = { weekdayB: 50, weekdayL: 100, weekdayD: 100, weekendB: 80, weekendL: 150, weekendD: 150 };

function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function formatNT(n) { return "NT$" + Math.round(n).toLocaleString(); }
function toTWD(amount, currency = "TWD", rates = DEFAULT_RATES) {
  return amount * (rates[currency] || 1);
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
}
function calcTotal(assets, rates = DEFAULT_RATES) {
  return Object.entries(assets).reduce((sum, [type, items]) => {
    if (type === "ustock") {
      return sum + (items || []).reduce((s, item) => s + toTWD(item.shares * item.price, "USD", rates), 0);
    }
    return sum + (items || []).reduce((s, item) =>
      s + toTWD(item.amount, type === "foreign" ? item.currency : "TWD", rates), 0);
  }, 0);
}
function truncate(str) {
  if (!str) return "";
  return str.length > 5 ? str.slice(0, 5) + "…" : str;
}
function calcFoodMonthly(food) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  let weekdays = 0, weekends = 0;
  for (let d = 1; d <= days; d++) {
    const day = new Date(year, month, d).getDay();
    if (day === 0 || day === 6) weekends++;
    else weekdays++;
  }
  return weekdays * ((food.weekdayB||0) + (food.weekdayL||0) + (food.weekdayD||0)) +
         weekends * ((food.weekendB||0) + (food.weekendL||0) + (food.weekendD||0));
}
function amountFor(item, calMonth, calYear) {
  if (item.repeat === "fixed" && item.firstAmount) {
    const startY = item.year || new Date().getFullYear();
    if (calMonth === item.month && calYear === startY) return item.firstAmount;
  }
  return item.amount;
}

function shouldAppear(item, calMonth, calYear) {
  if (item.repeat === "once") {
    const itemYear = item.year || new Date().getFullYear();
    return item.month === calMonth && itemYear === calYear;
  }
  if (item.repeat === "fixed") {
    const startM = item.month;
    const startY = item.year || new Date().getFullYear();
    const totalMonthsDiff = (calYear - startY) * 12 + (calMonth - startM);
    return totalMonthsDiff >= 0 && totalMonthsDiff < (item.times || 1);
  }
  return item.month === calMonth;
}

function ProgressBar({ value, max, color = SAGE }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: "var(--track)", borderRadius: 99, height: 6, overflow: "hidden" }}>
      <div style={{ width: pct+"%", background: color, height: "100%", borderRadius: 99, transition: "width 0.6s ease" }} />
    </div>
  );
}
function Card({ children, style = {} }) {
  return (
    <div style={{ background: CARD, borderRadius: 20, padding: "18px 20px",
      boxShadow: "var(--shadow)", ...style }}>
      {children}
    </div>
  );
}
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "10px 0", border: "none", borderRadius: 12,
      background: active ? SAGE : "transparent",
      color: active ? "#fff" : "var(--sub)", fontWeight: active ? 700 : 400,
      fontSize: 13, cursor: "pointer", transition: "all 0.2s",
      fontFamily: "'Noto Sans TC', sans-serif"
    }}>{label}</button>
  );
}
function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, border: "none", background: "none", display: "flex",
      flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", padding: "8px 0"
    }}>
      <span style={{ color: active ? SAGE : "var(--sub2)", display: "flex" }}>{icon}</span>
      <span style={{ fontSize: 11, color: active ? SAGE : "var(--sub2)", fontWeight: active ? 700 : 400,
        fontFamily: "'Noto Sans TC', sans-serif" }}>{label}</span>
      {active && <div style={{ width: 4, height: 4, borderRadius: 99, background: SAGE, marginTop: -2 }} />}
    </button>
  );
}

function CombinedOneTimeList({ expenseItems, incomeItems }) {
  const [expanded, setExpanded] = useState(false);
  const total = (expenseItems?.length || 0) + (incomeItems?.length || 0);
  if (total === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {expanded && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8, justifyContent: "center" }}>
          {(expenseItems || []).map(o => (
            <div key={o.id} style={{ background: "var(--red-soft)", borderRadius: 8, padding: "3px 10px" }}>
              <span style={{ fontSize: 11, color: RED, fontWeight: 600, fontFamily: "'Noto Sans TC', sans-serif", whiteSpace: "nowrap" }}>
                {truncate(o.name)} -{formatNT(o.amount)}
              </span>
            </div>
          ))}
          {(incomeItems || []).map(o => (
            <div key={o.id} style={{ background: "var(--green-soft)", borderRadius: 8, padding: "3px 10px" }}>
              <span style={{ fontSize: 11, color: SAGE, fontWeight: 600, fontFamily: "'Noto Sans TC', sans-serif", whiteSpace: "nowrap" }}>
                {truncate(o.name)} +{formatNT(o.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div onClick={() => setExpanded(!expanded)}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--pill)", borderRadius: 99, padding: "4px 14px", cursor: "pointer" }}>
          <ChevronRight size={12} color={SAGE} style={{ transform: expanded ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.2s" }} />
          <span style={{ fontSize: 11, color: SAGE, fontWeight: 600, fontFamily: "'Noto Sans TC', sans-serif" }}>
            {expanded ? "收起" : total + " 筆特定收支"}
          </span>
        </div>
      </div>
    </div>
  );
}

function SwipeContainer({ pageIndex, setPageIndex, children }) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isHorizontalRef = useRef(null);
  const pageIndexRef = useRef(pageIndex);

  useEffect(() => { pageIndexRef.current = pageIndex; }, [pageIndex]);

  const WIDTH = typeof window !== "undefined" ? window.innerWidth : 390;
  const THRESHOLD = WIDTH * 0.4;
  const SPRING = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

  const setTranslate = (x, animated) => {
    if (!containerRef.current) return;
    containerRef.current.style.transition = animated ? `transform 350ms ${SPRING}` : "none";
    containerRef.current.style.transform = `translateX(${x}px)`;
  };

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handleTouchStart = (e) => {
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      isDraggingRef.current = true;
      isHorizontalRef.current = null;
      currentXRef.current = 0;
      const idx = pageIndexRef.current;
      setTranslate(-idx * WIDTH, false);
    };
    const handleTouchMove = (e) => {
      if (!isDraggingRef.current) return;
      const dx = e.touches[0].clientX - startXRef.current;
      const dy = e.touches[0].clientY - startYRef.current;
      if (isHorizontalRef.current === null) {
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
        } else return;
      }
      if (isHorizontalRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const idx = pageIndexRef.current;
        const base = -idx * WIDTH;
        let x = base + dx;
        if (idx === 0 && dx > 0) x = base + dx * 0.15;
        if (idx === PAGES.length - 1 && dx < 0) x = base + dx * 0.15;
        currentXRef.current = dx;
        setTranslate(x, false);
      }
    };
    const handleTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (!isHorizontalRef.current) return;
      const dx = currentXRef.current;
      const idx = pageIndexRef.current;
      let newIndex = idx;
      if (dx < -THRESHOLD && idx < PAGES.length - 1) newIndex = idx + 1;
      else if (dx > THRESHOLD && idx > 0) newIndex = idx - 1;
      setPageIndex(newIndex);
      setTranslate(-newIndex * WIDTH, true);
    };
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => { setTranslate(-pageIndex * WIDTH, true); }, [pageIndex]);

  return (
    <div ref={wrapperRef} style={{ overflow: "hidden", flex: 1, position: "relative" }}>
      <div ref={containerRef} style={{
        display: "flex", width: `${PAGES.length * 100}%`, height: "100%",
        transform: `translateX(-${pageIndex * WIDTH}px)`, willChange: "transform",
      }}>
        {children}
      </div>
    </div>
  );
}

function OverviewPage({ expenses, income, assets, snapshots, onSaveSnapshot, oneTimeIncome, oneTime, food, rates }) {
  const totalTWD = calcTotal(assets, rates);
  const foodMonthly = calcFoodMonthly(food);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const thisMonthOneTimeIncome = oneTimeIncome.filter(o => shouldAppear(o, currentMonth, currentYear));
  const thisMonthOneTime = oneTime.filter(o => shouldAppear(o, currentMonth, currentYear));
  const thisMonthExtraIncome = thisMonthOneTimeIncome.reduce((s, o) => s + o.amount, 0);
  const thisMonthExtraExpense = thisMonthOneTime.reduce((s, o) => s + o.amount, 0);

  const fixedExpense = expenses.reduce((s, e) => s + e.amount, 0) + foodMonthly;
  const fixedIncome  = income.reduce((s, i) => s + i.amount, 0);
  const totalExpense = fixedExpense + thisMonthExtraExpense;
  const totalIncome  = fixedIncome + thisMonthExtraIncome;
  const netMonthly   = totalIncome - totalExpense;

  const typeTotals = Object.fromEntries(ASSET_TYPES.map(t => [
    t.key,
    t.key === "ustock"
      ? (assets.ustock || []).reduce((s, item) => s + toTWD(item.shares * item.price, "USD", rates), 0)
      : (assets[t.key] || []).reduce((s, item) =>
          s + toTWD(item.amount, t.key === "foreign" ? item.currency : "TWD", rates), 0)
  ]));

  const lastSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const diff = lastSnap ? totalTWD - lastSnap.total : null;
  const daysSince = lastSnap ? Math.round((Date.now() - lastSnap.ts) / 86400000) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: `linear-gradient(135deg, ${SAGE_DARK} 0%, ${SAGE} 100%)`, borderRadius: 24, padding: "24px 22px", color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4, fontFamily: "'Noto Sans TC', sans-serif" }}>總資產（折合台幣）</div>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, fontFamily: "'Noto Sans TC', sans-serif" }}>{formatNT(totalTWD)}</div>
        <div style={{ display: "flex", gap: 3, marginTop: 14, borderRadius: 99, overflow: "hidden", height: 8 }}>
          {ASSET_TYPES.map(t => (
            <div key={t.key} style={{ flex: typeTotals[t.key] || 0.001, background: t.key === "cash" ? "rgba(255,255,255,0.85)" : t.key === "stock" ? "rgba(255,255,255,0.6)" : t.key === "ustock" ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {ASSET_TYPES.map(t => (
            <div key={t.key} style={{ flex: 1, background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "8px 4px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", color: "#fff", opacity: 0.9 }}>{t.icon}</div>
              <div style={{ fontSize: 9, opacity: 0.75, marginTop: 4, fontFamily: "'Noto Sans TC', sans-serif" }}>{t.key === "cash" ? "存款" : t.key === "stock" ? "股票" : t.key === "ustock" ? "美股" : "外幣"}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, fontFamily: "'Noto Sans TC', sans-serif" }}>{formatNT(typeTotals[t.key])}</div>
              <div style={{ fontSize: 9, opacity: 0.6, fontFamily: "'Noto Sans TC', sans-serif" }}>{totalTWD > 0 ? Math.round((typeTotals[t.key] / totalTWD) * 100) : 0}%</div>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Camera size={16} color={SAGE} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>與上次紀錄比較</span>
        </div>
        {lastSnap ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--sub)", fontFamily: "'Noto Sans TC', sans-serif" }}>上次紀錄</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text2)", fontFamily: "'Noto Sans TC', sans-serif" }}>{lastSnap.date}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--sub)", fontFamily: "'Noto Sans TC', sans-serif" }}>當時總資產</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text2)", fontFamily: "'Noto Sans TC', sans-serif" }}>{formatNT(lastSnap.total)}</div>
              </div>
            </div>
            <div style={{ background: diff >= 0 ? "var(--green-soft)" : "var(--red-soft)", borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--sub)", fontFamily: "'Noto Sans TC', sans-serif" }}>{daysSince === 0 ? "今天" : `${daysSince} 天`}間資產變動</div>
                <div style={{ fontSize: 11, color: "var(--sub2)", marginTop: 2, fontFamily: "'Noto Sans TC', sans-serif" }}>{diff < 0 ? `淨消費約 ${formatNT(Math.abs(diff))}` : `淨增加約 ${formatNT(diff)}`}</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: diff >= 0 ? SAGE : RED, fontFamily: "'Noto Sans TC', sans-serif" }}>{diff >= 0 ? "+" : ""}{formatNT(diff)}</div>
            </div>
            {snapshots.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "var(--faint)", marginBottom: 6, fontFamily: "'Noto Sans TC', sans-serif" }}>歷史紀錄</div>
                {[...snapshots].reverse().slice(0, 5).map((s) => (
                  <div key={s.ts} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f5f2ee" }}>
                    <span style={{ fontSize: 12, color: "var(--sub)", fontFamily: "'Noto Sans TC', sans-serif" }}>{s.date}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>{formatNT(s.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0", color: "var(--faint)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><ClipboardList size={36} color="var(--faint)" /></div>
            <div style={{ fontSize: 13, fontFamily: "'Noto Sans TC', sans-serif" }}>還沒有紀錄，按下方按鈕儲存今天的資產快照</div>
          </div>
        )}
        <button onClick={onSaveSnapshot} style={{ width: "100%", marginTop: 14, padding: "13px", background: SAGE, color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Save size={16} color="#fff" />
          儲存今天的資產快照（{todayStr()}）
        </button>
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12, fontFamily: "'Noto Sans TC', sans-serif" }}>本月現金流</div>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "月收入", val: totalIncome, color: SAGE, icon: <ArrowUpCircle size={14} color={SAGE} /> },
            { label: "月支出", val: totalExpense, color: RED, icon: <ArrowDownCircle size={14} color={RED} /> },
            { label: "月結餘", val: netMonthly, color: netMonthly >= 0 ? SAGE : RED, icon: <TrendingUp size={14} color={netMonthly >= 0 ? SAGE : RED} /> }
          ].map(({ label, val, color, icon }) => (
            <div key={label} style={{ flex: 1, background: BG, borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 11, color: "var(--sub)", marginBottom: 4, fontFamily: "'Noto Sans TC', sans-serif" }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'Noto Sans TC', sans-serif" }}>{formatNT(val)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={16} color={SAGE} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>資產趨勢</span>
          </div>
          {snapshots.length >= 2 && (() => {
            const pts = snapshots.slice(-12);
            const chg = pts[pts.length-1].total - pts[0].total;
            return (
              <span style={{ background: chg >= 0 ? "var(--green-soft)" : "var(--red-soft)", color: chg >= 0 ? SAGE : RED, borderRadius: 99, padding: "3px 12px", fontSize: 13, fontWeight: 700, fontFamily: "'Noto Sans TC', sans-serif" }}>
                {chg >= 0 ? "+" : ""}{formatNT(chg)}
              </span>
            );
          })()}
        </div>
        {snapshots.length >= 2 ? (() => {
          const pts = snapshots.slice(-12);
          const W = 280, H = 90, PAD = 8, AXIS = 38;
          const vals = pts.map(p => p.total);
          const min = Math.min(...vals), max = Math.max(...vals);
          const range = max - min || 1;
          const fmtWan = v => {
            const w = v / 10000;
            return (w >= 100 ? Math.round(w) : +w.toFixed(1)) + "萬";
          };
          const xy = pts.map((p, i) => [
            AXIS + PAD + (i / (pts.length - 1)) * (W - AXIS - PAD * 2),
            H - PAD - ((p.total - min) / range) * (H - PAD * 2)
          ]);
          const line = xy.map(([x, y], i) => (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1)).join(" ");
          const up = pts[pts.length-1].total >= pts[0].total;
          const color = up ? SAGE : RED;
          return (
            <>
              <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", height: "auto", display: "block" }}>
                {[[max, PAD], [(max+min)/2, H/2], [min, H-PAD]].map(([v, y], i) => (
                  <g key={i}>
                    <line x1={AXIS} y1={y} x2={W-PAD} y2={y} stroke="var(--track)" strokeWidth="0.7" strokeDasharray="3 3" />
                    <text x={AXIS - 5} y={y + 3} textAnchor="end" fontSize="8.5" fill="var(--faint)" fontFamily="'Noto Sans TC', sans-serif">{fmtWan(v)}</text>
                  </g>
                ))}
                <path d={line + " L" + xy[xy.length-1][0] + "," + (H-2) + " L" + xy[0][0] + "," + (H-2) + " Z"} fill={color} opacity="0.08" />
                <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {xy.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={i === xy.length-1 ? 4 : 2.5} fill={i === xy.length-1 ? color : "var(--card)"} stroke={color} strokeWidth="1.5" />
                ))}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 10, color: "var(--faint)", fontFamily: "'Noto Sans TC', sans-serif" }}>{pts[0].date}</span>
                <span style={{ fontSize: 10, color: "var(--faint)", fontFamily: "'Noto Sans TC', sans-serif" }}>{pts[pts.length-1].date}</span>
              </div>
            </>
          );
        })() : (
          <div style={{ textAlign: "center", padding: "14px 0", fontSize: 13, color: "var(--faint)", fontFamily: "'Noto Sans TC', sans-serif" }}>
            多按幾次資產快照，就能看到趨勢線
          </div>
        )}
      </Card>
    </div>
  );
}function AssetsPage({ assets, setAssets, rates, setRates }) {
  const [activeType, setActiveType] = useState("cash");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", currency: "USD", shares: "", price: "" });
  const [editId, setEditId] = useState(null);
  const [editNameId, setEditNameId] = useState(null);
  const [quickUpdate, setQuickUpdate] = useState(false);
  const quickPrices = useRef({});
  const addRef = useRef(null);

  const activeItems = assets[activeType] || [];
  const activeInfo = ASSET_TYPES.find(t => t.key === activeType);

  const handleShowAdd = () => {
    setShowAdd(!showAdd);
    setTimeout(() => { addRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100);
  };

  const updateItem = (id, patch) => setAssets(prev => ({
    ...prev,
    [activeType]: (prev[activeType] || []).map(i => i.id === id ? { ...i, ...patch } : i)
  }));

  const addItem = () => {
    if (!form.name) return;
    if (activeType === "ustock") {
      if (!form.shares || !form.price) return;
      setAssets(prev => ({ ...prev, ustock: [...(prev.ustock || []), {
        id: Date.now(), name: form.name,
        shares: parseFloat(form.shares) || 0,
        price: parseFloat(form.price) || 0
      }]}));
    } else {
      if (!form.amount) return;
      setAssets(prev => ({ ...prev, [activeType]: [...(prev[activeType] || []), {
        id: Date.now(), name: form.name, amount: parseFloat(form.amount) || 0,
        ...(activeType === "foreign" ? { currency: form.currency } : {})
      }]}));
    }
    setForm({ name: "", amount: "", currency: "USD", shares: "", price: "" });
    setShowAdd(false);
  };

  const removeItem = (id) => setAssets(prev => ({ ...prev, [activeType]: (prev[activeType] || []).filter(i => i.id !== id) }));

  const inputStyle = { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--inputborder)", fontSize: 16, fontFamily: "'Noto Sans TC', sans-serif", color: "var(--text)", background: "var(--input)", outline: "none" };
  const quickInput = { padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${activeInfo.color}`, fontSize: 16, fontFamily: "'Noto Sans TC', sans-serif", color: "var(--text)", background: "var(--input)", outline: "none", textAlign: "right", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", background: "var(--tabbg)", borderRadius: 14, padding: 4, gap: 4 }}>
        {ASSET_TYPES.map(t => (
          <button key={t.key} onClick={() => { setActiveType(t.key); setShowAdd(false); setEditId(null); setEditNameId(null); setQuickUpdate(false); }}
            style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 12,
              background: activeType === t.key ? SAGE : "transparent",
              color: activeType === t.key ? "#fff" : t.color,
              cursor: "pointer", transition: "all 0.2s", display: "flex", justifyContent: "center", alignItems: "center" }}>
            {t.icon}
          </button>
        ))}
      </div>

      <Card style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: activeInfo.color, display: "flex" }}>{activeInfo.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>{activeInfo.label}</span>
          </div>
          {activeType === "ustock" && activeItems.length > 0 && !quickUpdate && (
            <button onClick={() => { quickPrices.current = {}; setQuickUpdate(true); }}
              style={{ border: "none", background: "var(--purple-soft)", color: PURPLE, borderRadius: 99, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}>
              更新股價
            </button>
          )}
        </div>

        {activeType === "ustock" && quickUpdate && (
          <div style={{ marginBottom: 10, padding: 12, background: "var(--purple-soft)", borderRadius: 14 }}>
            {activeItems.map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>{item.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--sub2)" }}>US$</span>
                  <input type="number" defaultValue={item.price}
                    onChange={e => { quickPrices.current[item.id] = e.target.value; }}
                    style={{ width: 90, padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${PURPLE}`, fontSize: 16, textAlign: "right", fontFamily: "'Noto Sans TC', sans-serif", color: "var(--text)", background: "var(--input)", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            ))}
            <button onClick={() => {
              setAssets(prev => ({ ...prev, ustock: (prev.ustock || []).map(i => {
                const v = parseFloat(quickPrices.current[i.id]);
                return !isNaN(v) && v > 0 ? { ...i, price: v } : i;
              })}));
              setQuickUpdate(false);
            }}
              style={{ width: "100%", marginTop: 8, background: PURPLE, color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}>
              完成更新
            </button>
          </div>
        )}

        {activeType === "foreign" && (
          <div style={{ marginBottom: 10, padding: "6px 0 10px", borderBottom: "1px solid var(--line)", display: "flex", gap: 16, alignItems: "center" }}>
            {Object.keys(DEFAULT_RATES).filter(c => c !== "TWD").map(c => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 11, color: "var(--sub2)", fontFamily: "'Noto Sans TC', sans-serif" }}>1{c}=</span>
                <input type="number" defaultValue={rates[c]}
                  onBlur={e => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) setRates(prev => ({ ...prev, [c]: val }));
                  }}
                  style={{ width: 48, border: "none", borderBottom: "1px solid var(--inputborder)", background: "transparent", fontSize: 12, color: "var(--sub)", outline: "none", textAlign: "center", padding: "2px 0", fontFamily: "'Noto Sans TC', sans-serif" }}
                />
                <span style={{ fontSize: 11, color: "var(--sub2)" }}>NT$</span>
              </div>
            ))}
          </div>
        )}

        {activeItems.map(item => {
          const twdVal = activeType === "ustock"
            ? toTWD(item.shares * item.price, "USD", rates)
            : toTWD(item.amount, activeType === "foreign" ? item.currency : "TWD", rates);
          return (
            <div key={item.id} style={{ padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: activeInfo.colorBg, display: "flex", alignItems: "center", justifyContent: "center", color: activeInfo.color, flexShrink: 0 }}>
                    {activeInfo.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editNameId === item.id ? (
                      <input autoFocus defaultValue={item.name}
                        onBlur={e => { if (e.target.value.trim()) updateItem(item.id, { name: e.target.value.trim() }); setEditNameId(null); }}
                        style={{ ...inputStyle, padding: "4px 8px", fontSize: 14, width: "100%", boxSizing: "border-box", border: `1.5px solid ${activeInfo.color}` }} />
                    ) : (
                      <div onClick={() => setEditNameId(item.id)} style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif", cursor: "pointer" }}>{item.name}</div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--sub2)", fontFamily: "'Noto Sans TC', sans-serif" }}>
                      {activeType === "ustock" ? `${item.shares}股 × US${item.price}` : (activeType === "foreign" ? item.currency : "台幣")}
                      {activeType === "foreign" && ` · ${CURRENCY_LABELS[item.currency]}${item.amount.toLocaleString()}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {editId === item.id ? (
                    <div onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setEditId(null); }}
                      style={{ display: "flex", gap: 6 }}>
                      {activeType === "ustock" ? (
                        <>
                          <input type="number" autoFocus defaultValue={item.shares} placeholder="股數"
                            onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateItem(item.id, { shares: v }); }}
                            style={{ ...quickInput, width: 70 }} />
                          <input type="number" defaultValue={item.price} placeholder="價格"
                            onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateItem(item.id, { price: v }); }}
                            style={{ ...quickInput, width: 80 }} />
                        </>
                      ) : (
                        <input type="number" autoFocus defaultValue={item.amount}
                          onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateItem(item.id, { amount: v }); }}
                          style={{ ...quickInput, width: 110 }} />
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: "right", cursor: "pointer" }} onClick={() => setEditId(item.id)}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: activeInfo.color, fontFamily: "'Noto Sans TC', sans-serif" }}>{formatNT(twdVal)}</div>
                      <div style={{ fontSize: 10, color: "var(--faint)", fontFamily: "'Noto Sans TC', sans-serif" }}>點金額修改</div>
                    </div>
                  )}
                  <button onClick={() => removeItem(item.id)} style={{ border: "none", background: "var(--red-soft)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: RED, fontSize: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              </div>
            </div>
          );
        })}

        <button onClick={handleShowAdd} style={{ width: "100%", marginTop: 12, padding: "12px", border: `2px dashed var(--sage-44)`, borderRadius: 14, background: "none", cursor: "pointer", color: activeInfo.color, fontSize: 14, fontWeight: 600, fontFamily: "'Noto Sans TC', sans-serif" }}>
          + 新增{activeInfo.label}
        </button>

        {showAdd && (
          <div ref={addRef} style={{ marginTop: 12, padding: 14, background: BG, borderRadius: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="text" placeholder="名稱" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              style={{ ...inputStyle, padding: "10px 14px", border: "1px solid var(--inputborder)", width: "100%", boxSizing: "border-box" }} />
            {activeType === "ustock" ? (
              <>
                <input type="number" placeholder="持有股數" value={form.shares} onChange={e => setForm(p => ({ ...p, shares: e.target.value }))}
                  style={{ ...inputStyle, padding: "10px 14px", border: "1px solid var(--inputborder)", width: "100%", boxSizing: "border-box" }} />
                <input type="number" placeholder="當日收盤價（USD）" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  style={{ ...inputStyle, padding: "10px 14px", border: "1px solid var(--inputborder)", width: "100%", boxSizing: "border-box" }} />
              </>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" placeholder="金額" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  style={{ ...inputStyle, flex: 1, minWidth: 0, padding: "10px 14px", border: "1px solid var(--inputborder)" }} />
                {activeType === "foreign" && (
                  <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                    style={{ ...inputStyle, width: 80, padding: "10px 8px", border: "1px solid var(--inputborder)" }}>
                    {Object.keys(DEFAULT_RATES).filter(c => c !== "TWD").map(c => <option key={c}>{c}</option>)}
                  </select>
                )}
              </div>
            )}
            <button onClick={addItem} style={{ background: activeInfo.color, color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}>確認新增</button>
          </div>
        )}
      </Card>
    </div>
  );
}function FoodPage({ food, setFood }) {
  const monthly = calcFoodMonthly(food);
  const fields = [
    { label: "早餐", key: "weekdayB", section: "平日" },
    { label: "午餐", key: "weekdayL", section: "平日" },
    { label: "晚餐", key: "weekdayD", section: "平日" },
    { label: "早餐", key: "weekendB", section: "假日" },
    { label: "午餐", key: "weekendL", section: "假日" },
    { label: "晚餐", key: "weekendD", section: "假日" },
  ];

  const handleBlur = (key, val) => {
    const n = parseInt(val) || 0;
    setFood(prev => ({ ...prev, [key]: n }));
  };

  const inputStyle = {
    padding: "8px 12px", borderRadius: 8, border: "1px solid var(--inputborder)",
    fontSize: 16, fontFamily: "'Noto Sans TC', sans-serif",
    color: "var(--text)", background: "var(--input)", outline: "none",
    width: 90, textAlign: "right", boxSizing: "border-box"
  };

  const weekday = fields.filter(f => f.section === "平日");
  const weekend = fields.filter(f => f.section === "假日");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: `linear-gradient(135deg, ${SAGE_DARK} 0%, ${SAGE} 100%)`, borderRadius: 24, padding: "24px 22px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <UtensilsCrossed size={16} color="rgba(255,255,255,0.8)" />
          <span style={{ fontSize: 13, opacity: 0.8, fontFamily: "'Noto Sans TC', sans-serif" }}>本月伙食費估算</span>
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, fontFamily: "'Noto Sans TC', sans-serif" }}>{formatNT(monthly)}</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6, fontFamily: "'Noto Sans TC', sans-serif" }}>依本月平日／假日天數自動計算，已加入月支出</div>
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Sun size={16} color={SAGE} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>平日</span>
        </div>
        {weekday.map(f => (
          <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontSize: 14, color: "var(--text2)", fontFamily: "'Noto Sans TC', sans-serif" }}>{f.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--sub2)" }}>NT$</span>
              <input type="number" defaultValue={food[f.key]} onBlur={e => handleBlur(f.key, e.target.value)} style={inputStyle} />
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Palmtree size={16} color={GOLD} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>假日</span>
        </div>
        {weekend.map(f => (
          <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontSize: 14, color: "var(--text2)", fontFamily: "'Noto Sans TC', sans-serif" }}>{f.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--sub2)" }}>NT$</span>
              <input type="number" defaultValue={food[f.key]} onBlur={e => handleBlur(f.key, e.target.value)} style={inputStyle} />
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Lightbulb size={16} color={GOLD} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: "var(--sub)", fontFamily: "'Noto Sans TC', sans-serif", lineHeight: 1.6 }}>
            輸入完金額後點其他地方完成輸入，系統自動計算本月伙食費並加入月支出。
          </div>
        </div>
      </Card>
    </div>
  );
}

function ExpensePage({ expenses, setExpenses, income, setIncome, oneTime, setOneTime, oneTimeIncome, setOneTimeIncome }) {
  const [activeTab, setActiveTab] = useState("expense");
  const [showAdd, setShowAdd] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [form, setForm] = useState({ name: "", amount: "", category: "住", date: 25, month: currentMonth, day: 1, repeat: "loop", times: 3, year: currentYear, firstAmount: "" });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const addRef = useRef(null);

  const categories = ["住", "通訊", "訂閱", "保障", "交通", "其他"];
  const catColors = { "住": SAGE, "通訊": SAGE, "訂閱": GOLD, "保障": GOLD, "交通": BLUE, "其他": "var(--sub)" };

  const handleShowAdd = () => {
    setShowAdd(!showAdd);
    setTimeout(() => { addRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100);
  };

  const addItem = () => {
    if (!form.name || !form.amount) return;
    const base = { id: Date.now(), name: form.name, amount: parseInt(form.amount) };
    if (activeTab === "expense") {
      setExpenses(prev => [...prev, { ...base, category: form.category, color: catColors[form.category] || SAGE }]);
    } else if (activeTab === "income") {
      setIncome(prev => [...prev, { ...base, date: parseInt(form.date) || 25 }]);
    } else {
      const isFixed = form.repeat === "fixed";
      const record = {
        ...base,
        month: parseInt(form.month),
        day: parseInt(form.day) || 1,
        repeat: form.repeat,
        times: parseInt(form.times) || 3,
        year: parseInt(form.year),
        ...(isFixed && form.firstAmount ? { firstAmount: parseInt(form.firstAmount) } : {})
      };
      if (activeTab === "onetime") setOneTime(prev => [...prev, record]);
      else setOneTimeIncome(prev => [...prev, record]);
    }
    setForm({ name: "", amount: "", category: "住", date: 25, month: currentMonth, day: 1, repeat: "loop", times: 3, year: currentYear, firstAmount: "" });
    setShowAdd(false);
  };

  const removeExpense = (id) => setExpenses(prev => prev.filter(e => e.id !== id));
  const removeIncome  = (id) => setIncome(prev => prev.filter(i => i.id !== id));
  const removeOneTime = (id) => setOneTime(prev => prev.filter(o => o.id !== id));
  const removeOneTimeIncome = (id) => setOneTimeIncome(prev => prev.filter(o => o.id !== id));

  const startEdit = (item, type) => { setEditId(item.id + "_" + type); setEditForm({ ...item }); };
  const saveEdit = (type) => {
    if (type === "expense") setExpenses(prev => prev.map(i => i.id === editForm.id ? { ...i, ...editForm } : i));
    else if (type === "income") setIncome(prev => prev.map(i => i.id === editForm.id ? { ...i, ...editForm } : i));
    else if (type === "onetime") setOneTime(prev => prev.map(i => i.id === editForm.id ? { ...i, ...editForm } : i));
    else setOneTimeIncome(prev => prev.map(i => i.id === editForm.id ? { ...i, ...editForm } : i));
    setEditId(null); setEditForm({});
  };

  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome  = income.reduce((s, i) => s + i.amount, 0);
  const totalOneTime = oneTime.reduce((s, o) => s + o.amount, 0);
  const totalOneTimeIncome = oneTimeIncome.reduce((s, o) => s + o.amount, 0);

  const inputStyle = { padding: "10px 14px", borderRadius: 10, border: "1px solid var(--inputborder)", fontSize: 16, fontFamily: "'Noto Sans TC', sans-serif", color: "var(--text)", background: "var(--input)", outline: "none" };

  const EditRow = ({ item, type }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 0" }}>
      <input defaultValue={editForm.name || ""} onBlur={e => setEditForm(p => ({ ...p, name: e.target.value }))}
        style={{ ...inputStyle, border: `1px solid ${SAGE}` }} placeholder="名稱" />
      <div style={{ display: "flex", gap: 8 }}>
        <input type="number" defaultValue={editForm.amount || ""} onBlur={e => setEditForm(p => ({ ...p, amount: parseInt(e.target.value) || 0 }))}
          style={{ ...inputStyle, flex: 1, minWidth: 0, border: `1px solid ${SAGE}` }} placeholder="金額" />
        <button onClick={() => saveEdit(type)} style={{ background: SAGE, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>儲存</button>
        <button onClick={() => { setEditId(null); setEditForm({}); }} style={{ background: "var(--btn-muted)", color: "var(--text2)", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 14 }}>取消</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", background: "var(--tabbg)", borderRadius: 14, padding: 4, gap: 4 }}>
        {[
          { key: "expense", label: "月支出" },
          { key: "income", label: "月收入" },
          { key: "onetime", label: "特定支出" },
          { key: "onetimeincome", label: "特定收入" },
        ].map(t => (
          <Tab key={t.key} label={t.label} active={activeTab === t.key} onClick={() => { setActiveTab(t.key); setShowAdd(false); }} />
        ))}
      </div>

      <div style={{ background: `linear-gradient(135deg, ${SAGE_DARK} 0%, ${SAGE} 100%)`, borderRadius: 20, padding: "20px 22px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, opacity: 0.75 }}>
          <span style={{ color: "#fff" }}>
            {activeTab === "expense" ? <ArrowDownCircle size={14} /> : activeTab === "income" ? <ArrowUpCircle size={14} /> : activeTab === "onetime" ? <CalendarMinus size={14} /> : <CalendarPlus size={14} />}
          </span>
          <span style={{ fontSize: 12, fontFamily: "'Noto Sans TC', sans-serif" }}>
            {activeTab === "expense" ? "本月固定支出" : activeTab === "income" ? "本月預期收入" : activeTab === "onetime" ? "特定月份支出" : "特定月份收入"}
          </span>
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Noto Sans TC', sans-serif" }}>
          {formatNT(activeTab === "expense" ? totalExpense : activeTab === "income" ? totalIncome : activeTab === "onetime" ? totalOneTime : totalOneTimeIncome)}
        </div>
      </div>

      <Card style={{ padding: "14px 16px" }}>
        <button onClick={handleShowAdd} style={{ width: "100%", marginTop: 12, padding: "12px", border: `2px dashed var(--sage-44)`, borderRadius: 14, background: "none", cursor: "pointer", color: SAGE, fontSize: 14, fontWeight: 600, fontFamily: "'Noto Sans TC', sans-serif" }}>
          + 新增{activeTab === "expense" ? "支出" : activeTab === "income" ? "收入" : activeTab === "onetime" ? "特定支出" : "特定收入"}項目
        </button>

        {showAdd && (
          <div ref={addRef} style={{ marginTop: 12, padding: 14, background: BG, borderRadius: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="text" placeholder="項目名稱" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ ...inputStyle }} />
            <input type="number" placeholder="金額 (NT$)" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} style={{ ...inputStyle }} />
            {activeTab === "expense" && (
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ ...inputStyle }}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
            {activeTab === "income" && (
              <input type="number" placeholder="入帳日 (幾號)" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ ...inputStyle }} />
            )}
            {(activeTab === "onetime" || activeTab === "onetimeincome") && (
              <>
                <select value={form.repeat} onChange={e => setForm(p => ({ ...p, repeat: e.target.value }))} style={{ ...inputStyle }}>
                  <option value="loop">每年循環</option>
                  <option value="once">一次性（用完消失）</option>
                  <option value="fixed">固定期數（分期）</option>
                </select>
                {form.repeat === "fixed" ? (
                  <>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select value={form.year + "-" + form.month}
                        onChange={e => { const [y, m] = e.target.value.split("-"); setForm(p => ({ ...p, year: parseInt(y), month: parseInt(m) })); }}
                        style={{ ...inputStyle, flex: 1, minWidth: 0 }}>
                        {Array.from({ length: 19 }, (_, i) => {
                          const t = (currentMonth - 1) - 6 + i;
                          const y = currentYear + Math.floor(t / 12);
                          const m = ((t % 12) + 12) % 12 + 1;
                          return <option key={y + "-" + m} value={y + "-" + m}>{y}年{m}月起</option>;
                        })}
                      </select>
                      <span style={{ fontSize: 13, color: "var(--sub)", fontFamily: "'Noto Sans TC', sans-serif", flexShrink: 0 }}>共</span>
                      <input type="number" min={1} placeholder="期數" value={form.times} onChange={e => setForm(p => ({ ...p, times: e.target.value }))} style={{ ...inputStyle, width: 70 }} />
                      <span style={{ fontSize: 13, color: "var(--sub)", fontFamily: "'Noto Sans TC', sans-serif", flexShrink: 0 }}>個月</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--sub)", fontFamily: "'Noto Sans TC', sans-serif", flexShrink: 0 }}>每月扣款日</span>
                      <input type="number" min={1} max={31} placeholder="幾號" value={form.day} onChange={e => setForm(p => ({ ...p, day: e.target.value }))} style={{ ...inputStyle, width: 80 }} />
                      <span style={{ fontSize: 13, color: "var(--sub)", fontFamily: "'Noto Sans TC', sans-serif", flexShrink: 0 }}>號</span>
                    </div>
                    <input type="number" placeholder="首期金額（與每期不同時才填）" value={form.firstAmount} onChange={e => setForm(p => ({ ...p, firstAmount: e.target.value }))} style={{ ...inputStyle }} />
                  </>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
                      {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                    <input type="number" min={1} max={31} placeholder="幾號" value={form.day} onChange={e => setForm(p => ({ ...p, day: e.target.value }))} style={{ ...inputStyle, width: 70 }} />
                  </div>
                )}
                {form.repeat === "once" && (
                  <select value={form.year} onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) }))} style={{ ...inputStyle }}>
                    {[currentYear, currentYear+1, currentYear+2].map(y => <option key={y} value={y}>{y}年</option>)}
                  </select>
                )}
              </>
            )}
            <button onClick={addItem} style={{ background: SAGE, color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}>確認新增</button>
          </div>
        )}

        {activeTab === "expense" && expenses.map(item => (
          <div key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
            {editId === item.id + "_expense" ? <EditRow item={item} type="expense" /> : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--green-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: item.color, flexShrink: 0 }}>
                    <ArrowDownCircle size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: "var(--sub2)", fontFamily: "'Noto Sans TC', sans-serif" }}>{item.category}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span onClick={() => startEdit(item, "expense")} style={{ fontSize: 15, fontWeight: 700, color: RED, fontFamily: "'Noto Sans TC', sans-serif", cursor: "pointer" }}>-{formatNT(item.amount)}</span>
                  <button onClick={() => removeExpense(item.id)} style={{ border: "none", background: "var(--red-soft)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: RED, fontSize: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {activeTab === "income" && income.map(item => (
          <div key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
            {editId === item.id + "_income" ? <EditRow item={item} type="income" /> : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--green-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: SAGE, flexShrink: 0 }}>
                    <ArrowUpCircle size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: "var(--sub2)", fontFamily: "'Noto Sans TC', sans-serif" }}>每月 {item.date} 日入帳</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span onClick={() => startEdit(item, "income")} style={{ fontSize: 15, fontWeight: 700, color: SAGE, fontFamily: "'Noto Sans TC', sans-serif", cursor: "pointer" }}>+{formatNT(item.amount)}</span>
                  <button onClick={() => removeIncome(item.id)} style={{ border: "none", background: "var(--red-soft)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: RED, fontSize: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {(activeTab === "onetime" || activeTab === "onetimeincome") && (
          <>
            {(activeTab === "onetime" ? oneTime : oneTimeIncome).length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--faint)" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  {activeTab === "onetime" ? <CalendarMinus size={36} color="var(--faint)" /> : <CalendarPlus size={36} color="var(--faint)" />}
                </div>
                <div style={{ fontSize: 13, fontFamily: "'Noto Sans TC', sans-serif" }}>
                  {activeTab === "onetime" ? "尚無特定支出，例如保險年繳、汽車稅" : "尚無特定收入，例如年終、分紅"}
                </div>
              </div>
            )}
            {(() => {
              const now = new Date();
              const baseY = now.getFullYear();
              const baseM = now.getMonth() + 1;
              const list = activeTab === "onetime" ? oneTime : oneTimeIncome;
              const isIncome = activeTab === "onetimeincome";
              return Array.from({ length: 12 }, (_, i) => {
                const mTotal = (baseM - 1) + i;
                const calMonth = (mTotal % 12) + 1;
                const year = baseY + Math.floor(mTotal / 12);
                const entries = [];
                list.forEach(item => {
                  if (!shouldAppear(item, calMonth, year)) return;
                  let sub = "";
                  let amt = item.amount;
                  if (item.repeat === "fixed") {
                    const startY = item.year || baseY;
                    const idx = (year - startY) * 12 + (calMonth - item.month) + 1;
                    sub = `第${idx}期/共${item.times}期`;
                    if (idx === 1 && item.firstAmount) amt = item.firstAmount;
                  } else if (item.repeat === "once") {
                    sub = "一次性";
                  } else {
                    sub = "每年循環";
                  }
                  entries.push({ item, sub, amt });
                });
                if (entries.length === 0) return null;
                const label = year === baseY ? MONTHS[calMonth-1] : `${year}年${calMonth}月`;
                return (
                  <div key={year + "-" + calMonth}>
                    <div style={{ fontSize: 12, color: isIncome ? SAGE : RED, fontWeight: 700, padding: "8px 0 4px", fontFamily: "'Noto Sans TC', sans-serif" }}>{label}</div>
                    {entries.map(({ item, sub, amt }) => (
                      <div key={item.id + "-" + year + "-" + calMonth} style={{ borderBottom: "1px solid var(--line)" }}>
                        {editId === item.id + "_" + activeTab ? <EditRow item={item} type={activeTab} /> : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ width: 38, height: 38, borderRadius: 12, background: isIncome ? "var(--green-soft)" : "var(--red-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: isIncome ? SAGE : RED, flexShrink: 0 }}>
                                {isIncome ? <CalendarPlus size={18} /> : <CalendarMinus size={18} />}
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>{item.name}</div>
                                <div style={{ fontSize: 11, color: "var(--sub2)", fontFamily: "'Noto Sans TC', sans-serif" }}>{calMonth}月{item.day}日 · {sub}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span onClick={() => startEdit(item, activeTab)} style={{ fontSize: 15, fontWeight: 700, color: isIncome ? SAGE : RED, fontFamily: "'Noto Sans TC', sans-serif", cursor: "pointer" }}>
                                {isIncome ? "+" : "-"}{formatNT(amt)}
                              </span>
                              <button onClick={() => isIncome ? removeOneTimeIncome(item.id) : removeOneTime(item.id)} style={{ border: "none", background: "var(--red-soft)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: RED, fontSize: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
          </>
        )}

      </Card>
    </div>
  );
}function GoalCard({ startAssets, netMonthly, forecast }) {
  const [goal, setGoal] = useState(() => loadData("savingsGoal", 500000));
  const [editing, setEditing] = useState(false);

  useEffect(() => { saveData("savingsGoal", goal); }, [goal]);

  const pct = Math.min(100, Math.round((startAssets / goal) * 100));
  const diff = Math.max(0, goal - startAssets);

  const reachDate = (() => {
    if (forecast) {
      const hit = forecast.find(f => f.assets >= goal);
      if (hit) return hit.year + "/" + hit.calMonth;
    }
    if (netMonthly <= 0) return null;
    const monthsLeft = Math.ceil(diff / netMonthly);
    const d = new Date();
    d.setMonth(d.getMonth() + monthsLeft);
    return d.getFullYear() + "/" + (d.getMonth() + 1) + "（估）";
  })();

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <TrendingUp size={16} color={SAGE} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>儲蓄目標</span>
      </div>
      {editing ? (
        <input type="number" autoFocus defaultValue={goal}
          onBlur={e => { setGoal(parseInt(e.target.value) || goal); setEditing(false); }}
          style={{ fontSize: 24, fontWeight: 800, color: SAGE, border: "none", borderBottom: "2px solid " + SAGE, outline: "none", background: "transparent", width: "100%", fontFamily: "'Noto Sans TC', sans-serif", marginBottom: 12 }} />
      ) : (
        <div onClick={() => setEditing(true)} style={{ fontSize: 24, fontWeight: 800, color: SAGE, marginBottom: 12, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}>
          {formatNT(goal)}
        </div>
      )}
      <ProgressBar value={startAssets} max={goal} color={SAGE} />
      <div style={{ fontSize: 11, color: "var(--sub2)", marginTop: 4, marginBottom: 12, fontFamily: "'Noto Sans TC', sans-serif" }}>{pct}%</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, background: "var(--red-soft)", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--sub2)", marginBottom: 4, fontFamily: "'Noto Sans TC', sans-serif" }}>還差</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: RED, fontFamily: "'Noto Sans TC', sans-serif" }}>{formatNT(diff)}</div>
        </div>
        <div style={{ flex: 1, background: "var(--green-soft)", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--sub2)", marginBottom: 4, fontFamily: "'Noto Sans TC', sans-serif" }}>預計達標</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: SAGE, fontFamily: "'Noto Sans TC', sans-serif" }}>{reachDate || "—"}</div>
        </div>
      </div>
    </Card>
  );
}

function ForecastPage({ expenses, income, assets, oneTime, oneTimeIncome, food, rates }) {
  const totalTWD = calcTotal(assets, rates);
  const [payday, setPayday] = useState(() => loadData("payday", 25));
  const [startAssets, setStartAssets] = useState(Math.round(totalTWD));

  useEffect(() => { saveData("payday", payday); }, [payday]);

  const foodMonthly = calcFoodMonthly(food);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0) + foodMonthly;
  const totalIncome  = income.reduce((s, i) => s + i.amount, 0);
  const netMonthly   = totalIncome - totalExpense;

  const forecast = useMemo(() => {
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isPastPayday = today.getDate() > payday;

    let firstM = today.getMonth();
    let firstY = today.getFullYear();
    if (isPastPayday) {
      firstM += 1;
      if (firstM > 11) { firstM = 0; firstY += 1; }
    }
    const firstPaydayDate = new Date(firstY, firstM, payday);
    const daysToFirst = Math.max(0, Math.round((firstPaydayDate - todayMid) / 86400000));

    let runningAssets = startAssets;
    const notYetHappened = (o, calMonth, year) => {
      const d = new Date(year, calMonth - 1, o.day || 1);
      return d >= todayMid;
    };
    return Array.from({ length: 12 }, (_, i) => {
      const mTotal = firstM + i;
      const calMonth = (mTotal % 12) + 1;
      const year = firstY + Math.floor(mTotal / 12);
      const monthIndex = calMonth - 1;

      if (i === 0) {
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        runningAssets -= (totalExpense / daysInMonth) * daysToFirst;
        runningAssets += totalIncome;
      } else {
        runningAssets += netMonthly;
      }

      let oneTimeItems       = oneTime.filter(o => shouldAppear(o, calMonth, year));
      let oneTimeIncomeItems = oneTimeIncome.filter(o => shouldAppear(o, calMonth, year));

      if (i === 0) {
        oneTimeItems       = oneTimeItems.filter(o => notYetHappened(o, calMonth, year));
        oneTimeIncomeItems = oneTimeIncomeItems.filter(o => notYetHappened(o, calMonth, year));
        if (isPastPayday) {
          const prevM = today.getMonth() + 1;
          const prevY = today.getFullYear();
          const extraExp = oneTime.filter(o => shouldAppear(o, prevM, prevY) && notYetHappened(o, prevM, prevY));
          const extraInc = oneTimeIncome.filter(o => shouldAppear(o, prevM, prevY) && notYetHappened(o, prevM, prevY));
          oneTimeItems = [...extraExp, ...oneTimeItems];
          oneTimeIncomeItems = [...extraInc, ...oneTimeIncomeItems];
        }
      }

      const oneTimeDeduct    = oneTimeItems.reduce((s, o) => s + amountFor(o, calMonth, year), 0);
      const oneTimeIncomeAdd = oneTimeIncomeItems.reduce((s, o) => s + amountFor(o, calMonth, year), 0);
      runningAssets -= oneTimeDeduct;
      runningAssets += oneTimeIncomeAdd;

      return {
        month: MONTHS[monthIndex], calMonth, year,
        assets: Math.max(0, Math.round(runningAssets)),
        paydayDate: `${year}/${calMonth}/${payday}`,
        net: netMonthly,
        isPartial: i === 0,
        partialDays: daysToFirst,
        oneTimeItems: oneTimeItems.map(o => ({ ...o, amount: amountFor(o, calMonth, year) })),
        oneTimeIncomeItems: oneTimeIncomeItems.map(o => ({ ...o, amount: amountFor(o, calMonth, year) })),
      };
    });
  }, [startAssets, netMonthly, payday, oneTime, oneTimeIncome]);

  const inputStyle = { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--inputborder)", fontSize: 16, color: "var(--text)", background: "var(--input)", fontFamily: "'Noto Sans TC', sans-serif", outline: "none" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12, fontFamily: "'Noto Sans TC', sans-serif" }}>預測設定</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text2)", fontFamily: "'Noto Sans TC', sans-serif" }}>起始總資產</span>
            <input type="number" defaultValue={startAssets} onBlur={e => setStartAssets(parseInt(e.target.value) || 0)}
              style={{ ...inputStyle, width: 130, textAlign: "right" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text2)", fontFamily: "'Noto Sans TC', sans-serif" }}>發薪日（每月幾號）</span>
            <input type="number" min={1} max={31} defaultValue={payday} onBlur={e => setPayday(parseInt(e.target.value) || 25)}
              style={{ ...inputStyle, width: 80, textAlign: "center" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: netMonthly >= 0 ? "var(--green-soft)" : "var(--red-soft)", borderRadius: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text2)", fontFamily: "'Noto Sans TC', sans-serif" }}>每月淨增減（含伙食）</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: netMonthly >= 0 ? SAGE : RED, fontFamily: "'Noto Sans TC', sans-serif" }}>
              {netMonthly >= 0 ? "+" : ""}{formatNT(netMonthly)}
            </span>
          </div>
        </div>
      </Card>

      <GoalCard startAssets={startAssets} netMonthly={netMonthly} forecast={forecast} />

      <Card style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <ChevronRight size={16} color={SAGE} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>逐月預估（發薪後）</span>
        </div>
        {forecast.map((f, i) => (
          <div key={i} style={{ padding: "12px 0", borderBottom: i < 11 ? "1px solid var(--line)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: i === 0 ? SAGE : "var(--sage-22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: i === 0 ? "#fff" : SAGE, fontFamily: "'Noto Sans TC', sans-serif", flexShrink: 0 }}>{f.month}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>{f.paydayDate}</div>
                  <div style={{ fontSize: 11, color: "var(--sub2)", fontFamily: "'Noto Sans TC', sans-serif" }}>
                    {f.isPartial ? `依剩餘 ${f.partialDays} 天估算` : `${f.net >= 0 ? "+" : ""}${formatNT(f.net)} / 月`}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: f.assets > startAssets ? SAGE : RED, fontFamily: "'Noto Sans TC', sans-serif" }}>{formatNT(f.assets)}</div>
                <div style={{ fontSize: 10, color: "var(--faint)", fontFamily: "'Noto Sans TC', sans-serif" }}>預估總資產</div>
              </div>
            </div>
            <CombinedOneTimeList expenseItems={f.oneTimeItems} incomeItems={f.oneTimeIncomeItems} />
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function App() {
  const [pageIndex, setPageIndex] = useState(0);
  const [showBackup, setShowBackup] = useState(false);
  const [assets, setAssets]               = useState(() => loadData("assets", DEFAULT_ASSETS));
  const [expenses, setExpenses]           = useState(() => loadData("expenses", DEFAULT_EXPENSES));
  const [income, setIncome]               = useState(() => loadData("income", DEFAULT_INCOME));
  const [oneTime, setOneTime]             = useState(() => loadData("onetime", DEFAULT_ONETIME));
  const [oneTimeIncome, setOneTimeIncome] = useState(() => loadData("onetimeincome", DEFAULT_ONETIME_INCOME));
  const [snapshots, setSnapshots]         = useState(() => loadData("snapshots", DEFAULT_SNAPSHOTS));
  const [food, setFood]                   = useState(() => loadData("food", DEFAULT_FOOD));
  const [rates, setRates]                 = useState(() => loadData("currencyRates", DEFAULT_RATES));

  useEffect(() => { saveData("assets", assets); }, [assets]);
  useEffect(() => { saveData("expenses", expenses); }, [expenses]);
  useEffect(() => { saveData("income", income); }, [income]);
  useEffect(() => { saveData("onetime", oneTime); }, [oneTime]);
  useEffect(() => { saveData("onetimeincome", oneTimeIncome); }, [oneTimeIncome]);
  useEffect(() => { saveData("snapshots", snapshots); }, [snapshots]);
  useEffect(() => { saveData("food", food); }, [food]);
  useEffect(() => { saveData("currencyRates", rates); }, [rates]);

  useEffect(() => {
    const now = new Date();
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isExpired = (item) => {
      if (item.repeat !== "once") return false;
      const y = item.year || now.getFullYear();
      return new Date(y, item.month - 1, item.day || 1) < todayMid;
    };
    setOneTime(prev => {
      const filtered = prev.filter(o => !isExpired(o));
      return filtered.length !== prev.length ? filtered : prev;
    });
    setOneTimeIncome(prev => {
      const filtered = prev.filter(o => !isExpired(o));
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, []);

  useEffect(() => {
    const fix = (e) => {
      const next = e.relatedTarget;
      if (next && (next.tagName === 'INPUT' || next.tagName === 'SELECT' || next.tagName === 'TEXTAREA')) return;
      setTimeout(() => { window.scrollTo(0, 0); }, 150);
    };
    const fixSelect = (e) => {
      if (e.target.tagName === 'SELECT') setTimeout(() => window.scrollTo(0, 0), 300);
    };
    document.addEventListener('focusout', fix);
    document.addEventListener('touchend', fixSelect);
    return () => {
      document.removeEventListener('focusout', fix);
      document.removeEventListener('touchend', fixSelect);
    };
  }, []);

  const handleSaveSnapshot = () => {
    const total = calcTotal(assets, rates);
    setSnapshots(prev => [...prev, { ts: Date.now(), date: todayStr(), total }]);
  };

  const handleExport = () => {
    const data = {
      assets, expenses, income, oneTime, oneTimeIncome, snapshots, food,
      payday: loadData("payday", 25),
      savingsGoal: loadData("savingsGoal", 500000),
      currencyRates: rates,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finance-backup-" + todayStr().replace(/\//g, "-") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.assets) { saveData("assets", data.assets); setAssets(data.assets); }
        if (data.expenses) { saveData("expenses", data.expenses); setExpenses(data.expenses); }
        if (data.income) { saveData("income", data.income); setIncome(data.income); }
        if (data.oneTime) { saveData("onetime", data.oneTime); setOneTime(data.oneTime); }
        if (data.oneTimeIncome) { saveData("onetimeincome", data.oneTimeIncome); setOneTimeIncome(data.oneTimeIncome); }
        if (data.snapshots) { saveData("snapshots", data.snapshots); setSnapshots(data.snapshots); }
        if (data.food) { saveData("food", data.food); setFood(data.food); }
        if (data.payday) saveData("payday", data.payday);
        if (data.savingsGoal) saveData("savingsGoal", data.savingsGoal);
        if (data.currencyRates) { saveData("currencyRates", data.currencyRates); setRates(data.currencyRates); }
        alert("匯入成功！");
      } catch { alert("檔案格式錯誤"); }
    };
    reader.readAsText(file);
  };

  const navItems = [
    { icon: <Home size={22} />, label: "概覽" },
    { icon: <Wallet size={22} />, label: "資產" },
    { icon: <UtensilsCrossed size={22} />, label: "伙食" },
    { icon: <ReceiptText size={22} />, label: "帳務" },
    { icon: <TrendingUp size={22} />, label: "預測" },
  ];

  const pageGreetings = [
    "掌握今日資產狀況，規劃美好未來。",
    "分類管理你的所有資產。",
    "設定每日三餐平均花費。",
    "管理每月固定收支與特定支出。",
    "預覽每個發薪日的資產預估。",
  ];

  const pages = [
    <OverviewPage expenses={expenses} income={income} assets={assets} snapshots={snapshots} onSaveSnapshot={handleSaveSnapshot} oneTimeIncome={oneTimeIncome} oneTime={oneTime} food={food} rates={rates} />,
    <AssetsPage assets={assets} setAssets={setAssets} rates={rates} setRates={setRates} />,
    <FoodPage food={food} setFood={setFood} />,
    <ExpensePage expenses={expenses} setExpenses={setExpenses} income={income} setIncome={setIncome} oneTime={oneTime} setOneTime={setOneTime} oneTimeIncome={oneTimeIncome} setOneTimeIncome={setOneTimeIncome} />,
    <ForecastPage expenses={expenses} income={income} assets={assets} oneTime={oneTime} oneTimeIncome={oneTimeIncome} food={food} rates={rates} />,
  ];

  return (
    <div style={{ width: "100%", boxSizing: "border-box", height: "100vh", background: BG, display: "flex", flexDirection: "column", fontFamily: "'Noto Sans TC', sans-serif", overflowX: "hidden" }}>
      <div style={{ padding: "52px 20px 8px", flexShrink: 0, position: "relative" }}>
        <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 2 }}>
          {new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", lineHeight: 1.5 }}>{pageGreetings[pageIndex]}</div>
        <button onClick={() => setShowBackup(p => !p)} style={{ position: "absolute", top: 52, right: 20, border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 0 }}>
          <HardDrive size={20} color={SAGE} />
          <span style={{ fontSize: 9, color: SAGE, fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 600 }}>備份/還原</span>
        </button>
        {showBackup && (
          <div style={{ position: "absolute", top: 90, right: 20, background: "var(--input)", borderRadius: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", padding: "8px 0", zIndex: 100, minWidth: 150 }}>
            <button onClick={() => { handleExport(); setShowBackup(false); }} style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif" }}>
              <Upload size={16} color={SAGE} />
              匯出備份
            </button>
            <div style={{ height: 1, background: "var(--line)", margin: "0 12px" }} />
            <label style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text)", fontFamily: "'Noto Sans TC', sans-serif", cursor: "pointer" }}>
              <Download size={16} color={SAGE} />
              匯入還原
              <input type="file" accept=".json" style={{ display: "none" }} onChange={e => { handleImport(e); setShowBackup(false); }} />
            </label>
          </div>
        )}
      </div>

      <SwipeContainer pageIndex={pageIndex} setPageIndex={setPageIndex}>
        {pages.map((page, i) => (
          <div key={i} style={{ width: `${100 / PAGES.length}%`, height: "100%", overflowY: "auto", overflowX: "hidden", padding: "10px 20px 120px", flexShrink: 0 }}>
            {page}
          </div>
        ))}
      </SwipeContainer>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--nav-bg)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--tabbg)", display: "flex", padding: "6px 0 34px", flexShrink: 0 }}>
        {navItems.map((item, i) => (
          <NavItem key={i} icon={item.icon} label={item.label} active={pageIndex === i} onClick={() => setPageIndex(i)} />
        ))}
      </div>
    </div>
  );
}