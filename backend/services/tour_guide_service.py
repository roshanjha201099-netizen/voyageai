"""
Tour Guide Service Re-export for compatibility with backend/services/tour_guide_service.py
"""
import sys
import os

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from tour_guide_service import *
