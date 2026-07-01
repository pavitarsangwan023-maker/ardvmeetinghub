# Ardvmeetinghub - Project Explanation Guide

Ye document aapko shuru se aakhir tak samjhayega ki **Ardvmeetinghub** project kaise bana, isme kaun kaun si technologies use hui hain, aur code mein kaun si cheez kahan rakhi hai. Ye guide aapko project samajhne aur kisi aur ko (jaise interviewer ya teacher ko) explain karne mein bahut madad karegi.

---

## 1. Project Overview (Ardvmeetinghub kya hai?)
Ardvmeetinghub ek **Full-Stack Video Conferencing Web Application** hai, jo bilkul Zoom ya Google Meet ki tarah kaam karta hai. Isme log account bana sakte hain, meeting create kar sakte hain, aur real-time mein ek dusre ko dekh aur sun sakte hain.

### 🛠️ Tech Stack (Kaunsi technology use ki gayi?)
- **Frontend (UI & Design):** React.js, TypeScript, Vite, Tailwind CSS.
- **Backend (Server & Database):** Python, FastAPI, SQLAlchemy (Database ke liye), aur SQLite.
- **Real-time Communication:** 
  - **WebRTC:** Video aur Audio ko direct browsers ke beech bhejne ke liye (Peer-to-Peer).
  - **Socket.io:** Chat messages aur WebRTC ke connections (Signaling) set up karne ke liye.

---

## 2. Code Structure (Kaunsi file kahan hai?)
Project ko 2 main hisson mein baanta gaya hai: `frontend` aur `backend`.

### 📂 Backend Folder (`/backend`)
Backend ka kaam user data save karna aur socket connection sambhalna hai.
- `app/main.py`: Backend ka starting point. Yahan FastAPI aur Socket.io server start hota hai.
- `app/database.py`: Database connection ki settings.
- `app/models/`: Database tables (Jaise `User`, `Meeting`).
- `app/routers/`: API Endpoints (Jaise Login, Register, Meeting create karna).
- `app/websocket/`: Yahan `signaling.py` file hai jo Socket.io ke events (chat messages, raise hand, media status) ko sambhalti hai.

### 📂 Frontend Folder (`/frontend/src`)
Frontend ka kaam user ko sundar design dikhana aur WebRTC sambhalna hai.
- `main.tsx` & `App.tsx`: App ki shuruaat aur page routing (konse link par konsa page khulega).
- `pages/`: Alag-alag screen ke pages.
  - `Login.tsx` & `Register.tsx`: User login aur signup.
  - `Dashboard.tsx`: Zoom jaisa home page jahan se meeting join ya create hoti hai.
  - `MeetingRoom.tsx`: Asli meeting ka page jahan video call hoti hai.
- `components/`: Chote-chote UI parts (Jaise Navbar, Buttons, Chat Panel, Video Grid).
- `hooks/useWebRTC.ts`: **Ye frontend ki sabse important file hai.** Isi ke andar do logo ke beech video call connect karne ka poora logic (WebRTC) likha hai.
- `context/`: User ka login data aur dark/light theme save rakhne ke liye.

---

## 3. Step-by-Step Journey (Humne Shuru se End tak kya kiya?)

### Step 1: Backend Foundation & Authentication
Sabse pehle humne backend banaya. Database mein tables banaye taaki users apna account bana sakein. Password ko secure karne ke liye hashing use ki aur Login/Register ka API banaya.

### Step 2: Frontend UI & Pages
Uske baad humne React mein frontend banaya. Tailwind CSS ka use karke ek premium dark/light mode wali UI banayi. Login page, Register page aur Dashboard banaya gaya jahan user login karke aa sakta hai.

### Step 3: WebRTC Video Calling (The Hardest Part)
Iske baad humne asal video calling feature add kiya:
- Jab koi meeting join karta hai, toh uske computer ka camera aur mic permission maangta hai (`navigator.mediaDevices.getUserMedia`).
- Phir Socket.io ki madad se "Signaling" hoti hai (yani do computers ek dusre ka address exchange karte hain).
- Jab connection ban jata hai, toh WebRTC dono ke beech direct video aur audio streams bhejta hai. Ye logic `useWebRTC.ts` mein likha gaya hai.

### Step 4: Core Meeting Features Add Karna
Video chalne ke baad, humne meeting ke andar ye features dale:
- **Chat System:** Log meeting mein message bhej sakte hain.
- **Screen Sharing:** Apna laptop ka screen sabko dikhane ke liye `getDisplayMedia` API ka use kiya.
- **Whiteboard:** Ek drawing board banaya jahan sab milkar draw kar sakte hain.
- **Reactions & Raise Hand:** Emojis bhejna jo screen par udte hue dikhte hain.

### Step 5: Advanced Host Controls (Security)
Meeting ko secure banane ke liye Host (jisne meeting banayi) ko powers di gayi:
- **Waiting Room:** Koi bhi direct meeting mein nahi aa sakta, Host pehle use 'Admit' karega.
- **Mute & Kick:** Host kisi ka bhi mic band kar sakta hai ya use meeting se bahar nikal sakta hai.
- **Lock Meeting:** Meeting lock karne ke baad koi naya banda enter nahi kar sakta.

### Step 6: Zoom-Level Redesign & PWA
Aakhir mein humne app ke look aur feel ko ekdum Zoom Workplace jaisa professional banaya:
- **Dashboard Redesign:** 4 bade buttons (New Meeting, Join, Schedule, Share Screen) aur ek calendar widget add kiya.
- **Profile Status:** User apni status (Available, Busy, DND) set kar sakta hai.
- **PWA (Progressive Web App):** Humne website ko aisi capabilities di ki wo direct phone ya laptop mein ek Software (App) ki tarah Install ho sake. Sath mein "Check for updates" ka button bhi diya.

---

## 4. Key Concepts Explain Karne Ke Liye (Interview Tips)

Agar aapse koi puche ki *"Video Call kaam kaise karti hai?"*, toh aap ye 3 steps batana:

1. **Signaling (Socket.io ka kaam):** Jab 2 log call karte hain, unhe ek dusre ka IP address nahi pata hota. Socket.io ek postman ki tarah kaam karta hai aur dono ki details ek dusre tak pahunchata hai. Is process ko Signaling kehte hain.
2. **Peer-to-Peer Connection (WebRTC):** Ek baar details exchange ho jaye, toh dono computers ek direct connection bana lete hain. Ab video/audio server se hokar nahi jata, balki direct ek computer se dusre computer tak jata hai (Isse lag/delay nahi hota).
3. **Media Tracks:** Hamare camera aur mic ki video aur aawaz ko 'Tracks' bola jata hai, jo is connection ke zariye dusre bande ko bheji jati hai aur uski screen par dikhti hai.

---
**Note:** Ye document aapke device mein hamesha ke liye save ho gaya hai. Aap isey padh kar kisi ko bhi is project ka a to z samjha sakte hain!
