"use client";

import { Suspense, useEffect, useState, type FormEvent, type DragEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import imageCompression from "browser-image-compression";

type ObservationCategory = "Unsafe Act" | "Unsafe Condition" | "Near Miss";
type ViolationCompany = "Thermax" | "Contractor";
type PersonType = "Employee" | "Worker";

const behaviourCategoryOptions = [
  "The Reaction of People",
  "The Position of People",
  "Clothing and PPE",
  "Tools and Equipment",
  "Rules and Procedure",
  "Material Handling",
  "Communication, Orderliness (Housekeeping)",
  "Housekeeping",
  "Using Mobile While Working",
  "Road Safety Behaviour",
];

const violationSubClassificationOptions: Record<string, string[]> = {
  Routine: [
    "Cutting corners to save time and/or energy.",
    "Perception that rules are too restrictive, impractical or unnecessary.",
    "Believe that the rules no longer apply.",
    "Lack of enforcement of the rules.",
  ],
  Situational: [
    "Time pressure.",
    "Insufficient staff for the workload.",
    "The right equipment not being available.",
    "Extreme weather conditions.",
  ],
  Exceptional: [
    "Rarely happen.",
    "To solve a problem, employees believe that a rule has to be broken.",
    "Occur when something has gone wrong.",
    "It is falsely believed that the benefits exceed the risk.",
  ],
};

const unsafeConditionCategories = [
  "Environment",
  "Mechanical",
  "Electrical",
  "Fire Hazard",
  "Physical",
  "Ergonomical",
  "Chemical/Process",
  "Biological",
];

const unsafeConditionSubCategories: Record<string, string[]> = {
  Environment: [
    "Work Environment", "Air Contamination", "Dust (Nuisance)",
    "Excessive Resource Use", "Land Contamination", "Noise",
    "Waste Segregation/Control", "Water Contamination/Storm Drain Contamination",
  ],
  Mechanical: ["Machinery"],
  Electrical: [
    "Connection Without Plug", "Damaged Switch", "Earthing", "ELCB/RCCB",
    "Module Busbar Disconnect", "Uninsulated Electrical Wire",
    "Non-Standard Electrical Wire", "No Electrical Rubber Mat", "Wet Area",
    "Overheating",
  ],
  "Fire Hazard": [
    "Backfire", "Flammable/Combustible Material", "Gas Leakage", "Hot Ash",
    "Hot Oil", "Hot Steam/Water", "Hot Surface",
  ],
  Physical: [
    "Entanglement", "Fall From Height", "Housekeeping", "Leakage/Spillage",
    "Sharp Edges", "Slip/Trip", "Uneven Surface",
  ],
  Ergonomical: [
    "Vibration", "Material Handling", "Awkward Postures", "Congested Space",
    "Forceful Motion", "Repetitive Tasks",
  ],
  "Chemical/Process": [
    "Access Needs to Be Utilized", "Operating Procedure", "Loss of Containment",
    "Conduct of Operation", "Overpressurization", "Asset/Control Failure",
    "Process Upset", "Sources of Ignition", "Oxidized", "Flammable/Explosive",
    "Corrosive", "Environmental Release", "Health Hazard", "Reactivity",
    "Chemical Burn",
  ],
  Biological: ["Bacteria and Viruses", "Insect Bites"],
};

// Near Miss options are intentionally kept separate from Unsafe Condition.
const nearMissCategories = [
  "Environment", "Mechanical", "Electrical", "Fire Hazard",
  "Physical", "Ergonomical", "Chemical/Process", "Biological",
];

const nearMissSubCategories: Record<string, string[]> = {
  Environment: [
    "Work Environment", "Air Contamination", "Dust (Nuisance)",
    "Excessive Resource Use", "Land Contamination", "Noise",
    "Waste Segregation/Control", "Water Contamination/Storm Drain Contamination",
  ],
  Mechanical: ["Machinery"],
  Electrical: [
    "Connection Without Plug", "Damaged Switch", "Earthing", "ELCB/RCCB",
    "Module Busbar Disconnect", "Uninsulated Electrical Wire",
    "Non-Standard Electrical Wire", "No Electrical Rubber Mat", "Wet Workplace",
    "Overheating",
  ],
  "Fire Hazard": [
    "Backfire", "Flammable/Combustible Material", "Gas Leakage", "Hot Ash",
    "Hot Oil", "Hot Steam/Water", "Hot Surface",
  ],
  Physical: [
    "Entanglement", "Fall From Height", "Housekeeping", "Leakage/Spillage",
    "Sharp Edges", "Slip/Trip", "Uneven Surface",
  ],
  Ergonomical: [
    "Vibration", "Material Handling", "Awkward Postures", "Congested Space",
    "Forceful Motion", "Repetitive Tasks",
  ],
  "Chemical/Process": [
    "Access Needs to Be Utilized", "Operating Procedure", "Loss of Containment",
    "Conduct of Operation", "Overpressurization", "Asset/Control Failure",
    "Process Upset", "Sources of Ignition", "Oxidized", "Flammable/Explosive",
    "Corrosive", "Environmental Release", "Health Hazard", "Reactivity",
    "Chemical Burn",
  ],
  Biological: ["Bacteria and Viruses", "Insect Bites"],
};

const nearMissRootCauses = [
  "Physical Capability",
  "Physical Condition",
  "Mental State",
  "Mental Stress",
  "Behavior",
  "Skill Level",
  "Training/Knowledge Transfer",
  "Management/Supervision/Employee Leadership",
  "Contractor Selection & Oversight",
  "Engineering/Design",
  "Work Planning",
  "Purchasing, Material Handling & Material Control",
  "Tools & Equipment",
  "Work Rules/Policies/Standards/Procedure (PSP)",
  "Communication",
];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function isObservationDateAllowed(
  selectedDate: string,
  today: string,
  minAllowed: string
) {
  return (
    selectedDate !== "" &&
    selectedDate >= minAllowed &&
    selectedDate <= today
  );
}
function PhotoPicker({
  id,
  photos,
  setPhotos,
  isDragging,
  setIsDragging,
  setFormMessage,
  setMessageType,
}: {
  id: string;
  photos: File[];
  setPhotos: (files: File[]) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  setFormMessage: (message: string) => void;
  setMessageType: (type: "success" | "error") => void;
}) {
  const [photoPreviews, setPhotoPreviews] = useState<
    { file: File; url: string }[]
  >([]);

  useEffect(() => {
    const previews = photos.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPhotoPreviews(previews);

    return () => {
      previews.forEach((preview) => {
        URL.revokeObjectURL(preview.url);
      });
    };
  }, [photos]);

  function addPhotos(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const images = incoming.filter((file) =>
      file.type.startsWith("image/")
    );

    if (images.length !== incoming.length) {
      setMessageType("error");
      setFormMessage("Only image files can be attached.");
    } else {
      setFormMessage("");
    }

    const combined = [...photos, ...images];

    const unique = combined.filter(
      (file, index) =>
        combined.findIndex(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        ) === index
    );

    if (unique.length > 10) {
      setMessageType("error");
      setFormMessage("You can attach a maximum of 10 photos.");
    }

    setPhotos(unique.slice(0, 10));
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addPhotos(event.dataTransfer.files);
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        Attach Photos <span className="text-red-600">*</span>
      </label>

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? "border-blue-600 bg-blue-50"
            : "border-slate-300 bg-slate-50"
        }`}
      >
        <p className="mb-3 text-sm text-slate-600">
          Select/Drag and Drop Attachment. At least one photo is required;
          maximum 10 images.
        </p>

        <input
          id={id}
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            if (event.target.files) {
              addPhotos(event.target.files);
            }
            event.target.value = "";
          }}
          className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-800"
        />
      </div>

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {photos.map((file, index) => {
            const preview = photoPreviews.find(
              (item) => item.file === file
            );

            return (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                {preview && (
                  <div className="flex h-52 items-center justify-center bg-slate-100 p-2">
                    <img
                      src={preview.url}
                      alt={`Observation photo ${index + 1}`}
                      className="h-full w-full rounded-lg object-contain"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-medium text-slate-800">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPhotos(
                        photos.filter((_, i) => i !== index)
                      )
                    }
                    className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
const MAX_PHOTO_SIZE = 60 * 1024; // 60 KB

async function compressObservationPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file.");
  }

  const attempts = [
  { width: 1200, quality: 0.6 },
  { width: 900, quality: 0.4 },
  { width: 700, quality: 0.3 },
  { width: 500, quality: 0.2 },
  { width: 350, quality: 0.15 },
  { width: 250, quality: 0.1 },
  { width: 180, quality: 0.08 },
  { width: 120, quality: 0.05 },
  ];

  for (const attempt of attempts) {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 60 / 1024,
      maxWidthOrHeight: attempt.width,
      initialQuality: attempt.quality,
      fileType: "image/jpeg",
      useWebWorker: true,
    });

    if (compressedFile.size <= MAX_PHOTO_SIZE) {
      return new File(
        [compressedFile],
        `observation-${Date.now()}.jpg`,
        {
          type: "image/jpeg",
          lastModified: Date.now(),
        }
      );
    }
  }

  throw new Error(
    "Photo could not be compressed below 60 KB. Please select another photo."
  );
}
function ObservationPortalContent() {
const router = useRouter();
const [selectedCategory, setSelectedCategory] = useState<ObservationCategory | "">("");
const [siteCode, setSiteCode] = useState("");
const searchParams = useSearchParams();
const isWorkerMode = searchParams.get("mode") === "worker";
  // Unsafe Act state
  const [violationCompany, setViolationCompany] = useState<ViolationCompany | "">("");
  const [contractorName, setContractorName] = useState("");
  const [siteCompanies, setSiteCompanies] = useState<
  { id: string; company_name: string; company_code: string }[]
>([]);
const [companiesLoading, setCompaniesLoading] = useState(false);
  const [personType, setPersonType] = useState<PersonType | "">("");
  const [violatorName, setViolatorName] = useState("");
  const [observerName, setObserverName] = useState("");
  const [observationDate, setObservationDate] = useState("");
  const [location, setLocation] = useState("");
  const [atRiskBehaviourDescription, setAtRiskBehaviourDescription] = useState("");
  const [behaviourCategory, setBehaviourCategory] = useState("");
  const [violationType, setViolationType] = useState("");
  const [subClassification, setSubClassification] = useState("");
  const [peopleWorkingCorrectly, setPeopleWorkingCorrectly] = useState("");
  const [peopleShowingWrongBehaviour, setPeopleShowingWrongBehaviour] = useState("");
  const [peopleGivenSpotCorrection, setPeopleGivenSpotCorrection] = useState("");

  // Unsafe Condition state
  const [conditionDescription, setConditionDescription] = useState("");
  const [conditionDate, setConditionDate] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [conditionLocation, setConditionLocation] = useState("");
  const [reportingPerson, setReportingPerson] = useState("");
  const [observerCompanyName, setObserverCompanyName] = useState("");
  const [conditionCategory, setConditionCategory] = useState("");
  const [conditionSubCategory, setConditionSubCategory] = useState("");
  const [hazardClass, setHazardClass] = useState("");
  const [leadingActivity, setLeadingActivity] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [siteIncharge, setSiteIncharge] = useState("");
  const [conditionPhotos, setConditionPhotos] = useState<File[]>([]);
  const [conditionDragging, setConditionDragging] = useState(false);

  // Near Miss state
  const [nearMissDescription, setNearMissDescription] = useState("");
  const [nearMissLocation, setNearMissLocation] = useState("");
  const [nearMissDate, setNearMissDate] = useState("");
  const [nearMissResponsiblePerson, setNearMissResponsiblePerson] = useState("");
  const [nearMissCompanyName, setNearMissCompanyName] = useState("");
  const [nearMissObserverName, setNearMissObserverName] = useState("");
  const [nearMissUnsafeType, setNearMissUnsafeType] = useState("");
  const [nearMissCategory, setNearMissCategory] = useState("");
  const [nearMissSubCategory, setNearMissSubCategory] = useState("");
  const [nearMissHazardClass, setNearMissHazardClass] = useState("");
  const [nearMissLeadingActivity, setNearMissLeadingActivity] = useState("");
  const [nearMissRootCause, setNearMissRootCause] = useState("");
  const [nearMissRootCauseSubCategory, setNearMissRootCauseSubCategory] = useState("");
  const [nearMissPhotos, setNearMissPhotos] = useState<File[]>([]);
  const [nearMissSiteIncharge, setNearMissSiteIncharge] = useState("");
  const [nearMissDragging, setNearMissDragging] = useState(false);
const [today, setToday] = useState("");
const [minAllowed, setMinAllowed] = useState("");

useEffect(() => {
  const now = new Date();
  const todayValue = formatLocalDate(now);

  const minDate = new Date(now);
minDate.setDate(minDate.getDate() - 3);
const minValue = formatLocalDate(minDate);

  setToday(todayValue);
  setMinAllowed(minValue);
  setObservationDate(todayValue);
  setConditionDate(todayValue);
  setNearMissDate(todayValue);
}, []);
  const [formMessage, setFormMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
// Verify selected Site Code
useEffect(() => {
  const selectedSiteCode = searchParams.get("siteCode")?.trim().toUpperCase();

  if (!selectedSiteCode) {
    setSiteCode("");
    return;
  }

  let cancelled = false;

  async function loadSiteCode() {
  try {
    const response = await fetch(
      `/api/worker/site?siteCode=${encodeURIComponent(selectedSiteCode??"")}`
    );

    const result = await response.json();

    if (cancelled) return;

    if (!response.ok || !result.success || !result.site?.siteCode) {
      setSiteCode("");
      setMessageType("error");
      setFormMessage(
        "Selected site code could not be verified. Please go back and select the site again."
      );
      return;
    }

    setSiteCode(result.site.siteCode);
  } catch (error) {
    if (cancelled) return;

    setSiteCode("");
    setMessageType("error");
    setFormMessage("Unable to verify the selected site. Please try again.");
  }
}

  loadSiteCode();

  return () => {
    cancelled = true;
  };
}, [searchParams]);


// Load Registered Companies for selected Site
useEffect(() => {
  if (!siteCode) {
    setSiteCompanies([]);
    setCompaniesLoading(false);
    return;
  }

  let cancelled = false;

  async function loadSiteCompanies() {
    setCompaniesLoading(true);

    try {
      const response = await fetch(
        `/api/worker/site?siteCode=${encodeURIComponent(siteCode)}`
      );

      const result = await response.json();

      if (cancelled) return;

      if (!response.ok || !result.success) {
        console.error("Company loading error:", result.error);
        setSiteCompanies([]);
      } else {
        setSiteCompanies(result.companies ?? []);
      }
    } catch (error) {
      if (cancelled) return;

      console.error("Company loading error:", error);
      setSiteCompanies([]);
    } finally {
      if (!cancelled) {
        setCompaniesLoading(false);
      }
    }
  }

  loadSiteCompanies();

  return () => {
    cancelled = true;
  };
}, [siteCode]);

  function resetUnsafeActForm() {
    setViolationCompany(""); setContractorName(""); setPersonType("");
    setViolatorName(""); setObserverName(""); setObservationDate(today);
    setLocation(""); setAtRiskBehaviourDescription(""); setBehaviourCategory("");
    setViolationType(""); setSubClassification(""); setPeopleWorkingCorrectly("");
    setPeopleShowingWrongBehaviour(""); setPeopleGivenSpotCorrection("");
  }

  function resetUnsafeConditionForm() {
    setConditionDescription(""); setConditionDate(today); setResponsiblePerson("");
    setConditionLocation(""); setReportingPerson(""); setObserverCompanyName("");
    setConditionCategory(""); setConditionSubCategory(""); setHazardClass("");
    setLeadingActivity(""); setRecommendations(""); setSiteIncharge("");
    setConditionPhotos([]); setConditionDragging(false);
  }

  function resetNearMissForm() {
    setNearMissDescription(""); setNearMissLocation(""); setNearMissDate(today);
    setNearMissResponsiblePerson(""); setNearMissCompanyName(""); setNearMissObserverName("");
    setNearMissUnsafeType(""); setNearMissCategory(""); setNearMissSubCategory("");
    setNearMissHazardClass(""); setNearMissLeadingActivity(""); setNearMissRootCause("");
    setNearMissPhotos([]); setNearMissSiteIncharge(""); setNearMissDragging(false);
  }

  function resetForm() {
    resetUnsafeActForm(); resetUnsafeConditionForm(); resetNearMissForm();
    setFormMessage(""); setMessageType("error");
  }

  function handleCategorySelect(category: ObservationCategory) {
    resetForm();
    setSelectedCategory(category);
  }

  function handleCompanySelect(value: ViolationCompany | "") {
    setViolationCompany(value); setContractorName(""); setPersonType(""); setViolatorName("");
    setFormMessage("");
  }

  function handleBack() {
  if (selectedCategory) {
    setSelectedCategory("");
    resetForm();
    return;
  }

  if (siteCode) {
    router.push(`/site-portal?siteCode=${encodeURIComponent(siteCode)}`);
  } else {
    router.push("/site-portal");
  }
}

  function handleNumberChange(value: string, setter: (value: string) => void) {
    if (value === "" || /^\d+$/.test(value)) {
      setter(value); setFormMessage(""); setMessageType("error");
    }
  }

async function handleSaveUnsafeAct(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setFormMessage("");

  // Required-field validation
  if (
    !violationCompany ||
    !siteCode.trim() ||
    (violationCompany === "Contractor" && !contractorName.trim()) ||
    !personType ||
    !violatorName.trim() ||
    !observerName.trim() ||
    !observationDate ||
    !location.trim() ||
    !atRiskBehaviourDescription.trim() ||
    !behaviourCategory
  ) {if (!isObservationDateAllowed(observationDate, today, minAllowed)) {
  setMessageType("error");
  setFormMessage(
    "Observation date must be between today and the previous 3 days."
  );
  return;
}
    setMessageType("error");
    setFormMessage("Please complete all required fields.");
    return;
  }

  // Count validation
  if (
    peopleWorkingCorrectly === "" ||
    peopleShowingWrongBehaviour === "" ||
    peopleGivenSpotCorrection === ""
  ) {
    setMessageType("error");
    setFormMessage("Please enter all three people counts.");
    return;
  }

  const correctCount = Number(peopleWorkingCorrectly);
  const wrongCount = Number(peopleShowingWrongBehaviour);
  const spotCount = Number(peopleGivenSpotCorrection);

  if (
    !Number.isSafeInteger(correctCount) ||
    !Number.isSafeInteger(wrongCount) ||
    !Number.isSafeInteger(spotCount) ||
    correctCount < 0 ||
    wrongCount < 0 ||
    spotCount < 0
  ) {
    setMessageType("error");
    setFormMessage("Please enter valid non-negative whole numbers.");
    return;
  }

  if (spotCount > wrongCount) {
    setMessageType("error");
    setFormMessage(
      "People Given Spot Correction cannot be greater than People Showing Wrong Behaviour."
    );
    return;
  }

  if (spotCount !== wrongCount) {
    setMessageType("error");
    setFormMessage(
      "All people showing wrong behaviour must receive spot correction before the observation can be saved."
    );
    return;
  }

  // Save to Supabase
  setMessageType("error");
  setFormMessage("Saving observation...");

  try {
    const supabase = createClient();

const companyName =
  violationCompany === "Contractor"
    ? contractorName.trim()
    : violationCompany;

const selectedContractor = siteCompanies.find(
  (company) => company.company_name === contractorName
);

    const { error } = await supabase
      .from("observations")
      .insert({
        category: "Unsafe Act",
        company_id:
  violationCompany === "Contractor"
    ? selectedContractor?.id ?? null
    : null,
        site_code: siteCode,
        observation_date: observationDate,
        submitted_by: observerName.trim(),
        description: atRiskBehaviourDescription.trim(),
        status: "Close",

        violation_company: violationCompany,
        contractor_name:
          violationCompany === "Contractor"
            ? contractorName.trim()
            : null,
        person_type: personType,
        violator_name: violatorName.trim(),
        observer_name: observerName.trim(),
        unsafe_act_location: location.trim(),

        people_count: correctCount,
        wrong_behaviour_count: wrongCount,
        spot_correction_count: spotCount,

        behaviour_category: behaviourCategory,
        violation_type: violationType || null,
        violation_sub_classification: subClassification || null,
      });

    if (error) {
      console.error("Unsafe Act save error:", error);
      setMessageType("error");
      setFormMessage(
        `Could not save observation: ${error.message}`
      );
      return;
    }

    setMessageType("success");
    resetUnsafeActForm();

    setFormMessage(
      "Unsafe Act observation saved successfully. Status: Close."
    );
  } catch (error) {
    console.error("Unexpected save error:", error);
    setMessageType("error");
    setFormMessage(
      "An unexpected error occurred while saving. Please try again."
    );
  }
}

  async function handleSaveUnsafeCondition(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();
  setFormMessage("");

  // Validate required fields
  if (
    !siteCode.trim() ||
    !conditionDescription.trim() ||
    !conditionDate ||
    !responsiblePerson.trim() ||
    !conditionLocation.trim() ||
    !reportingPerson.trim() ||
    !observerCompanyName.trim() ||
    !conditionCategory ||
    !conditionSubCategory ||
    !hazardClass ||
    !leadingActivity.trim() ||
    !recommendations.trim() ||
    !siteIncharge.trim()
  ) {if (!isObservationDateAllowed(conditionDate, today, minAllowed)) {
  setMessageType("error");
  setFormMessage(
    "Observation date must be between today and the previous 3 days."
  );
  return;
}
    setMessageType("error");
    setFormMessage("Please complete all required fields.");
    return;
  }

  // Photo is mandatory
  if (conditionPhotos.length === 0) {
    setMessageType("error");
    setFormMessage(
      "Please attach at least one Unsafe Condition photo. Photo is mandatory."
    );
    return;
  }

  try {
    setMessageType("error");
    setFormMessage("Saving Unsafe Condition observation...");

    const supabase = createClient();

const selectedObserverCompany = siteCompanies.find(
  (company) => company.company_name === observerCompanyName
);

const companyCode = selectedObserverCompany?.company_code ?? null;

    const uploadedPhotoPaths: string[] = [];

    // Upload photos to the private Supabase Storage bucket
    for (const photo of conditionPhotos) {
      const safeFileName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath =
        `${siteCode.trim().toUpperCase()}/unsafe-condition/` +
        `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName}`;
const compressedFile = await compressObservationPhoto(photo);

      const { data, error: uploadError } = await supabase.storage
        .from("observation-photos")
        .upload(filePath, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Photo upload failed: ${uploadError.message}`
        );
      }

      uploadedPhotoPaths.push(data.path);
    }

    // Save observation details in Supabase
    const { error: saveError } = await supabase
  .from("observations")
  .insert({
    category: "Unsafe Condition",
    site_code: siteCode.trim().toUpperCase(),
    observation_date: conditionDate,
    submitted_by: reportingPerson.trim(),
    description: conditionDescription.trim(),
    status: "Open",

    reporting_person: reportingPerson.trim(),
    responsible_person: responsiblePerson.trim(),
    unsafe_condition_location: conditionLocation.trim(),
    observer_company: observerCompanyName.trim(),
    company_id: selectedObserverCompany?.id ?? null,
    unsafe_condition_category: conditionCategory,
    unsafe_condition_sub_category: conditionSubCategory,
    unsafe_condition_hazard_class: hazardClass,
    unsafe_condition_leading_activity: leadingActivity.trim(),
    closure_recommendations: recommendations.trim(),
    site_incharge: siteIncharge.trim(),

    photo_urls: uploadedPhotoPaths,
  });

    if (saveError) {
      throw new Error(`Database save failed: ${saveError.message}`);
    }

    // Reset form only after a successful database save
    resetUnsafeConditionForm();
    

    setMessageType("success");
    setFormMessage(
      "Unsafe Condition observation saved successfully."
    );
  } catch (error) {
    console.error("Unsafe Condition save error:", error);

    setMessageType("error");
    setFormMessage(
      error instanceof Error
        ? error.message
        : "Unable to save the observation. Your form data has been retained."
    );
  }
}

  async function handleSaveNearMiss(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();
  setFormMessage("");

  if (
    !siteCode.trim() ||
    !nearMissDescription.trim() ||
    !nearMissLocation.trim() ||
    !nearMissDate ||
    !nearMissResponsiblePerson.trim() ||
    !nearMissCompanyName.trim() ||
    !nearMissObserverName.trim() ||
    !nearMissUnsafeType ||
    !nearMissCategory ||
    !nearMissSubCategory ||
    !nearMissHazardClass ||
    !nearMissLeadingActivity.trim() ||
    !nearMissRootCause ||
    !nearMissSiteIncharge.trim()
  ) {if (!isObservationDateAllowed(nearMissDate, today, minAllowed)) {
  setMessageType("error");
  setFormMessage(
    "Observation date must be between today and the previous 3 days."
  );
  return;
}
    setMessageType("error");
    setFormMessage("Please complete all required fields.");
    return;
  }

  if (nearMissPhotos.length === 0) {
    setMessageType("error");
    setFormMessage(
      "Please attach at least one Near Miss photo. Photo is mandatory."
    );
    return;
  }

  try {
    setMessageType("error");
    setFormMessage("Saving Near Miss observation...");

    const supabase = createClient();

const selectedNearMissCompany = siteCompanies.find(
  (company) => company.company_name === nearMissCompanyName
);

const companyCode = selectedNearMissCompany?.company_code ?? null;

const uploadedPhotoPaths: string[] = [];

    // Upload selected photos to private Supabase Storage
    for (const photo of nearMissPhotos) {
      const safeFileName = photo.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const filePath =
        `${siteCode.trim().toUpperCase()}/near-miss/` +
        `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName}`;
const compressedFile = await compressObservationPhoto(photo);
      const { data, error: uploadError } = await supabase.storage
        .from("observation-photos")
        .upload(filePath, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Photo upload failed: ${uploadError.message}`
        );
      }

      uploadedPhotoPaths.push(data.path);
    }

    const { error: saveError } = await supabase
  .from("observations")
  .insert({
    category: "Near Miss",
    site_code: siteCode.trim().toUpperCase(),
    observation_date: nearMissDate,
    submitted_by: nearMissObserverName.trim(),
    description: nearMissDescription.trim(),
    status: "Open",

    near_miss_location: nearMissLocation.trim(),
    near_miss_responsible_person: nearMissResponsiblePerson.trim(),
    near_miss_company_name: nearMissCompanyName.trim(),
    company_id: selectedNearMissCompany?.id ?? null,
    near_miss_observer_name: nearMissObserverName.trim(),
    near_miss_unsafe_type: nearMissUnsafeType,
    near_miss_category: nearMissCategory,
    near_miss_sub_category: nearMissSubCategory,
    near_miss_hazard_class: nearMissHazardClass,
    near_miss_leading_activity: nearMissLeadingActivity.trim(),
    near_miss_root_cause: nearMissRootCause,
    near_miss_root_cause_sub_category:
      nearMissRootCauseSubCategory || null,
    near_miss_site_incharge: nearMissSiteIncharge.trim(),

    photo_urls: uploadedPhotoPaths,
  });

    if (saveError) {
      throw new Error(
        `Database save failed: ${saveError.message}`
      );
    }

    resetNearMissForm();
    

    setMessageType("success");
    setFormMessage(
      "Near Miss observation saved successfully."
    );
  } catch (error) {
    console.error("Near Miss save error:", error);

    setMessageType("error");
    setFormMessage(
      error instanceof Error
        ? error.message
        : "Unable to save Near Miss. Your form data has been retained."
    );
  }
}

  const wrongCount = peopleShowingWrongBehaviour === "" ? null : Number(peopleShowingWrongBehaviour);
  const spotCount = peopleGivenSpotCorrection === "" ? null : Number(peopleGivenSpotCorrection);
  const countsAreValid = wrongCount !== null && spotCount !== null &&
    Number.isSafeInteger(wrongCount) && Number.isSafeInteger(spotCount) &&
    wrongCount >= 0 && spotCount >= 0 && spotCount <= wrongCount;
  const currentStatus = countsAreValid ? (spotCount === wrongCount ? "Closed" : "Open") : "";
  const availableSubClassifications = violationSubClassificationOptions[violationType] || [];
  const availableConditionSubCategories = unsafeConditionSubCategories[conditionCategory] || [];
  const availableNearMissSubCategories = nearMissSubCategories[nearMissCategory] || [];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
  <div className="relative mx-auto max-w-3xl">
    <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-3xl text-white shadow-lg">🦺</div>
          <h1 className="text-3xl font-bold text-slate-900">Observation</h1>
          <p className="mt-2 text-sm text-slate-600">Identify hazards. Report unsafe behaviour. Prevent incidents.</p>
        </header>

        {!selectedCategory && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">Select Category</h2>
            <p className="mb-6 text-center text-sm text-slate-600">Select the type of safety observation you want to report.</p>
            <div className="space-y-4">
              <button type="button" onClick={() => handleCategorySelect("Unsafe Act")} className="flex w-full items-center gap-4 rounded-xl border-2 border-red-200 bg-red-50 p-5 text-left transition hover:border-red-500 hover:bg-red-100">
                <span className="text-3xl">⚠️</span><span><span className="block text-lg font-bold text-red-800">Unsafe Act</span><span className="mt-1 block text-sm text-red-700">Unsafe action or behaviour</span></span><span className="ml-auto text-xl text-red-700">→</span>
              </button>
              <button type="button" onClick={() => handleCategorySelect("Unsafe Condition")} className="flex w-full items-center gap-4 rounded-xl border-2 border-amber-200 bg-amber-50 p-5 text-left transition hover:border-amber-500 hover:bg-amber-100">
                <span className="text-3xl">🚧</span><span><span className="block text-lg font-bold text-amber-800">Unsafe Condition</span><span className="mt-1 block text-sm text-amber-700">Unsafe workplace condition</span></span><span className="ml-auto text-xl text-amber-700">→</span>
              </button>
              <button type="button" onClick={() => handleCategorySelect("Near Miss")} className="flex w-full items-center gap-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-5 text-left transition hover:border-blue-500 hover:bg-blue-100">
                <span className="text-3xl">🔎</span><span><span className="block text-lg font-bold text-blue-800">Near Miss</span><span className="mt-1 block text-sm text-blue-700">An incident that almost happened</span></span><span className="ml-auto text-xl text-blue-700">→</span>
              </button>
            </div>
          </section>
        )}

        {selectedCategory === "Unsafe Act" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
  <div className="min-w-0">
    <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
      Selected Category: Unsafe Act
    </p>
    <h2 className="mt-1 text-2xl font-bold text-slate-900">
      Unsafe Act Observation Details
    </h2>
    <p className="mt-2 text-sm text-slate-600">
      Enter the details of the unsafe act observed.
    </p>
  </div>

  <div className="flex h-20 w-20 shrink-0 items-center justify-center">
    <img
      src="/thermax-logo.png"
      alt="Thermax Logo"
      className="h-full w-full object-contain"
    />
  </div>
</div>
            <form onSubmit={handleSaveUnsafeAct} className="space-y-5">
              <div>
  <label htmlFor="siteCode" className={labelClass}>
    Site Code <span className="text-red-600">*</span>
  </label>
  <input
  id="siteCode"
  type="text"
  value={siteCode}
  readOnly
  placeholder="Loading Site Code..."
  required
  className={`${inputClass} cursor-not-allowed bg-slate-100 font-semibold text-slate-700`}
/>
</div>
              <div><label htmlFor="violationCompany" className={labelClass}>Violation Company <span className="text-red-600">*</span></label>
                <select id="violationCompany" value={violationCompany} onChange={(event) => handleCompanySelect(event.target.value as ViolationCompany | "")} required className={inputClass}>
                  <option value="">Select Company</option><option value="Thermax">Thermax</option><option value="Contractor">Contractor</option>
                </select>
              </div>
              {violationCompany === "Contractor" && <div><label htmlFor="contractorName" className={labelClass}>Name of Contractor <span className="text-red-600">*</span></label><select
  id="contractorName"
  value={contractorName}
  onChange={(event) => setContractorName(event.target.value)}
  required
  className={inputClass}
  disabled={companiesLoading}
>
  <option value="">
    {companiesLoading ? "Loading companies..." : "Select Contractor Company"}
  </option>

  {siteCompanies.map((company) => (
    <option key={company.id} value={company.company_name}>
      {company.company_name}
    </option>
  ))}
</select></div>}
              {violationCompany && <div><label htmlFor="personType" className={labelClass}>Person Type <span className="text-red-600">*</span></label><select id="personType" value={personType} onChange={(event) => { setPersonType(event.target.value as PersonType | ""); setViolatorName(""); }} required className={inputClass}><option value="">Select Person Type</option><option value="Employee">Employee</option><option value="Worker">Worker</option></select></div>}
              <div><label htmlFor="violatorName" className={labelClass}>Violator Name <span className="text-red-600">*</span></label><input id="violatorName" value={violatorName} onChange={(event) => setViolatorName(event.target.value)} placeholder="Enter the name of the person who committed the violation" maxLength={150} required className={inputClass} /></div>
              <div><label htmlFor="observerName" className={labelClass}>Observer Name <span className="text-red-600">*</span></label><input id="observerName" value={observerName} onChange={(event) => setObserverName(event.target.value)} placeholder="Enter the name of the person who observed the violation" maxLength={150} required className={inputClass} /></div>
              <div><label htmlFor="observationDate" className={labelClass}>Date <span className="text-red-600">*</span></label><input id="observationDate" type="date" value={observationDate} min={minAllowed} max={today} onChange={(event) => setObservationDate(event.target.value)} required className={inputClass} /></div>
              <div><label htmlFor="location" className={labelClass}>Location <span className="text-red-600">*</span></label><input id="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Enter incident location" maxLength={250} required className={inputClass} /></div>
              <div><label htmlFor="atRiskBehaviourDescription" className={labelClass}>At-Risk Behaviour Description <span className="text-red-600">*</span></label><textarea id="atRiskBehaviourDescription" value={atRiskBehaviourDescription} onChange={(event) => setAtRiskBehaviourDescription(event.target.value)} placeholder="Describe the at-risk behaviour and what you observed..." rows={5} maxLength={5000} required className={`${inputClass} resize-y`} /></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-4 text-lg font-bold text-slate-900">People Count</h3>
                <div className="space-y-4">
                  <div><label htmlFor="peopleWorkingCorrectly" className={labelClass}>People Working Correctly <span className="text-red-600">*</span></label><input id="peopleWorkingCorrectly" type="number" min="0" step="1" inputMode="numeric" value={peopleWorkingCorrectly} onChange={(event) => handleNumberChange(event.target.value, setPeopleWorkingCorrectly)} placeholder="Enter number" required className={inputClass} /></div>
                  <div><label htmlFor="peopleShowingWrongBehaviour" className={labelClass}>People Showing Wrong Behaviour <span className="text-red-600">*</span></label><input id="peopleShowingWrongBehaviour" type="number" min="0" step="1" inputMode="numeric" value={peopleShowingWrongBehaviour} onChange={(event) => { const value = event.target.value; if (value === "" || /^\d+$/.test(value)) { setPeopleShowingWrongBehaviour(value); setFormMessage(""); if (value !== "" && peopleGivenSpotCorrection !== "" && Number(peopleGivenSpotCorrection) > Number(value)) setPeopleGivenSpotCorrection(value); } }} placeholder="Enter number" required className={inputClass} /></div>
                  <div><label htmlFor="peopleGivenSpotCorrection" className={labelClass}>People Given Spot Correction <span className="text-red-600">*</span></label><input id="peopleGivenSpotCorrection" type="number" min="0" step="1" max={peopleShowingWrongBehaviour || undefined} inputMode="numeric" value={peopleGivenSpotCorrection} onChange={(event) => { const value = event.target.value; if (value === "" || /^\d+$/.test(value)) { if (value !== "" && peopleShowingWrongBehaviour !== "" && Number(value) > Number(peopleShowingWrongBehaviour)) { setMessageType("error"); setFormMessage("Spot Correction cannot exceed People Showing Wrong Behaviour."); return; } setPeopleGivenSpotCorrection(value); setFormMessage(""); } }} placeholder="Enter number" required className={inputClass} /></div>
                </div>
                {currentStatus && <div className={`mt-4 rounded-lg p-3 text-sm font-bold ${currentStatus === "Closed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>Observation Status: {currentStatus}{currentStatus === "Open" && " — All people showing wrong behaviour must receive spot correction before saving."}</div>}
              </div>
              <div><label htmlFor="behaviourCategory" className={labelClass}>Behaviour Category <span className="text-red-600">*</span></label><select id="behaviourCategory" value={behaviourCategory} onChange={(event) => setBehaviourCategory(event.target.value)} required className={inputClass}><option value="">Select Behaviour Category</option>{behaviourCategoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
              <div><label htmlFor="violationType" className={labelClass}>Types of Violation</label><select id="violationType" value={violationType} onChange={(event) => { setViolationType(event.target.value); setSubClassification(""); setFormMessage(""); }} className={inputClass}><option value="">Select Types of Violation</option><option value="Routine">Routine</option><option value="Situational">Situational</option><option value="Exceptional">Exceptional</option></select></div>
              <div><label htmlFor="subClassification" className={labelClass}>Sub-Classification of Violation</label><select id="subClassification" value={subClassification} onChange={(event) => setSubClassification(event.target.value)} disabled={!violationType} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`}><option value="">{violationType ? "Select Sub-Classification" : "Select Types of Violation First"}</option>{availableSubClassifications.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
              {formMessage && <div role="status" className={`rounded-lg p-4 text-sm font-medium ${messageType === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{formMessage}</div>}
              <button type="submit" className="w-full rounded-xl bg-blue-700 px-5 py-4 font-bold text-white shadow transition hover:bg-blue-800">Save Observation</button>
            </form>
          </section>
        )}

        {selectedCategory === "Unsafe Condition" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
  <div className="min-w-0">
    <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
      Selected Category: Unsafe Condition
    </p>
    <h2 className="mt-1 text-2xl font-bold text-slate-900">
      Unsafe Condition Observation Details
    </h2>
    <p className="mt-2 text-sm text-slate-600">
      Enter the details of the unsafe condition observed.
    </p>
  </div>

  <div className="flex h-20 w-20 shrink-0 items-center justify-center">
    <img
      src="/thermax-logo.png"
      alt="Thermax Logo"
      className="h-full w-full object-contain"
    />
  </div>
</div>
            <form onSubmit={handleSaveUnsafeCondition} className="space-y-5">
              <div>
  <label htmlFor="siteCode" className={labelClass}>
    Site Code <span className="text-red-600">*</span>
  </label>

  <input
  id="siteCode"
  type="text"
  value={siteCode}
  readOnly
  placeholder="Loading Site Code..."
  required
  className={`${inputClass} cursor-not-allowed bg-slate-100 font-semibold text-slate-700`}
/>
</div>
              <div><label htmlFor="conditionDescription" className={labelClass}>Unsafe Condition Description <span className="text-red-600">*</span></label><textarea id="conditionDescription" value={conditionDescription} onChange={(event) => setConditionDescription(event.target.value)} rows={4} maxLength={5000} required placeholder="Describe the unsafe condition..." className={`${inputClass} resize-y`} /></div>
              <div><label htmlFor="conditionDate" className={labelClass}>Unsafe Condition Occurred Date <span className="text-red-600">*</span></label><input id="conditionDate" type="date" value={conditionDate} min={minAllowed} max={today} onChange={(event) => setConditionDate(event.target.value)} required className={inputClass} /></div>
              <div><label htmlFor="responsiblePerson" className={labelClass}>Responsible Person to take Immediate Actions <span className="text-red-600">*</span></label><input id="responsiblePerson" value={responsiblePerson} onChange={(event) => setResponsiblePerson(event.target.value)} maxLength={200} required className={inputClass} /></div>
              <div><label htmlFor="conditionLocation" className={labelClass}>Location of Unsafe Condition <span className="text-red-600">*</span></label><input id="conditionLocation" value={conditionLocation} onChange={(event) => setConditionLocation(event.target.value)} maxLength={250} required className={inputClass} /></div>
              <div><label htmlFor="reportingPerson" className={labelClass}>Person Reporting Unsafe Condition <span className="text-red-600">*</span></label><input id="reportingPerson" value={reportingPerson} onChange={(event) => setReportingPerson(event.target.value)} maxLength={150} required className={inputClass} /></div>
              <div><label htmlFor="observerCompanyName" className={labelClass}>Unsafe Condition Observer company Name <span className="text-red-600">*</span></label><select
  id="observerCompanyName"
  value={observerCompanyName}
  onChange={(event) => setObserverCompanyName(event.target.value)}
  required
  className={inputClass}
  disabled={companiesLoading}
>
  <option value="">
    {companiesLoading ? "Loading companies..." : "Select Company"}
  </option>

  {siteCompanies.map((company) => (
    <option key={company.id} value={company.company_name}>
      {company.company_name}
    </option>
  ))}
</select></div>
              <div><label htmlFor="conditionCategory" className={labelClass}>Unsafe Condition Category <span className="text-red-600">*</span></label><select id="conditionCategory" value={conditionCategory} onChange={(event) => { setConditionCategory(event.target.value); setConditionSubCategory(""); setFormMessage(""); }} required className={inputClass}><option value="">Select Category</option>{unsafeConditionCategories.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
              <div><label htmlFor="conditionSubCategory" className={labelClass}>Unsafe Condition Sub-Category <span className="text-red-600">*</span></label><select id="conditionSubCategory" value={conditionSubCategory} onChange={(event) => setConditionSubCategory(event.target.value)} disabled={!conditionCategory} required className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`}><option value="">{conditionCategory ? "Select Sub-Category" : "Select Category First"}</option>{availableConditionSubCategories.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
              <div><label htmlFor="hazardClass" className={labelClass}>Unsafe Condition Hazard Class <span className="text-red-600">*</span></label><select id="hazardClass" value={hazardClass} onChange={(event) => setHazardClass(event.target.value)} required className={inputClass}><option value="">Select Hazard Class</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
              <div><label htmlFor="leadingActivity" className={labelClass}>Unsafe Condition Leading Activity <span className="text-red-600">*</span></label><input id="leadingActivity" value={leadingActivity} onChange={(event) => setLeadingActivity(event.target.value)} maxLength={500} required placeholder="Enter leading activity" className={inputClass} /></div>
              <div><label htmlFor="recommendations" className={labelClass}>Recommendations to Close Unsafe Condition <span className="text-red-600">*</span></label><textarea id="recommendations" value={recommendations} onChange={(event) => setRecommendations(event.target.value)} rows={4} maxLength={5000} required placeholder="Enter recommendations..." className={`${inputClass} resize-y`} /></div>
              <PhotoPicker id="conditionPhotos" photos={conditionPhotos} setPhotos={setConditionPhotos} isDragging={conditionDragging} setIsDragging={setConditionDragging} setFormMessage={setFormMessage} setMessageType={setMessageType} />
              <div><label htmlFor="siteIncharge" className={labelClass}>Site Incharge (Unsafe Condition) <span className="text-red-600">*</span></label><input id="siteIncharge" value={siteIncharge} onChange={(event) => setSiteIncharge(event.target.value)} maxLength={200} required className={inputClass} /></div>
              {formMessage && <div role="status" className={`rounded-lg p-4 text-sm font-medium ${messageType === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{formMessage}</div>}
              <button type="submit" className="w-full rounded-xl bg-blue-700 px-5 py-4 font-bold text-white shadow transition hover:bg-blue-800">Save Observation</button>
            </form>
          </section>
        )}

        {selectedCategory === "Near Miss" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
  <div className="min-w-0">
    <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
      Selected Category: Near Miss
    </p>
    <h2 className="mt-1 text-2xl font-bold text-slate-900">
      Near Miss Observation Details
    </h2>
    <p className="mt-2 text-sm text-slate-600">
      Report an incident or event that almost happened.
    </p>
  </div>

  <div className="flex h-20 w-20 shrink-0 items-center justify-center">
    <img
      src="/thermax-logo.png"
      alt="Thermax Logo"
      className="h-full w-full object-contain"
    />
  </div>
</div>
            <form onSubmit={handleSaveNearMiss} className="space-y-5">
              <div>
  <label htmlFor="siteCode" className={labelClass}>
    Site Code <span className="text-red-600">*</span>
  </label>

  <input
  id="siteCode"
  type="text"
  value={siteCode}
  readOnly
  placeholder="Loading Site Code..."
  required
  className={`${inputClass} cursor-not-allowed bg-slate-100 font-semibold text-slate-700`}
/>
</div>
              <div><label htmlFor="nearMissDescription" className={labelClass}>Near Miss Description <span className="text-red-600">*</span></label><textarea id="nearMissDescription" value={nearMissDescription} onChange={(event) => setNearMissDescription(event.target.value)} rows={4} maxLength={5000} required placeholder="Describe the near miss..." className={`${inputClass} resize-y`} /></div>
              <div><label htmlFor="nearMissLocation" className={labelClass}>Exact Location of Near Miss <span className="text-red-600">*</span></label><input id="nearMissLocation" value={nearMissLocation} onChange={(event) => setNearMissLocation(event.target.value)} maxLength={250} required className={inputClass} /></div>
              <div><label htmlFor="nearMissDate" className={labelClass}>Near Miss Occurred Date <span className="text-red-600">*</span></label><input id="nearMissDate" type="date" value={nearMissDate} min={minAllowed} max={today} onChange={(event) => setNearMissDate(event.target.value)} required className={inputClass} /></div>
              <div><label htmlFor="nearMissResponsiblePerson" className={labelClass}>Responsible Person to take Immediate Actions (Near Miss) <span className="text-red-600">*</span></label><input id="nearMissResponsiblePerson" value={nearMissResponsiblePerson} onChange={(event) => setNearMissResponsiblePerson(event.target.value)} maxLength={200} required className={inputClass} /></div>
              <div><label htmlFor="nearMissCompanyName" className={labelClass}>Near Miss Happened Company Name <span className="text-red-600">*</span></label><select
  id="nearMissCompanyName"
  value={nearMissCompanyName}
  onChange={(event) => setNearMissCompanyName(event.target.value)}
  required
  className={inputClass}
  disabled={companiesLoading}
>
  <option value="">
    {companiesLoading ? "Loading companies..." : "Select Company"}
  </option>

  {siteCompanies.map((company) => (
    <option key={company.id} value={company.company_name}>
      {company.company_name}
    </option>
  ))}
</select></div>
              <div><label htmlFor="nearMissObserverName" className={labelClass}>Near Miss Observer Name <span className="text-red-600">*</span></label><input id="nearMissObserverName" value={nearMissObserverName} onChange={(event) => setNearMissObserverName(event.target.value)} maxLength={150} required className={inputClass} /></div>
              <div><label htmlFor="nearMissUnsafeType" className={labelClass}>Unsafe Type <span className="text-red-600">*</span></label><select id="nearMissUnsafeType" value={nearMissUnsafeType} onChange={(event) => setNearMissUnsafeType(event.target.value)} required className={inputClass}><option value="">Select Unsafe Type</option><option value="Unsafe Act">Unsafe Act</option><option value="Unsafe Condition">Unsafe Condition</option></select></div>
              <div><label htmlFor="nearMissCategory" className={labelClass}>Near Miss Category <span className="text-red-600">*</span></label><select id="nearMissCategory" value={nearMissCategory} onChange={(event) => { setNearMissCategory(event.target.value); setNearMissSubCategory(""); setFormMessage(""); }} required className={inputClass}><option value="">Select Near Miss Category</option>{nearMissCategories.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
              <div><label htmlFor="nearMissSubCategory" className={labelClass}>Near Miss Sub-Category <span className="text-red-600">*</span></label><select id="nearMissSubCategory" value={nearMissSubCategory} onChange={(event) => setNearMissSubCategory(event.target.value)} disabled={!nearMissCategory} required className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`}><option value="">{nearMissCategory ? "Select Near Miss Sub-Category" : "Select Near Miss Category First"}</option>{availableNearMissSubCategories.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
              <div><label htmlFor="nearMissHazardClass" className={labelClass}>Near Miss Hazard Class <span className="text-red-600">*</span></label><select id="nearMissHazardClass" value={nearMissHazardClass} onChange={(event) => setNearMissHazardClass(event.target.value)} required className={inputClass}><option value="">Select Hazard Class</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
              <div><label htmlFor="nearMissLeadingActivity" className={labelClass}>Near Miss Leading Activity <span className="text-red-600">*</span></label><input id="nearMissLeadingActivity" value={nearMissLeadingActivity} onChange={(event) => setNearMissLeadingActivity(event.target.value)} maxLength={500} required className={inputClass} /></div>
              <div><label htmlFor="nearMissRootCause" className={labelClass}>Near Miss Root Cause <span className="text-red-600">*</span></label><select id="nearMissRootCause" value={nearMissRootCause} onChange={(event) => setNearMissRootCause(event.target.value)} required className={inputClass}><option value="">Select Root Cause</option>{nearMissRootCauses.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
              <div>
  <label htmlFor="nearMissRootCauseSubCategory" className={labelClass}>
    Near Miss Root Cause Sub-Category <span className="text-red-600">*</span>
  </label>
  <input
    id="nearMissRootCauseSubCategory"
    value={nearMissRootCauseSubCategory}
    onChange={(event) => setNearMissRootCauseSubCategory(event.target.value)}
    maxLength={500}
    required
    className={inputClass}
  />
</div>
              <PhotoPicker id="nearMissPhotos" photos={nearMissPhotos} setPhotos={setNearMissPhotos} isDragging={nearMissDragging} setIsDragging={setNearMissDragging} setFormMessage={setFormMessage} setMessageType={setMessageType} />
              <div><label htmlFor="nearMissSiteIncharge" className={labelClass}>Site Incharge (Near Miss) <span className="text-red-600">*</span></label><input id="nearMissSiteIncharge" value={nearMissSiteIncharge} onChange={(event) => setNearMissSiteIncharge(event.target.value)} maxLength={200} required className={inputClass} /></div>
              {formMessage && <div role="status" className={`rounded-lg p-4 text-sm font-medium ${messageType === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{formMessage}</div>}
              <button type="submit" className="w-full rounded-xl bg-blue-700 px-5 py-4 font-bold text-white shadow transition hover:bg-blue-800">Save Observation</button>
            </form>
          </section>
        )}

        {(!isWorkerMode || selectedCategory) && (
  <button
    type="button"
    onClick={handleBack}
    className="mt-5 w-full py-3 text-sm font-semibold text-blue-700 hover:underline"
  >
    ← {selectedCategory ? "Back to Select Category" : "Back to Home"}
  </button>
)}
      </div>
    </main>
  );
}
export default function ObservationPortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Observation...</div>}>
      <ObservationPortalContent />
    </Suspense>
  );
}