import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Users } from "lucide-react"

interface JoinWorkshopFormProps {
    onSubmit: (code: string) => Promise<void>;
    isLoading: boolean;
}

export function JoinWorkshopForm({ onSubmit, isLoading }: JoinWorkshopFormProps) {
    const [code, setCode] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(code)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 text-sm text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    <Users className="h-5 w-5 flex-shrink-0" />
                    <p>
                        Den Code erhalten Sie vom Inhaber Ihrer Werkstatt. Er ist 6-stellig und ändert sich täglich.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="invite-code">Invite Code</Label>
                    <Input
                        id="invite-code"
                        placeholder="z.B. AB12CD"
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                        required
                        maxLength={6}
                        className="h-14 font-mono text-2xl tracking-[0.5em] text-center uppercase"
                        autoFocus
                    />
                </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading || code.length < 6}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                Beitreten
            </Button>
        </form>
    )
}
