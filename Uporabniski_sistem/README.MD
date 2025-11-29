.venv\Scripts\activate
pip install -r requirements.txt

//Če ne dela moraš še manualno v virtaulnem okolju pip install pydantic[email] in pip install email-validator izvesti

uvicorn storitev_uporabniskega_sistema:app --reload
