import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CircleCheck,
    Minus,
    Type
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface NotebookEditorProps {
    content: string
    onChange: (content: string) => void
    editable?: boolean
}

// ── Slash Commands ──────────────────────────────────────────────────────

interface SlashCommand {
    label: string
    description: string
    icon: React.ElementType
    action: (editor: Editor) => void
}

const SLASH_COMMANDS: SlashCommand[] = [
    { label: "Text", description: "Normaler Absatz", icon: Type, action: (e) => e.chain().focus().setParagraph().run() },
    { label: "Überschrift 1", description: "Große Überschrift", icon: Heading1, action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Überschrift 2", description: "Mittlere Überschrift", icon: Heading2, action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Überschrift 3", description: "Kleine Überschrift", icon: Heading3, action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Aufzählung", description: "Einfache Liste", icon: List, action: (e) => e.chain().focus().toggleBulletList().run() },
    { label: "Nummerierung", description: "Nummerierte Liste", icon: ListOrdered, action: (e) => e.chain().focus().toggleOrderedList().run() },
    { label: "Checkliste", description: "To-Do Liste", icon: CircleCheck, action: (e) => e.chain().focus().toggleTaskList().run() },
    { label: "Trennlinie", description: "Horizontale Linie", icon: Minus, action: (e) => e.chain().focus().setHorizontalRule().run() },
]

// ── Markdown Normalizer ─────────────────────────────────────────────────

function normalizeTaskListMarkdown(md: string): string {
    if (!md) return md
    return md.replace(
        /^(\s*)[*+-]\s+\[([ xX])\]\s?(.*)/gm,
        (_m, indent: string, check: string, text: string) => {
            const marker = check.trim() ? 'x' : ' '
            return `${indent}- [${marker}] ${text}`
        }
    )
}

// ── Editor Component ────────────────────────────────────────────────────

export default function NotebookEditor({ content, onChange, editable = true }: NotebookEditorProps) {
    const [slashMenuOpen, setSlashMenuOpen] = useState(false)
    const [slashCoords, setSlashCoords] = useState({ top: 0, left: 0 })
    const [slashFilter, setSlashFilter] = useState('')
    const [selectedIdx, setSelectedIdx] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)
    const initialContentSet = useRef(false)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: true }),
            Placeholder.configure({ placeholder: 'Schreibe etwas oder tippe / für Befehle…' }),
        ],
        content: '',
        editable,
        onUpdate: ({ editor }) => {
            isLocalUpdateRef.current = true
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const md = (editor.storage as Record<string, any>).markdown.getMarkdown()
            onChange(md)
        },
        editorProps: {
            attributes: {
                class: 'notebook-editor focus:outline-none',
            },
        },
    })

    // Load initial content through setContent so Markdown extension parses it
    useEffect(() => {
        if (!editor || initialContentSet.current) return
        if (content) {
            editor.commands.setContent(normalizeTaskListMarkdown(content))
            initialContentSet.current = true
        }
    }, [editor, content])

    // Slash command tracking
    useEffect(() => {
        if (!editor) return
        const handleUpdate = () => {
            const { state, view } = editor
            const { $from } = state.selection
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
            const match = textBefore.match(/(?:^|\s)\/([\w\s]{0,25})$/)
            if (match) {
                setSlashFilter(match[1])
                setSlashMenuOpen(true)
                const coords = view.coordsAtPos($from.pos)
                const spaceBelow = window.innerHeight - coords.bottom
                setSlashCoords({
                    top: spaceBelow < 300 ? coords.top - 310 : coords.bottom + 8,
                    left: coords.left,
                })
            } else {
                setSlashMenuOpen(false)
            }
        }
        editor.on('transaction', handleUpdate)
        return () => { editor.off('transaction', handleUpdate) }
    }, [editor])

    // Content sync on page switch
    const lastContentRef = useRef(content)
    const isLocalUpdateRef = useRef(false)
    useEffect(() => {
        if (!editor) return
        if (content !== lastContentRef.current && !isLocalUpdateRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentMd = (editor.storage as Record<string, any>).markdown.getMarkdown()
            if (currentMd !== content) {
                editor.commands.setContent(normalizeTaskListMarkdown(content))
            }
        }
        lastContentRef.current = content
        isLocalUpdateRef.current = false
    }, [content, editor])

    const filtered = SLASH_COMMANDS.filter(c =>
        c.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
        c.description.toLowerCase().includes(slashFilter.toLowerCase())
    )

    const execCommand = useCallback((cmd: SlashCommand) => {
        if (!editor) return
        const { $from } = editor.state.selection
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
        const match = textBefore.match(/(?:^|\s)\/([\w\s]{0,25})$/)
        if (match) {
            const len = match[0].length
            const start = $from.pos - len
            editor.chain().focus().deleteRange({ from: start + (match[0].startsWith(' ') ? 1 : 0), to: $from.pos }).run()
            cmd.action(editor)
            setSlashMenuOpen(false)
        }
    }, [editor])

    // Key handling
    useEffect(() => {
        if (!editor) return
        editor.setOptions({
            editorProps: {
                handleKeyDown: (view, event) => {
                    if (slashMenuOpen) {
                        if (event.key === 'ArrowUp') { event.preventDefault(); setSelectedIdx(p => Math.max(0, p - 1)); return true }
                        if (event.key === 'ArrowDown') { event.preventDefault(); setSelectedIdx(p => Math.min(filtered.length - 1, p + 1)); return true }
                        if (event.key === 'Enter') { event.preventDefault(); if (filtered[selectedIdx]) execCommand(filtered[selectedIdx]); return true }
                        if (event.key === 'Escape') { setSlashMenuOpen(false); return true }
                    }
                    if (event.key === 'Enter' && !event.shiftKey && !slashMenuOpen) {
                        const { state } = view
                        const { empty, $from } = state.selection
                        if (empty && $from.depth > 1) {
                            const parent = $from.parent
                            const node = $from.node($from.depth - 1)
                            if (parent.textContent.length === 0 && (node.type.name === 'taskItem' || node.type.name === 'listItem')) {
                                const tr = state.tr
                                const pos = $from.after($from.depth - 1)
                                const attrs = node.type.name === 'taskItem' ? { checked: false } : {}
                                const newNode = node.type.createAndFill(attrs)
                                if (newNode) { tr.insert(pos, newNode); view.dispatch(tr); editor.commands.focus(pos + 2); return true }
                            }
                        }
                    }
                    if (event.key === 'Backspace') {
                        const { state } = view
                        const { empty, $from } = state.selection
                        if (empty && $from.parent.textContent.length === 0 && $from.depth > 1) {
                            const node = $from.node($from.depth - 1)
                            if (node.type.name === 'taskItem' || node.type.name === 'listItem') {
                                editor.chain().focus().liftListItem(node.type.name).run()
                                return true
                            }
                        }
                    }
                    return false
                }
            }
        })
    }, [editor, slashMenuOpen, selectedIdx, filtered, execCommand])

    if (!editor) return null

    return (
        <div className="relative w-full h-full">
            <EditorContent editor={editor} className="min-h-[400px]" />

            {/* Slash Command Menu */}
            <AnimatePresence>
                {slashMenuOpen && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="fixed z-50 bg-background border border-border/40 rounded-lg shadow-lg overflow-hidden"
                        style={{ top: slashCoords.top, left: slashCoords.left }}
                    >
                        <div className="w-[220px] max-h-[300px] overflow-y-auto py-1">
                            {filtered.length > 0 ? filtered.map((cmd, i) => (
                                <button
                                    key={cmd.label}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 flex items-center gap-2.5 transition-colors text-[13px]",
                                        i === selectedIdx ? "bg-muted/50 text-foreground" : "text-foreground/70 hover:bg-muted/30"
                                    )}
                                    onClick={(e) => { e.preventDefault(); execCommand(cmd) }}
                                    onMouseEnter={() => setSelectedIdx(i)}
                                >
                                    <cmd.icon className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                                    <span>{cmd.label}</span>
                                </button>
                            )) : (
                                <p className="px-3 py-4 text-center text-xs text-muted-foreground/40">Nichts gefunden</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                /* ── Notebook Editor — Todoist Style ─────────────────── */
                .notebook-editor {
                    outline: none;
                    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
                    line-height: 1.65;
                    color: var(--foreground);
                    font-size: 0.95rem;
                }

                /* Paragraphs */
                .notebook-editor p {
                    margin-bottom: 0.5em;
                }
                .notebook-editor p.is-editor-empty:first-child::before {
                    color: color-mix(in srgb, var(--muted-foreground) 30%, transparent);
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }

                /* Headings */
                .notebook-editor h1 {
                    font-size: 1.5em;
                    font-weight: 700;
                    margin: 1.2em 0 0.4em;
                    line-height: 1.25;
                    letter-spacing: -0.02em;
                    color: var(--foreground);
                }
                .notebook-editor h2 {
                    font-size: 1.25em;
                    font-weight: 600;
                    margin: 1em 0 0.3em;
                    line-height: 1.3;
                    letter-spacing: -0.01em;
                    color: var(--foreground);
                }
                .notebook-editor h3 {
                    font-size: 1.05em;
                    font-weight: 600;
                    margin: 1em 0 0.3em;
                    color: color-mix(in srgb, var(--foreground) 85%, transparent);
                }

                /* Lists */
                .notebook-editor ul {
                    list-style-type: disc;
                    padding-left: 1.4em;
                    margin-bottom: 0.5em;
                }
                .notebook-editor ol {
                    list-style-type: decimal;
                    padding-left: 1.4em;
                    margin-bottom: 0.5em;
                }
                .notebook-editor li {
                    margin-bottom: 0.15em;
                }
                .notebook-editor li p {
                    margin-bottom: 0;
                }
                .notebook-editor ul li::marker,
                .notebook-editor ol li::marker {
                    color: color-mix(in srgb, var(--muted-foreground) 40%, transparent);
                }

                /* ── Task Lists — Todoist Circle Checkboxes ─────────── */
                .notebook-editor ul[data-type="taskList"] {
                    list-style: none !important;
                    padding: 0 !important;
                    margin: 0 0 0.5em !important;
                }
                .notebook-editor ul[data-type="taskList"] li {
                    display: flex !important;
                    align-items: flex-start !important;
                    margin-bottom: 2px !important;
                    padding: 3px 0 !important;
                    list-style-type: none !important;
                    border-radius: 4px;
                }
                .notebook-editor ul[data-type="taskList"] li::before,
                .notebook-editor ul[data-type="taskList"] li::marker {
                    display: none !important;
                    content: none !important;
                }
                .notebook-editor ul[data-type="taskList"] li > label {
                    flex: 0 0 auto;
                    margin-right: 10px;
                    margin-top: 3px;
                    user-select: none;
                    display: flex;
                    align-items: center;
                }
                .notebook-editor ul[data-type="taskList"] li > div {
                    flex: 1 1 auto;
                    min-width: 0;
                }

                /* Todoist-style circle checkbox */
                .notebook-editor ul[data-type="taskList"] li > label > input[type="checkbox"] {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    width: 18px !important;
                    height: 18px !important;
                    border: 2px solid color-mix(in srgb, var(--muted-foreground) 35%, transparent) !important;
                    background: transparent !important;
                    border-radius: 50% !important;
                    cursor: pointer !important;
                    transition: all 0.15s ease !important;
                    position: relative !important;
                    flex-shrink: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .notebook-editor ul[data-type="taskList"] li > label > input[type="checkbox"]:hover {
                    border-color: color-mix(in srgb, var(--foreground) 50%, transparent) !important;
                }
                .notebook-editor ul[data-type="taskList"] li > label > input[type="checkbox"]:checked {
                    background: color-mix(in srgb, var(--muted-foreground) 40%, transparent) !important;
                    border-color: color-mix(in srgb, var(--muted-foreground) 40%, transparent) !important;
                }
                .notebook-editor ul[data-type="taskList"] li > label > input[type="checkbox"]:checked::after {
                    content: '' !important;
                    position: absolute !important;
                    top: 42% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) rotate(45deg) !important;
                    width: 4px !important;
                    height: 8px !important;
                    border: solid white !important;
                    border-width: 0 1.5px 1.5px 0 !important;
                }
                .notebook-editor ul[data-type="taskList"] li[data-checked="true"] > div p {
                    text-decoration: line-through;
                    color: color-mix(in srgb, var(--muted-foreground) 45%, transparent);
                }

                /* Horizontal Rule */
                .notebook-editor hr {
                    border: none !important;
                    height: 1px !important;
                    background: color-mix(in srgb, var(--border) 60%, transparent) !important;
                    margin: 1.5em 0 !important;
                }
            `}</style>
        </div>
    )
}
