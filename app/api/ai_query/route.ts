import { NextResponse } from "next/server"
import OpenAI from "openai"
import { loadTasks, saveTasks } from "@/lib/tasks"

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION }
})

const TOOLS = [
{
type:"function",
function:{
name:"list_tasks",
description:"List tasks with optional filters",
parameters:{
type:"object",
properties:{
assigned_to:{type:"string"},
assigned_by:{type:"string"},
status:{type:"string"},
priority:{type:"string"}
}
}
}
},
{
type:"function",
function:{
name:"create_task",
description:"Create new task",
parameters:{
type:"object",
properties:{
title:{type:"string"},
assigned_to:{type:"string"},
assigned_by:{type:"string"},
priority:{type:"string"},
status:{type:"string"},
due_date:{type:"string"}
},
required:["title","assigned_to","assigned_by"]
}
}
},
{
type:"function",
function:{
name:"update_task",
description:"Update a task",
parameters:{
type:"object",
properties:{
task_id:{type:"string"},
status:{type:"string"},
priority:{type:"string"},
title:{type:"string"}
},
required:["task_id"]
}
}
},
{
type:"function",
function:{
name:"delete_task",
description:"Delete a task",
parameters:{
type:"object",
properties:{task_id:{type:"string"}},
required:["task_id"]
}
}
},
{
type:"function",
function:{
name:"get_summary",
description:"Get task statistics",
parameters:{type:"object",properties:{}}
}
}
]

function runTool(name:string,args:any){

const data = loadTasks()

if(name==="list_tasks"){
let result = data.tasks

if(args.assigned_to)
result = result.filter((t:any)=>t.assigned_to===args.assigned_to)

if(args.status)
result = result.filter((t:any)=>t.status===args.status)

return JSON.stringify(result)
}

if(name==="create_task"){

const task = {
id:crypto.randomUUID(),
title:args.title,
assigned_to:args.assigned_to,
assigned_by:args.assigned_by,
status:args.status || "todo",
priority:args.priority || "medium",
due_date:args.due_date || "",
created_at:new Date().toISOString()
}

data.tasks.push(task)
saveTasks(data)

return JSON.stringify(task)
}

if(name==="update_task"){

const t = data.tasks.find((x:any)=>x.id===args.task_id)

Object.assign(t,args)

saveTasks(data)

return JSON.stringify(t)
}

if(name==="delete_task"){

data.tasks = data.tasks.filter((t:any)=>t.id!==args.task_id)

saveTasks(data)

return JSON.stringify({success:true})
}

if(name==="get_summary"){

const byStatus:any = {}

data.tasks.forEach((t:any)=>{
byStatus[t.status] = (byStatus[t.status]||0)+1
})

return JSON.stringify(byStatus)
}

return JSON.stringify({error:"unknown tool"})
}

export async function POST(req:Request){

const {query} = await req.json()

const messages:any = [
{role:"system",content:"You are a task management assistant."},
{role:"user",content:query}
]

for(let i=0;i<6;i++){

const res = await client.chat.completions.create({
model:process.env.AZURE_OPENAI_DEPLOYMENT!,
messages,
tools:TOOLS,
tool_choice:"auto"
})

const msg = res.choices[0].message

if(!msg.tool_calls){
return NextResponse.json({response:msg.content})
}

messages.push(msg)

for(const tc of msg.tool_calls){

const result = runTool(
tc.function.name,
JSON.parse(tc.function.arguments)
)

messages.push({
role:"tool",
tool_call_id:tc.id,
content:result
})
}

}

return NextResponse.json({response:"Agent stopped after max iterations"})
}