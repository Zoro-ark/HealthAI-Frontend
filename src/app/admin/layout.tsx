import RoleGuard from "@/Components/RoleGuard/RoleGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={["admin"]}>
            {children}
        </RoleGuard>
    );
}
