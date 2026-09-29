import os
from pathlib import Path
from dotenv import load_dotenv
from contracts import APIError

BASE = Path(__file__).resolve().parent
# Explicitly use a new file, never the old prototype's exposed credentials.
load_dotenv(BASE / '.env.local', override=True)


class Settings:
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL', '').rstrip('/')
        self.anon = os.getenv('SUPABASE_ANON_KEY', '')
        self.gemini_key = os.getenv('GEMINI_API_KEY', '')
        self.demo_ai = os.getenv('DEMO_AI', '').lower() in ('1', 'true', 'yes')
        self.model = os.getenv('GEMINI_MODEL', 'gemini-3.8-flash')
        self.timeout = int(os.getenv('PROVIDER_TIMEOUT_SECONDS', '45'))
        self.threshold = float(os.getenv('CHAT_MIN_SIMILARITY', '0.3'))
        self.data = (BASE / os.getenv('DATA_DIR', 'data')).resolve()
        self.origins = [x.strip() for x in os.getenv('ALLOWED_ORIGINS', 'http://localhost:8080').split(',')]

    def require_database(self):
        if not self.url or not self.anon:
            raise APIError('The server is not configured. Set up the fresh Supabase project first.', 'configuration_missing', 503)
