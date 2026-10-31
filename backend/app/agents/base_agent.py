import json
import logging
from typing import Type, TypeVar
from pydantic import BaseModel
from google import genai
from google.genai import types
from app.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)

class BaseAgent:
    def __init__(self, api_key: str = ""):
        # Determine which API key to use (dynamic request override or env variable)
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.client = None
        self.is_client_active = False
        
        if self.api_key:
            try:
                # Initialize the modern Google GenAI Client
                self.client = genai.Client(api_key=self.api_key)
                self.is_client_active = True
                logger.info("Google GenAI Client successfully configured.")
            except Exception as e:
                logger.error(f"Error configuring Google GenAI Client: {str(e)}")
        else:
            logger.warning("No Gemini API key provided. Agent will run in fallback mock mode.")

    def generate_structured_output(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Type[T],
        fallback_func
    ) -> T:
        """
        Generates content from Gemini with a guaranteed structured Pydantic schema output.
        Falls back to high-quality mocked data if the API call fails or is unconfigured.
        """
        if self.is_client_active and self.client:
            try:
                # We use the modern gemini-2.5-flash model
                logger.info(f"Calling Gemini 2.5 Flash API with prompt: {prompt[:100]}...")
                
                response = self.client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=response_schema,
                        temperature=0.2,  # Low temperature for structured reasoning
                    )
                )
                
                # Check response content
                if response.text:
                    logger.info("Successfully received structured response from Gemini API.")
                    # Parse the JSON string into the Pydantic model
                    data = json.loads(response.text)
                    return response_schema.model_validate(data)
                else:
                    logger.warning("Empty response from Gemini. Triggering fallback.")
            except Exception as e:
                logger.error(f"Gemini API generation failed: {str(e)}. Triggering fallback.")
        
        # Fallback to high-quality mock data generator
        logger.info("Using mock generator fallback for response schema.")
        return fallback_func()
        
    def generate_chat_reply(
        self,
        history: list,
        user_message: str,
        system_instruction: str,
        fallback_func
    ) -> tuple[str, list[str]]:
        """
        Standard conversational chat with Gemini. Handles history formatting.
        """
        if self.is_client_active and self.client:
            try:
                # Format history for the new SDK
                formatted_history = []
                for msg in history:
                    role = "user" if msg.role == "user" else "model"
                    formatted_history.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=msg.content)]
                        )
                    )
                
                # Start chat using chats.create
                chat = self.client.chats.create(
                    model="gemini-2.5-flash",
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7,
                    ),
                    history=formatted_history
                )
                
                logger.info(f"Sending message to Gemini 2.5 Flash chat: {user_message[:100]}...")
                response = chat.send_message(user_message)
                
                # Generate some follow-up questions
                questions_prompt = (
                    f"Based on the user's query: '{user_message}' and your response: '{response.text[:200]}...', "
                    f"generate 3 short, relevant follow-up questions the student might ask next. "
                    f"Return them as a JSON list of strings (e.g. [\"question 1\", \"question 2\"])."
                )
                
                try:
                    q_resp = self.client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=questions_prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )
                    suggested_qs = json.loads(q_resp.text)
                except Exception:
                    suggested_qs = [
                        "Can you explain this topic in more detail?",
                        "How can I apply this in a real project?",
                        "What study resources would you recommend?"
                    ]
                
                return response.text, suggested_qs
            except Exception as e:
                logger.error(f"Gemini Chat API call failed: {str(e)}")
        
        return fallback_func()
