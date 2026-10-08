import json
from sqlalchemy import Column, String, Text, DateTime, func
from database import Base

class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    trip_id = Column(String, nullable=True, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    mode = Column(String, default="local")
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    def get_metadata(self):
        try:
            return json.loads(self.metadata_json or "{}")
        except Exception:
            return {}

