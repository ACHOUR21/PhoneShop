import { ok } from "@/lib/api-helpers";

export async function GET() {
  return ok({
    ok: true,
    app: "PhoneShop Pro",
    version: "0.2.1",
    time: new Date().toISOString(),
  });
}
