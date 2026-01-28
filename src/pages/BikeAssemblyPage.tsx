import { DashboardLayout } from '@/layouts/DashboardLayout'
import { PageTransition } from '@/components/PageTransition'
import { BikeAssemblyTable } from '@/components/BikeAssemblyTable'

export default function BikeAssemblyPage() {
    return (
        <PageTransition>
            <DashboardLayout>
                <div className="flex flex-col gap-2 mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Neurad Aufbau</h1>
                    <p className="text-muted-foreground">
                        Verwalten Sie hier alle offenen Neurad-Aufbau Aufträge.
                    </p>
                </div>

                <BikeAssemblyTable />
            </DashboardLayout>
        </PageTransition>
    )
}
