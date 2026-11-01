import { Suspense } from "react";
import ObservationDetailsContent from "./ObservationDetailsContent";

export default function ObservationDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          Loading observation details...
        </div>
      }
    >
      <ObservationDetailsContent />
    </Suspense>
  );
}