import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
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
    CheckSquare,
    Minus,
    Type,
    Bold,
    Italic,
    Strikethrough,
    Code,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface NotebookEditorProps {
    content: string
    onChange: (content: string) => void
    editable?: boolean
}

// ── Slash Command Definitions ───────────────────────────────────────────

interface SlashCommand {
    label: string
    description: string
    icon: React.ElementType
    action: (editor: Editor) => void
}

const SLASH_COMMANDS: SlashCommand[] = [
    {
        label: "Text",
        description: "Normaler Absatz",
        icon: Type,
        action: (editor) => editor.chain().focus().setParagraph().run()
    },
    {
        label: "Überschrift 1",
        description: "Große Überschrift",
        icon: Heading1,
        action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
    {
        label: "Überschrift 2",
        description: "Mittlere Überschrift",
        icon: Heading2,
        action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
        label: "Überschrift 3",
        description: "Kleine Überschrift",
        icon: Heading3,
        action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
    {
        label: "Aufzählung",
        description: "Einfache Liste",
        icon: List,
        action: (editor) => editor.chain().focus().toggleBulletList().run()
    },
    {
        label: "Nummerierung",
        description: "Nummerierte Liste",
        icon: ListOrdered,
        action: (editor) => editor.chain().focus().toggleOrderedList().run()
    },
    {
        label: "Checkliste",
        description: "To-Do Liste",
        icon: CheckSquare,
        action: (editor) => editor.chain().focus().toggleTaskList().run()
    },
    {
        label: "Trennlinie",
        description: "Horizontale Linie",
        icon: Minus,
        action: (editor) => editor.chain().focus().setHorizontalRule().run()
    }
]

export default function NotebookEditor({ content, onChange, editable = true }: NotebookEditorProps) {
    const [slashMenuOpen, setSlashMenuOpen] = useState(false)
    const [slashCoordinates, setSlashCoordinates] = useState({ top: 0, left: 0 })
    const [slashFilter, setSlashFilter] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Markdown,
            Placeholder.configure({
                placeholder: 'Schreibe etwas oder tippe / für Befehle...',
            }),
        ],
        content: content,
        editable,
        onUpdate: ({ editor }) => {
            isLocalUpdateRef.current = true
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const markdown = (editor.storage as Record<string, any>).markdown.getMarkdown()
            onChange(markdown)
        },
        editorProps: {
            attributes: {
                class: 'notebook-editor focus:outline-none',
            },
        },
    })

    // ── Slash command tracking ───────────────────────────────────────────

    useEffect(() => {
        if (!editor) return

        const handleUpdate = () => {
            const { state, view } = editor
            const { selection } = state
            const { $from } = selection
            const parentText = $from.parent.textContent
            const parentOffset = $from.parentOffset
            const textBefore = parentText.slice(0, parentOffset)
            const match = textBefore.match(/(?:^|\s)\/([\w\s]{0,25})$/)

            if (match) {
                setSlashFilter(match[1])
                setSlashMenuOpen(true)
                setSelectedIndex(0)

                const coords = view.coordsAtPos($from.pos)
                const MENU_HEIGHT = 320
                const spaceBelow = window.innerHeight - coords.bottom
                let topPosition = coords.bottom + 8
                if (spaceBelow < MENU_HEIGHT) {
                    topPosition = coords.top - MENU_HEIGHT - 8
                }

                setSlashCoordinates({ top: topPosition, left: coords.left })
            } else {
                setSlashMenuOpen(false)
            }
        }

        editor.on('transaction', handleUpdate)
        return () => { editor.off('transaction', handleUpdate) }
    }, [editor])

    // ── Content sync (prevent cursor jumps) ─────────────────────────────

    const lastContentRef = useRef(content)
    const isLocalUpdateRef = useRef(false)

    useEffect(() => {
        if (!editor) return
        if (content !== lastContentRef.current && !isLocalUpdateRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentMarkdown = (editor.storage as Record<string, any>).markdown.getMarkdown()
            if (currentMarkdown !== content) {
                editor.commands.setContent(content)
            }
        }
        lastContentRef.current = content
        isLocalUpdateRef.current = false
    }, [content, editor])

    const filteredCommands = SLASH_COMMANDS.filter(cmd =>
        cmd.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
        cmd.description.toLowerCase().includes(slashFilter.toLowerCase())
    )

    const executeCommand = useCallback((cmd: SlashCommand) => {
        if (!editor) return

        const { state } = editor
        const { selection } = state
        const { $from } = selection
        const parentText = $from.parent.textContent
        const parentOffset = $from.parentOffset
        const textBefore = parentText.slice(0, parentOffset)
        const match = textBefore.match(/(?:^|\s)\/([\w\s]{0,25})$/)

        if (match) {
            const matchLength = match[0].length
            const matchStart = $from.pos - matchLength

            editor.chain().focus()
                .deleteRange({ from: matchStart + (match[0].startsWith(' ') ? 1 : 0), to: $from.pos })
                .run()

            cmd.action(editor)
            setSlashMenuOpen(false)
        }
    }, [editor])

    // ── Key handler ─────────────────────────────────────────────────────

    useEffect(() => {
        if (!editor) return

        editor.setOptions({
            editorProps: {
                handleKeyDown: (view, event) => {
                    if (slashMenuOpen) {
                        if (event.key === 'ArrowUp') {
                            event.preventDefault()
                            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
                            return true
                        }
                        if (event.key === 'ArrowDown') {
                            event.preventDefault()
                            setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : prev))
                            return true
                        }
                        if (event.key === 'Enter') {
                            event.preventDefault()
                            if (filteredCommands[selectedIndex]) {
                                executeCommand(filteredCommands[selectedIndex])
                            }
                            return true
                        }
                        if (event.key === 'Escape') {
                            setSlashMenuOpen(false)
                            return true
                        }
                    }

                    // Enter: Create new list item
                    if (event.key === 'Enter' && !event.shiftKey && !slashMenuOpen) {
                        const { state } = view
                        const { selection } = state
                        const { empty, $from } = selection

                        if (empty) {
                            const depth = $from.depth
                            if (depth > 1) {
                                const parent = $from.parent
                                const node = $from.node(depth - 1)
                                if (parent.textContent.length === 0 && (node.type.name === 'taskItem' || node.type.name === 'listItem')) {
                                    const tr = state.tr
                                    const pos = $from.after(depth - 1)
                                    const attrs = node.type.name === 'taskItem' ? { checked: false } : {}
                                    const newNode = node.type.createAndFill(attrs)
                                    if (newNode) {
                                        tr.insert(pos, newNode)
                                        view.dispatch(tr)
                                        editor.commands.focus(pos + 2)
                                        return true
                                    }
                                }
                            }
                        }
                    }

                    // Backspace: Lift empty list item
                    if (event.key === 'Backspace') {
                        const { state } = view
                        const { selection } = state
                        const { empty, $from } = selection

                        if (empty && $from.parent.textContent.length === 0) {
                            const depth = $from.depth
                            if (depth > 1) {
                                const node = $from.node(depth - 1)
                                if (node.type.name === 'taskItem' || node.type.name === 'listItem') {
                                    editor.chain().focus().liftListItem(node.type.name).run()
                                    return true
                                }
                            }
                        }
                    }
                    return false
                }
            }
        })
    }, [editor, slashMenuOpen, selectedIndex, filteredCommands, executeCommand])

    if (!editor) return null

    return (
        <div className="relative w-full h-full">
            {/* ── Floating Format Toolbar (appears on text selection) ── */}
            <BubbleMenu
                editor={editor}
                className="flex items-center gap-0.5 px-1 py-0.5 bg-popover border border-border/60 rounded-lg shadow-lg"
            >
                <ToolbarButton
                    active={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Fett"
                >
                    <Bold className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Kursiv"
                >
                    <Italic className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    title="Durchgestrichen"
                >
                    <Strikethrough className="h-3.5 w-3.5" />
                </ToolbarButton>
                <div className="w-px h-4 bg-border/40 mx-0.5" />
                <ToolbarButton
                    active={editor.isActive('code')}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    title="Code"
                >
                    <Code className="h-3.5 w-3.5" />
                </ToolbarButton>
            </BubbleMenu>

            {/* ── Editor Content ── */}
            <EditorContent editor={editor} className="min-h-[400px]" />

            {/* ── Slash Command Menu ── */}
            <AnimatePresence>
                {slashMenuOpen && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="fixed z-50 bg-popover border border-border/60 rounded-lg shadow-xl overflow-hidden w-[240px]"
                        style={{ top: slashCoordinates.top, left: slashCoordinates.left }}
                    >
                        <div className="max-h-[300px] overflow-y-auto py-1">
                            {filteredCommands.length > 0 ? (
                                filteredCommands.map((cmd, i) => (
                                    <button
                                        key={cmd.label}
                                        className={cn(
                                            "w-full text-left px-3 py-2 flex items-center gap-3 transition-colors text-sm",
                                            i === selectedIndex
                                                ? "bg-muted/50 text-foreground"
                                                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            executeCommand(cmd)
                                        }}
                                        onMouseEnter={() => setSelectedIndex(i)}
                                    >
                                        <cmd.icon className={cn(
                                            "h-4 w-4 shrink-0",
                                            i === selectedIndex ? "text-foreground" : "text-muted-foreground/50"
                                        )} />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[13px] font-medium leading-tight">{cmd.label}</div>
                                            <div className="text-[11px] text-muted-foreground/40 leading-tight">{cmd.description}</div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-4 text-center text-xs text-muted-foreground/40">
                                    Keine Befehle gefunden
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                /* ── Todoist-style Editor ──
                   Note: .notebook-editor and .ProseMirror are on the SAME element,
                   so we use .notebook-editor (no descendant selector) for all rules.
                */
                .notebook-editor {
                    outline: none;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    line-height: 1.6;
                    color: var(--foreground);
                    font-size: 0.9375rem;
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

                /* Inline formatting */
                .notebook-editor strong {
                    font-weight: 600;
                    color: var(--foreground);
                }
                .notebook-editor em {
                    font-style: italic;
                }
                .notebook-editor s {
                    text-decoration: line-through;
                    color: color-mix(in srgb, var(--muted-foreground) 60%, transparent);
                }
                .notebook-editor code {
                    font-family: "SF Mono", "Fira Code", monospace;
                    font-size: 0.85em;
                    background: color-mix(in srgb, var(--muted) 50%, transparent);
                    border: 1px solid color-mix(in srgb, var(--border) 30%, transparent);
                    border-radius: 4px;
                    padding: 0.15em 0.35em;
                }

                /* Headings */
                .notebook-editor h1 {
                    font-size: 1.75em;
                    font-weight: 700;
                    margin-top: 1.5em;
                    margin-bottom: 0.4em;
                    line-height: 1.2;
                    letter-spacing: -0.025em;
                    color: var(--foreground);
                }
                .notebook-editor h1:first-child { margin-top: 0; }

                .notebook-editor h2 {
                    font-size: 1.35em;
                    font-weight: 600;
                    margin-top: 1.4em;
                    margin-bottom: 0.35em;
                    line-height: 1.25;
                    letter-spacing: -0.02em;
                    color: var(--foreground);
                }
                .notebook-editor h2:first-child { margin-top: 0; }

                .notebook-editor h3 {
                    font-size: 1.1em;
                    font-weight: 600;
                    margin-top: 1.3em;
                    margin-bottom: 0.3em;
                    line-height: 1.3;
                    color: color-mix(in srgb, var(--foreground) 90%, transparent);
                }
                .notebook-editor h3:first-child { margin-top: 0; }

                /* Lists - clean Todoist style */
                .notebook-editor ul:not([data-type="taskList"]) {
                    list-style: none;
                    padding-left: 1.5em;
                    margin-bottom: 0.5em;
                }
                .notebook-editor ul:not([data-type="taskList"]) > li {
                    position: relative;
                    margin-bottom: 0.15em;
                }
                .notebook-editor ul:not([data-type="taskList"]) > li::before {
                    content: "";
                    position: absolute;
                    left: -1.1em;
                    top: 0.6em;
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: color-mix(in srgb, var(--muted-foreground) 40%, transparent);
                }
                .notebook-editor ol {
                    padding-left: 1.5em;
                    margin-bottom: 0.5em;
                }
                .notebook-editor ol > li {
                    margin-bottom: 0.15em;
                }
                .notebook-editor ol > li::marker {
                    color: color-mix(in srgb, var(--muted-foreground) 45%, transparent);
                    font-size: 0.9em;
                }
                .notebook-editor li p {
                    margin-bottom: 0;
                }

                /* Task Lists - Todoist circle checkboxes */
                .notebook-editor ul[data-type="taskList"] {
                    list-style: none !important;
                    padding: 0 !important;
                    margin-bottom: 0.5em !important;
                }
                .notebook-editor ul[data-type="taskList"] > li {
                    display: flex !important;
                    align-items: flex-start !important;
                    gap: 0.5rem;
                    padding: 0.25rem 0;
                    margin-bottom: 0 !important;
                    list-style-type: none !important;
                }
                .notebook-editor ul[data-type="taskList"] > li::before {
                    display: none !important;
                }
                .notebook-editor ul[data-type="taskList"] > li > label {
                    flex: 0 0 auto;
                    margin-top: 0.15rem;
                    user-select: none;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }
                .notebook-editor ul[data-type="taskList"] > li > div {
                    flex: 1 1 auto;
                    min-width: 0;
                }

                /* Todoist circular checkbox */
                .notebook-editor ul[data-type="taskList"] input[type="checkbox"] {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    width: 18px !important;
                    height: 18px !important;
                    border: 2px solid color-mix(in srgb, var(--muted-foreground) 35%, transparent) !important;
                    background-color: transparent !important;
                    border-radius: 50% !important;
                    cursor: pointer !important;
                    transition: all 0.15s ease !important;
                    position: relative !important;
                    flex-shrink: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .notebook-editor ul[data-type="taskList"] input[type="checkbox"]:hover {
                    border-color: var(--primary) !important;
                    background-color: color-mix(in srgb, var(--primary) 10%, transparent) !important;
                }
                .notebook-editor ul[data-type="taskList"] input[type="checkbox"]:checked {
                    background-color: var(--primary) !important;
                    border-color: var(--primary) !important;
                }
                .notebook-editor ul[data-type="taskList"] input[type="checkbox"]:checked::after {
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
                    background-color: color-mix(in srgb, var(--border) 50%, transparent) !important;
                    margin: 1.5em 0 !important;
                }

                /* Blockquote */
                .notebook-editor blockquote {
                    border-left: 3px solid color-mix(in srgb, var(--border) 60%, transparent);
                    padding-left: 1em;
                    margin-left: 0;
                    margin-bottom: 0.5em;
                    color: color-mix(in srgb, var(--foreground) 70%, transparent);
                }

                /* Code block */
                .notebook-editor pre {
                    font-family: "SF Mono", "Fira Code", monospace;
                    font-size: 0.85em;
                    background: color-mix(in srgb, var(--muted) 40%, transparent);
                    border: 1px solid color-mix(in srgb, var(--border) 30%, transparent);
                    border-radius: 8px;
                    padding: 0.75em 1em;
                    margin-bottom: 0.75em;
                    overflow-x: auto;
                }
                .notebook-editor pre code {
                    background: none;
                    border: none;
                    padding: 0;
                    font-size: inherit;
                }

                /* Selection */
                .notebook-editor ::selection {
                    background: color-mix(in srgb, var(--primary) 25%, transparent);
                }
            `}</style>
        </div>
    )
}

// ── Toolbar Button ───────────────────────────────────────────────────────

function ToolbarButton({ active, onClick, title, children }: {
    active: boolean
    onClick: () => void
    title: string
    children: React.ReactNode
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
        >
            {children}
        </button>
    )
}
