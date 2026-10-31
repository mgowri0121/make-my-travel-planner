# Make My Travel — Free, Editable Travel Planner

A fresh recreation of the Make My Travel dashboard design, with a new goal-based trip planner. This is **not** the recovered source code for the original hosted website; it is a standalone rebuild based on the screenshots and requirements.

## Open it in Antigravity or VS Code
1. Extract `make-my-travel-free-planner.zip` to a folder.
2. Open that extracted folder in Antigravity or VS Code.
3. Open `index.html` in a browser. You can also use VS Code's Live Server extension if you already have it.
4. No `npm install`, backend, API key, paid service, or account is required.

## Features
- Cream-and-teal dashboard with a dotted route illustration.
- Create, open, and delete trips.
- **Plan from my goal:** destination, optional departure city, budget/currency, number of days, travelers, travel style, trip focus, and personal goal.
- Built-in destination templates for Bali, Goa, Manali, Paris, and Tokyo, with a generic fallback for other destinations.
- Generates a day-by-day outline, suggested stay areas, local food ideas, transport guidance, and a budget split for transport, accommodation, food, activities, and emergency buffer.
- Save a generated plan to the dashboard; add/edit itinerary activities, track expenses, and maintain a packing checklist.
- Stores trips in browser `localStorage` on that device.

## Important limitations
- Completely free local rule-based planner; **no paid APIs, AI keys, or live travel data**.
- Itinerary, stay-area suggestions, and budget allocations are planning ideas only. Prices, hotel availability, transport schedules, opening hours, and safety conditions are not verified live. Check these before booking.
- Saved data lives in the browser on the device/profile where you open the app; it is not automatically synced to another laptop.
