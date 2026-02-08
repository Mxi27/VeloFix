
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
    console.log('Testing .contains() query...')

    // Try to query with a filter on the array
    // We use a dummy UUID to test the syntax validility
    const dummyId = '00000000-0000-0000-0000-000000000000'

    const { data, error } = await supabase
        .from('orders')
        .select('id, mechanic_ids')
        .contains('mechanic_ids', [dummyId])
        .limit(1)

    if (error) {
        console.error('❌ Error executing .contains():')
        console.error(JSON.stringify(error, null, 2))

        // Check hints
        if (error.code === '42883') { // Operator does not exist
            console.log('Hint: The column might not be defined as an array (UUID[]) or GIN index issue.')
        }
    } else {
        console.log('✅ .contains() query executed successfully (even if no results).')
    }
}

verify()
