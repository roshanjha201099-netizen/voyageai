from pydantic import BaseModel, Field
from typing import List, Optional

class AuthUser(BaseModel):
    id: str
    provider: str  # GOOGLE, APPLE, PHONE, EMAIL
    providerUserId: str
    email: Optional[str] = None
    phone: Optional[str] = None
    emailVerified: bool = True
    phoneVerified: bool = True
    status: str = "ACTIVE"  # ACTIVE, SUSPENDED, DELETED
    createdAt: str
    lastLoginAt: str

class UserProfile(BaseModel):
    userId: str
    firstName: str
    lastName: Optional[str] = None
    avatarUrl: Optional[str] = None
    preferredLanguage: str = "en"
    preferredCurrency: str = "INR"
    timezone: str = "Asia/Kolkata"
    onboardingStatus: str = "NOT_STARTED"  # NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED
    onboardingStep: str = "welcome"
    createdAt: str
    updatedAt: str

class UserPreferences(BaseModel):
    userId: str
    travelStyles: List[str] = Field(default_factory=list)
    transportPreferences: List[str] = Field(default_factory=list)
    dietaryPreferences: List[str] = Field(default_factory=list)
    foodInterests: List[str] = Field(default_factory=list)
    activityInterests: List[str] = Field(default_factory=list)
    budgetLevel: Optional[str] = "MODERATE"
    createdAt: str
    updatedAt: str

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = "password123"
    name: Optional[str] = None
    avatarUrl: Optional[str] = None
    provider: str = "EMAIL"
    isRegister: Optional[bool] = False

class OnboardingRequest(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    travelStyles: Optional[List[str]] = None
    transportPreferences: Optional[List[str]] = None
    dietaryPreferences: Optional[List[str]] = None
    foodInterests: Optional[List[str]] = None
    activityInterests: Optional[List[str]] = None
    budgetLevel: Optional[str] = None
    onboardingStep: Optional[str] = None
    onboardingStatus: Optional[str] = None

class SessionResponse(BaseModel):
    token: str
    authUser: AuthUser
    userProfile: UserProfile
    userPreferences: UserPreferences
