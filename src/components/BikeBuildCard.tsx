import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Calendar, Bike, Euro } from "lucide-react"
import { BUILD_STATUS_COLORS } from "@/lib/constants"

interface BikeBuild {
    id: string
    build_number: string
    customer_name: string
    customer_email: string | null
    frame_brand: string | null
    frame_model: string | null
    build_type: 'custom' | 'production'
    status: string
    estimated_completion: string | null
    total_budget: number | null
    created_at: string
}

interface BikeBuildCardProps {
    build: BikeBuild
    onViewBuild: (buildId: string) => void
}

export function BikeBuildCard({ build, onViewBuild }: BikeBuildCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
        >
            <Card
                variant="glass"
                className="cursor-pointer hover:shadow-elevated-lg transition-all duration-300"
                onClick={() => onViewBuild(build.id)}
            >
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="font-mono text-sm font-bold text-primary">
                            {build.build_number}
                        </div>
                        <div className="font-semibold text-base">{build.customer_name}</div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        onClick={(e) => {
                            e.stopPropagation()
                            onViewBuild(build.id)
                        }}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </div>

                {/* Customer Email */}
                {build.customer_email && (
                    <div className="text-xs text-muted-foreground truncate">
                        {build.customer_email}
                    </div>
                )}

                {/* Frame Info */}
                {build.frame_brand && (
                    <div className="flex items-center gap-2 text-sm">
                        <Bike className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                            {build.frame_brand}
                            {build.frame_model && ` ${build.frame_model}`}
                        </span>
                    </div>
                )}

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2">
                    <Badge
                        variant="outline"
                        className={build.build_type === 'custom'
                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                        }
                    >
                        {build.build_type === 'custom' ? "Custom" : "Produktion"}
                    </Badge>
                    <Badge
                        variant="secondary"
                        className={`capitalize ${BUILD_STATUS_COLORS[build.status] || "bg-muted text-foreground"}`}
                    >
                        {build.status.replace(/_/g, ' ')}
                    </Badge>
                </div>

                {/* Budget & Date */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    {build.total_budget && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Euro className="h-3 w-3" />
                            <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(build.total_budget)}</span>
                        </div>
                    )}
                    {build.estimated_completion && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(build.estimated_completion).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: 'short'
                            })}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
        </motion.div>
    )
}
