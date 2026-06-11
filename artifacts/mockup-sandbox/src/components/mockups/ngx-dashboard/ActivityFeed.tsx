import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, Search, Bell, 
  CheckCircle2, AlertTriangle, ArrowRightLeft, Newspaper,
  Briefcase, Plus, Minus, Download, X, Home, PieChart, LayoutDashboard
} from 'lucide-react';

export function ActivityFeed() {
  const [searchQuery, setSearchQuery] = useState("");

  const feedItems = [
    { id: 1, type: 'fill_buy', title: 'Order Filled: Bought 500 DANGOTE', desc: 'Filled at ₦642.50 (Total: ₦321,250)', time: '2h ago', color: 'border-l-[#0ecb81]', icon: <CheckCircle2 className="w-4 h-4 text-[#0ecb81]" /> },
    { id: 2, type: 'alert', title: 'Price Alert: MTNN', desc: 'MTNN crossed your target of ₦215.00', time: '3h ago', color: 'border-l-[#f0b90b]', icon: <AlertTriangle className="w-4 h-4 text-[#f0b90b]" /> },
    { id: 3, type: 'dividend', title: 'Dividend Received: ZENITH', desc: '₦18,450 credited to your account', time: '1d ago', color: 'border-l-[#0ecb81]', icon: <Plus className="w-4 h-4 text-[#0ecb81]" /> },
    { id: 4, type: 'system', title: 'KYC Approved', desc: 'Your Tier 3 verification is complete. Daily limit increased.', time: '2d ago', color: 'border-l-blue-500', icon: <Bell className="w-4 h-4 text-blue-500" /> },
    { id: 5, type: 'fill_sell', title: 'Order Filled: Sold 200 GTCO', desc: 'Filled at ₦58.10 (Total: ₦11,620)', time: '2d ago', color: 'border-l-[#f6465d]', icon: <CheckCircle2 className="w-4 h-4 text-[#f6465d]" /> },
    { id: 6, type: 'news', title: 'NGX News: DANGOTE', desc: 'Q3 results beat estimates, revenue up 8.4% YoY', time: '3d ago', color: 'border-l-blue-500', icon: <Newspaper className="w-4 h-4 text-blue-500" /> },
    { id: 7, type: 'deposit', title: 'Deposit Confirmed', desc: '₦500,000 received via Bank Transfer', time: '4d ago', color: 'border-l-[#0ecb81]', icon: <Download className="w-4 h-4 text-[#0ecb81]" /> },
    { id: 8, type: 'fill_buy', title: 'Order Filled: Bought 1000 SEPLAT', desc: 'Filled at ₦3,450.00 (Total: ₦3,450,000)', time: '5d ago', color: 'border-l-[#0ecb81]', icon: <CheckCircle2 className="w-4 h-4 text-[#0ecb81]" /> },
    { id: 9, type: 'alert', title: 'Price Alert: NESTLE', desc: 'NESTLE dropped below ₦1,030.00', time: '5d ago', color: 'border-l-[#f0b90b]', icon: <AlertTriangle className="w-4 h-4 text-[#f0b90b]" /> },
    { id: 10, type: 'news', title: 'NGX Daily Report', desc: 'Market closes positive, banking sector leads gains', time: '1w ago', color: 'border-l-blue-500', icon: <Newspaper className="w-4 h-4 text-blue-500" /> },
  ];

  const movers = [
    { symbol: 'DANGOTE', price: '642.50', change: '+8.4%', isGainer: true },
    { symbol: 'BUAFOODS', price: '178.60', change: '+4.2%', isGainer: true },
    { symbol: 'SEPLAT', price: '3,450.00', change: '+2.1%', isGainer: true },
    { symbol: 'GTCO', price: '58.35', change: '-3.2%', isGainer: false },
    { symbol: 'ZENITH', price: '45.90', change: '-2.8%', isGainer: false },
    { symbol: 'MTNN', price: '215.40', change: '-1.5%', isGainer: false },
  ];

  const openOrders = [
    { id: 'ORD-001', symbol: 'AIRTELAFRI', type: 'Buy', qty: 100, price: '1,450.00' },
    { id: 'ORD-002', symbol: 'NESTLE', type: 'Buy', qty: 50, price: '1,000.00' },
    { id: 'ORD-003', symbol: 'ZENITH', type: 'Sell', qty: 5000, price: '48.00' },
  ];

  return (
    <div className="flex h-screen bg-[#0b0e11] text-gray-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 md:w-64 border-r border-gray-800 bg-[#111821] flex flex-col items-center md:items-start flex-shrink-0">
        <div className="p-4 md:px-6 md:py-5 flex items-center gap-3 border-b border-gray-800 w-full">
          <div className="w-8 h-8 rounded bg-[#0ecb81] flex items-center justify-center font-bold text-[#0b0e11]">
            NG
          </div>
          <span className="font-bold text-white hidden md:block">StockBroker</span>
        </div>
        <nav className="flex-1 w-full py-4 flex flex-col gap-2">
          {[
            { icon: Home, label: 'Feed', active: true },
            { icon: LayoutDashboard, label: 'Dashboard' },
            { icon: PieChart, label: 'Portfolio' },
            { icon: ArrowRightLeft, label: 'Trade' },
            { icon: Clock, label: 'History' },
          ].map((item, i) => (
            <button key={i} className={`flex items-center gap-3 px-4 md:px-6 py-3 w-full transition-colors ${item.active ? 'text-[#0ecb81] bg-[#0ecb81]/10 border-r-2 border-[#0ecb81]' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
              <item.icon className="w-5 h-5" />
              <span className="hidden md:block font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Column (60%) */}
        <div className="flex-1 lg:w-[60%] flex flex-col border-r border-gray-800 overflow-y-auto custom-scrollbar">
          
          {/* Top Bar / Portfolio Snapshot */}
          <div className="p-6 border-b border-gray-800 bg-[#111821]/50 sticky top-0 z-10 backdrop-blur-sm">
            <h1 className="text-xl font-bold text-white mb-4">Activity Feed</h1>
            
            <div className="bg-[#111821] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Portfolio Value</p>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-2xl font-bold text-white">₦4,842,316</h2>
                  <span className="text-[#0ecb81] text-sm font-medium flex items-center bg-[#0ecb81]/10 px-2 py-0.5 rounded">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +0.80% Today
                  </span>
                </div>
              </div>
              
              <div className="hidden sm:flex items-center gap-4 text-right">
                <div>
                  <p className="text-xs text-gray-400">Cash Balance</p>
                  <p className="font-medium text-white">₦812,400</p>
                </div>
                <div className="w-px h-8 bg-gray-800"></div>
                <div>
                  <p className="text-xs text-gray-400">Total Return</p>
                  <p className="font-medium text-[#0ecb81]">+18.4%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Feed List */}
          <div className="p-4 md:p-6 space-y-3 pb-12">
            {feedItems.map((item) => (
              <div key={item.id} className={`bg-[#111821] border border-gray-800 ${item.color} rounded-lg p-4 flex gap-4 hover:bg-gray-800/30 transition-colors`}>
                <div className="mt-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-200 truncate">{item.title}</h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{item.time}</span>
                  </div>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
            
            <button className="w-full py-3 mt-4 rounded-lg border border-gray-800 text-sm text-gray-400 font-medium hover:bg-gray-800 hover:text-white transition-colors">
              Load more activity...
            </button>
          </div>
        </div>

        {/* Right Column (40%) */}
        <div className="w-full lg:w-[40%] flex flex-col bg-[#0b0e11] overflow-y-auto border-t lg:border-t-0 border-gray-800">
          
          <div className="p-6 sticky top-0 bg-[#0b0e11] z-10 flex justify-end">
            <div className="inline-flex items-center gap-2 bg-[#0ecb81]/10 text-[#0ecb81] px-3 py-1.5 rounded-full text-xs font-medium border border-[#0ecb81]/20">
              <span className="w-2 h-2 rounded-full bg-[#0ecb81] animate-pulse"></span>
              Market Open
            </div>
          </div>

          <div className="p-6 pt-0 space-y-6">
            
            {/* Quick Trade */}
            <div className="bg-[#111821] rounded-xl border border-gray-800 p-5">
              <h3 className="font-semibold text-white mb-4">Quick Trade</h3>
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search ticker (e.g., MTNN)" 
                  className="w-full bg-[#0b0e11] border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-[#0ecb81] transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button className="flex-1 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] font-bold py-2 rounded-lg text-sm transition-colors">
                  Buy
                </button>
                <button className="flex-1 bg-[#f6465d] hover:bg-[#f6465d]/90 text-white font-bold py-2 rounded-lg text-sm transition-colors">
                  Sell
                </button>
              </div>
            </div>

            {/* Today's Movers */}
            <div className="bg-[#111821] rounded-xl border border-gray-800 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-white">Today's Movers</h3>
                <button className="text-xs text-[#0ecb81] hover:underline">View All</button>
              </div>
              
              <div className="space-y-4">
                {movers.map((stock, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="font-medium text-gray-300 text-sm">{stock.symbol}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white text-sm">₦{stock.price}</span>
                      <span className={`text-xs font-medium w-14 text-right ${stock.isGainer ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                        {stock.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Open Orders */}
            <div className="bg-[#111821] rounded-xl border border-gray-800 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-white">Open Orders (3)</h3>
                <button className="text-xs text-gray-400 hover:text-white">Cancel All</button>
              </div>
              
              <div className="space-y-3">
                {openOrders.map((order, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-[#0b0e11] rounded border border-gray-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${order.type === 'Buy' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                          {order.type}
                        </span>
                        <span className="text-sm font-medium text-white">{order.symbol}</span>
                      </div>
                      <p className="text-xs text-gray-500">{order.qty} @ ₦{order.price}</p>
                    </div>
                    <button className="text-gray-500 hover:text-[#f6465d] transition-colors p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #1f2937;
          border-radius: 10px;
        }
      `}} />
    </div>
  );
}
