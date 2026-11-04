import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // Verify the logged-in user through their session.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Cookies may be updated by the proxy.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to view observation photos." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = body?.id;
    const siteCode = body?.siteCode;

    if (
      (typeof id !== "string" && typeof id !== "number") ||
      typeof siteCode !== "string" ||
      !/^[A-Z0-9]{3}$/.test(siteCode)
    ) {
      return NextResponse.json(
        { error: "Invalid observation details." },
        { status: 400 }
      );
    }

    // Read the observation through the logged-in user's client.
    // Existing Supabase access policies still apply here.
    const { data: observation, error: observationError } =
      await supabase
        .from("observations")
        .select("id, site_code, photo_urls, closure_photo_urls")
        .eq("id", id)
        .eq("site_code", siteCode)
        .maybeSingle();

    if (observationError) {
      console.error("Observation photo lookup failed:", observationError);

      return NextResponse.json(
        { error: "Unable to verify observation access." },
        { status: 500 }
      );
    }

    if (!observation) {
      return NextResponse.json(
        { error: "Observation not found or access denied." },
        { status: 404 }
      );
    }

    function getPaths(value: unknown): string[] {
      if (!value) return [];

      let parsed = value;

      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          return [];
        }
      }

      if (typeof parsed === "string") {
        return [parsed];
      }

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "string") return item;

            if (
              typeof item === "object" &&
              item !== null &&
              "path" in item &&
              typeof item.path === "string"
            ) {
              return item.path;
            }

            return "";
          })
          .filter(Boolean);
      }

      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "path" in parsed &&
        typeof parsed.path === "string"
      ) {
        return [parsed.path];
      }

      return [];
    }

    async function createPhotoUrls(value: unknown) {
      const paths = getPaths(value);

      return Promise.all(
        paths.map(async (path) => {
          // Accept only paths inside this observation's site folder.
          const safePrefix = `${siteCode}/`;

          if (
            path.startsWith("/") ||
            path.includes("\\") ||
            path.split("/").includes("..") ||
            !path.startsWith(safePrefix) ||
            /^https?:\/\//i.test(path)
          ) {
            console.error("Rejected invalid observation photo path.");
            return null;
          }

          const { data, error } = await supabaseAdmin.storage
            .from("observation-photos")
            .createSignedUrl(path, 3600);

          if (error || !data?.signedUrl) {
            console.error("Unable to sign observation photo:", error);
            return null;
          }

          return {
            path,
            url: data.signedUrl,
          };
        })
      ).then((photos) => photos.filter((photo) => photo !== null));
    }

    const [originalPhotos, closingPhotos] = await Promise.all([
      createPhotoUrls(observation.photo_urls),
      createPhotoUrls(observation.closure_photo_urls),
    ]);

    return NextResponse.json({
      originalPhotos,
      closingPhotos,
    });
  } catch (error) {
    console.error("Observation photo API error:", error);

    return NextResponse.json(
      { error: "Unable to load observation photos." },
      { status: 500 }
    );
  }
}