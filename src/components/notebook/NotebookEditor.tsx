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
    CheckSquare,
    Minus,
    Type
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
    category: string
}

const SLASH_COMMANDS: SlashCommand[] = [
    {
        label: "Text",
        description: "Normaler Text",
        icon: Type,
        category: "Grundelemente",
        action: (editor) => editor.chain().focus().setParagraph().run()
    },
    {
        label: "Überschrift 1",
        description: "Große Überschrift",
        icon: Heading1,
        category: "Grundelemente",
        action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
    {
        label: "Überschrift 2",
        description: "Mittlere Überschrift",
        icon: Heading2,
        category: "Grundelemente",
        action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
        label: "Überschrift 3",
        description: "Kleine Überschrift",
        icon: Heading3,
        category: "Grundelemente",
        action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
    {
        label: "Aufzählung",
        description: "Einfache Liste",
        icon: List,
        category: "Listen",
        action: (editor) => editor.chain().focus().toggleBulletList().run()
    },
    {
        label: "Nummerierung",
        description: "Nummerierte Liste",
        icon: ListOrdered,
        category: "Listen",
        action: (editor) => editor.chain().focus().toggleOrderedList().run()
    },
    {
        label: "Checkliste",
        description: "To-Do Liste",
        icon: CheckSquare,
        category: "Listen",
        action: (editor) => editor.chain().focus().toggleTaskList().run()
    },
    {
        label: "Trennlinie",
        description: "Horizontale Linie",
        icon: Minus,
        category: "Blöcke",
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
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Markdown,
            Placeholder.configure({
                placeholder: 'Beginne zu schreiben... / für Befehle',
            }),
        ],
        content: content,
        editable,
        onUpdate: ({ editor }) => {
            // Mark as local update to prevent cursor jump
            isLocalUpdateRef.current = true

            // Persist as Markdown
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const markdown = (editor.storage as Record<string, any>).markdown.getMarkdown()
            onChange(markdown)
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none max-w-none',
            },

        },
    })

    // Custom Key Handler to solve stale closure issues


    // Custom Slash Command Logic:
    // Since we don't have the suggestion plugin, we need to manually track input.
    // We'll hook into editor state changes differently.
    useEffect(() => {
        if (!editor) return

        const handleUpdate = () => {
            const { state, view } = editor
            const { selection } = state
            const { $from } = selection

            // Look at the text before the cursor
            const parentText = $from.parent.textContent
            // Parent offset is current position in node
            const parentOffset = $from.parentOffset

            // Extract text from start of node to cursor
            const textBefore = parentText.slice(0, parentOffset)

            // Check for slash at the end
            const match = textBefore.match(/(?:^|\s)\/([\w\s]{0,25})$/)

            if (match) {
                const query = match[1]
                setSlashFilter(query)
                setSlashMenuOpen(true)

                // Get coords
                const coords = view.coordsAtPos($from.pos)

                // Calculate position
                const MENU_HEIGHT = 320 // Approx max height
                const spaceBelow = window.innerHeight - coords.bottom

                let topPosition = coords.bottom + 10
                if (spaceBelow < MENU_HEIGHT) {
                    topPosition = coords.top - MENU_HEIGHT - 10
                }

                setSlashCoordinates({
                    top: topPosition,
                    left: coords.left
                })
            } else {
                setSlashMenuOpen(false)
            }
        }

        editor.on('transaction', handleUpdate)

        return () => {
            editor.off('transaction', handleUpdate)
        }
    }, [editor])

    // Track last content to prevent cursor jumps
    const lastContentRef = useRef(content)
    const isLocalUpdateRef = useRef(false)

    useEffect(() => {
        if (!editor) return

        // Update editor content only when it's actually different (page switch)
        // and not when we're the ones who triggered the update
        if (content !== lastContentRef.current && !isLocalUpdateRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentMarkdown = (editor.storage as Record<string, any>).markdown.getMarkdown()

            // Only update if content is meaningfully different
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

            // Delete the slash command text
            editor.chain().focus()
                .deleteRange({ from: matchStart + (match[0].startsWith(' ') ? 1 : 0), to: $from.pos })
                .run()

            // Execute the command action
            cmd.action(editor)

            setSlashMenuOpen(false)
        }
    }, [editor])

    // Custom Key Handler to solve stale closure issues
    useEffect(() => {
        if (!editor) return

        editor.setOptions({
            editorProps: {
                handleKeyDown: (view, event) => {
                    // Slash Menu Logic
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

                    // Enter Behavior: Create a new list item instead of escaping
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

                    // Backspace Behavior: Lift empty list item instead of toggling the whole list
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

    if (!editor) {
        return null
    }

    return (
        <div className="relative w-full h-full">
            <EditorContent editor={editor} className="min-h-[500px]" />

            <AnimatePresence>
                {slashMenuOpen && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="fixed z-50 bg-background/80 backdrop-blur-3xl border border-white/10 dark:border-white/5 rounded-[1.25rem] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] overflow-hidden min-w-[280px]"
                        style={{ top: slashCoordinates.top, left: slashCoordinates.left }}
                    >
                        <div className="p-1.5 w-[260px] max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted/20">
                            <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground/40 font-semibold select-none">
                                Elemente
                            </div>
                            {filteredCommands.length > 0 ? (
                                filteredCommands.map((cmd, i) => (
                                    <button
                                        key={cmd.label}
                                        className={cn(
                                            "w-full text-left px-3 py-2.5 flex items-center gap-3.5 transition-all rounded-xl",
                                            i === selectedIndex
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            executeCommand(cmd)
                                        }}
                                        onMouseEnter={() => setSelectedIndex(i)}
                                    >
                                        <div className={cn(
                                            "h-9 w-9 rounded-[0.6rem] flex items-center justify-center flex-shrink-0 transition-colors bg-background border border-border/5 shadow-sm",
                                            i === selectedIndex
                                                ? "text-primary border-primary/10 shadow-primary/5"
                                                : "text-muted-foreground/60"
                                        )}>
                                            <cmd.icon className="h-[18px] w-[18px]" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-[13px] leading-none mb-1.5">{cmd.label}</div>
                                            <div className="text-[11px] text-muted-foreground/50 leading-none">{cmd.description}</div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-6 text-center text-xs text-muted-foreground/40 font-medium">
                                    Keine Befehle gefunden
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                /* TipTap Custom Styles - Jony Ive Aesthetic */
                .ProseMirror {
                    outline: none;
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter Variable", "Segoe UI", Roboto, sans-serif;
                    line-height: 1.75;
                    color: color-mix(in srgb, var(--foreground) 95%, transparent);
                    font-size: 1.05rem;
                }
                .ProseMirror p {
                    margin-bottom: 0.85em;
                    letter-spacing: -0.015em;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: color-mix(in srgb, var(--muted-foreground) 35%, transparent);
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                /* Lists */
                .ProseMirror ul {
                    list-style-type: disc;
                    padding-left: 1.5em;
                    margin-bottom: 0.85em;
                }
                .ProseMirror ol {
                    list-style-type: decimal;
                    padding-left: 1.5em;
                    margin-bottom: 0.85em;
                }
                .ProseMirror li {
                    margin-bottom: 0.4em;
                }
                .ProseMirror li p {
                    margin-bottom: 0;
                }
                .ProseMirror ul li::marker, .ProseMirror ol li::marker {
                    color: color-mix(in srgb, var(--muted-foreground) 50%, transparent);
                }
                
                /* Task Lists - Apple Notes Style */
                .ProseMirror ul[data-type="taskList"] {
                    list-style: none !important;
                    padding: 0 !important;
                    margin-bottom: 0.75em !important;
                }
                .ProseMirror ul[data-type="taskList"] li::before,
                .ProseMirror ul[data-type="taskList"] li::marker {
                    display: none !important;
                    content: none !important;
                    color: transparent !important;
                }
                .ProseMirror ul[data-type="taskList"] li {
                    display: flex !important;
                    align-items: flex-start !important;
                    margin-bottom: 0.4em !important;
                    min-height: 24px !important;
                    list-style-type: none !important;
                }
                .ProseMirror ul[data-type="taskList"] li > label {
                    flex: 0 0 auto;
                    margin-right: 0.75rem;
                    margin-top: 0.2rem;
                    user-select: none;
                    display: flex;
                    align-items: center;
                }
                .ProseMirror ul[data-type="taskList"] li > div {
                    flex: 1 1 auto;
                    line-height: 1.6;
                }
                /* Apple Notes Style Checkbox */
                .ProseMirror ul[data-type="taskList"] li > label > input[type="checkbox"] {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    width: 20px !important;
                    height: 20px !important;
                    border: 2px solid color-mix(in srgb, var(--muted-foreground) 40%, transparent) !important;
                    background-color: transparent !important;
                    border-radius: 5px !important; /* Rounded corners but not full circle for checkboxes */
                    cursor: pointer !important;
                    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
                    position: relative !important;
                    flex-shrink: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
                }
                .ProseMirror ul[data-type="taskList"] li > label > input[type="checkbox"]:hover {
                    border-color: color-mix(in srgb, var(--primary) 60%, transparent) !important;
                    background-color: color-mix(in srgb, var(--primary) 5%, transparent) !important;
                }
                .ProseMirror ul[data-type="taskList"] li > label > input[type="checkbox"]:checked {
                    background-color: var(--primary) !important;
                    border-color: var(--primary) !important;
                }
                .ProseMirror ul[data-type="taskList"] li > label > input[type="checkbox"]:checked::after {
                    content: '' !important;
                    position: absolute !important;
                    top: 45% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) rotate(45deg) !important;
                    width: 5px !important;
                    height: 10px !important;
                    border: solid white !important;
                    border-width: 0 2px 2px 0 !important;
                    border-radius: 1px !important;
                }
                .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div > p {
                    text-decoration: line-through;
                    color: color-mix(in srgb, var(--muted-foreground) 50%, transparent);
                    text-decoration-color: color-mix(in srgb, var(--muted-foreground) 30%, transparent);
                    opacity: 0.8;
                }
                /* Headings - Clean & Hierarchical */
                .ProseMirror h1 {
                    font-size: 2.25em;
                    font-weight: 700;
                    margin-top: 1.2em;
                    margin-bottom: 0.5em;
                    line-height: 1.15;
                    letter-spacing: -0.035em;
                    color: var(--foreground);
                }
                .ProseMirror h2 {
                    font-size: 1.6em;
                    font-weight: 600;
                    margin-top: 1.2em;
                    margin-bottom: 0.5em;
                    line-height: 1.25;
                    letter-spacing: -0.025em;
                    color: hsl(var(--foreground) / 0.95);
                }
                .ProseMirror h3 {
                    font-size: 1.25em;
                    font-weight: 600;
                    margin-top: 1.2em;
                    margin-bottom: 0.4em;
                    line-height: 1.3;
                    letter-spacing: -0.015em;
                    color: hsl(var(--foreground) / 0.9);
                }
                /* Horizontal Rule */
                .ProseMirror hr {
                    border: none !important;
                    height: 2px !important;
                    background-color: var(--border) !important;
                    margin: 2.5em 0 !important;
                    opacity: 1 !important;
                    clear: both !important;
                    display: block !important;
                }
            `}</style>
        </div>
    )
} 
