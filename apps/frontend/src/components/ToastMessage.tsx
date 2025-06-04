"use client"
import {toast} from "sonner"
import { Button } from "@/components/ui/button"
export function SonnerDemo({message} : any) {
  return (
    
    <Button
      variant="outline"
      onClick={() =>
        toast.info('Be at the area 10 minutes before the event time')
      }
    >
      Show Toast
    </Button>

    
  )
}