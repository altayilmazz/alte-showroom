// Look verisi. Her parça için:
//   crop: [y0, y1, cx]  -> görselin dikey aralığı (0-1) ve yatay merkez; thumbnail bu bölgeden kırpılır
//   pin:  [x, y]        -> look üzerindeki pin konumu (%)
window.LOOKS = [
  {
    id: "01", name: "Sun Court", src: "assets/looks/look-01.webp",
    items: [
      { type: "accessory", brand: "ALTÉ Studio", name: "Washed Logo Cap", color: "Red", price: 45, crop: [0, 0.16, 0.5], pin: [58, 5] },
      { type: "apparel", brand: "ALTÉ Studio", name: "Cropped Zip Hoodie", color: "Butter", price: 129, crop: [0.12, 0.5, 0.52], pin: [58, 28] },
      { type: "apparel", brand: "ALTÉ Denim Lab", name: "Wide Sweat Jort", color: "Violet Wash", price: 98, crop: [0.4, 0.85, 0.5], pin: [50, 64] },
      { type: "footwear", brand: "ALTÉ Footwear", name: "Croc Penny Loafer", color: "Black", price: 189, crop: [0.82, 1, 0.45], pin: [37, 94] }
    ]
  },
  {
    id: "02", name: "Soft Pink", src: "assets/looks/look-02.webp",
    items: [
      { type: "apparel", brand: "ALTÉ Studio", name: "Waffle Thermal Tee", color: "Off White", price: 59, crop: [0.08, 0.46, 0.5], pin: [52, 22] },
      { type: "apparel", brand: "ALTÉ Studio", name: "Heavy Fleece Sweatpant", color: "Blush", price: 110, crop: [0.38, 0.9, 0.52], pin: [58, 62] },
      { type: "footwear", brand: "ALTÉ Footwear", name: "Court Low", color: "Cream", price: 139, crop: [0.84, 1, 0.55], pin: [64, 95] }
    ]
  },
  {
    id: "03", name: "Camo Lemon", src: "assets/looks/look-03.webp",
    items: [
      { type: "accessory", brand: "ALTÉ Studio", name: "Satin Durag", color: "Black", price: 25, crop: [0, 0.12, 0.5], pin: [50, 4] },
      { type: "apparel", brand: "ALTÉ Utility", name: "Woodland Crewneck", color: "Camo", price: 119, crop: [0.08, 0.45, 0.5], pin: [44, 26] },
      { type: "apparel", brand: "ALTÉ Utility", name: "Parachute Cargo", color: "Lemon", price: 135, crop: [0.4, 0.9, 0.5], pin: [58, 62] },
      { type: "footwear", brand: "ALTÉ Footwear", name: "Canvas Hi Top", color: "Black / White", price: 85, crop: [0.84, 1, 0.5], pin: [28, 94] }
    ]
  },
  {
    id: "04", name: "Workwear", src: "assets/looks/look-04.webp",
    items: [
      { type: "apparel", brand: "ALTÉ Utility", name: "Camo Panel Zip Hoodie", color: "Mocha", price: 159, crop: [0.08, 0.46, 0.5], pin: [68, 24] },
      { type: "apparel", brand: "ALTÉ Denim Lab", name: "Stitched Wide Sweatpant", color: "Washed Black", price: 125, crop: [0.4, 0.92, 0.5], pin: [44, 62] },
      { type: "footwear", brand: "ALTÉ Footwear", name: "6\" Work Boot", color: "Wheat", price: 210, crop: [0.84, 1, 0.5], pin: [40, 95] }
    ]
  },
  {
    id: "05", name: "Studio Day", src: "assets/looks/look-05.webp",
    items: [
      { type: "apparel", brand: "ALTÉ Studio", name: "Heavyweight Long Sleeve", color: "White", price: 69, crop: [0.04, 0.44, 0.52], pin: [56, 24] },
      { type: "apparel", brand: "ALTÉ Studio", name: "Relaxed Sweatpant", color: "Heather Grey", price: 105, crop: [0.4, 0.92, 0.5], pin: [50, 62] },
      { type: "footwear", brand: "ALTÉ Footwear", name: "Skate Low", color: "Black / White", price: 95, crop: [0.84, 1, 0.5], pin: [61, 92] }
    ]
  },
  {
    id: "06", name: "Oat Set", src: "assets/looks/look-06.webp",
    items: [
      { type: "apparel", brand: "ALTÉ Studio", name: "Boxy Crewneck", color: "Oatmeal", price: 115, crop: [0.04, 0.42, 0.5], pin: [44, 24] },
      { type: "apparel", brand: "ALTÉ Studio", name: "Balloon Sweatpant", color: "Oatmeal", price: 115, crop: [0.38, 0.92, 0.5], pin: [58, 62] },
      { type: "footwear", brand: "ALTÉ Footwear", name: "Court Low", color: "White", price: 139, crop: [0.86, 1, 0.5], pin: [37, 91] }
    ]
  },
  {
    id: "07", name: "Cobalt", src: "assets/looks/look-07.webp",
    items: [
      { type: "accessory", brand: "ALTÉ Utility", name: "Canvas Logo Cap", color: "Black", price: 39, crop: [0, 0.14, 0.55], pin: [54, 5] },
      { type: "apparel", brand: "ALTÉ Studio", name: "Polar Fleece Zip", color: "Cobalt", price: 149, crop: [0.08, 0.44, 0.5], pin: [66, 26] },
      { type: "accessory", brand: "ALTÉ Utility", name: "Nylon Sling Bag", color: "Black", price: 79, crop: [0.18, 0.46, 0.2], pin: [18, 39] },
      { type: "apparel", brand: "ALTÉ Studio", name: "Pleated Sweatpant", color: "Light Grey", price: 110, crop: [0.42, 0.94, 0.5], pin: [50, 66] }
    ]
  },
  {
    id: "08", name: "After Hours", src: "assets/looks/look-08.webp",
    items: [
      { type: "apparel", brand: "ALTÉ Utility", name: "Camo Panel Zip Hoodie", color: "Mocha", price: 159, crop: [0.08, 0.46, 0.5], pin: [68, 24] },
      { type: "apparel", brand: "ALTÉ Denim Lab", name: "Stitched Wide Sweatpant", color: "Washed Black", price: 125, crop: [0.4, 0.92, 0.5], pin: [44, 62] },
      { type: "footwear", brand: "ALTÉ Footwear", name: "6\" Work Boot", color: "Wheat", price: 210, crop: [0.84, 1, 0.5], pin: [41, 94] }
    ]
  },
  {
    id: "09", name: "Campus", src: "assets/looks/look-09.webp",
    items: [
      { type: "accessory", brand: "ALTÉ Utility", name: "Canvas Logo Cap", color: "Black", price: 39, crop: [0, 0.14, 0.6], pin: [57, 5] },
      { type: "apparel", brand: "ALTÉ Studio", name: "Polar Fleece Zip", color: "Cobalt", price: 149, crop: [0.08, 0.44, 0.55], pin: [70, 26] },
      { type: "apparel", brand: "ALTÉ Studio", name: "Pleated Sweatpant", color: "Light Grey", price: 110, crop: [0.42, 0.94, 0.52], pin: [54, 66] }
    ]
  },
  {
    id: "10", name: "Est. 2023", src: "assets/looks/look-10.webp",
    items: [
      { type: "accessory", brand: "ALTÉ Studio", name: "Washed Dad Cap", color: "Stone", price: 39, crop: [0, 0.13, 0.5], pin: [48, 4] },
      { type: "apparel", brand: "ALTÉ Studio", name: "Varsity Graphic Crew", color: "Black", price: 125, crop: [0.1, 0.44, 0.48], pin: [48, 26] },
      { type: "apparel", brand: "ALTÉ Denim Lab", name: "Flared Light Wash Jean", color: "Light Indigo", price: 145, crop: [0.4, 0.92, 0.5], pin: [58, 66] },
      { type: "footwear", brand: "ALTÉ Footwear", name: "Leather Derby", color: "Black", price: 199, crop: [0.86, 1, 0.5], pin: [41, 97] }
    ]
  },
  {
    id: "11", name: "Green Field", src: "assets/looks/look-11.webp",
    items: [
      { type: "accessory", brand: "ALTÉ Studio", name: "Six Panel Cap", color: "Pink", price: 39, crop: [0, 0.12, 0.5], pin: [48, 5] },
      { type: "apparel", brand: "ALTÉ Utility", name: "Camo Pocket Tee", color: "Woodland", price: 65, crop: [0.08, 0.42, 0.5], pin: [40, 24] },
      { type: "apparel", brand: "ALTÉ Studio", name: "Club Crest Sweatpant", color: "Forest", price: 115, crop: [0.36, 0.9, 0.5], pin: [46, 62] },
      { type: "footwear", brand: "ALTÉ Footwear", name: "Pool Slide", color: "White", price: 45, crop: [0.86, 1, 0.5], pin: [49, 89] }
    ]
  },
  {
    id: "12", name: "Track Navy", src: "assets/looks/look-12.webp",
    items: [
      { type: "accessory", brand: "ALTÉ Studio", name: "Team Logo Cap", color: "Cream", price: 39, crop: [0, 0.12, 0.5], pin: [56, 4] },
      { type: "apparel", brand: "ALTÉ Sport", name: "Piped Track Jacket", color: "Navy", price: 139, crop: [0.08, 0.44, 0.5], pin: [36, 26] },
      { type: "apparel", brand: "ALTÉ Sport", name: "Piped Track Pant", color: "Navy", price: 109, crop: [0.4, 0.92, 0.5], pin: [58, 64] },
      { type: "footwear", brand: "ALTÉ Footwear", name: "Court Low", color: "White", price: 139, crop: [0.88, 1, 0.5], pin: [37, 97] }
    ]
  }
];
