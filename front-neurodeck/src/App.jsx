import { useEffect, useState } from 'react'
// import { BrowserRouter as Router, Routes, Route} from 'react-router-dom'
// import { Signup, Login, Profile, VerifyEmail, ForgotPassword } from './components/auth'
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainMenu from "./pages/MainMenu";
import './styles/App.css'

function App() {
  const [page, setPage] = useState("login");

  const renderPage = () => {
    switch (page) {
      case "login":
        return <LoginPage setPage={setPage} />;
      case "register":
        return <RegisterPage setPage={setPage} />;
      case "main":
        return <MainMenu setPage={setPage} />;
      default:
        return <LoginPage setPage={setPage} />;
    }
  };

  return <div>{renderPage()}</div>;



  
  // return (
  //   <>
  //     <Router>
  //       <Routes>
  //         <Route path='/' element = {<Signup/>} />
  //         <Route path='/login' element = {<Login/>} />
  //         <Route path='/dashboard' element = {<Profile/>} />
  //         <Route path='/otp/verify' element = {<VerifyEmail/>} />
  //         <Route path='/forget_password' element = {<ForgetPassword/>} />
  //       </Routes>
  //     </Router>
  //   </>
  // )
}

// export default function App() {
//   return <h1>Hello Prototype</h1>;
// }

export default App
