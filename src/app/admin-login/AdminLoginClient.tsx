"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLoginClient() {
    const { isLoaded, isSignedIn, user } = useUser();
    const router = useRouter();
    const [status, setStatus] = useState<"checking" | "denied" | "unauthenticated">("checking");

    useEffect(() => {
        if (!isLoaded) return;
        
        if (!isSignedIn) {
            setStatus("unauthenticated");
            return;
        }

        // If signed in, check their role from local storage.
        // Navbar sync logic handles syncing Clerk -> Supabase -> localstorage upon sign in.
        const currentRole = localStorage.getItem("role");

        if (currentRole === "admin") {
            router.push("/admin");
        } else {
            setStatus("denied");
        }
    }, [isLoaded, isSignedIn, router]);

    if (status === "checking") {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-800 border border-slate-700 p-12 rounded-3xl max-w-md w-full shadow-2xl text-center"
            >
                {status === "unauthenticated" ? (
                    <>
                        <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShieldCheck className="w-10 h-10 text-blue-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Admin Portal</h1>
                        <p className="text-slate-400 mb-8">
                            Please authenticate with your administrator credentials to continue.
                        </p>
                        
                        <SignInButton mode="modal">
                            <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-900/50">
                                Sign In as Admin
                            </button>
                        </SignInButton>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                            <ShieldAlert className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Access Denied</h1>
                        <p className="text-slate-400 mb-8">
                            Your account ({user?.primaryEmailAddress?.emailAddress}) does not have administrator privileges.
                        </p>
                        <button 
                            onClick={() => router.push("/")}
                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors w-full"
                        >
                            Return to Homepage
                        </button>
                    </>
                )}
            </motion.div>
        </div>
    );
}
