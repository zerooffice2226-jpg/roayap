"use server"
import { prisma } from "@/lib/prisma"

/**
 * Get account ID by code from the Chart of Accounts
 * Usage: await getAccountIdByCode("410101") // returns account UUID
 */
export async function getAccountIdByCode(code: string): Promise<string | null> {
  try {
    const account = await prisma.account.findUnique({
      where: { code }
    })
    return account?.id || null
  } catch (error) {
    console.error(`Error finding account with code ${code}:`, error)
    return null
  }
}

/**
 * Get default income account ID for products (Sales Revenue)
 */
export async function getDefaultIncomeAccountId(): Promise<string> {
  const accountId = await getAccountIdByCode("410101")
  if (!accountId) {
    throw new Error("Default income account (410101) not found in Chart of Accounts. Please run seed.")
  }
  return accountId
}

/**
 * Get default expense account ID for products (COGS)
 */
export async function getDefaultExpenseAccountId(): Promise<string> {
  const accountId = await getAccountIdByCode("510101")
  if (!accountId) {
    throw new Error("Default expense account (510101) not found in Chart of Accounts. Please run seed.")
  }
  return accountId
}

/**
 * Get all accounts mapped by code (for UI dropdowns)
 */
export async function getAccountsByType(type: "INCOME" | "EXPENSE" | "ASSET" | "LIABILITY" | "EQUITY") {
  try {
    return await prisma.account.findMany({
      where: { type },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" }
    })
  } catch (error) {
    console.error(`Error fetching ${type} accounts:`, error)
    return []
  }
}
