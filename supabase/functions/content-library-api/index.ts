import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRuntimeAccess } from "../review-api/_shared/runtime-access.ts";
import { createLibraryHandler } from "./_shared/handler.js";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const publicKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
const privateKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const publishableKey = publicKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const secretKey = privateKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secretKey, options);
const userClient = createClient(url, publishableKey, options);
Deno.serve(createLibraryHandler({
  admin,
  getUser: async (token: string) => { const { data, error } = await userClient.auth.getUser(token); return error ? null : data.user; },
  runtimeAccess: (token: string, userId: string) => checkRuntimeAccess(admin, token, userId),
  allowedOrigins: ["http://127.0.0.1:3000", "http://localhost:3000", "https://medical-learning-os-preview.onrender.com", "https://medical-learning-os-web.medicalos.workers.dev", ...(Deno.env.get("MLOS_ALLOWED_ORIGINS") ?? "").split(",").map(x => x.trim()).filter(Boolean)]
}));
