import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
            <div className="p-6 bg-white shadow-2xl shadow-blue-900/10 rounded-3xl flex flex-col items-center border border-slate-100">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-slate-800">Loading MedicoTourism...</h3>
                <p className="text-slate-500 text-sm mt-1">Please wait a moment.</p>
            </div>
        </div>
    );
}
