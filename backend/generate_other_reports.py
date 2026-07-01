import asyncio
from playwright.async_api import async_playwright
import os
import base64

MAJOR_HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Major Project Report: Ardvmeetinghub</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; font-size: 14px; }}
        h1 {{ color: #0a0f1f; text-align: center; font-size: 2.8em; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 2px; }}
        h2 {{ color: #06b6d4; border-bottom: 2px solid #06b6d4; padding-bottom: 5px; margin-top: 35px; font-size: 1.8em; }}
        h3 {{ color: #1e293b; margin-top: 20px; font-size: 1.4em; }}
        p {{ margin-bottom: 15px; text-align: justify; }}
        .center {{ text-align: center; }}
        .cover {{ height: 80vh; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 5px solid #0a0f1f; padding: 40px; border-radius: 10px; }}
        .subtitle {{ font-size: 1.6em; color: #64748b; margin-bottom: 50px; font-weight: 300; }}
        .screenshot {{ max-width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px auto; display: block; }}
        .page-break {{ page-break-before: always; }}
        ul {{ margin-bottom: 15px; padding-left: 20px; }}
        li {{ margin-bottom: 8px; }}
        .highlight {{ background: #f1f5f9; padding: 15px; border-left: 4px solid #06b6d4; border-radius: 4px; margin: 20px 0; }}
        .table-container {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
        th, td {{ border: 1px solid #cbd5e1; padding: 10px; text-align: left; }}
        th {{ background-color: #f8fafc; font-weight: bold; color: #0f172a; }}
    </style>
</head>
<body>
    <div class="cover">
        <h1>MAJOR PROJECT REPORT</h1>
        <div class="subtitle">Ardvmeetinghub: Advanced Real-time Video Conferencing Platform</div>
        <p style="font-size: 1.2em;"><strong>Developed By:</strong> {dev_name}</p>
        <p style="font-size: 1.1em; color: #64748b;">A Comprehensive Study and Implementation of WebRTC & Modern Web Architecture</p>
    </div>

    <div class="page-break"></div>

    <h2>1. Abstract & Introduction</h2>
    <p>In the post-pandemic digital era, real-time virtual communication has become the backbone of enterprise and personal collaboration. Ardvmeetinghub is a modern, highly scalable, and secure video conferencing application built from the ground up to solve the challenges of remote communication. Inspired by enterprise solutions like Zoom and Google Meet, Ardvmeetinghub integrates advanced Peer-to-Peer (P2P) signaling, real-time media streaming, and secure data handling into a unified platform.</p>
    <p>The primary objective of this project was to design a robust architecture capable of handling concurrent users with minimal latency, while providing an intuitive, aesthetically pleasing user interface characterized by modern design paradigms (e.g., glassmorphism, dark mode compatibility).</p>

    <h2>2. System Architecture</h2>
    <p>The system utilizes a decoupled Client-Server architecture with state-of-the-art technologies at every layer. The architecture ensures separation of concerns, scalability, and high maintainability.</p>
    <div class="highlight">
        <strong>Flow Overview:</strong> The client (React App) authenticates via REST APIs with the Backend (FastAPI). Once authenticated, the user connects to the signaling server via WebSockets. When a meeting is initiated, WebRTC protocols establish a direct P2P connection between clients for media transmission, ensuring maximum privacy and minimal server load.
    </div>

    <h3>2.1 Server Details</h3>
    <table class="table-container">
        <tr><th>Component</th><th>Details / Live Environment</th></tr>
        <tr><td><strong>Database Server</strong></td><td>Hosted remotely on a dedicated cloud instance (IP: <strong>51.89.97.76</strong>). Engine: PostgreSQL 14+.</td></tr>
        <tr><td><strong>Backend API Server</strong></td><td>Python ASGI Server (Uvicorn) handling HTTP/1.1 and WebSockets.</td></tr>
        <tr><td><strong>Frontend Host</strong></td><td>Vite Development Server with Hot Module Replacement (HMR).</td></tr>
    </table>

    <div class="page-break"></div>

    <h2>3. Comprehensive Technology Stack</h2>
    <p>The selection of tools was driven by the need for performance, security, and developer ergonomics.</p>
    
    <h3>3.1 Frontend Ecosystem</h3>
    <ul>
        <li><strong>React.js & TypeScript:</strong> Provides a strongly-typed, component-based UI architecture.</li>
        <li><strong>Tailwind CSS & Lucide Icons:</strong> Enables rapid, utility-first styling with premium vector icons.</li>
        <li><strong>Vite & PWA Plugins:</strong> Ensures lightning-fast builds and enables the application to be installed locally as a Progressive Web App (PWA).</li>
        <li><strong>ZegoCloud UIKits:</strong> Provides robust pre-built communication layers for WebRTC media streams, handling edge cases like network drops and device management seamlessly.</li>
    </ul>

    <h3>3.2 Backend & Database Ecosystem</h3>
    <ul>
        <li><strong>FastAPI (Python):</strong> An ultra-fast web framework leveraging Python's `asyncio` for high-throughput API endpoints.</li>
        <li><strong>PostgreSQL:</strong> The primary relational database, chosen for its ACID compliance and reliability in production environments.</li>
        <li><strong>SQLAlchemy & Alembic:</strong> Advanced ORM and migration tools for structured database schema management.</li>
        <li><strong>Passlib & bcrypt:</strong> Industry-standard cryptographic hashing for secure password storage.</li>
        <li><strong>PyJWT:</strong> For generating and validating secure, stateless JSON Web Tokens (JWT) used in authentication.</li>
    </ul>

    <div class="page-break"></div>

    <h2>4. Implementation Details & User Interface</h2>

    <h3>4.1 Secure Registration & Authentication</h3>
    <p>Security is paramount. The registration module collects user data, hashes passwords using bcrypt, and stores the user securely in the remote PostgreSQL server. A JWT is issued upon login to maintain session state.</p>
    <img src="{register_img}" class="screenshot" alt="Registration Interface" />
    <p class="center"><em>Figure 1: The Registration and Authentication Interface</em></p>

    <h3>4.2 Centralized Dashboard</h3>
    <p>The dashboard acts as the command center. It implements complex state management to fetch user profiles, display action buttons (Create Meeting, Join Meeting), and provides settings management including dark mode toggles.</p>
    <img src="{dashboard_img}" class="screenshot" alt="User Dashboard" />
    <p class="center"><em>Figure 2: The Main User Dashboard Interface</em></p>

    <div class="page-break"></div>

    <h3>4.3 Active Meeting Room & Media Streaming</h3>
    <p>The core feature of Ardvmeetinghub. Utilizing WebRTC, this interface handles dynamic audio/video tracks, screen sharing, and real-time chat. The UI automatically adjusts layouts based on the number of participants.</p>
    <img src="{meeting_img}" class="screenshot" alt="Active Meeting Room" />
    <p class="center"><em>Figure 3: Active Video Conferencing Environment</em></p>

    <h2>5. Key Challenges Overcome</h2>
    <ul>
        <li><strong>Cross-Origin Resource Sharing (CORS):</strong> Configured robust CORS policies on FastAPI and proxying via Vite to allow seamless local testing and secure remote requests.</li>
        <li><strong>State Synchronization:</strong> Managed complex React states for media devices (camera/mic toggles) to ensure UI correctly reflects hardware status.</li>
        <li><strong>Database Connectivity:</strong> Transitioned from local SQLite to remote PostgreSQL without altering business logic, proving the robustness of the SQLAlchemy ORM layer.</li>
    </ul>

    <h2>6. Conclusion & Future Scope</h2>
    <p>The Ardvmeetinghub project successfully achieves its goal of delivering a high-quality video conferencing tool. By utilizing a modern stack comprising React, FastAPI, and PostgreSQL, the platform is not only functional but highly scalable.</p>
    <p><strong>Future Enhancements:</strong></p>
    <ul>
        <li>AI-based live transcription and translation.</li>
        <li>End-to-End Encryption (E2EE) for media streams.</li>
        <li>Virtual backgrounds utilizing WebGL and machine learning models.</li>
    </ul>
</body>
</html>
"""

MINOR_HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Minor Project Report: Ardvmeetinghub (README format)</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #24292e; line-height: 1.6; font-size: 15px; }}
        h1 {{ border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; font-size: 2em; }}
        h2 {{ border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; margin-top: 24px; font-size: 1.5em; }}
        h3 {{ font-size: 1.25em; margin-top: 24px; }}
        code {{ background-color: #f6f8fa; border-radius: 3px; padding: 0.2em 0.4em; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 85%; }}
        pre {{ background-color: #f6f8fa; padding: 16px; overflow: auto; border-radius: 3px; }}
        .screenshot {{ max-width: 100%; border: 1px solid #ddd; margin: 15px 0; border-radius: 5px; }}
        ul {{ padding-left: 2em; }}
        .badge {{ display: inline-block; padding: 0.25em 0.5em; font-size: 85%; font-weight: 600; line-height: 1; text-align: center; white-space: nowrap; vertical-align: baseline; border-radius: 0.25rem; color: #fff; background-color: #0366d6; }}
    </style>
</head>
<body>
    <h1>Ardvmeetinghub 🎥 <span class="badge">v1.0.0</span></h1>
    <p><strong>Student Name:</strong> {dev_name}</p>

    <p>Ardvmeetinghub is a modern, full-stack video conferencing application that provides real-time, high-quality audio, video, and text communication.</p>

    <h2>🚀 Features</h2>
    <ul>
        <li><strong>Secure Authentication:</strong> Register and login securely using JWT and bcrypt password hashing.</li>
        <li><strong>Instant Meetings:</strong> Generate random secure links for immediate collaboration.</li>
        <li><strong>HD Video & Audio:</strong> Powered by WebRTC protocols for minimal latency.</li>
        <li><strong>Screen Sharing & Chat:</strong> Built-in tools for effective remote presentations.</li>
        <li><strong>PWA Ready:</strong> Install the app directly on your device.</li>
    </ul>

    <h2>🛠 Tech Stack</h2>
    <ul>
        <li><strong>Frontend:</strong> React, TypeScript, Tailwind CSS</li>
        <li><strong>Backend:</strong> Python, FastAPI, Uvicorn</li>
        <li><strong>Database:</strong> Remote PostgreSQL Server (Live IP: <code>51.89.97.76</code>)</li>
        <li><strong>Media Engine:</strong> ZegoCloud API / WebRTC</li>
    </ul>

    <h2>📸 Interface Preview</h2>
    <h3>User Dashboard</h3>
    <p>A clean, responsive dashboard to manage your meetings.</p>
    <img src="{dashboard_img}" class="screenshot" alt="Dashboard View" />

    <h3>Meeting Room</h3>
    <p>The core interface where users interact via video and chat.</p>
    <img src="{meeting_img}" class="screenshot" alt="Meeting Room View" />

    <h2>⚙️ How It Works</h2>
    <p>When a user registers, their details are securely hashed and sent to the remote PostgreSQL database. Upon login, the FastAPI server issues a JWT token. This token validates the user across the application. When joining a meeting, the frontend establishes a secure P2P WebRTC connection with other participants, bypassing the main server for media streams to ensure high performance.</p>

    <h2>🏁 Conclusion</h2>
    <p>Ardvmeetinghub is a complete, production-ready solution that demonstrates the integration of complex backend data handling with real-time frontend media management.</p>
</body>
</html>
"""

async def run():
    print("Converting existing images to base64...")
    def get_b64(path):
        if not os.path.exists(path):
            return ""
        with open(path, "rb") as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode()

    register_b64 = get_b64("screenshot_register.png")
    dashboard_b64 = get_b64("screenshot_dashboard.png")
    meeting_b64 = get_b64("screenshot_meeting.png")

    developers = ["ANSH", "NISHANT PANWAR", "HIMANSHU GOEL"]

    print("Generating PDFs for the team...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        for dev_name in developers:
            clean_name = dev_name.replace(" ", "_").upper()
            print(f"Generating reports for {dev_name}...")
            
            # Major
            major_content = MAJOR_HTML_TEMPLATE.format(
                dev_name=dev_name.title(),
                register_img=register_b64,
                dashboard_img=dashboard_b64,
                meeting_img=meeting_b64
            )
            await page.set_content(major_content, wait_until="networkidle")
            await page.pdf(path=f"../Major_Project_Report_Ardvmeetinghub_{clean_name}.pdf", format="A4", margin={"top": "20px", "bottom": "20px", "left": "20px", "right": "20px"})
            
            # Minor
            minor_content = MINOR_HTML_TEMPLATE.format(
                dev_name=dev_name.title(),
                dashboard_img=dashboard_b64,
                meeting_img=meeting_b64
            )
            await page.set_content(minor_content, wait_until="networkidle")
            await page.pdf(path=f"../Minor_Project_Report_Ardvmeetinghub_{clean_name}.pdf", format="A4", margin={"top": "20px", "bottom": "20px", "left": "20px", "right": "20px"})
            
            print(f"Saved PDFs for {dev_name}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
