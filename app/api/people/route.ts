import {NextResponse} from "next/server"
import {loadTasks} from "@/lib/tasks"

export async function GET(){

  const data = loadTasks()

  const names = new Set<string>()

  data.tasks.forEach((t:any)=>{
    names.add(t.assigned_to)
    names.add(t.assigned_by)
  })

  return NextResponse.json({
    names:[...names]
  })
}