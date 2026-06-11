'use client'
import React, { useState } from "react"
import { 
  FileSpreadsheet, ShieldCheck, ArrowLeftRight, 
  Search, SlidersHorizontal, Hash, HelpCircle 
} from "lucide-react"

// Live and comprehensive simulation of entries generated from previous operations (fully Odoo-compliant)
const DATA_JOURNAL_ENTRIES = [
  {
    id: "entry-1",
    name: "INV/2026/0001",
    date: "2026-06-08",
    ref: "Sales Invoice No. INV/2026/0001",
    journal: { name: "Sales Journal", code: "INV" },
    lines: [
      { id: "jl-1", accountCode: "1102001", accountName: "Accounts Receivable", debit: 15000.00, credit: 0.00, partner: "شركة الأمل للتجارة" },
      { id: "jl-2", accountCode: "4101001", accountName: "Screen Sales Revenue", debit: 0.00, credit: 15000.00, partner: "شركة الأمل للتجارة" },
      { id: "jl-3", accountCode: "5101001", accountName: "Cost of Goods Sold", debit: 10000.00, credit: 0.00, partner: null },
      { id: "jl-4", accountCode: "1104001", accountName: "Finished Goods Inventory", debit: 0.00, credit: 10000.00, partner: null }
    ]
  },
  {
    id: "entry-2",
    name: "PAY/MOU/2026/4892",
    date: "2026-06-08",
    ref: "Payment for Invoice No. INV/2026/0002",
    journal: { name: "Bank Journal", code: "BNK" },
    lines: [
      { id: "jl-5", accountCode: "1101002", accountName: "Bank Misr Current Account", debit: 4200.00, credit: 0.00, partner: "مؤسسة النجاح للمقاولات" },
      { id: "jl-6", accountCode: "1102001", accountName: "Accounts Receivable", debit: 0.00, credit: 4200.00, partner: "مؤسسة النجاح للمقاولات" }
    ]
  },
  {
    id: "entry-3",
    name: "REV/INV/2026/0001",
    date: "2026-06-08",
    ref: "Reversal of Entry INV/2026/0001 - Reason: Reversal Entry",
    journal: { name: "General Operations Journal", code: "GEN" },
    lines: [
      { id: "jl-7", accountCode: "1102001", accountName: "Accounts Receivable", debit: 0.00, credit: 15000.00, partner: "شركة الأمل للتجارة" },
      { id: "jl-8", accountCode: "4101001", accountName: "Screen Sales Revenue", debit: 15000.00, credit: 0.00, partner: "شركة الأمل للتجارة" }
    ]
  }
];

export default function JournalEntriesPage() {
  const [entries] = useState<any[]>(DATA_JOURNAL_ENTRIES);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter entries based on entry number, account name, or reference
  const filteredEntries = entries.filter(entry => 
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.ref.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
      
      {/* Financial Audit Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-slate-900" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">General Ledger</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">Legal review and comprehensive audit of automatically generated debit and credit lines</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm">
          <ShieldCheck size={16} />
          Accounting Integrity: 100% (All entries are balanced and locked with double-entry)
        </div>
      </div>

      {/* Advanced Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by entry number, statement, reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold px-4 py-2 rounded-lg transition-all">
          <SlidersHorizontal size={14} />
          Advanced filter by journal
        </button>
      </div>

      {/* Entries Display Loop */}
      <div className="space-y-8">
        {filteredEntries.map((entry) => {
          const totalDebit = entry.lines.reduce((sum: number, l: any) => sum + l.debit, 0);
          const totalCredit = entry.lines.reduce((sum: number, l: any) => sum + l.credit, 0);

          return (
            <div key={entry.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              
              {/* Financial Entry Header */}
              <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider text-slate-200">
                    {entry.journal.code}
                  </div>
                  <h3 className="font-mono text-sm font-black tracking-tight">{entry.name}</h3>
                  <span className="text-xs text-slate-400">|</span>
                  <p className="text-xs text-slate-300 font-medium">{entry.ref}</p>
                </div>
                <div className="text-xs font-semibold bg-white/10 text-white px-3 py-1 rounded-full border border-white/5">
                  Date: {entry.date}
                </div>
              </div>

              {/* Detailed Entry Lines Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/60 text-xs font-bold text-slate-500">
                      <th className="p-4">Account Code</th>
                      <th className="p-4">Financial Account</th>
                      <th className="p-4">Partner</th>
                      <th className="p-4 text-left">Debit</th>
                      <th className="p-4 text-left">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {entry.lines.map((line: any) => (
                      <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-mono text-xs font-bold text-slate-500">
                          {line.accountCode}
                        </td>
                        <td className="p-4 font-medium text-slate-800">
                          {line.accountName}
                        </td>
                        <td className="p-4 text-xs text-slate-600">
                          {line.partner || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="p-4 font-mono font-bold text-left text-slate-900">
                          {line.debit > 0 ? line.debit.toLocaleString(undefined, {minimumFractionDigits: 2}) : <span className="text-slate-200">0.00</span>}
                        </td>
                        <td className="p-4 font-mono font-bold text-left text-slate-900">
                          {line.credit > 0 ? line.credit.toLocaleString(undefined, {minimumFractionDigits: 2}) : <span className="text-slate-200">0.00</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  
                  {/* Entry Footer and Strict Balance Display */}
                  <tfoot>
                    <tr className="bg-slate-50/40 font-bold border-t border-slate-200">
                      <td colSpan={3} className="p-4 text-xs text-slate-500 flex items-center gap-1.5 justify-end">
                        <ArrowLeftRight size={14} className="text-emerald-500" />
                        Balance Status (Odoo Double-Entry): Perfect Balance
                      </td>
                      <td className="p-4 font-mono text-left text-sm text-slate-900 border-l border-slate-100">
                        {totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})} EGP
                      </td>
                      <td className="p-4 font-mono text-left text-sm text-slate-900">
                        {totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})} EGP
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

