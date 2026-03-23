import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { toastSuccess, toastError } from "@/lib/toast-utils"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { 
    Plus, 
    Trash2, 
    Package, 
    User, 
    Mail, 
    Phone,
    Loader2,
    ShoppingCart
} from "lucide-react"
import type { CustomerOrderItem } from "@/types"

interface CreateCustomerOrderModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function CreateCustomerOrderModal({ open, onOpenChange, onSuccess }: CreateCustomerOrderModalProps) {
    const { workshopId } = useAuth()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [notes, setNotes] = useState("")
    const [items, setItems] = useState<CustomerOrderItem[]>([
        { name: "", quantity: 1, status: "pending" }
    ])
    const [sendEmail, setSendEmail] = useState(true)

    const handleAddItem = () => {
        setItems([...items, { name: "", quantity: 1, status: "pending" }])
    }

    const handleRemoveItem = (index: number) => {
        if (items.length <= 1) return
        setItems(items.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: keyof CustomerOrderItem, value: any) => {
        setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!workshopId) return

        if (!customerName.trim()) {
            toastError("Eingabe fehlt", "Bitte geben Sie einen Kundennamen ein.")
            return
        }

        const validItems = items.filter(item => item.name.trim() !== "")
        if (validItems.length === 0) {
            toastError("Eingabe fehlt", "Bitte fügen Sie mindestens einen Artikel hinzu.")
            return
        }

        setIsSubmitting(true)
        try {
            const token = crypto.randomUUID()
            const { error } = await supabase
                .from("customer_orders")
                .insert({
                    workshop_id: workshopId,
                    customer_name: customerName.trim(),
                    customer_email: customerEmail.trim() || null,
                    customer_phone: customerPhone.trim() || null,
                    items: validItems,
                    status: "open",
                    notes: notes.trim() || null,
                    status_token: token,
                })

            if (error) throw error

            toastSuccess("Bestellung erstellt", "Die Kundenbestellung wurde erfolgreich angelegt.")
            
            if (sendEmail && customerEmail.trim()) {
                // Mock log
                console.log("[Email Simulation] Sending status link to", customerEmail, "Token:", token)
            }

            onSuccess?.()
            onOpenChange(false)
            resetForm()
        } catch (error) {
            console.error(error)
            toastError("Fehler", "Die Bestellung konnte nicht erstellt werden.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const resetForm = () => {
        setCustomerName("")
        setCustomerEmail("")
        setCustomerPhone("")
        setNotes("")
        setItems([{ name: "", quantity: 1, status: "pending" }])
        setSendEmail(true)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden border-none shadow-2xl bg-card">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                        </div>
                        Neue Kundenbestellung
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-0">
                    <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                        {/* Customer Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                                <User className="h-3 w-3" />
                                Kundendaten
                            </div>
                            
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="customer_name" className="text-sm font-semibold">Name des Kunden *</Label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="customer_name"
                                            placeholder="Vor- und Nachname"
                                            className="pl-9 h-11 bg-muted/30 border-border/40 focus:bg-background transition-all"
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="customer_email" className="text-sm font-semibold text-muted-foreground/80">E-Mail Adresse</Label>
                                        <div className="relative group">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                id="customer_email"
                                                type="email"
                                                placeholder="beispiel@mail.de"
                                                className="pl-9 h-11 bg-muted/30 border-border/40 focus:bg-background transition-all"
                                                value={customerEmail}
                                                onChange={e => setCustomerEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="customer_phone" className="text-sm font-semibold text-muted-foreground/80">Telefonnummer</Label>
                                        <div className="relative group">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                id="customer_phone"
                                                placeholder="0123 1234567"
                                                className="pl-9 h-11 bg-muted/30 border-border/40 focus:bg-background transition-all"
                                                value={customerPhone}
                                                onChange={e => setCustomerPhone(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                                    <Package className="h-3 w-3" />
                                    Bestellte Artikel
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleAddItem}
                                    className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/5 text-xs font-bold"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Hinzufügen
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-center group animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Artikelname / Ersatzteil"
                                                value={item.name}
                                                onChange={e => updateItem(index, "name", e.target.value)}
                                                className="h-10 bg-muted/30 border-border/40 focus:bg-background transition-all"
                                                required
                                            />
                                        </div>
                                        <div className="w-20">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={e => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                                                className="h-10 text-center bg-muted/30 border-border/40"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleRemoveItem(index)}
                                            disabled={items.length <= 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Internal Notes */}
                        <div className="space-y-3">
                            <Label htmlFor="notes" className="text-sm font-semibold text-muted-foreground/80">Interne Notizen</Label>
                            <Textarea
                                id="notes"
                                placeholder="Details zur Bestellung, Lieferzeit-Annahmen etc..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="min-h-[100px] bg-muted/30 border-border/40 focus:bg-background transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-border/40 bg-muted/20 space-y-4">
                        {customerEmail.trim() && (
                            <div className="flex items-center space-x-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                <Checkbox
                                    id="send_email"
                                    checked={sendEmail}
                                    onCheckedChange={(checked) => setSendEmail(checked === true)}
                                />
                                <label htmlFor="send_email" className="text-sm font-medium leading-none cursor-pointer text-primary/80">
                                    Bestätigungs-E-Mail mit Status-Link an Kunden senden
                                </label>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                                className="font-semibold"
                            >
                                Abbrechen
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[140px] font-bold shadow-lg shadow-primary/20">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Erstellt...
                                    </>
                                ) : (
                                    "Bestellung anlegen"
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
)
}
