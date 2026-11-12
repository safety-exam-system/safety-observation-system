import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("sites")
      .select("id, site_code, site_name")
      .order("site_name", { ascending: true });

    if (error) {
      console.error("Public Sites API Error:", error);

      return NextResponse.json(
        { error: "Unable to load registered sites." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { sites: data ?? [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected Public Sites API Error:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}