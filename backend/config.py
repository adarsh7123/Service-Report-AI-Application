import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv()

class Config:
    # Email settings
    SMTP_SERVER = os.getenv('SMTP_SERVER')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
    
    # OpenAI settings
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    # JWT settings
    JWT_SECRET = os.getenv('JWT_SECRET', 'repair-app-secret-key')
    JWT_EXPIRATION = 3600  # 1 hour
    
    # CORS settings
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
    
    # Simple user credentials with hashed passwords
    USERS = {
        "tech1": {
            "password": generate_password_hash("tech123"),
            "role": "technician",
            "name": "Technician 1"
        },
        "tech2": {
            "password": generate_password_hash("tech456"),
            "role": "technician",
            "name": "Technician 2"
        },
        "tech3": {
            "password": generate_password_hash("tech789"),
            "role": "technician",
            "name": "Technician 3"
        },
        "tech4": {
            "password": generate_password_hash("tech321"),
            "role": "technician",
            "name": "Technician 4"
        },
        "tech5": {
            "password": generate_password_hash("tech555"),
            "role": "technician",
            "name": "Technician 5"
        }
    } 