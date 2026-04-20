"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { User, Activity, ArrowRight, Loader2 } from "lucide-react";

export default function OnboardingClient() {
    const { user, isLoaded, isSignedIn } = useUser();
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState(false);
    const supabase = createClient();

    const handleRoleSelection = async (role: "patient" | "doctor") => {
        if (!user) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ role })
                .eq('clerk_id', user.id);

            if (error) throw error;

            localStorage.setItem('role', role);
            
            // Redirect based on role selection. Doctor might need to verify next.
            if (role === 'doctor') {
                router.push('/doctor-details');
            } else {
                router.push('/');
            }

        } catch (err) {
            console.error("Error setting role:", err);
            setIsUpdating(false);
        }
    };

    if (!isLoaded || !isSignedIn) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6 font-sans">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl w-full"
            >
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Who are you?</h1>
                    <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">
                        Please tell us how you plan to use the MedicoTourism platform so we can personalize your experience.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                    {/* Patient Card */}
                    <button 
                        disabled={isUpdating}
                        onClick={() => handleRoleSelection("patient")}
                        className="group relative bg-white/70 backdrop-blur-xl border-2 border-white hover:border-blue-200 p-10 rounded-3xl text-left shadow-lg hover:shadow-xl hover:shadow-blue-900/5 transition-all outline-none"
                    >
                        <div className="mb-6 p-4 bg-teal-50 w-fit rounded-2xl group-hover:scale-110 transition-transform group-hover:bg-teal-100">
                            <User className="w-10 h-10 text-teal-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">I am a Patient</h2>
                        <p className="text-slate-500 leading-relaxed mb-8">
                            I am seeking medical treatments, looking to book appointments, or managing my health records.
                        </p>
                        <div className="flex items-center text-teal-600 font-semibold group-hover:translate-x-2 transition-transform">
                            Select Patient <ArrowRight className="ml-2 w-5 h-5" />
                        </div>
                    </button>

                    {/* Doctor Card */}
                    <button 
                        disabled={isUpdating}
                        onClick={() => handleRoleSelection("doctor")}
                        className="group relative bg-white/70 backdrop-blur-xl border-2 border-white hover:border-blue-200 p-10 rounded-3xl text-left shadow-lg hover:shadow-xl hover:shadow-blue-900/5 transition-all outline-none"
                    >
                        <div className="mb-6 p-4 bg-indigo-50 w-fit rounded-2xl group-hover:scale-110 transition-transform group-hover:bg-indigo-100">
                            <Activity className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">I am a Doctor</h2>
                        <p className="text-slate-500 leading-relaxed mb-8">
                            I will be managing patients, reviewing AI documentation, and conducting tele-consultations.
                        </p>
                        <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform">
                            Select Doctor <ArrowRight className="ml-2 w-5 h-5" />
                        </div>
                    </button>
                </div>
            </motion.div>
            
            {/* Updating Overlay */}
            {isUpdating && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <p className="text-xl font-bold text-slate-800">Setting up your profile...</p>
                </div>
            )}
        </div>
    );
}
