import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { BikeAssemblyTable } from "@/components/BikeAssemblyTable"
import { CreateBikeBuildModal } from "@/components/CreateBikeBuildModal"

export default function BikeBuildsPage() {
    return (
        <PageTransition>
            <DashboardLayout>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                Neuradaufbau
                            </h1>
                            <p className="text-lg text-muted-foreground mt-2">
                                Verwalten Sie hier alle neu aufgebauten Fahrräder.
                            </p>
                        </div>
                        <CreateBikeBuildModal />
                    </div>
                </div>

                <div className="mt-12">
                    <BikeAssemblyTable />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
