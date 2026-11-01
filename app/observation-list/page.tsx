"use client";

import jsPDF from "jspdf";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Observation = Record<string, any> & {
  id: number | string;
  site_code: string | null;
  category: string | null;
  observation_date: string | null;
  submitted_by: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
};

type Photo = {
  path: string;
  url: string;
};

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
  responsible_person: "Responsible Person",
  reporting_person: "Reporting Person",
  near_miss_responsible_person: "Near Miss Responsible Person",
  observer_name: "Observer Name",
  unsafe_act_location: "Unsafe Act Location",
  people_count: "People Count",
  wrong_behaviour_count: "Wrong Behaviour Count",
  spot_correction_count: "Spot Correction Count",
  sport_correction_count: "Spot Correction Count",
  behaviour_category: "Behaviour Category",
  violation_type: "Violation Type",
  violation_sub_classification: "Violation Sub-classification",
  observer_company: "Observer Company",
  unsafe_condition_location: "Unsafe Condition Location",
  unsafe_condition_category: "Unsafe Condition Category",
  unsafe_condition_sub_category: "Unsafe Condition Sub-category",
  unsafe_condition_hazard_class: "Hazard Class",
  unsafe_condition_leading_activity: "Leading Activity",
  closure_recommendations: "Closure Recommendations",
  site_incharge: "Site In-charge",
  near_miss_location: "Near Miss Location",
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
  observation_why_happened: "Why It Happened?",
  observation_potential_consequence: "Potential Consequence",
  observation_correction_action: "Correction Action",
  observation_action_taken_by: "Action Taken By",
  observation_action_taken: "Action Taken",
  observation_report_closed_date: "Observation Report Closed Date",
  near_miss_why_happened: "Why It Happened? (Near Miss)",
  near_miss_potential_consequence: "Potential Consequence (Near Miss)",
  near_miss_correction_action: "Correction Action (Near Miss)",
  near_miss_corrective_action: "Corrective Action (Near Miss)",
  near_miss_action_taken_by: "Action Taken By (Near Miss)",
  near_miss_report_closed_date: "Near Miss Report Closed Date",
  corrective_action: "Corrective Action",
  root_cause: "Root Cause",
  preventive_action: "Preventive Action",
  closing_remarks: "Closing Remarks",
  closed_by: "Closed By",
  closed_at: "Closed At",
};

const HIDDEN_FIELDS = [
  "photo_urls",
  "closure_photo_urls",
];

function getDisplayStatus(status: string | null) {
  if (status === "Open") return "Open";
  if (status === "Close" || status === "Closed") return "Close";
  return status || "Unknown";
}

function formatValue(value: any): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getFieldLabel(key: string) {
  return (
    FIELD_LABELS[key] ||
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to convert image."));
      }
    };

    reader.onerror = () => reject(new Error("Image reading failed."));
    reader.readAsDataURL(blob);
  });
}

async function getPhotoData(
  observation: Observation
): Promise<{ original: string[]; closing: string[] }> {
  try {
    const response = await fetch("/api/observation-photo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: observation.id,
        siteCode: observation.site_code,
      }),
    });

    if (!response.ok) {
      console.error("Photo API error:", response.status);
      return { original: [], closing: [] };
    }

    const result = await response.json();

    const originalPhotos: Photo[] = result.originalPhotos || [];
    const closingPhotos: Photo[] = result.closingPhotos || [];

    const downloadPhotos = async (photos: Photo[]) => {
      const data: string[] = [];

      for (const photo of photos) {
        try {
          const imageResponse = await fetch(photo.url);

          if (!imageResponse.ok) continue;

          const blob = await imageResponse.blob();
          const dataUrl = await blobToDataUrl(blob);

          data.push(dataUrl);
        } catch (error) {
          console.error("Photo download error:", error);
        }
      }

      return data;
    };

    const [original, closing] = await Promise.all([
      downloadPhotos(originalPhotos),
      downloadPhotos(closingPhotos),
    ]);

    return { original, closing };
  } catch (error) {
    console.error("Unable to load observation photos:", error);
    return { original: [], closing: [] };
  }
}

async function downloadObservationPdf(
  records: Observation[],
  siteName: string,
  filename: string
) {
  if (!records.length) return;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const colors = {
    blue: [30, 64, 175] as [number, number, number],
    dark: [30, 41, 59] as [number, number, number],
    grey: [100, 116, 139] as [number, number, number],
    light: [248, 250, 252] as [number, number, number],
    border: [226, 232, 240] as [number, number, number],
    green: [22, 101, 52] as [number, number, number],
    amber: [146, 64, 14] as [number, number, number],
  };

  let logoData = "";

  try {
    const logoResponse = await fetch("/thermax-logo.png");

    if (logoResponse.ok) {
      const logoBlob = await logoResponse.blob();
      logoData = await blobToDataUrl(logoBlob);
    }
  } catch (error) {
    console.error("Unable to load Thermax logo:", error);
  }

  function getValue(item: Observation, key: string): string {
    const value = item[key];

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "";
    }

    return formatValue(value);
  }

  function getEntries(
    item: Observation,
    fields: [string, string][]
  ) {
    return fields
      .map(([key, label]) => ({
        key,
        label,
        value: getValue(item, key),
      }))
      .filter((entry) => entry.value !== "");
  }

  function drawHeader(
    item: Observation,
    recordIndex: number
  ) {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, 39, "F");

    if (logoData) {
      try {
        const format = logoData.startsWith("data:image/png")
          ? "PNG"
          : "JPEG";

        pdf.addImage(
          logoData,
          format,
          pageWidth - margin - 38,
          7,
          38,
          17,
          undefined,
          "FAST"
        );
      } catch (error) {
        console.error("Unable to add Thermax logo:", error);
      }
    }

    pdf.setTextColor(...colors.blue);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);

    pdf.text(
      `${item.category || "SAFETY OBSERVATION"}`.toUpperCase(),
      margin,
      14
    );

    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");

    const title =
      item.category === "Unsafe Act"
        ? "Unsafe Act Observation Details"
        : item.category === "Unsafe Condition"
          ? "Unsafe Condition Observation Details"
          : item.category === "Near Miss"
            ? "Near Miss Observation Details"
            : "Safety Observation Details";

    pdf.text(title, margin, 23);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.grey);

    pdf.text(
      String(siteName).substring(0, 90),
      margin,
      30
    );

    pdf.text(
      `Record ${recordIndex + 1} of ${records.length}`,
      pageWidth - margin,
      30,
      { align: "right" }
    );

    pdf.setDrawColor(...colors.border);
    pdf.line(margin, 35, pageWidth - margin, 35);
  }

  let currentY = 0;

  function addPage(item: Observation, recordIndex: number) {
    pdf.addPage("a4", "portrait");
    drawHeader(item, recordIndex);
    currentY = 43;
  }

  function ensureSpace(
    requiredHeight: number,
    item: Observation,
    recordIndex: number
  ) {
    if (currentY + requiredHeight > 275) {
      addPage(item, recordIndex);
    }
  }

  function drawSection(
    title: string,
    item: Observation,
    recordIndex: number,
    color: [number, number, number] = colors.blue
  ) {
    ensureSpace(13, item, recordIndex);

    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(
      margin,
      currentY,
      contentWidth,
      9,
      1.5,
      1.5,
      "F"
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...color);

    pdf.text(title, margin + 3, currentY + 6);

    currentY += 13;
  }

  function drawField(
    label: string,
    value: string,
    item: Observation,
    recordIndex: number
  ) {
    if (!value) return;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    const labelLines = pdf.splitTextToSize(
      label,
      contentWidth - 8
    );

    const valueLines = pdf.splitTextToSize(
      value,
      contentWidth - 8
    );

    const labelHeight = labelLines.length * 3.8;
    const valueHeight = valueLines.length * 4.2;
    const boxHeight = labelHeight + valueHeight + 7;

    ensureSpace(boxHeight + 2, item, recordIndex);

    pdf.setDrawColor(...colors.border);
    pdf.setFillColor(255, 255, 255);

    pdf.roundedRect(
      margin,
      currentY,
      contentWidth,
      boxHeight,
      2,
      2,
      "FD"
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.grey);

    pdf.text(labelLines, margin + 4, currentY + 5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...colors.dark);

    pdf.text(
      valueLines,
      margin + 4,
      currentY + 5 + labelHeight + 2
    );

    currentY += boxHeight + 3;
  }

  function drawPeopleCount(
    item: Observation,
    recordIndex: number
  ) {
    const peopleFields = [
      ["people_count", "People Working Correctly"],
      ["wrong_behaviour_count", "People Showing Wrong Behaviour"],
      ["spot_correction_count", "People Given Spot Correction"],
    ] as [string, string][];

    const entries = getEntries(item, peopleFields);

    if (!entries.length) return;

    ensureSpace(34, item, recordIndex);

    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(...colors.border);

    pdf.roundedRect(
      margin,
      currentY,
      contentWidth,
      30,
      2,
      2,
      "FD"
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...colors.blue);

    pdf.text("PEOPLE COUNT", margin + 4, currentY + 6);

    const columnWidth = contentWidth / 3;

    entries.forEach((entry, index) => {
      const x = margin + index * columnWidth + 4;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...colors.grey);

      const labelLines = pdf.splitTextToSize(
        entry.label,
        columnWidth - 8
      );

      pdf.text(labelLines, x, currentY + 13);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(...colors.dark);

      pdf.text(entry.value, x, currentY + 25);
    });

    currentY += 34;
  }

  async function drawPhotos(
    photos: string[],
    title: string,
    item: Observation,
    recordIndex: number
  ) {
    if (!photos.length) return;

    drawSection(title, item, recordIndex);

    const gap = 4;
    const columns = 3;
    const imageWidth = (contentWidth - gap * 2) / 3;
    const imageHeight = 43;
    const rowHeight = 52;

    for (let index = 0; index < photos.length; index++) {
      const column = index % columns;
      const row = Math.floor(index / columns);

      if (column === 0) {
        ensureSpace(rowHeight + 3, item, recordIndex);
      }

      const x = margin + column * (imageWidth + gap);

      const y =
        currentY + row * rowHeight;

      try {
        const format = photos[index].startsWith("data:image/png")
          ? "PNG"
          : "JPEG";

        pdf.addImage(
          photos[index],
          format,
          x,
          y,
          imageWidth,
          imageHeight,
          undefined,
          "FAST"
        );

        pdf.setDrawColor(...colors.border);

        pdf.rect(
          x,
          y,
          imageWidth,
          imageHeight
        );

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(...colors.grey);

        pdf.text(
          `${title} ${index + 1}`,
          x,
          y + imageHeight + 3
        );
      } catch (error) {
        console.error("Unable to add photo to PDF:", error);
      }

      if (column === columns - 1 || index === photos.length - 1) {
        currentY += rowHeight;
      }
    }

    currentY += 3;
  }

  function drawFooter(
    item: Observation,
    recordIndex: number
  ) {
    const pageCount = pdf.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
      pdf.setPage(page);

      pdf.setDrawColor(...colors.border);
      pdf.line(
        margin,
        285,
        pageWidth - margin,
        285
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...colors.grey);

      pdf.text(
        `Site Code: ${item.site_code || "N/A"}`,
        margin,
        291
      );

      pdf.text(
        `Observation ID: ${String(item.id)}`,
        pageWidth / 2,
        291,
        { align: "center" }
      );

      pdf.text(
        `Page ${page} of ${pageCount}`,
        pageWidth - margin,
        291,
        { align: "right" }
      );
    }
  }

  const unsafeActFields: [string, string][] = [
    ["site_code", "Site Code"],
    ["violation_company", "Violation Company"],
    ["contractor_name", "Name of Contractor"],
    ["person_type", "Person Type"],
    ["violator_name", "Violator Name"],
    ["observer_name", "Observer Name"],
    ["observation_date", "Date"],
    ["unsafe_act_location", "Location"],
    ["description", "At-Risk Behaviour Description"],
    ["behaviour_category", "Behaviour Category"],
    ["violation_type", "Types of Violation"],
    ["violation_sub_classification", "Sub-Classification of Violation"],
  ];

  const unsafeConditionFields: [string, string][] = [
    ["site_code", "Site Code"],
    ["description", "Unsafe Condition Description"],
    ["observation_date", "Unsafe Condition Occurred Date"],
    ["responsible_person", "Responsible Person to take Immediate Actions"],
    ["unsafe_condition_location", "Location of Unsafe Condition"],
    ["reporting_person", "Person Reporting Unsafe Condition"],
    ["observer_company", "Unsafe Condition Observer Company Name"],
    ["unsafe_condition_category", "Unsafe Condition Category"],
    ["unsafe_condition_sub_category", "Unsafe Condition Sub-Category"],
    ["unsafe_condition_hazard_class", "Unsafe Condition Hazard Class"],
    ["unsafe_condition_leading_activity", "Unsafe Condition Leading Activity"],
    ["closure_recommendations", "Recommendations to Close Unsafe Condition"],
    ["site_incharge", "Site In-charge"],
  ];

  const nearMissFields: [string, string][] = [
    ["site_code", "Site Code"],
    ["description", "Near Miss Description"],
    ["near_miss_location", "Exact Location of Near Miss"],
    ["observation_date", "Near Miss Occurred Date"],
    ["near_miss_responsible_person", "Responsible Person to take Immediate Actions"],
    ["near_miss_company_name", "Near Miss Happened Company Name"],
    ["near_miss_observer_name", "Near Miss Observer Name"],
    ["near_miss_unsafe_type", "Unsafe Type"],
    ["near_miss_category", "Near Miss Category"],
    ["near_miss_sub_category", "Near Miss Sub-Category"],
    ["near_miss_hazard_class", "Near Miss Hazard Class"],
    ["near_miss_leading_activity", "Near Miss Leading Activity"],
    ["near_miss_root_cause", "Near Miss Root Cause"],
    ["near_miss_root_cause_sub_category", "Near Miss Root Cause Sub-Category"],
    ["near_miss_site_incharge", "Site In-charge"],
  ];

  const closureFields: [string, string][] = [
    ["corrective_action", "Corrective Action"],
    ["root_cause", "Root Cause"],
    ["preventive_action", "Preventive Action"],
    ["closing_remarks", "Closing Remarks"],
    ["closed_by", "Closed By"],
    ["closed_at", "Closed At"],
  ];

  for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
    const item = records[recordIndex];

    if (recordIndex > 0) {
      pdf.addPage("a4", "portrait");
    }

    drawHeader(item, recordIndex);
    currentY = 43;

    // Basic Information
    drawSection("BASIC INFORMATION", item, recordIndex);

    drawField(
      "Observation ID",
      String(item.id),
      item,
      recordIndex
    );

    drawField(
      "Observation Status",
      getDisplayStatus(item.status),
      item,
      recordIndex
    );

    drawField(
      "Submitted By",
      getValue(item, "submitted_by"),
      item,
      recordIndex
    );

    // Category-specific form
    drawSection(
      "OBSERVATION ENTRY DETAILS",
      item,
      recordIndex
    );

    const selectedFields =
      item.category === "Unsafe Act"
        ? unsafeActFields
        : item.category === "Unsafe Condition"
          ? unsafeConditionFields
          : item.category === "Near Miss"
            ? nearMissFields
            : [];

    for (const entry of getEntries(item, selectedFields)) {
      drawField(
        entry.label,
        entry.value,
        item,
        recordIndex
      );
    }

    if (item.category === "Unsafe Act") {
      drawPeopleCount(item, recordIndex);
    }

    // Original Photos
    const photos = await getPhotoData(item);

    await drawPhotos(
      photos.original,
      "OBSERVATION PHOTO",
      item,
      recordIndex
    );

    // Closure Information
    if (
      item.status === "Close" ||
      item.status === "Closed"
    ) {
      drawSection(
        "CLOSURE INFORMATION",
        item,
        recordIndex,
        colors.green
      );

      for (const entry of getEntries(item, closureFields)) {
        drawField(
          entry.label,
          entry.value,
          item,
          recordIndex
        );
      }

      await drawPhotos(
        photos.closing,
        "CLOSING PHOTO / EVIDENCE",
        item,
        recordIndex
      );
    }

    drawFooter(item, recordIndex);
  }

  pdf.save(filename);
}

function ObservationListContent() {
  const searchParams = useSearchParams();

  const category = searchParams.get("category") || "Unsafe Act";
  const siteName = searchParams.get("siteName") || "Site Dashboard";
  const siteCode = searchParams.get("siteCode") || "";
  const initialStatus = searchParams.get("status") || "";

  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchName, setSearchName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadObservations = useCallback(async () => {
    if (!siteCode) {
      setObservations([]);
      setErrorMessage(
        "Site Code is missing. Please return to Site Dashboard and try again."
      );
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
        .eq("site_code", siteCode)
        .order("observation_date", { ascending: false });

      if (category !== "All") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Observation loading error:", error);
        setObservations([]);
        setErrorMessage(
          "Unable to load observations. Please check your database permissions and try again."
        );
        return;
      }

      setObservations(data ?? []);
    } catch (error) {
      console.error("Unexpected observation loading error:", error);
      setObservations([]);
      setErrorMessage("Something went wrong while loading observations.");
    } finally {
      setLoading(false);
    }
  }, [siteCode, category]);

  useEffect(() => {
    void loadObservations();
  }, [loadObservations]);

  const years = useMemo(() => {
    return Array.from(
      new Set(
        observations
          .map((item) => item.observation_date)
          .filter((date): date is string => Boolean(date))
          .map((date) => date.slice(0, 4))
      )
    ).sort((a, b) => b.localeCompare(a));
  }, [observations]);

  const filteredObservations = useMemo(() => {
    const search = searchName.trim().toLowerCase();

    return observations.filter((item) => {
      const date = item.observation_date || "";
      const observationYear = date.slice(0, 4);
      const observationMonth = date.slice(5, 7);

      const namesToSearch = [
        item.submitted_by,
        item.violator_name,
        item.responsible_person,
        item.reporting_person,
        item.near_miss_responsible_person,
        item.contractor_name,
        item.violation_company,
      ];

      const matchesName =
        !search ||
        namesToSearch.some((name) =>
          String(name || "").toLowerCase().includes(search)
        );

      return (
        (!selectedYear || observationYear === selectedYear) &&
        (!selectedMonth || observationMonth === selectedMonth) &&
        matchesName &&
        (
          !selectedStatus ||
          (selectedStatus.toLowerCase() === "open" &&
            (item.status || "").toLowerCase() === "open") ||
          (selectedStatus.toLowerCase() === "close" &&
            ["close", "closed"].includes((item.status || "").toLowerCase()))
        )
      );
    });
  }, [
    observations,
    selectedYear,
    selectedMonth,
    searchName,
    selectedStatus,
  ]);

  const categoryIcon =
    category === "Unsafe Condition"
      ? "🚧"
      : category === "Near Miss"
        ? "🦺"
        : category === "All"
          ? "📋"
          : "⚠️";

  function openObservationDetails(observation: Observation) {
    const params = new URLSearchParams({
      id: String(observation.id),
      siteCode,
      siteName,
      category,
    });

    window.location.href = `/observation-details?${params.toString()}`;
  }

  function clearFilters() {
    setSelectedYear("");
    setSelectedMonth("");
    setSearchName("");
    setSelectedStatus("");
  }

  async function handleDownloadAll() {
    if (!filteredObservations.length || pdfLoading) return;

    try {
      setPdfLoading(true);

      const safeSiteCode = siteCode.replace(/[^a-zA-Z0-9_-]/g, "");

      await downloadObservationPdf(
        filteredObservations,
        siteName,
        `Observations-${safeSiteCode}-${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Unable to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDownloadSingle(item: Observation) {
    const id = String(item.id);

    if (downloadingId) return;

    try {
      setDownloadingId(id);

      await downloadObservationPdf(
        [item],
        siteName,
        `Observation-${id}.pdf`
      );
    } catch (error) {
      console.error("Single PDF generation error:", error);
      alert("Unable to generate PDF. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-2xl bg-blue-800 p-6 text-white shadow-lg">
          <p className="text-sm font-medium text-blue-200">
            SAFETY OBSERVATION
          </p>

          <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">
            {siteName}
          </h1>

          {siteCode && (
            <p className="mt-2 text-sm text-blue-100">
              Site Code: {siteCode}
            </p>
          )}
        </header>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-3xl">
              {categoryIcon}
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Observation Category
              </p>

              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {category}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Total Observations: {filteredObservations.length}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            Search &amp; Filter
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="year"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search Year
              </label>

              <select
                id="year"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800 outline-none focus:border-blue-600"
              >
                <option value="">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="month"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search Month
              </label>

              <select
                id="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800 outline-none focus:border-blue-600"
              >
                <option value="">All Months</option>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search by Name
              </label>

              <input
                id="name"
                type="text"
                value={searchName}
                onChange={(event) => setSearchName(event.target.value)}
                placeholder="Enter person's name"
                className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-600"
              />

              <p className="mt-1 text-xs text-slate-500">
                Searches submitter and related person names.
              </p>
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Observation Status
              </label>

              <select
                id="status"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800 outline-none focus:border-blue-600"
              >
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Close">Close</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear Filters
            </button>

            <button
              type="button"
              onClick={() => void loadObservations()}
              disabled={loading}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh Observations"}
            </button>

            <button
              type="button"
              onClick={() => void handleDownloadAll()}
              disabled={loading || pdfLoading || filteredObservations.length === 0}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfLoading
                ? "Generating PDF..."
                : `⬇ Download Filtered PDF (${filteredObservations.length})`}
            </button>
          </div>
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-slate-600">Loading observations...</p>
            </div>
          ) : errorMessage ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm"
            >
              <h3 className="font-bold text-red-800">
                Unable to Load Observations
              </h3>

              <p className="mt-2 text-sm text-red-700">{errorMessage}</p>

              <button
                type="button"
                onClick={() => void loadObservations()}
                className="mt-4 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
              >
                Try Again
              </button>
            </div>
          ) : filteredObservations.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                📋
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No Observations Found
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                No records match the selected Site, Category and filters.
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Showing 0 records
              </p>
            </div>
          ) : (
            filteredObservations.map((item) => (
              <article
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => openObservationDetails(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openObservationDetails(item);
                  }
                }}
                className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.category || "Observation"}
                    </p>

                    <h3 className="mt-1 break-words text-lg font-bold text-slate-900">
                      {item.submitted_by || "Name not provided"}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Date: {item.observation_date || "Not available"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                      item.status === "Open"
                        ? "bg-amber-100 text-amber-800"
                        : item.status === "Close" || item.status === "Closed"
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {getDisplayStatus(item.status)}
                  </span>
                </div>

                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {item.description || "No description provided."}
                </p>

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-blue-700">
                    View Observation Details →
                  </span>

                  <button
                    type="button"
                    disabled={Boolean(downloadingId)}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDownloadSingle(item);
                    }}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingId === String(item.id)
                      ? "Generating PDF..."
                      : "⬇ Download PDF"}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams();

            if (siteCode) params.set("siteCode", siteCode);
            if (siteName) params.set("siteName", siteName);

            window.location.href = `/site-dashboard?${params.toString()}`;
          }}
          className="mt-6 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to Dashboard
        </button>
      </div>
    </main>
  );
}

export default function ObservationListPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 text-center shadow-sm">
            Loading observations...
          </div>
        </main>
      }
    >
      <ObservationListContent />
    </Suspense>
  );
}