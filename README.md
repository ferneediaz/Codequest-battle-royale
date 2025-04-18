# CodeQuest Battle Royale

A competitive coding battle platform where users can solve coding problems in real-time competitions.

## Features

- 🔥 Real-time battle mode with multiple participants
- 🧩 Diverse collection of coding problems across 10 categories
- 💻 Support for multiple programming languages (JavaScript, Python)
- 📊 Instant feedback and test results
- 🏆 Competitive leaderboard system

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn
- Supabase account

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/codequest-battle-royale.git
cd codequest-battle-royale
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment Setup**

Create a `.env.local` file in the project root with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Database Setup**

Set up the required database tables:

```bash
npm run setup-coding-problems
```

5. **Populate database with coding problems**

```bash
npm run populate-problems
```

For more details on database scripts, see the [Database Scripts Documentation](src/scripts/README.md).

6. **Start the development server**

```bash
npm run dev
```

## Problem Categories

The application features problems from these categories:

- Forest of Arrays
- Hashmap Dungeons
- Binary Search Castle
- Linked List Gardens
- Tree of Wisdom
- Graph Adventures
- Dynamic Programming Peaks
- Stack & Queue Tavern
- String Sorcery
- Sorting Sanctuary

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by competitive coding platforms like LeetCode and HackerRank
- Built with React, TypeScript, and Supabase
- Uses Judge0 API for code execution 