# Barcelona Bicing Dashboard

This project is a real-time dashboard for Barcelona's Bicing bike-sharing system. It provides users with up-to-date information on bike availability, station status, and usage patterns across the city.

## Features
- Interactive map showing all Bicing stations
- Real-time updates on bike and dock availability
- Filtering options for station status (in service, full, empty)
- Usage statistics and trends visualization
- Responsive design for desktop and mobile devices

## Technologies Used
- Next.js
- React
- TypeScript
- Leaflet for map integration
- Recharts for data visualization
- Tailwind CSS for styling

## Getting Started

### Prerequisites
- Node.js (v14 or later)
- npm or yarn

### Installation
1. Clone the repository:
2. Navigate to the project directory:
3. Install dependencies:
    ```
    npm install
    ```
    or
    ```
    yarn install
    ```

### Running the Application

Start the development server:
```
npm run dev
```
or
```
yarn dev
```

Open your browser and visit [http://localhost:3000](http://localhost:3000)

## Project Structure
- `app/`: Contains the main application code
- `components/`: Reusable React components
- `public/`: Static assets and data
- `styles/`: Global styles and Tailwind CSS configuration

## Data Source
The project currently uses real-time data obtained through official Bicing API calls located in the `public/data/` directory. In a production environment, this ensures always up-to-date information about the bike-sharing system.

## License
This project is open source and available under the MIT License.
# End of Selection
```