import React from 'react';
import { 
  Home, 
  PieChart, 
  Activity, 
  ArrowRightLeft, 
  FileText, 
  Settings, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  Bell,
  Search,
  ChevronRight
} from 'lucide-react';

export function WealthOverview() {
  return (
    <div 
      className="min-h-screen w-full flex font-sans text-slate-100 selection:bg-[#0ecb81]/30"
      style={{ backgroundColor: '#0b0e11' }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        .font-outfit { font-family: 'Outfit', sans-serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/50 flex flex-col justify-between hidden lg:flex" style={{ backgroundColor: '#0b0e11' }}>
        <div>
          <div className="h-20 flex items-center px-8 font-outfit font-bold text-xl tracking-tight">
            StockBroker<span style={{ color: '#0ecb81' }}>NG</span>
          </div>
          <nav className="px-4 py-8 space-y-2">
            {[
              { icon: Home, label: 'Overview', active: true },
              { icon: PieChart, label: 'Portfolio' },
              { icon: Activity, label: 'Markets' },
              { icon: ArrowRightLeft, label: 'Trade' },
              { icon: FileText, label: 'Statements' },
            ].map((item, i) => (
              <button 
                key={i}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                  item.active 
                    ? 'bg-[#111821] text-white border border-slate-800' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                }`}
              >
                <item.icon size={20} className={item.active ? 'text-[#0ecb81]' : ''} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#111821] to-[#0b0e11] border border-slate-800/50 mb-4">
            <p className="text-xs text-slate-400 mb-2">Buying Power</p>
            <p className="font-outfit font-semibold text-lg text-white">₦812,400.00</p>
            <button className="mt-3 w-full py-2 text-xs font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors">
              Deposit Funds
            </button>
          </div>
          
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/30 transition-all">
              <Settings size={20} />
              <span className="font-medium">Settings</span>
            </button>
            <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/30 transition-all">
              <LogOut size={20} />
              <span className="font-medium">Log out</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-h-screen overflow-hidden font-outfit">
        {/* Top Header */}
        <header className="h-20 border-b border-slate-800/50 flex items-center justify-between px-8 shrink-0">
          <div className="relative w-96 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search symbols, news, or sectors..." 
              className="w-full bg-[#111821] border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#0ecb81]/50 focus:ring-1 focus:ring-[#0ecb81]/50 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-6 ml-auto">
            <button className="relative text-slate-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#0ecb81] rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0ecb81] to-blue-500 p-[2px]">
                <div className="w-full h-full rounded-full bg-[#111821] flex items-center justify-center text-sm font-bold text-white border-2 border-[#111821]">
                  CA
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-24">
          <div className="max-w-7xl mx-auto p-8 space-y-8">
            
            {/* Hero Section */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-slate-400 text-lg mb-2">Good afternoon, Chidi</p>
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-4">
                  ₦4,842,316<span className="text-slate-500 text-3xl">.00</span>
                </h1>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0ecb81]/10 text-[#0ecb81] font-semibold text-sm border border-[#0ecb81]/20">
                    <TrendingUp size={16} />
                    <span>+₦38,420</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0ecb81]/10 text-[#0ecb81] font-semibold text-sm border border-[#0ecb81]/20">
                    <span>+0.80% today</span>
                  </div>
                  <p className="text-slate-500 text-sm ml-2 hidden sm:block">All time: +18.4%</p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-3 self-start md:self-end">
                <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#0ecb81] text-[#0b0e11] font-semibold hover:bg-[#0cf299] transition-colors shadow-[0_0_20px_rgba(14,203,129,0.3)]">
                  <ArrowDownToLine size={18} />
                  <span>Deposit</span>
                </button>
                <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#111821] text-white border border-slate-700 hover:bg-slate-800 transition-colors">
                  <ArrowUpFromLine size={18} />
                  <span className="hidden sm:inline">Withdraw</span>
                </button>
                <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#111821] text-white border border-slate-700 hover:bg-slate-800 transition-colors">
                  <ArrowRightLeft size={18} />
                  <span className="hidden sm:inline">Trade</span>
                </button>
              </div>
            </section>

            {/* Insights Row */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Best Performer", value: "DANGOTE", metric: "+14.2%", isPositive: true },
                { label: "Worst Performer", value: "NESTLE", metric: "-3.8%", isPositive: false },
                { label: "30-Day Return", value: "Total Gain", metric: "+₦284,160", isPositive: true },
              ].map((card, i) => (
                <div key={i} className="p-6 rounded-2xl border border-slate-800/60" style={{ backgroundColor: '#111821' }}>
                  <p className="text-sm text-slate-400 mb-3">{card.label}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-xl font-semibold text-white">{card.value}</p>
                    <div className={`flex items-center gap-1 font-bold ${card.isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                      {card.isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      {card.metric}
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Allocation Chart (Visual Fake) */}
              <section className="lg:col-span-1 p-8 rounded-3xl border border-slate-800/60 flex flex-col" style={{ backgroundColor: '#111821' }}>
                <h2 className="text-xl font-bold text-white mb-8">Asset Allocation</h2>
                
                <div className="flex-1 flex flex-col items-center justify-center mb-8 relative">
                  {/* Fake Donut Chart via CSS Conic Gradient */}
                  <div 
                    className="w-48 h-48 rounded-full relative"
                    style={{
                      background: `conic-gradient(
                        #0ecb81 0% 28%, 
                        #3b82f6 28% 50%, 
                        #8b5cf6 50% 68%, 
                        #f0b90b 68% 83%, 
                        #475569 83% 100%
                      )`
                    }}
                  >
                    <div className="absolute inset-4 rounded-full" style={{ backgroundColor: '#111821' }}></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-slate-400">Total Holdings</span>
                      <span className="text-xl font-bold text-white">8</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { name: 'DANGOTE', color: '#0ecb81', percent: '28%' },
                    { name: 'GTCO', color: '#3b82f6', percent: '22%' },
                    { name: 'ZENITH', color: '#8b5cf6', percent: '18%' },
                    { name: 'AIRTELAFRI', color: '#f0b90b', percent: '15%' },
                    { name: 'Others', color: '#475569', percent: '17%' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-slate-300 font-medium">{item.name}</span>
                      </div>
                      <span className="text-white font-bold">{item.percent}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Holdings Cards */}
              <section className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Current Holdings</h2>
                  <button className="text-sm font-medium text-[#0ecb81] hover:text-white flex items-center gap-1 transition-colors">
                    View full portfolio <ChevronRight size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { symbol: 'DANGOTE', name: 'Dangote Cement Plc', sector: 'Industrial', value: '₦1,355,848', price: '₦642.50', pl: '+14.2%', isPositive: true },
                    { symbol: 'GTCO', name: 'Guaranty Trust Holding', sector: 'Financials', value: '₦1,065,309', price: '₦58.35', pl: '+8.4%', isPositive: true },
                    { symbol: 'ZENITH', name: 'Zenith Bank Plc', sector: 'Financials', value: '₦871,616', price: '₦45.90', pl: '+5.1%', isPositive: true },
                    { symbol: 'AIRTELAFRI', name: 'Airtel Africa Plc', sector: 'Telecom', value: '₦726,347', price: '₦1,480.00', pl: '-1.2%', isPositive: false },
                    { symbol: 'MTNN', name: 'MTN Nigeria Comms', sector: 'Telecom', value: '₦450,200', price: '₦215.40', pl: '+2.4%', isPositive: true },
                    { symbol: 'NESTLE', name: 'Nestle Nigeria Plc', sector: 'Consumer', value: '₦372,996', price: '₦1,025.80', pl: '-3.8%', isPositive: false },
                  ].map((holding, i) => (
                    <div key={i} className="p-5 rounded-2xl border border-slate-800/60 hover:border-slate-700 transition-colors group cursor-pointer" style={{ backgroundColor: '#111821' }}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-white text-lg group-hover:text-[#0ecb81] transition-colors">{holding.symbol}</h3>
                          <p className="text-xs text-slate-400 line-clamp-1">{holding.name}</p>
                        </div>
                        <div className="px-2 py-1 rounded-md bg-slate-800/50 text-xs text-slate-300 font-medium">
                          {holding.sector}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Value</p>
                          <p className="font-semibold text-white">{holding.value}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-1">{holding.price}</p>
                          <p className={`font-bold text-sm ${holding.isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                            {holding.pl}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            
          </div>
        </div>
      </main>

      {/* Market Summary Strip (Fixed Bottom) */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 h-14 border-t border-slate-800/80 flex items-center px-4 md:px-8 z-20 overflow-x-auto hide-scrollbar whitespace-nowrap bg-gradient-to-r from-[#0b0e11] to-[#111821] backdrop-blur-md">
        <div className="flex items-center gap-8 text-sm font-outfit">
          <div className="flex items-center gap-3 border-r border-slate-800 pr-8">
            <span className="text-slate-400 font-medium">NGX ASI</span>
            <span className="text-white font-bold">104,562.06</span>
            <span className="text-[#0ecb81] font-semibold flex items-center">
              <TrendingUp size={14} className="mr-1" /> +1.24%
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-slate-500 uppercase text-xs font-bold tracking-wider">Top Movers</span>
            {[
              { sym: 'TRANSCORP', change: '+9.8%', up: true },
              { sym: 'FBNH', change: '+6.5%', up: true },
              { sym: 'OANDO', change: '-5.2%', up: false },
              { sym: 'UBA', change: '+4.1%', up: true },
              { sym: 'ACCESSCORP', change: '+3.8%', up: true },
            ].map((stock, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-slate-300 font-semibold">{stock.sym}</span>
                <span className={`${stock.up ? 'text-[#0ecb81]' : 'text-[#f6465d]'} text-xs font-bold`}>
                  {stock.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
