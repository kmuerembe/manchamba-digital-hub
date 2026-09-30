import { createFileRoute } from "@tanstack/react-router";

/**
 * URL de callback a registar junto da Movitel: https://<dominio>/api/pagamentos/emola-callback
 * Corpo: { "reqeustId": "...", "transId": "...", "refNo": "...", "errorCode": "0", "message": "..." }
 * Resposta esperada pelo e-Mola: { "responseCode": "0", "message": "Success callback" }
 */
export const Route = createFileRoute("/api/pagamentos/emola-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const segredo = process.env["EMOLA_CALLBACK_SECRET"];
        if (segredo) {
          const url = new URL(request.url);
          const recebido =
            request.headers.get("x-callback-secret") ?? url.searchParams.get("segredo");
          if (recebido !== segredo)
            return Response.json({ responseCode: "1", message: "Unauthorized" }, { status: 401 });
        }
        let corpo: Record<string, unknown> = {};
        try {
          corpo = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ responseCode: "1", message: "Invalid JSON" }, { status: 400 });
        }
        const { tratarCallbackEmola } = await import("@/lib/pagamentos/processar.server");
        let ok = false;
        try {
          ok = await tratarCallbackEmola(corpo);
        } catch (erro) {
          console.error("[emola-callback]", erro);
          return Response.json({ responseCode: "1", message: "Internal error" }, { status: 500 });
        }
        return Response.json(
          {
            responseCode: ok ? "0" : "1",
            message: ok ? "Success callback" : "Transaction not found",
          },
          { status: ok ? 200 : 404 },
        );
      },
    },
  },
});
