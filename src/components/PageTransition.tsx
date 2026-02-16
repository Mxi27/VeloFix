import { type ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function PageTransition({ children, className }: { children: ReactNode, className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.25,
                ease: "easeOut"
            }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    )
}
