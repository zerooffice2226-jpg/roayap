import { redirect } from "next/navigation";

export default function RootPage() {
  // التوجيه الصحيح والمنطقي لفتح شاشة الأيقونات الشبكية الخمس الكبرى فوراً
  redirect("/dashboard");
}
