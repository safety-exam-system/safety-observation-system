"use client";
 async function compressClosingPhoto(file: File): Promise<File> {
  const MAX_SIZE = 60 * 1024; // 60 KB

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    image.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(
        new Error("Unable to read the selected image.")
      );
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Image compression is not supported.");
    }

    let width = image.naturalWidth;
    let height = image.naturalHeight;

    // প্রথমে ছবির dimensions সীমিত করা হবে
    const MAX_DIMENSION = 1600;
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(width, height)
    );

    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    for (let resizeAttempt = 0; resizeAttempt < 10; resizeAttempt++) {
      canvas.width = width;
      canvas.height = height;

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);

      context.drawImage(image, 0, 0, width, height);

      for (let quality = 0.85; quality >= 0.10; quality -= 0.05) {
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", quality);
        });

        if (blob && blob.size <= MAX_SIZE) {
          return new File(
            [blob],
            `closing-${Date.now()}.jpg`,
            {
              type: "image/jpeg",
              lastModified: Date.now(),
            }
          );
        }
      }

      // 60 KB না হলে ছবির dimensions আরও কমানো হবে
      width = Math.max(1, Math.floor(width * 0.75));
      height = Math.max(1, Math.floor(height * 0.75));
    }

    throw new Error(
      "The photo could not be compressed to 60 KB. Please select another photo."
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Observation = Record<string, unknown> & {
  id: number | string;
  site_code?: string | null;
  category?: string | null;
  observation_date?: string | null;
  submitted_by?: string | null;
  description?: string | null;
  status?: string | null;
  created_at?: string | null;
  photo_urls?: unknown;
  closure_photo_urls?: unknown;
  closed_at?: string | null;
  closed_by?: string | null;
};

type Photo = {
  path: string;
  url: string;
};
async function downloadPhoto(photo: Photo, index: number, type: string) {
  try {
    const response = await fetch(photo.url);

    if (!response.ok) {
      throw new Error("Photo download failed.");
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${type}-${index + 1}.jpg`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Photo download error:", error);
    alert("Unable to download this photo. Please try again.");
  }
}
const FIELD_LABELS: Record<string, string> = {
  id: "Observation ID",
  site_code: "Site Code",
  category: "Observation Category",
  observation_date: "Observation Date",
  submitted_by: "Submitted By",
  description: "Description",
  status: "Status",
  created_at: "Created At",

  violation_company: "Violation Company",
  contractor_name: "Contractor Name",
  person_type: "Person Type",
  violator_name: "Violator Name",
  observer_name: "Observer Name",
  unsafe_act_location: "Unsafe Act Location",
  people_count: "People Count",
  wrong_behaviour_count: "Wrong Behaviour Count",
  spot_correction_count: "Spot Correction Count",
  sport_correction_count: "Spot Correction Count",
  behaviour_category: "Behaviour Category",
  violation_type: "Violation Type",
  violation_sub_classification: "Violation Sub-classification",

  reporting_person: "Reporting Person",
  responsible_person: "Responsible Person",
  observer_company: "Observer Company",
  unsafe_condition_location: "Unsafe Condition Location",
  unsafe_condition_category: "Unsafe Condition Category",
  unsafe_condition_sub_category: "Unsafe Condition Sub-category",
  unsafe_condition_hazard_class: "Hazard Class",
  unsafe_condition_leading_activity: "Leading Activity",
  closure_recommendations: "Closure Recommendations",
  site_incharge: "Site In-charge",

  near_miss_location: "Near Miss Location",
  near_miss_responsible_person: "Near Miss Responsible Person",
  near_miss_company_name: "Company Name",
  near_miss_observer_name: "Observer Name",
  near_miss_unsafe_type: "Unsafe Type",
  near_miss_category: "Near Miss Category",
  near_miss_sub_category: "Near Miss Sub-category",
  near_miss_hazard_class: "Hazard Class",
  near_miss_leading_activity: "Leading Activity",
  near_miss_root_cause: "Root Cause",
  near_miss_root_cause_sub_category: "Root Cause Sub-category",
  near_miss_site_incharge: "Site In-charge",

  observation_why_happened: "Why It Happened? (Observation)",
  observation_potential_consequence: "What Could Have Happened? (Observation)",
  observation_correction_action: "Correction Action (Observation)",
  observation_action_taken_by: "Action Taken By (Observation)",
  observation_action_taken: "Action Taken (Observation)",
  observation_report_closed_date: "Observation Report Closed Date",

  near_miss_why_happened: "Why It Happened? (Near Miss)",
  near_miss_potential_consequence: "What Could Have Happened? (Near Miss)",
  near_miss_correction_action: "Correction Action (Near Miss)",
  near_miss_corrective_action: "Corrective Action (Near Miss)",
  near_miss_action_taken_by: "Action Taken By (Near Miss)",
  near_miss_report_closed_date: "Near Miss Report Closed Date",

  closed_at: "Closed At",
  closed_by: "Closed By",
};

const HIDDEN_FIELDS = new Set([
  "photo_urls",
  "closure_photo_urls",
]);

function formatLabel(key: string) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];

  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function extractStoragePaths(value: unknown): string[] {
  if (!value) return [];

  let parsed: unknown = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
  return typeof value === "string" ? [value] : [];
}
  }

  if (typeof parsed === "string") {
    return [parsed];
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map((item: unknown): string => {
        if (typeof item === "string") {
          return item;
        }

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
      .filter((path: string) => path.length > 0);
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

function ObservationDetailsContent() {
  const searchParams = useSearchParams();

  const id = searchParams.get("id") || "";
  const siteCode = searchParams.get("siteCode") || "";
  const siteName = searchParams.get("siteName") || "Site Dashboard";
  const categoryFromUrl = searchParams.get("category") || "Observation";

  const [observation, setObservation] = useState<Observation | null>(null);
  const [observationPhotos, setObservationPhotos] = useState<Photo[]>([]);
  const [closingPhotos, setClosingPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
const [correctiveAction, setCorrectiveAction] = useState("");
const [rootCause, setRootCause] = useState("");
const [preventiveAction, setPreventiveAction] = useState("");
const [closingRemarks, setClosingRemarks] = useState("");
const [closedBy, setClosedBy] = useState("");
const [closingFile, setClosingFile] = useState<File | null>(null);
const [closingPreview, setClosingPreview] = useState("");
const [closingSaving, setClosingSaving] = useState(false);
const [closingError, setClosingError] = useState("");
  const loadPhotos = useCallback(
  async (value: unknown): Promise<Photo[]> => {
    const paths = extractStoragePaths(value);

    if (paths.length === 0) return [];

    try {
      const response = await fetch("/api/observation-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          siteCode,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        console.error(
          "Unable to load observation photos:",
          result?.error || response.statusText
        );
        return [];
      }

      const result = await response.json();

      const allPhotos: Photo[] = [
        ...(Array.isArray(result.originalPhotos)
          ? result.originalPhotos
          : []),
        ...(Array.isArray(result.closingPhotos)
          ? result.closingPhotos
          : []),
      ];

      const requestedPaths = new Set(paths);

      return allPhotos.filter(
        (photo) =>
          photo &&
          typeof photo.path === "string" &&
          typeof photo.url === "string" &&
          requestedPaths.has(photo.path)
      );
    } catch (error) {
      console.error("Photo loading failed:", error);
      return [];
    }
  },
  [id, siteCode]
);

  const loadObservation = useCallback(async () => {
    if (!id) {
      setErrorMessage("Observation ID is missing. Please return to the Observation List.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      let query = supabase
        .from("observations")
        .select("*")
        .eq("id", id);

      if (siteCode) {
        query = query.eq("site_code", siteCode);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("Observation details loading error:", error);
        setErrorMessage(
          "Unable to load this observation. Please check database permissions and try again."
        );
        setObservation(null);
        return;
      }

      if (!data) {
        setErrorMessage(
          "This observation was not found, or you do not have permission to view it."
        );
        setObservation(null);
        return;
      }

      const record = data as Observation;

      setObservation(record);

      const [originalPhotos, resolvedClosingPhotos] = await Promise.all([
        loadPhotos(record.photo_urls),
        loadPhotos(record.closure_photo_urls),
      ]);

      setObservationPhotos(originalPhotos);
      setClosingPhotos(resolvedClosingPhotos);
    } catch (error) {
      console.error("Unexpected observation details error:", error);
      setErrorMessage("Something went wrong while loading observation details.");
      setObservation(null);
    } finally {
      setLoading(false);
    }
  }, [id, siteCode, loadPhotos]);

  useEffect(() => {
    void loadObservation();
  }, [loadObservation]);

  function goBack() {
    const params = new URLSearchParams();

    if (siteCode) params.set("siteCode", siteCode);
    if (siteName) params.set("siteName", siteName);
    if (categoryFromUrl) params.set("category", categoryFromUrl);

    window.location.href = `/observation-list?${params.toString()}`;
  }
async function handleCloseObservation(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault();
  setClosingError("");

  if (
    !correctiveAction.trim() ||
    !rootCause.trim() ||
    !preventiveAction.trim() ||
    !closedBy.trim() ||
    !closingFile
  ) {
    setClosingError(
      "Please complete all required fields and select a closing photo."
    );
    return;
  }

  if (!observation || observation.status !== "Open") {
    setClosingError("This observation is not open.");
    return;
  }

  if (!siteCode || !/^[A-Z0-9]{3}$/.test(siteCode)) {
    setClosingError("Invalid Site Code. Please return to the Site Dashboard.");
    return;
  }

  setClosingSaving(true);

  try {
    const supabase = createClient();
const compressedFile = await compressClosingPhoto(closingFile);

if (compressedFile.size > 60 * 1024) {
  setClosingError("Closing photo must be 60 KB or smaller.");
  setClosingSaving(false);
  return;
}
    const safeFileName = closingFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const categoryFolder = (observation.category || "observation")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");

    const photoPath =
      `${siteCode}/${categoryFolder}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("observation-photos")
      .upload(photoPath, compressedFile, {
  upsert: false,
  contentType: "image/jpeg",
});

    if (uploadError) {
      console.error("Closing photo upload error:", uploadError);
      setClosingError(
        "Unable to upload the closing photo. Please check Storage permissions and try again."
      );
      return;
    }

    const { data, error: updateError } = await supabase
      .from("observations")
      .update({
        corrective_action: correctiveAction.trim(),
        root_cause: rootCause.trim(),
        preventive_action: preventiveAction.trim(),
        closing_remarks: closingRemarks.trim() || null,
        closed_by: closedBy.trim(),
        closed_at: new Date().toISOString(),
        closure_photo_urls: [photoPath],
        status: "Close",
      })
      .eq("id", observation.id)
      .eq("site_code", siteCode)
      .eq("status", "Open")
      .select("id")
      .maybeSingle();

    if (updateError || !data) {
      console.error("Observation closure update error:", updateError);

      // Do not delete the uploaded photo automatically; the database update
      // may have failed because of permissions or a concurrent status change.
      setClosingError(
        "The photo was uploaded, but the observation could not be closed. Please check database UPDATE permissions and try again."
      );
      return;
    }

    setClosingFile(null);
    setClosingPreview("");
    setCorrectiveAction("");
    setRootCause("");
    setPreventiveAction("");
    setClosingRemarks("");
    setClosedBy("");

    await loadObservation();
  } catch (error) {
    console.error("Unexpected observation closure error:", error);
    setClosingError("Something went wrong while closing the observation.");
  } finally {
    setClosingSaving(false);
  }
}
  if (loading) {
    
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Loading observation details...</p>
        </div>
      </main>
    );
  }

  if (errorMessage || !observation) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-red-800">
            Unable to Load Observation
          </h1>

          <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
            {errorMessage || "Observation details are unavailable."}
          </p>

          <button
            type="button"
            onClick={() => void loadObservation()}
            className="mt-5 rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={goBack}
            className="ml-3 mt-5 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Observation List
          </button>
        </div>
      </main>
    );
  }

  const isClosed = observation.status === "Close";

  const excludedFromGeneralDetails = new Set([
    "id",
    "site_code",
    "category",
    "observation_date",
    "submitted_by",
    "description",
    "status",
    "created_at",
    "photo_urls",
    "closure_photo_urls",
    "closed_at",
    "closed_by",
  ]);

  const generalDetails = Object.entries(observation).filter(
    ([key, value]) =>
      !excludedFromGeneralDetails.has(key) &&
      !HIDDEN_FIELDS.has(key) &&
      value !== null &&
      value !== undefined &&
      value !== ""
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-4 rounded-2xl bg-blue-800 p-6 text-white shadow-lg">
  <div className="min-w-0 flex-1">
    <p className="text-sm font-semibold tracking-wide text-blue-200">
      SAFETY OBSERVATION
    </p>

    <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">
      Observation Details
    </h1>

    <p className="mt-2 text-blue-100">{siteName}</p>

    <p className="mt-1 text-sm text-blue-100">
      Site Code: {observation.site_code || siteCode || "Not available"}
    </p>
  </div>
</header>

<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
  <div className="flex items-start justify-between gap-4">
    <div className="min-w-0 flex-1">
      <p className="text-sm text-slate-500">Observation ID</p>

      <h2 className="mt-1 text-2xl font-bold text-slate-900">
        #{observation.id}
      </h2>

      <p className="mt-3 text-sm text-slate-600">
        Category:{" "}
        <span className="font-semibold text-slate-900">
          {observation.category || categoryFromUrl}
        </span>
      </p>

      <p className="mt-1 text-sm text-slate-600">
        Date: {formatValue(observation.observation_date)}
      </p>
    </div>

 <div className="flex shrink-0 flex-col items-end gap-3">
  <div className="flex h-14 w-32 items-center justify-center rounded-lg border border-slate-200 bg-white p-2">
    <img
      src="/thermax-logo.png"
      alt="Thermax Logo"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  </div>

  <span
    className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${
      observation.status === "Open"
        ? "bg-amber-100 text-amber-800"
        : isClosed
          ? "bg-green-100 text-green-800"
          : "bg-slate-100 text-slate-700"
    }`}
  >
    {formatValue(observation.status)}
  </span>
</div>
  </div>
</section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-900">
            Basic Information
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">
                Submitted By
              </p>
              <p className="mt-2 break-words font-semibold text-slate-900">
                {formatValue(observation.submitted_by)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">
                Created At
              </p>
              <p className="mt-2 break-words font-semibold text-slate-900">
                {formatValue(observation.created_at)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800">Description</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
              {formatValue(observation.description)}
            </p>
          </div>
        </section>

        {generalDetails.length > 0 && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Additional Information
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {generalDetails.map(([key, value]) => (
                <div
                  key={key}
                  className="min-w-0 rounded-xl border border-slate-200 p-4"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {formatLabel(key)}
                  </p>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                    {formatValue(value)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-900">
            Observation Photos
          </h2>

          {observationPhotos.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              No observation photos are available for this record.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {observationPhotos.map((photo, index) => (
  <div
    key={`${photo.path}-${index}`}
    className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
  >
    <a
      href={photo.url}
      target="_blank"
      rel="noreferrer"
      className="block"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={`Observation photo ${index + 1}`}
        className="h-56 w-full object-contain"
      />
    </a>

    <div className="flex items-center justify-between gap-2 p-3">
      <a
        href={photo.url}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-blue-700"
      >
        View Photo {index + 1}
      </a>

      <button
        type="button"
        onClick={() => void downloadPhoto(photo, index, "Observation")}
        className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
      >
        Download
      </button>
    </div>
  </div>
))}
            </div>
          )}
        </section>

        {isClosed && (
          <section className="mt-6 rounded-2xl border border-green-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-green-800">
              Closure Information
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-sm font-medium text-green-700">
                  Closed At
                </p>
                <p className="mt-2 break-words font-semibold text-slate-900">
                  {formatValue(observation.closed_at)}
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-sm font-medium text-green-700">
                  Closed By
                </p>
                <p className="mt-2 break-words font-semibold text-slate-900">
                  {formatValue(observation.closed_by)}
                </p>
              </div>
            </div>

            <h3 className="mt-6 font-bold text-slate-900">
              Closing Photos / Evidence
            </h3>

            {closingPhotos.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No closing photos are available for this record.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {closingPhotos.map((photo, index) => (
  <div
    key={`${photo.path}-${index}`}
    className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
  >
    <a
      href={photo.url}
      target="_blank"
      rel="noreferrer"
      className="block"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={`Closing evidence ${index + 1}`}
        className="h-56 w-full object-contain"
      />
    </a>

    <div className="flex items-center justify-between gap-2 p-3">
      <a
        href={photo.url}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-green-700"
      >
        View Evidence {index + 1}
      </a>

      <button
        type="button"
        onClick={() => void downloadPhoto(photo, index, "Closing-Evidence")}
        className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
      >
        Download
      </button>
    </div>
  </div>
))}
              </div>
            )}
          </section>
        )}

        {observation.status === "Open" && (
  <section className="mt-6 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold text-amber-900">
      Close Observation
    </h2>

    <p className="mt-2 text-sm leading-6 text-slate-600">
      Complete the corrective and preventive actions and upload a closing
      photo before closing this observation.
    </p>

    <form onSubmit={handleCloseObservation} className="mt-5 space-y-5">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Corrective Action *
        </label>
        <textarea
          value={correctiveAction}
          onChange={(event) => setCorrectiveAction(event.target.value)}
          required
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          placeholder="Describe how the issue was corrected."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Root Cause *
        </label>
        <textarea
          value={rootCause}
          onChange={(event) => setRootCause(event.target.value)}
          required
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          placeholder="Describe the root cause."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Preventive Action *
        </label>
        <textarea
          value={preventiveAction}
          onChange={(event) => setPreventiveAction(event.target.value)}
          required
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          placeholder="Describe how recurrence will be prevented."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Closing Remarks
        </label>
        <textarea
          value={closingRemarks}
          onChange={(event) => setClosingRemarks(event.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          placeholder="Additional closure remarks (optional)."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Closed By *
        </label>
        <input
          type="text"
          value={closedBy}
          onChange={(event) => setClosedBy(event.target.value)}
          required
          maxLength={150}
          className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          placeholder="Enter the responsible person's name."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Closing Photo / Evidence *
        </label>
        <input
          type="file"
          accept="image/*"
          required
          onChange={(event) => {
            const file = event.target.files?.[0] || null;

            setClosingFile(file);
            setClosingError("");

            setClosingPreview((previous) => {
              if (previous) URL.revokeObjectURL(previous);
              return file ? URL.createObjectURL(file) : "";
            });
          }}
          className="block w-full rounded-lg border border-slate-300 p-3 text-sm"
        />

        {closingPreview && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={closingPreview}
              alt="Selected closing evidence preview"
              className="max-h-80 w-full rounded-lg object-contain"
            />

            <button
              type="button"
              onClick={() => {
                setClosingFile(null);
                setClosingPreview((previous) => {
                  if (previous) URL.revokeObjectURL(previous);
                  return "";
                });
              }}
              className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700"
            >
              Remove Photo
            </button>
          </div>
        )}
      </div>

      {closingError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {closingError}
        </p>
      )}

      <button
        type="submit"
        disabled={closingSaving}
        className="w-full rounded-lg bg-green-700 px-4 py-3 font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {closingSaving ? "Saving Closure..." : "Close Observation"}
      </button>
    </form>
  </section>
)}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={goBack}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back to Observation List
          </button>

          <button
            type="button"
            onClick={() => void loadObservation()}
            className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Refresh Details
          </button>
        </div>
      </div>
    </main>
  );
}

export default ObservationDetailsContent;