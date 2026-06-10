import React from 'react'
import { Link } from 'wouter'
import { PlusCircle } from 'lucide-react'

export default function TradeFAB() {
  return (
    <div className="md:hidden fixed bottom-12 left-0 right-0 flex justify-center z-50">
      <Link href="/trade">
        <a aria-label="Trade" className="inline-flex items-center justify-center bg-primary text-white rounded-full w-16 h-16 shadow-lg ring-4 ring-white">
          <PlusCircle size={32} />
        </a>
      </Link>
    </div>
  )
}
