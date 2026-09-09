from pydantic import BaseModel, Field
from typing import List, Optional

class ActivitySchema(BaseModel):
    timeSlot: str
    title: str
    description: str
    activityType: str = "SIGHTSEEING"
    locationName: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimatedCostInr: int = 0
    bookingRequired: bool = False
    isConfirmed: bool = False  # Strictly forced to False for recommendations

class DaySchema(BaseModel):
    dayNumber: int
    date: str
    title: str
    summary: str
    activities: List[ActivitySchema]

class GeneratedItinerarySchema(BaseModel):
    title: str
    days: List[DaySchema]
