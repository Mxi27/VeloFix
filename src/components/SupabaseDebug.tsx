import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SupabaseDebug() {
    const [status, setStatus] = useState<string>("Not tested")
    const [details, setDetails] = useState<any>(null)

    const testConnection = async () => {
        setStatus("Testing...")
        try {
            // Test 1: Check if Supabase client is initialized
            console.log("🔍 Supabase URL:", import.meta.env.VITE_SUPABASE_URL)
            console.log("🔍 Anon Key exists:", !!import.meta.env.VITE_SUPABASE_ANON_KEY)

            // Test 2: Try to get session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
            console.log("📋 Session check:", { sessionData, sessionError })

            // Test 3: Try a simple query
            const { data, error } = await supabase.from('workshops').select('count').limit(1)
            console.log("🔎 Workshop query test:", { data, error })

            if (error) {
                setStatus(`❌ Connection Error: ${error.message}`)
                setDetails(error)
            } else {
                setStatus("✅ Connection successful!")
                setDetails({ sessionData, queryResult: data })
            }
        } catch (err: any) {
            console.error("💥 Exception:", err)
            setStatus(`❌ Exception: ${err.message}`)
            setDetails(err)
        }
    }

    return (
        <Card className="fixed bottom-4 right-4 w-96 z-50 border-2 border-yellow-500">
            <CardHeader>
                <CardTitle className="text-sm">🔧 Supabase Debug</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <Button onClick={testConnection} size="sm" className="w-full">
                    Test Connection
                </Button>
                <div className="text-xs font-mono p-2 bg-muted rounded">
                    {status}
                </div>
                {details && (
                    <details className="text-xs">
                        <summary className="cursor-pointer">Details</summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                            {JSON.stringify(details, null, 2)}
                        </pre>
                    </details>
                )}
            </CardContent>
        </Card>
    )
}
