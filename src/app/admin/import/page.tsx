import { SuperhomeImportPanel } from "@/components/admin/SuperhomeImportPanel";

export default function AdminImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Catalog import</h1>
      <p className="mt-1 text-sm text-slate-500">Superhome.com.cy one-time sync</p>
      <div className="mt-8">
        <SuperhomeImportPanel />
      </div>
    </div>
  );
}
