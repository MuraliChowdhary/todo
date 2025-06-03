import LoginForm from "@/components/auth/LoginForm"
import { AuthProvider } from "@/components/contexts/AuthContext"

export default function Signup() {
     return <div>
        <AuthProvider>
             <LoginForm/>
        </AuthProvider>
         
     </div>
}