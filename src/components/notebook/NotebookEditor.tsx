import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useState, useRef } from 'react'
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
                class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none max-w-none',
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

    const executeCommand = (cmd: SlashCommand) => {
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
    }

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

                    // Backspace Behavior
                    if (event.key === 'Backspace') {
                        const { state } = view
                        const { selection } = state
                        const { empty, $from } = selection

                        if (empty && $from.parent.type.name === 'taskItem' && $from.parent.textContent.length === 0) {
                            editor.chain().focus().toggleTaskList().run()
                            return true
                        }
                    }
                    return false
                }
            }
        })
    }, [editor, slashMenuOpen, selectedIndex, filteredCommands])

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
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className="fixed z-50 bg-card/95 backdrop-blur-xl border border-border/30 rounded-xl shadow-2xl overflow-hidden min-w-[280px]"
                        style={{ top: slashCoordinates.top, left: slashCoordinates.left }}
                    >
                        <div className="py-1.5 w-[260px] max-h-[320px] overflow-y-auto bg-popover">
                            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-medium select-none">
                                Elemente
                            </div>
                            {filteredCommands.length > 0 ? (
                                filteredCommands.map((cmd, i) => (
                                    <button
                                        key={cmd.label}
                                        className={cn(
                                            "w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition-colors",
                                            i === selectedIndex
                                                ? "bg-primary/10 text-primary"
                                                : "text-foreground hover:bg-muted/50"
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            executeCommand(cmd)
                                        }}
                                        onMouseEnter={() => setSelectedIndex(i)}
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                            i === selectedIndex
                                                ? "bg-primary/15 text-primary"
                                                : "bg-muted/40 text-muted-foreground"
                                        )}>
                                            <cmd.icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-[13px]">{cmd.label}</div>
                                            <div className="text-[11px] text-muted-foreground/50">{cmd.description}</div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-4 text-center text-xs text-muted-foreground/60">
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
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    line-height: 1.7;
                }
                .ProseMirror p {
                    margin-bottom: 0.75em;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: rgba(120, 120, 128, 0.3);
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                /* Lists */
                .ProseMirror ul, .ProseMirror ol {
                    padding-left: 1.25em;
                    margin-bottom: 0.75em;
                }
                .ProseMirror li {
                    margin-bottom: 0.35em;
                }
                .ProseMirror li p {
                    margin-bottom: 0;
                }
                /* Task Lists - Apple Notes Style */
                ul[data-type="taskList"] {
                    list-style: none;
                    padding: 0;
                    margin-bottom: 0.5em;
                }
                ul[data-type="taskList"] li {
                    display: flex;
                    align-items: center; /* Vertically center checkbox with text */
                    margin-bottom: 0.35em;
                    min-height: 24px; /* Ensure consistent height */
                }
                ul[data-type="taskList"] li > label {
                    flex: 0 0 auto;
                    margin-right: 0.6rem;
                    user-select: none;
                    display: flex;
                    align-items: center;
                }
                ul[data-type="taskList"] li > div {
                    flex: 1 1 auto;
                    line-height: 1.5; /* Better vertical spacing */
                }
                /* Apple Notes Style Checkbox */
                ul[data-type="taskList"] li > label > input {
                    appearance: none;
                    -webkit-appearance: none;
                    width: 18px;
                    height: 18px;
                    border: 1.5px solid rgba(120, 120, 128, 0.25);
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    position: relative;
                    flex-shrink: 0;
                }
                ul[data-type="taskList"] li > label > input:hover {
                    border-color: rgba(120, 120, 128, 0.4);
                }
                ul[data-type="taskList"] li > label > input:checked {
                    background: rgb(0, 122, 255);
                    border-color: rgb(0, 122, 255);
                }
                ul[data-type="taskList"] li > label > input:checked::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(45deg);
                    width: 4px;
                    height: 8px;
                    border: solid white;
                    border-width: 0 2px 2px 0;
                }
                ul[data-type="taskList"] li[data-checked="true"] > div > p {
                    text-decoration: line-through;
                    color: rgba(120, 120, 128, 0.4);
                    text-decoration-color: rgba(120, 120, 128, 0.2);
                    opacity: 0.8;
                }
                /* Headings - Clean & Hierarchical */
                .ProseMirror h1 {
                    font-size: 2em;
                    font-weight: 700;
                    margin-top: 1.2em;
                    margin-bottom: 0.5em;
                    line-height: 1.2;
                    letter-spacing: -0.02em;
                }
                .ProseMirror h2 {
                    font-size: 1.5em;
                    font-weight: 600;
                    margin-top: 1em;
                    margin-bottom: 0.4em;
                    line-height: 1.3;
                    letter-spacing: -0.01em;
                }
                .ProseMirror h3 {
                    font-size: 1.25em;
                    font-weight: 600;
                    margin-top: 0.8em;
                    margin-bottom: 0.3em;
                    line-height: 1.4;
                }
                /* Horizontal Rule */
                .ProseMirror hr {
                    border: none;
                    border-top: 1px solid rgba(120, 120, 128, 0.15);
                    margin: 1.5em 0;
                }
            `}</style>
        </div>
    )
} 
