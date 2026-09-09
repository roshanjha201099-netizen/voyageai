export interface RestaurantPlace {
  id: string;
  name: string;
  rating: number;
  cuisine: string[];
  priceRange: string;
  location: string;
  coordinates: [number, number];
  distanceKm: number;
  openingHours: string;
  photos: string[];
  dietary: string[];
}

export interface HotelPlace {
  id: string;
  name: string;
  rating: number;
  location: string;
  coordinates: [number, number];
  pricePerNight: number;
  photos: string[];
}

export interface DestinationInfo {
  name: string;
  centerCoordinates: [number, number];
  policeContact: string;
  policeStationName: string;
  hospitalName: string;
  hospitalDistanceKm: number;
  restaurants: RestaurantPlace[];
  hotels: HotelPlace[];
}

export function getDestinationInfo(destinationName?: string, tripCoordinates?: [number, number]): DestinationInfo {
  const destLower = (destinationName || '').toLowerCase().trim();

  if (destLower.includes('bihar') || destLower.includes('patna') || destLower.includes('gaya') || destLower.includes('nalanda')) {
    const lat = tripCoordinates?.[0] || 25.5941;
    const lng = tripCoordinates?.[1] || 85.1376;
    return {
      name: 'Bihar (Patna)',
      centerCoordinates: [lat, lng],
      policeContact: '0612-2219810',
      policeStationName: 'Kotwali Police Station, Patna',
      hospitalName: 'AIIMS Patna & Patna Medical College',
      hospitalDistanceKm: 2.5,
      restaurants: [
        {
          id: 'rst-bihar-1',
          name: 'Maurya Litti Chokha & Bihari Thali',
          rating: 4.8,
          cuisine: ['Bihari', 'Litti Chokha', 'Street Food'],
          priceRange: '₹₹',
          location: 'Boring Road, Patna, Bihar',
          coordinates: [25.6080, 85.1250],
          distanceKm: 1.2,
          openingHours: '10:00 AM – 10:30 PM',
          photos: ['https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'],
          dietary: ['Vegetarian Friendly', 'Traditional Bihari']
        },
        {
          id: 'rst-bihar-2',
          name: 'Bhoekh Litti & Chokha Center',
          rating: 4.7,
          cuisine: ['Litti Chokha', 'Sattu Paratha', 'Snacks'],
          priceRange: '₹',
          location: 'Near Golghar, Patna, Bihar',
          coordinates: [25.6110, 85.1410],
          distanceKm: 0.8,
          openingHours: '09:00 AM – 09:30 PM',
          photos: ['https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80'],
          dietary: ['Sattu Special', 'Pure Veg Options']
        },
        {
          id: 'rst-bihar-3',
          name: 'Pind Balluchi Patna',
          rating: 4.6,
          cuisine: ['North Indian', 'Mughlai', 'Bihari Kebabs'],
          priceRange: '₹₹₹',
          location: 'Exhibition Road, Patna, Bihar',
          coordinates: [25.6020, 85.1380],
          distanceKm: 1.5,
          openingHours: '12:00 PM – 11:00 PM',
          photos: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'],
          dietary: ['Non-Veg Delicacies', 'Family Dining']
        },
        {
          id: 'rst-bihar-4',
          name: 'Bihari Rasoi & Sweet Emporium',
          rating: 4.8,
          cuisine: ['Khaja', 'Tilkut', 'Bihari Sweets'],
          priceRange: '₹',
          location: 'Kankerbagh Main Rd, Patna, Bihar',
          coordinates: [25.5910, 85.1550],
          distanceKm: 2.1,
          openingHours: '08:00 AM – 10:00 PM',
          photos: ['https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80'],
          dietary: ['Traditional Sweets', 'Heritage Recipe']
        }
      ],
      hotels: [
        {
          id: 'htl-bihar-1',
          name: 'Hotel Maurya Patna',
          rating: 4.7,
          location: 'Fraser Road, Patna',
          coordinates: [25.6060, 85.1370],
          pricePerNight: 6500,
          photos: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80']
        },
        {
          id: 'htl-bihar-2',
          name: 'Lemon Tree Premier Patna',
          rating: 4.6,
          location: 'Exhibition Road, Patna',
          coordinates: [25.6030, 85.1400],
          pricePerNight: 5800,
          photos: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80']
        }
      ]
    };
  }

  if (destLower.includes('kolkata') || destLower.includes('calcutta') || destLower.includes('bengal')) {
    const lat = tripCoordinates?.[0] || 22.5726;
    const lng = tripCoordinates?.[1] || 88.3639;
    return {
      name: 'Kolkata',
      centerCoordinates: [lat, lng],
      policeContact: '033-22143024',
      policeStationName: 'Park Street Police Station, Kolkata',
      hospitalName: 'SSKM Hospital & Belle Vue Clinic',
      hospitalDistanceKm: 1.8,
      restaurants: [
        {
          id: 'rst-kol-1',
          name: 'Peter Cat & Cheelo Kebabs',
          rating: 4.8,
          cuisine: ['Continental', 'Mughlai', 'Cheelo Kebab'],
          priceRange: '₹₹₹',
          location: 'Park Street, Kolkata',
          coordinates: [22.5530, 88.3520],
          distanceKm: 0.5,
          openingHours: '11:00 AM – 11:00 PM',
          photos: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'],
          dietary: ['Non-Veg Special', 'Cocktail Lounge']
        },
        {
          id: 'rst-kol-2',
          name: '6 Ballygunge Place',
          rating: 4.7,
          cuisine: ['Authentic Bengali', 'Fish Curry', 'Mishti Doi'],
          priceRange: '₹₹',
          location: 'Ballygunge, Kolkata',
          coordinates: [22.5270, 88.3690],
          distanceKm: 2.2,
          openingHours: '12:30 PM – 10:30 PM',
          photos: ['https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80'],
          dietary: ['Bengali Thali', 'Mustard Hilsa']
        },
        {
          id: 'rst-kol-3',
          name: 'Kolkata Kati Roll & Street Food Corner',
          rating: 4.9,
          cuisine: ['Kati Roll', 'Street Food', 'Snacks'],
          priceRange: '₹',
          location: 'Park Street, Kolkata',
          coordinates: [22.5540, 88.3510],
          distanceKm: 0.3,
          openingHours: '10:00 AM – 11:30 PM',
          photos: ['https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80'],
          dietary: ['Kati Roll Special', 'Quick Bites']
        }
      ],
      hotels: [
        {
          id: 'htl-kol-1',
          name: 'The Oberoi Grand Kolkata',
          rating: 4.9,
          location: 'Chowringhee Road, Kolkata',
          coordinates: [22.5600, 88.3520],
          pricePerNight: 9500,
          photos: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80']
        }
      ]
    };
  }

  if (destLower.includes('jaipur') || destLower.includes('rajasthan') || destLower.includes('udaipur')) {
    const lat = tripCoordinates?.[0] || 26.9124;
    const lng = tripCoordinates?.[1] || 75.7873;
    return {
      name: 'Jaipur',
      centerCoordinates: [lat, lng],
      policeContact: '0141-2374444',
      policeStationName: 'Johari Bazaar Police Station, Jaipur',
      hospitalName: 'SMS Hospital Jaipur',
      hospitalDistanceKm: 2.1,
      restaurants: [
        {
          id: 'rst-jpr-1',
          name: 'LMB (Laxmi Misthan Bhandar)',
          rating: 4.8,
          cuisine: ['Rajasthani Thali', 'Dal Baati Churma', 'Sweets'],
          priceRange: '₹₹',
          location: 'Johari Bazaar, Jaipur',
          coordinates: [26.9170, 75.8260],
          distanceKm: 1.0,
          openingHours: '08:00 AM – 11:00 PM',
          photos: ['https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'],
          dietary: ['Pure Veg', 'Rajasthani Thali']
        },
        {
          id: 'rst-jpr-2',
          name: 'Rawat Mishthan Bhandar',
          rating: 4.9,
          cuisine: ['Pyaz Kachori', 'Mawa Kachori', 'Street Food'],
          priceRange: '₹',
          location: 'Station Road, Jaipur',
          coordinates: [26.9210, 75.7970],
          distanceKm: 1.5,
          openingHours: '06:00 AM – 10:30 PM',
          photos: ['https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80'],
          dietary: ['Kachori Special', 'Heritage Snacks']
        }
      ],
      hotels: [
        {
          id: 'htl-jpr-1',
          name: 'Rambagh Palace Jaipur',
          rating: 5.0,
          location: 'Bhawani Singh Road, Jaipur',
          coordinates: [26.8960, 75.8080],
          pricePerNight: 18000,
          photos: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80']
        }
      ]
    };
  }

  if (destLower.includes('goa')) {
    const lat = tripCoordinates?.[0] || 15.6022;
    const lng = tripCoordinates?.[1] || 73.7336;
    return {
      name: 'Goa',
      centerCoordinates: [lat, lng],
      policeContact: '0832-2419440',
      policeStationName: 'Anjuna Police Station, Goa',
      hospitalName: 'Manipal Hospital Goa',
      hospitalDistanceKm: 6.2,
      restaurants: [
        {
          id: 'rst-1',
          name: 'Thalassa Greek Restaurant',
          rating: 4.7,
          cuisine: ['Greek', 'Mediterranean', 'Seafood'],
          priceRange: '₹₹₹',
          location: 'Siolim Waterfront, North Goa',
          coordinates: [15.6267, 73.7482],
          distanceKm: 2.4,
          openingHours: '12:00 PM – 1:00 AM',
          photos: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'],
          dietary: ['Vegetarian Friendly', 'Gluten Free Options', 'Seafood Special']
        },
        {
          id: 'rst-2',
          name: "Fisherman's Wharf",
          rating: 4.6,
          cuisine: ['Goan', 'Continental', 'Indian'],
          priceRange: '₹₹',
          location: 'Vagator & Cavelossim, Goa',
          coordinates: [15.6030, 73.7360],
          distanceKm: 0.8,
          openingHours: '11:00 AM – 11:30 PM',
          photos: ['https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80'],
          dietary: ['Fresh Catch', 'Authentic Curry']
        }
      ],
      hotels: [
        {
          id: 'htl-1',
          name: 'W Goa Oceanfront Resort',
          rating: 4.8,
          location: 'Vagator Beach, Bardez, Goa',
          coordinates: [15.6015, 73.7329],
          pricePerNight: 12500,
          photos: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80']
        }
      ]
    };
  }

  // Generic fallback for ANY Indian destination name (e.g. Manali, Kerala, Varanasi, Delhi, Mumbai, etc.)
  const lat = tripCoordinates?.[0] || 22.5726;
  const lng = tripCoordinates?.[1] || 88.3639;
  const cleanName = destinationName || 'India';

  return {
    name: cleanName,
    centerCoordinates: [lat, lng],
    policeContact: '112',
    policeStationName: `${cleanName} Central Police Helpline`,
    hospitalName: `${cleanName} Multi-Specialty Hospital`,
    hospitalDistanceKm: 2.0,
    restaurants: [
      {
        id: `rst-gen-1`,
        name: `${cleanName} Heritage Fine Dining`,
        rating: 4.8,
        cuisine: ['Regional Special', 'Indian', 'Thali'],
        priceRange: '₹₹',
        location: `Central ${cleanName}`,
        coordinates: [lat + 0.005, lng + 0.005],
        distanceKm: 1.1,
        openingHours: '11:00 AM – 10:30 PM',
        photos: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'],
        dietary: ['Local Delicacy', 'Vegetarian Friendly']
      },
      {
        id: `rst-gen-2`,
        name: `${cleanName} Local Street Food Trail`,
        rating: 4.7,
        cuisine: ['Street Food', 'Snacks', 'Beverages'],
        priceRange: '₹',
        location: `Market Square, ${cleanName}`,
        coordinates: [lat - 0.004, lng - 0.004],
        distanceKm: 0.7,
        openingHours: '09:00 AM – 10:00 PM',
        photos: ['https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80'],
        dietary: ['Authentic Recipe', 'Quick Bites']
      }
    ],
    hotels: [
      {
        id: `htl-gen-1`,
        name: `${cleanName} Grand Heritage Hotel`,
        rating: 4.7,
        location: `City Center, ${cleanName}`,
        coordinates: [lat, lng],
        pricePerNight: 5500,
        photos: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80']
      }
    ]
  };
}
