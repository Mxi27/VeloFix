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
    FolderOpen,
    FolderPlus,
    Folder,
    StickyNote,
    BookOpen,
    GripVertical,
    ChevronLeft,
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
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    type DragEndEvent,
    type DragOverEvent,
} from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// ── Helpers ─────────────────────────────────────────────────────────────

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
    const location = useLocation()
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

    // Drag & Drop state - track hovered folder for highlighting
    const [draggedOverFolderId, setDraggedOverFolderId] = useState<string | null>(null)

    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const renameInputRef = useRef<HTMLInputElement>(null)

    // ── Reset to root when navigating from sidebar ────────────────────────

    useEffect(() => {
        // Check if we should reset to root (when clicking sidebar link without search params)
        if (location.pathname === "/dashboard/notebook" && !location.search) {
            setSelectedPageId(null)
            setExpandedIds(new Set())
        }
    }, [location.pathname, location.search])

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
            // Only auto-select on desktop
            if (typeof window !== "undefined" && window.innerWidth < 1024) return

            const firstPage = pages.find(p => !p.parent_id && !p.is_folder)
                || pages.find(p => !p.parent_id)
            if (firstPage) setSelectedPageId(firstPage.id)
        }
    }, [pages, selectedPageId])

    // ── Sync editor state when selection changes ────────────────────────

    // Keep track of the last selected page ID to avoid resetting state on auto-save updates
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
                // CRITICAL: Update pages state immediately to reflect changes in UI
                setPages(prev => prev.map(p =>
                    p.id === pageId ? { ...p, title, content, updated_at: new Date().toISOString() } : p
                ))
            }
        }, 500) // Reduced from 800ms for snappier feel
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

        // CRITICAL: Add to pages state immediately
        setPages(prev => [...prev, data])

        if (!isFolder) {
            setSelectedPageId(data.id)
            // Initialize editor state for new page
            setEditTitle(data.title)
            setEditContent(data.content || "")
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

    // ── Drag & Drop Handlers ─────────────────────────────────────────────

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragStart = useCallback(() => {
        // Could add visual feedback here
    }, [])

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event
        if (!over) {
            setDraggedOverFolderId(null)
            return
        }

        const activePage = pages.find(p => p.id === active.id)
        const overPage = pages.find(p => p.id === over.id)

        if (!activePage || !overPage) return

        // Don't allow dropping a parent into its own descendant
        const isDescendant = (parentId: string, childId: string): boolean => {
            const parent = pages.find(p => p.id === parentId)
            if (!parent) return false
            if (parent.id === childId) return true
            if (parent.parent_id) return isDescendant(parent.parent_id, childId)
            return false
        }

        if (isDescendant(activePage.id, overPage.id)) {
            setDraggedOverFolderId(null)
            return
        }

        // Highlight folder if hovering over a folder
        if (overPage.is_folder) {
            setDraggedOverFolderId(overPage.id)
        } else {
            setDraggedOverFolderId(null)
        }
    }, [pages])

    // ── Breadcrumb Navigation Handler ────────────────────────────────────

    const handleBreadcrumbClick = useCallback((crumb: NotebookPage) => {
        if (!crumb.is_folder) {
            // For pages, just select them
            setSelectedPageId(crumb.id)
        } else {
            // For folders, select the folder (shows folder view)
            setSelectedPageId(crumb.id)
            setExpandedIds(prev => new Set([...prev, crumb.id]))
        }
    }, [])

    // Breadcrumb drop handler - move item to breadcrumb folder level
    const handleBreadcrumbDrop = useCallback(async (crumb: NotebookPage, draggedPageId: string) => {
        const draggedPage = pages.find(p => p.id === draggedPageId)
        if (!draggedPage) return

        // Don't allow dropping a parent into its own descendant
        const isDescendant = (parentId: string, childId: string): boolean => {
            const parent = pages.find(p => p.id === parentId)
            if (!parent) return false
            if (parent.id === childId) return true
            if (parent.parent_id) return isDescendant(parent.parent_id, childId)
            return false
        }

        if (isDescendant(crumb.id, draggedPageId)) {
            toast.error("Kann Ordner nicht in sich selbst verschieben")
            return
        }

        // Only folders can accept items
        if (!crumb.is_folder) {
            toast.error("Nur Ordner können Elemente aufnehmen")
            return
        }

        const newParentId = crumb.id

        // Optimistic update
        const oldPages = [...pages]
        setPages(prev => prev.map(p =>
            p.id === draggedPage.id
                ? { ...p, parent_id: newParentId }
                : p
        ))

        const { error } = await supabase
            .from("notebook_pages")
            .update({ parent_id: newParentId })
            .eq("id", draggedPage.id)

        if (error) {
            toast.error("Fehler beim Verschieben")
            setPages(oldPages)
        } else {
            toast.success(`Nach "${crumb.title}" verschoben`)
            setExpandedIds(prev => new Set([...prev, newParentId]))
        }

        setDraggedOverFolderId(null)
    }, [pages])

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event

        // Clear drag over state
        setDraggedOverFolderId(null)

        if (!over || active.id === over.id) return

        const activePage = pages.find(p => p.id === active.id)
        if (!activePage) return

        // Check if dropping on breadcrumb
        if (over.id.toString().startsWith('breadcrumb-')) {
            const breadcrumbId = over.id.toString().replace('breadcrumb-', '')
            const breadcrumbPage = pages.find(p => p.id === breadcrumbId)

            if (breadcrumbPage && breadcrumbPage.is_folder) {
                await handleBreadcrumbDrop(breadcrumbPage, activePage.id)
            }
            return
        }

        const overPage = pages.find(p => p.id === over.id)
        if (!overPage) return

        // Don't allow dropping a parent into its own descendant
        const isDescendant = (parentId: string, childId: string): boolean => {
            const parent = pages.find(p => p.id === parentId)
            if (!parent) return false
            if (parent.id === childId) return true
            if (parent.parent_id) return isDescendant(parent.parent_id, childId)
            return false
        }

        if (isDescendant(activePage.id, overPage.id)) {
            toast.error("Kann Ordner nicht in sich selbst verschieben")
            return
        }

        // MOVE LOGIC: If dropped on a folder, move into it. Otherwise, keep same parent.
        const newParentId = overPage.is_folder ? overPage.id : overPage.parent_id

        // Optimistic update
        const oldPages = [...pages]
        setPages(prev => prev.map(p =>
            p.id === activePage.id
                ? { ...p, parent_id: newParentId }
                : p
        ))

        // Update in database
        const { error } = await supabase
            .from("notebook_pages")
            .update({ parent_id: newParentId })
            .eq("id", activePage.id)

        if (error) {
            toast.error("Fehler beim Verschieben")
            setPages(oldPages) // Revert
        } else {
            const targetName = newParentId
                ? pages.find(p => p.id === newParentId)?.title || "Ordner"
                : "Root"
            toast.success(`Nach "${targetName}" verschoben`)

            // Auto-expand the target folder if needed
            if (newParentId) {
                setExpandedIds(prev => new Set([...prev, newParentId]))
            }
        }
    }, [pages, handleBreadcrumbDrop])

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
                <div className="flex gap-0 h-full overflow-hidden w-full relative">

                    {/* ── Tree Sidebar (Desktop Only) ── */}
                    <div className="hidden lg:flex flex-shrink-0 w-[320px] xl:w-[350px] bg-background/90 backdrop-blur-2xl border-r border-border/20 overflow-hidden flex-col z-10 transition-all duration-300">
                        {/* Search */}
                        <div className="p-5 border-b border-border/10">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary/50 transition-colors" />
                                <Input
                                    placeholder="Suchen..."
                                    className="pl-9 h-9 text-xs bg-muted/20 border-transparent focus:bg-background focus:border-primary/20 focus:ring-1 focus:ring-primary/20 rounded-xl transition-all shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Pages Tree */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-transparent hover:scrollbar-thumb-muted/10">
                            {loading ? (
                                <div className="space-y-2 px-2 py-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-8 bg-muted/10 animate-pulse rounded-lg" />
                                    ))}
                                </div>
                            ) : filteredTree.length > 0 ? (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCorners}
                                    onDragStart={handleDragStart}
                                    onDragOver={handleDragOver}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={filteredTree.map(n => n.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <AnimatePresence mode="popLayout">
                                            {filteredTree.map(node => (
                                                <SortableTreeItem
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
                                                            setSelectedPageId(id)
                                                            setExpandedIds(prev => {
                                                                const newSet = new Set(prev)
                                                                newSet.add(id)
                                                                return newSet
                                                            })
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
                                                    pages={pages}
                                                    draggedOverFolderId={draggedOverFolderId}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </SortableContext>
                                </DndContext>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-6 relative">
                                    {/* Ambient Glow */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-50 z-0 pointer-events-none" />

                                    <div className="p-5 rounded-2xl bg-muted/5 mb-5 border border-border/10 relative z-10 shadow-sm backdrop-blur-sm">
                                        <StickyNote className="h-8 w-8 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground/50 mb-1 relative z-10">
                                        {searchTerm ? "Keine Ergebnisse" : "Noch keine Seiten"}
                                    </p>
                                    {!searchTerm && (
                                        <p className="text-xs text-muted-foreground/30 relative z-10">
                                            Erstelle deine erste Seite
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bottom Actions — pinned at bottom, always visible */}
                        <div className="flex-shrink-0 p-4 border-t border-border/10 space-y-2 bg-background/50 backdrop-blur-md z-10">
                            <Button
                                variant="ghost"
                                className="w-full h-9 text-xs font-medium text-muted-foreground hover:text-foreground justify-start gap-2.5 rounded-xl hover:bg-muted/30 transition-colors"
                                onClick={() => createPage(null)}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Neue Seite
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full h-9 text-xs font-medium text-muted-foreground hover:text-foreground justify-start gap-2.5 rounded-xl hover:bg-muted/30 transition-colors"
                                onClick={() => createPage(null, true)}
                            >
                                <FolderPlus className="h-3.5 w-3.5" />
                                Neuer Ordner
                            </Button>
                        </div>
                    </div>

                    {/* ── Editor Area / Mobile Main Content ── */}
                    <div className="flex-1 min-w-0 bg-background/50 relative flex flex-col">
                        {/* Mobile Navigation Header */}
                        <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-border/10 bg-background/50 backdrop-blur-md flex-shrink-0 z-10">
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                {selectedPageId && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedPageId(selectedPage?.parent_id || null)}
                                        className="rounded-xl hover:bg-muted/30 flex-shrink-0"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                )}
                                <span className="text-sm font-semibold truncate">
                                    {selectedPage?.title || "Notizbuch"}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => createPage(selectedPage?.is_folder ? selectedPage.id : (selectedPage?.parent_id || null))}
                                className="rounded-xl hover:bg-muted/30 ml-2"
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>

                        {selectedPage && !selectedPage.is_folder ? (
                            <motion.div
                                key={selectedPageId}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15 }}
                                className="flex flex-col h-full overflow-hidden"
                            >
                                {/* Breadcrumbs - Fixed at top */}
                                {breadcrumbs.length > 0 && (
                                    <div className="px-4 md:px-8 pt-6 lg:pt-12 pb-2 flex-shrink-0 flex items-center gap-2 text-[13px] overflow-x-auto scrollbar-none">
                                        {breadcrumbs.map((crumb, i) => (
                                            <BreadcrumbItem
                                                key={crumb.id}
                                                crumb={crumb}
                                                index={i}
                                                isLast={i === breadcrumbs.length - 1}
                                                onClick={handleBreadcrumbClick}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Title Area - Fixed at top */}
                                <div className={cn("px-4 md:px-8 pb-1 max-w-[850px] w-full flex-shrink-0 transition-all", breadcrumbs.length === 0 ? "pt-6 lg:pt-12" : "pt-2")}>
                                    <div className="flex flex-col gap-1.5">
                                        <input
                                            ref={titleRef}
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => handleTitleChange(e.target.value)}
                                            className="w-full text-2xl md:text-3xl lg:text-4xl leading-tight font-bold tracking-tight bg-transparent border-none outline-none placeholder:text-muted-foreground/25 text-foreground transition-all duration-200 focus:placeholder:opacity-50"
                                            placeholder="Ohne Titel"
                                        />
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] md:text-[13px] text-muted-foreground/40 font-medium">
                                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                                                <Clock className="h-3.5 w-3.5" />
                                                {format(new Date(selectedPage.updated_at), "dd. MMM, HH:mm", { locale: de })}
                                            </span>
                                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-border/40" />
                                            <span className="text-muted-foreground/30 flex items-center gap-1.5">
                                                <span className="px-1.5 py-0.5 rounded bg-muted/20 border border-border/10 text-[10px] font-mono leading-none">/</span>
                                                Befehle
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-4 md:px-8 max-w-[850px] w-full flex-shrink-0 py-0.5">
                                    <div className="h-px w-full bg-border shadow-[0_1px_0_rgba(255,255,255,0.02)] dark:shadow-none" />
                                </div>

                                {/* Content Editor - SCROLLABLE AREA */}
                                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-transparent hover:scrollbar-thumb-muted/10 relative">
                                    <div className="pt-1 pb-12 lg:pt-1 lg:pb-20 px-4 md:px-8 max-w-[850px] w-full">
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
                                className="flex flex-col h-full overflow-y-auto"
                            >
                                {/* Breadcrumbs - Fixed at top */}
                                {breadcrumbs.length > 0 && (
                                    <div className="px-4 md:px-8 pt-6 lg:pt-12 pb-2 max-w-5xl mx-auto w-full flex-shrink-0 flex items-center gap-2 text-[13px] overflow-x-auto scrollbar-none">
                                        {breadcrumbs.map((crumb, i) => (
                                            <BreadcrumbItem
                                                key={crumb.id}
                                                crumb={crumb}
                                                index={i}
                                                isLast={i === breadcrumbs.length - 1}
                                                onClick={handleBreadcrumbClick}
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className={cn("px-4 md:px-8 pb-8 max-w-5xl mx-auto w-full", breadcrumbs.length === 0 ? "pt-10 lg:pt-16" : "pt-4")}>
                                    <div className="flex items-center gap-4 md:gap-5 mb-3">
                                        <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                            <FolderOpen className="h-6 w-6 md:h-8 md:w-8 text-amber-500/80" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate max-w-[200px] sm:max-w-none">{selectedPage.title}</h2>
                                            <p className="text-[11px] md:text-[12px] font-medium text-muted-foreground/40 mt-1">
                                                {pages.filter(p => p.parent_id === selectedPage.id).length} Einträge
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-4 md:px-8 pb-16 max-w-5xl mx-auto w-full">
                                    {/* Folder Contents Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {pages.filter(p => p.parent_id === selectedPage.id)
                                            .sort((a, b) => {
                                                if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1
                                                return a.sort_order - b.sort_order
                                            })
                                            .map(child => (
                                                <button
                                                    key={child.id}
                                                    onClick={() => {
                                                        setSelectedPageId(child.id)
                                                        if (child.is_folder) {
                                                            setExpandedIds(prev => new Set([...prev, child.id]))
                                                        }
                                                    }}
                                                    className={cn(
                                                        "p-5 rounded-2xl bg-background/50 backdrop-blur-sm card-hover text-left flex flex-col h-full group transition-all duration-200",
                                                        child.is_folder
                                                            ? "border border-amber-500/10 hover:border-amber-500/30"
                                                            : "border border-border/10 hover:border-border/30"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        {child.is_folder ? (
                                                            <div className="p-2 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                                                                <Folder className="h-5 w-5 text-amber-500/70 group-hover:text-amber-500/90 transition-colors" />
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                                                                <FileText className="h-5 w-5 text-primary/40 group-hover:text-primary/60 transition-colors" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="font-semibold text-[14px] truncate text-foreground/90 group-hover:text-foreground transition-colors mb-0.5">{child.title}</div>
                                                    <div className="text-[11px] font-medium text-muted-foreground/30 mt-auto pt-1">
                                                        {format(new Date(child.updated_at), "dd. MMM", { locale: de })}
                                                    </div>
                                                </button>
                                            ))
                                        }

                                        {/* Add button */}
                                        <button
                                            onClick={() => createPage(selectedPage.id)}
                                            className="p-5 rounded-2xl border-2 border-dashed border-border/10 hover:border-border/20 hover:bg-muted/5 transition-all flex flex-col items-center justify-center gap-2 min-h-[120px] text-muted-foreground/30 hover:text-muted-foreground/50 group"
                                        >
                                            <div className="p-2.5 rounded-xl bg-background border border-border/5 shadow-sm group-hover:scale-105 transition-transform">
                                                <Plus className="h-4 w-4" />
                                            </div>
                                            <span className="text-[12px] font-medium">Neue Seite</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Root View on Mobile or Intro View on Desktop */}
                                <div className="lg:hidden flex-1 overflow-y-auto px-4 md:px-8 py-8">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                                            <BookOpen className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold tracking-tight">Notizbuch</h2>
                                            <p className="text-[11px] font-medium text-muted-foreground/40 mt-0.5">
                                                {pages.filter(p => !p.parent_id).length} Einträge im Hauptverzeichnis
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-16">
                                        {pages.filter(p => !p.parent_id)
                                            .sort((a, b) => {
                                                if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1
                                                return a.sort_order - b.sort_order
                                            })
                                            .map(child => (
                                                <button
                                                    key={child.id}
                                                    onClick={() => {
                                                        setSelectedPageId(child.id)
                                                        if (child.is_folder) {
                                                            setExpandedIds(prev => new Set([...prev, child.id]))
                                                        }
                                                    }}
                                                    className={cn(
                                                        "p-5 rounded-2xl bg-background/50 backdrop-blur-sm card-hover text-left flex flex-col h-full group transition-all duration-200",
                                                        child.is_folder
                                                            ? "border border-amber-500/10 hover:border-amber-500/30"
                                                            : "border border-border/10 hover:border-border/30"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        {child.is_folder ? (
                                                            <div className="p-2 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                                                                <Folder className="h-5 w-5 text-amber-500/70 group-hover:text-amber-500/90 transition-colors" />
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                                                                <FileText className="h-5 w-5 text-primary/40 group-hover:text-primary/60 transition-colors" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="font-semibold text-[14px] truncate text-foreground/90 group-hover:text-foreground transition-colors mb-0.5">{child.title}</div>
                                                    <div className="text-[11px] font-medium text-muted-foreground/30 mt-auto pt-1">
                                                        {format(new Date(child.updated_at), "dd. MMM", { locale: de })}
                                                    </div>
                                                </button>
                                            ))
                                        }

                                        {/* Add button */}
                                        <button
                                            onClick={() => createPage(null)}
                                            className="p-6 rounded-2xl border-2 border-dashed border-border/10 hover:border-border/20 hover:bg-muted/5 transition-all flex flex-col items-center justify-center gap-3 min-h-[140px] text-muted-foreground/30 hover:text-muted-foreground/50 group"
                                        >
                                            <div className="p-3 rounded-xl bg-background border border-border/5 shadow-sm group-hover:scale-105 transition-transform">
                                                <Plus className="h-5 w-5" />
                                            </div>
                                            <span className="text-[13px] font-medium">Neue Seite</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="hidden lg:flex flex-col items-center justify-center flex-1 relative overflow-hidden">
                                    {/* Ambient Glow Background */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-gradient-to-br from-primary/5 to-indigo-500/5 blur-3xl rounded-full opacity-50 pointer-events-none z-0" />

                                    <div className="p-8 md:p-10 rounded-2xl md:rounded-[2rem] bg-background/40 backdrop-blur-xl mb-8 border border-border/5 shadow-xl shadow-black/5 relative z-10 card-hover">
                                        <BookOpen className="h-12 w-12 md:h-16 md:w-16 text-primary/30" />
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground relative z-10 mb-2">
                                        Notizbuch
                                    </h3>
                                    <p className="text-[14px] md:text-[15px] font-medium text-muted-foreground/40 mb-10 text-center max-w-[280px] md:max-w-sm leading-relaxed relative z-10">
                                        Wähle eine Seite aus der Seitenleiste oder erstelle eine neue.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full sm:w-auto px-6 sm:px-0">
                                        <Button
                                            onClick={() => createPage(null, true)}
                                            variant="outline"
                                            className="rounded-xl gap-2 border-border/10 bg-background/50 backdrop-blur-md hover:bg-muted/10 h-11 px-6 shadow-sm font-medium w-full sm:w-auto"
                                        >
                                            <FolderPlus className="h-4 w-4" />
                                            Ordnung schaffen
                                        </Button>
                                        <Button
                                            onClick={() => createPage(null)}
                                            className="rounded-xl gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-md shadow-primary/20 h-11 px-6 font-medium hover:-translate-y-0.5 transition-transform w-full sm:w-auto"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Neue Seite
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}

// ── Breadcrumb Item Component ─────────────────────────────────────────────

interface BreadcrumbItemProps {
    crumb: NotebookPage
    index: number
    isLast: boolean
    onClick: (crumb: NotebookPage) => void
}

function BreadcrumbItem({ crumb, index, isLast, onClick }: BreadcrumbItemProps) {
    const isFolder = crumb.is_folder

    // Create droppable for folders only
    const { setNodeRef, isOver } = useDroppable({
        id: `breadcrumb-${crumb.id}`,
        data: {
            type: 'breadcrumb',
            page: crumb
        },
        disabled: !isFolder
    })

    return (
        <span className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/15" />}
            <button
                ref={isFolder ? setNodeRef : undefined}
                className={cn(
                    "transition-all",
                    isLast
                        ? "text-foreground font-medium bg-muted/5 px-2.5 py-1 -ml-2.5 rounded-lg border border-border/5"
                        : "text-muted-foreground/50 hover:text-foreground font-medium hover:bg-muted/30 px-2.5 py-1 -ml-2.5 rounded-lg",
                    // Highlight when dragging over folder breadcrumb
                    isFolder && isOver && "bg-amber-500/15 ring-1 ring-amber-500/30 text-amber-600 rounded-lg"
                )}
                onClick={() => onClick(crumb)}
            >
                {isFolder && <Folder className="h-3 w-3 inline mr-1 opacity-50" />}
                {crumb.title}
            </button>
        </span>
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
    pages: NotebookPage[]
    draggedOverFolderId: string | null
}

function SortableTreeItem({
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
    pages,
    draggedOverFolderId,
}: TreeItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: node.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const isExpanded = expandedIds.has(node.id)
    const isSelected = selectedId === node.id
    const hasChildren = node.children.length > 0
    const isRenaming = renamingId === node.id
    const isFolder = node.is_folder
    const isDragTarget = draggedOverFolderId === node.id && isFolder

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: isDragging ? 0.5 : 1, x: 0 }}
                transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
                <div
                    className={cn(
                        "group flex items-center gap-1.5 h-10 rounded-xl px-2 cursor-pointer transition-all duration-200 text-[13px] relative mx-2 mb-0.5",
                        isSelected
                            ? isFolder
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium shadow-[0_4px_12px_rgba(245,158,11,0.08)] border border-amber-500/20"
                                : "bg-primary/10 text-primary font-medium shadow-[0_4px_12px_rgba(var(--primary),0.08)] border border-primary/20"
                            : "text-muted-foreground/70 hover:bg-muted/40 hover:text-foreground font-medium border border-transparent",
                        // Highlight when dragging over this folder
                        isDragTarget && "bg-amber-500/15 ring-2 ring-amber-500/30 border-amber-500/20"
                    )}
                    style={{ paddingLeft: `${depth * 14 + 6}px` }}
                    onClick={() => onSelect(node.id)}
                >
                    {/* Drag Handle */}
                    <div
                        {...listeners}
                        className="flex-shrink-0 h-4 w-4 flex items-center justify-center rounded hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 -ml-1"
                    >
                        <GripVertical className="h-3 w-3" />
                    </div>

                    {/* Expand/Collapse */}
                    {(hasChildren || isFolder) ? (
                        <button
                            className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-muted/50 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation()
                                onToggleExpand(node.id)
                            }}
                        >
                            {isExpanded ? (
                                <ChevronRight className="h-3 w-3 rotate-90 transition-transform" />
                            ) : (
                                <ChevronRight className="h-3 w-3 transition-transform" />
                            )}
                        </button>
                    ) : (
                        <span className="w-5 h-5 flex-shrink-0" />
                    )}

                    {/* Icon */}
                    {isFolder ? (
                        isExpanded ? (
                            <FolderOpen className={cn("h-4 w-4 flex-shrink-0", isSelected ? "text-amber-500" : "text-amber-500/40")} />
                        ) : (
                            <Folder className={cn("h-4 w-4 flex-shrink-0", isSelected ? "text-amber-500" : "text-amber-500/40")} />
                        )
                    ) : (
                        <FileText className={cn("h-4 w-4 flex-shrink-0", isSelected ? "text-primary" : "text-muted-foreground/30")} />
                    )}

                    {/* Title or Rename Input */}
                    {isRenaming ? (
                        <div className="flex-1 min-w-0 relative z-20 mr-12">
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
                                className="w-full bg-background/90 backdrop-blur-md border border-primary/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)] rounded-md px-2 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all font-medium text-foreground -ml-2"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    ) : (
                        <span className="flex-1 min-w-0 pr-2 group-hover:pr-14 truncate transition-all duration-200">{node.title}</span>
                    )}

                    {/* Hover Actions */}
                    {!isRenaming && (
                        <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2">
                            <button
                                className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-muted/80 text-muted-foreground/40 hover:text-foreground transition-colors"
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
                                        className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-muted/80 text-muted-foreground/40 hover:text-foreground transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreHorizontal className="h-3 w-3" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px] glass border-border/20 rounded-xl p-1 shadow-xl">
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
                            {hasChildren ? (
                                node.children.map(child => (
                                    <SortableTreeItem
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
                                        pages={pages}
                                        draggedOverFolderId={draggedOverFolderId}
                                    />
                                ))
                            ) : (
                                <div
                                    className="text-[11px] text-muted-foreground/20 py-4 text-center italic"
                                    style={{ paddingLeft: `${(depth + 1) * 18 + 8}px` }}
                                >
                                    Leer
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Drop zone indicator when dragging over folder */}
            {isDragTarget && (
                <motion.div
                    initial={{ opacity: 0, scaleY: 0.8 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.8 }}
                    className="ml-7 mr-3 h-1 bg-amber-500/30 rounded-full"
                    style={{ marginBottom: "3px" }}
                />
            )}
        </div>
    )
}
