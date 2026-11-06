import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseReceiptExtraction, type ReceiptDraft } from "@/lib/receipt-rules";

const MAX_DATA_URL = 8_000_000; // ~6 MB image

/** Reads a receipt photo with AI and returns a draft (never saves anything). */
export const extractReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { image: string }) => {
    if (typeof input?.image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(input.image)) throw new Error("Imagen no válida");
    if (input.image.length > MAX_DATA_URL) throw new Error("La imagen es demasiado grande");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ draft: ReceiptDraft | null; error: string | null }> => {
    const { data: companyId } = await context.supabase.rpc("current_company_id");
    if (!companyId) return { draft: null, error: "Sin acceso." };
    const { data: allowed } = await context.supabase.rpc("phase3_can_register_expenses", { _company: companyId });
    if (!allowed) return { draft: null, error: "No tienes permiso para registrar gastos." };

    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Extrae los datos de este ticket o factura española. Devuelve el nombre del comercio/proveedor, la fecha (YYYY-MM-DD), el importe total con IVA y el importe de IVA en euros. Usa null si un dato no se ve con claridad. No inventes valores." },
            { type: "input_image", image_url: data.image, detail: "high" },
          ],
        }],
        text: {
          format: {
            type: "json_schema", name: "receipt", strict: true,
            schema: {
              type: "object", additionalProperties: false,
              required: ["supplier", "date", "total", "vat"],
              properties: {
                supplier: { type: ["string", "null"] },
                date: { type: ["string", "null"] },
                total: { type: ["number", "null"] },
                vat: { type: ["number", "null"] },
              },
            },
          },
        },
      });
      let text = "";
      for (const item of (res as { output?: { type: string; content?: { type: string; text?: string }[] }[] }).output ?? []) {
        if (item.type === "message") for (const c of item.content ?? []) if (c.type === "output_text") text += c.text ?? "";
      }
      const draft = parseReceiptExtraction(text);
      return draft ? { draft, error: null } : { draft: null, error: "No se pudo leer el ticket. Rellena los datos a mano." };
    } catch (e) {
      if (e instanceof GatewayError) {
        console.error("receipt extraction", e.code, e.httpStatus);
        if (e.httpStatus === 402) return { draft: null, error: "Sin créditos de IA disponibles." };
        if (e.httpStatus === 429) return { draft: null, error: "Demasiadas solicitudes. Inténtalo en un momento." };
      } else console.error("receipt extraction", e);
      return { draft: null, error: "No se pudo leer el ticket. Rellena los datos a mano." };
    }
  });
