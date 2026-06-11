export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  currentBalance: number;
  children: Account[];
}

export interface FinancialCard {
  title: string;
  value: string;
  description: string;
  type: 'income' | 'expense' | 'balance';
}

export interface FinancialChartData {
  name: string;
  الإيرادات: number;
  المصروفات: number;
}
