import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './theme.css';

export default function Header(){
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  React.useEffect(()=>{
    supabase.auth.getUser().then(res => { if(res && res.data && res.data.user) setUser(res.data.user)}).catch(()=>{});
  },[]);

  return (
    <div className="header">
      <div className="brand">
        <div className="logo">PL</div>
        <div>
          <div style={{fontSize:16,fontWeight:800}}>PLS Campus</div>
          <div className="muted small">Clubs · Events · Meetups</div>
        </div>
      </div>
      <div className="nav-actions">
        <button className="btn btn-ghost" onClick={()=>navigate('/home')}>Home</button>
        <button className="btn btn-ghost" onClick={()=>navigate('/dashboard')}>Dashboard</button>
  <button className="btn btn-primary" onClick={()=>navigate('/organization/new')}>Add Organization</button>
        <div className="profile-pill" onClick={()=>navigate('/profile')}> 
          <div className="avatar">{user && user.email ? user.email.charAt(0).toUpperCase() : 'U'}</div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start'}}>
            <div style={{fontWeight:700}}>{user ? (user.email.split('@')[0]) : 'Guest'}</div>
            <div className="small muted">{user ? user.email : 'Not signed in'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
