import { useMap } from "../../lib/stores/useMap";

export function MapLoadingOverlay() {
  const isLoading = useMap((state) => state.isLoadingFromDB);

  if (!isLoading) return null;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-[9999]"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.65)", pointerEvents: "all" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-amber-200 text-lg font-serif tracking-wide">
          Chargement de la zone...
        </p>
      </div>
    </div>
  );
}
