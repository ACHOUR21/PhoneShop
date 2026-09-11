import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <p className="text-lg text-muted-foreground">Page not found — الصفحة غير موجودة</p>
      <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Back to home — الرئيسية
      </Link>
    </div>
  );
}
