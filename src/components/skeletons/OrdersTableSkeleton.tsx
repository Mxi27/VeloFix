import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export function OrdersTableSkeleton() {
    return (
        <Card className="border-none shadow-sm bg-card/50">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-9 w-32" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="flex items-center gap-2 max-w-sm">
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background overflow-x-auto shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent bg-muted/40">
                                    <TableHead className="w-[110px] pl-4">
                                        <Skeleton className="h-3 w-16" />
                                    </TableHead>
                                    <TableHead>
                                        <Skeleton className="h-3 w-20" />
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        <Skeleton className="h-3 w-24" />
                                    </TableHead>
                                    <TableHead className="hidden sm:table-cell">
                                        <Skeleton className="h-3 w-16" />
                                    </TableHead>
                                    <TableHead>
                                        <Skeleton className="h-3 w-20" />
                                    </TableHead>
                                    <TableHead className="hidden lg:table-cell">
                                        <Skeleton className="h-3 w-20" />
                                    </TableHead>
                                    <TableHead className="text-right pr-4">
                                        <Skeleton className="h-3 w-16 ml-auto" />
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <TableRow key={i} className="border-b border-border/40">
                                        <TableCell className="pl-4 py-4">
                                            <Skeleton className="h-5 w-20" />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col gap-1">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-3 w-24" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell py-4">
                                            <Skeleton className="h-4 w-28" />
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell py-4">
                                            <Skeleton className="h-5 w-16 rounded-full" />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Skeleton className="h-5 w-24 rounded-full" />
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell py-4">
                                            <Skeleton className="h-4 w-20" />
                                        </TableCell>
                                        <TableCell className="text-right pr-4 py-4">
                                            <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
