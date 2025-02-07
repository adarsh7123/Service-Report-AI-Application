from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import os
import tempfile
import json
import smtplib
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import uuid

# Load environment variables
load_dotenv()

# Print API key for debugging (remove in production)
print("API Key loaded:", os.getenv('OPENAI_API_KEY')[:10] + "...")

app = Flask(__name__)

# CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173",
            "https://service-report-ai-application.vercel.app"  # Your Vercel domain
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Test OpenAI connection at startup
try:
    models = client.models.list()
    print("OpenAI connection successful")
except Exception as e:
    print("OpenAI connection failed:", str(e))

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    # Check credentials against environment variables
    valid_credentials = {
        os.getenv('TECH1_USER'): os.getenv('TECH1_PASS'),
        os.getenv('TECH2_USER'): os.getenv('TECH2_PASS'),
        os.getenv('TECH3_USER'): os.getenv('TECH3_PASS'),
        os.getenv('TECH4_USER'): os.getenv('TECH4_PASS'),
        os.getenv('TECH5_USER'): os.getenv('TECH5_PASS'),
    }
    
    if username in valid_credentials and valid_credentials[username] == password:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/api/send-report', methods=['POST'])
def send_report():
    try:
        data = request.get_json()
        recipient_email = data.get('email')
        repair_details = data.get('repair_details', [])
        additional_info = data.get('additional_info', '')
        
        # Filter and categorize items
        repair_items = []
        good_condition_items = []
        
        for repair in repair_details:
            description = repair.get('issueDescription', '').lower()
            action = repair.get('recommendedAction', '').lower()
            
            if ('not working' in description or 
                'broken' in description or 
                'faulty' in description or 
                'issue' in description or
                'repair' in description or
                'replace' in action):
                repair_items.append(repair)
            elif ('good' in description or 
                  'working' in description or 
                  'no issues' in description):
                good_condition_items.append(f"• {repair.get('issueDescription')}")

        # Create email content using the common function
        email_content = create_email_content(repair_items, good_condition_items, additional_info)
        
        # Create and send email
        msg = MIMEMultipart()
        msg['From'] = f"xyz team <{os.getenv('SMTP_USERNAME')}>"
        msg['To'] = recipient_email
        msg['Subject'] = f'Machine Repair Service Report - {datetime.datetime.now().strftime("%B %d, %Y")}'
        msg.attach(MIMEText(email_content, 'plain'))
        
        # Send email
        with smtplib.SMTP(os.getenv('SMTP_SERVER'), int(os.getenv('SMTP_PORT'))) as server:
            server.starttls()
            server.login(os.getenv('SMTP_USERNAME'), os.getenv('SMTP_PASSWORD'))
            server.send_message(msg)
        
        return jsonify({
            "success": True,
            "message": "Report sent successfully"
        })

    except Exception as e:
        print(f"Email sending error: {str(e)}")
        return jsonify({
            "error": str(e),
            "message": "Failed to send email"
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        health_status = {
            "status": "ok",
            "services": {
                "openai": False,
                "database": True,  # Placeholder for future database
                "email": False
            },
            "timestamp": datetime.datetime.now().isoformat()
        }

        # Check OpenAI connection
        try:
            # Simple test call to OpenAI
            client.models.list()
            health_status["services"]["openai"] = True
        except Exception as e:
            print(f"OpenAI service check failed: {str(e)}")
            health_status["services"]["openai"] = False

        # Check email service
        try:
            with smtplib.SMTP(os.getenv('SMTP_SERVER'), int(os.getenv('SMTP_PORT'))) as server:
                server.starttls()
                server.login(os.getenv('SMTP_USERNAME'), os.getenv('SMTP_PASSWORD'))
                health_status["services"]["email"] = True
        except Exception as e:
            print(f"Email service check failed: {str(e)}")
            health_status["services"]["email"] = False

        # Overall status
        if all(health_status["services"].values()):
            health_status["status"] = "ok"
        else:
            health_status["status"] = "degraded"
            failed_services = [
                service 
                for service, status in health_status["services"].items() 
                if not status
            ]
            health_status["message"] = f"Services unavailable: {', '.join(failed_services)}"

        return jsonify(health_status)

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.datetime.now().isoformat()
        }), 500

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        print("No audio file in request")  # Debug log
        return jsonify({"error": "No audio file provided"}), 400
    
    try:
        audio_file = request.files['audio']
        print(f"Received audio file: {audio_file.filename}, Content Type: {audio_file.content_type}")  # Debug log
        
        # Ensure the file has content
        audio_file.seek(0, 2)  # Seek to end
        file_size = audio_file.tell()
        audio_file.seek(0)  # Seek back to start
        
        if file_size == 0:
            return jsonify({"error": "Empty audio file"}), 400
            
        # Create temp file with a unique name
        temp_filename = f"audio_{uuid.uuid4()}.wav"  # Changed to .wav
        temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
        
        # Save the audio file
        audio_file.save(temp_path)
        print(f"Saved to temp file: {temp_path}, Size: {os.path.getsize(temp_path)} bytes")  # Debug log
        
        try:
            # Use OpenAI Whisper to transcribe
            with open(temp_path, 'rb') as audio:
                transcription = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio,
                    response_format="text"  # Specify response format
                )
                
                # Get the transcript text
                transcript_text = str(transcription)
                print(f"Transcription successful, length: {len(transcript_text)}")  # Debug log
            
            # Clean up temp file
            try:
                os.remove(temp_path)
                print("Temp file cleaned up successfully")  # Debug log
            except Exception as e:
                print(f"Warning: Could not delete temp file {temp_path}: {str(e)}")
            
            if not transcript_text:
                return jsonify({
                    "error": "Empty transcription result",
                    "success": False
                }), 500
            
            return jsonify({
                "transcript": transcript_text,
                "success": True
            })
                
        except Exception as e:
            print(f"OpenAI API Error: {str(e)}, Type: {type(e)}")  # Debug log
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except:
                    pass
            return jsonify({
                "error": f"OpenAI API Error: {str(e)}",
                "success": False
            }), 500
                
    except Exception as e:
        print(f"Error processing audio: {str(e)}, Type: {type(e)}")  # Debug log
        return jsonify({
            "error": str(e),
            "message": "Failed to process audio"
        }), 500

@app.route('/api/generate-table', methods=['POST'])
def generate_table():
    try:
        data = request.get_json()
        transcript = data.get('transcript', '')
        
        print(f"Received transcript: {transcript}")  # Debug log
        
        # First, translate to English if needed
        translation_prompt = f"""
        Translate this text to English if it's not in English. If it's already in English, return it unchanged:
        {transcript}
        """
        
        translation_response = client.chat.completions.create(
            model="gpt-4",  # Changed back to GPT-4
            messages=[
                {"role": "system", "content": "You are a translator. Translate to English if needed."},
                {"role": "user", "content": translation_prompt}
            ]
        )
        
        english_text = translation_response.choices[0].message.content.strip()
        print(f"English translation: {english_text}")  # Debug log
        
        # Generate repair table with structured prompt
        table_prompt = f"""
        Create a repair report based on this text: {english_text}

        Format your response as a JSON object with this structure:
        {{
            "repairs": [
                {{
                    "issueDescription": "Clear description of the issue",
                    "requiredParts": "Parts needed for repair",
                    "estimatedTime": "Estimated repair time",
                    "priorityLevel": "High/Medium/Low",
                    "recommendedAction": "Steps to fix the issue"
                }}
            ],
            "good_condition_items": ["item1", "item2"]
        }}

        Ensure all items mentioned as "in good condition" or "working fine" are included in the good_condition_items array.
        """
        
        table_response = client.chat.completions.create(
            model="gpt-4",  # Changed back to GPT-4
            messages=[
                {"role": "system", "content": "You are a repair technician creating detailed repair reports in JSON format."},
                {"role": "user", "content": table_prompt}
            ]
        )
        
        # Parse the response
        response_content = table_response.choices[0].message.content.strip()
        print(f"GPT Response: {response_content}")  # Debug log
        
        try:
            repair_data = json.loads(response_content)
            
            # Extract good condition items if present
            good_condition_items = repair_data.get('good_condition_items', [])
            other_content = "\n".join(f"• {item}" for item in good_condition_items) if good_condition_items else ""
            
            return jsonify({
                "repair_table": {
                    "repairs": repair_data.get('repairs', [])
                },
                "other_content": other_content,
                "success": True
            })
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {str(e)}")
            print(f"Failed to parse: {response_content}")
            return jsonify({
                "error": "Failed to parse repair table",
                "details": str(e)
            }), 500

    except Exception as e:
        print(f"Error generating table: {str(e)}")
        return jsonify({
            "error": str(e),
            "message": "Failed to generate repair table"
        }), 500

@app.route('/api/translate', methods=['POST'])
def translate():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        # Use GPT for translation
        prompt = f"""
        Translate this text to English. Only provide the translation, no additional text:
        {text}
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a translator. Provide only the translation, no additional text."},
                {"role": "user", "content": prompt}
            ]
        )
        
        translated_text = response.choices[0].message.content.strip()
        
        return jsonify({
            "translated_text": translated_text,
            "original_text": text,
            "success": True
        })

    except Exception as e:
        print(f"Translation error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/detect-language', methods=['POST'])
def detect_language():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        # Use GPT to detect language
        prompt = f"""
        What language is this text in? Respond with only the language code (e.g., 'en', 'hi', 'es', etc.):
        {text}
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a language detector. Respond only with the language code."},
                {"role": "user", "content": prompt}
            ]
        )
        
        detected_lang = response.choices[0].message.content.strip().lower()
        
        return jsonify({
            "detected_language": detected_lang,
            "success": True
        })

    except Exception as e:
        print(f"Language detection error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-repair-list', methods=['POST'])
def generate_repair_list():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        # Use Gemini to generate repair list
        prompt = f"""
        Based on this text, create a numbered list of repair items:
        {text}
        Only include the numbered list, no additional text.
        """
        response = translation_model.generate_content(prompt)
        repair_items = [
            item.strip() 
            for item in response.text.split('\n') 
            if item.strip() and not item.strip().isdigit()
        ]
        
        return jsonify({
            "repair_list": repair_items
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/send-email', methods=['POST'])
def send_email():
    try:
        data = request.get_json()
        recipient_email = data.get('email')
        repair_table = data.get('repair_table', {})
        translated_text = data.get('translated_text', '')
        technician_notes = data.get('technician_notes', '')
        
        # Create email content
        email_content = f"""
        Service Report

        Original Description:
        {translated_text}

        Repair Details:
        """
        
        # Add repair items
        for idx, repair in enumerate(repair_table.get('repairs', []), 1):
            email_content += f"""
            Repair Item #{idx}:
            - Issue: {repair.get('issueDescription')}
            - Required Parts: {repair.get('requiredParts')}
            - Estimated Time: {repair.get('estimatedTime')}
            - Priority: {repair.get('priorityLevel')}
            - Recommended Action: {repair.get('recommendedAction')}
            """
        
        # Add technician notes
        if technician_notes:
            email_content += f"""
            
            Additional Notes:
            {technician_notes}
            """
        
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = 'service@repairapp.com'
        msg['To'] = recipient_email
        msg['Subject'] = 'Machine Repair Service Report'
        msg.attach(MIMEText(email_content, 'plain'))
        
        # Send email using Mailtrap
        with smtplib.SMTP('sandbox.smtp.mailtrap.io', 2525) as server:
            server.starttls()
            server.login('87c4ee3296e238', 'd74139403a22e1')
            server.send_message(msg)
        
        return jsonify({
            "success": True,
            "message": "Email sent successfully"
        })

    except Exception as e:
        print(f"Email sending error: {str(e)}")
        return jsonify({
            "error": str(e),
            "message": "Failed to send email"
        }), 500

@app.route('/api/preview-email', methods=['POST'])
def preview_email():
    try:
        data = request.get_json()
        repair_details = data.get('repair_details', [])
        additional_info = data.get('additional_info', '')
        
        # Filter and categorize items
        repair_items = []
        good_condition_items = []
        
        for repair in repair_details:
            description = repair.get('issueDescription', '').lower()
            action = repair.get('recommendedAction', '').lower()
            
            if ('not working' in description or 
                'broken' in description or 
                'faulty' in description or 
                'issue' in description or
                'repair' in description or
                'replace' in action):
                repair_items.append(repair)
            elif ('good' in description or 
                  'working' in description or 
                  'no issues' in description):
                good_condition_items.append(f"• {repair.get('issueDescription')}")

        # Create email content using the common function
        email_content = create_email_content(repair_items, good_condition_items, additional_info)
        
        return jsonify({
            "success": True,
            "emailContent": email_content
        })

    except Exception as e:
        print(f"Preview generation error: {str(e)}")
        return jsonify({
            "error": str(e),
            "message": "Failed to generate preview"
        }), 500

def create_email_content(repair_items, good_condition_items, additional_info):
    email_content = f"""
Date: {datetime.datetime.now().strftime("%B %d, %Y")}

Dear Valued Customer,

Issue Report
"""
    
    # Add repair items
    for idx, repair in enumerate(repair_items, 1):
        priority = repair.get('priorityLevel', 'Normal')
        priority_text = {
            'High': 'URGENT',
            'Medium': 'NORMAL',
            'Low': 'ROUTINE'
        }.get(priority, 'NORMAL')
        
        email_content += f"""
Issue #{idx}
-----------
• Description: {repair.get('issueDescription')}
• Required Parts: {repair.get('requiredParts')}
• Estimated Time: {repair.get('estimatedTime')}
• Priority: {priority_text}
• Action Required: {repair.get('recommendedAction')}
"""

    # Add additional notes
    if good_condition_items or additional_info:
        email_content += """
Additional Notes:
----------------"""
        
        if good_condition_items:
            email_content += "\n" + "\n".join(good_condition_items)
        
        if additional_info:
            if good_condition_items:
                email_content += "\n"
            email_content += additional_info

    # Add footer
    email_content += """

NEXT STEPS:
-----------------
1. Please review the findings detailed above
2. Contact our service department to schedule repairs
3. For urgent items, immediate attention is recommended

For questions or to schedule service:
• Phone: 123456789
• Email: xyz@mail.com
• Emergency Service: 

Best regards,
xyz team"""

    return email_content

if __name__ == '__main__':
    app.run(debug=True, port=5000) 