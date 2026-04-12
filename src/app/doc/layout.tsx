import RoleGuard from "@/Components/RoleGuard/RoleGuard";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={["doctor", "admin"]}>
            {children}
        </RoleGuard>
    );
}
