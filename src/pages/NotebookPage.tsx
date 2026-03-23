import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useLocation } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import NotebookEditor from "@/components/notebook/NotebookEditor"
import {
    Plus,
    ChevronRight,
    MoreHorizontal,
    Trash2,
    Pencil,
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

// ── Main Component ──────────────────────────────────────────────────────

export default function NotebookPageView() {
    const { workshopId, user } = useAuth()
    const location = useLocation()
    const [pages, setPages] = useState<NotebookPage[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [editTitle, setEditTitle] = useState("")
    const [editContent, setEditContent] = useState("")
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const titleRef = useRef<HTMLInputElement>(null)
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const renameInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (location.pathname === "/dashboard/notebook" && !location.search) {
            setSelectedPageId(null)
            setExpandedIds(new Set())
        }
    }, [location.pathname, location.search])

    const selectedPage = useMemo(() => pages.find(p => p.id === selectedPageId) || null, [pages, selectedPageId])
    const tree = useMemo(() => buildTree(pages), [pages])

    // ── Data ────────────────────────────────────────────────────────────

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

    // Auto-select first page on desktop
    useEffect(() => {
        if (!selectedPageId && pages.length > 0) {
            if (typeof window !== "undefined" && window.innerWidth < 1024) return
            const firstPage = pages.find(p => !p.parent_id && !p.is_folder) || pages.find(p => !p.parent_id)
            if (firstPage) {
                if (firstPage.is_folder) {
                    // expand folder and select first child page
                    setExpandedIds(new Set([firstPage.id]))
                    const firstChild = pages.find(p => p.parent_id === firstPage.id && !p.is_folder)
                    if (firstChild) setSelectedPageId(firstChild.id)
                } else {
                    setSelectedPageId(firstPage.id)
                }
            }
        }
    }, [pages, selectedPageId])

    // Sync editor when selection changes
    const lastSelectedPageIdRef = useRef<string | null>(null)
    if (selectedPage && selectedPage.id !== lastSelectedPageIdRef.current) {
        lastSelectedPageIdRef.current = selectedPage.id
        if (!selectedPage.is_folder) {
            setEditTitle(selectedPage.title)
            setEditContent(selectedPage.content || "")
        }
    }

    // ── Auto-Save ───────────────────────────────────────────────────────

    const debouncedSave = useCallback((pageId: string, title: string, content: string) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(async () => {
            const { error } = await supabase
                .from("notebook_pages")
                .update({ title, content, updated_at: new Date().toISOString() })
                .eq("id", pageId)
            if (error) {
                toast.error("Fehler beim Speichern")
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

    // ── CRUD ────────────────────────────────────────────────────────────

    const createPage = async (parentId: string | null = null, isFolder = false) => {
        if (!workshopId) return
        const siblings = pages.filter(p => p.parent_id === parentId)
        const maxSort = siblings.reduce((max, p) => Math.max(max, p.sort_order), -1)
        const { data, error } = await supabase
            .from("notebook_pages")
            .insert({
                workshop_id: workshopId, parent_id: parentId,
                title: isFolder ? "Neuer Ordner" : "Neue Seite",
                content: "", is_folder: isFolder, sort_order: maxSort + 1,
                created_by: user?.id || null,
            })
            .select().single()
        if (error) { toast.error("Fehler beim Erstellen"); return }
        setPages(prev => [...prev, data])
        if (!isFolder) {
            setSelectedPageId(data.id)
            setEditTitle(data.title)
            setEditContent("")
            setTimeout(() => titleRef.current?.select(), 100)
        }
        if (parentId) setExpandedIds(prev => new Set([...prev, parentId]))
        toast.success(isFolder ? "Ordner erstellt" : "Seite erstellt")
    }

    const deletePage = async (pageId: string) => {
        const page = pages.find(p => p.id === pageId)
        if (!page) return
        const childCount = pages.filter(p => p.parent_id === pageId).length
        const msg = childCount > 0
            ? `"${page.title}" und ${childCount} Inhalt(e) löschen?`
            : `"${page.title}" löschen?`
        if (!confirm(msg)) return
        const { error } = await supabase.from("notebook_pages").delete().eq("id", pageId)
        if (error) { toast.error("Fehler beim Löschen"); return }
        const idsToRemove = new Set<string>()
        const collect = (id: string) => { idsToRemove.add(id); pages.filter(p => p.parent_id === id).forEach(p => collect(p.id)) }
        collect(pageId)
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
        if (!renamingId || !renameValue.trim()) { setRenamingId(null); return }
        const { error } = await supabase
            .from("notebook_pages")
            .update({ title: renameValue.trim(), updated_at: new Date().toISOString() })
            .eq("id", renamingId)
        if (error) { toast.error("Fehler beim Umbenennen") }
        else {
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
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }

    // ── Render ──────────────────────────────────────────────────────────

    const showEditor = selectedPage && !selectedPage.is_folder

    return (
        <PageTransition className="h-full">
            <DashboardLayout fullWidth>
                <div className="flex h-full overflow-hidden w-full">

                    {/* ── Sidebar ── */}
                    <div className="hidden lg:flex flex-shrink-0 w-[260px] xl:w-[280px] 2xl:w-[300px] border-r border-border/30 overflow-hidden flex-col">

                        <div className="h-11 flex items-center justify-between px-4 flex-shrink-0">
                            <span className="text-[13px] font-semibold text-foreground/70 tracking-tight">Notizbuch</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 transition-colors">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px] rounded-lg p-1">
                                    <DropdownMenuItem onClick={() => createPage(null)} className="text-xs gap-2 h-8">
                                        <Plus className="h-3.5 w-3.5" /> Neue Seite
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => createPage(null, true)} className="text-xs gap-2 h-8">
                                        <Plus className="h-3.5 w-3.5" /> Neuer Ordner
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="flex-1 overflow-y-auto py-0.5 scrollbar-thin scrollbar-thumb-transparent hover:scrollbar-thumb-muted/15">
                            {loading ? (
                                <div className="space-y-px px-2 py-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-7 bg-muted/10 animate-pulse rounded" />)}
                                </div>
                            ) : tree.length > 0 ? (
                                <div className="px-1.5">
                                    {tree.map(node => (
                                        <SidebarItem
                                            key={node.id}
                                            node={node}
                                            depth={0}
                                            selectedId={selectedPageId}
                                            expandedIds={expandedIds}
                                            renamingId={renamingId}
                                            renameValue={renameValue}
                                            renameInputRef={renameInputRef}
                                            onSelect={(id) => {
                                                const p = pages.find(x => x.id === id)
                                                if (p?.is_folder) { toggleExpand(id) }
                                                else { setSelectedPageId(id) }
                                            }}
                                            onToggleExpand={toggleExpand}
                                            onCreatePage={(pid) => createPage(pid)}
                                            onCreateFolder={(pid) => createPage(pid, true)}
                                            onDelete={deletePage}
                                            onStartRename={startRename}
                                            onRenameChange={setRenameValue}
                                            onCommitRename={commitRename}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="px-4 py-12 text-center">
                                    <p className="text-[13px] text-muted-foreground/40">Noch leer</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Main Content ── */}
                    <div className="flex-1 min-w-0 flex flex-col">

                        {/* Mobile Header */}
                        <div className="lg:hidden flex items-center gap-2 px-4 h-11 border-b border-border/20 flex-shrink-0">
                            {selectedPageId ? (
                                <button onClick={() => setSelectedPageId(null)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted/30 flex-shrink-0 -ml-1">
                                    <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                                </button>
                            ) : null}
                            <span className="text-[14px] font-semibold truncate flex-1">{selectedPage?.title || "Notizbuch"}</span>
                            <button onClick={() => createPage(null)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted/30">
                                <Plus className="h-4.5 w-4.5 text-muted-foreground" />
                            </button>
                        </div>

                        {showEditor ? (
                            <motion.div key={selectedPageId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }} className="flex flex-col h-full overflow-hidden">

                                {/* Title */}
                                <div className="px-6 lg:px-12 xl:px-16 2xl:px-20 pt-8 lg:pt-10 max-w-4xl w-full flex-shrink-0">
                                    <input
                                        ref={titleRef}
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        className="w-full text-[1.6rem] lg:text-[2rem] leading-[1.2] font-bold tracking-[-0.02em] bg-transparent border-none outline-none placeholder:text-muted-foreground/25 text-foreground"
                                        placeholder="Ohne Titel"
                                    />
                                    <p className="text-[11px] text-muted-foreground/35 mt-2 font-medium">
                                        {format(new Date(selectedPage!.updated_at), "dd. MMMM yyyy, HH:mm", { locale: de })} · <span className="text-muted-foreground/25">Tippe <kbd className="font-mono text-[10px] px-1 py-px rounded border border-border/20 bg-muted/15">/</kbd> für Befehle</span>
                                    </p>
                                </div>

                                {/* Divider */}
                                <div className="px-6 lg:px-12 xl:px-16 2xl:px-20 max-w-4xl w-full flex-shrink-0 py-4">
                                    <div className="h-px bg-border/25" />
                                </div>

                                {/* Editor */}
                                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-transparent hover:scrollbar-thumb-muted/10">
                                    <div className="px-6 lg:px-12 xl:px-16 2xl:px-20 pb-32 max-w-4xl w-full">
                                        <NotebookEditor key={selectedPageId} content={editContent} onChange={handleContentChange} />
                                    </div>
                                </div>
                            </motion.div>

                        ) : !selectedPageId ? (
                            <>
                                {/* Mobile: page list */}
                                <div className="lg:hidden flex-1 overflow-y-auto px-4 py-4">
                                    {pages.filter(p => !p.parent_id).sort((a, b) => {
                                        if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1
                                        return a.sort_order - b.sort_order
                                    }).map(child => (
                                        <button
                                            key={child.id}
                                            onClick={() => {
                                                if (child.is_folder) { toggleExpand(child.id) }
                                                else { setSelectedPageId(child.id) }
                                            }}
                                            className="w-full flex items-center gap-3 py-2.5 px-2 text-left hover:bg-muted/20 rounded transition-colors"
                                        >
                                            {child.is_folder ? (
                                                <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground/40 transition-transform", expandedIds.has(child.id) && "rotate-90")} />
                                            ) : (
                                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 ml-1 mr-0.5 flex-shrink-0" />
                                            )}
                                            <span className="text-[14px] text-foreground/80 truncate flex-1">{child.title}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Desktop: empty state */}
                                <div className="hidden lg:flex flex-col items-center justify-center flex-1">
                                    <p className="text-[14px] text-muted-foreground/40 mb-5">Wähle eine Seite aus.</p>
                                    <button
                                        onClick={() => createPage(null)}
                                        className="flex items-center gap-2 px-4 h-8 text-[13px] font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Neue Seite
                                    </button>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}

// ── Sidebar Item ────────────────────────────────────────────────────────

interface SidebarItemProps {
    node: TreeNode
    depth: number
    selectedId: string | null
    expandedIds: Set<string>
    renamingId: string | null
    renameValue: string
    renameInputRef: React.RefObject<HTMLInputElement | null>
    onSelect: (id: string) => void
    onToggleExpand: (id: string) => void
    onCreatePage: (parentId: string) => void
    onCreateFolder: (parentId: string) => void
    onDelete: (id: string) => void
    onStartRename: (id: string) => void
    onRenameChange: (value: string) => void
    onCommitRename: () => void
}

function SidebarItem({
    node, depth, selectedId, expandedIds, renamingId, renameValue, renameInputRef,
    onSelect, onToggleExpand, onCreatePage, onCreateFolder, onDelete, onStartRename, onRenameChange, onCommitRename,
}: SidebarItemProps) {
    const isExpanded = expandedIds.has(node.id)
    const isSelected = selectedId === node.id
    const isRenaming = renamingId === node.id
    const isFolder = node.is_folder

    return (
        <div>
            <div
                className={cn(
                    "group flex items-center h-[30px] rounded-md cursor-pointer transition-colors text-[13px] pr-1",
                    isSelected && !isFolder
                        ? "bg-muted/50 text-foreground"
                        : "text-foreground/65 hover:bg-muted/25 hover:text-foreground/90",
                    isFolder && "font-medium text-foreground/50 hover:text-foreground/70"
                )}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => onSelect(node.id)}
            >
                {isFolder ? (
                    <ChevronRight className={cn(
                        "h-3 w-3 mr-1.5 flex-shrink-0 text-muted-foreground/35 transition-transform",
                        isExpanded && "rotate-90"
                    )} />
                ) : (
                    <span className="w-[5px] h-[5px] rounded-full bg-muted-foreground/20 flex-shrink-0 mr-2 ml-[3px]" />
                )}

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
                        className="flex-1 min-w-0 bg-background border border-border/40 rounded px-1.5 py-px text-[13px] outline-none focus:border-foreground/20 text-foreground"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="flex-1 min-w-0 truncate select-none">{node.title}</span>
                )}

                {!isRenaming && (
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/40 text-muted-foreground/40 hover:text-foreground transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px] rounded-lg p-1">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartRename(node.id) }} className="text-xs gap-2 h-7">
                                    <Pencil className="h-3 w-3" /> Umbenennen
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreatePage(node.id) }} className="text-xs gap-2 h-7">
                                    <Plus className="h-3 w-3" /> Unterseite
                                </DropdownMenuItem>
                                {isFolder && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateFolder(node.id) }} className="text-xs gap-2 h-7">
                                        <Plus className="h-3 w-3" /> Unterordner
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(node.id) }} className="text-xs gap-2 h-7 text-red-500">
                                    <Trash2 className="h-3 w-3" /> Löschen
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isFolder && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.1 }}
                    >
                        {node.children.length > 0 ? node.children.map(child => (
                            <SidebarItem
                                key={child.id} node={child} depth={depth + 1}
                                selectedId={selectedId} expandedIds={expandedIds}
                                renamingId={renamingId} renameValue={renameValue} renameInputRef={renameInputRef}
                                onSelect={onSelect} onToggleExpand={onToggleExpand}
                                onCreatePage={onCreatePage} onCreateFolder={onCreateFolder}
                                onDelete={onDelete} onStartRename={onStartRename}
                                onRenameChange={onRenameChange} onCommitRename={onCommitRename}
                            />
                        )) : (
                            <p className="text-[11px] text-muted-foreground/20 italic py-1.5" style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}>Leer</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
