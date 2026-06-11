'use server'

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  sku: z.string().min(2, { message: "SKU must be at least 2 characters." }),
  salePrice: z.coerce.number().min(0, { message: "Sale price must be a positive number." }),
  costPrice: z.coerce.number().min(0, { message: "Cost price must be a positive number." }),
  incomeAccountId: z.string(),
  expenseAccountId: z.string(),
});

export async function createProduct(values: z.infer<typeof formSchema>) {
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: validatedFields.data.name,
        sku: validatedFields.data.sku,
        salePrice: validatedFields.data.salePrice,
        costPrice: validatedFields.data.costPrice,
        incomeAccountId: validatedFields.data.incomeAccountId,
        expenseAccountId: validatedFields.data.expenseAccountId,
      },
    });
    return { success: `Successfully created product: ${product.name}` };
  } catch (error) {
    return { error: "Failed to create product." };
  }
}
