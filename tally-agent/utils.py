import uuid
import xml.etree.ElementTree as ET
from datetime import datetime

def generate_message_id():
    return str(uuid.uuid4())

def current_timestamp():
    return datetime.utcnow().isoformat() + "Z"

def safe_get(data, key, default=None):
    return data.get(key, default) if isinstance(data, dict) else default