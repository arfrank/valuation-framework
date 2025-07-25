# ValuFrame - Valuation Framework

A lightweight frontend application for valuation analysis, ownership tracking, and dilution calculations when offering term sheets. Built with React and featuring a modern glassmorphism design with optional sci-fi visual effects.

## Features

### Core Functionality
- **Multi-company support** - Manage multiple companies with tabbed interface
- **Real-time calculations** - Live updating valuation scenarios as you type
- **Local data persistence** - All data stored locally in browser
- **Advanced features** - Pro-rata rights, SAFE calculations, founder impact analysis
- **Post-money valuation input** - User-friendly input with automatic pre-money calculation

### Valuation Scenarios
- **Base scenario** - Your primary investment structure
- **Alternative scenarios** - Multiple what-if analyses with different valuations and round sizes
- **Detailed breakdowns** - Ownership percentages, dilution impact, and founder equity
- **Color-coded tables** - Easy-to-read visual formatting with role-based highlighting

### User Experience
- **Modern UI** - Clean glassmorphism design with smooth animations
- **Responsive design** - Works on desktop, tablet, and mobile
- **Keyboard shortcuts** - Hidden easter egg: Press **Shift + Space** for Dyson sphere background
- **Intuitive controls** - Easy company management, renaming, and scenario application

### Advanced Features
- **Pro-rata participation** - Calculate follow-on investment rights
- **SAFE conversions** - Simple Agreement for Future Equity calculations
- **Founder impact tracking** - Visual warnings for significant dilution
- **Customizable investor names** - Personalize scenarios for different investment sources

## Tech Stack

- **React 18** - Modern component-based architecture
- **Vite** - Fast build tool and development server
- **Vanilla CSS** - Custom styling with CSS Grid, Flexbox, and animations
- **Local Storage API** - Client-side data persistence
- **Canvas API** - Optional 3D Dyson sphere background animation

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>

# Navigate to the React app directory
cd valuation-framework/react-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production
```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Usage

1. **Add companies** - Click the "+" button to create new company tabs
2. **Enter valuation data** - Input post-money valuation, round size, and investor portions
3. **Review scenarios** - Automatically generated alternative scenarios appear below
4. **Apply scenarios** - Click "Apply" on any scenario to use those values
5. **Advanced features** - Toggle advanced mode for pro-rata and SAFE calculations
6. **Easter egg** - Press **Shift + Space** for a sci-fi Dyson sphere background

## Project Structure

```
react-app/
├── src/
│   ├── components/          # React components
│   │   ├── CompanyTabs.jsx     # Multi-company tab management
│   │   ├── InputForm.jsx       # Valuation input form
│   │   ├── ScenarioCard.jsx    # Individual scenario display
│   │   ├── GeometricBackground.jsx  # 3D background animation
│   │   └── Logo.jsx            # Application logo
│   ├── hooks/               # Custom React hooks
│   │   └── useLocalStorage.js  # Local storage persistence
│   ├── utils/               # Utility functions
│   │   └── calculations.js     # Valuation mathematics
│   └── App.jsx              # Main application component
├── public/                  # Static assets
└── package.json            # Dependencies and scripts
```

## Development

The project follows modern React patterns with:
- **Functional components** with hooks
- **Local state management** with useState and useEffect
- **Custom hooks** for reusable logic
- **Modular CSS** with component-specific stylesheets
- **Performance optimization** with efficient rendering patterns

## License

This project is for educational and demonstration purposes.