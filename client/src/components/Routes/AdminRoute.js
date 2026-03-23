import { useState,useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet } from "react-router-dom";
import axios from 'axios';
import toast from "react-hot-toast";
import Spinner from "../Spinner";

export default function AdminRoute(){
    const [ok,setOk] = useState(false)
    const [auth,setAuth] = useAuth()

    useEffect(()=> {
        const authCheck = async () => {
            try {
                const res = await axios.get("/api/v1/auth/admin-auth");
                if(res.data.ok){
                    setOk(true);
                } else {
                    setOk(false);
                }
            } catch (error) {
                console.log(error);
                toast.error(error?.response?.data?.message || error?.message || "Something went wrong");
                setOk(false);
            }
        };
        if (auth?.token) authCheck();
    }, [auth?.token]);
    
    return ok ? <Outlet /> : <Spinner/>;
}