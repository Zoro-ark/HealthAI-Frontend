"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: ("admin" | "patient" | "doctor")[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const { isLoaded, isSignedIn } = useUser();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (!isLoaded) return;
        
        if (!isSignedIn) {
            router.push("/");
            return;
        }

        const currentRole = localStorage.getItem("role") || "unknown";

        if (currentRole === "unknown") {
            router.push("/onboarding");
            return;
        }

        if (!allowedRoles.includes(currentRole as any)) {
            // Boot them back to standard visits/home based on their role
            if (currentRole === "doctor") router.push("/doc");
            else router.push("/");
        } else {
            setAuthorized(true);
        }
    }, [isLoaded, isSignedIn, router, allowedRoles]);

    if (!authorized) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
