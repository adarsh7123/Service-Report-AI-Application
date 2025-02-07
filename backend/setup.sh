#!/bin/bash

# Create and activate virtual environment
python -m venv venv
source venv/Scripts/activate  # For Windows
# source venv/bin/activate   # For Linux/Mac

# Install requirements with specific versions
pip install -r requirements.txt

# Verify OpenAI installation
python -c "import openai; print(f'OpenAI version: {openai.__version__}')"

echo "Setup complete! Virtual environment is ready."