import RoleGuard from "@/Components/RoleGuard/RoleGuard";

export default function VisitsLayout({ children }: { children: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={["patient", "admin"]}>
            {children}
        </RoleGuard>
    );
}
