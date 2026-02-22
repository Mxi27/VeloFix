import { Trash2 } from "lucide-react"
import { OrdersTable } from "./OrdersTable"
import { BikeBuildsTable } from "./BikeBuildsTable"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function RecycleBin() {
    return (
        <div className="space-y-6 w-full min-w-0 overflow-hidden">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-primary" />
                        Papierkorb
                    </CardTitle>
                    <CardDescription>
                        Hier finden Sie gelöschte Aufträge. Sie können diese wiederherstellen oder endgültig löschen.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="orders" className="space-y-6">
                        <TabsList variant="line" className="w-full justify-start border-b overflow-x-auto flex-nowrap no-scrollbar pb-1">
                            <TabsTrigger value="orders">Reparaturen</TabsTrigger>
                            <TabsTrigger value="builds">Neurad-Montagen</TabsTrigger>
                        </TabsList>

                        <TabsContent value="orders" className="mt-0 pt-4">
                            <OrdersTable mode="trash" />
                        </TabsContent>

                        <TabsContent value="builds" className="mt-0 pt-4">
                            <BikeBuildsTable mode="trash" />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
