import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [msg, setMsg] = useState("Loading...")

  useEffect(() => {
    fetch("http://127.0.0.1:8000/testapp/hello/")
      .then(res => res.json())
      .then(data => setMsg(data.message))
      .catch(err => {
        console.error(err)
        setMsg("Error connecting to backend")
      })
  }, [])

  return <h1>{msg}</h1>
}

export default App
