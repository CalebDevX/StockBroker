---
name: Layout Pattern
description: Correct outer/inner wrapper classes for all pages that use DashboardSidebar (fixed sidebar)
---

# Fixed-Sidebar Layout Pattern

All pages using `<DashboardSidebar />` must use this exact pattern:

```tsx
<div className="bg-background min-h-screen overflow-x-hidden">
  <DashboardSidebar />
  <div className="md:pl-56 flex flex-col min-h-screen">
    <MarketTicker />
    <main className="flex-1 p-3 md:p-5 pb-24 md:pb-6 ...">
```

**Why:** `DashboardSidebar` is `fixed left-0 w-56`. It does NOT participate in the flex layout.
Using `flex-1 md:ml-56` on the content div causes it to be 100vw wide (from flex-1), then shifted right by 224px via margin-left — creating 224px horizontal overflow.
Using `md:pl-56` (padding) instead means the div stays 100vw wide and its content starts 224px from the left. No overflow.

**How to apply:** Any new page with DashboardSidebar: outer = `bg-background min-h-screen overflow-x-hidden`, inner = `md:pl-56 flex flex-col min-h-screen`. Never use `flex bg-background` on the outer or `flex-1 md:ml-56` on the inner.
