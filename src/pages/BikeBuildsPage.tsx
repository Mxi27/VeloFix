import { DashboardLayout } from "@/layouts/DashboardLayout"
import { BikeBuildsTable } from "@/components/BikeBuildsTable"
import { CreateBikeBuildModal } from "@/components/CreateBikeBuildModal"
import { PageTransition } from "@/components/PageTransition"
import { useState } from "react"

export default function BikeBuildsPage() {
    const [refreshKey, setRefreshKey] = useState(0)
    const [isNewBuildOpen, setIsNewBuildOpen] = useState(false)

    const handleBuildCreated = () => {
        setRefreshKey(prev => prev + 1)
    }

    return (
        <PageTransition>
            <DashboardLayout>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-balance">
                                Bike Builds
                            </h1>
                            <p className="text-sm sm:text-base text-muted-foreground mt-1">
                                Verwalten Sie Ihre Fahrrad-Neuaufbauten und Custom Builds
                            </p>
                        </div>
                        <CreateBikeBuildModal
                            open={isNewBuildOpen}
                            onOpenChange={setIsNewBuildOpen}
                            onBuildCreated={handleBuildCreated}
                        >
                            <button
                                onClick={() => setIsNewBuildOpen(true)}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14"/>
                                    <path d="M12 5v14"/>
                                </svg>
                                Neuer Build
                            </button>
                        </CreateBikeBuildModal>
                    </div>
                </div>

                <div className="mt-6 sm:mt-8">
                    {/* Mobile FAB for creating new build */}
                    <div className="sm:hidden fixed bottom-20 right-4 z-40">
                        <CreateBikeBuildModal
                            open={isNewBuildOpen}
                            onOpenChange={setIsNewBuildOpen}
                            onBuildCreated={handleBuildCreated}
                        >
                            <button
                                onClick={() => setIsNewBuildOpen(true)}
                                className="flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14"/>
                                    <path d="M12 5v14"/>
                                </svg>
                            </button>
                        </CreateBikeBuildModal>
                    </div>

                    <BikeBuildsTable key={refreshKey} />
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
