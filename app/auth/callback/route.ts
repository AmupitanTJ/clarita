import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeDestination(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("next");
  return requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = new URL(safeDestination(request), request.url);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      destination.searchParams.set("auth", "success");
      return NextResponse.redirect(destination);
    }
  }

  destination.searchParams.set("auth", "error");
  destination.searchParams.set(
    "auth_error",
    "That sign-in link is invalid or has expired. Please request a new link.",
  );
  return NextResponse.redirect(destination);
}
