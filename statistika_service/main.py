from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/statistika_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class EndpointCall(Base):
    __tablename__ = "endpoint_calls"
    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String, index=True)
    called_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Statistika API", description="API za statistiko klicev endpointov", version="1.0")

class EndpointCallRequest(BaseModel):
    klicanaStoritev: str

@app.post("/statistika", summary="Posodobi podatke o klicu endpointa")
def posodobi_statistiko(request: EndpointCallRequest):
    db = SessionLocal()
    call = EndpointCall(endpoint=request.klicanaStoritev)
    db.add(call)
    db.commit()
    db.close()
    return {"message": "Klic zabeležen."}

@app.get("/statistika/zadnji", summary="Zadnje klican endpoint")
def zadnji_klican_endpoint():
    db = SessionLocal()
    call = db.query(EndpointCall).order_by(EndpointCall.called_at.desc()).first()
    db.close()
    if not call:
        raise HTTPException(status_code=404, detail="Ni podatkov.")
    return {"zadnji_klican": call.endpoint, "cas": call.called_at}

@app.get("/statistika/najpogostejsi", summary="Najpogosteje klican endpoint")
def najpogostejsi_endpoint():
    db = SessionLocal()
    result = db.query(EndpointCall.endpoint, func.count(EndpointCall.endpoint).label("count")).group_by(EndpointCall.endpoint).order_by(func.count(EndpointCall.endpoint).desc()).first()
    db.close()
    if not result:
        raise HTTPException(status_code=404, detail="Ni podatkov.")
    return {"najpogostejsi": result[0], "stevilo_klicev": result[1]}

@app.get("/statistika/stevilo", summary="Število posameznih klicev glede na endpoint")
def stevilo_klicev():
    db = SessionLocal()
    results = db.query(EndpointCall.endpoint, func.count(EndpointCall.endpoint).label("count")).group_by(EndpointCall.endpoint).all()
    db.close()
    return {"statistika": [{"endpoint": r[0], "stevilo_klicev": r[1]} for r in results]}
