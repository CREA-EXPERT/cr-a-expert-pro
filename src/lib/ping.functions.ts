import { createServerFn } from "@tanstack/react-start";

export const pingServeur = createServerFn({ method: "POST" }).handler(async () => ({
  ok: true,
}));
