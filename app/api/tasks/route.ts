import {NextResponse} from "next/server"
import {loadTasks,saveTasks} from "@/lib/tasks"

export async function GET(){

  const data = loadTasks()
  return NextResponse.json(data.tasks)
}

export async function POST(req:Request){

  const body = await req.json()

  const data = loadTasks()

  const task = {
    ...body,
    id:crypto.randomUUID(),
    created_at:new Date().toISOString()
  }

  data.tasks.push(task)

  saveTasks(data)

  return NextResponse.json(task)
}