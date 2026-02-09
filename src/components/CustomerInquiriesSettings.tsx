import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, AlertCircle, RefreshCw, CheckCircle2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type IntakeRequest = {
    id: string;
    created_at: string;
    customer_name: string;
    customer_email: string;
    intake_type: string;
    status: string;
    due_date: string | null;
    bike_model: string | null;
};

export function CustomerInquiriesSettings() {
    const { workshopId } = useAuth();
    const [inquiries, setInquiries] = useState<IntakeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [retentionDays, setRetentionDays] = useState<string>("null");
    const [cleaning, setCleaning] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [selectedInquiries, setSelectedInquiries] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (workshopId) {
            fetchInquiries();
            fetchSettings();
        }
    }, [workshopId]);

    const fetchInquiries = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("intake_requests")
            .select("*")
            .eq("workshop_id", workshopId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching inquiries:", error);
            toast.error("Fehler beim Laden der Anfragen");
        } else {
            setInquiries(data || []);
            setSelectedInquiries(new Set()); // Reset selection on fetch
        }
        setLoading(false);
    };

    const fetchSettings = async () => {
        const { data, error } = await supabase
            .from("workshops")
            .select("inquiry_retention_days")
            .eq("id", workshopId)
            .single();

        if (error) {
            console.error("Error fetching settings:", error);
        } else if (data) {
            setRetentionDays(data.inquiry_retention_days?.toString() || "null");
        }
    };

    const saveRetentionSettings = async (value: string) => {
        if (!workshopId) return;
        setSavingSettings(true);
        const retention = value === "null" ? null : parseInt(value);

        const { error } = await supabase
            .from("workshops")
            .update({ inquiry_retention_days: retention })
            .eq("id", workshopId);

        if (error) {
            toast.error("Fehler beim Speichern der Einstellungen");
            console.error(error);
        } else {
            toast.success("Einstellungen gespeichert");
            setRetentionDays(value);
        }
        setSavingSettings(false);
    };

    const handleDelete = async (id: string | string[]) => {
        const ids = Array.isArray(id) ? id : [id];
        const { error } = await supabase.from("intake_requests").delete().in("id", ids);

        if (error) {
            toast.error("Fehler beim Löschen");
            console.error(error);
        } else {
            toast.success(ids.length > 1 ? `${ids.length} Anfragen gelöscht` : "Anfrage gelöscht");
            setInquiries(inquiries.filter((i) => !ids.includes(i.id)));
            setSelectedInquiries(new Set(Array.from(selectedInquiries).filter(sid => !ids.includes(sid))));
        }
    };

    const handleRunCleanup = async () => {
        setCleaning(true);
        try {
            const { error } = await supabase.rpc('delete_old_intake_requests');
            if (error) throw error;
            toast.success("Bereinigung erfolgreich durchgeführt");
            fetchInquiries();
        } catch (error: any) {
            console.error("Cleanup error:", error);
            toast.error("Fehler bei der Bereinigung", { description: error.message });
        } finally {
            setCleaning(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedInquiries);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedInquiries(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedInquiries.size === inquiries.length) {
            setSelectedInquiries(new Set());
        } else {
            setSelectedInquiries(new Set(inquiries.map(i => i.id)));
        }
    };

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        if (currentStatus !== 'imported') return;

        const { error } = await supabase
            .from('intake_requests')
            .update({ status: 'pending' })
            .eq('id', id);

        if (error) {
            toast.error("Fehler beim Ändern des Status");
            console.error(error);
        } else {
            toast.success("Status auf 'Offen' zurückgesetzt");
            setInquiries(inquiries.map(i => i.id === id ? { ...i, status: 'pending' } : i));
        }
    };


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Automatische Bereinigung</CardTitle>
                    <CardDescription>
                        Legen Sie fest, wie lange Kundenanfragen gespeichert bleiben sollen.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="space-y-2 w-full sm:w-[300px]">
                            <label className="text-sm font-medium">Aufbewahrungsdauer</label>
                            <Select
                                value={retentionDays}
                                onValueChange={saveRetentionSettings}
                                disabled={savingSettings}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Wählen Sie eine Dauer" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">Nie automatisch löschen</SelectItem>
                                    <SelectItem value="7">7 Tage</SelectItem>
                                    <SelectItem value="14">14 Tage</SelectItem>
                                    <SelectItem value="30">30 Tage</SelectItem>
                                    <SelectItem value="90">90 Tage</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleRunCleanup}
                            disabled={cleaning}
                            className="w-full sm:w-auto"
                        >
                            {cleaning ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Jetzt bereinigen
                        </Button>
                    </div>

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Hinweis</AlertTitle>
                        <AlertDescription>
                            Die automatische Bereinigung entfernt Anfragen, die älter als der gewählte Zeitraum sind.
                            Dies kann nicht rückgängig gemacht werden.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Alle Anfragen</CardTitle>
                            <CardDescription>
                                Verwalten Sie hier alle offenen und importierten Anfragen.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedInquiries.size > 0 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            {selectedInquiries.size} löschen
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Anfragen löschen?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Möchten Sie {selectedInquiries.size} ausgewählte Anfragen wirklich löschen?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDelete(Array.from(selectedInquiries))}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                Löschen
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            <Button variant="ghost" size="icon" onClick={fetchInquiries} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedInquiries.size === inquiries.length && inquiries.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Datum</TableHead>
                                    <TableHead>Kunde</TableHead>
                                    <TableHead>Typ</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aktionen</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inquiries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            {loading ? "Laden..." : "Keine Anfragen gefunden."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    inquiries.map((inquiry) => (
                                        <TableRow key={inquiry.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedInquiries.has(inquiry.id)}
                                                    onCheckedChange={() => toggleSelection(inquiry.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        {format(new Date(inquiry.created_at), "dd.MM.yyyy", { locale: de })}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(inquiry.created_at), "HH:mm", { locale: de })} Uhr
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{inquiry.customer_name}</span>
                                                    <span className="text-xs text-muted-foreground">{inquiry.customer_email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {inquiry.intake_type === 'leasing' ? 'Leasing' : 'Standard'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={inquiry.status === 'imported' ? 'secondary' : 'default'}
                                                    className="capitalize"
                                                >
                                                    {inquiry.status === 'imported' ? (
                                                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Importiert</>
                                                    ) : (
                                                        "Offen"
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {inquiry.status === 'imported' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleStatusToggle(inquiry.id, inquiry.status)}
                                                                        className="text-muted-foreground hover:text-foreground"
                                                                    >
                                                                        <RotateCcw className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Status auf "Offen" zurücksetzen</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Anfrage löschen?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Möchten Sie die Anfrage von <strong>{inquiry.customer_name}</strong> wirklich löschen?
                                                                    Diese Aktion kann nicht widerrufen werden.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(inquiry.id)} className="bg-destructive hover:bg-destructive/90">
                                                                    Löschen
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
