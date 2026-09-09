import json
from sqlalchemy import Column, String, Boolean, Text, ForeignKey
from database import Base

class AuthUserModel(Base):
    __tablename__ = "auth_users"

    id = Column(String, primary_key=True, index=True)
    provider = Column(String, nullable=False)
    provider_user_id = Column(String, nullable=False, unique=True, index=True)
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True)
    email_verified = Column(Boolean, default=True)
    phone_verified = Column(Boolean, default=True)
    status = Column(String, default="ACTIVE")
    created_at = Column(String, nullable=False)
    last_login_at = Column(String, nullable=False)

class UserProfileModel(Base):
    __tablename__ = "user_profiles"

    user_id = Column(String, ForeignKey("auth_users.id"), primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    preferred_language = Column(String, default="en")
    preferred_currency = Column(String, default="INR")
    timezone = Column(String, default="Asia/Kolkata")
    onboarding_status = Column(String, default="NOT_STARTED")
    onboarding_step = Column(String, default="welcome")
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

class UserPreferencesModel(Base):
    __tablename__ = "user_preferences"

    user_id = Column(String, ForeignKey("auth_users.id"), primary_key=True, index=True)
    travel_styles_json = Column(Text, default="[]")
    transport_preferences_json = Column(Text, default="[]")
    dietary_preferences_json = Column(Text, default="[]")
    food_interests_json = Column(Text, default="[]")
    activity_interests_json = Column(Text, default="[]")
    budget_level = Column(String, default="MODERATE")
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    @property
    def travel_styles(self):
        return json.loads(self.travel_styles_json or "[]")

    @travel_styles.setter
    def travel_styles(self, val):
        self.travel_styles_json = json.dumps(val or [])

    @property
    def transport_preferences(self):
        return json.loads(self.transport_preferences_json or "[]")

    @transport_preferences.setter
    def transport_preferences(self, val):
        self.transport_preferences_json = json.dumps(val or [])

    @property
    def dietary_preferences(self):
        return json.loads(self.dietary_preferences_json or "[]")

    @dietary_preferences.setter
    def dietary_preferences(self, val):
        self.dietary_preferences_json = json.dumps(val or [])

    @property
    def food_interests(self):
        return json.loads(self.food_interests_json or "[]")

    @food_interests.setter
    def food_interests(self, val):
        self.food_interests_json = json.dumps(val or [])

    @property
    def activity_interests(self):
        return json.loads(self.activity_interests_json or "[]")

    @activity_interests.setter
    def activity_interests(self, val):
        self.activity_interests_json = json.dumps(val or [])

class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    token_hash = Column(String, nullable=False, unique=True, index=True)
    user_id = Column(String, ForeignKey("auth_users.id"), nullable=False, index=True)
    created_at = Column(String, nullable=False)
    expires_at = Column(String, nullable=False)
    last_used_at = Column(String, nullable=False)
    revoked_at = Column(String, nullable=True)

