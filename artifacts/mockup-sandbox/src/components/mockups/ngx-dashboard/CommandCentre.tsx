import React, { useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Bell,
  Briefcase,
  ChevronDown,
  Clock,
  Compass,
  CreditCard,
  LineChart,
  LogOut,
  Maximize2,
  PieChart,
  Search,
  Settings,
  Shield,
  Wallet
} from 'lucide-react';

const colors = {
  bg: '#0b0e11',
  card: '#111821',
  green: '#0ecb81',
  red: '#f6465d',
  border: 'rgba(14, 203, 129, 0.15)',
  text: '#eaecef',
  muted: '#848e9c',
  amber: '#f0b90b',
};

const DUMMY_STOCKS = [
  { symbol: 'DANGOTE', price: 642.50, change: 1.2 },
  { symbol: 'GTCO', price: 58.35, change: 2.4 },
  { symbol: 'ZENITH', price: 45.90, change: -0.8 },
  { symbol: 'AIRTELAFRI', price: 1480.00, change: 0.5 },
  { symbol: 'MTNN', price: 215.40, change: -1.2 },
  { symbol: 'SEPLAT', price: 3450.00, change: 3.1 },
  { symbol: 'NESTLE', price: 1025.80, change: 0.0 },
  { symbol: 'BUAFOODS', price: 178.60, change: 4.5 },
];

const HOLDINGS = [
  { symbol: 'DANGOTE', qty: 1500, avg: 610.20, price: 642.50, pnl: 5.29 },
  { symbol: 'GTCO', qty: 10000, avg: 52.10, price: 58.35, pnl: 11.99 },
  { symbol: 'MTNN', qty: 500, avg: 220.00, price: 215.40, pnl: -2.09 },
  { symbol: 'ZENITH', qty: 5000, avg: 42.50, price: 45.90, pnl: 8.00 },
  { symbol: 'NESTLE', qty: 100, avg: 1050.00, price: 1025.80, pnl: -2.30 },
];

const ORDER_BOOK = [
  { price: 58.40, qty: 15000, type: 'ask' },
  { price: 58.39, qty: 8500, type: 'ask' },
  { price: 58.38, qty: 12000, type: 'ask' },
  { price: 58.37, qty: 4200, type: 'ask' },
  { price: 58.36, qty: 18000, type: 'ask' },
  { price: 58.35, qty: 0, type: 'spread' },
  { price: 58.34, qty: 25000, type: 'bid' },
  { price: 58.33, qty: 14000, type: 'bid' },
  { price: 58.32, qty: 9500, type: 'bid' },
  { price: 58.31, qty: 11200, type: 'bid' },
  { price: 58.30, qty: 32000, type: 'bid' },
];

const ACTIVITY = [
  { time: '14:32:01', action: 'FILLED', text: 'Buy 5,000 GTCO @ ₦58.35', type: 'buy' },
  { time: '13:15:42', action: 'PLACED', text: 'Sell 1,500 DANGOTE @ ₦650.00', type: 'neutral' },
  { time: '11:05:12', action: 'FILLED', text: 'Sell 500 MTNN @ ₦218.50', type: 'sell' },
  { time: '09:45:00', action: 'DEPOSIT', text: 'Bank Transfer ₦500,000', type: 'neutral' },
];

const StatCard = ({ title, value, sub, isPositive }: any) => (
  <div style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border p-4 flex flex-col justify-between">
    <div className="text-[11px] font-mono tracking-wider uppercase text-[#848e9c] mb-2">{title}</div>
    <div className="text-xl font-mono text-[#eaecef]">{value}</div>
    {sub && (
      <div className={`text-xs font-mono mt-2 ${isPositive === true ? 'text-[#0ecb81]' : isPositive === false ? 'text-[#f6465d]' : 'text-[#848e9c]'}`}>
        {sub}
      </div>
    )}
  </div>
);

export function CommandCentre() {
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');

  return (
    <div className="min-h-screen w-full flex flex-col font-sans overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600&display=swap');
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .font-sans { font-family: 'Inter', sans-serif; }
        .ticker-wrap { width: 100%; overflow: hidden; background-color: #111821; border-bottom: 1px solid ${colors.border}; height: 32px; display: flex; align-items: center; }
        .ticker { display: inline-flex; white-space: nowrap; animation: ticker 30s linear infinite; }
        @keyframes ticker { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-50%, 0, 0); } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2b3139; }
        .panel { background-color: ${colors.card}; border: 1px solid ${colors.border}; }
      `}</style>

      {/* Ticker */}
      <div className="ticker-wrap shrink-0">
        <div className="ticker pl-[100%]">
          {[...DUMMY_STOCKS, ...DUMMY_STOCKS, ...DUMMY_STOCKS].map((s, i) => (
            <div key={i} className="inline-flex items-center px-6 border-r text-xs font-mono" style={{ borderColor: colors.border }}>
              <span className="text-[#eaecef] mr-2">{s.symbol}</span>
              <span className="text-[#eaecef] mr-2">{s.price.toFixed(2)}</span>
              <span className={s.change >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                {s.change > 0 ? '+' : ''}{s.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[60px] flex-shrink-0 flex flex-col items-center py-4 border-r gap-6" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="w-8 h-8 rounded-full bg-[#0ecb81]/20 flex items-center justify-center text-[#0ecb81] font-bold mb-4">NG</div>
          <Activity className="w-5 h-5 text-[#0ecb81] cursor-pointer" />
          <PieChart className="w-5 h-5 text-[#848e9c] hover:text-[#eaecef] cursor-pointer transition-colors" />
          <Wallet className="w-5 h-5 text-[#848e9c] hover:text-[#eaecef] cursor-pointer transition-colors" />
          <Briefcase className="w-5 h-5 text-[#848e9c] hover:text-[#eaecef] cursor-pointer transition-colors" />
          <Settings className="w-5 h-5 text-[#848e9c] hover:text-[#eaecef] cursor-pointer transition-colors mt-auto" />
          <LogOut className="w-5 h-5 text-[#848e9c] hover:text-[#eaecef] cursor-pointer transition-colors" />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-2 gap-2 overflow-auto">
          {/* Top Stats */}
          <div className="grid grid-cols-4 gap-2 h-[100px] shrink-0">
            <StatCard title="Portfolio Value" value="₦4,842,316" sub="Total Returns: +18.4%" isPositive={true} />
            <StatCard title="Available Cash" value="₦812,400" sub="Settled Funds" isPositive={null} />
            <StatCard title="Day P&L" value="+₦38,420" sub="+0.80% Today" isPositive={true} />
            <StatCard title="Open Orders" value="3" sub="2 Buy / 1 Sell" isPositive={null} />
          </div>

          <div className="flex flex-1 gap-2 min-h-[300px]">
            {/* Chart Area */}
            <div className="flex-1 panel flex flex-col relative overflow-hidden group">
              <div className="absolute top-4 left-4 z-10">
                <div className="text-sm font-mono text-[#848e9c]">Portfolio History (6M)</div>
                <div className="text-2xl font-mono text-[#0ecb81] mt-1">₦4,842,316 <span className="text-sm ml-2">↑ ₦850K</span></div>
              </div>
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                {['1D', '1W', '1M', '3M', '6M', '1Y'].map(t => (
                  <button key={t} className={`text-xs font-mono px-2 py-1 ${t === '6M' ? 'bg-[#2b3139] text-white' : 'text-[#848e9c] hover:text-white'}`}>{t}</button>
                ))}
              </div>
              {/* Fake SVG Chart */}
              <div className="flex-1 flex items-end w-full pt-20 pb-4 px-2">
                <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="w-full h-full text-[#0ecb81] opacity-60">
                  <path d="M0,300 L0,200 C100,220 200,150 300,180 C400,210 500,100 600,130 C700,160 800,50 900,80 L1000,20 L1000,300 Z" fill="url(#grad)" />
                  <path d="M0,200 C100,220 200,150 300,180 C400,210 500,100 600,130 C700,160 800,50 900,80 L1000,20" fill="none" stroke="currentColor" strokeWidth="2" />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ecb81" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0ecb81" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Order Book */}
            <div className="w-[300px] panel flex flex-col text-xs font-mono shrink-0">
              <div className="p-3 border-b text-[#eaecef] uppercase font-bold tracking-widest flex justify-between items-center" style={{ borderColor: colors.border }}>
                <span>Order Book</span>
                <span className="text-[#848e9c]">GTCO</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 text-[#848e9c] border-b" style={{ borderColor: colors.border }}>
                <span>Price (₦)</span>
                <span>Qty</span>
              </div>
              <div className="flex-1 overflow-auto py-1">
                {ORDER_BOOK.map((o, i) => (
                  <div key={i} className="flex justify-between px-3 py-1 hover:bg-[#2b3139]/50 cursor-pointer relative">
                    {o.type === 'spread' ? (
                      <div className="w-full text-center py-1 text-[#0ecb81] border-y my-1" style={{ borderColor: colors.border }}>
                        58.35 ↑ 0.12
                      </div>
                    ) : (
                      <>
                        <div className={`absolute top-0 right-0 h-full opacity-10 ${o.type === 'ask' ? 'bg-[#f6465d]' : 'bg-[#0ecb81]'}`} style={{ width: `${(o.qty / 32000) * 100}%` }} />
                        <span className={`relative z-10 ${o.type === 'ask' ? 'text-[#f6465d]' : 'text-[#0ecb81]'}`}>{o.price.toFixed(2)}</span>
                        <span className="relative z-10 text-[#eaecef]">{o.qty.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 h-[250px] shrink-0">
            {/* Holdings */}
            <div className="flex-1 panel flex flex-col">
              <div className="p-3 border-b text-[#eaecef] text-xs font-mono uppercase font-bold tracking-widest" style={{ borderColor: colors.border }}>
                Holdings
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[#848e9c] text-xs font-mono border-b" style={{ borderColor: colors.border }}>
                    <th className="font-normal p-3">Symbol</th>
                    <th className="font-normal p-3 text-right">Qty</th>
                    <th className="font-normal p-3 text-right">Avg Cost</th>
                    <th className="font-normal p-3 text-right">Current</th>
                    <th className="font-normal p-3 text-right">P&L %</th>
                  </tr>
                </thead>
                <tbody>
                  {HOLDINGS.map((h, i) => (
                    <tr key={i} className="text-sm font-mono hover:bg-[#2b3139]/30 transition-colors border-b last:border-0" style={{ borderColor: colors.border }}>
                      <td className="p-3 text-[#eaecef]">{h.symbol}</td>
                      <td className="p-3 text-right text-[#eaecef]">{h.qty.toLocaleString()}</td>
                      <td className="p-3 text-right text-[#848e9c]">{h.avg.toFixed(2)}</td>
                      <td className="p-3 text-right text-[#eaecef]">{h.price.toFixed(2)}</td>
                      <td className={`p-3 text-right ${h.pnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                        {h.pnl > 0 ? '+' : ''}{h.pnl}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Movers */}
            <div className="w-[300px] panel flex flex-col shrink-0">
               <div className="p-3 border-b text-[#eaecef] text-xs font-mono uppercase font-bold tracking-widest" style={{ borderColor: colors.border }}>
                Market Movers
              </div>
               <div className="flex-1 overflow-auto">
                 {DUMMY_STOCKS.sort((a,b) => Math.abs(b.change) - Math.abs(a.change)).slice(0,5).map((s, i) => (
                   <div key={i} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-[#2b3139]/30" style={{ borderColor: colors.border }}>
                     <div className="text-sm font-mono text-[#eaecef]">{s.symbol}</div>
                     <div className="text-right">
                       <div className="text-sm font-mono text-[#eaecef]">{s.price.toFixed(2)}</div>
                       <div className={`text-xs font-mono ${s.change >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                         {s.change > 0 ? '+' : ''}{s.change}%
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Order Entry & Activity */}
        <div className="w-[320px] shrink-0 border-l flex flex-col" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          {/* Order Form */}
          <div className="p-4 border-b flex flex-col gap-4" style={{ borderColor: colors.border }}>
            <div className="flex bg-[#2b3139] p-1 rounded-sm">
              <button 
                onClick={() => setOrderSide('buy')} 
                className={`flex-1 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm ${orderSide === 'buy' ? 'bg-[#0ecb81] text-[#0b0e11] font-bold' : 'text-[#848e9c]'}`}
              >
                Buy
              </button>
              <button 
                onClick={() => setOrderSide('sell')} 
                className={`flex-1 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm ${orderSide === 'sell' ? 'bg-[#f6465d] text-[#0b0e11] font-bold' : 'text-[#848e9c]'}`}
              >
                Sell
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-mono text-[#848e9c] tracking-widest">Symbol</label>
                <div className="flex items-center bg-[#0b0e11] border rounded-sm px-3 py-2" style={{ borderColor: colors.border }}>
                  <Search className="w-4 h-4 text-[#848e9c] mr-2" />
                  <input type="text" defaultValue="GTCO" className="bg-transparent text-sm font-mono text-[#eaecef] outline-none w-full" />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] uppercase font-mono text-[#848e9c] tracking-widest">Order Type</label>
                  <select className="bg-[#0b0e11] border rounded-sm px-2 py-2 text-sm font-mono text-[#eaecef] outline-none appearance-none" style={{ borderColor: colors.border }}>
                    <option>LIMIT</option>
                    <option>MARKET</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] uppercase font-mono text-[#848e9c] tracking-widest">Price (₦)</label>
                  <input type="text" defaultValue="58.35" className="bg-[#0b0e11] border rounded-sm px-3 py-2 text-sm font-mono text-[#eaecef] outline-none" style={{ borderColor: colors.border }} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-mono text-[#848e9c] tracking-widest">Quantity</label>
                <input type="text" defaultValue="10,000" className="bg-[#0b0e11] border rounded-sm px-3 py-2 text-sm font-mono text-[#eaecef] outline-none" style={{ borderColor: colors.border }} />
              </div>

              <div className="flex justify-between items-center py-2 border-t mt-2" style={{ borderColor: colors.border }}>
                <span className="text-xs font-mono text-[#848e9c]">Est. Total</span>
                <span className="text-sm font-mono text-[#eaecef]">₦583,500.00</span>
              </div>

              <button className={`w-full py-3 text-sm font-mono uppercase tracking-widest font-bold rounded-sm text-[#0b0e11] ${orderSide === 'buy' ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90' : 'bg-[#f6465d] hover:bg-[#f6465d]/90'}`}>
                {orderSide} GTCO
              </button>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b text-[#eaecef] text-xs font-mono uppercase font-bold tracking-widest" style={{ borderColor: colors.border }}>
              Recent Activity
            </div>
            <div className="flex-1 overflow-auto p-2">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="flex gap-3 mb-3 p-2 hover:bg-[#2b3139]/30 rounded-sm">
                  <div className="text-[10px] font-mono text-[#848e9c] pt-0.5">{a.time}</div>
                  <div className="flex-1">
                    <div className={`text-[10px] font-mono mb-0.5 ${a.type === 'buy' ? 'text-[#0ecb81]' : a.type === 'sell' ? 'text-[#f6465d]' : 'text-[#848e9c]'}`}>
                      {a.action}
                    </div>
                    <div className="text-xs font-mono text-[#eaecef]">{a.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="h-7 shrink-0 border-t flex items-center px-4 justify-between text-[11px] font-mono" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center text-[#0ecb81]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] mr-2 animate-pulse" />
            MARKET OPEN
          </div>
          <div className="text-[#848e9c] border-l pl-4" style={{ borderColor: colors.border }}>NGX STATUS: ONLINE</div>
        </div>
        <div className="flex items-center gap-4 text-[#848e9c]">
          <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> 14:32:05 WAT</div>
          <div className="flex items-center gap-1 border-l pl-4" style={{ borderColor: colors.border }}><SignalIcon /> 12ms</div>
        </div>
      </div>
    </div>
  );
}

const SignalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#0ecb81]">
    <rect x="2" y="16" width="4" height="6" rx="1" />
    <rect x="10" y="10" width="4" height="12" rx="1" />
    <rect x="18" y="4" width="4" height="18" rx="1" />
  </svg>
);
