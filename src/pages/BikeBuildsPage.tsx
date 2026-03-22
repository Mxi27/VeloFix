import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { PageHeader } from "@/components/PageHeader"
import { BikeAssemblyTable } from "@/components/BikeAssemblyTable"
import { CreateBikeBuildModal } from "@/components/CreateBikeBuildModal"
import { Bike } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export default function BikeBuildsPage() {
    const { userRole } = useAuth()

    return (
        <PageTransition>
            <DashboardLayout>
                <PageHeader
                    icon={Bike}
                    title="Neuradaufbau"
                    action={userRole !== 'read' ? <CreateBikeBuildModal /> : undefined}
                />

                {/* Table */}
                <BikeAssemblyTable />
            </DashboardLayout>
        </PageTransition>
    )
}
