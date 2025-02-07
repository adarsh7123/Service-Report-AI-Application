import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def test_mailtrap():
    # Mailtrap credentials
    smtp_server = "sandbox.smtp.mailtrap.io"
    port = 2525
    login = "87c4ee3296e238"
    password = "d74139403a22e1"

    try:
        # Create test message
        msg = MIMEMultipart()
        msg['From'] = "service@repairapp.com"
        msg['To'] = "test@example.com"
        msg['Subject'] = "Test Email from Repair Service"
        
        body = """
        This is a test email from the Repair Service application.
        If you see this in Mailtrap, the configuration is working!
        """
        msg.attach(MIMEText(body, 'plain'))
        
        # Create SMTP session and send
        with smtplib.SMTP(smtp_server, port) as server:
            print("Connecting to SMTP server...")
            server.starttls()
            print("Starting TLS...")
            server.login(login, password)
            print("Logged in successfully...")
            server.send_message(msg)
            print("Email sent successfully! Check Mailtrap inbox.")
            
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        print(f"Error type: {type(e)}")
        return False

if __name__ == "__main__":
    test_mailtrap() 