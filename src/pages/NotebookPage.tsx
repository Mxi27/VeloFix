import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useLocation } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { Button } from "@/components/ui/button"
import NotebookEditor from "@/components/notebook/NotebookEditor"
import { Input } from "@/components/ui/input"
import {
    Plus,
    ChevronRight,
    FileText,
    MoreHorizontal,
    Trash2,
    FilePlus,
    Pencil,
    Search,
    Clock,
    FolderPlus,
    Folder,
    BookOpen,
    ArrowLeft,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { motion } from "framer-motion"

// ── Types ────────────────────────────────────────────────────────────────

interface NotebookPage {
    id: string
    workshop_id: string
    parent_id: string | null
    title: string
    content: string
    icon: string | null
    is_folder: boolean
    sort_order: number
    created_by: string | null
    created_at: string
    updated_at: string
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getBreadcrumbs(pages: NotebookPage[], pageId: string): NotebookPage[] {
    const crumbs: NotebookPage[] = []
    let current = pages.find(p => p.id === pageId)
    while (current) {
        crumbs.unshift(current)
        current = current.parent_id ? pages.find(p => p.id === current!.parent_id) : undefined
    }
    return crumbs
}

function getChildren(pages: NotebookPage[], parentId: string | null): NotebookPage[] {
    return pages
        .filter(p => p.parent_id === parentId)
        .sort((a, b) => {
            if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1
            return a.sort_order - b.sort_order
        })
}

// ── Main Component ───────────────────────────────────────────────────────

export default function NotebookPageView() {
    const { workshopId, user } = useAuth()
    const location = useLocation()
    const [pages, setPages] = useState<NotebookPage[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    // Editor state
    const [editTitle, setEditTitle] = useState("")
    const [editContent, setEditContent] = useState("")
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const titleRef = useRef<HTMLInputElement>(null)

    // Rename state
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const renameInputRef = useRef<HTMLInputElement>(null)

    // ── Reset to root when navigating from sidebar ──────────────────────

    useEffect(() => {
        if (location.pathname === "/dashboard/notebook" && !location.search) {
            setSelectedPageId(null)
        }
    }, [location.pathname, location.search])

    const selectedPage = useMemo(() =>
        pages.find(p => p.id === selectedPageId) || null
        , [pages, selectedPageId])

    const breadcrumbs = useMemo(() =>
        selectedPageId ? getBreadcrumbs(pages, selectedPageId) : []
        , [pages, selectedPageId])

    // ── Data Fetching ───────────────────────────────────────────────────

    const fetchPages = useCallback(async () => {
        if (!workshopId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("notebook_pages")
                .select("*")
                .eq("workshop_id", workshopId)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: true })

            if (error) throw error
            setPages(data || [])
        } catch (err: unknown) {
            console.error("Error fetching notebook pages:", err)
            toast.error(`Fehler beim Laden: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`)
        } finally {
            setLoading(false)
        }
    }, [workshopId])

    useEffect(() => { fetchPages() }, [fetchPages])

    // ── Sync editor state when selection changes ────────────────────────

    const lastSelectedPageIdRef = useRef<string | null>(null)

    if (selectedPage && selectedPage.id !== lastSelectedPageIdRef.current) {
        lastSelectedPageIdRef.current = selectedPage.id
        if (!selectedPage.is_folder) {
            setEditTitle(selectedPage.title)
            setEditContent(selectedPage.content || "")
        }
    }

    // ── Auto-Save (debounced) ───────────────────────────────────────────

    const debouncedSave = useCallback((pageId: string, title: string, content: string) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(async () => {
            const { error } = await supabase
                .from("notebook_pages")
                .update({ title, content, updated_at: new Date().toISOString() })
                .eq("id", pageId)

            if (error) {
                toast.error("Fehler beim Speichern")
                console.error(error)
            } else {
                setPages(prev => prev.map(p =>
                    p.id === pageId ? { ...p, title, content, updated_at: new Date().toISOString() } : p
                ))
            }
        }, 500)
    }, [])

    const handleTitleChange = (value: string) => {
        setEditTitle(value)
        if (selectedPageId) debouncedSave(selectedPageId, value, editContent)
    }

    const handleContentChange = (value: string) => {
        setEditContent(value)
        if (selectedPageId) debouncedSave(selectedPageId, editTitle, value)
    }

    // ── CRUD Operations ─────────────────────────────────────────────────

    const createPage = async (parentId: string | null = null, isFolder = false) => {
        if (!workshopId) return

        const siblings = pages.filter(p => p.parent_id === parentId)
        const maxSort = siblings.reduce((max, p) => Math.max(max, p.sort_order), -1)

        const { data, error } = await supabase
            .from("notebook_pages")
            .insert({
                workshop_id: workshopId,
                parent_id: parentId,
                title: isFolder ? "Neuer Ordner" : "Neue Seite",
                content: "",
                is_folder: isFolder,
                sort_order: maxSort + 1,
                created_by: user?.id || null,
            })
            .select()
            .single()

        if (error) {
            toast.error("Fehler beim Erstellen")
            console.error(error)
            return
        }

        setPages(prev => [...prev, data])
        setSelectedPageId(data.id)
        if (!isFolder) {
            setEditTitle(data.title)
            setEditContent(data.content || "")
            setTimeout(() => titleRef.current?.select(), 100)
        }

        toast.success(isFolder ? "Ordner erstellt" : "Seite erstellt")
    }

    const deletePage = async (pageId: string) => {
        const page = pages.find(p => p.id === pageId)
        if (!page) return

        const childCount = pages.filter(p => p.parent_id === pageId).length
        const typeLabel = page.is_folder ? "Ordner" : "Seite"
        const confirmMsg = childCount > 0
            ? `"${page.title}" (${typeLabel}) und ${childCount} Inhalt(e) wirklich löschen?`
            : `"${page.title}" (${typeLabel}) wirklich löschen?`

        if (!confirm(confirmMsg)) return

        const { error } = await supabase
            .from("notebook_pages")
            .delete()
            .eq("id", pageId)

        if (error) {
            toast.error("Fehler beim Löschen")
            console.error(error)
            return
        }

        const idsToRemove = new Set<string>()
        const collectIds = (id: string) => {
            idsToRemove.add(id)
            pages.filter(p => p.parent_id === id).forEach(p => collectIds(p.id))
        }
        collectIds(pageId)

        setPages(prev => prev.filter(p => !idsToRemove.has(p.id)))
        if (selectedPageId && idsToRemove.has(selectedPageId)) {
            setSelectedPageId(page.parent_id || null)
        }
        toast.success("Gelöscht")
    }

    const startRename = (pageId: string) => {
        const page = pages.find(p => p.id === pageId)
        if (!page) return
        setRenamingId(pageId)
        setRenameValue(page.title)
        setTimeout(() => renameInputRef.current?.select(), 50)
    }

    const commitRename = async () => {
        if (!renamingId || !renameValue.trim()) {
            setRenamingId(null)
            return
        }

        const { error } = await supabase
            .from("notebook_pages")
            .update({ title: renameValue.trim(), updated_at: new Date().toISOString() })
            .eq("id", renamingId)

        if (error) {
            toast.error("Fehler beim Umbenennen")
        } else {
            setPages(prev => prev.map(p =>
                p.id === renamingId ? { ...p, title: renameValue.trim(), updated_at: new Date().toISOString() } : p
            ))
            if (selectedPageId === renamingId) setEditTitle(renameValue.trim())
        }
        setRenamingId(null)
    }

    // ── Search filter ───────────────────────────────────────────────────

    const searchResults = useMemo(() => {
        if (!searchTerm) return null
        const term = searchTerm.toLowerCase()
        return pages.filter(p =>
            p.title.toLowerCase().includes(term) || p.content?.toLowerCase().includes(term)
        )
    }, [searchTerm, pages])

    // ── Render Helpers ──────────────────────────────────────────────────

    const navigateBack = () => {
        if (selectedPage?.parent_id) {
            setSelectedPageId(selectedPage.parent_id)
        } else {
            setSelectedPageId(null)
        }
    }

    // Items to show in list view
    const listItems = searchResults || getChildren(pages, selectedPage?.is_folder ? selectedPage.id : null)

    // ── Render ──────────────────────────────────────────────────────────

    // Editing a page
    if (selectedPage && !selectedPage.is_folder) {
        return (
            <PageTransition className="h-full">
                <DashboardLayout>
                    <div className="max-w-3xl mx-auto w-full h-full flex flex-col">
                        <motion.div
                            key={selectedPageId}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col h-full overflow-hidden"
                        >
                            {/* Back + Breadcrumbs */}
                            <div className="flex items-center gap-2 pt-4 pb-2 flex-shrink-0">
                                <button
                                    onClick={navigateBack}
                                    className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 -ml-1 rounded-md hover:bg-muted/30"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                                {breadcrumbs.length > 1 && (
                                    <div className="flex items-center gap-1 text-xs overflow-x-auto scrollbar-none">
                                        {breadcrumbs.slice(0, -1).map((crumb, i) => (
                                            <span key={crumb.id} className="flex items-center gap-1 shrink-0">
                                                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/20" />}
                                                <button
                                                    onClick={() => setSelectedPageId(crumb.id)}
                                                    className="text-muted-foreground/40 hover:text-foreground transition-colors"
                                                >
                                                    {crumb.is_folder && <Folder className="h-3 w-3 inline mr-0.5 opacity-50" />}
                                                    {crumb.title}
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Title */}
                            <div className="pb-1 flex-shrink-0">
                                <input
                                    ref={titleRef}
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => handleTitleChange(e.target.value)}
                                    className="w-full text-2xl md:text-3xl lg:text-4xl leading-tight font-bold tracking-tight bg-transparent border-none outline-none placeholder:text-muted-foreground/20 text-foreground"
                                    placeholder="Ohne Titel"
                                />
                                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground/30">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(selectedPage.updated_at), "dd. MMM, HH:mm", { locale: de })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="px-1 py-0.5 rounded bg-muted/20 border border-border/10 text-[9px] font-mono leading-none">/</span>
                                        Befehle
                                    </span>
                                </div>
                            </div>

                            <div className="my-2 h-px bg-border/30" />

                            {/* Editor */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                                <NotebookEditor
                                    key={selectedPageId}
                                    content={editContent}
                                    onChange={handleContentChange}
                                />
                            </div>
                        </motion.div>
                    </div>
                </DashboardLayout>
            </PageTransition>
        )
    }

    // List view (root, folder, or search)
    return (
        <PageTransition className="h-full">
            <DashboardLayout>
                <div className="max-w-3xl mx-auto w-full">
                    {/* Header */}
                    <div className="pt-4 pb-4">
                        <div className="flex items-center gap-3 mb-4">
                            {selectedPage?.is_folder && (
                                <button
                                    onClick={navigateBack}
                                    className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 -ml-1 rounded-md hover:bg-muted/30"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                            )}
                            <div className="flex-1 min-w-0">
                                {selectedPage?.is_folder ? (
                                    <div className="flex items-center gap-2.5">
                                        <Folder className="h-5 w-5 text-amber-500/70 shrink-0" />
                                        <h1 className="text-xl font-bold tracking-tight truncate">{selectedPage.title}</h1>
                                        <span className="text-xs text-muted-foreground/30 shrink-0">{listItems.length}</span>
                                    </div>
                                ) : (
                                    <h1 className="text-xl font-bold tracking-tight">Notizbuch</h1>
                                )}
                                {!selectedPage?.is_folder && breadcrumbs.length === 0 && (
                                    <p className="text-xs text-muted-foreground/40 mt-0.5">
                                        {pages.filter(p => !p.parent_id).length} Einträge
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                                    onClick={() => createPage(selectedPage?.is_folder ? selectedPage.id : null, true)}
                                >
                                    <FolderPlus className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Ordner</span>
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-8 text-xs gap-1.5"
                                    onClick={() => createPage(selectedPage?.is_folder ? selectedPage.id : null)}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Neue Seite
                                </Button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                            <Input
                                placeholder="Suchen..."
                                className="pl-9 h-9 text-sm bg-muted/20 border-border/30 rounded-lg"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Content List */}
                    {loading ? (
                        <div className="space-y-2 py-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-12 bg-muted/10 animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : listItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 rounded-2xl bg-muted/5 mb-4 border border-border/10">
                                {searchTerm ? (
                                    <Search className="h-8 w-8 text-muted-foreground/20" />
                                ) : (
                                    <BookOpen className="h-8 w-8 text-muted-foreground/20" />
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground/40 mb-1">
                                {searchTerm ? "Keine Ergebnisse" : "Noch keine Seiten"}
                            </p>
                            {!searchTerm && (
                                <p className="text-xs text-muted-foreground/25 mb-6">
                                    Erstelle deine erste Seite oder einen Ordner
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="border border-border/30 rounded-lg overflow-hidden divide-y divide-border/20">
                            {listItems.map(item => (
                                <PageListItem
                                    key={item.id}
                                    page={item}
                                    isRenaming={renamingId === item.id}
                                    renameValue={renameValue}
                                    renameInputRef={renameInputRef}
                                    childCount={pages.filter(p => p.parent_id === item.id).length}
                                    onSelect={() => setSelectedPageId(item.id)}
                                    onCreateSubpage={() => createPage(item.id)}
                                    onCreateFolder={() => createPage(item.id, true)}
                                    onDelete={() => deletePage(item.id)}
                                    onStartRename={() => startRename(item.id)}
                                    onRenameChange={setRenameValue}
                                    onCommitRename={commitRename}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}

// ── Page List Item ───────────────────────────────────────────────────────

function PageListItem({ page, isRenaming, renameValue, renameInputRef, childCount, onSelect, onCreateSubpage, onCreateFolder, onDelete, onStartRename, onRenameChange, onCommitRename }: {
    page: NotebookPage
    isRenaming: boolean
    renameValue: string
    renameInputRef: React.RefObject<HTMLInputElement | null>
    childCount: number
    onSelect: () => void
    onCreateSubpage: () => void
    onCreateFolder: () => void
    onDelete: () => void
    onStartRename: () => void
    onRenameChange: (value: string) => void
    onCommitRename: () => void
}) {
    return (
        <div
            className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
            onClick={onSelect}
        >
            {/* Icon */}
            {page.is_folder ? (
                <Folder className="h-4 w-4 shrink-0 text-amber-500/60" />
            ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground/30" />
            )}

            {/* Title */}
            <div className="flex-1 min-w-0">
                {isRenaming ? (
                    <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => onRenameChange(e.target.value)}
                        onBlur={onCommitRename}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") onCommitRename()
                            if (e.key === "Escape") { onRenameChange(""); onCommitRename() }
                        }}
                        className="w-full bg-background border border-primary/30 rounded-md px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary/40"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{page.title}</span>
                        {page.is_folder && childCount > 0 && (
                            <span className="text-[10px] text-muted-foreground/30 tabular-nums">{childCount}</span>
                        )}
                    </div>
                )}
                <span className="text-[10px] text-muted-foreground/25 mt-0.5 block">
                    {format(new Date(page.updated_at), "dd. MMM", { locale: de })}
                </span>
            </div>

            {/* Actions */}
            <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground/30 hover:text-foreground transition-colors"
                    onClick={(e) => { e.stopPropagation(); onCreateSubpage() }}
                    title="Unterseite erstellen"
                >
                    <FilePlus className="h-3.5 w-3.5" />
                </button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground/30 hover:text-foreground transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartRename() }} className="text-xs gap-2">
                            <Pencil className="h-3.5 w-3.5" /> Umbenennen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateSubpage() }} className="text-xs gap-2">
                            <FilePlus className="h-3.5 w-3.5" /> Unterseite erstellen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateFolder() }} className="text-xs gap-2">
                            <FolderPlus className="h-3.5 w-3.5" /> Unterordner erstellen
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-xs gap-2 text-red-600">
                            <Trash2 className="h-3.5 w-3.5" /> Löschen
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Arrow */}
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/15 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
        </div>
    )
}
