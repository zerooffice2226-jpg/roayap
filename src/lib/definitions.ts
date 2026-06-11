import { Account as PrismaAccount } from '@prisma/client';

export interface FinancialCard {
  title: string;
  value: number;
  change: number;
  period: string;
}

export interface FinancialChartData {
  month: string;
  income: number;
  expenses: number;
}

// Extend Prisma's Account type to include the children property
export interface Account extends PrismaAccount {
  children?: Account[];
}
