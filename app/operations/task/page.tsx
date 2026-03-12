"use client"

import {useEffect,useState} from "react"

export default function TaskPage(){

  const [tasks,setTasks]=useState<any[]>([])
  const [title,setTitle]=useState("")

  async function load(){
    const res = await fetch("/api/tasks")
    setTasks(await res.json())
  }

  async function create(){

    await fetch("/api/tasks",{
      method:"POST",
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        title,
        assigned_to:"User",
        assigned_by:"User",
        status:"todo",
        priority:"medium"
      })
    })

    setTitle("")
    load()
  }

  async function del(id:string){

    await fetch(`/api/tasks/${id}`,{
      method:"DELETE"
    })

    load()
  }

  useEffect(()=>{
    load()
  },[])

  return(

    <div style={{padding:40}}>

      <h1>TaskFlow</h1>

      <input
        value={title}
        onChange={e=>setTitle(e.target.value)}
        placeholder="Task title"
      />

      <button onClick={create}>
        Create
      </button>

      <hr/>

      {tasks.map(t=>(
        <div key={t.id}>

          <b>{t.title}</b>

          <button onClick={()=>del(t.id)}>
            delete
          </button>

        </div>
      ))}

    </div>
  )
}