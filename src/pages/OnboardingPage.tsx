import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { toastSuccess, toastError } from '@/lib/toast-utils'
import { PageTransition } from "@/components/PageTransition"
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout"
import { WelcomeStep } from "@/components/onboarding/WelcomeStep"
import { CreateWorkshopForm } from "@/components/onboarding/CreateWorkshopForm"
import { JoinWorkshopForm } from "@/components/onboarding/JoinWorkshopForm"

type OnboardingStep = 'welcome' | 'create' | 'join'

export default function OnboardingPage() {
    const { user, workshopId, refreshSession, signOut } = useAuth()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')

    // Security check: if user already has a workshop, redirect
    if (workshopId) {
        navigate("/dashboard")
        return null
    }

    const handleCreateWorkshop = async (name: string, address: string) => {
        if (!user) return
        setIsLoading(true)

        try {
            // 1. Create Workshop
            const { data: workshop, error: wsError } = await supabase
                .from('workshops')
                .insert({
                    name: name,
                    address: address,
                    owner_user_id: user.id
                })
                .select()
                .single()

            if (wsError) throw wsError
            if (!workshop) throw new Error("No workshop returned")

            // 2. Update Employee Record (Assign to this workshop as admin)
            const { data: updatedRows, error: empError } = await supabase
                .from('employees')
                .update({
                    workshop_id: workshop.id,
                    role: 'admin'
                })
                .eq('user_id', user.id)
                .select()

            if (empError) throw empError

            // SELF-HEALING: If no employee record existed yet (Signup failed?), create one now.
            if (!updatedRows || updatedRows.length === 0) {
                const { error: insertError } = await supabase
                    .from('employees')
                    .insert({
                        user_id: user.id,
                        workshop_id: workshop.id,
                        role: 'admin',
                        email: user.email || 'unknown@example.com',
                        name: user.user_metadata?.full_name || 'Admin',
                        active: true
                    })

                if (insertError) throw insertError
            }

            await refreshSession()
            navigate("/dashboard")

        } catch (error: any) {
            toastError('Fehler beim Erstellen', error.message || 'Ein unbekannter Fehler ist aufgetreten.')
            setIsLoading(false)
        }
    }

    const handleJoinWorkshop = async (code: string) => {
        if (!user) return
        setIsLoading(true)

        try {
            const { data, error } = await supabase
                .rpc('join_workshop_by_code', {
                    p_invite_code: code,
                    p_user_id: user.id,
                    p_user_email: user.email || '',
                    p_user_name: user.user_metadata?.full_name || 'Mitarbeiter'
                })

            if (error) throw error

            if (!data.success) {
                toastError('Fehler', data.message || 'Werkstatt konnte nicht beigetreten werden.')
                setIsLoading(false)
                return
            }

            await refreshSession()
            toastSuccess('Erfolgreich', 'Sie sind der Werkstatt beigetreten!')
            navigate("/dashboard")

        } catch (error: any) {
            toastError('Fehler beim Beitreten', error.message || 'Unbekannter Fehler')
            setIsLoading(false)
        }
    }

    const renderStep = () => {
        switch (currentStep) {
            case 'welcome':
                return (
                    <OnboardingLayout
                        title="Willkommen bei VeloFix"
                        description="Los geht's! Richten Sie Ihren Arbeitsbereich ein."
                        step={1}
                        totalSteps={2}
                    >
                        <WelcomeStep
                            onSelectCreate={() => setCurrentStep('create')}
                            onSelectJoin={() => setCurrentStep('join')}
                        />
                        <div className="mt-8 text-center">
                            <button
                                onClick={() => signOut()}
                                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                            >
                                Abmelden
                            </button>
                        </div>
                    </OnboardingLayout>
                )
            case 'create':
                return (
                    <OnboardingLayout
                        title="Neue Werkstatt erstellen"
                        description="Geben Sie die Daten Ihrer Werkstatt ein."
                        step={2}
                        totalSteps={2}
                        onBack={() => setCurrentStep('welcome')}
                    >
                        <CreateWorkshopForm onSubmit={handleCreateWorkshop} isLoading={isLoading} />
                    </OnboardingLayout>
                )
            case 'join':
                return (
                    <OnboardingLayout
                        title="Werkstatt beitreten"
                        description="Geben Sie den Einladungs-Code ein um beizutreten."
                        step={2}
                        totalSteps={2}
                        onBack={() => setCurrentStep('welcome')}
                    >
                        <JoinWorkshopForm onSubmit={handleJoinWorkshop} isLoading={isLoading} />
                    </OnboardingLayout>
                )
        }
    }

    return (
        <PageTransition>
            {renderStep()}
        </PageTransition>
    )
}

