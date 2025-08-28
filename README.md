# Git Center - Modernized

A modernized version of Git Center, a decentralized Git hosting platform built on ZeroNet.

## Features

- **Decentralized**: Built on ZeroNet for true decentralization
- **Modern Codebase**: Refactored with ES6+ features, modules, and modern practices
- **Improved UX**: Enhanced user interface with better accessibility and responsiveness
- **Better Performance**: Optimized code with caching and efficient data structures
- **Type Safety**: Structured code with clear interfaces and error handling

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- ZeroNet client

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

### Code Quality

- **Linting**: `npm run lint`
- **Formatting**: `npm run format`

## Architecture

### Core Components

- **ZeroFrame**: Communication layer with ZeroNet
- **ZeroPage**: High-level API wrapper
- **Repository**: Git/Mercurial repository management
- **UIManager**: User interface utilities

### Key Improvements

1. **Modular Architecture**: Code split into logical modules
2. **Modern JavaScript**: ES6+ features, async/await, classes
3. **Error Handling**: Comprehensive error handling and user feedback
4. **Performance**: Caching, debouncing, and optimized operations
5. **Accessibility**: Better keyboard navigation and screen reader support
6. **Responsive Design**: Mobile-friendly interface
7. **Code Quality**: ESLint, Prettier, and consistent coding standards

## File Structure

```
src/
├── js/
│   ├── lib/           # Core libraries
│   ├── utils/         # Utility functions
│   └── main.js        # Application entry point
├── styles/            # CSS files
├── assets/            # Static assets
└── index.html         # Main HTML file
```

## Contributing

1. Follow the established code style (ESLint + Prettier)
2. Write meaningful commit messages
3. Add tests for new functionality
4. Update documentation as needed

## License

This project maintains the same license as the original Git Center.