import {NextResponse} from "next/server"
import {loadTasks,saveTasks} from "@/lib/tasks"

export async function PATCH(
  req:Request,
  {params}:{params:{id:string}}
){

  const body = await req.json()

  const data = loadTasks()

  const task = data.tasks.find((t:any)=>t.id===params.id)

  Object.assign(task,body)

  saveTasks(data)

  return NextResponse.json(task)
}

export async function DELETE(
  req:Request,
  {params}:{params:{id:string}}
){

  const data = loadTasks()

  data.tasks = data.tasks.filter(
    (t:any)=>t.id!==params.id
  )

  saveTasks(data)

  return NextResponse.json({success:true})
}