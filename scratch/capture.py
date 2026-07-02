import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--use-fake-ui-for-media-stream'])
        context = await browser.new_context(
            permissions=['camera', 'microphone']
        )
        page = await context.new_page()
        
        print("Navigating to login page...")
        await page.goto("https://ardvmeetinghub.com/login")
        await page.fill('input[type="email"]', 'sisskapil@gmail.com')
        await page.fill('input[type="password"]', '12345678')
        await page.click('button:has-text("Sign in")')
        await page.wait_for_selector('text=Create a new meeting')
        
        print("Logged in! Navigating to meeting room...")
        await page.goto("https://ardvmeetinghub.com/meeting/5441-1C19-09F3")
        
        print("Waiting for PreJoinScreen to load...")
        # Wait for the "Join Meeting" button
        await page.wait_for_selector('button:has-text("Join Meeting")', timeout=10000)
        await page.click('button:has-text("Join Meeting")')
        
        print("Joined meeting. Waiting 5 seconds...")
        await asyncio.sleep(5)
        
        await page.screenshot(path="meeting_screenshot.png")
        print("Screenshot saved to meeting_screenshot.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
