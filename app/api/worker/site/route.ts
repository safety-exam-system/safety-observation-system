import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const siteCode = request.nextUrl.searchParams
      .get("siteCode")
      ?.trim()
      .toUpperCase();

    if (!siteCode || siteCode.length > 30) {
      return NextResponse.json(
        { error: "A valid Site Code is required." },
        { status: 400 }
      );
    }

    const { data: site, error: siteError } = await supabaseAdmin
      .from("sites")
      .select("id, site_code, site_name")
      .eq("site_code", siteCode)
      .maybeSingle();

    if (siteError || !site) {
      return NextResponse.json(
        { error: "Invalid Site Code." },
        { status: 404 }
      );
    }

    const { data: companies, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, company_name, company_code")
      .eq("site_id", site.id)
      .eq("is_active", true)
      .order("company_name", { ascending: true });

    if (companyError) {
      console.error("Worker company lookup failed:", companyError);

      return NextResponse.json(
        { error: "Unable to load companies." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      site: {
        siteCode: site.site_code,
        siteName: site.site_name,
      },
      companies: companies ?? [],
    });
  } catch (error) {
    console.error("Worker site API error:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}