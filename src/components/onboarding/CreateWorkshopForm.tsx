import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Store } from "lucide-react"

interface CreateWorkshopFormProps {
    onSubmit: (name: string, address: string) => Promise<void>;
    isLoading: boolean;
}

export function CreateWorkshopForm({ onSubmit, isLoading }: CreateWorkshopFormProps) {
    const [name, setName] = useState("")
    const [address, setAddress] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(name, address)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="ws-name">Name der Werkstatt</Label>
                    <Input
                        id="ws-name"
                        placeholder="z.B. Radsport Weber"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        className="h-11"
                        autoFocus
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ws-address">Adresse (Optional)</Label>
                    <Input
                        id="ws-address"
                        placeholder="Musterstraße 1, 12345 Berlin"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="h-11"
                    />
                </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Store className="mr-2 h-4 w-4" />}
                Werkstatt erstellen
            </Button>
        </form>
    )
}
