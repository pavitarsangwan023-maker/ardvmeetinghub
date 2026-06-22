import google.generativeai as genai
import os
import logging

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY is not set. AI features will be mocked.")

def get_ai_response(prompt: str) -> str:
    """
    Sends the user's prompt to the Gemini API and returns the response.
    """
    if not GEMINI_API_KEY:
        return "⚠️ Gemini API key is missing. Please set the GEMINI_API_KEY environment variable to enable AI responses."
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        system_instructions = (
            "You are a helpful meeting assistant integrated into a video conferencing chat. "
            "You provide concise, accurate answers, translate languages, and help solve problems. "
            "Keep your responses short as they will be displayed in a chat sidebar."
        )
        
        # Combine instructions and prompt
        full_prompt = f"{system_instructions}\n\nUser requested: {prompt}"
        
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        return "⚠️ I'm sorry, I encountered an error while processing your request. Please try again later."
