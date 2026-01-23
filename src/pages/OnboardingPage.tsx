import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Store, Users, Loader2, LogOut } from "lucide-react"
import { PageTransition } from "@/components/PageTransition"

export default function OnboardingPage() {
    const { user, workshopId, refreshSession, signOut } = useAuth() // workshopId might be null
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [joinId, setJoinId] = useState("")

    const [newWorkshopName, setNewWorkshopName] = useState("")
    const [newWorkshopAddress, setNewWorkshopAddress] = useState("")

    // Security check: if user already has a workshop, redirect
    if (workshopId) {
        navigate("/dashboard")
        return null
    }

    const handleCreateWorkshop = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setIsLoading(true)

        try {
            // 1. Create Workshop
            const { data: workshop, error: wsError } = await supabase
                .from('workshops')
                .insert({
                    name: newWorkshopName,
                    address: newWorkshopAddress,
                    owner_user_id: user.id
                })
                .select()
                .single()

            if (wsError) throw wsError
            if (!workshop) throw new Error("No workshop returned")

            // 2. Update Employee Record (Assign to this workshop as admin)
            // We use 'select' to check if the update actually found a row
            const { data: updatedRows, error: empError } = await supabase
                .from('employees')
                .update({
                    workshop_id: workshop.id,
                    role: 'admin'
                })
                .eq('user_id', user.id)
                .select()

            if (empError) throw empError

            // SELF-HEALING: If no employee record existed yet (Signup failed?), create one now.
            if (!updatedRows || updatedRows.length === 0) {
                const { error: insertError } = await supabase
                    .from('employees')
                    .insert({
                        user_id: user.id,
                        workshop_id: workshop.id,
                        role: 'admin',
                        email: user.email || 'unknown@example.com',
                        name: user.user_metadata?.full_name || 'Admin',
                        active: true
                    })

                if (insertError) throw insertError
            }

            await refreshSession()
            navigate("/dashboard")

        } catch (error: any) {
            console.error(error)
            alert("Fehler beim Erstellen: " + error.message)
            setIsLoading(false)
        }
    }



    return (
        <PageTransition>
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-lg border-border shadow-xl relative">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-4 right-4 gap-2"
                        onClick={() => signOut()}
                    >
                        <LogOut className="h-4 w-4" />
                        Abmelden
                    </Button>
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Store className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Willkommen bei VeloFix!</CardTitle>
                        <CardDescription>
                            Sie sind fast fertig. Bitte erstellen Sie eine Werkstatt oder treten Sie einer bestehenden bei.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="create" className="w-full">
                            <TabsList variant="line" className="w-full justify-start border-b mb-6">
                                <TabsTrigger value="create">Neue Werkstatt</TabsTrigger>
                                <TabsTrigger value="join">Beitreten</TabsTrigger>
                            </TabsList>

                            <TabsContent value="create" className="space-y-4">
                                <form onSubmit={handleCreateWorkshop} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="ws-name">Werkstatt Name</Label>
                                        <Input
                                            id="ws-name"
                                            placeholder="Maxis Fahrradladen"
                                            value={newWorkshopName}
                                            onChange={e => setNewWorkshopName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ws-address">Adresse (Optional)</Label>
                                        <Input
                                            id="ws-address"
                                            placeholder="Musterstraße 1, 12345 Berlin"
                                            value={newWorkshopAddress}
                                            onChange={e => setNewWorkshopAddress(e.target.value)}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Store className="mr-2 h-4 w-4" />}
                                        Werkstatt erstellen
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="join" className="space-y-4">
                                <form onSubmit={(e) => e.preventDefault()} className="space-y-4 opacity-50 pointer-events-none select-none relative">
                                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                                        <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-primary/20 shadow-lg transform -rotate-2">
                                            <span className="font-bold text-primary">Coming Soon 🚀</span>
                                        </div>
                                    </div>
                                    <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground mb-4 border border-border">
                                        Fragen Sie Ihren Administrator nach dem <strong>Invite Code</strong>.
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ws-id">Werkstatt ID</Label>
                                        <Input
                                            id="ws-id"
                                            placeholder="z.B. 123e4567-e89b-..."
                                            value={joinId}
                                            onChange={e => setJoinId(e.target.value)}
                                            required
                                            disabled
                                        />
                                    </div>
                                    <Button type="submit" variant="outline" className="w-full" disabled>
                                        <Users className="mr-2 h-4 w-4" />
                                        Beitreten
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </PageTransition>
    )
}

