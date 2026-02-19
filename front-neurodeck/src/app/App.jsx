import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import { Signup, Login, Profile, VerifyEmail, ForgotPassword } from '../components/auth'
import './styles/App.css'

function App() {
  const [count, setCount] = useState("Loading...")

  // useEffect(() => {
  //   fetch("http://127.0.0.1:8000/testapp/hello/")
  //     .then(res => res.json())
  //     .then(data => setMsg(data.message))
  //     .catch(err => {
  //       console.error(err)
  //       setMsg("Error connecting to backend")
  //     })
  // }, [])

  return (
    <>
      <Router>
        <Routes>
          <Route path='/' element = {<Signup/>} />
          <Route path='/login' element = {<Login/>} />
          <Route path='/dashboard' element = {<Profile/>} />
          <Route path='/otp/verify' element = {<VerifyEmail/>} />
          <Route path='/forget_password' element = {<ForgetPassword/>} />
        </Routes>
      </Router>
    </>
  )
}

export default App
