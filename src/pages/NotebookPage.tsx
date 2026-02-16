import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { Button } from "@/components/ui/button"
import NotebookEditor from "@/components/notebook/NotebookEditor"
import { Input } from "@/components/ui/input"
import {
    Plus,
    ChevronRight,
    ChevronDown,
    FileText,
    MoreHorizontal,
    Trash2,
    FilePlus,
    Pencil,
    Search,
    Clock,
    FolderOpen,
    FolderPlus,
    Folder,
    StickyNote,
    BookOpen,
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
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

// ── Types ───────────────────────────────────────────────────────────────

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

interface TreeNode extends NotebookPage {
    children: TreeNode[]
}

// ── Slash Command Definitions ───────────────────────────────────────────

// ── Slash Command Definitions moved to NotebookEditor ───────────────────

// ── Helpers ─────────────────────────────────────────────────────────────

function buildTree(pages: NotebookPage[]): TreeNode[] {
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    pages.forEach(p => map.set(p.id, { ...p, children: [] }))

    pages.forEach(p => {
        const node = map.get(p.id)!
        if (p.parent_id && map.has(p.parent_id)) {
            map.get(p.parent_id)!.children.push(node)
        } else {
            roots.push(node)
        }
    })

    // Sort: folders first, then by sort_order
    const sortChildren = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1
            return a.sort_order - b.sort_order
        })
        nodes.forEach(n => sortChildren(n.children))
    }
    sortChildren(roots)

    return roots
}

function getBreadcrumbs(pages: NotebookPage[], pageId: string): NotebookPage[] {
    const crumbs: NotebookPage[] = []
    let current = pages.find(p => p.id === pageId)
    while (current) {
        crumbs.unshift(current)
        current = current.parent_id ? pages.find(p => p.id === current!.parent_id) : undefined
    }
    return crumbs
}

// ── Main Component ──────────────────────────────────────────────────────

export default function NotebookPageView() {
    const { workshopId, user } = useAuth()
    const [pages, setPages] = useState<NotebookPage[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [searchTerm, setSearchTerm] = useState("")

    // Editor state
    const [editTitle, setEditTitle] = useState("")
    const [editContent, setEditContent] = useState("")
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const titleRef = useRef<HTMLInputElement>(null)

    // Inline rename state
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const renameInputRef = useRef<HTMLInputElement>(null)

    const selectedPage = useMemo(() =>
        pages.find(p => p.id === selectedPageId) || null
        , [pages, selectedPageId])

    const tree = useMemo(() => buildTree(pages), [pages])

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Error fetching notebook pages:", err)
            toast.error(`Fehler beim Laden: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }, [workshopId])

    useEffect(() => { fetchPages() }, [fetchPages])

    // ── Auto-select first page ──────────────────────────────────────────

    useEffect(() => {
        if (!selectedPageId && pages.length > 0) {
            const firstPage = pages.find(p => !p.parent_id && !p.is_folder)
                || pages.find(p => !p.parent_id)
            if (firstPage) setSelectedPageId(firstPage.id)
        }
    }, [pages, selectedPageId])

    // ── Sync editor state when selection changes ────────────────────────

    // Keep track of the last selected page ID to avoid resetting state on auto-save updates
    const lastSelectedPageIdRef = useRef<string | null>(null)

    useEffect(() => {
        // Only update if the page ID has changed (navigation)
        // or if it's the first load of the content
        if (selectedPage && selectedPage.id !== lastSelectedPageIdRef.current) {
            if (!selectedPage.is_folder) {
                setEditTitle(selectedPage.title)
                setEditContent(selectedPage.content || "")
            }
            lastSelectedPageIdRef.current = selectedPage.id
        }
    }, [selectedPage])

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
        }, 800)
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

        if (!isFolder) {
            setSelectedPageId(data.id)
            setTimeout(() => titleRef.current?.select(), 100)
        }

        if (parentId) {
            setExpandedIds(prev => new Set([...prev, parentId]))
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
        if (selectedPageId && idsToRemove.has(selectedPageId)) setSelectedPageId(null)
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

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // ── Search filter ───────────────────────────────────────────────────

    const filteredTree = useMemo(() => {
        if (!searchTerm) return tree

        const matchingIds = new Set<string>()
        const term = searchTerm.toLowerCase()

        pages.forEach(p => {
            if (p.title.toLowerCase().includes(term) || p.content?.toLowerCase().includes(term)) {
                let current: NotebookPage | undefined = p
                while (current) {
                    matchingIds.add(current.id)
                    current = current.parent_id ? pages.find(pp => pp.id === current!.parent_id) : undefined
                }
            }
        })

        const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
            return nodes
                .filter(n => matchingIds.has(n.id))
                .map(n => ({ ...n, children: filterNodes(n.children) }))
        }

        return filterNodes(tree)
    }, [tree, searchTerm, pages])

    // ── Render ──────────────────────────────────────────────────────────

    return (
        <PageTransition className="h-full">
            <DashboardLayout fullWidth>
                {/* Main Content: Sidebar + Editor — full height, no header banner */}
                <div className="flex gap-0 h-full overflow-hidden w-full">

                    {/* ── Tree Sidebar ── */}
                    <div className="flex-shrink-0 w-[260px] bg-card border border-border/50 border-r-0 overflow-hidden flex flex-col">
                        {/* Search */}
                        <div className="p-3 border-b border-border/30">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Seiten suchen..."
                                    className="pl-8 h-8 text-xs bg-muted/30 border-border/30 rounded-lg"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Pages Tree */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-muted/10 hover:scrollbar-thumb-muted/20">
                            {loading ? (
                                <div className="space-y-2 p-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-7 bg-muted/20 animate-pulse rounded-lg" />
                                    ))}
                                </div>
                            ) : filteredTree.length > 0 ? (
                                <AnimatePresence mode="popLayout">
                                    {filteredTree.map(node => (
                                        <TreeItem
                                            key={node.id}
                                            node={node}
                                            depth={0}
                                            selectedId={selectedPageId}
                                            expandedIds={expandedIds}
                                            renamingId={renamingId}
                                            renameValue={renameValue}
                                            renameInputRef={renameInputRef}
                                            onSelect={(id) => {
                                                const page = pages.find(p => p.id === id)
                                                if (page?.is_folder) {
                                                    toggleExpand(id)
                                                } else {
                                                    setSelectedPageId(id)
                                                }
                                            }}
                                            onToggleExpand={toggleExpand}
                                            onCreateSubpage={createPage}
                                            onCreateFolder={(parentId) => createPage(parentId, true)}
                                            onDelete={deletePage}
                                            onStartRename={startRename}
                                            onRenameChange={setRenameValue}
                                            onCommitRename={commitRename}
                                        />
                                    ))}
                                </AnimatePresence>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                    <div className="p-4 rounded-2xl bg-muted/20 mb-4">
                                        <StickyNote className="h-8 w-8 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-sm text-muted-foreground/60 mb-1">
                                        {searchTerm ? "Keine Ergebnisse" : "Noch keine Seiten"}
                                    </p>
                                    {!searchTerm && (
                                        <p className="text-xs text-muted-foreground/40">
                                            Erstelle deine erste Seite
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bottom Actions — pinned at bottom, always visible */}
                        <div className="flex-shrink-0 p-2 border-t border-border/30 space-y-0.5 bg-card z-10">
                            <Button
                                variant="ghost"
                                className="w-full h-7 text-xs text-muted-foreground hover:text-foreground justify-start gap-2 rounded-lg"
                                onClick={() => createPage(null)}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Neue Seite
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full h-7 text-xs text-muted-foreground hover:text-foreground justify-start gap-2 rounded-lg"
                                onClick={() => createPage(null, true)}
                            >
                                <FolderPlus className="h-3.5 w-3.5" />
                                Neuer Ordner
                            </Button>
                        </div>
                    </div>

                    {/* ── Editor Area ── */}
                    <div className="flex-1 min-w-0">
                        {selectedPage && !selectedPage.is_folder ? (
                            <motion.div
                                key={selectedPageId}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15 }}
                                className="bg-card border border-l-0 border-border/50 rounded-r-2xl flex flex-col h-full overflow-hidden"
                            >
                                {/* Breadcrumbs - Fixed at top */}
                                {breadcrumbs.length > 1 && (
                                    <div className="px-12 pt-6 flex-shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground/50">
                                        {breadcrumbs.map((crumb, i) => (
                                            <span key={crumb.id} className="flex items-center gap-1.5">
                                                {i > 0 && <ChevronRight className="h-3 w-3" />}
                                                <button
                                                    className={cn(
                                                        "hover:text-foreground transition-colors",
                                                        i === breadcrumbs.length - 1 && "text-muted-foreground font-medium"
                                                    )}
                                                    onClick={() => {
                                                        const p = pages.find(pp => pp.id === crumb.id)
                                                        if (p && !p.is_folder) setSelectedPageId(crumb.id)
                                                    }}
                                                >
                                                    {crumb.is_folder && <Folder className="h-3 w-3 inline mr-1" />}
                                                    {crumb.title}
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Title Area - Fixed at top */}
                                <div className="px-12 pt-8 pb-4 max-w-4xl flex-shrink-0">
                                    <input
                                        ref={titleRef}
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        className="w-full text-4xl font-bold tracking-tight bg-transparent border-none outline-none placeholder:text-muted-foreground/20"
                                        placeholder="Ohne Titel"
                                    />
                                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground/35">
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(selectedPage.updated_at), "dd. MMMM yyyy, HH:mm 'Uhr'", { locale: de })}
                                        </span>
                                        <span className="text-muted-foreground/20">·</span>
                                        <span>Tipp: Tippe <kbd className="px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground/50 font-mono text-[10px]">/</kbd> für Befehle</span>
                                    </div>
                                </div>

                                <div className="mx-12 max-w-4xl flex-shrink-0">
                                    <div className="h-px bg-border/20" />
                                </div>

                                {/* Content Editor - SCROLLABLE AREA */}
                                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted/10 hover:scrollbar-thumb-muted/20">
                                    <div className="px-12 pb-12 relative max-w-4xl">
                                        <NotebookEditor
                                            key={selectedPageId}
                                            content={editContent}
                                            onChange={handleContentChange}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ) : selectedPage?.is_folder ? (
                            /* Folder Selected View */
                            <motion.div
                                key={selectedPageId}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15 }}
                                className="bg-card border border-l-0 border-border/50 rounded-r-2xl flex flex-col h-full p-12 overflow-y-auto"
                            >
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <FolderOpen className="h-6 w-6 text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight">{selectedPage.title}</h2>
                                        <p className="text-sm text-muted-foreground/50 mt-0.5">
                                            {pages.filter(p => p.parent_id === selectedPage.id).length} Einträge
                                        </p>
                                    </div>
                                </div>

                                {/* Folder Contents Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {pages.filter(p => p.parent_id === selectedPage.id)
                                        .sort((a, b) => {
                                            if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1
                                            return a.sort_order - b.sort_order
                                        })
                                        .map(child => (
                                            <button
                                                key={child.id}
                                                onClick={() => {
                                                    if (child.is_folder) {
                                                        setSelectedPageId(child.id)
                                                        setExpandedIds(prev => new Set([...prev, child.id]))
                                                    } else {
                                                        setSelectedPageId(child.id)
                                                    }
                                                }}
                                                className="p-4 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/30 hover:border-primary/20 transition-all text-left group"
                                            >
                                                {child.is_folder ? (
                                                    <Folder className="h-5 w-5 text-amber-500 mb-2" />
                                                ) : (
                                                    <FileText className="h-5 w-5 text-primary/60 mb-2" />
                                                )}
                                                <div className="font-medium text-sm truncate">{child.title}</div>
                                                <div className="text-[11px] text-muted-foreground/40 mt-1">
                                                    {format(new Date(child.updated_at), "dd. MMM yyyy", { locale: de })}
                                                </div>
                                            </button>
                                        ))
                                    }

                                    {/* Add buttons inside folder */}
                                    <button
                                        onClick={() => createPage(selectedPage.id)}
                                        className="p-4 rounded-xl border-2 border-dashed border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 min-h-[100px] text-muted-foreground/40 hover:text-primary"
                                    >
                                        <Plus className="h-5 w-5" />
                                        <span className="text-xs font-medium">Neue Seite</span>
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="bg-card border border-l-0 border-border/50 rounded-r-2xl flex flex-col items-center justify-center h-full min-h-[600px]">
                                <div className="p-8 rounded-3xl bg-gradient-to-br from-primary/5 to-amber-500/5 mb-8">
                                    <BookOpen className="h-14 w-14 text-muted-foreground/15" />
                                </div>
                                <h3 className="text-xl font-semibold text-muted-foreground/30 mb-3">
                                    Keine Seite ausgewählt
                                </h3>
                                <p className="text-sm text-muted-foreground/25 mb-8 text-center max-w-sm leading-relaxed">
                                    Wähle eine Seite aus der Seitenleiste oder erstelle eine neue.
                                </p>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => createPage(null, true)}
                                        variant="outline"
                                        className="rounded-xl gap-2 border-border/40"
                                    >
                                        <FolderPlus className="h-4 w-4" />
                                        Ordner
                                    </Button>
                                    <Button
                                        onClick={() => createPage(null)}
                                        className="rounded-xl gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Neue Seite
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}

// ── Tree Item Component ─────────────────────────────────────────────────

interface TreeItemProps {
    node: TreeNode
    depth: number
    selectedId: string | null
    expandedIds: Set<string>
    renamingId: string | null
    renameValue: string
    renameInputRef: React.RefObject<HTMLInputElement | null>
    onSelect: (id: string) => void
    onToggleExpand: (id: string) => void
    onCreateSubpage: (parentId: string) => void
    onCreateFolder: (parentId: string) => void
    onDelete: (id: string) => void
    onStartRename: (id: string) => void
    onRenameChange: (value: string) => void
    onCommitRename: () => void
}

function TreeItem({
    node,
    depth,
    selectedId,
    expandedIds,
    renamingId,
    renameValue,
    renameInputRef,
    onSelect,
    onToggleExpand,
    onCreateSubpage,
    onCreateFolder,
    onDelete,
    onStartRename,
    onRenameChange,
    onCommitRename,
}: TreeItemProps) {
    const isExpanded = expandedIds.has(node.id)
    const isSelected = selectedId === node.id
    const hasChildren = node.children.length > 0
    const isRenaming = renamingId === node.id
    const isFolder = node.is_folder

    return (
        <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
        >
            <div
                className={cn(
                    "group flex items-center gap-1 h-7 rounded-lg px-1.5 cursor-pointer transition-all duration-150 text-[13px]",
                    isSelected
                        ? isFolder
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
                            : "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                style={{ paddingLeft: `${depth * 16 + 6}px` }}
                onClick={() => onSelect(node.id)}
            >
                {/* Expand/Collapse */}
                {(hasChildren || isFolder) ? (
                    <button
                        className="flex-shrink-0 h-4 w-4 flex items-center justify-center rounded hover:bg-muted/80 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggleExpand(node.id)
                        }}
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                        ) : (
                            <ChevronRight className="h-3 w-3" />
                        )}
                    </button>
                ) : (
                    <span className="w-4 h-4 flex-shrink-0" />
                )}

                {/* Icon */}
                {isFolder ? (
                    isExpanded ? (
                        <FolderOpen className={cn("h-3.5 w-3.5 flex-shrink-0", isSelected ? "text-amber-500" : "text-amber-500/50")} />
                    ) : (
                        <Folder className={cn("h-3.5 w-3.5 flex-shrink-0", isSelected ? "text-amber-500" : "text-amber-500/50")} />
                    )
                ) : (
                    <FileText className={cn("h-3.5 w-3.5 flex-shrink-0", isSelected ? "text-primary" : "text-muted-foreground/40")} />
                )}

                {/* Title or Rename Input */}
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
                        className="flex-1 min-w-0 bg-background border border-primary/30 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary/40"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="flex-1 min-w-0 truncate">
                        {node.title}
                    </span>
                )}

                {/* Hover Actions */}
                {!isRenaming && (
                    <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/80 text-muted-foreground/40 hover:text-foreground transition-colors"
                            onClick={(e) => {
                                e.stopPropagation()
                                onCreateSubpage(node.id)
                            }}
                            title="Unterseite erstellen"
                        >
                            <FilePlus className="h-3 w-3" />
                        </button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/80 text-muted-foreground/40 hover:text-foreground transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal className="h-3 w-3" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onStartRename(node.id) }}
                                    className="text-xs gap-2"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Umbenennen
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onCreateSubpage(node.id) }}
                                    className="text-xs gap-2"
                                >
                                    <FilePlus className="h-3.5 w-3.5" />
                                    Unterseite erstellen
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onCreateFolder(node.id) }}
                                    className="text-xs gap-2"
                                >
                                    <FolderPlus className="h-3.5 w-3.5" />
                                    Unterordner erstellen
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onDelete(node.id) }}
                                    className="text-xs gap-2 text-red-600"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Löschen
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            {/* Children */}
            <AnimatePresence>
                {(hasChildren || isFolder) && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.12 }}
                    >
                        {hasChildren ? node.children.map(child => (
                            <TreeItem
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                selectedId={selectedId}
                                expandedIds={expandedIds}
                                renamingId={renamingId}
                                renameValue={renameValue}
                                renameInputRef={renameInputRef}
                                onSelect={onSelect}
                                onToggleExpand={onToggleExpand}
                                onCreateSubpage={onCreateSubpage}
                                onCreateFolder={onCreateFolder}
                                onDelete={onDelete}
                                onStartRename={onStartRename}
                                onRenameChange={onRenameChange}
                                onCommitRename={onCommitRename}
                            />
                        )) : (
                            <div
                                className="text-[11px] text-muted-foreground/30 py-2 text-center"
                                style={{ paddingLeft: `${(depth + 1) * 16 + 6}px` }}
                            >
                                Leer
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
