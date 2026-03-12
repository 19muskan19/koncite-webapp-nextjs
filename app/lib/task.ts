import fs from "fs"
import path from "path"

const file = path.join(process.cwd(),"tasks_data.json")

export function loadTasks(){

  if(!fs.existsSync(file)){

    const seed = {
      tasks:[
        {
          id:crypto.randomUUID(),
          title:"Design new landing page",
          assigned_to:"Bob Smith",
          assigned_by:"Alice Johnson",
          status:"in_progress",
          priority:"high",
          due_date:"2026-03-15",
          created_at:new Date().toISOString()
        }
      ]
    }

    fs.writeFileSync(file,JSON.stringify(seed,null,2))
  }

  return JSON.parse(fs.readFileSync(file,"utf8"))
}

export function saveTasks(data:any){
  fs.writeFileSync(file,JSON.stringify(data,null,2))
}