import requests

def test_email_api():
    url = "http://localhost:5000/api/send-email"
    
    payload = {
        "email": "test@example.com",
        "repair_table": {
            "repairs": [
                {
                    "issueDescription": "Machine making loud noise and vibrating",
                    "requiredParts": "New bearings, mounting bolts",
                    "estimatedTime": "3 hours",
                    "priorityLevel": "High",
                    "recommendedAction": "Replace worn bearings and secure mounting"
                }
            ]
        },
        "translated_text": "The machine is making excessive noise and showing signs of vibration",
        "technician_notes": "Customer reported increased noise levels over past week."
    }
    
    try:
        print("Sending request to API...")
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("Success:", response.json())
        else:
            print("Error Response:", response.text)
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is the Flask app running?")
    except Exception as e:
        print(f"Error: {str(e)}")
        print(f"Error type: {type(e)}")

if __name__ == "__main__":
    test_email_api() 