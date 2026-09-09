import json
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey
from database import Base

class TripStayModel(Base):
    __tablename__ = "trip_stays"

    id = Column(String, primary_key=True, index=True)
    trip_id = Column(String, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id = Column(String, ForeignKey("itinerary_activities.id", ondelete="SET NULL"), nullable=True, index=True)
    hotel_name = Column(String, nullable=False)
    location_name = Column(String, nullable=False)
    check_in_date = Column(String, nullable=False)
    check_out_date = Column(String, nullable=False)
    nights = Column(Integer, nullable=False, default=1)
    price_per_night = Column(Integer, nullable=False, default=0)
    total_price = Column(Integer, nullable=False, default=0)
    status = Column(String, default="SELECTED")              # RECOMMENDED, SELECTED, PENDING, CONFIRMED, CANCELLED
    confirmation_code = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

class TripTransportModel(Base):
    __tablename__ = "trip_transports"

    id = Column(String, primary_key=True, index=True)
    trip_id = Column(String, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id = Column(String, ForeignKey("itinerary_activities.id", ondelete="SET NULL"), nullable=True, index=True)
    transport_type = Column(String, nullable=False, default="CAB") # CAB, FLIGHT, TRAIN, RENTAL
    provider_name = Column(String, nullable=False, default="VoyageAI Ride")
    pickup_location = Column(String, nullable=False)
    dropoff_location = Column(String, nullable=False)
    pickup_time = Column(String, nullable=False)
    estimated_fare = Column(Integer, nullable=False, default=0)
    status = Column(String, default="SELECTED")              # RECOMMENDED, SELECTED, PENDING, CONFIRMED, CANCELLED
    booking_reference = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

class TripExpenseModel(Base):
    __tablename__ = "trip_expenses"

    id = Column(String, primary_key=True, index=True)
    trip_id = Column(String, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id = Column(String, ForeignKey("itinerary_activities.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String, nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    category = Column(String, nullable=False, default="Other")   # Transport, Hotel, Food, Activities, Other
    paid_by = Column(String, nullable=False, default="Me")
    is_split = Column(Boolean, default=False)
    created_at = Column(String, nullable=False)
